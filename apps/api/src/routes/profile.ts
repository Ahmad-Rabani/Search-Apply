import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/auth.js";
import { Profile } from "../models/Profile.js";
import { User } from "../models/User.js";
import { SavedCv } from "../models/SavedCv.js";
import { extractTextFromCv, parseCvTextToProfile } from "../services/cvParse.js";

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

    const text = await extractTextFromCv(
      req.file.buffer,
      req.file.originalname,
      req.file.mimetype
    );

    const parsed = await parseCvTextToProfile(text);

    const profile = await Profile.findOneAndUpdate(
      { userId: req.user!.userId },
      {
        $set: {
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
        },
      },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );

    await SavedCv.create({
      userId: req.user!.userId,
      label: parsed.fullName || req.file.originalname || "Uploaded CV",
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

    if (parsed.fullName) {
      await User.findByIdAndUpdate(req.user!.userId, { name: parsed.fullName });
    }

    const user = await User.findById(req.user!.userId);
    if (user && parsed.suggestedPreferences) {
      const roles = parsed.suggestedPreferences.roles?.length
        ? parsed.suggestedPreferences.roles
        : user.preferences?.roles || [];
      const keywords = parsed.suggestedPreferences.keywords?.length
        ? parsed.suggestedPreferences.keywords
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
      extractedChars: text.length,
      message: "CV parsed and profile updated. Review fields, then save if you edit anything.",
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
