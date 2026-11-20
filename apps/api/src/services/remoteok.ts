import { Job } from "../models/Job.js";
import { stripHtml } from "../utils/html.js";

type RemoteOkJob = {
  id: string | number;
  slug?: string;
  company?: string;
  position?: string;
  description?: string;
  location?: string;
  url?: string;
  tags?: string[];
  salary_min?: number;
  salary_max?: number;
  date?: string;
  epoch?: number;
};

export async function syncRemoteOkJobs(limit = 80) {
  const res = await fetch("https://remoteok.com/api", {
    headers: {
      "User-Agent": "SearchAndApply/1.0 (personal job agent)",
      Accept: "application/json",
    },
  });

  if (!res.ok) throw new Error(`RemoteOK fetch failed: ${res.status}`);

  const data = (await res.json()) as RemoteOkJob[];
  const jobs = data.filter((j) => j && j.id && j.position).slice(0, limit);

  let upserted = 0;
  for (const j of jobs) {
    await Job.findOneAndUpdate(
      { source: "remoteok", externalId: String(j.id) },
      {
        source: "remoteok",
        externalId: String(j.id),
        title: j.position || "Untitled",
        company: j.company || "Unknown",
        location: j.location || "Remote",
        url: j.url || `https://remoteok.com/remote-jobs/${j.slug || j.id}`,
        description: stripHtml(j.description || ""),
        tags: (j.tags || []).map(String),
        salaryMin: j.salary_min,
        salaryMax: j.salary_max,
        remote: true,
        postedAt: j.epoch
          ? new Date(j.epoch * 1000)
          : j.date
            ? new Date(j.date)
            : undefined,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    upserted += 1;
  }

  return { source: "remoteok", upserted, totalFetched: jobs.length };
}
