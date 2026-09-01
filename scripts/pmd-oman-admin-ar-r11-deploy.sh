#!/usr/bin/env bash
set -euo pipefail

# PMD_OMAN_ADMIN_AR_COMPLETE_DEPLOY_R11
# Usage: bash scripts/pmd-oman-admin-ar-r11-deploy.sh <immutable-commit-sha>

SHA="${1:-}"
if ! printf '%s' "$SHA" | grep -Eq '^[0-9a-f]{40}$'; then
    echo "ERROR: pass the immutable 40-character Git commit SHA as argument 1."
    exit 2
fi

ROOT='/var/www/paymydine'
REPO='Amir3629/Paymydine-Update'
RAW_HOST='raw.githubusercontent.com'
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd-oman-admin-ar-r11-${STAMP}"
BACKUP="$HOME/pmd-backups/oman-admin-ar-r11-${STAMP}"

cd "$ROOT" || exit 1
rm -rf "$STAGE"
mkdir -p "$STAGE"

cleanup() {
    rm -rf "$STAGE"
}
trap cleanup EXIT

cat > "$STAGE/manifest.txt" <<'EOF'
544ed8b3e68fcce8e00b667e2e04db0e79a02e05 audit app/admin/i18n/platform/en.php
8909ad992b056b154d912a8490604cae11ca1291 install app/admin/i18n/platform/ar.php
e71118c4d95a3c6131722052839c51dae65060d1 install app/admin/i18n/arabic/r10-01-core-menu-coupons.php
f778e981b9554e289b340f4f07354ba5c6ce00cd install app/admin/i18n/arabic/r10-02-reservations-settings-core.php
664e1362eec5605e3ce0f18b6c590fc98a9b44a5 install app/admin/i18n/arabic/r10-03-settings-team-devices.php
3a5150c3d591fdb00a1a68e31d555248b0d340a5 install app/admin/i18n/arabic/r10-04-settings-finance-system.php
c890d3026bbf6ea0aa2531940b842f2b8a322c4e install app/admin/i18n/arabic/r10-05-settings-providers.php
7585d3f155b103f67db8e683542ebfc4918a2de3 install app/admin/i18n/arabic/r10-06-reports-overview.php
571b4fe837cd16616ab7fc5fedd2faff8a06ebfc install app/admin/i18n/arabic/r10-07-reports-detail.php
c54282149d8aae2b3301870cceb6d9071b4568c4 install app/admin/i18n/arabic/r10-08-runtime-floor-shifts.php
94d5a78b53e692d5ecab4729f86f8d14c4d9967f install app/admin/i18n/arabic/r10-09-literals.php
950b1a9f2097e7a525d0935bcab118a3664a2d22 install app/admin/i18n/arabic/r10-10-r11-corrections.php
65a87c67d592441ec4cd896744e629d320e18515 install app/admin/assets/js/pmd-admin-ar-complete-r10.js
b9cb3bdc695eb192f55e30c3cd1c2fa7ed0f9589 install app/admin/views/_partials/pmd_platform_messages.blade.php
f119f7655c0388e818dcb04559567533cfbaa65c install scripts/pmd-audit-admin-ar-r10.php
EOF

echo "======================================================"
echo "OMAN ADMIN ARABIC R11 - STAGE + STRICT AUDIT"
echo "Commit: $SHA"
echo "======================================================"

while read -r expected mode path; do
    target="$STAGE/$path"
    mkdir -p "$(dirname "$target")"

    curl -fL --retry 3 --connect-timeout 20 \
        "https://${RAW_HOST}/${REPO}/${SHA}/${path}" \
        -o "$target"

    actual="$(git hash-object "$target")"
    printf '%-62s expected=%s actual=%s\n' "$path" "$expected" "$actual"

    if [ "$actual" != "$expected" ]; then
        echo "ERROR: blob mismatch for $path"
        exit 10
    fi
done < "$STAGE/manifest.txt"

echo
echo "[1/5] Syntax checks"
while read -r _ _ path; do
    case "$path" in
        *.php)
            php -l "$STAGE/$path"
            ;;
    esac
done < "$STAGE/manifest.txt"

grep -q 'PMD_OMAN_ADMIN_AR_COMPLETE_R10' "$STAGE/app/admin/i18n/platform/ar.php"
grep -q 'PMD_OMAN_ADMIN_AR_R11_FINAL_CORRECTIONS' "$STAGE/app/admin/i18n/arabic/r10-10-r11-corrections.php"
grep -q 'PMD_ADMIN_AR_COMPLETE_RUNTIME_R10' "$STAGE/app/admin/assets/js/pmd-admin-ar-complete-r10.js"
grep -q 'PMD_ADMIN_AR_COMPLETE_RUNTIME_R10' "$STAGE/app/admin/views/_partials/pmd_platform_messages.blade.php"
grep -q 'PMD_AUDIT_ADMIN_AR_COMPLETE_R10' "$STAGE/scripts/pmd-audit-admin-ar-r10.php"
grep -q 'unprocessed current-location orders excluding terminal status names' "$STAGE/app/admin/i18n/arabic/r10-10-r11-corrections.php"

if command -v node >/dev/null 2>&1; then
    node --check "$STAGE/app/admin/assets/js/pmd-admin-ar-complete-r10.js"
fi

echo
echo "[2/5] Strict staged Arabic catalogue audit"
php "$STAGE/scripts/pmd-audit-admin-ar-r10.php" --root="$STAGE"

echo
echo "[3/5] Explicit final-fallback assertions"
php -r '
$root=$argv[1]; $ar=require $root."/app/admin/i18n/platform/ar.php";
$expected=[
 "settings.ui.fiskaly_tse"=>"Fiskaly / TSE · الامتثال المالي",
 "settings.ui.paymydine_cashier"=>"كاشير PayMyDine",
 "settings.runtime_v17.webhooks"=>"إشعارات Webhook",
 "literal::unprocessed current-location orders excluding terminal status names"=>"طلبات الموقع الحالي غير المعالجة مع استبعاد حالات أجهزة الدفع",
];
foreach($expected as $key=>$value){if(($ar[$key]??null)!==$value){fwrite(STDERR,"[FAIL] $key\n");exit(1);} echo "[OK] $key\n";}
' "$STAGE"

echo
echo "[4/5] Backup + install"
mkdir -p "$BACKUP"

while read -r expected mode path; do
    [ "$mode" = 'install' ] || continue
    live="$ROOT/$path"
    if [ -e "$live" ]; then
        mkdir -p "$BACKUP/$(dirname "$path")"
        cp -a "$live" "$BACKUP/$path"
    fi
done < "$STAGE/manifest.txt"

sudo -n install -d -m 0755 "$ROOT/app/admin/i18n/arabic"

while read -r expected mode path; do
    [ "$mode" = 'install' ] || continue
    live="$ROOT/$path"
    sudo -n install -d -m 0755 "$(dirname "$live")"

    permissions='0644'
    case "$path" in
        scripts/*.php) permissions='0755' ;;
    esac

    sudo -n install -m "$permissions" "$STAGE/$path" "$live"

    actual="$(git hash-object "$live")"
    if [ "$actual" != "$expected" ]; then
        echo "ERROR: live blob verification failed for $path"
        exit 20
    fi
done < "$STAGE/manifest.txt"

echo
echo "[5/5] Live audit as www-data"
sudo -n -u www-data php "$ROOT/scripts/pmd-audit-admin-ar-r10.php" --root="$ROOT"

if sudo -n -u www-data php artisan list --raw 2>/dev/null | grep -qx 'view:clear'; then
    sudo -n -u www-data php artisan view:clear
fi

echo "======================================================"
echo "OMAN ADMIN ARABIC R11 INSTALLED"
echo "R10 catalogue + R11 final corrections are live."
echo "Strict catalogue audit passed before and after install."
echo "No database writes were made."
echo "No global cache clear was performed."
echo "No PHP-FPM restart/reload was performed."
echo "Compiled Blade views were cleared if view:clear is available."
echo "Backup: $BACKUP"
echo "======================================================"
