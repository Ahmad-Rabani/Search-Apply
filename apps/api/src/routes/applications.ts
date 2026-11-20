import { Router } from "express";
import fs from "fs";
import path from "path";
import { requireAuth } from "../middleware/auth.js";
import { config } from "../config.js";
import { Application } from "../models/Application.js";
import { Job } from "../models/Job.js";
import { Profile } from "../models/Profile.js";
import { TailoredDoc } from "../models/TailoredDoc.js";
import { runApplyAssist } from "../services/applyAssist.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const status = String(req.query.status || "").trim();
  const source = String(req.query.source || "").trim().toLowerCase();

  const apps = await Application.find({ userId: req.user!.userId })
    .sort({ updatedAt: -1 })
    .populate("jobId")
    .populate("tailoredDocId");

  let filtered = apps;
  if (status) filtered = filtered.filter((a) => a.status === status);
  if (source) {
    filtered = filtered.filter((a) => {
      const job = a.jobId as { source?: string } | null;
      return job && typeof job === "object" && job.source === source;
    });
  }

  return res.json({ applications: filtered, count: filtered.length });
});

router.post("/", requireAuth, async (req, res) => {
  const { jobId, status = "saved", notes = "" } = req.body;
  if (!jobId) return res.status(400).json({ error: "jobId required" });

  const job = await Job.findById(jobId);
  if (!job) return res.status(404).json({ error: "Job not found" });

  const application = await Application.findOneAndUpdate(
    { userId: req.user!.userId, jobId },
    {
      userId: req.user!.userId,
      jobId,
      status,
      notes,
      ...(status === "applied" ? { appliedAt: new Date() } : {}),
    },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  return res.status(201).json({ application });
});

router.patch("/:id", requireAuth, async (req, res) => {
  const application = await Application.findOne({
    _id: req.params.id,
    userId: req.user!.userId,
  });
  if (!application) return res.status(404).json({ error: "Not found" });

  if (req.body.status) {
    application.status = req.body.status;
    if (req.body.status === "applied" && !application.appliedAt) {
      application.appliedAt = new Date();
    }
  }
  if (typeof req.body.notes === "string") application.notes = req.body.notes;

  await application.save();
  return res.json({ application });
});

router.post("/:jobId/apply-assist", requireAuth, async (req, res) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ error: "Job not found" });
    if (!job.url) return res.status(400).json({ error: "Job has no apply URL" });

    const [profile, tailored] = await Promise.all([
      Profile.findOne({ userId: req.user!.userId }),
      TailoredDoc.findOne({ userId: req.user!.userId, jobId: job._id }),
    ]);

    if (!profile?.fullName) {
      return res.status(400).json({ error: "Complete your profile before apply assist" });
    }

    const result = await runApplyAssist({
      jobUrl: job.url,
      userId: req.user!.userId,
      jobId: String(job._id),
      profile: {
        fullName: profile.fullName,
        email: profile.email,
        phone: profile.phone,
        location: profile.location,
        linkedin: profile.linkedin,
        github: profile.github,
        website: profile.website,
        summary: profile.summary,
      },
      coverLetter: tailored?.coverLetter || "",
    });

    const application = await Application.findOneAndUpdate(
      { userId: req.user!.userId, jobId: job._id },
      {
        userId: req.user!.userId,
        jobId: job._id,
        tailoredDocId: tailored?._id,
        status: "applied",
        appliedAt: new Date(),
        applyAssistAt: new Date(),
        confirmationScreenshot: result.screenshotPath,
        notes: `Apply assist used. Filled: ${
          result.filledFields.join(", ") || "none"
        }. Review/submit manually if needed.`,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({
      ok: true,
      application,
      assist: {
        pageTitle: result.pageTitle,
        filledFields: result.filledFields,
        screenshotFile: result.screenshotFile,
        message: result.message,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Apply assist failed",
    });
  }
});

router.get("/:id/screenshot", requireAuth, async (req, res) => {
  const application = await Application.findOne({
    _id: req.params.id,
    userId: req.user!.userId,
  });
  if (!application?.confirmationScreenshot) {
    return res.status(404).json({ error: "No screenshot" });
  }
  const filePath = application.confirmationScreenshot;
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: "Screenshot file missing" });
  }
  res.setHeader("Content-Type", "image/png");
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${path.basename(filePath)}"`
  );
  return fs.createReadStream(filePath).pipe(res);
});

export default router;
