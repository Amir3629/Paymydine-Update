#!/usr/bin/env bash
set -Eeuo pipefail

LIVE="/var/www/paymydine"
BRANCH="agent/waiter-pos-standard-v22-operations-complete"
REF="origin/$BRANCH"
PAYLOAD_DIR="scripts/pmd-waiter-standard-v22-payload"
EXPECTED_B64_SHA256="94846cf5d5ca4e290ba21752707c18b386140f279a84137e251e67fb83b48034"
EXPECTED_TGZ_SHA256="b11c8b6824f963b78c6d325cadbf4e59af56dbbb3f320c0c5ea026e62ec12785"

TS="$(date +%Y%m%d_%H%M%S)"
TMP="/tmp/pmd-waiter-standard-v22-$TS"
BACKUP="/var/backups/pmd-waiter-standard-v22-$TS"
ROUTES_LIVE="$LIVE/routes/admin-quick-mode.php"
ROUTES_TMP="$TMP/routes/admin-quick-mode.php"
INSTALLED=0

FILES=(
  "app/admin/controllers/PmdWaiterPosV1.php"
  "app/admin/controllers/concerns/PmdWaiterPosOperationsV22Concern.php"
  "app/admin/controllers/concerns/PmdWaiterPosPaymentAllocationConcern.php"
  "app/admin/views/waiter_dashboard_new.blade.php"
  "app/admin/assets/css/pmd-waiter-standard-v22.css"
  "app/admin/assets/js/pmd-waiter-standard-v22.js"
  "routes/pmd-waiter-pos-v22.php"
)

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

    for FILE in "${FILES[@]}"; do
      if [[ -f "$BACKUP/$FILE.before" ]]; then
        sudo install -D -m 0644 "$BACKUP/$FILE.before" "$LIVE/$FILE"
      elif [[ -f "$BACKUP/$FILE.was-missing" ]]; then
        sudo rm -f "$LIVE/$FILE"
      fi
    done

    if [[ -f "$BACKUP/routes/admin-quick-mode.php.before" ]]; then
      sudo install -m 0644 \
        "$BACKUP/routes/admin-quick-mode.php.before" \
        "$ROUTES_LIVE"
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

printf '%s\n' \
  "========================================================" \
  "PMD Waiter Standard POS V2.2 — complete operations" \
  "========================================================"

echo
echo "== Fetching isolated V2.2 branch =="
git fetch --no-tags origin \
  "$BRANCH:refs/remotes/origin/$BRANCH"

COMMIT="$(git rev-parse "$REF")"
echo "Branch commit: $COMMIT"

mkdir -p "$TMP"
: > "$TMP/payload.b64"

echo
echo "== Rebuilding validated V2.2 package =="
for PART in "${PARTS[@]}"; do
  git show "$REF:$PAYLOAD_DIR/$PART" >> "$TMP/payload.b64"
  echo "Read: $PART"
done

B64_SHA256="$(sha256sum "$TMP/payload.b64" | awk '{print $1}')"
echo "Expected base64 SHA256: $EXPECTED_B64_SHA256"
echo "Actual base64 SHA256:   $B64_SHA256"

if [[ "$B64_SHA256" != "$EXPECTED_B64_SHA256" ]]; then
  echo "ERROR: V2.2 package chunks do not match the validated payload."
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

for FILE in "${FILES[@]}"; do
  if [[ ! -s "$TMP/$FILE" ]]; then
    echo "ERROR: Extracted source is missing: $FILE"
    exit 1
  fi
  echo "Ready: $FILE"
done

if [[ ! -f "$ROUTES_LIVE" ]]; then
  echo "ERROR: Live route file was not found: $ROUTES_LIVE"
  exit 1
fi

mkdir -p "$(dirname "$ROUTES_TMP")"
cp "$ROUTES_LIVE" "$ROUTES_TMP"

python3 - "$ROUTES_TMP" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
text = path.read_text(encoding="utf-8")
marker = "PMD_WAITER_POS_V22_ROUTES_LOADED"

if marker not in text:
    anchor = "use Illuminate\\Support\\Facades\\Schema;\n"
    block = """

// PMD Waiter Standard POS V2.2 isolated operations routes.
if (!defined('PMD_WAITER_POS_V22_ROUTES_LOADED')) {
    define('PMD_WAITER_POS_V22_ROUTES_LOADED', true);
    require_once __DIR__.'/pmd-waiter-pos-v22.php';
}
"""
    if anchor not in text:
        raise SystemExit("ERROR: route insertion anchor was not found")
    text = text.replace(anchor, anchor + block, 1)

path.write_text(text, encoding="utf-8")
print("PMD_V22_ROUTE_LOADER_PATCH_OK")
PY

echo
echo "== Validating all V2.2 sources before installation =="
php -l "$TMP/app/admin/controllers/PmdWaiterPosV1.php"
php -l "$TMP/app/admin/controllers/concerns/PmdWaiterPosOperationsV22Concern.php"
php -l "$TMP/app/admin/controllers/concerns/PmdWaiterPosPaymentAllocationConcern.php"
php -l "$TMP/app/admin/views/waiter_dashboard_new.blade.php"
php -l "$TMP/routes/pmd-waiter-pos-v22.php"
php -l "$ROUTES_TMP"
node --check "$TMP/app/admin/assets/js/pmd-waiter-standard-v22.js"

python3 - "$TMP/app/admin/assets/css/pmd-waiter-standard-v22.css" <<'PY'
from pathlib import Path
import sys

text = Path(sys.argv[1]).read_text(encoding="utf-8")
assert "PMD Waiter Standard POS V2.2" in text
assert text.count("{") == text.count("}")
print("PMD_V22_CSS_OK")
PY

grep -Fq "PmdWaiterPosOperationsV22Concern" \
  "$TMP/app/admin/controllers/PmdWaiterPosV1.php"
grep -Fq "pmd-waiter-pos-v2.2" \
  "$TMP/app/admin/controllers/concerns/PmdWaiterPosOperationsV22Concern.php"
grep -Fq "['full', 'equal', 'items', 'shares', 'custom']" \
  "$TMP/app/admin/controllers/concerns/PmdWaiterPosPaymentAllocationConcern.php"
grep -Fq "pmd-waiter-standard-v22.css" \
  "$TMP/app/admin/views/waiter_dashboard_new.blade.php"
grep -Fq "pmd-waiter-standard-v22.js" \
  "$TMP/app/admin/views/waiter_dashboard_new.blade.php"
grep -Fq "customer-parity split active" \
  "$TMP/app/admin/assets/js/pmd-waiter-standard-v22.js"
grep -Fq "pmd-waiter-pos-v22/operations" \
  "$TMP/routes/pmd-waiter-pos-v22.php"
grep -Fq "PMD_WAITER_POS_V22_ROUTES_LOADED" "$ROUTES_TMP"

echo "PMD_WAITER_STANDARD_V22_SOURCE_VALIDATION_OK"

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

sudo mkdir -p "$BACKUP/routes"
sudo cp -a "$ROUTES_LIVE" \
  "$BACKUP/routes/admin-quick-mode.php.before"

echo "Backup: $BACKUP"

echo
echo "== Installing only the isolated V2.2 files =="
INSTALLED=1

for FILE in "${FILES[@]}"; do
  sudo install -D -m 0644 "$TMP/$FILE" "$LIVE/$FILE"
  echo "Installed: $FILE"
done

sudo install -m 0644 "$ROUTES_TMP" "$ROUTES_LIVE"

if [[ -f app/admin/assets/js/pmd-waiter-standard-v21.js ]]; then
  sudo chown --reference=app/admin/assets/js/pmd-waiter-standard-v21.js \
    app/admin/assets/js/pmd-waiter-standard-v22.js || true
fi

if [[ -f app/admin/assets/css/pmd-waiter-standard-v21.css ]]; then
  sudo chown --reference=app/admin/assets/css/pmd-waiter-standard-v21.css \
    app/admin/assets/css/pmd-waiter-standard-v22.css || true
fi

echo
echo "== Validating installed production files =="
php -l app/admin/controllers/PmdWaiterPosV1.php
php -l app/admin/controllers/concerns/PmdWaiterPosOperationsV22Concern.php
php -l app/admin/controllers/concerns/PmdWaiterPosPaymentAllocationConcern.php
php -l app/admin/views/waiter_dashboard_new.blade.php
php -l routes/pmd-waiter-pos-v22.php
php -l routes/admin-quick-mode.php
node --check app/admin/assets/js/pmd-waiter-standard-v22.js

echo
echo "== Clearing Laravel/TastyIgniter caches =="
php artisan view:clear
php artisan route:clear
php artisan config:clear

echo
echo "== Confirming V2.2 routes =="
ROUTE_OUTPUT="$(
  php artisan route:list 2>/dev/null |
  grep -F 'pmd-waiter-pos-v22/operations' || true
)"

if [[ -z "$ROUTE_OUTPUT" ]]; then
  echo "ERROR: V2.2 operations routes were not registered."
  exit 1
fi

echo "$ROUTE_OUTPUT" | head -20

grep -n "Waiter Standard POS V2.2 operations" \
  app/admin/assets/js/pmd-waiter-standard-v22.js

grep -n "pmd-waiter-standard-v22" \
  app/admin/views/waiter_dashboard_new.blade.php

printf '%s\n' \
  "" \
  "========================================================" \
  "PMD Waiter Standard POS V2.2 installed" \
  "========================================================" \
  "✓ Split methods match frontend: Equally / By items / By shares" \
  "✓ Full balance remains a separate default payment action" \
  "✓ Payer progress and next-payer workflow added" \
  "✓ Table transfer added" \
  "✓ Merge checks and move selected items added" \
  "✓ Seat assignment and course Hold / Fire / Served added" \
  "✓ Manager-protected item void and order cancellation added" \
  "✓ Print/reprint and protected reopen actions added" \
  "✓ Phone/tablet full-screen operations UI added" \
  "✓ Existing V2.1.2 payment summary repair preserved" \
  "" \
  "Preview: https://<tenant>.paymydine.com/admin/dashboardwaiternew" \
  "Console: PMDWaiterStandardV22.debug()" \
  "" \
  "Backup: $BACKUP" \
  "========================================================"

INSTALLED=0
trap - EXIT
cleanup
