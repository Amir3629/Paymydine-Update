#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
PAYLOAD_REF="e9ef61f39de5999f40eded9e4f5b6e2ede456055"
RAW_BASE="https://raw.githubusercontent.com/Amir3629/Paymydine-Update/${PAYLOAD_REF}"
TS="$(date +%Y%m%d-%H%M%S)"
BACKUP="$ROOT/storage/pmd-tenant-access-r2-$TS"
TMP="$(mktemp -d)"
MANIFEST="$BACKUP/nginx-manifest.tsv"
RESTORE=0

FILES=(
  "routes/pmd-superadmin-r2.php"
  "app/admin/views/superadmin_r2/restaurants.blade.php"
  "ops/superadmin-r2/pmd-tenant-provision"
)

cleanup() {
  rm -rf "$TMP"
}

rollback() {
  local rc=$?
  if [[ "$RESTORE" -eq 1 ]]; then
    echo
    echo "!!! TENANT ACCESS DEPLOY FAILED - RESTORING !!!"

    if [[ -f "$BACKUP/routes/pmd-superadmin-r2.php" ]]; then
      sudo -n cp -a "$BACKUP/routes/pmd-superadmin-r2.php" "$ROOT/routes/pmd-superadmin-r2.php" || true
    fi
    if [[ -f "$BACKUP/app/admin/views/superadmin_r2/restaurants.blade.php" ]]; then
      sudo -n cp -a "$BACKUP/app/admin/views/superadmin_r2/restaurants.blade.php" "$ROOT/app/admin/views/superadmin_r2/restaurants.blade.php" || true
    fi
    if [[ -f "$BACKUP/pmd-tenant-provision" ]]; then
      sudo -n cp -a "$BACKUP/pmd-tenant-provision" /usr/local/sbin/pmd-tenant-provision || true
    fi

    if [[ -f "$MANIFEST" ]]; then
      while IFS=$'\t' read -r target saved; do
        [[ -n "$target" && -f "$saved" ]] || continue
        sudo -n cp -a "$saved" "$target" || true
      done < "$MANIFEST"
    fi

    sudo -n nginx -t >/dev/null 2>&1 && sudo -n systemctl reload nginx >/dev/null 2>&1 || true
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

mkdir -p "$BACKUP" "$TMP"
: > "$MANIFEST"

echo "============================================================"
echo " PMD R2 - ENFORCE TENANT DISABLED/REMOVED ACCESS"
echo " Payload: $PAYLOAD_REF"
echo "============================================================"

echo
echo "1) Checking privileges/tools..."
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
echo "3) Pre-validating..."
php -l "$TMP/routes/pmd-superadmin-r2.php"
bash -n "$TMP/ops/superadmin-r2/pmd-tenant-provision"
grep -Fq '/superadmin/tenants/remove' "$TMP/routes/pmd-superadmin-r2.php"
grep -Fq '/__pmd/tenant-access' "$TMP/routes/pmd-superadmin-r2.php"
grep -Fq '>Remove<' "$TMP/app/admin/views/superadmin_r2/restaurants.blade.php"
echo "PASS"

echo
echo "4) Backing up current application files..."
for rel in "routes/pmd-superadmin-r2.php" "app/admin/views/superadmin_r2/restaurants.blade.php"; do
  if sudo -n test -f "$ROOT/$rel"; then
    mkdir -p "$BACKUP/$(dirname "$rel")"
    sudo -n cp -a "$ROOT/$rel" "$BACKUP/$rel"
  fi
done
if sudo -n test -f /usr/local/sbin/pmd-tenant-provision; then
  sudo -n cp -a /usr/local/sbin/pmd-tenant-provision "$BACKUP/pmd-tenant-provision"
fi

sudo -n install -D -o root -g root -m 0644 "$TMP/routes/pmd-superadmin-r2.php" "$ROOT/routes/pmd-superadmin-r2.php"
sudo -n install -D -o root -g root -m 0644 "$TMP/app/admin/views/superadmin_r2/restaurants.blade.php" "$ROOT/app/admin/views/superadmin_r2/restaurants.blade.php"
sudo -n install -o root -g root -m 0755 "$TMP/ops/superadmin-r2/pmd-tenant-provision" /usr/local/sbin/pmd-tenant-provision

RESTORE=1

echo
echo "5) Patching every active HTTPS tenant vhost..."
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
    quote = None
    escape = False
    comment = False
    for i in range(open_index, len(text)):
        ch = text[i]
        if comment:
            if ch == '\n': comment = False
            continue
        if escape:
            escape = False
            continue
        if quote:
            if ch == '\\': escape = True
            elif ch == quote: quote = None
            continue
        if ch == '#':
            comment = True
            continue
        if ch in "'\"":
            quote = ch
            continue
        if ch == '{': depth += 1
        elif ch == '}':
            depth -= 1
            if depth == 0: return i
    raise RuntimeError('unbalanced nginx braces')


def server_blocks(text: str):
    out = []
    pos = 0
    rx = re.compile(r'\bserver\s*\{')
    while True:
        m = rx.search(text, pos)
        if not m: break
        open_i = text.find('{', m.start(), m.end())
        close_i = matching_brace(text, open_i)
        out.append((m.start(), close_i + 1, text[m.start():close_i + 1]))
        pos = close_i + 1
    return out


def names(block: str):
    clean = re.sub(r'(?m)#.*$', '', block)
    found = []
    for m in re.finditer(r'\bserver_name\s+([^;]+);', clean):
        found.extend(x.strip().lower() for x in m.group(1).split())
    return found


def is_ssl(block: str):
    clean = re.sub(r'(?m)#.*$', '', block)
    return bool(re.search(r'\blisten\s+[^;]*\b443\b', clean))


def strip_marker(block: str, start: str, end: str) -> str:
    return re.sub(r'(?ms)^\s*' + re.escape(start) + r'.*?' + re.escape(end) + r'\s*', '\n', block)


def remove_superadmin_redirects(block: str) -> str:
    block = strip_marker(block, '# PMD_SUPERADMIN_TENANT_REDIRECT_R2_START', '# PMD_SUPERADMIN_TENANT_REDIRECT_R2_END')
    block = re.sub(r'(?ms)^\s*# PMD_SUPERADMIN_CENTRAL_REDIRECT_R2\s*\n\s*location\s*=\s*/superadmin\s*\{.*?^\s*\}\s*\n\s*location\s+\^~\s+/superadmin/\s*\{.*?^\s*\}\s*', '\n', block)
    block = re.sub(r'(?ms)^\s*location\s*=\s*/superadmin\s*\{.*?^\s*\}\s*', '\n', block)
    block = re.sub(r'(?ms)^\s*location\s+\^~\s+/superadmin/\s*\{.*?^\s*\}\s*', '\n', block)
    return block


def insert_before_close(block: str, snippet: str) -> str:
    idx = block.rfind('}')
    if idx < 0: raise RuntimeError('server block missing close brace')
    return block[:idx].rstrip() + '\n\n' + snippet.rstrip() + '\n' + block[idx:]

sources = []
for item in sorted(enabled.iterdir()):
    try:
        real = item.resolve(strict=True)
    except FileNotFoundError:
        continue
    if real.is_file() and real not in sources:
        sources.append(real)

modified = {}
patched_blocks = 0

for path in sources:
    original = path.read_text()
    replacements = []

    for start, end, block in server_blocks(original):
        if not is_ssl(block):
            continue

        ns = names(block)
        tenant_names = [
            n for n in ns
            if re.fullmatch(r'[a-z0-9-]+\.paymydine\.com', n)
            and n != 'www.paymydine.com'
        ]
        if not tenant_names:
            continue

        # paymydine.com itself is not a tenant because the regex requires a subdomain.
        block = strip_marker(block, '# PMD_TENANT_ACCESS_GATE_R2_START', '# PMD_TENANT_ACCESS_GATE_R2_END')
        block = remove_superadmin_redirects(block)

        snippet = r'''    # PMD_TENANT_ACCESS_GATE_R2_START
    # Central registry status is the runtime authority for tenant availability.
    # Anything other than active (including disabled/removed/missing/expired)
    # is redirected to the PayMyDine landing page before PHP Admin or Next runs.
    auth_request /__pmd_tenant_access_check;
    error_page 401 403 =302 https://paymydine.com/;

    location = /__pmd_tenant_access_check {
        internal;
        auth_request off;
        include fastcgi_params;
        fastcgi_param SCRIPT_FILENAME /var/www/paymydine/index.php;
        fastcgi_param SCRIPT_NAME /index.php;
        fastcgi_param DOCUMENT_ROOT /var/www/paymydine;
        fastcgi_param REQUEST_METHOD GET;
        fastcgi_param REQUEST_URI /__pmd/tenant-access;
        fastcgi_param QUERY_STRING "";
        fastcgi_param HTTP_X_PMD_TENANT_ACCESS_INTERNAL 1;
        fastcgi_param HTTP_X_PMD_TENANT_HOST $host;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
    }

    # Super Admin never executes on a tenant host, even when that tenant is disabled.
    location = /superadmin {
        auth_request off;
        return 307 https://paymydine.com/superadmin;
    }

    location ^~ /superadmin/ {
        auth_request off;
        return 307 https://paymydine.com$request_uri;
    }
    # PMD_TENANT_ACCESS_GATE_R2_END'''

        block = insert_before_close(block, snippet)
        replacements.append((start, end, block))
        patched_blocks += 1

    if replacements:
        text = original
        for start, end, replacement in reversed(replacements):
            text = text[:start] + replacement + text[end:]
        modified[path] = text

if patched_blocks == 0:
    raise SystemExit('No active HTTPS tenant server blocks were found; refusing partial deploy')

for path, text in modified.items():
    safe = str(path).strip('/').replace('/', '__')
    saved = nginx_backup / safe
    shutil.copy2(path, saved)
    with manifest.open('a') as fh:
        fh.write(f'{path}\t{saved}\n')
    path.write_text(text)
    print(f'PATCHED {path}')

print(f'TENANT_SSL_BLOCKS {patched_blocks}')
PY

echo
echo "6) Final validation before reload..."
php -l "$ROOT/routes/pmd-superadmin-r2.php"
bash -n /usr/local/sbin/pmd-tenant-provision
sudo -n nginx -t

echo
echo "7) Graceful reload..."
sudo -n systemctl reload nginx
if systemctl is-active --quiet php8.3-fpm; then
  sudo -n systemctl reload php8.3-fpm
fi

echo
echo "8) Verifying central gate directly through Laravel..."
for host in mimoza.paymydine.com test.paymydine.com asd.paymydine.com; do
  echo "--- $host ---"
  curl -skS \
    --resolve paymydine.com:443:127.0.0.1 \
    -H 'X-PMD-Tenant-Access-Internal: 1' \
    -H "X-PMD-Tenant-Host: $host" \
    -D - -o /dev/null \
    https://paymydine.com/__pmd/tenant-access \
    | grep -Ei '^(HTTP/|X-PMD-Tenant-Gate:)' || true
done

echo
echo "9) Runtime tenant access behavior..."
for host in mimoza.paymydine.com test.paymydine.com asd.paymydine.com; do
  echo "--- https://$host/ ---"
  curl -skS --resolve "$host:443:127.0.0.1" -D - -o /dev/null "https://$host/" \
    | grep -Ei '^(HTTP/|location:|x-pmd-)' | head -12 || true
  echo "--- https://$host/admin/login ---"
  curl -skS --resolve "$host:443:127.0.0.1" -D - -o /dev/null "https://$host/admin/login" \
    | grep -Ei '^(HTTP/|location:|x-pmd-)' | head -12 || true
done

echo
echo "10) Super Admin must bypass tenant disable gate..."
for host in test.paymydine.com mimoza.paymydine.com; do
  echo "--- $host/superadmin ---"
  curl -skS --resolve "$host:443:127.0.0.1" -D - -o /dev/null "https://$host/superadmin" \
    | grep -Ei '^(HTTP/|location:)' || true
done

echo
echo "11) Remove/Restore UI evidence..."
grep -oE '/superadmin/tenants/(remove|restore)' "$ROOT/app/admin/views/superadmin_r2/restaurants.blade.php" | sort -u

echo
echo "12) Root-domain canonical observation (read only)..."
curl -skS --resolve paymydine.com:443:127.0.0.1 -D - -o /dev/null https://paymydine.com/superadmin \
  | grep -Ei '^(HTTP/|location:)' || true

RESTORE=0
trap - ERR INT TERM

echo
echo "============================================================"
echo " TENANT ACCESS ENFORCEMENT READY"
echo "============================================================"
echo "Backup: $BACKUP"
echo
echo "Expected behavior:"
echo " - active tenant: serves normally"
echo " - disabled/removed/missing registered vhost: redirects to https://paymydine.com/"
echo " - /superadmin on any tenant: redirects to https://paymydine.com/superadmin"
echo " - Remove is reversible and does NOT drop tenant databases"
echo
echo "No tenant database was modified by this installer."
echo "No central tenant row was modified by this installer."
echo "No git pull/reset/checkout was performed."
