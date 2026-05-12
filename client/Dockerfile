FROM node:22-alpine

# 安装 Chromium 和中文字体（Puppeteer 需要）
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    font-noto-cjk \
    ttf-freefont

# 告诉 Puppeteer 使用系统 Chromium，不再下载
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY src/ ./src/
COPY templates/ ./templates/
COPY config/ ./config/

# 输出目录
RUN mkdir -p /app/output

ENV PORT=3456
ENV NODE_ENV=production

EXPOSE 3456

CMD ["node", "src/index.js"]
