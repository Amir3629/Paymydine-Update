#!/usr/bin/env bash
set -Eeuo pipefail

REPO="${PMD_REPO:-/var/www/paymydine}"
BRANCH="${PMD_BRANCH:-agent/waiter-pos-ordering-v1}"
V1_BASE="${PMD_V1_BASE:-d26422997e4ad4de721692ee16fa0583a998857a}"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="${HOME}/pmd-backups/waiter-pos-v2-${STAMP}"
PATCH="/tmp/pmd-waiter-pos-v2-${STAMP}.patch"
MIGRATION="app/admin/database/migrations/2026_07_12_000100_extend_waiter_pos_payment_transactions.php"
SUCCESS=0

cd "$REPO"

RUNTIME_FILES=(
  "app/admin/controllers/PmdWaiterPosV1.php"
  "app/admin/controllers/concerns/PmdWaiterPosRenderEndpoints.php"
  "app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php"
  "app/admin/controllers/concerns/PmdWaiterPosPaymentBasicEndpoints.php"
  "app/admin/controllers/concerns/PmdWaiterPosSettleEndpoint.php"
  "app/admin/controllers/concerns/PmdWaiterPosTerminalEndpoint.php"
  "app/admin/controllers/concerns/PmdWaiterPosBootstrapConcern.php"
  "app/admin/controllers/concerns/PmdWaiterPosOrderPersistenceConcern.php"
  "app/admin/controllers/concerns/PmdWaiterPosOrderScopeConcern.php"
  "app/admin/controllers/concerns/PmdWaiterPosPaymentSummaryConcern.php"
  "app/admin/controllers/concerns/PmdWaiterPosPaymentAllocationConcern.php"
  "app/admin/controllers/concerns/PmdWaiterPosPaymentTransactionConcern.php"
  "$MIGRATION"
  "app/admin/views/waiter_pos.blade.php"
  "app/admin/views/waiter_pos_shell.blade.php"
  "app/admin/assets/css/pmd-waiter-pos-v1.css"
  "app/admin/assets/css/pmd-waiter-pos-product-details-v3.css"
  "app/admin/assets/js/pmd-waiter-pos-v1.js"
  "app/admin/assets/js/pmd-waiter-pos-payment-v2.js"
  "app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js"
  "app/admin/assets/js/pmd-waiter-pos-dashboard-bridge-v2.js"
  "app/admin/assets/js/pmd-waiter-pos-product-details-v3.js"
  "app/admin/assets/js/pmd-waiter-pos-dashboard-bridge-v1.js"
  "app/admin/views/_meta/assets.json"
  "routes/admin-quick-mode.php"
)

PHP_FILES=(
  "app/admin/controllers/PmdWaiterPosV1.php"
  "app/admin/controllers/concerns/PmdWaiterPosRenderEndpoints.php"
  "app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php"
  "app/admin/controllers/concerns/PmdWaiterPosPaymentBasicEndpoints.php"
  "app/admin/controllers/concerns/PmdWaiterPosSettleEndpoint.php"
  "app/admin/controllers/concerns/PmdWaiterPosTerminalEndpoint.php"
  "app/admin/controllers/concerns/PmdWaiterPosBootstrapConcern.php"
  "app/admin/controllers/concerns/PmdWaiterPosOrderPersistenceConcern.php"
  "app/admin/controllers/concerns/PmdWaiterPosOrderScopeConcern.php"
  "app/admin/controllers/concerns/PmdWaiterPosPaymentSummaryConcern.php"
  "app/admin/controllers/concerns/PmdWaiterPosPaymentAllocationConcern.php"
  "app/admin/controllers/concerns/PmdWaiterPosPaymentTransactionConcern.php"
  "$MIGRATION"
  "routes/admin-quick-mode.php"
)

JS_FILES=(
  "app/admin/assets/js/pmd-waiter-pos-v1.js"
  "app/admin/assets/js/pmd-waiter-pos-payment-v2.js"
  "app/admin/assets/js/pmd-waiter-pos-payment-policy-v2.js"
  "app/admin/assets/js/pmd-waiter-pos-dashboard-bridge-v2.js"
  "app/admin/assets/js/pmd-waiter-pos-product-details-v3.js"
)

CSS_FILES=(
  "app/admin/assets/css/pmd-waiter-pos-v1.css"
  "app/admin/assets/css/pmd-waiter-pos-product-details-v3.css"
)

restore_files() {
  echo
  echo "⚠️ Restoring Waiter POS files from $BACKUP"
  for file in "${RUNTIME_FILES[@]}"; do
    if [ -e "$BACKUP/$file" ]; then
      mkdir -p "$(dirname "$file")"
      cp -a "$BACKUP/$file" "$file"
    else
      rm -f "$file"
    fi
  done
  php artisan optimize:clear >/dev/null 2>&1 || true
  echo "Files restored. The additive database migration is intentionally not rolled back automatically."
}

on_exit() {
  status=$?
  if [ "$status" -ne 0 ] && [ "$SUCCESS" -ne 1 ]; then
    restore_files
  fi
  exit "$status"
}
trap on_exit EXIT

printf '\n================================================\n'
printf ' PayMyDine Waiter POS V2.1 selective deployment\n'
printf '================================================\n'
printf 'Repository: %s\n' "$REPO"
printf 'Branch:     %s\n' "$BRANCH"
printf 'V1 base:    %s\n' "$V1_BASE"
printf 'Backup:     %s\n' "$BACKUP"

[ -d .git ] || { echo "❌ $REPO is not a Git working tree"; exit 1; }
[ -f artisan ] || { echo "❌ artisan not found in $REPO"; exit 1; }
[ -d vendor ] || { echo "❌ vendor directory is missing"; exit 1; }

available_kb="$(df -Pk "$REPO" | awk 'NR==2 {print $4}')"
if [ "${available_kb:-0}" -lt 1048576 ]; then
  echo "❌ Less than 1 GiB free disk space. Clean the VPS before deployment."
  exit 1
fi

mkdir -p "$BACKUP"
for file in "${RUNTIME_FILES[@]}"; do
  if [ -e "$file" ]; then
    mkdir -p "$BACKUP/$(dirname "$file")"
    cp -a "$file" "$BACKUP/$file"
  fi
done
printf '%s\n' "${RUNTIME_FILES[@]}" > "$BACKUP/runtime-files.txt"
git status --short > "$BACKUP/git-status-before.txt" || true

echo "✅ File backup completed"

git fetch --no-tags origin "$BRANCH:refs/remotes/origin/$BRANCH"
git cat-file -e "${V1_BASE}^{commit}"
TARGET="$(git rev-parse "origin/$BRANCH")"

echo "Target commit: $TARGET"

git diff --binary "$V1_BASE" "$TARGET" -- "${RUNTIME_FILES[@]}" > "$PATCH"
[ -s "$PATCH" ] || { echo "❌ Generated V2.1 patch is empty"; exit 1; }
cp -a "$PATCH" "$BACKUP/waiter-pos-v2.1.patch"

echo "Runtime files in patch:"
git diff --name-status "$V1_BASE" "$TARGET" -- "${RUNTIME_FILES[@]}"

git apply --check "$PATCH"
git apply --whitespace=nowarn "$PATCH"
echo "✅ V2.1 runtime patch applied"

for file in "${PHP_FILES[@]}"; do
  php -l "$file"
done
for file in "${JS_FILES[@]}"; do
  node --check "$file"
done
python3 -m json.tool app/admin/views/_meta/assets.json >/dev/null

# Static registration and asset guards. TastyIgniter loads this route module from
# app/admin/routes.php, but those dynamically included routes are not reliably
# displayed by Laravel's generic `route:list` command in this application.
grep -q 'admin-quick-mode\.php' app/admin/routes.php
grep -q '/admin/waiter-pos/{tableId}' routes/admin-quick-mode.php
grep -q '/admin/pmd-waiter-pos-v1/payment-settle/' routes/admin-quick-mode.php
grep -q 'pmd-waiter-pos-dashboard-bridge-v2.js' app/admin/views/_meta/assets.json
grep -q 'pmd-waiter-pos-product-details-v3.js' app/admin/views/waiter_pos.blade.php
grep -q 'pmd-waiter-pos-product-details-v3.css' app/admin/views/waiter_pos.blade.php
grep -q 'PMDWaiterPOSProductDetailsV3' app/admin/assets/js/pmd-waiter-pos-dashboard-bridge-v2.js
! grep -q 'pmd-waiter-pos-dashboard-bridge-v1.js' app/admin/views/_meta/assets.json
[ -s app/admin/assets/js/pmd-waiter-pos-product-details-v3.js ]
[ -s app/admin/assets/css/pmd-waiter-pos-product-details-v3.css ]

echo "✅ PHP, JavaScript, JSON, route-module and asset guards passed"

if command -v composer >/dev/null 2>&1; then
  composer dump-autoload -o
fi

# TastyIgniter does not register Laravel's generic `migrate` command.
# Its UpdateManager-backed command discovers application/extension migrations.
if ! php artisan list --raw 2>/dev/null | grep -q '^igniter:up'; then
  echo "❌ TastyIgniter migration command igniter:up is not registered"
  exit 1
fi
php artisan igniter:up

php artisan optimize:clear || {
  php artisan route:clear || true
  php artisan view:clear || true
  php artisan config:clear || true
  php artisan cache:clear || true
}

find app/admin/controllers/concerns -maxdepth 1 -type f -name 'PmdWaiterPos*.php' -exec chmod 0644 {} +
chmod 0644 \
  app/admin/controllers/PmdWaiterPosV1.php \
  "$MIGRATION" \
  app/admin/views/waiter_pos.blade.php \
  app/admin/views/waiter_pos_shell.blade.php \
  "${CSS_FILES[@]}" \
  "${JS_FILES[@]}" \
  app/admin/views/_meta/assets.json \
  routes/admin-quick-mode.php

# Informational only. The definitive route test is the authenticated browser
# preflight against the real URLs after deployment.
ROUTES="$(php artisan route:list 2>/dev/null | grep -E 'waiter-pos|pmd-waiter-pos-v1' || true)"
if [ -n "$ROUTES" ]; then
  printf '%s\n' "$ROUTES"
else
  echo "ℹ️ route:list does not expose the dynamically included TastyIgniter POS routes; static registration passed. Browser preflight is required."
fi

grep -q 'PmdWaiterPosPayment' app/admin/controllers/PmdWaiterPosV1.php
[ ! -e app/admin/assets/js/pmd-waiter-pos-dashboard-bridge-v1.js ]

SUCCESS=1
trap - EXIT

printf '\n================================================\n'
printf ' ✅ Waiter POS V2.1 deployment completed\n'
printf '================================================\n'
printf 'Backup: %s\n' "$BACKUP"
printf 'Target: %s\n' "$TARGET"
printf '\nNo PM2 or Next.js restart is required.\n'
printf 'Hard-refresh /admin/dashboardwaiter before browser QA.\n'
printf 'Tap a food card to add; press and hold for full product details.\n'
printf 'Do not collect real card/provider payments until sandbox mode is confirmed.\n'
