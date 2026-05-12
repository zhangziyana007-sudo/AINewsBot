/**
 * 模板管理路由
 *
 * GET    /api/templates              — 获取主题列表
 * POST   /api/templates/active       — 切换活跃主题
 * GET    /api/templates/:themeId/text — 获取主题文字配置
 * PUT    /api/templates/:themeId/text — 更新主题文字配置
 */

import { Router } from "express";
import { readFile, writeFile } from "node:fs/promises";
import { authRequired } from "./auth.js";
import { TEMPLATE_CONFIG, TEXT_CONFIG } from "../services/render.js";

const router = Router();

router.get("/", authRequired, async (req, res) => {
  try {
    const raw = await readFile(TEMPLATE_CONFIG, "utf-8");
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post("/active", authRequired, async (req, res) => {
  try {
    const raw = await readFile(TEMPLATE_CONFIG, "utf-8");
    const config = JSON.parse(raw);
    const { themeId } = req.body;
    if (!config.themes.some(t => t.id === themeId)) {
      return res.status(404).json({ error: "主题不存在" });
    }
    config.activeThemeId = themeId;
    await writeFile(TEMPLATE_CONFIG, JSON.stringify(config, null, 2) + "\n", "utf-8");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/:themeId/text", authRequired, async (req, res) => {
  try {
    const raw = await readFile(TEXT_CONFIG, "utf-8");
    const config = JSON.parse(raw);
    const text = config[req.params.themeId];
    if (!text) return res.status(404).json({ error: "该主题无自定义文字配置" });
    res.json(text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/:themeId/text", authRequired, async (req, res) => {
  try {
    let config = {};
    try {
      const raw = await readFile(TEXT_CONFIG, "utf-8");
      config = JSON.parse(raw);
    } catch { /* 文件不存在 */ }
    config[req.params.themeId] = req.body;
    await writeFile(TEXT_CONFIG, JSON.stringify(config, null, 2) + "\n", "utf-8");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
