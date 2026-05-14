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
let _onDraft = null;

const DEFAULT_CONFIG = {
  enabled: false,
  cron: "0 8 * * *",
  autoSaveDraft: false,
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

export async function startScheduler(generateFn, draftFn) {
  _onGenerate = generateFn;
  _onDraft = draftFn;
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

      // 自动存草稿到小红书
      if (cfg.autoSaveDraft && _onDraft) {
        try {
          console.log("   📱 自动存草稿到小红书...");
          await _onDraft();
          cfg.lastResult = "success (已存草稿)";
          console.log("   ✅ 草稿已保存到小红书");
        } catch (draftErr) {
          console.error(`   ⚠️ 自动存草稿失败: ${draftErr.message}`);
          cfg.lastResult = `success (草稿失败: ${draftErr.message})`;
        }
      }

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
