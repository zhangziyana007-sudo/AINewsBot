/**
 * 将 aihot 日报数据渲染到 HTML 模板
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = resolve(__dirname, "../templates");
const CONFIG_PATH = resolve(__dirname, "../config/templates.json");
const TEXT_CONFIG_PATH = resolve(__dirname, "../config/template-text.json");

// 默认文字（当配置缺失时的回退值）
const DEFAULT_TEXT = {
  cover: {
    titleBar: "AI_Daily.exe",
    mainTitle: "AI 日报",
    headlineTag: "🔥 今日头条",
    listTitle: "全部资讯 · 共 {{TOTAL_COUNT}} 条",
    bottomHint: "⏩ 左滑查看详情",
    statusLeft: "已就绪",
    statusRight: "Note Pad",
  },
  section: {
    titleBar: "AI_Daily.exe - {{SECTION_TITLE}}",
    sectionCountUnit: "条",
    statusRight: "Page {{PAGE_NUM}}",
  },
  shared: {
    menuItems: ["File", "Edit", "View", "Help"],
    toolbarButtons: ["Back", "Share"],
  },
};

/**
 * 加载主题的自定义文字配置
 */
async function loadTemplateText(themeId) {
  try {
    const raw = await readFile(TEXT_CONFIG_PATH, "utf-8");
    const config = JSON.parse(raw);
    return config[themeId] || DEFAULT_TEXT;
  } catch {
    return DEFAULT_TEXT;
  }
}

/**
 * 将模板文字注入到数据对象中
 */
function injectTextVars(data, text, templateType) {
  const t = templateType === "cover" ? text.cover : text.section;
  const shared = text.shared || DEFAULT_TEXT.shared;
  const menus = shared.menuItems || DEFAULT_TEXT.shared.menuItems;
  const buttons = shared.toolbarButtons || DEFAULT_TEXT.shared.toolbarButtons;

  data.TEXT_TITLEBAR = t?.titleBar || DEFAULT_TEXT[templateType]?.titleBar || "";
  data.TEXT_MENU1 = menus[0] || "";
  data.TEXT_MENU2 = menus[1] || "";
  data.TEXT_MENU3 = menus[2] || "";
  data.TEXT_MENU4 = menus[3] || "";
  data.TEXT_BTN1 = buttons[0] || "";
  data.TEXT_BTN2 = buttons[1] || "";

  if (templateType === "cover") {
    // 大标题：按空格分词着色
    const mainTitle = t?.mainTitle || DEFAULT_TEXT.cover.mainTitle;
    const parts = mainTitle.split(/\s+/);
    // minimal 主题使用 highlight 渐变色，win95 使用 blue/orange 交替
    const useHighlight = !!t?.label; // minimal 有 label 字段
    if (useHighlight) {
      data.MAIN_TITLE_HTML = parts.map(p =>
        `<span class="highlight">${p}</span>`
      ).join(" ");
    } else {
      const colors = ["blue", "orange"];
      data.MAIN_TITLE_HTML = parts.map((p, i) =>
        `<span class="${colors[i % colors.length]}">${p}</span>`
      ).join("\n            ");
    }

    data.TEXT_LABEL = t?.label || "每日精选";
    data.TEXT_HEADLINE_TAG = t?.headlineTag || DEFAULT_TEXT.cover.headlineTag;
    data.TEXT_LIST_TITLE = t?.listTitle || DEFAULT_TEXT.cover.listTitle;
    data.TEXT_BOTTOM_HINT = t?.bottomHint || DEFAULT_TEXT.cover.bottomHint;
    data.TEXT_STATUS_LEFT = t?.statusLeft || DEFAULT_TEXT.cover.statusLeft;
    data.TEXT_STATUS_RIGHT = t?.statusRight || DEFAULT_TEXT.cover.statusRight;
  } else {
    data.TEXT_COUNT_UNIT = t?.sectionCountUnit || DEFAULT_TEXT.section.sectionCountUnit;
    data.TEXT_STATUS_RIGHT = t?.statusRight || DEFAULT_TEXT.section.statusRight;
  }

  return data;
}

/**
 * 获取当前活跃主题 ID
 */
async function getActiveThemeId() {
  try {
    const raw = await readFile(CONFIG_PATH, "utf-8");
    const config = JSON.parse(raw);
    return config.activeThemeId || "win95";
  } catch {
    return "win95";
  }
}

/**
 * 读取模板并替换占位符
 * @param {string} name - 模板文件名（如 daily-cover.html）
 * @param {string} [themeId] - 主题 ID，不传则使用活跃主题
 */
async function loadTemplate(name, themeId) {
  const theme = themeId || await getActiveThemeId();
  let themeDir = resolve(TEMPLATES_DIR, theme);

  // 如果主题子目录不存在，回退到根目录（兼容旧结构）
  const { existsSync } = await import("node:fs");
  if (!existsSync(themeDir)) {
    themeDir = TEMPLATES_DIR;
  }

  const path = resolve(themeDir, name);
  let html = await readFile(path, "utf-8");

  // 内联 CSS — 将 <link rel="stylesheet" href="styles.css"> 替换为内联 <style>
  if (html.includes('href="styles.css"')) {
    const cssPath = resolve(themeDir, "styles.css");
    const css = await readFile(cssPath, "utf-8");
    html = html.replace(
      /<link rel="stylesheet" href="styles.css">/,
      `<style>\n${css}\n</style>`
    );
  }

  return html;
}

/**
 * 简单模板引擎 — 替换 {{KEY}} 占位符
 */
function render(template, data) {
  // 两轮替换：第一轮替换主变量，第二轮替换嵌套变量（如 TEXT_BOTTOM_TOTAL 中的 {{TOTAL_COUNT}}）
  let result = template.replace(/\{\{(\w+)\}\}/g, (match, key) =>
    data[key] !== undefined ? String(data[key]) : match
  );
  result = result.replace(/\{\{(\w+)\}\}/g, (match, key) =>
    data[key] !== undefined ? String(data[key]) : match
  );
  return result;
}

/**
 * 生成单条新闻 HTML
 * @param {boolean} [fullSummary=false] - 是否显示完整摘要（少条目页面时启用）
 */
function renderNewsItem(item, index, fullSummary = false) {
  const title = item.title || "无标题";
  const rawSummary = item.summary || "";
  // 条目多时截断摘要，少时完整展示
  const maxLen = fullSummary ? 300 : 80;
  const summary = rawSummary.length > maxLen ? rawSummary.slice(0, maxLen) + "..." : rawSummary;
  const source = item.source || "";

  return `
      <div class="news-item">
        <div class="news-index">${index + 1}</div>
        <div class="news-content">
          <div class="news-title">${escapeHTML(title)}</div>
          ${summary ? `<div class="news-summary">${escapeHTML(summary)}</div>` : ""}
          ${source ? `<div class="news-meta">${escapeHTML(source)}</div>` : ""}
        </div>
      </div>`;
}

/**
 * HTML 转义
 */
function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/**
 * 生成封面 HTML
 * @param {object} grouped - groupByCategory 的输出
 * @param {object} dateInfo - formatDateCN 的输出
 * @param {string} [leadText] - Lead 摘要文本
 */
export async function renderCover(grouped, dateInfo, leadText) {
  const template = await loadTemplate("daily-cover.html");

  const totalCount = Object.values(grouped).reduce(
    (sum, cat) => sum + cat.items.length,
    0
  );

  // 收集全部新闻条目
  const allKeys = Object.keys(grouped);
  const categoryOrder = allKeys.includes("today")
    ? ["today"]
    : ["ai-models", "ai-products", "industry", "paper", "tip"];
  const allItems = [];
  for (const key of categoryOrder) {
    const items = grouped[key]?.items || [];
    for (const item of items) allItems.push(item);
  }

  // 头条：第一条新闻
  const firstItem = allItems[0];
  const autoLead = leadText || firstItem?.title || "今日 AI 圈精选资讯";
  const leadSummary = firstItem?.summary || "";

  // 全部新闻列表 HTML（从第 2 条开始，头条已单独展示）
  const newsListHtml = allItems.slice(1).map((item, i) => {
    const idx = String(i + 2).padStart(2, "0");
    const title = item.title || "";
    const displayTitle = escapeHTML(title.length > 36 ? title.slice(0, 36) + "…" : title);
    return `<li class="cover-news-item"><span class="cover-news-idx">[${idx}]</span><span class="cover-news-text">${displayTitle}</span></li>`;
  }).join("\n          ");

  // 每日一言
  const quotes = [
    "技术是中性的，而人决定了它的方向。",
    "AI不会取代你，但会用AI的人会。",
    "未来已来，只是分布不均。",
    "数据是新时代的石油，AI是炼油厂。",
    "最好的预测未来的方式，就是去创造它。",
    "机器学习的核心是：让数据说话。",
    "通往AGI之路，每一步都值得记录。",
  ];
  const dayOfYear = Math.floor(
    (new Date(dateInfo.iso) - new Date(dateInfo.year, 0, 0)) / 86400000
  );
  const dailyQuote = quotes[dayOfYear % quotes.length];

  const data = {
    DATE_FULL: dateInfo.full,
    DATE_YEAR: dateInfo.year,
    DATE_MONTH: dateInfo.month,
    DATE_DAY: dateInfo.day,
    WEEKDAY: dateInfo.weekday,
    LEAD_TEXT: escapeHTML(autoLead),
    LEAD_SUMMARY: leadSummary ? escapeHTML(leadSummary.length > 100 ? leadSummary.slice(0, 100) + "..." : leadSummary) : "",
    NEWS_LIST_HTML: newsListHtml,
    TOTAL_COUNT: totalCount,
    DAILY_QUOTE: dailyQuote,
  };

  // 注入自定义模板文字
  const themeId = await getActiveThemeId();
  const text = await loadTemplateText(themeId);
  injectTextVars(data, text, "cover");

  return render(template, data);
}

/** 每页最多显示的新闻条数 */
const MAX_ITEMS_PER_PAGE = 4;

/**
 * 生成版块内容 HTML（每个版块固定 1 页）
 * 超过 MAX_ITEMS_PER_PAGE 条时只显示前 N 条，底部提示剩余数量
 */
export async function renderSection(
  category,
  dateInfo,
  pageNum,
  totalPages,
) {
  const template = await loadTemplate("daily-section.html");

  const showItems = category.items.slice(0, MAX_ITEMS_PER_PAGE);
  const remaining = category.items.length - showItems.length;
  // 条目少于等于 2 条时显示完整摘要
  const fullSummary = showItems.length <= 2;
  // 扁平分页时使用全局序号偏移
  const globalOffset = category._globalOffset || 0;

  let newsHTML = showItems.map((item, idx) => renderNewsItem(item, globalOffset + idx, fullSummary)).join("\n");

  // 超出条目时添加提示
  if (remaining > 0) {
    newsHTML += `
      <div class="news-more">
        还有 <strong>${remaining}</strong> 条资讯未展示，关注获取完整日报
      </div>`;
  }

  const data = {
    DATE_SHORT: dateInfo.short,
    WEEKDAY: dateInfo.weekday,
    SECTION_EMOJI: category.emoji,
    SECTION_TITLE: category.label,
    SECTION_COUNT: category.items.length,
    NEWS_ITEMS: newsHTML,
    PAGE_NUM: pageNum,
    TOTAL_PAGES: totalPages,
  };

  // 注入自定义模板文字
  const themeId = await getActiveThemeId();
  const text = await loadTemplateText(themeId);
  injectTextVars(data, text, "section");

  return render(template, data);
}

/**
 * 生成所有卡片 HTML 并写入输出目录
 * 扁平模式（today）：封面 + 按每页 MAX_ITEMS_PER_PAGE 条分页
 * 分类模式：封面 + 按类别拆页
 * @returns {string[]} 生成的 HTML 文件路径列表
 */
export async function renderAll(grouped, dateInfo, outputDir) {
  await mkdir(outputDir, { recursive: true });

  const htmlFiles = [];

  // 扁平模式：只有 "today" 一个类别
  if (grouped.today) {
    const items = grouped.today.items;
    const pageCount = Math.ceil(items.length / MAX_ITEMS_PER_PAGE);
    const totalPages = 1 + pageCount;

    // 1. 封面
    const coverHTML = await renderCover(grouped, dateInfo);
    const coverPath = resolve(outputDir, "01-cover.html");
    await writeFile(coverPath, coverHTML, "utf-8");
    htmlFiles.push(coverPath);

    // 2. 按每页 MAX_ITEMS_PER_PAGE 条分页
    for (let i = 0; i < pageCount; i++) {
      const pageItems = items.slice(i * MAX_ITEMS_PER_PAGE, (i + 1) * MAX_ITEMS_PER_PAGE);
      const pageCat = {
        label: "今日AI资讯",
        emoji: "🤖",
        items: pageItems,
        _globalOffset: i * MAX_ITEMS_PER_PAGE,
      };
      const fileIndex = i + 2;
      const pageHTML = await renderSection(pageCat, dateInfo, fileIndex, totalPages);
      const fileName = `${String(fileIndex).padStart(2, "0")}-今日AI资讯-${i + 1}.html`;
      const filePath = resolve(outputDir, fileName);
      await writeFile(filePath, pageHTML, "utf-8");
      htmlFiles.push(filePath);
    }

    return htmlFiles;
  }

  // 分类模式（兼容旧格式）
  const categoryOrder = ["ai-models", "ai-products", "industry", "paper", "tip"];

  // 分组：独立页 vs 合并页
  const standalone = []; // 条目 ≥ 3，独立成页
  const mergeable = [];  // 条目 < 3 且 > 0，合并到综合页
  for (const key of categoryOrder) {
    const cat = grouped[key];
    if (!cat || cat.items.length === 0) continue;
    if (cat.items.length >= 3) {
      standalone.push(cat);
    } else {
      mergeable.push(cat);
    }
  }

  const hasMerged = mergeable.length > 0;
  const totalPages = 1 + standalone.length + (hasMerged ? 1 : 0);

  // 1. 生成封面
  const coverHTML = await renderCover(grouped, dateInfo);
  const coverPath = resolve(outputDir, "01-cover.html");
  await writeFile(coverPath, coverHTML, "utf-8");
  htmlFiles.push(coverPath);

  let fileIndex = 2;

  // 2. 合并小版块为"综合资讯"页
  if (hasMerged) {
    const mergedItems = [];
    for (const cat of mergeable) {
      for (const item of cat.items) {
        mergedItems.push({ ...item, _categoryLabel: cat.label, _categoryEmoji: cat.emoji });
      }
    }
    const mergedCat = {
      label: "综合资讯",
      emoji: "📋",
      items: mergedItems,
    };
    const pageHTML = await renderMixedSection(mergedCat, dateInfo, fileIndex, totalPages);
    const fileName = `${String(fileIndex).padStart(2, "0")}-综合资讯.html`;
    const filePath = resolve(outputDir, fileName);
    await writeFile(filePath, pageHTML, "utf-8");
    htmlFiles.push(filePath);
    fileIndex++;
  }

  // 3. 独立版块各一页
  for (const cat of standalone) {
    const pageHTML = await renderSection(cat, dateInfo, fileIndex, totalPages);
    const fileName = `${String(fileIndex).padStart(2, "0")}-${cat.label}.html`;
    const filePath = resolve(outputDir, fileName);
    await writeFile(filePath, pageHTML, "utf-8");
    htmlFiles.push(filePath);
    fileIndex++;
  }

  return htmlFiles;
}

/**
 * 生成综合资讯页（合并多个小版块）
 * 每条新闻前面显示其所属版块标签
 */
async function renderMixedSection(category, dateInfo, pageNum, totalPages) {
  const template = await loadTemplate("daily-section.html");
  const showItems = category.items.slice(0, MAX_ITEMS_PER_PAGE);
  const remaining = category.items.length - showItems.length;

  let newsHTML = showItems
    .map((item, idx) => {
      const catTag = item._categoryEmoji
        ? `<span class="news-cat-tag">${item._categoryEmoji} ${item._categoryLabel || ""}</span>`
        : "";
      const title = item.title || "无标题";
      const rawSummary = item.summary || "";
      const summary = rawSummary.length > 120 ? rawSummary.slice(0, 120) + "..." : rawSummary;
      const source = item.source || "";

      return `
      <div class="news-item">
        <div class="news-index">${idx + 1}</div>
        <div class="news-content">
          ${catTag}
          <div class="news-title">${escapeHTML(title)}</div>
          ${summary ? `<div class="news-summary">${escapeHTML(summary)}</div>` : ""}
          ${source ? `<div class="news-meta">${escapeHTML(source)}</div>` : ""}
        </div>
      </div>`;
    })
    .join("\n");

  if (remaining > 0) {
    newsHTML += `
      <div class="news-more">
        还有 <strong>${remaining}</strong> 条资讯未展示，关注获取完整日报
      </div>`;
  }

  const data = {
    DATE_SHORT: dateInfo.short,
    WEEKDAY: dateInfo.weekday,
    SECTION_EMOJI: category.emoji,
    SECTION_TITLE: category.label,
    SECTION_COUNT: category.items.length,
    NEWS_ITEMS: newsHTML,
    PAGE_NUM: pageNum,
    TOTAL_PAGES: totalPages,
  };

  const themeId = await getActiveThemeId();
  const text = await loadTemplateText(themeId);
  injectTextVars(data, text, "section");

  return render(template, data);
}
