#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_COMMIT="7ac437000a9df8f8daae554dcd7cd799bd2ffefc"

FILES=(
  "app/admin/assets/js/pmd-quick-pos-v1.js"
  "app/admin/assets/js/pmd-qpos-web-parity-v112.js"
  "app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php"
)

log(){ printf '\n[PayMyDine V117] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V117][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT"
command -v sudo >/dev/null 2>&1 || fail "sudo is required"
command -v php >/dev/null 2>&1 || fail "php CLI is required"
sudo -n true || fail "passwordless sudo is required"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching exact V117 source"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}" || fail "V117 source commit unavailable"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v117-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v117-immediate-append-authority-before-${STAMP}.tar.gz"

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
SAVE="$STAGE/app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php"

log "Validating V117 before touching live files"
grep -Fq "PMD_QPOS_IMMEDIATE_APPEND_AUTHORITY_V117" "$JS"   || fail "Frontend V117 marker missing"
grep -Fq "responseAppendAuthorityV117" "$JS"   || fail "Frontend immediate append authority missing"
grep -Fq "PMD_QPOS_IMMEDIATE_APPEND_AUTHORITY_V117" "$SAVE"   || fail "Backend V117 marker missing"
grep -Fq "'can_append_items' => \$this->pmdOrderAcceptsReceivedAppendV113(\$order)" "$SAVE"   || fail "Backend save response append authority missing"
grep -Fq "'status_name' => \$this->pmdOrderKitchenPhaseNameV113(\$order)" "$SAVE"   || fail "Backend save response Kitchen phase missing"

grep -Fq "PMD_QPOS_APPEND_AUTHORITY_V116" "$JS"   || fail "V116 append authority was lost"
grep -Fq "PMD_QPOS_RECEIVED_REUSE_V113" "$JS"   || fail "V113 Received reuse was lost"
grep -Fq "PMD_QPOS_PAY_BEFORE_KITCHEN_V108" "$JS"   || fail "V108 Pay-before-Kitchen was lost"
grep -Fq "PMD_QPOS_MULTI_CHECK_PAY_RUNTIME_V114" "$JS"   || fail "V114 multi-check payment was lost"

cmp -s "$JS" "$PARITY_JS"   || fail "Android/Web JS parity differs"

if command -v node >/dev/null 2>&1; then
  node --check "$JS" >/dev/null     || fail "Quick POS JavaScript syntax failed"
fi

php -l "$SAVE" >/dev/null   || fail "Save endpoint PHP syntax failed"

EXISTING=()
for rel in "${FILES[@]}"; do
  [[ -f "$rel" ]] && EXISTING+=("$rel")
done

sudo tar -czf "$BACKUP" "${EXISTING[@]}"
sudo chmod 0640 "$BACKUP" || true

log "Installing validated V117 files"
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

grep -Fq "PMD_QPOS_IMMEDIATE_APPEND_AUTHORITY_V117"   app/admin/assets/js/pmd-quick-pos-v1.js
grep -Fq "PMD_QPOS_IMMEDIATE_APPEND_AUTHORITY_V117"   app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php

cat <<'EOF'

============================================================
 PAYMYDINE QUICK POS V117 IMMEDIATE APPEND AUTHORITY COMPLETE
============================================================

BUG FIXED
  Existing sent order + add more food + Send to Kitchen
  no longer depends on a later table refresh to know appendability.

EXPECTED
  First Send while Kitchen is still Received  = ORDER #X
  Add more items to selected ORDER #X
  Second Send while still Received            = SAME ORDER #X
  Kitchen already in Preparation or later     = NEW ORDER
  Payment started / settled                   = NO STRUCTURAL APPEND

WHY V116 COULD STILL DUPLICATE
  The backend table payload had can_append_items,
  but the immediate POST response did not.
  A fast second Send could therefore see the just-saved order
  as non-appendable before background hydration completed.

PRESERVED
  V108 Pay-before-Kitchen
  V113 Received lifecycle
  V114 multi-check settlement
  V116 selected-order bill
  V112 Android = Web JS parity
  mobile/tablet layout behavior

============================================================
EOF

printf 'Backup: %s\n' "$BACKUP"
