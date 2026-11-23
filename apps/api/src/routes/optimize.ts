import { Router } from "express";
import fs from "fs";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import { Profile, type ProfileDoc } from "../models/Profile.js";
import { OptimizeResult } from "../models/OptimizeResult.js";
import { SavedCv } from "../models/SavedCv.js";
import { tailorCvForJob } from "../services/claude.js";
import { reconstructDesignHtmlFromFile } from "../services/cvDesign.js";
import { extractTextFromCv } from "../services/cvParse.js";
import { readStoredCvFile } from "../services/cvStorage.js";
import { prepareCvUpload } from "../services/cvUpload.js";
import { htmlToPdf } from "../services/pdf.js";
import type { JobDoc } from "../models/Job.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

/**
 * Paste any JD + choose CV source:
 * - cv file upload
 * - cvId (existing SavedCv)
 * - otherwise saved Profile
 */
router.post("/", requireAuth, upload.single("cv"), async (req, res) => {
  try {
    const jobDescription = String(req.body.jobDescription || "").trim();
    if (jobDescription.length < 40) {
      return res.status(400).json({
        error: "Paste a fuller job description (at least a few sentences).",
      });
    }

    const title =
      String(req.body.title || "").trim() ||
      guessTitleFromJd(jobDescription) ||
      "Target Role";
    const company = String(req.body.company || "").trim() || "Target Company";
    const location = String(req.body.location || "").trim() || "";
    const cvId = String(req.body.cvId || "").trim();

    let profile: ProfileDoc | null = null;
    let source: "upload" | "saved" | "profile" = "profile";
    let designHtml = "";
    let originalFile:
      | { buffer: Buffer; mimeType: string; filename: string }
      | undefined;

    if (req.file) {
      const prepared = await prepareCvUpload({
        userId: req.user!.userId,
        file: req.file,
      });
      designHtml = prepared.designHtml;
      originalFile = {
        buffer: req.file.buffer,
        mimeType: prepared.originalMimeType,
        filename: prepared.originalName,
      };
      profile = {
        ...prepared,
        email: prepared.email || req.user!.email,
        designHtml,
      } as unknown as ProfileDoc;
      source = "upload";

      await SavedCv.create({
        userId: req.user!.userId,
        label: prepared.fullName || prepared.originalName || "Uploaded CV",
        originalName: prepared.originalName,
        fullName: prepared.fullName,
        headline: prepared.headline,
        email: prepared.email || req.user!.email,
        phone: prepared.phone,
        location: prepared.location,
        linkedin: prepared.linkedin,
        github: prepared.github,
        website: prepared.website,
        summary: prepared.summary,
        skills: prepared.skills,
        experience: prepared.experience,
        education: prepared.education,
        projects: prepared.projects,
        designHtml: prepared.designHtml,
        designSource: prepared.designSource,
        originalFilePath: prepared.originalFilePath,
        originalMimeType: prepared.originalMimeType,
      });

      await Profile.findOneAndUpdate(
        { userId: req.user!.userId },
        {
          $set: {
            designHtml: prepared.designHtml,
            originalFilePath: prepared.originalFilePath,
            originalMimeType: prepared.originalMimeType,
          },
        },
        { upsert: true }
      );
    } else if (cvId) {
      const savedCv = await SavedCv.findOne({
        _id: cvId,
        userId: req.user!.userId,
      });
      if (!savedCv) {
        return res.status(404).json({ error: "Selected CV not found" });
      }
      profile = savedCv as unknown as ProfileDoc;
      source = "saved";

      const resolved = await resolveDesignFromStoredCv({
        designHtml: String(savedCv.designHtml || ""),
        designSource: String(savedCv.designSource || ""),
        originalFilePath: String(savedCv.originalFilePath || ""),
        originalMimeType: String(savedCv.originalMimeType || ""),
        originalName: String(savedCv.originalName || "cv.pdf"),
      });

      if (!resolved.ok) {
        return res.status(400).json({ error: resolved.error });
      }

      designHtml = resolved.designHtml;
      originalFile = resolved.originalFile;

      if (resolved.designHtmlUpdated) {
        savedCv.designHtml = designHtml;
        savedCv.designSource = "vision";
        await savedCv.save();
      }
    } else {
      profile = await Profile.findOne({ userId: req.user!.userId });
      if (!profile || !profile.fullName) {
        return res.status(400).json({
          error:
            "Choose an existing CV, upload a file, or save your Profile first.",
        });
      }
      source = "profile";

      const p = profile as ProfileDoc & {
        designHtml?: string;
        originalFilePath?: string;
        originalMimeType?: string;
      };

      const resolved = await resolveDesignFromStoredCv({
        designHtml: String(p.designHtml || ""),
        designSource: "",
        originalFilePath: String(p.originalFilePath || ""),
        originalMimeType: String(p.originalMimeType || ""),
        originalName: "profile-cv.pdf",
      });

      if (!resolved.ok) {
        return res.status(400).json({
          error:
            "Re-upload your CV (PDF) so we can keep its colors, fonts, and layout when matching.",
        });
      }

      designHtml = resolved.designHtml;
      originalFile = resolved.originalFile;

      if (resolved.designHtmlUpdated) {
        await Profile.findOneAndUpdate(
          { userId: req.user!.userId },
          { $set: { designHtml } }
        );
      }
    }

    const job = {
      title,
      company,
      location,
      url: "",
      tags: [],
      description: jobDescription.slice(0, 12000),
      source: "optimize",
      externalId: `optimize-${Date.now()}`,
      remote: /remote/i.test(jobDescription) || /remote/i.test(location),
    } as unknown as JobDoc;

    const result = await tailorCvForJob(profile, job, {
      designHtml,
      originalFile,
    });

    const saved = await OptimizeResult.findOneAndUpdate(
      { userId: req.user!.userId },
      {
        userId: req.user!.userId,
        title,
        company,
        jobDescription: jobDescription.slice(0, 20000),
        ...result,
        source,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({
      result: {
        _id: saved._id,
        title: saved.title,
        company: saved.company,
        matchScore: saved.matchScore,
        keywords: saved.keywords,
        missingSkills: saved.missingSkills,
        coverLetter: saved.coverLetter,
        cvHtml: saved.cvHtml,
        cvMarkdown: saved.cvMarkdown,
        atsNotes: saved.atsNotes,
        source: saved.source,
        updatedAt: saved.updatedAt,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Optimize failed",
    });
  }
});

router.get("/latest", requireAuth, async (req, res) => {
  const latest = await OptimizeResult.findOne({ userId: req.user!.userId });
  return res.json({ result: latest });
});

router.get("/pdf", requireAuth, async (req, res) => {
  try {
    const latest = await OptimizeResult.findOne({ userId: req.user!.userId });
    if (!latest?.cvHtml) {
      return res.status(404).json({ error: "Optimize a CV first" });
    }

    const filename = `optimize-${req.user!.userId}.pdf`;
    const pdfPath = await htmlToPdf(latest.cvHtml, filename);
    latest.pdfPath = pdfPath;
    await latest.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader(
      "Content-Disposition",
      `attachment; filename="cv-${(latest.company || "optimized").replace(/[^\w.-]+/g, "-")}.pdf"`
    );
    return fs.createReadStream(pdfPath).pipe(res);
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : "PDF failed",
    });
  }
});

async function resolveDesignFromStoredCv(params: {
  designHtml: string;
  designSource: string;
  originalFilePath: string;
  originalMimeType: string;
  originalName: string;
}): Promise<
  | {
      ok: true;
      designHtml: string;
      originalFile?: { buffer: Buffer; mimeType: string; filename: string };
      designHtmlUpdated: boolean;
    }
  | { ok: false; error: string }
> {
  const buffer = params.originalFilePath
    ? await readStoredCvFile(params.originalFilePath)
    : null;

  const originalFile =
    buffer && buffer.length
      ? {
          buffer,
          mimeType: params.originalMimeType || "application/pdf",
          filename: params.originalName || "cv.pdf",
        }
      : undefined;

  const needsVisionRebuild =
    !params.designHtml.trim() ||
    params.designSource === "text" ||
    params.designSource === "";

  if (needsVisionRebuild && originalFile) {
    const text = await extractTextFromCv(
      originalFile.buffer,
      originalFile.filename,
      originalFile.mimeType
    );
    const designHtml = await reconstructDesignHtmlFromFile({
      buffer: originalFile.buffer,
      mimeType: originalFile.mimeType,
      filename: originalFile.filename,
      cvText: text,
    });
    return {
      ok: true,
      designHtml,
      originalFile,
      designHtmlUpdated: true,
    };
  }

  if (!params.designHtml.trim() && !originalFile) {
    return {
      ok: false,
      error:
        "This saved CV has no design file. Upload the original PDF again (Optimize → upload CV) so we can keep its colors and fonts.",
    };
  }

  return {
    ok: true,
    designHtml: params.designHtml,
    originalFile,
    designHtmlUpdated: false,
  };
}

function guessTitleFromJd(jd: string) {
  const firstLine = jd
    .split(/\n/)
    .map((l) => l.trim())
    .find((l) => l.length > 3 && l.length < 120);
  if (!firstLine) return "";
  if (/^(job title|role|position|about|we are|overview)\b/i.test(firstLine)) {
    return "";
  }
  return firstLine.replace(/^[#*\-\s]+/, "").slice(0, 100);
}

export default router;
