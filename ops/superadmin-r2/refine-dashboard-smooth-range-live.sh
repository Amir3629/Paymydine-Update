#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
PAYLOAD_REF="1803166bf8dd90dd576ba59840dbcea87ba26fdc"
RAW_BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/${PAYLOAD_REF}"
TS="$(date +%Y%m%d-%H%M%S)"
BACKUP="$ROOT/storage/pmd-superadmin-dashboard-smooth-range-$TS"
TMP="$(mktemp -d)"
RESTORE=0

FILES=(
  "app/admin/controllers/SuperAdminR2DashboardController.php"
  "routes/pmd-superadmin-r2.php"
  "app/admin/views/superadmin_r2/dashboard.blade.php"
)

cleanup() { rm -rf "$TMP"; }
rollback() {
  rc=$?
  if [ "$RESTORE" -eq 1 ]; then
    echo
    echo "DEPLOY FAILED - restoring previous dashboard files..."
    for rel in "${FILES[@]}"; do
      if [ -f "$BACKUP/$rel" ]; then
        sudo -n mkdir -p "$ROOT/$(dirname "$rel")"
        sudo -n cp -a "$BACKUP/$rel" "$ROOT/$rel"
      elif [ -f "$ROOT/$rel" ] && [ "$rel" = "app/admin/controllers/SuperAdminR2DashboardController.php" ]; then
        sudo -n rm -f "$ROOT/$rel"
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

cd "$ROOT"

echo "============================================================"
echo " PMD SUPER ADMIN - SMOOTH CHART + DATE RANGE"
echo " Payload: $PAYLOAD_REF"
echo "============================================================"

echo
echo "1) Checking sudo..."
sudo -n true
echo "PASS"

echo
echo "2) Downloading immutable dashboard payload..."
for rel in "${FILES[@]}"; do
  mkdir -p "$TMP/$(dirname "$rel")"
  echo "GET  $rel"
  curl -fsSL "$RAW_BASE/$rel" -o "$TMP/$rel"
done

echo
echo "3) Pre-validating..."
php -l "$TMP/app/admin/controllers/SuperAdminR2DashboardController.php"
php -l "$TMP/routes/pmd-superadmin-r2.php"
grep -Fq "SuperAdminR2DashboardController" "$TMP/routes/pmd-superadmin-r2.php"
grep -Fq "pmd-chart-toolbar" "$TMP/app/admin/views/superadmin_r2/dashboard.blade.php"
grep -Fq "pmd-line-path" "$TMP/app/admin/views/superadmin_r2/dashboard.blade.php"
grep -Fq "MAX_CHART_MONTHS" "$TMP/app/admin/controllers/SuperAdminR2DashboardController.php"
echo "PASS"

echo
echo "4) Backing up current files..."
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
echo "5) Installing..."
for rel in "${FILES[@]}"; do
  sudo -n mkdir -p "$ROOT/$(dirname "$rel")"
  sudo -n install -o root -g root -m 0644 "$TMP/$rel" "$ROOT/$rel"
  echo "OK   $rel"
done

echo
echo "6) Final validation..."
php -l "$ROOT/app/admin/controllers/SuperAdminR2DashboardController.php"
php -l "$ROOT/routes/pmd-superadmin-r2.php"
grep -Fq "SuperAdminR2DashboardController::class, 'dashboard'" "$ROOT/routes/pmd-superadmin-r2.php"
grep -Fq "name=\"from\"" "$ROOT/app/admin/views/superadmin_r2/dashboard.blade.php"
grep -Fq "name=\"to\"" "$ROOT/app/admin/views/superadmin_r2/dashboard.blade.php"
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
echo "8) Public route observation - READ ONLY..."
for url in \
  "https://paymydine.com/superadmin/index" \
  "https://paymydine.com/superadmin/index?from=2026-01-01&to=2026-08-22"; do
  printf '%s -> ' "$url"
  curl -skS -o /dev/null -D - "$url" | awk 'BEGIN{IGNORECASE=1}/^HTTP\//{code=$2}/^location:/{loc=$2}END{gsub("\r","",loc);printf "HTTP %s%s\n",code,(loc!=""?" redirect=" loc:"")}'
done

RESTORE=0

echo
echo "============================================================"
echo " DASHBOARD UI UPDATE COMPLETE"
echo "============================================================"
echo "Backup: $BACKUP"
echo
echo "Changed:"
echo " - smooth curved registration line"
echo " - small unobtrusive data points"
echo " - shorter chart height"
echo " - From / To date range toolbar"
echo " - chart range capped at 12 months for readability"
echo
echo "NOT changed:"
echo " - database rows"
echo " - restaurant databases"
echo " - Nginx"
echo " - Certbot"
echo " - Git checkout"
