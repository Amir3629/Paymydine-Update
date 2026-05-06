#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/paymydine}"
TENANT_DB="${TENANT_DB:-mimoza}"
APPLY_FIX="${APPLY_FIX:-0}"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/storage/qr-pay-later-audit-$(date +%Y%m%d_%H%M%S)}"

cd "$APP_DIR"
mkdir -p "$BACKUP_DIR"

php artisan cache:clear || true
php artisan route:clear || true
php artisan config:clear || true
php artisan view:clear || true

env_value() {
  local key="$1" default="$2" value=""
  if [ -f .env ]; then
    value="$(awk -F= -v key="$key" '$1 == key {print substr($0, index($0, "=") + 1); exit}' .env | sed -e 's/^ *//' -e 's/ *$//' -e 's/^"//' -e 's/"$//' -e "s/^'//" -e "s/'$//")"
  fi
  printf '%s' "${value:-$default}"
}

DB_HOST="${DB_HOST:-$(env_value DB_HOST 127.0.0.1)}"
DB_PORT="${DB_PORT:-$(env_value DB_PORT 3306)}"
DB_USER="${DB_USER:-$(env_value DB_USERNAME root)}"
DB_PASS="${DB_PASS:-$(env_value DB_PASSWORD '')}"
MYSQL=(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" "$TENANT_DB")
if [ -n "$DB_PASS" ]; then MYSQL=(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASS" "$TENANT_DB"); fi

"${MYSQL[@]}" --batch --raw <<'SQL' | tee "$BACKUP_DIR/open_qr_pay_later_orders.tsv"
SELECT o.order_type AS table_key,
       COUNT(*) AS open_qr_pay_later_count,
       GROUP_CONCAT(o.order_id ORDER BY o.order_id DESC) AS order_ids_newest_first
FROM ti_orders o
WHERE o.payment='qr_pay_later'
  AND (o.settlement_status IS NULL OR o.settlement_status NOT IN ('paid','cancelled','failed'))
  AND (o.settled_amount IS NULL OR o.settled_amount < o.order_total)
GROUP BY o.order_type
HAVING COUNT(*) > 1;
SQL

if [ "$APPLY_FIX" = "1" ]; then
  echo "APPLY_FIX=1: marking older duplicate open QR pay-later orders as cancelled/duplicate; newest order per table remains open."
  "${MYSQL[@]}" <<'SQL'
UPDATE ti_orders older
JOIN (
  SELECT order_type, MAX(order_id) AS keep_order_id
  FROM ti_orders
  WHERE payment='qr_pay_later'
    AND (settlement_status IS NULL OR settlement_status NOT IN ('paid','cancelled','failed'))
    AND (settled_amount IS NULL OR settled_amount < order_total)
  GROUP BY order_type
  HAVING COUNT(*) > 1
) keepers ON keepers.order_type = older.order_type
SET older.settlement_status = 'cancelled',
    older.comment = CONCAT(COALESCE(older.comment, ''), ' | PMD duplicate QR pay-later closed by audit script'),
    older.updated_at = NOW()
WHERE older.payment='qr_pay_later'
  AND older.order_id <> keepers.keep_order_id
  AND (older.settlement_status IS NULL OR older.settlement_status NOT IN ('paid','cancelled','failed'))
  AND (older.settled_amount IS NULL OR older.settled_amount < older.order_total);
SQL
fi

echo "Audit written to: $BACKUP_DIR/open_qr_pay_later_orders.tsv"
