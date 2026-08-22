#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
PAYLOAD_REF="ed35747e84a21a845f5196e91821eaf1edbe48b4"
RAW_BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/${PAYLOAD_REF}"
TS="$(date +%Y%m%d-%H%M%S)"
BACKUP="$ROOT/storage/pmd-superadmin-overview-refine-$TS"
TMP="$(mktemp -d)"
RESTORE=0

FILES=(
  "app/admin/views/superadmin_r2/layout.blade.php"
  "app/admin/views/superadmin_r2/dashboard.blade.php"
  "app/admin/views/superadmin_r2/restaurants.blade.php"
  "app/admin/controllers/SuperAdminR2Controller.php"
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
echo " PMD SUPER ADMIN - OVERVIEW + CLEAN SHELL + PAGINATION"
echo " Payload: $PAYLOAD_REF"
echo "============================================================"

echo
echo "1) Checking passwordless sudo..."
sudo -n true
echo "PASS"

echo
echo "2) Downloading ONLY the four Super Admin files..."
for rel in "${FILES[@]}"; do
  mkdir -p "$TMP/$(dirname "$rel")"
  echo "GET  $rel"
  curl -fsSL "$RAW_BASE/$rel" -o "$TMP/$rel"
done

echo
echo "3) Pre-validating controller + requested UI fingerprints..."
php -l "$TMP/app/admin/controllers/SuperAdminR2Controller.php"
grep -Fq 'paginate(20)' "$TMP/app/admin/controllers/SuperAdminR2Controller.php"
grep -Fq 'Tenant registrations' "$TMP/app/admin/views/superadmin_r2/dashboard.blade.php"
grep -Fq 'Tenant status' "$TMP/app/admin/views/superadmin_r2/dashboard.blade.php"
! grep -Fq '+ Create restaurant</a>' "$TMP/app/admin/views/superadmin_r2/dashboard.blade.php"
! grep -Fq '<header class="topbar">' "$TMP/app/admin/views/superadmin_r2/layout.blade.php"
grep -Fq 'pmd-page-links' "$TMP/app/admin/views/superadmin_r2/restaurants.blade.php"
grep -Fq 'Maximum 20 restaurants per page.' "$TMP/app/admin/views/superadmin_r2/restaurants.blade.php"
echo "PASS"

echo
echo "4) Backing up current production files..."
for rel in "${FILES[@]}"; do
  if sudo -n test -f "$ROOT/$rel"; then
    mkdir -p "$BACKUP/$(dirname "$rel")"
    sudo -n cp -a "$ROOT/$rel" "$BACKUP/$rel"
  fi
done
echo "Backup: $BACKUP"

RESTORE=1

echo
echo "5) Installing refined Super Admin..."
for rel in "${FILES[@]}"; do
  sudo -n mkdir -p "$ROOT/$(dirname "$rel")"
  sudo -n install -o root -g root -m 0644 "$TMP/$rel" "$ROOT/$rel"
  echo "OK   $rel"
done

echo
echo "6) Final validation..."
php -l "$ROOT/app/admin/controllers/SuperAdminR2Controller.php"
grep -Fq 'paginate(20)' "$ROOT/app/admin/controllers/SuperAdminR2Controller.php"
grep -Fq 'Tenant registrations' "$ROOT/app/admin/views/superadmin_r2/dashboard.blade.php"
grep -Fq 'Tenant status' "$ROOT/app/admin/views/superadmin_r2/dashboard.blade.php"
! grep -Fq '<header class="topbar">' "$ROOT/app/admin/views/superadmin_r2/layout.blade.php"
grep -Fq 'pmd-page-links' "$ROOT/app/admin/views/superadmin_r2/restaurants.blade.php"
echo "PASS"

echo
echo "7) Gracefully reloading PHP-FPM..."
if systemctl is-active --quiet php8.3-fpm 2>/dev/null; then
  sudo -n systemctl reload php8.3-fpm
  echo "PASS"
else
  echo "php8.3-fpm not active; reload skipped"
fi

RESTORE=0

echo
echo "8) Runtime route observation - READ ONLY..."
for path in /superadmin/index /superadmin/new /superadmin/health /superadmin/settings; do
  code="$(curl -skS --resolve paymydine.com:443:127.0.0.1 -o /dev/null -w '%{http_code}' "https://paymydine.com${path}" || true)"
  echo "$path -> HTTP $code"
done

echo
echo "9) Installed UI evidence..."
echo "Dashboard charts:"
grep -oE 'Tenant registrations|Tenant status|Latest restaurants' "$ROOT/app/admin/views/superadmin_r2/dashboard.blade.php" | sort -u
echo "Restaurants pagination:"
grep -oE 'paginate\(20\)|pmd-page-links|Maximum 20 restaurants per page\.' "$ROOT/app/admin/controllers/SuperAdminR2Controller.php" "$ROOT/app/admin/views/superadmin_r2/restaurants.blade.php" | sort -u
echo "Duplicate top header count:"
if grep -Fq '<header class="topbar">' "$ROOT/app/admin/views/superadmin_r2/layout.blade.php"; then
  echo "1"
else
  echo "0"
fi

echo
echo "============================================================"
echo " SUPER ADMIN OVERVIEW REFINE COMPLETE"
echo "============================================================"
echo "Backup: $BACKUP"
echo "No database rows changed."
echo "No tenant databases changed."
echo "No Nginx config changed."
echo "No Certbot changes."
echo "No git pull/reset/checkout."
