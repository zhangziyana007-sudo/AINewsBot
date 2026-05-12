/**
 * AI 日报 Web 控制台 — Express 服务器
 *
 * 功能：
 *   - macOS 风格 Web UI
 *   - 日报生成 API（支持 aihot / DeepSeek）
 *   - 图片预览与下载
 *   - 历史日报浏览
 *   - 简单密码认证
 *
 * 启动：node src/server.js
 */

import express from "express";
import { resolve, dirname, basename } from "node:path";
import { fileURLToPath } from "node:url";
import { readdir, stat, readFile, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";

import { groupByCategory, formatDateCN } from "./fetch-daily.js";
import { fetchDailyFromAI, loadModelConfig, saveModelConfig } from "./fetch-ai.js";
import { renderAll } from "./render-template.js";
import { screenshotAll } from "./screenshot.js";
import { mkdir, rm } from "node:fs/promises";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, "..");
const OUTPUT_DIR = resolve(PROJECT_ROOT, "output");
const PUBLIC_DIR = resolve(__dirname, "public");

// 简单密码 — 可通过环境变量设置
const PASSWORD = process.env.AIBOT_PASSWORD || "ai2026";
const PORT = parseInt(process.env.AIBOT_PORT || "3456", 10);

// 活跃的 session token（简单的内存 Set）
const activeSessions = new Set();

// 生成状态跟踪
let generating = false;
let generateProgress = { step: 0, total: 3, message: "", done: false, error: null };

const app = express();
app.use(express.json());

// ====== 静态文件 ======
app.use("/static", express.static(PUBLIC_DIR));
app.use("/output", express.static(OUTPUT_DIR));

// ====== 认证中间件 ======
function authRequired(req, res, next) {
  const token = req.headers["x-auth-token"] || req.query.token;
  if (token && activeSessions.has(token)) {
    return next();
  }
  res.status(401).json({ error: "未授权，请先登录" });
}

// ====== API 路由 ======

// 登录
app.post("/api/login", (req, res) => {
  const { password } = req.body;
  if (password === PASSWORD) {
    const token = Math.random().toString(36).slice(2) + Date.now().toString(36);
    activeSessions.add(token);
    res.json({ ok: true, token });
  } else {
    res.status(403).json({ error: "密码错误" });
  }
});

// 登出
app.post("/api/logout", authRequired, (req, res) => {
  const token = req.headers["x-auth-token"];
  activeSessions.delete(token);
  res.json({ ok: true });
});

// ====== 模型配置 API ======
app.get("/api/models", authRequired, async (req, res) => {
  try {
    const config = await loadModelConfig();
    // 不返回完整 apiKey，只返回是否已配置
    const safe = {
      ...config,
      models: config.models.map(m => ({
        ...m,
        apiKey: m.apiKey ? "sk-****" + m.apiKey.slice(-4) : "",
        hasKey: !!m.apiKey,
      })),
    };
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/models/:id", authRequired, async (req, res) => {
  try {
    const config = await loadModelConfig();
    const idx = config.models.findIndex(m => m.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "模型不存在" });

    const { name, baseUrl, model, apiKey, enabled } = req.body;
    if (name !== undefined) config.models[idx].name = String(name);
    if (baseUrl !== undefined) config.models[idx].baseUrl = String(baseUrl);
    if (model !== undefined) config.models[idx].model = String(model);
    if (apiKey !== undefined) config.models[idx].apiKey = String(apiKey);
    if (enabled !== undefined) config.models[idx].enabled = !!enabled;

    await saveModelConfig(config);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/models", authRequired, async (req, res) => {
  try {
    const config = await loadModelConfig();
    const { id, name, baseUrl, model, apiKey } = req.body;
    if (!id || !name || !baseUrl || !model) {
      return res.status(400).json({ error: "缺少必填字段" });
    }
    if (config.models.some(m => m.id === id)) {
      return res.status(409).json({ error: "模型 ID 已存在" });
    }
    config.models.push({
      id: String(id),
      name: String(name),
      baseUrl: String(baseUrl),
      model: String(model),
      apiKey: String(apiKey || ""),
      enabled: true,
    });
    await saveModelConfig(config);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/models/active", authRequired, async (req, res) => {
  try {
    const config = await loadModelConfig();
    const { modelId } = req.body;
    if (!config.models.some(m => m.id === modelId)) {
      return res.status(404).json({ error: "模型不存在" });
    }
    config.activeModelId = modelId;
    await saveModelConfig(config);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 测试模型连接
app.post("/api/models/:id/test", authRequired, async (req, res) => {
  try {
    const config = await loadModelConfig();
    const model = config.models.find(m => m.id === req.params.id);
    if (!model) return res.status(404).json({ error: "模型不存在" });

    if (!model.apiKey) {
      return res.json({ ok: false, message: "未配置 API Key" });
    }

    const url = `${model.baseUrl.replace(/\/$/, "")}/v1/chat/completions`;
    const startTime = Date.now();
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${model.apiKey}`,
      },
      body: JSON.stringify({
        model: model.model,
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 5,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const elapsed = Date.now() - startTime;

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      return res.json({ ok: false, message: `HTTP ${resp.status}: ${body.slice(0, 200)}`, elapsed });
    }

    const data = await resp.json();
    const reply = data.choices?.[0]?.message?.content || "";
    res.json({ ok: true, message: `连接成功（${elapsed}ms）`, reply: reply.slice(0, 50), elapsed });
  } catch (err) {
    const msg = err.name === "TimeoutError" ? "连接超时（15秒）" : err.message;
    res.json({ ok: false, message: msg });
  }
});

// ====== 模板管理 API ======
const TEMPLATE_CONFIG = resolve(PROJECT_ROOT, "config/templates.json");

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

// ====== 模板文字编辑 API ======
const TEXT_CONFIG = resolve(PROJECT_ROOT, "config/template-text.json");

// 获取指定主题的文字配置
app.get("/api/templates/:themeId/text", authRequired, async (req, res) => {
  try {
    const raw = await readFile(TEXT_CONFIG, "utf-8");
    const config = JSON.parse(raw);
    const text = config[req.params.themeId];
    if (!text) {
      return res.status(404).json({ error: "该主题无自定义文字配置" });
    }
    res.json(text);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 保存指定主题的文字配置
app.put("/api/templates/:themeId/text", authRequired, async (req, res) => {
  try {
    let config = {};
    try {
      const raw = await readFile(TEXT_CONFIG, "utf-8");
      config = JSON.parse(raw);
    } catch { /* 文件不存在，使用空对象 */ }

    config[req.params.themeId] = req.body;
    await writeFile(TEXT_CONFIG, JSON.stringify(config, null, 2) + "\n", "utf-8");
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 获取生成状态
app.get("/api/status", authRequired, (req, res) => {
  res.json({ generating, progress: generateProgress });
});

// 触发生成
app.post("/api/generate", authRequired, async (req, res) => {
  if (generating) {
    return res.status(409).json({ error: "正在生成中，请稍候" });
  }

  const { date } = req.body;

  generating = true;
  generateProgress = { step: 0, total: 3, message: "准备中...", done: false, error: null };

  // 异步执行生成流程
  runGenerate(date).catch(() => {});

  res.json({ ok: true, message: "开始生成" });
});

// 生成流程
async function runGenerate(dateArg) {
  try {
    // Step 1: 通过 AI 大模型拉取数据
    generateProgress = { step: 1, total: 3, message: "正在通过 AI 获取新闻数据...", done: false, error: null };
    const dailyData = await fetchDailyFromAI(dateArg);

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

// 获取历史日报列表
app.get("/api/history", authRequired, async (req, res) => {
  try {
    if (!existsSync(OUTPUT_DIR)) {
      return res.json({ dates: [] });
    }
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

// 获取指定日期的图片列表
app.get("/api/images/:date", authRequired, async (req, res) => {
  const dateDir = resolve(OUTPUT_DIR, req.params.date);
  if (!existsSync(dateDir)) {
    return res.status(404).json({ error: "该日期没有数据" });
  }
  try {
    const files = await readdir(dateDir);
    const pngs = files.filter(f => f.endsWith(".png")).sort();
    res.json({
      date: req.params.date,
      images: pngs.map(f => ({
        name: f,
        url: `/output/${req.params.date}/${f}`,
      })),
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 主页 — 返回 HTML
app.get("/", (req, res) => {
  res.sendFile(resolve(PUBLIC_DIR, "index.html"));
});

// 启动服务器
app.listen(PORT, () => {
  console.log(`\n🍎 AI 日报 Web 控制台`);
  console.log(`${"─".repeat(40)}`);
  console.log(`   地址: http://localhost:${PORT}`);
  console.log(`   密码: ${PASSWORD}`);
  console.log(`${"─".repeat(40)}`);
  console.log(`\n按 Ctrl+C 停止服务器\n`);
});
