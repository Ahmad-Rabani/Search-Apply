export type TailoredCvContent = {
  headline?: string;
  summary?: string;
  skills?: string[];
  /** JD-aligned tech that the candidate actually has — shown first / emphasized */
  highlightedSkills?: string[];
  experience?: Array<{
    title?: string;
    company?: string;
    location?: string;
    startDate?: string;
    endDate?: string;
    current?: boolean;
    bullets?: string[];
  }>;
  education?: Array<{
    school?: string;
    degree?: string;
    field?: string;
    startDate?: string;
    endDate?: string;
  }>;
  projects?: Array<{
    name?: string;
    url?: string;
    description?: string;
    tech?: string[];
  }>;
};

export type CvContact = {
  fullName: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  website?: string;
};

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function dateRange(start?: string, end?: string, current?: boolean) {
  const a = (start || "").trim();
  const b = current ? "Present" : (end || "").trim();
  if (!a && !b) return "";
  if (a && b) return `${a} – ${b}`;
  return a || b;
}

/** Professional resume HTML used for preview + PDF (consistent design). */
export function renderProfessionalCvHtml(
  contact: CvContact,
  cv: TailoredCvContent,
  opts?: {
    targetRole?: string;
    company?: string;
    matchScore?: number;
    highlightedSkills?: string[];
  }
) {
  const name = esc(contact.fullName || "Candidate");
  const headline = esc(cv.headline || opts?.targetRole || "");
  const summary = esc(cv.summary || "");
  const highlighted = (
    opts?.highlightedSkills ||
    cv.highlightedSkills ||
    []
  )
    .map(String)
    .filter(Boolean);
  const highlightSet = new Set(highlighted.map((s) => s.toLowerCase()));
  const skills = (cv.skills || []).map(String).filter(Boolean);
  const otherSkills = skills.filter((s) => !highlightSet.has(s.toLowerCase()));
  const experience = cv.experience || [];
  const education = cv.education || [];
  const projects = cv.projects || [];

  const links = [
    contact.email,
    contact.phone,
    contact.location,
    contact.linkedin,
    contact.github,
    contact.website,
  ]
    .map((x) => (x || "").trim())
    .filter(Boolean)
    .map(esc);

  // One clean skills row: JD-aligned tech first, then the rest (no "targeting" meta on the CV)
  const orderedSkills = [
    ...highlighted,
    ...otherSkills.filter(
      (s) => !highlightSet.has(s.toLowerCase())
    ),
  ];
  const finalSkills =
    orderedSkills.length > 0
      ? orderedSkills
      : skills;
  const skillsHtml = finalSkills.length
    ? `<div class="skills">${finalSkills
        .map((s) => {
          const isCore = highlightSet.has(s.toLowerCase());
          return `<span class="skill${isCore ? " skill-core" : ""}">${esc(s)}</span>`;
        })
        .join("")}</div>`
    : "";

  const expHtml = experience
    .map((e) => {
      const title = esc(e.title || "");
      const company = esc(e.company || "");
      const loc = esc(e.location || "");
      const dates = esc(dateRange(e.startDate, e.endDate, e.current));
      const bullets = (e.bullets || [])
        .map(String)
        .filter(Boolean)
        .map((b) => `<li>${esc(b)}</li>`)
        .join("");
      return `<article class="job">
        <div class="job-head">
          <div>
            <h3>${title}${company ? ` · ${company}` : ""}</h3>
            ${loc ? `<p class="muted">${loc}</p>` : ""}
          </div>
          <p class="dates">${dates}</p>
        </div>
        ${bullets ? `<ul>${bullets}</ul>` : ""}
      </article>`;
    })
    .join("");

  const eduHtml = education
    .map((e) => {
      const school = esc(e.school || "");
      const degree = [e.degree, e.field].filter(Boolean).map(String).join(", ");
      const dates = esc(dateRange(e.startDate, e.endDate));
      return `<article class="edu">
        <div class="job-head">
          <div>
            <h3>${school}</h3>
            ${degree ? `<p class="muted">${esc(degree)}</p>` : ""}
          </div>
          <p class="dates">${dates}</p>
        </div>
      </article>`;
    })
    .join("");

  const projectsHtml = projects
    .map((p) => {
      const nameP = esc(p.name || "");
      const desc = esc(p.description || "");
      const url = (p.url || "").trim();
      const tech = (p.tech || []).map(String).filter(Boolean);
      return `<article class="project">
        <h3>${nameP}${
          url
            ? ` <a href="${esc(url)}" class="link">${esc(url.replace(/^https?:\/\//, ""))}</a>`
            : ""
        }</h3>
        ${desc ? `<p>${desc}</p>` : ""}
        ${
          tech.length
            ? `<p class="muted">${tech.map(esc).join(" · ")}</p>`
            : ""
        }
      </article>`;
    })
    .join("");

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&family=Fraunces:opsz,wght@9..144,600;9..144,700&display=swap');

    :root {
      --ink: #10201d;
      --muted: #5b6f6a;
      --line: #d7e3df;
      --teal: #0f766e;
      --teal-soft: #e7f3f1;
      --chip: #eff6f4;
    }

    * { box-sizing: border-box; }
    body {
      margin: 0;
      color: var(--ink);
      font-family: "DM Sans", Helvetica, Arial, sans-serif;
      font-size: 10.5pt;
      line-height: 1.45;
      background: #fff;
    }
    .page {
      max-width: 820px;
      margin: 0 auto;
      padding: 8px 4px 4px;
    }
    header {
      border-bottom: 3px solid var(--teal);
      padding-bottom: 14px;
      margin-bottom: 18px;
    }
    .name {
      font-family: "Fraunces", Georgia, serif;
      font-size: 28pt;
      font-weight: 700;
      letter-spacing: -0.02em;
      margin: 0;
      color: var(--ink);
    }
    .headline {
      margin: 6px 0 0;
      font-size: 12pt;
      font-weight: 600;
      color: var(--teal);
    }
    .contacts {
      margin-top: 10px;
      display: flex;
      flex-wrap: wrap;
      gap: 6px 14px;
      font-size: 9.5pt;
      color: var(--muted);
    }
    .contacts span::before {
      content: "";
    }
    section { margin: 0 0 16px; }
    .section-title {
      margin: 0 0 8px;
      font-size: 11pt;
      font-weight: 700;
      letter-spacing: 0.08em;
      text-transform: uppercase;
      color: var(--teal);
      border-bottom: 1px solid var(--line);
      padding-bottom: 4px;
    }
    .summary { margin: 0; color: var(--ink); }
    .skills {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
    }
    .skill {
      display: inline-block;
      background: var(--chip);
      border: 1px solid var(--line);
      color: var(--ink);
      border-radius: 999px;
      padding: 3px 10px;
      font-size: 9pt;
      font-weight: 500;
    }
    .skill-core {
      background: var(--teal-soft);
      border-color: #9cc9c2;
      color: var(--teal);
      font-weight: 600;
    }
    .job, .edu, .project { margin: 0 0 12px; }
    .job-head {
      display: flex;
      justify-content: space-between;
      gap: 12px;
      align-items: flex-start;
    }
    h3 {
      margin: 0;
      font-size: 11pt;
      font-weight: 700;
      color: var(--ink);
    }
    .muted { margin: 2px 0 0; color: var(--muted); font-size: 9.5pt; }
    .dates {
      margin: 0;
      white-space: nowrap;
      color: var(--muted);
      font-size: 9.5pt;
      font-weight: 600;
    }
    ul {
      margin: 6px 0 0;
      padding-left: 18px;
    }
    li { margin: 0 0 3px; }
    a.link {
      color: var(--teal);
      font-weight: 500;
      font-size: 9.5pt;
      text-decoration: none;
    }
    p { margin: 4px 0 0; }
  </style>
</head>
<body>
  <div class="page">
    <header>
      <h1 class="name">${name}</h1>
      ${headline ? `<p class="headline">${headline}</p>` : ""}
      ${
        links.length
          ? `<div class="contacts">${links
              .map((l) => `<span>${l}</span>`)
              .join("")}</div>`
          : ""
      }
    </header>

    ${
      summary
        ? `<section><h2 class="section-title">Professional Summary</h2><p class="summary">${summary}</p></section>`
        : ""
    }

    ${
      skillsHtml
        ? `<section><h2 class="section-title">Skills</h2>${skillsHtml}</section>`
        : ""
    }

    ${
      expHtml
        ? `<section><h2 class="section-title">Experience</h2>${expHtml}</section>`
        : ""
    }

    ${
      projectsHtml
        ? `<section><h2 class="section-title">Projects</h2>${projectsHtml}</section>`
        : ""
    }

    ${
      eduHtml
        ? `<section><h2 class="section-title">Education</h2>${eduHtml}</section>`
        : ""
    }
  </div>
</body>
</html>`;
}
