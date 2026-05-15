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

  // ====== 初始化多色 SVG 图标 ======
  function initIcons() {
    document.querySelectorAll('.nav-icon[data-icon]').forEach(el => {
      el.innerHTML = ICONS[el.dataset.icon] || '';
    });
    document.querySelectorAll('.title-icon[data-icon]').forEach(el => {
      const svg = ICONS[el.dataset.icon] || '';
      el.innerHTML = svg;
      el.style.cssText = 'display:inline-block;vertical-align:-3px;margin-left:2px;';
    });
  }

  // 鼠标拖拽滑动支持（电脑端）
  function enableDragScroll(el) {
    let isDown = false, startX, scrollL;
    el.addEventListener('mousedown', e => { isDown = true; el.style.cursor = 'grabbing'; startX = e.pageX - el.offsetLeft; scrollL = el.scrollLeft; });
    el.addEventListener('mouseleave', () => { isDown = false; el.style.cursor = ''; });
    el.addEventListener('mouseup', () => { isDown = false; el.style.cursor = ''; });
    el.addEventListener('mousemove', e => { if (!isDown) return; e.preventDefault(); el.scrollLeft = scrollL - (e.pageX - el.offsetLeft - startX); });
  }

  // ====== Tab Navigation ======
  function switchTab(pageName) {
    document.querySelectorAll('.tab-item').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-page').forEach(p => p.classList.remove('active'));
    const tab = document.querySelector(`.tab-item[data-page="${pageName}"]`);
    const page = document.getElementById('page-' + pageName);
    if (tab) tab.classList.add('active');
    if (page) page.classList.add('active');
    // 更新顶部标题
    const titles = {home:'AI 日报', xhs:'小红书', settings:'设置'};
    const pt = document.getElementById('page-title');
    if (pt) pt.textContent = titles[pageName] || '';
  }
  document.querySelectorAll('.tab-item').forEach(tab => {
    tab.addEventListener('click', () => switchTab(tab.dataset.page));
  });

  // ====== Func Switcher ======
  function switchFunc(funcName) {
    document.querySelectorAll('.func-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.func-content').forEach(c => c.style.display = 'none');
    const tab = document.querySelector(`.func-tab[data-func="${funcName}"]`);
    const content = document.getElementById('func-' + funcName);
    if (tab) tab.classList.add('active');
    if (content) content.style.display = 'block';
  }
  document.querySelectorAll('.func-tab').forEach(tab => {
    tab.addEventListener('click', () => switchFunc(tab.dataset.func));
  });

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

    // 更新日期显示
    function updateDateDisplay(dateStr) {
      const d = new Date(dateStr);
      const wk = ["周日","周一","周二","周三","周四","周五","周六"];
      const el = $("#date-display");
      if (el) el.textContent = `${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日 ${wk[d.getDay()]}`;
    }
    updateDateDisplay(iso);

    // 自定义日历
    (function initCalendar() {
      let calDate = new Date(today);
      let selectedDate = iso;
      const todayStr = iso;
      const modal = $("#calendar-modal");
      const grid = $("#cal-grid");
      const monthLabel = $("#cal-month");
      if (!modal || !grid) return;

      function renderCal() {
        const y = calDate.getFullYear(), m = calDate.getMonth();
        monthLabel.textContent = `${y}年${m+1}月`;
        const first = new Date(y, m, 1);
        let startDay = first.getDay() - 1; if (startDay < 0) startDay = 6;
        const daysInMonth = new Date(y, m+1, 0).getDate();
        const daysInPrev = new Date(y, m, 0).getDate();
        grid.innerHTML = "";
        // prev month
        for (let i = startDay - 1; i >= 0; i--) {
          const btn = document.createElement("button");
          btn.className = "cal-day other-month";
          btn.textContent = daysInPrev - i;
          grid.appendChild(btn);
        }
        // current month
        const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,"0")}-${String(today.getDate()).padStart(2,"0")}`;
        for (let d = 1; d <= daysInMonth; d++) {
          const btn = document.createElement("button");
          btn.className = "cal-day";
          btn.textContent = d;
          const ds = `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
          if (ds === todayStr) btn.classList.add("today");
          if (ds === selectedDate) btn.classList.add("selected");
          btn.onclick = () => { selectedDate = ds; $("#input-date").value = ds; updateDateDisplay(ds); renderCal(); };
          grid.appendChild(btn);
        }
        // next month fill
        const total = startDay + daysInMonth;
        const rem = total % 7 === 0 ? 0 : 7 - (total % 7);
        for (let i = 1; i <= rem; i++) {
          const btn = document.createElement("button");
          btn.className = "cal-day other-month";
          btn.textContent = i;
          grid.appendChild(btn);
        }
      }

      $("#date-picker-trigger").addEventListener("click", () => { calDate = new Date(selectedDate); renderCal(); modal.hidden = false; });
      $("#calendar-close").addEventListener("click", () => { modal.hidden = true; });
      modal.addEventListener("click", e => { if (e.target === modal) modal.hidden = true; });
      $("#cal-prev").addEventListener("click", () => { calDate.setMonth(calDate.getMonth()-1); renderCal(); });
      $("#cal-next").addEventListener("click", () => { calDate.setMonth(calDate.getMonth()+1); renderCal(); });
      $("#cal-today").addEventListener("click", () => { selectedDate = todayStr; calDate = new Date(today); $("#input-date").value = selectedDate; updateDateDisplay(selectedDate); renderCal(); });
    })();

    // 更新今日信息
    const weekdays = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];
    const todayInfo = $("#today-info");
    if (todayInfo) todayInfo.textContent = `${today.getMonth() + 1}月${today.getDate()}日 ${weekdays[today.getDay()]}，准备生成日报`;

    // 时间段问候语
    const hour = today.getHours();
    const greetingEl = $("#greeting-title");
    if (greetingEl) {
      const iconWrap = 'display:inline-block;vertical-align:-4px;margin-left:4px;';
      function greetHtml(text, iconName) {
        return text + ' <span style="' + iconWrap + '">' + ICONS[iconName] + '</span>';
      }
      if (hour < 6) greetingEl.innerHTML = greetHtml('夜深了', 'greetMoon');
      else if (hour < 12) greetingEl.innerHTML = greetHtml('早上好', 'greetSun');
      else if (hour < 14) greetingEl.innerHTML = greetHtml('中午好', 'greetCloud');
      else if (hour < 18) greetingEl.innerHTML = greetHtml('下午好', 'greetLeaf');
      else greetingEl.innerHTML = greetHtml('晚上好', 'greetMoon');
    }
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
          $("#progress-text").innerHTML = ICONS.cancel + ' ' + p.error;
          $("#progress-fill").style.background = "var(--danger)";
        } else {
          $("#progress-text").innerHTML = ICONS.checkmark + ' ' + p.message;
          $("#progress-fill").style.background = "var(--success)";
          if (p.date) {
            loadImages(p.date);
            setTimeout(() => { const pb = $("#preview-body"); if(pb) pb.scrollIntoView({behavior:'smooth'}); }, 300);
          }
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

  // ====== History (Calendar View) ======
  let calendarMonth = new Date(); // current displayed month

  function renderCalendar(historyDates) {
    const list = $("#history-list");
    const year = calendarMonth.getFullYear();
    const month = calendarMonth.getMonth();
    const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

    // Set of dates that have reports
    const dateSet = new Set(historyDates.map(d => d.date));

    const monthNames = ['1月','2月','3月','4月','5月','6月','7月','8月','9月','10月','11月','12月'];
    const weekDays = ['日','一','二','三','四','五','六'];

    let html = `<div class="cal-header">
      <button class="cal-nav" id="cal-prev">‹</button>
      <span class="cal-title">${year}年${monthNames[month]}</span>
      <button class="cal-nav" id="cal-next">›</button>
    </div>`;

    html += '<div class="cal-grid">';
    // Week day headers
    weekDays.forEach(d => { html += `<div class="cal-weekday">${d}</div>`; });
    // Empty cells before first day
    for (let i = 0; i < firstDay; i++) html += '<div class="cal-day empty"></div>';
    // Days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${year}-${String(month+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
      const hasReport = dateSet.has(dateStr);
      const isToday = dateStr === todayStr;
      const cls = ['cal-day', hasReport ? 'has-report' : '', isToday ? 'today' : ''].filter(Boolean).join(' ');
      html += `<div class="${cls}" data-date="${hasReport ? dateStr : ''}">${d}${hasReport ? '<span class="cal-dot"></span>' : ''}</div>`;
    }
    html += '</div>';

    list.innerHTML = html;

    // Nav buttons
    $("#cal-prev").addEventListener("click", () => { calendarMonth.setMonth(calendarMonth.getMonth() - 1); renderCalendar(historyDates); });
    $("#cal-next").addEventListener("click", () => { calendarMonth.setMonth(calendarMonth.getMonth() + 1); renderCalendar(historyDates); });

    // Click on day with report
    list.querySelectorAll(".cal-day.has-report").forEach(el => {
      el.addEventListener("click", () => {
        list.querySelectorAll(".cal-day").forEach(e => e.classList.remove("active"));
        el.classList.add("active");
        loadImages(el.dataset.date);
        setTimeout(() => { const pb = $("#preview-body"); if(pb) pb.scrollIntoView({behavior:'smooth'}); }, 300);
      });
    });
  }

  async function loadHistory() {
    try {
      const data = await api("GET", "/api/history");

      // 更新统计数字
      const statTotal = $("#stat-total");
      if (statTotal) statTotal.textContent = data.dates ? data.dates.length : 0;

      if (!data.dates || data.dates.length === 0) {
        renderCalendar([]);
        return;
      }

      renderCalendar(data.dates);
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
        const ptitle = $("#preview-title"); if (ptitle) ptitle.textContent = "图片预览";
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

      if (title) title.textContent = `图片预览 — ${date}`;

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
        </div>
        <div class="gallery-indicator">
          ${data.images.map((_, i) => `<span class="dot${i === 0 ? ' active' : ''}"></span>`).join('')}
        </div>
        <div class="gallery-counter">1 / ${data.images.length}</div>`;

      // 轮播指示器联动
      const gallery = body.querySelector('.image-gallery');
      const dots = body.querySelectorAll('.gallery-indicator .dot');
      const counter = body.querySelector('.gallery-counter');
      if (gallery) {
        gallery.addEventListener('scroll', () => {
          const idx = Math.round(gallery.scrollLeft / (gallery.scrollWidth / data.images.length));
          dots.forEach((d, i) => d.classList.toggle('active', i === idx));
          if (counter) counter.textContent = `${idx + 1} / ${data.images.length}`;
        });
        enableDragScroll(gallery);
      }
    } catch (err) {
      console.error("加载图片失败:", err);
    }
  }

  // ====== 模板管理 ======
  function getTemplatePreview(id) {
    const previewUrl = getBase() + `/api/templates/${id}/preview-html`;
    return `<div class="tpl-preview"><iframe src="${previewUrl}" loading="lazy" sandbox="allow-same-origin" scrolling="no" title="${id} 预览"></iframe></div>`;
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
      enableDragScroll(list);
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

      // 更新统计区的模型名
      const activeModel = config.models.find(m => m.id === config.activeModelId);
      const statModel = $("#stat-model");
      if (statModel && activeModel) statModel.textContent = activeModel.name;

      select.onchange = async () => {
        try {
          await api("POST", "/api/models/active", { modelId: select.value });
          const sel = select.options[select.selectedIndex];
          if (statModel && sel) statModel.textContent = sel.text.split(' (')[0];
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
                <button class="btn-sm btn-toggle-eye" title="显示/隐藏" type="button">${ICONS.visible}</button>
              </div>
            </div>
          </div>
          <div class="model-card-actions">
            <button class="btn-sm primary btn-save-model">保存</button>
            <button class="btn-sm btn-test-model" ${!m.hasKey ? "disabled" : ""}>${ICONS.link} 测试连接</button>
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
              resultEl.innerHTML = `${ICONS.checkmark} ${result.message}`;
            } else {
              resultEl.className = "model-test-result fail";
              resultEl.innerHTML = `${ICONS.cancel} ${result.message}`;
            }
          } catch (err) {
            resultEl.className = "model-test-result fail";
            resultEl.innerHTML = `${ICONS.cancel} 请求失败: ${err.message}`;
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
      { key: "headlineTag", label: "头条标签", placeholder: "今日头条" },
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
        <div class="text-preview-wrap">
          <iframe id="text-preview-iframe" src="${getBase()}/api/templates/${themeId}/preview-html" sandbox="allow-same-origin" scrolling="no"></iframe>
        </div>
        <p class="text-theme-hint">当前主题：<strong>${themeId}</strong> · 编辑后点击预览查看效果</p>
        ${renderGroup("封面", "cover", TEXT_FIELDS.cover)}
        ${renderGroup("内容页", "section", TEXT_FIELDS.section)}
        ${renderGroup("通用", "shared", TEXT_FIELDS.shared)}
        <div class="text-config-actions">
          <button class="btn-sm" id="btn-preview-text">${ICONS.visible} 预览</button>
          <button class="btn-sm primary" id="btn-save-text">保存文字配置</button>
          <span class="text-save-status" id="text-save-status"></span>
        </div>
      </div>`;

    function collectTextValues() {
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
      return result;
    }

    // 预览按钮 — 用当前文字重新渲染模板
    $("#btn-preview-text").addEventListener("click", async () => {
      const textValues = collectTextValues();
      const previewBtn = $("#btn-preview-text");
      previewBtn.disabled = true;
      previewBtn.textContent = "渲染中...";
      try {
        const resp = await fetch(getBase() + `/api/templates/${themeId}/preview-html`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(textValues),
        });
        const html = await resp.text();
        const iframe = $("#text-preview-iframe");
        iframe.srcdoc = html;
      } catch (err) {
        console.error("预览失败:", err);
      } finally {
        previewBtn.disabled = false;
        previewBtn.innerHTML = ICONS.visible + ' 预览';
      }
    });

    $("#btn-save-text").addEventListener("click", async () => {
      const result = collectTextValues();

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
  const btnXhsPublish = $("#btn-xhs-publish");
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

  // 新增编辑元素
  const xhsDatePick = $("#xhs-date-pick");
  const xhsTitleInput = $("#xhs-title");
  const xhsContentArea = $("#xhs-content");
  const xhsTagsInput = $("#xhs-tags");
  const xhsImagesPreview = $("#xhs-images-preview");
  const xhsImagesInfo = $("#xhs-images-info");
  const xhsProgress = $("#xhs-progress");
  const xhsProgressFill = $("#xhs-progress-fill");
  const xhsProgressText = $("#xhs-progress-text");
  const xhsPreviewWrap = $("#xhs-preview-wrap");
  const xhsPreviewImg = $("#xhs-preview-img");
  const xhsPreviewMsg = $("#xhs-preview-msg");

  // 设置默认日期
  if (xhsDatePick) {
    const now = new Date();
    xhsDatePick.value = now.toISOString().split("T")[0];
  }

  // 日期改变时加载对应日报图片
  let xhsCurrentImages = [];
  if (xhsDatePick) {
    xhsDatePick.addEventListener("change", async () => {
      const date = xhsDatePick.value;
      if (!date) return;
      xhsImagesPreview.innerHTML = '<p style="color:var(--text-tertiary);font-size:13px;margin:auto;">加载中...</p>';
      xhsImagesInfo.textContent = "";
      try {
        const data = await api("GET", `/api/daily/images?date=${date}`);
        xhsCurrentImages = data.images || [];
        if (xhsCurrentImages.length === 0) {
          xhsImagesPreview.innerHTML = '<p style="color:var(--text-tertiary);font-size:13px;margin:auto;">该日期暂无日报图片，请先生成</p>';
          xhsImagesInfo.textContent = "";
        } else {
          xhsImagesPreview.innerHTML = xhsCurrentImages.map((img, i) =>
            `<img src="/api/daily/image/${date}/${i}" style="width:60px;height:60px;object-fit:cover;border-radius:6px;border:1px solid var(--border);" alt="图${i+1}">`
          ).join("");
          xhsImagesInfo.textContent = `共 ${xhsCurrentImages.length} 张图片` + (xhsCurrentImages.length > 18 ? "（发布时最多18张）" : "");
        }
        // 自动填充标题和文案
        if (xhsTitleInput && !xhsTitleInput.value) {
          // 留空让后端自动生成
        }
      } catch {
        xhsImagesPreview.innerHTML = '<p style="color:var(--text-tertiary);font-size:13px;margin:auto;">加载失败</p>';
      }
    });
    // 触发一次
    xhsDatePick.dispatchEvent(new Event("change"));
  }

  // Tab 切换逻辑
  document.querySelectorAll(".xhs-tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".xhs-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");

      const mode = tab.dataset.tab;
      if (xhsSmsPanel) xhsSmsPanel.style.display = mode === "sms" ? "block" : "none";
      if (xhsQrPanel) xhsQrPanel.style.display = mode === "qr" ? "block" : "none";
      if (xhsCookiePanel) xhsCookiePanel.style.display = mode === "cookie" ? "block" : "none";
    });
  });

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
      try { JSON.parse(raw); } catch {
        if (cookieMsg) { cookieMsg.textContent = "JSON 格式无效"; cookieMsg.style.color = "#ef4444"; }
        return;
      }
      btnImportCookie.disabled = true;
      btnImportCookie.textContent = "导入中...";
      try {
        const data = await api("POST", "/api/xhs/login/cookies", { cookies: raw });
        if (data.loggedIn) {
          if (cookieMsg) { cookieMsg.textContent = data.message || "导入成功！"; cookieMsg.style.color = "#22c55e"; }
          checkXHSStatus();
          setTimeout(() => { xhsModal.hidden = true; }, 2000);
        } else {
          if (cookieMsg) { cookieMsg.textContent = data.message || "Cookie已导入但登录未生效"; cookieMsg.style.color = "#f59e0b"; }
        }
      } catch (err) {
        if (cookieMsg) { cookieMsg.textContent = "导入失败: " + err.message; cookieMsg.style.color = "#ef4444"; }
      } finally {
        btnImportCookie.disabled = false;
        btnImportCookie.textContent = "导入 Cookie";
      }
    });
  }

  // 检查小红书登录状态
  let xhsLoggedIn = false;
  async function checkXHSStatus() {
    try {
      const data = await api("GET", "/api/xhs/status");
      if (data.hasLogin && data.verified !== false) {
        xhsStatus.style.color = "#22c55e";
        xhsInfo.textContent = data.userName ? `已登录 (${data.userName})` : `已登录 · 过期: ${data.expires || "未知"}`;
        xhsLoggedIn = true;
        if (btnXhsDraft) btnXhsDraft.disabled = false;
        if (btnXhsPublish) btnXhsPublish.disabled = false;
      } else if (data.hasLogin && data.verified === false) {
        xhsStatus.style.color = "#f59e0b";
        xhsInfo.textContent = "Cookie可能过期，请重新登录";
        xhsLoggedIn = false;
        if (btnXhsDraft) btnXhsDraft.disabled = true;
        if (btnXhsPublish) btnXhsPublish.disabled = true;
      } else {
        xhsStatus.style.color = "#ef4444";
        xhsInfo.textContent = data.message || "未登录";
        xhsLoggedIn = false;
        if (btnXhsDraft) btnXhsDraft.disabled = true;
        if (btnXhsPublish) btnXhsPublish.disabled = true;
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

  // ---- 短信登录 ----
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
      try {
        const data = await api("POST", "/api/xhs/login/sms/send", { phone });
        xhsSmsMsg.textContent = data.message || "验证码已发送";
        xhsSmsMsg.style.color = "#22c55e";
        btnXhsSmsLogin.disabled = false;
        let cd = 60;
        btnXhsSendCode.textContent = `${cd}s`;
        const t = setInterval(() => { if (--cd <= 0) { clearInterval(t); btnXhsSendCode.disabled = false; btnXhsSendCode.textContent = "重新发送"; } else btnXhsSendCode.textContent = `${cd}s`; }, 1000);
      } catch (err) {
        xhsSmsMsg.textContent = "发送失败: " + err.message;
        xhsSmsMsg.style.color = "#ef4444";
        btnXhsSendCode.disabled = false;
        btnXhsSendCode.textContent = "发送验证码";
      }
    });
  }

  if (btnXhsSmsLogin) {
    btnXhsSmsLogin.addEventListener("click", async () => {
      const code = xhsCode.value.trim();
      if (!/^\d{4,6}$/.test(code)) { xhsSmsMsg.textContent = "请输入4-6位验证码"; xhsSmsMsg.style.color = "#ef4444"; return; }
      btnXhsSmsLogin.disabled = true;
      btnXhsSmsLogin.textContent = "登录中...";
      try {
        const data = await api("POST", "/api/xhs/login/sms/verify", { code });
        if (data.loggedIn) {
          xhsSmsMsg.textContent = "登录成功！"; xhsSmsMsg.style.color = "#22c55e";
          setTimeout(() => { xhsModal.hidden = true; checkXHSStatus(); }, 1500);
        } else {
          xhsSmsMsg.textContent = data.message || "登录未成功"; xhsSmsMsg.style.color = "#ef4444";
        }
      } catch (err) { xhsSmsMsg.textContent = "登录失败: " + err.message; xhsSmsMsg.style.color = "#ef4444"; }
      finally { btnXhsSmsLogin.disabled = false; btnXhsSmsLogin.textContent = "登 录"; }
    });
  }

  // ---- 扫码登录 ----
  if (btnXhsLoadQr) {
    btnXhsLoadQr.addEventListener("click", async () => {
      xhsLoginMsg.textContent = "正在加载二维码...";
      xhsQrImg.src = "";
      btnXhsLoadQr.disabled = true;
      try {
        const data = await api("POST", "/api/xhs/login");
        xhsLoginMsg.textContent = data.message || "请使用小红书App扫描";
        if (data.qrCode) xhsQrImg.src = data.qrCode;
      } catch (err) { xhsLoginMsg.textContent = "加载失败: " + err.message; }
      finally { btnXhsLoadQr.disabled = false; btnXhsLoadQr.textContent = "加载二维码"; }
    });
  }

  if (btnXhsCheck) {
    btnXhsCheck.addEventListener("click", async () => {
      btnXhsCheck.textContent = "检查中...";
      try {
        const data = await api("GET", "/api/xhs/login/status");
        if (data.loggedIn) {
          xhsLoginMsg.textContent = "登录成功！";
          setTimeout(() => { xhsModal.hidden = true; checkXHSStatus(); }, 1500);
        } else {
          xhsLoginMsg.textContent = data.message || "等待扫码...";
          if (data.qrCode) xhsQrImg.src = data.qrCode;
        }
      } catch (err) { xhsLoginMsg.textContent = "检查失败: " + err.message; }
      finally { btnXhsCheck.textContent = "检查登录状态"; }
    });
  }

  if (xhsModalClose) xhsModalClose.addEventListener("click", () => { xhsModal.hidden = true; });

  // ---- 发布/存草稿 通用函数 ----
  async function xhsDoPublish(isDraft) {
    const date = xhsDatePick?.value;
    if (!date) return alert("请先选择日期");

    const customTitle = xhsTitleInput?.value?.trim() || "";
    const customContent = xhsContentArea?.value?.trim() || "";
    const customTags = xhsTagsInput?.value?.trim() ? xhsTagsInput.value.split(/[,，]/).map(t => t.trim()).filter(Boolean) : [];
    const postTime = $("#xhs-schedule-time")?.value || "";

    const btn = isDraft ? btnXhsDraft : btnXhsPublish;
    const origHTML = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `<span>${isDraft ? "保存中..." : "发布中..."}</span>`;

    // 显示进度
    if (xhsProgress) { xhsProgress.style.display = "block"; xhsProgressFill.style.width = "30%"; xhsProgressText.textContent = "正在连接小红书..."; }
    if (xhsPreviewWrap) xhsPreviewWrap.style.display = "none";

    try {
      if (xhsProgressFill) xhsProgressFill.style.width = "60%";
      if (xhsProgressText) xhsProgressText.textContent = "上传图片并填写内容...";

      const body = { date, draft: isDraft };
      if (customTitle) body.customTitle = customTitle;
      if (customContent) body.customContent = customContent;
      if (customTags.length) body.customTags = customTags;
      if (postTime && !isDraft) body.postTime = postTime;

      const data = await api("POST", "/api/xhs/publish", body);

      if (xhsProgressFill) xhsProgressFill.style.width = "100%";
      if (xhsProgressText) xhsProgressText.textContent = data.message || "完成";

      // 定时发布成功
      if (data.scheduled) {
        if (xhsPreviewWrap) {
          xhsPreviewWrap.style.display = "block";
          xhsPreviewImg.style.display = "none";
          xhsPreviewMsg.textContent = `⏰ ${data.message}`;
          xhsPreviewMsg.style.color = "#7C3AED";
        }
        alert(`⏰ 定时发布已设置！\n${data.message}`);
        return;
      }

      // 显示预览截图
      if (data.preview && xhsPreviewWrap) {
        xhsPreviewWrap.style.display = "block";
        xhsPreviewImg.style.display = "block";
        xhsPreviewImg.src = data.preview;
        xhsPreviewMsg.textContent = data.message || (isDraft ? "已保存到草稿箱" : "已发布");
        xhsPreviewMsg.style.color = data.success ? "#22c55e" : "#f59e0b";
      }

      if (data.success) {
        alert(data.message || (isDraft ? "已保存到草稿箱 ✅" : "已发布 ✅"));
      } else {
        alert(data.message || "操作可能未成功，请检查预览截图");
      }
    } catch (err) {
      if (xhsProgressText) xhsProgressText.textContent = "失败: " + err.message;
      alert((isDraft ? "存草稿" : "发布") + "失败: " + err.message);
    } finally {
      btn.disabled = false;
      btn.innerHTML = origHTML;
      setTimeout(() => { if (xhsProgress) xhsProgress.style.display = "none"; }, 3000);
    }
  }

  if (btnXhsDraft) btnXhsDraft.addEventListener("click", () => xhsDoPublish(true));
  if (btnXhsPublish) btnXhsPublish.addEventListener("click", () => {
    if (!confirm("确定直接发布到小红书？")) return;
    xhsDoPublish(false);
  });

  // 初始加载
  checkXHSStatus();

  // ====== 语言学习卡片 ======
  const btnLangGenerate = document.getElementById("btn-lang-generate");
  const langProgress = document.getElementById("lang-progress");
  const langProgressFill = document.getElementById("lang-progress-fill");
  const langProgressText = document.getElementById("lang-progress-text");
  const langResult = document.getElementById("lang-result");

  // 加载语言学习配置
  async function loadLangConfig() {
    try {
      const resp = await fetch(`${getBase()}/api/language/config`);
      if (resp.ok) {
        const config = await resp.json();
        const langSelect = document.getElementById("lang-select");
        const langLevel = document.getElementById("lang-level");
        if (config.language && langSelect) langSelect.value = config.language;
        if (config.level && langLevel) langLevel.value = config.level;
      }
    } catch {}
  }
  loadLangConfig();

  if (btnLangGenerate) {
    btnLangGenerate.addEventListener("click", async () => {
      const language = document.getElementById("lang-select").value;
      const level = document.getElementById("lang-level").value;

      btnLangGenerate.disabled = true;
      btnLangGenerate.querySelector(".btn-text").textContent = "生成中...";
      btnLangGenerate.querySelector(".btn-spinner").hidden = false;
      langProgress.hidden = false;
      langResult.hidden = true;
      langProgressFill.style.width = "33%";
      langProgressText.textContent = "AI 生成词汇数据...";

      try {
        const resp = await fetch(`${getBase()}/api/language/generate`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ language, level }),
        });
        if (!resp.ok) throw new Error((await resp.json()).error || "请求失败");

        // 轮询状态
        const poll = setInterval(async () => {
          try {
            const sr = await fetch(`${getBase()}/api/language/status`);
            const st = await sr.json();
            if (st.progress) {
              const pct = Math.round((st.progress.step / st.progress.total) * 100);
              langProgressFill.style.width = pct + "%";
              langProgressText.textContent = st.progress.message || "处理中...";

              if (st.progress.done) {
                clearInterval(poll);
                btnLangGenerate.disabled = false;
                btnLangGenerate.querySelector(".btn-text").textContent = "生成学习卡片";
                btnLangGenerate.querySelector(".btn-spinner").hidden = true;

                if (st.progress.error) {
                  langProgressText.textContent = "错误: " + st.progress.error;
                } else {
                  langProgressFill.style.width = "100%";
                  langProgressText.textContent = st.progress.message;

                  // 显示结果
                  const r = st.progress.result;
                  if (r && r.langData) {
                    document.getElementById("lang-word").textContent = r.langData.word;
                    document.getElementById("lang-reading").textContent = r.langData.reading;
                    document.getElementById("lang-meaning").textContent = r.langData.meaning;

                    // 显示截图
                    const imgContainer = document.getElementById("lang-preview-img");
                    if (r.images && r.images.length > 0) {
                      const imgName = r.images[0].split("/").pop();
                      const dateStr = r.dateStr;
                      imgContainer.innerHTML = `<img src="${getBase()}/output/lang-${dateStr}/${imgName}" alt="语言学习卡片" style="width:100%;border-radius:12px;">`;
                    }
                    langResult.hidden = false;
                  }
                }
              }
            }
          } catch {}
        }, 1500);
      } catch (err) {
        langProgressText.textContent = "错误: " + err.message;
        btnLangGenerate.disabled = false;
        btnLangGenerate.querySelector(".btn-text").textContent = "生成学习卡片";
        btnLangGenerate.querySelector(".btn-spinner").hidden = true;
      }
    });
  }

  // ====== Init ======
  initIcons();
  showMain();
})();
