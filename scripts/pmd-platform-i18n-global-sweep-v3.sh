#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
REF="origin/i18n/platform-catalog-consolidation"
COMPOSER="app/admin/assets/js/pmd-cashier-order-composer-r51.js"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
BACKUP="${HOME}/pmd-platform-i18n-cache-bust-backups/${STAMP}"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

cd "$ROOT"
mkdir -p "$BACKUP"

echo "============================================================"
echo " PMD PLATFORM I18N GLOBAL SWEEP V3"
echo "============================================================"

git fetch origin i18n/platform-catalog-consolidation

git show "$REF:scripts/pmd-platform-i18n-global-sweep-v2.sh" > "$TMP/sweep.sh"
chmod +x "$TMP/sweep.sh"

bash "$TMP/sweep.sh"

[ -f "$COMPOSER" ] || { echo "ERROR=Missing $COMPOSER" >&2; exit 30; }
cp -a "$COMPOSER" "$BACKUP/pmd-cashier-order-composer-r51.js.before"
sha256sum "$COMPOSER" | tee "$BACKUP/composer.before.sha256"

python3 - "$COMPOSER" "$TMP/composer.candidate" <<'PY'
from pathlib import Path
import sys
src = Path(sys.argv[1])
out = Path(sys.argv[2])
text = src.read_text(encoding='utf-8')
old = "'cashier-payment-policy-r67h-20260826'"
new = "'cashier-payment-policy-platform-i18n-v1-20260827'"
if new not in text:
    if text.count(old) != 1:
        raise SystemExit('ERROR=Expected exactly one Cashier payment policy cache key; refusing patch')
    text = text.replace(old, new, 1)
if text.count(new) != 1:
    raise SystemExit('ERROR=New payment policy cache key count is not 1')
out.write_text(text, encoding='utf-8')
print('PAYMENT_POLICY_CACHE_BUST_CANDIDATE_OK=1')
PY

if command -v node >/dev/null 2>&1; then
  node --check "$TMP/composer.candidate"
fi

sudo tee "$ROOT/$COMPOSER" < "$TMP/composer.candidate" >/dev/null

grep -q 'cashier-payment-policy-platform-i18n-v1-20260827' "$COMPOSER"
sha256sum "$COMPOSER" | tee "$BACKUP/composer.after.sha256"

echo "PAYMENT_POLICY_CACHE_BUST_OK=1"
echo "SWEEP_V3_OK=1"
echo "CACHE_BUST_BACKUP=$BACKUP/pmd-cashier-order-composer-r51.js.before"
echo "NEXT=Hard refresh the German Cashier/Waiter page and reopen Payment."
