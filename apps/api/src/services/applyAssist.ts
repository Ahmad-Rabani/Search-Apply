import fs from "fs/promises";
import path from "path";
import puppeteer from "puppeteer";
import { config } from "../config.js";

export type ApplyProfile = {
  fullName?: string;
  email?: string;
  phone?: string;
  location?: string;
  linkedin?: string;
  github?: string;
  website?: string;
  summary?: string;
};

/**
 * Human-in-the-loop apply assist:
 * opens the job URL, best-effort fills common fields, captures screenshot.
 * Does NOT auto-submit (avoids accidental applications / ToS issues).
 */
export async function runApplyAssist(opts: {
  jobUrl: string;
  userId: string;
  jobId: string;
  profile: ApplyProfile;
  coverLetter?: string;
}) {
  if (!opts.jobUrl) throw new Error("Job URL missing");

  await fs.mkdir(config.storageDir, { recursive: true });
  const shotName = `apply-${opts.userId}-${opts.jobId}-${Date.now()}.png`;
  const screenshotPath = path.join(config.storageDir, shotName);

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: { width: 1280, height: 900 },
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const filled: string[] = [];
  let pageTitle = "";

  try {
    const page = await browser.newPage();
    await page.goto(opts.jobUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
    pageTitle = await page.title();

    const mapping: Array<{ keys: string[]; value?: string }> = [
      { keys: ["name", "full name", "fullname", "your name"], value: opts.profile.fullName },
      { keys: ["email", "e-mail"], value: opts.profile.email },
      { keys: ["phone", "mobile", "tel"], value: opts.profile.phone },
      { keys: ["location", "city", "address"], value: opts.profile.location },
      { keys: ["linkedin"], value: opts.profile.linkedin },
      { keys: ["github", "portfolio", "website", "url"], value: opts.profile.website || opts.profile.github },
      {
        keys: ["cover", "message", "additional", "comment", "why"],
        value: opts.coverLetter || opts.profile.summary,
      },
    ];

    for (const field of mapping) {
      if (!field.value) continue;
      const ok = await page.evaluate(
        (keys, value) => {
          const inputs = Array.from(
            document.querySelectorAll("input, textarea")
          ) as Array<HTMLInputElement | HTMLTextAreaElement>;

          for (const el of inputs) {
            const type = (el.getAttribute("type") || "").toLowerCase();
            if (["hidden", "submit", "button", "checkbox", "radio", "file"].includes(type)) {
              continue;
            }
            const hay = [
              el.name,
              el.id,
              el.placeholder,
              el.getAttribute("aria-label"),
              el.getAttribute("autocomplete"),
            ]
              .filter(Boolean)
              .join(" ")
              .toLowerCase();

            if (!keys.some((k) => hay.includes(k))) continue;
            if (el.value && el.value.trim()) continue;

            el.focus();
            el.value = value;
            el.dispatchEvent(new Event("input", { bubbles: true }));
            el.dispatchEvent(new Event("change", { bubbles: true }));
            return true;
          }
          return false;
        },
        field.keys,
        field.value
      );
      if (ok) filled.push(field.keys[0]);
    }

    // Give SPA forms a moment, then screenshot current state
    await new Promise((r) => setTimeout(r, 1200));
    await page.screenshot({ path: screenshotPath, fullPage: true });

    // Keep browser open briefly so user can finish submit manually
    await new Promise((r) => setTimeout(r, 8000));
  } finally {
    await browser.close().catch(() => undefined);
  }

  return {
    screenshotPath,
    screenshotFile: shotName,
    pageTitle,
    filledFields: filled,
    message:
      "Apply assist opened the job page, filled matching fields when possible, and saved a screenshot. Submit manually in the browser if still open / reopen apply URL to finish.",
  };
}
