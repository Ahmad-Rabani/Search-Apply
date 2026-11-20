import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { User } from "../models/User.js";
import { Profile } from "../models/Profile.js";
import { requireAuth, signToken } from "../middleware/auth.js";

const router = Router();

const credsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  name: z.string().optional(),
});

router.post("/register", async (req, res) => {
  try {
    const body = credsSchema.parse(req.body);
    const existing = await User.findOne({ email: body.email.toLowerCase() });
    if (existing) return res.status(409).json({ error: "Email already registered" });

    const passwordHash = await bcrypt.hash(body.password, 10);
    const user = await User.create({
      email: body.email.toLowerCase(),
      passwordHash,
      name: body.name || "",
      preferences: {
        roles: ["Full Stack Developer", "Software Engineer"],
        locations: ["Remote"],
        remoteOnly: true,
        minSalary: 0,
        keywords: ["React", "Node.js", "TypeScript"],
      },
    });

    await Profile.create({
      userId: user._id,
      fullName: body.name || "",
      email: body.email.toLowerCase(),
      skills: ["React", "Node.js", "TypeScript"],
    });

    const token = signToken({ userId: String(user._id), email: user.email });
    return res.status(201).json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        preferences: user.preferences,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.flatten() });
    }
    console.error(err);
    return res.status(500).json({ error: "Registration failed" });
  }
});

router.post("/login", async (req, res) => {
  try {
    const body = credsSchema.pick({ email: true, password: true }).parse(req.body);
    const user = await User.findOne({ email: body.email.toLowerCase() });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const ok = await bcrypt.compare(body.password, user.passwordHash);
    if (!ok) return res.status(401).json({ error: "Invalid credentials" });

    const token = signToken({ userId: String(user._id), email: user.email });
    return res.json({
      token,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        preferences: user.preferences,
      },
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ error: err.flatten() });
    }
    console.error(err);
    return res.status(500).json({ error: "Login failed" });
  }
});

router.get("/me", requireAuth, async (req, res) => {
  const user = await User.findById(req.user!.userId).select("-passwordHash");
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({ user });
});

export default router;
