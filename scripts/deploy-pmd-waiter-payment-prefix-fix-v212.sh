#!/usr/bin/env bash
set -Eeuo pipefail

LIVE="/var/www/paymydine"
BRANCH="origin/agent/waiter-pos-standard-v212-tenant-schema-fix"
TARGET_REL="app/admin/controllers/concerns/PmdWaiterPosPaymentSummaryConcern.php"
TARGET="$LIVE/$TARGET_REL"
EXPECTED_SOURCE_BLOB="9d35eaa322baa3e60b40321160b7917569a9607d"

TS="$(date +%Y%m%d_%H%M%S)"
TMP_ROOT="/tmp/pmd-waiter-payment-prefix-v212-$TS"
TMP_FILE="$TMP_ROOT/$TARGET_REL"
BACKUP="/var/backups/pmd-waiter-payment-prefix-v212-$TS"
INSTALLED=0

cleanup() {
  rm -rf "$TMP_ROOT"
}

rollback_on_error() {
  local code="$?"

  if [[ "$code" -ne 0 && "$INSTALLED" -eq 1 && -f "$BACKUP/PmdWaiterPosPaymentSummaryConcern.php.before" ]]; then
    echo
    echo "ERROR after installation. Restoring previous payment summary concern..."
    sudo install -m 0644 \
      "$BACKUP/PmdWaiterPosPaymentSummaryConcern.php.before" \
      "$TARGET"
    php artisan view:clear || true
    php artisan route:clear || true
    echo "Previous file restored."
  fi

  cleanup
  exit "$code"
}

trap rollback_on_error EXIT

cd "$LIVE"

cat <<'EOF'
========================================================
PMD Waiter Payment V2.1.2 — tenant-prefix query repair
========================================================
EOF

echo
echo "== Fetching isolated GitHub branch =="

git fetch --no-tags origin \
  agent/waiter-pos-standard-v212-tenant-schema-fix:refs/remotes/origin/agent/waiter-pos-standard-v212-tenant-schema-fix

echo "Branch commit:"
git rev-parse "$BRANCH"

echo
echo "== Confirming V2.1.1 payment baseline =="

test -f app/admin/controllers/PmdWaiterPosV1.php
test -f app/admin/controllers/concerns/PmdWaiterPosPaymentFallbackConcern.php
test -f app/admin/assets/js/pmd-waiter-standard-v211-payment-guard.js

grep -Fq \
  "PmdWaiterPosPaymentFallbackConcern.php" \
  app/admin/controllers/PmdWaiterPosV1.php

grep -Fq \
  "pmd-waiter-pos-v2.1.1-fallback" \
  app/admin/controllers/concerns/PmdWaiterPosPaymentFallbackConcern.php

echo "PMD_WAITER_PAYMENT_V211_BASE_OK"

echo
echo "== Extracting only the corrected payment summary concern =="

mkdir -p "$(dirname "$TMP_FILE")"

git show "$BRANCH:$TARGET_REL" > "$TMP_FILE"

SOURCE_BLOB="$(git hash-object "$TMP_FILE")"

echo "Expected source blob: $EXPECTED_SOURCE_BLOB"
echo "Extracted source:     $SOURCE_BLOB"

if [[ "$SOURCE_BLOB" != "$EXPECTED_SOURCE_BLOB" ]]; then
  echo "ERROR: Extracted V2.1.2 source does not match the validated GitHub file."
  exit 1
fi

echo
echo "== Validating V2.1.2 source =="

php -l "$TMP_FILE"

grep -Fq \
  "'version' => 'pmd-waiter-pos-v2.1.2'" \
  "$TMP_FILE"

grep -Fq \
  "tenant table prefix also prefixes query-builder aliases" \
  "$TMP_FILE"

grep -Fq \
  "order_payment_transaction_items.\$allocationColumn.' as alloc_key'" \
  "$TMP_FILE"

if grep -Fq \
  "selectRaw('ti.'" \
  "$TMP_FILE"; then
  echo "ERROR: Broken raw short-alias query is still present."
  exit 1
fi

echo "PMD_WAITER_PAYMENT_V212_SOURCE_OK"

echo
echo "== Backing up current live concern =="

sudo mkdir -p "$BACKUP"
sudo cp -a "$TARGET" "$BACKUP/PmdWaiterPosPaymentSummaryConcern.php.before"

echo "Backup:"
echo "$BACKUP"

echo
echo "== Installing one corrected PHP file =="

sudo install -m 0644 "$TMP_FILE" "$TARGET"
INSTALLED=1

if [[ -f app/admin/controllers/PmdWaiterPosV1.php ]]; then
  sudo chown --reference=app/admin/controllers/PmdWaiterPosV1.php "$TARGET" || true
fi

echo
echo "== Validating installed file =="

php -l "$TARGET"

LIVE_BLOB="$(git hash-object "$TARGET")"

echo "Installed blob: $LIVE_BLOB"

if [[ "$LIVE_BLOB" != "$EXPECTED_SOURCE_BLOB" ]]; then
  echo "ERROR: Installed file hash is incorrect."
  exit 1
fi

grep -n \
  "pmd-waiter-pos-v2.1.2" \
  "$TARGET"

echo
echo "== Clearing Laravel/TastyIgniter caches =="

php artisan view:clear
php artisan route:clear
php artisan config:clear

INSTALLED=0

cat <<EOF

========================================================
PMD Waiter Payment V2.1.2 installed
========================================================
✓ Fixed tenant-prefixed alias mismatch in payment summary
✓ Payment modal now uses the primary summary, not compatibility mode
✓ Coupon validation uses the same corrected summary
✓ Existing split bill, tips and payment providers were untouched
✓ Existing V2.1 UI and V2.1.1 no-auto-close guard were untouched
✓ Only $TARGET_REL changed

Backup:
$BACKUP
========================================================
EOF
