#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="/var/www/paymydine"
REMOTE="origin/sumup-inline-widget-r1"
BASE_SCRIPT="scripts/deploy-pmd-sumup-method-ux-r1.sh"
TMP="/tmp/deploy-pmd-sumup-method-ux-r1-auth-smoke-fixed.sh"

cd "$ROOT"
git fetch origin sumup-inline-widget-r1

git show "$REMOTE:$BASE_SCRIPT" > "$TMP"

python3 - "$TMP" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text()
old = '''echo
echo "========== HTTP SMOKE =========="
FRONT_HTTP="$(curl -ksS -o /dev/null -w '%{http_code}' "$FRONT_URL" || true)"
ADMIN_HTTP="$(curl -ksS -o /dev/null -w '%{http_code}' "$ADMIN_URL" || true)"
echo "FRONTEND_HTTP=$FRONT_HTTP"
echo "ADMIN_HTTP=$ADMIN_HTTP"
[ "$FRONT_HTTP" = "200" ] || { echo "ERROR: frontend smoke failed"; exit 13; }
[ "$ADMIN_HTTP" = "200" ] || { echo "ERROR: admin smoke failed"; exit 14; }
'''
new = '''echo
echo "========== HTTP SMOKE =========="
FRONT_HTTP="$(curl -ksS -o /dev/null -w '%{http_code}' "$FRONT_URL" || true)"
ADMIN_HEADERS="$(curl -ksS -D - -o /dev/null "$ADMIN_URL" || true)"
ADMIN_HTTP="$(printf '%s\\n' "$ADMIN_HEADERS" | awk 'toupper($1) ~ /^HTTP\\// {code=$2} END {print code}')"
ADMIN_LOCATION="$(printf '%s\\n' "$ADMIN_HEADERS" | awk 'BEGIN{IGNORECASE=1} /^Location:/ {sub(/^[^:]*:[[:space:]]*/, ""); sub(/\\r$/, ""); loc=$0} END {print loc}')"
echo "FRONTEND_HTTP=$FRONT_HTTP"
echo "ADMIN_HTTP=$ADMIN_HTTP"
[ -n "$ADMIN_LOCATION" ] && echo "ADMIN_LOCATION=$ADMIN_LOCATION"
[ "$FRONT_HTTP" = "200" ] || { echo "ERROR: frontend smoke failed"; exit 13; }
case "$ADMIN_HTTP" in
  200)
    echo "ADMIN_SMOKE=direct_200"
    ;;
  301|302|303|307|308)
    case "$ADMIN_LOCATION" in
      *admin*|*login*)
        echo "ADMIN_SMOKE=protected_route_redirect_ok"
        ;;
      *)
        echo "ERROR: admin redirected to unexpected location: ${ADMIN_LOCATION:-<empty>}"
        exit 14
        ;;
    esac
    ;;
  *)
    echo "ERROR: admin smoke failed with HTTP ${ADMIN_HTTP:-unknown}"
    exit 14
    ;;
esac
'''
count = text.count(old)
if count != 1:
    raise SystemExit(f'ERROR: expected one admin smoke block, found {count}')
text = text.replace(old, new, 1)
path.write_text(text)
print('ADMIN_AUTH_SMOKE_PATCH=OK')
PY

chmod 755 "$TMP"
bash -n "$TMP"
exec bash "$TMP"
