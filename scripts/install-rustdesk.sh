#!/bin/bash
# ============================================
# RustDesk 服务端一键安装脚本
# 适用于: Ubuntu / Debian / CentOS / AlmaLinux
# 用法: bash install-rustdesk.sh
# ============================================

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

INSTALL_DIR="/opt/rustdesk"

echo -e "${CYAN}======================================${NC}"
echo -e "${CYAN}   RustDesk 服务端一键安装脚本${NC}"
echo -e "${CYAN}======================================${NC}"
echo ""

# --- 检查 root 权限 ---
if [ "$EUID" -ne 0 ]; then
  echo -e "${RED}[错误] 请使用 root 用户运行此脚本${NC}"
  echo -e "执行: ${YELLOW}sudo bash install-rustdesk.sh${NC}"
  exit 1
fi

# --- 检测操作系统 ---
echo -e "${GREEN}[1/6] 检测操作系统...${NC}"
if [ -f /etc/os-release ]; then
  . /etc/os-release
  OS=$ID
  OS_VERSION=$VERSION_ID
  echo -e "  系统: ${CYAN}${PRETTY_NAME}${NC}"
else
  echo -e "${RED}[错误] 无法检测操作系统${NC}"
  exit 1
fi

# --- 安装 Docker ---
echo ""
echo -e "${GREEN}[2/6] 安装 Docker...${NC}"
if command -v docker &> /dev/null; then
  DOCKER_VER=$(docker --version | awk '{print $3}' | tr -d ',')
  echo -e "  Docker 已安装，版本: ${CYAN}${DOCKER_VER}${NC}"
else
  echo -e "  正在安装 Docker..."
  
  case $OS in
    ubuntu|debian)
      apt-get update -qq
      apt-get install -y -qq ca-certificates curl gnupg >/dev/null 2>&1
      install -m 0755 -d /etc/apt/keyrings
      curl -fsSL https://download.docker.com/linux/$OS/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg 2>/dev/null
      chmod a+r /etc/apt/keyrings/docker.gpg
      echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/$OS $(. /etc/os-release && echo "$VERSION_CODENAME") stable" > /etc/apt/sources.list.d/docker.list
      apt-get update -qq
      apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-compose-plugin >/dev/null 2>&1
      ;;
    centos|rhel|almalinux|rocky|fedora)
      yum install -y -q yum-utils >/dev/null 2>&1
      yum-config-manager --add-repo https://download.docker.com/linux/centos/docker-ce.repo >/dev/null 2>&1
      yum install -y -q docker-ce docker-ce-cli containerd.io docker-compose-plugin >/dev/null 2>&1
      ;;
    *)
      echo -e "  系统不在预设列表，尝试通用安装..."
      curl -fsSL https://get.docker.com | sh
      ;;
  esac
  
  systemctl enable docker --now
  echo -e "  ${GREEN}Docker 安装完成 ✓${NC}"
fi

# 确保 docker compose 可用
if ! docker compose version &> /dev/null; then
  echo -e "${YELLOW}  安装 docker-compose-plugin...${NC}"
  case $OS in
    ubuntu|debian)
      apt-get install -y -qq docker-compose-plugin >/dev/null 2>&1
      ;;
    *)
      # 下载独立版 docker-compose
      COMPOSE_VER=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep tag_name | cut -d '"' -f 4)
      curl -fsSL "https://github.com/docker/compose/releases/download/${COMPOSE_VER}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
      chmod +x /usr/local/bin/docker-compose
      ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose
      ;;
  esac
fi

# --- 创建安装目录 ---
echo ""
echo -e "${GREEN}[3/6] 创建安装目录...${NC}"
mkdir -p ${INSTALL_DIR}/data
echo -e "  目录: ${CYAN}${INSTALL_DIR}${NC}"

# --- 写入 docker-compose.yml ---
echo ""
echo -e "${GREEN}[4/6] 生成 Docker Compose 配置...${NC}"
cat > ${INSTALL_DIR}/docker-compose.yml << 'EOF'
services:
  hbbs:
    container_name: hbbs
    image: rustdesk/rustdesk-server:latest
    command: hbbs
    volumes:
      - ./data:/root
    network_mode: host
    restart: unless-stopped
    depends_on:
      - hbbr

  hbbr:
    container_name: hbbr
    image: rustdesk/rustdesk-server:latest
    command: hbbr
    volumes:
      - ./data:/root
    network_mode: host
    restart: unless-stopped
EOF
echo -e "  配置已写入 ${CYAN}${INSTALL_DIR}/docker-compose.yml${NC}"

# --- 配置防火墙 ---
echo ""
echo -e "${GREEN}[5/6] 配置防火墙...${NC}"
if command -v ufw &> /dev/null; then
  echo -e "  检测到 ufw，正在放行端口..."
  ufw allow 21115/tcp comment "RustDesk NAT" >/dev/null 2>&1
  ufw allow 21116/tcp comment "RustDesk ID+信令" >/dev/null 2>&1
  ufw allow 21116/udp comment "RustDesk 心跳" >/dev/null 2>&1
  ufw allow 21117/tcp comment "RustDesk 中继" >/dev/null 2>&1
  ufw allow 21118/tcp comment "RustDesk WS" >/dev/null 2>&1
  ufw allow 21119/tcp comment "RustDesk WS" >/dev/null 2>&1
  echo -e "  ${GREEN}ufw 端口已放行 ✓${NC}"
elif command -v firewall-cmd &> /dev/null; then
  echo -e "  检测到 firewalld，正在放行端口..."
  firewall-cmd --permanent --add-port=21115/tcp >/dev/null 2>&1
  firewall-cmd --permanent --add-port=21116/tcp >/dev/null 2>&1
  firewall-cmd --permanent --add-port=21116/udp >/dev/null 2>&1
  firewall-cmd --permanent --add-port=21117/tcp >/dev/null 2>&1
  firewall-cmd --permanent --add-port=21118/tcp >/dev/null 2>&1
  firewall-cmd --permanent --add-port=21119/tcp >/dev/null 2>&1
  firewall-cmd --reload >/dev/null 2>&1
  echo -e "  ${GREEN}firewalld 端口已放行 ✓${NC}"
elif command -v iptables &> /dev/null; then
  echo -e "  检测到 iptables，正在放行端口..."
  for port in 21115 21116 21117 21118 21119; do
    iptables -I INPUT -p tcp --dport $port -j ACCEPT 2>/dev/null
  done
  iptables -I INPUT -p udp --dport 21116 -j ACCEPT 2>/dev/null
  # 尝试保存规则
  if command -v netfilter-persistent &> /dev/null; then
    netfilter-persistent save >/dev/null 2>&1
  elif [ -f /etc/sysconfig/iptables ]; then
    iptables-save > /etc/sysconfig/iptables
  fi
  echo -e "  ${GREEN}iptables 端口已放行 ✓${NC}"
else
  echo -e "  ${YELLOW}未检测到防火墙工具，跳过（请手动确认端口已开放）${NC}"
fi

# --- 启动服务 ---
echo ""
echo -e "${GREEN}[6/6] 拉取镜像并启动服务...${NC}"
cd ${INSTALL_DIR}
docker compose pull
docker compose up -d

# 等待公钥生成
echo -e "  等待密钥生成..."
for i in $(seq 1 15); do
  if [ -f "${INSTALL_DIR}/data/id_ed25519.pub" ]; then
    break
  fi
  sleep 1
done

# --- 输出结果 ---
echo ""
echo -e "${CYAN}======================================${NC}"
echo -e "${GREEN}  RustDesk 服务端安装完成！${NC}"
echo -e "${CYAN}======================================${NC}"
echo ""

# 获取公网 IP
PUBLIC_IP=$(curl -s --max-time 5 https://ifconfig.me 2>/dev/null || curl -s --max-time 5 https://api.ipify.org 2>/dev/null || echo "获取失败，请手动查看")

echo -e "  公网 IP:  ${CYAN}${PUBLIC_IP}${NC}"
echo ""

if [ -f "${INSTALL_DIR}/data/id_ed25519.pub" ]; then
  PUB_KEY=$(cat ${INSTALL_DIR}/data/id_ed25519.pub)
  echo -e "  公钥 Key: ${CYAN}${PUB_KEY}${NC}"
else
  echo -e "  ${YELLOW}公钥尚未生成，稍后执行:${NC}"
  echo -e "  ${YELLOW}cat ${INSTALL_DIR}/data/id_ed25519.pub${NC}"
fi

echo ""
echo -e "${CYAN}── 客户端配置 ──────────────────────${NC}"
echo -e "  打开 RustDesk 客户端 → 设置 → 网络"
echo -e "  ID 服务器:   ${CYAN}${PUBLIC_IP}${NC}"
echo -e "  中继服务器:  ${CYAN}${PUBLIC_IP}${NC}"
echo -e "  Key:         ${CYAN}（上面的公钥）${NC}"
echo ""
echo -e "${CYAN}── 常用命令 ────────────────────────${NC}"
echo -e "  查看状态:    ${YELLOW}cd ${INSTALL_DIR} && docker compose ps${NC}"
echo -e "  查看日志:    ${YELLOW}docker logs hbbs${NC}"
echo -e "  重启服务:    ${YELLOW}cd ${INSTALL_DIR} && docker compose restart${NC}"
echo -e "  更新版本:    ${YELLOW}cd ${INSTALL_DIR} && docker compose pull && docker compose up -d${NC}"
echo -e "  停止服务:    ${YELLOW}cd ${INSTALL_DIR} && docker compose down${NC}"
echo ""
echo -e "${RED}⚠️  重要提醒：请务必去腾讯云控制台 → 安全组 → 放行以下端口！${NC}"
echo -e "  ${YELLOW}TCP: 21115, 21116, 21117, 21118, 21119${NC}"
echo -e "  ${YELLOW}UDP: 21116${NC}"
echo ""
