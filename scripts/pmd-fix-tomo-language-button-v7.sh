#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
REF="origin/i18n/language-foundation-runtime"
REPAIR_REL="scripts/pmd-repair-tenant-en-de-foundation-v3.php"
TENANT="tomo.paymydine.com"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
OUT="$HOME/pmd-tomo-language-fix-$STAMP"
TMP="$(mktemp -d)"

cleanup() { rm -rf "$TMP"; }
trap cleanup EXIT

mkdir -p "$OUT"
cd "$ROOT"

echo "============================================================"
echo " PMD TOMO LANGUAGE BUTTON FIX V7"
echo "============================================================"
echo "TENANT=$TENANT"
echo "OUTPUT=$OUT"

echo
echo "[1/4] Fetching generic guarded repair..."
git fetch origin i18n/language-foundation-runtime
git show "$REF:$REPAIR_REL" > "$TMP/repair.php"
php -l "$TMP/repair.php"

echo
echo "[2/4] Tomo dry-run..."
PMD_ROOT="$ROOT" php "$TMP/repair.php" --tenant="$TENANT" \
  | tee "$OUT/dry-run.txt"

grep -q '^TENANT_DOMAIN=tomo.paymydine.com$' "$OUT/dry-run.txt"
grep -q '^DRY_RUN_OK=1$' "$OUT/dry-run.txt"

echo
echo "[3/4] Applying transactional EN/DE repair to Tomo..."
PMD_ROOT="$ROOT" php "$TMP/repair.php" --tenant="$TENANT" --apply \
  | tee "$OUT/apply.txt"

grep -q '^VERIFY_OK=1$' "$OUT/apply.txt"
grep -q '^ACTIVE_EXACT_EN_AFTER=1$' "$OUT/apply.txt"
grep -q '^ACTIVE_EXACT_DE_AFTER=1$' "$OUT/apply.txt"
grep -q '^ACTIVE_NON_EN_DE_AFTER=0$' "$OUT/apply.txt"
grep -q '^SUPPORTED_LANGUAGES_AFTER=\["en","de"\]$' "$OUT/apply.txt"
grep -q '^DEFAULT_LANGUAGE_AFTER=de$' "$OUT/apply.txt"

echo
echo "[4/4] Confirming live route source..."
set +e
code="$(curl -sS --max-time 15 -o "$OUT/probe.json" -w '%{http_code}' \
  -X POST \
  -H 'Accept: application/json' \
  -H 'X-Requested-With: XMLHttpRequest' \
  --data 'code=de' \
  "https://tomo.paymydine.com/admin/_pmd/language-switch-v3")"
rc=$?
set -e

echo "PROBE_HTTP_CODE=$code"
echo "PROBE_CURL_RC=$rc"
cat "$OUT/probe.json" || true
echo

if ! grep -q 'tenant-db-v4' "$OUT/probe.json"; then
  echo "ERROR=Live Tomo endpoint is not serving tenant-db-v4 route." >&2
  exit 30
fi

echo
echo "============================================================"
echo " TOMO LANGUAGE FOUNDATION FIXED"
echo "============================================================"
echo "VERIFY_OK=1"
echo "BUTTON_READY=1"
echo "OUTPUT=$OUT"
echo "NEXT=Reload https://tomo.paymydine.com/admin once, then click DE/EN."
