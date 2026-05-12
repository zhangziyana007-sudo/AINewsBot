# Garden Skills 研究报告与使用教程

> 研究日期：2026-05-08
> 项目地址：https://github.com/ConardLi/garden-skills
> 许可证：MIT
> 作者：[ConardLi](https://github.com/ConardLi)

---

## 一、项目概览

**Garden Skills** 是一个面向 AI 编码代理（Agent）的开源技能集合（Skills Collection），专为 Claude Code、Cursor、Codex CLI、Gemini CLI、OpenCode 等主流 AI 编码工具设计。

### 核心数据

| 指标 | 数值 |
|------|------|
| GitHub Stars | 2600+ |
| Forks | 407 |
| 许可证 | MIT |
| 语言构成 | CSS 44.1% / TypeScript 43.9% / JavaScript 9.9% / Shell 1.7% |
| Skill 数量 | 4 个 |
| 发布版本 | 8 个 Release |
| 贡献者 | 3 人 |
| 运行时依赖 | 零依赖（npm install 为 no-op） |
| 最低 Node 版本 | >= 20 |

### 项目定位

Garden Skills **不是**一个应用程序或框架，而是一套**标准化的 AI Agent 指令文件集合**。它通过结构化的 `SKILL.md` 文件，让 AI Agent 在特定场景下获得专业级的工作方法论和约束规则，从而输出更高质量的结果。

---

## 二、技能（Skill）详解

### 2.1 什么是 Skill？

Skill 是一个自包含的文件夹，Agent 可以按需加载。其核心是一个 `SKILL.md` 文件（YAML frontmatter + 指令），可选附带参考文档、脚本和素材：

```
<skill-name>/
├── SKILL.md        ← 必需：Agent 读取的指令（何时使用 + 如何工作）
├── manifest.json   ← 必需：name / version / category / compat
├── README.md       ← 人类阅读的文档
├── references/     ← 可选：Agent 按需加载的扩展文档
├── scripts/        ← 可选：确定性可执行代码
└── assets/         ← 可选：模板、字体、图标等素材
```

Agent 通过 `SKILL.md` frontmatter 中的 `description` 字段判断是否激活该 Skill——description 就是你和 Agent 之间的"契约"。

---

### 2.2 四个技能一览

| 技能 | 分类 | 适用场景 | 当前版本 |
|------|------|---------|---------|
| **web-video-presentation** | Web 视频 / 演示制作 | 文章/口播稿→可录屏的 16:9 网页演示 | v1.1.3 |
| **web-design-engineer** | 设计 / 前端 | 网页、落地页、仪表板、交互原型、HTML 幻灯片 | v1.0.0 |
| **gpt-image-2** | 图像生成 / 提示词工程 | 海报、UI 样机、产品图、信息图、学术图、漫画等 | v1.0.3 |
| **kb-retriever** | 检索 / 本地知识库 | 本地 knowledge/ 目录的问答检索 | v1.0.0 |

---

### 2.3 web-design-engineer（网页设计工程师）

**核心理念**：把 AI Agent 定位为顶级设计工程师，输出标准是"惊艳"而非"能用"。

#### 六步工作流

1. **理解需求** — 根据上下文决定是否提问，避免机械化的长问题列表
2. **收集设计上下文** — 优先读用户提供的素材 > 已有产品页面 > 行业最佳实践
3. **声明设计系统** — 在写代码前先用 Markdown 声明调色盘、字体、间距、圆角、阴影、动效
4. **展示 v0 草稿** — 快速产出带占位符的可视化原型，让用户尽早纠偏
5. **完整构建** — 基于确认的方向完善所有组件、状态、动画
6. **验证** — 逐项走完交付清单

#### 核心设计原则

- **反 AI 套路**：禁止紫粉渐变、emoji 滥用、圆角彩色边框卡片、Inter/Roboto 字体
- **占位 > 伪造**：缺图标用方块+标签、缺头像用首字母圆形、缺图片用比例占位卡
- **设计系统先行**：颜色用 `oklch()` 衍生、排版用 `clamp()` 流体字体
- **Tweaks 面板**：右下角浮动面板，可实时调整设计参数（主题色、字号、暗色模式等）

#### 支持的输出类型

- 交互原型（至少 3 个变体 + 完整状态覆盖）
- HTML 幻灯片（1920×1080 固定画布 + 键盘导航 + localStorage 持久化）
- 数据可视化仪表板（Chart.js / D3.js）
- CSS/JS 动画与视频演示
- 设计系统探索

---

### 2.4 web-video-presentation（网页视频演示）

**核心理念**：把文章或口播稿变成"伪装成网页的视频"——每次点击推进一个口播节拍，16:9 全屏，可录屏。

#### 四阶段工作流

```
Phase 1: 内容编写
  1.1 识别用户输入（原文/口播稿/什么都没有）
  1.2 一次产出 script.md + outline.md

  ▼ [Checkpoint Plan] 用户一次对齐 5 件事

Phase 2: 网页开发
  2.1 脚手架（Vite + React + TS）
  2.2 第1章：主线程 + 强制验收
  2.3 第2~N章：三种模式可选（逐章/顺序/并行）
  2.4 每章按 CHAPTER-CRAFT.md 开发

  ▼ [Checkpoint Audio] 是否合成音频

Phase 3: 音频合成（可选，MiniMax CLI）

Phase 4: 录屏 + 后期
```

#### 十条核心原则

| # | 原则 | 说明 |
|---|------|------|
| 1 | 16:9 固定舞台 | 1920×1080 + transform scale，不做响应式 |
| 2 | 全局 step 计数器 | 章节是 step 的纯函数，无定时器 |
| 3 | 每步独占整屏 | `if (step === N) return <FullScene />` |
| 4 | 口播节拍 = step | 一节拍 = 一 step = 一聚焦想法 |
| 5 | 隐藏控件 | 进度条/翻页器默认 opacity 0，悬浮时才显示 |
| 6 | 无 chrome | 无 header/footer/页码/品牌条 |
| 7 | 内容驱动动画 | 先找内在动作，找不到才用入场动画兜底 |
| 8 | 逐个揭示 | 列表项 1 项 = 1 step，禁止一次全展示 |
| 9 | 整片同一主题 | 颜色/字体走 token，章节间自由发挥 |
| 10 | 双源原则 | script 定节拍，article 定画面密度 |

#### 主题系统

内置多种视觉主题（paper-press、terminal-green 等），可通过 `theme.json` 自定义或创建新主题。

---

### 2.5 gpt-image-2（图像生成）

**核心理念**：面向 GPT Image 2 的聚焦型图像生成技能，支持三种运行模式自适应不同环境。

#### 三种运行模式

| 模式 | 触发条件 | 行为 |
|------|---------|------|
| **Mode A: Garden 本地** | `ENABLE_GARDEN_IMAGEGEN=1` + 有 `OPENAI_API_KEY` | 完整端到端：选模板→写 prompt→调脚本→出图落盘 |
| **Mode B: Host-Native** | 未启用 Garden，但宿主 Agent 有图像工具 | 退化为提示词工程指引，调用宿主工具出图 |
| **Mode C: Advisor** | 未启用 Garden，宿主也无图像工具 | 纯高质量 prompt 顾问，输出可复用的提示词 |

#### 18 大类模板（80+ 个）

| # | 分类 | 代表模板 |
|---|------|---------|
| 1 | 方法论总文档 | prompt-writing.md |
| 2 | UI Mockups | 直播带货、社交页面、聊天界面、短视频封面 |
| 3 | 产品视觉 | 爆炸视图、白底主图、影棚产品、包装展示 |
| 4 | 地图 | 美食地图、旅行路线、城市插画地图 |
| 5 | 幻灯片/视觉文档 | 高密度讲解、政策公告、商业报告 |
| 6 | 海报/Campaign | 品牌主海报、Campaign KV、杂志封面 |
| 7 | 人像/角色 | 职业肖像、VTuber、角色设定稿 |
| 8 | 场景插画 | 治愈系日常、概念大场景、绘本内页 |
| 9 | 编辑工作流 | 背景替换、对象去除、产品精修 |
| 10 | 头像/Profile | 风格化自拍、3D 图标式头像、贴纸套装 |
| 11 | 分镜/序列 | 4 格漫画、漫画跨页、广告分镜板 |
| 12 | 网格/拼贴 | 2×2 banner、lookbook、混合风格拼贴 |
| 13 | 品牌/包装 | 品牌识别系统、吉祥物套装、饮料标签 |
| 14 | 字面/排版 | 大字海报、中英双语版式 |
| 15 | 素材/道具 | 拟物图标集、游戏截图 mockup |
| 16 | 学术图 | 方法总览图、神经网络架构、定性对比 |
| 17 | 信息图 | 高密度科普、手绘信息图、KPI 仪表盘 |
| 18 | 技术图 | 系统架构、流程图、时序图、ER 图 |

---

### 2.6 kb-retriever（本地知识库检索）

**核心理念**：渐进式搜索，避免整文件加载，通过分层目录索引精确定位。

#### 工作流

1. **理解用户需求** — 提取关键词、时间范围、输出类型
2. **分层查看目录索引** — 从 `knowledge/` 根目录的 `data_structure.md` 开始，逐层下钻
3. **学习文件处理方法** — 遇到 PDF/Excel 时**强制先读取** references 中的处理方法
4. **按文件类型检索** — Markdown 用 grep + 局部读取；PDF 用 pdftotext/pdfplumber；Excel 用 pandas
5. **迭代检索** — 最多 5 轮，逐步缩小范围
6. **答案组织与溯源** — 结论 + 依据 + 来源文件信息

#### 关键约束

- 默认知识库路径：`knowledge/`，用户可自定义
- 禁止用 Glob 判断目录是否存在，必须用 `test -d`
- 遇到 PDF/Excel 必须先读取 `references/pdf_reading.md` 或 `references/excel_reading.md` 学习处理方法
- 禁止整文件读取，始终局部检索
- 禁止使用网络搜索

---

## 三、兼容性

| AI Agent | 技能存放目录 | 测试状态 |
|----------|-------------|---------|
| Claude Code | `.claude/skills/<name>/` 或通过 plugin marketplace | ✅ 已测试 |
| Claude.ai (网页版) | Settings → Capabilities → Skills | ✅ 已测试 |
| Cursor | `.agents/skills/<name>/` | ✅ 已测试 |
| Codex CLI | `.codex/skills/<name>/` | ✅ 已测试 |
| Gemini CLI | extension manifest | ✅ 已测试 |
| OpenCode | `.opencode/skills/<name>/` | ✅ 已测试 |

`SKILL.md` 格式是通用设计——只要你的 Agent 支持 Skills，把文件夹放到它扫描的目录即可。

---

## 四、安装教程

### 方式 A：skills CLI（推荐，最快）

使用社区的 [npx skills CLI](https://www.npmjs.com/package/skills)，自动检测 Agent 类型并安装到正确目录。

```bash
# 安装全部 4 个 Skill（最新版）
npx skills add ConardLi/garden-skills

# 只安装一个 Skill
npx skills add ConardLi/garden-skills -s web-design-engineer

# 安装到全局（~/.skills）
npx skills add ConardLi/garden-skills -s gpt-image-2 --global

# 指定 Agent 类型
npx skills add ConardLi/garden-skills -s kb-retriever -a claude-code
```

#### 钉版本安装（CI / 生产环境推荐）

```bash
npx skills add ConardLi/garden-skills/tree/web-design-engineer-v1.0.0/skills/web-design-engineer
```

#### 常用管理命令

```bash
npx skills list                 # 查看已安装
npx skills find web-design      # 搜索
npx skills update               # 更新全部
npx skills remove kb-retriever  # 卸载
```

---

### 方式 B：Claude Code 插件市场

```bash
/plugin marketplace add ConardLi/garden-skills
/plugin install presentation-skills@garden-skills
/plugin install web-design-skills@garden-skills
/plugin install knowledge-base-skills@garden-skills
/plugin install image-generation-skills@garden-skills
```

插件包对应关系：

| 插件包 | 包含技能 |
|--------|---------|
| presentation-skills | web-video-presentation |
| web-design-skills | web-design-engineer |
| knowledge-base-skills | kb-retriever |
| image-generation-skills | gpt-image-2 |

---

### 方式 C：下载 .zip（离线/CI 环境）

每次正式发版会生成不可变的 `.zip`（附 SHA-256 校验和），适合 CI、Dockerfile、离线安装。

```bash
SKILL=web-design-engineer
VERSION=1.0.0

# 下载 .zip
curl -fsSL -o "${SKILL}.zip" \
  "https://github.com/ConardLi/garden-skills/releases/download/${SKILL}-v${VERSION}/${SKILL}-${VERSION}.zip"

# 验证校验和（推荐）
curl -fsSL -o "${SKILL}.zip.sha256" \
  "https://github.com/ConardLi/garden-skills/releases/download/${SKILL}-v${VERSION}/${SKILL}-${VERSION}.zip.sha256"
shasum -a 256 -c "${SKILL}.zip.sha256"

# 解压到 Agent 目录
unzip -q "${SKILL}.zip" -d .claude/skills/   # Claude Code
# 或 .agents/skills/（Cursor）
# 或 .codex/skills/（Codex CLI）
```

---

### 方式 D：手动克隆

```bash
git clone https://github.com/ConardLi/garden-skills.git

# Claude Code
cp -r garden-skills/skills/web-design-engineer  your-project/.claude/skills/

# Cursor
cp -r garden-skills/skills/web-design-engineer  your-project/.agents/skills/
```

---

### 方式 E：Git Submodule

```bash
git submodule add https://github.com/ConardLi/garden-skills.git vendor/garden-skills
ln -s ../../vendor/garden-skills/skills/web-design-engineer .claude/skills/web-design-engineer

# 钉到特定版本
cd vendor/garden-skills
git checkout web-design-engineer-v1.0.0
```

---

## 五、使用教程

### 5.1 使用 web-design-engineer

安装 Skill 后，在 AI Agent 中直接下达设计类任务即可自动激活：

```
# 示例提示词
"帮我设计一个科技公司的落地页，目标用户是开发者"
"把这个 PRD 做成交互原型"
"用这个截图还原成可交互的网页"
"做一个 10 页的产品介绍幻灯片"
"设计一个数据可视化仪表板"
```

Agent 会自动走六步流程：理解需求 → 收集上下文 → 声明设计系统 → 展示 v0 → 完整构建 → 验证。

---

### 5.2 使用 web-video-presentation

```
# 示例提示词
"我有这篇文章，帮我做成视频"
"用这个口播稿生成可录屏的演示"
"做一个 B 站教学视频的网页演示"
```

Agent 会引导你完成：
1. 将文章转为口播稿 + 开发计划
2. 在 Checkpoint Plan 一次对齐 5 件事（稿子/outline/主题/素材/开发模式）
3. 使用脚手架生成 Vite + React + TS 项目
4. 逐章开发（每章可独立验收）
5. 可选合成音频 → 自动播放录屏

#### 录屏方式

| 场景 | 推荐路径 |
|------|---------|
| 已合成音频 | Auto 模式：`localhost:5173/?auto=1` → 按 SPACE → 一镜到底 |
| 未合成音频 | Manual 模式：手动点击推进 → 后期配音 |

---

### 5.3 使用 gpt-image-2

#### 第一步：检测运行模式（必须）

```bash
node skills/gpt-image-2/scripts/check-mode.js
```

#### Mode A：本地生图

```bash
# 环境变量
export ENABLE_GARDEN_IMAGEGEN=1
export OPENAI_API_KEY=sk-xxx

# 文本生图
node skills/gpt-image-2/scripts/generate.js \
  --prompt "A cute baby sea otter" \
  --size 1024x1024 \
  --quality high

# 用提示词文件生图
node skills/gpt-image-2/scripts/generate.js \
  --promptfile garden-gpt-image-2/prompt/poster-20260424.md

# 编辑已有图片
node skills/gpt-image-2/scripts/edit.js \
  --image assets/source.png \
  --prompt "Replace the background with a clean studio scene"

# 带遮罩的局部编辑
node skills/gpt-image-2/scripts/edit.js \
  --image assets/source.png \
  --mask assets/mask.png \
  --prompt "Replace only the masked area with a glass vase"
```

#### Mode B / C：通过 Agent 对话使用

在对话中直接描述你的图像需求即可：

```
"帮我做一张直播带货的截图样机"
"生成一张产品爆炸视图海报"
"做一张 4 格漫画"
"帮我设计品牌识别系统板"
```

Agent 会自动选取最匹配的模板，引导你补充缺失信息，然后渲染最终 prompt。

---

### 5.4 使用 kb-retriever

#### 准备工作

在项目根目录创建 `knowledge/` 文件夹，按主题组织文件，并在每个目录层级创建 `data_structure.md` 索引文件：

```
knowledge/
├── data_structure.md       ← 根索引：描述各子目录用途
├── sales/
│   ├── data_structure.md   ← 二级索引
│   ├── 2024_Q1_report.xlsx
│   └── 2024_Q2_report.xlsx
├── tech/
│   ├── data_structure.md
│   ├── api_docs.md
│   └── architecture.pdf
└── policies/
    ├── data_structure.md
    └── employee_handbook.pdf
```

#### 使用方式

安装 Skill 后在 Agent 中直接提问：

```
"2024 年 Q1 的销售额是多少？"
"API 超时的处理机制是什么？"
"员工请假流程是怎样的？"
```

Agent 会自动按分层索引导航到最相关的文件，渐进式检索答案。

---

## 六、项目结构

```
garden-skills/
├── skills/                          ← 所有 Skill
│   ├── web-video-presentation/
│   ├── web-design-engineer/
│   ├── gpt-image-2/
│   └── kb-retriever/
├── scripts/release/                 ← 发版工具（零依赖 Node ESM）
│   ├── cut-release.mjs              ← 交互式发版主入口
│   ├── pack-skill.mjs               ← 打包 .zip + .sha256
│   ├── update-readme.mjs            ← 重写 README 下载链接
│   ├── list-skills.mjs              ← 查看 manifest 状态
│   └── lib/skills.mjs               ← 共享辅助函数
├── .github/workflows/
│   ├── release-skill.yml            ← tag 触发的单 Skill 发版
│   └── validate-skills.yml          ← PR 守门 CI
├── .claude-plugin/
│   └── marketplace.json             ← Claude Code 插件市场清单
├── demo/                            ← 演示项目
├── dist/                            ← 共享素材
├── website/                         ← 展示网站
├── package.json                     ← 维护者脚本
├── README.md / README.zh-CN.md      ← 用户首页
└── CONTRIBUTING.md / CONTRIBUTING.zh-CN.md
```

---

## 七、贡献指南摘要

### 新增 Skill

1. 创建 `skills/<name>/`，至少包含 `SKILL.md` + `manifest.json`
2. 在 README 中添加 DOWNLOAD marker
3. 运行 `npm run readme:sync` 填充占位符
4. 运行 `npm run validate` 确认通过
5. 开 PR，CI 会自动校验
6. 合并后用 `npm run release` 发首版

### 版本号规则（SemVer，每个 Skill 独立版本）

| 变更类型 | Bump |
|---------|------|
| 拼写修正、新增可选 reference | **patch** |
| SKILL.md 工作流改动、references 结构调整 | **minor** |
| 重命名 Skill、删除文件、frontmatter 破坏性变更 | **major** |

### 常用维护命令

```bash
npm run list          # 列出所有 Skill + manifest 状态
npm run validate      # 和 CI 完全一样的全套检查
npm run release       # 交互式发版
npm run release:dry   # 预览（不写不推）
npm run pack          # 打包单个 Skill
npm run readme:sync   # 重写 README 下载链接
```

---

## 八、设计亮点与优势

### 架构优势

1. **零依赖** — 无供应链攻击面，任何 Node 20+ 环境直接可用
2. **Agent 无关** — SKILL.md 格式通用，适配所有主流 AI 编码工具
3. **每 Skill 独立版本** — 各自迭代，不互相干扰
4. **不可变发布** — .zip + SHA-256 校验，适合 CI 钉版本
5. **自动化完善** — CI 自动校验结构、发版自动同步 README 链接

### 内容优势

1. **方法论驱动** — 不是简单的提示词模板，而是完整的工作流 + 设计原则 + 反模式清单
2. **硬性检查点** — 关键节点强制停下等人类确认（如 Checkpoint Plan）
3. **自检协议** — 产出物必须走自检清单，不达标必须修复后再汇报
4. **反 AI 味** — 专门的反 AI 套路规则，避免千篇一律的 AI 风格
5. **双源原则** — script 定节拍 + article 定画面密度，保证信息密度

---

## 九、总结与建议

Garden Skills 是目前最成熟的 AI Agent 技能集合之一，特别适合以下场景：

- **设计/前端开发者**：用 web-design-engineer 显著提升 AI 输出的视觉品质
- **内容创作者**：用 web-video-presentation 将文章快速转为可录屏的视频演示
- **设计师/营销人员**：用 gpt-image-2 的 80+ 模板高效生成专业级图像
- **知识工作者**：用 kb-retriever 高效检索本地文档库

**建议上手路径**：先从 web-design-engineer 开始体验，它是最通用的、效果最直观的技能。安装只需一行命令，使用时在 Agent 中自然描述设计需求即可。
