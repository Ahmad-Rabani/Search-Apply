import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import { api, getToken } from "../api/client";
import { JobDescription } from "../components/JobDescription";
import { PlatformBadge } from "../components/PlatformBadge";
import type { Application, InterviewPrep, Job, TailoredDoc } from "../types";

type WorkKind = "idle" | "match" | "pdf" | "apply" | "assist" | "interview";

const MATCH_STEPS = [
  { at: 8, label: "Reading the job description…" },
  { at: 28, label: "Matching your skills to required tech…" },
  { at: 52, label: "Rewriting summary and experience bullets…" },
  { at: 74, label: "Building your ATS-ready CV…" },
  { at: 90, label: "Finishing cover letter and preview…" },
];

function scoreTone(score: number) {
  if (score >= 75) return "bg-teal-800 text-white";
  if (score >= 50) return "bg-amber-100 text-amber-950";
  return "bg-stone-200 text-stone-800";
}

function matchStepLabel(progress: number) {
  let label = MATCH_STEPS[0].label;
  for (const step of MATCH_STEPS) {
    if (progress >= step.at) label = step.label;
  }
  return label;
}

export function JobDetailPage() {
  const { id } = useParams();
  const location = useLocation();
  const backTo =
    (location.state as { fromJobs?: string } | null)?.fromJobs || "/jobs";
  const [job, setJob] = useState<Job | null>(null);
  const [tailored, setTailored] = useState<TailoredDoc | null>(null);
  const [application, setApplication] = useState<Application | null>(null);
  const [interviewPrep, setInterviewPrep] = useState<InterviewPrep | null>(null);
  const [loading, setLoading] = useState(true);
  const [work, setWork] = useState<WorkKind>("idle");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [hint, setHint] = useState("");
  const [showMore, setShowMore] = useState(false);
  const progressTimer = useRef<number | null>(null);

  const busy = work !== "idle";

  function clearProgressTimer() {
    if (progressTimer.current != null) {
      window.clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
  }

  function startMatchProgress() {
    clearProgressTimer();
    setProgress(4);
    progressTimer.current = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 92) return p;
        const bump = p < 40 ? 3.2 : p < 70 ? 2.1 : 1.1;
        return Math.min(92, p + bump);
      });
    }, 450);
  }

  function finishProgress() {
    clearProgressTimer();
    setProgress(100);
  }

  async function load() {
    if (!id) return;
    setLoading(true);
    setError("");
    try {
      const data = await api<{
        job: Job;
        tailored: TailoredDoc | null;
        application: Application | null;
        interviewPrep: InterviewPrep | null;
      }>(`/api/jobs/${id}`);
      setJob(data.job);
      setTailored(data.tailored);
      setApplication(data.application);
      setInterviewPrep(data.interviewPrep);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load job");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
    return () => clearProgressTimer();
  }, [id]);

  async function downloadPdfBlob() {
    if (!id) throw new Error("Missing job");
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
  }

  async function tailor() {
    if (!id) return;
    setWork("match");
    setError("");
    setHint("");
    startMatchProgress();
    try {
      const data = await api<{ tailored: TailoredDoc }>(`/api/jobs/${id}/tailor`, {
        method: "POST",
      });
      finishProgress();
      setTailored(data.tailored);
      setHint("Matched CV ready. Review the preview, then download and apply.");
      await load();
    } catch (err) {
      clearProgressTimer();
      setProgress(0);
      setError(err instanceof Error ? err.message : "Matching failed");
    } finally {
      setTimeout(() => {
        setWork("idle");
        setProgress(0);
      }, 500);
    }
  }

  async function downloadAndOpen() {
    if (!id || !job) return;
    if (!tailored) {
      setError("Match your CV first, then download and apply.");
      return;
    }
    setWork("apply");
    setError("");
    try {
      await downloadPdfBlob();
      window.open(job.url, "_blank", "noopener,noreferrer");
      const appData = await api<{ application: Application }>("/api/applications", {
        method: "POST",
        body: JSON.stringify({ jobId: id, status: "applied" }),
      });
      setApplication(appData.application);
      setHint("PDF downloaded and apply page opened. Upload this PDF on the form.");
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not prepare apply");
    } finally {
      setWork("idle");
    }
  }

  async function downloadOnly() {
    if (!tailored) {
      setError("Match your CV first to download the PDF.");
      return;
    }
    setWork("pdf");
    setError("");
    try {
      await downloadPdfBlob();
      setHint("PDF downloaded. Use this file on the employer’s apply form.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF failed");
    } finally {
      setWork("idle");
    }
  }

  async function markApplied() {
    if (!id) return;
    if (!tailored) {
      setError("Match your CV before marking this job as applied.");
      return;
    }
    setWork("apply");
    try {
      const data = await api<{ application: Application }>("/api/applications", {
        method: "POST",
        body: JSON.stringify({ jobId: id, status: "applied" }),
      });
      setApplication(data.application);
      setHint("Marked as applied in your tracker.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Update failed");
    } finally {
      setWork("idle");
    }
  }

  async function makeInterviewPrep() {
    if (!id) return;
    setWork("interview");
    setError("");
    setHint("");
    try {
      const data = await api<{ interviewPrep: InterviewPrep }>(
        `/api/jobs/${id}/interview-prep`,
        { method: "POST" }
      );
      setInterviewPrep(data.interviewPrep);
      setHint("Interview prep ready below.");
      setShowMore(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Interview prep failed");
    } finally {
      setWork("idle");
    }
  }

  async function applyAssist() {
    if (!id) return;
    if (!tailored) {
      setError("Match your CV first, then use Apply Assist.");
      return;
    }
    setWork("assist");
    setError("");
    setHint("Opening the apply page and filling common fields…");
    try {
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
        }. Confirm submit yourself.`
      );
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Apply assist failed");
    } finally {
      setWork("idle");
    }
  }

  if (loading) return <p className="text-teal-950/60">Loading…</p>;
  if (!job) return <p className="text-red-700">{error || "Job not found"}</p>;

  const matched = Boolean(tailored);
  const applied = application?.status === "applied";
  const matchScore = tailored?.matchScore ?? 0;
  const matching = work === "match";

  return (
    <div className="space-y-6">
      <Link to={backTo} className="text-sm font-medium text-teal-800 hover:underline">
        ← Back to jobs
      </Link>

      <div className="saa-card p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2">
              <PlatformBadge source={job.source} />
            </div>
            <h1 className="font-display text-3xl text-teal-950 md:text-[2rem]">
              {job.title}
            </h1>
            <p className="mt-1 text-teal-950/65">
              {job.company}
              <span className="mx-1.5 text-teal-900/25">·</span>
              {job.location || "Remote"}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <span className="rounded-md bg-teal-900/8 px-3 py-1.5 text-sm font-semibold text-teal-900">
              {job.relevanceScore ?? 0}% feed
            </span>
            {matched && (
              <span
                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${scoreTone(matchScore)}`}
              >
                {matchScore}% CV
              </span>
            )}
            {applied && (
              <span className="rounded-md bg-amber-100 px-3 py-1.5 text-sm font-semibold text-amber-950">
                Applied
              </span>
            )}
          </div>
        </div>

        {/* Simple progress steps */}
        <div className="mt-6 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-teal-950/45">
          <span className={matched ? "text-teal-800" : "text-teal-950"}>1. Match</span>
          <span className="h-px flex-1 bg-teal-900/10" />
          <span className={matched ? "text-teal-800" : ""}>2. Download</span>
          <span className="h-px flex-1 bg-teal-900/10" />
          <span className={applied ? "text-amber-800" : ""}>3. Apply</span>
        </div>

        {/* Matching progress panel */}
        {matching && (
          <div className="mt-5 rounded-2xl border border-teal-800/15 bg-teal-50/80 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-teal-950">
                Matching your CV to this job
              </p>
              <p className="font-display text-lg text-teal-900">{Math.round(progress)}%</p>
            </div>
            <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-teal-900/10">
              <div
                className="h-full rounded-full bg-teal-700 transition-[width] duration-300 ease-out"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="mt-3 text-sm text-teal-950/70">{matchStepLabel(progress)}</p>
            <p className="mt-1 text-xs text-teal-950/45">
              Usually takes 15–40 seconds. Keep this tab open.
            </p>
          </div>
        )}

        {/* Primary actions — max 2 clicks */}
        {!matching && (
          <div className="mt-5 space-y-3">
            {!matched ? (
              <button
                type="button"
                disabled={busy}
                onClick={() => void tailor()}
                className="saa-btn saa-btn-primary w-full py-3 text-base disabled:opacity-60 sm:w-auto sm:min-w-[220px]"
              >
                Match CV for this job
              </button>
            ) : (
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void downloadAndOpen()}
                  className="saa-btn saa-btn-primary py-2.5 disabled:opacity-60"
                >
                  {work === "apply" ? "Opening apply…" : "Download PDF & apply"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void downloadOnly()}
                  className="saa-btn saa-btn-secondary disabled:opacity-60"
                >
                  {work === "pdf" ? "Downloading…" : "PDF only"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void tailor()}
                  className="saa-btn saa-btn-ghost disabled:opacity-60"
                >
                  Rematch
                </button>
              </div>
            )}

            <button
              type="button"
              className="text-sm font-medium text-teal-800 hover:underline"
              onClick={() => setShowMore((v) => !v)}
            >
              {showMore ? "Hide more options" : "More options"}
            </button>

            {showMore && (
              <div className="flex flex-wrap gap-2 rounded-xl border border-teal-900/10 bg-white/70 p-3">
                <button
                  type="button"
                  disabled={busy || !matched}
                  onClick={() => void applyAssist()}
                  className="saa-btn bg-teal-950 text-white hover:bg-black disabled:opacity-40"
                >
                  {work === "assist" ? "Assist running…" : "Apply Assist"}
                </button>
                <button
                  type="button"
                  disabled={busy || !matched || applied}
                  onClick={() => void markApplied()}
                  className="saa-btn saa-btn-ghost disabled:opacity-40"
                >
                  {applied ? "Already marked" : "Mark applied only"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void makeInterviewPrep()}
                  className="saa-btn saa-btn-secondary disabled:opacity-60"
                >
                  {work === "interview"
                    ? "Preparing…"
                    : interviewPrep
                      ? "Refresh interview prep"
                      : "Interview prep"}
                </button>
                <p className="basis-full text-xs text-teal-950/50">
                  Apply Assist fills common fields and never auto-submits — you confirm.
                </p>
              </div>
            )}
          </div>
        )}

        {hint && !matching && (
          <p className="mt-4 text-sm text-teal-800">{hint}</p>
        )}
        {error && <p className="mt-4 text-sm text-red-700">{error}</p>}
        {!matched && !matching && (
          <p className="mt-4 rounded-xl border border-amber-700/20 bg-amber-50/80 px-3 py-2.5 text-sm text-amber-950">
            A matched CV is required before you apply. Save your base profile on{" "}
            <Link to="/profile" className="font-semibold underline">
              Profile
            </Link>
            , then tap <strong>Match CV for this job</strong>.
          </p>
        )}
      </div>

      {matched && (
        <section className="overflow-hidden rounded-2xl border border-teal-900/10 bg-white/90">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-teal-900/10 bg-teal-950 px-5 py-4 text-white">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-100/70">
                Matched CV
              </p>
              <h2 className="font-display text-2xl">Ready for this role</h2>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-teal-100/70">
                ATS coverage
              </p>
              <p className="font-display text-4xl font-semibold">{matchScore}%</p>
            </div>
          </div>

          <div className="grid gap-4 p-5 lg:grid-cols-2">
            <div className="rounded-xl border border-teal-900/10 bg-teal-50/50 p-4">
              <h3 className="font-semibold text-teal-950">What changed</h3>
              <p className="mt-2 text-sm leading-relaxed text-teal-950/75">
                {tailored.atsNotes}
              </p>

              {matchScore < 40 && (
                <p className="mt-3 rounded-lg border border-amber-700/25 bg-amber-50 px-3 py-2 text-sm text-amber-950">
                  Low overlap with this JD. Add missing skills on Profile (if you have
                  them), save, then Rematch.
                </p>
              )}

              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-950/50">
                  Tech placed on this CV
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {tailored.keywords.length ? (
                    tailored.keywords.map((k) => (
                      <span
                        key={k}
                        className="rounded bg-teal-900/8 px-2 py-0.5 text-xs font-medium text-teal-950"
                      >
                        {k}
                      </span>
                    ))
                  ) : (
                    <p className="text-sm text-teal-950/55">
                      Almost no overlapping tech in your Profile for this JD.
                    </p>
                  )}
                </div>
              </div>

              {tailored.missingSkills.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-800/70">
                    Add to Profile to raise match
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
                <h3 className="font-semibold text-teal-950">CV preview</h3>
                <span
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold ${scoreTone(matchScore)}`}
                >
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

      {interviewPrep && (
        <section className="overflow-hidden rounded-2xl border border-teal-900/10 bg-white/90">
          <div className="border-b border-teal-900/10 bg-teal-900 px-5 py-4 text-white">
            <h2 className="font-display text-2xl">Interview prep</h2>
          </div>

          <div className="grid gap-4 p-5 lg:grid-cols-2">
            <div className="rounded-xl border border-teal-900/10 bg-teal-50/40 p-4 lg:col-span-2">
              <h3 className="font-semibold text-teal-950">Company & role brief</h3>
              <p className="mt-2 text-sm leading-relaxed text-teal-950/80">
                {interviewPrep.companyBrief}
              </p>
              {interviewPrep.roleFocus.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {interviewPrep.roleFocus.map((f) => (
                    <span
                      key={f}
                      className="rounded bg-white px-2 py-0.5 text-xs font-medium text-teal-900"
                    >
                      {f}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-teal-900/10 bg-white p-4">
              <h3 className="font-semibold text-teal-950">Likely questions</h3>
              <ul className="mt-3 space-y-3">
                {interviewPrep.likelyQuestions.map((q) => (
                  <li key={q.question} className="text-sm">
                    <p className="font-medium text-teal-950">{q.question}</p>
                    {q.tip && <p className="mt-1 text-teal-950/65">Tip: {q.tip}</p>}
                  </li>
                ))}
              </ul>
            </div>

            <div className="space-y-4">
              <div className="rounded-xl border border-teal-900/10 bg-white p-4">
                <h3 className="font-semibold text-teal-950">Stories to prepare</h3>
                <ul className="mt-3 space-y-3">
                  {interviewPrep.storiesToPrepare.map((s) => (
                    <li key={s.theme} className="text-sm">
                      <p className="font-medium text-teal-950">{s.theme}</p>
                      <p className="mt-1 text-teal-950/65">{s.howToAnswer}</p>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="rounded-xl border border-teal-900/10 bg-white p-4">
                <h3 className="font-semibold text-teal-950">Ask them</h3>
                <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-teal-950/80">
                  {interviewPrep.questionsToAsk.map((q) => (
                    <li key={q}>{q}</li>
                  ))}
                </ul>
              </div>

              {interviewPrep.risks.length > 0 && (
                <div className="rounded-xl border border-amber-700/20 bg-amber-50/60 p-4">
                  <h3 className="font-semibold text-amber-950">Watch-outs</h3>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-amber-950/80">
                    {interviewPrep.risks.map((r) => (
                      <li key={r}>{r}</li>
                    ))}
                  </ul>
                </div>
              )}
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
