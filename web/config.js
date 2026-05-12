/**
 * AI 日报 — API 配置
 *
 * 部署到 Cloudflare Pages 时，修改 API_BASE 为你的 VPS 地址
 * 也可以在 Web UI「后端服务器」处动态修改
 */
window.API_BASE = localStorage.getItem("aibot_api_base") || "https://aibotapi.zizaya.top";
