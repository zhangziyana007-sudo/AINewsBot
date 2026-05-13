/**
 * AI 模型调用服务
 *
 * 封装 AI API 调用逻辑，支持任意 OpenAI 兼容接口
 * 从 config/models.json 读取模型配置
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = resolve(__dirname, "../../config/models.json");

/**
 * 读取模型配置
 */
export async function loadModelConfig() {
  const raw = await readFile(CONFIG_PATH, "utf-8");
  return JSON.parse(raw);
}

/**
 * 保存模型配置
 */
export async function saveModelConfig(config) {
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

/**
 * 获取当前活跃模型的配置
 */
export async function getActiveModel() {
  const config = await loadModelConfig();
  const model = config.models.find(m => m.id === config.activeModelId);
  if (!model) {
    throw new Error(`未找到活跃模型: ${config.activeModelId}`);
  }
  return {
    ...model,
    apiKey: process.env.AI_API_KEY || model.apiKey,
    baseUrl: process.env.AI_BASE_URL || model.baseUrl,
    model: process.env.AI_MODEL || model.model,
  };
}

/**
 * 构造系统提示词
 */
function buildSystemPrompt(dateStr) {
  return `你是一个专业的 AI 行业分析师，专注于追踪各大 AI 模型厂商的产品动态和定价策略。

要求：
1. 全网搜索 ${dateStr} 当天或近期最新的 AI 模型相关资讯
2. 重点关注以下三个方向：
   - **Coding Plan / 编程订阅方案**：各厂商（OpenAI、Anthropic、Google、Cursor、GitHub Copilot、Windsurf、字节豆包、阿里通义、百度文心等）的编程/开发者订阅计划、Pro 方案、付费策略变化
   - **模型更新发布**：新模型发布、版本升级、能力提升、基准测试成绩
   - **Token 定价与收费**：API 调用价格调整、免费额度变化、token 单价对比、各厂商定价策略
3. 总共推送 10 条资讯，不需要分类
4. 每条资讯包含：标题（简洁有力）、摘要（精简，30-80字）、来源
5. 优先选择与开发者切身相关、影响实际使用成本的资讯
6. 标题和摘要使用中文

请严格按以下 JSON 格式输出，不要添加任何其他文字：
{
  "date": "${dateStr}",
  "items": [
    {
      "title": "资讯标题",
      "summary": "精简摘要，30-80字",
      "source": "来源名称"
    }
  ]
}`;
}

/**
 * 调用 OpenAI 兼容 API
 */
async function callAI(modelConfig, systemPrompt, userPrompt, { jsonMode = true } = {}) {
  if (!modelConfig.apiKey) {
    throw new Error(`缺少 ${modelConfig.name} 的 API Key`);
  }

  const url = `${modelConfig.baseUrl.replace(/\/$/, "")}/v1/chat/completions`;

  const body = {
    model: modelConfig.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.3,
    max_tokens: 4096,
  };

  if (jsonMode && ["deepseek", "openai", "qwen", "gemini", "xiaomi"].includes(modelConfig.id)) {
    body.response_format = { type: "json_object" };
  }

  // 腾讯混元联网搜索增强
  if (modelConfig.webSearch || modelConfig.id === "hunyuan") {
    body.enable_enhancement = true;
    body.force_search_enhancement = true;
  }

  if (modelConfig.model.startsWith("mimo-")) {
    body.thinking = { type: "disabled" };
  }

  const resp = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${modelConfig.apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!resp.ok) {
    const errBody = await resp.text().catch(() => "");
    throw new Error(`${modelConfig.name} API 请求失败: HTTP ${resp.status} - ${errBody}`);
  }

  const result = await resp.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) throw new Error(`${modelConfig.name} API 返回了空内容`);

  return content;
}

/**
 * 解析返回的 JSON，数据校验
 */
function parseNewsResponse(jsonStr) {
  let data;
  try {
    data = JSON.parse(jsonStr);
  } catch {
    const match = jsonStr.match(/```(?:json)?\s*([\s\S]*?)```/);
    if (match) {
      data = JSON.parse(match[1]);
    } else {
      throw new Error("返回的内容不是有效 JSON");
    }
  }

  if (data.items && Array.isArray(data.items)) {
    data.items = data.items.map((item) => ({
      title: String(item.title || "").trim(),
      summary: String(item.summary || "").trim(),
      source: String(item.source || "").trim(),
    })).filter((item) => item.title.length > 0);
    data.sections = [{ label: "AI 模型动态", items: data.items }];
  } else if (data.sections && Array.isArray(data.sections)) {
    for (const section of data.sections) {
      if (!section.label) section.label = "资讯";
      if (!Array.isArray(section.items)) section.items = [];
      section.items = section.items.map((item) => ({
        title: String(item.title || "").trim(),
        summary: String(item.summary || "").trim(),
        source: String(item.source || "").trim(),
      })).filter((item) => item.title.length > 0);
    }
  } else {
    throw new Error("返回数据缺少 items 或 sections 数组");
  }

  return data;
}

/**
 * 使用 AI 大模型获取新闻日报（联网搜索模式，旧方案备用）
 */
export async function fetchDailyFromAI(date, modelOverride) {
  const now = new Date();
  const dateStr = date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const modelConfig = modelOverride || await getActiveModel();

  const systemPrompt = buildSystemPrompt(dateStr);
  const userPrompt = `请全网搜索 ${dateStr} 最新的 10 条 AI 模型资讯，重点关注：1) 各厂商 Coding Plan / 编程订阅方案更新；2) 模型发布和版本升级；3) Token 定价和 API 收费变化。按要求的 JSON 格式输出。`;

  console.log(`   📡 正在调用 ${modelConfig.name} (模型: ${modelConfig.model})...`);

  const rawContent = await callAI(modelConfig, systemPrompt, userPrompt);
  const data = parseNewsResponse(rawContent);

  data.date = data.date || dateStr;

  const totalItems = data.sections.reduce((sum, s) => sum + s.items.length, 0);
  console.log(`   ✅ ${modelConfig.name} 返回 ${totalItems} 条新闻`);

  return data;
}

/**
 * 构造 RSS 摘要提示词
 */
function buildSummarizePrompt(dateStr) {
  return `你是一位专业的 AI 行业编辑。你的任务是从给定的 RSS 新闻原文中筛选和总结最有价值的资讯。

要求：
1. 从提供的原始文章中精选最重要的 10-15 条
2. 优先级：重大产品发布 > 模型更新 > 定价变化 > 行业分析 > 学术论文
3. 为每条资讯撰写简洁有力的中文标题（即使原文是英文）
4. 摘要控制在 30-80 字，抓住核心信息
5. 去除广告、水文、重复资讯
6. 保留原始来源名称

请严格按以下 JSON 格式输出，不要添加任何其他文字：
{
  "date": "${dateStr}",
  "items": [
    {
      "title": "中文资讯标题",
      "summary": "精简摘要，30-80字",
      "source": "来源名称"
    }
  ]
}`;
}

/**
 * 使用 AI 对 RSS 原文做筛选和摘要（新方案）
 */
export async function summarizeRSSArticles(articles, date, modelOverride) {
  const now = new Date();
  const dateStr = date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const modelConfig = modelOverride || await getActiveModel();
  const systemPrompt = buildSummarizePrompt(dateStr);

  // 将文章格式化为 AI 可读文本
  const { formatArticlesForAI } = await import("./rss.js");
  const articlesText = formatArticlesForAI(articles);

  const userPrompt = `以下是今天从各 RSS 源获取的 ${articles.length} 篇原始文章，请筛选最重要的 10-15 条并生成中文摘要：\n\n${articlesText}`;

  console.log(`   📡 正在调用 ${modelConfig.name} 做摘要 (${articles.length} 篇原文)...`);

  const rawContent = await callAI(modelConfig, systemPrompt, userPrompt);
  const data = parseNewsResponse(rawContent);

  data.date = data.date || dateStr;

  const totalItems = data.items ? data.items.length : data.sections.reduce((sum, s) => sum + s.items.length, 0);
  console.log(`   ✅ AI 摘要完成: ${totalItems} 条精选资讯`);

  return data;
}

/**
 * AI 总结封面文案：将新闻列表浓缩为一段封面导语
 */
export async function generateCoverSummary(items, dateStr) {
  const model = await getActiveModel();

  const newsList = items.map((item, i) =>
    `${i + 1}. ${item.title}${item.summary ? " — " + item.summary : ""}`
  ).join("\n");

  const systemPrompt = `你是一位资深科技媒体编辑，擅长用简洁有力的中文写日报导语。`;

  const userPrompt = `以下是 ${dateStr} 的 ${items.length} 条 AI 行业精选资讯：

${newsList}

请根据这些资讯，写一段 60-100 字的日报封面导语。要求：
1. 提炼今天最重要的 2-3 个趋势或事件
2. 语气专业但不枯燥，适合社交媒体传播
3. 不要用"今天"开头，不要用emoji
4. 直接输出导语文字，不要加引号或其他格式`;

  console.log(`   📝 AI 生成封面导语...`);
  const raw = await callAI(model, systemPrompt, userPrompt, { jsonMode: false });
  const summary = raw.trim().replace(/^[\s"'""\u201c\u201d]+|[\s"'""\u201c\u201d]+$/g, "");
  console.log(`   ✅ 封面导语: ${summary.slice(0, 50)}...`);
  return summary;
}
