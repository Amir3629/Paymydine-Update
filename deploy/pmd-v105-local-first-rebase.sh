#!/usr/bin/env bash
set -Eeuo pipefail

PMD_ROOT="${PMD_ROOT:-/var/www/paymydine}"
SOURCE_COMMIT="0c24c801c9bd1df9e0f36fb7e5058448a5a9a429"
SOURCE_BRANCH="main"

FILES=(
  "app/Services/PmdMobileSync/PmdMobileBootstrapService.php"
  "app/admin/assets/js/pmd-quick-pos-v1.js"
  "app/admin/assets/css/pmd-quick-pos-v1.css"
  "app/admin/views/pmd_quick_pos_v1.blade.php"
)

log(){ printf '\n[PayMyDine V105 Local-First] %s\n' "$*"; }
fail(){ printf '\n[PayMyDine V105 Local-First][ERROR] %s\n' "$*" >&2; exit 1; }

[[ -d "$PMD_ROOT/.git" ]] || fail "Not a git checkout: $PMD_ROOT"
[[ -f "$PMD_ROOT/artisan" ]] || fail "artisan missing: $PMD_ROOT"
command -v sudo >/dev/null 2>&1 || fail "sudo is required"
sudo -n true || fail "passwordless sudo is required for this deploy"

cd "$PMD_ROOT"
GIT=(git -c "safe.directory=$PMD_ROOT" -C "$PMD_ROOT")

log "Fetching latest-main rebased Local-First platform payload"
"${GIT[@]}" fetch origin "$SOURCE_BRANCH"
"${GIT[@]}" cat-file -e "${SOURCE_COMMIT}^{commit}" || fail "Pinned source commit unavailable"

STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
STAGE="/tmp/pmd-v105-local-first-${STAMP}"
BACKUP_DIR="$PMD_ROOT/storage/pmd-deploy-backups"
BACKUP="$BACKUP_DIR/v105-local-first-before-${STAMP}.tar.gz"

rm -rf "$STAGE"
mkdir -p "$STAGE"
sudo mkdir -p "$BACKUP_DIR"
trap 'rm -rf "$STAGE"' EXIT

for rel in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$rel")"
  "${GIT[@]}" show "${SOURCE_COMMIT}:$rel" > "$STAGE/$rel"
done

PHP="$STAGE/app/Services/PmdMobileSync/PmdMobileBootstrapService.php"
JS="$STAGE/app/admin/assets/js/pmd-quick-pos-v1.js"
CSS="$STAGE/app/admin/assets/css/pmd-quick-pos-v1.css"
VIEW="$STAGE/app/admin/views/pmd_quick_pos_v1.blade.php"

grep -Fq "PMD_MOBILE_TRUSTED_TIME_ANCHOR_V104" "$PHP" || fail "trusted-time marker missing"
grep -Fq "PMD_QPOS_SYNC_VISIBILITY_V104" "$JS" || fail "sync visibility marker missing"
grep -Fq "PMD_QPOS_SYNC_STATE_V104" "$CSS" || fail "sync-state CSS marker missing"
grep -Fq "PMD_QPOS_ANDROID_FORM_FACTOR_MATRIX_V105" "$CSS" || fail "V105 form-factor matrix missing"
grep -Fq "data-qpos-sync-state" "$VIEW" || fail "sync-state view marker missing"
grep -Fq "pmd-quick-pos-v1.css?v=20260924-v105" "$VIEW" || fail "V105 CSS cache-buster missing"
grep -Fq "pmd-quick-pos-v1.js?v=20260924-v105" "$VIEW" || fail "V105 JS cache-buster missing"

php -l "$PHP" >/dev/null || fail "PHP syntax failed"
if command -v node >/dev/null 2>&1; then
  node --check "$JS" >/dev/null || fail "JavaScript syntax failed"
fi

EXISTING=()
for rel in "${FILES[@]}"; do
  [[ -f "$rel" ]] && EXISTING+=("$rel")
done
if (("${#EXISTING[@]}" > 0)); then
  sudo tar -czf "$BACKUP" "${EXISTING[@]}"
  sudo chmod 0640 "$BACKUP" || true
fi

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

grep -Fq "PMD_QPOS_ANDROID_FORM_FACTOR_MATRIX_V105" app/admin/assets/css/pmd-quick-pos-v1.css
grep -Fq "PMD_QPOS_SYNC_STATE_V104" app/admin/assets/css/pmd-quick-pos-v1.css
grep -Fq "data-qpos-sync-state" app/admin/views/pmd_quick_pos_v1.blade.php
grep -Fq "pmd-quick-pos-v1.css?v=20260924-v105" app/admin/views/pmd_quick_pos_v1.blade.php

cat <<EOF

============================================================
 PAYMYDINE V105 + LOCAL-FIRST PLATFORM REBASE COMPLETE
============================================================
Pinned source:
  $SOURCE_COMMIT

Preserved:
  V105 Android form-factor matrix
  V105 server CSS/JS overrides
  current main Quick POS presentation

Added:
  Local-first sync/reconciliation indicator
  trusted server-time anchor for Android offline timestamps

Backup:
  $BACKUP
============================================================
EOF
