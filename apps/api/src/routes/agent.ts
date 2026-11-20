import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { AgentRun } from "../models/AgentRun.js";
import { User } from "../models/User.js";
import { runAgentForUser } from "../services/agent.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const user = await User.findById(req.user!.userId).select("-passwordHash");
  if (!user) return res.status(404).json({ error: "User not found" });

  const runs = await AgentRun.find({ userId: user._id })
    .sort({ createdAt: -1 })
    .limit(10)
    .populate("jobIds", "title company source");

  return res.json({
    agent: user.agent || {},
    runs,
  });
});

router.put("/", requireAuth, async (req, res) => {
  const user = await User.findById(req.user!.userId);
  if (!user) return res.status(404).json({ error: "User not found" });

  const current = user.agent || ({} as typeof user.agent);
  const next = {
    enabled: typeof req.body.enabled === "boolean" ? req.body.enabled : current.enabled,
    minScore:
      typeof req.body.minScore === "number"
        ? Math.max(0, Math.min(100, req.body.minScore))
        : current.minScore,
    sources: Array.isArray(req.body.sources)
      ? req.body.sources.map(String)
      : current.sources,
    runHourUtc:
      typeof req.body.runHourUtc === "number"
        ? Math.max(0, Math.min(23, Math.round(req.body.runHourUtc)))
        : current.runHourUtc,
    autoTailor:
      typeof req.body.autoTailor === "boolean" ? req.body.autoTailor : current.autoTailor,
    maxJobsPerRun:
      typeof req.body.maxJobsPerRun === "number"
        ? Math.max(1, Math.min(10, req.body.maxJobsPerRun))
        : current.maxJobsPerRun,
    notifyEmail:
      typeof req.body.notifyEmail === "boolean" ? req.body.notifyEmail : current.notifyEmail,
    lastRunAt: current.lastRunAt,
    lastRunSummary: current.lastRunSummary,
  };

  user.agent = next;
  await user.save();
  return res.json({ agent: user.agent });
});

router.post("/run", requireAuth, async (req, res) => {
  try {
    const result = await runAgentForUser(req.user!.userId, "manual");
    return res.json(result);
  } catch (err) {
    console.error(err);
    return res.status(500).json({
      error: err instanceof Error ? err.message : "Agent run failed",
    });
  }
});

export default router;
