#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/var/www/paymydine}"
PAYLOAD_SHA="0dab47f2c9db87117923ecf360d4b7175f5ce90c"
RAW_BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/${PAYLOAD_SHA}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="$(mktemp -d /tmp/pmd-qpos-v61.XXXXXX)"
BACKUP="$ROOT/storage/pmd-patch-backups/qpos-attention-visibility-v61-$STAMP"
DONE=0

FILES=(
  "app/admin/views/pmd_quick_pos_v1.blade.php"
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/assets/js/pmd-quick-pos-v1.js"
)

expected_blob_sha() {
  case "$1" in
    "app/admin/views/pmd_quick_pos_v1.blade.php")
      printf '%s\n' "c660998ca14f09bb0f238136a5e8f7ea3b1528c1"
      ;;
    "app/admin/assets/css/pmd-quick-pos-v1.css")
      printf '%s\n' "5d9649c68c80f40ba3fa3e6e1a2fb6249685c081"
      ;;
    "app/admin/assets/js/pmd-quick-pos-v1.js")
      printf '%s\n' "087ef86b80a0ffd00f3af0585cfa71f0cc039434"
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
echo " PayMyDine QUICK POS V61 - ATTENTION VISIBILITY"
echo " Payload: $PAYLOAD_SHA"
echo " Backup:  $BACKUP"
echo "=============================================================="

echo
echo "===== LOCAL GIT WRITE BYPASS ====="
echo "No git fetch, git show, checkout, merge, reset or object write is used."
echo "Payload files are downloaded from a pinned GitHub commit."

echo
echo "===== REQUIRE LIVE V60 ====="
grep -Fq "PMD_QPOS_RAW_PAYMENT_AUTHORITY_V56" "$ROOT/app/admin/controllers/PmdQuickPosV1.php"
grep -Fq "PMD_QPOS_TABLE_SERVER_MARKUP_SAFE_V59" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"
grep -Fq "PMD_QPOS_TABLE_ATTENTION_V57" "$ROOT/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -Fq "PMD_QPOS_TABLE_ATTENTION_V57" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -Fq "pmd-quick-pos-v1.js?v=20260922-59" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"
echo "OK V60 is live"

echo
echo "===== DOWNLOAD PINNED V61 PAYLOAD ====="
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
echo "OK all three V61 targets are writable"

VIEW="$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
CSS="$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
JS="$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"

echo
echo "===== V61 ICON LANE CONTRACT ====="
grep -Fq "PMD_QPOS_ATTENTION_VISIBILITY_V61" "$CSS"
grep -Fq "flex-direction: column !important" "$CSS"
grep -Fq "left: 9px !important" "$CSS"
grep -Fq "max-width: 58px !important" "$CSS"
echo "OK attention/payment badges are stacked in a dedicated left-side lane"

echo
echo "===== V61 STRONG ATTENTION CONTRACT ====="
grep -Fq "pmd-qpos-attention-pulse-v61" "$CSS"
grep -Fq ".82s ease-in-out infinite" "$CSS"
grep -Fq "PMD_QPOS_ATTENTION_RAIL_TARGET_V61" "$JS"
grep -Fq "grid.scrollTo" "$JS"
grep -Fq "PMD_QPOS_ATTENTION_ROTATION_V61" "$JS"
grep -Fq "4000" "$JS"
echo "OK pulse is stronger and the table rail targets off-screen attention tables every 4 seconds"

echo
echo "===== V61 ATTENTION DETAIL CONTRACT ====="
grep -Fq "PMD_QPOS_ATTENTION_DETAIL_CLICK_V61" "$JS"
DETAIL_BLOCK="$(sed -n '/PMD_QPOS_ATTENTION_DETAIL_CLICK_V61/,/if (state.historyData)/p' "$JS")"
if ! printf '%s\n' "$DETAIL_BLOCK" | grep -Eq '[$][$][(]'; then
  echo "ERROR: Notes/Calls history tab iterator is not using the multi-element helper." >&2
  exit 1
fi
grep -Fq "openTableAttentionV57" "$JS"
echo "OK ! opens Calls and N opens Notes for the selected attention table"

echo
echo "===== PRESERVE V60 UX ====="
grep -Fq "PMD_QPOS_TABLE_SERVER_MARKUP_SAFE_V59" "$VIEW"
grep -Fq "PMD_QPOS_PUSH_NOTIFICATIONS_V57" "$VIEW"
grep -Fq "PMD_QPOS_PAYMENT_ICON_RULE_V57" "$JS"
grep -Fq "PMD_QPOS_GUIDE_AUTO_CLOSE_V57" "$JS"
grep -Fq "PMD_QPOS_PAYMENT_INSTANT_OPEN_V52" "$JS"

if grep -Fq '<span><b>€</b> Due</span>' "$VIEW"; then
  echo "ERROR: Due icon returned." >&2
  exit 1
fi

if grep -Fq "signals.push({kind: 'due'" "$JS"; then
  echo "ERROR: Due icon returned in dynamic renderer." >&2
  exit 1
fi

if grep -Fq "'<small>' + esc(tableStatusLabel(table.status))" "$JS"; then
  echo "ERROR: Busy/Free text returned." >&2
  exit 1
fi

grep -Fq "pmd-quick-pos-v1.css?v=20260922-61" "$VIEW"
grep -Fq "pmd-quick-pos-v1.js?v=20260922-61" "$VIEW"
echo "OK V60 status/payment/guide behavior preserved"

echo
echo "===== JS SYNTAX CHECK ====="
if command -v node >/dev/null 2>&1; then
  node --check "$JS"
else
  echo "WARN node not available; skipping node --check"
fi

echo
echo "===== BLADE COMPILE + PHP LINT GUARD ====="
COMPILED="$STAGE/pmd-quick-pos-v61-compiled.php"

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
echo "OK staged Quick POS Blade compiles to valid PHP"

echo
echo "===== BACKUP ====="
mkdir -p "$BACKUP"
for file in "${FILES[@]}"; do
  mkdir -p "$BACKUP/$(dirname "$file")"
  cp -a "$ROOT/$file" "$BACKUP/$file"
  echo "BACKED UP $file"
done

echo
echo "===== DEPLOY V61 ====="
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
grep -Fq "PMD_QPOS_ATTENTION_VISIBILITY_V61" "$ROOT/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -Fq "PMD_QPOS_ATTENTION_RAIL_TARGET_V61" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -Fq "PMD_QPOS_ATTENTION_DETAIL_CLICK_V61" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -Fq "pmd-quick-pos-v1.js?v=20260922-61" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"

DONE=1

echo
echo "=============================================================="
echo " QUICK POS V61 DEPLOY COMPLETE"
echo " Attention/payment icons are vertically stacked on the LEFT of each table."
echo " Icons no longer cover the centered table number."
echo " Call/Note pulse is stronger and more visible."
echo " Every 4 seconds the right rail smoothly centers the next attention table."
echo " A new push call/note still scrolls to its table immediately."
echo " Clicking ! opens Calls & status for that table."
echo " Clicking N opens Notes for that table."
echo " Manual table-rail interaction pauses rotation briefly, then attention resumes."
echo " Due remains icon-free; Part paid and Paid remain."
echo " No local git write and no sudo were used."
echo " Backup: $BACKUP"
echo "=============================================================="
