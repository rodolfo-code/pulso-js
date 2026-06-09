# syntax=docker/dockerfile:1.7

# ── Stage 1: deps ─────────────────────────────────────────
FROM node:22-alpine AS deps
WORKDIR /app

# Habilita Corepack (pra usar pnpm na versão fixada no packageManager)
RUN corepack enable

# Manifests primeiro (cache de layer)
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY prisma ./prisma

# Install com lockfile estrito + executa scripts pré-aprovados (allowBuilds)
RUN pnpm install --frozen-lockfile

# Gera Prisma Client em prisma/generated/prisma
RUN pnpm prisma generate


# ── Stage 2: build ────────────────────────────────────────
FROM node:22-alpine AS build
WORKDIR /app

RUN corepack enable

# Reaproveita node_modules + Prisma Client da stage anterior
COPY --from=deps /app/node_modules ./node_modules
COPY --from=deps /app/prisma/generated ./prisma/generated

# Manifests + configs de build
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY tsconfig.json tsconfig.build.json nest-cli.json .swcrc ./

# Source
COPY src ./src
COPY prisma ./prisma

# Compila TS → JS em dist/
RUN pnpm build


# ── Stage 3: production ───────────────────────────────────
FROM node:22-alpine AS production
WORKDIR /app

# OpenSSL é dependência do Prisma engine
RUN apk add --no-cache openssl

RUN corepack enable

# Usuário não-root
RUN addgroup -g 1001 -S pulso && adduser -u 1001 -S pulso -G pulso

# Copia só o necessário pra runtime
COPY --from=build --chown=pulso:pulso /app/dist ./dist
COPY --from=build --chown=pulso:pulso /app/node_modules ./node_modules
COPY --from=build --chown=pulso:pulso /app/prisma ./prisma
COPY --chown=pulso:pulso package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY --chown=pulso:pulso entrypoint.sh ./
RUN chmod +x entrypoint.sh

USER pulso

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
