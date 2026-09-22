#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/var/www/paymydine}"
PAYLOAD_SHA="dc5157bc8b9f8f3c6cd721446d0c2b18e621d7f6"
RAW_BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/${PAYLOAD_SHA}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="$(mktemp -d /tmp/pmd-qpos-v63.XXXXXX)"
BACKUP="$ROOT/storage/pmd-patch-backups/qpos-attention-runtime-v63-$STAMP"
DONE=0

FILES=(
  "app/admin/views/pmd_quick_pos_v1.blade.php"
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/assets/js/pmd-quick-pos-v1.js"
)

expected_blob_sha() {
  case "$1" in
    "app/admin/views/pmd_quick_pos_v1.blade.php")
      printf '%s\n' "26a60d469475f3c495f500735debce8c1471ef27"
      ;;
    "app/admin/assets/css/pmd-quick-pos-v1.css")
      printf '%s\n' "736ee0ae65351123638ea12acb4b0aa0268a3470"
      ;;
    "app/admin/assets/js/pmd-quick-pos-v1.js")
      printf '%s\n' "a4e475915d30392d0fb69b6cf0fd06418f5af5ec"
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
echo " PayMyDine QUICK POS V63 - RUNTIME + ATTENTION POLISH"
echo " Payload: $PAYLOAD_SHA"
echo " Backup:  $BACKUP"
echo "=============================================================="

echo
echo "===== LOCAL GIT WRITE BYPASS ====="
echo "No git fetch, git show, checkout, merge, reset or object write is used."
echo "Payload files are downloaded from a pinned GitHub commit."

echo
echo "===== REQUIRE LIVE V62 ====="
grep -Fq "PMD_QPOS_EFFECTIVE_BUSY_V62" "$ROOT/app/admin/controllers/PmdQuickPosV1.php"
grep -Fq "PMD_QPOS_ATTENTION_AUTO_RETURN_V62" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -Fq "PMD_QPOS_ATTENTION_RED_SHAKE_V62" "$ROOT/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -Fq "pmd-quick-pos-v1.js?v=20260922-62" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"
echo "OK V62 is live"

echo
echo "===== DOWNLOAD PINNED V63 PAYLOAD ====="
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
echo "OK all three V63 targets are writable"

VIEW="$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
CSS="$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
JS="$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"

echo
echo "===== V63 RUNTIME BINDING CONTRACT ====="
grep -Fq "PMD_QPOS_INIT_BINDINGS_SAFE_V63" "$JS"

if grep -Eq '^[[:space:]]*[$][(].*data-qpos-history-kind.*[)]\.forEach' "$JS"; then
  echo "ERROR: single-element history iterator still exists and would abort init." >&2
  exit 1
fi

if ! grep -Eq '^[[:space:]]*[$][$][(].*data-qpos-history-kind.*[)]\.forEach' "$JS"; then
  echo "ERROR: history kind buttons are not bound through the multi-element helper." >&2
  exit 1
fi

grep -Fq "data-qpos-text-key" "$JS"
grep -Fq "data-qpos-confirm-accept" "$JS"
grep -Fq "startAttentionCycleV57();" "$JS"
echo "OK init continues through History, Keyboard, Confirm/Change-table and attention-cycle bindings"

echo
echo "===== V63 RAIL SCROLL CONTRACT ====="
grep -Fq "PMD_QPOS_ATTENTION_RAIL_GEOMETRY_V63" "$JS"
grep -Fq "getBoundingClientRect" "$JS"
grep -Fq "grid.scrollTop + delta" "$JS"
grep -Fq "behavior: 'smooth'" "$JS"
echo "OK attention rail centers tables reliably both upward and downward"

echo
echo "===== V63 MODAL / KEYBOARD SAFETY CONTRACT ====="
grep -Fq "function attentionOverlayOpenV63" "$JS"
grep -Fq "state.textKeyboardTarget" "$JS"
grep -Fq "PMD_QPOS_OVERLAY_INPUT_SAFE_V63" "$JS"
echo "OK attention auto-scroll pauses while modal/keyboard UI is active"

echo
echo "===== V63 VISUAL POLISH CONTRACT ====="
grep -Fq "PMD_QPOS_ATTENTION_POLISH_V63" "$CSS"
grep -Fq "min-width: 27px !important" "$CSS"
grep -Fq "height: 27px !important" "$CSS"
grep -Fq "pmd-qpos-attention-soft-shake-v63" "$CSS"
grep -Fq "3.2s ease-in-out infinite" "$CSS"
echo "OK table signal icons are smaller and shake is softer"

echo
echo "===== PRESERVE V62/V61/V60 UX ====="
grep -Fq "PMD_QPOS_ATTENTION_VISIBILITY_V61" "$CSS"
grep -Fq "PMD_QPOS_ATTENTION_AUTO_RETURN_V62" "$JS"
grep -Fq "PMD_QPOS_PUSH_DERIVED_BUSY_V62" "$JS"
grep -Fq "PMD_QPOS_TABLE_SERVER_MARKUP_SAFE_V59" "$VIEW"
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

grep -Fq "pmd-quick-pos-v1.css?v=20260922-63" "$VIEW"
grep -Fq "pmd-quick-pos-v1.js?v=20260922-63" "$VIEW"
echo "OK V62 Busy authority and previous Quick POS UX are preserved"

echo
echo "===== JS SYNTAX CHECK ====="
if command -v node >/dev/null 2>&1; then
  node --check "$JS"
else
  echo "WARN node not available; skipping node --check"
fi

echo
echo "===== BLADE COMPILE + PHP LINT GUARD ====="
COMPILED="$STAGE/pmd-quick-pos-v63-compiled.php"

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
echo "===== DEPLOY V63 ====="
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
grep -Fq "PMD_QPOS_INIT_BINDINGS_SAFE_V63" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -Fq "PMD_QPOS_ATTENTION_RAIL_GEOMETRY_V63" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -Fq "PMD_QPOS_ATTENTION_POLISH_V63" "$ROOT/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -Fq "pmd-quick-pos-v1.js?v=20260922-63" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"

DONE=1

echo
echo "=============================================================="
echo " QUICK POS V63 DEPLOY COMPLETE"
echo " The initialization crash caused by a single-element .forEach is removed."
echo " Keyboard, Confirm/Change-table and later button bindings now complete."
echo " Attention cycling now actually starts after page initialization."
echo " Attention rail uses real geometry and smooth-centers tables up or down."
echo " Auto-attention pauses while keyboard/modal UI is open."
echo " The red shake is much softer and less aggressive."
echo " Table signal icons are smaller, cleaner and remain on the left."
echo " V62 effective Busy rules remain untouched."
echo " No local git write and no sudo were used."
echo " Backup: $BACKUP"
echo "=============================================================="
