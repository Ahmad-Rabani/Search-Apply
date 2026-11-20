import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import { SavedCv } from "../models/SavedCv.js";
import { extractTextFromCv, parseCvTextToProfile } from "../services/cvParse.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

router.get("/", requireAuth, async (req, res) => {
  const cvs = await SavedCv.find({ userId: req.user!.userId })
    .sort({ createdAt: -1 })
    .select(
      "_id label originalName fullName headline skills createdAt updatedAt"
    )
    .lean();
  return res.json({ cvs });
});

router.post("/upload", requireAuth, upload.single("cv"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "CV file required (field name: cv)" });
    }

    const text = await extractTextFromCv(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );
    const parsed = await parseCvTextToProfile(text);
    const label =
      String(req.body.label || "").trim() ||
      parsed.fullName ||
      req.file.originalname ||
      "Uploaded CV";

    const cv = await SavedCv.create({
      userId: req.user!.userId,
      label,
      originalName: req.file.originalname || "",
      fullName: parsed.fullName,
      headline: parsed.headline,
      email: parsed.email || req.user!.email,
      phone: parsed.phone,
      location: parsed.location,
      linkedin: parsed.linkedin,
      github: parsed.github,
      website: parsed.website,
      summary: parsed.summary,
      skills: parsed.skills,
      experience: parsed.experience,
      education: parsed.education,
      projects: parsed.projects,
    });

    return res.json({
      cv: {
        _id: cv._id,
        label: cv.label,
        originalName: cv.originalName,
        fullName: cv.fullName,
        headline: cv.headline,
        skills: cv.skills,
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
