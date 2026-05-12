/**
 * 新闻数据解析 — 分组和日期格式化
 */

/**
 * 将日报数据按版块分组
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

  if (dailyData.items && Array.isArray(dailyData.items) &&
      (!dailyData.sections || dailyData.sections.length <= 1)) {
    const allItems = dailyData.items || (dailyData.sections?.[0]?.items) || [];
    return {
      today: { label: "今日AI资讯", emoji: "🤖", items: allItems },
    };
  }

  if (!dailyData.sections) return categories;

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
