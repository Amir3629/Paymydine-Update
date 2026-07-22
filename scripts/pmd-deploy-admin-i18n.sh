#!/usr/bin/env bash
set -Eeuo pipefail

SOURCE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LIVE_ROOT="${PMD_LIVE_ROOT:-/var/www/paymydine}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$LIVE_ROOT/storage/backups/clean-admin-i18n-$STAMP"
REPORT="$LIVE_ROOT/storage/logs/pmd-admin-i18n-deploy-$STAMP.log"

exec > >(tee "$REPORT") 2>&1

LIVE_MAIN_LAYOUT="$LIVE_ROOT/app/admin/views/_layouts/default.blade.php"
LIVE_LEGACY_LAYOUT="$LIVE_ROOT/app/admin/views/layouts/default.blade.php"
LIVE_SIDE_NAV="$LIVE_ROOT/app/admin/views/_partials/side_nav.blade.php"

SOURCE_PARTIAL="$SOURCE_ROOT/app/admin/views/_partials/pmd_admin_i18n.blade.php"
SOURCE_RUNTIME="$SOURCE_ROOT/app/admin/assets/js/pmd-admin-i18n-v1.js"
SOURCE_CUSTOM="$SOURCE_ROOT/app/admin/i18n/pmd_admin_de.php"
SOURCE_BUILDER="$SOURCE_ROOT/scripts/pmd-build-admin-i18n.php"

LIVE_PARTIAL="$LIVE_ROOT/app/admin/views/_partials/pmd_admin_i18n.blade.php"
LIVE_RUNTIME="$LIVE_ROOT/app/admin/assets/js/pmd-admin-i18n-v1.js"
LIVE_CUSTOM="$LIVE_ROOT/app/admin/i18n/pmd_admin_de.php"
LIVE_BUILDER="$LIVE_ROOT/scripts/pmd-build-admin-i18n.php"
LIVE_CATALOGUE="$LIVE_ROOT/app/admin/assets/js/pmd-admin-i18n-catalog-de.js"
LIVE_BUILD_REPORT="$LIVE_ROOT/storage/logs/pmd-admin-i18n-report.json"

printf '%s\n' \
    '======================================================' \
    ' PAYMYDINE CLEAN ADMIN I18N DEPLOYMENT' \
    '======================================================' \
    "Source: $SOURCE_ROOT" \
    "Live:   $LIVE_ROOT" \
    "Backup: $BACKUP" \
    "Report: $REPORT"

echo
echo '===== 1. PRE-FLIGHT ====='

for file in \
    "$SOURCE_PARTIAL" \
    "$SOURCE_RUNTIME" \
    "$SOURCE_CUSTOM" \
    "$SOURCE_BUILDER" \
    "$LIVE_ROOT/artisan"
do
    if [ ! -f "$file" ]; then
        echo "ERROR: Required file missing: $file"
        exit 1
    fi

done

layout_count=0
for file in "$LIVE_MAIN_LAYOUT" "$LIVE_LEGACY_LAYOUT"; do
    if [ -f "$file" ]; then
        echo "FOUND: ${file#$LIVE_ROOT/}"
        layout_count=$((layout_count + 1))
    fi
done

if [ "$layout_count" -eq 0 ]; then
    echo 'ERROR: No live admin layout found.'
    exit 1
fi

php -l "$SOURCE_CUSTOM"
php -l "$SOURCE_BUILDER"

echo
echo '===== 2. BACKUP ====='

mkdir -p "$BACKUP"

for file in \
    "$LIVE_MAIN_LAYOUT" \
    "$LIVE_LEGACY_LAYOUT" \
    "$LIVE_SIDE_NAV" \
    "$LIVE_PARTIAL" \
    "$LIVE_RUNTIME" \
    "$LIVE_CUSTOM" \
    "$LIVE_CATALOGUE"
do
    if [ -f "$file" ]; then
        relative="${file#$LIVE_ROOT/}"
        destination="$BACKUP/$relative"
        mkdir -p "$(dirname "$destination")"
        cp -a "$file" "$destination"
    fi
done

echo "Backup completed: $BACKUP"

echo
echo '===== 3. INSTALL CLEAN I18N FILES ====='

mkdir -p \
    "$(dirname "$LIVE_PARTIAL")" \
    "$(dirname "$LIVE_RUNTIME")" \
    "$(dirname "$LIVE_CUSTOM")" \
    "$(dirname "$LIVE_BUILDER")"

cp -a "$SOURCE_PARTIAL" "$LIVE_PARTIAL"
cp -a "$SOURCE_RUNTIME" "$LIVE_RUNTIME"
cp -a "$SOURCE_CUSTOM" "$LIVE_CUSTOM"
cp -a "$SOURCE_BUILDER" "$LIVE_BUILDER"

sudo chown ubuntu:www-data \
    "$LIVE_PARTIAL" \
    "$LIVE_RUNTIME" \
    "$LIVE_CUSTOM" \
    "$LIVE_BUILDER"

chmod 664 \
    "$LIVE_PARTIAL" \
    "$LIVE_RUNTIME" \
    "$LIVE_CUSTOM" \
    "$LIVE_BUILDER"

echo 'Clean i18n source files installed.'

echo
echo '===== 4. PATCH BOTH ADMIN LAYOUTS ====='

patch_layout() {
    local file="$1"

    [ -f "$file" ] || return 0

    sudo chown ubuntu:www-data "$file"
    sudo chmod 664 "$file"

    python3 - "$file" <<'PY'
from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
content = path.read_text(encoding='utf-8')
include_line = "@include('admin::_partials.pmd_admin_i18n')"

blocks = [
    ('{{-- PMD_SERVER_LOCALE_BRIDGE_V41_BEGIN --}}', '{{-- PMD_SERVER_LOCALE_BRIDGE_V41_END --}}'),
    ('{{-- PMD_ADMIN_LOCALE_COOKIE_V3_BEGIN --}}', '{{-- PMD_ADMIN_LOCALE_COOKIE_V3_END --}}'),
    ('{{-- PMD_GLOBAL_CUSTOM_TRANSLATOR_V4_BEGIN --}}', '{{-- PMD_GLOBAL_CUSTOM_TRANSLATOR_V4_END --}}'),
    ('{{-- PMD_SAFE_NOFLASH_V42_BEGIN --}}', '{{-- PMD_SAFE_NOFLASH_V42_END --}}'),
    ('{{-- PMD_SAFE_NOFLASH_REVEAL_V42_BEGIN --}}', '{{-- PMD_SAFE_NOFLASH_REVEAL_V42_END --}}'),
    ('{{-- PMD_I18N_V5_BOOT_BEGIN --}}', '{{-- PMD_I18N_V5_BOOT_END --}}'),
    ('{{-- PMD_I18N_V5_TRANSLATOR_BEGIN --}}', '{{-- PMD_I18N_V5_TRANSLATOR_END --}}'),
]

for start, end in blocks:
    while start in content:
        start_at = content.index(start)
        if end not in content[start_at:]:
            raise SystemExit(f'ERROR: Unclosed marker {start} in {path}')
        end_at = content.index(end, start_at) + len(end)
        content = content[:start_at] + content[end_at:]

# Remove duplicate clean includes before inserting exactly one.
content = content.replace(include_line, '')

head = re.search(r'<head\b[^>]*>', content, flags=re.IGNORECASE)
if not head:
    raise SystemExit(f'ERROR: <head> not found in {path}')

content = content[:head.end()] + '\n' + include_line + '\n' + content[head.end():]

# Collapse only excessive blank lines created by marker removal.
content = re.sub(r'\n{7,}', '\n\n\n', content)
path.write_text(content, encoding='utf-8')
print(f'PATCHED: {path}')
PY
}

patch_layout "$LIVE_MAIN_LAYOUT"
patch_layout "$LIVE_LEGACY_LAYOUT"

echo
echo '===== 5. REMOVE LEGACY SIDEBAR TRANSLATOR ====='

if [ -f "$LIVE_SIDE_NAV" ]; then
    sudo chown ubuntu:www-data "$LIVE_SIDE_NAV"
    sudo chmod 664 "$LIVE_SIDE_NAV"

    python3 - "$LIVE_SIDE_NAV" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])
content = path.read_text(encoding='utf-8')
start = '{{-- PMD_CUSTOM_SIDEBAR_LABELS_V3_BEGIN --}}'
end = '{{-- PMD_CUSTOM_SIDEBAR_LABELS_V3_END --}}'

while start in content:
    start_at = content.index(start)
    if end not in content[start_at:]:
        raise SystemExit(f'ERROR: Unclosed sidebar translator marker in {path}')
    end_at = content.index(end, start_at) + len(end)
    content = content[:start_at] + content[end_at:]

path.write_text(content, encoding='utf-8')
print(f'CLEANED: {path}')
PY
fi

echo
echo '===== 6. BUILD FULL CORE + CUSTOM CATALOGUE ====='

php "$LIVE_BUILDER" \
    --root="$LIVE_ROOT" \
    --custom="$LIVE_CUSTOM" \
    --output="$LIVE_CATALOGUE" \
    --report="$LIVE_BUILD_REPORT"

sudo chown ubuntu:www-data "$LIVE_CATALOGUE" "$LIVE_BUILD_REPORT"
chmod 664 "$LIVE_CATALOGUE" "$LIVE_BUILD_REPORT"

if [ ! -s "$LIVE_CATALOGUE" ]; then
    echo 'ERROR: Generated catalogue is empty.'
    exit 1
fi

echo
echo '===== 7. VALIDATE GENERATED ASSETS ====='

php -l "$LIVE_CUSTOM"
php -l "$LIVE_BUILDER"

if command -v node >/dev/null 2>&1; then
    node --check "$LIVE_RUNTIME"
    node --check "$LIVE_CATALOGUE"
else
    echo 'Node is unavailable; JavaScript syntax validation skipped.'
fi

for file in "$LIVE_MAIN_LAYOUT" "$LIVE_LEGACY_LAYOUT"; do
    [ -f "$file" ] || continue

    count="$(grep -Fc "@include('admin::_partials.pmd_admin_i18n')" "$file")"
    echo "${file#$LIVE_ROOT/}: clean include count=$count"

    if [ "$count" -ne 1 ]; then
        echo "ERROR: Expected exactly one clean i18n include in $file"
        exit 1
    fi

    if grep -Eq 'PMD_GLOBAL_CUSTOM_TRANSLATOR_V4_BEGIN|PMD_I18N_V5_TRANSLATOR_BEGIN|PMD_SAFE_NOFLASH_V42_BEGIN' "$file"; then
        echo "ERROR: Legacy i18n marker remains in $file"
        exit 1
    fi
done

echo
echo '===== 8. CLEAR FRAMEWORK CACHES ====='

cd "$LIVE_ROOT"
rm -f "$LIVE_ROOT/storage/framework/views/"*.php || true
php artisan view:clear
php artisan config:clear
php artisan route:clear

php artisan tinker --execute='
foreach ([
    ["de", "lang", "admin"],
    ["de", "lang", "main"],
    ["de", "lang", "system"],
    ["de", "validation", "system"],
    ["en", "lang", "admin"],
    ["en", "lang", "main"],
    ["en", "lang", "system"],
    ["en", "validation", "system"],
] as [$locale, $group, $namespace]) {
    Cache::forget(
        \System\Models\Translations_model::getCacheKey(
            $locale,
            $group,
            $namespace
        )
    );
}
echo "Translation caches cleared.\n";
'

echo
echo '===== 9. FINAL REPORT ====='

php -r '
$report = json_decode(file_get_contents($argv[1]), true);
if (!is_array($report)) {
    fwrite(STDERR, "Invalid build report.\n");
    exit(1);
}
echo "Catalogue entries: ".($report["catalogue_entries"] ?? 0).PHP_EOL;
echo "Custom entries: ".($report["custom_entries"] ?? 0).PHP_EOL;
echo "Source rows: ".($report["source_key_count"] ?? 0).PHP_EOL;
echo "Unchanged source rows: ".($report["unchanged_count"] ?? 0).PHP_EOL;
echo "Placeholder errors skipped: ".($report["placeholder_error_count"] ?? 0).PHP_EOL;
echo "Conflicts skipped: ".($report["conflict_count"] ?? 0).PHP_EOL;
' "$LIVE_BUILD_REPORT"

printf '%s\n' \
    '' \
    '======================================================' \
    ' CLEAN ADMIN I18N DEPLOYMENT COMPLETE' \
    '======================================================' \
    "Backup: $BACKUP" \
    "Deploy report: $REPORT" \
    "Build report: $LIVE_BUILD_REPORT" \
    '' \
    'The same central catalogue now covers both admin layouts,' \
    'standard TastyIgniter text, and dynamic PayMyDine DOM text.' \
    '======================================================'
