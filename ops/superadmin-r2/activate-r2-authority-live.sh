#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
SP="$ROOT/app/admin/ServiceProvider.php"
ROUTES="$ROOT/app/admin/routes.php"
R2="$ROOT/routes/pmd-superadmin-r2.php"
TS="$(date +%Y%m%d-%H%M%S)"
BACKUP="$ROOT/storage/pmd-superadmin-r2-authority-$TS"
RESTORE=0

rollback() {
  rc=$?
  if [ "$RESTORE" -eq 1 ] && [ -f "$BACKUP/ServiceProvider.php" ]; then
    echo "R2 activation failed; restoring ServiceProvider.php"
    sudo -n cp -a "$BACKUP/ServiceProvider.php" "$SP"
    php -l "$SP" >/dev/null 2>&1 || true
    if systemctl is-active --quiet php8.3-fpm 2>/dev/null; then
      sudo -n systemctl reload php8.3-fpm >/dev/null 2>&1 || true
    fi
    echo "Rollback complete: $BACKUP"
  fi
  exit "$rc"
}
trap rollback ERR INT TERM

sudo -n true
[ -f "$SP" ] || { echo "Missing $SP" >&2; exit 1; }
[ -f "$R2" ] || { echo "Missing $R2" >&2; exit 1; }
grep -q 'PMD_SUPERADMIN_R2_ROUTE_LOADER' "$ROUTES" || { echo "R2 loader is not present in app/admin/routes.php" >&2; exit 1; }
grep -q 'PMD_SUPERADMIN_R2_ROUTE_AUTHORITY' "$R2" || { echo "R2 route authority file is invalid" >&2; exit 1; }

mkdir -p "$BACKUP"
sudo -n cp -a "$SP" "$BACKUP/ServiceProvider.php"
RESTORE=1

sudo -n python3 <<'PY'
from pathlib import Path
p = Path('/var/www/paymydine/app/admin/ServiceProvider.php')
s = p.read_text()
start_marker = '// PMD_SUPERADMIN_RECOVERY_R1_START'
end_marker = '// PMD_SUPERADMIN_RECOVERY_R1_END'
start = s.find(start_marker)
end = s.find(end_marker)
if start < 0 or end < 0 or end < start:
    raise SystemExit('R1 marker block not found; refusing to guess')
end += len(end_marker)
replacement = '''// PMD_SUPERADMIN_RECOVERY_R1_START
        // RETIRED_BY_PMD_SUPERADMIN_R2
        // R1 registered legacy SuperAdminController routes (including the 423
        // tenant-create lock) after app/admin/routes.php, shadowing R2.
        // R2 is now the single URI authority and is loaded at the end of
        // app/admin/routes.php from routes/pmd-superadmin-r2.php.
        // PMD_SUPERADMIN_RECOVERY_R1_END'''
p.write_text(s[:start] + replacement + s[end:])
print('Retired R1 Super Admin route block in ServiceProvider.php')
PY

php -l "$SP"
php -l "$ROUTES"
php -l "$R2"
php -l "$ROOT/app/admin/controllers/SuperAdminR2Controller.php"

if grep -q "Tenant creation is temporarily locked" "$SP"; then
  echo "R1 423 lock still present in ServiceProvider.php" >&2
  exit 1
fi

if systemctl is-active --quiet php8.3-fpm 2>/dev/null; then
  sudo -n systemctl reload php8.3-fpm
fi

RESTORE=0
trap - ERR INT TERM

echo "R2 authority activated"
echo "Backup: $BACKUP"
echo "No DB change. No Nginx change. No git pull/reset/checkout."
