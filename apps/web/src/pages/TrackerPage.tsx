import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import type { Application, Job } from "../types";

const statuses = ["saved", "tailored", "applied", "interview", "offer", "rejected"] as const;

export function TrackerPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const data = await api<{ applications: Application[] }>("/api/applications");
      setApps(data.applications);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

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

  if (loading) return <p className="text-teal-950/60">Loading tracker…</p>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl text-teal-950">Application tracker</h1>
        <p className="mt-1 text-teal-950/65">
          Follow every role from saved → tailored → applied → interview.
        </p>
      </div>

      {error && <p className="text-sm text-red-700">{error}</p>}

      {apps.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-teal-900/20 bg-white/50 p-8 text-center">
          <p className="font-medium">No applications yet</p>
          <p className="mt-1 text-sm text-teal-950/60">
            Tailor a CV or mark a job as applied from the jobs feed.
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
                className="flex flex-col gap-3 rounded-2xl border border-teal-900/10 bg-white/80 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <Link
                    to={job ? `/jobs/${job._id}` : "/jobs"}
                    className="text-lg font-semibold text-teal-950 hover:underline"
                  >
                    {job?.title || "Job"}
                  </Link>
                  <p className="text-sm text-teal-950/65">
                    {job?.company || "Unknown"} · status updated{" "}
                    {app.updatedAt ? new Date(app.updatedAt).toLocaleDateString() : "—"}
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
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
