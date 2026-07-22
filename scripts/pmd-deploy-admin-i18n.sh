#!/usr/bin/env bash
set -Eeuo pipefail

SOURCE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
LIVE_ROOT="${PMD_LIVE_ROOT:-/var/www/paymydine}"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP="$LIVE_ROOT/storage/backups/clean-admin-i18n-$STAMP"
REPORT="$LIVE_ROOT/storage/logs/pmd-admin-i18n-deploy-$STAMP.log"

mkdir -p "$(dirname "$REPORT")"
exec > >(tee "$REPORT") 2>&1

LIVE_MAIN_LAYOUT="$LIVE_ROOT/app/admin/views/_layouts/default.blade.php"
LIVE_LEGACY_LAYOUT="$LIVE_ROOT/app/admin/views/layouts/default.blade.php"
LIVE_SIDE_NAV="$LIVE_ROOT/app/admin/views/_partials/side_nav.blade.php"
LIVE_ADMIN_ROUTES="$LIVE_ROOT/app/admin/routes.php"

SOURCE_PARTIAL="$SOURCE_ROOT/app/admin/views/_partials/pmd_admin_i18n.blade.php"
SOURCE_RUNTIME="$SOURCE_ROOT/app/admin/assets/js/pmd-admin-i18n-v1.js"
SOURCE_CUSTOM="$SOURCE_ROOT/app/admin/i18n/pmd_admin_de.php"
SOURCE_LOCALE_BOOTSTRAP="$SOURCE_ROOT/app/admin/i18n/pmd_admin_locale_bootstrap.php"
SOURCE_BUILDER="$SOURCE_ROOT/scripts/pmd-build-admin-i18n.php"

LIVE_PARTIAL="$LIVE_ROOT/app/admin/views/_partials/pmd_admin_i18n.blade.php"
LIVE_RUNTIME="$LIVE_ROOT/app/admin/assets/js/pmd-admin-i18n-v1.js"
LIVE_CUSTOM="$LIVE_ROOT/app/admin/i18n/pmd_admin_de.php"
LIVE_LOCALE_BOOTSTRAP="$LIVE_ROOT/app/admin/i18n/pmd_admin_locale_bootstrap.php"
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
    "$SOURCE_LOCALE_BOOTSTRAP" \
    "$SOURCE_BUILDER" \
    "$LIVE_ADMIN_ROUTES" \
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
php -l "$SOURCE_LOCALE_BOOTSTRAP"
php -l "$SOURCE_BUILDER"
bash -n "$SOURCE_ROOT/scripts/pmd-deploy-admin-i18n.sh"

echo
echo '===== 2. BACKUP ====='

mkdir -p "$BACKUP"

for file in \
    "$LIVE_MAIN_LAYOUT" \
    "$LIVE_LEGACY_LAYOUT" \
    "$LIVE_SIDE_NAV" \
    "$LIVE_ADMIN_ROUTES" \
    "$LIVE_PARTIAL" \
    "$LIVE_RUNTIME" \
    "$LIVE_CUSTOM" \
    "$LIVE_LOCALE_BOOTSTRAP" \
    "$LIVE_BUILDER" \
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
    "$(dirname "$LIVE_LOCALE_BOOTSTRAP")" \
    "$(dirname "$LIVE_BUILDER")"

cp -a "$SOURCE_PARTIAL" "$LIVE_PARTIAL"
cp -a "$SOURCE_RUNTIME" "$LIVE_RUNTIME"
cp -a "$SOURCE_CUSTOM" "$LIVE_CUSTOM"
cp -a "$SOURCE_LOCALE_BOOTSTRAP" "$LIVE_LOCALE_BOOTSTRAP"
cp -a "$SOURCE_BUILDER" "$LIVE_BUILDER"

sudo chown ubuntu:www-data \
    "$LIVE_PARTIAL" \
    "$LIVE_RUNTIME" \
    "$LIVE_CUSTOM" \
    "$LIVE_LOCALE_BOOTSTRAP" \
    "$LIVE_BUILDER"

chmod 664 \
    "$LIVE_PARTIAL" \
    "$LIVE_RUNTIME" \
    "$LIVE_CUSTOM" \
    "$LIVE_LOCALE_BOOTSTRAP" \
    "$LIVE_BUILDER"

echo 'Clean i18n source files installed.'

echo
echo '===== 4. INSTALL EARLY SERVER LOCALE BOOTSTRAP ====='

sudo chown ubuntu:www-data "$LIVE_ADMIN_ROUTES"
sudo chmod 664 "$LIVE_ADMIN_ROUTES"

python3 - "$LIVE_ADMIN_ROUTES" <<'PY'
from pathlib import Path
import re
import sys

path = Path(sys.argv[1])
content = path.read_text(encoding='utf-8')

# Remove the older route implementations. V4 is owned by the central bootstrap.
blocks = [
    ('// PMD_LANGUAGE_SWITCH_ROUTE_V2_BEGIN', '// PMD_LANGUAGE_SWITCH_ROUTE_V2_END'),
    ('// PMD_LANGUAGE_SWITCH_ROUTE_V3_BEGIN', '// PMD_LANGUAGE_SWITCH_ROUTE_V3_END'),
    ('// PMD_ADMIN_LOCALE_BOOTSTRAP_V1_BEGIN', '// PMD_ADMIN_LOCALE_BOOTSTRAP_V1_END'),
]

for start, end in blocks:
    while start in content:
        start_at = content.index(start)
        if end not in content[start_at:]:
            raise SystemExit(f'ERROR: Unclosed marker {start} in {path}')
        end_at = content.index(end, start_at) + len(end)
        content = content[:start_at] + content[end_at:]

marker = """// PMD_ADMIN_LOCALE_BOOTSTRAP_V1_BEGIN
require_once base_path('app/admin/i18n/pmd_admin_locale_bootstrap.php');
// PMD_ADMIN_LOCALE_BOOTSTRAP_V1_END"""

php_open = re.search(r'<\?php\b', content)
if not php_open:
    raise SystemExit(f'ERROR: PHP opening tag not found in {path}')

insert_at = php_open.end()
content = content[:insert_at] + '\n\n' + marker + '\n' + content[insert_at:]
content = re.sub(r'\n{8,}', '\n\n\n', content)
path.write_text(content, encoding='utf-8')
print(f'PATCHED EARLY LOCALE BOOTSTRAP: {path}')
PY

echo
echo '===== 5. PATCH BOTH ADMIN LAYOUTS ====='

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

content = content.replace(include_line, '')

head = re.search(r'<head\b[^>]*>', content, flags=re.IGNORECASE)
if not head:
    raise SystemExit(f'ERROR: <head> not found in {path}')

content = content[:head.end()] + '\n' + include_line + '\n' + content[head.end():]
content = re.sub(r'\n{7,}', '\n\n\n', content)
path.write_text(content, encoding='utf-8')
print(f'PATCHED: {path}')
PY
}

patch_layout "$LIVE_MAIN_LAYOUT"
patch_layout "$LIVE_LEGACY_LAYOUT"

echo
echo '===== 6. UPDATE SIDEBAR LANGUAGE ENDPOINT AND REMOVE LEGACY TRANSLATOR ====='

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

# The visual switcher remains unchanged; only its endpoint moves to central V4.
content = content.replace('/_pmd/language-switch-v3', '/_pmd/language-switch-v4')
content = content.replace("'_pmd/language-switch-v3'", "'_pmd/language-switch-v4'")

path.write_text(content, encoding='utf-8')
print(f'CLEANED AND UPDATED: {path}')
PY
fi

echo
echo '===== 7. BUILD FULL CORE + CUSTOM CATALOGUE ====='

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
echo '===== 8. VALIDATE GENERATED ASSETS AND SERVER BOOT ====='

php -l "$LIVE_CUSTOM"
php -l "$LIVE_LOCALE_BOOTSTRAP"
php -l "$LIVE_BUILDER"
php -l "$LIVE_ADMIN_ROUTES"

if command -v node >/dev/null 2>&1; then
    node --check "$LIVE_RUNTIME"
    node --check "$LIVE_CATALOGUE"
else
    echo 'Node is unavailable; JavaScript syntax validation skipped.'
fi

route_include_count="$(grep -Fc "require_once base_path('app/admin/i18n/pmd_admin_locale_bootstrap.php');" "$LIVE_ADMIN_ROUTES")"
echo "app/admin/routes.php: early locale include count=$route_include_count"

if [ "$route_include_count" -ne 1 ]; then
    echo 'ERROR: Expected exactly one early locale bootstrap include.'
    exit 1
fi

if grep -Eq 'PMD_LANGUAGE_SWITCH_ROUTE_V2_BEGIN|PMD_LANGUAGE_SWITCH_ROUTE_V3_BEGIN' "$LIVE_ADMIN_ROUTES"; then
    echo 'ERROR: Legacy language switch route remains in app/admin/routes.php.'
    exit 1
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

if [ -f "$LIVE_SIDE_NAV" ] && grep -q '/_pmd/language-switch-v3' "$LIVE_SIDE_NAV"; then
    echo 'ERROR: Sidebar still points to the old language-switch-v3 endpoint.'
    exit 1
fi

echo
echo '===== 9. CLEAR FRAMEWORK CACHES ====='

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
echo '===== 10. FINAL REPORT ====='

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
    'English and German are now resolved before controllers run.' \
    'The central catalogue covers both admin layouts, standard' \
    'TastyIgniter text, and dynamic PayMyDine DOM text.' \
    '======================================================'
