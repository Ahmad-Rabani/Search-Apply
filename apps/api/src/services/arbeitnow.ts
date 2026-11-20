import { Job } from "../models/Job.js";
import { stripHtml } from "../utils/html.js";

type ArbeitnowJob = {
  slug?: string;
  company_name?: string;
  title?: string;
  description?: string;
  remote?: boolean;
  url?: string;
  tags?: string[];
  job_types?: string[];
  location?: string;
  created_at?: number;
};

export async function syncArbeitnowJobs(limit = 80) {
  const res = await fetch("https://www.arbeitnow.com/api/job-board-api", {
    headers: {
      "User-Agent": "SearchAndApply/1.0",
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`Arbeitnow fetch failed: ${res.status}`);

  const data = (await res.json()) as { data?: ArbeitnowJob[] };
  const jobs = (data.data || []).slice(0, limit);

  let upserted = 0;
  for (const j of jobs) {
    const externalId = j.slug || j.url;
    if (!externalId || !j.title) continue;
    const tags = [...(j.tags || []), ...(j.job_types || [])].map(String);

    await Job.findOneAndUpdate(
      { source: "arbeitnow", externalId: String(externalId) },
      {
        source: "arbeitnow",
        externalId: String(externalId),
        title: j.title,
        company: j.company_name || "Unknown",
        location: j.location || (j.remote ? "Remote" : "Unknown"),
        url: j.url || `https://www.arbeitnow.com/view/${j.slug}`,
        description: stripHtml(j.description || ""),
        tags,
        remote: Boolean(j.remote),
        postedAt: j.created_at ? new Date(j.created_at * 1000) : undefined,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    upserted += 1;
  }

  return { source: "arbeitnow", upserted, totalFetched: jobs.length };
}
