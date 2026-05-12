/**
 * 模型配置路由
 *
 * GET    /api/models         — 获取所有模型（隐藏 key）
 * PUT    /api/models/:id     — 更新模型配置
 * POST   /api/models         — 新增模型
 * POST   /api/models/active  — 切换活跃模型
 * POST   /api/models/:id/test — 测试模型连接
 */

import { Router } from "express";
import { authRequired } from "./auth.js";
import { loadModelConfig, saveModelConfig } from "../services/ai.js";

const router = Router();

// 获取所有模型（隐藏 API Key）
router.get("/", authRequired, async (req, res) => {
  try {
    const config = await loadModelConfig();
    const safe = {
      ...config,
      models: config.models.map(m => ({
        ...m,
        apiKey: m.apiKey ? "sk-****" + m.apiKey.slice(-4) : "",
        hasKey: !!m.apiKey,
      })),
    };
    res.json(safe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 更新模型
router.put("/:id", authRequired, async (req, res) => {
  try {
    const config = await loadModelConfig();
    const idx = config.models.findIndex(m => m.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: "模型不存在" });

    const { name, baseUrl, model, apiKey, enabled } = req.body;
    if (name !== undefined) config.models[idx].name = String(name);
    if (baseUrl !== undefined) config.models[idx].baseUrl = String(baseUrl);
    if (model !== undefined) config.models[idx].model = String(model);
    if (apiKey !== undefined) config.models[idx].apiKey = String(apiKey);
    if (enabled !== undefined) config.models[idx].enabled = !!enabled;

    await saveModelConfig(config);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 新增模型
router.post("/", authRequired, async (req, res) => {
  try {
    const config = await loadModelConfig();
    const { id, name, baseUrl, model, apiKey } = req.body;
    if (!id || !name || !baseUrl || !model) {
      return res.status(400).json({ error: "缺少必填字段" });
    }
    if (config.models.some(m => m.id === id)) {
      return res.status(409).json({ error: "模型 ID 已存在" });
    }
    config.models.push({
      id: String(id),
      name: String(name),
      baseUrl: String(baseUrl),
      model: String(model),
      apiKey: String(apiKey || ""),
      enabled: true,
    });
    await saveModelConfig(config);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 切换活跃模型
router.post("/active", authRequired, async (req, res) => {
  try {
    const config = await loadModelConfig();
    const { modelId } = req.body;
    if (!config.models.some(m => m.id === modelId)) {
      return res.status(404).json({ error: "模型不存在" });
    }
    config.activeModelId = modelId;
    await saveModelConfig(config);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 测试模型连接
router.post("/:id/test", authRequired, async (req, res) => {
  try {
    const config = await loadModelConfig();
    const model = config.models.find(m => m.id === req.params.id);
    if (!model) return res.status(404).json({ error: "模型不存在" });

    if (!model.apiKey) {
      return res.json({ ok: false, message: "未配置 API Key" });
    }

    const url = `${model.baseUrl.replace(/\/$/, "")}/v1/chat/completions`;
    const startTime = Date.now();
    const resp = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${model.apiKey}`,
      },
      body: JSON.stringify({
        model: model.model,
        messages: [{ role: "user", content: "Hi" }],
        max_tokens: 5,
      }),
      signal: AbortSignal.timeout(15000),
    });

    const elapsed = Date.now() - startTime;

    if (!resp.ok) {
      const body = await resp.text().catch(() => "");
      return res.json({ ok: false, message: `HTTP ${resp.status}: ${body.slice(0, 200)}`, elapsed });
    }

    const data = await resp.json();
    const reply = data.choices?.[0]?.message?.content || "";
    res.json({ ok: true, message: `连接成功（${elapsed}ms）`, reply: reply.slice(0, 50), elapsed });
  } catch (err) {
    const msg = err.name === "TimeoutError" ? "连接超时（15秒）" : err.message;
    res.json({ ok: false, message: msg });
  }
});

export default router;
