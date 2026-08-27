#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/paymydine}"
BRANCH="${PAYMOB_BRANCH:-origin/feature/paymob-oman-r1}"
AUDIT_TENANT="${1:-${AUDIT_TENANT:-}}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="/var/backups/paymydine/new-tenant-onboarding-r7-$STAMP"
TMP_DIR="/tmp/pmd-new-tenant-onboarding-r7-$STAMP"

FILES=(
  "app/admin/assets/js/pmd-new-tenant-onboarding-r7.js"
  "app/admin/assets/css/pmd-new-tenant-onboarding-r7.css"
  "app/admin/views/_meta/assets.json"
)

cd "$APP_DIR"

echo "=== PMD NEW TENANT ONBOARDING + OMAN FINANCE GUARD R7 ==="
echo "Branch: $BRANCH"
if [ -n "$AUDIT_TENANT" ]; then
  echo "Audit tenant: $AUDIT_TENANT"
fi
echo

for required in \
  app/admin/assets/js/pmd-payment-provider-catalogue-v1.js \
  app/admin/assets/js/pmd-finance-market-r4.js \
  app/admin/assets/js/pmd-cashier-order-composer-r51.js \
  app/admin/assets/js/pmd-reservation-composer-v1.js; do
  if [ ! -f "$required" ]; then
    echo "ERROR: required runtime file is missing: $required" >&2
    exit 2
  fi
done

git fetch origin feature/paymob-oman-r1

rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR"
sudo mkdir -p "$BACKUP_DIR"

for path in "${FILES[@]}"; do
  mkdir -p "$TMP_DIR/$(dirname "$path")"
  git show "$BRANCH:$path" > "$TMP_DIR/$path"
done

echo "--- JavaScript preflight ---"
if command -v node >/dev/null 2>&1; then
  node --check "$TMP_DIR/app/admin/assets/js/pmd-new-tenant-onboarding-r7.js"
else
  echo "node not installed; using invariant checks only"
fi

grep -q "PMD_NEW_TENANT_ONBOARDING_R7" "$TMP_DIR/app/admin/assets/js/pmd-new-tenant-onboarding-r7.js"
grep -q "PMD_FINANCE_OMAN_LEGACY_CATALOGUE_BYPASS_R7" "$TMP_DIR/app/admin/assets/js/pmd-new-tenant-onboarding-r7.js"
grep -q "No active location menu source is available" "$TMP_DIR/app/admin/assets/js/pmd-new-tenant-onboarding-r7.js"
grep -q "No same-Floor table or merge matches" "$TMP_DIR/app/admin/assets/js/pmd-new-tenant-onboarding-r7.js"
grep -q "Set up menu" "$TMP_DIR/app/admin/assets/js/pmd-new-tenant-onboarding-r7.js"
grep -q "Set up tables" "$TMP_DIR/app/admin/assets/js/pmd-new-tenant-onboarding-r7.js"
echo "R7 JS markers OK"

echo
echo "--- JSON + asset ordering preflight ---"
php -r '
$path = $argv[1];
try {
    $data = json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
} catch (Throwable $e) {
    fwrite(STDERR, "JSON FAILED: {$e->getMessage()}\n");
    exit(1);
}
$styles = array_column($data["style"] ?? [], "path");
$scripts = array_column($data["script"] ?? [], "path");
$css = "css/pmd-new-tenant-onboarding-r7.css";
$guard = "js/pmd-new-tenant-onboarding-r7.js";
$legacy = "js/pmd-payment-provider-catalogue-v1.js";
$finance = "js/pmd-finance-market-r4.js";
if (!in_array($css, $styles, true)) {
    fwrite(STDERR, "R7 CSS is missing from assets.json\n");
    exit(2);
}
$guardIndex = array_search($guard, $scripts, true);
$legacyIndex = array_search($legacy, $scripts, true);
$financeIndex = array_search($finance, $scripts, true);
if ($guardIndex === false || $legacyIndex === false || $financeIndex === false) {
    fwrite(STDERR, "Required R7/legacy/finance script is missing from assets.json\n");
    exit(3);
}
if (!($guardIndex < $legacyIndex && $legacyIndex < $financeIndex)) {
    fwrite(STDERR, "Invalid asset order. Required: R7 guard -> legacy catalogue -> finance market.\n");
    exit(4);
}
echo "JSON OK\n";
echo "Asset order OK: R7 guard ({$guardIndex}) -> legacy catalogue ({$legacyIndex}) -> Finance market ({$financeIndex})\n";
' "$TMP_DIR/app/admin/views/_meta/assets.json"

echo
echo "--- CSS preflight ---"
grep -q "pmd-coc--setup-empty" "$TMP_DIR/app/admin/assets/css/pmd-new-tenant-onboarding-r7.css"
grep -q "pmd-table-setup-card-r7" "$TMP_DIR/app/admin/assets/css/pmd-new-tenant-onboarding-r7.css"
echo "R7 CSS markers OK"

echo
echo "--- Backup target files ---"
for path in "${FILES[@]}"; do
  if [ -e "$path" ]; then
    sudo mkdir -p "$BACKUP_DIR/$(dirname "$path")"
    sudo cp -a "$path" "$BACKUP_DIR/$path"
  fi
done

echo
echo "--- Install R7 files ---"
for path in "${FILES[@]}"; do
  sudo mkdir -p "$(dirname "$path")"

  if [ -e "$path" ]; then
    OWNER="$(stat -c '%U' "$path")"
    GROUP="$(stat -c '%G' "$path")"
    MODE="$(stat -c '%a' "$path")"
  else
    parent="$(dirname "$path")"
    OWNER="$(stat -c '%U' "$parent" 2>/dev/null || echo root)"
    GROUP="$(stat -c '%G' "$parent" 2>/dev/null || echo root)"
    MODE="644"
  fi

  sudo install -o "$OWNER" -g "$GROUP" -m "$MODE" "$TMP_DIR/$path" "$path"
done

echo
echo "--- Installed validation ---"
if command -v node >/dev/null 2>&1; then
  node --check app/admin/assets/js/pmd-new-tenant-onboarding-r7.js
fi
php -r '
$data = json_decode(file_get_contents($argv[1]), true, 512, JSON_THROW_ON_ERROR);
$scripts = array_column($data["script"] ?? [], "path");
$guard = array_search("js/pmd-new-tenant-onboarding-r7.js", $scripts, true);
$legacy = array_search("js/pmd-payment-provider-catalogue-v1.js", $scripts, true);
if ($guard === false || $legacy === false || $guard >= $legacy) {
    fwrite(STDERR, "Installed asset ordering validation failed.\n");
    exit(1);
}
echo "Installed asset ordering OK\n";
' app/admin/views/_meta/assets.json

grep -n "pmd-new-tenant-onboarding-r7" app/admin/views/_meta/assets.json

echo
echo "--- Clear Laravel/TastyIgniter caches ---"
if [ -f artisan ]; then
  sudo php artisan optimize:clear || php artisan optimize:clear || true
fi

AUDIT_STATUS=0
if [ -n "$AUDIT_TENANT" ] && [ -f scripts/audit-location-market-r4.php ]; then
  echo
echo "--- Re-check tenant market isolation ---"
  set +e
  php scripts/audit-location-market-r4.php "$AUDIT_TENANT"
  AUDIT_STATUS=$?
  set -e
fi

echo
echo "=============================================="
echo "NEW TENANT ONBOARDING R7 DEPLOYED"
echo "Backup: $BACKUP_DIR"
echo "=============================================="
echo "- Missing menu is now an actionable setup state with Set up menu + Check again."
echo "- The New order setup state uses a compact dialog instead of a huge empty error panel."
echo "- A reservation tenant with zero tables gets a Set up tables card."
echo "- A restaurant that has tables but no availability keeps the normal availability message."
echo "- Oman Finance claims the legacy provider catalogue before it can rewrite the server-rendered Paymob row."
echo "- Germany keeps the legacy provider catalogue unchanged."

if [ -n "$AUDIT_TENANT" ] && [ -f scripts/audit-location-market-r4.php ]; then
  if [ "$AUDIT_STATUS" -ne 0 ]; then
    echo "ERROR: market isolation audit failed for $AUDIT_TENANT" >&2
    exit 5
  fi
  echo "- Market isolation audit passed for: $AUDIT_TENANT"
fi
