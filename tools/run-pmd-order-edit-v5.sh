#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
COMMIT="4d4548d271b3f9515c945e3ffdd7636d9535d06a"
RAW="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/${COMMIT}"

BLADE="$ROOT/app/admin/views/orders/form/form_tabs.blade.php"
JS="$ROOT/app/admin/assets/js/pmd-order-edit-v2.js"
CSS="$ROOT/app/admin/assets/css/pmd-order-edit-v2.css"

EXPECTED_BLADE_SHA="235ecddab981c974b8a5e9797886c4704565ae579031c03c2dc4b8370ac2d90d"
EXPECTED_JS_SHA="a249b074918542b00b3d8e8651395854ce97d56c3c0b143167af4d12fcad4254"
EXPECTED_CSS_SHA="64ca461bb57396959588aa8b4e1f27563e1be49025cf852b4c57b6ea905c796a"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="$ROOT/storage/deploy-backups/order-edit-v5-$STAMP"
TMP="$(mktemp -d /tmp/pmd-order-edit-v5.XXXXXX)"
INSTALLED=0

cleanup() {
    rm -rf "$TMP"
}
trap cleanup EXIT

restore_file() {
    local source="$1"
    local target="$2"
    local uid gid mode
    uid="$(stat -c '%u' "$target")"
    gid="$(stat -c '%g' "$target")"
    mode="$(stat -c '%a' "$target")"
    sudo install -o "$uid" -g "$gid" -m "$mode" "$source" "$target"
}

rollback() {
    local code="${1:-1}"
    if [ "$INSTALLED" -eq 1 ]; then
        echo
        echo "Deployment failed — restoring previous files..."
        restore_file "$BACKUP/form_tabs.blade.php" "$BLADE"
        restore_file "$BACKUP/pmd-order-edit-v2.js" "$JS"
        restore_file "$BACKUP/pmd-order-edit-v2.css" "$CSS"
        php artisan view:clear >/dev/null 2>&1 || true
        echo "Rollback completed."
    fi
    exit "$code"
}
trap 'rollback $?' ERR

cd "$ROOT"

echo "============================================================"
echo "PayMyDine — Admin Order Edit V5.1"
echo "============================================================"

test -f "$BLADE" || { echo "Missing: $BLADE"; exit 1; }
test -f "$JS" || { echo "Missing: $JS"; exit 1; }
test -f "$CSS" || { echo "Missing: $CSS"; exit 1; }

CURRENT_BLADE_SHA="$(sha256sum "$BLADE" | awk '{print $1}')"
CURRENT_JS_SHA="$(sha256sum "$JS" | awk '{print $1}')"
CURRENT_CSS_SHA="$(sha256sum "$CSS" | awk '{print $1}')"

printf '\nCurrent production SHAs:\n%s  %s\n%s  %s\n%s  %s\n' \
    "$CURRENT_BLADE_SHA" "$BLADE" \
    "$CURRENT_JS_SHA" "$JS" \
    "$CURRENT_CSS_SHA" "$CSS"

if grep -q 'PMD_ORDER_EDIT_V5' "$JS" \
    && grep -q 'PMD_ORDER_EDIT_V5' "$CSS" \
    && grep -q 'data-pmd-order-tabs' "$BLADE"; then
    echo
    echo "Order Edit V5 is already installed. Nothing changed."
    exit 0
fi

[ "$CURRENT_BLADE_SHA" = "$EXPECTED_BLADE_SHA" ] || {
    echo "ERROR: Blade changed after the reviewed V4 state. Refusing unsafe overwrite."
    exit 1
}
[ "$CURRENT_JS_SHA" = "$EXPECTED_JS_SHA" ] || {
    echo "ERROR: JavaScript changed after the reviewed V4 state. Refusing unsafe overwrite."
    exit 1
}
[ "$CURRENT_CSS_SHA" = "$EXPECTED_CSS_SHA" ] || {
    echo "ERROR: CSS changed after the reviewed V4 state. Refusing unsafe overwrite."
    exit 1
}

echo
echo "Downloading reviewed V5 files from immutable commit ${COMMIT}..."
curl -fsSL "$RAW/app/admin/views/orders/form/form_tabs.blade.php" -o "$TMP/form_tabs.blade.php"
curl -fsSL "$RAW/app/admin/assets/js/pmd-order-edit-v2.js" -o "$TMP/pmd-order-edit-v2.js"
curl -fsSL "$RAW/app/admin/assets/css/pmd-order-edit-v2.css" -o "$TMP/pmd-order-edit-v2.css"

echo "Validating payload..."
grep -q 'data-pmd-order-tabs' "$TMP/form_tabs.blade.php"
grep -q 'pmd-order-empty-state' "$TMP/form_tabs.blade.php"
grep -q 'PMD_ORDER_EDIT_V5' "$TMP/pmd-order-edit-v2.js"
grep -q 'normalizeMoneySigns' "$TMP/pmd-order-edit-v2.js"
grep -q 'PMD_ORDER_EDIT_V5' "$TMP/pmd-order-edit-v2.css"
grep -q 'grid-template-columns: minmax(0, 1fr) minmax(360px, 390px)' "$TMP/pmd-order-edit-v2.css"

# Check executable watcher calls only. Comments such as "No MutationObserver" are allowed.
if grep -Eq 'new[[:space:]]+MutationObserver[[:space:]]*\(|setInterval[[:space:]]*\(' "$TMP/pmd-order-edit-v2.js"; then
    echo "ERROR: recurring DOM watcher found in V5 JavaScript."
    exit 1
fi

if grep -Eq 'new[[:space:]]+MutationObserver[[:space:]]*\(|forceMobileVisibility[[:space:]]*\(|hideVisibleCode[[:space:]]*\(' "$TMP/form_tabs.blade.php"; then
    echo "ERROR: legacy post-paint layout patch found in V5 Blade."
    exit 1
fi

node --check "$TMP/pmd-order-edit-v2.js"

echo "Payload validation: PASSED"

echo
echo "Creating safety backup..."
mkdir -p "$BACKUP"
cp -a "$BLADE" "$BACKUP/form_tabs.blade.php"
cp -a "$JS" "$BACKUP/pmd-order-edit-v2.js"
cp -a "$CSS" "$BACKUP/pmd-order-edit-v2.css"

echo "Backup: $BACKUP"

INSTALLED=1
restore_file "$TMP/form_tabs.blade.php" "$BLADE"
restore_file "$TMP/pmd-order-edit-v2.js" "$JS"
restore_file "$TMP/pmd-order-edit-v2.css" "$CSS"

php artisan view:clear

FPM_SERVICE="$(systemctl list-units --type=service --state=active --no-legend 2>/dev/null | awk '$1 ~ /^php[0-9.]+-fpm.service$/ {print $1; exit}')"
if [ -n "$FPM_SERVICE" ]; then
    echo "Reloading PHP-FPM: $FPM_SERVICE"
    sudo systemctl reload "$FPM_SERVICE"
fi

INSTALLED=0
trap - ERR

echo
echo "Final validation:"
grep -n 'data-pmd-order-tabs' "$BLADE" | head -n 1
grep -n 'PMD_ORDER_EDIT_V5' "$JS" | head -n 1
grep -n 'PMD_ORDER_EDIT_V5' "$CSS" | head -n 1

echo
echo "Final production SHAs:"
sha256sum "$BLADE" "$JS" "$CSS"

echo
echo "Order Edit native tabs: REBUILT"
echo "Blank tabs: REAL EMPTY STATES"
echo "Legacy giant inline CSS: REMOVED"
echo "Legacy MutationObserver: REMOVED"
echo "Workspace gap: REMOVED"
echo "Payment card width: FIXED"
echo "Payments word wrapping: FIXED"
echo "Double coupon minus: FIXED"
echo "Database: UNCHANGED"
echo "Backup: $BACKUP"
