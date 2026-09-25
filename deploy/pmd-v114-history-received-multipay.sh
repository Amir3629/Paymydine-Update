#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_COMMIT="f01d834ead78eab53d8090b88b16cb3d07a23208"

FILES=(
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/assets/js/pmd-quick-pos-v1.js"
  "app/admin/assets/css/pmd-qpos-web-parity-v112.css"
  "app/admin/assets/js/pmd-qpos-web-parity-v112.js"
  "app/admin/views/pmd_quick_pos_v1.blade.php"
  "app/admin/controllers/concerns/PmdWaiterPosOrderPersistenceConcern.php"
  "app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php"
  "app/admin/controllers/concerns/PmdQuickPosBatchPaymentV114Concern.php"
  "app/admin/controllers/PmdQuickPosV1.php"
  "routes/admin-quick-mode.php"
)

log(){ printf '\n[PayMyDine V114] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V114][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT"
command -v sudo >/dev/null 2>&1 || fail "sudo is required"
command -v php >/dev/null 2>&1 || fail "php CLI is required"
sudo -n true || fail "passwordless sudo is required"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching exact V113/V114 Quick POS commit"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}"   || fail "V114 source commit unavailable"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v114-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v114-history-received-multipay-before-${STAMP}.tar.gz"

rm -rf "$STAGE"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP_DIR"
trap 'rm -rf "$STAGE"' EXIT

for rel in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$rel")"
  "${GIT[@]}" show "${SOURCE_COMMIT}:$rel" > "$STAGE/$rel"
done

CSS="$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
JS="$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
PARITY_CSS="$STAGE/app/admin/assets/css/pmd-qpos-web-parity-v112.css"
PARITY_JS="$STAGE/app/admin/assets/js/pmd-qpos-web-parity-v112.js"
PERSIST="$STAGE/app/admin/controllers/concerns/PmdWaiterPosOrderPersistenceConcern.php"
SAVE="$STAGE/app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php"
BATCH="$STAGE/app/admin/controllers/concerns/PmdQuickPosBatchPaymentV114Concern.php"
CONTROLLER="$STAGE/app/admin/controllers/PmdQuickPosV1.php"
ROUTES="$STAGE/routes/admin-quick-mode.php"
VIEW="$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"

log "Validating contracts before touching live files"
grep -Fq "PMD_QPOS_MOBILE_HISTORY_SCROLL_V113" "$CSS"   || fail "Mobile History scroll fix missing"
grep -Fq "PMD_QPOS_RECEIVED_REUSE_V113" "$JS"   || fail "Received-only frontend reuse missing"
grep -Fq "PMD_QPOS_RECEIVED_APPEND_GATE_V113" "$PERSIST"   || fail "Received-only backend gate missing"
grep -Fq "PMD_QPOS_RECEIVED_APPEND_SAVE_V113" "$SAVE"   || fail "Received-only save wiring missing"
grep -Fq "PMD_QPOS_MULTI_CHECK_PAY_V114" "$CSS"   || fail "Multi-pay CSS missing"
grep -Fq "PMD_QPOS_MULTI_CHECK_PAY_RUNTIME_V114" "$JS"   || fail "Multi-pay runtime missing"
grep -Fq "PMD_QPOS_MULTI_CHECK_PAY_BACKEND_V114" "$BATCH"   || fail "Multi-pay backend missing"
grep -Fq "PMD_QPOS_BATCH_EXTERNAL_TERMINAL_V114" "$VIEW"   || fail "External-terminal combined payment fields missing"
grep -Fq "PMD_QPOS_MULTI_CHECK_PAY_ROUTES_V114" "$ROUTES"   || fail "Multi-pay routes missing"
grep -Fq "PMD_QPOS_PAY_BEFORE_KITCHEN_V108" "$JS"   || fail "V108 Pay-before-Kitchen was lost"

cmp -s "$CSS" "$PARITY_CSS"   || fail "Android parity CSS is no longer identical to Web CSS"
cmp -s "$JS" "$PARITY_JS"   || fail "Android parity JS is no longer identical to Web JS"

if command -v node >/dev/null 2>&1; then
  node --check "$JS" >/dev/null     || fail "Quick POS JavaScript syntax failed"
fi

for file in "$PERSIST" "$SAVE" "$BATCH" "$CONTROLLER" "$ROUTES"; do
  php -l "$file" >/dev/null     || fail "PHP syntax failed: $file"
done

EXISTING=()
for rel in "${FILES[@]}"; do
  [[ -f "$rel" ]] && EXISTING+=("$rel")
done

sudo tar -czf "$BACKUP" "${EXISTING[@]}"
sudo chmod 0640 "$BACKUP" || true

log "Installing validated V113/V114 files"
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
sudo -u www-data php artisan route:clear >/dev/null 2>&1   || php artisan route:clear >/dev/null 2>&1   || true
sudo -u www-data php artisan cache:clear >/dev/null 2>&1   || php artisan cache:clear >/dev/null 2>&1   || true

cmp -s   app/admin/assets/css/pmd-quick-pos-v1.css   app/admin/assets/css/pmd-qpos-web-parity-v112.css   || fail "Live CSS parity verification failed"
cmp -s   app/admin/assets/js/pmd-quick-pos-v1.js   app/admin/assets/js/pmd-qpos-web-parity-v112.js   || fail "Live JS parity verification failed"

grep -Fq "PMD_QPOS_MOBILE_HISTORY_SCROLL_V113"   app/admin/assets/css/pmd-quick-pos-v1.css
grep -Fq "PMD_QPOS_RECEIVED_APPEND_GATE_V113"   app/admin/controllers/concerns/PmdWaiterPosOrderPersistenceConcern.php
grep -Fq "PMD_QPOS_MULTI_CHECK_PAY_BACKEND_V114"   app/admin/controllers/concerns/PmdQuickPosBatchPaymentV114Concern.php

cat <<'EOF'

============================================================
 PAYMYDINE QUICK POS V113 + V114 COMPLETE
============================================================

MOBILE WEB HISTORY
  Vertical scrolling     = FIXED
  History list/detail    = TOUCH-SCROLLABLE
  Existing mobile layout = PRESERVED

TABLE ORDER LIFECYCLE
  Received               = APPEND TO SAME ORDER
  Accepted / Confirmed   = APPEND TO SAME ORDER (legacy aliases)
  Preparation/Processing = NEW ORDER
  Later kitchen states   = NEW ORDER
  Payment started        = NEVER STRUCTURALLY APPEND

MULTI-CHECK PAYMENT
  Check rail             = SELECT MODE ADDED
  Minimum selection      = 2 unpaid checks
  Cash                   = ATOMIC COMBINED PAYMENT
  External terminal      = ATOMIC after manual approval confirmation
  Integrated terminal    = SINGLE ORDER ONLY (provider schema safety)
  Split/tip in batch     = DISABLED
  Fiscalization          = EACH ORDER AFTER COMMIT
  Cash drawer            = ONE OPEN COMMAND
  Table status           = NOT AUTO-FREED

PRESERVED
  V108 Pay-before-Kitchen
  V112 Android = Web CSS/JS parity
  existing phone/mobile layout
  KDS lifecycle
  manual table-free lifecycle

============================================================
EOF

printf 'Backup: %s\n' "$BACKUP"
