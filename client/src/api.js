/**
 * 后端 API 客户端
 *
 * 封装对云端后端的 HTTP 调用
 * 后端地址从 config/server.json 读取
 */

import { readFile, writeFile } from "node:fs/promises";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SERVER_CONFIG_PATH = resolve(__dirname, "../config/server.json");

let _serverConfig = null;
let _authToken = null;

/**
 * 读取服务器配置
 */
export async function loadServerConfig() {
  if (_serverConfig) return _serverConfig;
  try {
    const raw = await readFile(SERVER_CONFIG_PATH, "utf-8");
    _serverConfig = JSON.parse(raw);
  } catch {
    _serverConfig = {
      baseUrl: "http://localhost:3457",
      password: "ai2026",
    };
  }
  return _serverConfig;
}

/**
 * 保存服务器配置
 */
export async function saveServerConfig(config) {
  _serverConfig = config;
  _authToken = null; // 重连时清除旧 token
  await writeFile(SERVER_CONFIG_PATH, JSON.stringify(config, null, 2) + "\n", "utf-8");
}

/**
 * 获取认证 token（自动登录）
 */
async function getToken() {
  if (_authToken) return _authToken;
  const config = await loadServerConfig();
  const resp = await fetch(`${config.baseUrl}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ password: config.password }),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.error || `登录失败: HTTP ${resp.status}`);
  }
  const data = await resp.json();
  _authToken = data.token;
  return _authToken;
}

/**
 * 带认证的 fetch 封装
 */
async function apiFetch(path, options = {}) {
  const config = await loadServerConfig();
  const token = await getToken();
  const url = `${config.baseUrl}${path}`;

  const resp = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...options.headers,
    },
  });

  // token 过期自动重新登录
  if (resp.status === 401) {
    _authToken = null;
    const newToken = await getToken();
    const retryResp = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${newToken}`,
        ...options.headers,
      },
    });
    return retryResp;
  }

  return resp;
}

// ====== 公开 API ======

/**
 * 从后端获取新闻数据
 */
export async function fetchNews(date, forceRefresh = false) {
  const resp = await apiFetch("/api/news/fetch", {
    method: "POST",
    body: JSON.stringify({ date, forceRefresh }),
  });
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}));
    throw new Error(body.error || `获取新闻失败: HTTP ${resp.status}`);
  }
  const result = await resp.json();
  return result;
}

/**
 * 获取模型列表
 */
export async function getModels() {
  const resp = await apiFetch("/api/models");
  if (!resp.ok) throw new Error("获取模型列表失败");
  return resp.json();
}

/**
 * 更新模型配置
 */
export async function updateModel(id, data) {
  const resp = await apiFetch(`/api/models/${id}`, {
    method: "PUT",
    body: JSON.stringify(data),
  });
  if (!resp.ok) throw new Error("更新模型失败");
  return resp.json();
}

/**
 * 新增模型
 */
export async function addModel(data) {
  const resp = await apiFetch("/api/models", {
    method: "POST",
    body: JSON.stringify(data),
  });
  if (!resp.ok) throw new Error("新增模型失败");
  return resp.json();
}

/**
 * 切换活跃模型
 */
export async function setActiveModel(modelId) {
  const resp = await apiFetch("/api/models/active", {
    method: "POST",
    body: JSON.stringify({ modelId }),
  });
  if (!resp.ok) throw new Error("切换模型失败");
  return resp.json();
}

/**
 * 测试模型连接
 */
export async function testModel(id) {
  const resp = await apiFetch(`/api/models/${id}/test`, {
    method: "POST",
  });
  return resp.json();
}

/**
 * 测试后端连接
 */
export async function testConnection() {
  try {
    const config = await loadServerConfig();
    const resp = await fetch(`${config.baseUrl}/api/health`, {
      signal: AbortSignal.timeout(10000),
    });
    if (!resp.ok) return { ok: false, message: `HTTP ${resp.status}` };
    const data = await resp.json();
    return { ok: true, message: "连接成功", version: data.version };
  } catch (err) {
    const msg = err.name === "TimeoutError" ? "连接超时" : err.message;
    return { ok: false, message: msg };
  }
}
