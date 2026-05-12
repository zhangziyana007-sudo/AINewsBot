/**
 * 认证路由
 *
 * POST /api/login  — 密码登录，返回 JWT token
 * POST /api/logout — 登出（使 token 失效）
 */

import { Router } from "express";
import jwt from "jsonwebtoken";

const router = Router();

const PASSWORD = process.env.AIBOT_PASSWORD || "ai2026";
const JWT_SECRET = process.env.JWT_SECRET || "aibot-dev-secret";
const TOKEN_EXPIRY = "7d";

// 已撤销的 token 集合（简单的内存黑名单）
const revokedTokens = new Set();

/**
 * JWT 认证中间件
 */
export function authRequired(req, res, next) {
  const authHeader = req.headers.authorization;
  const tokenFromHeader = req.headers["x-auth-token"];
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : tokenFromHeader || req.query.token;

  if (!token) {
    return res.status(401).json({ error: "未授权，请先登录" });
  }

  if (revokedTokens.has(token)) {
    return res.status(401).json({ error: "token 已失效，请重新登录" });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch {
    res.status(401).json({ error: "token 无效或已过期" });
  }
}

// 登录
router.post("/login", (req, res) => {
  const { password } = req.body;
  if (password === PASSWORD) {
    const token = jwt.sign({ role: "admin" }, JWT_SECRET, { expiresIn: TOKEN_EXPIRY });
    res.json({ ok: true, token });
  } else {
    res.status(403).json({ error: "密码错误" });
  }
});

// 登出
router.post("/logout", authRequired, (req, res) => {
  const authHeader = req.headers.authorization;
  const token = authHeader?.startsWith("Bearer ")
    ? authHeader.slice(7)
    : req.headers["x-auth-token"];
  if (token) revokedTokens.add(token);
  res.json({ ok: true });
});

export default router;
