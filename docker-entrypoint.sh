#!/bin/sh
set -e

# Support configurable PORT (defaulting to 3000)
export PORT=${PORT:-3000}

# Support Unraid PUID / PGID (defaults to nobody:users 99:100)
PUID=${PUID:-99}
PGID=${PGID:-100}

echo "=========================================="
echo "Starting EventSpace Unified Container"
echo "PORT: $PORT"
echo "PUID: $PUID | PGID: $PGID"
echo "Database URL: $DATABASE_URL"
echo "=========================================="

mkdir -p /app/data

# Sync database schema to SQLite on container boot
echo "Applying database schema migrations..."
npx prisma db push --skip-generate

# Auto-seed tutorial event if database is fresh/empty
echo "Checking database state..."
node dist/seed.js --if-empty 2>/dev/null || npx tsx prisma/seed.ts --if-empty 2>/dev/null || true

# Ensure correct volume ownership for Unraid
chown -R "$PUID:$PGID" /app/data

# Drop privileges to PUID/PGID and execute CMD
exec su-exec "$PUID:$PGID" "$@"
