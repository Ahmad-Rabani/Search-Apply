import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { PlatformBadge } from "../components/PlatformBadge";
import { PlatformFilter } from "../components/PlatformFilter";
import type { Job } from "../types";

type SyncSource = {
  source: string;
  upserted: number;
  skipped?: boolean;
  error?: string;
};

function jobsListPath(query: string, sources: string[]) {
  const params = new URLSearchParams();
  if (query.trim()) params.set("q", query.trim());
  if (sources.length) params.set("sources", sources.join(","));
  const qs = params.toString();
  return qs ? `/jobs?${qs}` : "/jobs";
}

function matchTone(score: number) {
  if (score >= 70) return "bg-teal-800 text-white";
  if (score >= 50) return "bg-teal-100 text-teal-900";
  return "bg-stone-100 text-stone-700";
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
        .map((s) => (s.error ? `${s.source}: error` : `${s.source}: ${s.upserted}`));
      setMessage(`Synced ${data.upserted} jobs · ${parts.join(" · ")}`);
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
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-800/70">
            Discover
          </p>
          <h1 className="font-display text-3xl text-teal-950 md:text-4xl">Job feed</h1>
          <p className="mt-1 max-w-xl text-sm text-teal-950/60">
            Search and filter roles, then open a job to match your CV before applying.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void syncJobs()}
          disabled={syncing}
          className="saa-btn saa-btn-secondary self-start disabled:opacity-60"
        >
          {syncing ? "Syncing…" : "Refresh boards"}
        </button>
      </div>

      <div className="saa-card p-3 md:p-4">
        <form
          className="flex flex-col gap-3 md:flex-row md:items-center"
          onSubmit={(e) => {
            e.preventDefault();
            applyFilters(q, selectedSources);
          }}
        >
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search title, company, skills…"
            className="saa-input md:flex-1"
          />
          <div className="flex gap-2">
            <button type="submit" className="saa-btn saa-btn-primary flex-1 md:flex-none">
              Search
            </button>
            {(urlQuery || urlSources.length > 0) && (
              <button
                type="button"
                onClick={() => applyFilters("", [])}
                className="saa-btn saa-btn-ghost"
              >
                Clear
              </button>
            )}
          </div>
        </form>

        <div className="mt-3 border-t border-teal-900/8 pt-3">
          <PlatformFilter
            dense
            selected={selectedSources}
            onChange={(next) => applyFilters(q, next)}
          />
        </div>
      </div>

      <div className="flex items-center justify-between gap-3 text-sm text-teal-950/55">
        <p>
          {loading
            ? "Loading…"
            : `${jobs.length} role${jobs.length === 1 ? "" : "s"}`}
          {selectedSources.length ? ` · ${selectedSources.join(", ")}` : ""}
          {urlQuery ? ` · “${urlQuery}”` : ""}
        </p>
        {message && <p className="text-teal-800">{message}</p>}
      </div>
      {error && <p className="text-sm text-red-700">{error}</p>}

      {loading ? (
        <div className="saa-card p-8 text-center text-teal-950/55">Loading jobs…</div>
      ) : jobs.length === 0 ? (
        <div className="saa-card border-dashed p-10 text-center">
          <p className="font-semibold text-teal-950">No matching roles</p>
          <p className="mt-1 text-sm text-teal-950/55">
            Clear filters or refresh boards for newer listings.
          </p>
        </div>
      ) : (
        <ul className="grid gap-3">
          {jobs.map((job) => (
            <li key={job._id}>
              <Link
                to={`/jobs/${job._id}`}
                state={{ fromJobs: jobsListPath(urlQuery || q, selectedSources) }}
                className="saa-card group block p-4 transition hover:-translate-y-0.5 hover:border-teal-700/25 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <PlatformBadge source={job.source} size="sm" />
                      {job.remote && (
                        <span className="rounded-md bg-teal-900/5 px-2 py-0.5 text-[11px] font-medium text-teal-900/70">
                          Remote
                        </span>
                      )}
                    </div>
                    <h2 className="text-lg font-semibold leading-snug text-teal-950 group-hover:text-teal-800">
                      {job.title}
                    </h2>
                    <p className="text-sm text-teal-950/60">
                      {job.company}
                      <span className="mx-1.5 text-teal-900/25">·</span>
                      {job.location || "Remote"}
                    </p>
                  </div>
                  <div
                    className={`shrink-0 rounded-xl px-3 py-2 text-center ${matchTone(
                      job.relevanceScore ?? 0
                    )}`}
                  >
                    <p className="text-[10px] font-semibold uppercase tracking-wide opacity-80">
                      Match
                    </p>
                    <p className="text-lg font-bold leading-none">
                      {job.relevanceScore ?? 0}%
                    </p>
                  </div>
                </div>
                {job.tags?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5 border-t border-teal-900/6 pt-3">
                    {job.tags.slice(0, 7).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-md bg-teal-950/[0.04] px-2 py-0.5 text-xs text-teal-950/65"
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
