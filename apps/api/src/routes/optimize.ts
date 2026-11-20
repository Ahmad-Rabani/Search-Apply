import { Router } from "express";
import fs from "fs";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import { Profile, type ProfileDoc } from "../models/Profile.js";
import { OptimizeResult } from "../models/OptimizeResult.js";
import { SavedCv } from "../models/SavedCv.js";
import { tailorCvForJob } from "../services/claude.js";
import { extractTextFromCv, parseCvTextToProfile } from "../services/cvParse.js";
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

    if (req.file) {
      const text = await extractTextFromCv(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype
      );
      const parsed = await parseCvTextToProfile(text);
      profile = {
        ...parsed,
        email: parsed.email || req.user!.email,
      } as unknown as ProfileDoc;
      source = "upload";

      await SavedCv.create({
        userId: req.user!.userId,
        label: parsed.fullName || req.file.originalname || "Uploaded CV",
        originalName: req.file.originalname || "",
        ...parsed,
        email: parsed.email || req.user!.email,
      });
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
    } else {
      profile = await Profile.findOne({ userId: req.user!.userId });
      if (!profile || !profile.fullName) {
        return res.status(400).json({
          error:
            "Choose an existing CV, upload a file, or save your Profile first.",
        });
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

    const result = await tailorCvForJob(profile, job);

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
