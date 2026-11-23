import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import { Profile } from "../models/Profile.js";
import { User } from "../models/User.js";
import { SavedCv } from "../models/SavedCv.js";
import { prepareCvUpload } from "../services/cvUpload.js";

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 },
});

router.get("/", requireAuth, async (req, res) => {
  let profile = await Profile.findOne({ userId: req.user!.userId });
  if (!profile) {
    profile = await Profile.create({ userId: req.user!.userId, email: req.user!.email });
  }
  return res.json({ profile });
});

router.put("/", requireAuth, async (req, res) => {
  const allowed = [
    "fullName",
    "headline",
    "email",
    "phone",
    "location",
    "linkedin",
    "github",
    "website",
    "summary",
    "skills",
    "experience",
    "education",
    "projects",
  ] as const;

  const update: Record<string, unknown> = {};
  for (const key of allowed) {
    if (req.body[key] !== undefined) update[key] = req.body[key];
  }

  const profile = await Profile.findOneAndUpdate(
    { userId: req.user!.userId },
    { $set: update },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  if (typeof update.fullName === "string" && update.fullName) {
    await User.findByIdAndUpdate(req.user!.userId, { name: update.fullName });
  }

  return res.json({ profile });
});

router.post("/upload-cv", requireAuth, upload.single("cv"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "CV file required (field name: cv)" });
    }

    const prepared = await prepareCvUpload({
      userId: req.user!.userId,
      file: req.file,
    });

    const profile = await Profile.findOneAndUpdate(
      { userId: req.user!.userId },
      {
        $set: {
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
          originalFilePath: prepared.originalFilePath,
          originalMimeType: prepared.originalMimeType,
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

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

    if (prepared.fullName) {
      await User.findByIdAndUpdate(req.user!.userId, { name: prepared.fullName });
    }

    const user = await User.findById(req.user!.userId);
    if (user && prepared.suggestedPreferences) {
      const roles = prepared.suggestedPreferences.roles?.length
        ? prepared.suggestedPreferences.roles
        : user.preferences?.roles || [];
      const keywords = prepared.suggestedPreferences.keywords?.length
        ? prepared.suggestedPreferences.keywords
        : user.preferences?.keywords || [];
      user.preferences = {
        roles,
        locations: user.preferences?.locations || ["Remote"],
        remoteOnly: user.preferences?.remoteOnly ?? true,
        minSalary: user.preferences?.minSalary || 0,
        keywords,
      };
      await user.save();
    }

    return res.json({
      profile,
      preferences: user?.preferences,
      designSource: prepared.designSource,
      message:
        "CV parsed and visual design saved. Matched CVs will keep your layout, colors, and fonts.",
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : "CV upload/parse failed",
    });
  }
});

router.get("/preferences", requireAuth, async (req, res) => {
  const user = await User.findById(req.user!.userId);
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({ preferences: user.preferences });
});

router.put("/preferences", requireAuth, async (req, res) => {
  const user = await User.findById(req.user!.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const prefs = user.preferences || ({} as typeof user.preferences);
  const next = {
    roles: Array.isArray(req.body.roles) ? req.body.roles.map(String) : prefs.roles,
    locations: Array.isArray(req.body.locations)
      ? req.body.locations.map(String)
      : prefs.locations,
    remoteOnly:
      typeof req.body.remoteOnly === "boolean" ? req.body.remoteOnly : prefs.remoteOnly,
    minSalary:
      typeof req.body.minSalary === "number" ? req.body.minSalary : prefs.minSalary,
    keywords: Array.isArray(req.body.keywords)
      ? req.body.keywords.map(String)
      : prefs.keywords,
  };

  user.preferences = next;
  await user.save();
  return res.json({ preferences: user.preferences });
});

export default router;
