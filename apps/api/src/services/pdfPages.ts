import puppeteer from "puppeteer";

/**
 * Rasterize a PDF buffer into PNG page screenshots (for vision design cloning).
 * Returns up to `maxPages` images.
 */
export async function pdfBufferToPngPages(
  pdfBuffer: Buffer,
  maxPages = 2
): Promise<Buffer[]> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({
      width: 850,
      height: 1100,
      deviceScaleFactor: 2,
    });

    const b64 = pdfBuffer.toString("base64");
    await page.goto(`data:application/pdf;base64,${b64}`, {
      waitUntil: "load",
      timeout: 60000,
    });
    await new Promise((r) => setTimeout(r, 1200));

    // Single tall capture of the viewer (covers first pages for most CVs)
    const full = await page.screenshot({
      type: "png",
      fullPage: true,
      encoding: "binary",
    });
    const shots: Buffer[] = [Buffer.from(full)];

    // Try paging with PageDown for extra pages if needed
    for (let i = 1; i < maxPages; i += 1) {
      await page.keyboard.press("PageDown");
      await new Promise((r) => setTimeout(r, 400));
      const shot = await page.screenshot({
        type: "png",
        encoding: "binary",
      });
      shots.push(Buffer.from(shot));
    }

    return shots.slice(0, maxPages);
  } finally {
    await browser.close();
  }
}
