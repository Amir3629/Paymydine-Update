#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/var/www/paymydine}"
PAYLOAD_SHA="23d79ace4d26f4701017b61fa344a3245cf80490"
RAW_BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/${PAYLOAD_SHA}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="$(mktemp -d /tmp/pmd-qpos-v62.XXXXXX)"
BACKUP="$ROOT/storage/pmd-patch-backups/qpos-attention-status-v62-$STAMP"
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
      printf '%s\n' "d7f38c63b292944f9842373e737185b77ee7cc71"
      ;;
    "app/admin/views/pmd_quick_pos_v1.blade.php")
      printf '%s\n' "137a1d8e630ab75fc97c00f9ab7e8ae4f3ec3500"
      ;;
    "app/admin/assets/css/pmd-quick-pos-v1.css")
      printf '%s\n' "62dfff00dcbff3f14ba1b8601dbf1da1b9786047"
      ;;
    "app/admin/assets/js/pmd-quick-pos-v1.js")
      printf '%s\n' "c6c486287c979dd8dfa9ec5d733d4ac62073f0f9"
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
echo " PayMyDine QUICK POS V62 - ATTENTION RETURN + BUSY AUTHORITY"
echo " Payload: $PAYLOAD_SHA"
echo " Backup:  $BACKUP"
echo "=============================================================="

echo
echo "===== LOCAL GIT WRITE BYPASS ====="
echo "No git fetch, git show, checkout, merge, reset or object write is used."
echo "Payload files are downloaded from a pinned GitHub commit."

echo
echo "===== REQUIRE LIVE V61 ====="
grep -Fq "PMD_QPOS_ATTENTION_VISIBILITY_V61" "$ROOT/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -Fq "PMD_QPOS_ATTENTION_RAIL_TARGET_V61" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -Fq "PMD_QPOS_ATTENTION_DETAIL_CLICK_V61" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -Fq "PMD_QPOS_RAW_PAYMENT_AUTHORITY_V56" "$ROOT/app/admin/controllers/PmdQuickPosV1.php"
grep -Fq "pmd-quick-pos-v1.js?v=20260922-61" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"
echo "OK V61 is live"

echo
echo "===== DOWNLOAD PINNED V62 PAYLOAD ====="
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
echo "OK all four V62 targets are writable"

CTRL="$STAGE/app/admin/controllers/PmdQuickPosV1.php"
VIEW="$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
CSS="$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
JS="$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"

echo
echo "===== V62 EFFECTIVE BUSY CONTRACT ====="
grep -Fq "PMD_QPOS_DERIVED_BUSY_V62" "$CTRL"
grep -Fq "PMD_QPOS_EFFECTIVE_BUSY_V62" "$CTRL"
grep -Fq "'has_active_order' => false" "$CTRL"
grep -Fq "'active_order'" "$CTRL"
grep -Fq "'waiter_call'" "$CTRL"
grep -Fq "'note'" "$CTRL"
grep -Fq "function effectiveTableStatusV62" "$JS"
grep -Fq "PMD_QPOS_PUSH_DERIVED_BUSY_V62" "$JS"
echo "OK Free tables derive Busy from active order, unresolved call or unresolved note"

echo
echo "===== V62 AUTO-RETURN CONTRACT ====="
grep -Fq "PMD_QPOS_ATTENTION_AUTO_RETURN_V62" "$JS"
grep -Fq "attentionResumeTimer" "$JS"
grep -Fq "PMD_QPOS_MANUAL_ACTIVITY_PAUSE_V62" "$JS"
grep -Fq "cycleAttentionTablesV57();" "$JS"
echo "OK manual interaction pauses briefly and attention re-centers deterministically after idle"

echo
echo "===== V62 RED SHAKE CONTRACT ====="
grep -Fq "PMD_QPOS_ATTENTION_RED_SHAKE_V62" "$CSS"
grep -Fq "pmd-qpos-attention-red-pulse-v62" "$CSS"
grep -Fq "pmd-qpos-attention-shake-v62" "$CSS"
grep -Fq "rgba(255, 61, 82" "$CSS"
echo "OK attention uses Busy-red pulse plus shake"

echo
echo "===== PRESERVE V61 / V60 UX ====="
grep -Fq "PMD_QPOS_ATTENTION_VISIBILITY_V61" "$CSS"
grep -Fq "PMD_QPOS_ATTENTION_RAIL_TARGET_V61" "$JS"
grep -Fq "PMD_QPOS_ATTENTION_DETAIL_CLICK_V61" "$JS"
grep -Fq "PMD_QPOS_TABLE_SERVER_MARKUP_SAFE_V59" "$VIEW"
grep -Fq "PMD_QPOS_PUSH_NOTIFICATIONS_V57" "$VIEW"
grep -Fq "PMD_QPOS_PAYMENT_ICON_RULE_V57" "$JS"
grep -Fq "PMD_QPOS_GUIDE_AUTO_CLOSE_V57" "$JS"
grep -Fq "PMD_QPOS_PAYMENT_INSTANT_OPEN_V52" "$JS"
grep -Fq "PMD_QPOS_RAW_PAYMENT_AUTHORITY_V56" "$CTRL"

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

grep -Fq "pmd-quick-pos-v1.css?v=20260922-62" "$VIEW"
grep -Fq "pmd-quick-pos-v1.js?v=20260922-62" "$VIEW"
echo "OK V61/V60 behavior preserved"

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
COMPILED="$STAGE/pmd-quick-pos-v62-compiled.php"

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
echo "===== DEPLOY V62 ====="
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
grep -Fq "PMD_QPOS_EFFECTIVE_BUSY_V62" "$ROOT/app/admin/controllers/PmdQuickPosV1.php"
grep -Fq "PMD_QPOS_ATTENTION_AUTO_RETURN_V62" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -Fq "PMD_QPOS_ATTENTION_RED_SHAKE_V62" "$ROOT/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -Fq "pmd-quick-pos-v1.js?v=20260922-62" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"

DONE=1

echo
echo "=============================================================="
echo " QUICK POS V62 DEPLOY COMPLETE"
echo " After manual scroll/touch/key activity, attention auto-return resumes after ~3 seconds."
echo " The rail then smoothly centers the next Call/Note table even if it is far off-screen."
echo " Attention pulse now uses Busy red instead of yellow."
echo " Attention tables also perform a short repeated shake."
echo " A Free table becomes effectively Busy when it has an active order, unresolved waiter call, or unresolved note."
echo " Reserved and Cleaning remain authoritative and are not overwritten."
echo " Push Call/Note updates turn a Free table Busy immediately in the POS."
echo " Clicking ! still opens Calls & status; clicking N still opens Notes."
echo " Due remains icon-free; Part paid and Paid remain."
echo " No local git write and no sudo were used."
echo " Backup: $BACKUP"
echo "=============================================================="
