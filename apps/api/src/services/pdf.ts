import fs from "fs/promises";
import path from "path";
import puppeteer from "puppeteer";
import { config } from "../config.js";

export async function htmlToPdf(html: string, filename: string) {
  await fs.mkdir(config.storageDir, { recursive: true });
  const pdfPath = path.join(config.storageDir, filename);

  const wrapped = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <style>
    @page { margin: 0.6in; }
    body { font-family: Arial, Helvetica, sans-serif; font-size: 11pt; color: #111; line-height: 1.35; }
    h1 { font-size: 20pt; margin: 0 0 4px; }
    h2 { font-size: 13pt; margin: 16px 0 6px; border-bottom: 1px solid #ccc; padding-bottom: 2px; }
    p, li { margin: 0 0 4px; }
    ul { margin: 0 0 8px; padding-left: 18px; }
  </style>
</head>
<body>${html.includes("<body") ? extractBody(html) : html}</body>
</html>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(wrapped, { waitUntil: "networkidle0" });
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      margin: { top: "0.5in", bottom: "0.5in", left: "0.55in", right: "0.55in" },
    });
  } finally {
    await browser.close();
  }

  return pdfPath;
}

function extractBody(html: string) {
  const match = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  return match ? match[1] : html;
}
