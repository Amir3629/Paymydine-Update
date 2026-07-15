#!/usr/bin/env bash
set -Eeuo pipefail

LIVE="/var/www/paymydine"
BRANCH="agent/waiter-pos-workstation-v3-complete"
REF="origin/$BRANCH"
TS="$(date +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd-waiter-workstation-v3-$TS"
BACKUP="/var/backups/pmd-waiter-workstation-v3-$TS"
ROUTES="$LIVE/app/admin/routes.php"
INSTALLED=0

FILES=(
  "app/admin/controllers/PmdWaiterWorkstationV3.php"
  "app/admin/views/waiter_workstation_v3.blade.php"
  "app/admin/assets/css/pmd-waiter-workstation-v3.css"
  "app/admin/assets/js/pmd-waiter-workstation-v3.js"
  "routes/pmd-waiter-workstation-v3.php"
)

cleanup() {
  rm -rf "$STAGE"
}

rollback() {
  local code="$?"
  if [[ "$code" -ne 0 && "$INSTALLED" -eq 1 ]]; then
    echo
    echo "ERROR: Restoring the previous production state..."
    for FILE in "${FILES[@]}"; do
      if [[ -f "$BACKUP/$FILE.before" ]]; then
        sudo mkdir -p "$(dirname "$LIVE/$FILE")"
        sudo cp -a "$BACKUP/$FILE.before" "$LIVE/$FILE"
      elif [[ -f "$BACKUP/$FILE.was-missing" ]]; then
        sudo rm -f "$LIVE/$FILE"
      fi
    done
    if [[ -f "$BACKUP/app/admin/routes.php.before" ]]; then
      sudo cp -a "$BACKUP/app/admin/routes.php.before" "$ROUTES"
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

echo "========================================================"
echo "PMD Waiter Workstation V3 — direct standard POS"
echo "========================================================"

echo
echo "== Confirming proven backend engines =="
for REQUIRED in \
  app/admin/controllers/PmdWaiterPosV1.php \
  app/admin/controllers/concerns/PmdWaiterPosRenderEndpoints.php \
  app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php \
  app/admin/controllers/concerns/PmdWaiterPosPaymentSummaryConcern.php \
  app/admin/controllers/concerns/PmdWaiterPosSettleEndpoint.php \
  app/admin/controllers/concerns/PmdWaiterPosTerminalEndpoint.php \
  app/admin/controllers/concerns/PmdWaiterPosOperationsV22Concern.php \
  app/admin/controllers/PmdWaiterTableStateV154.php; do
  if [[ ! -s "$REQUIRED" ]]; then
    echo "ERROR: Required backend engine is missing: $REQUIRED"
    exit 1
  fi
done
echo "PMD_WAITER_WORKSTATION_V3_BACKEND_OK"

echo
echo "== Fetching isolated GitHub branch =="
git fetch --no-tags origin "$BRANCH:refs/remotes/origin/$BRANCH"
COMMIT="$(git rev-parse "$REF")"
echo "Branch commit: $COMMIT"

mkdir -p "$STAGE"

echo "== Extracting direct PHP, Blade and route sources =="
for FILE in \
  "app/admin/controllers/PmdWaiterWorkstationV3.php" \
  "app/admin/views/waiter_workstation_v3.blade.php" \
  "routes/pmd-waiter-workstation-v3.php"; do
  mkdir -p "$STAGE/$(dirname "$FILE")"
  git show "$REF:$FILE" > "$STAGE/$FILE"
  test -s "$STAGE/$FILE"
  echo "Extracted: $FILE"
done

mkdir -p \
  "$STAGE/app/admin/assets/css" \
  "$STAGE/app/admin/assets/js"

echo
echo "== Rebuilding exact CSS from audited plain-source parts =="
: > "$STAGE/app/admin/assets/css/pmd-waiter-workstation-v3.css"
for PART in part00.txt part01.txt part02.txt part03.txt; do
  git show "$REF:packages/pmd-waiter-workstation-v3/css/$PART" \
    >> "$STAGE/app/admin/assets/css/pmd-waiter-workstation-v3.css"
  echo "Read CSS source: $PART"
done

echo
echo "== Rebuilding exact JavaScript from audited plain-source parts =="
: > "$STAGE/app/admin/assets/js/pmd-waiter-workstation-v3.js"
for PART in \
  part00.txt part01.txt part02.txt part03.txt part04.txt \
  part05.txt part06.txt part07.txt part08.txt; do
  git show "$REF:packages/pmd-waiter-workstation-v3/js/$PART" \
    >> "$STAGE/app/admin/assets/js/pmd-waiter-workstation-v3.js"
  echo "Read JavaScript source: $PART"
done

EXPECTED_CSS_SHA256="557df16ce6941c6d35b78d7b146cb68c9ab015aee4f446d4ca6e0040c16c420b"
EXPECTED_JS_SHA256="6bb1ba1b452adabc7d3b7d48e9da534889336361ef198bd8926dcc57fc89cfd7"
ACTUAL_CSS_SHA256="$(sha256sum "$STAGE/app/admin/assets/css/pmd-waiter-workstation-v3.css" | awk '{print $1}')"
ACTUAL_JS_SHA256="$(sha256sum "$STAGE/app/admin/assets/js/pmd-waiter-workstation-v3.js" | awk '{print $1}')"

echo "Expected CSS SHA256: $EXPECTED_CSS_SHA256"
echo "Actual CSS SHA256:   $ACTUAL_CSS_SHA256"
echo "Expected JS SHA256:  $EXPECTED_JS_SHA256"
echo "Actual JS SHA256:    $ACTUAL_JS_SHA256"

[[ "$ACTUAL_CSS_SHA256" == "$EXPECTED_CSS_SHA256" ]] || {
  echo "ERROR: CSS reconstruction hash mismatch."
  exit 1
}
[[ "$ACTUAL_JS_SHA256" == "$EXPECTED_JS_SHA256" ]] || {
  echo "ERROR: JavaScript reconstruction hash mismatch."
  exit 1
}

echo "PMD_WAITER_WORKSTATION_V3_RECONSTRUCTION_OK"

echo
echo "== Validating every staged file =="
php -l "$STAGE/app/admin/controllers/PmdWaiterWorkstationV3.php"
php -l "$STAGE/app/admin/views/waiter_workstation_v3.blade.php"
php -l "$STAGE/routes/pmd-waiter-workstation-v3.php"
node --check "$STAGE/app/admin/assets/js/pmd-waiter-workstation-v3.js"
python3 - "$STAGE/app/admin/assets/css/pmd-waiter-workstation-v3.css" <<'PY'
from pathlib import Path
import sys
text = Path(sys.argv[1]).read_text(encoding='utf-8')
level = 0
for char in text:
    if char == '{': level += 1
    elif char == '}': level -= 1
    if level < 0:
        raise SystemExit('CSS closing brace mismatch')
if level != 0:
    raise SystemExit('CSS brace mismatch')
required = [
    '.pmd-ws3-product',
    '.pmd-ws3-category-rail',
    '.pmd-ws3-payment-layout',
    '.pmd-ws3-mobile-order',
]
missing = [token for token in required if token not in text]
if missing:
    raise SystemExit('Missing CSS authorities: ' + ', '.join(missing))
print('PMD_WAITER_WORKSTATION_V3_CSS_OK')
PY

grep -Fq "Waiter Workstation V3 direct POS active" "$STAGE/app/admin/assets/js/pmd-waiter-workstation-v3.js"
grep -Fq "dashboardwaiterworkstation" "$STAGE/routes/pmd-waiter-workstation-v3.php"
grep -Fq "data-pmd-ws3" "$STAGE/app/admin/views/waiter_workstation_v3.blade.php"
grep -Fq "PmdWaiterPosOperationsV22Concern" "$STAGE/app/admin/controllers/PmdWaiterWorkstationV3.php"
echo "PMD_WAITER_WORKSTATION_V3_SOURCE_OK"

echo
echo "== Preparing an idempotent route-loader patch =="
cp "$ROUTES" "$STAGE/app-admin-routes.php"
python3 - "$STAGE/app-admin-routes.php" <<'PY'
from pathlib import Path
import sys
path = Path(sys.argv[1])
text = path.read_text(encoding='utf-8')
start = '// PMD_WAITER_WORKSTATION_V3_ROUTE_LOADER_START'
end = '// PMD_WAITER_WORKSTATION_V3_ROUTE_LOADER_END'
block = """// PMD_WAITER_WORKSTATION_V3_ROUTE_LOADER_START
$__pmdWaiterWorkstationV3Routes = base_path('routes/pmd-waiter-workstation-v3.php');
if (file_exists($__pmdWaiterWorkstationV3Routes)) {
    require_once $__pmdWaiterWorkstationV3Routes;
}
// PMD_WAITER_WORKSTATION_V3_ROUTE_LOADER_END

"""
if start not in text:
    marker = '<?php'
    pos = text.find(marker)
    if pos < 0:
        raise SystemExit('app/admin/routes.php has no PHP opening tag')
    insert_at = pos + len(marker)
    text = text[:insert_at] + "\n\n" + block + text[insert_at:]
else:
    left = text.index(start)
    right = text.index(end, left) + len(end)
    text = text[:left] + block.rstrip() + text[right:]
path.write_text(text, encoding='utf-8')
print('PMD_WAITER_WORKSTATION_V3_ROUTE_PATCH_OK')
PY
php -l "$STAGE/app-admin-routes.php"

echo
echo "== Creating complete rollback backup =="
sudo mkdir -p "$BACKUP/app/admin"
sudo cp -a "$ROUTES" "$BACKUP/app/admin/routes.php.before"
for FILE in "${FILES[@]}"; do
  sudo mkdir -p "$BACKUP/$(dirname "$FILE")"
  if [[ -e "$LIVE/$FILE" || -L "$LIVE/$FILE" ]]; then
    sudo cp -a "$LIVE/$FILE" "$BACKUP/$FILE.before"
  else
    sudo touch "$BACKUP/$FILE.was-missing"
  fi
done
echo "Backup: $BACKUP"

echo
echo "== Installing only the isolated V3 files =="
for FILE in "${FILES[@]}"; do
  sudo mkdir -p "$(dirname "$LIVE/$FILE")"
  sudo install -m 0644 "$STAGE/$FILE" "$LIVE/$FILE"
  echo "Installed: $FILE"
done
sudo install -m 0644 "$STAGE/app-admin-routes.php" "$ROUTES"
INSTALLED=1

echo
echo "== Validating installed production files =="
php -l app/admin/controllers/PmdWaiterWorkstationV3.php
php -l app/admin/views/waiter_workstation_v3.blade.php
php -l routes/pmd-waiter-workstation-v3.php
php -l app/admin/routes.php
node --check app/admin/assets/js/pmd-waiter-workstation-v3.js

grep -Fq "PMD_WAITER_WORKSTATION_V3_ROUTE_LOADER_START" app/admin/routes.php
grep -Fq "dashboardwaiterworkstation" routes/pmd-waiter-workstation-v3.php

echo
echo "== Clearing Laravel/TastyIgniter caches =="
php artisan view:clear
php artisan route:clear
php artisan config:clear

echo
echo "== Checking the new URL and assets =="
PAGE_HTTP="$(curl -k -sS -o /dev/null -w '%{http_code}' https://mimoza.paymydine.com/admin/dashboardwaiterworkstation || true)"
CSS_HTTP="$(curl -k -sS -o /dev/null -w '%{http_code}' https://mimoza.paymydine.com/app/admin/assets/css/pmd-waiter-workstation-v3.css?v=300 || true)"
JS_HTTP="$(curl -k -sS -o /dev/null -w '%{http_code}' https://mimoza.paymydine.com/app/admin/assets/js/pmd-waiter-workstation-v3.js?v=300 || true)"
echo "Page HTTP: $PAGE_HTTP"
echo "CSS HTTP:  $CSS_HTTP"
echo "JS HTTP:   $JS_HTTP"
case "$PAGE_HTTP" in 200|302|303) ;; *) echo "ERROR: New page returned HTTP $PAGE_HTTP"; exit 1;; esac
case "$CSS_HTTP" in 200|304) ;; *) echo "ERROR: CSS returned HTTP $CSS_HTTP"; exit 1;; esac
case "$JS_HTTP" in 200|304) ;; *) echo "ERROR: JavaScript returned HTTP $JS_HTTP"; exit 1;; esac

INSTALLED=0

echo
echo "========================================================"
echo "PMD Waiter Workstation V3 installed successfully"
echo "========================================================"
echo "✓ Completely separate URL and controller"
echo "✓ No legacy overlay mount, loader recovery or payment modal"
echo "✓ Direct live-table launcher"
echo "✓ Fixed desktop category rail and text-only coloured product keys"
echo "✓ Persistent order ticket on desktop"
echo "✓ Two-column products and permanent ORDER bar on phone"
echo "✓ Modifiers, item notes, order notes, guests, hold and send"
echo "✓ Inline full-page payment — no modal"
echo "✓ Full, equal, item and share splitting"
echo "✓ Cash keypad, external terminal, connected terminal and online checkout"
echo "✓ Tips, coupon, payment history and receipts"
echo "✓ Transfer, merge, move items, seat/course, void, reopen and table states"
echo "✓ Reservations and live service alerts"
echo "✓ One fixed high-contrast dark operational theme"
echo
echo "Preview:"
echo "https://mimoza.paymydine.com/admin/dashboardwaiterworkstation"
echo
echo "Short URL:"
echo "https://mimoza.paymydine.com/admin/waiter-workstation"
echo
echo "Console:"
echo "PMDWaiterWorkstationV3.debug()"
echo
echo "Backup: $BACKUP"
echo "========================================================"
