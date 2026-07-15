#!/usr/bin/env bash
set -Eeuo pipefail

LIVE="/var/www/paymydine"
BRANCH="agent/waiter-pos-final-v1"
REF="origin/$BRANCH"
TS="$(date +%Y%m%d_%H%M%S)"
TMP="/tmp/pmd-waiter-final-v1-$TS"
BACKUP="/var/backups/pmd-waiter-final-v1-$TS"
APP_ROUTES="$LIVE/app/admin/routes.php"
APP_ROUTES_TMP="$TMP/app/admin/routes.php"
INSTALLED=0

FILES=(
  "app/admin/controllers/PmdWaiterDashboardFinalV1.php"
  "app/admin/views/waiter_dashboard_final.blade.php"
  "app/admin/assets/css/pmd-waiter-final-v1.css"
  "app/admin/assets/js/pmd-waiter-final-v1.js"
  "routes/pmd-waiter-final-v1.php"
)

cleanup() {
  rm -rf "$TMP"
}

rollback() {
  local code="$?"

  if [[ "$code" -ne 0 && "$INSTALLED" -eq 1 ]]; then
    echo
    echo "ERROR after installation. Restoring the previous production state..."

    for FILE in "${FILES[@]}"; do
      if [[ -f "$BACKUP/$FILE.before" ]]; then
        sudo install -D -m 0644 "$BACKUP/$FILE.before" "$LIVE/$FILE"
      elif [[ -f "$BACKUP/$FILE.was-missing" ]]; then
        sudo rm -f "$LIVE/$FILE"
      fi
    done

    if [[ -f "$BACKUP/app/admin/routes.php.before" ]]; then
      sudo install -m 0644 "$BACKUP/app/admin/routes.php.before" "$APP_ROUTES"
    fi

    php artisan view:clear || true
    php artisan route:clear || true
    php artisan config:clear || true
    echo "Previous production files restored."
  fi

  cleanup
  exit "$code"
}

trap rollback EXIT

cd "$LIVE"

cat <<'TXT'
========================================================
PMD Waiter Final V1 — isolated workstation deployment
========================================================
TXT

echo
echo "== Confirming proven backend engines =="

REQUIRED_LIVE=(
  "app/admin/assets/js/pmd-waiter-pos-payment-v2.js"
  "app/admin/assets/js/pmd-waiter-pos-v1.js"
  "app/admin/assets/js/pmd-waiter-standard-v211-payment-guard.js"
  "app/admin/assets/js/pmd-waiter-standard-v21.js"
  "app/admin/assets/js/pmd-waiter-standard-v22.js"
  "app/admin/controllers/PmdWaiterPosV1.php"
  "app/admin/controllers/concerns/PmdWaiterPosPaymentSummaryConcern.php"
  "app/admin/controllers/concerns/PmdWaiterPosOperationsV22Concern.php"
  "routes/pmd-waiter-pos-v22.php"
)

for FILE in "${REQUIRED_LIVE[@]}"; do
  if [[ ! -s "$FILE" ]]; then
    echo "ERROR: Required proven engine file is missing: $FILE"
    exit 1
  fi
done

grep -Fq "pmd-waiter-pos-v2.1.2" \
  app/admin/controllers/concerns/PmdWaiterPosPaymentSummaryConcern.php

grep -Fq "Waiter Standard POS V2.2 operations" \
  app/admin/assets/js/pmd-waiter-standard-v22.js

echo "PMD_WAITER_FINAL_BACKEND_BASELINE_OK"

echo
echo "== Fetching isolated final branch =="

git fetch --no-tags origin \
  "$BRANCH:refs/remotes/origin/$BRANCH"

COMMIT="$(git rev-parse "$REF")"
echo "Branch commit: $COMMIT"

mkdir -p "$TMP"

for FILE in "${FILES[@]}"; do
  mkdir -p "$TMP/$(dirname "$FILE")"
  git show "$REF:$FILE" > "$TMP/$FILE"
  echo "Extracted: $FILE"
done

echo
echo "== Validating all final sources before production changes =="

php -l "$TMP/app/admin/controllers/PmdWaiterDashboardFinalV1.php"
php -l "$TMP/app/admin/views/waiter_dashboard_final.blade.php"
php -l "$TMP/routes/pmd-waiter-final-v1.php"
node --check "$TMP/app/admin/assets/js/pmd-waiter-final-v1.js"

grep -Fq "PMD Waiter Final V1" "$TMP/app/admin/assets/css/pmd-waiter-final-v1.css"
grep -Fq "pmd-waiter-final-v1" "$TMP/app/admin/assets/js/pmd-waiter-final-v1.js"
grep -Fq "dashboardwaiternewfinal" "$TMP/routes/pmd-waiter-final-v1.php"
grep -Fq "data-pmd-waiter-final-root" "$TMP/app/admin/views/waiter_dashboard_final.blade.php"

if grep -Fq "pmd-waiter-standard-v221-theme" "$TMP/app/admin/views/waiter_dashboard_final.blade.php"; then
  echo "ERROR: Experimental V2.2.1 theme decorator must not be loaded on the final page."
  exit 1
fi

if grep -Fq "MutationObserver" "$TMP/app/admin/assets/js/pmd-waiter-final-v1.js"; then
  echo "ERROR: Final page owns no MutationObserver loops."
  exit 1
fi

if [[ ! -f "$APP_ROUTES" ]]; then
  echo "ERROR: Loaded admin route file was not found: $APP_ROUTES"
  exit 1
fi

mkdir -p "$(dirname "$APP_ROUTES_TMP")"
cp "$APP_ROUTES" "$APP_ROUTES_TMP"

echo
echo "== Registering the isolated route loader =="

python3 - "$APP_ROUTES_TMP" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding='utf-8')
start = '// PMD_WAITER_FINAL_V1_ROUTE_LOADER_START'
end = '// PMD_WAITER_FINAL_V1_ROUTE_LOADER_END'
block = """// PMD_WAITER_FINAL_V1_ROUTE_LOADER_START
if (file_exists(base_path('routes/pmd-waiter-final-v1.php'))) {
    require base_path('routes/pmd-waiter-final-v1.php');
}
// PMD_WAITER_FINAL_V1_ROUTE_LOADER_END

"""

if start in text and end in text:
    before, rest = text.split(start, 1)
    _, after = rest.split(end, 1)
    text = before + block + after.lstrip('\n')
else:
    anchor = '// PMD_ADMIN_QUICK_MODE_PREVIEW_20260616'
    if anchor not in text:
        raise SystemExit('ERROR: Safe route-loader anchor was not found')
    text = text.replace(anchor, block + anchor, 1)

path.write_text(text, encoding='utf-8')
print('PMD_WAITER_FINAL_ROUTE_LOADER_PATCH_OK')
PY

php -l "$APP_ROUTES_TMP"
grep -Fq "PMD_WAITER_FINAL_V1_ROUTE_LOADER_START" "$APP_ROUTES_TMP"

echo "PMD_WAITER_FINAL_SOURCE_VALIDATION_OK"

echo
echo "== Creating complete rollback backup =="

sudo mkdir -p "$BACKUP"

for FILE in "${FILES[@]}"; do
  sudo mkdir -p "$BACKUP/$(dirname "$FILE")"
  if [[ -f "$LIVE/$FILE" ]]; then
    sudo cp -a "$LIVE/$FILE" "$BACKUP/$FILE.before"
  else
    sudo touch "$BACKUP/$FILE.was-missing"
  fi
done

sudo mkdir -p "$BACKUP/app/admin"
sudo cp -a "$APP_ROUTES" "$BACKUP/app/admin/routes.php.before"

echo "Backup: $BACKUP"

echo
echo "== Installing only final isolated files =="

INSTALLED=1

for FILE in "${FILES[@]}"; do
  sudo install -D -m 0644 "$TMP/$FILE" "$LIVE/$FILE"
  echo "Installed: $FILE"
done

sudo install -m 0644 "$APP_ROUTES_TMP" "$APP_ROUTES"

if [[ -f app/admin/assets/js/pmd-waiter-pos-v1.js ]]; then
  sudo chown --reference=app/admin/assets/js/pmd-waiter-pos-v1.js \
    app/admin/assets/js/pmd-waiter-final-v1.js \
    app/admin/assets/css/pmd-waiter-final-v1.css || true
fi

if [[ -f app/admin/controllers/PmdWaiterPosV1.php ]]; then
  sudo chown --reference=app/admin/controllers/PmdWaiterPosV1.php \
    app/admin/controllers/PmdWaiterDashboardFinalV1.php || true
fi

echo
echo "== Validating installed production files =="

php -l app/admin/controllers/PmdWaiterDashboardFinalV1.php
php -l app/admin/views/waiter_dashboard_final.blade.php
php -l routes/pmd-waiter-final-v1.php
php -l app/admin/routes.php
node --check app/admin/assets/js/pmd-waiter-final-v1.js

echo
echo "== Clearing Laravel/TastyIgniter caches =="

php artisan view:clear
php artisan route:clear
php artisan config:clear

echo
echo "== Booting Laravel Router and confirming final routes =="

ROUTE_VERIFY="$TMP/pmd-final-route-check.php"
cat > "$ROUTE_VERIFY" <<'PHP'
<?php

declare(strict_types=1);

$root = getcwd();
require $root.'/vendor/autoload.php';
$app = require $root.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
$router = $app->make('router');

$required = [
    'admin/dashboardwaiternewfinal' => 'GET',
    'admin/waiter-final' => 'GET',
    'admin/pmd-waiter-pos-v1/overlay/{tableId}' => 'GET',
    'admin/pmd-waiter-pos-v22/operations/{orderId}' => 'GET',
];

$registered = [];
foreach ($router->getRoutes() as $route) {
    $uri = ltrim((string)$route->uri(), '/');
    if (isset($required[$uri])) {
        $registered[$uri] = array_values(array_filter(
            $route->methods(),
            static fn (string $method): bool => $method !== 'HEAD'
        ));
    }
}

$missing = [];
foreach ($required as $uri => $method) {
    if (!isset($registered[$uri]) || !in_array($method, $registered[$uri], true)) {
        $missing[] = $method.' '.$uri;
    }
}

if ($missing) {
    fwrite(STDERR, "Missing routes:\n - ".implode("\n - ", $missing)."\n");
    fwrite(STDERR, json_encode($registered, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)."\n");
    exit(1);
}

echo "PMD_WAITER_FINAL_ROUTE_COLLECTION_OK\n";
foreach ($registered as $uri => $methods) {
    echo implode('|', $methods).' '.$uri."\n";
}
PHP

php "$ROUTE_VERIFY"

grep -n "Waiter Final V1 isolated workstation active" \
  app/admin/assets/js/pmd-waiter-final-v1.js

grep -n "dashboardwaiternewfinal" routes/pmd-waiter-final-v1.php

cat <<TXT

========================================================
PMD Waiter Final V1 installed successfully
========================================================
✓ Completely separate URL and view
✓ Current waiter dashboards remain untouched
✓ One final responsive light/dark design authority
✓ No V2.2.1 theme decorator
✓ No final-page MutationObserver loop
✓ Live tables, search, areas and status priorities
✓ Waiter calls, ready items, notes and activity center
✓ Proven ordering, modifiers, notes and kitchen sending
✓ Proven payment, tip, coupon and split engine
✓ V2.2 operational backend remains available
✓ Phone: two-column tables and full-screen ordering/payment
✓ Automatic rollback after any failed validation

Preview:
https://mimoza.paymydine.com/admin/dashboardwaiternewfinal

Short URL:
https://mimoza.paymydine.com/admin/waiter-final

Console:
PMDWaiterFinalV1.debug()

Backup:
$BACKUP
========================================================
TXT

INSTALLED=0
trap - EXIT
cleanup
