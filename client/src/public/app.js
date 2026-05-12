/**
 * AI 日报 Web 控制台 — 前端逻辑
 */

(function () {
  "use strict";

  // ====== State ======
  let authToken = localStorage.getItem("aibot_token") || "";
  let pollTimer = null;

  // 后端 API 地址（Cloudflare Pages 部署时改为 VPS 地址，本地开发留空）
  const API_BASE = window.AIBOT_API_BASE || "";

  // ====== DOM ======
  const $ = (sel) => document.querySelector(sel);
  const loginView = $("#login-view");
  const mainView = $("#main-view");

  // ====== API Helper ======
  async function api(method, path, body) {
    const opts = {
      method,
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${authToken}`,
      },
    };
    if (body) opts.body = JSON.stringify(body);

    const resp = await fetch(API_BASE + path, opts);
    const data = await resp.json();
    if (!resp.ok) throw new Error(data.error || `HTTP ${resp.status}`);
    return data;
  }

  // ====== Auth ======
  function showLogin() {
    loginView.hidden = false;
    mainView.hidden = true;
  }

  function showMain() {
    loginView.hidden = true;
    mainView.hidden = false;
    loadHistory();
    loadModels();
    loadTemplates();
    loadServerConfig().catch(() => {});
    testServerConnection().catch(() => {});
    loadSchedule();

    // 设置默认日期为今天
    const today = new Date();
    const iso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    $("#input-date").value = iso;
  }

  // Login form
  $("#login-form").addEventListener("submit", async (e) => {
    e.preventDefault();
    const pwd = $("#login-password").value;
    const errEl = $("#login-error");
    errEl.hidden = true;

    try {
      const data = await api("POST", "/api/login", { password: pwd });
      authToken = data.token;
      localStorage.setItem("aibot_token", authToken);
      showMain();
    } catch (err) {
      errEl.textContent = err.message;
      errEl.hidden = false;
    }
  });

  // Logout
  $("#btn-logout").addEventListener("click", async () => {
    try { await api("POST", "/api/logout"); } catch {}
    authToken = "";
    localStorage.removeItem("aibot_token");
    showLogin();
  });

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

      // 更新进度条
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
          // 加载新生成的图片
          if (p.date) {
            loadImages(p.date);
          }
          loadHistory();
        }

        // 3秒后重置进度条颜色
        setTimeout(() => {
          $("#progress-fill").style.background = "var(--accent)";
        }, 3000);
      }
    } catch (err) {
      // 可能是 401 — token 失效
      if (err.message.includes("未授权")) {
        clearInterval(pollTimer);
        showLogin();
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
          <span class="date-text">📅 ${d.date}</span>
          <span class="count-badge">${d.count} 张</span>
          <button class="btn-del-date" data-date="${d.date}" title="删除该日报">×</button>
        </div>`
        )
        .join("");

      // 绑定点击事件
      list.querySelectorAll(".history-item").forEach((item) => {
        item.addEventListener("click", (e) => {
          if (e.target.classList.contains("btn-del-date")) return;
          list.querySelectorAll(".history-item").forEach((i) => i.classList.remove("active"));
          item.classList.add("active");
          loadImages(item.dataset.date);
        });
      });

      // 绑定单条删除
      list.querySelectorAll(".btn-del-date").forEach((btn) => {
        btn.addEventListener("click", async (e) => {
          e.stopPropagation();
          const date = btn.dataset.date;
          if (!confirm(`确定要删除 ${date} 的日报吗？`)) return;
          try {
            await api("DELETE", `/api/history/${date}`);
            loadHistory();
            // 如果删除的是当前预览的日期，清空预览
            const title = $("#preview-title");
            if (title.textContent.includes(date)) {
              $("#preview-body").innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>选择日期查看</p></div>';
              title.textContent = "图片预览";
            }
          } catch (err) {
            alert("删除失败: " + err.message);
          }
        });
      });
    } catch (err) {
      if (err.message.includes("未授权")) {
        showLogin();
      }
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
        $("#preview-body").innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>暂无内容</p></div>';
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

      title.textContent = `图片预览 — ${date}`;

      if (data.images.length === 0) {
        body.innerHTML = '<div class="empty-state"><div class="empty-icon">📭</div><p>该日期没有图片</p></div>';
        return;
      }

      body.innerHTML = `
        <div class="image-gallery">
          ${data.images
            .map(
              (img) => `
            <div class="gallery-item">
              <img src="${API_BASE}${img.url}" alt="${img.name}" loading="lazy">
              <div class="img-label">
                <span>${img.name}</span>
                <a class="btn-download" href="${API_BASE}${img.url}" download="${img.name}">下载</a>
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
  async function loadTemplates() {
    try {
      const config = await api("GET", "/api/templates");
      const list = $("#template-list");
      list.innerHTML = config.themes.map(t => `
        <div class="template-item ${t.id === config.activeThemeId ? "active" : ""}" data-id="${t.id}">
          <span class="tpl-icon">${t.preview}</span>
          <div class="tpl-info">
            <div class="tpl-name">${t.name}</div>
            <div class="tpl-desc">${t.description}</div>
          </div>
          <span class="tpl-check">✓</span>
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

      // 切换活跃模型
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
    loadModels(); // 刷新下拉列表
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

      // 绑定显示/隐藏密码
      body.querySelectorAll(".btn-toggle-eye").forEach(btn => {
        btn.addEventListener("click", () => {
          const input = btn.parentElement.querySelector("input");
          input.type = input.type === "password" ? "text" : "password";
        });
      });

      // 绑定保存
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
            // 刷新状态
            setTimeout(() => { renderModelConfig(); }, 1200);
          } catch (err) {
            alert("保存失败: " + err.message);
          }
        });
      });

      // 绑定测试连接
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

      // 绑定设为默认
      body.querySelectorAll(".btn-set-active").forEach(btn => {
        btn.addEventListener("click", async () => {
          const id = btn.closest(".model-card").dataset.id;
          try {
            await api("POST", "/api/models/active", { modelId: id });
            renderModelConfig(); // 刷新
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

  // 文字字段定义
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

    // 获取当前主题 ID
    let themeId = "win95";
    try {
      const tplConfig = await api("GET", "/api/templates");
      themeId = tplConfig.activeThemeId || "win95";
    } catch {}

    // 获取当前文字配置
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
            if (f.multiline) {
              return `<div class="text-field">
                <label>${f.label}</label>
                <textarea data-group="${groupKey}" data-key="${f.key}" placeholder="${f.placeholder}" rows="2">${val}</textarea>
              </div>`;
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

    // 保存按钮
    $("#btn-save-text").addEventListener("click", async () => {
      const result = { cover: {}, section: {}, shared: {} };

      body.querySelectorAll("input[data-group], textarea[data-group]").forEach(el => {
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

  async function loadServerConfig() {
    try {
      const data = await api("GET", "/api/server");
      if (serverUrlInput) serverUrlInput.value = data.baseUrl || "";
    } catch { /* 忽略 */ }
  }

  async function testServerConnection() {
    if (!serverStatus) return;
    serverStatus.textContent = "●";
    serverStatus.className = "server-status";
    try {
      const result = await api("POST", "/api/server/test");
      if (result.ok) {
        serverStatus.className = "server-status online";
        serverStatus.title = "已连接";
      } else {
        serverStatus.className = "server-status offline";
        serverStatus.title = result.message || "连接失败";
      }
    } catch {
      serverStatus.className = "server-status offline";
      serverStatus.title = "连接失败";
    }
  }

  const btnServerTest = document.getElementById("btn-server-test");
  if (btnServerTest) {
    btnServerTest.addEventListener("click", async () => {
      const url = serverUrlInput.value.trim();
      if (url) await api("PUT", "/api/server", { baseUrl: url });
      await testServerConnection();
    });
    serverUrlInput.addEventListener("keydown", async (e) => {
      if (e.key === "Enter") {
        const url = serverUrlInput.value.trim();
        if (url) await api("PUT", "/api/server", { baseUrl: url });
        await testServerConnection();
      }
    });
  }

  // ====== 定时任务 ======
  const scheduleEnabled = document.getElementById("schedule-enabled");
  const schedulePreset = document.getElementById("schedule-preset");
  const scheduleInfo = document.getElementById("schedule-info");

  async function loadSchedule() {
    try {
      const data = await api("GET", "/api/schedule");
      if (scheduleEnabled) scheduleEnabled.checked = data.enabled;
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
    if (data.lastRun) {
      const d = new Date(data.lastRun);
      text += ` · 上次: ${d.toLocaleDateString("zh-CN")} ${d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
      if (data.lastResult && data.lastResult !== "success") text += ` (失败)`;
    }
    scheduleInfo.textContent = text;
  }

  async function saveSchedule() {
    try {
      await api("PUT", "/api/schedule", {
        enabled: scheduleEnabled.checked,
        cron: schedulePreset.value,
      });
      await loadSchedule();
    } catch (err) {
      console.error("保存定时任务失败:", err);
    }
  }

  if (scheduleEnabled) {
    scheduleEnabled.addEventListener("change", saveSchedule);
    schedulePreset.addEventListener("change", saveSchedule);
  }

  // ====== Init ======
  async function init() {
    if (authToken) {
      try {
        await api("GET", "/api/status");
        showMain();
      } catch {
        showLogin();
      }
    } else {
      showLogin();
    }
  }

  init();
})();
