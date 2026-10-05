#!/usr/bin/env bash
set -euo pipefail

BACKUP="/var/www/paymydine/storage/pmd-internal-backend-fix-20260910_235820"
CONF="/etc/nginx/conf.d/pmd-internal-backend.conf"
V2="/var/www/paymydine/frontend-v2/PayMyDine-Frontend-V2-Integrated-Final-R2-20260815"
BOOT="$V2/src/server/bootstrap.ts"

cp -a \
  "$BACKUP/bootstrap.ts.before" \
  "$BOOT"

if [ -f "$BACKUP/pmd-internal-backend.conf.before" ]; then
    sudo cp -a \
      "$BACKUP/pmd-internal-backend.conf.before" \
      "$CONF"
else
    sudo rm -f "$CONF"
fi

sudo nginx -t
sudo systemctl reload nginx

export PMD_BACKEND_ORIGIN=auto

pm2 restart \
  paymydine-frontend-v2 \
  --update-env

pm2 save

echo "PMD INTERNAL BACKEND ROLLBACK COMPLETE"
