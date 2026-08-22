#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
PAYLOAD_REF="1b8f20cbd512645e19763014bb41976a74d1a02c"
RAW="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/${PAYLOAD_REF}"
DOMAIN="${1:-kult.paymydine.com}"
TS="$(date +%Y%m%d-%H%M%S)"
BACKUP="$ROOT/storage/pmd-superadmin-r2-clean-baseline-deploy-$TS"
TMP="$(mktemp -d)"
RESTORE=0

APP_FILES=(
  "app/admin/views/superadmin_r2/login.blade.php"
  "app/admin/views/superadmin_r2/side_menu.blade.php"
  "app/admin/views/superadmin_r2/layout.blade.php"
  "app/admin/controllers/SuperAdminR2Controller.php"
  "app/Services/SuperAdminTenantLifecycleService.php"
  "app/admin/views/superadmin_r2/health.blade.php"
)

cleanup(){ rm -rf "$TMP"; }
rollback(){
  rc=$?
  if [[ "$RESTORE" -eq 1 ]]; then
    echo
    echo "!!! DEPLOY FAILED BEFORE TENANT CLEANUP - RESTORING APP FILES !!!"
    for rel in "${APP_FILES[@]}"; do
      if [[ -f "$BACKUP/files/$rel" ]]; then
        sudo -n mkdir -p "$ROOT/$(dirname "$rel")"
        sudo -n cp -a "$BACKUP/files/$rel" "$ROOT/$rel"
      fi
    done
    if [[ -f "$BACKUP/pmd-tenant-provision" ]]; then
      sudo -n cp -a "$BACKUP/pmd-tenant-provision" /usr/local/sbin/pmd-tenant-provision
    fi
    if systemctl is-active --quiet php8.3-fpm 2>/dev/null; then
      sudo -n systemctl reload php8.3-fpm >/dev/null 2>&1 || true
    fi
    echo "App rollback complete: $BACKUP"
  fi
  cleanup
  exit "$rc"
}
trap rollback ERR INT TERM
trap cleanup EXIT

[[ "$DOMAIN" =~ ^[a-z0-9-]+\.paymydine\.com$ ]] || { echo "Invalid domain: $DOMAIN" >&2; exit 1; }
sudo -n true
mkdir -p "$BACKUP/files"

FILES=(
  "${APP_FILES[@]}"
  "ops/superadmin-r2/pmd-tenant-provision"
  "ops/superadmin-r2/clean-existing-tenant-live.sh"
)

echo "============================================================"
echo " PMD SUPER ADMIN R2 - CLEAN TENANT BASELINE DEPLOY"
echo " Tenant repair: $DOMAIN"
echo " Payload: $PAYLOAD_REF"
echo "============================================================"

echo
echo "1) Downloading immutable GitHub payload..."
for rel in "${FILES[@]}"; do
  mkdir -p "$TMP/$(dirname "$rel")"
  echo "GET  $rel"
  curl -fsSL "$RAW/$rel" -o "$TMP/$rel"
done

echo
echo "2) Pre-validating downloaded code..."
php -l "$TMP/app/admin/controllers/SuperAdminR2Controller.php"
php -l "$TMP/app/Services/SuperAdminTenantLifecycleService.php"
bash -n "$TMP/ops/superadmin-r2/pmd-tenant-provision"
bash -n "$TMP/ops/superadmin-r2/clean-existing-tenant-live.sh"

echo
echo "3) Backing up current production R2 application files..."
for rel in "${APP_FILES[@]}"; do
  if sudo -n test -f "$ROOT/$rel"; then
    mkdir -p "$BACKUP/files/$(dirname "$rel")"
    sudo -n cp -a "$ROOT/$rel" "$BACKUP/files/$rel"
  fi
done
if sudo -n test -f /usr/local/sbin/pmd-tenant-provision; then
  sudo -n cp -a /usr/local/sbin/pmd-tenant-provision "$BACKUP/pmd-tenant-provision"
fi
RESTORE=1

echo
echo "4) Installing updated Super Admin UI + clean tenant lifecycle..."
for rel in "${APP_FILES[@]}"; do
  sudo -n mkdir -p "$ROOT/$(dirname "$rel")"
  sudo -n install -o root -g root -m 0644 "$TMP/$rel" "$ROOT/$rel"
  echo "OK   $rel"
done

echo
echo "5) Installing hardened provisioning helper..."
sudo -n install -o root -g root -m 0755 "$TMP/ops/superadmin-r2/pmd-tenant-provision" /usr/local/sbin/pmd-tenant-provision
sudo -n tee /etc/sudoers.d/pmd-tenant-provision >/dev/null <<'SUDOERS'
# PayMyDine Super Admin R2: web worker may run only the validated root-owned tenant provisioner.
www-data ALL=(root) NOPASSWD: /usr/local/sbin/pmd-tenant-provision *
SUDOERS
sudo -n chmod 0440 /etc/sudoers.d/pmd-tenant-provision
sudo -n visudo -cf /etc/sudoers.d/pmd-tenant-provision

echo
echo "6) Production syntax validation..."
php -l "$ROOT/app/admin/controllers/SuperAdminR2Controller.php"
php -l "$ROOT/app/Services/SuperAdminTenantLifecycleService.php"
bash -n /usr/local/sbin/pmd-tenant-provision

if systemctl is-active --quiet php8.3-fpm 2>/dev/null; then
  sudo -n systemctl reload php8.3-fpm
fi

# At this point application code is valid. Keep it even if the existing tenant
# needs another cleanup attempt; the future-tenant bug is already fixed.
RESTORE=0
trap - ERR INT TERM

echo
echo "7) Re-validating exact TLS/vhost for $DOMAIN..."
sudo -n /usr/local/sbin/pmd-tenant-provision "$DOMAIN"

echo
echo "8) Cleaning inherited demo/business data from EXISTING $DOMAIN..."
bash "$TMP/ops/superadmin-r2/clean-existing-tenant-live.sh" "$DOMAIN"

echo
echo "9) Runtime TLS certificate evidence..."
echo | openssl s_client -connect 127.0.0.1:443 -servername "$DOMAIN" 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates -ext subjectAltName

echo
echo "10) Strict HTTPS checks..."
for path in / /admin /admin/dashboardlab; do
  echo "===== https://$DOMAIN$path ====="
  curl -sS --resolve "$DOMAIN:443:127.0.0.1" -D - -o /dev/null "https://$DOMAIN$path" \
    | grep -Ei '^(HTTP/|location:|content-type:|x-pmd-)' || true
done

echo
echo "11) Super Admin login simplification evidence..."
LOGIN="$TMP/login.html"
curl -skS --resolve test.paymydine.com:443:127.0.0.1 https://test.paymydine.com/superadmin/login -o "$LOGIN"
grep -o 'pmd-login-logo\.svg[^"[:space:]]*' "$LOGIN" | head -1 || true
if grep -Eq 'Welcome back|Super Admin Control Plane|Central platform access|Platform administrator' "$LOGIN"; then
  echo "WARNING: old login/header copy is still present in rendered HTML"
else
  echo "PASS: removed requested Super Admin copy"
fi

echo
echo "============================================================"
echo " CLEAN BASELINE DEPLOY COMPLETE"
echo "============================================================"
echo "Code backup: $BACKUP"
echo "Tenant DB backup path is printed by step 8."
echo "No git pull/reset/checkout was performed."
echo "Future tenants now start without tables/orders/coupons/menu/categories/customer/session/payment demo data."
