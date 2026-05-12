# 小红书 AI 日报图文笔记 — 实现方案

> 需求：用 garden-skills 的 web-design-engineer 方法论生成好看的 HTML 模板（3:4 小红书图文比例），填入 aihot API 的每日 AI 新闻数据，制作成可发布的小红书图文笔记。

---

## 方案总览

| 方案 | 技术栈 | 自动化程度 | 适合场景 |
|------|--------|----------|---------|
| **A. Node.js 全自动流水线** | Node + Puppeteer + aihot API | ⭐⭐⭐ 全自动 | 每天定时生成，无人值守 |
| **B. Vite + React 可视化编辑** | Vite + React + TS | ⭐⭐ 半自动 | 需要手动调整排版和内容 |
| **C. 纯静态 HTML 模板** | HTML + CSS + JS | ⭐ 手动 | 快速验证效果，最简单 |

**推荐方案 A**，下面详细展开。

---

## 方案 A：Node.js 全自动流水线（推荐）

### 架构

```
aihot API ──→ 数据抓取脚本 ──→ 数据格式化 ──→ HTML 模板渲染 ──→ Puppeteer 截图 ──→ 3:4 PNG 图片
                                                                                    ↓
                                                                              输出到 output/
                                                                              (可选) 自动发布
```

### 目录结构

```
AIbot/
├── package.json
├── src/
│   ├── fetch-daily.js        # 从 aihot API 拉取日报数据
│   ├── render-template.js    # 将数据渲染到 HTML 模板
│   ├── screenshot.js         # Puppeteer 截图生成 PNG
│   └── index.js              # 主入口（串联流水线）
├── templates/
│   ├── daily-cover.html      # 封面模板（第 1 张图）
│   ├── daily-section.html    # 版块内容模板（第 2~N 张图）
│   └── styles.css            # 共享样式（遵循 web-design-engineer 设计原则）
├── output/                   # 生成的图片输出
│   └── 2026-05-08/
│       ├── 01-cover.png
│       ├── 02-模型发布.png
│       ├── 03-产品发布.png
│       ├── 04-行业动态.png
│       ├── 05-论文研究.png
│       └── 06-技巧与观点.png
└── cron.sh                   # 定时任务脚本
```

### 关键尺寸

小红书图文推荐尺寸：

| 比例 | 像素 | 适用 |
|------|------|------|
| **3:4** | **1080 × 1440** | ✅ 图文笔记标准尺寸 |
| 1:1 | 1080 × 1080 | 正方形（备选） |
| 4:3 | 1440 × 1080 | 横版（不推荐图文） |

**采用 1080 × 1440px**，Puppeteer viewport 设置为此尺寸直接截图。

### 核心代码思路

#### 1. 数据抓取 (`fetch-daily.js`)

```javascript
const UA = "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) ...";

async function fetchDaily(date) {
  const url = date
    ? `https://aihot.virxact.com/api/public/daily/${date}`
    : "https://aihot.virxact.com/api/public/daily";

  const resp = await fetch(url, { headers: { "User-Agent": UA } });
  if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
  return resp.json();
}

// 也可以拉精选条目（更新更快）
async function fetchSelected(since = "24h") {
  const sinceDate = new Date(Date.now() - parseDuration(since)).toISOString();
  const url = `https://aihot.virxact.com/api/public/items?mode=selected&since=${sinceDate}&take=50`;
  const resp = await fetch(url, { headers: { "User-Agent": UA } });
  return resp.json();
}
```

#### 2. HTML 模板设计原则（遵循 web-design-engineer）

```css
/* 3:4 固定画布 */
.card {
  width: 1080px;
  height: 1440px;
  overflow: hidden;
  position: relative;
  /* 设计系统 - 不用 Inter/Roboto，不用紫粉渐变 */
  font-family: "PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif;
  background: #0f0f0f;  /* 深色背景更有科技感 */
  color: #f5f5f5;
}

/* oklch 衍生配色 */
:root {
  --brand-primary: oklch(0.65 0.2 250);      /* 科技蓝 */
  --brand-accent: oklch(0.75 0.15 160);      /* 薄荷绿点缀 */
  --text-primary: oklch(0.95 0 0);
  --text-secondary: oklch(0.65 0 0);
  --surface-1: oklch(0.15 0.01 250);
  --surface-2: oklch(0.2 0.01 250);
  --border: oklch(0.3 0.01 250);
}
```

#### 3. 封面模板示意 (`daily-cover.html`)

```
┌──────────────────────────┐  1080px
│                          │
│    🔥 AI HOT 日报        │  品牌标识区
│    2026.05.08            │
│                          │
│  ┌──────────────────┐    │
│  │ 主编点评 / Lead   │    │  Lead 区域
│  │ 今日 AI 圈最大的  │    │
│  │ 新闻是...        │    │
│  └──────────────────┘    │
│                          │
│  📊 模型发布  5 条       │  版块预览
│  🚀 产品发布  3 条       │
│  🌐 行业动态  8 条       │
│  📄 论文研究  4 条       │
│  💡 技巧观点  2 条       │
│                          │
│  共 22 条 · 向右滑看详情  │  引导语
│                          │
│  aihot.virxact.com       │  来源水印
└──────────────────────────┘  1440px
```

#### 4. Puppeteer 截图 (`screenshot.js`)

```javascript
import puppeteer from "puppeteer";

async function screenshotHTML(htmlPath, outputPath) {
  const browser = await puppeteer.launch({ headless: "new" });
  const page = await browser.newPage();

  await page.setViewport({ width: 1080, height: 1440, deviceScaleFactor: 2 });
  await page.goto(`file://${htmlPath}`, { waitUntil: "networkidle0" });

  await page.screenshot({
    path: outputPath,
    type: "png",
    clip: { x: 0, y: 0, width: 1080, height: 1440 },
  });

  await browser.close();
}
```

#### 5. 定时任务 (`cron.sh`)

```bash
#!/bin/bash
# 每天北京时间 08:30 执行（日报 08:00 生成）
# crontab: 30 0 * * * /home/ts/AIbot/cron.sh

cd /home/ts/AIbot
node src/index.js

echo "✅ $(date) — 日报图片已生成到 output/$(date +%Y-%m-%d)/"
```

---

## 小红书图文排版设计建议

### 遵循 web-design-engineer 的反 AI 味原则

| 要做 | 不要做 |
|------|--------|
| 深色/浅色主题二选一，统一 | ❌ 紫粉渐变背景 |
| 中文字体用苹方/思源 | ❌ Inter / Roboto |
| oklch() 衍生配色 | ❌ 随机鲜艳色 |
| 留白 + 大字号对比 | ❌ 密密麻麻塞满 |
| 编号 + 简洁标题 | ❌ emoji 堆砌 |
| 品牌色一致 | ❌ 每张卡片换色 |

### 多图笔记建议结构（5~9 张）

| 张数 | 内容 | 模板 |
|------|------|------|
| 第 1 张 | **封面** — 日期 + Lead 标题 + 版块条数预览 | daily-cover.html |
| 第 2 张 | **模型发布/更新** — 每条一行标题 + 一句话摘要 | daily-section.html |
| 第 3 张 | **产品发布/更新** | daily-section.html |
| 第 4 张 | **行业动态** | daily-section.html |
| 第 5 张 | **论文研究** | daily-section.html |
| 第 6 张 | **技巧与观点** | daily-section.html |
| 第 7 张 | （可选）**快讯 Flashes** | daily-section.html |
| 第 8 张 | （可选）**数据看板** — 本周趋势/热门关键词 | daily-stats.html |
| 第 9 张 | （可选）**关注引导** — 二维码 + 订阅 RSS | daily-cta.html |

### 每张卡片内容容量建议

- 1080×1440 画布大字可读情况下，每张放 **4~6 条新闻**最佳
- 标题 ≤ 25 字（超长截断 + 省略号）
- 摘要 ≤ 50 字（一句话版本）
- 来源 + 相对时间放在行尾灰色小字

---

## 快速启动步骤

```bash
cd /home/ts/AIbot

# 1. 初始化项目
npm init -y
npm install puppeteer

# 2. 创建目录结构
mkdir -p src templates output

# 3. 开发模板（先用浏览器打开 HTML 预览效果）
# 4. 开发抓取 + 渲染 + 截图脚本
# 5. 测试：node src/index.js
# 6. 配置 crontab 定时执行
```

---

## 扩展方向

1. **自动发布**：接入小红书 API 或 RPA 工具（如 Playwright）自动发布
2. **多风格主题**：参考 web-video-presentation 的主题系统，做多套视觉风格
3. **GPT Image 封面**：用 gpt-image-2 skill 的模板为每期日报生成独特封面插画
4. **交互式预览**：用 Vite + React 做一个可视化编辑器，手动微调后再截图
5. **RSS 订阅**：aihot 也提供 RSS，可以作为备用数据源
