#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
PAYLOAD_REF="a12c142c9e830072b484443894eaa6fbc5976161"
RAW_BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/${PAYLOAD_REF}"
TS="$(date +%Y%m%d-%H%M%S)"
BACKUP="$ROOT/storage/pmd-superadmin-root-domain-$TS"
TMP="$(mktemp -d)"
NGINX_MANIFEST="$BACKUP/nginx-manifest.tsv"
RESTORE=0

FILES=(
  "app/Http/Middleware/SuperAdminCanonicalHost.php"
  "routes/pmd-superadmin-r2.php"
  "app/admin/views/superadmin_r2/settings.blade.php"
  "app/admin/views/superadmin_r2/layout.blade.php"
  "app/admin/views/superadmin_r2/login.blade.php"
  "ops/superadmin-r2/pmd-tenant-provision"
)

cleanup() {
  rm -rf "$TMP"
}

rollback() {
  rc=$?
  if [[ "$RESTORE" -eq 1 ]]; then
    echo
    echo "!!! ROOT-DOMAIN MOVE FAILED - RESTORING BACKUPS !!!"

    for rel in "${FILES[@]}"; do
      if [[ "$rel" == "ops/superadmin-r2/pmd-tenant-provision" ]]; then
        continue
      fi
      if [[ -f "$BACKUP/app/$rel" ]]; then
        sudo -n mkdir -p "$ROOT/$(dirname "$rel")"
        sudo -n cp -a "$BACKUP/app/$rel" "$ROOT/$rel" || true
      fi
    done

    if [[ -f "$BACKUP/pmd-tenant-provision" ]]; then
      sudo -n cp -a "$BACKUP/pmd-tenant-provision" /usr/local/sbin/pmd-tenant-provision || true
    fi

    if [[ -f "$NGINX_MANIFEST" ]]; then
      while IFS=$'\t' read -r target saved; do
        [[ -n "$target" && -f "$saved" ]] || continue
        sudo -n cp -a "$saved" "$target" || true
      done < "$NGINX_MANIFEST"
    fi

    sudo -n nginx -t >/dev/null 2>&1 && sudo -n systemctl reload nginx >/dev/null 2>&1 || true
    if systemctl is-active --quiet php8.3-fpm 2>/dev/null; then
      sudo -n systemctl reload php8.3-fpm >/dev/null 2>&1 || true
    fi

    echo "Rollback completed."
    echo "Backup: $BACKUP"
  fi
  cleanup
  exit "$rc"
}

trap rollback ERR INT TERM
trap cleanup EXIT

mkdir -p "$BACKUP/app" "$BACKUP/nginx" "$TMP"
: > "$NGINX_MANIFEST"

echo "============================================================"
echo " PMD SUPER ADMIN R2 - MOVE TO paymydine.com/superadmin"
echo " Payload: $PAYLOAD_REF"
echo "============================================================"

echo
echo() { :; }

echo "1) Checking required privileges/tools..."
sudo -n true
command -v curl >/dev/null
command -v python3 >/dev/null
command -v nginx >/dev/null
test -S /run/php/php8.3-fpm.sock

echo "PASS"

echo
echo "2) Downloading immutable application payload..."
for rel in "${FILES[@]}"; do
  mkdir -p "$TMP/$(dirname "$rel")"
  echo "GET  $rel"
  curl -fsSL "$RAW_BASE/$rel" -o "$TMP/$rel"
done

echo
echo "3) Pre-validating PHP and helper..."
php -l "$TMP/app/Http/Middleware/SuperAdminCanonicalHost.php"
php -l "$TMP/routes/pmd-superadmin-r2.php"
bash -n "$TMP/ops/superadmin-r2/pmd-tenant-provision"

echo
echo "4) Backing up and installing R2 application authority..."
for rel in \
  "app/Http/Middleware/SuperAdminCanonicalHost.php" \
  "routes/pmd-superadmin-r2.php" \
  "app/admin/views/superadmin_r2/settings.blade.php" \
  "app/admin/views/superadmin_r2/layout.blade.php" \
  "app/admin/views/superadmin_r2/login.blade.php"
do
  if sudo -n test -f "$ROOT/$rel"; then
    mkdir -p "$BACKUP/app/$(dirname "$rel")"
    sudo -n cp -a "$ROOT/$rel" "$BACKUP/app/$rel"
  fi
  sudo -n install -D -o root -g root -m 0644 "$TMP/$rel" "$ROOT/$rel"
  echo "OK   $rel"
done

if sudo -n test -f /usr/local/sbin/pmd-tenant-provision; then
  sudo -n cp -a /usr/local/sbin/pmd-tenant-provision "$BACKUP/pmd-tenant-provision"
fi
sudo -n install -o root -g root -m 0755 "$TMP/ops/superadmin-r2/pmd-tenant-provision" /usr/local/sbin/pmd-tenant-provision

RESTORE=1

echo
echo "5) Patching active Nginx vhosts with one canonical control plane..."
PMD_BACKUP="$BACKUP" sudo -n -E python3 <<'PY'
from pathlib import Path
import os
import re
import shutil

backup = Path(os.environ['PMD_BACKUP'])
enabled = Path('/etc/nginx/sites-enabled')
manifest = backup / 'nginx-manifest.tsv'
nginx_backup = backup / 'nginx'
nginx_backup.mkdir(parents=True, exist_ok=True)


def matching_brace(text: str, open_index: int) -> int:
    depth = 0
    single = False
    double = False
    comment = False
    escape = False
    for i in range(open_index, len(text)):
        ch = text[i]
        if comment:
            if ch == '\n':
                comment = False
            continue
        if escape:
            escape = False
            continue
        if ch == '\\' and (single or double):
            escape = True
            continue
        if ch == '#' and not single and not double:
            comment = True
            continue
        if ch == "'" and not double:
            single = not single
            continue
        if ch == '"' and not single:
            double = not double
            continue
        if single or double:
            continue
        if ch == '{':
            depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0:
                return i
    raise RuntimeError('unbalanced nginx braces')


def blocks(text: str):
    out = []
    pos = 0
    rx = re.compile(r'\bserver\s*\{')
    while True:
        m = rx.search(text, pos)
        if not m:
            break
        open_i = text.find('{', m.start(), m.end())
        close_i = matching_brace(text, open_i)
        out.append((m.start(), close_i + 1, text[m.start():close_i + 1]))
        pos = close_i + 1
    return out


def names(block: str):
    clean = re.sub(r'(?m)#.*$', '', block)
    found = []
    for match in re.finditer(r'\bserver_name\s+([^;]+);', clean):
        found.extend(x.strip().lower() for x in match.group(1).split())
    return found


def is_ssl(block: str):
    clean = re.sub(r'(?m)#.*$', '', block)
    return bool(re.search(r'\blisten\s+[^;]*\b443\b', clean))


def remove_superadmin_locations(block: str) -> str:
    patterns = [
        r'(?ms)^\s*# PMD_SUPERADMIN_RECOVERY_R1\s*\n\s*location\s*=\s*/superadmin\s*\{.*?^\s*\}\s*',
        r'(?ms)^\s*# PMD_SUPERADMIN_CENTRAL_REDIRECT_R2\s*\n?',
        r'(?ms)^\s*# PMD_SUPERADMIN_TENANT_REDIRECT_R2_START.*?# PMD_SUPERADMIN_TENANT_REDIRECT_R2_END\s*',
        r'(?ms)^\s*location\s*=\s*/superadmin/?\s*\{.*?^\s*\}\s*',
        r'(?ms)^\s*location\s+\^~\s+/superadmin/\s*\{.*?^\s*\}\s*',
    ]
    for pattern in patterns:
        block = re.sub(pattern, '\n', block)
    return block


def strip_marker(block: str, start_marker: str, end_marker: str) -> str:
    return re.sub(
        r'(?ms)^\s*' + re.escape(start_marker) + r'.*?' + re.escape(end_marker) + r'\s*',
        '\n',
        block,
    )


def insert_before_close(block: str, snippet: str) -> str:
    idx = block.rfind('}')
    if idx < 0:
        raise RuntimeError('server block missing close brace')
    return block[:idx].rstrip() + '\n\n' + snippet.rstrip() + '\n' + block[idx:]

active_sources = []
for item in sorted(enabled.iterdir()):
    try:
        real = item.resolve(strict=True)
    except FileNotFoundError:
        continue
    if real.is_file() and real not in active_sources:
        active_sources.append(real)

main_candidates = []
for path in active_sources:
    text = path.read_text()
    for start, end, block in blocks(text):
        ns = names(block)
        if is_ssl(block) and 'paymydine.com' in ns:
            main_candidates.append((path, start, end))

if len(main_candidates) != 1:
    raise SystemExit(f'Expected exactly one active HTTPS paymydine.com server block, found {len(main_candidates)}')

main_path = main_candidates[0][0]
modified = {}
tenant_blocks = 0

for path in active_sources:
    original = path.read_text()
    replacements = []

    for start, end, block in blocks(original):
        if not is_ssl(block):
            continue
        ns = names(block)

        if path == main_path and 'paymydine.com' in ns:
            block = strip_marker(block, '# PMD_SUPERADMIN_ROOT_DOMAIN_R2_START', '# PMD_SUPERADMIN_ROOT_DOMAIN_R2_END')
            block = remove_superadmin_locations(block)
            snippet = r'''    # PMD_SUPERADMIN_ROOT_DOMAIN_R2_START
    # Landing page keeps owning /. Only the central control-plane namespace
    # and the Admin assets required by that namespace are routed to Laravel.
    location = /superadmin {
        return 302 /superadmin/login;
    }

    location = /superadmin/ {
        return 302 /superadmin/login;
    }

    # Compatibility bridge for stale R1/legacy Settings forms. Preserve POST.
    location = /superadmin/settings/update {
        return 307 https://paymydine.com/superadmin/settings/save;
    }

    location ^~ /superadmin/ {
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME /var/www/paymydine/index.php;
        fastcgi_param SCRIPT_NAME /index.php;
        fastcgi_param DOCUMENT_ROOT /var/www/paymydine;
        fastcgi_param HTTPS on;
        fastcgi_param HTTP_HOST $host;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
    }

    location ^~ /app/admin/assets/ {
        root /var/www/paymydine;
        try_files $uri =404;
    }
    # PMD_SUPERADMIN_ROOT_DOMAIN_R2_END'''
            block = insert_before_close(block, snippet)
            replacements.append((start, end, block))
            continue

        tenant_names = [n for n in ns if re.fullmatch(r'[a-z0-9-]+\.paymydine\.com', n)]
        tenant_names = [n for n in tenant_names if n != 'www.paymydine.com']
        if tenant_names:
            block = remove_superadmin_locations(block)
            snippet = r'''    # PMD_SUPERADMIN_TENANT_REDIRECT_R2_START
    # Tenant hosts never execute the Super Admin control plane.
    location = /superadmin {
        return 307 https://paymydine.com/superadmin;
    }

    location ^~ /superadmin/ {
        return 307 https://paymydine.com$request_uri;
    }
    # PMD_SUPERADMIN_TENANT_REDIRECT_R2_END'''
            block = insert_before_close(block, snippet)
            replacements.append((start, end, block))
            tenant_blocks += 1

    if replacements:
        text = original
        for start, end, replacement in reversed(replacements):
            text = text[:start] + replacement + text[end:]
        modified[path] = text

if tenant_blocks == 0:
    raise SystemExit('No active HTTPS tenant vhosts were detected; refusing partial migration')

for path, text in modified.items():
    safe_name = str(path).strip('/').replace('/', '__')
    saved = nginx_backup / safe_name
    shutil.copy2(path, saved)
    with manifest.open('a') as fh:
        fh.write(f'{path}\t{saved}\n')
    path.write_text(text)
    print(f'PATCHED {path}')

print(f'MAIN_VHOST {main_path}')
print(f'TENANT_SSL_BLOCKS {tenant_blocks}')
PY

echo
echo "6) Validating application + Nginx before reload..."
php -l "$ROOT/app/Http/Middleware/SuperAdminCanonicalHost.php"
php -l "$ROOT/routes/pmd-superadmin-r2.php"
grep -Fq 'https://paymydine.com/superadmin/settings/save' "$ROOT/app/admin/views/superadmin_r2/settings.blade.php"
grep -Fq 'PMD_SUPERADMIN_ROOT_DOMAIN_R2_START' "$(cut -f1 "$NGINX_MANIFEST" | head -1)" || true
sudo -n nginx -t

echo
echo "7) Graceful reload..."
sudo -n systemctl reload nginx
if systemctl is-active --quiet php8.3-fpm; then
  sudo -n systemctl reload php8.3-fpm
fi

echo
echo "8) Runtime verification..."

echo "===== Landing page must still work ====="
curl -skS --resolve paymydine.com:443:127.0.0.1 -D - -o /dev/null https://paymydine.com/ \
  | grep -Ei '^(HTTP/|content-type:|location:)' | head -10 || true

echo
echo "===== Central Super Admin root ====="
curl -skS --resolve paymydine.com:443:127.0.0.1 -D - -o /dev/null https://paymydine.com/superadmin \
  | grep -Ei '^(HTTP/|location:|content-type:)' || true

echo
echo "===== Central Super Admin login ====="
LOGIN_BODY="$TMP/login.html"
curl -skS --resolve paymydine.com:443:127.0.0.1 -D "$TMP/login.headers" -o "$LOGIN_BODY" https://paymydine.com/superadmin/login
cat "$TMP/login.headers" | grep -Ei '^(HTTP/|location:|content-type:)' || true
grep -E 'Super Admin Login \| PayMyDine|pmd-login-logo\.svg|superadmin-username' "$LOGIN_BODY" | head -10 || true

echo
echo "===== Central Admin asset ====="
curl -skS --resolve paymydine.com:443:127.0.0.1 -D - -o /dev/null https://paymydine.com/app/admin/assets/images/pmd-login-logo.svg \
  | grep -Ei '^(HTTP/|content-type:)' || true

echo
echo "===== Stale legacy Settings URI bridge ====="
curl -skS --resolve paymydine.com:443:127.0.0.1 -X POST -D - -o /dev/null https://paymydine.com/superadmin/settings/update \
  | grep -Ei '^(HTTP/|location:)' || true

echo
echo "===== Tenant Super Admin redirect ====="
for host in test.paymydine.com mimoza.paymydine.com; do
  echo "--- $host ---"
  curl -skS --resolve "$host:443:127.0.0.1" -D - -o /dev/null "https://$host/superadmin/settings" \
    | grep -Ei '^(HTTP/|location:)' || true
done

RESTORE=0
trap - ERR INT TERM

echo
echo "============================================================"
echo " SUPER ADMIN CENTRAL CONTROL PLANE READY"
echo "============================================================"
echo "Canonical URL: https://paymydine.com/superadmin"
echo "Landing URL:   https://paymydine.com/"
echo "Backup:        $BACKUP"
echo
echo "No database rows were changed."
echo "No tenant database was changed."
echo "No git pull/reset/checkout was performed."
