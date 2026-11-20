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
  const jdRequiredHints = extractRequiredTechHints(job);
  const candidateSkillPool = expandWithTransferable(
    collectCandidateSkills(profile)
  );

  const system = `You are an aggressive ATS resume rewriter hired to maximize interview callbacks for ONE specific job.

Mission: Rewrite the candidate's real background so the CV reads like a strong applicant for THIS job posting — same language, same priorities, same tech emphasis as the JD.

What you MUST do:
1. Rewrite headline for THIS job title (honest closest title). Example: "Senior Data Engineer" or "Software Engineer | Data Platforms" — never keep an unrelated old headline.
2. Rewrite professional summary as a normal resume summary for this role: 2–4 polished sentences, JD keywords + claimable tech woven in naturally. It must read like a CV a human would submit.
3. Rewrite EVERY experience bullet with the same employers/dates, using the job's vocabulary when truthful.
4. Skills array MUST start with JD-required technologies the candidate can honestly claim. Use the employer's spelling.
5. Cover letter sells fit for this role/company (cover letter can mention the company; the CV body must not).
6. keywords / missingSkills / matchScore / atsNotes are for the APP UI only — never put them into tailoredCv text.

CRITICAL — this CV is downloaded and sent to employers:
- NEVER write meta phrases in tailoredCv: "Targeting", "Match %", "for this role", "aligned to this posting", employer/company name in summary/headline/skills, "Core technologies for this role include", "bringing transferable engineering depth", "ATS", "keyword".
- No company names from the job in the CV body unless the candidate actually worked there.
- Summary should sound like a senior professional bio, not an application note.

Hard limits:
- Do NOT invent employers, job titles held, degrees, dates, or metrics.
- Do NOT claim deep production expertise in a tool never present in the profile.
- You MAY reframe, reorder, emphasize, and use transferable wording aggressively.

Return ONLY valid JSON. No markdown fences.`;

  const userPrompt = `Fully rewrite this CV for the job below. The output must look purpose-built for this organization and role — NOT a lightly edited copy of the old resume.

CANDIDATE PROFILE (truth source — do not invent beyond this):
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

CANDIDATE TECH POOL (including transferable equivalents you may use when honest):
${candidateSkillPool.join(", ")}

JOB TO TARGET:
Title: ${job.title}
Company: ${job.company}
Location: ${job.location}
URL: ${job.url}
Tags: ${(job.tags || []).join(", ")}
Required / mentioned technologies to prioritize on the CV when claimable:
${jdRequiredHints.join(", ") || "(extract from description)"}
Description:
${(job.description || "").slice(0, 8000)}

Return JSON with this exact shape:
{
  "matchScore": number (0-100, ATS coverage after rewrite),
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
    temperature: 0.35,
  });

  const modelKeywords = Array.isArray(parsed.keywords)
    ? parsed.keywords.map(String)
    : [];
  const modelMissing = Array.isArray(parsed.missingSkills)
    ? parsed.missingSkills.map(String)
    : [];

  const tailoredCv = normalizeTailoredCv(parsed.tailoredCv, profile, {
    job,
    keywords: modelKeywords,
    candidateSkillPool,
    jdRequiredHints,
  });

  const { keywords, missingSkills, matchScore } = scoreTailoredAgainstJd({
    job,
    tailoredCv,
    candidateSkillPool,
    jdRequiredHints,
    modelKeywords,
    modelMissing,
    modelScore: Number(parsed.matchScore) || 0,
  });

  // Final safety: force summary + headline to target this role/tech
  tailoredCv.headline = cleanCvHeadline(
    tailoredCv.headline || "",
    job.title,
    keywords
  );
  tailoredCv.summary = cleanCvSummary(
    tailoredCv.summary || "",
    job,
    keywords
  );

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
      highlightedSkills: tailoredCv.highlightedSkills,
    }
  );

  const cvMarkdown = toMarkdown(profile.fullName || "", tailoredCv);
  const atsNotes = enrichAtsNotes(
    String(parsed.atsNotes || ""),
    keywords,
    missingSkills,
    matchScore
  );

  return {
    matchScore,
    keywords,
    missingSkills,
    coverLetter: String(parsed.coverLetter || ""),
    cvMarkdown,
    cvHtml,
    atsNotes,
  };
}

function normalizeTailoredCv(
  raw: unknown,
  profile: ProfileDoc,
  ctx: {
    job: JobDoc;
    keywords: string[];
    candidateSkillPool: string[];
    jdRequiredHints: string[];
  }
): TailoredCvContent & { highlightedSkills?: string[] } {
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

  const modelSkills = Array.isArray(src.skills)
    ? src.skills.map(String).filter(Boolean)
    : [];

  const { skills, highlightedSkills } = prioritizeSkills({
    modelSkills,
    profileSkills: profile.skills || [],
    candidateSkillPool: ctx.candidateSkillPool,
    keywords: ctx.keywords,
    jdRequiredHints: ctx.jdRequiredHints,
    job: ctx.job,
  });

  let summary = String(src.summary || profile.summary || "");
  if (highlightedSkills.length) {
    summary = ensureSummaryMentionsTech(summary, highlightedSkills.slice(0, 8));
  }

  return {
    headline: String(src.headline || ctx.job.title || profile.headline || ""),
    summary,
    skills,
    highlightedSkills,
    experience: experience.map((e) => {
      const row = e as Record<string, unknown>;
      return {
        title: String(row.title || ""),
        company: String(row.company || ""),
        location: String(row.location || ""),
        startDate: String(row.startDate || ""),
        endDate: String(row.endDate || ""),
        current: Boolean(row.current),
        bullets: Array.isArray(row.bullets) ? row.bullets.map(String) : [],
      };
    }),
    education: education.map((e) => {
      const row = e as Record<string, unknown>;
      return {
        school: String(row.school || ""),
        degree: String(row.degree || ""),
        field: String(row.field || ""),
        startDate: String(row.startDate || ""),
        endDate: String(row.endDate || ""),
      };
    }),
    projects: projects.map((p) => {
      const row = p as Record<string, unknown>;
      return {
        name: String(row.name || ""),
        url: String(row.url || ""),
        description: String(row.description || ""),
        tech: Array.isArray(row.tech) ? row.tech.map(String) : [],
      };
    }),
  };
}

function prioritizeSkills(params: {
  modelSkills: string[];
  profileSkills: string[];
  candidateSkillPool: string[];
  keywords: string[];
  jdRequiredHints: string[];
  job: JobDoc;
}): { skills: string[]; highlightedSkills: string[] } {
  const jdTech = dedupePreserve([
    ...params.jdRequiredHints,
    ...params.keywords,
    ...extractTechTokens(
      [params.job.title, ...(params.job.tags || []), params.job.description || ""].join(
        " "
      )
    ),
  ]);

  const pool = dedupePreserve([
    ...params.modelSkills,
    ...params.profileSkills,
    ...params.candidateSkillPool,
  ]);

  // JD tech the candidate can claim (direct or transferable)
  const claimableJd: string[] = [];
  for (const tech of jdTech) {
    const owned = findClaimableSkill(tech, pool);
    if (owned) claimableJd.push(owned);
  }

  const modelMatched = params.modelSkills.filter((s) =>
    jdTech.some((t) => skillsRelated(s, t))
  );

  const highlightedSkills = dedupePreserve([
    ...claimableJd,
    ...modelMatched,
    ...params.keywords.filter((k) => findClaimableSkill(k, pool)),
  ]).slice(0, 14);

  const rest = pool.filter(
    (s) => !highlightedSkills.some((h) => normalizeText(h) === normalizeText(s))
  );

  const skills = dedupePreserve([...highlightedSkills, ...rest]).slice(0, 22);
  return { skills, highlightedSkills };
}

function scoreTailoredAgainstJd(params: {
  job: JobDoc;
  tailoredCv: TailoredCvContent & { highlightedSkills?: string[] };
  candidateSkillPool: string[];
  jdRequiredHints: string[];
  modelKeywords: string[];
  modelMissing: string[];
  modelScore: number;
}) {
  const jdTech = dedupePreserve([
    ...params.jdRequiredHints,
    ...extractTechTokens(
      [params.job.title, ...(params.job.tags || []), params.job.description || ""].join(
        " "
      )
    ),
  ]);

  const cvBlob = normalizeText(
    [
      params.tailoredCv.headline,
      params.tailoredCv.summary,
      ...(params.tailoredCv.skills || []),
      ...(params.tailoredCv.highlightedSkills || []),
      ...(params.tailoredCv.experience || []).flatMap((e) => [
        e.title,
        ...(e.bullets || []),
      ]),
      ...(params.tailoredCv.projects || []).flatMap((p) => [
        p.description,
        ...(p.tech || []),
      ]),
    ]
      .filter(Boolean)
      .join(" ")
  );

  const placed: string[] = [];
  const missing: string[] = [];

  for (const tech of jdTech) {
    const n = normalizeText(tech);
    const inCv = cvBlob.includes(n) || skillsRelatedInText(tech, cvBlob);
    const claimable = Boolean(findClaimableSkill(tech, params.candidateSkillPool));
    if (inCv && claimable) placed.push(tech);
    else if (!claimable) missing.push(tech);
    else missing.push(tech); // claimable but not placed — still a gap for ATS
  }

  // If claimable but we failed to place, try to not double-count as missing when highlighted
  const highlighted = params.tailoredCv.highlightedSkills || [];
  const keywords = dedupePreserve([
    ...highlighted,
    ...placed,
    ...params.modelKeywords.filter((k) =>
      Boolean(findClaimableSkill(k, params.candidateSkillPool))
    ),
  ]).slice(0, 18);

  const missingSkills = dedupePreserve([
    ...missing.filter((m) => !keywords.some((k) => skillsRelated(k, m))),
    ...params.modelMissing,
  ]).slice(0, 16);

  const denom = Math.max(jdTech.length, 1);
  const coverage = keywords.filter((k) =>
    jdTech.some((t) => skillsRelated(k, t) || cvBlob.includes(normalizeText(k)))
  ).length;
  const coverageScore = Math.round((Math.min(coverage, denom) / denom) * 70);

  const titleBits = normalizeText(params.job.title)
    .split(/[^a-z0-9+#]+/)
    .filter((t) => t.length > 2);
  const headlineHit = titleBits.filter((t) =>
    normalizeText(params.tailoredCv.headline || "").includes(t)
  ).length;
  const summaryHit = titleBits.filter((t) =>
    normalizeText(params.tailoredCv.summary || "").includes(t)
  ).length;
  const targetingScore = Math.min(
    25,
    headlineHit * 6 + summaryHit * 4 + (highlighted.length > 0 ? 8 : 0)
  );

  const computed = Math.max(
    0,
    Math.min(100, coverageScore + targetingScore)
  );
  // Blend with model score but never let a "gave up" 10% win if we placed keywords
  const matchScore = Math.round(
    Math.max(computed, params.modelScore * 0.35 + computed * 0.65)
  );

  return { keywords, missingSkills, matchScore };
}

function cleanCvHeadline(headline: string, jobTitle: string, keywords: string[]) {
  let h = stripMetaCvLanguage(headline).trim();
  const title = jobTitle.trim();
  const hNorm = normalizeText(h);
  const titleNorm = normalizeText(title);

  const looksWrong =
    !h ||
    /targeting|match\s*\d/i.test(h) ||
    (hNorm.includes("frontend") &&
      titleNorm.includes("data") &&
      !hNorm.includes("data")) ||
    (hNorm.includes("react developer") && !titleNorm.includes("react"));

  if (!looksWrong) return h;

  const techBit = keywords.slice(0, 3).join(" · ");
  return techBit ? `${title} | ${techBit}` : title;
}

function cleanCvSummary(
  summary: string,
  job: JobDoc,
  keywords: string[]
) {
  let s = stripMetaCvLanguage(summary).trim();
  // Drop employer name from CV body (belongs in cover letter only)
  if (job.company) {
    s = s.replace(new RegExp(escapeRegExp(job.company), "gi"), "").trim();
  }
  s = s
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,;:])/g, "$1")
    .replace(/^[,.\s]+/, "")
    .trim();

  if (!s) {
    const tech = keywords.slice(0, 5).join(", ");
    return tech
      ? `Engineer with hands-on experience across ${tech}. Builds reliable systems, collaborates closely with product and engineering teams, and delivers maintainable solutions under real production constraints.`
      : `Engineer focused on building reliable systems, collaborating with product and engineering teams, and delivering maintainable solutions under production constraints.`;
  }

  // Gently weave missing claimable tech without meta wording
  return weaveTechIntoSummary(s, keywords.slice(0, 6));
}

function stripMetaCvLanguage(text: string) {
  if (!text) return "";
  return text
    .replace(/targeting\s+the\s+[^.,\n]+?(?:role\s+)?(?:at\s+[^.,\n]+)?[,.]?\s*/gi, "")
    .replace(/targeting\s*:\s*[^.\n]+[.\n]?/gi, "")
    .replace(/match\s*\d+\s*%/gi, "")
    .replace(/bringing transferable engineering depth across\s+/gi, "Experienced with ")
    .replace(/strengths aligned to this posting include\s+/gi, "")
    .replace(/core technologies for this role include\s+/gi, "")
    .replace(/key strengths for this role include\s+/gi, "")
    .replace(/ATS coverage[^.]*\./gi, "")
    .replace(/\bthis posting\b/gi, "this domain")
    .trim();
}

function weaveTechIntoSummary(summary: string, tech: string[]) {
  const lower = summary.toLowerCase();
  const missing = tech.filter((t) => t && !lower.includes(t.toLowerCase()));
  if (!missing.length) return summary;
  const mention = missing.slice(0, 4).join(", ");
  const trimmed = summary.replace(/\s+$/, "");
  const sep = /[.!?]$/.test(trimmed) ? " " : ". ";
  return `${trimmed}${sep}Hands-on with ${mention}.`;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function enrichAtsNotes(
  notes: string,
  keywords: string[],
  missing: string[],
  score: number
) {
  const parts = [
    notes.trim(),
    keywords.length
      ? `Surfaced on CV: ${keywords.slice(0, 10).join(", ")}.`
      : "Few overlapping technologies found in your profile for this JD.",
    missing.length
      ? `Still missing vs JD (add to Profile if you have them, then Re-match): ${missing
          .slice(0, 8)
          .join(", ")}.`
      : "",
    `ATS coverage after rewrite: ${score}%.`,
  ].filter(Boolean);
  return parts.join(" ");
}

function findClaimableSkill(tech: string, pool: string[]) {
  const direct =
    pool.find((p) => normalizeText(p) === normalizeText(tech)) ||
    pool.find((p) => skillsRelated(p, tech));
  if (direct) return canonicalizeTech(direct);

  // Transferable: if JD wants X and pool has a mapped equivalent, return JD spelling
  for (const p of pool) {
    if (skillsRelated(p, tech)) return canonicalizeTech(tech);
  }
  return null;
}

function skillsRelated(a: string, b: string) {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return false;
  if (na === nb || na.includes(nb) || nb.includes(na)) return true;
  const groups = TRANSFERABLE_GROUPS;
  for (const group of groups) {
    const aHit = group.some((g) => na.includes(g) || g.includes(na));
    const bHit = group.some((g) => nb.includes(g) || g.includes(nb));
    if (aHit && bHit) return true;
  }
  return false;
}

function skillsRelatedInText(tech: string, blob: string) {
  const n = normalizeText(tech);
  if (blob.includes(n)) return true;
  for (const group of TRANSFERABLE_GROUPS) {
    if (!group.some((g) => n.includes(g) || g.includes(n))) continue;
    if (group.some((g) => blob.includes(g))) return true;
  }
  return false;
}

/** Skills that can stand in for each other when reframing toward a JD */
const TRANSFERABLE_GROUPS: string[][] = [
  ["javascript", "typescript", "node", "nodejs", "node.js", "js"],
  ["react", "next", "next.js", "frontend", "ui"],
  ["python", "pandas", "numpy", "scripting"],
  ["sql", "postgresql", "mysql", "sqlite", "database", "databases"],
  ["mongodb", "nosql", "document db"],
  ["aws", "gcp", "azure", "cloud"],
  ["docker", "kubernetes", "k8s", "containers"],
  ["kafka", "rabbitmq", "pubsub", "messaging", "queue"],
  ["spark", "hadoop", "etl", "pipeline", "pipelines", "airflow", "data engineer"],
  ["rest", "graphql", "api", "apis", "json"],
  ["redis", "caching", "cache"],
  ["ci/cd", "github actions", "jenkins", "devops"],
];

function expandWithTransferable(skills: string[]) {
  const out = [...skills];
  const joined = normalizeText(skills.join(" "));
  // If they have JS/TS/Node, they can honestly claim related API/data-adjacent keywords
  if (/(javascript|typescript|node)/.test(joined)) {
    out.push("JavaScript", "TypeScript", "REST", "JSON", "APIs");
  }
  if (/(mongo|sql|postgres|mysql)/.test(joined)) {
    out.push("SQL", "Databases", "Data modeling");
  }
  if (/(react|next)/.test(joined)) {
    out.push("JavaScript", "TypeScript", "REST", "JSON");
  }
  if (/(docker|kubernetes|aws|gcp|azure)/.test(joined)) {
    out.push("Cloud", "CI/CD");
  }
  return dedupePreserve(out.map(canonicalizeTech));
}

function ensureSummaryMentionsTech(summary: string, tech: string[]) {
  return weaveTechIntoSummary(stripMetaCvLanguage(summary), tech);
}

function collectCandidateSkills(profile: ProfileDoc): string[] {
  const fromProjects = (profile.projects || []).flatMap((p) => p.tech || []);
  const fromBullets = (profile.experience || []).flatMap((e) => e.bullets || []);
  const blob = [profile.summary, profile.headline, ...fromBullets].join(" ");
  const extracted = extractTechTokens(blob);
  return dedupePreserve([
    ...(profile.skills || []),
    ...fromProjects,
    ...extracted,
  ]);
}

export function extractRequiredTechHints(job: JobDoc): string[] {
  const tags = (job.tags || []).map(String);
  const fromDesc = extractTechTokens(job.description || "");
  const fromTitle = extractTechTokens(job.title || "");
  // Also pull multi-word role phrases
  const rolePhrases: string[] = [];
  const desc = job.description || "";
  const phraseRe =
    /\b(data pipelines?|ETL|ELT|data warehouse|data lake|stream(?:ing)?|orchestration|analytics|warehous(?:e|ing))\b/gi;
  let m: RegExpExecArray | null;
  while ((m = phraseRe.exec(desc))) {
    rolePhrases.push(m[1]);
  }
  return dedupePreserve([...tags, ...fromTitle, ...fromDesc, ...rolePhrases]).slice(
    0,
    40
  );
}

function extractTechTokens(text: string): string[] {
  if (!text) return [];
  const known = [
    "JavaScript",
    "TypeScript",
    "Python",
    "Java",
    "Kotlin",
    "Swift",
    "Go",
    "Golang",
    "Rust",
    "C#",
    "C\\+\\+",
    "PHP",
    "Ruby",
    "Scala",
    "React",
    "Next\\.js",
    "Nextjs",
    "Vue",
    "Angular",
    "Node\\.js",
    "Nodejs",
    "Express",
    "NestJS",
    "Django",
    "Flask",
    "FastAPI",
    "Spring",
    "\\.NET",
    "ASP\\.NET",
    "PostgreSQL",
    "MySQL",
    "MongoDB",
    "Redis",
    "Elasticsearch",
    "Kafka",
    "RabbitMQ",
    "GraphQL",
    "REST",
    "Docker",
    "Kubernetes",
    "AWS",
    "GCP",
    "Azure",
    "Terraform",
    "CI/CD",
    "Git",
    "Linux",
    "Tailwind",
    "Redux",
    "Prisma",
    "Supabase",
    "Firebase",
    "Snowflake",
    "Databricks",
    "dbt",
    "Spark",
    "Airflow",
    "TensorFlow",
    "PyTorch",
    "Pandas",
    "NumPy",
    "Selenium",
    "Playwright",
    "Jest",
    "Cypress",
    "Webpack",
    "Vite",
    "Svelte",
    "Flutter",
    "React Native",
    "HTML",
    "CSS",
    "Sass",
    "SQL",
    "NoSQL",
    "ETL",
    "ELT",
    "Microservices",
    "Agile",
    "Scrum",
    "Jira",
    "Figma",
  ];

  const found: string[] = [];
  for (const pattern of known) {
    const re = new RegExp(
      `(?:^|[^A-Za-z0-9+#.])(${pattern})(?:[^A-Za-z0-9+#.]|$)`,
      "i"
    );
    const match = text.match(re);
    if (match?.[1]) found.push(canonicalizeTech(match[1]));
  }

  const loose = text.match(/\b[A-Za-z][A-Za-z0-9+#.]{1,24}\b/g) || [];
  for (const token of loose) {
    if (
      /^(and|the|with|for|our|you|will|this|that|from|have|been|using|experience|years?|team|role|job|work)$/i.test(
        token
      )
    ) {
      continue;
    }
    if (
      /js$|sql$|db$|\.net$|c\+\+|node|react|python|java|aws|gcp|azure|spark|kafka|airflow|snowflake/i.test(
        token
      )
    ) {
      found.push(canonicalizeTech(token));
    }
  }

  return dedupePreserve(found);
}

function canonicalizeTech(raw: string) {
  const map: Record<string, string> = {
    javascript: "JavaScript",
    typescript: "TypeScript",
    nodejs: "Node.js",
    "node.js": "Node.js",
    nextjs: "Next.js",
    "next.js": "Next.js",
    reactjs: "React",
    postgresql: "PostgreSQL",
    mongodb: "MongoDB",
    mysql: "MySQL",
    golang: "Go",
    csharp: "C#",
    "c++": "C++",
    "asp.net": "ASP.NET",
    ".net": ".NET",
    kubernetes: "Kubernetes",
    ci: "CI/CD",
    cicd: "CI/CD",
    apis: "APIs",
    api: "APIs",
  };
  const key = raw.toLowerCase();
  return map[key] || raw;
}

function normalizeText(s: string) {
  return s.toLowerCase().replace(/\s+/g, " ").trim();
}

function dedupePreserve(items: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of items) {
    const key = normalizeText(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push(item.trim());
  }
  return out;
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
    lines.push(
      `${e.startDate || ""} - ${e.current ? "Present" : e.endDate || ""}`
    );
    for (const b of e.bullets || []) lines.push(`- ${b}`);
    lines.push("");
  }
  return lines.join("\n");
}
