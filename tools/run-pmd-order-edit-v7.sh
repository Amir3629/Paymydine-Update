#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
REF="e67d8a56dd7fafde35b114be41a1026242983cf2"
BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/${REF}"

JS="$ROOT/app/admin/assets/js/pmd-order-edit-v2.js"
CSS="$ROOT/app/admin/assets/css/pmd-order-edit-v2.css"

EXPECTED_LIVE_JS_SHA="090ed636e9761c56aed00676b6ab5496098fdf01ef66ec08e0114094ab1c7d4f"
EXPECTED_LIVE_CSS_SHA="41ac8c52c26f096c759f6424edcde2a34aa4cc3602b7285c42873cebfbe5816b"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="$ROOT/storage/deploy-backups/order-edit-v7-${STAMP}"
TMP="$(mktemp -d /tmp/pmd-order-edit-v7.XXXXXX)"

cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

cd "$ROOT"

echo "# PayMyDine — Admin Order Edit V7 Reference Match"
echo

a_sha="$(sha256sum "$JS" | awk '{print $1}')"
c_sha="$(sha256sum "$CSS" | awk '{print $1}')"

echo "Current production SHAs:"
echo "$a_sha  $JS"
echo "$c_sha  $CSS"
echo

if grep -Fq 'PMD_ORDER_EDIT_V7_REFERENCE_MATCH' "$JS" && grep -Fq 'PMD_ORDER_EDIT_V7_REFERENCE_MATCH' "$CSS"; then
  echo "Order Edit V7 is already installed. Nothing to do."
  exit 0
fi

if [[ "$a_sha" != "$EXPECTED_LIVE_JS_SHA" ]]; then
  echo "ERROR: JavaScript does not match the verified V6 production baseline."
  echo "Expected: $EXPECTED_LIVE_JS_SHA"
  echo "Current:  $a_sha"
  exit 1
fi

if [[ "$c_sha" != "$EXPECTED_LIVE_CSS_SHA" ]]; then
  echo "ERROR: CSS does not match the verified V6 production baseline."
  echo "Expected: $EXPECTED_LIVE_CSS_SHA"
  echo "Current:  $c_sha"
  exit 1
fi

echo "Downloading immutable V7 sources from ${REF}..."
curl -fsSL "$BASE/app/admin/assets/js/pmd-order-edit-v2.js" -o "$TMP/pmd-order-edit-v2.js"
curl -fsSL "$BASE/app/admin/assets/css/pmd-order-edit-v2.css" -o "$TMP/pmd-order-edit-v2.css"

echo "Validating prepared files..."
node --check "$TMP/pmd-order-edit-v2.js"
grep -Fq 'PMD_ORDER_EDIT_V7_REFERENCE_MATCH' "$TMP/pmd-order-edit-v2.js"
grep -Fq 'PMD_ORDER_EDIT_V7_REFERENCE_MATCH' "$TMP/pmd-order-edit-v2.css"
grep -Fq '#f5f7fa' "$TMP/pmd-order-edit-v2.css"
grep -Fq 'Tabler Icons SVG paths' "$TMP/pmd-order-edit-v2.js"

if grep -Eq 'MutationObserver|setInterval\s*\(' "$TMP/pmd-order-edit-v2.js"; then
  echo "ERROR: recurring DOM watcher or polling found in V7 JavaScript."
  exit 1
fi

if grep -Eq '(\.navbar|\.main-header|\.header-navbar|\.side-menu2|\.main-sidebar|\.sidebar-wrapper)[[:space:]]*\{' "$TMP/pmd-order-edit-v2.css"; then
  echo "ERROR: V7 CSS attempts to own the global header/sidebar."
  exit 1
fi

echo "Prepared source validation: PASSED"

mkdir -p "$BACKUP"
cp -a "$JS" "$BACKUP/pmd-order-edit-v2.js"
cp -a "$CSS" "$BACKUP/pmd-order-edit-v2.css"

echo "Backup: $BACKUP"

install_preserving_metadata() {
  local source="$1"
  local target="$2"
  sudo install \
    -o "$(stat -c '%u' "$target")" \
    -g "$(stat -c '%g' "$target")" \
    -m "$(stat -c '%a' "$target")" \
    "$source" "$target"
}

install_preserving_metadata "$TMP/pmd-order-edit-v2.js" "$JS"
install_preserving_metadata "$TMP/pmd-order-edit-v2.css" "$CSS"

php artisan view:clear

FPM_SERVICE="$(systemctl list-units --type=service --state=active --no-legend 2>/dev/null | awk '$1 ~ /^php[0-9.]+-fpm\.service$/ {print $1; exit}')"
if [[ -n "$FPM_SERVICE" ]]; then
  echo "Reloading PHP-FPM: $FPM_SERVICE"
  sudo systemctl reload "$FPM_SERVICE"
fi

echo
echo "Order Edit V7: DEPLOYED"
echo "Global header: UNCHANGED"
echo "Global sidebar: UNCHANGED"
echo "Page background: #f5f7fa"
echo "Selected reference composition: APPLIED"
echo "Order information ribbon: REFINED"
echo "Compact tabs: APPLIED"
echo "Order overview card: REBUILT"
echo "Invoice/payment rail: REBUILT"
echo "Tabler outline SVG icon set: APPLIED"
echo "MutationObserver / polling: NONE"
echo "Database: UNCHANGED"
echo "Frontend Next.js build: NOT REQUIRED"
echo "Backup: $BACKUP"
echo
echo "Final SHAs:"
sha256sum "$JS" "$CSS"
