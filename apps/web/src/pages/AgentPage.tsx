import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { PlatformBadge } from "../components/PlatformBadge";

type AgentSettings = {
  enabled?: boolean;
  minScore?: number;
  sources?: string[];
  runHourUtc?: number;
  autoTailor?: boolean;
  maxJobsPerRun?: number;
  notifyEmail?: boolean;
  lastRunAt?: string;
  lastRunSummary?: string;
};

type AgentRun = {
  _id: string;
  synced: number;
  matched: number;
  tailored: number;
  summary: string;
  trigger: string;
  createdAt?: string;
  jobIds?: Array<{ _id: string; title?: string; company?: string; source?: string }>;
};

const PLATFORMS = ["remoteok", "remotive", "arbeitnow", "jobicy", "adzuna"];

export function AgentPage() {
  const [agent, setAgent] = useState<AgentSettings>({
    enabled: false,
    minScore: 65,
    sources: [],
    runHourUtc: 9,
    autoTailor: true,
    maxJobsPerRun: 5,
    notifyEmail: true,
  });
  const [runs, setRuns] = useState<AgentRun[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function load() {
    setLoading(true);
    setError("");
    try {
      const data = await api<{ agent: AgentSettings; runs: AgentRun[] }>("/api/agent");
      setAgent({
        enabled: false,
        minScore: 65,
        sources: [],
        runHourUtc: 9,
        autoTailor: true,
        maxJobsPerRun: 5,
        notifyEmail: true,
        ...data.agent,
      });
      setRuns(data.runs || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load agent");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function save() {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      const data = await api<{ agent: AgentSettings }>("/api/agent", {
        method: "PUT",
        body: JSON.stringify(agent),
      });
      setAgent({ ...agent, ...data.agent });
      setMessage("Agent settings saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setBusy(false);
    }
  }

  async function runNow() {
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await save();
      const data = await api<{ summary: string }>("/api/agent/run", { method: "POST" });
      setMessage(data.summary || "Agent run complete");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Agent run failed");
    } finally {
      setBusy(false);
    }
  }

  function toggleSource(source: string) {
    const current = agent.sources || [];
    const next = current.includes(source)
      ? current.filter((s) => s !== source)
      : [...current, source];
    setAgent({ ...agent, sources: next });
  }

  if (loading) return <p className="text-teal-950/55">Loading agent…</p>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-800/70">
            Phase 3
          </p>
          <h1 className="font-display text-3xl text-teal-950 md:text-4xl">Agent mode</h1>
          <p className="mt-1 max-w-2xl text-sm text-teal-950/60">
            Schedule daily hunting: sync boards, keep roles above your score threshold, and
            auto-tailor CVs for review — you still approve apply.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void save()}
            className="saa-btn saa-btn-secondary disabled:opacity-60"
          >
            Save settings
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void runNow()}
            className="saa-btn saa-btn-primary disabled:opacity-60"
          >
            {busy ? "Running…" : "Run agent now"}
          </button>
        </div>
      </div>

      <section className="saa-card grid gap-5 p-5 md:grid-cols-2">
        <label className="flex items-center justify-between gap-3 rounded-xl bg-teal-950/[0.03] px-4 py-3 md:col-span-2">
          <div>
            <p className="font-semibold text-teal-950">Enable scheduled agent</p>
            <p className="text-sm text-teal-950/55">Runs once daily at your chosen UTC hour</p>
          </div>
          <input
            type="checkbox"
            checked={Boolean(agent.enabled)}
            onChange={(e) => setAgent({ ...agent, enabled: e.target.checked })}
            className="h-5 w-5 accent-teal-700"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Min match score ({agent.minScore}%)</span>
          <input
            type="range"
            min={40}
            max={95}
            value={agent.minScore || 65}
            onChange={(e) => setAgent({ ...agent, minScore: Number(e.target.value) })}
            className="w-full accent-teal-700"
          />
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Daily run hour (UTC)</span>
          <select
            className="saa-input"
            value={agent.runHourUtc ?? 9}
            onChange={(e) => setAgent({ ...agent, runHourUtc: Number(e.target.value) })}
          >
            {Array.from({ length: 24 }, (_, h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, "0")}:00 UTC
              </option>
            ))}
          </select>
        </label>

        <label className="block text-sm">
          <span className="mb-1.5 block font-medium">Max jobs per run</span>
          <input
            type="number"
            min={1}
            max={10}
            className="saa-input"
            value={agent.maxJobsPerRun ?? 5}
            onChange={(e) => setAgent({ ...agent, maxJobsPerRun: Number(e.target.value) || 5 })}
          />
        </label>

        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={agent.autoTailor !== false}
            onChange={(e) => setAgent({ ...agent, autoTailor: e.target.checked })}
            className="accent-teal-700"
          />
          Auto-tailor matched CVs
        </label>

        <div className="md:col-span-2">
          <p className="mb-2 text-sm font-medium">Platforms (empty = all)</p>
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map((source) => {
              const active = (agent.sources || []).includes(source);
              return (
                <button
                  key={source}
                  type="button"
                  onClick={() => toggleSource(source)}
                  className={`rounded-md ${
                    active ? "ring-2 ring-teal-700/50 ring-offset-1" : "opacity-45"
                  }`}
                >
                  <PlatformBadge source={source} size="sm" />
                </button>
              );
            })}
          </div>
        </div>
      </section>

      {(agent.lastRunSummary || message) && (
        <div className="saa-card border-teal-700/20 bg-teal-50/60 px-4 py-3 text-sm text-teal-900">
          {message || agent.lastRunSummary}
          {agent.lastRunAt && (
            <span className="ml-2 text-teal-900/55">
              · last run {new Date(agent.lastRunAt).toLocaleString()}
            </span>
          )}
        </div>
      )}
      {error && <p className="text-sm text-red-700">{error}</p>}

      <section className="space-y-3">
        <h2 className="font-display text-xl text-teal-950">Recent runs</h2>
        {runs.length === 0 ? (
          <div className="saa-card p-6 text-sm text-teal-950/55">
            No runs yet. Save settings and click <strong>Run agent now</strong>.
          </div>
        ) : (
          runs.map((run) => (
            <article key={run._id} className="saa-card space-y-3 p-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-semibold text-teal-950">{run.summary}</p>
                  <p className="text-xs text-teal-950/50">
                    {run.trigger} ·{" "}
                    {run.createdAt ? new Date(run.createdAt).toLocaleString() : "—"}
                  </p>
                </div>
                <div className="flex gap-2 text-xs font-semibold">
                  <span className="rounded-md bg-teal-900/8 px-2 py-1">synced {run.synced}</span>
                  <span className="rounded-md bg-teal-900/8 px-2 py-1">matched {run.matched}</span>
                  <span className="rounded-md bg-teal-800 px-2 py-1 text-white">
                    tailored {run.tailored}
                  </span>
                </div>
              </div>
              {!!run.jobIds?.length && (
                <ul className="space-y-1.5 border-t border-teal-900/8 pt-3">
                  {run.jobIds.map((job) => (
                    <li key={job._id} className="flex flex-wrap items-center gap-2 text-sm">
                      {job.source && <PlatformBadge source={job.source} size="sm" />}
                      <Link
                        to={`/jobs/${job._id}`}
                        className="font-medium text-teal-900 hover:underline"
                      >
                        {job.title || "Job"}
                      </Link>
                      <span className="text-teal-950/45">{job.company}</span>
                    </li>
                  ))}
                </ul>
              )}
            </article>
          ))
        )}
      </section>
    </div>
  );
}
