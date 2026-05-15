# 网站前端去 AI 味

> **适用工具**：Cursor、Claude Code、Windsurf、Trae、VS Code Copilot 等 AI 编程工具
> **核心目标**：让 Vibe Coding 生成的网站摆脱千篇一律的"AI感"，看起来像真人设计师的作品
> **适用范围**：Landing Page、展示型网站、SaaS 官网、个人作品集等

---

## 为什么 AI 做的网站一眼就能看出来？

AI 编程工具直接生成的网站有明显的"AI味"共性：

| 问题 | 表现 |
|------|------|
| 配色AI味 | 千篇一律的蓝白灰、渐变滥用、缺乏品牌感 |
| 布局模板化 | hero + features + footer 三段式，没有设计节奏感 |
| 排版粗糙 | 字号层级混乱、中文行高不够、字体回退缺失 |
| 组件廉价 | 默认圆角卡片、无质感阴影、hover 效果缺失 |
| 图片空洞 | 没有真实图片，大量 placeholder 或 emoji 图标充数 |
| 细节缺失 | 无微交互、无加载动画、无空状态处理 |

以下 7 招逐一解决。

---

## 一、参考真实网站

**核心理念**：让 AI 有"审美标杆"可以参考，而不是凭空生成。

AI 最大的问题是"没见过好设计"。你需要给它具体的参考对象。

### 推荐设计参考平台

| 平台 | 特点 | 地址 |
|------|------|------|
| Dribbble | 高质量 UI 设计稿灵感 | [dribbble.com](https://dribbble.com) |
| Awwwards | 获奖网站，标杆级设计 | [awwwards.com](https://awwwards.com) |
| Godly | 精选网页设计集合 | [godly.website](https://godly.website) |
| Landingfolio | Landing Page 专项参考 | [landingfolio.com](https://landingfolio.com) |
| Behance | 完整项目设计案例 | [behance.net](https://behance.net) |
| Mobbin | 移动端 UI 模式库 | [mobbin.com](https://mobbin.com) |
| SaaS Landing Page | SaaS 类着陆页集合 | [saaslandingpage.com](https://saaslandingpage.com) |
| One Page Love | 单页网站设计精选 | [onepagelove.com](https://onepagelove.com) |

### 怎么用

**方法 1：截图 + 提示词**
```
参考这张截图的设计风格（附图），实现一个类似的首页。
保持相同的配色方案、卡片样式和间距节奏。
```

**方法 2：指定具体网站**
```
参考 linear.app 的设计风格，做一个深色主题的产品首页。
注意它的留白比例、字体层次和微交互。
```

**方法 3：指定设计风格关键词**
```
使用 glassmorphism（毛玻璃）风格，配合暗色背景。
卡片使用 backdrop-filter: blur(16px) + 半透明白色边框。
```

### 注意事项
- 不要只说"做个好看的"，要给出具体参考
- 可以从多个网站各取一个元素（A 的配色 + B 的布局 + C 的动效）
- 截图比文字描述更精确，支持截图的工具优先用截图

---

## 二、设计优先开发

**核心理念**：先出设计稿，再写代码。不要让 AI 同时承担"设计师"和"程序员"两个角色。

这是去 AI 味最根本的方法——把设计和编码拆开。

### 推荐的"设计先行"工具

| 工具 | 类型 | 用法 |
|------|------|------|
| [Google Stitch](https://stitch.withgoogle.com) | AI 原生设计工具 | 自然语言 → 专业设计稿 → 导出代码 |
| [v0.dev](https://v0.dev) | Vercel 出品 AI UI 生成 | 自然语言 → React 组件 + 预览 |
| [Figma](https://figma.com) | 专业设计工具 | 手动或AI辅助设计 → 通过 MCP 交给编程工具 |
| [Framer](https://framer.com) | 设计+发布一体 | 可视化设计 → 直接发布为网站 |
| [Bolt.new](https://bolt.new) | AI 全栈工具 | 有设计感的 AI 生成 → 可部署 |

### 推荐工作流

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  第一步：设计     │────▶│  第二步：确认     │────▶│  第三步：编码     │
│                  │     │                  │     │                  │
│ Stitch / v0 /   │     │ 调整配色、布局、  │     │ Cursor / Claude  │
│ Figma 出设计稿   │     │ 间距直到满意      │     │ Code 按设计稿实现 │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

### Google Stitch 实操

1. 打开 [stitch.withgoogle.com](https://stitch.withgoogle.com)
2. 用自然语言描述你想要的页面，例如：
   > "一个极简风格的 AI 产品官网，深色背景，主色紫蓝渐变，大标题+副标题+CTA按钮+三列特性卡片"
3. Stitch 生成设计稿，可在线微调
4. 导出为 HTML/CSS 代码，或截图
5. 将代码/截图交给 Cursor，指令：
   ```
   基于这份设计稿（附代码/截图），用 React + Tailwind 实现完整页面。
   保持设计稿中的所有间距、配色和排版规范。
   ```

### 为什么这样做效果好
- AI 设计工具的审美训练数据比编程工具更专业
- 设计稿提供了**视觉锚点**，编程 AI 有了明确目标
- 避免了编程 AI "自由发挥"导致的平庸输出

---

## 三、丰富网站图片

**核心理念**：真实、高质量的视觉素材是去 AI 味最快的一招。没有图片的网站，再好的代码也显得空洞。

AI 生成的网站最常见的问题就是视觉素材缺失：图标用 emoji 代替，插画区域空白，图片位置放纯色块。需要从**图标、插画、真实图片、占位图**四个维度补齐。

### 图标

专业图标库替代 emoji，是最基础的去 AI 味操作。

| 图标库 | 特点 | 地址 |
|--------|------|------|
| Iconify | 150+ 图标集、20万+ 图标，一站式聚合 | [icon-sets.iconify.design](https://icon-sets.iconify.design/) |
| Lucide | 精致线性图标，shadcn/ui 默认配套 | [lucide.dev](https://lucide.dev) |
| iconfont（阿里） | 国内最大图标库，支持中文搜索，可生成字体/SVG/Symbol | [iconfont.cn](https://www.iconfont.cn/) |
| IconPark（字节） | 2400+ 图标，4种主题可切换，代码直接复制 | [iconpark.oceanengine.com](https://iconpark.oceanengine.com/) |
| Remix Icon | 开源中性风图标，2200+，适合中后台 | [remixicon.com](https://remixicon.com) |
| Xicons | 整合多套图标库（Ionicons/FA/Material等），Vue/React 直接用 | [xicons.org](https://www.xicons.org) |
| Heroicons | Tailwind 官方出品，outline/solid 两套 | [heroicons.com](https://heroicons.com) |
| Tabler Icons | 5000+ 开源 SVG 图标 | [tabler.io/icons](https://tabler.io/icons) |

**使用建议**：
```
页面图标统一使用 Lucide Icons（或 Iconify 中的某一套图标集）。
不要用 emoji 代替图标。
所有图标使用统一的 size（20px）和 strokeWidth（1.5）。
```

### 插画

插画让页面有"设计感"，AI 几乎不会主动使用插画。

| 插画库 | 特点 | 地址 |
|--------|------|------|
| unDraw | 开源扁平插画，可自定义主色 | [undraw.co](https://undraw.co/illustrations) |
| Storyset | 风格统一的动态插画 | [storyset.com](https://storyset.com) |
| 稿定设计 | 国内设计平台，海量免费插画/模板，中文搜索 | [gaoding.com](https://www.gaoding.com) |
| 觅元素 | 免抠PNG/PSD素材，中文标签精准 | [51yuansu.com](https://www.51yuansu.com) |
| Blush | 多风格插画生成器 | [blush.design](https://blush.design) |
| Humaaans | 可组合的人物插画 | [humaaans.com](https://www.humaaans.com) |
| Open Doodles | 手绘涂鸦风格 | [opendoodles.com](https://www.opendoodles.com) |
| 千库网 | 国内素材平台，插画/背景/元素丰富 | [588ku.com](https://588ku.com) |

**使用建议**：
```
空状态页面（无数据、加载失败等）使用 unDraw 插画。
在 unDraw 中设置主色为项目品牌色，下载 SVG 格式。
关于我们、团队介绍等页面使用 Humaaans 人物插画。
```

### 真实图片

真实高质量照片是让网站"有真实感"的关键。

| 图片库 | 特点 | 地址 |
|--------|------|------|
| Pexels | 免费高质量摄影图+视频，**支持中文搜索** | [pexels.com/zh-cn](https://www.pexels.com/zh-cn/) |
| Pixabay | 图片+矢量图+视频，**支持中文搜索** | [pixabay.com/zh](https://pixabay.com/zh/) |
| Unsplash | 最大的免费摄影图库 | [unsplash.com](https://unsplash.com) |
| 摄图网 | 国内正版图库，商用授权清晰，中文场景丰富 | [699pic.com](https://699pic.com) |
| 包图网 | 国内设计素材平台，模板/图片/视频 | [ibaotu.com](https://ibaotu.com) |
| Hippopx | 免费无版权图片，**支持中文搜索**，CC0 协议 | [hippopx.com/zh](https://www.hippopx.com/zh) |
| 彼岸图网 | 4K/8K 高清壁纸和图片，国内访问快 | [netbian.com](https://pic.netbian.com) |
| Burst | Shopify 出品，电商场景丰富 | [burst.shopify.com](https://burst.shopify.com) |

**AI 生成图片**（需要特定场景时）：
| 工具 | 适合场景 |
|------|----------|
| 即梦 AI（字节） | 国内可用、中文理解好、免费额度充足 | [jimeng.jianying.com](https://jimeng.jianying.com) |
| 通义万相（阿里） | 中文提示词生成图片，免费可用 | [tongyi.aliyun.com/wanxiang](https://tongyi.aliyun.com/wanxiang) |
| 文心一格（百度） | AI 绘画，中文场景优化 | [yige.baidu.com](https://yige.baidu.com) |
| Midjourney | 高质量概念图、Hero 背景图 |
| DALL·E 3 | 和 ChatGPT 联动生成 |
| Ideogram | 带文字的图片（Logo、Banner） |

**使用建议**：
```
Hero 区域必须有高质量背景图，使用 Unsplash/Pexels 真实照片。
所有图片使用 object-fit: cover + 圆角 12px。
图片上方叠加半透明渐变层 (linear-gradient)，确保文字可读。
使用 aspect-ratio: 16/9 统一图片比例。
所有图片添加 loading="lazy" 和有意义的 alt 文字。
```

### 占位图

开发阶段先用占位图，上线前替换为真实素材。

| 占位图服务 | 特点 | 用法示例 |
|-----------|------|----------|
| Lorem Picsum | 随机真实照片占位 | `https://picsum.photos/800/600` |
| Placeholder.com | 纯色+文字占位 | `https://via.placeholder.com/800x600` |
| DummyImage | 自定义颜色和文字 | `https://dummyimage.com/800x600/cccccc/333` |

**使用建议**：
```
开发阶段所有图片使用 https://picsum.photos/宽/高 作为占位。
在代码中添加 TODO 注释标记需要替换的图片位置。
上线前全局搜索 picsum.photos 确保全部替换为真实图片。
```

### 图片使用的 AI 味 vs 专业感

| ❌ AI 味 | ✅ 专业感 |
|----------|----------|
| 用 emoji 代替图标 | 使用 Lucide/Heroicons 图标库 |
| 图片区域空白或纯色块 | 使用 Unsplash/Pexels 真实照片 |
| 所有图片方形无圆角 | 统一的圆角和 aspect-ratio |
| 图片大小比例混乱 | 统一的尺寸网格（16:9 或 4:3） |
| 空状态无任何提示 | 使用 unDraw 插画 + 说明文字 |
| 无 loading 和 alt | lazy loading + 有意义的 alt |

---

## 四、提示词约束

**核心理念**：用精准、具体的提示词约束 AI 的输出，而非泛泛描述。

提示词的质量直接决定 AI 输出的质量。"做好看一点"永远不如给出具体的 CSS 数值。

### 反面 vs 正面示例

| ❌ 差的提示词 | ✅ 好的提示词 | 差在哪 |
|--------------|-------------|--------|
| "做一个好看的首页" | "参考 linear.app 的设计风格，深色主题，主色 #7C3AED，使用 shadcn/ui" | 没有参考、没有具体要求 |
| "添加一个表格" | "使用 @tanstack/react-table，可排序、可分页，行 hover 高亮，斑马条纹，圆角 8px" | 缺少组件库、交互细节 |
| "页面要好看一点" | "卡片 shadow 改为 0 4px 6px rgba(0,0,0,0.05)，hover 时 shadow 提升至 0 10px 15px rgba(0,0,0,0.1) 并 translateY(-2px)" | 用感受代替了数值 |
| "字大一点" | "标题 h1 改为 48px font-bold，h2 改为 32px font-semibold，正文 16px leading-7" | 没有具体的字号层级 |
| "加点动画" | "卡片进入视口时 fade-in + translateY(20px→0)，duration 500ms，stagger 100ms" | 没有指定动画类型和参数 |

### 高质量提示词模板

**角色设定型**：
```
你是一位拥有 10 年经验的高级前端设计师。你的设计特点是：
- 大量使用留白，内容区域不超过屏幕宽度的 60%
- 配色克制，整站不超过 2 个主色 + 3 个灰度层级
- 所有交互元素都有 200ms ease 的 transition
- 中文排版使用 "PingFang SC", "Noto Sans SC" 字体栈，行高 1.75
```

**规范约束型**：
```
遵循以下设计规范：
- 圆角：按钮 6px，卡片 12px，模态框 16px
- 阴影：默认 shadow-sm，hover 时 shadow-md
- 间距：使用 4px 基础网格（4/8/12/16/24/32/48px）
- 颜色：不要使用纯黑 #000，用 #0F172A 代替
- 动画：所有状态变化 transition-all duration-200 ease-in-out
```

**禁止清单型**（直接告诉 AI 不能做什么）：
```
禁止以下行为：
- 不要使用渐变色作为页面主背景
- 不要使用 emoji 代替图标
- 不要使用默认的蓝色链接颜色
- 不要在卡片中堆叠超过 3 行文字
- 不要使用浏览器默认的表单样式
- 不要使用 text-center 居中大段文字
```

### 核心技巧
1. **给具体参考**：参考网站名 > 设计风格名 > 模糊感受
2. **给具体数值**：CSS 数值 > "大一点"、"好看一点"
3. **给禁止清单**：告诉 AI 不能做什么，比告诉它做什么更有效
4. **描述交互行为**：hover/active/loading 状态 > 静态视觉
5. **分步迭代**：先骨架 → 再细节 → 最后微调，不要一步到位

---

## 五、Agents Skills

**核心理念**：通过规则文件和技能注入，让 AI 编程工具自动遵循专业设计规范。

### 什么是 Agent Skills

Agent Skills 是给 AI 编程工具配置的"专业知识"文件，让通用 AI 变成特定领域的专家。不同工具有不同的配置方式：

| 工具 | 配置文件路径 | 说明 |
|------|-------------|------|
| Cursor | `.cursor/rules/*.md` 或 `.cursorrules` | 项目级规则，AI 自动读取 |
| Claude Code | `CLAUDE.md`（项目根目录） | 项目级指令 |
| VS Code Copilot | `.github/copilot-instructions.md` | 项目级指令 |
| Windsurf | `.windsurfrules` | 项目级规则 |
| Trae | `.trae/rules/*.md` | 项目级规则 |

### 获取现成的 Skills

| 来源 | 内容 | 地址 |
|------|------|------|
| 21st.dev | AI UI 组件设计专家 Skill | [21st.dev](https://21st.dev)（MCP 方式接入） |
| cursor.directory | 社区共享的各类 Skill | [cursor.directory](https://cursor.directory) |
| awesome-cursorrules | GitHub 开源规则集合 | [GitHub](https://github.com/PatrickJS/awesome-cursorrules) |

### 自己写一个设计 Skill（完整示例）

以下是一个可以直接使用的前端设计 Skill，保存到对应工具的配置路径即可：

```markdown
# 前端设计规范

你是一位专业前端设计师兼开发者，遵循以下规范：

## 配色
- 绝不使用纯黑 #000000，用 #0F172A（slate-900）替代
- 绝不使用纯白 #FFFFFF 大面积背景，用 #FAFAFA 或 #F8FAFC 替代
- 主色不超过 2 个，用灰度层级创建视觉层次
- 链接颜色与主色统一，不使用默认蓝色

## 排版
- 中文字体栈：font-family: "PingFang SC", "Noto Sans SC", "Microsoft YaHei", sans-serif
- 英文字体栈：font-family: "Inter", "SF Pro Display", system-ui, sans-serif
- 中文正文 16px，行高 1.75
- 英文正文 16px，行高 1.6
- 标题层级：h1=40px bold, h2=30px semibold, h3=22px medium
- 段落间距大于行间距，创建呼吸感

## 间距与圆角
- 使用 8px 基础网格：8/16/24/32/48/64px
- 圆角：按钮 6px，输入框 8px，卡片 12px，大容器 16px
- 外边距始终大于内边距

## 微交互（必须添加）
- 所有可点击元素：cursor-pointer + hover 状态
- 按钮：hover 时亮度微调，active 时 scale(0.98)
- 卡片：hover 时 translateY(-2px) + shadow 提升，transition 200ms ease
- 链接：hover 时下划线或颜色变化
- 页面元素：进入视口时 fade-in 动画

## 图片
- 所有图片 object-fit: cover + 统一圆角
- 必须有 alt 文字和 loading="lazy"
- 不使用 emoji 代替图标，使用 Lucide 或 Heroicons

## 禁止事项
- 不使用渐变色作为页面主背景
- 不使用默认浏览器表单样式
- 不在同一区域堆砌超过 3 种颜色
- 不使用 text-center 居中大段正文
- 不使用纯色块代替真实图片
```

---

## 六、反 AI 味组件

**核心理念**：用经过专业设计师打磨的组件库替换 AI 默认生成的"裸组件"，这是性价比最高的去 AI 味方法。

AI 默认生成的组件有明显共性：圆角统一 rounded-lg、阴影千篇一律 shadow-md、hover 效果缺失。用专业组件库直接替换。

### React 生态

| 组件库 | 特点 | 推荐场景 | 地址 |
|--------|------|----------|------|
| shadcn/ui | 高质量、可定制、Tailwind 原生 | 通用 Web 应用 | [ui.shadcn.com](https://ui.shadcn.com) |
| Magic UI | 动效丰富、现代感极强 | Landing Page | [magicui.design](https://magicui.design) |
| Aceternity UI | 炫酷动画组件、展示型 | 产品官网 | [ui.aceternity.com](https://ui.aceternity.com) |
| Radix UI | 无障碍、高可用、无样式基底 | 需要深度定制 | [radix-ui.com](https://radix-ui.com) |
| Mantine | 100+ 组件、功能丰富、开箱即用 | 全功能 Web 应用 | [mantine.dev](https://mantine.dev) |
| Tailwind UI | 官方出品、企业级 | 商业项目 | [tailwindui.com](https://tailwindui.com) |
| daisyUI | 轻量 Tailwind 插件、30+ 主题 | 快速原型 | [daisyui.com](https://daisyui.com) |

### 独特风格的反 AI 味组件库

这些组件库自带鲜明的设计风格，用了之后 AI 味直接消失：

| 组件库 | 风格特点 | 去 AI 味效果 | 地址 |
|--------|---------|-------------|------|
| Magic UI | 150+ 动画组件，流光边框、文字渐变、微交互 | 动效炸裂，完全不像 AI 生成 | [magicui.design](https://magicui.design) |
| DaisyUI | 30+ 主题：cyberpunk、retro、cupcake 等 | 一键切换风格，告别蓝白灰 | [daisyui.com](https://daisyui.com) |
| Brutalist UI | 粗野主义风格：粗边框、硬阴影、高对比 | 反设计感，绝对不会被认为是 AI 做的 | [brutalist-ui.com](https://www.brutalist-ui.com) |
| Glass UI | 玻璃拟态效果：半透明、模糊背景 | 毛玻璃质感，高级感拉满 | [ui.glass](https://ui.glass) |
| ikun-ui | 基于 Svelte.js + UnoCSS | Svelte 生态独特选择 | [ikun-ui.netlify.app](https://ikun-ui.netlify.app) |
| Radix UI | 无样式原语组件，完全自定义 | 100% 自主设计，零 AI 痕迹 | [radix-ui.com](https://radix-ui.com) |
| Mantine | 100+ 组件，功能丰富、主题系统强大 | 统一的设计系统，质感专业 | [mantine.dev](https://mantine.dev) |

**选择建议**：
- 想要**炫酷动效** → Magic UI、Aceternity UI
- 想要**独特风格** → Brutalist UI（粗野）、Glass UI（毛玻璃）、DaisyUI（多主题）
- 想要**完全自定义** → Radix UI（无样式基底）
- 想要**开箱即用** → Mantine、shadcn/ui

### Vue 生态

| 组件库 | 特点 | 推荐场景 | 地址 |
|--------|------|----------|------|
| Naive UI | TypeScript、主题定制强 | Vue 3 通用应用 | [naiveui.com](https://www.naiveui.com) |
| Element Plus | 社区最大、中文文档完善 | 中后台系统 | [element-plus.org](https://element-plus.org) |
| Ant Design Vue | 蚂蚁设计体系 | 企业级后台 | [antdv.com](https://antdv.com) |
| Vuetify | Material Design | Material 风格 | [vuetifyjs.com](https://vuetifyjs.com) |
| PrimeVue | 主题丰富、无障碍 | 多主题需求 | [primevue.org](https://primevue.org) |
| Onu UI | UnoCSS 驱动、轻量美观 | 个人项目 | [onu.zyob.top](https://onu.zyob.top) |

### 纯 CSS / 框架无关

| 资源 | 特点 | 地址 |
|------|------|------|
| Tailwind CSS | 原子化 CSS，所有框架通用 | [tailwindcss.com](https://tailwindcss.com) |
| UnoCSS | 更快的原子化 CSS | [unocss.dev](https://unocss.dev) |
| Open Props | CSS 变量设计 Token | [open-props.style](https://open-props.style) |
| Pico CSS | 极简无类名样式 | [picocss.com](https://picocss.com) |

### 怎么用

**在提示词中明确指定组件库**：
```
使用 shadcn/ui 组件库实现以下页面。
按钮使用 Button 组件的 variant="outline" 变体。
卡片使用 Card + CardHeader + CardContent 组合。
不要自己写组件样式，全部使用组件库现有组件。
```

**提前安装好依赖**：
```bash
# React + shadcn/ui
npx shadcn@latest init
npx shadcn@latest add button card dialog

# Vue + Element Plus
npm install element-plus
```

**引导 AI 使用组件变体而非自定义样式**：
```
使用 Button 组件的以下变体：
- 主要操作：variant="default" size="lg"
- 次要操作：variant="outline" size="default"
- 危险操作：variant="destructive"
不要对这些组件添加额外的 className 样式覆盖。
```

---

## 七、自主配色

**核心理念**：用一套精心选择的配色方案替换 AI 默认的蓝白灰，是最直观的去 AI 味手段。

AI 生成的配色几乎都是 blue-500 + gray-100 + white，千篇一律。自主选择配色方案能让网站立刻脱颖而出。

### 配色工具推荐

| 工具 | 用途 | 地址 |
|------|------|------|
| Realtime Colors | 实时预览配色在网页上的效果 | [realtimecolors.com](https://realtimecolors.com) |
| Coolors | 随机生成和谐配色方案 | [coolors.co](https://coolors.co) |
| Color Hunt | 精选配色方案集合 | [colorhunt.co](https://colorhunt.co) |
| Tailwind CSS Colors | Tailwind 官方色板 | [tailwindcss.com/docs/colors](https://tailwindcss.com/docs/customizing-colors) |
| Radix Colors | 为 UI 设计的色阶系统 | [radix-ui.com/colors](https://www.radix-ui.com/colors) |
| Happy Hues | 带场景示例的配色方案 | [happyhues.co](https://www.happyhues.co) |
| Huemint | AI 生成品牌配色 | [huemint.com](https://huemint.com) |

### 配色的核心规则

**1. 3-5 色原则**
```
一套配色方案只需要：
- 1 个主色（品牌色，按钮、链接、强调元素）
- 1 个辅助色（可选，用于次要强调）
- 1 个背景色（大面积底色）
- 1 个文本色（正文和标题）
- 1 个边框/分割色（细线、卡片边框）
```

**2. 不要用纯黑纯白**
```
❌ 文本色 #000000 → ✅ #0F172A (slate-900) 或 #1E293B (slate-800)
❌ 背景色 #FFFFFF → ✅ #FAFAFA 或 #F8FAFC (slate-50)
❌ 边框色 #000000 → ✅ #E2E8F0 (slate-200)
```

**3. 配色方案示例**

**方案 A：温暖专业（适合商务、教育）**
| 用途 | 颜色 | Tailwind |
|------|------|----------|
| 主色 | #F59E0B | amber-500 |
| 背景 | #FFFBEB | amber-50 |
| 文本 | #1C1917 | stone-900 |
| 次要文本 | #78716C | stone-500 |
| 边框 | #E7E5E4 | stone-200 |

**方案 B：冷静科技（适合 SaaS、工具）**
| 用途 | 颜色 | Tailwind |
|------|------|----------|
| 主色 | #7C3AED | violet-600 |
| 背景 | #0F172A | slate-900 (暗色) |
| 文本 | #F1F5F9 | slate-100 |
| 次要文本 | #94A3B8 | slate-400 |
| 边框 | #334155 | slate-700 |

**方案 C：清新自然（适合博客、生活方式）**
| 用途 | 颜色 | Tailwind |
|------|------|----------|
| 主色 | #059669 | emerald-600 |
| 背景 | #F0FDF4 | green-50 |
| 文本 | #1A1A2E | 自定义深蓝灰 |
| 次要文本 | #6B7280 | gray-500 |
| 边框 | #D1FAE5 | emerald-100 |

### 怎么告诉 AI 用你的配色

**方法 1：在提示词中直接给色值**
```
使用以下配色方案：
- 主色：#7C3AED（用于按钮、链接、强调元素）
- 背景：#FAFAFA
- 文本：#0F172A
- 次要文本：#64748B
- 边框：#E2E8F0
绝不使用默认蓝色和纯黑纯白。
```

**方法 2：在 AGENTS.md / Skill 中固化**
```markdown
## 配色规范（全项目生效）
--color-primary: #7C3AED;
--color-bg: #FAFAFA;
--color-text: #0F172A;
--color-text-secondary: #64748B;
--color-border: #E2E8F0;

所有颜色通过 CSS 变量引用，方便后续切换暗色模式。
```

**方法 3：用 Tailwind 配置锁定**
```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: '#7C3AED',
        surface: '#FAFAFA',
        content: '#0F172A',
        muted: '#64748B',
      }
    }
  }
}
```
然后在提示词中告诉 AI：
```
使用 brand / surface / content / muted 这些自定义颜色类名，
不要使用 Tailwind 默认的 blue-xxx、gray-xxx。
```

---

## 总结速查表

| # | 方法 | 一句话总结 | 难度 | 见效速度 |
|---|------|-----------|------|----------|
| 一 | 参考真实网站 | 给 AI 审美标杆 | ⭐ | 立即 |
| 二 | 设计优先开发 | 先设计稿再编码 | ⭐⭐ | 立即 |
| 三 | 丰富网站图片 | 真实图片替换占位符 | ⭐ | 立即 |
| 四 | 提示词约束 | 具体数值替代模糊感受 | ⭐⭐ | 立即 |
| 五 | Agents Skills | 注入专业设计规范 | ⭐⭐ | 长期 |
| 六 | 反 AI 味组件 | 专业组件库替代裸组件 | ⭐⭐ | 立即 |
| 七 | 自主配色 | 品牌色替代蓝白灰 | ⭐ | 立即 |

## 推荐上手路径

### 零基础快速见效（10 分钟）
1. **自主配色**（第七招）—— 在提示词里换一套颜色，立刻不一样
2. **参考真实网站**（第一招）—— 截图一个好看的网站给 AI
3. **丰富图片**（第三招）—— 用 Unsplash 图片替换占位符

### 进阶提升（30 分钟）
4. **提示词约束**（第四招）—— 写一套精准的提示词模板
5. **反 AI 味组件**（第六招）—— 安装 shadcn/ui 或 Element Plus
6. **Agents Skills**（第五招）—— 写一份设计规范 Skill 文件

### 专业工作流（按需）
7. **设计优先开发**（第二招）—— 用 Stitch/v0 先出设计稿再编码

---

## 相关资源

- 🎨 配色工具：[realtimecolors.com](https://realtimecolors.com) | [coolors.co](https://coolors.co)
- 🖼 免费图片：[unsplash.com](https://unsplash.com) | [pexels.com](https://pexels.com)
- 🧩 组件库：[ui.shadcn.com](https://ui.shadcn.com) | [magicui.design](https://magicui.design)
- 📏 Skill 社区：[cursor.directory](https://cursor.directory)
- 🌐 设计参考：[awwwards.com](https://awwwards.com) | [godly.website](https://godly.website)
