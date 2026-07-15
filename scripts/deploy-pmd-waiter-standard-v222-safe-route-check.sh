#!/usr/bin/env bash
set -Eeuo pipefail

LIVE="/var/www/paymydine"
BRANCH="agent/waiter-pos-standard-v221-route-theme-payment"
REF="origin/$BRANCH"
BASE_SCRIPT="/tmp/deploy-pmd-waiter-standard-v221-base.sh"
PATCHED_SCRIPT="/tmp/deploy-pmd-waiter-standard-v222-safe.sh"

cleanup() {
  rm -f "$BASE_SCRIPT" "$PATCHED_SCRIPT"
}
trap cleanup EXIT

cd "$LIVE"

cat <<'TXT'
========================================================
PMD Waiter Standard POS V2.2.2
Safe Laravel route-collection verification
========================================================
TXT

echo
echo "== Fetching corrected deployment source =="

git fetch --no-tags origin \
  "$BRANCH:refs/remotes/origin/$BRANCH"

echo "Branch commit:"
git rev-parse "$REF"

git show \
  "$REF:scripts/deploy-pmd-waiter-standard-v221.sh" \
  > "$BASE_SCRIPT"

chmod +x "$BASE_SCRIPT"
bash -n "$BASE_SCRIPT"

echo
echo "== Replacing only the unsafe artisan route:list verifier =="

python3 - "$BASE_SCRIPT" "$PATCHED_SCRIPT" <<'PY'
from pathlib import Path
import sys

source_path = Path(sys.argv[1])
target_path = Path(sys.argv[2])
text = source_path.read_text(encoding="utf-8")

old = r'''echo
echo "== Booting Laravel and confirming V2.2 routes =="

set +e
ROUTE_OUTPUT="$(php artisan route:list 2>&1)"
ROUTE_STATUS=$?
set -e

echo "$ROUTE_OUTPUT" | grep -E 'pmd-waiter-pos-v22|Fatal|Error|Exception' | head -80 || true

if [[ "$ROUTE_STATUS" -ne 0 ]]; then
  echo "ERROR: Laravel route boot failed with status $ROUTE_STATUS."
  echo "$ROUTE_OUTPUT" | tail -120
  exit 1
fi

if ! echo "$ROUTE_OUTPUT" | grep -Fq 'pmd-waiter-pos-v22/operations'; then
  echo "ERROR: Laravel booted but V2.2 operations routes are absent."
  echo "$ROUTE_OUTPUT" | tail -120
  exit 1
fi

echo "PMD_V221_OPERATION_ROUTES_REGISTERED_OK"'''

new = r'''echo
echo "== Booting Laravel router without resolving unrelated controllers =="

ROUTE_VERIFY="$TMP/pmd-v222-route-collection-check.php"

cat > "$ROUTE_VERIFY" <<'PHP'
<?php

declare(strict_types=1);

$root = getcwd();

require $root.'/vendor/autoload.php';
$app = require $root.'/bootstrap/app.php';

$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$router = $app->make('router');
$registered = [];

foreach ($router->getRoutes() as $route) {
    $uri = ltrim((string)$route->uri(), '/');

    if (strpos($uri, 'pmd-waiter-pos-v22/operations') === false) {
        continue;
    }

    $registered[$uri] = array_values(array_filter(
        $route->methods(),
        static fn (string $method): bool => $method !== 'HEAD'
    ));
}

$required = [
    'admin/pmd-waiter-pos-v22/operations/{orderId}' => 'GET',
    'admin/pmd-waiter-pos-v22/operations/{orderId}/transfer' => 'POST',
    'admin/pmd-waiter-pos-v22/operations/{orderId}/merge' => 'POST',
    'admin/pmd-waiter-pos-v22/operations/{orderId}/move-items' => 'POST',
    'admin/pmd-waiter-pos-v22/operations/{orderId}/item-service' => 'POST',
    'admin/pmd-waiter-pos-v22/operations/{orderId}/void-item' => 'POST',
    'admin/pmd-waiter-pos-v22/operations/{orderId}/void-order' => 'POST',
    'admin/pmd-waiter-pos-v22/operations/{orderId}/reopen' => 'POST',
    'admin/pmd-waiter-pos-v22/operations/{orderId}/print-links' => 'GET',
];

$missing = [];

foreach ($required as $uri => $method) {
    if (!isset($registered[$uri]) || !in_array($method, $registered[$uri], true)) {
        $missing[] = $method.' '.$uri;
    }
}

if ($missing) {
    fwrite(STDERR, "Missing V2.2 routes:\n - ".implode("\n - ", $missing)."\n");
    fwrite(STDERR, "Registered matching routes:\n".json_encode($registered, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)."\n");
    exit(1);
}

echo "PMD_V222_ROUTE_COLLECTION_OK\n";
foreach ($registered as $uri => $methods) {
    echo implode('|', $methods).' '.$uri."\n";
}
PHP

set +e
ROUTE_OUTPUT="$(php "$ROUTE_VERIFY" 2>&1)"
ROUTE_STATUS=$?
set -e

echo "$ROUTE_OUTPUT"

if [[ "$ROUTE_STATUS" -ne 0 ]]; then
  echo "ERROR: Laravel router boot or V2.2 route verification failed with status $ROUTE_STATUS."
  exit 1
fi

if ! echo "$ROUTE_OUTPUT" | grep -Fq 'PMD_V222_ROUTE_COLLECTION_OK'; then
  echo "ERROR: Route collection verifier did not return its success marker."
  exit 1
fi

echo "PMD_V221_OPERATION_ROUTES_REGISTERED_OK"'''

if old not in text:
    raise SystemExit("ERROR: Expected V2.2.1 route-list verifier block was not found")

if text.count(old) != 1:
    raise SystemExit("ERROR: Unexpected verifier block count")

text = text.replace(old, new, 1)
text = text.replace(
    "PMD Waiter Standard POS V2.2.1\nDirect routes + Light/Dark + Toast-style payment",
    "PMD Waiter Standard POS V2.2.2\nSafe routes + Light/Dark + Toast-style payment",
    1,
)
text = text.replace(
    "PMD Waiter Standard POS V2.2.1 installed",
    "PMD Waiter Standard POS V2.2.2 installed",
    1,
)
text = text.replace(
    "✓ Route errors are displayed instead of hidden",
    "✓ Routes verified from Laravel Router without resolving unrelated legacy controllers",
    1,
)

target_path.write_text(text, encoding="utf-8")
print("PMD_V222_SAFE_ROUTE_VERIFIER_PATCH_OK")
PY

chmod +x "$PATCHED_SCRIPT"
bash -n "$PATCHED_SCRIPT"

grep -Fq "PMD_V222_ROUTE_COLLECTION_OK" "$PATCHED_SCRIPT"
grep -Fq "PmdFloorPlanStable" "$PATCHED_SCRIPT" && {
  echo "ERROR: The corrected deployment script unexpectedly references PmdFloorPlanStable."
  exit 1
} || true

echo "PMD_V222_PATCHED_DEPLOYER_VALIDATION_OK"

echo
echo "== Running corrected selective deployment =="

bash "$PATCHED_SCRIPT"
