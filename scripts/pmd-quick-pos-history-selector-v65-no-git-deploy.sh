#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/var/www/paymydine}"
PAYLOAD_SHA="e98d06630b9b5cf109ff730815fb87a2fd45feee"
RAW_BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/${PAYLOAD_SHA}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="$(mktemp -d /tmp/pmd-qpos-v65.XXXXXX)"
BACKUP="$ROOT/storage/pmd-patch-backups/qpos-history-selector-v65-$STAMP"
DONE=0

FILES=(
  "app/admin/views/pmd_quick_pos_v1.blade.php"
  "app/admin/assets/js/pmd-quick-pos-v1.js"
)

expected_blob_sha() {
  case "$1" in
    "app/admin/views/pmd_quick_pos_v1.blade.php")
      printf '%s\n' "18a822454c5dde571d042bd67f14534cb97b4b9a"
      ;;
    "app/admin/assets/js/pmd-quick-pos-v1.js")
      printf '%s\n' "698e92d8475a1ac33a74963ba6dd326a214c5fe3"
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
echo " PayMyDine QUICK POS V65 - HISTORY SELECTOR SAFE HOTFIX"
echo " Payload: $PAYLOAD_SHA"
echo " Backup:  $BACKUP"
echo "=============================================================="

echo
echo "===== LOCAL GIT WRITE BYPASS ====="
echo "No git fetch, git show, checkout, merge, reset or object write is used."
echo "Only read-only git hash-object verification is used."

echo
echo "===== REQUIRE LIVE V64 ====="
grep -Fq "PMD_QPOS_HISTORY_SEEN_SYNC_V64" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -Fq "PMD_QPOS_ATTENTION_SLOW_SCROLL_V64" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -Fq "pmd-quick-pos-v1.js?v=20260922-64" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"
echo "OK V64 is live"

echo
echo "===== DOWNLOAD PINNED V65 PAYLOAD ====="
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
echo "OK both V65 targets are writable"

VIEW="$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
JS="$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"

echo
echo "===== V65 SELECTOR CONTRACT ====="
grep -Fq "$$('[data-qpos-history-seen]', list).forEach" "$JS"
grep -Fq "$$('[data-qpos-history-order]', list).forEach" "$JS"

if grep -Fq "$('[data-qpos-history-seen]', list).forEach" "$JS"; then
  echo "ERROR: broken single-element Seen selector is still present." >&2
  exit 1
fi

if grep -Fq "$('[data-qpos-history-order]', list).forEach" "$JS"; then
  echo "ERROR: broken single-element order selector is still present." >&2
  exit 1
fi

grep -Fq "PMD_QPOS_HISTORY_SEEN_SYNC_V64" "$JS"
grep -Fq "PMD_QPOS_INIT_BINDINGS_SAFE_V63" "$JS"
grep -Fq "pmd-quick-pos-v1.js?v=20260922-65" "$VIEW"
echo "OK History collections use the multi-element helper and V64 behavior remains intact"

echo
echo "===== JS SYNTAX CHECK ====="
if command -v node >/dev/null 2>&1; then
  node --check "$JS"
else
  echo "WARN node not available; skipping node --check"
fi

echo
echo "===== BLADE COMPILE + PHP LINT GUARD ====="
COMPILED="$STAGE/pmd-quick-pos-v65-compiled.php"

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
echo "===== DEPLOY V65 ====="
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
grep -Fq "$$('[data-qpos-history-seen]', list).forEach" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -Fq "$$('[data-qpos-history-order]', list).forEach" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -Fq "pmd-quick-pos-v1.js?v=20260922-65" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"

DONE=1

echo
echo "=============================================================="
echo " QUICK POS V65 DEPLOY COMPLETE"
echo " The V64 History crash is fixed."
echo " Seen controls now bind through the collection selector helper."
echo " Order-history rows use the same safe collection selector."
echo " V64 Seen, NEW styling, larger History fonts and slower attention scroll are preserved."
echo " JS asset cache is bumped to V65."
echo " No sudo and no local git object writes were used."
echo " Backup: $BACKUP"
echo "=============================================================="
