#!/usr/bin/env bash
# Healthcheck script for PostgreSQL container readiness
HOST="${POSTGRES_HOST:-localhost}"
PORT="${POSTGRES_PORT:-5432}"
PGUSER="${POSTGRES_USER:-postgres}"
DB="${POSTGRES_DB:-dewordle_dev}"
MAX_RETRIES=30
echo "Waiting for PostgreSQL at $HOST:$PORT..."
for i in $(seq 1 $MAX_RETRIES); do
  if pg_isready -h "$HOST" -p "$PORT" -U "$PGUSER" -d "$DB" -q; then
    echo "PostgreSQL is ready!"
    exit 0
  fi
  echo "  Not ready ($i/$MAX_RETRIES)..."
  sleep 2
done
echo "ERROR: PostgreSQL not ready."
exit 1