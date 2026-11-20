import { Job } from "../models/Job.js";
import { stripHtml } from "../utils/html.js";

type WorkingNomadsJob = {
  url?: string;
  title?: string;
  description?: string;
  company_name?: string;
  category_name?: string;
  tags?: string;
  location?: string;
  pub_date?: string;
};

const TECH_HINT =
  /engineer|developer|software|frontend|front-end|backend|back-end|full.?stack|react|typescript|javascript|python|devops|sre|data|mobile|ios|android|qa|ml|ai|cloud|node/i;

export async function syncWorkingNomadsJobs(limit = 60) {
  const res = await fetch("https://www.workingnomads.com/api/exposed_jobs/", {
    headers: {
      "User-Agent": "SearchAndApply/1.0",
      Accept: "application/json",
    },
  });
  if (!res.ok) throw new Error(`Working Nomads fetch failed: ${res.status}`);

  const data = (await res.json()) as WorkingNomadsJob[];
  const jobs = (Array.isArray(data) ? data : [])
    .filter((j) => {
      const hay = `${j.title || ""} ${j.category_name || ""} ${j.tags || ""}`;
      return TECH_HINT.test(hay);
    })
    .slice(0, limit);

  let upserted = 0;
  for (const j of jobs) {
    const externalId = j.url || `${j.company_name}-${j.title}`;
    if (!externalId || !j.title) continue;

    const tags = [
      ...(j.tags ? j.tags.split(",").map((t) => t.trim()) : []),
      j.category_name,
    ]
      .filter(Boolean)
      .map(String);

    await Job.findOneAndUpdate(
      { source: "workingnomads", externalId: String(externalId) },
      {
        source: "workingnomads",
        externalId: String(externalId),
        title: j.title,
        company: j.company_name || "Unknown",
        location: j.location || "Remote",
        url: j.url || "",
        description: stripHtml(j.description || ""),
        tags,
        remote: true,
        postedAt: j.pub_date ? new Date(j.pub_date) : undefined,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    upserted += 1;
  }

  return {
    source: "workingnomads",
    upserted,
    totalFetched: jobs.length,
  };
}
