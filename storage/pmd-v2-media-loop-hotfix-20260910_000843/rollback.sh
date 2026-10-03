#!/usr/bin/env bash
set -Eeuo pipefail

LIVE="/var/www/paymydine/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815"
BACKUP="/var/www/paymydine/storage/pmd-v2-media-loop-hotfix-20260910_000843"
SERVICE="paymydine-frontend-v2"

sudo -u ubuntu -H pm2 stop "$SERVICE"

rm -rf "$LIVE/.next"

if [ ! -d "$BACKUP/next.previous" ]; then
    echo "Previous .next backup is missing"
    exit 1
fi

mv "$BACKUP/next.previous" "$LIVE/.next"
cp -a "$BACKUP/files/." "$LIVE/"

sudo -u ubuntu -H pm2 restart "$SERVICE"

for i in $(seq 1 15); do
    if curl --fail --silent --show-error       http://127.0.0.1:3002/api/health >/dev/null 2>&1; then
        echo "ROLLBACK COMPLETE: health OK"
        exit 0
    fi
    sleep 1
done

echo "ROLLBACK FILES RESTORED BUT HEALTH CHECK FAILED"
exit 1
