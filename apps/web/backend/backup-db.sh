#!/usr/bin/env bash
# Daily full backup of the Call CRM Neon database -> apps/web/backend/backups/
# Runs via cron at 19:00. Keeps the last 14 daily dumps.
set -euo pipefail

BACKEND_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$BACKEND_DIR/.env"
DEST="$BACKEND_DIR/backups"
KEEP=14
PG_DUMP="$HOME/tools/pg18/usr/lib/postgresql/18/bin/pg_dump"
[ -x "$PG_DUMP" ] || PG_DUMP="$(command -v pg_dump)"

DB_URL=$(grep -E '^DATABASE_URL=' "$ENV_FILE" | head -1 | cut -d= -f2- | tr -d '"'"'"' \r')
[ -n "$DB_URL" ] || { echo "DATABASE_URL not found in $ENV_FILE"; exit 1; }

STAMP=$(date +%Y-%m-%d)
OUT="$DEST/call-crm_$STAMP.dump"

"$PG_DUMP" "$DB_URL" -Fc -f "$OUT"
ls -lh "$OUT"

# keep only last $KEEP backups
ls -1t "$DEST"/call-crm_*.dump | tail -n +$((KEEP + 1)) | xargs -r rm -f
echo "Backup done: $OUT"
