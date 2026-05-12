# AI HOT Skill 研究报告与使用教程

> 研究日期：2026-05-08
> 项目地址：https://aihot.virxact.com/aihot-skill/
> 源码仓库：https://github.com/KKKKhazix/khazix-skills/tree/main/aihot
> 许可证：MIT
> 数据源：https://aihot.virxact.com

---

## 一、项目概览

**AI HOT Skill** 是一个面向 AI 编码代理（Agent）的资讯查询技能，让 Agent 能够直接通过公开 REST API 获取 [aihot.virxact.com](https://aihot.virxact.com) 上每天的 AI 行业日报和全部 AI 动态，无需打开浏览器。

### 核心数据

| 指标 | 说明 |
|------|------|
| 许可证 | MIT |
| 数据源 | aihot.virxact.com（公开免费，匿名可访） |
| API 鉴权 | 无需 API Key |
| 限流 | 600 req/min/IP |
| 数据范围 | items 端点最近 7 天；日报归档可追溯更早 |
| 日报更新时间 | 每天北京时间 08:00 自动生成 |
| 格式标准 | SKILL.md（Anthropic Agent Skills 规范） |

### 项目定位

AI HOT Skill 解决的核心问题是：**让 AI Agent 回答"今天 AI 圈有什么"时不再依赖过时的训练数据，而是实时查询当天的新鲜资讯**。

它与 Garden Skills 不同——Garden Skills 是"方法论+工作流"型的技能（教 Agent 如何设计/生成），而 AI HOT Skill 是"数据接入"型的技能（给 Agent 接入一个实时数据源）。

---

## 二、兼容性

跨平台支持所有遵循 SKILL.md 标准的 Agent：

- Claude Code
- Codex CLI
- Cursor
- Gemini CLI
- GitHub Copilot
- OpenCode
- Cline
- Windsurf
- 任何支持 SKILL.md 格式的 Agent

---

## 三、数据源介绍：AI HOT

[AI HOT](https://aihot.virxact.com) 是一个面向**中文 AI 创业者**的资讯站：

- **每天早上 08:00**（北京时间）自动生成版块化日报
- **全天持续**抓取并通过 LLM 评分筛选出精选条目
- 内容覆盖 5 个版块：模型发布/更新、产品发布/更新、行业动态、论文研究、技巧与观点
- 数据 100% 公开免费，匿名可访

---

## 四、API 端点详解

### 4.1 端点一览

| 端点 | 用途 | 主要参数 |
|------|------|---------|
| `GET /api/public/daily` | 最新日报 | 无 |
| `GET /api/public/daily/{YYYY-MM-DD}` | 指定日期日报 | path: `date` |
| `GET /api/public/dailies` | 日报归档列表 | `take` (1-180, 默认 30) |
| `GET /api/public/items` | 全部 AI 动态 | `mode` / `category` / `since` / `take` / `cursor` / `q` |

**Base URL**：`https://aihot.virxact.com`

### 4.2 items 端点参数

| 参数 | 说明 | 取值 |
|------|------|------|
| `mode` | 数据池 | `selected`（精选，默认）/ `all`（全部） |
| `category` | 分类筛选 | `ai-models` / `ai-products` / `industry` / `paper` / `tip` |
| `since` | 时间窗口 | ISO 8601（最近 7 天，不传默认 7 天） |
| `take` | 每页条数 | 1-100 |
| `cursor` | 翻页游标 | 不透明 token，从上次响应的 `nextCursor` 获取 |
| `q` | 关键词搜索 | 在 title + 中文 title + 中文 summary 三列 ILIKE 匹配 |

### 4.3 分类对应关系

| items API `category` | 日报 `sections[].label` |
|----------------------|------------------------|
| `ai-models` | 模型发布/更新 |
| `ai-products` | 产品发布/更新 |
| `industry` | 行业动态 |
| `paper` | 论文研究 |
| `tip` | 技巧与观点 |

### 4.4 响应数据格式

#### daily 返回

```json
{
  "date": "2026-05-07",
  "generatedAt": "2026-05-07T00:01:23.456Z",
  "windowStart": "2026-05-06T00:00:00.000Z",
  "windowEnd": "2026-05-07T00:00:00.000Z",
  "lead": { "title": "...", "leadParagraph": "..." },
  "sections": [
    {
      "label": "模型发布/更新",
      "items": [
        {
          "title": "...",
          "summary": "...",
          "sourceUrl": "https://...",
          "sourceName": "OpenAI Blog"
        }
      ]
    }
  ],
  "flashes": [
    { "title": "...", "sourceName": "...", "sourceUrl": "...", "publishedAt": "..." }
  ]
}
```

#### items 返回

```json
{
  "count": 50,
  "hasNext": true,
  "nextCursor": "eyJhIjoxNzE0...",
  "items": [
    {
      "id": "cm9abc456def789ghi012jkl3",
      "title": "中文标题",
      "title_en": "原英文标题（可空）",
      "url": "https://...",
      "source": "OpenAI Blog",
      "publishedAt": "2026-05-07T15:30:00.000Z",
      "summary": "中文摘要（LLM 生成）",
      "category": "ai-models"
    }
  ]
}
```

---

## 五、核心路由逻辑

Skill 的核心设计是一个**语义路由器**，根据用户的自然语言自动选择正确的 API 端点：

### 路由优先级（第一原则）

**默认走精选** `items?mode=selected` — 它是 AI HOT 每天精挑细选的"主菜单"。

| 用户说的 | 路由到 |
|---------|-------|
| "今天 AI 圈有什么" / "过去 24 小时大新闻" / "最近 AI 有啥" | `items?mode=selected&since=<时间窗>` |
| "AI 日报" / "今天的日报" / "看下日报" | `daily`（仅用户说"日报"二字才走） |
| "看下全部 / 完整 / 所有 AI 动态" | `items?mode=all`（仅用户说"全部"才走） |
| "昨天 AI 日报" / "5月6号的日报" | `daily/{YYYY-MM-DD}` |
| "最近几天日报有哪些" | `dailies?take=N` |
| "最近的模型发布" / "AI 论文" | `items?mode=selected&category=...&since=<7d>` |
| "OpenAI 最近发的" / "Sora 相关" | `items?q=<关键词>` |

### 关键设计决策

1. **精选 > 日报 > 全部**：精选是实时滚动的高质量池子；日报是 UTC 0 点切片的成品；全部包含未精选的次要条目
2. **`since` 对齐语义**：用户说"最近 3 天"就传 3d，不要依赖服务端默认 7d
3. **server-side 搜索**：关键词用 `?q=` 参数走 PostgreSQL pg_trgm 索引，不要客户端 grep
4. **时间转人话**：UTC ISO 8601 必须转为北京时间 + 相对时间展示

---

## 六、安装教程

### 方式 A：让 Agent 自动安装（最简单）

在你的 AI Agent（Claude Code / Codex 等）中直接发送：

```
帮我安装这个 skill：https://aihot.virxact.com/aihot-skill/
```

Agent 会自动 fetch SKILL.md 并写入对应平台的 skills 目录。

---

### 方式 B：一行命令手动安装

```bash
# 默认安装到 ~/.claude/skills/aihot/
curl -fsSL https://aihot.virxact.com/aihot-skill/install.sh | bash
```

#### 安装到其他 Agent 平台

```bash
# Codex CLI
SKILL_DIR=~/.codex/skills/aihot \
  bash <(curl -fsSL https://aihot.virxact.com/aihot-skill/install.sh)

# Cursor
SKILL_DIR=~/.cursor/skills/aihot \
  bash <(curl -fsSL https://aihot.virxact.com/aihot-skill/install.sh)

# OpenCode
SKILL_DIR=~/.opencode/skills/aihot \
  bash <(curl -fsSL https://aihot.virxact.com/aihot-skill/install.sh)
```

> 安装脚本只做 `mkdir` + `curl` 三个文件，不 chmod 不 sudo，可以先审查脚本内容。

---

### 方式 C：从仓库拉取

Skill 同步到了 Skills 合集仓库：

```bash
git clone https://github.com/KKKKhazix/khazix-skills.git
cp -r khazix-skills/aihot ~/.claude/skills/aihot
```

---

## 七、使用教程

### 7.1 基本用法

安装 Skill 后，在 Agent 中用自然语言提问即可自动触发：

```
# 宽问题（默认走精选 + 时间窗）
"今天 AI 圈有什么新东西？"
"过去 24 小时大新闻"
"最近 AI 有啥"

# 日报（必须说"日报"二字）
"看一下今天的 AI 日报"
"昨天的 AI 日报"
"5月6号的日报"

# 分类查询
"最近一周的 AI 论文"
"AI 模型发布列表"
"最近 3 天 AI 行业动态"

# 公司/关键词查询
"最近 OpenAI 有什么发布？"
"Sora 相关的新闻"
"RAG 论文"

# 精选/全部
"看下精选条目"
"看下今天全部的 AI 动态"
```

### 7.2 直接调用 API（开发者使用）

如果你想在自己的应用中接入 AI HOT 数据，可以直接调用 REST API：

```bash
# 设置 User-Agent（API 端点必须）
UA="Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

# 拉最新日报
curl -sH "User-Agent: $UA" "https://aihot.virxact.com/api/public/daily"

# 拉指定日期日报
curl -sH "User-Agent: $UA" "https://aihot.virxact.com/api/public/daily/2026-05-07"

# 拉日报归档（最近 14 天）
curl -sH "User-Agent: $UA" "https://aihot.virxact.com/api/public/dailies?take=14"

# 拉最近 24 小时精选
since=$(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%SZ)
curl -sH "User-Agent: $UA" \
  "https://aihot.virxact.com/api/public/items?mode=selected&since=$since&take=50"

# 拉最近 50 条精选
curl -sH "User-Agent: $UA" \
  "https://aihot.virxact.com/api/public/items?mode=selected&take=50"

# 按分类拉（如论文）
curl -sH "User-Agent: $UA" \
  "https://aihot.virxact.com/api/public/items?mode=selected&category=paper&take=50"

# 关键词搜索
curl -sH "User-Agent: $UA" \
  "https://aihot.virxact.com/api/public/items?q=OpenAI&take=30"

# 翻页
resp=$(curl -sH "User-Agent: $UA" "https://aihot.virxact.com/api/public/items?mode=all&take=100")
cursor=$(echo "$resp" | jq -r '.nextCursor')
curl -sH "User-Agent: $UA" \
  "https://aihot.virxact.com/api/public/items?mode=all&take=100&cursor=$cursor"
```

### 7.3 注意事项

#### 必须带 User-Agent

`/api/public/*` 端点有 nginx UA 黑名单，默认 `curl/X.Y` 会被 403。**所有 API 调用必须带浏览器 UA**。

> 但 `/aihot-skill/{install.sh,SKILL.md,README.md}` 安装入口**已豁免** UA 黑名单，可直接 curl。

#### 时间处理

- `publishedAt` 是 ISO 8601 UTC，展示给用户时需转为北京时间
- 日报按 UTC 0 点切片（即北京时间 08:00），与"过去 24 小时"的时间窗不等价
- `since` 参数限最近 7 天，不传默认 7d 兜底

#### 翻页

- `cursor` 是不透明 token，不要尝试解析、递增或跨端点复用
- `hasNext = false` 或 `nextCursor = null` 时停止
- 串行调用，不要并发猛拉

---

## 八、常见错误处理

| 状态码 | 错误信息 | 解决方案 |
|--------|---------|---------|
| 404 | `No daily report available yet.` | 当天日报未生成（北京 08:00 前），拉昨天日报 |
| 400 | `Invalid date format...` | date 必须是 `YYYY-MM-DD` |
| 400 | `invalid mode` | mode 只能是 `selected` 或 `all` |
| 400 | `invalid category` | 见分类取值集 |
| 400 | `invalid since (must be ISO date, not in future)` | since 不能是未来时间 |
| 400 | `invalid take (must be integer 1-100)` | take 范围 1-100 |
| 403 | Forbidden | 缺少 User-Agent 头 |
| 429 | 限流 | 超过 600 req/min/IP，串行调用 + 加间隔 |

---

## 九、输出规范（Skill 设计要点）

AI HOT Skill 对 Agent 的输出有严格规范，体现了良好的用户体验设计：

### 做

- ✅ 用中文 markdown 简报格式输出
- ✅ 编号贯穿全文（1, 2, 3 ... N），不在每个版块内重新计数
- ✅ 时间转人话（"今天上午 09:48" / "2 小时前"）
- ✅ 每条保留 URL（可追溯原文）
- ✅ 默认输出 `title`（中文），不两个都展示

### 不做

- ❌ 暴露端点路径 / raw 参数 / 限流 / 缓存 TTL / cursor 等基础设施细节
- ❌ 把 API 调用细节当作引用源
- ❌ 展示 ISO 8601 原始字符串
- ❌ 凭训练数据脑补（永远以 API 返回为准）
- ❌ 把 summary 当原文引用（摘要是 LLM 生成的）
- ❌ 高频轮询（日报每天更新一次，items 有 5 分钟缓存）

---

## 十、与 Garden Skills 对比

| 维度 | AI HOT Skill | Garden Skills |
|------|-------------|---------------|
| 类型 | 数据接入型（实时资讯查询） | 方法论型（工作流+设计原则） |
| 数量 | 1 个 Skill | 4 个 Skill |
| 依赖 | 无（只需 curl） | 无运行时依赖 |
| 数据源 | aihot.virxact.com REST API | 无外部数据源 |
| 鉴权 | 无需 API Key | 部分功能需 OPENAI_API_KEY |
| 技能范围 | AI 行业资讯查询 | 网页设计/视频演示/图像生成/知识库检索 |
| 安装方式 | curl 一行/Agent 自动装 | npx skills CLI / Claude 市场 / zip |
| 输出 | 中文 markdown 简报 | 网页/代码/图像/文本 |

---

## 十一、技术架构亮点

1. **语义路由器设计**：通过关键词匹配（"日报"→ daily，"全部"→ mode=all）自动选择正确端点，用户无需了解 API 结构
2. **精选优先原则**：默认走精选池（aiSelected=true），只有用户明确要求才走全部，保证信息质量
3. **server-side 搜索**：利用 PostgreSQL pg_trgm GIN 索引（2-6ms）进行关键词搜索，避免客户端 grep 的漏匹配问题
4. **人话输出约束**：严格禁止在用户输出中暴露 API 细节，所有技术信息转为人类可读形式
5. **UA 黑名单豁免**：安装入口特意豁免 UA 检查，保证 `curl | bash` 一行安装体验
6. **OpenAPI 3.1 规范**：完整 API 规范见 `https://aihot.virxact.com/openapi.yaml`

---

## 十二、总结与建议

AI HOT Skill 是一个**轻量但精心设计**的 Agent Skill，特别适合：

- **AI 从业者/创业者**：每天用一句话获取 AI 行业最新动态
- **技术研究者**：按分类追踪 AI 论文和模型发布
- **产品经理**：跟踪 AI 产品发布和行业趋势
- **内容创作者**：快速获取 AI 资讯素材

**建议上手路径**：

1. 用方式 A（让 Agent 自动装）安装
2. 直接问 "今天 AI 圈有什么" 体验一下
3. 根据需要使用分类查询（"最近的 AI 论文"）或关键词搜索（"OpenAI 最近发的"）
