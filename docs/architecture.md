# AIbot 前后端分离架构

## 架构概览

```
┌─────────────┐     HTTP/JSON     ┌─────────────┐
│   Client    │ ◄───────────────► │   Server    │
│  (本地前端)  │    port 3457      │ (云端后端)   │
│  port 3456  │                   │             │
│  Puppeteer  │                   │  AI API     │
│  模板渲染    │                   │  新闻缓存   │
│  截图生成    │                   │  模型管理   │
└─────────────┘                   └─────────────┘
```

- **Server** (`server/`): 部署在云端，负责 AI 调用、新闻获取、模型配置管理
- **Client** (`client/`): 运行在本地，负责 Web UI、模板渲染、截图生成

## 快速开始

### 1. 安装依赖

```bash
cd /home/ts/AIbot
npm install          # 安装所有 workspace 依赖
```

### 2. 配置后端

```bash
cp server/.env.example server/.env
```

编辑 `server/.env`：
```
PORT=3457
AIBOT_PASSWORD=你的密码
JWT_SECRET=随机字符串
CACHE_TTL_HOURS=6
```

确保 `server/config/models.json` 中配置了正确的 AI 模型 API Key。

### 3. 启动后端

```bash
npm run server
# 或直接
node server/src/index.js
```

后端启动后可访问 `http://localhost:3457/api/health` 确认运行状态。

### 4. 配置前端

编辑 `client/config/server.json`：
```json
{
  "baseUrl": "http://localhost:3457",
  "password": "你的密码"
}
```

### 5. 启动前端

```bash
npm run client
# 或直接
node client/src/index.js
```

打开浏览器访问 `http://localhost:3456`。

## 部署后端到云端

### Docker 部署

```bash
cd server
docker build -t aibot-server .
docker run -d -p 3457:3457 \
  -e AIBOT_PASSWORD=xxx \
  -e JWT_SECRET=xxx \
  -v $(pwd)/config:/app/config \
  aibot-server
```

### PM2 部署

```bash
cd server
npm install
pm2 start ecosystem.config.cjs
pm2 save
```

## Web UI 功能

| 功能 | 说明 |
|------|------|
| 服务器连接 | 配置后端地址，测试连通性 |
| 新闻生成 | 选择日期 → 获取新闻 → 渲染模板 → 截图 |
| 模型管理 | 新增/编辑/切换 AI 模型 |
| 模板文本 | 自定义封面和内容页文案 |
| 定时任务 | 开启/关闭每日自动生成 |
| 历史记录 | 浏览已生成的日报图片 |

## 兼容旧版

单进程模式仍可使用：

```bash
npm run legacy
# 或直接
node src/server.js
```

此模式直接在本地调用 AI API，无需后端服务。
