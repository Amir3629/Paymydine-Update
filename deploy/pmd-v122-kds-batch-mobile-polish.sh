#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_COMMIT="0351317a5da444b3c6303c86e5eb3e180b4fd76b"

FILES=(
  "app/admin/assets/js/pmd-quick-pos-v1.js"
  "app/admin/assets/js/pmd-qpos-web-parity-v112.js"
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/assets/css/pmd-qpos-web-parity-v112.css"
  "app/admin/views/pmd_quick_pos_v1.blade.php"
  "app/admin/views/kitchendisplay/index.blade.php"
)

log(){ printf '\n[PayMyDine V122] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V122][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT"
command -v sudo >/dev/null 2>&1 || fail "sudo is required"
sudo -n true || fail "passwordless sudo is required"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching exact V122 source"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}"   || fail "V122 source commit unavailable"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v122-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v122-kds-batch-mobile-polish-before-${STAMP}.tar.gz"

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
KDS="$STAGE/app/admin/views/kitchendisplay/index.blade.php"

log "Validating V122 before touching live files"

grep -Fq "PMD_QPOS_BATCH_MAIN_PAY_V122" "$JS"   || fail "Combined Pay main-button marker missing"
grep -Fq "batchPayReadyV122" "$JS"   || fail "Combined Pay readiness logic missing"
grep -Fq "openBatchPaymentV114();" "$JS"   || fail "Main Pay does not route to batch payment"

grep -Fq "PMD_QPOS_MOBILE_CART_END_V122" "$JS"   || fail "Mobile cart end-scroll marker missing"
grep -Fq "block: 'end'" "$JS"   || fail "Mobile cart does not scroll to check end"

cmp -s "$JS" "$PARITY_JS"   || fail "Android/Web JS parity differs"

grep -Fq "PMD_QPOS_MOBILE_LAYER_TOP_V122" "$CSS"   || fail "V122 mobile stacking/category marker missing"
grep -Fq "z-index: 45 !important" "$CSS"   || fail "Check card mobile stacking layer missing"
grep -Fq "z-index: 40 !important" "$CSS"   || fail "Mobile total behind-check layer missing"
grep -Fq "padding-top: 0 !important" "$CSS"   || fail "Sticky category top-gap removal missing"

cmp -s "$CSS" "$PARITY_CSS"   || fail "Android/Web CSS parity differs"

grep -Fq "PMD_KDS_RECEIVED_APPEND_REFRESH_V122" "$KDS"   || fail "KDS same-order append refresh marker missing"
grep -Fq "!card.dataset.renderSignatureV1" "$KDS"   || fail "KDS first-refresh DOM reconciliation missing"
grep -Fq "cache: 'no-store'" "$KDS"   || fail "KDS no-store refresh missing"
grep -Fq "formData.append('_v122', String(Date.now()))" "$KDS"   || fail "KDS refresh nonce missing"

grep -Fq "pmd-qpos-web-parity-v112.css?v=20260925-v122" "$VIEW"   || fail "Android V122 CSS cache-bust missing"
grep -Fq "pmd-quick-pos-v1.css?v=20260925-v122" "$VIEW"   || fail "Web V122 CSS cache-bust missing"
grep -Fq "pmd-qpos-web-parity-v112.js?v=20260925-v122" "$VIEW"   || fail "Android V122 JS cache-bust missing"
grep -Fq "pmd-quick-pos-v1.js?v=20260925-v122" "$VIEW"   || fail "Web V122 JS cache-bust missing"

grep -Fq "PMD_QPOS_SERVER_ROUND_AUTHORITY_V121" "$JS"   || fail "V121 server round authority was lost"
grep -Fq "PMD_QPOS_MOBILE_FLOATING_KEYPAD_V121" "$CSS"   || fail "V121 floating payment keypad was lost"
grep -Fq "PMD_QPOS_KITCHEN_ROUND_SPLIT_V119" "$JS"   || fail "V119 Kitchen round split was lost"
grep -Fq "PMD_QPOS_MOBILE_PAYMENT_STACK_V120" "$CSS"   || fail "V120 mobile payment layout was lost"

if command -v node >/dev/null 2>&1; then
  node --check "$JS" >/dev/null     || fail "Quick POS JavaScript syntax failed"
fi

EXISTING=()
for rel in "${FILES[@]}"; do
  [[ -f "$rel" ]] && EXISTING+=("$rel")
done

sudo tar -czf "$BACKUP" "${EXISTING[@]}"
sudo chmod 0640 "$BACKUP" || true

log "Installing validated V122 files"
for rel in "${FILES[@]}"; do
  src="$STAGE/$rel"
  dst="$PMD_ROOT/$rel"

  if [[ -f "$dst" ]]; then
    uid="$(stat -c '%u' "$dst")"
    gid="$(stat -c '%g' "$dst")"
    mode="$(stat -c '%a' "$dst")"
  else
    parent_dir="$(dirname "$dst")"
    sudo mkdir -p "$parent_dir"
    uid="$(stat -c '%u' "$PMD_ROOT/app/admin/controllers/PmdQuickPosV1.php")"
    gid="$(stat -c '%g' "$PMD_ROOT/app/admin/controllers/PmdQuickPosV1.php")"
    mode="644"
  fi

  sudo install -m "$mode" -o "$uid" -g "$gid" "$src" "$dst"
  echo "UPDATED: $rel"
done

sudo -u www-data php artisan view:clear >/dev/null 2>&1   || php artisan view:clear >/dev/null 2>&1   || true
sudo -u www-data php artisan cache:clear >/dev/null 2>&1   || php artisan cache:clear >/dev/null 2>&1   || true

cmp -s   app/admin/assets/js/pmd-quick-pos-v1.js   app/admin/assets/js/pmd-qpos-web-parity-v112.js   || fail "Live Android/Web JS parity verification failed"

cmp -s   app/admin/assets/css/pmd-quick-pos-v1.css   app/admin/assets/css/pmd-qpos-web-parity-v112.css   || fail "Live Android/Web CSS parity verification failed"

cat <<'EOF'

============================================================
 PAYMYDINE QUICK POS V122 COMPLETE
============================================================

KDS / RECEIVED APPEND
  Same order still Received
    + POS appends more items
    = KDS refresh repaints the existing ticket with the new items

  First KDS refresh
    = real DOM reconciliation
    = no stale server-rendered ticket signature trap

MULTI-ORDER PAYMENT
  Select mode
    + choose 2 or more unpaid orders
    = main green Pay button becomes active
    = one combined payment flow for all selected orders

MOBILE CART
  Tap floating total
    = scrolls to the real end of the page / Check card

  At Checkout
    = Check card is above the floating total rail
    = floating total naturally passes behind the Check card

MOBILE CATEGORIES
  Sticky category bar
    = top: 0
    = no artificial top padding/gap while floating

PRESERVED
  V121 server-side Kitchen round authority
  V121 floating payment keypad
  V120 clean mobile payment layout
  V119 new Kitchen round after Preparation
  V114 multi-check settlement backend
  Android/Web JS + CSS parity

============================================================
EOF

printf 'Backup: %s\n' "$BACKUP"
