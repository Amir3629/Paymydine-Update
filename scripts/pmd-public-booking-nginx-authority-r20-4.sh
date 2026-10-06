#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
HOST="${1:-tomo.paymydine.com}"
CONF="/etc/nginx/sites-available/${HOST}.conf"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="${ROOT}/storage/pmd-r20-5-booking-nginx-${STAMP}"
MARKER="PMD_PUBLIC_BOOKING_SUBPATH_LARAVEL_AUTHORITY_R20_5_START"

if [[ ! "${HOST}" =~ ^[a-z0-9-]+\.paymydine\.com$ ]]; then
  echo "ERROR: expected a tenant host such as tomo.paymydine.com"
  exit 1
fi

if [[ ! -f "${CONF}" ]]; then
  echo "ERROR: Nginx vhost not found: ${CONF}"
  exit 1
fi

if ! grep -Fq "server_name ${HOST};" "${CONF}"; then
  echo "ERROR: ${CONF} does not belong to ${HOST}"
  exit 1
fi

if ! grep -Fq 'X-PMD-R30F-Route "v2-customer"' "${CONF}"; then
  echo "ERROR: vhost is not an R30F customer tenant config; refusing to patch."
  exit 1
fi

mkdir -p "${BACKUP_DIR}"
cp -a "${CONF}" "${BACKUP_DIR}/$(basename "${CONF}")"

if grep -Fq "${MARKER}" "${CONF}"; then
  echo "Booking subpath Laravel authority is already installed for ${HOST}."
else
  if grep -Eq '^[[:space:]]*location[[:space:]]+(\^~[[:space:]]+)?/book/[[:space:]]*\{' "${CONF}"; then
    echo "ERROR: an existing /book/ Nginx location already exists."
    echo "No changes were made."
    echo
    grep -nE '^[[:space:]]*location[[:space:]]+(\^~[[:space:]]+)?/book/[[:space:]]*\{' "${CONF}" || true
    exit 1
  fi

  python3 - "${CONF}" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text()
marker = "    # Admin remains TastyIgniter/Laravel.\n"

if marker not in text:
    raise SystemExit("ERROR: expected HTTPS insertion marker was not found")

block = r'''    # PMD_PUBLIC_BOOKING_SUBPATH_LARAVEL_AUTHORITY_R20_5_START
    # The exact /book location already exists in production. Only reserve
    # /book/* subpaths for Laravel so SetupIntent, availability, Manage Booking
    # and other reservation endpoints never fall through to the Next.js proxy.
    location ^~ /book/ {
        include fastcgi_params;
        fastcgi_pass unix:/run/php/php8.3-fpm.sock;
        fastcgi_param SCRIPT_FILENAME /var/www/paymydine/index.php;
        fastcgi_param SCRIPT_NAME /index.php;
        fastcgi_param DOCUMENT_ROOT /var/www/paymydine;
        fastcgi_param REQUEST_URI $request_uri;
        fastcgi_param HTTP_HOST $host;
        fastcgi_param SERVER_NAME $host;
        fastcgi_param HTTPS on;
        add_header X-PMD-R30F-Vhost $host always;
        add_header X-PMD-R30F-Route "laravel-booking" always;
    }
    # PMD_PUBLIC_BOOKING_SUBPATH_LARAVEL_AUTHORITY_R20_5_END

'''

text = text.replace(marker, block + marker, 1)
path.write_text(text)
PY
fi

if ! nginx -t; then
  echo "ERROR: nginx -t failed. Restoring backup."
  cp -a "${BACKUP_DIR}/$(basename "${CONF}")" "${CONF}"
  nginx -t
  exit 1
fi

systemctl reload nginx

echo
echo "Nginx reloaded successfully."
echo "Backup: ${BACKUP_DIR}/$(basename "${CONF}")"

echo
echo "Existing exact /book location:"
grep -nE '^[[:space:]]*location[[:space:]]*=[[:space:]]*/book[[:space:]]*\{' "${CONF}" || true

echo
echo "Installed /book/ subpath authority:"
grep -nE '^[[:space:]]*location[[:space:]]*\^~[[:space:]]+/book/[[:space:]]*\{' "${CONF}" || true

echo
echo "POST /book/guarantee/setup routing probe:"
PROBE_HEADERS="$(mktemp)"
PROBE_BODY="$(mktemp)"
trap 'rm -f "${PROBE_HEADERS}" "${PROBE_BODY}"' EXIT

curl -sS \
  -D "${PROBE_HEADERS}" \
  -o "${PROBE_BODY}" \
  -X POST \
  -H 'Accept: application/json' \
  -H 'Content-Type: application/json' \
  --data '{}' \
  "https://${HOST}/book/guarantee/setup" || true

grep -Ei 'HTTP/|Content-Type:|X-PMD-R30F-(Vhost|Route)' "${PROBE_HEADERS}" || true

if ! grep -Fqi 'X-PMD-R30F-Route: laravel-booking' "${PROBE_HEADERS}"; then
  echo
  echo "ERROR: /book/guarantee/setup still did not reach Laravel."
  exit 1
fi

if grep -Eq '^HTTP/[^ ]+ 404 ' "${PROBE_HEADERS}"; then
  echo
  echo "ERROR: /book/guarantee/setup still returned 404."
  exit 1
fi

echo
echo "PASS: /book/guarantee/setup reaches Laravel."
echo "A 419 or 422 from this empty probe is expected and acceptable."

echo
echo "R20.5 booking subpath authority installed for ${HOST}."
