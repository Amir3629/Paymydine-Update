#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_COMMIT="01ffc53b71dbec1d6e7582531460d8bbf7dcff56"

FILES=(
  "app/admin/assets/js/pmd-quick-pos-v1.js"
  "app/admin/assets/js/pmd-qpos-web-parity-v112.js"
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/assets/css/pmd-qpos-web-parity-v112.css"
  "app/admin/views/pmd_quick_pos_v1.blade.php"
)

log(){ printf '\n[PayMyDine V124] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V124][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT"
command -v sudo >/dev/null 2>&1 || fail "sudo is required"
sudo -n true || fail "passwordless sudo is required"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching exact V124 source"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}"   || fail "V124 source commit unavailable"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v124-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v124-history-forEach-portrait-before-${STAMP}.tar.gz"

rm -rf "$STAGE"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP_DIR"
trap 'rm -rf "$STAGE"' EXIT

for rel in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$rel")"
  "${GIT[@]}" show "${SOURCE_COMMIT}:$rel" > "$STAGE/$rel"
done

JS="$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
PARITY_JS="$STAGE/app/admin/assets/js/pmd-qpos-web-parity-v112.js"
CSS="$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
PARITY_CSS="$STAGE/app/admin/assets/css/pmd-qpos-web-parity-v112.css"
VIEW="$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"

log "Validating V124 before touching live files"

grep -Fq 'PMD_QPOS_HISTORY_ITERATION_HOTFIX_V124' "$JS"   || fail "V124 History iteration fix missing"
grep -Fq '$$('''[data-qpos-history-order]''', list).forEach' "$JS"   || fail "History order querySelectorAll fix missing"
grep -Fq '$$('''[data-qpos-history-preset]''').forEach' "$JS"   || fail "History preset querySelectorAll fix missing"
grep -Fq 'return isPhoneViewportV102() || isTabletPortraitV102();' "$JS"   || fail "Portrait History authority missing"

grep -Fq 'PMD_QPOS_HISTORY_PORTRAIT_SINGLE_PANE_V124' "$CSS"   || fail "V124 portrait History CSS missing"
grep -Fq 'grid-template-columns: repeat(4,minmax(0,1fr)) !important' "$CSS"   || fail "Full-width four-button date range missing"
grep -Fq 'html.pmd-qpos-android-pos-v105' "$CSS"   || fail "Android V105 portrait override missing"
grep -Fq 'html.pmd-qpos-android-pos-v107' "$CSS"   || fail "Android V107 portrait override missing"

cmp -s "$JS" "$PARITY_JS"   || fail "Android/Web JS parity differs"
cmp -s "$CSS" "$PARITY_CSS"   || fail "Android/Web CSS parity differs"

grep -Fq 'pmd-qpos-web-parity-v112.css?v=20260925-v124' "$VIEW"   || fail "Android V124 CSS cache-bust missing"
grep -Fq 'pmd-quick-pos-v1.css?v=20260925-v124' "$VIEW"   || fail "Web V124 CSS cache-bust missing"
grep -Fq 'pmd-qpos-web-parity-v112.js?v=20260925-v124' "$VIEW"   || fail "Android V124 JS cache-bust missing"
grep -Fq 'pmd-quick-pos-v1.js?v=20260925-v124' "$VIEW"   || fail "Web V124 JS cache-bust missing"

grep -Fq 'PMD_QPOS_HISTORY_INLINE_V123' "$JS"   || fail "V123 inline History behavior was lost"
grep -Fq 'PMD_QPOS_HISTORY_DATE_RANGE_V123' "$JS"   || fail "V123 safe date picker was lost"
grep -Fq 'PMD_QPOS_BATCH_MAIN_PAY_V122' "$JS"   || fail "V122 combined payment behavior was lost"
grep -Fq 'PMD_QPOS_SERVER_ROUND_AUTHORITY_V121' "$JS"   || fail "V121 server round authority was lost"

if command -v node >/dev/null 2>&1; then
  node --check "$JS" >/dev/null     || fail "Quick POS JavaScript syntax failed"

  node - "$JS" <<'NODE'
const fs = require('fs');
const file = process.argv[2];
const js = fs.readFileSync(file, 'utf8');
const bad = [...js.matchAll(/\$\([^;\n]*\)\.forEach\s*\(/g)]
  .filter((m) => m.index === 0 || js[m.index - 1] !== '$');
if (bad.length) {
  console.error('Found single-element $() followed by forEach:', bad.length);
  process.exit(1);
}
NODE
fi

EXISTING=()
for rel in "${FILES[@]}"; do
  [[ -f "$rel" ]] && EXISTING+=("$rel")
done

sudo tar -czf "$BACKUP" "${EXISTING[@]}"
sudo chmod 0640 "$BACKUP" || true

log "Installing validated V124 files"
for rel in "${FILES[@]}"; do
  src="$STAGE/$rel"
  dst="$PMD_ROOT/$rel"

  uid="$(stat -c '%u' "$dst")"
  gid="$(stat -c '%g' "$dst")"
  mode="$(stat -c '%a' "$dst")"

  sudo install -m "$mode" -o "$uid" -g "$gid" "$src" "$dst"
  echo "UPDATED: $rel"
done

sudo -u www-data php artisan view:clear >/dev/null 2>&1   || php artisan view:clear >/dev/null 2>&1   || true
sudo -u www-data php artisan cache:clear >/dev/null 2>&1   || php artisan cache:clear >/dev/null 2>&1   || true

cmp -s   app/admin/assets/js/pmd-quick-pos-v1.js   app/admin/assets/js/pmd-qpos-web-parity-v112.js   || fail "Live Android/Web JS parity verification failed"

cmp -s   app/admin/assets/css/pmd-quick-pos-v1.css   app/admin/assets/css/pmd-qpos-web-parity-v112.css   || fail "Live Android/Web CSS parity verification failed"

cat <<'EOF'

============================================================
 PAYMYDINE QUICK POS V124 COMPLETE
============================================================

HISTORY ERROR
  $() returns one DOM element.
  V123 incorrectly called .forEach() on it in four History paths.

  V124:
    = all four incorrect single-element iterations fixed
    = History orders render again
    = date preset clicks render again
    = From / To changes no longer trigger the same selector error

PORTRAIT HISTORY
  Phone + tablet/Android portrait
    = one full-width History column
    = Today / 7 days / 30 days / All time use full available width
    = Search stays in the History column
    = tapping an order expands its detail directly below that order
    = following order cards move down naturally
    = tapping the same order collapses the detail

PRESERVED
  V123 Reservations routing + Card wording + safe desktop calendar
  V122 KDS append refresh + combined multi-order Pay
  V121 server-side Kitchen round authority + floating keypad
  V120 mobile payment layout
  Android/Web JS + CSS parity

============================================================
EOF

printf 'Backup: %s\n' "$BACKUP"
