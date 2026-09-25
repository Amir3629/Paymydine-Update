#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_COMMIT="a82a9cf30c749b447ba67eb786b9b9051e8db449"

FILES=(
  "app/admin/assets/js/pmd-quick-pos-v1.js"
  "app/admin/assets/js/pmd-qpos-web-parity-v112.js"
  "app/admin/controllers/concerns/PmdWaiterPosOrderPersistenceConcern.php"
  "app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php"
)

log(){ printf '\n[PayMyDine V118] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V118][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT"
command -v sudo >/dev/null 2>&1 || fail "sudo is required"
command -v php >/dev/null 2>&1 || fail "php CLI is required"
sudo -n true || fail "passwordless sudo is required"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching exact V118 source"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}"   || fail "V118 source commit unavailable"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v118-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v118-explicit-selected-order-append-before-${STAMP}.tar.gz"

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
PERSIST="$STAGE/app/admin/controllers/concerns/PmdWaiterPosOrderPersistenceConcern.php"
SAVE="$STAGE/app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php"

log "Validating V118 before touching live files"

grep -Fq "PMD_QPOS_EXPLICIT_ORDER_APPEND_V118" "$JS"   || fail "Frontend V118 marker missing"
grep -Fq "orderAcceptsExplicitAppendV118" "$JS"   || fail "Frontend exact-order append function missing"
grep -Fq "explicit_order_selection: snapshot.explicitOrderSelection" "$JS"   || fail "Frontend explicit-order payload flag missing"
grep -Fq "can_append_selected_items" "$JS"   || fail "Frontend selected-order authority missing"

grep -Fq "PMD_QPOS_EXPLICIT_ORDER_APPEND_V118" "$PERSIST"   || fail "Persistence V118 marker missing"
grep -Fq "pmdOrderAcceptsExplicitAppendV118" "$PERSIST"   || fail "Persistence exact-order authority missing"
grep -Fq "'can_append_selected_items' =>" "$PERSIST"   || fail "Table payload selected-order authority missing"

grep -Fq "PMD_QPOS_EXPLICIT_ORDER_APPEND_V118" "$SAVE"   || fail "Save V118 marker missing"
grep -Fq "\$payload['explicit_order_selection']" "$SAVE"   || fail "Save explicit-order flag missing"
grep -Fq "!\$explicitSelectedAppendV118" "$SAVE"   || fail "Received-only gate override missing"
grep -Fq "'can_append_selected_items' => \$this->pmdOrderAcceptsExplicitAppendV118(\$order)" "$SAVE"   || fail "Save response selected-order authority missing"

EXPLICIT_DECL_COUNT="$(grep -Fc '$explicitSelectedAppendV118 =' "$SAVE" || true)"
[[ "$EXPLICIT_DECL_COUNT" -eq 2 ]]   || fail "Unexpected V118 explicit selection declaration count: $EXPLICIT_DECL_COUNT (expected 2)"
[[ "$(grep -Fc "'can_append_selected_items' =>" "$SAVE")" -eq 2 ]]   || fail "Unexpected V118 response authority count"

grep -Fq "PMD_QPOS_IMMEDIATE_APPEND_AUTHORITY_V117" "$JS"   || fail "V117 immediate authority was lost"
grep -Fq "PMD_QPOS_APPEND_AUTHORITY_V116" "$JS"   || fail "V116 authority was lost"
grep -Fq "PMD_QPOS_MULTI_CHECK_PAY_RUNTIME_V114" "$JS"   || fail "V114 multi-check payment was lost"
grep -Fq "PMD_QPOS_PAY_BEFORE_KITCHEN_V108" "$JS"   || fail "V108 Pay-before-Kitchen was lost"

cmp -s "$JS" "$PARITY_JS"   || fail "Android/Web JS parity differs"

if command -v node >/dev/null 2>&1; then
  node --check "$JS" >/dev/null     || fail "Quick POS JavaScript syntax failed"
fi

php -l "$PERSIST" >/dev/null   || fail "Order persistence PHP syntax failed"
php -l "$SAVE" >/dev/null   || fail "Save endpoint PHP syntax failed"

EXISTING=()
for rel in "${FILES[@]}"; do
  [[ -f "$rel" ]] && EXISTING+=("$rel")
done

sudo tar -czf "$BACKUP" "${EXISTING[@]}"
sudo chmod 0640 "$BACKUP" || true

log "Installing validated V118 files"
for rel in "${FILES[@]}"; do
  src="$STAGE/$rel"
  dst="$PMD_ROOT/$rel"

  if [[ -f "$dst" ]]; then
    uid="$(stat -c '%u' "$dst")"
    gid="$(stat -c '%g' "$dst")"
    mode="$(stat -c '%a' "$dst")"
  else
    parent="$(dirname "$dst")"
    sudo mkdir -p "$parent"
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

grep -Fq "PMD_QPOS_EXPLICIT_ORDER_APPEND_V118"   app/admin/assets/js/pmd-quick-pos-v1.js
grep -Fq "PMD_QPOS_EXPLICIT_ORDER_APPEND_V118"   app/admin/controllers/concerns/PmdWaiterPosOrderPersistenceConcern.php
grep -Fq "PMD_QPOS_EXPLICIT_ORDER_APPEND_V118"   app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php

cat <<'EOF'

============================================================
 PAYMYDINE QUICK POS V118 EXACT SELECTED ORDER APPEND COMPLETE
============================================================

THE RULE NOW
  Cashier taps Order #241               = #241 is the exact target
  Add more food + Send to Kitchen       = items append to #241
  Kitchen moves to Preparation          = STILL #241
  Kitchen moves to Delivery/Completed   = STILL #241 while unpaid/open
  Payment started / bill settled        = structural append blocked
  Cancelled order                       = structural append blocked

IMPORTANT
  Kitchen phase no longer silently creates #242 from a selected #241.
  Automatic table reuse without an explicit #order selection remains
  Received-only, so a fresh workflow does not attach to an arbitrary bill.

PRESERVED
  V108 Pay-before-Kitchen
  V113 automatic Received reuse
  V114 multi-check settlement
  V116 selected-order bill preview
  V117 immediate POST authority
  Android/Web runtime parity

============================================================
EOF

printf 'Backup: %s\n' "$BACKUP"
