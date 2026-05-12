/**
 * AI 日报 — 本地客户端 Web 服务
 *
 * 职责：
 *   - macOS 风格 Web 控制面板
 *   - 模板管理 & 文字编辑（本地）
 *   - 调用后端 API 获取新闻数据
 *   - 本地渲染 HTML + Puppeteer 截图
 *   - 历史浏览 & 图片下载
 *   - 定时生成任务
 *
 * 启动：node src/server.js
 */

import express from "express";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { readdir, stat, readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";

import { fetchNews, getModels, updateModel, addModel, setActiveModel, testModel, testConnection, loadServerConfig, saveServerConfig } from "./api.js";
import { groupByCategory, formatDateCN } from "./fetch-daily.js";
import { renderAll } from "./render-template.js";
import { screenshotAll } from "./screenshot.js";
import { loadScheduleConfig, saveScheduleConfig, reloadScheduler, getSchedulerStatus } from "./scheduler.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const OUTPUT_DIR = resolve(PROJECT_ROOT, "output");
const PUBLIC_DIR = resolve(__dirname, "public");
const TEMPLATE_CONFIG = resolve(PROJECT_ROOT, "config/templates.json");
const TEXT_CONFIG = resolve(PROJECT_ROOT, "config/template-text.json");

const PORT = parseInt(process.env.CLIENT_PORT || "3456", 10);

// 简单本地认证（前端面板的密码保护）
const LOCAL_PASSWORD = process.env.LOCAL_PASSWORD || "ai2026";
const localSessions = new Set();

// 生成状态跟踪
let generating = false;
let generateProgress = { step: 0, total: 3, message: "", done: false, error: null };

const app = express();
app.use(express.json());

// 静态文件
app.use("/static", express.static(PUBLIC_DIR));
app.use("/output", express.static(OUTPUT_DIR));

// 本地认证中间件
function authRequired(req, res, next) {
  const token = req.headers["x-auth-token"] || req.query.token;
  if (token && localSessions.has(token)) return next();
  res.status(401).json({ error: "未授权，请先登录" });
}

// ====== 登录/登出 ======
app.post("/api/login", (req, res) => {
  const { password } = req.body;
  if (password === LOCAL_PASSWORD) {
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    localSessions.add(token);
    res.json({ ok: true, token });
  } else {
    res.status(403).json({ error: "密码错误" });
  }
});

app.post("/api/logout", authRequired, (req, res) => {
  const token = req.headers["x-auth-token"];
  localSessions.delete(token);
  res.json({ ok: true });
});

// ====== 模型配置 API（代理到后端）======
app.get("/api/models", authRequired, async (req, res) => {
  try {
    const data = await getModels();
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: `后端连接失败: ${err.message}` });
  }
});

app.put("/api/models/:id", authRequired, async (req, res) => {
  try {
    const data = await updateModel(req.params.id, req.body);
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.post("/api/models", authRequired, async (req, res) => {
  try {
    const data = await addModel(req.body);
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.post("/api/models/active", authRequired, async (req, res) => {
  try {
    const data = await setActiveModel(req.body.modelId);
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

app.post("/api/models/:id/test", authRequired, async (req, res) => {
  try {
    const data = await testModel(req.params.id);
    res.json(data);
  } catch (err) {
    res.status(502).json({ error: err.message });
  }
});

// ====== 服务器连接配置 ======
app.get("/api/server", authRequired, async (req, res) => {
  try {
    const config = await loadServerConfig();
    res.json({ baseUrl: config.baseUrl, hasPassword: !!config.password });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/server", authRequired, async (req, res) => {
  try {
    const { baseUrl, password } = req.body;
    const config = await loadServerConfig();
    if (baseUrl) config.baseUrl = String(baseUrl);
    if (password !== undefined) config.password = String(password);
    await saveServerConfig(config);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/server/test", authRequired, async (req, res) => {
  const result = await testConnection();
  res.json(result);
});

// ====== 模板管理 API（本地）======
app.get("/api/templates", authRequired, async (req, res) => {
  try {
    const raw = await readFile(TEMPLATE_CONFIG, "utf-8");
    res.json(JSON.parse(raw));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/templates/active", authRequired, async (req, res) => {
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

// 模板文字编辑 API
app.get("/api/templates/:themeId/text", authRequired, async (req, res) => {
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

app.put("/api/templates/:themeId/text", authRequired, async (req, res) => {
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

// ====== 生成 API ======
app.get("/api/status", authRequired, (req, res) => {
  res.json({ generating, progress: generateProgress });
});

app.post("/api/generate", authRequired, async (req, res) => {
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
    // Step 1: 从后端获取新闻数据
    generateProgress = { step: 1, total: 3, message: "正在从后端获取新闻数据...", done: false, error: null };
    const result = await fetchNews(dateArg, forceRefresh);
    const dailyData = result.data;

    if (result.fromCache) {
      console.log(`   📦 使用服务端缓存`);
    }

    const grouped = groupByCategory(dailyData);
    const dateInfo = formatDateCN(dailyData.date || dateArg);
    const totalItems = Object.values(grouped).reduce((s, c) => s + c.items.length, 0);

    if (totalItems === 0) {
      generateProgress = { step: 3, total: 3, message: "今日暂无数据", done: true, error: null };
      generating = false;
      return;
    }

    // Step 2: 本地渲染 HTML
    generateProgress = { step: 2, total: 3, message: `获取 ${totalItems} 条新闻，正在渲染模板...`, done: false, error: null };
    const outputDir = resolve(OUTPUT_DIR, dateInfo.iso);
    await rm(outputDir, { recursive: true, force: true });
    await mkdir(outputDir, { recursive: true });
    const htmlFiles = await renderAll(grouped, dateInfo, outputDir);

    // Step 3: 本地截图
    generateProgress = { step: 3, total: 3, message: "正在生成 PNG 图片...", done: false, error: null };
    await screenshotAll(htmlFiles, outputDir);

    generateProgress = { step: 3, total: 3, message: `生成完成！共 ${totalItems} 条新闻`, done: true, error: null, date: dateInfo.iso };
  } catch (err) {
    generateProgress = { step: 0, total: 3, message: "", done: true, error: err.message };
  } finally {
    generating = false;
  }
}

// ====== 定时任务 API ======
app.get("/api/schedule", authRequired, async (req, res) => {
  try {
    const status = await getSchedulerStatus();
    res.json(status);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/schedule", authRequired, async (req, res) => {
  try {
    const config = await loadScheduleConfig();
    const { enabled, cron: cronExpr } = req.body;
    if (enabled !== undefined) config.enabled = !!enabled;
    if (cronExpr !== undefined) config.cron = String(cronExpr);
    await saveScheduleConfig(config);
    await reloadScheduler();
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ====== 历史浏览 ======
app.get("/api/history", authRequired, async (req, res) => {
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

app.get("/api/images/:date", authRequired, async (req, res) => {
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

// 删除单个日期的历史日报
app.delete("/api/history/:date", authRequired, async (req, res) => {
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

// 清空全部历史日报
app.delete("/api/history", authRequired, async (req, res) => {
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

// 主页
app.get("/", (req, res) => {
  res.sendFile(resolve(PUBLIC_DIR, "index.html"));
});

export { app, PORT };
export default app;
