#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
SOURCE_COMMIT="c2207f11628bc98b32cc80fc9b5d734d5968c496"
RAW_BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/${SOURCE_COMMIT}"

BLADE="$ROOT/app/admin/views/orders/form/form_tabs.blade.php"
JS="$ROOT/app/admin/assets/js/pmd-order-edit-v2.js"
CSS="$ROOT/app/admin/assets/css/pmd-order-edit-v2.css"

EXPECTED_BLADE_SHA="235ecddab981c974b8a5e9797886c4704565ae579031c03c2dc4b8370ac2d90d"
EXPECTED_JS_SHA="a249b074918542b00b3d8e8651395854ce97d56c3c0b143167af4d12fcad4254"
EXPECTED_CSS_SHA="64ca461bb57396959588aa8b4e1f27563e1be49025cf852b4c57b6ea905c796a"

FINAL_BLADE_SHA="dc4be0bd931d55c175ac956638b6de3a2d290ac02d31fc1f27a688c1e4e973d4"
FINAL_JS_SHA="090ed636e9761c56aed00676b6ab5496098fdf01ef66ec08e0114094ab1c7d4f"
FINAL_CSS_SHA="41ac8c52c26f096c759f6424edcde2a34aa4cc3602b7285c42873cebfbe5816b"

STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="$ROOT/storage/deploy-backups/order-edit-v6-$STAMP"
TMP="$(mktemp -d /tmp/pmd-order-edit-v6.XXXXXX)"
INSTALLED=0

cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

restore_file() {
    local source="$1" target="$2"
    sudo install -o "$(stat -c '%u' "$target")" -g "$(stat -c '%g' "$target")" -m "$(stat -c '%a' "$target")" "$source" "$target"
}

rollback() {
    local code="${1:-1}"
    if [ "$INSTALLED" -eq 1 ]; then
        echo
        echo "ROLLBACK STARTED"
        restore_file "$BACKUP/form_tabs.blade.php" "$BLADE"
        restore_file "$BACKUP/pmd-order-edit-v2.js" "$JS"
        restore_file "$BACKUP/pmd-order-edit-v2.css" "$CSS"
        cd "$ROOT"
        php artisan view:clear || true
        local fpm
        fpm="$(systemctl list-units --type=service --state=active --no-legend 2>/dev/null | awk '$1 ~ /^php[0-9.]+-fpm\.service$/ {print $1; exit}')"
        [ -z "$fpm" ] || sudo systemctl reload "$fpm" || true
        echo "Rollback completed."
    fi
    exit "$code"
}
trap 'rollback $?' ERR

sha() { sha256sum "$1" | awk '{print $1}'; }
check_source() {
    local file="$1" expected="$2" final="$3"
    local current
    current="$(sha "$file")"
    echo "$file"
    echo "Current:  $current"
    if [ "$current" = "$final" ]; then
        echo "Already V6."
        return 2
    fi
    if [ "$current" != "$expected" ]; then
        echo "ERROR: live file changed; refusing unsafe overwrite."
        return 1
    fi
    return 0
}

install_file() {
    local source="$1" target="$2"
    sudo install -o "$(stat -c '%u' "$target")" -g "$(stat -c '%g' "$target")" -m "$(stat -c '%a' "$target")" "$source" "$target"
}

echo "============================================================"
echo "PayMyDine — Admin Order Edit V6"
echo "Dashboard2 / Reservations2 aligned rebuild"
echo "============================================================"

for file in "$BLADE" "$JS" "$CSS"; do
    test -f "$file" || { echo "ERROR: missing $file"; exit 1; }
done

already=0
check_source "$BLADE" "$EXPECTED_BLADE_SHA" "$FINAL_BLADE_SHA" || case $? in 2) already=$((already+1));; *) exit 1;; esac
check_source "$JS" "$EXPECTED_JS_SHA" "$FINAL_JS_SHA" || case $? in 2) already=$((already+1));; *) exit 1;; esac
check_source "$CSS" "$EXPECTED_CSS_SHA" "$FINAL_CSS_SHA" || case $? in 2) already=$((already+1));; *) exit 1;; esac

if [ "$already" -eq 3 ]; then
    echo "Order Edit V6 is already installed. Nothing modified."
    exit 0
elif [ "$already" -ne 0 ]; then
    echo "ERROR: partial V6 state detected. Restore the last backup before retrying."
    exit 1
fi

echo
echo "Downloading immutable V6 sources..."
curl -fsSL "$RAW_BASE/app/admin/views/orders/form/form_tabs.blade.php" -o "$TMP/form_tabs.blade.php"
curl -fsSL "$RAW_BASE/app/admin/assets/js/pmd-order-edit-v2.js" -o "$TMP/pmd-order-edit-v2.js"
curl -fsSL "$RAW_BASE/app/admin/assets/css/pmd-order-edit-v2.css" -o "$TMP/pmd-order-edit-v2.css"

[ "$(sha "$TMP/form_tabs.blade.php")" = "$FINAL_BLADE_SHA" ] || { echo "Blade checksum mismatch"; exit 1; }
[ "$(sha "$TMP/pmd-order-edit-v2.js")" = "$FINAL_JS_SHA" ] || { echo "JS checksum mismatch"; exit 1; }
[ "$(sha "$TMP/pmd-order-edit-v2.css")" = "$FINAL_CSS_SHA" ] || { echo "CSS checksum mismatch"; exit 1; }

grep -q 'PMD_ORDER_EDIT_V6' "$TMP/pmd-order-edit-v2.js"
grep -q 'PMD_ORDER_EDIT_V6' "$TMP/pmd-order-edit-v2.css"
grep -q 'data-pmd-oe-tab' "$TMP/form_tabs.blade.php"
! grep -Eq 'MutationObserver|setInterval\s*\(' "$TMP/pmd-order-edit-v2.js"
! grep -Eq '<style>|<script>' "$TMP/form_tabs.blade.php"

node --check "$TMP/pmd-order-edit-v2.js"

cat > "$TMP/compile.php" <<'PHP'
<?php
require '/var/www/paymydine/vendor/autoload.php';
$app = require '/var/www/paymydine/bootstrap/app.php';
$app->make(Illuminate\Contracts\Console\Kernel::class)->bootstrap();
$source = file_get_contents($argv[1]);
$compiled = app('blade.compiler')->compileString($source);
file_put_contents($argv[2], $compiled);
PHP
php "$TMP/compile.php" "$TMP/form_tabs.blade.php" "$TMP/compiled.php"
php -l "$TMP/compiled.php"

echo "Prepared source validation: PASSED"

mkdir -p "$BACKUP"
cp -a "$BLADE" "$BACKUP/form_tabs.blade.php"
cp -a "$JS" "$BACKUP/pmd-order-edit-v2.js"
cp -a "$CSS" "$BACKUP/pmd-order-edit-v2.css"
echo "Backup: $BACKUP"

INSTALLED=1
install_file "$TMP/form_tabs.blade.php" "$BLADE"
install_file "$TMP/pmd-order-edit-v2.js" "$JS"
install_file "$TMP/pmd-order-edit-v2.css" "$CSS"

cd "$ROOT"
php artisan view:clear

FPM_SERVICE="$(systemctl list-units --type=service --state=active --no-legend 2>/dev/null | awk '$1 ~ /^php[0-9.]+-fpm\.service$/ {print $1; exit}')"
if [ -n "$FPM_SERVICE" ]; then
    sudo systemctl reload "$FPM_SERVICE"
fi

[ "$(sha "$BLADE")" = "$FINAL_BLADE_SHA" ]
[ "$(sha "$JS")" = "$FINAL_JS_SHA" ]
[ "$(sha "$CSS")" = "$FINAL_CSS_SHA" ]

INSTALLED=0
trap - ERR

echo
echo "Order Edit V6: DEPLOYED"
echo "Native tab authority: ENABLED"
echo "Blank-tab bug: REMOVED"
echo "Dashboard2 background and spacing: ALIGNED"
echo "Nested-card clutter: REDUCED"
echo "Payments wrapping: FIXED"
echo "Double coupon minus: FIXED"
echo "Machine notes: CLEANED"
echo "MutationObserver / polling: NONE"
echo "Database: UNCHANGED"
echo "Backup: $BACKUP"
echo
echo "Final SHAs:"
sha256sum "$BLADE" "$JS" "$CSS"
