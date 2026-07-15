#!/usr/bin/env bash
set -Eeuo pipefail

LIVE="/var/www/paymydine"
BRANCH="agent/waiter-pos-standard-v221-route-theme-payment"
REF="origin/$BRANCH"
PAYLOAD_DIR="scripts/pmd-waiter-standard-v22-payload"
EXPECTED_B64_SHA256="94846cf5d5ca4e290ba21752707c18b386140f279a84137e251e67fb83b48034"
EXPECTED_TGZ_SHA256="b11c8b6824f963b78c6d325cadbf4e59af56dbbb3f320c0c5ea026e62ec12785"

TS="$(date +%Y%m%d_%H%M%S)"
TMP="/tmp/pmd-waiter-standard-v221-$TS"
BACKUP="/var/backups/pmd-waiter-standard-v221-$TS"
APP_ROUTES="$LIVE/app/admin/routes.php"
APP_ROUTES_TMP="$TMP/app/admin/routes.php"
INSTALLED=0

PAYLOAD_FILES=(
  "app/admin/controllers/PmdWaiterPosV1.php"
  "app/admin/controllers/concerns/PmdWaiterPosOperationsV22Concern.php"
  "app/admin/controllers/concerns/PmdWaiterPosPaymentAllocationConcern.php"
  "app/admin/views/waiter_dashboard_new.blade.php"
  "app/admin/assets/css/pmd-waiter-standard-v22.css"
  "app/admin/assets/js/pmd-waiter-standard-v22.js"
  "routes/pmd-waiter-pos-v22.php"
)

THEME_FILES=(
  "app/admin/assets/css/pmd-waiter-standard-v221-theme.css"
  "app/admin/assets/js/pmd-waiter-standard-v221-theme.js"
)

ALL_FILES=("${PAYLOAD_FILES[@]}" "${THEME_FILES[@]}")

PARTS=(
  part01.b64 part02.b64 part03.b64 part04.b64 part05.b64 part06.b64
  part07a.b64 part07b.b64 part07c.b64 part07d.b64 part08.b64
)

cleanup() {
  rm -rf "$TMP"
}

rollback() {
  local code="$?"

  if [[ "$code" -ne 0 && "$INSTALLED" -eq 1 ]]; then
    echo
    echo "ERROR after installation. Restoring stable V2.1.2..."

    for FILE in "${ALL_FILES[@]}"; do
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

    echo "Stable V2.1.2 restored."
  fi

  cleanup
  exit "$code"
}

trap rollback EXIT

cd "$LIVE"

cat <<'TXT'
========================================================
PMD Waiter Standard POS V2.2.1
Direct routes + Light/Dark + Toast-style payment
========================================================
TXT

echo
echo "== Confirming stable V2.1.2 baseline =="

grep -Fq "pmd-waiter-pos-v2.1.2" \
  app/admin/controllers/concerns/PmdWaiterPosPaymentSummaryConcern.php

grep -Fq "Waiter Standard POS V2.1 complete operations layer active" \
  app/admin/assets/js/pmd-waiter-standard-v21.js

echo "PMD_WAITER_V212_STABLE_BASE_OK"

echo
echo "== Fetching isolated V2.2.1 branch =="

git fetch --no-tags origin \
  "$BRANCH:refs/remotes/origin/$BRANCH"

COMMIT="$(git rev-parse "$REF")"
echo "Branch commit: $COMMIT"

mkdir -p "$TMP"
: > "$TMP/payload.b64"

echo
echo "== Rebuilding validated V2.2 operations package =="

for PART in "${PARTS[@]}"; do
  git show "$REF:$PAYLOAD_DIR/$PART" >> "$TMP/payload.b64"
  echo "Read: $PART"
done

B64_SHA256="$(sha256sum "$TMP/payload.b64" | awk '{print $1}')"
echo "Expected base64 SHA256: $EXPECTED_B64_SHA256"
echo "Actual base64 SHA256:   $B64_SHA256"

if [[ "$B64_SHA256" != "$EXPECTED_B64_SHA256" ]]; then
  echo "ERROR: V2.2 payload chunks do not match the validated package."
  exit 1
fi

base64 -d "$TMP/payload.b64" > "$TMP/payload.tar.gz"
TGZ_SHA256="$(sha256sum "$TMP/payload.tar.gz" | awk '{print $1}')"
echo "Expected package SHA256: $EXPECTED_TGZ_SHA256"
echo "Actual package SHA256:   $TGZ_SHA256"

if [[ "$TGZ_SHA256" != "$EXPECTED_TGZ_SHA256" ]]; then
  echo "ERROR: Decoded V2.2 package hash is incorrect."
  exit 1
fi

tar -xzf "$TMP/payload.tar.gz" -C "$TMP"
rm -f "$TMP/payload.b64" "$TMP/payload.tar.gz"

echo
echo "== Extracting V2.2.1 theme/payment files =="

for FILE in "${THEME_FILES[@]}"; do
  mkdir -p "$TMP/$(dirname "$FILE")"
  git show "$REF:$FILE" > "$TMP/$FILE"
  echo "Extracted: $FILE"
done

for FILE in "${PAYLOAD_FILES[@]}"; do
  if [[ ! -s "$TMP/$FILE" ]]; then
    echo "ERROR: Extracted source is missing: $FILE"
    exit 1
  fi
done

for FILE in "${THEME_FILES[@]}"; do
  if [[ ! -s "$TMP/$FILE" ]]; then
    echo "ERROR: Theme source is missing: $FILE"
    exit 1
  fi
done

if [[ ! -f "$APP_ROUTES" ]]; then
  echo "ERROR: Loaded admin route file was not found: $APP_ROUTES"
  exit 1
fi

mkdir -p "$(dirname "$APP_ROUTES_TMP")"
cp "$APP_ROUTES" "$APP_ROUTES_TMP"

echo
echo "== Registering V2.2 routes in the actually loaded admin route file =="

python3 - "$APP_ROUTES_TMP" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")
start = "// PMD_WAITER_POS_V221_DIRECT_ROUTE_LOADER_START"
end = "// PMD_WAITER_POS_V221_DIRECT_ROUTE_LOADER_END"

if start not in text:
    anchor = "require_once base_path('routes/terminal-payments.php');\n"
    block = """

// PMD_WAITER_POS_V221_DIRECT_ROUTE_LOADER_START
// Directly loaded from app/admin/routes.php because this is the route file the
// tenant actually boots. The isolated file can be removed safely on rollback.
if (file_exists(base_path('routes/pmd-waiter-pos-v22.php'))) {
    require_once base_path('routes/pmd-waiter-pos-v22.php');
}
// PMD_WAITER_POS_V221_DIRECT_ROUTE_LOADER_END
"""
    if anchor not in text:
        raise SystemExit("ERROR: app/admin/routes.php insertion anchor was not found")
    text = text.replace(anchor, anchor + block, 1)

if text.count(start) != 1 or text.count(end) != 1:
    raise SystemExit("ERROR: Direct route loader marker count is invalid")

path.write_text(text, encoding="utf-8")
print("PMD_V221_DIRECT_ROUTE_LOADER_PATCH_OK")
PY

echo
echo "== Adding Light/Dark and Toast payment assets to the isolated Blade =="

python3 - "$TMP/app/admin/views/waiter_dashboard_new.blade.php" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")

css = "    <link rel=\"stylesheet\" href=\"{{ asset('app/admin/assets/css/pmd-waiter-standard-v221-theme.css') }}?v=221\">\n"
js = "<script src=\"{{ asset('app/admin/assets/js/pmd-waiter-standard-v221-theme.js') }}?v=221\"></script>\n"

if "pmd-waiter-standard-v221-theme.css" not in text:
    text = text.replace("</head>", css + "</head>", 1)

if "pmd-waiter-standard-v221-page" not in text:
    text = text.replace(
        "pmd-waiter-standard-v211-page",
        "pmd-waiter-standard-v211-page pmd-waiter-standard-v221-page",
        1,
    )

if "pmd-waiter-standard-v221-theme.js" not in text:
    text = text.replace("</body>", js + "</body>", 1)

for marker in [
    "pmd-waiter-standard-v22.css",
    "pmd-waiter-standard-v22.js",
    "pmd-waiter-standard-v221-theme.css",
    "pmd-waiter-standard-v221-theme.js",
    "pmd-waiter-standard-v221-page",
]:
    if marker not in text:
        raise SystemExit(f"ERROR: Missing Blade marker: {marker}")

path.write_text(text, encoding="utf-8")
print("PMD_V221_BLADE_THEME_PATCH_OK")
PY

echo
echo "== Validating every staged file before production changes =="

php -l "$TMP/app/admin/controllers/PmdWaiterPosV1.php"
php -l "$TMP/app/admin/controllers/concerns/PmdWaiterPosOperationsV22Concern.php"
php -l "$TMP/app/admin/controllers/concerns/PmdWaiterPosPaymentAllocationConcern.php"
php -l "$TMP/app/admin/views/waiter_dashboard_new.blade.php"
php -l "$TMP/routes/pmd-waiter-pos-v22.php"
php -l "$APP_ROUTES_TMP"
node --check "$TMP/app/admin/assets/js/pmd-waiter-standard-v22.js"
node --check "$TMP/app/admin/assets/js/pmd-waiter-standard-v221-theme.js"

python3 - \
  "$TMP/app/admin/assets/css/pmd-waiter-standard-v22.css" \
  "$TMP/app/admin/assets/css/pmd-waiter-standard-v221-theme.css" <<'PY'
from pathlib import Path
import sys

for value in sys.argv[1:]:
    text = Path(value).read_text(encoding="utf-8")
    if text.count("{") != text.count("}"):
        raise SystemExit(f"ERROR: CSS brace mismatch: {value}")

print("PMD_V221_CSS_VALIDATION_OK")
PY

grep -Fq "PmdWaiterPosOperationsV22Concern" \
  "$TMP/app/admin/controllers/PmdWaiterPosV1.php"
grep -Fq "pmd-waiter-pos-v2.2" \
  "$TMP/app/admin/controllers/concerns/PmdWaiterPosOperationsV22Concern.php"
grep -Fq "['full', 'equal', 'items', 'shares', 'custom']" \
  "$TMP/app/admin/controllers/concerns/PmdWaiterPosPaymentAllocationConcern.php"
grep -Fq "pmd-waiter-pos-v22/operations" \
  "$TMP/routes/pmd-waiter-pos-v22.php"
grep -Fq "PMD_WAITER_POS_V221_DIRECT_ROUTE_LOADER_START" "$APP_ROUTES_TMP"
grep -Fq "Waiter Standard POS V2.2.1 theme + Toast tender active" \
  "$TMP/app/admin/assets/js/pmd-waiter-standard-v221-theme.js"

echo "PMD_WAITER_STANDARD_V221_SOURCE_VALIDATION_OK"

echo
echo "== Creating complete rollback backup =="

sudo mkdir -p "$BACKUP"

for FILE in "${ALL_FILES[@]}"; do
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
echo "== Installing only isolated waiter V2.2.1 files =="

INSTALLED=1

for FILE in "${ALL_FILES[@]}"; do
  sudo install -D -m 0644 "$TMP/$FILE" "$LIVE/$FILE"
  echo "Installed: $FILE"
done

sudo install -m 0644 "$APP_ROUTES_TMP" "$APP_ROUTES"

echo
echo "== Validating installed files =="

php -l app/admin/controllers/PmdWaiterPosV1.php
php -l app/admin/controllers/concerns/PmdWaiterPosOperationsV22Concern.php
php -l app/admin/controllers/concerns/PmdWaiterPosPaymentAllocationConcern.php
php -l app/admin/views/waiter_dashboard_new.blade.php
php -l routes/pmd-waiter-pos-v22.php
php -l app/admin/routes.php
node --check app/admin/assets/js/pmd-waiter-standard-v22.js
node --check app/admin/assets/js/pmd-waiter-standard-v221-theme.js

echo
echo "== Clearing Laravel/TastyIgniter caches =="

php artisan view:clear
php artisan route:clear
php artisan config:clear

echo
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

echo "PMD_V221_OPERATION_ROUTES_REGISTERED_OK"

grep -n "pmd-waiter-standard-v221" \
  app/admin/views/waiter_dashboard_new.blade.php

grep -n "Waiter Standard POS V2.2.1 theme + Toast tender active" \
  app/admin/assets/js/pmd-waiter-standard-v221-theme.js

cat <<TXT

========================================================
PMD Waiter Standard POS V2.2.1 installed
========================================================
✓ V2.2 operation routes load directly from app/admin/routes.php
✓ Route errors are displayed instead of hidden
✓ Equal / item / share split operations retained
✓ Transfer, merge, move items, seat/course and void operations retained
✓ Toast-style payment layout added
✓ Cash numeric keypad and quick tender keys added
✓ Light and Dark mode added
✓ Theme preference persists in the browser
✓ Phone payment remains full-screen
✓ Stable V2.1.2 is restored automatically after any failed validation

Preview:
https://mimoza.paymydine.com/admin/dashboardwaiternew

Console:
PMDWaiterStandardV221.debug()

Backup:
$BACKUP
========================================================
TXT

INSTALLED=0
trap - EXIT
cleanup
