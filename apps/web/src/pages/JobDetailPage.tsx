import { useEffect, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api, getToken } from "../api/client";
import { JobDescription } from "../components/JobDescription";
import { PlatformBadge } from "../components/PlatformBadge";
import type { Application, Job, TailoredDoc } from "../types";

function scoreTone(score: number) {
  if (score >= 75) return "bg-teal-800 text-white";
  if (score >= 50) return "bg-amber-100 text-amber-950";
  return "bg-stone-200 text-stone-800";
}

export function JobDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const backTo =
    (location.state as { fromJobs?: string } | null)?.fromJobs || "/jobs";
  const [job, setJob] = useState<Job | null>(null);
  const [tailored, setTailored] = useState<TailoredDoc | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");

  async function load() {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const data = await api<{
        job: Job;
        tailored: TailoredDoc | null;
        application: Application | null;
      }>(`/api/jobs/${id}`);
      setJob(data.job);
      setTailored(data.tailored);
      setApplication(data.application);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load job");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [id]);

  async function tailor() {
    if (!id) return;
    setBusy(true);
    setError("");
    setHint("");
    try {
      const data = await api<{ tailored: TailoredDoc }>(`/api/jobs/${id}/tailor`, {
        method: "POST",
      });
      setTailored(data.tailored);
      setHint("Matched CV ready. Download PDF, then open the apply page.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Tailoring failed");
    } finally {
      setBusy(false);
    }
  }

  async function downloadPdf() {
    if (!id) return;
    if (!tailored) {
      setError("Pehle tailored CV generate karo — phir PDF download hogi.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const res = await fetch(`/api/jobs/${id}/pdf`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "PDF failed");
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `cv-${job?.company || "job"}-matched.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      setHint("PDF downloaded. Ab apply page kholo aur yehi matched CV upload/submit karo.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF failed");
    } finally {
      setBusy(false);
    }
  }

  async function prepareAndApply() {
    if (!id || !job) return;
    setBusy(true);
    setError("");
    setHint("");
    try {
      let doc = tailored;
      if (!doc) {
        const data = await api<{ tailored: TailoredDoc }>(`/api/jobs/${id}/tailor`, {
          method: "POST",
        });
        doc = data.tailored;
        setTailored(doc);
      }

      const res = await fetch(`/api/jobs/${id}/pdf`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `cv-${job.company || "job"}-matched.pdf`;
        a.click();
        URL.revokeObjectURL(url);
      }

      window.open(job.url, "_blank", "noopener,noreferrer");

      const appData = await api<{ application: Application }>("/api/applications", {
        method: "POST",
        body: JSON.stringify({ jobId: id, status: "applied" }),
      });
      setApplication(appData.application);
      setHint(
        "Matched CV PDF download + apply page open. Form pe yehi PDF use karo, phir tracker mein status update rakho."
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Apply prep failed");
    } finally {
      setBusy(false);
    }
  }

  async function markApplied() {
    if (!id) return;
    if (!tailored) {
      setError("Pehle Step 1: Generate matched CV — bina matching ke apply mat mark karo.");
      return;
    }
    setBusy(true);
    try {
      const data = await api<{ application: Application }>("/api/applications", {
        method: "POST",
        body: JSON.stringify({ jobId: id, status: "applied" }),
      });
      setApplication(data.application);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setBusy(false);
    }
  }

  async function applyAssist() {
    if (!id) return;
    if (!tailored) {
      setError("Pehle matched CV generate karo, phir Apply Assist use karo.");
      return;
    }
    setBusy(true);
    setError("");
    setHint("Apply Assist browser khol raha hai — fields auto-fill hongi, submit manually karo.");
    try {
      // Ensure PDF is ready for upload on the form
      await fetch(`/api/jobs/${id}/pdf`, {
        headers: { Authorization: `Bearer ${getToken()}` },
      }).catch(() => undefined);

      const data = await api<{
        application: Application;
        assist: { message: string; filledFields: string[] };
      }>(`/api/applications/${id}/apply-assist`, { method: "POST" });

      setApplication(data.application);
      setHint(
        `${data.assist.message} Filled: ${
          data.assist.filledFields?.join(", ") || "none detected"
        }.`
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Apply assist failed");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-teal-950/60">Loading…</p>;
  if (!job) return <p className="text-red-700">{error || "Job not found"}</p>;

  const step1Done = Boolean(tailored);
  const step3Done = application?.status === "applied";
  const matchScore = tailored?.matchScore ?? 0;

  return (
    <div className="space-y-6">
      <Link to={backTo} className="text-sm font-medium text-teal-800 hover:underline">
        ← Back to jobs
      </Link>

      <div className="rounded-2xl border border-teal-900/10 bg-white/80 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2">
              <PlatformBadge source={job.source} />
            </div>
            <h1 className="font-display text-3xl text-teal-950">{job.title}</h1>
            <p className="mt-1 text-teal-950/70">
              {job.company} · {job.location || "Remote"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-md bg-teal-900/8 px-3 py-1.5 text-sm font-semibold text-teal-900">
              {job.relevanceScore ?? 0}% feed match
            </span>
            {tailored && (
              <span
                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${scoreTone(matchScore)}`}
              >
                {matchScore}% CV match
              </span>
            )}
          </div>
        </div>

        <ol className="mt-6 grid gap-3 sm:grid-cols-3">
          <li
            className={`rounded-xl border p-3 text-sm ${
              step1Done ? "border-teal-700/40 bg-teal-50" : "border-teal-900/10 bg-white"
            }`}
          >
            <p className="font-semibold text-teal-950">1. Match CV</p>
            <p className="mt-1 text-teal-950/65">Job JD ke hisaab se ATS CV + cover letter</p>
          </li>
          <li
            className={`rounded-xl border p-3 text-sm ${
              step1Done ? "border-teal-700/40 bg-teal-50" : "border-teal-900/10 bg-white"
            }`}
          >
            <p className="font-semibold text-teal-950">2. Download PDF</p>
            <p className="mt-1 text-teal-950/65">Matched CV save karo apply form ke liye</p>
          </li>
          <li
            className={`rounded-xl border p-3 text-sm ${
              step3Done ? "border-amber-700/40 bg-amber-50" : "border-teal-900/10 bg-white"
            }`}
          >
            <p className="font-semibold text-teal-950">3. Apply</p>
            <p className="mt-1 text-teal-950/65">Apply page kholo + tracker mein mark</p>
          </li>
        </ol>

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => void tailor()}
            className="rounded-lg bg-teal-800 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-900 disabled:opacity-60"
          >
            {busy ? "Working…" : tailored ? "1. Re-match CV" : "1. Generate matched CV"}
          </button>
          <button
            type="button"
            disabled={busy || !tailored}
            onClick={() => void downloadPdf()}
            className="rounded-lg border border-teal-900/15 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40"
          >
            2. Download matched PDF
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => void prepareAndApply()}
            className="rounded-lg border border-amber-700/30 bg-amber-50 px-4 py-2 text-sm font-semibold text-amber-950 disabled:opacity-60"
          >
            {busy ? "Preparing…" : "Match → PDF → Open apply"}
          </button>
          <button
            type="button"
            disabled={busy || !tailored}
            onClick={() => void markApplied()}
            className="rounded-lg border border-teal-900/15 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-40"
          >
            {step3Done ? "Marked applied" : "3. Mark as applied"}
          </button>
          <button
            type="button"
            disabled={busy || !tailored}
            onClick={() => void applyAssist()}
            className="rounded-lg bg-teal-950 px-4 py-2 text-sm font-semibold text-white hover:bg-black disabled:opacity-40"
          >
            {busy ? "Assist running…" : "Apply Assist (auto-fill + screenshot)"}
          </button>
        </div>
        <p className="mt-2 text-xs text-teal-950/55">
          Apply Assist opens the job page, fills common fields from your profile, captures a
          screenshot, and does not auto-submit (you confirm manually).
        </p>

        {hint && <p className="mt-3 text-sm text-teal-800">{hint}</p>}
        {error && <p className="mt-3 text-sm text-red-700">{error}</p>}
        {!tailored && (
          <p className="mt-3 text-sm text-amber-900/80">
            Apply se pehle matched CV zaroori hai — pehle Profile pe base CV upload/save karo, phir
            yahan Step 1 chalao.
          </p>
        )}
      </div>

      {tailored && (
        <section className="overflow-hidden rounded-2xl border border-teal-900/10 bg-white/90">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-teal-900/10 bg-teal-950 px-5 py-4 text-white">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-100/70">
                Matched CV result
              </p>
              <h2 className="font-display text-2xl">Tailored for this role</h2>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-teal-100/70">Match score</p>
              <p className="font-display text-4xl font-semibold">{matchScore}%</p>
            </div>
          </div>

          <div className="grid gap-4 p-5 lg:grid-cols-2">
            <div className="rounded-xl border border-teal-900/10 bg-teal-50/50 p-4">
              <h3 className="font-semibold text-teal-950">ATS notes</h3>
              <p className="mt-2 text-sm leading-relaxed text-teal-950/75">{tailored.atsNotes}</p>

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-950/50">
                  Matched keywords
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tailored.keywords.map((k) => (
                    <span
                      key={k}
                      className="rounded bg-teal-900/8 px-2 py-0.5 text-xs font-medium text-teal-950"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>

              {tailored.missingSkills.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-800/70">
                    Gaps
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {tailored.missingSkills.map((k) => (
                      <span
                        key={k}
                        className="rounded bg-amber-100 px-2 py-0.5 text-xs text-amber-900"
                      >
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-xl border border-teal-900/10 bg-white p-4">
              <h3 className="font-semibold text-teal-950">Cover letter</h3>
              <pre className="mt-2 whitespace-pre-wrap font-sans text-sm leading-relaxed text-teal-950/80">
                {tailored.coverLetter}
              </pre>
            </div>

            <div className="rounded-xl border border-teal-900/10 bg-white p-4 lg:col-span-2">
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-semibold text-teal-950">Matched CV preview</h3>
                <span className={`rounded-md px-2.5 py-1 text-xs font-semibold ${scoreTone(matchScore)}`}>
                  Score {matchScore}%
                </span>
              </div>
              <div className="overflow-hidden rounded-lg border border-teal-900/10 bg-white shadow-sm">
                <iframe
                  title="Matched CV preview"
                  className="h-[720px] w-full bg-white"
                  srcDoc={tailored.cvHtml}
                />
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="rounded-2xl border border-teal-900/10 bg-white/80 p-5">
        <h2 className="font-display text-xl text-teal-950">Job description</h2>
        <div className="mt-4">
          <JobDescription text={job.description || ""} />
        </div>
      </section>
    </div>
  );
}
