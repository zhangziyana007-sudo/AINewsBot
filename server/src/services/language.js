/**
 * 语言学习卡片服务
 *
 * 通过 AI 生成日语/韩语每日学习卡片数据，渲染为图片
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { getActiveModel } from "./ai.js";
import { screenshotAll } from "./screenshot.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = resolve(__dirname, "../../templates/language");
const OUTPUT_DIR = resolve(__dirname, "../../output");
const CONFIG_DIR = resolve(__dirname, "../../config");
const LANG_CONFIG_PATH = resolve(CONFIG_DIR, "language.json");

// 语言配置
const LANG_PRESETS = {
  japanese: {
    flag: "🇯🇵",
    title: "每日日语",
    accent: "#E74C3C",
    accentLight: "rgba(231,76,60,0.1)",
    bg: "linear-gradient(135deg, #FFF5F5 0%, #FED7D7 50%, #FFF5F5 100%)",
    footerText: "每天一词，轻松学日语 🌸",
  },
  korean: {
    flag: "🇰🇷",
    title: "每日韩语",
    accent: "#3B82F6",
    accentLight: "rgba(59,130,246,0.1)",
    bg: "linear-gradient(135deg, #EFF6FF 0%, #DBEAFE 50%, #EFF6FF 100%)",
    footerText: "每天一词，轻松学韩语 🌏",
  },
};

/**
 * 加载语言学习配置
 */
export async function loadLangConfig() {
  try {
    const raw = await readFile(LANG_CONFIG_PATH, "utf-8");
    return JSON.parse(raw);
  } catch {
    return { language: "japanese", level: "N5" };
  }
}

/**
 * 保存语言学习配置
 */
export async function saveLangConfig(config) {
  await writeFile(LANG_CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

/**
 * 使用 AI 生成每日语言学习数据
 */
async function generateLangData(language, level) {
  const modelConfig = await getActiveModel();
  const langName = language === "japanese" ? "日语" : "韩语";
  const readingType = language === "japanese" ? "假名读音" : "罗马音";

  const systemPrompt = `你是一位专业的${langName}教师。根据用户要求生成每日${langName}学习内容。
输出严格按 JSON 格式，不要添加任何其他文字。`;

  const userPrompt = `生成一份${langName}每日学习卡片（难度级别: ${level}），严格按以下 JSON 格式输出：
{
  "word": "目标语言的词/短语",
  "reading": "${readingType}",
  "meaning": "中文含义",
  "wordType": "词性（名词/动词/形容词/副词等）",
  "examples": [
    {
      "original": "目标语言的例句1",
      "reading": "${readingType}",
      "meaning": "中文翻译"
    },
    {
      "original": "目标语言的例句2",
      "reading": "${readingType}",
      "meaning": "中文翻译"
    }
  ],
  "extraWords": [
    { "word": "相关词1", "reading": "${readingType}", "meaning": "中文含义" },
    { "word": "相关词2", "reading": "${readingType}", "meaning": "中文含义" },
    { "word": "相关词3", "reading": "${readingType}", "meaning": "中文含义" },
    { "word": "相关词4", "reading": "${readingType}", "meaning": "中文含义" }
  ]
}

要求：
- 选择常用且实用的词汇
- 例句自然地道，符合日常会话场景
- 拓展词汇与主词相关（同主题/同类型/近义/反义）
- 每次选择不同的词，涵盖日常生活各场景`;

  const url = `${modelConfig.baseUrl.replace(/\/$/, "")}/v1/chat/completions`;
  const body = {
    model: modelConfig.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature: 0.8,
    max_tokens: 2048,
  };

  if (["deepseek", "openai", "qwen", "gemini", "xiaomi"].includes(modelConfig.id)) {
    body.response_format = { type: "json_object" };
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
    throw new Error(`AI 请求失败: HTTP ${resp.status} - ${errBody}`);
  }

  const result = await resp.json();
  const content = result.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI 返回空内容");

  // 解析 JSON
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) throw new Error("无法解析 AI 返回的 JSON");

  return JSON.parse(jsonMatch[0]);
}

function escapeHTML(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * 渲染语言学习卡片 HTML
 */
async function renderLangCard(langData, language) {
  const templatePath = resolve(TEMPLATES_DIR, "daily-language.html");
  let html = await readFile(templatePath, "utf-8");

  const preset = LANG_PRESETS[language] || LANG_PRESETS.japanese;

  const now = new Date();
  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, "0")}.${String(now.getDate()).padStart(2, "0")}`;
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  const weekday = weekdays[now.getDay()];

  // 计算今年第几天
  const dayOfYear = Math.floor((now - new Date(now.getFullYear(), 0, 0)) / 86400000);

  // 例句 HTML
  const examplesHTML = (langData.examples || []).map(ex => `
      <div class="example-item">
        <div class="example-original">${escapeHTML(ex.original)}</div>
        <div class="example-reading">${escapeHTML(ex.reading)}</div>
        <div class="example-meaning">${escapeHTML(ex.meaning)}</div>
      </div>`).join("\n");

  // 拓展词汇 HTML
  const extraHTML = (langData.extraWords || []).map(w => `
        <div class="extra-item">
          <div class="extra-word">${escapeHTML(w.word)}</div>
          <div class="extra-reading">${escapeHTML(w.reading)}</div>
          <div class="extra-meaning">${escapeHTML(w.meaning)}</div>
        </div>`).join("\n");

  const vars = {
    BG_COLOR: preset.bg,
    ACCENT_COLOR: preset.accent,
    ACCENT_LIGHT: preset.accentLight,
    DATE_FULL: dateStr,
    WEEKDAY: weekday,
    DAY_LABEL: `Day ${dayOfYear}`,
    LANG_FLAG: preset.flag,
    LANG_TITLE: preset.title,
    WORD: escapeHTML(langData.word),
    READING: escapeHTML(langData.reading),
    MEANING: escapeHTML(langData.meaning),
    WORD_TYPE: escapeHTML(langData.wordType),
    EXAMPLES_HTML: examplesHTML,
    EXTRA_WORDS_HTML: extraHTML,
    FOOTER_TEXT: preset.footerText,
  };

  for (const [key, value] of Object.entries(vars)) {
    html = html.replace(new RegExp(`\\{\\{${key}\\}\\}`, "g"), value);
  }

  return html;
}

/**
 * 生成语言学习卡片（完整流程：AI生成 → 渲染HTML → 截图）
 */
export async function generateLanguageCard(options = {}) {
  const config = await loadLangConfig();
  const language = options.language || config.language || "japanese";
  const level = options.level || config.level || "N5";

  console.log(`\n🗾 语言学习卡片生成中 (${language}, ${level})...`);

  // Step 1: AI 生成数据
  console.log("   📡 AI 生成词汇数据...");
  const langData = await generateLangData(language, level);
  console.log(`   ✅ 词汇: ${langData.word} (${langData.meaning})`);

  // Step 2: 渲染 HTML
  console.log("   🎨 渲染卡片...");
  const html = await renderLangCard(langData, language);

  const now = new Date();
  const dateStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
  const outputDir = resolve(OUTPUT_DIR, `lang-${dateStr}`);
  await mkdir(outputDir, { recursive: true });

  const htmlPath = resolve(outputDir, "language-card.html");
  await writeFile(htmlPath, html, "utf-8");

  // Step 3: 截图
  console.log("   📸 截图...");
  await screenshotAll([htmlPath], outputDir);
  console.log(`   ✅ 语言学习卡片生成完成！输出目录: ${outputDir}`);

  return {
    langData,
    htmlPath,
    outputDir,
    dateStr,
    images: [`${outputDir}/language-card.png`],
  };
}
