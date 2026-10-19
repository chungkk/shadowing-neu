# syntax=docker/dockerfile:1
# Deutsch Shadowing — image cho Coolify / Docker
# Cần Node ≥ 22.5 vì dùng node:sqlite có sẵn.

# Phiên bản bgutil-ytdlp-pot-provider (server + plugin pip phải khớp nhau)
ARG BGUTIL_VERSION=2.0.2

FROM node:24-slim AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:24-slim AS build
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# PO token provider cho yt-dlp (chế độ script, chạy bằng Node) — dự phòng khi IP VPS bị YouTube chặn.
FROM node:24-slim AS bgutil
ARG BGUTIL_VERSION
RUN apt-get update && apt-get install -y --no-install-recommends git ca-certificates \
    && rm -rf /var/lib/apt/lists/*
# Thử lại tối đa 5 lần: mạng VPS → GitHub đôi khi lỗi tạm thời ("CONNECT tunnel failed, response 503")
RUN for i in 1 2 3 4 5; do \
      git clone --depth 1 --single-branch --branch ${BGUTIL_VERSION} \
        https://github.com/Brainicism/bgutil-ytdlp-pot-provider.git /opt/bgutil && break; \
      echo "git clone lỗi (lần $i), thử lại sau $((i * 10))s…"; rm -rf /opt/bgutil; sleep $((i * 10)); \
    done \
    && test -d /opt/bgutil/server \
    && cd /opt/bgutil/server && npm ci && npx tsc

FROM node:24-slim AS runner
ARG BGUTIL_VERSION
WORKDIR /app

# yt-dlp (bản mới nhất lúc build) + plugin bgutil. Khi YouTube đổi cơ chế: build lại image để cập nhật.
RUN apt-get update && apt-get install -y --no-install-recommends python3 python3-venv ca-certificates \
    && rm -rf /var/lib/apt/lists/* \
    && python3 -m venv /opt/yt-dlp \
    && /opt/yt-dlp/bin/pip install --no-cache-dir -U "yt-dlp[default]" "bgutil-ytdlp-pot-provider==${BGUTIL_VERSION}"
COPY --from=bgutil --chown=node:node /opt/bgutil/server /opt/bgutil/server

ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=3000 \
    HOSTNAME=0.0.0.0 \
    DATABASE_PATH=/app/data/shadow.db \
    PATH=/opt/yt-dlp/bin:$PATH \
    BGUTIL_SERVER_HOME=/opt/bgutil/server

COPY --from=build --chown=node:node /app/.next/standalone ./
COPY --from=build --chown=node:node /app/.next/static ./.next/static
COPY --from=build --chown=node:node /app/public ./public

# SQLite nằm ở /app/data → gắn Persistent Storage (volume) vào đây trên Coolify
RUN mkdir -p /app/data && chown node:node /app/data
VOLUME ["/app/data"]

USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "server.js"]
