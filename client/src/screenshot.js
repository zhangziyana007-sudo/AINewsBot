/**
 * Puppeteer 截图 — 将 HTML 模板截图为 1080×1440 PNG
 */

import puppeteer from "puppeteer";
import { resolve, dirname, basename } from "node:path";

/**
 * 将单个 HTML 文件截图为 PNG
 * @param {string} htmlPath - HTML 文件绝对路径
 * @param {string} outputPath - 输出 PNG 文件路径
 * @param {object} [opts]
 * @param {number} [opts.width=1080]
 * @param {number} [opts.height=1440]
 * @param {number} [opts.deviceScaleFactor=2] - 2x 高清
 */
export async function screenshotHTML(htmlPath, outputPath, opts = {}) {
  const { width = 1080, height = 1440, deviceScaleFactor = 2 } = opts;

  const browser = await puppeteer.launch({
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

/**
 * 批量截图多个 HTML 文件
 * @param {string[]} htmlFiles - HTML 文件路径列表
 * @param {string} outputDir - PNG 输出目录
 * @returns {string[]} 生成的 PNG 文件路径列表
 */
export async function screenshotAll(htmlFiles, outputDir) {
  const pngFiles = [];

  // 共享一个 browser 实例以提升性能
  const browser = await puppeteer.launch({
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

      // 等待渲染完成
      await new Promise((r) => setTimeout(r, 200));

      // 对 .card 元素截图，避免全页面截图的平铺问题
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
