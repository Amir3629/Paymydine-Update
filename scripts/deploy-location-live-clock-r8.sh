#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/paymydine}"
BRANCH="${PMD_BRANCH:-origin/feature/paymob-oman-r1}"
AUDIT_TENANT="${1:-${AUDIT_TENANT:-}}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="/var/backups/paymydine/location-live-clock-r8-$STAMP"
TMP_DIR="/tmp/pmd-location-live-clock-r8-$STAMP"

FILES=(
  "app/admin/assets/js/pmd-location-live-clock-r8.js"
  "app/admin/assets/css/pmd-location-live-clock-r8.css"
  "app/admin/views/_partials/top_nav_user_menu.blade.php"
  "app/admin/views/_meta/assets.json"
)

cd "$APP_DIR"

echo "=== PMD LOCATION-AWARE LIVE HEADER CLOCK R8 ==="
echo "Branch: $BRANCH"
if [ -n "$AUDIT_TENANT" ]; then
  echo "Audit tenant: $AUDIT_TENANT"
fi
echo

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
  node --check "$TMP_DIR/app/admin/assets/js/pmd-location-live-clock-r8.js"
else
  echo "node not installed; using invariant checks only"
fi

grep -q "PMD_LOCATION_LIVE_CLOCK_R8" "$TMP_DIR/app/admin/assets/js/pmd-location-live-clock-r8.js"
grep -q "hourCycle: 'h23'" "$TMP_DIR/app/admin/assets/js/pmd-location-live-clock-r8.js"
grep -q "second: '2-digit'" "$TMP_DIR/app/admin/assets/js/pmd-location-live-clock-r8.js"
grep -q "Never fall back to browser timezone" "$TMP_DIR/app/admin/assets/js/pmd-location-live-clock-r8.js"
echo "R8 JS markers OK"

echo
echo "--- Blade timezone truth preflight ---"
BLADE="$TMP_DIR/app/admin/views/_partials/top_nav_user_menu.blade.php"
grep -q "PMD_LOCATION_LIVE_CLOCK_CONFIG_R8" "$BLADE"
grep -q "AdminLocation::current" "$BLADE"
grep -q "LocationOption::onLocation" "$BLADE"
grep -q "pmd_market_timezone" "$BLADE"
grep -q "setting('timezone')" "$BLADE"
grep -q "DateTimeZone" "$BLADE"
grep -q "PMDLocationClockConfigR8" "$BLADE"
echo "R8 timezone config markers OK"

echo
echo "--- CSS preflight ---"
CSS="$TMP_DIR/app/admin/assets/css/pmd-location-live-clock-r8.css"
grep -q "PMD_LOCATION_LIVE_CLOCK_R8" "$CSS"
grep -q "font-variant-numeric: tabular-nums" "$CSS"
grep -q "calc(50% + 43px)" "$CSS"
grep -q "calc(50% + 99px)" "$CSS"
echo "R8 CSS markers OK"

echo
echo "--- JSON asset preflight ---"
php -r '
$path = $argv[1];
$data = json_decode(file_get_contents($path), true, 512, JSON_THROW_ON_ERROR);
$styles = array_column($data["style"] ?? [], "path");
$scripts = array_column($data["script"] ?? [], "path");

$clockCss = "css/pmd-location-live-clock-r8.css";
$clockJs = "js/pmd-location-live-clock-r8.js";
if (!in_array($clockCss, $styles, true)) {
    fwrite(STDERR, "R8 clock CSS missing from assets.json\n");
    exit(2);
}
if (!in_array($clockJs, $scripts, true)) {
    fwrite(STDERR, "R8 clock JS missing from assets.json\n");
    exit(3);
}

// Preserve the already-proven Oman zero-swap ordering from R7.
$r7 = array_search("js/pmd-new-tenant-onboarding-r7.js", $scripts, true);
$legacy = array_search("js/pmd-payment-provider-catalogue-v1.js", $scripts, true);
$finance = array_search("js/pmd-finance-market-r4.js", $scripts, true);
if ($r7 === false || $legacy === false || $finance === false || !($r7 < $legacy && $legacy < $finance)) {
    fwrite(STDERR, "Existing R7 Finance ordering invariant was broken.\n");
    exit(4);
}

echo "JSON OK\n";
echo "Clock assets registered\n";
echo "R7 Finance ordering preserved: {$r7} -> {$legacy} -> {$finance}\n";
' "$TMP_DIR/app/admin/views/_meta/assets.json"

echo
echo "--- Backup target files ---"
for path in "${FILES[@]}"; do
  if [ -e "$path" ]; then
    sudo mkdir -p "$BACKUP_DIR/$(dirname "$path")"
    sudo cp -a "$path" "$BACKUP_DIR/$path"
  fi
done

echo
echo "--- Install R8 files ---"
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
  node --check app/admin/assets/js/pmd-location-live-clock-r8.js
fi

grep -n "PMD_LOCATION_LIVE_CLOCK_CONFIG_R8" app/admin/views/_partials/top_nav_user_menu.blade.php
grep -n "pmd-location-live-clock-r8" app/admin/views/_meta/assets.json

php -r '
$data = json_decode(file_get_contents($argv[1]), true, 512, JSON_THROW_ON_ERROR);
$styles = array_column($data["style"] ?? [], "path");
$scripts = array_column($data["script"] ?? [], "path");
if (!in_array("css/pmd-location-live-clock-r8.css", $styles, true) || !in_array("js/pmd-location-live-clock-r8.js", $scripts, true)) {
    fwrite(STDERR, "Installed R8 asset validation failed.\n");
    exit(1);
}
echo "Installed R8 assets OK\n";
' app/admin/views/_meta/assets.json

echo
echo "--- Clear Laravel/TastyIgniter caches ---"
if [ -f artisan ]; then
  sudo php artisan optimize:clear || php artisan optimize:clear || true
fi

AUDIT_STATUS=0
if [ -n "$AUDIT_TENANT" ] && [ -f scripts/audit-location-market-r4.php ]; then
  echo
echo "--- Re-check tenant location/timezone + market isolation ---"
  set +e
  php scripts/audit-location-market-r4.php "$AUDIT_TENANT"
  AUDIT_STATUS=$?
  set -e
fi

echo
echo "=============================================="
echo "LOCATION-AWARE LIVE HEADER CLOCK R8 DEPLOYED"
echo "Backup: $BACKUP_DIR"
echo "=============================================="
echo "- Admin pages now show a live HH:MM:SS clock at the top-centre."
echo "- No date is rendered."
echo "- The clock uses active-location timezone first, then market/tenant timezone."
echo "- Browser/device timezone is never used as a silent fallback."
echo "- Sidebar collapsed/expanded states re-centre the clock in the content header."
echo "- Existing R7 Oman Finance no-text-swap ordering is preserved."

if [ -n "$AUDIT_TENANT" ] && [ -f scripts/audit-location-market-r4.php ]; then
  if [ "$AUDIT_STATUS" -ne 0 ]; then
    echo "ERROR: location/market audit failed for $AUDIT_TENANT" >&2
    exit 5
  fi
  echo "- Location/market audit passed for: $AUDIT_TENANT"
fi
