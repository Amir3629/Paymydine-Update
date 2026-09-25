#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_COMMIT="2a5511adc54afa1058599d66b182ae8d73aaf97b"

FILES=(
  "app/admin/assets/js/pmd-quick-pos-v1.js"
  "app/admin/assets/js/pmd-qpos-web-parity-v112.js"
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/assets/css/pmd-qpos-web-parity-v112.css"
  "app/admin/assets/css/pmd-floor-scroll-chain-v127.css"
  "app/admin/views/pmd_quick_pos_v1.blade.php"
  "app/admin/views/orders/customer_invoice.blade.php"
  "app/admin/views/orders/combined_invoice_v127.blade.php"
  "app/admin/controllers/PmdQuickPosV1.php"
  "app/admin/controllers/concerns/PmdQuickPosBatchPaymentV114Concern.php"
  "routes/admin-quick-mode.php"
  "app/admin/controllers/Ownerboard.php"
  "app/admin/controllers/Dashboardlab.php"
  "app/admin/classes/PmdCleanWorkspaceControllerV1.php"
  "app/admin/views/reservations2/index.blade.php"
  "app/admin/views/floor/index.blade.php"
)

log(){ printf '\n[PayMyDine V127] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V127][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT"
command -v sudo >/dev/null 2>&1 || fail "sudo is required"
sudo -n true || fail "passwordless sudo is required"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching exact V127 source"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}"   || fail "V127 source commit unavailable"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v127-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v127-history-combined-scroll-before-${STAMP}.tar.gz"

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
FLOOR_SCROLL="$STAGE/app/admin/assets/css/pmd-floor-scroll-chain-v127.css"
VIEW="$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"
INVOICE="$STAGE/app/admin/views/orders/customer_invoice.blade.php"
COMBINED_INVOICE="$STAGE/app/admin/views/orders/combined_invoice_v127.blade.php"
CONTROLLER="$STAGE/app/admin/controllers/PmdQuickPosV1.php"
BATCH="$STAGE/app/admin/controllers/concerns/PmdQuickPosBatchPaymentV114Concern.php"
ROUTES="$STAGE/routes/admin-quick-mode.php"
OWNER="$STAGE/app/admin/controllers/Ownerboard.php"
DASH="$STAGE/app/admin/controllers/Dashboardlab.php"
CLEAN="$STAGE/app/admin/classes/PmdCleanWorkspaceControllerV1.php"
RESERVATIONS="$STAGE/app/admin/views/reservations2/index.blade.php"
FLOOR_VIEW="$STAGE/app/admin/views/floor/index.blade.php"

log "Validating V127 before touching live files"

cmp -s "$JS" "$PARITY_JS"   || fail "Android/Web JS parity differs"
cmp -s "$CSS" "$PARITY_CSS"   || fail "Android/Web CSS parity differs"

grep -Fq 'PMD_QPOS_HISTORY_COMBINED_V127' "$JS"   || fail "Combined History runtime missing"
grep -Fq 'historyCombinedItemsV127' "$JS"   || fail "Combined History item merger missing"
grep -Fq 'PMD_QPOS_MOBILE_CART_CHECKOUT_HIDE_V127' "$JS"   || fail "Mobile checkout rail authority missing"
grep -Fq 'is-mobile-checkout-reached-v127' "$JS"   || fail "Mobile checkout visibility state missing"

grep -Fq 'PMD_QPOS_MOBILE_HISTORY_SCROLL_V127' "$CSS"   || fail "V127 mobile History/scroll CSS missing"
grep -Fq 'overflow-y: visible !important' "$CSS"   || fail "Portrait table scroll handoff missing"
grep -Fq 'touch-action: pan-y !important' "$CSS"   || fail "Portrait touch scroll authority missing"

grep -Fq 'PMD_QPOS_HISTORY_COMBINED_DATA_V127' "$CONTROLLER"   || fail "Combined History backend payload missing"
grep -Fq "'items' => \$historyItemsV127" "$CONTROLLER"   || fail "Full History item payload missing"
grep -Fq "'combined_order_ids' => \$combinedOrderIdsV127" "$CONTROLLER"   || fail "Combined order ID payload missing"
grep -Fq "'order_entries' => \$historyOrderEntriesV127" "$CONTROLLER"   || fail "Full History order lookup missing"
grep -Fq "'version' => 'pmd-qpos-history-v127'" "$CONTROLLER"   || fail "History V127 response version missing"

grep -Fq 'PMD_QPOS_COMBINED_INVOICE_V127' "$BATCH"   || fail "Combined invoice backend missing"
grep -Fq 'public function batchInvoiceV127()' "$BATCH"   || fail "Combined invoice endpoint method missing"
grep -Fq 'PMD_QPOS_COMBINED_INVOICE_ROUTE_V127' "$ROUTES"   || fail "Combined invoice route marker missing"
grep -Fq "'batchInvoiceV127'" "$ROUTES"   || fail "Combined invoice route action missing"

grep -Fq 'PMD_QPOS_COMBINED_INVOICE_VIEW_V127' "$COMBINED_INVOICE"   || fail "Combined invoice document missing"
grep -Fq 'pmdInvoiceBackV127' "$COMBINED_INVOICE"   || fail "Combined invoice Back button missing"
grep -Fq 'PMD_INVOICE_BACK_V127' "$INVOICE"   || fail "Canonical invoice Back button missing"
grep -Fq 'pmdInvoiceBackV127' "$INVOICE"   || fail "Canonical invoice Back behavior missing"

grep -Fq 'PMD_FLOOR_SCROLL_CHAIN_V127' "$FLOOR_SCROLL"   || fail "Shared Floor scroll-chain CSS missing"
grep -Fq 'overscroll-behavior-y: auto !important' "$FLOOR_SCROLL"   || fail "Shared Floor vertical scroll chaining missing"
grep -Fq 'touch-action: pan-x pan-y !important' "$FLOOR_SCROLL"   || fail "Shared Floor touch pan authority missing"

for file in "$OWNER" "$DASH" "$CLEAN" "$RESERVATIONS" "$FLOOR_VIEW" "$VIEW"; do
  grep -Fq 'pmd-floor-scroll-chain-v127.css' "$file"     || fail "Floor scroll-chain asset missing from $file"
done

grep -Fq 'pmd-qpos-web-parity-v112.css?v=20260925-v127' "$VIEW"   || fail "Android V127 CSS cache-bust missing"
grep -Fq 'pmd-quick-pos-v1.css?v=20260925-v127' "$VIEW"   || fail "Web V127 CSS cache-bust missing"
grep -Fq 'pmd-qpos-web-parity-v112.js?v=20260925-v127' "$VIEW"   || fail "Android V127 JS cache-bust missing"
grep -Fq 'pmd-quick-pos-v1.js?v=20260925-v127' "$VIEW"   || fail "Web V127 JS cache-bust missing"

grep -Fq 'PMD_QPOS_KEYBOARD_CATEGORY_POSITION_V126' "$CSS"   || fail "V126 keyboard/category fix was lost"
grep -Fq 'PMD_QPOS_HISTORY_FOOD_PREVIEW_V125' "$CSS"   || fail "V125 History food preview was lost"
grep -Fq 'PMD_QPOS_HISTORY_ITERATION_HOTFIX_V124' "$JS"   || fail "V124 History selector fix was lost"
grep -Fq 'PMD_QPOS_BATCH_MAIN_PAY_V122' "$JS"   || fail "V122 combined Pay was lost"

if command -v node >/dev/null 2>&1; then
  node --check "$JS" >/dev/null     || fail "Quick POS JavaScript syntax failed"
fi

for php_file in "$CONTROLLER" "$BATCH" "$ROUTES" "$OWNER" "$DASH" "$CLEAN"; do
  php -l "$php_file" >/dev/null     || fail "PHP syntax failed: $php_file"
done

EXISTING=()
for rel in "${FILES[@]}"; do
  [[ -f "$rel" ]] && EXISTING+=("$rel")
done

if [[ "${#EXISTING[@]}" -gt 0 ]]; then
  sudo tar -czf "$BACKUP" "${EXISTING[@]}"
  sudo chmod 0640 "$BACKUP" || true
fi

log "Installing validated V127 files"
for rel in "${FILES[@]}"; do
  src="$STAGE/$rel"
  dst="$PMD_ROOT/$rel"
  parent_dir="$(dirname "$dst")"

  sudo mkdir -p "$parent_dir"

  if [[ -f "$dst" ]]; then
    uid="$(stat -c '%u' "$dst")"
    gid="$(stat -c '%g' "$dst")"
    mode="$(stat -c '%a' "$dst")"
  else
    uid="$(stat -c '%u' "$parent_dir")"
    gid="$(stat -c '%g' "$parent_dir")"
    mode="644"
  fi

  sudo install -m "$mode" -o "$uid" -g "$gid" "$src" "$dst"
  echo "UPDATED: $rel"
done

sudo -u www-data php artisan view:clear >/dev/null 2>&1   || php artisan view:clear >/dev/null 2>&1   || true
sudo -u www-data php artisan route:clear >/dev/null 2>&1   || php artisan route:clear >/dev/null 2>&1   || true
sudo -u www-data php artisan cache:clear >/dev/null 2>&1   || php artisan cache:clear >/dev/null 2>&1   || true

cmp -s   app/admin/assets/js/pmd-quick-pos-v1.js   app/admin/assets/js/pmd-qpos-web-parity-v112.js   || fail "Live Android/Web JS parity verification failed"

cmp -s   app/admin/assets/css/pmd-quick-pos-v1.css   app/admin/assets/css/pmd-qpos-web-parity-v112.css   || fail "Live Android/Web CSS parity verification failed"

cat <<'EOF'

============================================================
 PAYMYDINE QUICK POS V127 COMPLETE
============================================================

MOBILE FLOATING TOTAL
  While browsing food
    = floating total remains available

  Once the real Check card is reached
    = floating total hides completely
    = scrolling farther down cannot make it reappear underneath the Check
    = it returns only after scrolling back above Checkout

HISTORY / COMBINED PAYMENTS
  A V114 combined payment such as #204 + #251
    = expands as ONE combined bill context
    = shows ALL food rows from every linked order
    = totals the linked orders together
    = collapses the repeated technical payment rows
    = hides the internal "Quick POS combined payment: ..." debug-style note

  Single-order inline History
    = no duplicate #order / Paid / total header inside the outer card

COMBINED INVOICE
  History Invoice
    = opens a verified combined-payment document
    = includes every linked order and every item
    = cannot combine unrelated arbitrary order IDs

  Invoice pages
    = now have a visible Back button
    = mobile History returns to the previous screen naturally
    = Print remains available

TOUCH SCROLL HANDOFF
  Quick POS phone/tablet portrait table list
    = vertical page scroll is no longer trapped in an inner table scroller

  Owner / Manager / Reservations / shared Floor
    = map keeps touch panning
    = vertical gesture chains back to the page at map boundaries
    = touching a normal table no longer swallows page-scroll start
    = edit-mode table dragging remains protected

PRESERVED
  V126 keyboard Space + category top alignment
  V125 History food preview
  V124 inline History selector fix
  V123 Reservations + Card + safe date picker
  V122 KDS append refresh + combined Pay
  V121 Kitchen round authority
  Android/Web Quick POS JS + CSS parity

============================================================
EOF

if [[ -f "$BACKUP" ]]; then
  printf 'Backup: %s\n' "$BACKUP"
else
  printf 'Backup: no pre-existing files required backup\n'
fi
