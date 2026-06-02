# Stage 1: builder
FROM node:22-alpine AS builder

WORKDIR /app

# Install all dependencies (incluindo dev) para conseguir compilar TS
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci

# Generate Prisma Client e build NestJS
COPY tsconfig*.json nest-cli.json ./
COPY src/ ./src/
RUN npx prisma generate && npm run build

# Stage 2: production
FROM node:22-alpine AS production

# Create non-root user
RUN addgroup -g 1001 -S appuser && \
    adduser -u 1001 -S appuser -G appuser

WORKDIR /app

# Production deps + Prisma Client
COPY package.json package-lock.json* ./
COPY prisma ./prisma
RUN npm ci --omit=dev && npx prisma generate && npm cache clean --force

# Copy artefatos compilados
COPY --from=builder /app/dist ./dist

ENV NODE_ENV=production

# Entrypoint
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

USER appuser

EXPOSE 8000

ENTRYPOINT ["./entrypoint.sh"]
