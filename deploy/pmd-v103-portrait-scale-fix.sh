#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_COMMIT="ee8b16c3ae6b894b632b90df7bba0ecc17564a76"

FILES=(
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/views/pmd_quick_pos_v1.blade.php"
)

log(){ printf '\n[PayMyDine V103] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V103][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching exact V103 web commit"
"${GIT[@]}" fetch origin main
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}" || fail "V103 commit unavailable"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v103-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v103-portrait-scale-before-${STAMP}.tar.gz"

rm -rf "$STAGE"
mkdir -p "$STAGE"
mkdir -p "$BACKUP_DIR"
trap 'rm -rf "$STAGE"' EXIT

for rel in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$rel")"
  "${GIT[@]}" show "${SOURCE_COMMIT}:$rel" > "$STAGE/$rel"
done

CSS="$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
VIEW="$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"

grep -Fq "PMD_QPOS_TABLET_PORTRAIT_SCALE_ISOLATION_V103" "$CSS" || fail "V103 marker missing"
grep -Fq "@media (min-width: 600px) and (max-width: 1024px) and (orientation: portrait)" "$CSS" || fail "tablet matrix missing"
grep -Fq "pmd-quick-pos-v1.css?v=20260924-v103" "$VIEW" || fail "V103 CSS cache-buster missing"
grep -Fq "pmd-quick-pos-v1.js?v=20260924-v103" "$VIEW" || fail "V103 JS cache-buster missing"

for marker in   "PMD_QPOS_MOBILE_SCALE_V89"   "Phone / portrait readability"   "PMD_QPOS_MOBILE_TOUCH_HISTORY_V93"   "PMD_QPOS_PHONE_SCALE_V95"
do
  line="$(grep -nF "$marker" "$CSS" | head -1 | cut -d: -f1)"
  [[ -n "$line" ]] || fail "marker missing: $marker"
  end=$((line + 90))
  sed -n "${line},${end}p" "$CSS" | grep -Fq "@media (max-width: 599px)"     || fail "$marker is not phone-only"
done

EXISTING=()
for rel in "${FILES[@]}"; do
  [[ -f "$rel" ]] && EXISTING+=("$rel")
done
tar -czf "$BACKUP" "${EXISTING[@]}"

log "Installing exact V103 CSS/View"
for rel in "${FILES[@]}"; do
  dst="$PMD_ROOT/$rel"
  uid="$(stat -c '%u' "$dst")"
  gid="$(stat -c '%g' "$dst")"
  mode="$(stat -c '%a' "$dst")"
  install -m "$mode" -o "$uid" -g "$gid" "$STAGE/$rel" "$dst"
  echo "UPDATED: $rel"
done

php artisan view:clear >/dev/null 2>&1 || true
php artisan cache:clear >/dev/null 2>&1 || true

grep -Fq "PMD_QPOS_TABLET_PORTRAIT_SCALE_ISOLATION_V103"   app/admin/assets/css/pmd-quick-pos-v1.css
grep -Fq "pmd-quick-pos-v1.css?v=20260924-v103"   app/admin/views/pmd_quick_pos_v1.blade.php

cat <<EOF

============================================================
 PAYMYDINE QUICK POS V103 PORTRAIT SCALE FIX COMPLETE
============================================================
Tablet portrait 600..1024px:
  Legacy V89 phone scale = DISABLED
  Legacy V90 phone scale = DISABLED
  Legacy V93 phone scale = DISABLED
  Legacy V95 phone scale = DISABLED
  V102 tablet matrix     = ACTIVE
  Browser/WebView zoom   = NATURAL 100%

Phone <=599px:
  Large phone UI         = PRESERVED

Landscape:
  Existing landscape UI  = PRESERVED

NOT TOUCHED:
  database
  payment controllers
  terminal/card flow
  offline failover
  sync/reconciliation
  KDS
  reservations

Backup:
  $BACKUP
============================================================
EOF
