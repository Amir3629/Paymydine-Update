#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_COMMIT="b31fab6f00459f50886d7b8fb74346e2450da098"

OVERLAY="app/admin/assets/css/pmd-qpos-android-tablet-v110.css"
VIEW="app/admin/views/pmd_quick_pos_v1.blade.php"

log(){ printf '\n[PayMyDine V110] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V110][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT"
command -v sudo >/dev/null 2>&1 || fail "sudo is required"
command -v php >/dev/null 2>&1 || fail "php CLI is required"
sudo -n true || fail "passwordless sudo is required"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching exact V110 tablet Desktop-parity fix"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}"   || fail "V110 commit unavailable"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v110-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v110-tablet-desktop-parity-before-${STAMP}.tar.gz"

rm -rf "$STAGE"
mkdir -p "$STAGE/$(dirname "$OVERLAY")"
sudo mkdir -p "$BACKUP_DIR"
trap 'rm -rf "$STAGE"' EXIT

"${GIT[@]}" show "${SOURCE_COMMIT}:$OVERLAY" > "$STAGE/$OVERLAY"

grep -Fq "PMD_QPOS_ANDROID_TABLET_DESKTOP_PARITY_V110" "$STAGE/$OVERLAY"   || fail "V110 stylesheet marker missing"
grep -Fq "grid-template-columns: 300px minmax(360px,1fr) 220px" "$STAGE/$OVERLAY"   || fail "Desktop landscape geometry missing"
grep -Fq "Tables -> Menu -> Check" "$STAGE/$OVERLAY"   || fail "Portrait flow contract missing"
grep -Fq "min-height: 520px" "$STAGE/$OVERLAY"   || fail "Portrait Checkout card contract missing"

if ! grep -Eq   "PMD_QPOS_ANDROID_SERVER_CSS_OVERRIDE_V105|PMD_QPOS_ANDROID_SAFE_OVERRIDE_V107"   "$VIEW"; then
  fail "Live Quick POS view is not a supported Android tablet view"
fi

EXISTING=("$VIEW")
[[ -f "$OVERLAY" ]] && EXISTING+=("$OVERLAY")
[[ -f "app/admin/assets/css/pmd-qpos-android-tablet-v109.css" ]]   && EXISTING+=("app/admin/assets/css/pmd-qpos-android-tablet-v109.css")

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

/* Remove only the V109 tablet redesign block/link. */
$s = preg_replace(
    "~[ \t]*\{\{--\s*PMD_QPOS_ANDROID_TABLET_LAYOUT_V109.*?--\}\}[ \t]*\R"
    . "[ \t]*<link[^>]+pmd-qpos-android-tablet-v109\.css\?v=20260925-v109[^>]*>[ \t]*\R?~s",
    "",
    $s
);
$s = preg_replace(
    "~[ \t]*<link[^>]+pmd-qpos-android-tablet-v109\.css\?v=20260925-v109[^>]*>[ \t]*\R?~",
    "",
    $s
);

/* Idempotent: keep one V110 link only. */
if (strpos($s, "PMD_QPOS_ANDROID_TABLET_DESKTOP_PARITY_V110") === false) {
    if (strpos($s, "PMD_QPOS_ANDROID_SERVER_CSS_OVERRIDE_V105") !== false) {
        $condition = "\$pmdAndroidPosV105";
    } elseif (strpos($s, "PMD_QPOS_ANDROID_SAFE_OVERRIDE_V107") !== false) {
        $condition = "\$pmdAndroidPosV107";
    } else {
        fwrite(STDERR, "unsupported Android Quick POS view\n");
        exit(3);
    }

    $block =
        "    @if(".$condition.")\n"
        ."        {{-- PMD_QPOS_ANDROID_TABLET_DESKTOP_PARITY_V110\n"
        ."             Desktop cards; portrait flow ends with Check. Mobile untouched. --}}\n"
        ."        <link rel=\"stylesheet\" href=\"/app/admin/assets/css/pmd-qpos-android-tablet-v110.css?v=20260925-v110\">\n"
        ."    @endif\n";

    $head = strpos($s, "</head>");
    if ($head === false) {
        fwrite(STDERR, "</head> missing\n");
        exit(4);
    }

    $s = substr($s, 0, $head).$block.substr($s, $head);
}

if (file_put_contents($dest, $s) === false) {
    fwrite(STDERR, "patched view write failed\n");
    exit(5);
}
' "$VIEW" "$PATCHED"

grep -Fq "PMD_QPOS_ANDROID_TABLET_DESKTOP_PARITY_V110" "$PATCHED"   || fail "V110 link was not added"
grep -Fq "pmd-qpos-android-tablet-v110.css?v=20260925-v110" "$PATCHED"   || fail "V110 stylesheet URL missing"

if grep -Fq "pmd-qpos-android-tablet-v109.css?v=20260925-v109" "$PATCHED"; then
  fail "V109 stylesheet is still active"
fi

view_uid="$(stat -c '%u' "$VIEW")"
view_gid="$(stat -c '%g' "$VIEW")"
view_mode="$(stat -c '%a' "$VIEW")"
sudo install -m "$view_mode" -o "$view_uid" -g "$view_gid"   "$PATCHED" "$VIEW"

sudo -u www-data php artisan view:clear >/dev/null 2>&1   || php artisan view:clear >/dev/null 2>&1   || true
sudo -u www-data php artisan cache:clear >/dev/null 2>&1   || php artisan cache:clear >/dev/null 2>&1   || true

grep -Fq "PMD_QPOS_ANDROID_TABLET_DESKTOP_PARITY_V110" "$OVERLAY"
grep -Fq "PMD_QPOS_ANDROID_TABLET_DESKTOP_PARITY_V110" "$VIEW"

cat <<'EOF'

============================================================
 PAYMYDINE QUICK POS V110 TABLET DESKTOP PARITY COMPLETE
============================================================

V109 REDESIGN
  active link          = REMOVED

ANDROID TABLET LANDSCAPE
  structure            = Desktop
  visual order         = Check | Menu | Tables
  Check width          = 300px
  Tables width         = 220px
  Table cards          = Desktop proportions
  Check cards          = Desktop proportions
  Capacity             = normal Desktop text inside card

ANDROID TABLET PORTRAIT
  structure            = normal vertical flow
  order                = Tables -> Menu -> Check
  Check / Checkout     = LAST CARD on page
  side-by-side redesign= REMOVED
  full-screen sheet    = REMOVED
  Table cards          = Desktop proportions
  Check cards          = Desktop proportions
  food names           = 20px, readable but not a new visual system

UNTOUCHED
  phone/mobile UI
  V105 form-factor/viewport logic
  V108 Pay-before-Kitchen
  payment/KDS backend
  database
  terminal integrations

After deploy:
  Force-stop Cashier App and reopen online.

============================================================
EOF

printf 'Backup: %s\n' "$BACKUP"
