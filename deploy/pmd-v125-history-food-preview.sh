#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_COMMIT="8f2450b501e3a29bd0d2e1c60f3f3e1766ee808e"

FILES=(
  "app/admin/assets/js/pmd-quick-pos-v1.js"
  "app/admin/assets/js/pmd-qpos-web-parity-v112.js"
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/assets/css/pmd-qpos-web-parity-v112.css"
  "app/admin/views/pmd_quick_pos_v1.blade.php"
)

log(){ printf '\n[PayMyDine V125] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V125][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT"
command -v sudo >/dev/null 2>&1 || fail "sudo is required"
sudo -n true || fail "passwordless sudo is required"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching exact V125 source"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}"   || fail "V125 source commit unavailable"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v125-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v125-history-food-preview-before-${STAMP}.tar.gz"

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

log "Validating V125 before touching live files"

grep -Fq 'PMD_QPOS_HISTORY_FOOD_PREVIEW_V125' "$JS"   || fail "History food-preview runtime missing"
grep -Fq 'function historyFirstFoodPreviewV125(entry)' "$JS"   || fail "History first-food helper missing"
grep -Fq "summary.split(',')[0]" "$JS"   || fail "History first-food extraction missing"
grep -Fq 'pmd-qpos-history-food-preview-v125' "$JS"   || fail "History preview markup missing"

grep -Fq 'PMD_QPOS_HISTORY_FOOD_PREVIEW_V125' "$CSS"   || fail "History food-preview CSS missing"
grep -Fq '.pmd-qpos-history-food-preview-v125' "$CSS"   || fail "History food-preview selector missing"
grep -Fq 'text-overflow: ellipsis' "$CSS"   || fail "History food-preview overflow protection missing"

cmp -s "$JS" "$PARITY_JS"   || fail "Android/Web JS parity differs"
cmp -s "$CSS" "$PARITY_CSS"   || fail "Android/Web CSS parity differs"

grep -Fq 'pmd-qpos-web-parity-v112.css?v=20260925-v125' "$VIEW"   || fail "Android V125 CSS cache-bust missing"
grep -Fq 'pmd-quick-pos-v1.css?v=20260925-v125' "$VIEW"   || fail "Web V125 CSS cache-bust missing"
grep -Fq 'pmd-qpos-web-parity-v112.js?v=20260925-v125' "$VIEW"   || fail "Android V125 JS cache-bust missing"
grep -Fq 'pmd-quick-pos-v1.js?v=20260925-v125' "$VIEW"   || fail "Web V125 JS cache-bust missing"

grep -Fq 'PMD_QPOS_HISTORY_ITERATION_HOTFIX_V124' "$JS"   || fail "V124 History fix was lost"
grep -Fq 'PMD_QPOS_HISTORY_INLINE_V123' "$JS"   || fail "V123 inline History was lost"
grep -Fq 'PMD_QPOS_BATCH_MAIN_PAY_V122' "$JS"   || fail "V122 combined payment behavior was lost"

if command -v node >/dev/null 2>&1; then
  node --check "$JS" >/dev/null     || fail "Quick POS JavaScript syntax failed"
fi

EXISTING=()
for rel in "${FILES[@]}"; do
  [[ -f "$rel" ]] && EXISTING+=("$rel")
done

sudo tar -czf "$BACKUP" "${EXISTING[@]}"
sudo chmod 0640 "$BACKUP" || true

log "Installing validated V125 files"
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
 PAYMYDINE QUICK POS V125 COMPLETE
============================================================

HISTORY ORDER CARD
  Each Order card now shows:
    Order number
    Time
    ONE food item name as a quick preview
    Total + item count
    Paid / Unpaid state

  Example:
    #253
    Eggs Benedictayxcccxy
    €101.15 · 3 items
    Paid

  Only the first dish is shown on the compact card.
  Full item list remains inside the expandable History detail.

DATA
  Uses existing item_summary already returned by History.
  No extra backend query and no extra network request.

PRESERVED
  V124 History selector + portrait inline fixes
  V123 Reservations + Card wording + safe date picker
  V122 KDS append refresh + combined Pay
  V121 server-side Kitchen round authority
  Android/Web JS + CSS parity

============================================================
EOF

printf 'Backup: %s\n' "$BACKUP"
