import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { PlatformBadge } from "../components/PlatformBadge";

type DashData = {
  stats: {
    jobsIndexed: number;
    applications: number;
    tailoredCvs: number;
    applied: number;
    interviews: number;
    unreadNotifications: number;
    profileComplete: boolean;
    agentEnabled: boolean;
    lastAgentRun?: string | null;
    lastAgentSummary?: string;
  };
  byStatus: Record<string, number>;
  topMatches: Array<{
    _id: string;
    title: string;
    company: string;
    source: string;
    location?: string;
    relevanceScore: number;
  }>;
  recentRuns: Array<{ _id: string; summary: string; createdAt?: string; trigger: string }>;
  recentApps: Array<{
    _id: string;
    status: string;
    jobId?: { _id: string; title?: string; company?: string; source?: string } | string;
  }>;
};

function Stat({ label, value, hint }: { label: string; value: string | number; hint?: string }) {
  return (
    <div className="saa-card p-4">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal-950/45">{label}</p>
      <p className="mt-2 font-display text-3xl text-teal-950">{value}</p>
      {hint && <p className="mt-1 text-xs text-teal-950/50">{hint}</p>}
    </div>
  );
}

export function DashboardPage() {
  const [data, setData] = useState<DashData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const res = await api<DashData>("/api/dashboard");
        setData(res);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load dashboard");
      } finally {
        setLoading(false);
      }
    }
    void load();
  }, []);

  if (loading) return <p className="text-teal-950/55">Loading dashboard…</p>;
  if (error || !data) return <p className="text-red-700">{error || "No data"}</p>;

  const { stats } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-800/70">
            Phase 4
          </p>
          <h1 className="font-display text-3xl text-teal-950 md:text-4xl">Dashboard</h1>
          <p className="mt-1 text-sm text-teal-950/60">
            Snapshot of your hunt: matches, pipeline, agent activity, and alerts.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/jobs" className="saa-btn saa-btn-primary">
            Browse jobs
          </Link>
          <Link to="/agent" className="saa-btn saa-btn-secondary">
            Agent settings
          </Link>
        </div>
      </div>

      {!stats.profileComplete && (
        <div className="saa-card border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-950">
          Profile incomplete —{" "}
          <Link to="/profile" className="font-semibold underline">
            finish your base CV
          </Link>{" "}
          for better matching.
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Jobs indexed" value={stats.jobsIndexed} />
        <Stat label="Applications" value={stats.applications} hint={`${stats.applied} applied`} />
        <Stat label="Tailored CVs" value={stats.tailoredCvs} />
        <Stat
          label="Interviews"
          value={stats.interviews}
          hint={stats.agentEnabled ? "Agent on" : "Agent off"}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="saa-card p-4">
          <h2 className="font-display text-xl text-teal-950">Pipeline</h2>
          <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
            {Object.entries(data.byStatus).map(([status, count]) => (
              <div key={status} className="rounded-xl bg-teal-950/[0.03] px-3 py-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-teal-950/45">
                  {status}
                </p>
                <p className="text-xl font-semibold text-teal-950">{count}</p>
              </div>
            ))}
          </div>
          <Link to="/tracker" className="mt-4 inline-block text-sm font-semibold text-teal-800">
            Open tracker →
          </Link>
        </section>

        <section className="saa-card p-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="font-display text-xl text-teal-950">Top matches</h2>
            <span className="text-xs text-teal-950/45">{stats.unreadNotifications} unread alerts</span>
          </div>
          <ul className="mt-3 space-y-2">
            {data.topMatches.length === 0 ? (
              <li className="text-sm text-teal-950/50">Sync boards to see matches.</li>
            ) : (
              data.topMatches.map((job) => (
                <li key={job._id}>
                  <Link
                    to={`/jobs/${job._id}`}
                    className="flex items-start justify-between gap-3 rounded-xl border border-teal-900/8 px-3 py-2 hover:bg-teal-950/[0.02]"
                  >
                    <div className="min-w-0">
                      <PlatformBadge source={job.source} size="sm" />
                      <p className="mt-1 truncate text-sm font-semibold text-teal-950">
                        {job.title}
                      </p>
                      <p className="truncate text-xs text-teal-950/50">{job.company}</p>
                    </div>
                    <span className="shrink-0 rounded-lg bg-teal-800 px-2 py-1 text-xs font-bold text-white">
                      {job.relevanceScore}%
                    </span>
                  </Link>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="saa-card p-4">
          <h2 className="font-display text-xl text-teal-950">Recent agent runs</h2>
          {stats.lastAgentSummary && (
            <p className="mt-2 text-sm text-teal-900/70">{stats.lastAgentSummary}</p>
          )}
          <ul className="mt-3 space-y-2">
            {data.recentRuns.length === 0 ? (
              <li className="text-sm text-teal-950/50">No agent runs yet.</li>
            ) : (
              data.recentRuns.map((run) => (
                <li key={run._id} className="rounded-xl bg-teal-950/[0.03] px-3 py-2 text-sm">
                  <p className="font-medium text-teal-950">{run.summary}</p>
                  <p className="text-xs text-teal-950/45">
                    {run.trigger}
                    {run.createdAt ? ` · ${new Date(run.createdAt).toLocaleString()}` : ""}
                  </p>
                </li>
              ))
            )}
          </ul>
        </section>

        <section className="saa-card p-4">
          <h2 className="font-display text-xl text-teal-950">Recent applications</h2>
          <ul className="mt-3 space-y-2">
            {data.recentApps.length === 0 ? (
              <li className="text-sm text-teal-950/50">Nothing in tracker yet.</li>
            ) : (
              data.recentApps.map((app) => {
                const job = typeof app.jobId === "object" ? app.jobId : null;
                return (
                  <li
                    key={app._id}
                    className="flex items-center justify-between gap-2 rounded-xl border border-teal-900/8 px-3 py-2"
                  >
                    <div className="min-w-0">
                      {job?.source && <PlatformBadge source={job.source} size="sm" />}
                      <p className="mt-1 truncate text-sm font-semibold text-teal-950">
                        {job?.title || "Job"}
                      </p>
                    </div>
                    <span className="rounded-md bg-teal-900/8 px-2 py-1 text-xs font-semibold capitalize text-teal-900">
                      {app.status}
                    </span>
                  </li>
                );
              })
            )}
          </ul>
        </section>
      </div>
    </div>
  );
}
