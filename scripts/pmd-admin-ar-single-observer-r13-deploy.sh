#!/usr/bin/env bash
set -euo pipefail

# PMD_ADMIN_AR_SINGLE_OBSERVER_DEPLOY_R13
# Usage: bash scripts/pmd-admin-ar-single-observer-r13-deploy.sh <immutable-commit-sha>

SHA="${1:-}"
if ! printf '%s' "$SHA" | grep -Eq '^[0-9a-f]{40}$'; then
    echo "ERROR: pass the immutable 40-character Git commit SHA as argument 1."
    exit 2
fi

ROOT='/var/www/paymydine'
REPO='Amir3629/Paymydine-Update'
RAW_HOST='raw.githubusercontent.com'
FILE='app/admin/assets/js/pmd-admin-ar-complete-r10.js'
EXPECTED='7427b763a11ad653f908b1f6181404fef7175a76'
TMP='/tmp/pmd-admin-ar-single-observer-r13.js'
STAMP="$(date +%Y%m%d_%H%M%S)"
BACKUP="$HOME/pmd-backups/admin-ar-single-observer-r13-${STAMP}"

cd "$ROOT" || exit 1
rm -f "$TMP"

curl -fL --retry 3 --connect-timeout 20 \
    "https://${RAW_HOST}/${REPO}/${SHA}/${FILE}" \
    -o "$TMP"

ACTUAL="$(git hash-object "$TMP")"
echo "Expected R13 blob: $EXPECTED"
echo "Actual R13 blob:   $ACTUAL"

if [ "$ACTUAL" != "$EXPECTED" ]; then
    echo "ERROR: R13 runtime blob mismatch."
    exit 10
fi

grep -q 'PMD_ADMIN_AR_SINGLE_OBSERVER_PERF_R13' "$TMP"
grep -q 'PMD_ADMIN_AR_COVERAGE_CACHE_GUARD_R13' "$TMP"
grep -q 'PMD_ADMIN_AR_CANONICAL_AJAX_LISTENER_REMOVAL_R13' "$TMP"
grep -q 'removePageAuthorityListeners' "$TMP"
grep -q 'singleObserverMode: true' "$TMP"

if grep -Fq "document.addEventListener('ajaxUpdateComplete', onAsyncContent" "$TMP"; then
    echo "ERROR: old Arabic AJAX full-translation listener is still present."
    exit 11
fi

if grep -Fq 'requestTranslate(90)' "$TMP"; then
    echo "ERROR: old Arabic automatic full-translation request is still present."
    exit 12
fi

if command -v node >/dev/null 2>&1; then
    node --check "$TMP"
else
    echo "WARN: node is unavailable; hash/marker preflight passed."
fi

echo "[OK] R13 single-observer preflight passed."

mkdir -p "$BACKUP/$(dirname "$FILE")"
if [ -e "$ROOT/$FILE" ]; then
    cp -a "$ROOT/$FILE" "$BACKUP/$FILE"
fi

sudo -n install -m 0644 "$TMP" "$ROOT/$FILE"

LIVE="$(git hash-object "$ROOT/$FILE")"
echo "Expected live blob: $EXPECTED"
echo "Actual live blob:   $LIVE"

if [ "$LIVE" != "$EXPECTED" ]; then
    echo "ERROR: live R13 runtime verification failed."
    exit 20
fi

if command -v node >/dev/null 2>&1; then
    node --check "$ROOT/$FILE"
fi

echo "======================================================"
echo "PMD ADMIN ARABIC SINGLE-OBSERVER R13 INSTALLED"
echo "Arabic catalogue/content was not changed."
echo "R9 language switching was not changed."
echo "No database writes were made."
echo "No global cache clear was performed."
echo "No PHP-FPM restart/reload was performed."
echo "Backup: $BACKUP"
echo "======================================================"
