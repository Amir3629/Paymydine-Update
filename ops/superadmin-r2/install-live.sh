#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
REF="42ba748a9f90bede13a50930c24d59007d726c50"
RAW="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/${REF}"
TS="$(date +%Y%m%d-%H%M%S)"
BACKUP="$ROOT/storage/pmd-superadmin-r2/$TS"
TMP="$(mktemp -d)"
RESTORE_NEEDED=1

say(){ printf '\n== %s ==\n' "$*"; }
fail(){ echo "ERROR: $*" >&2; exit 1; }

APP_FILES=(
  "routes/pmd-superadmin-r2.php"
  "app/admin/controllers/SuperAdminR2Controller.php"
  "app/Services/SuperAdminTenantLifecycleService.php"
  "app/Services/SuperAdminTenantDomainProvisioner.php"
  "app/admin/views/superadmin_r2/layout.blade.php"
  "app/admin/views/superadmin_r2/login.blade.php"
  "app/admin/views/superadmin_r2/dashboard.blade.php"
  "app/admin/views/superadmin_r2/restaurants.blade.php"
  "app/admin/views/superadmin_r2/edit.blade.php"
  "app/admin/views/superadmin_r2/health.blade.php"
  "app/admin/views/superadmin_r2/settings.blade.php"
  "app/admin/views/superadmin_r2/location_requests.blade.php"
)

cleanup_tmp(){ rm -rf "$TMP"; }

rollback(){
  local rc=$?
  if [[ "$RESTORE_NEEDED" -eq 1 && -d "$BACKUP" ]]; then
    echo
    echo "!!! R2 INSTALL FAILED - RESTORING BACKUP !!!"

    [[ -f "$BACKUP/routes.php" ]] && cp -a "$BACKUP/routes.php" "$ROOT/app/admin/routes.php"
    [[ -f "$BACKUP/next-proxy.php" ]] && cp -a "$BACKUP/next-proxy.php" "$ROOT/app/main/routes/next-proxy.php"
    [[ -f "$BACKUP/test.paymydine.com.conf" ]] && sudo cp -a "$BACKUP/test.paymydine.com.conf" /etc/nginx/sites-available/test.paymydine.com.conf

    if [[ -f "$BACKUP/pmd-tenant-provision.sudoers" ]]; then
      sudo cp -a "$BACKUP/pmd-tenant-provision.sudoers" /etc/sudoers.d/pmd-tenant-provision
    else
      sudo rm -f /etc/sudoers.d/pmd-tenant-provision
    fi

    if [[ -f "$BACKUP/pmd-tenant-provision.helper" ]]; then
      sudo cp -a "$BACKUP/pmd-tenant-provision.helper" /usr/local/sbin/pmd-tenant-provision
    else
      sudo rm -f /usr/local/sbin/pmd-tenant-provision
    fi

    for rel in "${APP_FILES[@]}"; do
      if [[ -f "$BACKUP/files/$rel" ]]; then
        install -D -m 0644 "$BACKUP/files/$rel" "$ROOT/$rel"
      else
        rm -f "$ROOT/$rel"
      fi
    done

    sudo nginx -t >/dev/null 2>&1 && sudo systemctl reload nginx >/dev/null 2>&1 || true
    echo "Rollback completed. Backup: $BACKUP"
  fi
  cleanup_tmp
  exit "$rc"
}
trap rollback ERR INT TERM
trap cleanup_tmp EXIT

[[ -d "$ROOT" ]] || fail "PayMyDine root not found"
command -v curl >/dev/null || fail "curl missing"
command -v php >/dev/null || fail "php missing"
command -v python3 >/dev/null || fail "python3 missing"

mkdir -p "$BACKUP/files"

FILES=("${APP_FILES[@]}" "ops/superadmin-r2/pmd-tenant-provision")

say "Downloading immutable R2 payload $REF"
for rel in "${FILES[@]}"; do
  mkdir -p "$TMP/$(dirname "$rel")"
  curl -fsSL "$RAW/$rel" -o "$TMP/$rel"
done

say "Pre-validating downloaded PHP and helper"
php -l "$TMP/routes/pmd-superadmin-r2.php"
php -l "$TMP/app/admin/controllers/SuperAdminR2Controller.php"
php -l "$TMP/app/Services/SuperAdminTenantLifecycleService.php"
php -l "$TMP/app/Services/SuperAdminTenantDomainProvisioner.php"
bash -n "$TMP/ops/superadmin-r2/pmd-tenant-provision"

say "Backing up live authorities and any previous R2 files"
cp -a "$ROOT/app/admin/routes.php" "$BACKUP/routes.php"
cp -a "$ROOT/app/main/routes/next-proxy.php" "$BACKUP/next-proxy.php"
for rel in "${APP_FILES[@]}"; do
  if [[ -f "$ROOT/$rel" ]]; then
    mkdir -p "$BACKUP/files/$(dirname "$rel")"
    cp -a "$ROOT/$rel" "$BACKUP/files/$rel"
  fi
done
if [[ -f /etc/nginx/sites-available/test.paymydine.com.conf ]]; then
  sudo cp -a /etc/nginx/sites-available/test.paymydine.com.conf "$BACKUP/test.paymydine.com.conf"
fi
if [[ -f /etc/sudoers.d/pmd-tenant-provision ]]; then
  sudo cp -a /etc/sudoers.d/pmd-tenant-provision "$BACKUP/pmd-tenant-provision.sudoers"
fi
if [[ -f /usr/local/sbin/pmd-tenant-provision ]]; then
  sudo cp -a /usr/local/sbin/pmd-tenant-provision "$BACKUP/pmd-tenant-provision.helper"
fi

say "Installing isolated R2 application files"
for rel in "${APP_FILES[@]}"; do
  install -D -m 0644 "$TMP/$rel" "$ROOT/$rel"
done

say "Installing privileged provisioning helper"
sudo install -o root -g root -m 0755 "$TMP/ops/superadmin-r2/pmd-tenant-provision" /usr/local/sbin/pmd-tenant-provision
sudo tee /etc/sudoers.d/pmd-tenant-provision >/dev/null <<'SUDOERS'
# PayMyDine Super Admin R2 - only this validated root-owned helper may run as root.
www-data ALL=(root) NOPASSWD: /usr/local/sbin/pmd-tenant-provision *
SUDOERS
sudo chmod 0440 /etc/sudoers.d/pmd-tenant-provision
sudo visudo -cf /etc/sudoers.d/pmd-tenant-provision

say "Loading canonical R2 routes after legacy route modules"
python3 <<'PY'
from pathlib import Path
p=Path('/var/www/paymydine/app/admin/routes.php')
s=p.read_text()
mark='// PMD_SUPERADMIN_R2_ROUTE_LOADER'
line="\n\n// PMD_SUPERADMIN_R2_ROUTE_LOADER\nrequire_once base_path('routes/pmd-superadmin-r2.php');\n"
if mark not in s:
    p.write_text(s.rstrip()+line)
    print('R2 route loader appended')
else:
    print('R2 route loader already present')
PY

say "Protecting /superadmin from Next.js catch-all"
python3 <<'PY'
from pathlib import Path
p=Path('/var/www/paymydine/app/main/routes/next-proxy.php')
s=p.read_text()
start=s.find('$exclusions = [')
if start < 0: raise SystemExit('next-proxy exclusions not found')
end=s.find('];', start)
block=s[start:end]
if "'/superadmin'" not in block:
    needle="'/admin',"
    pos=block.find(needle)
    if pos < 0: raise SystemExit('/admin exclusion not found')
    absolute=start+pos+len(needle)
    s=s[:absolute]+"\n                    '/superadmin',"+s[absolute:]
    p.write_text(s)
    print('/superadmin exclusion added')
else:
    print('/superadmin exclusion already present')
PY

say "Ensuring exact /superadmin entry on test control host"
if [[ -f /etc/nginx/sites-available/test.paymydine.com.conf ]]; then
  sudo python3 <<'PY'
from pathlib import Path
p=Path('/etc/nginx/sites-available/test.paymydine.com.conf')
s=p.read_text()
if 'location = /superadmin {' not in s:
    needle='    location ^~ /superadmin/ {'
    pos=s.find(needle)
    if pos < 0: raise SystemExit('superadmin prefix location not found')
    exact='    # PMD_SUPERADMIN_R2_ENTRY\n    location = /superadmin { return 302 /superadmin/login; }\n\n'
    p.write_text(s[:pos]+exact+s[pos:])
    print('exact /superadmin entry added')
else:
    print('exact /superadmin entry already present')
PY
fi

say "Final PHP syntax validation"
php -l "$ROOT/routes/pmd-superadmin-r2.php"
php -l "$ROOT/app/admin/controllers/SuperAdminR2Controller.php"
php -l "$ROOT/app/Services/SuperAdminTenantLifecycleService.php"
php -l "$ROOT/app/Services/SuperAdminTenantDomainProvisioner.php"
php -l "$ROOT/app/admin/routes.php"
php -l "$ROOT/app/main/routes/next-proxy.php"
bash -n /usr/local/sbin/pmd-tenant-provision

say "Provisioning helper permission validation"
sudo -u www-data test -x /usr/local/sbin/pmd-tenant-provision
sudo -u www-data sudo -n -l >/dev/null

say "Nginx validation"
sudo nginx -t

say "Reloading Nginx after successful validation"
sudo systemctl reload nginx

RESTORE_NEEDED=0
trap - ERR INT TERM

say "R2 installed"
echo "Payload commit: $REF"
echo "Backup: $BACKUP"
echo "Open: https://test.paymydine.com/superadmin"
echo "No git checkout/reset/pull was performed."
echo "Existing tenant databases were not modified by this installer."
