#!/bin/sh
set -e

# Roda migrations só se houver alguma — ainda não temos migrations
if [ -d "prisma/migrations" ] && [ -n "$(ls -A prisma/migrations 2>/dev/null)" ]; then
  ./node_modules/.bin/prisma migrate deploy
else
  echo "[entrypoint] No migrations to deploy — skipping."
fi

# Sobe o NestJS
exec node dist/src/main.js
