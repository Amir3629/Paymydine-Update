#!/usr/bin/env bash
set -euo pipefail

# PMD_ADMIN_AR_PERF_DEPLOY_R12
# Usage: bash scripts/pmd-admin-ar-perf-r12-deploy.sh <immutable-commit-sha>

SHA="${1:-}"
if ! printf '%s' "$SHA" | grep -Eq '^[0-9a-f]{40}$'; then
    echo "ERROR: pass the immutable 40-character Git commit SHA as argument 1."
    exit 2
fi

ROOT='/var/www/paymydine'
REPO='Amir3629/Paymydine-Update'
RAW_HOST='raw.githubusercontent.com'
STAMP="$(date +%Y%m%d_%H%M%S)"
STAGE="/tmp/pmd-admin-ar-perf-r12-${STAMP}"
BACKUP="$HOME/pmd-backups/admin-ar-perf-r12-${STAMP}"

cd "$ROOT" || exit 1
rm -rf "$STAGE"
mkdir -p "$STAGE"
trap 'rm -rf "$STAGE"' EXIT

cat > "$STAGE/manifest.txt" <<'EOF'
4c586ddba403d45f13b9823dded36a03ea76cc3b app/admin/assets/js/pmd-admin-ar-complete-r10.js
47bf55aaa48f3984c7c9e8460cc94a0158620078 app/admin/assets/js/pmd-admin-coverage-r3-v11b.js
EOF

echo "======================================================"
echo "PMD ADMIN ARABIC PERFORMANCE R12 - SAFE DEPLOY"
echo "Commit: $SHA"
echo "======================================================"

while read -r expected path; do
    target="$STAGE/$path"
    mkdir -p "$(dirname "$target")"

    curl -fL --retry 3 --connect-timeout 20 \
        "https://${RAW_HOST}/${REPO}/${SHA}/${path}" \
        -o "$target"

    actual="$(git hash-object "$target")"
    printf '%-58s expected=%s actual=%s\n' "$path" "$expected" "$actual"

    if [ "$actual" != "$expected" ]; then
        echo "ERROR: R12 blob mismatch for $path"
        exit 10
    fi
done < "$STAGE/manifest.txt"

echo
echo "[1/3] R12 preflight"
grep -q 'PMD_ADMIN_AR_COMPLETE_RUNTIME_R12_PERF' \
    "$STAGE/app/admin/assets/js/pmd-admin-ar-complete-r10.js"
grep -q 'PMD_ADMIN_AR_COVERAGE_CACHE_GUARD_R12' \
    "$STAGE/app/admin/assets/js/pmd-admin-ar-complete-r10.js"
grep -q 'PMD_ADMIN_COVERAGE_INCREMENTAL_OBSERVER_R12' \
    "$STAGE/app/admin/assets/js/pmd-admin-coverage-r3-v11b.js"

if grep -Fq '[0, 60, 180, 400, 800, 1400, 2400, 3800]' \
    "$STAGE/app/admin/assets/js/pmd-admin-ar-complete-r10.js"; then
    echo "ERROR: old R10 full-page translation wave is still present."
    exit 11
fi

if grep -Fq 'window.requestAnimationFrame(run);' \
    "$STAGE/app/admin/assets/js/pmd-admin-coverage-r3-v11b.js"; then
    echo "ERROR: old full-body MutationObserver callback is still present."
    exit 12
fi

if command -v node >/dev/null 2>&1; then
    node --check "$STAGE/app/admin/assets/js/pmd-admin-ar-complete-r10.js"
    node --check "$STAGE/app/admin/assets/js/pmd-admin-coverage-r3-v11b.js"
else
    echo "WARN: node is unavailable; marker/hash preflight passed."
fi

echo "[OK] R12 performance preflight passed."

echo
echo "[2/3] Backup + install"
mkdir -p "$BACKUP"

while read -r _ path; do
    if [ -e "$ROOT/$path" ]; then
        mkdir -p "$BACKUP/$(dirname "$path")"
        cp -a "$ROOT/$path" "$BACKUP/$path"
    fi
    sudo -n install -d -m 0755 "$(dirname "$ROOT/$path")"
    sudo -n install -m 0644 "$STAGE/$path" "$ROOT/$path"
done < "$STAGE/manifest.txt"

echo
echo "[3/3] Live blob verification"
while read -r expected path; do
    actual="$(git hash-object "$ROOT/$path")"
    printf '%-58s expected=%s actual=%s\n' "$path" "$expected" "$actual"
    if [ "$actual" != "$expected" ]; then
        echo "ERROR: live R12 blob verification failed for $path"
        exit 20
    fi
done < "$STAGE/manifest.txt"

echo "======================================================"
echo "PMD ADMIN ARABIC PERFORMANCE R12 INSTALLED"
echo "Translation catalogue/content was not changed."
echo "R9 language switching was not changed."
echo "No database writes were made."
echo "No global cache clear was performed."
echo "No PHP-FPM restart/reload was performed."
echo "Backup: $BACKUP"
echo "======================================================"
