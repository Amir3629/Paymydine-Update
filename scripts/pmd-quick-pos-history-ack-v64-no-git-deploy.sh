#!/usr/bin/env bash
set -euo pipefail

ROOT="${ROOT:-/var/www/paymydine}"
PAYLOAD_SHA="97556722e9afdc34300bb4c3c37a31c0f9425c37"
RAW_BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/${PAYLOAD_SHA}"
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="$(mktemp -d /tmp/pmd-qpos-v64.XXXXXX)"
BACKUP="$ROOT/storage/pmd-patch-backups/qpos-history-ack-v64-$STAMP"
DONE=0

FILES=(
  "app/admin/controllers/PmdQuickPosV1.php"
  "routes/admin-quick-mode.php"
  "app/admin/views/pmd_quick_pos_v1.blade.php"
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/assets/js/pmd-quick-pos-v1.js"
)

expected_blob_sha() {
  case "$1" in
    "app/admin/controllers/PmdQuickPosV1.php")
      printf '%s\n' "26ed19098beeb3d9a484297c00527f7069167932"
      ;;
    "routes/admin-quick-mode.php")
      printf '%s\n' "9c859545e93562c7e81e604cd18dc23477406f0a"
      ;;
    "app/admin/views/pmd_quick_pos_v1.blade.php")
      printf '%s\n' "cdef14d2f10434685ab8cca3f620cf6345cbcad1"
      ;;
    "app/admin/assets/css/pmd-quick-pos-v1.css")
      printf '%s\n' "d010eea04bfaa47ba69e038793dc554448dba8c9"
      ;;
    "app/admin/assets/js/pmd-quick-pos-v1.js")
      printf '%s\n' "e844e60c61b6cf439f387c9f6b84326ca313ae14"
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
    php "$ROOT/artisan" route:clear >/dev/null 2>&1 || true
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
echo " PayMyDine QUICK POS V64 - HISTORY ACK + SLOW ATTENTION SCROLL"
echo " Payload: $PAYLOAD_SHA"
echo " Backup:  $BACKUP"
echo "=============================================================="

echo
echo "===== LOCAL GIT WRITE BYPASS ====="
echo "No git fetch, git show, checkout, merge, reset or object write is used."
echo "Payload files are downloaded from a pinned GitHub commit."

echo
echo "===== REQUIRE LIVE V63 ====="
grep -Fq "PMD_QPOS_INIT_BINDINGS_SAFE_V63" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -Fq "PMD_QPOS_ATTENTION_RAIL_GEOMETRY_V63" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -Fq "PMD_QPOS_ATTENTION_POLISH_V63" "$ROOT/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -Fq "PMD_QPOS_EFFECTIVE_BUSY_V62" "$ROOT/app/admin/controllers/PmdQuickPosV1.php"
grep -Fq "pmd-quick-pos-v1.js?v=20260922-63" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"
echo "OK V63 is live"

echo
echo "===== DOWNLOAD PINNED V64 PAYLOAD ====="
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
echo "OK all five V64 targets are writable"

CTRL="$STAGE/app/admin/controllers/PmdQuickPosV1.php"
ROUTES="$STAGE/routes/admin-quick-mode.php"
VIEW="$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
CSS="$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
JS="$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"

echo
echo "===== V64 SHARED SEEN CONTRACT ====="
grep -Fq "PMD_QPOS_ATTENTION_SEEN_V64" "$CTRL"
grep -Fq "PMD_QPOS_HISTORY_NOTIFICATION_PAYLOAD_V64" "$CTRL"
grep -Fq "PMD_QPOS_ATTENTION_UNSEEN_ONLY_V64" "$CTRL"
grep -Fq "PMD_QPOS_ATTENTION_SEEN_ROUTE_V64" "$ROUTES"
grep -Fq "PMD_QPOS_HISTORY_SEEN_SYNC_V64" "$JS"
grep -Fq "data-qpos-history-seen" "$JS"
grep -Fq "/admin/notifications-api/count" "$JS"
echo "OK NEW Note/Call rows can be acknowledged globally and local bell count syncs"

echo
echo "===== V64 HISTORY CONTRACT ====="
if grep -Fq 'data-qpos-history-kind="all"' "$VIEW"; then
  echo "ERROR: All activity filter still exists." >&2
  exit 1
fi

if grep -Fq "historySection('Activity'" "$JS"; then
  echo "ERROR: Activity detail section still exists." >&2
  exit 1
fi

if grep -Fq 'is-muted">Activity' "$JS"; then
  echo "ERROR: Activity placeholder still exists." >&2
  exit 1
fi

grep -Fq "PMD_QPOS_HISTORY_ATTENTION_V64" "$CSS"
grep -Fq "pmd-qpos-history-new-pill" "$CSS"
grep -Fq "pmd-qpos-history-seen-action" "$CSS"
echo "OK Activity UI removed; History typography and NEW/Seen styling are staged"

echo
echo "===== V64 SLOW SCROLL CONTRACT ====="
grep -Fq "PMD_QPOS_ATTENTION_SLOW_SCROLL_V64" "$JS"
grep -Fq "var duration = 950" "$JS"
grep -Fq "easeInOutCubic" "$JS"
grep -Fq "attentionScrollFrame" "$JS"
echo "OK attention rail uses controlled 950ms smooth scrolling"

echo
echo "===== PRESERVE V63 / V62 / PAYMENT UX ====="
grep -Fq "PMD_QPOS_INIT_BINDINGS_SAFE_V63" "$JS"
grep -Fq "PMD_QPOS_ATTENTION_POLISH_V63" "$CSS"
grep -Fq "PMD_QPOS_EFFECTIVE_BUSY_V62" "$CTRL"
grep -Fq "PMD_QPOS_PAYMENT_INSTANT_OPEN_V52" "$JS"
grep -Fq "PMD_QPOS_PAYMENT_ICON_RULE_V57" "$JS"
grep -Fq "PMD_QPOS_GUIDE_AUTO_CLOSE_V57" "$JS"

if grep -Fq '<span><b>€</b> Due</span>' "$VIEW"; then
  echo "ERROR: Due icon returned." >&2
  exit 1
fi

if grep -Fq "signals.push({kind: 'due'" "$JS"; then
  echo "ERROR: Due icon returned in dynamic renderer." >&2
  exit 1
fi

grep -Fq "pmd-quick-pos-v1.css?v=20260922-64" "$VIEW"
grep -Fq "pmd-quick-pos-v1.js?v=20260922-64" "$VIEW"
echo "OK V63/V62 and previous Quick POS behavior preserved"

echo
echo "===== PHP / JS SYNTAX CHECK ====="
php -l "$CTRL"
php -l "$ROUTES"

if command -v node >/dev/null 2>&1; then
  node --check "$JS"
else
  echo "WARN node not available; skipping node --check"
fi

echo
echo "===== BLADE COMPILE + PHP LINT GUARD ====="
COMPILED="$STAGE/pmd-quick-pos-v64-compiled.php"

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
echo "===== DEPLOY V64 ====="
for file in "${FILES[@]}"; do
  cp "$STAGE/$file" "$ROOT/$file"
  cmp -s "$STAGE/$file" "$ROOT/$file"
  echo "DEPLOYED + VERIFIED $file"
done

if [ -f "$ROOT/artisan" ] && command -v php >/dev/null 2>&1; then
  php "$ROOT/artisan" view:clear >/dev/null 2>&1 || true
  php "$ROOT/artisan" route:clear >/dev/null 2>&1 || true
fi

echo
echo "===== LIVE VERIFY ====="
grep -Fq "PMD_QPOS_ATTENTION_SEEN_V64" "$ROOT/app/admin/controllers/PmdQuickPosV1.php"
grep -Fq "PMD_QPOS_ATTENTION_SEEN_ROUTE_V64" "$ROOT/routes/admin-quick-mode.php"
grep -Fq "PMD_QPOS_ATTENTION_SLOW_SCROLL_V64" "$ROOT/app/admin/assets/js/pmd-quick-pos-v1.js"
grep -Fq "PMD_QPOS_HISTORY_ATTENTION_V64" "$ROOT/app/admin/assets/css/pmd-quick-pos-v1.css"
grep -Fq "pmd-quick-pos-v1.js?v=20260922-64" "$ROOT/app/admin/views/pmd_quick_pos_v1.blade.php"

DONE=1

echo
echo "=============================================================="
echo " QUICK POS V64 DEPLOY COMPLETE"
echo " Attention rail scroll is slower and easier to follow."
echo " NEW Table Notes are blue-highlighted; NEW Waiter Calls are red-highlighted."
echo " NEW Note/Call rows have a Seen action."
echo " Seen updates the shared notifications row, so other staff stop seeing it as new."
echo " Seen also removes that Note/Call from the table attention count after refresh."
echo " Notification payload text is now shown when the message column is empty."
echo " All activity and the Activity detail section are removed from History."
echo " History typography is significantly larger."
echo " V63 runtime bindings and V62 Busy authority remain preserved."
echo " No local git write and no sudo were used."
echo " Backup: $BACKUP"
echo "=============================================================="
