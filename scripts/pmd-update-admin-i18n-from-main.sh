#!/usr/bin/env bash
set -Eeuo pipefail

# Safely import only PayMyDine admin i18n source/documentation files from
# origin/main into the current VPS working tree, without switching branches,
# then run the normal production deployment installer.
#
# Environment overrides:
#   PMD_UPDATE_REPO=/path/to/Paymydine-Update
#   PMD_LIVE_ROOT=/path/to/live/application
#   PMD_I18N_REMOTE=origin
#   PMD_I18N_SOURCE_BRANCH=main

REPO="${PMD_UPDATE_REPO:-/var/www/paymydine/frontend/Paymydine-Update}"
LIVE="${PMD_LIVE_ROOT:-/var/www/paymydine}"
REMOTE="${PMD_I18N_REMOTE:-origin}"
SOURCE_BRANCH="${PMD_I18N_SOURCE_BRANCH:-main}"
SOURCE_REF="$REMOTE/$SOURCE_BRANCH"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$LIVE/storage/backups/i18n-repo-sync-$STAMP"
REPORT="$LIVE/storage/logs/pmd-admin-i18n-sync-$STAMP.log"
TEMP_ROOT="$(mktemp -d /tmp/pmd-admin-i18n-sync.XXXXXX)"

cleanup() {
    rm -rf "$TEMP_ROOT"
}

on_error() {
    local code=$?
    echo
    echo "ERROR: Admin i18n update failed at line $1 (exit $code)."
    echo "Repository backup: $BACKUP"
    echo "Sync report: $REPORT"
    exit "$code"
}

trap cleanup EXIT
trap 'on_error "$LINENO"' ERR

if [ ! -d "$REPO/.git" ]; then
    echo "ERROR: Update repository is not a Git working tree: $REPO"
    exit 1
fi

if [ ! -f "$LIVE/artisan" ]; then
    echo "ERROR: Live PayMyDine root is invalid: $LIVE"
    exit 1
fi

mkdir -p "$BACKUP" "$(dirname "$REPORT")"
exec > >(tee "$REPORT") 2>&1

cd "$REPO"

CURRENT_BRANCH="$(git branch --show-current)"
CURRENT_HEAD="$(git rev-parse HEAD)"

printf '%s\n' \
    '======================================================' \
    ' PAYMYDINE ADMIN I18N SAFE UPDATE' \
    '======================================================' \
    "Repository:     $REPO" \
    "Live root:      $LIVE" \
    "Current branch: ${CURRENT_BRANCH:-detached HEAD}" \
    "Current commit: $CURRENT_HEAD" \
    "Source ref:     $SOURCE_REF" \
    "Backup:         $BACKUP" \
    "Report:         $REPORT"

echo
echo '===== 1. FETCH SOURCE BRANCH ====='

git fetch "$REMOTE" "$SOURCE_BRANCH"

SOURCE_COMMIT="$(git rev-parse "$SOURCE_REF")"
echo "Latest source commit: $SOURCE_COMMIT"
git log -1 --oneline "$SOURCE_REF"

echo
echo '===== 2. DISCOVER LANGUAGE-SYSTEM FILES ====='

mapfile -t FILES < <(
    git ls-tree -r --name-only "$SOURCE_REF" | grep -E \
        '^(app/admin/i18n/|app/admin/assets/js/pmd-admin-i18n-v[0-9]+\.js$|app/admin/views/_partials/pmd_admin_i18n\.blade\.php$|scripts/pmd-build-admin-i18n\.php$|scripts/pmd-deploy-admin-i18n\.sh$|scripts/pmd-update-admin-i18n-from-main\.sh$|docs/ADMIN_I18N[^/]*\.md$)' \
        | sort -u
)

if [ "${#FILES[@]}" -eq 0 ]; then
    echo "ERROR: No admin i18n files found in $SOURCE_REF"
    exit 1
fi

REQUIRED_FILES=(
    'app/admin/assets/js/pmd-admin-i18n-v1.js'
    'app/admin/i18n/pmd_admin_de.php'
    'app/admin/i18n/pmd_admin_locale_bootstrap.php'
    'app/admin/views/_partials/pmd_admin_i18n.blade.php'
    'scripts/pmd-build-admin-i18n.php'
    'scripts/pmd-deploy-admin-i18n.sh'
)

for required in "${REQUIRED_FILES[@]}"; do
    if ! git cat-file -e "$SOURCE_REF:$required" 2>/dev/null; then
        echo "ERROR: Required file is missing from $SOURCE_REF: $required"
        exit 1
    fi
done

printf 'Files selected: %s\n' "${#FILES[@]}"
printf '  %s\n' "${FILES[@]}"

echo
echo '===== 3. RECORD AND BACK UP CURRENT STATE ====='

{
    echo "branch=${CURRENT_BRANCH:-detached}"
    echo "head=$CURRENT_HEAD"
    echo "source_ref=$SOURCE_REF"
    echo "source_commit=$SOURCE_COMMIT"
    echo "created_at=$(date -Iseconds)"
} > "$BACKUP/sync-metadata.txt"

git status --short > "$BACKUP/git-status-before.txt" || true
git diff > "$BACKUP/working-tree-before.patch" || true
git diff --cached > "$BACKUP/index-before.patch" || true

for file in "${FILES[@]}"; do
    if [ -e "$file" ]; then
        destination="$BACKUP/repository/$file"
        mkdir -p "$(dirname "$destination")"
        cp -a "$file" "$destination"
        echo "BACKED UP: $file"
    fi
done

echo
echo '===== 4. MATERIALIZE FILES FROM SOURCE REF ====='

for file in "${FILES[@]}"; do
    temporary="$TEMP_ROOT/$file"
    mkdir -p "$(dirname "$temporary")"
    git show "$SOURCE_REF:$file" > "$temporary"
done

echo 'All source files were read successfully before changing the working tree.'

echo
echo '===== 5. INSTALL ONLY LANGUAGE-SYSTEM FILES ====='

for file in "${FILES[@]}"; do
    mkdir -p "$(dirname "$file")"
    cp -f "$TEMP_ROOT/$file" "$file"
    echo "UPDATED: $file"
done

chmod +x \
    scripts/pmd-deploy-admin-i18n.sh \
    scripts/pmd-update-admin-i18n-from-main.sh

echo
echo '===== 6. VALIDATE IMPORTED SOURCE ====='

php -l app/admin/i18n/pmd_admin_de.php
php -l app/admin/i18n/pmd_admin_locale_bootstrap.php
php -l scripts/pmd-build-admin-i18n.php
bash -n scripts/pmd-deploy-admin-i18n.sh
bash -n scripts/pmd-update-admin-i18n-from-main.sh

if command -v node >/dev/null 2>&1; then
    node --check app/admin/assets/js/pmd-admin-i18n-v1.js
else
    echo 'Node is unavailable; JavaScript syntax validation skipped.'
fi

echo
echo '===== 7. RUN NORMAL PRODUCTION DEPLOYMENT ====='

PMD_LIVE_ROOT="$LIVE" ./scripts/pmd-deploy-admin-i18n.sh

echo
echo '===== 8. FINAL VERIFICATION ====='

LIVE_RUNTIME="$LIVE/app/admin/assets/js/pmd-admin-i18n-v1.js"
LIVE_CATALOGUE="$LIVE/app/admin/assets/js/pmd-admin-i18n-catalog-de.js"
LIVE_PARTIAL="$LIVE/app/admin/views/_partials/pmd_admin_i18n.blade.php"
LIVE_BOOTSTRAP="$LIVE/app/admin/i18n/pmd_admin_locale_bootstrap.php"
LIVE_ROUTES="$LIVE/app/admin/routes.php"

for file in "$LIVE_RUNTIME" "$LIVE_CATALOGUE" "$LIVE_PARTIAL" "$LIVE_BOOTSTRAP"; do
    if [ ! -s "$file" ]; then
        echo "ERROR: Expected live file is missing or empty: $file"
        exit 1
    fi
    echo "LIVE OK: ${file#$LIVE/}"
done

route_count="$(grep -Fc "require_once base_path('app/admin/i18n/pmd_admin_locale_bootstrap.php');" "$LIVE_ROUTES")"
echo "app/admin/routes.php: early locale include count=$route_count"

if [ "$route_count" -ne 1 ]; then
    echo 'ERROR: Early locale bootstrap is not installed exactly once.'
    exit 1
fi

layout_found=0
for layout in \
    "$LIVE/app/admin/views/_layouts/default.blade.php" \
    "$LIVE/app/admin/views/layouts/default.blade.php"
do
    [ -f "$layout" ] || continue
    layout_found=$((layout_found + 1))
    count="$(grep -Fc "@include('admin::_partials.pmd_admin_i18n')" "$layout")"
    echo "${layout#$LIVE/}: clean include count=$count"
    if [ "$count" -ne 1 ]; then
        echo "ERROR: Expected exactly one admin i18n include in $layout"
        exit 1
    fi
done

if [ "$layout_found" -eq 0 ]; then
    echo 'ERROR: No live admin layout was available for final verification.'
    exit 1
fi

FINAL_BRANCH="$(git branch --show-current)"

if [ "$FINAL_BRANCH" != "$CURRENT_BRANCH" ]; then
    echo "ERROR: Current branch changed unexpectedly: $CURRENT_BRANCH -> $FINAL_BRANCH"
    exit 1
fi

echo
echo 'Git status for language-system files:'
git status --short -- "${FILES[@]}" || true

printf '%s\n' \
    '' \
    '======================================================' \
    ' ADMIN I18N UPDATE INSTALLED SUCCESSFULLY' \
    '======================================================' \
    "Current branch stayed unchanged: ${FINAL_BRANCH:-detached HEAD}" \
    "Imported source commit: $SOURCE_COMMIT" \
    "Repository backup: $BACKUP" \
    "Sync report: $REPORT" \
    '' \
    'English and German now resolve before controllers run.' \
    'Only language-system files were imported.' \
    'Reservations, Floor, KDS, Waiter, and unrelated files were not selected.' \
    '======================================================'
