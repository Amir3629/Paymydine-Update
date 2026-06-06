#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

MYSQL_BIN="${MYSQL_BIN:-mysql}"
MYSQL_USER="${MYSQL_USER:-root}"
MYSQL_PASSWORD="${MYSQL_PASSWORD:-P@ssw0rd@123}"
SNAPSHOT_DIR="${SNAPSHOT_DIR:-local-snapshot}"
DB_DIR="$SNAPSHOT_DIR/dbs"
MEDIA_DIR="$SNAPSHOT_DIR/media"

mysql_exec() {
  MYSQL_PWD="$MYSQL_PASSWORD" "$MYSQL_BIN" -u "$MYSQL_USER" "$@"
}

require_file() {
  if [ ! -f "$1" ]; then
    echo "Missing required file: $1"
    exit 1
  fi
}

echo "==> Checking snapshot files"
require_file "$DB_DIR/paymydine.sql"
require_file "$DB_DIR/mimoza.sql"
require_file "$DB_DIR/rosana.sql"
require_file "$DB_DIR/persian.sql"

if [ ! -f .env ]; then
  if [ -f "$SNAPSHOT_DIR/env/.env.local.example" ]; then
    cp "$SNAPSHOT_DIR/env/.env.local.example" .env
  else
    echo "Missing .env and $SNAPSHOT_DIR/env/.env.local.example"
    exit 1
  fi
fi

echo "==> Installing composer dependencies if vendor is missing"
if [ ! -d vendor ]; then
  composer install
fi

echo "==> Creating local databases"
for db in paymydine mimoza rosana persian; do
  mysql_exec -e "CREATE DATABASE IF NOT EXISTS \`$db\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
done

echo "==> Importing database snapshot"
mysql_exec paymydine < "$DB_DIR/paymydine.sql"
mysql_exec mimoza < "$DB_DIR/mimoza.sql"
mysql_exec rosana < "$DB_DIR/rosana.sql"
mysql_exec persian < "$DB_DIR/persian.sql"

echo "==> Restoring media snapshot"
mkdir -p assets/media storage/app/public
if [ -f "$MEDIA_DIR/assets-media.tar.gz" ]; then
  tar -xzf "$MEDIA_DIR/assets-media.tar.gz" -C "$ROOT_DIR"
else
  echo "Warning: $MEDIA_DIR/assets-media.tar.gz not found"
fi

if [ -f "$MEDIA_DIR/storage-public.tar.gz" ]; then
  tar -xzf "$MEDIA_DIR/storage-public.tar.gz" -C "$ROOT_DIR"
else
  echo "Warning: $MEDIA_DIR/storage-public.tar.gz not found"
fi

echo "==> Restoring Git-tracked custom app files overwritten by composer packages"
if git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  git reset --hard HEAD
  git clean -fd app/admin app/main app/system
fi

echo "==> Clearing Laravel/TastyIgniter cache"
composer dump-autoload
php artisan config:clear
php artisan cache:clear
php artisan view:clear

echo "==> Running parity audit"
bash scripts/audit-local-parity-mac.sh

echo ""
echo "DONE. Start the app with:"
echo "php -S 127.0.0.1:8000 server.php"
echo ""
echo "Open tenant admin with:"
echo "http://mimoza.lvh.me:8000/admin"
