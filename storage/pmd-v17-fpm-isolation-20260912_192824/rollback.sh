#!/usr/bin/env bash
set -Eeuo pipefail
OUT="$(cd "$(dirname "$0")" && pwd)"
while IFS=$'\t' read -r original backup; do [ -n "$original" ] && sudo cp -a "$backup" "$original"; done < "$OUT/nginx-backup/manifest.tsv"
sudo rm -f /etc/nginx/snippets/pmd-workload-isolation-r1.conf /etc/nginx/snippets/pmd-isolated-fastcgi-common-r1.conf
sudo rm -f /etc/php/8.3/fpm/pool.d/pmd-ai.conf /etc/php/8.3/fpm/pool.d/pmd-payment.conf
sudo php-fpm8.3 -t; sudo systemctl daemon-reload; sudo systemctl reload php8.3-fpm
sudo nginx -t; sudo systemctl reload nginx
echo V17_MANUAL_ROLLBACK=COMPLETE
