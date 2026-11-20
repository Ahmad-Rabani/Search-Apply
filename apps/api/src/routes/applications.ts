import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { Application } from "../models/Application.js";
import { Job } from "../models/Job.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const apps = await Application.find({ userId: req.user!.userId })
    .sort({ updatedAt: -1 })
    .populate("jobId")
    .populate("tailoredDocId");

  return res.json({ applications: apps });
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

export default router;
