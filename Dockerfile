# ================================
# Stage 1 — Frontend (React build)
# ================================
FROM node:20-alpine AS frontend
WORKDIR /app/frontend
# yarn.lock é opcional — se não estiver no repo, yarn cria um novo durante install.
# O bracket [k] transforma o padrão em glob que casa 0..1 arquivo (não falha se ausente).
COPY frontend/package.json frontend/yarn.loc[k] ./
RUN yarn install --network-timeout 600000
COPY frontend/ ./
# Empty string => same-origin (/api) — perfect for monolithic deploy
ARG REACT_APP_BACKEND_URL=""
ENV REACT_APP_BACKEND_URL=$REACT_APP_BACKEND_URL
ENV WDS_SOCKET_PORT=0
ENV GENERATE_SOURCEMAP=false
RUN yarn build

# ================================
# Stage 2 — Baileys sidecar deps
# ================================
FROM node:20-alpine AS baileys
WORKDIR /app/whatsapp-sidecar
COPY whatsapp-sidecar/package.json whatsapp-sidecar/package-loc[k].json ./
RUN npm install --omit=dev --no-audit --no-fund
COPY whatsapp-sidecar/server.js ./

# ================================
# Stage 3 — Runtime (Python + Node)
# ================================
FROM python:3.11-slim AS runtime
WORKDIR /app

# System deps: node.js (for baileys), supervisor, curl
RUN apt-get update && apt-get install -y --no-install-recommends \
      curl ca-certificates gnupg supervisor tini \
    && curl -fsSL https://deb.nodesource.com/setup_20.x | bash - \
    && apt-get install -y --no-install-recommends nodejs \
    && rm -rf /var/lib/apt/lists/*

# Python deps
COPY backend/requirements.txt /app/backend/requirements.txt
RUN pip install --no-cache-dir --upgrade pip \
 && pip install --no-cache-dir -r /app/backend/requirements.txt

# Backend
COPY backend/ /app/backend/

# Baileys sidecar (with node_modules from stage 2)
COPY --from=baileys /app/whatsapp-sidecar /app/whatsapp-sidecar

# Frontend build to be served by FastAPI
COPY --from=frontend /app/frontend/build /app/frontend_build

# Supervisor + entrypoint
RUN mkdir -p /etc/supervisor/conf.d
COPY scripts/supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Persistent dirs
RUN mkdir -p /app/backend/uploads /app/whatsapp-sidecar/sessions /app/logs

ENV PORT=8001 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app/backend \
    UPLOAD_PATH=/app/backend/uploads \
    WHATSAPP_SIDECAR_URL=http://localhost:3001 \
    FRONTEND_DIST=/app/frontend_build

EXPOSE 8001

# tini as PID 1 so supervisord forwards signals cleanly
ENTRYPOINT ["/usr/bin/tini", "--"]
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]
