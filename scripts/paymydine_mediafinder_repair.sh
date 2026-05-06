#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/paymydine}"
TENANT_DB="${TENANT_DB:-mimoza}"
MENU_ID="${MENU_ID:-113}"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="${BACKUP_DIR:-$APP_DIR/storage/pmd-mediafinder-fix-$STAMP}"

cd "$APP_DIR"
mkdir -p "$BACKUP_DIR"

backup_if_exists() {
  local path="$1"
  if [ -e "$path" ]; then
    mkdir -p "$BACKUP_DIR/$(dirname "$path")"
    cp -a "$path" "$BACKUP_DIR/$path"
  fi
}

for path in \
  app/admin/views/_layouts/default.blade.php \
  app/admin/formwidgets/mediafinder/assets/js/mediafinder.js \
  app/admin/formwidgets/MediaFinder.php \
  app/main/widgets/mediamanager/assets/js/mediamanager.js \
  app/main/widgets/mediamanager/assets/js/mediamanager.modal.js \
  app/admin/assets/js/pmd-mediafinder-autofix.js \
  app/admin/assets/css/pmd-mediamanager-autofix.css \
  app/admin/assets/vendor/pmd-mediafix; do
  backup_if_exists "$path"
done

rm -f app/admin/assets/js/pmd-mediafinder-autofix.js app/admin/assets/css/pmd-mediamanager-autofix.css
rm -rf app/admin/assets/vendor/pmd-mediafix

missing=0
for path in \
  app/main/widgets/mediamanager/assets/vendor/selectonic/selectonic.min.js \
  app/main/widgets/mediamanager/assets/vendor/treeview/bootstrap-treeview.min.js \
  app/main/widgets/mediamanager/assets/vendor/dropzone/dropzone.min.js \
  app/admin/formwidgets/repeater/assets/vendor/sortablejs/Sortable.min.js \
  app/admin/assets/src/js/vendor/moment.min.js \
  app/admin/formwidgets/datepicker/assets/vendor/clockpicker/bootstrap-clockpicker.min.js \
  app/admin/formwidgets/datepicker/assets/vendor/datetimepicker/tempusdominus-bootstrap-4.min.js \
  app/admin/widgets/form/assets/vendor/inputmask/jquery.inputmask.min.js; do
  if [ ! -s "$path" ]; then
    echo "Missing required local asset: $path" >&2
    missing=1
  fi
done
if [ "$missing" -ne 0 ]; then
  echo "Install/build the missing local vendor assets before continuing." >&2
  exit 1
fi

php artisan cache:clear || true
php artisan view:clear || true
php artisan config:clear || true
php artisan route:clear || true

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

"${MYSQL[@]}" <<SQL
SELECT attachment_id, COUNT(*) AS thumbs_before
FROM ti_media_attachments
WHERE attachment_type='menus' AND tag='thumb'
GROUP BY attachment_id
HAVING COUNT(*) > 1;

DELETE ma
FROM ti_media_attachments ma
JOIN (
  SELECT attachment_id, MAX(id) AS keep_id
  FROM ti_media_attachments
  WHERE attachment_type='menus' AND tag='thumb'
  GROUP BY attachment_id
) keepers
  ON keepers.attachment_id = ma.attachment_id
WHERE ma.attachment_type='menus'
  AND ma.tag='thumb'
  AND ma.id <> keepers.keep_id;

SELECT COUNT(*) AS menu_${MENU_ID}_thumb_count
FROM ti_media_attachments
WHERE attachment_type='menus' AND attachment_id=${MENU_ID} AND tag='thumb';
SQL

echo "Backup written to: $BACKUP_DIR"
