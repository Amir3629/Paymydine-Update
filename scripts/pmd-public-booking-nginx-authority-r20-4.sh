#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
HOST="${1:-tomo.paymydine.com}"
CONF="/etc/nginx/sites-available/${HOST}.conf"
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP_DIR="${ROOT}/storage/pmd-r20-4-booking-nginx-${STAMP}"
MARKER="PMD_PUBLIC_BOOKING_LARAVEL_AUTHORITY_R20_4_START"

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
  echo "Booking Laravel authority is already installed for ${HOST}."
else
  python3 - "${CONF}" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text()
marker = "    # Admin remains TastyIgniter/Laravel.\n"

if marker not in text:
    raise SystemExit("ERROR: expected HTTPS insertion marker was not found")

block = r'''    # PMD_PUBLIC_BOOKING_LARAVEL_AUTHORITY_R20_4_START
    # /book is a Laravel/TastyIgniter reservation authority. Keep it out of
    # the customer Next.js upstream so POST endpoints preserve sessions, CSRF,
    # reservation validation, Stripe SetupIntent creation and Manage Booking.
    location = /book {
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
    # PMD_PUBLIC_BOOKING_LARAVEL_AUTHORITY_R20_4_END

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
echo "GET /book routing:"
curl -sS -D - -o /dev/null "https://${HOST}/book?lang=en" | grep -Ei 'HTTP/|X-PMD-R30F-(Vhost|Route)' || true

echo
echo "POST /book/guarantee/setup routing probe:"
PROBE_HEADERS="$(mktemp)"
PROBE_BODY="$(mktemp)"
trap 'rm -f "${PROBE_HEADERS}" "${PROBE_BODY}"' EXIT

curl -sS   -D "${PROBE_HEADERS}"   -o "${PROBE_BODY}"   -X POST   -H 'Accept: application/json'   -H 'Content-Type: application/json'   --data '{}'   "https://${HOST}/book/guarantee/setup" || true

cat "${PROBE_HEADERS}" | grep -Ei 'HTTP/|Content-Type:|X-PMD-R30F-(Vhost|Route)' || true

if grep -Fqi 'X-PMD-R30F-Route: laravel-booking' "${PROBE_HEADERS}"; then
  echo
  echo "PASS: /book/guarantee/setup now reaches Laravel."
else
  echo
  echo "ERROR: booking setup did not return the Laravel routing header."
  echo "No automatic rollback was performed because nginx -t and reload succeeded."
  exit 1
fi

if grep -Eq '^HTTP/[^ ]+ 404 ' "${PROBE_HEADERS}"; then
  echo "ERROR: route still returned 404."
  exit 1
fi

echo
echo "R20.4 booking Nginx authority installed for ${HOST}."
