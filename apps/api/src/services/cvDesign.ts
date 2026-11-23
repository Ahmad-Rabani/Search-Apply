import { generateText, type AiMediaPart } from "./ai.js";
import type { CvContact, TailoredCvContent } from "./cvTemplate.js";
import { pdfBufferToPngPages } from "./pdfPages.js";

/**
 * Fill the user's uploaded CV design with tailored content.
 * Preserves fonts, colors, spacing, columns, and section chrome from designHtml.
 * When reference media (PDF/images) is provided, vision locks the visual match.
 */
export async function renderIntoUploadedDesign(
  designHtml: string,
  contact: CvContact,
  tailored: TailoredCvContent,
  opts?: { media?: AiMediaPart[] }
): Promise<string> {
  const template = designHtml.trim();
  if (!template) {
    throw new Error("Empty CV design");
  }

  const system = `You are an expert resume typesetter cloning a real CV design.

Mission: produce a print-ready HTML resume that looks nearly identical to the ORIGINAL CV (see attached PDF/images when present, and the HTML design shell).

Visual fidelity is mandatory:
- Match exact colors (e.g. dark navy/blue name + section titles + underlines + job titles if the original uses them).
- Match typography (sans-serif family, sizes, letter-spacing, ALL CAPS section headers).
- Match layout: centered or left header, contact line with colored separators, section rules, job title/date alignment, bullet density.
- Keep compact professional spacing so the CV stays ~same page count as the original (do not inflate to 3–4 sparse pages).
- Preserve section order and chrome from the original design.

Content rules:
- Replace body text with TAILORED CONTENT only (headline/summary/skills/experience/education/projects/contact).
- Do not invent employers, schools, or dates.
- No meta phrases: Targeting, Match %, ATS, hiring-company name (unless candidate worked there).

Output: complete HTML document with embedded <style>. ONLY HTML — no markdown fences.`;

  const user = `ORIGINAL CV DESIGN HTML (structure/styles to keep):
${template.slice(0, 24000)}

TAILORED CONTENT TO PLACE INTO THAT DESIGN:
${JSON.stringify(
  {
    contact,
    headline: tailored.headline,
    summary: tailored.summary,
    skills: tailored.skills,
    highlightedSkills: tailored.highlightedSkills || [],
    experience: tailored.experience,
    education: tailored.education,
    projects: tailored.projects,
  },
  null,
  2
)}

${
  opts?.media?.length
    ? "Attached media shows the ORIGINAL CV appearance — match colors, fonts, rules, and spacing from it."
    : ""
}

Return the full HTML resume now.`;

  const raw = await generateText({
    system,
    user,
    maxTokens: 16384,
    temperature: 0.1,
    media: opts?.media,
  });

  const html = stripHtmlFences(raw);
  if (!html.includes("<") || html.length < 80) {
    throw new Error("Design render returned invalid HTML");
  }
  return ensurePrintCss(html);
}

/**
 * Build a high-fidelity HTML design from the uploaded CV file using vision.
 * Prefer this for PDFs — text-only reconstruction loses colors/fonts.
 */
export async function reconstructDesignHtmlFromFile(params: {
  buffer: Buffer;
  mimeType: string;
  filename: string;
  cvText: string;
}): Promise<string> {
  const media = await buildDesignMedia(params);

  const system = `You are a world-class CV design clone engine.
Recreate the attached resume as a self-contained HTML+CSS document that looks like the original:
same colors (especially blue/navy headers and rules), fonts, hierarchy, underlines, contact row, job-title styling, bullets, and spacing.
Aim for the same approximate page length when printed to A4.
Use embedded <style> only (Google Fonts @import allowed if needed).
Return ONLY a complete HTML document. No markdown fences.`;

  const raw = await generateText({
    system,
    user: `Clone this CV's visual design into HTML.

Extracted text (for content accuracy):
${params.cvText.slice(0, 12000)}

Match the attached original file/pages visually.`,
    maxTokens: 16384,
    temperature: 0.1,
    media,
  });

  return ensurePrintCss(stripHtmlFences(raw));
}

/** Fallback when no file/media is available. */
export async function reconstructDesignHtmlFromText(cvText: string): Promise<string> {
  const system = `You recreate a professional resume as self-contained HTML.
If the text suggests a modern blue/navy professional CV (ALL CAPS section headers, name centered, contact with bullets), use:
- Name: dark navy (#1B3A5F), large bold sans-serif, centered
- Section titles: same navy, uppercase, bold, with a 1.5px navy bottom border
- Job titles in navy; company bold black; dates right-aligned muted
- Compact spacing for a 1–2 page A4 resume
Return ONLY a complete HTML document. No markdown fences.`;

  const raw = await generateText({
    system,
    user: `Rebuild this CV as HTML with a polished professional look matching the implied structure:\n\n${cvText.slice(0, 14000)}`,
    maxTokens: 12288,
    temperature: 0.15,
  });

  return ensurePrintCss(stripHtmlFences(raw));
}

export async function buildDesignMedia(params: {
  buffer: Buffer;
  mimeType: string;
  filename: string;
}): Promise<AiMediaPart[]> {
  const lower = params.filename.toLowerCase();
  const isPdf =
    params.mimeType.includes("pdf") || lower.endsWith(".pdf");
  const isImage = params.mimeType.startsWith("image/");

  const media: AiMediaPart[] = [];

  if (isPdf) {
    // Gemini/Claude both handle PDF well for layout cloning
    media.push({
      mimeType: "application/pdf",
      data: params.buffer,
    });
    try {
      const pages = await pdfBufferToPngPages(params.buffer, 2);
      for (const png of pages) {
        media.push({ mimeType: "image/png", data: png });
      }
    } catch (err) {
      console.warn(
        "[cvDesign] PDF rasterize failed:",
        err instanceof Error ? err.message : err
      );
    }
    return media;
  }

  if (isImage) {
    media.push({ mimeType: params.mimeType, data: params.buffer });
    return media;
  }

  return media;
}

function stripHtmlFences(raw: string) {
  let s = raw.trim();
  if (s.startsWith("```")) {
    s = s.replace(/^```(?:html)?\s*/i, "").replace(/```$/i, "").trim();
  }
  const start = s.search(/<!DOCTYPE|<html/i);
  if (start > 0) s = s.slice(start);
  return s.trim();
}

/** Tighten print CSS so Puppeteer PDFs don't look sparse. */
function ensurePrintCss(html: string) {
  const inject = `<style id="saa-print">
@page { size: A4; margin: 12mm 14mm; }
html, body { margin: 0 !important; }
body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
</style>`;
  if (/<\/head>/i.test(html)) {
    return html.replace(/<\/head>/i, `${inject}</head>`);
  }
  if (/<html/i.test(html)) {
    return html.replace(/<html[^>]*>/i, (m) => `${m}<head>${inject}</head>`);
  }
  return `<!DOCTYPE html><html><head><meta charset="utf-8" />${inject}</head><body>${html}</body></html>`;
}
