/**
 * 定时任务调度器
 *
 * 使用 node-cron 实现定时自动生成日报
 * 配置文件：config/schedule.json
 */

import cron from "node-cron";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEDULE_CONFIG_PATH = resolve(__dirname, "../config/schedule.json");

let currentTask = null;
let _onGenerate = null; // 生成回调

const DEFAULT_CONFIG = {
  enabled: false,
  cron: "0 8 * * *", // 每天早上 8 点
  lastRun: null,
  lastResult: null,
};

/**
 * 读取定时任务配置
 */
export async function loadScheduleConfig() {
  try {
    const raw = await readFile(SCHEDULE_CONFIG_PATH, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

/**
 * 保存定时任务配置
 */
export async function saveScheduleConfig(config) {
  await writeFile(SCHEDULE_CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

/**
 * 获取下次执行时间
 */
function getNextRunTime(cronExpr) {
  try {
    if (!cron.validate(cronExpr)) return null;
    // node-cron 没有内置的 nextRun API，手动计算
    const interval = cron.schedule(cronExpr, () => {}, { scheduled: false });
    // 简化：返回 cron 表达式描述
    return cronExpr;
  } catch {
    return null;
  }
}

/**
 * 启动定时任务
 * @param {Function} generateFn - 生成函数 async (date) => void
 */
export async function startScheduler(generateFn) {
  _onGenerate = generateFn;
  const config = await loadScheduleConfig();

  if (!config.enabled) {
    console.log("   ⏸️  定时任务未启用");
    return;
  }

  if (!cron.validate(config.cron)) {
    console.log(`   ❌ 无效的 cron 表达式: ${config.cron}`);
    return;
  }

  stopScheduler();

  currentTask = cron.schedule(config.cron, async () => {
    console.log(`\n   ⏰ 定时任务触发: ${new Date().toLocaleString("zh-CN")}`);
    try {
      await _onGenerate();
      const cfg = await loadScheduleConfig();
      cfg.lastRun = new Date().toISOString();
      cfg.lastResult = "success";
      await saveScheduleConfig(cfg);
    } catch (err) {
      console.error(`   ❌ 定时生成失败: ${err.message}`);
      const cfg = await loadScheduleConfig();
      cfg.lastRun = new Date().toISOString();
      cfg.lastResult = `error: ${err.message}`;
      await saveScheduleConfig(cfg);
    }
  }, {
    timezone: "Asia/Shanghai",
  });

  console.log(`   ⏰ 定时任务已启动: ${config.cron}`);
}

/**
 * 停止定时任务
 */
export function stopScheduler() {
  if (currentTask) {
    currentTask.stop();
    currentTask = null;
  }
}

/**
 * 重新加载并启动定时任务
 */
export async function reloadScheduler() {
  if (_onGenerate) {
    await startScheduler(_onGenerate);
  }
}

/**
 * 获取定时任务状态
 */
export async function getSchedulerStatus() {
  const config = await loadScheduleConfig();
  return {
    ...config,
    running: !!currentTask,
    nextCron: config.enabled ? config.cron : null,
  };
}
