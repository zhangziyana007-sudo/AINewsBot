/**
 * RSS 新闻抓取服务
 *
 * 从配置的 RSS 源批量获取文章，去重、排序、过滤
 */

import Parser from "rss-parser";
import { readFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const RSS_CONFIG_PATH = resolve(__dirname, "../../config/rss-sources.json");

const parser = new Parser({
  timeout: 15000,
  headers: {
    "User-Agent": "AIbot-RSS/2.0 (+https://github.com/zhangziyana007-sudo/AINewsBot)",
    Accept: "application/rss+xml, application/xml, text/xml, application/atom+xml",
  },
  maxRedirects: 3,
});

/**
 * 加载 RSS 源配置
 */
async function loadRSSConfig() {
  const raw = await readFile(RSS_CONFIG_PATH, "utf-8");
  return JSON.parse(raw);
}

/**
 * 从单个 RSS 源获取文章
 */
async function fetchSingleSource(source, settings) {
  try {
    const feed = await parser.parseURL(source.url);
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - (settings.maxAgeDays || 2));

    const articles = (feed.items || [])
      .map((item) => ({
        title: (item.title || "").trim(),
        link: item.link || "",
        summary: stripHtml(item.contentSnippet || item.content || item.summary || "").slice(0, 500),
        pubDate: item.pubDate || item.isoDate || "",
        source: source.name,
        sourceId: source.id,
        lang: source.lang,
        category: source.category,
      }))
      .filter((a) => {
        if (!a.title) return false;
        // 过滤太旧的文章
        if (a.pubDate) {
          const d = new Date(a.pubDate);
          if (!isNaN(d.getTime()) && d < cutoffDate) return false;
        }
        return true;
      })
      .slice(0, settings.maxArticlesPerSource || 10);

    console.log(`   ✅ ${source.name}: 获取 ${articles.length} 篇`);
    return articles;
  } catch (err) {
    console.warn(`   ⚠️ ${source.name} 抓取失败: ${err.message}`);
    return [];
  }
}

/**
 * 去除 HTML 标签
 */
function stripHtml(html) {
  return html
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * 标题去重（基于相似度）
 */
function deduplicateArticles(articles) {
  const seen = new Set();
  return articles.filter((a) => {
    // 用标题的前 30 字符 + 来源做简单去重
    const key = a.title.slice(0, 30).toLowerCase().replace(/\s+/g, "");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * 批量获取所有 RSS 源的文章
 * @returns {{ articles: Array, stats: Object }}
 */
export async function fetchAllRSS() {
  const config = await loadRSSConfig();
  const enabledSources = config.sources.filter((s) => s.enabled);
  const settings = config.settings || {};

  console.log(`\n📡 开始抓取 ${enabledSources.length} 个 RSS 源...`);

  // 并发抓取所有源（每个源独立 try/catch，不会互相影响）
  const results = await Promise.all(
    enabledSources.map((source) => fetchSingleSource(source, settings))
  );

  // 合并所有文章
  let allArticles = results.flat();

  // 去重
  allArticles = deduplicateArticles(allArticles);

  // 按时间排序（最新优先）
  allArticles.sort((a, b) => {
    const da = new Date(a.pubDate || 0);
    const db = new Date(b.pubDate || 0);
    return db.getTime() - da.getTime();
  });

  // 限制总数
  const maxTotal = settings.maxTotalArticles || 50;
  if (allArticles.length > maxTotal) {
    allArticles = allArticles.slice(0, maxTotal);
  }

  // 统计
  const stats = {
    totalSources: enabledSources.length,
    successSources: results.filter((r) => r.length > 0).length,
    totalArticles: allArticles.length,
    byCategory: {},
  };
  for (const a of allArticles) {
    stats.byCategory[a.category] = (stats.byCategory[a.category] || 0) + 1;
  }

  console.log(`📊 汇总: ${stats.successSources}/${stats.totalSources} 源成功, 共 ${stats.totalArticles} 篇文章`);

  return { articles: allArticles, stats };
}

/**
 * 将文章列表格式化为 AI 可读的文本
 */
export function formatArticlesForAI(articles) {
  return articles
    .map((a, i) => {
      const parts = [`[${i + 1}] ${a.title}`];
      if (a.source) parts.push(`来源: ${a.source}`);
      if (a.pubDate) {
        const d = new Date(a.pubDate);
        if (!isNaN(d.getTime())) parts.push(`日期: ${d.toISOString().slice(0, 10)}`);
      }
      if (a.summary) parts.push(`内容: ${a.summary.slice(0, 200)}`);
      return parts.join("\n");
    })
    .join("\n\n---\n\n");
}
