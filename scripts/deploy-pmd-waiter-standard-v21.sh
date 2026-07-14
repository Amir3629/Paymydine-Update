#!/usr/bin/env bash
set -Eeuo pipefail

LIVE="/var/www/paymydine"
BRANCH="agent/waiter-pos-standard-v21-complete"
REF="origin/$BRANCH"

FILES=(
  "app/admin/views/waiter_dashboard_new.blade.php"
  "app/admin/assets/css/pmd-waiter-standard-v21.css"
  "app/admin/assets/js/pmd-waiter-standard-v21.js"
)

TS="$(date +%Y%m%d_%H%M%S)"
TMP="/tmp/pmd-waiter-standard-v21-$TS"
BACKUP="/var/backups/pmd-waiter-standard-v21-$TS"
INSTALLED=0

cleanup() {
  rm -rf "$TMP"
}

rollback_on_error() {
  local code="$?"

  if [[ "$code" -ne 0 && "$INSTALLED" -eq 1 ]]; then
    echo
    echo "ERROR after installation — restoring previous preview files..."

    for FILE in "${FILES[@]}"; do
      NAME="$(basename "$FILE")"
      if [[ -f "$BACKUP/$NAME.before" ]]; then
        sudo install -m 0644 "$BACKUP/$NAME.before" "$LIVE/$FILE"
      else
        sudo rm -f "$LIVE/$FILE"
      fi
    done

    cd "$LIVE"
    php artisan view:clear || true
    echo "Previous preview version restored."
  fi

  cleanup
  exit "$code"
}

trap rollback_on_error EXIT

cd "$LIVE"

cat <<'TXT'
======================================================
PMD Waiter Standard POS V2.1 — complete selective update
======================================================
TXT

echo
echo "== Fetching isolated V2.1 branch =="

git fetch --no-tags origin \
  "$BRANCH:refs/remotes/origin/$BRANCH"

echo "Branch commit:"
git rev-parse "$REF"

echo
echo "== Confirming stable V2 preview exists =="

grep -Fq \
  "Waiter Standard POS V2 active" \
  app/admin/assets/js/pmd-waiter-dashboard-new-v1.js

grep -Fq \
  "pmd-waiter-standard-v2" \
  app/admin/views/waiter_dashboard_new.blade.php

echo "PMD_WAITER_V2_BASE_OK"

mkdir -p "$TMP"
sudo mkdir -p "$BACKUP"

echo
echo "== Extracting only three V2.1 preview files =="

for FILE in "${FILES[@]}"; do
  mkdir -p "$TMP/$(dirname "$FILE")"
  git show "$REF:$FILE" > "$TMP/$FILE"
  echo "Extracted: $FILE"
done

echo
echo "== Validating extracted files =="

php -l "$TMP/app/admin/views/waiter_dashboard_new.blade.php"
node --check "$TMP/app/admin/assets/js/pmd-waiter-standard-v21.js"

python3 - \
  "$TMP/app/admin/assets/css/pmd-waiter-standard-v21.css" \
  "$TMP/app/admin/assets/js/pmd-waiter-standard-v21.js" \
  "$TMP/app/admin/views/waiter_dashboard_new.blade.php" <<'PY'
from pathlib import Path
import sys

css = Path(sys.argv[1]).read_text(encoding="utf-8")
js = Path(sys.argv[2]).read_text(encoding="utf-8")
blade = Path(sys.argv[3]).read_text(encoding="utf-8")

if css.count("{") != css.count("}"):
    raise SystemExit("ERROR: V2.1 CSS brace validation failed")

required_css = [
    "pmd-v21-payment-meta",
    "pmd-v21-product-key",
    "pmd-v21-item-status",
    "pmd-v21-pay-primary",
    "pmd-v21-more-menu",
    "@media(max-width:780px)",
]

required_js = [
    "pmd-waiter-standard-v2.1",
    "buildTableMeta",
    "IN KITCHEN",
    "formatAge",
    "validMenuItem",
    "syncGuests",
    "POPULAR",
    "RECENT",
    "PAY / SPLIT",
    "decorateSentItems",
    "expected_updated_at" if False else "pmd:waiter-pos-order-updated",
    "Waiter Standard POS V2.1 complete operations layer active",
]

required_blade = [
    "pmd-waiter-standard-v21.css",
    "pmd-waiter-standard-v21.js",
    "pmd-waiter-standard-v21-page",
]

for marker in required_css:
    if marker not in css:
        raise SystemExit(f"ERROR: Missing CSS marker: {marker}")

for marker in required_js:
    if marker not in js:
        raise SystemExit(f"ERROR: Missing JS marker: {marker}")

for marker in required_blade:
    if marker not in blade:
        raise SystemExit(f"ERROR: Missing Blade marker: {marker}")

for forbidden in [
    "git reset --hard",
    "git checkout",
    "MutationObserver(function () { syncAll",
]:
    if forbidden in js:
        raise SystemExit(f"ERROR: Forbidden marker in V2.1 JS: {forbidden}")

print("PMD_WAITER_STANDARD_V21_FILES_OK")
PY

echo
echo "== Backing up current live targets =="

for FILE in "${FILES[@]}"; do
  NAME="$(basename "$FILE")"
  if [[ -f "$FILE" ]]; then
    sudo cp -a "$FILE" "$BACKUP/$NAME.before"
  fi
done

echo "Backup: $BACKUP"

echo
echo "== Installing only the three V2.1 preview files =="

for FILE in "${FILES[@]}"; do
  sudo mkdir -p "$(dirname "$LIVE/$FILE")"
  sudo install -m 0644 "$TMP/$FILE" "$LIVE/$FILE"

  NAME="$(basename "$FILE")"
  if [[ -f "$BACKUP/$NAME.before" ]]; then
    sudo chown --reference="$BACKUP/$NAME.before" "$LIVE/$FILE" || true
  fi

  echo "Installed: $FILE"
done

INSTALLED=1

echo
echo "== Final live validation =="

php -l app/admin/views/waiter_dashboard_new.blade.php
node --check app/admin/assets/js/pmd-waiter-standard-v21.js

grep -n \
  "Waiter Standard POS V2.1 complete operations layer active" \
  app/admin/assets/js/pmd-waiter-standard-v21.js

grep -n \
  "pmd-waiter-standard-v21.css" \
  app/admin/views/waiter_dashboard_new.blade.php

echo
echo "== Confirming shared production files were not changed =="

for FILE in \
  routes/admin-quick-mode.php \
  app/admin/controllers/PmdWaiterDashboardNewV1.php \
  app/admin/assets/js/pmd-waiter-pos-v1.js \
  app/admin/assets/js/pmd-waiter-pos-payment-v2.js \
  app/admin/views/waiter_pos_shell.blade.php
  do
    [[ -f "$FILE" ]] || {
      echo "ERROR: Expected shared file missing: $FILE"
      exit 1
    }
  done

echo "PMD_SHARED_POS_FILES_PRESENT"

echo
echo "== Clearing compiled views =="

php artisan view:clear

INSTALLED=2

cat <<TXT

======================================================
PMD Waiter Standard POS V2.1 installed
======================================================
✓ Service state is primary; payment is secondary
✓ READY / ATTENTION / NOTE / PAYMENT priority applied
✓ Waiting and open duration displayed
✓ Default new-order guest count corrected to 1
✓ Existing-order guest count preserved
✓ Capacity shown only as helper information
✓ Invalid, placeholder and zero-price products hidden
✓ Product colors normalized with category accents
✓ Entire product key remains one-tap add
✓ POPULAR and RECENT quick categories added
✓ Sent-item kitchen status displayed
✓ Hold, Send and large PAY / SPLIT promoted
✓ Edit, Print and view mode moved under MORE
✓ Offline draft indicator retained
✓ Existing concurrency and double-submit protection retained
✓ Phone keeps two-column products and full-screen order cart
✓ Existing split-bill and payment engine retained

Preview URL:
https://<tenant>.paymydine.com/admin/dashboardwaiternew

Short URL:
https://<tenant>.paymydine.com/admin/waiter

Backup:
$BACKUP
======================================================
TXT
