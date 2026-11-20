import { syncAdzunaJobs } from "./adzuna.js";
import { syncArbeitnowJobs } from "./arbeitnow.js";
import { syncHimalayasJobs } from "./himalayas.js";
import { syncJobicyJobs } from "./jobicy.js";
import { syncRemoteOkJobs } from "./remoteok.js";
import { syncRemotiveJobs } from "./remotive.js";
import { syncWeWorkRemotelyJobs } from "./weworkremotely.js";
import { syncWorkingNomadsJobs } from "./workingnomads.js";

type SyncResult = {
  source: string;
  upserted: number;
  totalFetched?: number;
  skipped?: boolean;
  reason?: string;
  error?: string;
};

async function safe(name: string, fn: () => Promise<SyncResult>): Promise<SyncResult> {
  try {
    return await fn();
  } catch (err) {
    console.error(`[sync:${name}]`, err);
    return {
      source: name,
      upserted: 0,
      error: err instanceof Error ? err.message : "Sync failed",
    };
  }
}

export async function syncAllJobSources() {
  const results = await Promise.all([
    safe("remoteok", () => syncRemoteOkJobs()),
    safe("remotive", () => syncRemotiveJobs()),
    safe("arbeitnow", () => syncArbeitnowJobs()),
    safe("jobicy", () => syncJobicyJobs()),
    safe("himalayas", () => syncHimalayasJobs()),
    safe("weworkremotely", () => syncWeWorkRemotelyJobs()),
    safe("workingnomads", () => syncWorkingNomadsJobs()),
    safe("adzuna", () => syncAdzunaJobs()),
  ]);

  const upserted = results.reduce((sum, r) => sum + (r.upserted || 0), 0);
  return { upserted, sources: results };
}
