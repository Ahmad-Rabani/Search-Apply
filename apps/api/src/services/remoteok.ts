import { Job } from "../models/Job.js";

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

  if (!res.ok) {
    throw new Error(`RemoteOK fetch failed: ${res.status}`);
  }

  const data = (await res.json()) as RemoteOkJob[];
  // First item is often metadata
  const jobs = data.filter((j) => j && j.id && j.position).slice(0, limit);

  let upserted = 0;
  for (const j of jobs) {
    const externalId = String(j.id);
    const tags = (j.tags || []).map(String);
    await Job.findOneAndUpdate(
      { source: "remoteok", externalId },
      {
        source: "remoteok",
        externalId,
        title: j.position || "Untitled",
        company: j.company || "Unknown",
        location: j.location || "Remote",
        url: j.url || `https://remoteok.com/remote-jobs/${j.slug || j.id}`,
        description: stripHtml(j.description || ""),
        tags,
        salaryMin: j.salary_min,
        salaryMax: j.salary_max,
        remote: true,
        postedAt: j.epoch ? new Date(j.epoch * 1000) : j.date ? new Date(j.date) : undefined,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    upserted += 1;
  }

  return { upserted, totalFetched: jobs.length };
}

function stripHtml(html: string) {
  return html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}
