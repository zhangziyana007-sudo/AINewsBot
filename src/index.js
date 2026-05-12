/**
 * 小红书 AI 日报图文笔记 — 主入口
 *
 * 流程：拉取日报 → 渲染 HTML → 截图生成 PNG
 *
 * 用法：
 *   node src/index.js              # 生成最新日报
 *   node src/index.js 2026-05-08   # 生成指定日期日报
 */

import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { mkdir, rm } from "node:fs/promises";

import { groupByCategory, formatDateCN } from "./fetch-daily.js";
import { fetchDailyFromAI, getActiveModel } from "./fetch-ai.js";
import { renderAll } from "./render-template.js";
import { screenshotAll } from "./screenshot.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");

/**
 * 解析命令行参数
 * 支持: node src/index.js [日期] [--source=deepseek|aihot]
 */
function parseArgs() {
  const args = process.argv.slice(2);
  let dateArg = undefined;

  for (const arg of args) {
    if (/^\d{4}-\d{2}-\d{2}$/.test(arg)) {
      dateArg = arg;
    }
  }

  return { dateArg };
}

async function main() {
  const { dateArg } = parseArgs();

  console.log("🚀 小红书 AI 日报图文生成器");
  console.log("═".repeat(40));

  // 1. 通过 AI 大模型拉取日报数据
  const model = await getActiveModel();
  console.log(`\n⏳ [1/3] 正在通过 ${model.name} (${model.model}) 拉取日报数据...`);
  let dailyData;
  try {
    dailyData = await fetchDailyFromAI(dateArg);
  } catch (err) {
    console.error(`❌ 数据拉取失败: ${err.message}`);
    process.exit(1);
  }

  const grouped = groupByCategory(dailyData);
  const dateInfo = formatDateCN(dailyData.date || dateArg);

  const totalItems = Object.values(grouped).reduce(
    (sum, cat) => sum + cat.items.length,
    0
  );
  console.log(`✅ 获取成功! 共 ${totalItems} 条新闻`);
  for (const [key, cat] of Object.entries(grouped)) {
    if (cat.items.length > 0) {
      console.log(`   ${cat.emoji} ${cat.label}: ${cat.items.length} 条`);
    }
  }

  if (totalItems === 0) {
    console.log("\n⚠️  今日暂无数据，跳过生成。");
    process.exit(0);
  }

  // 2. 渲染 HTML 模板
  console.log("\n⏳ [2/3] 正在渲染 HTML 模板...");
  const outputDir = resolve(PROJECT_ROOT, "output", dateInfo.iso);
  // 清理旧文件，避免残留
  await rm(outputDir, { recursive: true, force: true });
  await mkdir(outputDir, { recursive: true });

  const htmlFiles = await renderAll(grouped, dateInfo, outputDir);
  console.log(`✅ 生成 ${htmlFiles.length} 个 HTML 文件`);

  // 3. Puppeteer 截图
  console.log("\n⏳ [3/3] 正在截图生成 PNG 图片 (1080×1440 @2x)...");
  const pngFiles = await screenshotAll(htmlFiles, outputDir);
  console.log(`✅ 生成 ${pngFiles.length} 张 PNG 图片`);

  // 完成
  console.log("\n═".repeat(40));
  console.log(`🎉 完成! 图片输出目录:`);
  console.log(`   ${outputDir}/`);
  pngFiles.forEach((f, i) => {
    const name = f.split("/").pop();
    console.log(`   ${i + 1}. ${name}`);
  });
  console.log(`\n📱 将这些图片按顺序上传到小红书即可发布!`);
}

main().catch((err) => {
  console.error("💥 未知错误:", err);
  process.exit(1);
});
