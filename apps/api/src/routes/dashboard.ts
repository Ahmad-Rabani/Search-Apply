import { Router } from "express";
import { requireAuth } from "../middleware/auth.js";
import { AgentRun } from "../models/AgentRun.js";
import { Application } from "../models/Application.js";
import { Job } from "../models/Job.js";
import { Notification } from "../models/Notification.js";
import { Profile } from "../models/Profile.js";
import { TailoredDoc } from "../models/TailoredDoc.js";
import { User } from "../models/User.js";
import { scoreJob } from "../services/scoring.js";

const router = Router();

router.get("/", requireAuth, async (req, res) => {
  const userId = req.user!.userId;

  const [user, profile, applications, tailoredCount, jobCount, unread, recentRuns, recentApps] =
    await Promise.all([
      User.findById(userId),
      Profile.findOne({ userId }),
      Application.find({ userId }),
      TailoredDoc.countDocuments({ userId }),
      Job.countDocuments(),
      Notification.countDocuments({ userId, read: false }),
      AgentRun.find({ userId }).sort({ createdAt: -1 }).limit(5),
      Application.find({ userId })
        .sort({ updatedAt: -1 })
        .limit(6)
        .populate("jobId", "title company source"),
    ]);

  const byStatus: Record<string, number> = {
    saved: 0,
    tailored: 0,
    applied: 0,
    interview: 0,
    offer: 0,
    rejected: 0,
  };
  for (const a of applications) {
    byStatus[a.status] = (byStatus[a.status] || 0) + 1;
  }

  const prefs = user?.preferences || {};
  const recentJobs = await Job.find().sort({ postedAt: -1, createdAt: -1 }).limit(80);
  const topMatches = recentJobs
    .map((job) => ({
      _id: job._id,
      title: job.title,
      company: job.company,
      source: job.source,
      location: job.location,
      relevanceScore: scoreJob(job, prefs, profile?.skills || []),
    }))
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 5);

  const profileComplete = Boolean(
    profile?.fullName &&
      profile?.summary &&
      (profile.skills?.length || 0) > 0 &&
      (profile.experience?.length || 0) > 0
  );

  return res.json({
    stats: {
      jobsIndexed: jobCount,
      applications: applications.length,
      tailoredCvs: tailoredCount,
      applied: byStatus.applied || 0,
      interviews: byStatus.interview || 0,
      unreadNotifications: unread,
      profileComplete,
      agentEnabled: Boolean(user?.agent?.enabled),
      lastAgentRun: user?.agent?.lastRunAt || null,
      lastAgentSummary: user?.agent?.lastRunSummary || "",
    },
    byStatus,
    topMatches,
    recentRuns,
    recentApps,
  });
});

export default router;
