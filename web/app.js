/**
 * AI 日报 Web 控制台 — 前端逻辑（Cloudflare Pages 版）
 *
 * 所有 API 通过 window.API_BASE 直连 VPS 后端
 */

(function () {
  "use strict";

  // ====== State ======
  let pollTimer = null;

  // ====== DOM ======
  const $ = (sel) => document.querySelector(sel);
  const mainView = $("#main-view");

  // ====== API Helper ======
  function getBase() {
    return (window.API_BASE || "").replace(/\/+$/, "");
  }

  async function api(method, path, body) {
    const opts = {
      method,
      headers: {
        "Content-Type": "application/json",
      },
    };
    if (body) opts.body = JSON.stringify(body);

    const resp = await fetch(getBase() + path, opts);
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);
    return data;
  }

  // ====== Auth ======
  function showMain() {
    mainView.hidden = false;
    loadHistory();
    loadModels();
    loadTemplates();
    loadServerConfig();
    testServerConnection();
    loadSchedule();

    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    $("#input-date").value = iso;
  }

  // ====== Generate ======
  $("#btn-generate").addEventListener("click", async () => {
    const date = $("#input-date").value;
    const btn = $("#btn-generate");

    btn.disabled = true;
    btn.querySelector(".btn-text").textContent = "生成中...";
    btn.querySelector(".btn-spinner").hidden = false;
    $("#progress-area").hidden = false;

    try {
      await api("POST", "/api/generate", { date: date || undefined });
      startPolling();
    } catch (err) {
      alert("生成失败: " + err.message);
      resetGenerateBtn();
    }
  });

  function resetGenerateBtn() {
    const btn = $("#btn-generate");
    btn.disabled = false;
    btn.querySelector(".btn-text").textContent = "生成日报";
    btn.querySelector(".btn-spinner").hidden = true;
  }

  // ====== Polling ======
  function startPolling() {
    if (pollTimer) clearInterval(pollTimer);
    pollTimer = setInterval(checkStatus, 1000);
  }

  async function checkStatus() {
    try {
      const data = await api("GET", "/api/status");
      const p = data.progress;

      const pct = p.done ? 100 : Math.round((p.step / p.total) * 100);
      $("#progress-fill").style.width = pct + "%";
      $("#progress-text").textContent = p.message;

      if (p.done) {
        clearInterval(pollTimer);
        pollTimer = null;
        resetGenerateBtn();

        if (p.error) {
          $("#progress-text").textContent = "❌ " + p.error;
          $("#progress-fill").style.background = "var(--danger)";
        } else {
          $("#progress-text").textContent = "✅ " + p.message;
          $("#progress-fill").style.background = "var(--success)";
          if (p.date) loadImages(p.date);
          loadHistory();
        }

        setTimeout(() => {
          $("#progress-fill").style.background = "var(--accent)";
        }, 3000);
      }
    } catch (err) {
      if (err.message.includes("未授权") || err.message.includes("无效")) {
        clearInterval(pollTimer);
      }
    }
  }

  // ====== History ======
  async function loadHistory() {
    try {
      const data = await api("GET", "/api/history");
      const list = $("#history-list");

      if (data.dates.length === 0) {
        list.innerHTML = '<p class="muted">暂无历史记录</p>';
        return;
      }

      list.innerHTML = data.dates
        .map(
          (d) => `
        <div class="history-item" data-date="${d.date}">
          <span class="date-text"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="vertical-align:-2px;margin-right:4px"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>${d.date}</span>
          <span class="count-badge">${d.count} 张</span>
          <button class="btn-del-date" data-date="${d.date}" title="删除该日报">×</button>
        </div>`
        )
        .join("");

      list.querySelectorAll(".history-item").forEach((item) => {
        item.addEventListener("click", (e) => {
          if (e.target.classList.contains("btn-del-date")) return;
          list.querySelectorAll(".history-item").forEach((i) => i.classList.remove("active"));
          item.classList.add("active");
          loadImages(item.dataset.date);
        });
      });

      list.querySelectorAll(".btn-del-date").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const date = btn.dataset.date;
          if (!confirm(`确定要删除 ${date} 的日报吗？`)) return;
          try {
            await api("DELETE", `/api/history/${date}`);
            loadHistory();
            const title = $("#preview-title");
            if (title.textContent.includes(date)) {
              $("#preview-body").innerHTML = '<div class="empty-state"><div class="empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3H10l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg></div><p>选择日期查看</p></div>';
              title.textContent = "图片预览";
            }
          } catch (err) {
            alert("删除失败: " + err.message);
          }
        });
      });
    } catch (err) {
      console.warn("加载历史失败:", err.message);
    }
  }

  // 清空全部历史
  const btnClearHistory = document.getElementById("btn-clear-history");
  if (btnClearHistory) {
    btnClearHistory.addEventListener("click", async () => {
      if (!confirm("确定要清空全部历史日报吗？此操作不可恢复！")) return;
      try {
        const result = await api("DELETE", "/api/history");
        alert(`已清空 ${result.deleted} 个日期的日报`);
        loadHistory();
        $("#preview-body").innerHTML = '<div class="empty-state"><div class="empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3H10l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg></div><p>暂无内容</p></div>';
        $("#preview-title").textContent = "图片预览";
      } catch (err) {
        alert("清空失败: " + err.message);
      }
    });
  }

  // ====== Image Preview ======
  async function loadImages(date) {
    try {
      const data = await api("GET", `/api/history/images/${date}`);
      const body = $("#preview-body");
      const title = $("#preview-title");
      const base = getBase();

      title.textContent = `图片预览 — ${date}`;

      if (data.images.length === 0) {
        body.innerHTML = '<div class="empty-state"><div class="empty-icon"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#94A3B8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 12h-6l-2 3H10l-2-3H2"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg></div><p>该日期没有图片</p></div>';
        return;
      }

      body.innerHTML = `
        <div class="image-gallery">
          ${data.images
            .map(
              (img) => `
            <div class="gallery-item">
              <img src="${base}${img.url}" alt="${img.name}" loading="lazy">
              <div class="img-label">
                <span>${img.name}</span>
                <a class="btn-download" href="${base}${img.url}" download="${img.name}">下载</a>
              </div>
            </div>`
            )
            .join("")}
        </div>`;
    } catch (err) {
      console.error("加载图片失败:", err);
    }
  }

  // ====== 模板管理 ======
  function getTemplatePreview(id) {
    return `<div class="tpl-preview"><img src="previews/${id}.png" alt="${id} 预览" loading="lazy" /></div>`;
  }

  async function loadTemplates() {
    try {
      const config = await api("GET", "/api/templates");
      const list = $("#template-list");
      list.innerHTML = config.themes.map(t => `
        <div class="template-item ${t.id === config.activeThemeId ? "active" : ""}" data-id="${t.id}">
          ${getTemplatePreview(t.id)}
          <div class="tpl-footer">
            <div class="tpl-info">
              <div class="tpl-name">${t.name}</div>
              <div class="tpl-desc">${t.description}</div>
            </div>
            <span class="tpl-check"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg></span>
          </div>
        </div>
      `).join("");

      list.querySelectorAll(".template-item").forEach(item => {
        item.addEventListener("click", async () => {
          try {
            await api("POST", "/api/templates/active", { themeId: item.dataset.id });
            list.querySelectorAll(".template-item").forEach(i => i.classList.remove("active"));
            item.classList.add("active");
          } catch (err) {
            alert("切换模板失败: " + err.message);
          }
        });
      });
    } catch (err) {
      console.error("加载模板列表失败:", err);
    }
  }

  // ====== 模型管理 ======
  async function loadModels() {
    try {
      const config = await api("GET", "/api/models");
      const select = $("#input-model");
      select.innerHTML = config.models
        .filter(m => m.hasKey)
        .map(m => `<option value="${m.id}" ${m.id === config.activeModelId ? "selected" : ""}>${m.name} (${m.model})</option>`)
        .join("");

      if (select.options.length === 0) {
        select.innerHTML = '<option disabled selected>请先配置模型 →</option>';
      }

      select.onchange = async () => {
        try {
          await api("POST", "/api/models/active", { modelId: select.value });
        } catch (err) {
          console.error("切换模型失败:", err);
        }
      };
    } catch (err) {
      console.error("加载模型列表失败:", err);
    }
  }

  // 模型配置弹窗
  const modelModal = $("#model-modal");
  $("#btn-model-config").addEventListener("click", () => {
    modelModal.hidden = false;
    renderModelConfig();
  });
  $("#modal-close").addEventListener("click", () => {
    modelModal.hidden = true;
    loadModels();
  });
  modelModal.addEventListener("click", (e) => {
    if (e.target === modelModal) {
      modelModal.hidden = true;
      loadModels();
    }
  });

  async function renderModelConfig() {
    const body = $("#model-config-body");
    try {
      const config = await api("GET", "/api/models");
      body.innerHTML = config.models.map(m => `
        <div class="model-card ${m.id === config.activeModelId ? "active" : ""}" data-id="${m.id}">
          <div class="model-card-header">
            <span class="model-card-name">${m.name}</span>
            <div class="model-card-status">
              <span class="model-status-dot ${m.hasKey ? "configured" : ""}"></span>
              <span class="model-status-text">${m.hasKey ? "已配置" : "未配置"}</span>
              ${m.id === config.activeModelId ? '<span class="model-card-badge">当前使用</span>' : ''}
            </div>
          </div>
          <div class="model-card-fields">
            <div class="model-field">
              <label>API 地址</label>
              <input type="text" data-field="baseUrl" value="${m.baseUrl}" placeholder="https://api.example.com">
            </div>
            <div class="model-field">
              <label>模型名称</label>
              <input type="text" data-field="model" value="${m.model}" placeholder="gpt-4o-mini">
            </div>
            <div class="model-field">
              <label>API Key</label>
              <div class="apikey-row">
                <input type="password" data-field="apiKey" value="" placeholder="${m.hasKey ? '已配置 (' + m.apiKey + ')' : '未配置，请输入'}">
                <button class="btn-sm btn-toggle-eye" title="显示/隐藏" type="button">👁</button>
              </div>
            </div>
          </div>
          <div class="model-card-actions">
            <button class="btn-sm primary btn-save-model">保存</button>
            <button class="btn-sm btn-test-model" ${!m.hasKey ? "disabled" : ""}>🔗 测试连接</button>
            <button class="btn-sm btn-set-active" ${m.id === config.activeModelId ? "disabled" : ""}>设为默认</button>
          </div>
          <div class="model-test-result" hidden></div>
        </div>
      `).join("");

      body.querySelectorAll(".btn-toggle-eye").forEach(btn => {
        btn.addEventListener("click", () => {
          const input = btn.parentElement.querySelector("input");
          input.type = input.type === "password" ? "text" : "password";
        });
      });

      body.querySelectorAll(".btn-save-model").forEach(btn => {
        btn.addEventListener("click", async () => {
          const card = btn.closest(".model-card");
          const id = card.dataset.id;
          const data = {};
          card.querySelectorAll("input[data-field]").forEach(input => {
            if (input.value) data[input.dataset.field] = input.value;
          });
          try {
            await api("PUT", `/api/models/${id}`, data);
            btn.textContent = "✓ 已保存";
            btn.classList.add("saved");
            setTimeout(() => { renderModelConfig(); }, 1200);
          } catch (err) {
            alert("保存失败: " + err.message);
          }
        });
      });

      body.querySelectorAll(".btn-test-model").forEach(btn => {
        btn.addEventListener("click", async () => {
          const card = btn.closest(".model-card");
          const id = card.dataset.id;
          const resultEl = card.querySelector(".model-test-result");
          resultEl.hidden = false;
          resultEl.className = "model-test-result testing";
          resultEl.textContent = "⏳ 正在测试连接...";
          btn.disabled = true;

          try {
            const result = await api("POST", `/api/models/${id}/test`);
            if (result.ok) {
              resultEl.className = "model-test-result success";
              resultEl.textContent = `✅ ${result.message}`;
            } else {
              resultEl.className = "model-test-result fail";
              resultEl.textContent = `❌ ${result.message}`;
            }
          } catch (err) {
            resultEl.className = "model-test-result fail";
            resultEl.textContent = `❌ 请求失败: ${err.message}`;
          } finally {
            btn.disabled = false;
          }
        });
      });

      body.querySelectorAll(".btn-set-active").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id = btn.closest(".model-card").dataset.id;
          try {
            await api("POST", "/api/models/active", { modelId: id });
            renderModelConfig();
          } catch (err) {
            alert("设置失败: " + err.message);
          }
        });
      });
    } catch (err) {
      body.innerHTML = `<p class="error-text">${err.message}</p>`;
    }
  }

  // 添加自定义模型
  $("#btn-add-model").addEventListener("click", async () => {
    const id = prompt("模型 ID（英文，如 custom-1）:");
    if (!id) return;
    const name = prompt("显示名称（如 我的模型）:");
    if (!name) return;
    const baseUrl = prompt("API 基础地址（如 https://api.example.com）:");
    if (!baseUrl) return;
    const model = prompt("模型名称（如 gpt-4o）:");
    if (!model) return;
    const apiKey = prompt("API Key:");

    try {
      await api("POST", "/api/models", { id, name, baseUrl, model, apiKey });
      renderModelConfig();
    } catch (err) {
      alert("添加失败: " + err.message);
    }
  });

  // ====== 模板文字编辑 ======
  const textModal = $("#text-modal");
  $("#btn-template-text").addEventListener("click", () => {
    textModal.hidden = false;
    renderTextConfig();
  });
  $("#text-modal-close").addEventListener("click", () => {
    textModal.hidden = true;
  });
  textModal.addEventListener("click", (e) => {
    if (e.target === textModal) textModal.hidden = true;
  });

  const TEXT_FIELDS = {
    cover: [
      { key: "titleBar", label: "标题栏文字", placeholder: "AI_Daily.exe" },
      { key: "mainTitle", label: "封面大标题", placeholder: "AI 日报" },
      { key: "headlineTag", label: "头条标签", placeholder: "🔥 今日头条" },
      { key: "listTitle", label: "资讯列表标题", placeholder: "全部资讯 · 共 {{TOTAL_COUNT}} 条" },
      { key: "bottomHint", label: "底部提示文字", placeholder: "⏩ 左滑查看详情" },
      { key: "statusLeft", label: "状态栏左侧", placeholder: "已就绪" },
      { key: "statusRight", label: "状态栏右侧", placeholder: "Note Pad" },
    ],
    section: [
      { key: "titleBar", label: "内容页标题栏", placeholder: "AI_Daily.exe - {{SECTION_TITLE}}" },
      { key: "sectionCountUnit", label: "条数单位", placeholder: "条" },
      { key: "statusRight", label: "内容页状态栏右侧", placeholder: "Page {{PAGE_NUM}}" },
    ],
    shared: [
      { key: "menuItems", label: "菜单栏（逗号分隔）", placeholder: "File,Edit,View,Help" },
      { key: "toolbarButtons", label: "工具栏按钮（逗号分隔）", placeholder: "Back,Share" },
    ],
  };

  async function renderTextConfig() {
    const body = $("#text-config-body");

    let themeId = "win95";
    try {
      const tplConfig = await api("GET", "/api/templates");
      themeId = tplConfig.activeThemeId || "win95";
    } catch {}

    let textConfig = {};
    try {
      textConfig = await api("GET", `/api/templates/${themeId}/text`);
    } catch {}

    function renderGroup(title, groupKey, fields) {
      return `
        <div class="text-group">
          <h4 class="text-group-title">${title}</h4>
          ${fields.map(f => {
            let val = "";
            if (groupKey === "shared") {
              const arr = textConfig.shared?.[f.key] || [];
              val = Array.isArray(arr) ? arr.join(",") : String(arr);
            } else {
              val = textConfig[groupKey]?.[f.key] || "";
            }
            return `<div class="text-field">
              <label>${f.label}</label>
              <input type="text" data-group="${groupKey}" data-key="${f.key}" value="${val}" placeholder="${f.placeholder}">
            </div>`;
          }).join("")}
        </div>`;
    }

    body.innerHTML = `
      <div class="text-config-form">
        <p class="text-theme-hint">当前主题：<strong>${themeId}</strong></p>
        ${renderGroup("封面", "cover", TEXT_FIELDS.cover)}
        ${renderGroup("内容页", "section", TEXT_FIELDS.section)}
        ${renderGroup("通用", "shared", TEXT_FIELDS.shared)}
        <div class="text-config-actions">
          <button class="btn-sm primary" id="btn-save-text">保存文字配置</button>
          <span class="text-save-status" id="text-save-status"></span>
        </div>
      </div>`;

    $("#btn-save-text").addEventListener("click", async () => {
      const result = { cover: {}, section: {}, shared: {} };

      body.querySelectorAll("input[data-group]").forEach(el => {
        const group = el.dataset.group;
        const key = el.dataset.key;
        const val = el.value.trim();
        if (!val) return;

        if (group === "shared") {
          result.shared[key] = val.split(",").map(s => s.trim());
        } else {
          result[group][key] = val;
        }
      });

      try {
        await api("PUT", `/api/templates/${themeId}/text`, result);
        const status = $("#text-save-status");
        status.textContent = "✓ 已保存";
        status.style.color = "var(--success)";
        setTimeout(() => { status.textContent = ""; }, 2000);
      } catch (err) {
        alert("保存失败: " + err.message);
      }
    });
  }

  // ====== 服务器连接 ======
  const serverUrlInput = document.getElementById("input-server-url");
  const serverStatus = document.getElementById("server-status");

  function loadServerConfig() {
    if (serverUrlInput) serverUrlInput.value = getBase();
  }

  async function testServerConnection() {
    if (!serverStatus) return;
    serverStatus.textContent = "●";
    serverStatus.className = "server-status";
    try {
      const resp = await fetch(getBase() + "/api/health");
      const data = await resp.json();
      if (data.ok) {
        serverStatus.className = "server-status online";
        serverStatus.title = `已连接 (v${data.version})`;
      } else {
        serverStatus.className = "server-status offline";
        serverStatus.title = "连接失败";
      }
    } catch {
      serverStatus.className = "server-status offline";
      serverStatus.title = "连接失败";
    }
  }

  const btnServerTest = document.getElementById("btn-server-test");
  if (btnServerTest) {
    btnServerTest.addEventListener("click", () => {
      const url = serverUrlInput.value.trim().replace(/\/+$/, "");
      if (url) {
        window.API_BASE = url;
        localStorage.setItem("aibot_api_base", url);
      }
      testServerConnection();
    });
    serverUrlInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        const url = serverUrlInput.value.trim().replace(/\/+$/, "");
        if (url) {
          window.API_BASE = url;
          localStorage.setItem("aibot_api_base", url);
        }
        testServerConnection();
      }
    });
  }

  // ====== 定时任务 ======
  const scheduleEnabled = document.getElementById("schedule-enabled");
  const schedulePreset = document.getElementById("schedule-preset");
  const scheduleAutoDraft = document.getElementById("schedule-auto-draft");
  const scheduleInfo = document.getElementById("schedule-info");

  async function loadSchedule() {
    try {
      const data = await api("GET", "/api/schedule");
      if (scheduleEnabled) scheduleEnabled.checked = data.enabled;
      if (scheduleAutoDraft) scheduleAutoDraft.checked = !!data.autoSaveDraft;
      if (schedulePreset && data.cron) {
        const options = [...schedulePreset.options];
        const match = options.find(o => o.value === data.cron);
        if (match) schedulePreset.value = data.cron;
      }
      updateScheduleInfo(data);
    } catch { /* 忽略 */ }
  }

  function updateScheduleInfo(data) {
    if (!scheduleInfo) return;
    if (!data.enabled) {
      scheduleInfo.textContent = "未启用自动生成";
      return;
    }
    let text = "已启用";
    if (data.autoSaveDraft) text += " + 自动存草稿";
    if (data.lastRun) {
      const d = new Date(data.lastRun);
      text += ` · 上次: ${d.toLocaleDateString("zh-CN")} ${d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
      if (data.lastResult && data.lastResult !== "success" && !data.lastResult.startsWith("success")) text += ` (失败)`;
      else if (data.lastResult && data.lastResult.includes("草稿失败")) text += ` (草稿失败)`;
    }
    scheduleInfo.textContent = text;
  }

  async function saveSchedule() {
    try {
      await api("PUT", "/api/schedule", {
        enabled: scheduleEnabled.checked,
        cron: schedulePreset.value,
        autoSaveDraft: scheduleAutoDraft ? scheduleAutoDraft.checked : false,
      });
      await loadSchedule();
    } catch (err) {
      console.error("保存定时任务失败:", err);
    }
  }

  if (scheduleEnabled) {
    scheduleEnabled.addEventListener("change", saveSchedule);
    schedulePreset.addEventListener("change", saveSchedule);
    if (scheduleAutoDraft) scheduleAutoDraft.addEventListener("change", saveSchedule);
  }

  // ====== 小红书发布 ======
  const xhsStatus = $("#xhs-status");
  const xhsInfo = $("#xhs-info");
  const btnXhsLogin = $("#btn-xhs-login");
  const btnXhsDraft = $("#btn-xhs-draft");
  const xhsModal = $("#xhs-modal");
  const xhsModalClose = $("#xhs-modal-close");
  const xhsQrImg = $("#xhs-qr-img");
  const xhsLoginMsg = $("#xhs-login-msg");
  const btnXhsCheck = $("#btn-xhs-check");
  const btnXhsLoadQr = $("#btn-xhs-load-qr");

  // 短信登录元素
  const xhsSmsMsg = $("#xhs-sms-msg");
  const xhsPhone = $("#xhs-phone");
  const xhsCode = $("#xhs-code");
  const btnXhsSendCode = $("#btn-xhs-send-code");
  const btnXhsSmsLogin = $("#btn-xhs-sms-login");
  const xhsSmsPanel = $("#xhs-sms-panel");
  const xhsQrPanel = $("#xhs-qr-panel");
  const xhsCookiePanel = $("#xhs-cookie-panel");

  // Tab 切换逻辑
  document.querySelectorAll(".xhs-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".xhs-tab").forEach((t) => {
        t.classList.remove("active");
        t.style.borderBottomColor = "transparent";
        t.style.color = "var(--text-secondary)";
      });
      tab.classList.add("active");
      tab.style.borderBottomColor = "var(--color-primary, #7C3AED)";
      tab.style.color = "var(--text-primary)";

      const mode = tab.dataset.tab;
      if (xhsSmsPanel) xhsSmsPanel.style.display = mode === "sms" ? "block" : "none";
      if (xhsQrPanel) xhsQrPanel.style.display = mode === "qr" ? "block" : "none";
      if (xhsCookiePanel) xhsCookiePanel.style.display = mode === "cookie" ? "block" : "none";
    });
  });

  // 默认激活 Cookie Tab 样式
  const defaultTab = document.querySelector('.xhs-tab[data-tab="cookie"]');
  if (defaultTab) {
    defaultTab.style.borderBottomColor = "var(--color-primary, #7C3AED)";
    defaultTab.style.color = "var(--text-primary)";
  }

  // Cookie 导入功能
  const btnImportCookie = $("#btn-xhs-import-cookie");
  const cookieInput = $("#xhs-cookie-input");
  const cookieMsg = $("#xhs-cookie-msg");

  if (btnImportCookie) {
    btnImportCookie.addEventListener("click", async () => {
      const raw = cookieInput?.value?.trim();
      if (!raw) {
        if (cookieMsg) { cookieMsg.textContent = "请粘贴 Cookie JSON"; cookieMsg.style.color = "#ef4444"; }
        return;
      }
      // 简单验证 JSON 格式
      try { JSON.parse(raw); } catch {
        if (cookieMsg) { cookieMsg.textContent = "JSON 格式无效，请检查"; cookieMsg.style.color = "#ef4444"; }
        return;
      }

      btnImportCookie.disabled = true;
      btnImportCookie.textContent = "导入中...";
      if (cookieMsg) { cookieMsg.textContent = ""; cookieMsg.style.color = "var(--text-secondary)"; }

      try {
        const data = await api("POST", "/api/xhs/login/cookies", { cookies: raw });
        if (data.loggedIn) {
          if (cookieMsg) { cookieMsg.textContent = data.message || "导入成功，登录有效！"; cookieMsg.style.color = "#22c55e"; }
          // 更新侧边栏状态
          checkXHSStatus();
          // 2 秒后关闭弹窗
          setTimeout(() => { xhsModal.hidden = true; }, 2000);
        } else {
          if (cookieMsg) { cookieMsg.textContent = data.message || "Cookie 已导入但登录未生效"; cookieMsg.style.color = "#f59e0b"; }
        }
      } catch (err) {
        if (cookieMsg) { cookieMsg.textContent = "导入失败: " + (err.message || "未知错误"); cookieMsg.style.color = "#ef4444"; }
      } finally {
        btnImportCookie.disabled = false;
        btnImportCookie.textContent = "导入 Cookie";
      }
    });
  }

  // 检查小红书登录状态
  async function checkXHSStatus() {
    try {
      const data = await api("GET", "/api/xhs/status");
      if (data.hasLogin) {
        xhsStatus.style.color = "#22c55e";
        xhsInfo.textContent = `已登录 · 过期: ${data.expires || "未知"}`;
        btnXhsDraft.disabled = false;
      } else {
        xhsStatus.style.color = "#ef4444";
        xhsInfo.textContent = data.message || "未登录";
        btnXhsDraft.disabled = true;
      }
    } catch {
      xhsStatus.style.color = "#94a3b8";
      xhsInfo.textContent = "无法检查状态";
    }
  }

  // 打开登录弹窗
  if (btnXhsLogin) {
    btnXhsLogin.addEventListener("click", () => {
      xhsModal.hidden = false;
      // 重置状态
      if (xhsSmsMsg) xhsSmsMsg.textContent = "";
      if (xhsPhone) xhsPhone.value = "";
      if (xhsCode) xhsCode.value = "";
      if (btnXhsSmsLogin) btnXhsSmsLogin.disabled = true;
      if (xhsLoginMsg) xhsLoginMsg.textContent = "点击下方按钮加载二维码";
      if (xhsQrImg) xhsQrImg.src = "";
      if (cookieInput) cookieInput.value = "";
      if (cookieMsg) { cookieMsg.textContent = ""; cookieMsg.style.color = "var(--text-secondary)"; }
    });
  }

  // ---- 短信登录：发送验证码 ----
  if (btnXhsSendCode) {
    btnXhsSendCode.addEventListener("click", async () => {
      const phone = xhsPhone.value.trim();
      if (!/^1\d{10}$/.test(phone)) {
        xhsSmsMsg.textContent = "请输入正确的11位手机号";
        xhsSmsMsg.style.color = "#ef4444";
        return;
      }
      btnXhsSendCode.disabled = true;
      btnXhsSendCode.textContent = "发送中...";
      xhsSmsMsg.textContent = "";
      try {
        const data = await api("POST", "/api/xhs/login/sms/send", { phone });
        xhsSmsMsg.textContent = data.message || "验证码已发送";
        xhsSmsMsg.style.color = "#22c55e";
        btnXhsSmsLogin.disabled = false;
        // 倒计时60秒
        let countdown = 60;
        btnXhsSendCode.textContent = `${countdown}s`;
        const timer = setInterval(() => {
          countdown--;
          if (countdown <= 0) {
            clearInterval(timer);
            btnXhsSendCode.disabled = false;
            btnXhsSendCode.textContent = "重新发送";
          } else {
            btnXhsSendCode.textContent = `${countdown}s`;
          }
        }, 1000);
      } catch (err) {
        xhsSmsMsg.textContent = "发送失败: " + err.message;
        xhsSmsMsg.style.color = "#ef4444";
        btnXhsSendCode.disabled = false;
        btnXhsSendCode.textContent = "发送验证码";
      }
    });
  }

  // ---- 短信登录：验证码登录 ----
  if (btnXhsSmsLogin) {
    btnXhsSmsLogin.addEventListener("click", async () => {
      const code = xhsCode.value.trim();
      if (!/^\d{4,6}$/.test(code)) {
        xhsSmsMsg.textContent = "请输入4-6位数字验证码";
        xhsSmsMsg.style.color = "#ef4444";
        return;
      }
      btnXhsSmsLogin.disabled = true;
      btnXhsSmsLogin.textContent = "登录中...";
      try {
        const data = await api("POST", "/api/xhs/login/sms/verify", { code });
        if (data.loggedIn) {
          xhsSmsMsg.textContent = "登录成功！";
          xhsSmsMsg.style.color = "#22c55e";
          setTimeout(() => {
            xhsModal.hidden = true;
            checkXHSStatus();
          }, 1500);
        } else {
          xhsSmsMsg.textContent = data.message || "登录未成功";
          xhsSmsMsg.style.color = "#ef4444";
        }
      } catch (err) {
        xhsSmsMsg.textContent = "登录失败: " + err.message;
        xhsSmsMsg.style.color = "#ef4444";
      } finally {
        btnXhsSmsLogin.disabled = false;
        btnXhsSmsLogin.textContent = "登 录";
      }
    });
  }

  // ---- 扫码登录：加载二维码 ----
  if (btnXhsLoadQr) {
    btnXhsLoadQr.addEventListener("click", async () => {
      xhsLoginMsg.textContent = "正在加载二维码...";
      xhsQrImg.src = "";
      btnXhsLoadQr.disabled = true;
      btnXhsLoadQr.textContent = "加载中...";
      try {
        const data = await api("POST", "/api/xhs/login");
        xhsLoginMsg.textContent = data.message || "请使用小红书 App 扫描二维码";
        if (data.qrCode) {
          xhsQrImg.src = data.qrCode;
        }
      } catch (err) {
        xhsLoginMsg.textContent = "加载失败: " + err.message;
      } finally {
        btnXhsLoadQr.disabled = false;
        btnXhsLoadQr.textContent = "加载二维码";
      }
    });
  }

  // ---- 扫码登录：检查登录状态 ----
  if (btnXhsCheck) {
    btnXhsCheck.addEventListener("click", async () => {
      try {
        btnXhsCheck.textContent = "检查中...";
        const data = await api("GET", "/api/xhs/login/status");
        if (data.loggedIn) {
          xhsLoginMsg.textContent = "登录成功！";
          xhsQrImg.src = data.screenshot || "";
          setTimeout(() => {
            xhsModal.hidden = true;
            checkXHSStatus();
          }, 1500);
        } else {
          xhsLoginMsg.textContent = data.message || "等待扫码...";
          if (data.qrCode) {
            xhsQrImg.src = data.qrCode;
          }
        }
      } catch (err) {
        xhsLoginMsg.textContent = "检查失败: " + err.message;
      } finally {
        btnXhsCheck.textContent = "检查登录状态";
      }
    });
  }

  // 关闭弹窗
  if (xhsModalClose) {
    xhsModalClose.addEventListener("click", () => {
      xhsModal.hidden = true;
    });
  }

  // 存草稿
  if (btnXhsDraft) {
    btnXhsDraft.addEventListener("click", async () => {
      const date = $("#input-date").value;
      if (!date) return alert("请先选择日期");

      btnXhsDraft.disabled = true;
      btnXhsDraft.textContent = "发布中...";
      try {
        const data = await api("POST", "/api/xhs/publish", { date, draft: true });
        alert(data.message || "已保存到草稿箱");
        if (data.preview) {
          xhsQrImg.src = data.preview;
          xhsLoginMsg.textContent = "发布预览";
          xhsModal.hidden = false;
        }
      } catch (err) {
        alert("发布失败: " + err.message);
      } finally {
        btnXhsDraft.disabled = false;
        btnXhsDraft.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/></svg> 存草稿';
      }
    });
  }

  // 初始加载时检查小红书状态
  checkXHSStatus();

  // ====== Init ======
  showMain();
})();
