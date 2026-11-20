import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { api, getToken } from "../api/client";
import { PlatformBadge } from "../components/PlatformBadge";
import type { Application, Job } from "../types";

const statuses = ["saved", "tailored", "applied", "interview", "offer", "rejected"] as const;
const platforms = ["", "remoteok", "remotive", "arbeitnow", "jobicy", "adzuna"];

export function TrackerPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    setError("");
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (sourceFilter) params.set("source", sourceFilter);
      const data = await api<{ applications: Application[] }>(
        `/api/applications?${params}`
      );
      setApps(data.applications);
      const notes: Record<string, string> = {};
      for (const a of data.applications) notes[a._id] = a.notes || "";
      setEditingNotes(notes);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [statusFilter, sourceFilter]);

  const counts = useMemo(() => {
    const map: Record<string, number> = {};
    for (const s of statuses) map[s] = 0;
    for (const a of apps) map[a.status] = (map[a.status] || 0) + 1;
    return map;
  }, [apps]);

  async function updateStatus(id: string, status: string) {
    try {
      await api(`/api/applications/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    }
  }

  async function saveNotes(id: string) {
    try {
      await api(`/api/applications/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ notes: editingNotes[id] || "" }),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Notes save failed");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-800/70">
          Pipeline
        </p>
        <h1 className="font-display text-3xl text-teal-950 md:text-4xl">Application tracker</h1>
        <p className="mt-1 text-sm text-teal-950/60">
          Filter by status and platform, keep notes, review apply screenshots.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {statuses.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(statusFilter === s ? "" : s)}
            className={`rounded-md px-3 py-1.5 text-xs font-semibold capitalize ${
              statusFilter === s
                ? "bg-teal-800 text-white"
                : "bg-teal-900/8 text-teal-950/75"
            }`}
          >
            {s}
            {apps.length > 0 && statusFilter === "" ? "" : ""}
            {statusFilter === "" || statusFilter === s
              ? ` (${counts[s] || 0})`
              : ""}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm font-medium text-teal-950/70">Platform</label>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="rounded-lg border border-teal-900/15 bg-white px-3 py-2 text-sm"
        >
          {platforms.map((p) => (
            <option key={p || "all"} value={p}>
              {p || "All platforms"}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}
      {loading ? (
        <p className="text-teal-950/60">Loading tracker…</p>
      ) : apps.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-teal-900/20 bg-white/50 p-8 text-center">
          <p className="font-medium">No applications yet</p>
          <p className="mt-1 text-sm text-teal-950/60">
            Tailor a CV or use Apply Assist from a job page.
          </p>
          <Link to="/jobs" className="mt-4 inline-block text-sm font-semibold text-teal-800">
            Browse jobs →
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {apps.map((app) => {
            const job = typeof app.jobId === "object" ? (app.jobId as Job) : null;
            return (
              <li
                key={app._id}
                className="space-y-3 rounded-2xl border border-teal-900/10 bg-white/80 p-4"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    {job?.source && <PlatformBadge source={job.source} size="sm" />}
                    <Link
                      to={job ? `/jobs/${job._id}` : "/jobs"}
                      className="text-lg font-semibold text-teal-950 hover:underline"
                    >
                      {job?.title || "Job"}
                    </Link>
                    <p className="text-sm text-teal-950/65">
                      {job?.company || "Unknown"} · updated{" "}
                      {app.updatedAt ? new Date(app.updatedAt).toLocaleDateString() : "—"}
                      {app.appliedAt
                        ? ` · applied ${new Date(app.appliedAt).toLocaleDateString()}`
                        : ""}
                    </p>
                  </div>
                  <select
                    value={app.status}
                    onChange={(e) => void updateStatus(app._id, e.target.value)}
                    className="rounded-lg border border-teal-900/15 bg-white px-3 py-2 text-sm font-medium"
                  >
                    {statuses.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <textarea
                  rows={2}
                  value={editingNotes[app._id] || ""}
                  onChange={(e) =>
                    setEditingNotes((prev) => ({ ...prev, [app._id]: e.target.value }))
                  }
                  onBlur={() => void saveNotes(app._id)}
                  placeholder="Notes (auto-saves on blur)"
                  className="w-full rounded-lg border border-teal-900/15 px-3 py-2 text-sm outline-none focus:border-teal-700"
                />

                {app.confirmationScreenshot && (
                  <a
                    className="inline-flex text-sm font-semibold text-teal-800 hover:underline"
                    href={`/api/applications/${app._id}/screenshot`}
                    onClick={(e) => {
                      e.preventDefault();
                      void fetch(`/api/applications/${app._id}/screenshot`, {
                        headers: { Authorization: `Bearer ${getToken()}` },
                      })
                        .then((r) => r.blob())
                        .then((blob) => {
                          const url = URL.createObjectURL(blob);
                          window.open(url, "_blank", "noopener,noreferrer");
                        });
                    }}
                  >
                    View apply screenshot →
                  </a>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
