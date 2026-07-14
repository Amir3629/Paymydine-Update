#!/usr/bin/env bash
set -Eeuo pipefail

LIVE="${LIVE:-/var/www/paymydine}"
BRANCH="${BRANCH:-agent/waiter-pos-standard-v2}"
REF="${REF:-origin/$BRANCH}"

TS="$(date +%Y%m%d_%H%M%S)"
TMP="/tmp/pmd-waiter-standard-v2-$TS"
BACKUP="/var/backups/pmd-waiter-standard-v2-$TS"

VIEW="app/admin/views/waiter_dashboard_new.blade.php"
CSS="app/admin/assets/css/pmd-waiter-dashboard-new-v1.css"
JS="app/admin/assets/js/pmd-waiter-dashboard-new-v1.js"
ROUTES="routes/admin-quick-mode.php"
FILES=("$VIEW" "$CSS" "$JS")

cleanup() {
  rm -rf "$TMP"
}
trap cleanup EXIT

cd "$LIVE"

printf '%s\n' \
  "======================================================" \
  "PMD Waiter Standard POS V2 — selective preview update" \
  "======================================================"

echo
echo "== Fetching isolated V2 branch =="
git fetch --no-tags origin \
  "$BRANCH:refs/remotes/origin/$BRANCH"

echo "Branch commit:"
git rev-parse "$REF"

mkdir -p "$TMP"
sudo mkdir -p "$BACKUP"

echo
echo "== Extracting only the three V2 preview files =="
for FILE in "${FILES[@]}"; do
  DEST="$TMP/$FILE"
  mkdir -p "$(dirname "$DEST")"

  if ! git cat-file -e "$REF:$FILE" 2>/dev/null; then
    echo "ERROR: Missing branch file: $FILE"
    exit 1
  fi

  git show "$REF:$FILE" > "$DEST"
  echo "Extracted: $FILE"
done

echo
echo "== Validating V2 files =="
php -l "$TMP/$VIEW"
node --check "$TMP/$JS"

python3 - "$TMP/$CSS" <<'PY'
from pathlib import Path
import sys

text = Path(sys.argv[1]).read_text(encoding='utf-8')

if text.count('{') != text.count('}'):
    raise SystemExit('ERROR: CSS brace count is invalid')

required = [
    'PayMyDine Waiter Standard POS V2',
    '.pmd-v2-table-key',
    '.pmd-v2-pos-host .pmd-pos-categories',
    '.pmd-v2-pos-host .pmd-pos-product',
    '.pmd-v2-pos-host .pmd-pos-payment-dialog',
    '@media(max-width:780px)',
]

for marker in required:
    if marker not in text:
        raise SystemExit(f'ERROR: Missing CSS marker: {marker}')

print('PMD_WAITER_STANDARD_V2_CSS_OK')
PY

grep -Fq "data-pmd-waiter-v2-root" "$TMP/$VIEW"
grep -Fq "PMDWaiterStandardV2" "$TMP/$JS"
grep -Fq "Waiter Standard POS V2 active" "$TMP/$JS"
grep -Fq "PMDWaiterPOSApp.mount" "$TMP/$JS"
grep -Fq "pmd-waiter-pos-payment-v2.js" "$TMP/$VIEW"
grep -Fq "pmd-waiter-pos-v1.js" "$TMP/$VIEW"

if grep -Fq "pmd-waiter-pos-simple-v27.js" "$TMP/$VIEW"; then
  echo "ERROR: Legacy Simple V27 visual rewriter is still loaded."
  exit 1
fi

if grep -Fq "pmd-waiter-pos-product-details-v3.js" "$TMP/$VIEW"; then
  echo "ERROR: Legacy Product Details DOM rewriter is still loaded."
  exit 1
fi

echo "PMD_WAITER_STANDARD_V2_FILES_OK"

echo
echo "== Confirming existing preview routes remain registered =="
grep -Fq "'/admin/dashboardwaiternew'" "$LIVE/$ROUTES"
grep -Fq "'/admin/waiter'" "$LIVE/$ROUTES"
echo "PMD_WAITER_STANDARD_V2_ROUTES_OK"

echo
echo "== Backing up current preview files =="
for FILE in "${FILES[@]}"; do
  if [[ -e "$LIVE/$FILE" ]]; then
    sudo mkdir -p "$BACKUP/$(dirname "$FILE")"
    sudo cp -a "$LIVE/$FILE" "$BACKUP/$FILE.before"
  fi
done

echo "Backup: $BACKUP"

echo
echo "== Installing only the three V2 preview files =="
for FILE in "${FILES[@]}"; do
  sudo install -m 0644 "$TMP/$FILE" "$LIVE/$FILE"
  echo "Installed: $FILE"
done

if [[ -f "$LIVE/app/admin/views/waiter_pos.blade.php" ]]; then
  sudo chown --reference="$LIVE/app/admin/views/waiter_pos.blade.php" "$LIVE/$VIEW"
fi

if [[ -f "$LIVE/app/admin/assets/css/pmd-waiter-pos-v1.css" ]]; then
  sudo chown --reference="$LIVE/app/admin/assets/css/pmd-waiter-pos-v1.css" "$LIVE/$CSS"
fi

if [[ -f "$LIVE/app/admin/assets/js/pmd-waiter-pos-v1.js" ]]; then
  sudo chown --reference="$LIVE/app/admin/assets/js/pmd-waiter-pos-v1.js" "$LIVE/$JS"
fi

echo
echo "== Clearing compiled views =="
php artisan view:clear

echo
echo "== Final live validation =="
php -l "$LIVE/$VIEW"
node --check "$LIVE/$JS"
grep -n "Waiter Standard POS V2 active" "$LIVE/$JS"

echo
echo "======================================================"
echo "PMD Waiter Standard POS V2 installed"
echo "======================================================"
echo "Preview: https://<tenant>.paymydine.com/admin/dashboardwaiternew"
echo "Short:   https://<tenant>.paymydine.com/admin/waiter"
echo "Old dashboard remains untouched: /admin/dashboardwaiter"
echo
echo "V2 changes:"
echo "✓ Dense rectangular table keys"
echo "✓ Accurate OPEN / PAYMENT / READY / ATTENTION states"
echo "✓ Square category and product key matrix"
echo "✓ Fixed order ticket with Hold, Send and Pay / Split"
echo "✓ Phone: two-column products + bottom order drawer"
echo "✓ Legacy DOM-rewrite modules removed from this page"
echo "✓ Existing order, modifier, kitchen and split-payment engine retained"
echo
echo "Console check:"
echo "PMDWaiterStandardV2.debug()"
echo
echo "Backup:"
echo "$BACKUP"
echo "======================================================"
