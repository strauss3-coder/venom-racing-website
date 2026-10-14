#!/usr/bin/env bash
# ops/backup-db.sh - full, compressed dump of the Supabase database.
#
#   export SUPABASE_DB_URL='postgresql://...'   # Supabase -> Settings -> Database
#   ./ops/backup-db.sh [output-dir]
#
# The dump contains customers' personal information (enquiries). It is
# written with owner-only permissions; keep the folder encrypted (FileVault
# or an encrypted drive) and never commit, upload publicly or email it.
# Read-only: this script never changes the database.
set -euo pipefail

: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL first (never store it in a file in this repo).}"
command -v pg_dump >/dev/null || { echo "pg_dump not found - install with: brew install libpq && brew link --force libpq" >&2; exit 1; }

OUT_DIR="${1:-$HOME/VenomBackups}"
KEEP=12
umask 077
mkdir -p "$OUT_DIR"

FILE="$OUT_DIR/venom-db-$(date +%F).sql.gz"
pg_dump "$SUPABASE_DB_URL" --no-owner --no-privileges --schema=public --schema=auth --schema=storage \
  | gzip -9 > "$FILE.partial"
mv "$FILE.partial" "$FILE"

# Sanity check: an empty or truncated dump is worse than none.
gunzip -t "$FILE"
[ "$(gunzip -c "$FILE" | grep -c 'CREATE TABLE')" -gt 0 ] || { echo "Dump has no tables - check the connection string." >&2; exit 1; }

# Keep the newest $KEEP dumps.
ls -1t "$OUT_DIR"/venom-db-*.sql.gz 2>/dev/null | tail -n +$((KEEP + 1)) | while read -r old; do rm -f -- "$old"; done

echo "Backup written: $FILE ($(du -h "$FILE" | cut -f1))"
