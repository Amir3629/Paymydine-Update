#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
ROUTES="$ROOT/app/admin/routes.php"
URL="https://mimoza.paymydine.com/admin/_pmd/language-switch-v3"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
OUT="$HOME/pmd-language-activation-$STAMP"
mkdir -p "$OUT"
cd "$ROOT"

echo "============================================================"
echo " PMD LANGUAGE BUTTON ACTIVATE V6"
echo "============================================================"

if [[ ! -f "$ROUTES" ]]; then
  echo "ERROR=Missing routes.php" >&2
  exit 1
fi

php -l "$ROUTES"

grep -q "'source' => 'tenant-db-v4'" "$ROUTES" || {
  echo "ERROR=tenant-db-v4 route is not present on disk." >&2
  exit 2
}

echo "ROUTE_SOURCE_ON_DISK=tenant-db-v4"
sha256sum "$ROUTES"

# Clear only compiled Blade views. Failure is non-fatal because this route is PHP,
# not a compiled Blade route.
set +e
php artisan view:clear >"$OUT/view-clear.txt" 2>&1
view_rc=$?
set -e
echo "VIEW_CLEAR_RC=$view_rc"

# Gracefully reload any running PHP-FPM service so OPcache workers pick up the
# new route source. This does not restart nginx and does not modify application data.
mapfile -t fpm_services < <(
  systemctl list-units --type=service --state=running --no-legend 2>/dev/null \
    | awk '$1 ~ /^php[0-9.]+-fpm.service$/ {print $1}'
)

if [[ ${#fpm_services[@]} -eq 0 ]]; then
  # Fallback for systems where list-units output is restricted.
  for svc in php8.4-fpm.service php8.3-fpm.service php8.2-fpm.service php8.1-fpm.service; do
    if systemctl is-active --quiet "$svc" 2>/dev/null; then
      fpm_services+=("$svc")
    fi
  done
fi

if [[ ${#fpm_services[@]} -eq 0 ]]; then
  echo "ERROR=No running PHP-FPM service detected." >&2
  systemctl list-units --type=service --state=running | grep -Ei 'php|fpm' || true
  exit 3
fi

for svc in "${fpm_services[@]}"; do
  echo "RELOADING_FPM=$svc"
  sudo systemctl reload "$svc"
  systemctl is-active "$svc"
done

sleep 1

# Unauthenticated probe. We do NOT expect success; we only require that the
# request is no longer the old route's 404. Depending on CSRF/session handling,
# 401/419/302/405 are acceptable registration signals.
set +e
http_code="$(curl -sS --max-time 20 \
  -o "$OUT/probe-body.txt" \
  -D "$OUT/probe-headers.txt" \
  -w '%{http_code}' \
  -X POST \
  -H 'Accept: application/json' \
  -H 'X-Requested-With: XMLHttpRequest' \
  --data 'code=de' \
  "$URL")"
curl_rc=$?
set -e

echo "PROBE_CURL_RC=$curl_rc"
echo "PROBE_HTTP_CODE=$http_code"
echo "PROBE_BODY_BEGIN"
head -c 1200 "$OUT/probe-body.txt" || true
echo
echo "PROBE_BODY_END"

if [[ "$curl_rc" -ne 0 ]]; then
  echo "ERROR=HTTP probe failed before reaching the app." >&2
  exit 4
fi

# A 404 containing the OLD language message proves stale application code.
if [[ "$http_code" == "404" ]] && grep -q 'Language is not enabled' "$OUT/probe-body.txt"; then
  echo "ERROR=Old language route is still being served after FPM reload." >&2
  exit 5
fi

# Any response carrying the new source marker proves V4 is live.
if grep -q 'tenant-db-v4' "$OUT/probe-body.txt"; then
  echo "LIVE_ROUTE_SOURCE=tenant-db-v4"
else
  echo "LIVE_ROUTE_SOURCE=not-visible-with-unauthenticated-probe"
fi

echo "ACTIVATION_OK=1"
echo "OUTPUT=$OUT"
echo "NEXT=Reload the Mimoza admin page once and click the language button."
