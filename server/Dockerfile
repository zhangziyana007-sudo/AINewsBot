FROM node:22-alpine

# Chromium for Puppeteer
RUN apk add --no-cache \
    chromium \
    nss \
    freetype \
    harfbuzz \
    ca-certificates \
    ttf-freefont \
    font-noto-cjk

ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium-browser
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY src/ ./src/
COPY config/ ./config/
COPY templates/ ./templates/

# output 目录挂载点
RUN mkdir -p /app/output

ENV PORT=3457
ENV NODE_ENV=production

EXPOSE 3457

CMD ["node", "src/index.js"]
