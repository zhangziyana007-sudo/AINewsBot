/**
 * 历史浏览路由
 *
 * GET    /api/history       — 获取历史日报列表
 * GET    /api/images/:date  — 获取指定日期的图片列表
 * DELETE /api/history/:date — 删除指定日期的日报
 * DELETE /api/history       — 清空全部历史日报
 */

import { Router } from "express";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readdir, stat, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { authRequired } from "./auth.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, "../../output");

const router = Router();

router.get("/", authRequired, async (req, res) => {
  try {
    if (!existsSync(OUTPUT_DIR)) return res.json({ dates: [] });
    const entries = await readdir(OUTPUT_DIR, { withFileTypes: true });
    const dates = [];
    for (const entry of entries) {
      if (entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name)) {
        const dirPath = resolve(OUTPUT_DIR, entry.name);
        const files = await readdir(dirPath);
        const pngs = files.filter(f => f.endsWith(".png")).sort();
        if (pngs.length > 0) {
          const dirStat = await stat(dirPath);
          dates.push({
            date: entry.name,
            images: pngs.map(f => `/output/${entry.name}/${f}`),
            count: pngs.length,
            createdAt: dirStat.mtime.toISOString(),
          });
        }
      }
    }
    dates.sort((a, b) => b.date.localeCompare(a.date));
    res.json({ dates });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/images/:date", authRequired, async (req, res) => {
  const dateDir = resolve(OUTPUT_DIR, req.params.date);
  if (!existsSync(dateDir)) return res.status(404).json({ error: "该日期没有数据" });
  try {
    const files = await readdir(dateDir);
    const pngs = files.filter(f => f.endsWith(".png")).sort();
    res.json({
      date: req.params.date,
      images: pngs.map(f => ({ name: f, url: `/output/${req.params.date}/${f}` })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/:date", authRequired, async (req, res) => {
  const dateStr = req.params.date;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
    return res.status(400).json({ error: "日期格式无效" });
  }
  const dateDir = resolve(OUTPUT_DIR, dateStr);
  if (!existsSync(dateDir)) {
    return res.status(404).json({ error: "该日期没有数据" });
  }
  try {
    await rm(dateDir, { recursive: true, force: true });
    res.json({ ok: true, message: `已删除 ${dateStr} 的日报` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete("/", authRequired, async (req, res) => {
  try {
    if (!existsSync(OUTPUT_DIR)) return res.json({ ok: true, deleted: 0 });
    const entries = await readdir(OUTPUT_DIR, { withFileTypes: true });
    let deleted = 0;
    for (const entry of entries) {
      if (entry.isDirectory() && /^\d{4}-\d{2}-\d{2}$/.test(entry.name)) {
        await rm(resolve(OUTPUT_DIR, entry.name), { recursive: true, force: true });
        deleted++;
      }
    }
    res.json({ ok: true, deleted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
