/**
 * 定时任务调度器
 */

import cron from "node-cron";
import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SCHEDULE_CONFIG_PATH = resolve(__dirname, "../../config/schedule.json");

let currentTask = null;
let _onGenerate = null;

const DEFAULT_CONFIG = {
  enabled: false,
  cron: "0 8 * * *",
  lastRun: null,
  lastResult: null,
};

export async function loadScheduleConfig() {
  try {
    const raw = await readFile(SCHEDULE_CONFIG_PATH, "utf-8");
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_CONFIG };
  }
}

export async function saveScheduleConfig(config) {
  await writeFile(SCHEDULE_CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

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

export function stopScheduler() {
  if (currentTask) {
    currentTask.stop();
    currentTask = null;
  }
}

export async function reloadScheduler() {
  if (_onGenerate) {
    await startScheduler(_onGenerate);
  }
}

export async function getSchedulerStatus() {
  const config = await loadScheduleConfig();
  return {
    ...config,
    running: !!currentTask,
    nextCron: config.enabled ? config.cron : null,
  };
}
