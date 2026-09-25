#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_COMMIT="7a18cf0c4cdd5b4a08bd68558c1ff60773c7e06b"

OVERLAY="app/admin/assets/css/pmd-qpos-android-tablet-v111.css"
VIEW="app/admin/views/pmd_quick_pos_v1.blade.php"

log(){ printf '\n[PayMyDine V111] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V111][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT"
command -v sudo >/dev/null 2>&1 || fail "sudo is required"
command -v php >/dev/null 2>&1 || fail "php CLI is required"
sudo -n true || fail "passwordless sudo is required"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching exact V111 tablet square-card fix"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}"   || fail "V111 commit unavailable"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v111-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v111-tablet-square-cards-before-${STAMP}.tar.gz"

rm -rf "$STAGE"
mkdir -p "$STAGE/$(dirname "$OVERLAY")"
sudo mkdir -p "$BACKUP_DIR"
trap 'rm -rf "$STAGE"' EXIT

"${GIT[@]}" show "${SOURCE_COMMIT}:$OVERLAY" > "$STAGE/$OVERLAY"

grep -Fq "PMD_QPOS_ANDROID_TABLET_DESKTOP_PARITY_V110" "$STAGE/$OVERLAY"   || fail "V110 Desktop-parity base missing"
grep -Fq "PMD_QPOS_ANDROID_TABLET_SQUARE_GEOMETRY_V111" "$STAGE/$OVERLAY"   || fail "V111 square geometry marker missing"

COUNT="$(grep -Fc "aspect-ratio: 1 / 1 !important" "$STAGE/$OVERLAY" || true)"
[[ "$COUNT" -ge 2 ]] || fail "V111 square contracts missing"

if ! grep -Eq   "pmd-qpos-android-tablet-v110\.css\?v=20260925-v110|pmd-qpos-android-tablet-v111\.css\?v=20260925-v111"   "$VIEW"; then
  fail "Live Android tablet stylesheet link not found"
fi

EXISTING=("$VIEW")
[[ -f "$OVERLAY" ]] && EXISTING+=("$OVERLAY")
sudo tar -czf "$BACKUP" "${EXISTING[@]}"
sudo chmod 0640 "$BACKUP" || true

CSS_REF="app/admin/assets/css/pmd-quick-pos-v1.css"
uid="$(stat -c '%u' "$CSS_REF")"
gid="$(stat -c '%g' "$CSS_REF")"
mode="$(stat -c '%a' "$CSS_REF")"

sudo install -m "$mode" -o "$uid" -g "$gid"   "$STAGE/$OVERLAY" "$PMD_ROOT/$OVERLAY"

PATCHED="$STAGE/pmd_quick_pos_v1.blade.php"

php -r '
$source = $argv[1];
$dest = $argv[2];
$s = file_get_contents($source);
if ($s === false) {
    fwrite(STDERR, "view read failed\n");
    exit(2);
}

$s = str_replace(
    "PMD_QPOS_ANDROID_TABLET_DESKTOP_PARITY_V110",
    "PMD_QPOS_ANDROID_TABLET_SQUARE_GEOMETRY_V111",
    $s
);
$s = str_replace(
    "pmd-qpos-android-tablet-v110.css?v=20260925-v110",
    "pmd-qpos-android-tablet-v111.css?v=20260925-v111",
    $s
);

if (file_put_contents($dest, $s) === false) {
    fwrite(STDERR, "patched view write failed\n");
    exit(3);
}
' "$VIEW" "$PATCHED"

grep -Fq "pmd-qpos-android-tablet-v111.css?v=20260925-v111" "$PATCHED"   || fail "V111 stylesheet URL missing"

if grep -Fq "pmd-qpos-android-tablet-v110.css?v=20260925-v110" "$PATCHED"; then
  fail "V110 stylesheet is still active"
fi

view_uid="$(stat -c '%u' "$VIEW")"
view_gid="$(stat -c '%g' "$VIEW")"
view_mode="$(stat -c '%a' "$VIEW")"

sudo install -m "$view_mode" -o "$view_uid" -g "$view_gid"   "$PATCHED" "$VIEW"

sudo -u www-data php artisan view:clear >/dev/null 2>&1   || php artisan view:clear >/dev/null 2>&1   || true
sudo -u www-data php artisan cache:clear >/dev/null 2>&1   || php artisan cache:clear >/dev/null 2>&1   || true

grep -Fq "PMD_QPOS_ANDROID_TABLET_SQUARE_GEOMETRY_V111" "$OVERLAY"
grep -Fq "pmd-qpos-android-tablet-v111.css?v=20260925-v111" "$VIEW"

cat <<'EOF'

============================================================
 PAYMYDINE QUICK POS V111 TABLET SQUARE CARDS COMPLETE
============================================================

ANDROID CASHIER TABLET ONLY

Landscape:
  Table cards        = EXACT 1:1 SQUARE
  Food item cards    = EXACT 1:1 SQUARE
  V110 Desktop order = PRESERVED

Portrait:
  Table cards        = EXACT 1:1 SQUARE
  Food item cards    = EXACT 1:1 SQUARE
  Tables -> Menu -> Check flow = PRESERVED

UNTOUCHED:
  mobile / phone UI
  V105 viewport/form-factor logic
  V108 Pay-before-Kitchen
  Checkout behavior
  KDS/payment backend
  database
  terminal integrations

After deploy:
  Force-stop Cashier App and reopen online.

============================================================
EOF

printf 'Backup: %s\n' "$BACKUP"
