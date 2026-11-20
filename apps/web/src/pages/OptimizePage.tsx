import { useEffect, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, getToken } from "../api/client";
import {
  toastError,
  toastFromError,
  toastSuccess,
} from "../lib/toast";

type OptimizeResult = {
  _id: string;
  title: string;
  company: string;
  matchScore: number;
  keywords: string[];
  missingSkills: string[];
  coverLetter: string;
  cvHtml: string;
  atsNotes: string;
  source?: "upload" | "saved" | "profile";
};

type SavedCvItem = {
  _id: string;
  label: string;
  originalName?: string;
  fullName?: string;
  headline?: string;
  skills?: string[];
  createdAt?: string;
};

type CvSource = "profile" | "saved" | "upload";

const MATCH_STEPS = [
  { at: 8, label: "Reading the job description…" },
  { at: 28, label: "Parsing your CV / profile…" },
  { at: 52, label: "Aligning skills and keywords…" },
  { at: 74, label: "Rewriting summary and bullets…" },
  { at: 90, label: "Building your optimized CV…" },
];

function scoreTone(score: number) {
  if (score >= 75) return "bg-teal-800 text-white";
  if (score >= 50) return "bg-amber-100 text-amber-950";
  return "bg-stone-200 text-stone-800";
}

function stepLabel(progress: number) {
  let label = MATCH_STEPS[0].label;
  for (const step of MATCH_STEPS) {
    if (progress >= step.at) label = step.label;
  }
  return label;
}

export function OptimizePage() {
  const fileRef = useRef<HTMLInputElement>(null);
  const progressTimer = useRef<number | null>(null);

  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [jobDescription, setJobDescription] = useState("");
  const [fileName, setFileName] = useState("");
  const [cvSource, setCvSource] = useState<CvSource>("profile");
  const [savedCvs, setSavedCvs] = useState<SavedCvItem[]>([]);
  const [selectedCvId, setSelectedCvId] = useState("");
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<OptimizeResult | null>(null);

  async function loadSavedCvs() {
    try {
      const data = await api<{ cvs: SavedCvItem[] }>("/api/cvs");
      setSavedCvs(data.cvs || []);
      if (!selectedCvId && data.cvs?.[0]?._id) {
        setSelectedCvId(data.cvs[0]._id);
      }
    } catch {
      /* ignore */
    }
  }

  useEffect(() => {
    void api<{ result: OptimizeResult | null }>("/api/optimize/latest")
      .then((data) => {
        if (data.result?.cvHtml) setResult(data.result);
      })
      .catch(() => undefined);
    void loadSavedCvs();

    return () => {
      if (progressTimer.current != null) window.clearInterval(progressTimer.current);
    };
  }, []);

  function startProgress() {
    if (progressTimer.current != null) window.clearInterval(progressTimer.current);
    setProgress(5);
    progressTimer.current = window.setInterval(() => {
      setProgress((p) => {
        if (p >= 92) return p;
        const bump = p < 40 ? 3 : p < 70 ? 2 : 1;
        return Math.min(92, p + bump);
      });
    }, 450);
  }

  function stopProgress(ok: boolean) {
    if (progressTimer.current != null) {
      window.clearInterval(progressTimer.current);
      progressTimer.current = null;
    }
    setProgress(ok ? 100 : 0);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (jobDescription.trim().length < 40) {
      toastError("Paste a fuller job description");
      return;
    }
    if (cvSource === "upload" && !fileRef.current?.files?.[0]) {
      toastError("Upload a CV file");
      return;
    }
    if (cvSource === "saved" && !selectedCvId) {
      toastError("Choose an existing CV", "Or upload a new one / use Profile.");
      return;
    }

    setBusy(true);
    startProgress();
    try {
      const form = new FormData();
      form.append("jobDescription", jobDescription.trim());
      if (title.trim()) form.append("title", title.trim());
      if (company.trim()) form.append("company", company.trim());

      if (cvSource === "upload") {
        const file = fileRef.current?.files?.[0];
        if (file) form.append("cv", file);
      } else if (cvSource === "saved") {
        form.append("cvId", selectedCvId);
      }

      const res = await fetch("/api/optimize", {
        method: "POST",
        headers: { Authorization: `Bearer ${getToken()}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Optimize failed");

      stopProgress(true);
      setResult(data.result);
      toastSuccess(
        "Optimized CV ready",
        `${data.result.matchScore}% ATS coverage vs this JD`
      );
      if (cvSource === "upload") void loadSavedCvs();
    } catch (err) {
      stopProgress(false);
      toastFromError(err, "Optimize failed");
    } finally {
      setTimeout(() => {
        setBusy(false);
        setProgress(0);
      }, 400);
    }
  }

  async function downloadPdf() {
    if (!result) {
      toastError("Generate an optimized CV first");
      return;
    }
    try {
      const res = await fetch("/api/optimize/pdf", {
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
      a.download = `cv-${result.company || "optimized"}-matched.pdf`;
      a.click();
      URL.revokeObjectURL(url);
      toastSuccess("PDF downloaded");
    } catch (err) {
      toastFromError(err, "PDF download failed");
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-800/70">
          Standalone tool
        </p>
        <h1 className="font-display mt-1 text-3xl text-teal-950">Optimize CV</h1>
        <p className="mt-2 max-w-2xl text-sm text-teal-950/65">
          Paste any job description, upload a CV (or use your saved Profile), and get an
          ATS-optimized resume tailored to that role’s tech and wording.
        </p>
      </div>

      <form onSubmit={onSubmit} className="saa-card overflow-hidden">
        <div className="grid gap-0 lg:grid-cols-2">
          <div className="space-y-4 border-b border-teal-900/8 p-5 lg:border-b-0 lg:border-r">
            <h2 className="font-semibold text-teal-950">1. Job description</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-teal-950/70">
                  Job title (optional)
                </span>
                <input
                  className="saa-input"
                  placeholder="e.g. Senior Frontend Engineer"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  disabled={busy}
                />
              </label>
              <label className="block text-sm">
                <span className="mb-1 block font-medium text-teal-950/70">
                  Company (optional)
                </span>
                <input
                  className="saa-input"
                  placeholder="e.g. Acme"
                  value={company}
                  onChange={(e) => setCompany(e.target.value)}
                  disabled={busy}
                />
              </label>
            </div>
            <label className="block text-sm">
              <span className="mb-1 block font-medium text-teal-950/70">
                Paste full JD
              </span>
              <textarea
                className="saa-input min-h-[260px] resize-y font-sans text-sm leading-relaxed"
                placeholder="Paste the complete job description here…"
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                disabled={busy}
                required
              />
            </label>
          </div>

          <div className="flex flex-col gap-4 p-5">
            <h2 className="font-semibold text-teal-950">2. Your CV</h2>

            <div className="space-y-2">
              {(
                [
                  {
                    id: "profile" as const,
                    title: "Use saved Profile",
                    desc: (
                      <>
                        Optimize from your{" "}
                        <Link to="/profile" className="underline">
                          Profile
                        </Link>{" "}
                        details.
                      </>
                    ),
                  },
                  {
                    id: "saved" as const,
                    title: "Choose existing CV",
                    desc: "Pick a CV you uploaded before (Profile or Optimize).",
                  },
                  {
                    id: "upload" as const,
                    title: "Upload new CV",
                    desc: "PDF, DOCX, or TXT — also saved for next time.",
                  },
                ] as const
              ).map((opt) => (
                <label
                  key={opt.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3.5 transition ${
                    cvSource === opt.id
                      ? "border-teal-700/40 bg-teal-50/80"
                      : "border-teal-900/10 bg-teal-950/[0.02] hover:bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="cvSource"
                    className="mt-0.5 accent-teal-700"
                    checked={cvSource === opt.id}
                    onChange={() => setCvSource(opt.id)}
                    disabled={busy}
                  />
                  <span className="text-sm">
                    <span className="font-semibold text-teal-950">{opt.title}</span>
                    <span className="mt-0.5 block text-teal-950/55">{opt.desc}</span>
                  </span>
                </label>
              ))}
            </div>

            {cvSource === "saved" && (
              <div className="rounded-xl border border-teal-900/10 bg-white p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium text-teal-950">Existing CVs</p>
                  <button
                    type="button"
                    className="text-xs font-semibold text-teal-800 hover:underline"
                    onClick={() => void loadSavedCvs()}
                    disabled={busy}
                  >
                    Refresh
                  </button>
                </div>
                {savedCvs.length === 0 ? (
                  <p className="mt-2 text-sm text-teal-950/55">
                    No saved CVs yet. Upload one on{" "}
                    <Link to="/profile" className="underline">
                      Profile
                    </Link>{" "}
                    or choose “Upload new CV”.
                  </p>
                ) : (
                  <select
                    className="saa-input mt-3"
                    value={selectedCvId}
                    onChange={(e) => setSelectedCvId(e.target.value)}
                    disabled={busy}
                  >
                    {savedCvs.map((cv) => (
                      <option key={cv._id} value={cv._id}>
                        {cv.label || cv.originalName || "CV"}
                        {cv.createdAt
                          ? ` · ${new Date(cv.createdAt).toLocaleDateString()}`
                          : ""}
                        {cv.headline ? ` · ${cv.headline}` : ""}
                      </option>
                    ))}
                  </select>
                )}
                {selectedCvId &&
                  (() => {
                    const cv = savedCvs.find((c) => c._id === selectedCvId);
                    if (!cv) return null;
                    return (
                      <p className="mt-2 text-xs text-teal-950/55">
                        {(cv.skills || []).slice(0, 8).join(" · ") || "No skills listed"}
                      </p>
                    );
                  })()}
              </div>
            )}

            {cvSource === "upload" && (
              <div className="rounded-xl border border-dashed border-teal-900/20 bg-white p-4">
                <p className="text-sm font-medium text-teal-950">Upload CV file</p>
                <p className="mt-1 text-xs text-teal-950/50">PDF, DOCX, or TXT</p>
                <input
                  ref={fileRef}
                  type="file"
                  accept=".pdf,.doc,.docx,.txt,.md,application/pdf"
                  disabled={busy}
                  className="mt-3 block w-full text-sm text-teal-950/70 file:mr-3 file:rounded-lg file:border-0 file:bg-teal-900 file:px-3 file:py-1.5 file:text-sm file:font-semibold file:text-white"
                  onChange={(e) => setFileName(e.target.files?.[0]?.name || "")}
                />
                {fileName && (
                  <p className="mt-2 text-xs font-medium text-teal-800">
                    Selected: {fileName}
                  </p>
                )}
              </div>
            )}

            <div className="mt-auto space-y-3">
              {busy && (
                <div className="rounded-2xl border border-teal-800/15 bg-gradient-to-b from-teal-50 to-white p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-teal-600" />
                      <p className="text-sm font-semibold text-teal-950">Optimizing…</p>
                    </div>
                    <p className="font-display text-lg tabular-nums text-teal-900">
                      {Math.round(progress)}%
                    </p>
                  </div>
                  <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-teal-900/10">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-teal-700 to-teal-500 transition-[width] duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="mt-2 text-sm text-teal-950/70">{stepLabel(progress)}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={busy}
                className="saa-btn saa-btn-primary w-full py-3 text-base disabled:opacity-60"
              >
                {busy ? "Working…" : "Generate optimized CV"}
              </button>
            </div>
          </div>
        </div>
      </form>

      {result && !busy && (
        <section className="overflow-hidden rounded-2xl border border-teal-900/10 bg-white/90">
          <div className="flex flex-wrap items-center justify-between gap-4 border-b border-teal-900/10 bg-teal-950 px-5 py-4 text-white">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-teal-100/70">
                Optimized result
              </p>
              <h2 className="font-display text-2xl">
                {result.title}
                {result.company ? ` · ${result.company}` : ""}
              </h2>
              <p className="mt-1 text-xs text-teal-100/60">
                Source:{" "}
                {result.source === "upload"
                  ? "Uploaded CV"
                  : result.source === "saved"
                    ? "Existing CV"
                    : "Saved Profile"}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <div className="text-right">
                <p className="text-xs uppercase tracking-wide text-teal-100/70">
                  ATS coverage
                </p>
                <p className="font-display text-4xl font-semibold">{result.matchScore}%</p>
              </div>
              <button
                type="button"
                onClick={() => void downloadPdf()}
                className="saa-btn bg-white text-teal-950 hover:bg-teal-50"
              >
                Download PDF
              </button>
            </div>
          </div>

          <div className="grid gap-4 p-5 lg:grid-cols-2">
            <div className="rounded-xl border border-teal-900/10 bg-teal-50/50 p-4">
              <h3 className="font-semibold text-teal-950">What changed</h3>
              <p className="mt-2 text-sm leading-relaxed text-teal-950/75">
                {result.atsNotes}
              </p>
              <div className="mt-4">
                <p className="text-xs font-semibold uppercase tracking-wide text-teal-950/50">
                  Tech placed on CV
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {result.keywords.map((k) => (
                    <span
                      key={k}
                      className="rounded bg-teal-900/8 px-2 py-0.5 text-xs font-medium text-teal-950"
                    >
                      {k}
                    </span>
                  ))}
                </div>
              </div>
              {result.missingSkills.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-amber-800/70">
                    Gaps vs JD
                  </p>
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {result.missingSkills.map((k) => (
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
                {result.coverLetter}
              </pre>
            </div>

            <div className="rounded-xl border border-teal-900/10 bg-white p-4 lg:col-span-2">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="font-semibold text-teal-950">CV preview</h3>
                <span
                  className={`rounded-md px-2.5 py-1 text-xs font-semibold ${scoreTone(
                    result.matchScore
                  )}`}
                >
                  Score {result.matchScore}%
                </span>
              </div>
              <div className="overflow-hidden rounded-lg border border-teal-900/10 shadow-sm">
                <iframe
                  title="Optimized CV preview"
                  className="h-[720px] w-full bg-white"
                  srcDoc={result.cvHtml}
                />
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
