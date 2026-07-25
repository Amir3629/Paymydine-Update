#!/usr/bin/env bash
set -euo pipefail

REPO="/var/www/paymydine/frontend/Paymydine-Update"
LIVE="/var/www/paymydine"
BRANCH="origin/agent/reservationsnew-clean"

CONTROLLER="app/admin/controllers/Reservationsnew.php"
VIEW="app/admin/views/reservationsnew/index.blade.php"

cd "$REPO"
git fetch origin agent/reservationsnew-clean

TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

for FILE in "$CONTROLLER" "$VIEW"; do
    mkdir -p "$TMP/$(dirname "$FILE")"
    git show "$BRANCH:$FILE" > "$TMP/$FILE"
done

echo "Checking PHP syntax..."
php -l "$TMP/$CONTROLLER"

if ! grep -Fq "class Reservationsnew extends Reservations2" "$TMP/$CONTROLLER"; then
    echo "STOP: Reservationsnew controller validation failed."
    exit 2
fi

if ! grep -Fq "admin::reservations2.index" "$TMP/$VIEW"; then
    echo "STOP: Reservationsnew view validation failed."
    exit 3
fi

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="/var/backups/paymydine-reservationsnew-phase1-$STAMP"

sudo mkdir -p "$BACKUP"

for FILE in "$CONTROLLER" "$VIEW"; do
    if [ -f "$LIVE/$FILE" ]; then
        sudo mkdir -p "$BACKUP/$(dirname "$FILE")"
        sudo cp -a "$LIVE/$FILE" "$BACKUP/$FILE"
    fi

done

for FILE in "$CONTROLLER" "$VIEW"; do
    sudo mkdir -p "$LIVE/$(dirname "$FILE")"
    sudo install \
      -m 0644 \
      -o www-data \
      -g www-data \
      "$TMP/$FILE" \
      "$LIVE/$FILE"
done

cd "$LIVE"
php artisan view:clear || true

INSTALLED_CONTROLLER="$(git hash-object "$LIVE/$CONTROLLER")"
INSTALLED_VIEW="$(git hash-object "$LIVE/$VIEW")"

EXPECTED_CONTROLLER="$(git hash-object "$TMP/$CONTROLLER")"
EXPECTED_VIEW="$(git hash-object "$TMP/$VIEW")"

if [ "$INSTALLED_CONTROLLER" != "$EXPECTED_CONTROLLER" ] || \
   [ "$INSTALLED_VIEW" != "$EXPECTED_VIEW" ]; then
    echo "STOP: Installed-file verification failed."
    exit 4
fi

echo
echo "Reservationsnew phase 1 deployed."
echo "Controller: $INSTALLED_CONTROLLER"
echo "View:       $INSTALLED_VIEW"
echo "Backup:     $BACKUP"
echo
echo "Open:"
echo "https://mimoza.paymydine.com/admin/reservationsnew?phase1=$STAMP"
