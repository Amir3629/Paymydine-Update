#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
PAYLOAD_REF="b9f8d5fe6cc8b48741472ba64ade6d21134847d0"
RAW="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/${PAYLOAD_REF}"
TS="$(date +%Y%m%d-%H%M%S)"
BACKUP="$ROOT/storage/pmd-superadmin-r2-domain-hotfix-$TS"
TMP="$(mktemp -d)"

FILES=(
  "app/admin/controllers/SuperAdminR2Controller.php"
  "app/admin/views/superadmin_r2/restaurants.blade.php"
  "app/admin/views/superadmin_r2/layout.blade.php"
)

cleanup(){ rm -rf "$TMP"; }
trap cleanup EXIT

sudo -n true
mkdir -p "$BACKUP"

echo "============================================================"
echo " PMD SUPER ADMIN R2 - DOMAIN CREATE + HEADER HOTFIX"
echo " Payload: $PAYLOAD_REF"
echo "============================================================"

echo
echo "1) Downloading immutable payload..."
for rel in "${FILES[@]}"; do
  mkdir -p "$TMP/$(dirname "$rel")"
  echo "GET  $rel"
  curl -fsSL "$RAW/$rel" -o "$TMP/$rel"
done

echo
echo "2) Pre-validating controller..."
php -l "$TMP/app/admin/controllers/SuperAdminR2Controller.php"
grep -q 'normalizeTenantDomainInput' "$TMP/app/admin/controllers/SuperAdminR2Controller.php"
grep -q 'restaurant.paymydine.com' "$TMP/app/admin/views/superadmin_r2/restaurants.blade.php"
if grep -Eq 'Platform administrator|class="user-pill"|class="avatar">SA' "$TMP/app/admin/views/superadmin_r2/layout.blade.php"; then
  echo "Refusing payload: old Super Admin identity pill is still present" >&2
  exit 1
fi

echo
echo "3) Backing up current live files..."
for rel in "${FILES[@]}"; do
  if sudo -n test -f "$ROOT/$rel"; then
    mkdir -p "$BACKUP/$(dirname "$rel")"
    sudo -n cp -a "$ROOT/$rel" "$BACKUP/$rel"
  fi
done

echo
echo "4) Installing hotfix..."
for rel in "${FILES[@]}"; do
  sudo -n mkdir -p "$ROOT/$(dirname "$rel")"
  sudo -n install -o root -g root -m 0644 "$TMP/$rel" "$ROOT/$rel"
  echo "OK   $rel"
done

echo
echo "5) Validating production controller..."
php -l "$ROOT/app/admin/controllers/SuperAdminR2Controller.php"
grep -q 'normalizeTenantDomainInput' "$ROOT/app/admin/controllers/SuperAdminR2Controller.php"

# The screenshot still showed the old SA identity pill even though the current
# Blade source no longer contains it. Clear compiled Blade views explicitly.
echo
echo "6) Clearing compiled Blade views..."
if [[ -f "$ROOT/artisan" ]]; then
  cd "$ROOT"
  if sudo -n -u www-data php artisan view:clear; then
    echo "Blade view cache cleared as www-data"
  else
    sudo -n php artisan view:clear
    echo "Blade view cache cleared as root fallback"
  fi
else
  echo "artisan not found; removing only compiled Blade PHP files"
  sudo -n find "$ROOT/storage/framework/views" -maxdepth 1 -type f -name '*.php' -delete
fi

if systemctl is-active --quiet php8.3-fpm 2>/dev/null; then
  echo
echo "7) Graceful PHP-FPM reload..."
  sudo -n systemctl reload php8.3-fpm
fi

echo
echo "8) Source verification..."
if grep -Eq 'Platform administrator|class="user-pill"|class="avatar">SA' "$ROOT/app/admin/views/superadmin_r2/layout.blade.php"; then
  echo "FAIL: old identity pill still exists in live layout" >&2
  exit 1
fi

grep -nE 'normalizeTenantDomainInput|isAllowedTenantDomain' "$ROOT/app/admin/controllers/SuperAdminR2Controller.php" | head -10
grep -n 'Tenant subdomain' "$ROOT/app/admin/views/superadmin_r2/restaurants.blade.php" | head -2

echo
echo "============================================================"
echo " HOTFIX COMPLETE"
echo "============================================================"
echo "Backup: $BACKUP"
echo "No tenant database was modified."
echo "Accepted create inputs now include: restaurant, restaurant.paymydine.com, https://restaurant.paymydine.com/"
echo "External domains remain rejected."
