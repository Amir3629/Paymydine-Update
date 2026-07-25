#!/usr/bin/env bash
set -euo pipefail

REPO="/var/www/paymydine/frontend/Paymydine-Update"
LIVE="/var/www/paymydine"
BRANCH="origin/agent/reservationsnew-layout-fix"

VIEW="app/admin/views/reservationsnew/index.blade.php"
CSS="app/admin/assets/css/pmd-reservationsnew-layout-v1.css"

EXPECTED_CURRENT_VIEW="409a7f9a3759f8aa413e6ce8e468a97437dfef34"
EXPECTED_CURRENT_CSS="8dcf29d460192b1cfb325efdac981257b65636a1"
EXPECTED_NEW_VIEW="28d04f08370c408c5552ed108b18e4d7cf72c57d"
EXPECTED_NEW_CSS="d50c574defec21b5583fd5f2f366b6db4a421b5e"

cd "$REPO"
git fetch origin agent/reservationsnew-layout-fix

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

for FILE in "$VIEW" "$CSS"; do
    mkdir -p "$TMP/$(dirname "$FILE")"
    git show "$BRANCH:$FILE" > "$TMP/$FILE"
done

CURRENT_VIEW="$(git hash-object "$LIVE/$VIEW")"
CURRENT_CSS="$(git hash-object "$LIVE/$CSS")"
NEW_VIEW="$(git hash-object "$TMP/$VIEW")"
NEW_CSS="$(git hash-object "$TMP/$CSS")"

echo "Current view: $CURRENT_VIEW"
echo "Expected:     $EXPECTED_CURRENT_VIEW"
echo "Current CSS:  $CURRENT_CSS"
echo "Expected:     $EXPECTED_CURRENT_CSS"
echo
echo "New view:     $NEW_VIEW"
echo "Expected:     $EXPECTED_NEW_VIEW"
echo "New CSS:      $NEW_CSS"
echo "Expected:     $EXPECTED_NEW_CSS"

if [ "$CURRENT_VIEW" != "$EXPECTED_CURRENT_VIEW" ] || \
   [ "$CURRENT_CSS" != "$EXPECTED_CURRENT_CSS" ]; then
    echo
    echo "STOP: Live Reservationsnew files are not Layout V1."
    echo "Nothing was changed."
    exit 2
fi

if [ "$NEW_VIEW" != "$EXPECTED_NEW_VIEW" ] || \
   [ "$NEW_CSS" != "$EXPECTED_NEW_CSS" ]; then
    echo
    echo "STOP: Branch files are not Layout V2."
    echo "Nothing was changed."
    exit 3
fi

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="/var/backups/paymydine-reservationsnew-layout-v2-$STAMP"

sudo mkdir -p "$BACKUP/$(dirname "$VIEW")"
sudo mkdir -p "$BACKUP/$(dirname "$CSS")"
sudo cp -a "$LIVE/$VIEW" "$BACKUP/$VIEW"
sudo cp -a "$LIVE/$CSS" "$BACKUP/$CSS"

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
echo "https://mimoza.paymydine.com/admin/reservationsnew?layout_v2=$STAMP"
