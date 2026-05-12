# AI 日报 — 小红书 AI 热点图文生成器

自动获取 AI 领域热点新闻，生成小红书风格的图文笔记（PNG 图片），支持多模型、多模板、定时生成。

## 项目结构

```
AIbot/
├── server/           # 后端 API 服务（部署到 VPS，端口 3457）
│   ├── src/
│   │   ├── index.js          # 入口文件
│   │   ├── routes/           # API 路由
│   │   │   ├── auth.js       # JWT 认证
│   │   │   ├── generate.js   # 日报生成
│   │   │   ├── history.js    # 历史管理
│   │   │   ├── models.js     # AI 模型配置
│   │   │   ├── news.js       # 新闻获取
│   │   │   ├── schedule.js   # 定时任务
│   │   │   └── templates.js  # 模板管理
│   │   └── services/         # 业务逻辑
│   ├── config/               # 配置文件（含 API Key，已 gitignore）
│   ├── templates/            # HTML 模板
│   └── Dockerfile
│
├── client/           # 本地客户端（macOS 风格 Web 控制台，端口 3456）
│   ├── src/
│   │   ├── server.js         # Express 服务
│   │   ├── api.js            # 后端 API 客户端
│   │   ├── public/           # 前端静态文件
│   │   │   ├── index.html
│   │   │   ├── app.js
│   │   │   └── style.css
│   │   └── ...
│   ├── config/               # 配置文件
│   └── Dockerfile
│
├── web/              # Cloudflare Pages 前端（直连后端 API）
│   ├── index.html
│   ├── app.js
│   ├── config.js             # API 地址配置
│   └── style.css
│
├── src/              # v1 遗留版本（单体 CLI 工具）
├── docs/             # 设计文档
├── docker-compose.yml
└── package.json      # npm workspaces（server + client）
```

## 快速开始

### 1. 后端部署（VPS）

```bash
cd server
cp config/models.example.json config/models.json
# 编辑 models.json，填入你的 API Key
cp .env.example .env
# 编辑 .env，修改 JWT_SECRET

npm install
npm start
```

### 2. 本地客户端

```bash
cd client
cp config/server.example.json config/server.json
# 编辑 server.json，填入 VPS 地址

npm install
npm start
# 打开 http://localhost:3456
```

### 3. Docker 部署

```bash
docker-compose up -d
```

### 4. Cloudflare Pages 部署

1. 上传 `web/` 目录到 Cloudflare Pages
2. 修改 `web/config.js` 中的 `API_BASE` 为你的 VPS 地址

## 配置说明

| 文件 | 说明 | 是否含敏感信息 |
|------|------|:--------------:|
| `server/config/models.json` | AI 模型 API Key | ✅ 已 gitignore |
| `server/.env` | JWT 密钥、登录密码 | ✅ 已 gitignore |
| `client/config/server.json` | 后端地址和密码 | ✅ 已 gitignore |
| `config/server.json` | 遗留版后端配置 | ✅ 已 gitignore |

每个敏感配置都有对应的 `.example` 文件，clone 后复制并填入你的值即可。

## 支持的 AI 模型

- DeepSeek
- OpenAI (GPT-4o)
- 通义千问 (Qwen)
- Kimi (月之暗面)
- 智谱 GLM
- Google Gemini
- 小米 MiMo

## 技术栈

- **后端**: Node.js + Express + JWT + Puppeteer
- **前端**: 原生 HTML/CSS/JS（macOS 风格）
- **部署**: Docker / PM2 / Cloudflare Pages
