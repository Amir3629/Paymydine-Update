#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
PAYLOAD_REF="f1389e0b74714ad6ccf10bec28da3c9c17712bfd"
RAW_BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/${PAYLOAD_REF}"
TS="$(date +%Y%m%d-%H%M%S)"
BACKUP="$ROOT/storage/pmd-superadmin-ui-r4-$TS"
TMP="$(mktemp -d)"
RESTORE=0

FILES=(
  "routes/pmd-superadmin-r2.php"
  "app/admin/views/superadmin_r2/layout.blade.php"
  "app/admin/views/superadmin_r2/dashboard.blade.php"
  "app/admin/views/superadmin_r2/restaurants.blade.php"
  "app/admin/views/superadmin_r2/edit.blade.php"
  "app/admin/views/superadmin_r2/settings.blade.php"
  "app/admin/views/superadmin_r2/location_requests.blade.php"
  "app/admin/views/superadmin_r2/login.blade.php"
  "app/admin/views/superadmin_r2/health.blade.php"
)

finish() {
  rc=$?
  if [[ "$rc" -ne 0 && "$RESTORE" -eq 1 ]]; then
    echo
    echo "!!! DEPLOY FAILED - RESTORING PREVIOUS SUPER ADMIN FILES !!!"
    for rel in "${FILES[@]}"; do
      if [[ -f "$BACKUP/$rel" ]]; then
        sudo -n mkdir -p "$ROOT/$(dirname "$rel")"
        sudo -n cp -a "$BACKUP/$rel" "$ROOT/$rel" || true
      fi
    done
    if systemctl is-active --quiet php8.3-fpm 2>/dev/null; then
      sudo -n systemctl reload php8.3-fpm >/dev/null 2>&1 || true
    fi
    echo "Rollback complete: $BACKUP"
  fi
  rm -rf "$TMP"
  exit "$rc"
}
trap finish EXIT

mkdir -p "$BACKUP" "$TMP"

echo "============================================================"
echo " PMD SUPER ADMIN R4 - UI + LOGIN + AUTH CLEANUP"
echo " Payload: $PAYLOAD_REF"
echo "============================================================"

echo
echo "1) Checking passwordless sudo..."
sudo -n true
echo "PASS"

echo
echo "2) Downloading ONLY Super Admin R4 files..."
for rel in "${FILES[@]}"; do
  mkdir -p "$TMP/$(dirname "$rel")"
  echo "GET  $rel"
  curl -fsSL "$RAW_BASE/$rel" -o "$TMP/$rel"
done

echo
echo "3) Pre-validating route authority and UI fingerprints..."
php -l "$TMP/routes/pmd-superadmin-r2.php"
grep -Fq 'SuperAdminAuth::class' "$TMP/routes/pmd-superadmin-r2.php"
! grep -Fq "Route::middleware('superadmin.auth')" "$TMP/routes/pmd-superadmin-r2.php"
grep -Fq 'pmd-line-chart' "$TMP/app/admin/views/superadmin_r2/dashboard.blade.php"
! grep -Fq '.pmd-kpi:after' "$TMP/app/admin/views/superadmin_r2/dashboard.blade.php"
grep -Fq 'Create a new restaurant' "$TMP/app/admin/views/superadmin_r2/restaurants.blade.php"
! grep -Fq '>Database<' "$TMP/app/admin/views/superadmin_r2/restaurants.blade.php"
! grep -Fq 'Plan / type' "$TMP/app/admin/views/superadmin_r2/restaurants.blade.php"
! grep -Fq 'Creates a clean tenant database' "$TMP/app/admin/views/superadmin_r2/restaurants.blade.php"
! grep -Fq 'These values belong to the central Super Admin record' "$TMP/app/admin/views/superadmin_r2/settings.blade.php"
! grep -Fq 'This section remains read-only' "$TMP/app/admin/views/superadmin_r2/location_requests.blade.php"
grep -Fq 'pmd-login-logo.svg?v=1786106529' "$TMP/app/admin/views/superadmin_r2/login.blade.php"
echo "PASS"

echo
echo "4) Backing up current production Super Admin files..."
for rel in "${FILES[@]}"; do
  if sudo -n test -f "$ROOT/$rel"; then
    mkdir -p "$BACKUP/$(dirname "$rel")"
    sudo -n cp -a "$ROOT/$rel" "$BACKUP/$rel"
  fi
done
echo "Backup: $BACKUP"

RESTORE=1

echo
echo "5) Installing R4..."
for rel in "${FILES[@]}"; do
  sudo -n mkdir -p "$ROOT/$(dirname "$rel")"
  sudo -n install -o root -g root -m 0644 "$TMP/$rel" "$ROOT/$rel"
  echo "OK   $rel"
done

echo
echo "6) Final validation..."
php -l "$ROOT/routes/pmd-superadmin-r2.php"
grep -Fq 'SuperAdminAuth::class' "$ROOT/routes/pmd-superadmin-r2.php"
grep -Fq 'pmd-line-chart' "$ROOT/app/admin/views/superadmin_r2/dashboard.blade.php"
grep -Fq 'Create a new restaurant' "$ROOT/app/admin/views/superadmin_r2/restaurants.blade.php"
grep -Fq 'pmd-login-logo.svg?v=1786106529' "$ROOT/app/admin/views/superadmin_r2/login.blade.php"
echo "PASS"

echo
echo "7) Gracefully reloading PHP-FPM..."
if systemctl is-active --quiet php8.3-fpm 2>/dev/null; then
  sudo -n systemctl reload php8.3-fpm
  echo "PASS"
else
  echo "php8.3-fpm not active; reload skipped"
fi

echo
echo "8) Unauthenticated route check - protected routes must redirect, never 500..."
for path in /superadmin/index /superadmin/new /superadmin/health /superadmin/settings /superadmin/location-requests; do
  headers="$(curl -skS --resolve paymydine.com:443:127.0.0.1 -D - -o /dev/null "https://paymydine.com${path}" || true)"
  code="$(printf '%s\n' "$headers" | awk '/^HTTP\//{code=$2} END{print code}')"
  location="$(printf '%s\n' "$headers" | awk 'BEGIN{IGNORECASE=1}/^Location:/{sub(/\r$/,""); print $2; exit}')"
  echo "$path -> HTTP ${code:-unknown} ${location:+redirect=$location}"
  if [[ "${code:-}" == "500" ]]; then
    echo "FAIL: $path still returns HTTP 500 without a session"
    exit 1
  fi
done

echo
echo "9) Login observation..."
login_html="$(curl -skS --resolve paymydine.com:443:127.0.0.1 https://paymydine.com/superadmin/login || true)"
printf '%s' "$login_html" | grep -Fq 'pmd-login-logo.svg?v=1786106529'
echo "LOGIN_UI_READY"

RESTORE=0

echo
echo "============================================================"
echo " SUPER ADMIN R4 DEPLOY COMPLETE"
echo "============================================================"
echo "Backup: $BACKUP"
echo "No database rows changed."
echo "No tenant databases changed."
echo "No Nginx config changed."
echo "No Certbot changes."
echo "No git pull/reset/checkout."
