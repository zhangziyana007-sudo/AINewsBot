/**
 * 生成路由
 *
 * POST /api/generate — 触发日报生成（获取新闻+渲染+截图）
 * GET  /api/status   — 获取当前生成进度
 */

import { Router } from "express";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { rm, mkdir } from "node:fs/promises";

import { authRequired } from "./auth.js";
import { fetchDailyFromAI, summarizeRSSArticles } from "../services/ai.js";
import { fetchAllRSS } from "../services/rss.js";
import { fetchForDailyReport } from "../services/aihot.js";
import { getCache, setCache } from "../services/cache.js";
import { groupByCategory, formatDateCN } from "../services/daily.js";
import { renderAll } from "../services/render.js";
import { screenshotAll } from "../services/screenshot.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, "../../output");

let generating = false;
let generateProgress = { step: 0, total: 3, message: "", done: false, error: null };

const router = Router();

router.get("/status", authRequired, (req, res) => {
  res.json({ generating, progress: generateProgress });
});

router.post("/generate", authRequired, async (req, res) => {
  if (generating) {
    return res.status(409).json({ error: "正在生成中，请稍候" });
  }
  const { date, forceRefresh } = req.body;
  generating = true;
  generateProgress = { step: 0, total: 3, message: "准备中...", done: false, error: null };
  runGenerate(date, forceRefresh).catch(() => {});
  res.json({ ok: true, message: "开始生成" });
});

async function runGenerate(dateArg, forceRefresh) {
  try {
    // Step 1: 获取新闻数据
    generateProgress = { step: 1, total: 3, message: "正在获取新闻数据...", done: false, error: null };

    const now = new Date();
    const dateStr = dateArg || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    let dailyData;
    if (!forceRefresh) {
      const cached = getCache(dateStr);
      if (cached) {
        console.log(`   📦 使用缓存数据: ${dateStr}`);
        dailyData = cached;
      }
    }

    if (!dailyData) {
      // 默认使用 aihot API
      console.log(`\n🚀 新闻获取流程启动 (${dateStr})`);
      try {
        dailyData = await fetchForDailyReport(dateStr);
      } catch (err) {
        console.log(`   ⚠️ aihot 失败，降级为 RSS+AI: ${err.message}`);
        const { articles } = await fetchAllRSS();
        if (articles.length > 0) {
          dailyData = await summarizeRSSArticles(articles, dateStr);
        } else {
          console.log("   ⚠️ RSS 也无数据，降级为 AI 联网搜索");
          dailyData = await fetchDailyFromAI(dateStr);
        }
      }
      setCache(dateStr, dailyData);
    }

    const grouped = groupByCategory(dailyData);
    const dateInfo = formatDateCN(dailyData.date || dateArg);
    const totalItems = Object.values(grouped).reduce((s, c) => s + c.items.length, 0);

    if (totalItems === 0) {
      generateProgress = { step: 3, total: 3, message: "今日暂无数据", done: true, error: null };
      generating = false;
      return;
    }

    // Step 2: 渲染 HTML
    generateProgress = { step: 2, total: 3, message: `获取 ${totalItems} 条新闻，正在渲染模板...`, done: false, error: null };
    const outputDir = resolve(OUTPUT_DIR, dateInfo.iso);
    await rm(outputDir, { recursive: true, force: true });
    await mkdir(outputDir, { recursive: true });
    const htmlFiles = await renderAll(grouped, dateInfo, outputDir);

    // Step 3: 截图
    generateProgress = { step: 3, total: 3, message: "正在生成 PNG 图片...", done: false, error: null };
    await screenshotAll(htmlFiles, outputDir);

    generateProgress = { step: 3, total: 3, message: `生成完成！共 ${totalItems} 条新闻`, done: true, error: null, date: dateInfo.iso };
  } catch (err) {
    generateProgress = { step: 0, total: 3, message: "", done: true, error: err.message };
  } finally {
    generating = false;
  }
}

// 导出 runGenerate 供定时任务使用
export { runGenerate };
export default router;
