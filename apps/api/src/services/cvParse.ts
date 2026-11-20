import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { generateAndParseJson } from "./ai.js";

export type ParsedProfile = {
  fullName: string;
  headline: string;
  email: string;
  phone: string;
  location: string;
  linkedin: string;
  github: string;
  website: string;
  summary: string;
  skills: string[];
  experience: Array<{
    title?: string;
    company?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    current?: boolean;
    bullets?: string[];
  }>;
  education: Array<{
    school?: string;
    degree?: string;
    field?: string;
    startDate?: string;
    endDate?: string;
  }>;
  projects: Array<{
    name?: string;
    url?: string;
    description?: string;
    tech?: string[];
  }>;
  suggestedPreferences?: {
    roles?: string[];
    keywords?: string[];
  };
};

export async function extractTextFromCv(
  buffer: Buffer,
  filename: string,
  mimeType: string
): Promise<string> {
  const lower = filename.toLowerCase();
  const isPdf = mimeType.includes("pdf") || lower.endsWith(".pdf");
  const isDocx =
    mimeType.includes("wordprocessingml") ||
    mimeType.includes("msword") ||
    lower.endsWith(".docx") ||
    lower.endsWith(".doc");
  const isText = mimeType.startsWith("text/") || lower.endsWith(".txt") || lower.endsWith(".md");

  if (isPdf) {
    const parser = new PDFParse({ data: buffer });
    try {
      const result = await parser.getText();
      const text = (result.text || "").trim();
      if (!text) throw new Error("Could not read text from PDF (maybe scanned image?)");
      return text;
    } finally {
      await parser.destroy().catch(() => undefined);
    }
  }

  if (isDocx) {
    const result = await mammoth.extractRawText({ buffer });
    const text = (result.value || "").trim();
    if (!text) throw new Error("Could not read text from Word document");
    return text;
  }

  if (isText) {
    const text = buffer.toString("utf8").trim();
    if (!text) throw new Error("Empty text file");
    return text;
  }

  throw new Error("Unsupported file type. Upload PDF, DOCX, or TXT.");
}

export async function parseCvTextToProfile(cvText: string): Promise<ParsedProfile> {
  const parsed = await generateAndParseJson({
    system: `You extract structured resume data into strict JSON.
Rules:
- Only use facts present in the CV text. Never invent employers, degrees, or skills.
- If a field is missing, use empty string or empty array.
- Return ONLY one valid JSON object.
- Escape all quotes inside strings. No trailing commas. No comments.
- Keep bullets short (max 12 per job). Keep skills max 40 items.`,
    user: `Parse this CV into JSON with this exact shape:
{
  "fullName": "",
  "headline": "",
  "email": "",
  "phone": "",
  "location": "",
  "linkedin": "",
  "github": "",
  "website": "",
  "summary": "",
  "skills": [],
  "experience": [{"title": "", "company": "", "location": "", "startDate": "", "endDate": "", "current": false, "bullets": []}],
  "education": [{"school": "", "degree": "", "field": "", "startDate": "", "endDate": ""}],
  "projects": [{"name": "", "url": "", "description": "", "tech": []}],
  "suggestedPreferences": {"roles": [], "keywords": []}
}

CV TEXT:
${cvText.slice(0, 14000)}`,
    maxTokens: 8192,
    temperature: 0.1,
  });

  return normalizeParsed(parsed);
}

function normalizeParsed(raw: Record<string, unknown>): ParsedProfile {
  const experience = Array.isArray(raw.experience) ? raw.experience : [];
  const education = Array.isArray(raw.education) ? raw.education : [];
  const projects = Array.isArray(raw.projects) ? raw.projects : [];
  const skills = Array.isArray(raw.skills) ? raw.skills.map(String) : [];
  const suggested = (raw.suggestedPreferences || {}) as Record<string, unknown>;

  return {
    fullName: String(raw.fullName || ""),
    headline: String(raw.headline || ""),
    email: String(raw.email || ""),
    phone: String(raw.phone || ""),
    location: String(raw.location || ""),
    linkedin: String(raw.linkedin || ""),
    github: String(raw.github || ""),
    website: String(raw.website || ""),
    summary: String(raw.summary || ""),
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
    suggestedPreferences: {
      roles: Array.isArray(suggested.roles) ? suggested.roles.map(String) : [],
      keywords: Array.isArray(suggested.keywords)
        ? suggested.keywords.map(String)
        : skills.slice(0, 12),
    },
  };
}
