import { generateAndParseJson } from "./ai.js";
import type { ProfileDoc } from "../models/Profile.js";
import type { JobDoc } from "../models/Job.js";
import type { TailoredDocDoc } from "../models/TailoredDoc.js";

export type InterviewPrepResult = {
  companyBrief: string;
  roleFocus: string[];
  likelyQuestions: Array<{ question: string; tip: string }>;
  storiesToPrepare: Array<{ theme: string; howToAnswer: string }>;
  questionsToAsk: string[];
  risks: string[];
};

export async function generateInterviewPrep(
  profile: ProfileDoc,
  job: JobDoc,
  tailored?: TailoredDocDoc | null
): Promise<InterviewPrepResult> {
  const system = `You are an interview coach for software/tech roles.
Use only the job description and candidate profile. Do not invent employer facts you cannot infer.
Return ONLY valid JSON.`;

  const user = `Prepare interview materials for this candidate and role.

CANDIDATE:
${JSON.stringify(
  {
    fullName: profile.fullName,
    headline: profile.headline,
    summary: profile.summary,
    skills: profile.skills,
    experience: profile.experience,
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
${(job.description || "").slice(0, 7000)}

${
  tailored
    ? `EXISTING MATCH NOTES:
Match score: ${tailored.matchScore}
Keywords: ${(tailored.keywords || []).join(", ")}
Gaps: ${(tailored.missingSkills || []).join(", ")}
ATS notes: ${tailored.atsNotes || ""}`
    : ""
}

Return JSON:
{
  "companyBrief": string (4-7 sentences: what the company/team likely cares about for this role, inferred from JD),
  "roleFocus": string[] (5-8 focus areas / themes from the JD),
  "likelyQuestions": [{"question": string, "tip": string}] (8-12 items; tip must reference candidate strengths when possible),
  "storiesToPrepare": [{"theme": string, "howToAnswer": string}] (4-6 STAR-style themes),
  "questionsToAsk": string[] (5 smart questions for the interviewer),
  "risks": string[] (honest gaps / weak spots to prepare for)
}`;

  const parsed = await generateAndParseJson({
    system,
    user,
    maxTokens: 6144,
    temperature: 0.35,
  });

  return {
    companyBrief: String(parsed.companyBrief || ""),
    roleFocus: asStringArray(parsed.roleFocus),
    likelyQuestions: asQuestionArray(parsed.likelyQuestions),
    storiesToPrepare: asStoryArray(parsed.storiesToPrepare),
    questionsToAsk: asStringArray(parsed.questionsToAsk),
    risks: asStringArray(parsed.risks),
  };
}

function asStringArray(v: unknown): string[] {
  return Array.isArray(v) ? v.map(String).filter(Boolean) : [];
}

function asQuestionArray(
  v: unknown
): Array<{ question: string; tip: string }> {
  if (!Array.isArray(v)) return [];
  return v
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const question = String(o.question || "").trim();
      if (!question) return null;
      return { question, tip: String(o.tip || "").trim() };
    })
    .filter(Boolean) as Array<{ question: string; tip: string }>;
}

function asStoryArray(
  v: unknown
): Array<{ theme: string; howToAnswer: string }> {
  if (!Array.isArray(v)) return [];
  return v
    .map((item) => {
      if (!item || typeof item !== "object") return null;
      const o = item as Record<string, unknown>;
      const theme = String(o.theme || "").trim();
      if (!theme) return null;
      return { theme, howToAnswer: String(o.howToAnswer || "").trim() };
    })
    .filter(Boolean) as Array<{ theme: string; howToAnswer: string }>;
}
