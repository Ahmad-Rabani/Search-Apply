import { Application } from "../models/Application.js";
import { AgentRun } from "../models/AgentRun.js";
import { Job } from "../models/Job.js";
import { Profile } from "../models/Profile.js";
import { TailoredDoc } from "../models/TailoredDoc.js";
import { User } from "../models/User.js";
import { tailorCvForJob } from "./claude.js";
import { syncAllJobSources } from "./jobSync.js";
import { scoreJob } from "./scoring.js";

export async function runAgentForUser(
  userId: string,
  trigger: "manual" | "schedule" = "manual"
) {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  const profile = await Profile.findOne({ userId });
  if (!profile?.fullName) {
    throw new Error("Complete your profile before running the agent");
  }

  const agent = user.agent || ({} as typeof user.agent);
  const minScore = Number(agent.minScore ?? 65);
  const maxJobs = Math.min(Number(agent.maxJobsPerRun ?? 5), 10);
  const sources = (agent.sources || []).map(String).filter(Boolean);
  const autoTailor = agent.autoTailor !== false;

  const sync = await syncAllJobSources();
  const filter: Record<string, unknown> = {};
  if (sources.length === 1) filter.source = sources[0];
  else if (sources.length > 1) filter.source = { $in: sources };

  const jobs = await Job.find(filter).sort({ postedAt: -1, createdAt: -1 }).limit(400);
  const prefs = user.preferences || {};
  const scored = jobs
    .map((job) => ({
      job,
      score: scoreJob(job, prefs, profile.skills || []),
    }))
    .filter((x) => x.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, maxJobs);

  let tailoredCount = 0;
  const jobIds: string[] = [];

  for (const item of scored) {
    jobIds.push(String(item.job._id));

    if (!autoTailor) {
      await Application.findOneAndUpdate(
        { userId, jobId: item.job._id },
        {
          userId,
          jobId: item.job._id,
          status: "saved",
          notes: `Agent saved (score ${item.score}%).`,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      continue;
    }

    try {
      const existing = await TailoredDoc.findOne({ userId, jobId: item.job._id });
      let tailored = existing;
      if (!tailored) {
        const result = await tailorCvForJob(profile, item.job);
        tailored = await TailoredDoc.findOneAndUpdate(
          { userId, jobId: item.job._id },
          { userId, jobId: item.job._id, ...result },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );
      }

      await Application.findOneAndUpdate(
        { userId, jobId: item.job._id },
        {
          userId,
          jobId: item.job._id,
          tailoredDocId: tailored?._id,
          status: "tailored",
          notes: `Agent tailored (feed score ${item.score}%, CV match ${
            tailored?.matchScore ?? "—"
          }%). Review then apply.`,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
      tailoredCount += 1;
    } catch (err) {
      console.error(`[agent] tailor failed for ${item.job._id}`, err);
      await Application.findOneAndUpdate(
        { userId, jobId: item.job._id },
        {
          userId,
          jobId: item.job._id,
          status: "saved",
          notes: `Agent matched (score ${item.score}%) but tailor failed. Retry from job page.`,
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );
    }
  }

  const summary = `Synced ${sync.upserted} · matched ${scored.length} (≥${minScore}%) · tailored ${tailoredCount}`;
  const run = await AgentRun.create({
    userId,
    synced: sync.upserted,
    matched: scored.length,
    tailored: tailoredCount,
    jobIds,
    summary,
    trigger,
  });

  user.agent = {
    ...agent,
    lastRunAt: new Date(),
    lastRunSummary: summary,
  };
  await user.save();

  return {
    run,
    sync,
    matched: scored.map((s) => ({
      jobId: s.job._id,
      title: s.job.title,
      company: s.job.company,
      source: s.job.source,
      score: s.score,
    })),
    summary,
  };
}

export async function runScheduledAgents() {
  const hour = new Date().getUTCHours();
  const users = await User.find({
    "agent.enabled": true,
    "agent.runHourUtc": hour,
  });

  const results = [];
  for (const user of users) {
    try {
      const result = await runAgentForUser(String(user._id), "schedule");
      results.push({ userId: user._id, ok: true, summary: result.summary });
    } catch (err) {
      results.push({
        userId: user._id,
        ok: false,
        error: err instanceof Error ? err.message : "failed",
      });
    }
  }
  return results;
}
