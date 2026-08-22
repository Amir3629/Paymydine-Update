#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
PAYLOAD_REF="9d63bd56acd10584ba67a3889e43ae5dda3e0c87"
RAW_BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/${PAYLOAD_REF}"
TS="$(date +%Y%m%d-%H%M%S)"
BACKUP="$ROOT/storage/pmd-superadmin-health-create-fix-$TS"
TMP="$(mktemp -d)"
RESTORE=0

FILES=(
  "app/admin/controllers/SuperAdminR2Controller.php"
  "app/admin/views/superadmin_r2/dashboard.blade.php"
  "app/admin/views/superadmin_r2/restaurants.blade.php"
  "app/admin/views/superadmin_r2/health.blade.php"
  "app/admin/views/superadmin_r2/side_menu.blade.php"
)

cleanup() { rm -rf "$TMP"; }
rollback() {
  rc=$?
  if [ "$RESTORE" -eq 1 ]; then
    echo
    echo "DEPLOY FAILED - restoring Super Admin files..."
    for rel in "${FILES[@]}"; do
      if [ -f "$BACKUP/$rel" ]; then
        sudo -n mkdir -p "$ROOT/$(dirname "$rel")"
        sudo -n cp -a "$BACKUP/$rel" "$ROOT/$rel"
      fi
    done
    if systemctl is-active --quiet php8.3-fpm 2>/dev/null; then
      sudo -n systemctl reload php8.3-fpm >/dev/null 2>&1 || true
    fi
    echo "Rollback complete: $BACKUP"
  fi
  cleanup
  exit "$rc"
}
trap rollback ERR INT TERM
trap cleanup EXIT

echo "============================================================"
echo " PMD SUPER ADMIN - CREATE + HEALTH + RESTAURANT WORDING"
echo " Payload: $PAYLOAD_REF"
echo "============================================================"

echo
echo "1) Checking passwordless sudo..."
sudo -n true
echo "PASS"

echo
echo "2) Downloading ONLY the updated Super Admin files..."
for rel in "${FILES[@]}"; do
  mkdir -p "$TMP/$(dirname "$rel")"
  echo "GET  $rel"
  curl -fsSL "$RAW_BASE/$rel" -o "$TMP/$rel"
done

echo
echo "3) Pre-validating payload..."
php -l "$TMP/app/admin/controllers/SuperAdminR2Controller.php"
grep -Fq "ssl://127.0.0.1:443" "$TMP/app/admin/controllers/SuperAdminR2Controller.php"
grep -Fq "pmd_superadmin_r2_store_http_failed" "$TMP/app/admin/controllers/SuperAdminR2Controller.php"
if grep -Fq "Upcoming renewals" "$TMP/app/admin/views/superadmin_r2/dashboard.blade.php"; then
  echo "FAIL: old renewal card still exists in payload."
  exit 1
fi
grep -Fq "Restaurant registrations" "$TMP/app/admin/views/superadmin_r2/dashboard.blade.php"
grep -Fq "Restaurant Health" "$TMP/app/admin/views/superadmin_r2/side_menu.blade.php"
grep -Fq "Restaurant health" "$TMP/app/admin/views/superadmin_r2/health.blade.php"
grep -Fq "Restaurant subdomain" "$TMP/app/admin/views/superadmin_r2/restaurants.blade.php"
echo "PASS"

echo
echo "4) Backing up current production files..."
mkdir -p "$BACKUP"
for rel in "${FILES[@]}"; do
  if [ -f "$ROOT/$rel" ]; then
    mkdir -p "$BACKUP/$(dirname "$rel")"
    cp -a "$ROOT/$rel" "$BACKUP/$rel" 2>/dev/null || sudo -n cp -a "$ROOT/$rel" "$BACKUP/$rel"
  fi
done
echo "Backup: $BACKUP"
RESTORE=1

echo
echo "5) Installing updated Super Admin files..."
for rel in "${FILES[@]}"; do
  sudo -n mkdir -p "$ROOT/$(dirname "$rel")"
  sudo -n install -o root -g root -m 0644 "$TMP/$rel" "$ROOT/$rel"
  echo "OK   $rel"
done

echo
echo "6) Final validation..."
php -l "$ROOT/app/admin/controllers/SuperAdminR2Controller.php"
grep -Fq "ssl://127.0.0.1:443" "$ROOT/app/admin/controllers/SuperAdminR2Controller.php"
grep -Fq "Restaurant Health" "$ROOT/app/admin/views/superadmin_r2/side_menu.blade.php"
if grep -Fq "Upcoming renewals" "$ROOT/app/admin/views/superadmin_r2/dashboard.blade.php"; then
  echo "FAIL: renewal card still present after install."
  exit 1
fi
echo "PASS"

echo
echo "7) Gracefully reloading PHP-FPM..."
if systemctl is-active --quiet php8.3-fpm 2>/dev/null; then
  sudo -n systemctl reload php8.3-fpm
  echo "PASS"
else
  echo "php8.3-fpm is not active; no reload performed."
fi

echo
echo "8) Super Admin create-route ownership - READ ONLY..."
for f in "$ROOT/app/admin/ServiceProvider.php" "$ROOT/routes/pmd-superadmin-r2.php"; do
  [ -f "$f" ] || continue
  echo "===== $f ====="
  grep -nF "/superadmin/new/store" "$f" || true
done

echo
echo "9) Recent relevant errors - READ ONLY..."
LOG="$ROOT/storage/logs/system.log"
if [ -f "$LOG" ]; then
  grep -E "pmd_superadmin_r2_store_http_failed|pmd_superadmin_r2_tenant_create_failed|SuperAdminTenantIdentityBaseline|superadmin/new/store" "$LOG" | tail -n 30 || true
else
  echo "No system.log found."
fi

echo
echo "10) Public route observation - READ ONLY..."
for path in /superadmin/login /superadmin/health /superadmin/new; do
  printf '%s -> ' "$path"
  curl -skS -o /dev/null -D - "https://paymydine.com$path" | awk 'BEGIN{IGNORECASE=1}/^HTTP\//{code=$2}/^location:/{loc=$2}END{gsub("\r","",loc);printf "HTTP %s%s\n",code,(loc!=""?" redirect=" loc:"")}'
done

RESTORE=0

echo
echo "============================================================"
echo " SUPER ADMIN FIX DEPLOYED"
echo "============================================================"
echo "Backup: $BACKUP"
echo
echo "Changed:"
echo " - removed Upcoming renewals card"
echo " - full-width restaurant registration chart"
echo " - Restaurant wording in visible Super Admin UI"
echo " - Restaurant Health uses local Nginx TLS/SNI checks instead of slow external TLS round trips"
echo " - restaurant creation controller now catches/logs unexpected application errors instead of exposing a generic 500 where possible"
echo
echo "NOT changed by this deploy:"
echo " - central DB rows"
echo " - restaurant databases"
echo " - Nginx config"
echo " - Certbot"
echo " - Git checkout"
