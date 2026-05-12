/**
 * 通用 AI 大模型新闻获取模块
 *
 * 支持任意 OpenAI 兼容 API（DeepSeek、OpenAI、通义千问、Kimi、智谱等）
 * 通过 config/ai-models.json 配置模型参数
 *
 * 环境变量（可选，会覆盖配置文件）：
 *   AI_API_KEY   - API 密钥
 *   AI_BASE_URL  - API 基础地址
 *   AI_MODEL     - 模型名称
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONFIG_PATH = resolve(__dirname, "..", "config", "ai-models.json");

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
  // 环境变量覆盖
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
  return `你是一个专业的 AI 科技新闻编辑。每天全网搜索并推送当天最新的科技新闻。

要求：
1. 全网搜索 ${dateStr} 当天最新、影响力最大的 AI 科技新闻
2. 偏好方向：国内外各大公司旗下 AI 大模型的更新、发布、价格变化
3. 总共推送 10 条新闻，不需要分类
4. 每条新闻包含：标题（简洁有力）、摘要（精简，30-80字）、来源
5. 优先选择影响力大、传播广的新闻
6. 标题和摘要使用中文

请严格按以下 JSON 格式输出，不要添加任何其他文字：
{
  "date": "${dateStr}",
  "items": [
    {
      "title": "新闻标题",
      "summary": "精简摘要，30-80字",
      "source": "来源名称"
    }
  ]
}`;
}

/**
 * 调用 OpenAI 兼容 API
 */
async function callAI(modelConfig, systemPrompt, userPrompt) {
  if (!modelConfig.apiKey) {
    throw new Error(
      `缺少 ${modelConfig.name} 的 API Key。\n` +
      `请在 Web 控制台「模型配置」中设置，或通过环境变量：\n` +
      `  export AI_API_KEY=sk-xxx`
    );
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

  // 部分模型支持 JSON 模式
  if (["deepseek", "openai", "qwen", "gemini", "xiaomi"].includes(modelConfig.id)) {
    body.response_format = { type: "json_object" };
  }

  // 小米 MiMo 默认启用思维链，对新闻获取任务禁用以节省 token
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

  if (!content) {
    throw new Error(`${modelConfig.name} API 返回了空内容`);
  }

  return content;
}

/**
 * 解析返回的 JSON，做数据校验
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

  // 支持扁平格式 { items: [...] } 和分类格式 { sections: [...] }
  if (data.items && Array.isArray(data.items)) {
    // 扁平列表 → 统一转为 sections 格式以兼容下游
    data.items = data.items.map((item) => ({
      title: String(item.title || "").trim(),
      summary: String(item.summary || "").trim(),
      source: String(item.source || "").trim(),
    })).filter((item) => item.title.length > 0);
    data.sections = [{ label: "今日AI资讯", items: data.items }];
  } else if (data.sections && Array.isArray(data.sections)) {
    for (const section of data.sections) {
      if (!section.label) {
        section.label = "资讯";
      }
      if (!Array.isArray(section.items)) {
        section.items = [];
      }
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
 * 使用 AI 大模型获取新闻日报
 *
 * @param {string} [date] - 日期 YYYY-MM-DD，不传则使用今天
 * @param {object} [modelOverride] - 可选的模型配置覆盖
 * @returns {Promise<object>} 日报数据
 */
export async function fetchDailyFromAI(date, modelOverride) {
  const now = new Date();
  const dateStr = date || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  const modelConfig = modelOverride || await getActiveModel();

  const systemPrompt = buildSystemPrompt(dateStr);
  const userPrompt = `请全网搜索 ${dateStr} 最新的 10 条 AI 科技新闻，重点关注各大公司 AI 大模型的更新和价格变化，按要求的 JSON 格式输出。`;

  console.log(`   📡 正在调用 ${modelConfig.name} (模型: ${modelConfig.model})...`);

  const rawContent = await callAI(modelConfig, systemPrompt, userPrompt);
  const data = parseNewsResponse(rawContent);

  data.date = data.date || dateStr;

  const totalItems = data.sections.reduce((sum, s) => sum + s.items.length, 0);
  console.log(`   ✅ ${modelConfig.name} 返回 ${totalItems} 条新闻`);

  return data;
}

// 向后兼容导出
export { fetchDailyFromAI as fetchDailyFromDeepSeek };

// 直接运行时进行测试
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/^.*\//, ""))) {
  const date = process.argv[2];
  const model = await getActiveModel();
  console.log(`⏳ 正在通过 ${model.name} 获取${date ? " " + date : "今日"} AI 新闻...`);
  console.log("═".repeat(40));

  try {
    const data = await fetchDailyFromAI(date);
    console.log(`\n📅 日期: ${data.date}`);
    for (const section of data.sections) {
      console.log(`\n${section.label} (${section.items.length} 条):`);
      for (const item of section.items) {
        console.log(`  • ${item.title}`);
        if (item.summary) console.log(`    ${item.summary.slice(0, 60)}...`);
      }
    }
  } catch (err) {
    console.error(`\n❌ 失败: ${err.message}`);
    process.exit(1);
  }
}
