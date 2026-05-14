/**
 * AI 日报 — 后端 API 服务（全功能版）
 *
 * 职责：
 *   - AI 新闻获取（封装各 AI 模型 API 调用）
 *   - 新闻缓存（同天重复请求走缓存）
 *   - 模型配置管理（API Key 安全存储在服务端）
 *   - 用户认证（JWT）
 *   - 模板渲染 & Puppeteer 截图
 *   - 定时生成任务
 *   - 历史日报管理
 *   - 模板主题管理
 *
 * 启动：node src/index.js
 * 环境变量见 .env.example
 */

import express from "express";
import cors from "cors";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

import authRouter from "./routes/auth.js";
import newsRouter from "./routes/news.js";
import modelsRouter from "./routes/models.js";
import generateRouter, { runGenerate } from "./routes/generate.js";
import templatesRouter from "./routes/templates.js";
import scheduleRouter from "./routes/schedule.js";
import historyRouter from "./routes/history.js";
import xhsRouter from "./routes/xhs.js";
import { startScheduler } from "./services/scheduler.js";
import { publishToXHS, checkLoginViaAPI, generateXHSCaption } from "./services/xhs.js";
import { getCache } from "./services/cache.js";
import { formatDateCN } from "./services/daily.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUTPUT_DIR = resolve(__dirname, "../output");

const PORT = parseInt(process.env.PORT || "3457", 10);

// 允许的前端域名（Cloudflare Pages 等）
const ALLOWED_ORIGINS = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",").map(s => s.trim())
  : ["zizaya.top"];

const app = express();

// CORS — 允许前端跨域访问
app.use(cors({
  origin: (origin, callback) => {
    // 允许无 origin 的请求（如服务端直接调用）
    if (!origin) return callback(null, true);
    // 允许 localhost 开发
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) return callback(null, true);
    // 允许配置的域名
    if (ALLOWED_ORIGINS.some(o => origin.includes(o))) return callback(null, true);
    // 允许 Cloudflare Pages 默认域名
    if (origin.endsWith(".pages.dev")) return callback(null, true);
    // 默认允许所有（生产环境可收紧）
    callback(null, true);
  },
  credentials: true,
}));
app.use(express.json());

// 静态文件：生成的图片
app.use("/output", express.static(OUTPUT_DIR));

// 路由挂载
app.use("/api", authRouter);
app.use("/api/news", newsRouter);
app.use("/api/models", modelsRouter);
app.use("/api", generateRouter);
app.use("/api/templates", templatesRouter);
app.use("/api/schedule", scheduleRouter);
app.use("/api/history", historyRouter);
app.use("/api/xhs", xhsRouter);

// 健康检查
app.get("/api/health", (req, res) => {
  res.json({ ok: true, service: "aibot-server", version: "2.0.0" });
});

// 启动
app.listen(PORT, async () => {
  console.log(`\n🚀 AI 日报后端 API 服务 (全功能版)`);
  console.log(`${"─".repeat(40)}`);
  console.log(`   地址: http://0.0.0.0:${PORT}`);
  console.log(`   健康检查: http://localhost:${PORT}/api/health`);
  console.log(`${"─".repeat(40)}`);

  // 启动定时任务
  await startScheduler(runGenerate, saveDraftToXHS);

  console.log(`\n按 Ctrl+C 停止服务\n`);
});

/**
 * 定时草稿回调：将今天生成的日报图片自动保存到小红书草稿箱
 */
async function saveDraftToXHS() {
  const { readdirSync } = await import("node:fs");

  // 检查 XHS 登录状态
  const loginCheck = await checkLoginViaAPI();
  if (!loginCheck.loggedIn) {
    throw new Error("未登录小红书，无法存草稿");
  }

  // 获取今天的日期和图片
  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const outputDir = resolve(OUTPUT_DIR, dateStr);

  let pngFiles;
  try {
    pngFiles = readdirSync(outputDir)
      .filter((f) => f.endsWith(".png"))
      .sort()
      .map((f) => resolve(outputDir, f));
  } catch {
    throw new Error(`未找到 ${dateStr} 的日报图片`);
  }

  if (pngFiles.length === 0) {
    throw new Error("日报图片为空");
  }
  if (pngFiles.length > 18) pngFiles.length = 18;

  // 生成文案
  const dateInfo = formatDateCN(dateStr);
  const cached = getCache(dateStr);
  const items = cached?.items || cached?.sections?.[0]?.items || [];
  const caption = generateXHSCaption(items, dateInfo);

  const result = await publishToXHS({
    imagePaths: pngFiles,
    title: caption.title,
    content: caption.content,
    tags: caption.tags,
    draft: true,
  });

  console.log(`   📱 XHS草稿: ${caption.title} (${pngFiles.length}张图)`);
  return result;
}
