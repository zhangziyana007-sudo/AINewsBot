/**
 * AI HOT (aihot.virxact.com) 新闻源服务
 *
 * 调用公开 REST API 获取精选 AI 资讯和日报
 * 文档: https://aihot.virxact.com/agent
 */

const BASE_URL = "https://aihot.virxact.com";
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36 aihot-skill/0.2.0";

/**
 * 通用请求封装
 */
async function aihot(path, params = {}) {
  const url = new URL(`/api/public/${path}`, BASE_URL);
  for (const [k, v] of Object.entries(params)) {
    if (v != null) url.searchParams.set(k, v);
  }

  const resp = await fetch(url.toString(), {
    headers: { "User-Agent": UA },
    signal: AbortSignal.timeout(20000),
  });

  if (!resp.ok) {
    const text = await resp.text().catch(() => "");
    throw new Error(`aihot ${path} 请求失败: ${resp.status} ${text.slice(0, 200)}`);
  }

  return resp.json();
}

/**
 * 获取今日日报（编辑成品，按 UTC 日切片）
 * 北京时间 08:00 后才有当天日报
 */
export async function fetchDaily(date) {
  const path = date ? `daily/${date}` : "daily";
  return aihot(path);
}

/**
 * 获取精选条目（推荐默认使用）
 * @param {object} opts
 * @param {string} opts.since - ISO 8601 起始时间
 * @param {number} opts.take  - 条目数量 (1-100)
 * @param {string} opts.category - ai-models | ai-products | industry | paper | tip
 * @param {string} opts.q - 关键词搜索
 */
export async function fetchSelected(opts = {}) {
  return aihot("items", { mode: "selected", ...opts });
}

/**
 * 获取所有条目（含未精选的）
 */
export async function fetchAll(opts = {}) {
  return aihot("items", { mode: "all", ...opts });
}

/**
 * 获取日报归档列表
 */
export async function fetchDailies(take = 14) {
  return aihot("dailies", { take });
}

/**
 * 为日报生成拉取数据：优先用精选 items，降级到 daily
 *
 * 返回格式与现有 dailyData 兼容:
 * { date, items: [{ title, summary, source, url }] }
 */
export async function fetchForDailyReport(dateStr) {
  const now = new Date();
  const targetDate = dateStr || `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;

  console.log(`   📡 从 AI HOT 拉取资讯 (${targetDate})...`);

  // 先尝试拉精选条目（最近 24 小时）
  try {
    // 拉取最近 36 小时精选，多拉一些再挑 10 条最有价值的
    const since = new Date(Date.now() - 36 * 3600 * 1000).toISOString();
    const data = await fetchSelected({ since, take: 30 });

    if (data.items && data.items.length >= 5) {
      // 取前 10 条（aihot 已按精选质量排序）
      const top10 = data.items.slice(0, 10).map(normalizeItem);
      console.log(`   ✅ AI HOT 精选: ${data.items.length} 条，取 Top ${top10.length}`);
      return {
        date: targetDate,
        source: "aihot-selected",
        items: top10,
      };
    }
  } catch (err) {
    console.error(`   ⚠️ AI HOT 精选拉取失败: ${err.message}`);
  }

  // 降级到日报
  try {
    const daily = await fetchDaily(targetDate);
    const items = [];
    if (daily.sections) {
      for (const section of daily.sections) {
        for (const item of section.items || []) {
          items.push({
            title: item.title,
            summary: item.summary || "",
            source: item.sourceName || "",
            url: item.sourceUrl || "",
          });
        }
      }
    }
    if (daily.flashes) {
      for (const f of daily.flashes) {
        items.push({
          title: f.title,
          summary: "",
          source: f.sourceName || "",
          url: f.sourceUrl || "",
        });
      }
    }
    console.log(`   ✅ AI HOT 日报: ${items.length} 条，取 Top ${Math.min(items.length, 10)}`);
    return { date: targetDate, source: "aihot-daily", items: items.slice(0, 10) };
  } catch (err) {
    console.error(`   ⚠️ AI HOT 日报拉取失败: ${err.message}`);
    throw new Error(`AI HOT 数据获取失败: ${err.message}`);
  }
}

/**
 * 标准化 items 端点返回的条目
 */
function normalizeItem(item) {
  return {
    title: item.title || item.title_en || "",
    summary: item.summary || "",
    source: item.source || "",
    url: item.url || "",
  };
}
