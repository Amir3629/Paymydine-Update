#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MYSQL_BIN="${MYSQL_BIN:-mysql}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-P@ssw0rd@123}"

mysql_exec() {
  MYSQL_PWD="$MYSQL_PASSWORD" "$MYSQL_BIN" -u "$MYSQL_USER" "$@"
}

fail=0
check_file() {
  if [ -e "$1" ]; then
    echo "OK file: $1"
  else
    echo "MISSING file: $1"
    fail=1
  fi
}

check_dir() {
  if [ -d "$1" ]; then
    echo "OK dir: $1"
  else
    echo "MISSING dir: $1"
    fail=1
  fi
}

echo "== Code checks =="
check_file composer.json
check_file server.php
check_file .env
check_file app/admin/models/Fiskaly_configs_model.php
check_file app/admin/models/Fiskaly_transactions_model.php
check_file app/admin/services/Fiskaly/FiskalyConfigResolver.php
check_file app/admin/assets/css/pmd-admin-theme-v1.css
check_dir assets/media/attachments/public
check_dir storage/app/public

echo ""
echo "== Database checks =="
for db in paymydine mimoza rosana persian; do
  echo "--- $db ---"
  if mysql_exec "$db" -e "SELECT DATABASE() AS db;" >/dev/null 2>&1; then
    mysql_exec "$db" -e "SELECT COUNT(*) AS menus FROM ti_menus;" || true
    mysql_exec "$db" -e "SELECT COUNT(*) AS media_rows FROM ti_media_attachments;" || true
  else
    echo "MISSING database or login failed: $db"
    fail=1
  fi
done

echo ""
echo "== Media row to file sample check =="
for db in mimoza rosana persian paymydine; do
  echo "--- $db sample media rows ---"
  mysql_exec "$db" -N -e "SELECT id, name FROM ti_media_attachments WHERE name IS NOT NULL AND name <> '' ORDER BY id DESC LIMIT 20;" 2>/dev/null | while read -r id name; do
    [ -z "${name:-}" ] && continue
    found="$(find assets/media storage/app/public -type f -name "$name" -o -name "thumb_${id}_*" 2>/dev/null | head -1 || true)"
    if [ -n "$found" ]; then
      echo "OK media id=$id name=$name -> $found"
    else
      echo "MISSING media file for db=$db id=$id name=$name"
    fi
  done || true
done

echo ""
if [ "$fail" -eq 0 ]; then
  echo "Audit finished. No critical missing code/db/media directory detected. Review sample media rows above."
else
  echo "Audit finished with missing critical items."
  exit 1
fi
