/**
 * 新闻获取路由
 *
 * POST /api/news/fetch — 触发 AI 获取新闻（支持缓存）
 * GET  /api/news/cache — 查看缓存状态
 * POST /api/news/cache/clear — 清除缓存
 */

import { Router } from "express";
import { authRequired } from "./auth.js";
import { fetchDailyFromAI } from "../services/ai.js";
import { getCache, setCache, clearCache, getCacheStats } from "../services/cache.js";

const router = Router();

// 获取新闻（核心 API）
router.post("/fetch", authRequired, async (req, res) => {
  try {
    const { date, forceRefresh } = req.body;
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

    // 调用 AI 获取
    const data = await fetchDailyFromAI(dateStr);

    // 写入缓存
    setCache(dateStr, data);

    res.json({ ok: true, data, fromCache: false });
  } catch (err) {
    console.error(`   ❌ 新闻获取失败: ${err.message}`);
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
