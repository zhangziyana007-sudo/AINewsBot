/**
 * 本地预览服务器 — 在浏览器中预览生成的 HTML 模板
 *
 * 用法：
 *   node src/preview-server.js                  # 预览最新日期
 *   node src/preview-server.js 2026-05-08       # 预览指定日期
 */

import { createServer } from "node:http";
import { readFile, readdir } from "node:fs/promises";
import { resolve, dirname, extname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const OUTPUT_DIR = resolve(PROJECT_ROOT, "output");
const PORT = 3456;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".js": "text/javascript; charset=utf-8",
};

/**
 * 获取最新的输出日期目录
 */
async function getLatestDate(targetDate) {
  if (targetDate) return targetDate;
  const entries = await readdir(OUTPUT_DIR);
  const dates = entries.filter((e) => /^\d{4}-\d{2}-\d{2}$/.test(e)).sort();
  return dates[dates.length - 1];
}

/**
 * 生成索引页 HTML
 */
function buildIndexPage(date, files) {
  const htmlFiles = files.filter((f) => f.endsWith(".html")).sort();
  const pngFiles = files.filter((f) => f.endsWith(".png")).sort();

  const htmlLinks = htmlFiles
    .map((f) => `<li><a href="/${date}/${f}" target="_blank">${f}</a></li>`)
    .join("\n");

  const pngPreviews = pngFiles
    .map(
      (f) => `
      <div style="margin-bottom:24px">
        <p style="font-weight:bold;margin-bottom:8px">${f}</p>
        <img src="/${date}/${f}" style="width:360px;height:480px;object-fit:contain;border:1px solid #ddd;border-radius:8px">
      </div>`
    )
    .join("\n");

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <title>AI 日报预览 — ${date}</title>
  <style>
    body { font-family: -apple-system, sans-serif; max-width: 1200px; margin: 40px auto; padding: 0 20px; background: #f5f5f5; }
    h1 { color: #C41E3A; }
    h2 { margin-top: 32px; color: #333; }
    ul { list-style: none; padding: 0; }
    li { margin: 8px 0; }
    a { color: #1a73e8; text-decoration: none; font-size: 18px; }
    a:hover { text-decoration: underline; }
    .png-grid { display: flex; flex-wrap: wrap; gap: 24px; }
  </style>
</head>
<body>
  <h1>📰 AI HOT 日报预览</h1>
  <p>日期：<strong>${date}</strong> | 共 ${htmlFiles.length} 个 HTML + ${pngFiles.length} 张 PNG</p>

  <h2>🔗 HTML 模板（点击预览）</h2>
  <ul>${htmlLinks}</ul>

  <h2>🖼️ PNG 截图预览</h2>
  <div class="png-grid">${pngPreviews}</div>
</body>
</html>`;
}

async function main() {
  const targetDate = process.argv[2];
  const date = await getLatestDate(targetDate);

  if (!date) {
    console.error("❌ 没有找到输出目录，请先运行 npm start 生成日报");
    process.exit(1);
  }

  const dateDir = resolve(OUTPUT_DIR, date);

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${PORT}`);
    let pathname = decodeURIComponent(url.pathname);

    // 首页 → 索引
    if (pathname === "/") {
      const files = await readdir(dateDir);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(buildIndexPage(date, files));
      return;
    }

    // 静态文件：/{date}/filename 或 /templates/styles.css
    const filePath = resolve(OUTPUT_DIR, "..", pathname.slice(1));

    // 防止路径遍历
    if (!filePath.startsWith(PROJECT_ROOT)) {
      res.writeHead(403);
      res.end("Forbidden");
      return;
    }

    try {
      const content = await readFile(filePath);
      const ext = extname(filePath);
      res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
      res.end(content);
    } catch {
      res.writeHead(404);
      res.end("Not Found");
    }
  });

  server.listen(PORT, () => {
    console.log(`\n📰 AI 日报预览服务器已启动`);
    console.log(`   日期: ${date}`);
    console.log(`   地址: http://localhost:${PORT}`);
    console.log(`\n   按 Ctrl+C 停止\n`);
  });
}

main().catch(console.error);
