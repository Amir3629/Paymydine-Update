#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_COMMIT="60ee027fd7b96846a80c00b4a78dd2c827017b52"

FILES=(
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/assets/js/pmd-quick-pos-v1.js"
  "app/admin/assets/css/pmd-qpos-web-parity-v112.css"
  "app/admin/assets/js/pmd-qpos-web-parity-v112.js"
  "app/admin/controllers/concerns/PmdWaiterPosOrderPersistenceConcern.php"
)

log(){ printf '\n[PayMyDine V116] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V116][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT"
command -v sudo >/dev/null 2>&1 || fail "sudo is required"
command -v php >/dev/null 2>&1 || fail "php CLI is required"
sudo -n true || fail "passwordless sudo is required"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching exact V116 source"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}"   || fail "V116 source commit unavailable"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v116-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v116-selected-order-batch-bill-before-${STAMP}.tar.gz"

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

log "Validating V116 before touching live files"
grep -Fq "PMD_QPOS_APPEND_AUTHORITY_V116" "$PERSIST"   || fail "Backend append authority missing"
grep -Fq "'can_append_items' =>" "$PERSIST"   || fail "Append authority payload missing"
grep -Fq "PMD_QPOS_APPEND_AUTHORITY_V116" "$JS"   || fail "Frontend append authority missing"
grep -Fq "PMD_QPOS_BATCH_BILL_PREVIEW_V116" "$JS"   || fail "Selected-order bill preview missing"
grep -Fq "PMD_QPOS_BATCH_BILL_PREVIEW_V116" "$CSS"   || fail "Selected-order bill styles missing"

grep -Fq "PMD_QPOS_RECEIVED_REUSE_V113" "$JS"   || fail "V113 Received-order reuse was lost"
grep -Fq "PMD_QPOS_MULTI_CHECK_PAY_RUNTIME_V114" "$JS"   || fail "V114 multi-check payment was lost"
grep -Fq "PMD_QPOS_PAY_BEFORE_KITCHEN_V108" "$JS"   || fail "V108 Pay-before-Kitchen was lost"

cmp -s "$CSS" "$PARITY_CSS"   || fail "Android parity CSS differs from Web CSS"
cmp -s "$JS" "$PARITY_JS"   || fail "Android parity JS differs from Web JS"

if command -v node >/dev/null 2>&1; then
  node --check "$JS" >/dev/null     || fail "Quick POS JavaScript syntax failed"
fi

php -l "$PERSIST" >/dev/null   || fail "Order persistence PHP syntax failed"

EXISTING=()
for rel in "${FILES[@]}"; do
  [[ -f "$rel" ]] && EXISTING+=("$rel")
done

sudo tar -czf "$BACKUP" "${EXISTING[@]}"
sudo chmod 0640 "$BACKUP" || true

log "Installing validated V116 files"
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

cmp -s   app/admin/assets/css/pmd-quick-pos-v1.css   app/admin/assets/css/pmd-qpos-web-parity-v112.css   || fail "Live CSS parity verification failed"
cmp -s   app/admin/assets/js/pmd-quick-pos-v1.js   app/admin/assets/js/pmd-qpos-web-parity-v112.js   || fail "Live JS parity verification failed"

grep -Fq "PMD_QPOS_APPEND_AUTHORITY_V116"   app/admin/controllers/concerns/PmdWaiterPosOrderPersistenceConcern.php
grep -Fq "PMD_QPOS_BATCH_BILL_PREVIEW_V116"   app/admin/assets/js/pmd-quick-pos-v1.js

cat <<'EOF'

============================================================
 PAYMYDINE QUICK POS V116 COMPLETE
============================================================

SELECTED ORDER -> ADD MORE FOOD
  Backend decides appendability     = AUTHORITATIVE
  Received / accepted / confirmed   = SAME ORDER
  Preparation started               = NEW ORDER
  Payment started                   = NO STRUCTURAL APPEND
  Browser status-name guessing      = REMOVED FOR NEW PAYLOADS

MULTI-ORDER SELECT
  Selecting order #1                = CHECK BILL CHANGES
  Selecting order #2                = CHECK BILL CHANGES AGAIN
  Sent items                        = GROUPED BY ORDER NUMBER
  Total                             = SUM OF SELECTED UNPAID ORDERS
  Mobile total/count                = SELECTED BILL
  Normal Send / Pay while selecting = DISABLED
  Pay selected                      = V114 ATOMIC PAYMENT

PRESERVED
  V108 Pay-before-Kitchen
  V113 History + Received lifecycle
  V114 multi-check settlement
  V112 Android = Web CSS/JS parity
  manual table-free lifecycle

============================================================
EOF

printf 'Backup: %s\n' "$BACKUP"
