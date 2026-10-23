#!/usr/bin/env bash
# PMD_OWNER_SHARED_STAFF_SHELL_DEPLOY_V026_20261023
# Reuse exact Staff app chrome for Owner/Manager. No APK or DB migration.
# Nine scoped Staff/Owner files with preflight and complete rollback.
set -Eeuo pipefail
umask 022

REV="${1:-}"
if [[ ! "$REV" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Usage: bash pmd-staff-owner-shared-shell-v026-deploy.sh <40-char commit>" >&2
  exit 2
fi
cd /var/www/paymydine
BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/$REV"
FILES=(
  "app/admin/controllers/Mywork.php"
  "app/Http/Controllers/PmdStaffPortalV5Controller.php"
  "app/admin/Services/PmdStaffOperationsCenterV1.php"
  "app/admin/views/pmd-staff-portal/index_v5.blade.php"
  "app/admin/views/pmd-staff-portal/management_v1.blade.php"
  "app/admin/views/pmd-staff-portal/_manager_workforce_v026.blade.php"
  "app/admin/assets/css/pmd-staff-manager-v2.css"
  "app/admin/assets/js/pmd-staff-manager-v2.js"
  "app/admin/assets/js/pmd-staff-portal-locale-v2.js"
)
STAGE="$(mktemp -d)"
BACKUP="$HOME/pmd-backups/staff-owner-shared-v026-$(date -u +%Y%m%d-%H%M%S)"
TEMP=""
INSTALLING=0

cleanup() {
  local rc=$?
  trap - EXIT
  if (( rc != 0 && INSTALLING == 1 )); then
    echo "ERROR: Rolling back Staff/Owner v026..." >&2
    for f in "${FILES[@]}"; do
      if [[ -e "$BACKUP/$f" ]]; then
        cp -a "$BACKUP/$f" "$f"
      else
        rm -f "$f"
      fi
    done
    php artisan view:clear || true
  fi
  if [[ -n "$TEMP" && -f "$TEMP" ]]; then rm -f "$TEMP"; fi
  rm -rf "$STAGE"
  exit "$rc"
}
trap cleanup EXIT

echo "=== 1. Check Staff v025 foundation ==="
grep -Fq 'PMD_STAFF_SAME_APP_MANAGEMENT_V1_20261023' app/admin/controllers/Mywork.php
grep -Fq 'PMD_STAFF_MY_ACTUAL_EXTRAS_V1_20261023' app/admin/views/pmd-staff-portal/index_v5.blade.php
grep -Fq 'PMD_STAFF_OPERATIONS_CENTER_V1_20261021' app/admin/Services/PmdStaffOperationsCenterV1.php

echo "=== 2. Download/validate 9 Staff-only files ==="
for f in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$f")"
  curl -fLsS --retry 3 --connect-timeout 15 "$BASE/$f" -o "$STAGE/$f"
  test -s "$STAGE/$f"
  case "$f" in
    *.blade.php) : ;;
    *.php) php -l "$STAGE/$f" ;;
    *.js)
      if command -v node >/dev/null 2>&1; then node --check "$STAGE/$f"; fi
      ;;
  esac
  echo "VALIDATED: $f"
done
grep -Fq 'PMD_OWNER_SHARED_STAFF_SHELL_V026_20261023' "$STAGE/app/admin/controllers/Mywork.php"
grep -Fq 'PMD_OWNER_SHARED_STAFF_SHELL_V026_20261023' "$STAGE/app/admin/views/pmd-staff-portal/index_v5.blade.php"
grep -Fq 'PMD_OWNER_SHARED_STAFF_SHELL_V026_20261023' "$STAGE/app/admin/views/pmd-staff-portal/management_v1.blade.php"
grep -Fq 'PMD_OWNER_SHARED_STAFF_SHELL_V026_20261023' "$STAGE/app/admin/views/pmd-staff-portal/_manager_workforce_v026.blade.php"
grep -Fq 'PMD_OWNER_SHARED_STAFF_SHELL_V026_20261023' "$STAGE/app/admin/assets/css/pmd-staff-manager-v2.css"
grep -Fq 'PMD_OWNER_SHARED_STAFF_SHELL_V026_20261023' "$STAGE/app/admin/assets/js/pmd-staff-manager-v2.js"
grep -Fq "public function managerlocale()" "$STAGE/app/admin/controllers/Mywork.php"
grep -Fq "if (!\$this->isWorkforceManager()) abort(403)" "$STAGE/app/admin/controllers/Mywork.php"

echo "=== 3. Backup original files ==="
mkdir -p "$BACKUP"
for f in "${FILES[@]}"; do
  if [[ -e "$f" ]]; then
    mkdir -p "$BACKUP/$(dirname "$f")"
    cp -a "$f" "$BACKUP/$f"
  fi
done
echo "Backup: $BACKUP"

echo "=== 4. Install exact files (rollback on failure) ==="
INSTALLING=1
for f in "${FILES[@]}"; do
  mkdir -p "$(dirname "$f")"
  TEMP="$(mktemp "$(dirname "$f")/.pmd-owner26.XXXXXXXX")"
  if [[ -e "$f" ]]; then
    cp -a "$f" "$TEMP"
  else
    chmod 0644 "$TEMP"
  fi
  cat "$STAGE/$f" > "$TEMP"
  mv -f "$TEMP" "$f"
  TEMP=""
  cmp -s "$STAGE/$f" "$f"
  echo "UPDATED: $f"
done
php artisan view:clear
INSTALLING=0

echo "=========================================="
echo "PAYMYDINE STAFF / OWNER SAME APP V026 INSTALLED"
echo "Commit: $REV"
echo "Backup: $BACKUP"
echo "No APK replacement; no database edits or migrations."
echo "Linked Owner: same Staff app with Team tab."
echo "Unlinked Owner: same Staff shell, role-gated Team access."
echo "=========================================="
