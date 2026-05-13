/**
 * 将 aihot 日报数据渲染到 HTML 模板
 */

import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = resolve(__dirname, "../../templates");
const CONFIG_DIR = resolve(__dirname, "../../config");
const TEMPLATE_CONFIG = resolve(CONFIG_DIR, "templates.json");
const TEXT_CONFIG = resolve(CONFIG_DIR, "template-text.json");

const DEFAULT_TEXT = {
  cover: {
    titleBar: "AI_Daily.exe",
    mainTitle: "AI 日报",
    headlineTag: "今日头条",
    listTitle: "全部资讯 · 共 {{TOTAL_COUNT}} 条",
    bottomHint: "左滑查看详情",
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

async function loadTemplateText(themeId) {
  try {
    const raw = await readFile(TEXT_CONFIG, "utf-8");
    const config = JSON.parse(raw);
    return config[themeId] || DEFAULT_TEXT;
  } catch {
    return DEFAULT_TEXT;
  }
}

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
    const mainTitle = t?.mainTitle || DEFAULT_TEXT.cover.mainTitle;
    const parts = mainTitle.split(/\s+/);
    const useHighlight = !!t?.label;
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

export async function getActiveThemeId() {
  try {
    const raw = await readFile(TEMPLATE_CONFIG, "utf-8");
    const config = JSON.parse(raw);
    return config.activeThemeId || "win95";
  } catch {
    return "win95";
  }
}

async function loadTemplate(name, themeId) {
  const theme = themeId || await getActiveThemeId();
  let themeDir = resolve(TEMPLATES_DIR, theme);

  if (!existsSync(themeDir)) {
    themeDir = TEMPLATES_DIR;
  }

  const path = resolve(themeDir, name);
  let html = await readFile(path, "utf-8");

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

function render(template, data) {
  let result = template.replace(/\{\{(\w+)\}\}/g, (match, key) =>
    data[key] !== undefined ? String(data[key]) : match
  );
  result = result.replace(/\{\{(\w+)\}\}/g, (match, key) =>
    data[key] !== undefined ? String(data[key]) : match
  );
  return result;
}

function escapeHTML(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderNewsItem(item, index, fullSummary = false) {
  const title = item.title || "无标题";
  const summary = item.summary || "";
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

export async function renderCover(grouped, dateInfo, leadText) {
  const template = await loadTemplate("daily-cover.html");

  const allItems = [];
  for (const cat of Object.values(grouped)) {
    allItems.push(...(cat.items || []));
  }
  const totalCount = allItems.length;

  const newsListHtml = allItems.map((item, i) => {
    const idx = String(i + 1).padStart(2, "0");
    const title = item.title || "";
    const displayTitle = escapeHTML(title);
    return `<li class="cover-news-item"><span class="cover-news-idx">[${idx}]</span><span class="cover-news-text">${displayTitle}</span></li>`;
  }).join("\n          ");

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
    NEWS_LIST_HTML: newsListHtml,
    TOTAL_COUNT: totalCount,
    DAILY_QUOTE: dailyQuote,
  };

  const themeId = await getActiveThemeId();
  const text = await loadTemplateText(themeId);
  injectTextVars(data, text, "cover");

  return render(template, data);
}

const MAX_ITEMS_PER_PAGE = 4;

export async function renderSection(category, dateInfo, pageNum, totalPages) {
  const template = await loadTemplate("daily-section.html");

  const showItems = category.items.slice(0, MAX_ITEMS_PER_PAGE);
  const remaining = category.items.length - showItems.length;
  const fullSummary = showItems.length <= 2;
  const globalOffset = category._globalOffset || 0;

  let newsHTML = showItems.map((item, idx) => renderNewsItem(item, globalOffset + idx, fullSummary)).join("\n");

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
      const summary = item.summary || "";
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

export async function renderAll(grouped, dateInfo, outputDir) {
  await mkdir(outputDir, { recursive: true });

  const htmlFiles = [];

  if (grouped.today) {
    const items = grouped.today.items;
    const pageCount = Math.ceil(items.length / MAX_ITEMS_PER_PAGE);
    const totalPages = 1 + pageCount;

    const coverHTML = await renderCover(grouped, dateInfo);
    const coverPath = resolve(outputDir, "01-cover.html");
    await writeFile(coverPath, coverHTML, "utf-8");
    htmlFiles.push(coverPath);

    for (let i = 0; i < pageCount; i++) {
      const pageItems = items.slice(i * MAX_ITEMS_PER_PAGE, (i + 1) * MAX_ITEMS_PER_PAGE);
      const pageCat = {
        label: "今日AI资讯",
        emoji: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.125em"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>',
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

  const categoryOrder = ["ai-models", "ai-products", "industry", "paper", "tip"];
  const standalone = [];
  const mergeable = [];
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

  const coverHTML = await renderCover(grouped, dateInfo);
  const coverPath = resolve(outputDir, "01-cover.html");
  await writeFile(coverPath, coverHTML, "utf-8");
  htmlFiles.push(coverPath);

  let fileIndex = 2;

  if (hasMerged) {
    const mergedItems = [];
    for (const cat of mergeable) {
      for (const item of cat.items) {
        mergedItems.push({ ...item, _categoryLabel: cat.label, _categoryEmoji: cat.emoji });
      }
    }
    const mergedCat = { label: "综合资讯", emoji: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.125em"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/></svg>', items: mergedItems };
    const pageHTML = await renderMixedSection(mergedCat, dateInfo, fileIndex, totalPages);
    const fileName = `${String(fileIndex).padStart(2, "0")}-综合资讯.html`;
    const filePath = resolve(outputDir, fileName);
    await writeFile(filePath, pageHTML, "utf-8");
    htmlFiles.push(filePath);
    fileIndex++;
  }

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

// 导出配置路径和函数供路由使用
export { TEMPLATE_CONFIG, TEXT_CONFIG, loadTemplateText };
