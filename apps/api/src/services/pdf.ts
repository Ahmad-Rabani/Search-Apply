import fs from "fs/promises";
import path from "path";
import puppeteer from "puppeteer";
import { config } from "../config.js";

export async function htmlToPdf(html: string, filename: string) {
  await fs.mkdir(config.storageDir, { recursive: true });
  const pdfPath = path.join(config.storageDir, filename);

  const documentHtml = html.includes("<html")
    ? html
    : `<!DOCTYPE html><html><head><meta charset="utf-8" /></head><body>${html}</body></html>`;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setContent(documentHtml, { waitUntil: "networkidle0", timeout: 60000 });
    await page.emulateMediaType("screen");
    await page.pdf({
      path: pdfPath,
      format: "A4",
      printBackground: true,
      preferCSSPageSize: false,
      margin: { top: "0.45in", bottom: "0.45in", left: "0.5in", right: "0.5in" },
    });
  } finally {
    await browser.close();
  }

  return pdfPath;
}
