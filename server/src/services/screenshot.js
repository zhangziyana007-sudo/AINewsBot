/**
 * Puppeteer 截图 — 将 HTML 模板截图为 1080×1440 PNG
 */

import puppeteer from "puppeteer";
import { resolve, basename } from "node:path";

export async function screenshotHTML(htmlPath, outputPath, opts = {}) {
  const { width = 1080, height = 1440, deviceScaleFactor = 2 } = opts;

  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width, height, deviceScaleFactor });
    await page.goto(`file://${htmlPath}`, {
      waitUntil: "networkidle0",
      timeout: 15000,
    });
    await page.screenshot({
      path: outputPath,
      type: "png",
      clip: { x: 0, y: 0, width, height },
    });
  } finally {
    await browser.close();
  }
}

export async function screenshotAll(htmlFiles, outputDir) {
  const pngFiles = [];

  const browser = await puppeteer.launch({
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    headless: "new",
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  try {
    for (const htmlPath of htmlFiles) {
      const name = basename(htmlPath, ".html") + ".png";
      const pngPath = resolve(outputDir, name);

      const page = await browser.newPage();
      await page.setViewport({
        width: 1080,
        height: 1440,
        deviceScaleFactor: 2,
      });

      await page.goto(`file://${htmlPath}`, {
        waitUntil: "domcontentloaded",
        timeout: 30000,
      });

      await new Promise((r) => setTimeout(r, 200));

      const cardElement = await page.$(".card");
      if (cardElement) {
        await cardElement.screenshot({ path: pngPath, type: "png" });
      } else {
        await page.screenshot({
          path: pngPath,
          type: "png",
          clip: { x: 0, y: 0, width: 1080, height: 1440 },
        });
      }

      await page.close();
      pngFiles.push(pngPath);
    }
  } finally {
    await browser.close();
  }

  return pngFiles;
}
