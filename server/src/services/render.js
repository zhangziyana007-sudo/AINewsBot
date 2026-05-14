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
    bottomHint: "",
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

  let dailyQuote;
  if (leadText) {
    // 使用 AI 生成的封面导语
    dailyQuote = leadText;
  } else {
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
    dailyQuote = quotes[dayOfYear % quotes.length];
  }

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

/**
 * 估算单条新闻在页面中的高度（像素）
 * 根据标题和摘要的字符数推算行数，再换算高度
 */
function estimateItemHeight(item, fullSummary) {
  const titleLen = (item.title || "").length;
  const summaryLen = fullSummary ? (item.summary || "").length : 0;
  const sourceLen = (item.source || "").length;

  // 在 ~950px 文本区域内：标题约 22 字/行（粗体），摘要约 28 字/行
  const titleLines = Math.ceil(titleLen / 22) || 1;
  const summaryLines = fullSummary ? (Math.ceil(summaryLen / 28) || 0) : 0;
  const sourceLine = sourceLen > 0 ? 1 : 0;

  const titleH = titleLines * 56;     // ~34px * 1.65（粗体更宽）
  const summaryH = summaryLines * 42; // ~26px * 1.6 + 余量
  const sourceH = sourceLine * 36;
  const padding = 60;                 // item padding + gap + border

  return titleH + summaryH + sourceH + padding;
}

/** 页面固定开销高度（标题栏+板块头+页码+状态栏+间距） */
const PAGE_OVERHEAD = 380;
const PAGE_HEIGHT = 1440;
const AVAILABLE_HEIGHT = PAGE_HEIGHT - PAGE_OVERHEAD;

/**
 * 将新闻列表按估算高度分页
 * 返回二维数组：[[page1Items], [page2Items], ...]
 */
function paginateItems(items) {
  const pages = [];
  let currentPage = [];
  let usedHeight = 0;

  for (const item of items) {
    // 每页 ≤2 条时展示完整摘要
    const willBeFullSummary = currentPage.length < 2;
    const h = estimateItemHeight(item, willBeFullSummary);

    if (currentPage.length > 0 && usedHeight + h > AVAILABLE_HEIGHT) {
      pages.push(currentPage);
      currentPage = [];
      usedHeight = 0;
    }

    currentPage.push(item);
    // 重新按当前页数量判断是否 fullSummary
    const actualFull = currentPage.length <= 2;
    usedHeight += estimateItemHeight(item, actualFull);
  }

  if (currentPage.length > 0) {
    pages.push(currentPage);
  }

  return pages;
}

export async function renderSection(category, dateInfo, pageNum, totalPages) {
  const template = await loadTemplate("daily-section.html");

  const showItems = category.items;
  const fullSummary = showItems.length <= 2;
  const globalOffset = category._globalOffset || 0;

  let newsHTML = showItems.map((item, idx) => renderNewsItem(item, globalOffset + idx, fullSummary)).join("\n");

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
    const pages = paginateItems(items);
    const totalPages = 1 + pages.length;

    const coverHTML = await renderCover(grouped, dateInfo);
    const coverPath = resolve(outputDir, "01-cover.html");
    await writeFile(coverPath, coverHTML, "utf-8");
    htmlFiles.push(coverPath);

    let globalOffset = 0;
    for (let i = 0; i < pages.length; i++) {
      const pageItems = pages[i];
      const pageCat = {
        label: "今日AI资讯",
        emoji: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.125em"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>',
        items: pageItems,
        _globalOffset: globalOffset,
      };
      globalOffset += pageItems.length;
      const fileIndex = i + 2;
      const pageHTML = await renderSection(pageCat, dateInfo, fileIndex, totalPages);
      const fileName = `${String(fileIndex).padStart(2, "0")}-今日AI资讯-${i + 1}.html`;
      const filePath = resolve(outputDir, fileName);
      await writeFile(filePath, pageHTML, "utf-8");
      htmlFiles.push(filePath);
    }

    return htmlFiles;
  }

  return htmlFiles;
}

// 导出配置路径和函数供路由使用
export { TEMPLATE_CONFIG, TEXT_CONFIG, loadTemplateText, DEFAULT_TEXT };

/**
 * 渲染模板封面的 HTML 预览（使用示例数据）
 * @param {string} themeId - 主题 ID
 * @param {object} [customText] - 可选的自定义文字配置，优先于已保存配置
 * @returns {string} 完整的 HTML 字符串
 */
export async function renderPreviewCover(themeId, customText) {
  const theme = themeId || await getActiveThemeId();
  let themeDir = resolve(TEMPLATES_DIR, theme);
  if (!existsSync(themeDir)) themeDir = TEMPLATES_DIR;

  const path = resolve(themeDir, "daily-cover.html");
  let html = await readFile(path, "utf-8");

  if (html.includes('href="styles.css"')) {
    const cssPath = resolve(themeDir, "styles.css");
    const css = await readFile(cssPath, "utf-8");
    html = html.replace(
      /<link rel="stylesheet" href="styles.css">/,
      `<style>\n${css}\n</style>`
    );
  }

  const today = new Date();
  const dateInfo = {
    full: `${today.getFullYear()}.${String(today.getMonth()+1).padStart(2,'0')}.${String(today.getDate()).padStart(2,'0')}`,
    year: today.getFullYear(),
    month: String(today.getMonth()+1).padStart(2,'0'),
    day: String(today.getDate()).padStart(2,'0'),
    weekday: ['周日','周一','周二','周三','周四','周五','周六'][today.getDay()],
    short: `${today.getMonth()+1}月${today.getDate()}日`,
    iso: today.toISOString().slice(0,10),
  };

  const sampleNews = [
    "OpenAI 发布 GPT-5 模型，多模态能力大幅提升",
    "谷歌 DeepMind 推出新一代蛋白质预测工具",
    "英伟达发布新一代 AI 芯片 B300 架构",
    "Meta 开源 Llama 4 模型，支持 200 种语言",
    "微软 Copilot 全面接入 Windows 系统",
    "百度文心一言 5.0 发布，推理能力再升级",
  ];

  const newsListHtml = sampleNews.map((title, i) => {
    const idx = String(i + 1).padStart(2, '0');
    return `<li class="cover-news-item"><span class="cover-news-idx">[${idx}]</span><span class="cover-news-text">${escapeHTML(title)}</span></li>`;
  }).join("\n          ");

  const data = {
    DATE_FULL: dateInfo.full,
    DATE_YEAR: dateInfo.year,
    DATE_MONTH: dateInfo.month,
    DATE_DAY: dateInfo.day,
    WEEKDAY: dateInfo.weekday,
    NEWS_LIST_HTML: newsListHtml,
    TOTAL_COUNT: sampleNews.length,
    DAILY_QUOTE: "最好的预测未来的方式，就是去创造它。",
  };

  const text = customText || await loadTemplateText(theme);
  injectTextVars(data, text, "cover");

  return render(html, data);
}
