#!/usr/bin/env bash
set -euo pipefail
sudo cp -a "/var/www/paymydine/storage/pmd-loopback-proxy-v3-20260911_094053/pmd-internal-backend.conf.before" "/etc/nginx/conf.d/pmd-internal-backend.conf"
sudo nginx -t
sudo systemctl reload nginx
PMD_BACKEND_ORIGIN=auto pm2 restart paymydine-frontend-v2 --update-env
pm2 save
echo "PMD LOOPBACK PROXY V3 ROLLED BACK"
