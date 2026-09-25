#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_COMMIT="ac8ce26792f7765585c7b7cce73f49a3440adf7c"
SOURCE_BRANCH="main"

FILES=(
  "app/Services/PmdMobileSync/PmdMobileBootstrapService.php"
  "app/Services/PmdMobileSync/PmdMobileCommandProcessor.php"
  "app/admin/assets/js/pmd-quick-pos-v1.js"
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/views/pmd_quick_pos_v1.blade.php"
)

log(){ printf '\n[PayMyDine V106 Local-First] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V106 Local-First][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT"
command -v sudo >/dev/null 2>&1 || fail "sudo is required"
sudo -n true || fail "passwordless sudo is required for this deploy"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching exact merged V106 source from main"
"${GIT[@]}" fetch origin "$SOURCE_BRANCH"
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}" || fail "Pinned V106 source commit unavailable"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v106-local-first-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v106-local-first-before-${STAMP}.tar.gz"

rm -rf "$STAGE"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP_DIR"
trap 'rm -rf "$STAGE"' EXIT

for rel in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$rel")"
  "${GIT[@]}" show "${SOURCE_COMMIT}:$rel" > "$STAGE/$rel"
done

BOOT="$STAGE/app/Services/PmdMobileSync/PmdMobileBootstrapService.php"
PROC="$STAGE/app/Services/PmdMobileSync/PmdMobileCommandProcessor.php"
JS="$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
CSS="$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
VIEW="$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"

grep -Fq "PMD_MOBILE_TRUSTED_TIME_ANCHOR_V104" "$BOOT" || fail "trusted time anchor missing"
grep -Fq "'ORDER_ITEM_ADJUST_V1'" "$BOOT" || fail "V106 certified command missing"
grep -Fq "PMD_MOBILE_ORDER_ITEM_ADJUST_V106" "$PROC" || fail "V106 command processor missing"
grep -Fq "increaseItemV68" "$PROC" || fail "canonical increase authority missing"
grep -Fq "voidItemV22" "$PROC" || fail "canonical void authority missing"
grep -Fq "PMD_QPOS_SYNC_VISIBILITY_V104" "$JS" || fail "local-first sync UI missing"
grep -Fq "PMD_QPOS_ANDROID_FORM_FACTOR_MATRIX_V105" "$CSS" || fail "V105 form-factor matrix missing"
grep -Fq "PMD_QPOS_SYNC_STATE_V104" "$CSS" || fail "sync-state styling missing"
grep -Fq "data-qpos-sync-state" "$VIEW" || fail "sync-state element missing"
grep -Fq "pmd-quick-pos-v1.css?v=20260924-v105" "$VIEW" || fail "V105 CSS cache-buster missing"
grep -Fq "pmd-quick-pos-v1.js?v=20260924-v105" "$VIEW" || fail "V105 JS cache-buster missing"

php -l "$BOOT" >/dev/null || fail "Bootstrap PHP syntax failed"
php -l "$PROC" >/dev/null || fail "Command processor PHP syntax failed"
if command -v node >/dev/null 2>&1; then
  node --check "$JS" >/dev/null || fail "Quick POS JavaScript syntax failed"
fi

EXISTING=()
for rel in "${FILES[@]}"; do
  [[ -f "$rel" ]] && EXISTING+=("$rel")
done
if (("${#EXISTING[@]}" > 0)); then
  sudo tar -czf "$BACKUP" "${EXISTING[@]}"
  sudo chmod 0640 "$BACKUP" || true
fi

log "Installing merged V106 platform files"
for rel in "${FILES[@]}"; do
  dst="$PMD_ROOT/$rel"
  if [[ -e "$dst" ]]; then
    uid="$(stat -c '%u' "$dst")"
    gid="$(stat -c '%g' "$dst")"
    mode="$(stat -c '%a' "$dst")"
  else
    uid="$(stat -c '%u' "$PMD_ROOT")"
    gid="$(stat -c '%g' "$PMD_ROOT")"
    mode="0644"
  fi
  sudo install -D -m "$mode" -o "$uid" -g "$gid" "$STAGE/$rel" "$dst"
  echo "UPDATED: $rel"
done

sudo -u www-data php artisan view:clear >/dev/null 2>&1 || php artisan view:clear >/dev/null 2>&1 || true
sudo -u www-data php artisan cache:clear >/dev/null 2>&1 || php artisan cache:clear >/dev/null 2>&1 || true

php -l app/Services/PmdMobileSync/PmdMobileBootstrapService.php >/dev/null
php -l app/Services/PmdMobileSync/PmdMobileCommandProcessor.php >/dev/null
grep -Fq "PMD_MOBILE_ORDER_ITEM_ADJUST_V106" app/Services/PmdMobileSync/PmdMobileCommandProcessor.php
grep -Fq "PMD_QPOS_ANDROID_FORM_FACTOR_MATRIX_V105" app/admin/assets/css/pmd-quick-pos-v1.css
grep -Fq "data-qpos-sync-state" app/admin/views/pmd_quick_pos_v1.blade.php

cat <<EOF

============================================================
 PAYMYDINE V106 LOCAL-FIRST PLATFORM COMPLETE
============================================================
Source:
  $SOURCE_COMMIT

Active together:
  V105 Android phone/tablet form-factor matrix
  Local-first sync/reconciliation status
  Trusted offline business-time anchor
  ORDER_ITEM_ADJUST_V1 durable Cloud-line edits
  Canonical payment/KDS/manager item locks

Still intentionally Cloud-only:
  Card / terminal / provider approval
  Split-payment provider flows

Backup:
  $BACKUP
============================================================
EOF
