import { useEffect, useMemo, useState } from "react";
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

const ALL_PLATFORMS = ["remoteok", "remotive", "arbeitnow", "jobicy", "adzuna"] as const;

function jobsListPath(query: string, sources: string[]) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (sources.length) params.set("sources", sources.join(","));
  const qs = params.toString();
  return qs ? `/jobs?${qs}` : "/jobs";
}

export function JobsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const urlQuery = searchParams.get("q") || "";
  const urlSources = useMemo(
    () =>
      (searchParams.get("sources") || "")
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    [searchParams]
  );

  const [jobs, setJobs] = useState<Job[]>([]);
  const [q, setQ] = useState(urlQuery);
  const [selectedSources, setSelectedSources] = useState<string[]>(urlSources);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function loadJobs(search: string, sources: string[]) {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());
      if (sources.length) params.set("sources", sources.join(","));
      params.set("limit", "50");
      const data = await api<{ jobs: Job[] }>(`/api/jobs?${params}`);
      setJobs(data.jobs);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load jobs");
    } finally {
      setLoading(false);
    }
  }

  function syncUrl(search: string, sources: string[]) {
    const next = new URLSearchParams();
    if (search.trim()) next.set("q", search.trim());
    if (sources.length) next.set("sources", sources.join(","));
    setSearchParams(next);
  }

  function applyFilters(search = q, sources = selectedSources) {
    const trimmed = search.trim();
    setQ(trimmed);
    setSelectedSources(sources);
    syncUrl(trimmed, sources);
    void loadJobs(trimmed, sources);
  }

  function toggleSource(source: string) {
    const next = selectedSources.includes(source)
      ? selectedSources.filter((s) => s !== source)
      : [...selectedSources, source];
    applyFilters(q, next);
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
      await loadJobs(q, selectedSources);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Sync failed");
    } finally {
      setSyncing(false);
    }
  }

  useEffect(() => {
    setQ(urlQuery);
    setSelectedSources(urlSources);
    void loadJobs(urlQuery, urlSources);
  }, [urlQuery, urlSources.join(",")]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-3xl text-teal-950">Job feed</h1>
          <p className="mt-1 text-teal-950/65">
            Filter by platform, sync boards, then tailor a matched CV before apply.
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

      <section className="rounded-2xl border border-teal-900/10 bg-white/70 p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm font-semibold text-teal-950">Platform filter</p>
          <button
            type="button"
            className="text-xs font-semibold text-teal-800 hover:underline"
            onClick={() => applyFilters(q, [])}
          >
            All platforms
          </button>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {ALL_PLATFORMS.map((source) => {
            const active = selectedSources.includes(source);
            return (
              <button
                key={source}
                type="button"
                onClick={() => toggleSource(source)}
                className={`rounded-lg transition ${
                  active
                    ? "ring-2 ring-teal-700 ring-offset-1"
                    : "opacity-55 hover:opacity-100"
                }`}
              >
                <PlatformBadge source={source} size="sm" />
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-xs text-teal-950/55">
          {selectedSources.length
            ? `Showing: ${selectedSources.join(", ")}`
            : "Showing jobs from all platforms"}
        </p>
      </section>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          applyFilters(q, selectedSources);
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
        {(urlQuery || urlSources.length > 0) && (
          <button
            type="button"
            onClick={() => applyFilters("", [])}
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
            {q.trim() || selectedSources.length
              ? "No jobs match these filters"
              : "No jobs yet"}
          </p>
          <p className="mt-1 text-sm text-teal-950/60">
            Try clearing filters or Sync all boards.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {jobs.map((job) => (
            <li key={job._id}>
              <Link
                to={`/jobs/${job._id}`}
                state={{ fromJobs: jobsListPath(urlQuery || q, selectedSources) }}
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
