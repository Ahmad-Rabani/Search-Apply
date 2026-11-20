import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { PlatformBadge } from "../components/PlatformBadge";
import type { Job } from "../types";

type SyncSource = {
  source: string;
  upserted: number;
  skipped?: boolean;
  error?: string;
  reason?: string;
};

function jobsListPath(query: string) {
  const trimmed = query.trim();
  return trimmed ? `/jobs?q=${encodeURIComponent(trimmed)}` : "/jobs";
}

export function JobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const [jobs, setJobs] = useState<Job[]>([]);
  const [q, setQ] = useState(urlQuery);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadJobs(search: string) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      params.set("limit", "50");
      const data = await api<{ jobs: Job[] }>(`/api/jobs?${params}`);
      setJobs(data.jobs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }

  function applySearch(search: string) {
    const trimmed = search.trim();
    setQ(trimmed);
    if (trimmed) setSearchParams({ q: trimmed });
    else setSearchParams({});
    void loadJobs(trimmed);
  }

  async function syncJobs() {
    setSyncing(true);
    setMessage("");
    setError("");
    try {
      const data = await api<{ upserted: number; sources: SyncSource[] }>(
        "/api/jobs/sync",
        { method: "POST" }
      );
      const parts = (data.sources || [])
        .filter((s) => !s.skipped)
        .map((s) =>
          s.error ? `${s.source}: error` : `${s.source}: ${s.upserted}`
        );
      setMessage(`Synced ${data.upserted} jobs (${parts.join(" · ")})`);
      await loadJobs(q);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    setQ(urlQuery);
    void loadJobs(urlQuery);
  }, [urlQuery]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-teal-950">Job feed</h1>
          <p className="mt-1 text-teal-950/65">
            Sync RemoteOK, Remotive, Arbeitnow, Jobicy (+ Adzuna if keys set), then tailor a CV.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void syncJobs()}
          disabled={syncing}
          className="rounded-lg bg-teal-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-60"
        >
          {syncing ? "Syncing boards…" : "Sync all boards"}
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        {["remoteok", "remotive", "arbeitnow", "jobicy", "adzuna"].map((s) => (
          <PlatformBadge key={s} source={s} size="sm" />
        ))}
      </div>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          applySearch(q);
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search title, company, skills…"
          className="flex-1 rounded-lg border border-teal-900/15 bg-white/80 px-3 py-2 outline-none focus:border-teal-700"
        />
        <button
          type="submit"
          className="rounded-lg border border-teal-900/15 bg-white px-4 py-2 text-sm font-semibold"
        >
          Search
        </button>
        {urlQuery && (
          <button
            type="button"
            onClick={() => applySearch("")}
            className="rounded-lg border border-teal-900/15 bg-white px-3 py-2 text-sm font-medium text-teal-950/70"
          >
            Clear
          </button>
        )}
      </form>

      {message && <p className="text-sm text-teal-800">{message}</p>}
      {error && <p className="text-sm text-red-700">{error}</p>}

      {loading ? (
        <p className="text-teal-950/60">Loading jobs…</p>
      ) : jobs.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-teal-900/20 bg-white/50 p-8 text-center">
          <p className="font-medium text-teal-950">
            {q.trim() ? `No jobs found for “${q.trim()}”` : "No jobs yet"}
          </p>
          <p className="mt-1 text-sm text-teal-950/60">
            {q.trim()
              ? "Try fewer keywords (e.g. react) or Sync all boards."
              : "Click Sync all boards to pull listings from multiple platforms."}
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {jobs.map((job) => (
            <li key={job._id}>
              <Link
                to={`/jobs/${job._id}`}
                state={{ fromJobs: jobsListPath(urlQuery || q) }}
                className="block rounded-2xl border border-teal-900/10 bg-white/75 p-4 transition hover:border-teal-700/40 hover:bg-white"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 space-y-2">
                    <PlatformBadge source={job.source} size="sm" />
                    <h2 className="text-lg font-semibold text-teal-950">{job.title}</h2>
                    <p className="text-sm text-teal-950/70">
                      {job.company} · {job.location || "Remote"}
                    </p>
                  </div>
                  <span className="rounded-md bg-teal-900/8 px-2.5 py-1 text-sm font-semibold text-teal-900">
                    {job.relevanceScore ?? 0}% match
                  </span>
                </div>
                {job.tags?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {job.tags.slice(0, 8).map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-teal-900/5 px-2 py-0.5 text-xs text-teal-950/70"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
