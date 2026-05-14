/**
 * 语言学习路由
 *
 * POST /api/language/generate  — 生成语言学习卡片
 * GET  /api/language/config    — 获取语言学习配置
 * POST /api/language/config    — 保存语言学习配置
 * GET  /api/language/status    — 获取生成状态
 */

import { Router } from "express";
import { authRequired } from "./auth.js";
import { generateLanguageCard, loadLangConfig, saveLangConfig } from "../services/language.js";

const router = Router();

let generating = false;
let langProgress = { step: 0, total: 3, message: "", done: false, error: null };

router.get("/config", authRequired, async (req, res) => {
  try {
    const config = await loadLangConfig();
    res.json(config);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/config", authRequired, async (req, res) => {
  try {
    const { language, level } = req.body;
    const config = await loadLangConfig();
    if (language) config.language = language;
    if (level) config.level = level;
    await saveLangConfig(config);
    res.json({ ok: true, config });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/status", authRequired, (req, res) => {
  res.json({ generating, progress: langProgress });
});

router.post("/generate", authRequired, async (req, res) => {
  if (generating) {
    return res.status(409).json({ error: "正在生成中，请稍候" });
  }

  const { language, level } = req.body;
  generating = true;
  langProgress = { step: 1, total: 3, message: "AI 生成词汇数据...", done: false, error: null };

  // 异步执行
  (async () => {
    try {
      langProgress = { step: 1, total: 3, message: "AI 生成词汇数据...", done: false, error: null };
      const result = await generateLanguageCard({ language, level });
      langProgress = { step: 3, total: 3, message: `生成完成！词汇: ${result.langData.word}`, done: true, error: null, result };
    } catch (err) {
      langProgress = { step: 0, total: 3, message: "", done: true, error: err.message };
    } finally {
      generating = false;
    }
  })();

  res.json({ ok: true, message: "开始生成语言学习卡片" });
});

export default router;
