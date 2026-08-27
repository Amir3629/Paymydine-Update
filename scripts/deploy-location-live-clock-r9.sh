#!/usr/bin/env bash
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/paymydine}"
BRANCH="${PMD_BRANCH:-origin/feature/paymob-oman-r1}"
AUDIT_TENANT="${1:-${AUDIT_TENANT:-}}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_DIR="/var/backups/paymydine/location-live-clock-r9-$STAMP"
TMP_DIR="/tmp/pmd-location-live-clock-r9-$STAMP"

SERVICE="app/Services/Platform/LocationClockStateService.php"
CLOCK_JS="app/admin/assets/js/pmd-location-live-clock-r9.js"
CLOCK_CSS="app/admin/assets/css/pmd-location-live-clock-r9.css"
ROUTES="routes/terminal-payments.php"
ASSETS="app/admin/views/_meta/assets.json"
HEADER="app/admin/views/_partials/top_nav_user_menu.blade.php"

cd "$APP_DIR"

echo "=== PMD LOCATION-AWARE LIVE HEADER CLOCK R9 ==="
echo "Branch: $BRANCH"
if [ -n "$AUDIT_TENANT" ]; then
  echo "Audit tenant: $AUDIT_TENANT"
fi
echo

# R9 deliberately refuses to put database/timezone work back in shared Blade.
if grep -q "PMD_LOCATION_LIVE_CLOCK_CONFIG_R8" "$HEADER" 2>/dev/null; then
  echo "STOP: retired R8 Blade clock logic is still present in $HEADER" >&2
  echo "Restore the header partial before deploying R9." >&2
  exit 10
fi

git fetch origin feature/paymob-oman-r1

rm -rf "$TMP_DIR"
mkdir -p "$TMP_DIR/app/Services/Platform"
mkdir -p "$TMP_DIR/app/admin/assets/js"
mkdir -p "$TMP_DIR/app/admin/assets/css"
mkdir -p "$TMP_DIR/routes"
mkdir -p "$TMP_DIR/app/admin/views/_meta"
sudo mkdir -p "$BACKUP_DIR"

# Only new R9 source files are taken wholesale from GitHub.
for path in "$SERVICE" "$CLOCK_JS" "$CLOCK_CSS"; do
  git show "$BRANCH:$path" > "$TMP_DIR/$path"
done

# Live routes/assets may contain work from other chats. Patch copies of the
# current live files instead of replacing them with branch snapshots.
cp "$ROUTES" "$TMP_DIR/$ROUTES"
cp "$ASSETS" "$TMP_DIR/$ASSETS"

echo "--- Patch live route copy ---"
python3 - "$TMP_DIR/$ROUTES" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text()
marker = "Route::middleware(['web'])->prefix(config('system.adminUri', 'admin'))->group(function () {\n"
route = r'''    // PMD_LOCATION_CLOCK_STATE_ROUTE_R9
    // Read-only. Shared Header Blade remains presentation-only.
    Route::get('/location-clock/state', function (\App\Services\Platform\LocationClockStateService $clock) {
        $user = \Admin\Facades\AdminAuth::getUser();
        if (!$user) {
            return response()->json(['ok' => false, 'message' => 'Unauthenticated.'], 401);
        }

        try {
            $response = response()->json([
                'ok' => true,
                'clock' => $clock->state(),
            ]);
            $response->headers->set('Cache-Control', 'no-store, no-cache, must-revalidate, private');
            $response->headers->set('Pragma', 'no-cache');
            return $response;
        } catch (\Throwable $error) {
            report($error);
            return response()->json([
                'ok' => false,
                'message' => 'Location clock state is unavailable.',
            ], 500);
        }
    })->name('pmd.location-clock.state');

'''

if 'PMD_LOCATION_CLOCK_STATE_ROUTE_R9' not in text:
    if marker not in text:
        raise SystemExit('STOP: Admin route group marker not found; live routes were not changed.')
    text = text.replace(marker, marker + route, 1)

path.write_text(text)
PY

echo "--- Patch live asset manifest copy ---"
python3 - "$TMP_DIR/$ASSETS" <<'PY'
from pathlib import Path
import json
import sys

path = Path(sys.argv[1])
data = json.loads(path.read_text())
styles = list(data.get('style') or [])
scripts = list(data.get('script') or [])

# Retire both any residual R8 registration and duplicate R9 registration.
styles = [x for x in styles if x.get('path') not in {
    'css/pmd-location-live-clock-r8.css',
    'css/pmd-location-live-clock-r9.css',
}]
scripts = [x for x in scripts if x.get('path') not in {
    'js/pmd-location-live-clock-r8.js',
    'js/pmd-location-live-clock-r9.js',
}]

clock_css = {
    'path': 'css/pmd-location-live-clock-r9.css',
    'name': 'pmd-location-live-clock-r9-css',
}
clock_js = {
    'path': 'js/pmd-location-live-clock-r9.js',
    'name': 'pmd-location-live-clock-r9-js',
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
if style_paths.count(clock_css['path']) != 1 or script_paths.count(clock_js['path']) != 1:
    raise SystemExit('R9 clock assets are not registered exactly once.')
if 'css/pmd-location-live-clock-r8.css' in style_paths or 'js/pmd-location-live-clock-r8.js' in script_paths:
    raise SystemExit('Retired R8 clock assets are still registered.')

# Preserve the Oman Finance anti-blink owner ordering from R7.
r7 = script_paths.index('js/pmd-new-tenant-onboarding-r7.js')
legacy = script_paths.index('js/pmd-payment-provider-catalogue-v1.js')
finance = script_paths.index('js/pmd-finance-market-r4.js')
if not (r7 < legacy < finance):
    raise SystemExit('Existing R7 Finance ordering invariant was broken.')

print(f'R9 assets OK; R7 Finance ordering preserved: {r7} -> {legacy} -> {finance}')
PY

echo
echo "--- Preflight ---"
php -l "$TMP_DIR/$SERVICE"
php -l "$TMP_DIR/$ROUTES"
php -r 'json_decode(file_get_contents($argv[1]), true, 512, JSON_THROW_ON_ERROR); echo "JSON OK\n";' "$TMP_DIR/$ASSETS"

if command -v node >/dev/null 2>&1; then
  node --check "$TMP_DIR/$CLOCK_JS"
else
  echo "node not installed; JS invariant checks will still run"
fi

grep -q "PMD_LOCATION_CLOCK_STATE_R9" "$TMP_DIR/$SERVICE"
grep -q "server_epoch_ms" "$TMP_DIR/$SERVICE"
grep -q "PMD_LOCATION_CLOCK_STATE_ROUTE_R9" "$TMP_DIR/$ROUTES"
grep -q "PMD_LOCATION_LIVE_CLOCK_R9" "$TMP_DIR/$CLOCK_JS"
grep -q "server_epoch_ms" "$TMP_DIR/$CLOCK_JS"
grep -q "hourCycle: 'h23'" "$TMP_DIR/$CLOCK_JS"
grep -q "second: '2-digit'" "$TMP_DIR/$CLOCK_JS"
grep -q "PMD_LOCATION_LIVE_CLOCK_R9" "$TMP_DIR/$CLOCK_CSS"
echo "R9 invariant markers OK"

echo
echo "--- Backup live target files ---"
for path in "$SERVICE" "$CLOCK_JS" "$CLOCK_CSS" "$ROUTES" "$ASSETS"; do
  if [ -e "$path" ]; then
    sudo mkdir -p "$BACKUP_DIR/$(dirname "$path")"
    sudo cp -a "$path" "$BACKUP_DIR/$path"
  fi
done

echo
echo "--- Install R9 ---"
install_file() {
  local src="$1"
  local dst="$2"
  local parent
  parent="$(dirname "$dst")"
  sudo mkdir -p "$parent"

  local owner group mode
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

install_file "$TMP_DIR/$SERVICE" "$SERVICE"
install_file "$TMP_DIR/$CLOCK_JS" "$CLOCK_JS"
install_file "$TMP_DIR/$CLOCK_CSS" "$CLOCK_CSS"
install_file "$TMP_DIR/$ROUTES" "$ROUTES"
install_file "$TMP_DIR/$ASSETS" "$ASSETS"

# Remove retired R8 static files only; shared Blade is intentionally untouched.
sudo rm -f \
  app/admin/assets/js/pmd-location-live-clock-r8.js \
  app/admin/assets/css/pmd-location-live-clock-r8.css

echo
echo "--- Installed validation ---"
php -l "$SERVICE"
php -l "$ROUTES"
php -r 'json_decode(file_get_contents($argv[1]), true, 512, JSON_THROW_ON_ERROR); echo "Installed JSON OK\n";' "$ASSETS"
if command -v node >/dev/null 2>&1; then
  node --check "$CLOCK_JS"
fi

grep -n "PMD_LOCATION_CLOCK_STATE_ROUTE_R9" "$ROUTES"
grep -n "pmd-location-live-clock-r9" "$ASSETS"

if grep -q "PMD_LOCATION_LIVE_CLOCK_CONFIG_R8" "$HEADER"; then
  echo "ERROR: shared header unexpectedly contains retired R8 logic after install." >&2
  exit 11
fi

echo
echo "--- Clear Laravel/TastyIgniter caches ---"
if [ -f artisan ]; then
  sudo php artisan optimize:clear || php artisan optimize:clear || true
fi

echo
echo "--- Route verification ---"
set +e
ROUTE_OUTPUT="$(php artisan route:list 2>&1)"
ROUTE_STATUS=$?
set -e
if [ "$ROUTE_STATUS" -ne 0 ]; then
  echo "$ROUTE_OUTPUT" >&2
  echo "ERROR: route:list failed after R9 install." >&2
  exit 12
fi
if ! printf '%s\n' "$ROUTE_OUTPUT" | grep -q "location-clock/state"; then
  echo "ERROR: /location-clock/state is not registered." >&2
  exit 13
fi
echo "Location clock route registered"

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
echo "LOCATION-AWARE LIVE HEADER CLOCK R9 DEPLOYED"
echo "Backup: $BACKUP_DIR"
echo "=============================================="
echo "- Visible clock: HH:MM:SS only; no date."
echo "- Active Location timezone wins; market/tenant timezone are safe fallbacks."
echo "- Server epoch keeps time independent from browser timezone/device clock."
echo "- Shared header Blade was NOT modified by R9."
echo "- Live route/assets were patched in place so unrelated VPS work is preserved."
echo "- Clock resyncs from the server every 5 minutes and on tab focus."

if [ -n "$AUDIT_TENANT" ] && [ -f scripts/audit-location-market-r4.php ]; then
  if [ "$AUDIT_STATUS" -ne 0 ]; then
    echo "ERROR: location/market audit failed for $AUDIT_TENANT" >&2
    exit 14
  fi
  echo "- Location/market audit passed for: $AUDIT_TENANT"
fi
