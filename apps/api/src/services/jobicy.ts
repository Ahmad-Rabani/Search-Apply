import { Job } from "../models/Job.js";
import { stripHtml } from "../utils/html.js";

type JobicyJob = {
  id?: number | string;
  url?: string;
  jobTitle?: string;
  companyName?: string;
  companyLogo?: string;
  jobIndustry?: string[] | string;
  jobType?: string[] | string;
  jobGeo?: string;
  jobLevel?: string;
  jobExcerpt?: string;
  jobDescription?: string;
  pubDate?: string;
  salaryMin?: number;
  salaryMax?: number;
};

export async function syncJobicyJobs(limit = 50) {
  const res = await fetch("https://jobicy.com/api/v2/remote-jobs?count=50", {
    headers: {
      "User-Agent": "SearchAndApply/1.0",
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`Jobicy fetch failed: ${res.status}`);

  const data = (await res.json()) as { jobs?: JobicyJob[] };
  const jobs = (data.jobs || []).slice(0, limit);

  let upserted = 0;
  for (const j of jobs) {
    if (!j.id || !j.jobTitle) continue;
    const industry = Array.isArray(j.jobIndustry)
      ? j.jobIndustry
      : j.jobIndustry
        ? [j.jobIndustry]
        : [];
    const types = Array.isArray(j.jobType) ? j.jobType : j.jobType ? [j.jobType] : [];
    const tags = [...industry, ...types, j.jobLevel].filter(Boolean).map(String);

    await Job.findOneAndUpdate(
      { source: "jobicy", externalId: String(j.id) },
      {
        source: "jobicy",
        externalId: String(j.id),
        title: j.jobTitle,
        company: j.companyName || "Unknown",
        location: j.jobGeo || "Remote",
        url: j.url || `https://jobicy.com/job/${j.id}`,
        description: stripHtml(j.jobDescription || j.jobExcerpt || ""),
        tags,
        salaryMin: j.salaryMin,
        salaryMax: j.salaryMax,
        remote: true,
        postedAt: j.pubDate ? new Date(j.pubDate) : undefined,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    upserted += 1;
  }

  return { source: "jobicy", upserted, totalFetched: jobs.length };
}
