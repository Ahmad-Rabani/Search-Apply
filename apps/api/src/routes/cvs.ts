import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import { SavedCv } from "../models/SavedCv.js";
import { Profile } from "../models/Profile.js";
import { prepareCvUpload } from "../services/cvUpload.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

router.get("/", requireAuth, async (req, res) => {
  const cvs = await SavedCv.find({ userId: req.user!.userId })
    .sort({ createdAt: -1 })
    .select(
      "_id label originalName fullName headline skills designSource createdAt updatedAt"
    )
    .lean();
  return res.json({ cvs });
});

router.post("/upload", requireAuth, upload.single("cv"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "CV file required (field name: cv)" });
    }

    const prepared = await prepareCvUpload({
      userId: req.user!.userId,
      file: req.file,
    });
    const label =
      String(req.body.label || "").trim() ||
      prepared.fullName ||
      prepared.originalName ||
      "Uploaded CV";

    const cv = await SavedCv.create({
      userId: req.user!.userId,
      label,
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

    return res.json({
      cv: {
        _id: cv._id,
        label: cv.label,
        originalName: cv.originalName,
        fullName: cv.fullName,
        headline: cv.headline,
        skills: cv.skills,
        designSource: cv.designSource,
        createdAt: cv.createdAt,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : "CV upload failed",
    });
  }
});

router.delete("/:id", requireAuth, async (req, res) => {
  const deleted = await SavedCv.findOneAndDelete({
    _id: req.params.id,
    userId: req.user!.userId,
  });
  if (!deleted) return res.status(404).json({ error: "CV not found" });
  return res.json({ ok: true });
});

export default router;
