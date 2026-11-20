import { generateAndParseJson } from "./ai.js";
import type { ProfileDoc } from "../models/Profile.js";
import type { JobDoc } from "../models/Job.js";

export type TailorResult = {
  matchScore: number;
  keywords: string[];
  missingSkills: string[];
  coverLetter: string;
  cvMarkdown: string;
  cvHtml: string;
  atsNotes: string;
};

export async function tailorCvForJob(
  profile: ProfileDoc,
  job: JobDoc
): Promise<TailorResult> {
  const system = `You are an expert ATS resume writer and career coach.
Rules:
- NEVER invent employers, degrees, dates, or skills the candidate does not have.
- Reorder and rephrase existing experience to mirror the job description keywords.
- Use a clean single-column ATS-friendly structure.
- Return ONLY valid JSON matching the schema. No markdown fences.`;

  const userPrompt = `Tailor this candidate profile for the job below.

CANDIDATE PROFILE (JSON):
${JSON.stringify(
  {
    fullName: profile.fullName,
    headline: profile.headline,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    linkedin: profile.linkedin,
    github: profile.github,
    website: profile.website,
    summary: profile.summary,
    skills: profile.skills,
    experience: profile.experience,
    education: profile.education,
    projects: profile.projects,
  },
  null,
  2
)}

JOB:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
URL: ${job.url}
Tags: ${(job.tags || []).join(", ")}
Description:
${(job.description || "").slice(0, 8000)}

Return JSON with this exact shape:
{
  "matchScore": number (0-100),
  "keywords": string[] (ATS keywords from JD that appear or should be mirrored honestly),
  "missingSkills": string[] (important JD skills candidate truly lacks),
  "coverLetter": string (short 3-paragraph cover letter),
  "cvMarkdown": string (full tailored resume in markdown),
  "cvHtml": string (full tailored resume as semantic HTML for PDF: use h1,h2,p,ul,li only; inline styles ok; no scripts),
  "atsNotes": string (brief tips for this application)
}`;

  const parsed = await generateAndParseJson({
    system,
    user: userPrompt,
    maxTokens: 8192,
    temperature: 0.3,
  });
  return {
    matchScore: Number(parsed.matchScore) || 0,
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords.map(String) : [],
    missingSkills: Array.isArray(parsed.missingSkills)
      ? parsed.missingSkills.map(String)
      : [],
    coverLetter: String(parsed.coverLetter || ""),
    cvMarkdown: String(parsed.cvMarkdown || ""),
    cvHtml: String(parsed.cvHtml || fallbackHtml(profile, job)),
    atsNotes: String(parsed.atsNotes || ""),
  };
}

function fallbackHtml(profile: ProfileDoc, job: JobDoc) {
  return `<html><body style="font-family:Arial,sans-serif;max-width:800px;margin:24px auto;color:#111">
  <h1>${escapeHtml(profile.fullName || "Candidate")}</h1>
  <p>${escapeHtml(profile.headline || "")}</p>
  <p>${escapeHtml(profile.email || "")} | ${escapeHtml(profile.phone || "")} | ${escapeHtml(profile.location || "")}</p>
  <h2>Summary</h2>
  <p>${escapeHtml(profile.summary || "")}</p>
  <h2>Skills</h2>
  <p>${escapeHtml((profile.skills || []).join(", "))}</p>
  <h2>Target Role</h2>
  <p>${escapeHtml(job.title)} at ${escapeHtml(job.company)}</p>
  </body></html>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
