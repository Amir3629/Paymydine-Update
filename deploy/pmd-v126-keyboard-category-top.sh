#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_COMMIT="7c25274c967447ca95bbfe5a25db50c577e078a0"

FILES=(
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/assets/css/pmd-qpos-web-parity-v112.css"
  "app/admin/views/pmd_quick_pos_v1.blade.php"
)

log(){ printf '\n[PayMyDine V126] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V126][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT"
command -v sudo >/dev/null 2>&1 || fail "sudo is required"
sudo -n true || fail "passwordless sudo is required"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching exact V126 source"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}"   || fail "V126 source commit unavailable"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v126-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v126-keyboard-category-top-before-${STAMP}.tar.gz"

rm -rf "$STAGE"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP_DIR"
trap 'rm -rf "$STAGE"' EXIT

for rel in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$rel")"
  "${GIT[@]}" show "${SOURCE_COMMIT}:$rel" > "$STAGE/$rel"
done

CSS="$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
PARITY_CSS="$STAGE/app/admin/assets/css/pmd-qpos-web-parity-v112.css"
VIEW="$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"

log "Validating V126 before touching live files"

grep -Fq 'PMD_QPOS_KEYBOARD_CATEGORY_POSITION_V126' "$CSS"   || fail "V126 marker missing"
grep -Fq '.pmd-qpos-text-keyboard-row:last-child' "$CSS"   || fail "Keyboard last-row grid fix missing"
grep -Fq 'minmax(0,2fr)' "$CSS"   || fail "Space proportional grid width missing"
grep -Fq '.pmd-qpos-text-keyboard-row:last-child > button.space' "$CSS"   || fail "Space min-width reset missing"
grep -Fq 'top: -10px !important' "$CSS"   || fail "Whole category bar top offset missing"
grep -Fq 'padding-top: 8px !important' "$CSS"   || fail "Category internal vertical balance missing"
grep -Fq 'z-index: 80 !important' "$CSS"   || fail "Category floating layer missing"

cmp -s "$CSS" "$PARITY_CSS"   || fail "Android/Web CSS parity differs"

grep -Fq 'pmd-qpos-web-parity-v112.css?v=20260925-v126' "$VIEW"   || fail "Android V126 CSS cache-bust missing"
grep -Fq 'pmd-quick-pos-v1.css?v=20260925-v126' "$VIEW"   || fail "Web V126 CSS cache-bust missing"
grep -Fq 'pmd-qpos-web-parity-v112.js?v=20260925-v126' "$VIEW"   || fail "Android V126 JS cache-bust missing"
grep -Fq 'pmd-quick-pos-v1.js?v=20260925-v126' "$VIEW"   || fail "Web V126 JS cache-bust missing"

grep -Fq 'PMD_QPOS_HISTORY_FOOD_PREVIEW_V125' "$CSS"   || fail "V125 History food preview was lost"
grep -Fq 'PMD_QPOS_HISTORY_PORTRAIT_SINGLE_PANE_V124' "$CSS"   || fail "V124 History portrait layout was lost"

EXISTING=()
for rel in "${FILES[@]}"; do
  [[ -f "$rel" ]] && EXISTING+=("$rel")
done

sudo tar -czf "$BACKUP" "${EXISTING[@]}"
sudo chmod 0640 "$BACKUP" || true

log "Installing validated V126 files"
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

cmp -s   app/admin/assets/css/pmd-quick-pos-v1.css   app/admin/assets/css/pmd-qpos-web-parity-v112.css   || fail "Live Android/Web CSS parity verification failed"

cat <<'EOF'

============================================================
 PAYMYDINE QUICK POS V126 COMPLETE
============================================================

TEXT KEYBOARD
  Bottom row now owns an explicit six-cell responsive grid.
  Space gets 2fr width but NO forced 260px minimum.
  Result:
    Space cannot slide underneath / overlap Clear.
    Clear keeps its own real grid cell.
    The row shrinks safely with the keyboard width.

MOBILE CATEGORY BAR
  V122 moved the category BUTTONS upward inside the old bar.
  V126 moves the WHOLE sticky bar upward through the 10px phone shell padding.

  Result:
    Category bar itself reaches the visual top while floating.
    Buttons keep balanced top/bottom padding inside that bar.
    Bar stays above scrolling food cards.

PRESERVED
  V125 History food-name preview
  V124 inline mobile History
  V123 Reservations + Card + safe date picker
  V122 KDS append refresh + combined Pay
  V121 server Kitchen round authority
  Android/Web CSS parity

============================================================
EOF

printf 'Backup: %s\n' "$BACKUP"
