# 7 招教你去除 AI 味儿 — 干货笔记

> **视频来源**: [AI 做的网站丑爆了？7 招教你去除 AI 味儿！AI编程必学技巧](https://www.bilibili.com/video/BV1QF6EBiErM/)
> **UP主**: 程序员鱼皮（前腾讯开发）
> **时长**: 11:40 | **发布日期**: 2026-01-28
> **数据**: 9.3万播放 · 3297赞 · 5382收藏
> **适用工具**: Cursor、Claude Code、Windsurf、Trae 等 AI 编程工具
> **核心目标**: 让 AI 生成的网站看起来像专业设计师做的
> **适用范围**: 主要针对 Landing Page、展示型网站、SaaS 官网等前端页面。后台管理系统、数据可视化大屏、移动端 H5 等场景可参考核心原则，但具体组件库选择和设计模式会有差异。
> **时效说明**: 本文工具信息截至 2026-01 验证可用，第三方工具（如 Google Stitch、21st.dev）可能随时变更，请以官方最新状态为准。

---

## 背景：为什么 AI 生成的网站有"AI味"？

用 AI 编程工具（Cursor、Claude Code 等）直接生成的网站，通常存在以下"AI味"特征：

- **配色单一**：偏好蓝白灰、渐变滥用、缺乏品牌感
- **布局模板化**：千篇一律的 hero + features + footer 三段式
- **字体排版粗糙**：字号层级混乱、行间距不当、中文字体回退不佳
- **组件廉价感**：默认圆角卡片、无质感阴影、hover 动效缺失
- **细节缺失**：没有微交互、空状态、加载动画等精致化处理

---

## 核心原则（先理解再动手）

在进入具体 7 招之前，理解以下 3 条核心原则，才能真正知道每一招在解决什么问题：

### 原则一：设计和编码分离
不要让 AI 同时当设计师和程序员。AI 编程工具擅长写代码，但审美判断力有限。先用专业工具或人工确定设计方向，再交给 AI 实现——这是第 1、2、5 招的底层逻辑。

### 原则二：给 AI 约束而非自由
越具体的规则，越好的输出。"做一个好看的页面"不如"参考 Linear.app 风格，使用 shadcn/ui，主色 #4F8EF7，圆角 8px"。这是第 3、4、6 招的底层逻辑。

### 原则三：参考优秀作品
AI 需要"审美基准线"。没有参考的 AI 只会输出"统计平均值"的设计——安全但平庸。这是第 1、7 招的底层逻辑。

---

## 7 招核心干货

### 第 1 招：使用优质前端设计参考资源

**核心理念**：让 AI 有"审美标杆"可以参考，而不是凭空生成。

**推荐资源**：
| 资源 | 用途 |
|------|------|
| [Dribbble](https://dribbble.com) | 高质量 UI 设计稿灵感 |
| [Behance](https://behance.net) | 完整项目设计案例 |
| [Awwwards](https://awwwards.com) | 获奖网站参考 |
| [Mobbin](https://mobbin.com) | 移动端 UI 模式库 |
| [Godly](https://godly.website) | 精选网页设计集合 |
| [Landingfolio](https://landingfolio.com) | Landing Page 设计参考 |

**实操要点**：
- 找到符合目标风格的参考设计截图
- 在提示词中附上参考图或描述参考网站的设计特征
- 要求 AI 按照特定设计风格（如"极简主义"、"brutalism"、"glassmorphism"）来实现

---

### 第 2 招：使用 Google Stitch 进行 AI 原生设计

**核心理念**：用专业的 AI 设计工具先出设计稿，再交给 AI 编程工具实现。

**Google Stitch** 是 Google Labs 推出的 AI 原生设计工具，特点：
- 支持自然语言描述生成完整的 UI 设计
- 可以导出为 HTML/CSS 代码
- 自带专业级的设计规范（间距、配色、排版）

**工作流程**：
1. 在 Stitch 中用自然语言描述你想要的页面
2. Stitch 生成专业级设计稿
3. 导出代码或截图作为参考
4. 交给 Cursor/Claude Code 基于设计稿实现完整功能

**优势**：避免从零让 AI 编程工具同时承担"设计"和"编码"两个角色。

---

### 第 3 招：使用专业前端 UI 组件库

**核心理念**：用经过专业设计师打磨的组件，替换 AI 默认生成的"裸组件"。

**推荐组件库**：
| 组件库 | 特点 | 适用场景 |
|--------|------|----------|
| [shadcn/ui](https://ui.shadcn.com) | 可定制、高质量、React/Next.js | 通用 Web 应用 |
| [Tailwind UI](https://tailwindui.com) | 官方出品、企业级 | 商业项目 |
| [Magic UI](https://magicui.design) | 动效丰富、现代感强 | Landing Page |
| [Aceternity UI](https://ui.aceternity.com) | 炫酷动画组件 | 展示型网站 |
| [Radix UI](https://radix-ui.com) | 无障碍、高可用 | 应用级项目 |
| [daisyUI](https://daisyui.com) | 轻量、Tailwind 插件 | 快速原型 |

**Vue 生态推荐**（国内开发者常用）：
| 组件库 | 特点 | 适用场景 |
|--------|------|----------|
| [Naive UI](https://www.naiveui.com) | 高质量、TypeScript、主题定制强 | Vue 3 通用应用 |
| [Element Plus](https://element-plus.org) | 社区最大、文档中文友好 | 中后台管理系统 |
| [Ant Design Vue](https://antdv.com) | 蚂蚁设计语言、企业级 | 企业后台 |
| [Vuetify](https://vuetifyjs.com) | Material Design 风格 | Material 风格项目 |
| [PrimeVue](https://primevue.org) | 主题丰富、无障碍 | 需要多主题切换 |

**实操要点**：
- 在提示词中明确指定使用的组件库：`"使用 shadcn/ui 组件库实现"`
- 提前安装好依赖，让 AI 基于已有组件开发
- 引导 AI 使用组件库的设计变体（variants）而非自定义样式

---

### 第 4 招：编写 AGENTS.md 规则文件

**核心理念**：通过规则文件"训练" AI 编程助手的行为模式，让它遵循你的设计规范。

**AGENTS.md** 是放在项目根目录的指令文件，AI 编程工具会自动读取并遵循其中的规则。

**示例 AGENTS.md（设计规范部分）**：

```markdown
# 设计规范

## 配色
- 主色调：#4F8EF7（品牌蓝）
- 辅助色：#A78BFA（紫）, #34D399（绿）
- 背景色：#FAFAFA（浅灰）
- 文本色：#1A1A2E（深色）, #6B7280（次要）

## 排版
- 标题字体：Inter / 思源黑体
- 正文字号：16px，行高 1.7
- 标题层级：h1=36px, h2=28px, h3=22px

## 组件规范
- 圆角：8px（小组件）, 16px（卡片）, 24px（大容器）
- 阴影：使用 Tailwind 的 shadow-sm / shadow-md
- 间距：使用 8px 网格系统

## 禁止事项
- 不要使用渐变背景作为主背景
- 不要使用纯黑 #000000 作为文本颜色
- 不要使用默认浏览器表单样式
- 不要在同一页面使用超过 3 种颜色
```

**关键**：AGENTS.md 越详细具体，AI 生成的代码越"去AI味"。

---

### 第 5 招：集成 MCP 协议获取设计上下文

**核心理念**：通过 MCP（Model Context Protocol）让 AI 编程工具能访问外部设计资源和工具。

**MCP 是什么**：
- Model Context Protocol，由 Anthropic 提出的开放协议
- 让 AI 模型能够连接外部数据源和工具
- Cursor、Claude Code、VS Code Copilot、Windsurf 等工具已原生支持
- 官方文档：[modelcontextprotocol.io](https://modelcontextprotocol.io)

**设计相关的 MCP 应用**：
| MCP Server | 用途 | 获取方式 |
|------------|------|----------|
| [Figma MCP](https://github.com/nicepkg/figma-mcp) | AI 直接读取 Figma 设计稿并转代码 | npm 安装 |
| [Context7](https://github.com/upstash/context7) | 实时查询组件库最新文档，避免过时 API | npm 安装 |
| [Browser MCP](https://github.com/nicepkg/browser-use-mcp-server) | AI 截图参考网站并分析设计风格 | pip 安装 |
| [Framelink Figma](https://www.framelink.ai/) | 从 Figma 提取设计 Token（颜色/字号/间距） | SaaS 服务 |

**实操步骤（以 Cursor 配置 Figma MCP 为例）**：

1. **安装 MCP Server**：
   ```bash
   npx @anthropic-ai/create-mcp figma
   # 或手动在 .cursor/mcp.json 中配置
   ```

2. **在项目中创建 `.cursor/mcp.json`**：
   ```json
   {
     "mcpServers": {
       "figma": {
         "command": "npx",
         "args": ["-y", "figma-mcp"],
         "env": {
           "FIGMA_ACCESS_TOKEN": "你的 Figma API Token"
         }
       },
       "context7": {
         "command": "npx",
         "args": ["-y", "@upstash/context7-mcp@latest"]
       }
     }
   }
   ```

3. **在提示词中引用**：
   ```
   请读取 Figma 文件 https://figma.com/file/xxx 中的首页设计，
   提取配色方案和间距规范，然后用 shadcn/ui 实现。
   ```

4. AI 在编码时会自动调用 MCP Server 查询设计上下文，保持一致性。

**Claude Code 配置方式**：在项目根目录创建 `.mcp.json`，格式与上述相同。

---

### 第 6 招：掌握 UI/UX 提示词技巧

**核心理念**：用精准的提示词引导 AI 产出专业级 UI，而非泛泛描述。

**UI UX Pro Max 提示词模板**：

```
你是一位顶级前端设计师兼开发者，拥有 10 年 UI/UX 设计经验。
请遵循以下原则：

1. 视觉层次：通过字号、颜色、间距创建清晰的信息层次
2. 留白艺术：大胆使用留白，不要堆砌内容
3. 微交互：为按钮、卡片、链接添加自然的 hover/active 效果
4. 一致性：所有组件遵循统一的设计语言
5. 响应式：移动端优先，确保各尺寸的良好体验
6. 可访问性：确保对比度达标、支持键盘导航
```

**反面示例 vs 正面示例**：

| ❌ 差的提示词 | ✅ 好的提示词 |
|--------------|-------------|
| "做一个好看的首页" | "参考 Linear.app 的设计风格，做一个深色主题的 SaaS 首页，使用 shadcn/ui 组件" |
| "添加一个表格" | "使用 @tanstack/react-table 实现一个可排序、可分页的数据表格，行 hover 高亮，使用斑马条纹" |
| "页面要好看一点" | "增加卡片的 box-shadow 为 0 4px 6px rgba(0,0,0,0.05)，hover 时提升至 0 10px 15px rgba(0,0,0,0.1) 并上移 2px" |

**核心技巧**：
- 给出具体的参考网站或产品名
- 指定具体的 CSS 数值而非"大一点"、"漂亮一点"
- 描述交互行为而非视觉感受

---

### 第 7 招：使用 Agent Skills 实战

**核心理念**：用 Agent Skills 将专业设计能力"注入"到 AI 编程工具中。

**Agent Skills 是什么**：
- 一种为 AI 编程 Agent 提供特定领域专业知识的机制
- 通常以 `.md` 文件形式存在，定义 Agent 的行为模式和专业规则
- 可以让通用 AI 变成"专业前端设计师"
- 不同工具的存放位置不同（见下表）

**各工具的 Skill 配置位置**：
| 工具 | Skill 存放路径 | 说明 |
|------|---------------|------|
| Cursor | `.cursor/rules/` 或 `.cursorrules` | 项目级规则文件 |
| Claude Code | `CLAUDE.md`（项目根目录） | 项目级指令文件 |
| VS Code Copilot | `.github/copilot-instructions.md` | 项目级指令 |
| Windsurf | `.windsurfrules` | 项目级规则文件 |

**推荐 Skills**：
| Skill | 功能 | 获取方式 |
|-------|------|----------|
| [21st.dev Magic](https://21st.dev) | 将 AI 变成专业 UI 组件设计师 | 在 21st.dev 获取 MCP 配置 |
| [cursor.directory](https://cursor.directory) | 社区共享的各类专业 Skill | 直接复制 .cursorrules 内容 |
| [awesome-cursorrules](https://github.com/PatrickJS/awesome-cursorrules) | GitHub 上的开源规则集合 | 按需选取 |

**动手写一个设计 Skill（示例）**：

创建 `.cursor/rules/ui-design.md`（或对应工具的配置文件）：

```markdown
# UI 设计规范 Skill

## 配色规则
- 永远不要使用纯黑 #000000，用 #1A1A2E 或 #0F172A 替代
- 永远不要使用纯白 #FFFFFF 作为大面积背景，用 #FAFAFA 或 #F8FAFC 替代
- 主色不超过 2 个，用灰度层级创建视觉层次
- 所有颜色在 Tailwind 中用 CSS 变量定义，方便暗色模式切换

## 排版规则
- 中文正文 16px，行高 1.75（比英文宽松）
- 中文字体 fallback：font-family: "PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif
- 标题与正文字号比例至少 1.5:1
- 段落间距 > 行间距，创建呼吸感

## 微交互（必须添加）
- 所有可点击元素：hover 时 opacity 0.8 + cursor:pointer
- 卡片组件：hover 时 translateY(-2px) + shadow 提升，transition 200ms ease
- 按钮：active 时 scale(0.98)，有 loading 状态
- 页面切换：fade-in 动画 300ms

## 响应式
- 移动端优先（min-width 断点）
- 断点：sm 640px, md 768px, lg 1024px, xl 1280px
- 移动端不缩小字号，而是调整布局和间距
```

**使用方式**：
1. 将上面的 Skill 内容保存到对应工具的配置路径
2. AI 在编码时会自动加载这些规则
3. 产出的代码会自动遵循排版、配色、微交互等规范

**效果对比**：
- ❌ 没有 Skill：AI 用纯黑文字、无 hover 效果、中文用默认 sans-serif
- ✅ 有 Skill：AI 自动用 #1A1A2E 文字、带 translateY hover、正确的中文字体栈

---

## 总结：7 招速查表

| # | 方法 | 一句话总结 | 难度 |
|---|------|-----------|------|
| 1 | 前端设计参考资源 | 给 AI 一个"审美标杆" | ⭐ |
| 2 | Google Stitch | 先设计再编码，分工明确 | ⭐⭐ |
| 3 | 前端 UI 组件库 | 用专业组件替代裸组件 | ⭐⭐ |
| 4 | AGENTS.md 规则文件 | 用规则约束 AI 的设计行为 | ⭐⭐ |
| 5 | MCP 协议 | 让 AI 能读取外部设计上下文 | ⭐⭐⭐ |
| 6 | UI/UX 提示词技巧 | 精准描述替代模糊要求 | ⭐⭐ |
| 7 | Agent Skills | 把专业设计能力注入 AI | ⭐⭐⭐ |

## 实战建议

### 入门推荐路径
1. 先学会写好提示词（第 6 招）—— 零成本，立即见效
2. 引入 UI 组件库（第 3 招）—— 最大性价比提升
3. 编写 AGENTS.md（第 4 招）—— 一次配置，长期受益

### 进阶推荐路径
4. 使用 Google Stitch（第 2 招）—— 设计编码分离
5. 配置 MCP（第 5 招）—— 打通设计开发流程
6. 引入 Agent Skills（第 7 招）—— 专业能力注入

### 中文项目特别注意
中文网站有一些特殊的"AI味"问题，需要额外关注：
- **字体回退**：AI 经常只写 `sans-serif`，导致中文字体渲染不佳。务必在 Skill 或 AGENTS.md 中指定：`"PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif`
- **行高适配**：中文需要比英文更宽的行高（推荐 1.7-1.8 vs 英文 1.5-1.6）
- **标点挤压**：连续中文标点（「」、《》、（）等）AI 不会处理，需要 `font-feature-settings: "halt"` 或手动调整
- **中英混排**：中英文之间应有空格（pangu.js 可自动处理），AI 通常不会注意这点

### 不同场景的 7 招优先级

| 场景 | 最优先的招 | 次优先 | 可跳过 |
|------|-----------|--------|--------|
| Landing Page / 官网 | 1, 3, 6 | 2, 7 | 5 |
| 后台管理系统 | 3, 4 | 6 | 1, 2 |
| 移动端 H5 | 6, 3 | 4, 1 | 2, 5 |
| 个人博客 / 作品集 | 1, 6, 7 | 3 | 5 |
| 商业 SaaS 产品 | 4, 3, 5 | 6, 7 | - |

---

## 相关资源

- 🎓 鱼皮免费 AI 编程教程：[ai.codefather.cn](https://ai.codefather.cn)
- 📚 编程学习 + 实战项目：[codefather.cn](https://codefather.cn)
- 📺 合集"鱼皮带你玩 AI"：[B站合集（47期）](https://space.bilibili.com/12890453/channel/collectiondetail?sid=4901063)
- 🎨 Skill/Rules 社区：[cursor.directory](https://cursor.directory)
- 📖 MCP 官方文档：[modelcontextprotocol.io](https://modelcontextprotocol.io)

---

> **声明**：本文档基于视频公开描述、标签、元数据信息整理。视频的 CC 字幕需登录B站才能访问，因此具体演示细节以视频原片为准。建议配合视频观看以获得完整学习体验。
