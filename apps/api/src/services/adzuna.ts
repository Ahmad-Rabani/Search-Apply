import { config } from "../config.js";
import { Job } from "../models/Job.js";
import { stripHtml } from "../utils/html.js";

type AdzunaJob = {
  id?: string;
  title?: string;
  description?: string;
  created?: string;
  redirect_url?: string;
  company?: { display_name?: string };
  location?: { display_name?: string };
  salary_min?: number;
  salary_max?: number;
  contract_time?: string;
  category?: { label?: string };
};

/** Adzuna aggregates many boards (Indeed-like listings). Needs free API keys. */
export async function syncAdzunaJobs(limit = 50) {
  if (!config.adzunaAppId || !config.adzunaAppKey) {
    return {
      source: "adzuna",
      upserted: 0,
      totalFetched: 0,
      skipped: true,
      reason: "ADZUNA_APP_ID / ADZUNA_APP_KEY not set",
    };
  }

  const params = new URLSearchParams({
    app_id: config.adzunaAppId,
    app_key: config.adzunaAppKey,
    results_per_page: String(Math.min(limit, 50)),
    what: "software developer OR frontend OR react OR fullstack",
    content_type: "jobs",
  });

  const url = `https://api.adzuna.com/v1/api/jobs/us/search/1?${params}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "SearchAndApply/1.0" },
  });
  if (!res.ok) throw new Error(`Adzuna fetch failed: ${res.status}`);

  const data = (await res.json()) as { results?: AdzunaJob[] };
  const jobs = data.results || [];

  let upserted = 0;
  for (const j of jobs) {
    if (!j.id || !j.title) continue;
    const location = j.location?.display_name || "";
    const remote = /remote/i.test(location) || /remote/i.test(j.title || "");

    await Job.findOneAndUpdate(
      { source: "adzuna", externalId: String(j.id) },
      {
        source: "adzuna",
        externalId: String(j.id),
        title: j.title,
        company: j.company?.display_name || "Unknown",
        location: location || "Unknown",
        url: j.redirect_url || "",
        description: stripHtml(j.description || ""),
        tags: [j.category?.label, j.contract_time].filter(Boolean).map(String),
        salaryMin: j.salary_min,
        salaryMax: j.salary_max,
        remote,
        postedAt: j.created ? new Date(j.created) : undefined,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    upserted += 1;
  }

  return { source: "adzuna", upserted, totalFetched: jobs.length, skipped: false };
}
