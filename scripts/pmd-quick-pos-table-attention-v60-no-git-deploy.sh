#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/var/www/paymydine}"
PAYLOAD_SHA="613b7f0e5341e6bcb015c3188d6317543e3b86a5"
RAW_BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/${PAYLOAD_SHA}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="$(mktemp -d /tmp/pmd-qpos-v60.XXXXXX)"
BACKUP="$ROOT/storage/pmd-patch-backups/qpos-table-attention-v60-$STAMP"
DONE=0

FILES=(
  "app/admin/controllers/PmdQuickPosV1.php"
  "app/admin/views/pmd_quick_pos_v1.blade.php"
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/assets/js/pmd-quick-pos-v1.js"
)

expected_blob_sha() {
  case "$1" in
    "app/admin/controllers/PmdQuickPosV1.php")
      printf '%s\n' "dd70baad53fc9fbf881915104a5c02238167cfea"
      ;;
    "app/admin/views/pmd_quick_pos_v1.blade.php")
      printf '%s\n' "a57c76723e6b5a5260be2ff5d273044f4a8457af"
      ;;
    "app/admin/assets/css/pmd-quick-pos-v1.css")
      printf '%s\n' "61315f8656a500d47cf4b3628945b6f699a585fd"
      ;;
    "app/admin/assets/js/pmd-quick-pos-v1.js")
      printf '%s\n' "886a4d801aa94c429f74916568409cadb0975d9a"
      ;;
    *)
      return 1
      ;;
  esac
}

download_file() {
  src="$1"
  dest="$2"

  if command -v curl >/dev/null 2>&1; then
    curl -fsSL --retry 3 --connect-timeout 10 "$src" -o "$dest"
    return
  fi

  if command -v wget >/dev/null 2>&1; then
    wget -q --tries=3 --timeout=20 -O "$dest" "$src"
    return
  fi

  echo "ERROR: curl or wget is required." >&2
  exit 1
}

cleanup() {
  rm -rf "$STAGE" >/dev/null 2>&1 || true
}

rollback() {
  [ "$DONE" -eq 0 ] || return 0
  [ -d "$BACKUP" ] || return 0

  echo
  echo "===== ROLLBACK ====="
  set +e
  for file in "${FILES[@]}"; do
    if [ -f "$BACKUP/$file" ]; then
      cp "$BACKUP/$file" "$ROOT/$file"
      cmp -s "$BACKUP/$file" "$ROOT/$file" && echo "RESTORED $file"
    fi
  done

  if [ -f "$ROOT/artisan" ] && command -v php >/dev/null 2>&1; then
    php "$ROOT/artisan" view:clear >/dev/null 2>&1 || true
  fi
  set -e
}

on_exit() {
  status="$1"
  trap - EXIT
  [ "$status" -eq 0 ] || rollback
  cleanup
  exit "$status"
}
trap 'on_exit $?' EXIT

cd "$ROOT"

echo "=============================================================="
echo " PayMyDine QUICK POS V60 - NO LOCAL GIT"
echo " Payload: $PAYLOAD_SHA"
echo " Backup:  $BACKUP"
echo "=============================================================="

echo
echo "===== LOCAL GIT WRITE BYPASS ====="
echo "No git fetch, git show, checkout, merge, reset or object write is used."
echo "Payload files are downloaded directly from a pinned GitHub commit."

echo
echo "===== REQUIRE STABLE LIVE BASE ====="
grep -Fq "PMD_QPOS_ROUTE_STACK_SAFE_V55" "$ROOT/routes/admin-quick-mode.php"
grep -Fq "PMD_QPOS_PAYMENT_INSTANT_OPEN_V52" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -Fq "PMD_QPOS_HISTORY_TABLE_RAIL_RIGHT_V51" "$ROOT/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -Fq "PMD_QPOS_RESERVATION_BUSY_INLINE_OVERRIDE_V54" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"
echo "OK pre-V58 stable Quick POS base detected"

echo
echo "===== DOWNLOAD PINNED V60 PAYLOAD ====="
for file in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$file")"
  download_file "$RAW_BASE/$file" "$STAGE/$file"
  test -s "$STAGE/$file"

  expected="$(expected_blob_sha "$file")"
  actual="$(git hash-object --no-filters "$STAGE/$file")"

  if [ "$actual" != "$expected" ]; then
    echo "ERROR: Git blob verification failed for $file" >&2
    echo "Expected: $expected" >&2
    echo "Actual:   $actual" >&2
    exit 1
  fi

  echo "DOWNLOADED + VERIFIED $file"
done

echo
echo "===== WRITABLE CHECK - NO SUDO ====="
for file in "${FILES[@]}"; do
  if [ ! -w "$ROOT/$file" ]; then
    echo "ERROR: not writable: $file" >&2
    stat -c '%U:%G %a %n' "$ROOT/$file" >&2 || true
    echo "Nothing was deployed." >&2
    exit 1
  fi
done
echo "OK all four V60 targets are writable"

CTRL="$STAGE/app/admin/controllers/PmdQuickPosV1.php"
VIEW="$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
CSS="$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
JS="$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"

echo
echo "===== V56 PAYMENT AUTHORITY CONTRACT ====="
grep -Fq "PMD_QPOS_RAW_PAYMENT_AUTHORITY_V56" "$CTRL"
grep -Fq 'use Admin\Classes\PermissionManager;' "$CTRL"
grep -Fq 'getPermissions()' "$CTRL"
grep -Fq 'PermissionManager::instance()' "$CTRL"

V56_BLOCK="$(sed -n '/PMD_QPOS_RAW_PAYMENT_AUTHORITY_V56/,/return false;/p' "$CTRL")"
if printf '%s\n' "$V56_BLOCK" | grep -Fq -- '->hasPermission('; then
  echo "ERROR: route-aware hasPermission() remains inside V56 payment authority." >&2
  exit 1
fi
echo "OK V56 raw payment authority is staged correctly"

echo
echo "===== V59 BLADE-SAFE TABLE CONTRACT ====="
grep -Fq "PMD_QPOS_TABLE_SERVER_MARKUP_SAFE_V59" "$VIEW"
grep -Fq "PMD_QPOS_PUSH_NOTIFICATIONS_V57" "$VIEW"
grep -Fq "PMD_QPOS_TABLE_ATTENTION_V57" "$CSS"
grep -Fq "PMD_QPOS_TABLE_ATTENTION_V57" "$JS"
grep -Fq "PMD_QPOS_PAYMENT_ICON_RULE_V57" "$JS"
grep -Fq "PMD_QPOS_GUIDE_AUTO_CLOSE_V57" "$JS"

if grep -Fq '<span><b>€</b> Due</span>' "$VIEW"; then
  echo "ERROR: Due icon is still present in Guide." >&2
  exit 1
fi

if grep -Fq "signals.push({kind: 'due'" "$JS"; then
  echo "ERROR: Due icon is still present in dynamic renderer." >&2
  exit 1
fi

if grep -Fq "'<small>' + esc(tableStatusLabel(table.status))" "$JS"; then
  echo "ERROR: Busy/Free table text renderer is still present." >&2
  exit 1
fi

grep -Fq "pmd-quick-pos-v1.css?v=20260922-59" "$VIEW"
grep -Fq "pmd-quick-pos-v1.js?v=20260922-59" "$VIEW"
grep -Fq "push-notifications.js?v=20260922-qpos-v59" "$VIEW"
echo "OK Blade-safe attention/payment UI contract staged"

echo
echo "===== PRESERVE CURRENT MAIN / QUICK POS STACK ====="
grep -Fq "PMD_QPOS_ANDROID_LANDSCAPE_VIEWPORT_V47" "$CSS"
grep -Fq "PMD_QPOS_ANDROID_TOUCH_RAIL_FIT_V49" "$CSS"
grep -Fq "PMD_QPOS_POST_MOVE_SELECTION_FIX_V45" "$JS"
grep -Fq "PMD_QPOS_LAYOUT_PAY_TYPE_V49" "$CSS"
grep -Fq "PMD_QPOS_PAY_BACKEND_AUTHORITY_V50" "$JS"
grep -Fq "PMD_QPOS_HISTORY_TABLE_RAIL_RIGHT_V51" "$CSS"
grep -Fq "PMD_QPOS_PAYMENT_INSTANT_OPEN_V52" "$JS"
grep -Fq "PMD_QPOS_RESERVATION_BUSY_INLINE_OVERRIDE_V54" "$VIEW"
grep -Fq "PMD_QPOS_PAYMENT_AUTHORITY_V50" "$CTRL"
grep -Fq "PMD_QPOS_RESERVATION_BUSY_V53" "$CTRL"
echo "OK current main + V45-V55 behavior preserved"

echo
echo "===== PHP / JS SYNTAX CHECK ====="
php -l "$CTRL"

if command -v node >/dev/null 2>&1; then
  node --check "$JS"
else
  echo "WARN node not available; skipping node --check"
fi

echo
echo "===== BLADE COMPILE + PHP LINT GUARD ====="
COMPILED="$STAGE/pmd-quick-pos-v60-compiled.php"

php -r '
require $argv[1]."/vendor/autoload.php";
$filesystem = new Illuminate\Filesystem\Filesystem();
$compiler = new Illuminate\View\Compilers\BladeCompiler(
    $filesystem,
    sys_get_temp_dir()
);
file_put_contents(
    $argv[3],
    $compiler->compileString(file_get_contents($argv[2]))
);
' "$ROOT" "$VIEW" "$COMPILED"

php -l "$COMPILED"
echo "OK staged Quick POS Blade compiles to valid PHP before deployment"

echo
echo "===== BACKUP ====="
mkdir -p "$BACKUP"

for file in "${FILES[@]}"; do
  mkdir -p "$BACKUP/$(dirname "$file")"
  cp -a "$ROOT/$file" "$BACKUP/$file"
  echo "BACKED UP $file"
done

echo
echo "===== DEPLOY V60 ====="
for file in "${FILES[@]}"; do
  cp "$STAGE/$file" "$ROOT/$file"
  cmp -s "$STAGE/$file" "$ROOT/$file"
  echo "DEPLOYED + VERIFIED $file"
done

if [ -f "$ROOT/artisan" ] && command -v php >/dev/null 2>&1; then
  php "$ROOT/artisan" view:clear >/dev/null 2>&1 || true
fi

echo
echo "===== LIVE VERIFY ====="
grep -Fq "PMD_QPOS_RAW_PAYMENT_AUTHORITY_V56" "$ROOT/app/admin/controllers/PmdQuickPosV1.php"
grep -Fq "PMD_QPOS_TABLE_SERVER_MARKUP_SAFE_V59" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -Fq "PMD_QPOS_TABLE_ATTENTION_V57" "$ROOT/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -Fq "PMD_QPOS_TABLE_ATTENTION_V57" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -Fq "pmd-quick-pos-v1.js?v=20260922-59" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"

DONE=1

echo
echo "=============================================================="
echo " QUICK POS V60 DEPLOY COMPLETE"
echo " Local .git/objects was never written."
echo " Pinned GitHub payload was blob-verified before deployment."
echo " Blade was compiled and PHP-linted before any live copy."
echo " Busy/Free text is removed; table color remains status authority."
echo " Due has no icon; Part paid (½) and Paid (✓) remain."
echo " Call/Note attention + smooth rotation + clickable detail remain."
echo " Guide auto-close and canonical push notifications remain."
echo " V56 payment authority is included."
echo " No sudo was used."
echo " Backup: $BACKUP"
echo "=============================================================="
