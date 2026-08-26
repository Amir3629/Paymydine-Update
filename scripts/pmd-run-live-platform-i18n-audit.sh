#!/usr/bin/env bash
set -euo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
BRANCH="i18n/platform-catalog-consolidation"
STAMP="$(date -u +%Y%m%d_%H%M%S)"
OUT="$HOME/pmd-platform-i18n-audits/$STAMP"
TMP="$(mktemp -d)"

cleanup() {
  rm -rf "$TMP"
}
trap cleanup EXIT

mkdir -p "$OUT"
cd "$ROOT"

echo "============================================================"
echo " PMD PLATFORM I18N LIVE READ-ONLY AUDIT"
echo "============================================================"
echo "ROOT=$ROOT"
echo "OUTPUT=$OUT"

echo
echo "[1/3] Refreshing audit branch (no checkout/merge)..."
git fetch origin "$BRANCH"

git show "origin/$BRANCH:scripts/pmd-audit-platform-i18n-readonly.py" \
  > "$TMP/audit.py"

python3 -m py_compile "$TMP/audit.py"

echo
echo "[2/3] Scanning exact live source tree..."
python3 "$TMP/audit.py" "$ROOT" \
  --json-out "$OUT/platform-i18n-audit.json" \
  --tsv-out "$OUT/platform-i18n-candidates.tsv" \
  | tee "$OUT/platform-i18n-audit.txt"

echo
echo "[3/3] Capturing live source fingerprints..."
{
  echo "HEAD=$(git rev-parse HEAD)"
  echo "BRANCH=$(git branch --show-current)"
  echo "ROUTES_SHA=$(sha256sum app/admin/routes.php | awk '{print $1}')"
  echo "MIDDLEWARE_SHA=$(sha256sum app/Http/Middleware/TenantDatabaseMiddleware.php | awk '{print $1}')"
} | tee "$OUT/live-fingerprints.txt"

echo
echo "============================================================"
echo " AUDIT COMPLETE"
echo "============================================================"
echo "AUDIT_OK=1"
echo "OUTPUT=$OUT"
echo "SUMMARY=$OUT/platform-i18n-audit.txt"
echo "DETAIL_JSON=$OUT/platform-i18n-audit.json"
echo "CANDIDATES_TSV=$OUT/platform-i18n-candidates.tsv"
