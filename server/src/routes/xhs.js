/**
 * 小红书发布路由（v2）
 *
 * POST /api/xhs/login             — 启动扫码登录
 * GET  /api/xhs/login/status      — 检查登录状态
 * POST /api/xhs/login/sms/send    — 短信登录-发送验证码
 * POST /api/xhs/login/sms/verify  — 短信登录-验证码登录
 * POST /api/xhs/login/cookies     — 导入 Cookie JSON
 * POST /api/xhs/publish           — 发布/保存草稿
 * GET  /api/xhs/status            — 获取登录状态
 * POST /api/xhs/close             — 关闭浏览器
 */

import { Router } from "express";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import { authRequired } from "./auth.js";
import {
  startLogin,
  checkLoginStatus,
  publishToXHS,
  generateXHSCaption,
  getCookieStatus,
  closeBrowser,
  startSmsLogin,
  verifySmsCode,
  importCookies,
} from "../services/xhs.js";
import { getCache } from "../services/cache.js";
import { formatDateCN } from "../services/daily.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, "../../output");

const router = Router();

// 定时发布任务存储
const scheduledTasks = new Map(); // id -> { timer, date, title, postTime, status }


// 启动登录（返回二维码截图）
router.post("/login", authRequired, async (req, res) => {
  try {
    const result = await startLogin();
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error(`   ❌ 小红书登录启动失败: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// 检查登录状态
router.get("/login/status", authRequired, async (req, res) => {
  try {
    const result = await checkLoginStatus();
    res.json({ ok: true, ...result });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 短信登录 — 发送验证码
router.post("/login/sms/send", authRequired, async (req, res) => {
  try {
    const { phone } = req.body;
    const result = await startSmsLogin(phone);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error(`   ❌ 发送验证码失败: ${err.message}`);
    res.status(500).json({ error: err.message, screenshot: err.screenshot });
  }
});

// 短信登录 — 验证码登录
router.post("/login/sms/verify", authRequired, async (req, res) => {
  try {
    const { code } = req.body;
    const result = await verifySmsCode(code);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error(`   ❌ 验证码登录失败: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// 导入 Cookie JSON
router.post("/login/cookies", authRequired, async (req, res) => {
  try {
    const { cookies } = req.body;
    if (!cookies) {
      return res.status(400).json({ error: "请提供 cookies 数据" });
    }
    const result = await importCookies(cookies);
    res.json({ ok: true, ...result });
  } catch (err) {
    console.error(`   ❌ Cookie 导入失败: ${err.message}`);
    res.status(500).json({ error: err.message });
  }
});

// 获取 Cookie 状态
router.get("/status", authRequired, async (req, res) => {
  try {
    const status = await getCookieStatus();
    res.json({ ok: true, ...status });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 发布到小红书
router.post("/publish", authRequired, async (req, res) => {
  try {
    const { date, draft = true, customTitle, customContent, customTags, postTime } = req.body;

    const now = new Date();
    const dateStr = date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

    // 获取日报图片路径
    const { readdirSync } = await import("node:fs");
    const outputDir = resolve(OUTPUT_DIR, dateStr);

    let pngFiles;
    try {
      pngFiles = readdirSync(outputDir)
        .filter((f) => f.endsWith(".png"))
        .sort()
        .map((f) => resolve(outputDir, f));
    } catch {
      return res.status(400).json({ error: `未找到 ${dateStr} 的日报图片，请先生成日报` });
    }

    if (pngFiles.length === 0) {
      return res.status(400).json({ error: "日报图片为空" });
    }

    // 小红书限制每篇最多 18 张图片
    if (pngFiles.length > 18) {
      pngFiles.length = 18;
    }

    // 如果有定时发布时间且不是草稿，则延迟执行
    if (postTime && !draft) {
      const targetTime = new Date(postTime).getTime();
      const now = Date.now();
      const delay = targetTime - now;
      if (delay < 60000) {
        return res.status(400).json({ error: "定时时间必须至少在1分钟之后" });
      }
      const taskId = `xhs_${Date.now()}`;
      const timer = setTimeout(async () => {
        try {
          console.log(`\n⏰ 定时发布触发: ${taskId}`);
          const dateInfo2 = formatDateCN(dateStr);
          const cached2 = getCache(dateStr);
          const items2 = cached2?.items || cached2?.sections?.[0]?.items || [];
          let t, c, tg;
          if (customTitle) { t = customTitle; c = customContent || ""; tg = customTags || ["AI日报", "人工智能"]; }
          else { const cap = generateXHSCaption(items2, dateInfo2); t = cap.title; c = cap.content; tg = cap.tags; }
          const result = await publishToXHS({ imagePaths: pngFiles, title: t, content: c, tags: tg, draft: false });
          scheduledTasks.get(taskId).status = "done";
          scheduledTasks.get(taskId).result = result;
          console.log(`   ✅ 定时发布完成: ${t}`);
        } catch (err) {
          scheduledTasks.get(taskId).status = "failed";
          scheduledTasks.get(taskId).error = err.message;
          console.error(`   ❌ 定时发布失败: ${err.message}`);
        }
      }, delay);
      scheduledTasks.set(taskId, {
        timer, date: dateStr, title: customTitle || "AI日报",
        postTime, status: "waiting", imageCount: pngFiles.length,
      });
      const targetDate = new Date(postTime);
      console.log(`\n⏰ 已设置定时发布: ${taskId}`);
      console.log(`   目标时间: ${targetDate.toLocaleString("zh-CN")}`);
      console.log(`   延迟: ${Math.round(delay / 60000)} 分钟`);
      return res.json({
        ok: true, scheduled: true, taskId,
        postTime, delayMinutes: Math.round(delay / 60000),
        message: `已设置定时发布，将在 ${targetDate.toLocaleString("zh-CN")} 自动发布`,
      });
    }

    // 生成文案
    const dateInfo = formatDateCN(dateStr);
    const cached = getCache(dateStr);
    const items = cached?.items || cached?.sections?.[0]?.items || [];

    let title, content, tags;
    if (customTitle) {
      title = customTitle;
      content = customContent || "";
      tags = customTags || ["AI日报", "人工智能"];
    } else {
      const caption = generateXHSCaption(items, dateInfo);
      title = caption.title;
      content = caption.content;
      tags = caption.tags;
    }

    console.log(`\n📱 小红书发布 (${dateStr})`);
    console.log(`   标题: ${title}`);
    console.log(`   图片: ${pngFiles.length} 张`);
    console.log(`   模式: ${draft ? "草稿" : "发布"}`);

    const result = await publishToXHS({
      imagePaths: pngFiles,
      title,
      content,
      tags,
      draft,
    });

    res.json({ ok: true, ...result, title, imageCount: pngFiles.length });
  } catch (err) {
    console.error(`   ❌ 小红书发布失败: ${err.message}`);
    res.status(500).json({
      error: err.message,
      screenshot: err.screenshot || null,
    });
  }
});

// 查询定时任务
router.get("/scheduled", authRequired, async (req, res) => {
  const tasks = [];
  for (const [id, t] of scheduledTasks) {
    tasks.push({ id, date: t.date, title: t.title, postTime: t.postTime, status: t.status, imageCount: t.imageCount });
  }
  res.json({ ok: true, tasks });
});

// 取消定时任务
router.delete("/scheduled/:id", authRequired, async (req, res) => {
  const task = scheduledTasks.get(req.params.id);
  if (!task) return res.status(404).json({ error: "任务不存在" });
  if (task.status === "waiting") {
    clearTimeout(task.timer);
    task.status = "cancelled";
  }
  res.json({ ok: true, status: task.status });
});

// 关闭浏览器（清理资源）
router.post("/close", authRequired, async (req, res) => {
  await closeBrowser();
  res.json({ ok: true, message: "浏览器已关闭" });
});

export default router;
