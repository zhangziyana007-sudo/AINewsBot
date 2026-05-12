/**
 * 新闻缓存服务
 *
 * 同一天内重复请求走内存缓存，避免重复调用 AI API
 */

const cache = new Map(); // key: date, value: { data, timestamp }

const CACHE_TTL = (parseInt(process.env.CACHE_TTL_HOURS || "6", 10)) * 60 * 60 * 1000;

/**
 * 获取缓存的新闻数据
 * @param {string} date - 日期 YYYY-MM-DD
 * @returns {object|null}
 */
export function getCache(date) {
  const entry = cache.get(date);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > CACHE_TTL) {
    cache.delete(date);
    return null;
  }
  return entry.data;
}

/**
 * 设置新闻缓存
 * @param {string} date
 * @param {object} data
 */
export function setCache(date, data) {
  cache.set(date, { data, timestamp: Date.now() });
}

/**
 * 清除指定日期或全部缓存
 * @param {string} [date]
 */
export function clearCache(date) {
  if (date) {
    cache.delete(date);
  } else {
    cache.clear();
  }
}

/**
 * 获取缓存状态
 */
export function getCacheStats() {
  return {
    size: cache.size,
    keys: [...cache.keys()],
  };
}
