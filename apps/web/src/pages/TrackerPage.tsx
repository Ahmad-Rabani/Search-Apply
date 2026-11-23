import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, getToken } from "../api/client";
import { PlatformBadge } from "../components/PlatformBadge";
import { PlatformFilter } from "../components/PlatformFilter";
import { StatusSelect } from "../components/StatusSelect";
import { toastFromError, toastSuccess } from "../lib/toast";
import type { Application, Job } from "../types";

const statuses = ["saved", "tailored", "applied", "interview", "offer", "rejected"] as const;

export function TrackerPage() {
  const [apps, setApps] = useState<Application[]>([]);
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingNotes, setEditingNotes] = useState<Record<string, string>>({});

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (statusFilter) params.set("status", statusFilter);
      if (sourceFilter.length === 1) params.set("source", sourceFilter[0]);
      const data = await api<{ applications: Application[] }>(
        `/api/applications?${params}`
      );

      let list = data.applications;
      if (sourceFilter.length > 1) {
        list = list.filter((a) => {
          const job = typeof a.jobId === "object" ? (a.jobId as Job) : null;
          return job?.source && sourceFilter.includes(job.source);
        });
      }

      setApps(list);
      const notes: Record<string, string> = {};
      for (const a of list) notes[a._id] = a.notes || "";
      setEditingNotes(notes);
    } catch (err) {
      toastFromError(err, "Failed to load tracker");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [statusFilter, sourceFilter.join(",")]);

  async function updateStatus(id: string, status: string) {
    try {
      await api(`/api/applications/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ status }),
      });
      toastSuccess("Status updated", status);
      await load();
    } catch (err) {
      toastFromError(err, "Update failed");
    }
  }

  async function saveNotes(id: string) {
    try {
      await api(`/api/applications/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ notes: editingNotes[id] || "" }),
      });
      toastSuccess("Notes saved");
    } catch (err) {
      toastFromError(err, "Notes save failed");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-800/70">
          Pipeline
        </p>
        <h1 className="font-display text-3xl text-teal-950 md:text-4xl">
          Application tracker
        </h1>
        <p className="mt-1 text-sm text-teal-950/60">
          Filter by status and platform, keep notes, review apply screenshots.
        </p>
      </div>

      <section className="saa-card space-y-4 p-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setStatusFilter("")}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${
              !statusFilter ? "bg-teal-900 text-white" : "bg-teal-900/8 text-teal-950/70"
            }`}
          >
            All statuses
          </button>
          {statuses.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => setStatusFilter(statusFilter === s ? "" : s)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize ${
                statusFilter === s
                  ? "bg-teal-800 text-white"
                  : "bg-teal-900/8 text-teal-950/70"
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        <PlatformFilter
          dense
          label="Platform"
          selected={sourceFilter}
          onChange={setSourceFilter}
        />
      </section>

      {loading ? (
        <p className="text-teal-950/55">Loading tracker…</p>
      ) : apps.length === 0 ? (
        <div className="saa-card border-dashed p-10 text-center">
          <p className="font-semibold text-teal-950">No applications yet</p>
          <p className="mt-1 text-sm text-teal-950/55">
            Tailor a CV, run Agent mode, or use Apply Assist from a job page.
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
              <li key={app._id} className="saa-card overflow-visible p-0">
                <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:justify-between sm:gap-6 sm:p-5">
                  <div className="min-w-0 flex-1 space-y-2.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {job?.source && <PlatformBadge source={job.source} size="sm" />}
                      {app.applyAssistAt && (
                        <span className="rounded-md bg-teal-900/5 px-2 py-0.5 text-[11px] font-medium text-teal-900/65">
                          Assist used
                        </span>
                      )}
                    </div>

                    <Link
                      to={job ? `/jobs/${job._id}` : "/jobs"}
                      className="block text-lg font-semibold leading-snug text-teal-950 hover:text-teal-800"
                    >
                      {job?.title || "Job"}
                    </Link>

                    <p className="text-sm text-teal-950/55">
                      <span className="font-medium text-teal-950/70">
                        {job?.company || "Unknown"}
                      </span>
                      {job?.location ? (
                        <>
                          <span className="mx-1.5 text-teal-900/25">·</span>
                          {job.location}
                        </>
                      ) : null}
                      {app.appliedAt ? (
                        <>
                          <span className="mx-1.5 text-teal-900/25">·</span>
                          Applied {new Date(app.appliedAt).toLocaleDateString()}
                        </>
                      ) : null}
                    </p>
                  </div>

                  <div className="sm:pt-0.5">
                    <StatusSelect
                      value={app.status}
                      options={statuses}
                      onChange={(status) => void updateStatus(app._id, status)}
                    />
                  </div>
                </div>

                <div className="space-y-3 border-t border-teal-900/8 px-4 py-4 sm:px-5">
                  <label className="block">
                    <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-teal-950/45">
                      Notes
                    </span>
                    <textarea
                      rows={2}
                      value={editingNotes[app._id] || ""}
                      onChange={(e) =>
                        setEditingNotes((prev) => ({
                          ...prev,
                          [app._id]: e.target.value,
                        }))
                      }
                      onBlur={() => void saveNotes(app._id)}
                      placeholder="Add notes — saves when you leave this field"
                      className="saa-input text-sm"
                    />
                  </label>

                  {app.confirmationScreenshot && (
                    <button
                      type="button"
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-teal-800 hover:underline"
                      onClick={() => {
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
                      View apply screenshot
                      <span aria-hidden>→</span>
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
