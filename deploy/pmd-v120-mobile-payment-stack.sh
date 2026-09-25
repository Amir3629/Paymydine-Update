#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_COMMIT="27aa13bb61c3b56d0f736cd24f3657a89abb1013"

FILES=(
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/assets/css/pmd-qpos-web-parity-v112.css"
  "app/admin/views/pmd_quick_pos_v1.blade.php"
)

log(){ printf '\n[PayMyDine V120] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V120][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT"
command -v sudo >/dev/null 2>&1 || fail "sudo is required"
sudo -n true || fail "passwordless sudo is required"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching exact V120 source"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}"   || fail "V120 source commit unavailable"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v120-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v120-mobile-payment-stack-before-${STAMP}.tar.gz"

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

log "Validating V120 before touching live files"

grep -Fq "PMD_QPOS_MOBILE_PAYMENT_STACK_V120" "$CSS"   || fail "V120 mobile payment marker missing"
grep -Fq "grid-area: auto !important" "$CSS"   || fail "Mobile legacy grid-area reset missing"
grep -Fq "flex-direction: column !important" "$CSS"   || fail "Mobile vertical payment stack missing"
grep -Fq "height: 100dvh !important" "$CSS"   || fail "Phone full-height payment workspace missing"
grep -Fq "grid-template-columns: repeat(2,minmax(0,1fr)) !important" "$CSS"   || fail "Mobile split/payment two-column layout missing"
grep -Fq "grid-template-columns: repeat(4,minmax(0,1fr)) !important" "$CSS"   || fail "Mobile tip/keypad four-column layout missing"
grep -Fq "overflow-y: auto !important" "$CSS"   || fail "Mobile payment scroll safety missing"

cmp -s "$CSS" "$PARITY_CSS"   || fail "Android/Web CSS parity differs"

grep -Fq "pmd-qpos-web-parity-v112.css?v=20260925-v120" "$VIEW"   || fail "Android CSS cache-bust V120 missing"
grep -Fq "pmd-quick-pos-v1.css?v=20260925-v120" "$VIEW"   || fail "Web CSS cache-bust V120 missing"

EXISTING=()
for rel in "${FILES[@]}"; do
  [[ -f "$rel" ]] && EXISTING+=("$rel")
done

sudo tar -czf "$BACKUP" "${EXISTING[@]}"
sudo chmod 0640 "$BACKUP" || true

log "Installing validated V120 files"
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

cmp -s   app/admin/assets/css/pmd-quick-pos-v1.css   app/admin/assets/css/pmd-qpos-web-parity-v112.css   || fail "Live Android/Web CSS parity verification failed"

grep -Fq "PMD_QPOS_MOBILE_PAYMENT_STACK_V120"   app/admin/assets/css/pmd-quick-pos-v1.css
grep -Fq "pmd-qpos-web-parity-v112.css?v=20260925-v120"   app/admin/views/pmd_quick_pos_v1.blade.php

if [[ -f app/admin/assets/js/pmd-quick-pos-v1.js ]]; then
  grep -Fq "PMD_QPOS_KITCHEN_ROUND_SPLIT_V119"     app/admin/assets/js/pmd-quick-pos-v1.js     || fail "V119 Kitchen-round logic is not present in live JS"
fi

cat <<'EOF'

============================================================
 PAYMYDINE QUICK POS V120 MOBILE PAYMENT STACK COMPLETE
============================================================

PHONE PAYMENT
  Payment screen             = full-screen, one clean vertical flow
  Header / Due / Method      = normal ordered blocks
  Cash fields                = aligned, never overlap
  Split Bill                 = clean 2 x 2 control grid
  Tip                        = clean 4-button row + full-width custom field
  Keypad                     = full-width 4-column keypad below controls
  Long content               = natural vertical scroll
  Legacy named CSS grid      = neutralized on mobile/tablet
  iPhone safe areas          = respected

CACHE
  CSS asset version          = V120
  Old cached mobile CSS      = bypassed automatically

PRESERVED
  V119 Kitchen-round split
  V117 immediate append authority
  V114 multi-check payment
  V108 Pay-before-Kitchen
  Android/Web CSS parity

============================================================
EOF

printf 'Backup: %s\n' "$BACKUP"
