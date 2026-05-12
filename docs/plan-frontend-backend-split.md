# 前后端分离实现计划

## 背景

当前 AIbot 是单体 Node.js 应用（Express），所有功能（AI 调用、模板渲染、截图、Web UI）
运行在同一个进程中。需要拆分为：

- **后端（云服务器）**：AI 新闻获取 API，API Key 安全存储
- **前端（用户本地）**：Web 控制面板 + Puppeteer 渲染 + 定时任务

## 当前架构

```
单体应用 (src/server.js)
├── 认证 (密码 → token)
├── AI 新闻获取 (fetch-ai.js → 外部 AI API)
├── 数据处理 (fetch-daily.js → groupByCategory)
├── 模板渲染 (render-template.js → HTML)
├── 截图 (screenshot.js → Puppeteer → PNG)
├── 模型配置 CRUD (config/models.json)
├── 模板配置 CRUD (config/templates.json, template-text.json)
├── 历史浏览 (output/ 目录)
└── 静态文件 (public/)
```

## 目标架构

```
后端 (server/)                        前端 (client/)
├── Express API                       ├── Express 本地服务
├── AI 新闻获取                         ├── Web 控制面板 (public/)
│   └── 调用外部 AI API                 ├── 模板管理 & 文字编辑
├── 用户认证 (JWT)                      ├── 渲染 HTML (render-template.js)
├── 新闻缓存                            ├── Puppeteer 截图 (screenshot.js)
│   └── 同天重复请求返回缓存              ├── 调用后端 API 获取新闻
├── 模型配置管理                         ├── 定时任务 (node-cron)
│   └── API Key 安全存储                 ├── 历史浏览 & 下载
└── 健康检查                            └── 本地配置 (模板、文字)
```

## 代码文件职责分配

| 当前文件 | 归属 | 说明 |
|---------|------|------|
| `fetch-ai.js` | **后端** | AI API 调用 + API Key |
| `fetch-daily.js` | **前端** | 数据分组处理（纯本地逻辑） |
| `render-template.js` | **前端** | 模板渲染（本地） |
| `screenshot.js` | **前端** | Puppeteer 截图（本地） |
| `server.js` | **拆分** | 分成后端 API + 前端本地服务 |
| `public/` | **前端** | Web UI 静态文件 |
| `templates/` | **前端** | 模板文件（本地） |
| `config/models.json` | **后端** | 模型配置 + API Key |
| `config/templates.json` | **前端** | 模板配置（本地） |
| `config/template-text.json` | **前端** | 模板文字（本地） |
| `output/` | **前端** | 生成的图片（本地） |

## 分步实现计划

### 阶段 1: 项目结构重组

#### Task 1.1: 创建 monorepo 目录结构
- 创建 `server/` 和 `client/` 目录
- 各自拥有独立的 `package.json`
- 根目录 `package.json` 用 npm workspaces 管理

**文件操作：**
```
AIbot/
├── package.json          # workspaces: ["server", "client"]
├── server/
│   ├── package.json      # express, jsonwebtoken
│   └── src/
│       ├── index.js      # 后端入口
│       ├── routes/       # API 路由
│       └── services/     # AI 调用服务
└── client/
    ├── package.json      # express, puppeteer, node-cron
    └── src/
        ├── index.js      # 前端入口
        ├── server.js     # 本地 Web 服务
        └── ...           # 当前 fetch-daily, render, screenshot
```

#### Task 1.2: 迁移后端代码
- 将 `fetch-ai.js` 核心逻辑移入 `server/src/services/ai.js`
- 创建 `server/src/routes/news.js` — 新闻获取 API
- 创建 `server/src/routes/auth.js` — 认证 API
- 创建 `server/src/routes/models.js` — 模型配置 CRUD
- 模型配置文件在 `server/config/models.json`

#### Task 1.3: 迁移前端代码
- 将 `render-template.js`, `screenshot.js`, `fetch-daily.js` 移入 `client/src/`
- 将 `public/`, `templates/`, `config/template*.json` 移入 `client/`
- 创建 `client/src/api.js` — 封装后端 API 调用
- 创建 `client/src/server.js` — 本地 Web 服务（当前 server.js 中非 AI 的部分）

### 阶段 2: 后端 API 实现

#### Task 2.1: 后端入口 & 认证
- `server/src/index.js` — Express 启动，CORS 配置
- JWT 认证替代当前的简单 token（可选：保持简单密码，但 token 改用 JWT 支持多端）
- 环境变量：`PORT`, `PASSWORD`, `JWT_SECRET`

#### Task 2.2: 新闻获取 API
- `POST /api/news/fetch` — 触发 AI 获取新闻
  - 请求体：`{ date: "2025-07-22" }`
  - 返回：`{ ok: true, data: { date, items: [...] } }`
- 新闻缓存：同一天重复请求返回内存缓存（可选 SQLite/文件缓存）

#### Task 2.3: 模型配置 API
- `GET /api/models` — 获取所有模型（隐藏 key）
- `PUT /api/models/:id` — 更新模型配置
- `POST /api/models` — 新增模型
- `POST /api/models/active` — 切换活跃模型
- `POST /api/models/:id/test` — 测试连接

### 阶段 3: 前端本地服务实现

#### Task 3.1: API 客户端封装
- `client/src/api.js` — 封装对后端的 HTTP 调用
  - `fetchNews(date)` — 从后端获取新闻数据
  - `getModels()`, `updateModel()`, `testModel()` 等
  - 自动处理认证 token
  - 配置后端地址：`client/config/server.json`

#### Task 3.2: 本地 Web 服务
- `client/src/server.js` — 本地 Express 服务
  - 登录认证（验证后端密码或使用本地密码）
  - 代理模型配置请求到后端
  - 模板管理（本地）
  - 模板文字编辑（本地）
  - 生成流程：调用后端获取数据 → 本地渲染 → 本地截图
  - 历史浏览（本地 output/）

#### Task 3.3: 定时任务
- `client/src/scheduler.js` — node-cron 定时生成
  - 配置文件 `client/config/schedule.json`：`{ enabled: true, cron: "0 8 * * *" }`
  - 每天早 8 点自动生成当天日报
  - Web UI 增加定时任务开关

### 阶段 4: 前端 UI 适配

#### Task 4.1: 连接设置界面
- Web UI 增加"服务器设置"区域
  - 后端地址配置
  - 连接状态检测
  - 登录/登出

#### Task 4.2: 定时任务 UI
- 增加定时生成开关
- Cron 表达式编辑（或预设选项：每天 8:00 / 每天 9:00...）
- 上次执行时间 / 下次执行时间显示

### 阶段 5: 部署支持

#### Task 5.1: 后端部署
- `server/Dockerfile` — Docker 部署支持
- `server/.env.example` — 环境变量模板
- PM2 配置文件 `server/ecosystem.config.cjs`

#### Task 5.2: 前端使用文档
- `client/README.md` — 用户使用指南
- 安装步骤、配置后端地址、启动方法
- 定时任务配置说明

## 实施顺序

1. Task 1.1 → 1.2 → 1.3 （项目结构重组，保证不丢功能）
2. Task 2.1 → 2.2 → 2.3 （后端 API）
3. Task 3.1 → 3.2 → 3.3 （前端本地服务）
4. Task 4.1 → 4.2 （UI 适配）
5. Task 5.1 → 5.2 （部署支持）

每步完成后验证功能可用再进入下一步。
