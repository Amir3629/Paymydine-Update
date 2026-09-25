#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_COMMIT="d3461805edaf31815e1becef0d6ec302a80e6295"

FILES=(
  "app/admin/assets/js/pmd-quick-pos-v1.js"
  "app/admin/assets/js/pmd-qpos-web-parity-v112.js"
  "app/admin/controllers/concerns/PmdWaiterPosOrderPersistenceConcern.php"
  "app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php"
)

log(){ printf '\n[PayMyDine V119] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V119][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT"
command -v sudo >/dev/null 2>&1 || fail "sudo is required"
command -v php >/dev/null 2>&1 || fail "php CLI is required"
sudo -n true || fail "passwordless sudo is required"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching exact V119 source"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}"   || fail "V119 source commit unavailable"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v119-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v119-kitchen-round-split-before-${STAMP}.tar.gz"

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

log "Validating V119 before touching live files"

grep -Fq "PMD_QPOS_KITCHEN_ROUND_SPLIT_V119" "$JS"   || fail "V119 kitchen-round split marker missing"
grep -Fq "PMD_QPOS_SILENT_KITCHEN_LOCK_V119" "$JS"   || fail "V119 silent kitchen lock marker missing"
grep -Fq "!mutation.kitchen_started" "$JS"   || fail "Kitchen lock text suppression missing"

if grep -Fq "Kitchen preparing/ready · sent item quantities are locked." "$JS"; then
  fail "Old kitchen lock text is still present"
fi

grep -Fq "PMD_QPOS_RECEIVED_REUSE_V113" "$JS"   || fail "V113 Received reuse was lost"
grep -Fq "var appendOrderIdV113" "$JS"   || fail "Received-only append routing missing"
grep -Fq "!!order && !canAppendReceivedV113" "$JS"   || fail "Preparation-to-new-order routing missing"

grep -Fq "PMD_QPOS_RECEIVED_APPEND_GATE_V113" "$PERSIST"   || fail "Backend Received append gate missing"
grep -Fq "['received', 'accepted', 'confirmed']" "$PERSIST"   || fail "Backend Received-only phase list missing"

if grep -Fq "PMD_QPOS_EXPLICIT_ORDER_APPEND_V118" "$JS"; then
  fail "Superseded V118 exact-order override still present in JS"
fi
if grep -Fq "explicit_order_selection" "$SAVE"; then
  fail "Superseded V118 explicit-order payload still present in save endpoint"
fi
if grep -Fq "can_append_selected_items" "$PERSIST"; then
  fail "Superseded V118 selected-order authority still present in persistence"
fi

grep -Fq "PMD_QPOS_IMMEDIATE_APPEND_AUTHORITY_V117" "$JS"   || fail "V117 immediate append authority was lost"
grep -Fq "PMD_QPOS_APPEND_AUTHORITY_V116" "$JS"   || fail "V116 backend append authority was lost"
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

log "Installing validated V119 files"
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

grep -Fq "PMD_QPOS_KITCHEN_ROUND_SPLIT_V119"   app/admin/assets/js/pmd-quick-pos-v1.js
grep -Fq "PMD_QPOS_SILENT_KITCHEN_LOCK_V119"   app/admin/assets/js/pmd-quick-pos-v1.js

cat <<'EOF'

============================================================
 PAYMYDINE QUICK POS V119 KITCHEN ROUND SPLIT COMPLETE
============================================================

CHECK / KITCHEN RULE
  Sent + Kitchen still Received         = append to SAME order
  Kitchen enters Preparation            = existing sent quantities lock
  Add new food after Preparation        = NEW order / NEW KDS ticket
  Ready / later Kitchen phase           = NEW order / NEW KDS ticket
  In-flight KDS ticket                  = never mutated by later food

CHECK CARD UI
  Preparing/ready quantity lock         = silent
  +/- controls on committed items       = locked as before
  "Kitchen preparing/ready..." text     = removed

PRESERVED
  V108 Pay-before-Kitchen
  V113 Received-order reuse
  V114 multi-check settlement
  V116 append authority / selected bill
  V117 immediate POST authority
  Android/Web runtime parity

============================================================
EOF

printf 'Backup: %s\n' "$BACKUP"
