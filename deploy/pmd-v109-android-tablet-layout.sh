#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_COMMIT="11ed4fb5749c52d427b995612e92e8d068ebe3fa"

OVERLAY="app/admin/assets/css/pmd-qpos-android-tablet-v109.css"
VIEW="app/admin/views/pmd_quick_pos_v1.blade.php"

log(){ printf '\n[PayMyDine V109] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V109][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT"
command -v sudo >/dev/null 2>&1 || fail "sudo is required"
command -v php >/dev/null 2>&1 || fail "php CLI is required"
sudo -n true || fail "passwordless sudo is required"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching exact V109 tablet-only layout"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}" || fail "V109 commit unavailable"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v109-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v109-tablet-layout-before-${STAMP}.tar.gz"

rm -rf "$STAGE"
mkdir -p "$STAGE/$(dirname "$OVERLAY")"
sudo mkdir -p "$BACKUP_DIR"
trap 'rm -rf "$STAGE"' EXIT

"${GIT[@]}" show "${SOURCE_COMMIT}:$OVERLAY" > "$STAGE/$OVERLAY"

grep -Fq "PMD_QPOS_ANDROID_TABLET_LAYOUT_V109" "$STAGE/$OVERLAY"   || fail "V109 tablet stylesheet marker missing"
grep -Fq "grid-template-columns: 170px minmax(0,1fr) 360px" "$STAGE/$OVERLAY"   || fail "V109 landscape balance missing"
grep -Fq '"catalog check"' "$STAGE/$OVERLAY"   || fail "V109 portrait visible-Check layout missing"
grep -Fq "font-size: 24px !important" "$STAGE/$OVERLAY"   || fail "V109 portrait food-name scale missing"

if ! grep -Eq   "PMD_QPOS_ANDROID_SERVER_CSS_OVERRIDE_V105|PMD_QPOS_ANDROID_SAFE_OVERRIDE_V107"   "$VIEW"; then
  fail "Live Quick POS view is not a supported Android tablet view"
fi

# Back up only files this deploy may touch.
EXISTING=("$VIEW")
[[ -f "$OVERLAY" ]] && EXISTING+=("$OVERLAY")
sudo tar -czf "$BACKUP" "${EXISTING[@]}"
sudo chmod 0640 "$BACKUP" || true

# Install the unique tablet-only stylesheet using the canonical Quick POS CSS
# ownership/mode. The APK does not intercept this unique resource path.
CSS_REF="app/admin/assets/css/pmd-quick-pos-v1.css"
uid="$(stat -c '%u' "$CSS_REF")"
gid="$(stat -c '%g' "$CSS_REF")"
mode="$(stat -c '%a' "$CSS_REF")"
sudo install -m "$mode" -o "$uid" -g "$gid" "$STAGE/$OVERLAY" "$PMD_ROOT/$OVERLAY"

# Patch only the live Blade view and only if V109 is not already referenced.
PATCHED="$STAGE/pmd_quick_pos_v1.blade.php"
php -r '
$source = $argv[1];
$dest = $argv[2];
$s = file_get_contents($source);
if ($s === false) { fwrite(STDERR, "view read failed\n"); exit(2); }

if (strpos($s, "PMD_QPOS_ANDROID_TABLET_LAYOUT_V109") !== false) {
    file_put_contents($dest, $s);
    exit(0);
}

if (strpos($s, "PMD_QPOS_ANDROID_SERVER_CSS_OVERRIDE_V105") !== false) {
    $condition = "$pmdAndroidPosV105";
} elseif (strpos($s, "PMD_QPOS_ANDROID_SAFE_OVERRIDE_V107") !== false) {
    $condition = "$pmdAndroidPosV107";
} else {
    fwrite(STDERR, "unsupported Android Quick POS view\n");
    exit(3);
}

$block = "    @if(".$condition.")\n"
    ."        {{-- PMD_QPOS_ANDROID_TABLET_LAYOUT_V109\n"
    ."             Android Cashier tablet only. Phone/mobile layout is untouched. --}}\n"
    ."        <link rel=\"stylesheet\" href=\"/app/admin/assets/css/pmd-qpos-android-tablet-v109.css?v=20260925-v109\">\n"
    ."    @endif\n";

$head = strpos($s, "</head>");
if ($head === false) { fwrite(STDERR, "</head> missing\n"); exit(4); }
$s = substr($s, 0, $head).$block.substr($s, $head);
if (file_put_contents($dest, $s) === false) {
    fwrite(STDERR, "patched view write failed\n");
    exit(5);
}
' "$VIEW" "$PATCHED"

grep -Fq "PMD_QPOS_ANDROID_TABLET_LAYOUT_V109" "$PATCHED"   || fail "V109 link was not added to the live view"
grep -Fq "pmd-qpos-android-tablet-v109.css?v=20260925-v109" "$PATCHED"   || fail "V109 unique stylesheet URL missing"

view_uid="$(stat -c '%u' "$VIEW")"
view_gid="$(stat -c '%g' "$VIEW")"
view_mode="$(stat -c '%a' "$VIEW")"
sudo install -m "$view_mode" -o "$view_uid" -g "$view_gid" "$PATCHED" "$VIEW"

sudo -u www-data php artisan view:clear >/dev/null 2>&1   || php artisan view:clear >/dev/null 2>&1   || true
sudo -u www-data php artisan cache:clear >/dev/null 2>&1   || php artisan cache:clear >/dev/null 2>&1   || true

grep -Fq "PMD_QPOS_ANDROID_TABLET_LAYOUT_V109" "$OVERLAY"
grep -Fq "PMD_QPOS_ANDROID_TABLET_LAYOUT_V109" "$VIEW"

cat <<'EOF'

============================================================
 PAYMYDINE QUICK POS V109 ANDROID TABLET LAYOUT COMPLETE
============================================================

ANDROID CASHIER TABLET ONLY

Landscape:
  Table rail          = NARROWER
  Check panel         = WIDER
  Check cards         = WIDER / easier to read
  Table tiles         = MORE COMPACT
  Capacity badge      = KEPT INSIDE the table tile

Portrait:
  Check panel         = ALWAYS VISIBLE
  Phone-style sheet   = DISABLED for tablet
  Layout              = Tables on top, Menu + Check side by side
  Food item names     = MUCH LARGER
  Product price       = LARGER
  Capacity badge      = KEPT INSIDE the table tile

UNTOUCHED:
  Mobile / phone UI
  V105 viewport/form-factor fix
  V108 Pay-before-Kitchen
  payment providers
  KDS/payment backend
  database
  generic browser mobile breakpoints

After deploy:
  1. Force-stop the Cashier App.
  2. Open it while online.
  3. Test portrait.
  4. Rotate to landscape.
  5. Rotate back to portrait.

============================================================
EOF

printf 'Backup: %s\n' "$BACKUP"
