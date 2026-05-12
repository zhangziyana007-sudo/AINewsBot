#!/bin/bash
# AIbot VPS 部署脚本
# 用法: scp 到 VPS 后执行 bash deploy.sh
set -e

echo "===== AIbot 部署脚本 ====="

# 1. 安装依赖
echo ">>> 安装系统依赖..."
apt-get update -qq
apt-get install -y nginx certbot python3-certbot-nginx

# 2. 创建目录
echo ">>> 创建目录..."
mkdir -p /opt/aibot/server
mkdir -p /opt/aibot/web
mkdir -p /var/www/certbot

# 3. 复制文件（假设代码已在 /tmp/AIbot）
REPO_DIR="${1:-/tmp/AIbot}"
echo ">>> 从 ${REPO_DIR} 复制文件..."
cp -r "${REPO_DIR}/server/"* /opt/aibot/server/
cp -r "${REPO_DIR}/web/"* /opt/aibot/web/

# 4. 安装 Node.js 依赖
echo ">>> 安装 server 依赖..."
cd /opt/aibot/server
npm install --production

# 5. 配置文件检查
if [ ! -f /opt/aibot/server/config/models.json ]; then
    echo ">>> 创建默认模型配置..."
    cp /opt/aibot/server/config/models.example.json /opt/aibot/server/config/models.json
    echo "⚠️  请编辑 /opt/aibot/server/config/models.json 填入 API Key"
fi

if [ ! -f /opt/aibot/server/.env ]; then
    echo ">>> 创建默认 .env..."
    cp /opt/aibot/server/.env.example /opt/aibot/server/.env
    echo "⚠️  请编辑 /opt/aibot/server/.env 修改 JWT_SECRET"
fi

# 6. 配置 nginx
echo ">>> 配置 nginx..."
cp "${REPO_DIR}/deploy/nginx/"*.conf /etc/nginx/sites-available/
ln -sf /etc/nginx/sites-available/aibotapi.zizaya.top.conf /etc/nginx/sites-enabled/
ln -sf /etc/nginx/sites-available/aibot.zizaya.top.conf /etc/nginx/sites-enabled/

# 7. 获取 SSL 证书（首次运行时需要，先用 HTTP 模式）
echo ">>> 获取 SSL 证书..."
echo "   先临时启动 HTTP-only nginx..."

# 临时 nginx 配置（仅 HTTP，用于 certbot 验证）
cat > /tmp/aibot-certbot.conf << 'EOF'
server {
    listen 80;
    server_name aibotapi.zizaya.top aibot.zizaya.top;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 200 'ok'; }
}
EOF
cp /tmp/aibot-certbot.conf /etc/nginx/sites-enabled/aibot-certbot.conf
nginx -t && systemctl reload nginx

certbot certonly --webroot -w /var/www/certbot \
    -d aibotapi.zizaya.top -d aibot.zizaya.top \
    --non-interactive --agree-tos --email admin@zizaya.top || {
    echo "⚠️  SSL 证书获取失败，请确认 DNS 已指向此服务器"
    echo "   手动运行: certbot certonly --nginx -d aibotapi.zizaya.top -d aibot.zizaya.top"
}

rm -f /etc/nginx/sites-enabled/aibot-certbot.conf

# 8. 重载 nginx
nginx -t && systemctl reload nginx
echo ">>> nginx 配置完成"

# 9. 安装 PM2 并启动后端
echo ">>> 配置 PM2..."
npm install -g pm2 2>/dev/null || true
cd /opt/aibot/server
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup || true

echo ""
echo "===== 部署完成 ====="
echo "前端: https://aibot.zizaya.top"
echo "后端: https://aibotapi.zizaya.top"
echo "健康检查: https://aibotapi.zizaya.top/api/health"
echo ""
echo "⚠️  别忘了："
echo "  1. 在阿里云 DNS 添加 A 记录：aibotapi.zizaya.top → 你的VPS IP"
echo "  2. 在阿里云 DNS 添加 A 记录：aibot.zizaya.top → 你的VPS IP"
echo "  3. 编辑 /opt/aibot/server/config/models.json 填入 API Key"
echo "  4. 编辑 /opt/aibot/server/.env 修改 JWT_SECRET"
