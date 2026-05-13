/**
 * 新闻数据解析 — 分组和日期格式化
 */

/**
 * 将日报数据合并为单一列表（不分组）
 */
export function groupByCategory(dailyData) {
  const allItems = [];

  if (!dailyData) return { today: { label: "今日AI资讯", emoji: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.125em"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>', items: [] } };

  if (dailyData.items && Array.isArray(dailyData.items)) {
    allItems.push(...dailyData.items);
  } else if (dailyData.sections && Array.isArray(dailyData.sections)) {
    for (const section of dailyData.sections) {
      allItems.push(...(section.items || []));
    }
  }

  return {
    today: {
      label: "今日AI资讯",
      emoji: '<svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-0.125em"><path d="M12 8V4H8"/><rect width="16" height="12" x="4" y="8" rx="2"/><path d="M2 14h2"/><path d="M20 14h2"/><path d="M15 13v2"/><path d="M9 13v2"/></svg>',
      items: allItems,
    },
  };
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
