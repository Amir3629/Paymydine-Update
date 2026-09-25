#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_COMMIT="7d0e641d9bae443c9ff5a5b2934c448732c8b407"

FILES=(
  "app/admin/assets/js/pmd-quick-pos-v1.js"
  "app/admin/assets/js/pmd-qpos-web-parity-v112.js"
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/assets/css/pmd-qpos-web-parity-v112.css"
  "app/admin/controllers/concerns/PmdWaiterPosOrderPersistenceConcern.php"
  "app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php"
  "app/admin/views/pmd_quick_pos_v1.blade.php"
)

log(){ printf '\n[PayMyDine V121] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V121][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT"
command -v sudo >/dev/null 2>&1 || fail "sudo is required"
command -v php >/dev/null 2>&1 || fail "php CLI is required"
sudo -n true || fail "passwordless sudo is required"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching exact V121 source"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}"   || fail "V121 source commit unavailable"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v121-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v121-server-round-authority-floating-keypad-before-${STAMP}.tar.gz"

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
PERSIST="$STAGE/app/admin/controllers/concerns/PmdWaiterPosOrderPersistenceConcern.php"
SAVE="$STAGE/app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php"
VIEW="$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"

log "Validating V121 before touching live files"

grep -Fq "PMD_QPOS_SERVER_ROUND_AUTHORITY_V121" "$JS"   || fail "V121 JS round-authority marker missing"
grep -Fq "round_candidate_order_id: snapshot.roundCandidateOrderId" "$JS"   || fail "V121 candidate payload missing"
grep -Fq "PMD_QPOS_KITCHEN_ROUND_SPLIT_V119" "$JS"   || fail "V119 Kitchen round split was lost"
grep -Fq "PMD_QPOS_IMMEDIATE_APPEND_AUTHORITY_V117" "$JS"   || fail "V117 immediate append authority was lost"

cmp -s "$JS" "$PARITY_JS"   || fail "Android/Web JS parity differs"

grep -Fq "PMD_QPOS_MOBILE_PAYMENT_STACK_V120" "$CSS"   || fail "V120 mobile payment layout was lost"
grep -Fq "PMD_QPOS_MOBILE_FLOATING_KEYPAD_V121" "$CSS"   || fail "V121 floating mobile keypad missing"
grep -Fq "position: fixed !important" "$CSS"   || fail "V121 floating keypad positioning missing"

cmp -s "$CSS" "$PARITY_CSS"   || fail "Android/Web CSS parity differs"

grep -Fq "PMD_QPOS_SERVER_ROUND_AUTHORITY_V121" "$PERSIST"   || fail "Backend round-authority marker missing"
grep -Fq "resolveQuickPosKitchenRoundCandidateV121" "$PERSIST"   || fail "Backend candidate resolver missing"
grep -Fq "foreach (['received', 'accepted', 'confirmed'] as" "$PERSIST"   || fail "Received aliases missing"

[[ "$(grep -Foc "resolveQuickPosKitchenRoundCandidateV121" "$SAVE")" -ge 2 ]]   || fail "Browser/native V121 resolver wiring incomplete"
[[ "$(grep -Foc "round_candidate_order_id" "$SAVE")" -ge 2 ]]   || fail "Browser/native V121 candidate payload wiring incomplete"

grep -Fq "pmd-qpos-web-parity-v112.css?v=20260925-v121" "$VIEW"   || fail "Android V121 CSS cache-bust missing"
grep -Fq "pmd-quick-pos-v1.css?v=20260925-v121" "$VIEW"   || fail "Web V121 CSS cache-bust missing"
grep -Fq "pmd-qpos-web-parity-v112.js?v=20260925-v121" "$VIEW"   || fail "Android V121 JS cache-bust missing"
grep -Fq "pmd-quick-pos-v1.js?v=20260925-v121" "$VIEW"   || fail "Web V121 JS cache-bust missing"

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

log "Installing validated V121 files"
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

grep -Fq "PMD_QPOS_SERVER_ROUND_AUTHORITY_V121"   app/admin/assets/js/pmd-quick-pos-v1.js
grep -Fq "PMD_QPOS_MOBILE_FLOATING_KEYPAD_V121"   app/admin/assets/css/pmd-quick-pos-v1.css

cat <<'EOF'

============================================================
 PAYMYDINE QUICK POS V121 COMPLETE
============================================================

ORDER / KITCHEN ROUND AUTHORITY
  Existing order still Received
    + add more items + Send to Kitchen
    = SAME order number

  Existing order enters Preparation / Ready / later
    + add more items + Send to Kitchen
    = NEW order + NEW KDS ticket

  Browser stale append state
    = backend decides under DB row lock
    = no false duplicate order while still Received

MOBILE PAYMENT
  Number keypad
    = floating at bottom of phone screen
    = stays visible while Split / Tip / payment fields scroll
    = content gets safe bottom spacing so nothing is hidden

PRESERVED
  V120 clean mobile payment layout
  V119 Kitchen-round split after Preparation
  V117 immediate append authority
  V114 multi-check settlement
  V108 Pay-before-Kitchen
  Android/Web JS + CSS parity

============================================================
EOF

printf 'Backup: %s\n' "$BACKUP"
