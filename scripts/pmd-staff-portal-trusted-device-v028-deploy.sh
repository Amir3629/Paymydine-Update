#!/usr/bin/env bash
# PMD_STAFF_PORTAL_TRUSTED_DEVICE_DEPLOY_V028_20261023
# Staff/Owner same-app Portal: password plus a 90-day revocable device trust.
# 10 scoped files, safe backup/rollback. NO APK, SQL migration or OTP bypass.
set -Eeuo pipefail
umask 022

REV="${1:-}"
if [[ ! "$REV" =~ ^[0-9a-f]{40}$ ]]; then
  echo "Usage: bash pmd-staff-portal-trusted-device-v028-deploy.sh <40-char commit>" >&2
  exit 2
fi
cd /var/www/paymydine
BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/$REV"
FILES=(
  "app/Services/PmdPortalTrustedDeviceService.php"
  "app/Services/PmdPortalTotpService.php"
  "app/admin/traits/HandlesPortalMfa.php"
  "app/admin/controllers/Login.php"
  "app/Http/Controllers/PmdMobileWorkspaceSessionController.php"
  "app/admin/views/auth/login_portal_mfa_v1.blade.php"
  "app/admin/controllers/Mywork.php"
  "app/admin/views/pmd-staff-portal/trusted_devices_v1.blade.php"
  "app/admin/views/pmd-staff-portal/index_v5.blade.php"
  "app/admin/views/pmd-staff-portal/management_v1.blade.php"
)
STAGE="$(mktemp -d)"
BACKUP="$HOME/pmd-backups/staff-trusted-portal-v028-$(date -u +%Y%m%d-%H%M%S)"
TEMP=""
INSTALLING=0

cleanup(){
  local rc=$?
  trap - EXIT
  if (( rc != 0 && INSTALLING == 1 )); then
    echo "ERROR: Restoring previous Portal/Staff authentication files..." >&2
    for f in "${FILES[@]}"; do
      if [[ -f "$BACKUP/$f" ]]; then
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

echo "=== 1. Validate current Staff Portal security foundation ==="
test -f app/admin/traits/HandlesPortalMfa.php
test -f app/Services/PmdPortalTotpService.php
test -f app/Services/PmdTrustedLoginDeviceService.php
test -f app/admin/assets/css/pmd-staff-owner-bottom-nav-v027.css
grep -Fq 'PMD_PORTAL_PERSONAL_MFA_LOGIN_V2' app/admin/traits/HandlesPortalMfa.php
grep -Fq 'PMD_PORTAL_MFA_NO_TRUSTED_RESUME_V1' app/Services/PmdTrustedLoginDeviceService.php
grep -Fq 'PMD_OWNER_BOTTOM_NAV_V027_20261023' app/admin/assets/css/pmd-staff-owner-bottom-nav-v027.css

# PMD_V028_DEPLOY_BASELINE_GUARD: never overwrite unmerged server hotfixes.
# PR #548 is based on installed Staff Owner v027. Compare every existing
# destination file against that exact reviewed parent before replacing it.
BASELINE_REV="697cee3582ebffc44c3925630c9531a110c9a4f1"
echo "=== Preflight: verify server files match reviewed v027 baseline ==="
for f in "${FILES[@]}"; do
  if [[ "$f" == "app/Services/PmdPortalTrustedDeviceService.php" || "$f" == "app/admin/views/pmd-staff-portal/trusted_devices_v1.blade.php" ]]; then
    if [[ -e "$f" ]]; then
      echo "REFUSING TO OVERWRITE: new v028 path already exists: $f" >&2
      exit 3
    fi
    continue
  fi
  baseline="$STAGE/.baseline-$(printf '%s' "$f" | sha256sum | cut -d' ' -f1)"
  curl -fLsS --retry 3 --connect-timeout 15 "https://raw.githubusercontent.com/Amir3629/Paymydine-Update/$BASELINE_REV/$f" -o "$baseline"
  if ! cmp -s "$baseline" "$f"; then
    echo "REFUSING TO OVERWRITE: $f differs from reviewed v027 baseline." >&2
    echo "Preserve the server's local changes. Reconcile this file before installing v028." >&2
    exit 3
  fi
done
echo "Baseline verified; no unexpected local drift in target files."

echo "=== 2. Stage and PHP lint exactly 10 scoped files ==="
for f in "${FILES[@]}"; do
  mkdir -p "$STAGE/$(dirname "$f")"
  curl -fLsS --retry 3 --connect-timeout 15 "$BASE/$f" -o "$STAGE/$f"
  test -s "$STAGE/$f"
  case "$f" in
    *.blade.php) : ;;
    *.php) php -l "$STAGE/$f" ;;
  esac
  echo "VALIDATED: $f"
done
grep -Fq 'PMD_PORTAL_TRUSTED_DEVICE_V028_20261023' "$STAGE/app/Services/PmdPortalTrustedDeviceService.php"
grep -Fq 'PMD_PORTAL_TRUSTED_RESUME_V028_20261023' "$STAGE/app/Services/PmdPortalTotpService.php"
grep -Fq 'PMD_PORTAL_TRUST_ON_VERIFIED_MFA_V028_20261023' "$STAGE/app/admin/traits/HandlesPortalMfa.php"
grep -Fq 'PMD_PORTAL_TRUSTED_LOGIN_V028_20261023' "$STAGE/app/admin/controllers/Login.php"
grep -Fq 'PMD_MOBILE_STAFF_PORTAL_TRUSTED_RESUME_V028_20261023' "$STAGE/app/Http/Controllers/PmdMobileWorkspaceSessionController.php"
grep -Fq 'PMD_PORTAL_DEVICE_TRUST_OPTIN_V028_20261023' "$STAGE/app/admin/views/auth/login_portal_mfa_v1.blade.php"
grep -Fq 'PMD_PORTAL_TRUST_DEVICES_ACCOUNT_V028_20261023' "$STAGE/app/admin/controllers/Mywork.php"
grep -Fq 'PMD_PORTAL_TRUST_DEVICES_ACCOUNT_V028_20261023' "$STAGE/app/admin/views/pmd-staff-portal/trusted_devices_v1.blade.php"
grep -Fq 'PMD_PORTAL_TRUST_DEVICES_LINK_V028_20261023' "$STAGE/app/admin/views/pmd-staff-portal/index_v5.blade.php"
grep -Fq 'PMD_PORTAL_TRUST_DEVICES_LINK_V028_20261023' "$STAGE/app/admin/views/pmd-staff-portal/management_v1.blade.php"

echo "=== 3. Back up all 10 existing files ==="
mkdir -p "$BACKUP"
for f in "${FILES[@]}"; do
  if [[ -f "$f" ]]; then
    mkdir -p "$BACKUP/$(dirname "$f")"
    cp -a "$f" "$BACKUP/$f"
  fi
done
echo "Backup: $BACKUP"

echo "=== 4. Atomic install with rollback ==="
INSTALLING=1
for f in "${FILES[@]}"; do
  mkdir -p "$(dirname "$f")"
  TEMP="$(mktemp "$(dirname "$f")/.pmd-portal-trust28.XXXXXXXX")"
  if [[ -f "$f" ]]; then cp -a "$f" "$TEMP"; else chmod 0644 "$TEMP"; fi
  cat "$STAGE/$f" > "$TEMP"
  mv -f "$TEMP" "$f"
  TEMP=""
  cmp -s "$STAGE/$f" "$f"
  echo "UPDATED: $f"
done
php artisan view:clear
INSTALLING=0

echo "=========================================="
echo "PAYMYDINE STAFF PORTAL TRUST V028 INSTALLED"
echo "Commit: $REV"
echo "Backup: $BACKUP"
echo "No APK change, migrations, Workspace trust bypass or tenant edits."
echo "NEXT: On first login, verify Authenticator and keep"
echo "      Remember this device (90 days) selected."
echo "NEXT: Sign out, sign in again on SAME phone with password."
echo "      It should go straight to Staff without another OTP."
echo "=========================================="
