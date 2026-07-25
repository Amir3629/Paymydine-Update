#!/usr/bin/env bash
set -euo pipefail

REPO="/var/www/paymydine/frontend/Paymydine-Update"
LIVE="/var/www/paymydine"
BRANCH="origin/agent/reservationsnew-layout-fix"

VIEW="app/admin/views/reservationsnew/index.blade.php"
CSS="app/admin/assets/css/pmd-reservationsnew-layout-v1.css"
EXPECTED_CURRENT_VIEW="77f102e58349ef195eab39aadd0d807af28a2802"

cd "$REPO"
git fetch origin agent/reservationsnew-layout-fix

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

for FILE in "$VIEW" "$CSS"; do
    mkdir -p "$TMP/$(dirname "$FILE")"
    git show "$BRANCH:$FILE" > "$TMP/$FILE"
done

if [ ! -f "$LIVE/$VIEW" ]; then
    echo "STOP: Reservationsnew view is missing from live."
    exit 2
fi

CURRENT_VIEW="$(git hash-object "$LIVE/$VIEW")"
NEW_VIEW="$(git hash-object "$TMP/$VIEW")"
NEW_CSS="$(git hash-object "$TMP/$CSS")"

echo "Current view: $CURRENT_VIEW"
echo "Expected:     $EXPECTED_CURRENT_VIEW"
echo "New view:     $NEW_VIEW"
echo "New CSS:      $NEW_CSS"

if [ "$CURRENT_VIEW" != "$EXPECTED_CURRENT_VIEW" ]; then
    echo
    echo "STOP: Live Reservationsnew view is not phase 1."
    echo "Nothing was changed."
    exit 3
fi

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="/var/backups/paymydine-reservationsnew-layout-v1-$STAMP"

sudo mkdir -p "$BACKUP/$(dirname "$VIEW")"
sudo cp -a "$LIVE/$VIEW" "$BACKUP/$VIEW"

if [ -f "$LIVE/$CSS" ]; then
    sudo mkdir -p "$BACKUP/$(dirname "$CSS")"
    sudo cp -a "$LIVE/$CSS" "$BACKUP/$CSS"
fi

sudo install -m 0644 -o www-data -g www-data "$TMP/$VIEW" "$LIVE/$VIEW"
sudo install -m 0644 -o www-data -g www-data "$TMP/$CSS" "$LIVE/$CSS"

cd "$LIVE"
php artisan view:clear || true

echo
echo "Installed view: $(git hash-object "$LIVE/$VIEW")"
echo "Installed CSS:  $(git hash-object "$LIVE/$CSS")"
echo "Backup:         $BACKUP"
echo
echo "Open:"
echo "https://mimoza.paymydine.com/admin/reservationsnew?layout_v1=$STAMP"
