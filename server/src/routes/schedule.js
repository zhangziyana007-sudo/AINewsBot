/**
 * 定时任务路由
 *
 * GET /api/schedule — 获取定时任务状态
 * PUT /api/schedule — 更新定时任务配置
 */

import { Router } from "express";
import { authRequired } from "./auth.js";
import { getSchedulerStatus, loadScheduleConfig, saveScheduleConfig, reloadScheduler } from "../services/scheduler.js";

const router = Router();

router.get("/", authRequired, async (req, res) => {
  try {
    const status = await getSchedulerStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put("/", authRequired, async (req, res) => {
  try {
    const config = await loadScheduleConfig();
    const { enabled, cron: cronExpr, autoSaveDraft } = req.body;
    if (enabled !== undefined) config.enabled = !!enabled;
    if (cronExpr !== undefined) config.cron = String(cronExpr);
    if (autoSaveDraft !== undefined) config.autoSaveDraft = !!autoSaveDraft;
    await saveScheduleConfig(config);
    await reloadScheduler();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
