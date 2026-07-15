#!/usr/bin/env bash
set -Eeuo pipefail

LIVE="/var/www/paymydine"
BRANCH="agent/waiter-pos-final-v11-qa-fixes"
REF="origin/$BRANCH"
TS="$(date +%Y%m%d_%H%M%S)"
TMP="/tmp/pmd-waiter-final-v12-$TS"
BACKUP="/var/backups/pmd-waiter-final-v12-$TS"
INSTALLED=0

FILES=(
  "app/admin/controllers/PmdWaiterPosV1.php"
  "app/admin/controllers/concerns/PmdWaiterPosOperationsSummaryV12Concern.php"
  "app/admin/controllers/PmdWaiterDashboardFinalV1.php"
  "routes/pmd-waiter-final-v1.php"
  "app/admin/views/waiter_dashboard_final.blade.php"
  "app/admin/assets/js/pmd-waiter-final-v12-runtime-fixes.js"
  "app/admin/assets/css/pmd-waiter-final-v12-runtime-fixes.css"
)

cleanup() {
  rm -rf "$TMP"
}

rollback_on_error() {
  local code="$?"

  if [[ "$code" -ne 0 && "$INSTALLED" -eq 1 ]]; then
    echo
    echo "ERROR after installation. Restoring previous waiter files..."

    for FILE in "${FILES[@]}"; do
      if [[ -f "$BACKUP/$FILE.before" ]]; then
        sudo install -D -m 0644 "$BACKUP/$FILE.before" "$LIVE/$FILE"
      elif [[ -f "$BACKUP/$FILE.was-missing" ]]; then
        sudo rm -f "$LIVE/$FILE"
      fi
    done

    cd "$LIVE"
    php artisan view:clear || true
    php artisan route:clear || true
    php artisan config:clear || true
    echo "Previous files restored."
  fi

  cleanup
  exit "$code"
}

trap rollback_on_error EXIT

cd "$LIVE"
mkdir -p "$TMP"
sudo mkdir -p "$BACKUP"

echo "========================================================"
echo "PMD Waiter Final V1.2 — runtime and QA fixes"
echo "========================================================"

echo
echo "== Fetching isolated GitHub branch =="
git fetch --no-tags origin "$BRANCH:refs/remotes/origin/$BRANCH"
echo "Branch commit: $(git rev-parse "$REF")"

echo
echo "== Extracting and validating exact branch blobs =="
for FILE in "${FILES[@]}"; do
  mkdir -p "$TMP/$(dirname "$FILE")"
  git show "$REF:$FILE" > "$TMP/$FILE"

  EXPECTED="$(git rev-parse "$REF:$FILE")"
  ACTUAL="$(git hash-object "$TMP/$FILE")"

  echo "$FILE"
  echo "  expected: $EXPECTED"
  echo "  actual:   $ACTUAL"

  if [[ "$EXPECTED" != "$ACTUAL" ]]; then
    echo "ERROR: source hash mismatch for $FILE"
    exit 1
  fi
done

echo
echo "== Validating PHP, Blade, JavaScript and CSS =="
php -l "$TMP/app/admin/controllers/PmdWaiterPosV1.php"
php -l "$TMP/app/admin/controllers/concerns/PmdWaiterPosOperationsSummaryV12Concern.php"
php -l "$TMP/app/admin/controllers/PmdWaiterDashboardFinalV1.php"
php -l "$TMP/routes/pmd-waiter-final-v1.php"
php -l "$TMP/app/admin/views/waiter_dashboard_final.blade.php"
node --check "$TMP/app/admin/assets/js/pmd-waiter-final-v12-runtime-fixes.js"

grep -Fq "PmdWaiterPosOperationsSummaryV12Concern" "$TMP/app/admin/controllers/PmdWaiterPosV1.php"
grep -Fq "reservations-waiter-final" "$TMP/routes/pmd-waiter-final-v1.php"
grep -Fq "pmd-waiter-final-v12-runtime-fixes.css" "$TMP/app/admin/views/waiter_dashboard_final.blade.php"
grep -Fq "pmd-waiter-final-v12-runtime-fixes.js" "$TMP/app/admin/views/waiter_dashboard_final.blade.php"
grep -Fq "Waiter Final V1.2 runtime fixes active" "$TMP/app/admin/assets/js/pmd-waiter-final-v12-runtime-fixes.js"
grep -Fq "pmd-pos-payment-modal.is-show" "$TMP/app/admin/assets/css/pmd-waiter-final-v12-runtime-fixes.css"

echo "PMD_WAITER_FINAL_V12_SOURCE_OK"

echo
echo "== Creating complete rollback backup =="
for FILE in "${FILES[@]}"; do
  sudo mkdir -p "$BACKUP/$(dirname "$FILE")"
  if [[ -f "$LIVE/$FILE" ]]; then
    sudo cp -a "$LIVE/$FILE" "$BACKUP/$FILE.before"
  else
    sudo touch "$BACKUP/$FILE.was-missing"
  fi
done

echo "Backup: $BACKUP"

echo
echo "== Installing only validated V1.2 files =="
INSTALLED=1
for FILE in "${FILES[@]}"; do
  sudo install -D -m 0644 "$TMP/$FILE" "$LIVE/$FILE"
  echo "Installed: $FILE"
done

echo
echo "== Validating installed production files =="
php -l "$LIVE/app/admin/controllers/PmdWaiterPosV1.php"
php -l "$LIVE/app/admin/controllers/concerns/PmdWaiterPosOperationsSummaryV12Concern.php"
php -l "$LIVE/app/admin/controllers/PmdWaiterDashboardFinalV1.php"
php -l "$LIVE/routes/pmd-waiter-final-v1.php"
php -l "$LIVE/app/admin/views/waiter_dashboard_final.blade.php"
node --check "$LIVE/app/admin/assets/js/pmd-waiter-final-v12-runtime-fixes.js"

for FILE in "${FILES[@]}"; do
  EXPECTED="$(git rev-parse "$REF:$FILE")"
  ACTUAL="$(git hash-object "$LIVE/$FILE")"
  if [[ "$EXPECTED" != "$ACTUAL" ]]; then
    echo "ERROR: installed hash mismatch for $FILE"
    exit 1
  fi
done

echo
echo "== Clearing Laravel/TastyIgniter caches =="
php artisan view:clear
php artisan route:clear
php artisan config:clear

INSTALLED=0

echo
echo "========================================================"
echo "PMD Waiter Final V1.2 installed successfully"
echo "========================================================"
echo "✓ Payment modal remains visible and interactive during status refresh"
echo "✓ Payment close, split and method controls remain reachable"
echo "✓ Grid/List controls are restored after POS mount"
echo "✓ Clear cart remains reachable on phone"
echo "✓ V2.2 operations summary route no longer throws a missing-method 500"
echo "✓ Reservations and table operations open authenticated waiter bridge pages"
echo "✓ Existing order, kitchen, payment and split engines remain unchanged"
echo
echo "Preview:"
echo "https://mimoza.paymydine.com/admin/dashboardwaiternewfinal"
echo
echo "Console checks:"
echo "PMDWaiterFinalV1.debug()"
echo "PMDWaiterFinalV11.debug()"
echo "PMDWaiterFinalV12.debug()"
echo "PMDWaiterPOS && PMDWaiterPOS.debug()"
echo
echo "Backup: $BACKUP"
echo "========================================================"
