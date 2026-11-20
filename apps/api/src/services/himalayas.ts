import { Job } from "../models/Job.js";
import { stripHtml } from "../utils/html.js";

type HimalayasJob = {
  title?: string;
  excerpt?: string;
  description?: string;
  companyName?: string;
  companySlug?: string;
  employmentType?: string;
  minSalary?: number | null;
  maxSalary?: number | null;
  currency?: string | null;
  seniority?: string[];
  locationRestrictions?: string[];
  categories?: string[];
  parentCategories?: string[];
  pubDate?: number;
  applicationLink?: string;
  guid?: string;
};

const SEARCH_QUERIES = [
  "software engineer",
  "frontend",
  "react",
  "full stack",
  "backend",
];

export async function syncHimalayasJobs(limit = 80) {
  const seen = new Set<string>();
  const collected: HimalayasJob[] = [];

  for (const q of SEARCH_QUERIES) {
    if (collected.length >= limit) break;
    const url = `https://himalayas.app/jobs/api/search?q=${encodeURIComponent(q)}&limit=20`;
    const res = await fetch(url, {
      headers: {
        "User-Agent": "SearchAndApply/1.0",
        Accept: "application/json",
      },
    });
    if (!res.ok) {
      console.warn(`[himalayas] search "${q}" failed: ${res.status}`);
      continue;
    }
    const data = (await res.json()) as { jobs?: HimalayasJob[] };
    for (const j of data.jobs || []) {
      const id = j.guid || j.applicationLink;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      collected.push(j);
      if (collected.length >= limit) break;
    }
  }

  let upserted = 0;
  for (const j of collected) {
    const externalId = j.guid || j.applicationLink;
    if (!externalId || !j.title) continue;

    const location =
      (j.locationRestrictions || []).filter(Boolean).join(", ") || "Remote";
    const tags = [
      ...(j.categories || []),
      ...(j.parentCategories || []),
      ...(j.seniority || []),
      j.employmentType,
    ]
      .filter(Boolean)
      .map(String);

    await Job.findOneAndUpdate(
      { source: "himalayas", externalId: String(externalId) },
      {
        source: "himalayas",
        externalId: String(externalId),
        title: j.title,
        company: j.companyName || "Unknown",
        location,
        url: j.applicationLink || j.guid || "",
        description: stripHtml(j.description || j.excerpt || ""),
        tags,
        salaryMin: j.minSalary ?? undefined,
        salaryMax: j.maxSalary ?? undefined,
        currency: j.currency || undefined,
        remote: true,
        postedAt: j.pubDate ? new Date(j.pubDate * 1000) : undefined,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    upserted += 1;
  }

  return { source: "himalayas", upserted, totalFetched: collected.length };
}
