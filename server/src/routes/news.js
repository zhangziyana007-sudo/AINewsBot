/**
 * 新闻获取路由
 *
 * POST /api/news/fetch — 触发新闻获取（RSS 抓取 + AI 摘要，支持缓存）
 * POST /api/news/fetch-ai — 直接用 AI 联网搜索（备用）
 * GET  /api/news/rss — 仅获取 RSS 原文（不做 AI 摘要）
 * GET  /api/news/cache — 查看缓存状态
 * POST /api/news/cache/clear — 清除缓存
 */

import { Router } from "express";
import { authRequired } from "./auth.js";
import { fetchDailyFromAI, summarizeRSSArticles } from "../services/ai.js";
import { fetchAllRSS } from "../services/rss.js";
import { fetchForDailyReport, fetchSelected, fetchDaily } from "../services/aihot.js";
import { getCache, setCache, clearCache, getCacheStats } from "../services/cache.js";

const router = Router();

// 获取新闻（核心 API —— 默认 aihot，支持降级到 RSS+AI / 纯AI搜索）
router.post("/fetch", authRequired, async (req, res) => {
  try {
    const { date, forceRefresh, mode } = req.body;
    const now = new Date();
    const dateStr = date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    // 检查缓存
    if (!forceRefresh) {
      const cached = getCache(dateStr);
      if (cached) {
        console.log(`   📦 使用缓存数据: ${dateStr}`);
        return res.json({ ok: true, data: cached, fromCache: true });
      }
    }

    let data;

    if (mode === "ai-search") {
      // 备用模式：直接用 AI 联网搜索
      data = await fetchDailyFromAI(dateStr);
    } else if (mode === "rss") {
      // RSS + AI 摘要模式
      console.log(`\n🚀 RSS 新闻获取流程启动 (${dateStr})`);
      const { articles, stats } = await fetchAllRSS();
      if (articles.length === 0) {
        console.log("   ⚠️ RSS 源无数据，降级为 AI 联网搜索");
        data = await fetchDailyFromAI(dateStr);
      } else {
        data = await summarizeRSSArticles(articles, dateStr);
        data._rssStats = stats;
      }
    } else {
      // 默认模式：aihot API
      try {
        data = await fetchForDailyReport(dateStr);
      } catch (err) {
        console.log(`   ⚠️ aihot 失败，降级为 RSS+AI: ${err.message}`);
        const { articles } = await fetchAllRSS();
        if (articles.length > 0) {
          data = await summarizeRSSArticles(articles, dateStr);
        } else {
          data = await fetchDailyFromAI(dateStr);
        }
      }
    }

    // 写入缓存
    setCache(dateStr, data);

    res.json({ ok: true, data, fromCache: false });
  } catch (err) {
    console.error(`   ❌ 新闻获取失败: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// 备用：直接 AI 联网搜索模式
router.post("/fetch-ai", authRequired, async (req, res) => {
  try {
    const { date } = req.body;
    const now = new Date();
    const dateStr = date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    const data = await fetchDailyFromAI(dateStr);
    setCache(dateStr, data);
    res.json({ ok: true, data, fromCache: false });
  } catch (err) {
    console.error(`   ❌ AI 搜索失败: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// 仅获取 RSS 原文（调试/预览用）
router.get("/rss", authRequired, async (req, res) => {
  try {
    const { articles, stats } = await fetchAllRSS();
    res.json({ ok: true, articles, stats });
  } catch (err) {
    console.error(`   ❌ RSS 抓取失败: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// 缓存状态
router.get("/cache", authRequired, (req, res) => {
  res.json(getCacheStats());
});

// 清除缓存
router.post("/cache/clear", authRequired, (req, res) => {
  const { date } = req.body;
  clearCache(date);
  res.json({ ok: true });
});

export default router;
