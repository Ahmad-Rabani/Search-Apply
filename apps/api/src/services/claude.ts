import { generateAndParseJson } from "./ai.js";
import {
  renderProfessionalCvHtml,
  type TailoredCvContent,
} from "./cvTemplate.js";
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
- Keep bullets concise and impact-focused.
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
  "keywords": string[],
  "missingSkills": string[],
  "coverLetter": string,
  "atsNotes": string,
  "tailoredCv": {
    "headline": string,
    "summary": string,
    "skills": string[],
    "experience": [{"title": string, "company": string, "location": string, "startDate": string, "endDate": string, "current": boolean, "bullets": string[]}],
    "education": [{"school": string, "degree": string, "field": string, "startDate": string, "endDate": string}],
    "projects": [{"name": string, "url": string, "description": string, "tech": string[]}]
  }
}`;

  const parsed = await generateAndParseJson({
    system,
    user: userPrompt,
    maxTokens: 8192,
    temperature: 0.3,
  });

  const matchScore = Number(parsed.matchScore) || 0;
  const tailoredCv = normalizeTailoredCv(parsed.tailoredCv, profile);
  const cvHtml = renderProfessionalCvHtml(
    {
      fullName: profile.fullName || "",
      email: profile.email || "",
      phone: profile.phone || "",
      location: profile.location || "",
      linkedin: profile.linkedin || "",
      github: profile.github || "",
      website: profile.website || "",
    },
    tailoredCv,
    {
      targetRole: job.title,
      company: job.company,
      matchScore,
    }
  );

  const cvMarkdown = toMarkdown(profile.fullName || "", tailoredCv);

  return {
    matchScore,
    keywords: Array.isArray(parsed.keywords) ? parsed.keywords.map(String) : [],
    missingSkills: Array.isArray(parsed.missingSkills)
      ? parsed.missingSkills.map(String)
      : [],
    coverLetter: String(parsed.coverLetter || ""),
    cvMarkdown,
    cvHtml,
    atsNotes: String(parsed.atsNotes || ""),
  };
}

function normalizeTailoredCv(
  raw: unknown,
  profile: ProfileDoc
): TailoredCvContent {
  const src = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    unknown
  >;

  const experience = Array.isArray(src.experience)
    ? src.experience
    : profile.experience || [];
  const education = Array.isArray(src.education)
    ? src.education
    : profile.education || [];
  const projects = Array.isArray(src.projects)
    ? src.projects
    : profile.projects || [];
  const skills = Array.isArray(src.skills)
    ? src.skills.map(String)
    : profile.skills || [];

  return {
    headline: String(src.headline || profile.headline || ""),
    summary: String(src.summary || profile.summary || ""),
    skills,
    experience: experience.map((e: Record<string, unknown>) => ({
      title: String(e.title || ""),
      company: String(e.company || ""),
      location: String(e.location || ""),
      startDate: String(e.startDate || ""),
      endDate: String(e.endDate || ""),
      current: Boolean(e.current),
      bullets: Array.isArray(e.bullets) ? e.bullets.map(String) : [],
    })),
    education: education.map((e: Record<string, unknown>) => ({
      school: String(e.school || ""),
      degree: String(e.degree || ""),
      field: String(e.field || ""),
      startDate: String(e.startDate || ""),
      endDate: String(e.endDate || ""),
    })),
    projects: projects.map((p: Record<string, unknown>) => ({
      name: String(p.name || ""),
      url: String(p.url || ""),
      description: String(p.description || ""),
      tech: Array.isArray(p.tech) ? p.tech.map(String) : [],
    })),
  };
}

function toMarkdown(name: string, cv: TailoredCvContent) {
  const lines = [
    `# ${name}`,
    cv.headline || "",
    "",
    "## Summary",
    cv.summary || "",
    "",
    "## Skills",
    (cv.skills || []).join(", "),
    "",
    "## Experience",
  ];
  for (const e of cv.experience || []) {
    lines.push(`### ${e.title || ""} · ${e.company || ""}`);
    lines.push(`${e.startDate || ""} - ${e.current ? "Present" : e.endDate || ""}`);
    for (const b of e.bullets || []) lines.push(`- ${b}`);
    lines.push("");
  }
  return lines.join("\n");
}
