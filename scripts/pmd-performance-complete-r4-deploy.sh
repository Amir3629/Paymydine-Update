#!/usr/bin/env bash
set -euo pipefail

cd /var/www/paymydine || exit 1

BRANCH="fix/platform-performance-complete-r4"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="/var/www/paymydine/storage/pmd-patch-backups/platform-performance-complete-r4-$STAMP"
TMP="$(mktemp -d)"
NGINX_CACHE="/etc/nginx/conf.d/pmd-tenant-access-cache.conf"
CACHE_EXISTED=0

cleanup() {
    rm -rf "$TMP"
}
trap cleanup EXIT

FILES=(
    "app/Http/Middleware/TenantDatabaseMiddleware.php"
    "app/Services/PmdOwnerTotpService.php"
    "app/Services/PmdSiteAccessService.php"
    "app/Services/PmdTrustedLoginDeviceService.php"
    "app/Services/PmdWorkSessionPolicyService.php"
    "app/admin/ServiceProvider.php"
    "app/admin/controllers/PmdOwnerDashboardCleanV1.php"
    "app/admin/controllers/concerns/PmdWaiterPosPaymentSummaryConcern.php"
)

echo "=================================================="
echo " PayMyDine COMPLETE PERFORMANCE R4"
echo "=================================================="

git fetch origin "$BRANCH"
sudo mkdir -p "$BACKUP"

backup_file() {
    local file="$1"
    if [ -e "$file" ]; then
        sudo mkdir -p "$BACKUP$(dirname "$file")"
        sudo cp -a "$file" "$BACKUP$file"
    fi
}

echo
echo "== Fetch + preflight PHP =="

for file in "${FILES[@]}"; do
    mkdir -p "$TMP/$(dirname "$file")"
    git show "origin/$BRANCH:$file" > "$TMP/$file"
    test -s "$TMP/$file"
    php -l "$TMP/$file"
    echo "Preflight: $file"
done

echo
echo "== Backup + install PHP =="

for file in "${FILES[@]}"; do
    backup_file "/var/www/paymydine/$file"

    owner="$(stat -c '%u' "/var/www/paymydine/$file")"
    group="$(stat -c '%g' "/var/www/paymydine/$file")"
    mode="$(stat -c '%a' "/var/www/paymydine/$file")"

    sudo install \
        -o "$owner" \
        -g "$group" \
        -m "$mode" \
        "$TMP/$file" \
        "/var/www/paymydine/$file"

    echo "Updated: $file"
done

echo
echo "== Configure Nginx tenant gate =="

if [ -e "$NGINX_CACHE" ]; then
    CACHE_EXISTED=1
    backup_file "$NGINX_CACHE"
fi

NGINX_USER="$(
    awk '
        $1 == "user" {
            gsub(";", "", $2)
            print $2
            exit
        }
    ' /etc/nginx/nginx.conf
)"

if [ -z "$NGINX_USER" ]; then
    NGINX_USER="www-data"
fi

NGINX_GROUP="$(id -gn "$NGINX_USER")"

sudo install \
    -d \
    -o "$NGINX_USER" \
    -g "$NGINX_GROUP" \
    -m 0750 \
    /var/cache/nginx/pmd_tenant_access

sudo tee "$NGINX_CACHE" >/dev/null <<'EOF'
# PMD_TENANT_ACCESS_CACHE_R4
#
# Customer/V2 tenant status remains fail-closed, with a one-second cache.
# Admin does not use this duplicate PHP auth subrequest; its canonical
# TenantDatabaseMiddleware performs the same central active-tenant check.

fastcgi_cache_path /var/cache/nginx/pmd_tenant_access
    levels=1:2
    keys_zone=pmd_tenant_gate:10m
    inactive=10m
    max_size=64m
    use_temp_path=off;
EOF

PATCH_REPORT="$TMP/nginx-patched.txt"

sudo env BACKUP="$BACKUP" PATCH_REPORT="$PATCH_REPORT" python3 <<'PY'
import glob
import os
import re
import shutil

backup_root = os.environ["BACKUP"]
report = os.environ["PATCH_REPORT"]

paths = set()
for candidate in glob.glob("/etc/nginx/sites-available/*.conf"):
    real = os.path.realpath(candidate)
    if os.path.isfile(real):
        paths.add(real)

def backup(path):
    destination = backup_root + path
    os.makedirs(os.path.dirname(destination), exist_ok=True)
    if not os.path.exists(destination):
        shutil.copy2(path, destination)

def add_auth_off(text, location_re):
    pattern = re.compile(
        r"(?ms)^(?P<indent>[ \t]*)"
        + location_re
        + r"\s*\{(?P<body>.*?)^(?P=indent)\}"
    )
    match = pattern.search(text)
    if not match:
        return text, False

    body = match.group("body")
    if re.search(r"(?m)^\s*auth_request\s+off\s*;", body):
        return text, False

    indent = match.group("indent")
    replacement = (
        match.group(0)[:match.group(0).find("{") + 1]
        + "\n"
        + indent
        + "    auth_request off;"
        + body
        + indent
        + "}"
    )
    return text[:match.start()] + replacement + text[match.end():], True

gate_pattern = re.compile(
    r"(?ms)^(?P<indent>[ \t]*)"
    r"location\s*=\s*/__pmd_tenant_access_check\s*\{"
    r"(?P<body>.*?)"
    r"^(?P=indent)\}"
)

directives = [
    "fastcgi_cache pmd_tenant_gate;",
    'fastcgi_cache_key "$host";',
    "fastcgi_cache_valid 204 1s;",
    "fastcgi_cache_valid 401 403 1s;",
    "fastcgi_cache_lock on;",
    "fastcgi_cache_lock_timeout 2s;",
    "fastcgi_cache_lock_age 2s;",
    "fastcgi_ignore_headers Cache-Control Expires Set-Cookie;",
    "fastcgi_hide_header Set-Cookie;",
]

patched = []

for path in sorted(paths):
    with open(path, "r", encoding="utf-8") as fh:
        original = fh.read()

    if (
        "__pmd_tenant_access_check" not in original
        or "PMD_TENANT_ACCESS_GATE_R2_START" not in original
    ):
        continue

    text = original

    # Admin already enters TenantDatabaseMiddleware before AdminAuth, so do not
    # boot Laravel a second time through Nginx auth_request for the same request.
    text, _ = add_auth_off(text, r"location\s*=\s*/admin")
    text, _ = add_auth_off(text, r"location\s+\^~\s+/admin/")

    match = gate_pattern.search(text)
    if not match:
        raise RuntimeError("Tenant gate location not found in " + path)

    body = match.group("body")
    indent = match.group("indent")
    directive_indent = indent + "    "
    missing = [line for line in directives if line not in body]

    if missing:
        block = match.group(0)
        closing = "\n" + indent + "}"
        pos = block.rfind(closing)
        if pos < 0:
            raise RuntimeError("Tenant gate closing brace not found in " + path)

        addition = (
            "\n"
            + directive_indent
            + "# PMD_TENANT_ACCESS_CACHE_R4\n"
            + "\n".join(directive_indent + line for line in missing)
            + "\n"
        )
        replacement = block[:pos].rstrip() + addition + closing
        text = text[:match.start()] + replacement + text[match.end():]

    if text != original:
        backup(path)
        with open(path, "w", encoding="utf-8") as fh:
            fh.write(text)
        patched.append(path)
        print("Patched:", path)

with open(report, "w", encoding="utf-8") as fh:
    for path in patched:
        fh.write(path + "\n")

print("Tenant vhosts changed:", len(patched))
PY

echo
echo "== Validate Nginx =="

if ! sudo nginx -t; then
    echo "ERROR: Nginx validation failed. Restoring Nginx files."

    if [ -d "$BACKUP/etc/nginx" ]; then
        sudo cp -a "$BACKUP/etc/nginx/." /etc/nginx/
    fi

    if [ "$CACHE_EXISTED" -eq 0 ]; then
        sudo rm -f "$NGINX_CACHE"
    fi

    sudo nginx -t
    exit 1
fi

echo
echo "== Clear application caches =="

APP_USER="$(stat -c '%U' /var/www/paymydine/storage)"
sudo -u "$APP_USER" php artisan view:clear || true
sudo -u "$APP_USER" php artisan cache:clear || true
sudo -u "$APP_USER" php artisan config:clear || true
sudo -u "$APP_USER" php artisan route:clear || true

echo
echo "== Reload PHP-FPM + Nginx =="

sudo systemctl reload php8.3-fpm
sudo systemctl reload nginx

sudo find /var/cache/nginx/pmd_tenant_access \
    -mindepth 1 \
    -type f \
    -delete 2>/dev/null || true

echo
echo "== Final PHP validation =="

for file in "${FILES[@]}"; do
    php -l "$file"
done

echo
echo "== R4 gate verification =="

echo -n "Admin locations with auth_request off: "
sudo nginx -T 2>/dev/null \
    | awk '
        /location = \/admin \{/ || /location \^~ \/admin\/ \{/ {
            in_admin=1
            next
        }
        in_admin && /auth_request off;/ {
            count++
            in_admin=0
        }
        in_admin && /^\s*}/ {
            in_admin=0
        }
        END { print count+0 }
    '

echo -n "Tenant gate cache locations: "
sudo nginx -T 2>/dev/null \
    | grep -c 'fastcgi_cache pmd_tenant_gate' || true

echo -n "Tenant gate cache Set-Cookie ignores: "
sudo nginx -T 2>/dev/null \
    | grep -c 'fastcgi_ignore_headers Cache-Control Expires Set-Cookie' || true

echo
echo "=================================================="
echo " COMPLETE PERFORMANCE R4 DEPLOYED"
echo "=================================================="
echo "Backup:"
echo "$BACKUP"
