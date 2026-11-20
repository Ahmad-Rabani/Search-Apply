import type { JobDoc } from "../models/Job.js";

export type Preferences = {
  roles?: string[];
  locations?: string[];
  remoteOnly?: boolean;
  minSalary?: number;
  keywords?: string[];
};

function normalize(text: string) {
  return text.toLowerCase();
}

export function scoreJob(
  job: JobDoc,
  preferences: Preferences,
  skills: string[] = []
): number {
  const haystack = normalize(
    [job.title, job.company, job.location, job.description, ...(job.tags || [])].join(" ")
  );

  let score = 0;
  const roles = preferences.roles || [];
  const keywords = [...(preferences.keywords || []), ...skills];

  for (const role of roles) {
    if (role && haystack.includes(normalize(role))) score += 25;
  }

  let keywordHits = 0;
  for (const kw of keywords) {
    if (kw && haystack.includes(normalize(kw))) keywordHits += 1;
  }
  score += Math.min(40, keywordHits * 4);

  if (preferences.remoteOnly) {
    if (job.remote || haystack.includes("remote")) score += 15;
    else score -= 20;
  }

  if (preferences.locations?.length) {
    const locHit = preferences.locations.some((loc) =>
      haystack.includes(normalize(loc))
    );
    if (locHit) score += 10;
  }

  if (preferences.minSalary && job.salaryMax) {
    if (job.salaryMax >= preferences.minSalary) score += 10;
    else score -= 10;
  }

  return Math.max(0, Math.min(100, Math.round(score)));
}
