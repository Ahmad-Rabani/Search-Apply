import { Router } from "express";
import fs from "fs";
import { requireAuth } from "../middleware/auth.js";
import { Job } from "../models/Job.js";
import { Profile } from "../models/Profile.js";
import { User } from "../models/User.js";
import { TailoredDoc } from "../models/TailoredDoc.js";
import { Application } from "../models/Application.js";
import { syncRemoteOkJobs } from "../services/remoteok.js";
import { scoreJob } from "../services/scoring.js";
import { tailorCvForJob } from "../services/claude.js";
import { htmlToPdf } from "../services/pdf.js";

const router = Router();

router.post("/sync", requireAuth, async (_req, res) => {
  try {
    const result = await syncRemoteOkJobs();
    return res.json({ ok: true, ...result });
  } catch (err) {
    console.error(err);
    return res.status(502).json({
      error: err instanceof Error ? err.message : "Job sync failed",
    });
  }
});

router.get("/", requireAuth, async (req, res) => {
  const q = String(req.query.q || "").trim();
  const remoteOnly = String(req.query.remoteOnly || "") === "true";
  const minScore = Number(req.query.minScore || 0);
  const limit = Math.min(Number(req.query.limit || 50), 100);

  const filter: Record<string, unknown> = {};
  if (remoteOnly) filter.remote = true;

  const [jobs, user, profile] = await Promise.all([
    Job.find(filter).sort({ postedAt: -1, createdAt: -1 }).limit(500),
    User.findById(req.user!.userId),
    Profile.findOne({ userId: req.user!.userId }),
  ]);

  const preferences = user?.preferences || {
    roles: [],
    locations: [],
    remoteOnly: true,
    minSalary: 0,
    keywords: [],
  };

  const tokens = q
    .toLowerCase()
    .split(/[^a-z0-9+#.\-]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  const scoredAll = jobs
    .map((job) => {
      const title = (job.title || "").toLowerCase();
      const tags = (job.tags || []).map((t) => String(t).toLowerCase()).join(" ");
      const company = (job.company || "").toLowerCase();
      const primary = `${title} ${tags} ${company}`;
      const haystack = `${primary} ${(job.description || "").toLowerCase()}`;

      const allInHaystack =
        tokens.length === 0 || tokens.every((t) => haystack.includes(t));
      const titleHits = tokens.filter((t) => title.includes(t)).length;
      const primaryHits = tokens.filter((t) => primary.includes(t)).length;

      const base = scoreJob(job, preferences, profile?.skills || []);
      const searchBoost =
        tokens.length === 0
          ? 0
          : titleHits * 18 +
            primaryHits * 10 +
            (titleHits === tokens.length ? 25 : 0) +
            (primaryHits === tokens.length ? 15 : 0);

      return {
        ...job.toObject(),
        relevanceScore: Math.min(100, base + searchBoost),
        allInHaystack,
        titleHits,
        primaryHits,
      };
    })
    .filter((j) => j.allInHaystack)
    .filter((j) => j.relevanceScore >= minScore);

  // If any results match in title/tags/company, prefer those over buried description hits
  const primaryMatches = scoredAll.filter((j) => j.primaryHits > 0);
  const pool = primaryMatches.length ? primaryMatches : scoredAll;

  const scored = pool
    .sort((a, b) => {
      if (tokens.length) {
        if (b.titleHits !== a.titleHits) return b.titleHits - a.titleHits;
        if (b.primaryHits !== a.primaryHits) return b.primaryHits - a.primaryHits;
      }
      return b.relevanceScore - a.relevanceScore;
    })
    .slice(0, limit)
    .map(({ allInHaystack: _a, titleHits: _t, primaryHits: _p, ...job }) => job);

  return res.json({ jobs: scored, count: scored.length, query: q || null });
});

router.get("/:id", requireAuth, async (req, res) => {
  const job = await Job.findById(req.params.id);
  if (!job) return res.status(404).json({ error: "Job not found" });

  const [user, profile, tailored, application] = await Promise.all([
    User.findById(req.user!.userId),
    Profile.findOne({ userId: req.user!.userId }),
    TailoredDoc.findOne({ userId: req.user!.userId, jobId: job._id }),
    Application.findOne({ userId: req.user!.userId, jobId: job._id }),
  ]);

  const relevanceScore = scoreJob(
    job,
    user?.preferences || {},
    profile?.skills || []
  );

  return res.json({
    job: { ...job.toObject(), relevanceScore },
    tailored,
    application,
  });
});

router.post("/:id/tailor", requireAuth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ error: "Job not found" });

    const profile = await Profile.findOne({ userId: req.user!.userId });
    if (!profile || !profile.fullName) {
      return res.status(400).json({
        error: "Complete your profile (at least full name) before tailoring a CV",
      });
    }

    const result = await tailorCvForJob(profile, job);

    const tailored = await TailoredDoc.findOneAndUpdate(
      { userId: req.user!.userId, jobId: job._id },
      {
        userId: req.user!.userId,
        jobId: job._id,
        ...result,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    await Application.findOneAndUpdate(
      { userId: req.user!.userId, jobId: job._id },
      {
        userId: req.user!.userId,
        jobId: job._id,
        tailoredDocId: tailored._id,
        status: "tailored",
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({ tailored });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Tailoring failed",
    });
  }
});

router.get("/:id/pdf", requireAuth, async (req, res) => {
  try {
    const tailored = await TailoredDoc.findOne({
      userId: req.user!.userId,
      jobId: req.params.id,
    });
    if (!tailored?.cvHtml) {
      return res.status(404).json({ error: "Tailor the CV first" });
    }

    const filename = `cv-${req.user!.userId}-${req.params.id}.pdf`;
    const pdfPath = await htmlToPdf(tailored.cvHtml, filename);
    tailored.pdfPath = pdfPath;
    await tailored.save();

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
    return fs.createReadStream(pdfPath).pipe(res);
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : "PDF generation failed",
    });
  }
});

export default router;
