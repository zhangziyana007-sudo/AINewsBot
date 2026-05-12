/**
 * 从 aihot API 拉取每日 AI 新闻日报
 */

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

/**
 * 获取当天日报（或指定日期）
 * @param {string} [date] - 日期 YYYY-MM-DD，不传则获取最新日报
 */
export async function fetchDaily(date) {
  const url = date
    ? `https://aihot.virxact.com/api/public/daily/${date}`
    : "https://aihot.virxact.com/api/public/daily";

  const resp = await fetch(url, {
    headers: { "User-Agent": UA },
  });

  if (!resp.ok) {
    throw new Error(`aihot daily API 请求失败: HTTP ${resp.status}`);
  }

  return resp.json();
}

/**
 * 获取精选条目（最近 N 小时）
 * @param {object} opts
 * @param {string} [opts.since] - ISO 时间起点
 * @param {number} [opts.take] - 获取条数，默认 50
 */
export async function fetchSelected({ since, take = 50 } = {}) {
  const sinceDate =
    since || new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const url = `https://aihot.virxact.com/api/public/items?mode=selected&since=${encodeURIComponent(sinceDate)}&take=${take}`;

  const resp = await fetch(url, {
    headers: { "User-Agent": UA },
  });

  if (!resp.ok) {
    throw new Error(`aihot items API 请求失败: HTTP ${resp.status}`);
  }

  return resp.json();
}

/**
 * 将日报数据按版块分组
 * API 返回格式: { sections: [{ label: "模型发布/更新", items: [...] }, ...] }
 */
export function groupByCategory(dailyData) {
  const categories = {
    "ai-models": { label: "模型发布", emoji: "📊", items: [] },
    "ai-products": { label: "产品发布", emoji: "🚀", items: [] },
    industry: { label: "行业动态", emoji: "🌐", items: [] },
    paper: { label: "论文研究", emoji: "📄", items: [] },
    tip: { label: "技巧与观点", emoji: "💡", items: [] },
  };

  if (!dailyData) return categories;

  // 扁平格式：所有条目放入 "today" 类别
  if (dailyData.items && Array.isArray(dailyData.items) &&
      (!dailyData.sections || dailyData.sections.length <= 1)) {
    const allItems = dailyData.items || (dailyData.sections?.[0]?.items) || [];
    return {
      today: { label: "今日AI资讯", emoji: "🤖", items: allItems },
    };
  }

  if (!dailyData.sections) return categories;

  // 将 section.label 映射到内部 category key
  const labelMap = {
    "模型发布/更新": "ai-models",
    "产品发布/更新": "ai-products",
    行业动态: "industry",
    论文研究: "paper",
    技巧与观点: "tip",
    "技巧/观点": "tip",
  };

  for (const section of dailyData.sections) {
    const key = labelMap[section.label] || "industry";
    if (categories[key]) {
      categories[key].items.push(...(section.items || []));
    } else {
      categories.industry.items.push(...(section.items || []));
    }
  }

  return categories;
}

/**
 * 格式化日期为中文展示
 */
export function formatDateCN(dateStr) {
  const d = dateStr ? new Date(dateStr) : new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
  return {
    full: `${year}.${month}.${day}`,
    short: `${month}.${day}`,
    weekday: weekdays[d.getDay()],
    iso: `${year}-${month}-${day}`,
    year: String(year),
    month: String(d.getMonth() + 1),
    day: String(d.getDate()),
  };
}

// 直接运行时进行测试
if (process.argv[1] && process.argv[1].endsWith("fetch-daily.js")) {
  const date = process.argv[2]; // 可选传入日期
  console.log(`⏳ 正在获取${date ? " " + date : "最新"}日报...`);

  try {
    const data = await fetchDaily(date);
    const grouped = groupByCategory(data);
    console.log(`✅ 获取成功！`);
    console.log(`📅 日期: ${data.date || "今天"}`);
    for (const [key, cat] of Object.entries(grouped)) {
      console.log(`  ${cat.emoji} ${cat.label}: ${cat.items.length} 条`);
    }
  } catch (err) {
    console.error(`❌ 获取失败: ${err.message}`);
    process.exit(1);
  }
}
