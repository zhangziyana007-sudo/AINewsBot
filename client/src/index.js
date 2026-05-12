/**
 * AI 日报 — 本地客户端入口
 *
 * 启动 Web 控制面板 + 定时任务调度器
 */

import { app, PORT } from "./server.js";
import { startScheduler } from "./scheduler.js";
import { fetchNews } from "./api.js";
import { groupByCategory, formatDateCN } from "./fetch-daily.js";
import { renderAll } from "./render-template.js";
import { screenshotAll } from "./screenshot.js";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, rm } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, "../output");

/**
 * 定时生成回调（由调度器调用）
 */
async function scheduledGenerate() {
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  console.log(`   📡 定时生成: ${dateStr}`);

  const result = await fetchNews(dateStr);
  const dailyData = result.data;
  const grouped = groupByCategory(dailyData);
  const dateInfo = formatDateCN(dailyData.date || dateStr);
  const totalItems = Object.values(grouped).reduce((s, c) => s + c.items.length, 0);

  if (totalItems === 0) {
    console.log("   ⚠️ 今日暂无数据");
    return;
  }

  const outputDir = resolve(OUTPUT_DIR, dateInfo.iso);
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const htmlFiles = await renderAll(grouped, dateInfo, outputDir);
  await screenshotAll(htmlFiles, outputDir);

  console.log(`   ✅ 定时生成完成: ${totalItems} 条新闻`);
}

// 启动 Web 服务
app.listen(PORT, () => {
  console.log(`\n🍎 AI 日报 本地客户端`);
  console.log(`${"─".repeat(40)}`);
  console.log(`   控制面板: http://localhost:${PORT}`);
  console.log(`${"─".repeat(40)}`);
});

// 启动定时任务
startScheduler(scheduledGenerate).catch(err => {
  console.error(`   定时任务启动失败: ${err.message}`);
});

console.log(`\n按 Ctrl+C 停止\n`);
