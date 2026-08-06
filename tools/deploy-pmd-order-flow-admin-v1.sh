#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
FRONTEND="$ROOT/frontend"
PM2_NAME="paymydine-frontend"

# Immutable GitHub source snapshot containing the reviewed files and patches.
SOURCE_REF="8fbff096c6af9d4e80a069cbef00e74ba33455f5"
RAW_BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/${SOURCE_REF}"

STAMP="$(date +%Y%m%d_%H%M%S)"
TMP="$(mktemp -d /tmp/pmd-order-flow-admin-v1.XXXXXX)"
BACKUP="$ROOT/storage/deploy-backups/order-flow-admin-v1-$STAMP"
ABSENT_MANIFEST="$BACKUP/.absent-before-deploy"
OLD_NEXT="$BACKUP/.next.previous"

SUCCESS=0
NEXT_MOVED=0

DIRECT_FILES=(
  "app/Http/Controllers/Api/ReviewController.php"
  "app/Http/Middleware/PmdCanonicalPayExistingPersistence.php"
  "app/Http/Middleware/TenantDatabaseMiddleware.php"
  "frontend/components/CanonicalPaymentDisplayFix.tsx"
  "frontend/features/customer-menu/checkout/hooks/useCheckoutReviewInvoiceActions.ts"
  "app/admin/assets/js/pmd-order-edit-polish-v1.js"
)

PATCH_FILES=(
  "tools/pmd-order-flow-admin-v1/01-kazen-selected-count.patch"
  "tools/pmd-order-flow-admin-v1/02-kazen-selected-count-style.patch"
  "tools/pmd-order-flow-admin-v1/03-kazen-checkout-flow.patch"
  "tools/pmd-order-flow-admin-v1/03a-kazen-route-paid-props.patch"
  "tools/pmd-order-flow-admin-v1/04-admin-order-details.patch"
  "tools/pmd-order-flow-admin-v1/05-admin-order-menu-icons.patch"
  "tools/pmd-order-flow-admin-v1/06-admin-clean-comment.patch"
  "tools/pmd-order-flow-admin-v1/07-admin-customer-icons.patch"
  "tools/pmd-order-flow-admin-v1/08-admin-header-icons.patch"
  "tools/pmd-order-flow-admin-v1/09-admin-order-edit-polish-loader.patch"
)

PATCH_TARGETS=(
  "frontend/app/themes/kazen-japanese/KazenStandalonePage.tsx"
  "frontend/app/themes/kazen-japanese/kazen-standalone.css"
  "frontend/components/themes/kazen-japanese/KazenJapaneseCheckoutShell.tsx"
  "frontend/features/customer-menu/checkout/ThemedCheckoutShellRoutes.tsx"
  "app/admin/views/orders/form/order_details.blade.php"
  "app/admin/views/orders/form/order_menus.blade.php"
  "app/admin/views/orders/form/form_tabs.blade.php"
  "app/admin/views/orders/form/field_customer.blade.php"
  "app/admin/views/orders/form/info.blade.php"
  "app/admin/views/_partials/pmd_admin_i18n.blade.php"
)

ALL_TARGETS=("${DIRECT_FILES[@]}" "${PATCH_TARGETS[@]}")

cleanup() {
  rm -rf "$TMP"
}

find_php_fpm() {
  systemctl list-units --type=service --state=active --no-legend 2>/dev/null |
    awk '$1 ~ /^php[0-9.]+-fpm\.service$/ { print $1; exit }'
}

reload_backend() {
  cd "$ROOT"
  php artisan view:clear >/dev/null || true
  php artisan route:clear >/dev/null || true
  php artisan config:clear >/dev/null || true

  local fpm
  fpm="$(find_php_fpm || true)"
  if [ -n "$fpm" ]; then
    sudo systemctl reload "$fpm" || true
  fi
}

rollback() {
  local code="${1:-1}"

  if [ "$SUCCESS" -eq 1 ]; then
    exit "$code"
  fi

  echo
  echo "============================================================"
  echo "ROLLBACK STARTED"
  echo "============================================================"

  if [ -d "$BACKUP/files" ]; then
    while IFS= read -r -d '' saved; do
      rel="${saved#"$BACKUP/files/"}"
      sudo mkdir -p "$(dirname "$ROOT/$rel")"
      sudo cp -a "$saved" "$ROOT/$rel"
    done < <(find "$BACKUP/files" -type f -print0)
  fi

  if [ -f "$ABSENT_MANIFEST" ]; then
    while IFS= read -r rel; do
      [ -n "$rel" ] && sudo rm -f "$ROOT/$rel"
    done < "$ABSENT_MANIFEST"
  fi

  if [ "$NEXT_MOVED" -eq 1 ]; then
    sudo rm -rf "$FRONTEND/.next"
    if [ -d "$OLD_NEXT" ]; then
      sudo mv "$OLD_NEXT" "$FRONTEND/.next"
    fi
  fi

  reload_backend
  pm2 restart "$PM2_NAME" --update-env >/dev/null 2>&1 || true

  echo "Rollback completed. Production files were restored."
  exit "$code"
}

trap cleanup EXIT
trap 'rollback $?' ERR INT TERM

install_staged_file() {
  local rel="$1"
  local src="$TMP/direct/$rel"
  local dst="$ROOT/$rel"

  sudo mkdir -p "$(dirname "$dst")"

  if [ -e "$dst" ]; then
    local uid gid mode
    uid="$(stat -c '%u' "$dst")"
    gid="$(stat -c '%g' "$dst")"
    mode="$(stat -c '%a' "$dst")"
    sudo install -o "$uid" -g "$gid" -m "$mode" "$src" "$dst"
  else
    local ref="$ROOT/app/admin/assets/js/admin.js"
    if [[ "$rel" == frontend/* ]]; then
      ref="$FRONTEND/package.json"
    elif [[ "$rel" == app/Http/* ]]; then
      ref="$ROOT/app/Http/Kernel.php"
    fi

    local uid gid
    uid="$(stat -c '%u' "$ref")"
    gid="$(stat -c '%g' "$ref")"
    sudo install -o "$uid" -g "$gid" -m 0644 "$src" "$dst"
  fi
}

echo "============================================================"
echo "PayMyDine — Kazen Order Flow + Admin Order Edit V1"
echo "Guarded production deployment with automatic rollback"
echo "============================================================"

cd "$ROOT"

for command in curl patch php npm pm2 sha256sum; do
  command -v "$command" >/dev/null || {
    echo "ERROR: Required command is missing: $command"
    exit 1
  }
done

for required in "$ROOT/vendor/autoload.php" "$ROOT/bootstrap/app.php" "$FRONTEND/package.json"; do
  test -f "$required" || {
    echo "ERROR: Required file missing: $required"
    exit 1
  }
done

test -d "$FRONTEND/node_modules" || {
  echo "ERROR: frontend/node_modules is missing."
  exit 1
}

FREE_KB="$(df -Pk "$ROOT" | awk 'NR==2 {print $4}')"
if [ "${FREE_KB:-0}" -lt 1048576 ]; then
  echo "ERROR: Less than 1 GiB free disk space. Build cancelled safely."
  exit 1
fi

mkdir -p "$TMP/direct" "$TMP/patches" "$BACKUP/files"
: > "$ABSENT_MANIFEST"

echo
echo "Downloading immutable reviewed sources..."
for rel in "${DIRECT_FILES[@]}"; do
  mkdir -p "$TMP/direct/$(dirname "$rel")"
  curl -fsSL --retry 3 --retry-delay 2 "$RAW_BASE/$rel" -o "$TMP/direct/$rel"
done

for rel in "${PATCH_FILES[@]}"; do
  mkdir -p "$TMP/patches/$(dirname "$rel")"
  curl -fsSL --retry 3 --retry-delay 2 "$RAW_BASE/$rel" -o "$TMP/patches/$rel"
done

echo "Downloaded ${#DIRECT_FILES[@]} full files and ${#PATCH_FILES[@]} guarded patches."

echo
echo "Validating downloaded payload..."
grep -q 'PMD_REVIEW_ONE_PER_ORDER_V1' "$TMP/direct/app/Http/Controllers/Api/ReviewController.php"
grep -q 'PMD_PAY_EXISTING_CANONICAL_PERSISTENCE_V2' "$TMP/direct/app/Http/Middleware/PmdCanonicalPayExistingPersistence.php"
grep -q 'PMD_PAY_EXISTING_CANONICAL_PERSISTENCE_V2' "$TMP/direct/app/Http/Middleware/TenantDatabaseMiddleware.php"
grep -q 'PMD_KAZEN_ORDER_FLOW_DOM_POLISH_V1' "$TMP/direct/frontend/components/CanonicalPaymentDisplayFix.tsx"
grep -q 'PMD_REVIEW_ONE_PER_ORDER_CLIENT_V1' "$TMP/direct/frontend/features/customer-menu/checkout/hooks/useCheckoutReviewInvoiceActions.ts"
grep -q 'PMD_ORDER_EDIT_POLISH_V1' "$TMP/direct/app/admin/assets/js/pmd-order-edit-polish-v1.js"

php -l "$TMP/direct/app/Http/Controllers/Api/ReviewController.php" >/dev/null
php -l "$TMP/direct/app/Http/Middleware/PmdCanonicalPayExistingPersistence.php" >/dev/null
php -l "$TMP/direct/app/Http/Middleware/TenantDatabaseMiddleware.php" >/dev/null

echo "Payload validation: PASSED"

echo
echo "Creating source backups..."
for rel in "${ALL_TARGETS[@]}"; do
  if [ -e "$ROOT/$rel" ]; then
    mkdir -p "$BACKUP/files/$(dirname "$rel")"
    sudo cp -a "$ROOT/$rel" "$BACKUP/files/$rel"
  else
    printf '%s\n' "$rel" >> "$ABSENT_MANIFEST"
  fi
done

echo "Backup directory: $BACKUP"

echo
echo "Checking patch compatibility against the live source tree..."
declare -A PATCH_MODE
for rel in "${PATCH_FILES[@]}"; do
  patch_file="$TMP/patches/$rel"

  if patch -p1 --batch --forward --dry-run < "$patch_file" >/dev/null 2>&1; then
    PATCH_MODE["$rel"]="apply"
    echo "APPLY  $rel"
  elif patch -p1 --batch --reverse --dry-run < "$patch_file" >/dev/null 2>&1; then
    PATCH_MODE["$rel"]="already"
    echo "SKIP   $rel (already installed)"
  else
    echo "ERROR: Patch does not match the live source: $rel"
    echo "Nothing has been modified yet."
    exit 1
  fi
done

echo
echo "Installing reviewed full-file updates..."
for rel in "${DIRECT_FILES[@]}"; do
  install_staged_file "$rel"
done

echo "Applying guarded source patches..."
for rel in "${PATCH_FILES[@]}"; do
  if [ "${PATCH_MODE[$rel]}" = "apply" ]; then
    patch -p1 --batch --forward < "$TMP/patches/$rel"
  fi
done

echo
echo "Validating installed markers..."
grep -q 'PMD_KAZEN_MENU_ITEM_SELECTED_COUNT_V1' frontend/app/themes/kazen-japanese/KazenStandalonePage.tsx
grep -q 'PMD_KAZEN_MENU_ITEM_SELECTED_COUNT_STYLE_V1' frontend/app/themes/kazen-japanese/kazen-standalone.css
grep -q 'PMD_KAZEN_ORDER_FLOW_SUMMARY_V1' frontend/components/themes/kazen-japanese/KazenJapaneseCheckoutShell.tsx
grep -q 'paidTipAmount={paidTipAmount}' frontend/features/customer-menu/checkout/ThemedCheckoutShellRoutes.tsx
grep -q 'PMD_ORDER_DETAILS_TRUE_PARTIAL_V1' app/admin/views/orders/form/order_details.blade.php
grep -q 'PMD_ORDER_EDIT_PLAIN_QUERY_ALIASES_V2' app/admin/views/orders/form/order_details.blade.php
grep -q 'PMD_ORDER_MENU_NATIVE_CONTROL_ICONS_V1' app/admin/views/orders/form/order_menus.blade.php
grep -q 'PMD_ORDER_EDIT_CLEAN_CUSTOMER_NOTE_V1' app/admin/views/orders/form/form_tabs.blade.php
grep -q 'PMD_CUSTOMER_CARD_NATIVE_ICONS_V1' app/admin/views/orders/form/field_customer.blade.php
grep -q 'PMD_ORDER_HEADER_NATIVE_ICONS_V1' app/admin/views/orders/form/info.blade.php
grep -q 'PMD_ORDER_EDIT_POLISH_LOADER_V1' app/admin/views/_partials/pmd_admin_i18n.blade.php
! grep -q "@extends('admin::layouts.default')" app/admin/views/orders/form/order_details.blade.php
! grep -q '^@section' app/admin/views/orders/form/order_details.blade.php
! grep -q '^@endsection' app/admin/views/orders/form/order_details.blade.php

php -l app/Http/Controllers/Api/ReviewController.php >/dev/null
php -l app/Http/Middleware/PmdCanonicalPayExistingPersistence.php >/dev/null
php -l app/Http/Middleware/TenantDatabaseMiddleware.php >/dev/null

echo "Installed marker validation: PASSED"

echo
echo "Compiling the modified Blade partials..."
COMPILE_DIR="$TMP/compiled"
export COMPILE_DIR
mkdir -p "$COMPILE_DIR"
php <<'PHP'
<?php
require '/var/www/paymydine/vendor/autoload.php';
$app = require '/var/www/paymydine/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$compiler = app('blade.compiler');
$files = [
    'app/admin/views/orders/form/order_details.blade.php',
    'app/admin/views/orders/form/order_menus.blade.php',
    'app/admin/views/orders/form/form_tabs.blade.php',
    'app/admin/views/orders/form/field_customer.blade.php',
    'app/admin/views/orders/form/info.blade.php',
    'app/admin/views/_partials/pmd_admin_i18n.blade.php',
];
foreach ($files as $index => $relative) {
    $source = file_get_contents('/var/www/paymydine/'.$relative);
    if ($source === false) {
        throw new RuntimeException('Unable to read '.$relative);
    }
    file_put_contents(getenv('COMPILE_DIR').'/'.$index.'.php', $compiler->compileString($source));
}
PHP

for compiled in "$COMPILE_DIR"/*.php; do
  php -l "$compiled" >/dev/null
done

echo "Blade compilation: PASSED"

echo
echo "Preparing clean production frontend build..."
if [ -d "$FRONTEND/.next" ]; then
  sudo mv "$FRONTEND/.next" "$OLD_NEXT"
  NEXT_MOVED=1
fi

cd "$FRONTEND"
npm run build

cd "$ROOT"
reload_backend

pm2 restart "$PM2_NAME" --update-env
sleep 5

curl -fsS --max-time 20 http://127.0.0.1:3001/menu >/dev/null

echo "Frontend health check: PASSED"

if [ "$NEXT_MOVED" -eq 1 ] && [ -d "$OLD_NEXT" ]; then
  sudo rm -rf "$OLD_NEXT"
  NEXT_MOVED=0
fi

SUCCESS=1

echo
echo "============================================================"
echo "DEPLOYMENT COMPLETE"
echo "============================================================"
echo "Selected item quantities: INSTALLED"
echo "Order and received-card total separators: INSTALLED"
echo "Tip preset -> custom amount synchronization: INSTALLED"
echo "Paid summary ordering and breakdown: INSTALLED"
echo "One review per order: ENFORCED"
echo "Canonical tip/coupon persistence in tenant DB: INSTALLED"
echo "Admin Order Edit wrapper/directive leak: FIXED"
echo "Admin Order Edit native icons and clean notes: INSTALLED"
echo "Database migrations: NONE"
echo "Backup: $BACKUP"
echo
echo "Final changed-file SHAs:"
sha256sum "${ALL_TARGETS[@]/#/$ROOT/}"
