#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
PAYLOAD_REF="254177a23ec994549c620f85709dad51ee71d98f"
RAW="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/${PAYLOAD_REF}"
DOMAIN="${1:-kult.paymydine.com}"
TS="$(date +%Y%m%d-%H%M%S)"
BACKUP="$ROOT/storage/pmd-superadmin-r2-repair-$TS"
TMP="$(mktemp -d)"
RESTORE=0

APP_FILES=(
  "app/admin/views/superadmin_r2/side_menu.blade.php"
  "app/admin/views/superadmin_r2/layout.blade.php"
  "app/admin/controllers/SuperAdminR2Controller.php"
  "app/admin/views/superadmin_r2/health.blade.php"
)

cleanup(){ rm -rf "$TMP"; }
rollback(){
  rc=$?
  if [[ "$RESTORE" -eq 1 ]]; then
    echo
    echo "!!! R2 REPAIR FAILED - RESTORING APP FILES !!!"
    for rel in "${APP_FILES[@]}"; do
      if [[ -f "$BACKUP/files/$rel" ]]; then
        sudo -n mkdir -p "$ROOT/$(dirname "$rel")"
        sudo -n cp -a "$BACKUP/files/$rel" "$ROOT/$rel"
      fi
    done
    if [[ -f "$BACKUP/pmd-tenant-provision.helper" ]]; then
      sudo -n cp -a "$BACKUP/pmd-tenant-provision.helper" /usr/local/sbin/pmd-tenant-provision
    else
      sudo -n rm -f /usr/local/sbin/pmd-tenant-provision
    fi
    if [[ -f "$BACKUP/pmd-tenant-provision.sudoers" ]]; then
      sudo -n cp -a "$BACKUP/pmd-tenant-provision.sudoers" /etc/sudoers.d/pmd-tenant-provision
    else
      sudo -n rm -f /etc/sudoers.d/pmd-tenant-provision
    fi
    php -l "$ROOT/app/admin/controllers/SuperAdminR2Controller.php" >/dev/null 2>&1 || true
    if systemctl is-active --quiet php8.3-fpm 2>/dev/null; then
      sudo -n systemctl reload php8.3-fpm >/dev/null 2>&1 || true
    fi
    echo "Application rollback completed: $BACKUP"
    echo "Note: tenant vhost/TLS rollback is independently handled inside the provisioning helper."
  fi
  cleanup
  exit "$rc"
}
trap rollback ERR INT TERM
trap cleanup EXIT

[[ "$DOMAIN" =~ ^[a-z0-9-]+\.paymydine\.com$ ]] || { echo "Invalid domain: $DOMAIN" >&2; exit 1; }
[[ -d "$ROOT" ]] || { echo "PayMyDine root missing" >&2; exit 1; }
sudo -n true

mkdir -p "$BACKUP/files"

FILES=("${APP_FILES[@]}" "ops/superadmin-r2/pmd-tenant-provision")

echo "============================================================"
echo " PMD SUPER ADMIN R2 - TLS + EXACT ADMIN SHELL REPAIR"
echo " Domain: $DOMAIN"
echo " Payload: $PAYLOAD_REF"
echo "============================================================"

echo
echo "1) Downloading immutable repair payload..."
for rel in "${FILES[@]}"; do
  mkdir -p "$TMP/$(dirname "$rel")"
  echo "GET  $rel"
  curl -fsSL "$RAW/$rel" -o "$TMP/$rel"
done

echo
echo "2) Pre-validating payload..."
php -l "$TMP/app/admin/controllers/SuperAdminR2Controller.php"
bash -n "$TMP/ops/superadmin-r2/pmd-tenant-provision"

echo
echo "3) Backing up current R2 files/helper..."
for rel in "${APP_FILES[@]}"; do
  if sudo -n test -f "$ROOT/$rel"; then
    mkdir -p "$BACKUP/files/$(dirname "$rel")"
    sudo -n cp -a "$ROOT/$rel" "$BACKUP/files/$rel"
  fi
done
if sudo -n test -f /usr/local/sbin/pmd-tenant-provision; then
  sudo -n cp -a /usr/local/sbin/pmd-tenant-provision "$BACKUP/pmd-tenant-provision.helper"
fi
if sudo -n test -f /etc/sudoers.d/pmd-tenant-provision; then
  sudo -n cp -a /etc/sudoers.d/pmd-tenant-provision "$BACKUP/pmd-tenant-provision.sudoers"
fi
RESTORE=1

echo
echo "4) Installing exact Admin Side Menu R2 files..."
for rel in "${APP_FILES[@]}"; do
  sudo -n mkdir -p "$ROOT/$(dirname "$rel")"
  sudo -n install -o root -g root -m 0644 "$TMP/$rel" "$ROOT/$rel"
  echo "OK   $rel"
done

echo
echo "5) Installing privileged tenant provisioning helper..."
sudo -n install -o root -g root -m 0755 "$TMP/ops/superadmin-r2/pmd-tenant-provision" /usr/local/sbin/pmd-tenant-provision
sudo -n tee /etc/sudoers.d/pmd-tenant-provision >/dev/null <<'SUDOERS'
# PayMyDine Super Admin R2: web worker may run only the root-owned validated tenant provisioner.
www-data ALL=(root) NOPASSWD: /usr/local/sbin/pmd-tenant-provision *
SUDOERS
sudo -n chmod 0440 /etc/sudoers.d/pmd-tenant-provision
sudo -n visudo -cf /etc/sudoers.d/pmd-tenant-provision
sudo -n test -x /usr/local/sbin/pmd-tenant-provision

echo
echo "6) Final PHP validation + graceful PHP-FPM reload..."
php -l "$ROOT/app/admin/controllers/SuperAdminR2Controller.php"
if systemctl is-active --quiet php8.3-fpm 2>/dev/null; then
  sudo -n systemctl reload php8.3-fpm
fi

echo
echo "7) DNS preflight..."
getent ahostsv4 "$DOMAIN" | sed -n '1,8p' || true

echo
echo "8) Provisioning exact Nginx vhost + Let's Encrypt TLS..."
sudo -n /usr/local/sbin/pmd-tenant-provision "$DOMAIN"

echo
echo "9) Certificate presented by Nginx for $DOMAIN..."
echo | openssl s_client -connect 127.0.0.1:443 -servername "$DOMAIN" 2>/dev/null \
  | openssl x509 -noout -subject -issuer -dates -ext subjectAltName

echo
echo "10) Strict HTTPS verification through local Nginx..."
curl -sS --resolve "$DOMAIN:443:127.0.0.1" -D - -o /dev/null "https://$DOMAIN/" \
  | grep -Ei '^(HTTP/|location:|content-type:|server:|x-pmd-)' || true

echo
echo "11) Admin routing on repaired tenant..."
curl -sS --resolve "$DOMAIN:443:127.0.0.1" -D - -o /dev/null "https://$DOMAIN/admin" \
  | grep -Ei '^(HTTP/|location:|content-type:|server:|x-pmd-)' || true

RESTORE=0
trap - ERR INT TERM

echo
echo "============================================================"
echo " REPAIR COMPLETE"
echo "============================================================"
echo "Backup: $BACKUP"
echo "Tenant URL: https://$DOMAIN"
echo "Super Admin: https://test.paymydine.com/superadmin"
echo "No git pull/reset/checkout was performed."
