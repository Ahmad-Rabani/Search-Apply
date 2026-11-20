import { Job } from "../models/Job.js";
import { stripHtml } from "../utils/html.js";

type RemotiveJob = {
  id: number;
  url?: string;
  title?: string;
  company_name?: string;
  category?: string;
  job_type?: string;
  candidate_required_location?: string;
  salary?: string;
  description?: string;
  publication_date?: string;
  tags?: string[];
};

export async function syncRemotiveJobs(limit = 80) {
  const res = await fetch("https://remotive.com/api/remote-jobs", {
    headers: {
      "User-Agent": "SearchAndApply/1.0",
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`Remotive fetch failed: ${res.status}`);

  const data = (await res.json()) as { jobs?: RemotiveJob[] };
  const jobs = (data.jobs || []).slice(0, limit);

  let upserted = 0;
  for (const j of jobs) {
    if (!j.id || !j.title) continue;
    const tags = [
      ...(j.tags || []),
      j.category,
      j.job_type,
    ]
      .filter(Boolean)
      .map(String);

    await Job.findOneAndUpdate(
      { source: "remotive", externalId: String(j.id) },
      {
        source: "remotive",
        externalId: String(j.id),
        title: j.title,
        company: j.company_name || "Unknown",
        location: j.candidate_required_location || "Remote",
        url: j.url || `https://remotive.com/remote-jobs/${j.id}`,
        description: stripHtml(j.description || ""),
        tags,
        remote: true,
        postedAt: j.publication_date ? new Date(j.publication_date) : undefined,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    upserted += 1;
  }

  return { source: "remotive", upserted, totalFetched: jobs.length };
}
