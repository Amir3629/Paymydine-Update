#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/paymydine}"
BRANCH="${PMD_BRANCH:-origin/feature/paymob-oman-r1}"
AUDIT_TENANT="${1:-${AUDIT_TENANT:-}}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="/var/backups/paymydine/location-live-clock-r10-$STAMP"
TMP_DIR="/tmp/pmd-location-live-clock-r10-$STAMP"

CLOCK_JS="app/admin/assets/js/pmd-location-live-clock-r10.js"
CLOCK_CSS="app/admin/assets/css/pmd-location-live-clock-r10.css"
ASSETS="app/admin/views/_meta/assets.json"
ROUTES="routes/terminal-payments.php"
SERVICE="app/Services/Platform/LocationClockStateService.php"
HEADER="app/admin/views/_partials/top_nav_user_menu.blade.php"

cd "$APP_DIR"

echo "=== PMD LOCATION CLOCK R10 - INSTANT REFRESH ==="
echo "Branch: $BRANCH"
if [ -n "$AUDIT_TENANT" ]; then
  echo "Audit tenant: $AUDIT_TENANT"
fi
echo

# R10 is an enhancement of the already-installed safe R9 endpoint.
if [ ! -f "$SERVICE" ] || ! grep -q "PMD_LOCATION_CLOCK_STATE_R9" "$SERVICE"; then
  echo "STOP: safe location-clock service from R9 is not installed." >&2
  exit 10
fi
if [ ! -f "$ROUTES" ] || ! grep -q "PMD_LOCATION_CLOCK_STATE_ROUTE_R9" "$ROUTES"; then
  echo "STOP: safe /location-clock/state route from R9 is not installed." >&2
  exit 11
fi
if grep -q "PMD_LOCATION_LIVE_CLOCK_CONFIG_R8" "$HEADER" 2>/dev/null; then
  echo "STOP: retired R8 Blade clock logic is present; R10 will not touch that shared Blade." >&2
  exit 12
fi

git fetch origin feature/paymob-oman-r1

rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR/app/admin/assets/js"
mkdir -p "$TMP_DIR/app/admin/assets/css"
mkdir -p "$TMP_DIR/app/admin/views/_meta"
sudo mkdir -p "$BACKUP_DIR"

for path in "$CLOCK_JS" "$CLOCK_CSS"; do
  git show "$BRANCH:$path" > "$TMP_DIR/$path"
done
cp "$ASSETS" "$TMP_DIR/$ASSETS"

echo "--- Patch live asset manifest copy ---"
python3 - "$TMP_DIR/$ASSETS" <<'PY'
from pathlib import Path
import json
import sys

path = Path(sys.argv[1])
data = json.loads(path.read_text())
styles = list(data.get('style') or [])
scripts = list(data.get('script') or [])

old_css = {
    'css/pmd-location-live-clock-r8.css',
    'css/pmd-location-live-clock-r9.css',
    'css/pmd-location-live-clock-r10.css',
}
old_js = {
    'js/pmd-location-live-clock-r8.js',
    'js/pmd-location-live-clock-r9.js',
    'js/pmd-location-live-clock-r10.js',
}
styles = [x for x in styles if x.get('path') not in old_css]
scripts = [x for x in scripts if x.get('path') not in old_js]

clock_css = {
    'path': 'css/pmd-location-live-clock-r10.css',
    'name': 'pmd-location-live-clock-r10-css',
}
clock_js = {
    'path': 'js/pmd-location-live-clock-r10.js',
    'name': 'pmd-location-live-clock-r10-js',
}

def insert_after(items, after_path, value):
    for i, item in enumerate(items):
        if item.get('path') == after_path:
            items.insert(i + 1, value)
            return
    items.append(value)

insert_after(styles, 'css/pmd-new-tenant-onboarding-r7.css', clock_css)
insert_after(scripts, 'js/pmd-admin-favicon-final-r21.js', clock_js)

data['style'] = styles
data['script'] = scripts
path.write_text(json.dumps(data, indent=2, ensure_ascii=False) + '\n')

style_paths = [x.get('path') for x in styles]
script_paths = [x.get('path') for x in scripts]
if style_paths.count(clock_css['path']) != 1:
    raise SystemExit('R10 CSS must be registered exactly once.')
if script_paths.count(clock_js['path']) != 1:
    raise SystemExit('R10 JS must be registered exactly once.')
if any(p in style_paths for p in ['css/pmd-location-live-clock-r8.css', 'css/pmd-location-live-clock-r9.css']):
    raise SystemExit('Retired R8/R9 clock CSS is still registered.')
if any(p in script_paths for p in ['js/pmd-location-live-clock-r8.js', 'js/pmd-location-live-clock-r9.js']):
    raise SystemExit('Retired R8/R9 clock JS is still registered.')

# Preserve Oman Finance anti-blink ordering.
r7 = script_paths.index('js/pmd-new-tenant-onboarding-r7.js')
legacy = script_paths.index('js/pmd-payment-provider-catalogue-v1.js')
finance = script_paths.index('js/pmd-finance-market-r4.js')
if not (r7 < legacy < finance):
    raise SystemExit('Existing R7 Finance ordering invariant was broken.')

print(f'R10 assets OK; R7 Finance ordering preserved: {r7} -> {legacy} -> {finance}')
PY

echo
echo "--- Preflight ---"
php -r 'json_decode(file_get_contents($argv[1]), true, 512, JSON_THROW_ON_ERROR); echo "JSON OK\n";' "$TMP_DIR/$ASSETS"
if command -v node >/dev/null 2>&1; then
  node --check "$TMP_DIR/$CLOCK_JS"
fi

grep -q "PMD_LOCATION_LIVE_CLOCK_R10" "$TMP_DIR/$CLOCK_JS"
grep -q "restoreCachedState" "$TMP_DIR/$CLOCK_JS"
grep -q "sessionStorage" "$TMP_DIR/$CLOCK_JS"
grep -q "Zero-delay refresh path" "$TMP_DIR/$CLOCK_JS"
grep -q "server_client_offset_ms" "$TMP_DIR/$CLOCK_JS"
grep -q "PMD_LOCATION_LIVE_CLOCK_R10" "$TMP_DIR/$CLOCK_CSS"
echo "R10 instant-first-paint markers OK"

echo
echo "--- Backup live target files ---"
for path in "$CLOCK_JS" "$CLOCK_CSS" "$ASSETS"; do
  if [ -e "$path" ]; then
    sudo mkdir -p "$BACKUP_DIR/$(dirname "$path")"
    sudo cp -a "$path" "$BACKUP_DIR/$path"
  fi
done
# Back up currently deployed R9 assets if they still exist.
for path in app/admin/assets/js/pmd-location-live-clock-r9.js app/admin/assets/css/pmd-location-live-clock-r9.css; do
  if [ -e "$path" ]; then
    sudo mkdir -p "$BACKUP_DIR/$(dirname "$path")"
    sudo cp -a "$path" "$BACKUP_DIR/$path"
  fi
done

echo
echo "--- Install R10 ---"
install_file() {
  local src="$1"
  local dst="$2"
  local parent owner group mode
  parent="$(dirname "$dst")"
  sudo mkdir -p "$parent"

  if [ -e "$dst" ]; then
    owner="$(stat -c '%U' "$dst")"
    group="$(stat -c '%G' "$dst")"
    mode="$(stat -c '%a' "$dst")"
  else
    owner="$(stat -c '%U' "$parent" 2>/dev/null || echo root)"
    group="$(stat -c '%G' "$parent" 2>/dev/null || echo root)"
    mode="644"
  fi

  sudo install -o "$owner" -g "$group" -m "$mode" "$src" "$dst"
}

install_file "$TMP_DIR/$CLOCK_JS" "$CLOCK_JS"
install_file "$TMP_DIR/$CLOCK_CSS" "$CLOCK_CSS"
install_file "$TMP_DIR/$ASSETS" "$ASSETS"

sudo rm -f \
  app/admin/assets/js/pmd-location-live-clock-r8.js \
  app/admin/assets/css/pmd-location-live-clock-r8.css \
  app/admin/assets/js/pmd-location-live-clock-r9.js \
  app/admin/assets/css/pmd-location-live-clock-r9.css

echo
echo "--- Installed validation ---"
php -r 'json_decode(file_get_contents($argv[1]), true, 512, JSON_THROW_ON_ERROR); echo "Installed JSON OK\n";' "$ASSETS"
if command -v node >/dev/null 2>&1; then
  node --check "$CLOCK_JS"
fi

grep -n "pmd-location-live-clock-r10" "$ASSETS"
grep -n "Zero-delay refresh path" "$CLOCK_JS"

if grep -q "pmd-location-live-clock-r9" "$ASSETS"; then
  echo "ERROR: R9 clock asset registration remains after R10 install." >&2
  exit 13
fi

echo
echo "--- Clear Laravel/TastyIgniter caches ---"
if [ -f artisan ]; then
  sudo php artisan optimize:clear || php artisan optimize:clear || true
fi

echo
echo "--- Clock endpoint source verification ---"
grep -q "PMD_LOCATION_CLOCK_STATE_ROUTE_R9" "$ROUTES"
grep -q "location-clock/state" "$ROUTES"
echo "Safe clock endpoint remains installed"

if [ -n "$AUDIT_TENANT" ] && command -v curl >/dev/null 2>&1; then
  CLOCK_URL="https://$AUDIT_TENANT/admin/location-clock/state"
  HTTP_STATUS="$(curl -k -sS --max-time 15 -o /dev/null -w '%{http_code}' "$CLOCK_URL" || true)"
  case "$HTTP_STATUS" in
    200|401|302|303)
      echo "Clock endpoint reachable: $CLOCK_URL -> $HTTP_STATUS"
      ;;
    404)
      echo "ERROR: clock endpoint returned 404." >&2
      exit 14
      ;;
    *)
      echo "WARNING: clock endpoint probe returned HTTP ${HTTP_STATUS:-unavailable}; source verification passed."
      ;;
  esac
fi

AUDIT_STATUS=0
if [ -n "$AUDIT_TENANT" ] && [ -f scripts/audit-location-market-r4.php ]; then
  echo
echo "--- Re-check tenant location/timezone truth ---"
  set +e
  php scripts/audit-location-market-r4.php "$AUDIT_TENANT"
  AUDIT_STATUS=$?
  set -e
fi

echo
echo "=============================================="
echo "LOCATION CLOCK R10 INSTANT REFRESH DEPLOYED"
echo "Backup: $BACKUP_DIR"
echo "=============================================="
echo "- Refresh first paint restores the last verified restaurant clock immediately from sessionStorage."
echo "- No network wait is required before the visible HH:MM:SS appears on subsequent refreshes."
echo "- The safe server endpoint still verifies/corrects active location and timezone in the background."
echo "- Cached server/client offset preserves server-time truth; browser timezone is never used."
echo "- Cache is tab-scoped and expires after 30 minutes."
echo "- New R10 asset filenames avoid stale browser caching of R9."
echo "- Shared header Blade remains untouched."

if [ -n "$AUDIT_TENANT" ] && [ -f scripts/audit-location-market-r4.php ]; then
  if [ "$AUDIT_STATUS" -ne 0 ]; then
    echo "ERROR: location/market audit failed for $AUDIT_TENANT" >&2
    exit 15
  fi
  echo "- Location/market audit passed for: $AUDIT_TENANT"
fi
