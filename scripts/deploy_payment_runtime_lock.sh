#!/usr/bin/env bash
set -euo pipefail

# Usage:
#   REPO_DIR=/path/to/Paymydine-Update TARGET_DIR=/var/www/paymydine ./scripts/deploy_payment_runtime_lock.sh

REPO_DIR="${REPO_DIR:-$(pwd)}"
TARGET_DIR="${TARGET_DIR:-/var/www/paymydine}"

FILES=(
  "app/admin/controllers/Payments.php"
  "app/admin/routes.php"
  "frontend/app/admin/payments/page.tsx"
  "frontend/app/menu/page.tsx"
  "docs/payment-provider-matrix.md"
  "docs/payment-uat-playbook.md"
  "scripts/payment-uat/run-payment-uat.sh"
)

echo "[deploy] Copying files to ${TARGET_DIR}"
for f in "${FILES[@]}"; do
  install -D -m 0644 "${REPO_DIR}/${f}" "${TARGET_DIR}/${f}"
  echo "  - ${f}"
done

chmod +x "${TARGET_DIR}/scripts/payment-uat/run-payment-uat.sh"

echo "[deploy] Clearing Laravel caches"
(
  cd "${TARGET_DIR}"
  php artisan optimize:clear || true
)

echo "[deploy] Building frontend"
(
  cd "${TARGET_DIR}/frontend"
  npm ci --no-audit --no-fund
  npm run build
)

echo "[deploy] Done. Restart php-fpm/nginx/node as needed for your stack."
