#!/bin/sh
set -e

# Entry point for the API container.
#
# Database migrations and seeding are wired here so that `docker compose up`
# yields a ready-to-use system. Until Prisma is introduced (Prompt 03), these
# steps are intentionally no-ops guarded by the presence of a schema.

if [ -f "prisma/schema.prisma" ]; then
  echo "[entrypoint] Applying database migrations..."
  npx prisma migrate deploy

  if [ "${RUN_DB_SEED:-false}" = "true" ]; then
    echo "[entrypoint] Seeding database..."
    npm run db:seed --if-present
  fi
else
  echo "[entrypoint] No Prisma schema yet; skipping migrations and seed."
fi

echo "[entrypoint] Starting: $*"
exec "$@"
