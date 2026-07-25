#!/usr/bin/env bash
set -euo pipefail

REPO="/var/www/paymydine/frontend/Paymydine-Update"
LIVE="/var/www/paymydine"
BRANCH="origin/agent/reservations2-runtime-cleanup"

FILES=(
  "app/admin/views/reservations2/index.blade.php"
  "app/admin/assets/js/pmd-reservations2-runtime-cleanup-v1.js"
  "app/admin/assets/css/pmd-reservations2-runtime-cleanup-v1.css"
)

cd "$REPO"
git fetch origin agent/reservations2-runtime-cleanup

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

for FILE in "${FILES[@]}"; do
  mkdir -p "$TMP/$(dirname "$FILE")"
  git show "$BRANCH:$FILE" > "$TMP/$FILE"
done

echo "Checking JavaScript syntax..."
node --check "$TMP/app/admin/assets/js/pmd-reservations2-runtime-cleanup-v1.js"

grep -Fq "PMD_RESERVATIONS2_REAL_WAITER_EMBED = false" \
  "$TMP/app/admin/views/reservations2/index.blade.php"

grep -Fq "pmd-reservations2-runtime-cleanup-v1.css" \
  "$TMP/app/admin/views/reservations2/index.blade.php"

grep -Fq "pmd-reservations2-runtime-cleanup-v1.js" \
  "$TMP/app/admin/views/reservations2/index.blade.php"

grep -Fq "pmd-reservations2-calendar-toggle-v1.css?v=1.19.0" \
  "$TMP/app/admin/views/reservations2/index.blade.php"

grep -Fq "pmd-reservations2-calendar-toggle-v1.js?v=1.16.0" \
  "$TMP/app/admin/views/reservations2/index.blade.php"

if grep -Fq "id=\"pmd-waiter-dashboard-root\"" \
  "$TMP/app/admin/views/reservations2/index.blade.php"; then
  echo "STOP: legacy waiter root still exists in branch Blade."
  exit 2
fi

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="/var/backups/paymydine-r2-runtime-cleanup-v1-$STAMP"

sudo mkdir -p "$BACKUP"

for FILE in "${FILES[@]}"; do
  if [ -f "$LIVE/$FILE" ]; then
    sudo mkdir -p "$BACKUP/$(dirname "$FILE")"
    sudo cp -a "$LIVE/$FILE" "$BACKUP/$FILE"
  fi

  sudo install \
    -m 0644 \
    -o www-data \
    -g www-data \
    "$TMP/$FILE" \
    "$LIVE/$FILE"
done

cd "$LIVE"
php artisan view:clear || true

printf '\nInstalled files:\n'
for FILE in "${FILES[@]}"; do
  printf '%s  %s\n' "$(git hash-object "$LIVE/$FILE")" "$FILE"
done

printf '\nReservations2 runtime cleanup deployed.\n'
printf 'Backup: %s\n' "$BACKUP"
printf 'Open: https://mimoza.paymydine.com/admin/reservations2?runtime_cleanup_v1=%s\n' "$STAMP"
