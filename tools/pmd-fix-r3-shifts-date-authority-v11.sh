#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
cd "$ROOT"

ASSET="app/admin/assets/js/pmd-admin-coverage-r3.js"
LOADER="app/admin/views/_partials/pmd_admin_i18n.blade.php"
SOURCE="scripts/pmd-r3-clean-runtime.js"

BACKUP="/tmp/pmd-r3-shifts-date-authority-v11-backup-$(date +%Y%m%d-%H%M%S)"
TMPROOT="$(mktemp -d /tmp/pmd-r3-shifts-date-authority-v11.XXXXXX)"
APPLY_STARTED=0

cleanup() {
    rc=$?
    trap - EXIT

    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK V11"
        set +e
        sudo cp -a "$BACKUP/$ASSET" "$ASSET"
        sudo cp -a "$BACKUP/$LOADER" "$LOADER"
        sudo cp -a "$BACKUP/$SOURCE" "$SOURCE"
        echo "ROLLBACK COMPLETE"
        echo "Backup kept at: $BACKUP"
    fi

    rm -rf "$TMPROOT"
    exit "$rc"
}
trap cleanup EXIT

echo "========================================"
echo "1. PRE-FLIGHT"
echo "========================================"

for f in "$ASSET" "$LOADER" "$SOURCE"; do
    test -f "$f" || { echo "STOP: missing $f"; exit 20; }
done

grep -Fq "PMD_ADMIN_COVERAGE_R3_CLEAN" "$ASSET" || {
    echo "STOP: deployed R3 runtime marker missing."
    exit 21
}

grep -Fq "PMD_ADMIN_COVERAGE_R3_CLEAN" "$SOURCE" || {
    echo "STOP: source R3 runtime marker missing."
    exit 22
}

grep -Fq "pmd-admin-coverage-r3.js" "$LOADER" || {
    echo "STOP: R3 loader reference missing."
    exit 23
}

for f in "$ASSET" "$SOURCE"; do
    grep -Fq "var heading = document.querySelector('.pmd-shifts-final-date h2');" "$f" || {
        echo "STOP: Shifts date writer anchor missing in $f"
        exit 24
    }
done

echo "PRE-FLIGHT PASSED"

echo ""
echo "========================================"
echo "2. PREPARE IN /tmp"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

for f in "$ASSET" "$LOADER" "$SOURCE"; do
    mkdir -p "$TMPROOT/$(dirname "$f")"
    cp "$f" "$TMPROOT/$f"
done

python3 - "$TMPROOT/$ASSET" "$TMPROOT/$SOURCE" "$TMPROOT/$LOADER" <<'PY'
from pathlib import Path
import re
import sys

asset = Path(sys.argv[1])
source = Path(sys.argv[2])
loader = Path(sys.argv[3])

MARKER = 'PMD_SHIFTS_DATE_AUTHORITY_GUARD_V11'


def patch_runtime(path: Path):
    s = path.read_text()

    start = s.find('    function patchShifts() {')
    end = s.find('\n    function patchReports() {', start)
    if start < 0 or end < 0:
        raise SystemExit(f'STOP: patchShifts boundaries missing in {path}')

    segment = s[start:end]

    if MARKER not in segment:
        heading = "        var heading = document.querySelector('.pmd-shifts-final-date h2');"
        heading_pos = segment.find(heading)
        if heading_pos < 0:
            raise SystemExit(f'STOP: heading anchor missing in {path}')

        condition = '        if (dated && heading) {'
        condition_pos = segment.find(condition, heading_pos)
        if condition_pos < 0 or condition_pos > heading_pos + 500:
            raise SystemExit(f'STOP: date writer condition missing near heading in {path}')

        guarded = (
            '        // PMD_SHIFTS_DATE_AUTHORITY_GUARD_V11\n'
            '        // Modern Shifts owns its selected-date label. The legacy R3\n'
            '        // coverage runtime must not rewrite it after first paint.\n'
            '        if (dated && heading\n'
            "            && !heading.hasAttribute('data-pmd-shifts-date-label')\n"
            "            && !dated.hasAttribute('data-pmd-date-locale-authority')) {"
        )
        segment = segment[:condition_pos] + guarded + segment[condition_pos + len(condition):]

    # R3 historically treated every non-Turkish locale as German. Correct that
    # for the legacy KPI/month translations that R3 still legitimately owns.
    old_locale = "locale === 'tr' ? 'tr-TR' : 'de-DE'"
    new_locale = "locale === 'tr' ? 'tr-TR' : (locale === 'de' ? 'de-DE' : 'en-US')"
    count = segment.count(old_locale)
    if count:
        segment = segment.replace(old_locale, new_locale)
    elif new_locale not in segment:
        raise SystemExit(f'STOP: expected R3 locale expression missing in {path}')

    s = s[:start] + segment + s[end:]
    path.write_text(s)
    print(f'{path.name}: Shifts date ownership guarded; R3 locale fallback corrected')


patch_runtime(asset)
patch_runtime(source)

s = loader.read_text()
new_url = 'pmd-admin-coverage-r3.js?v=20260901-shifts-date-v11'
if new_url not in s:
    pattern = re.compile(r'pmd-admin-coverage-r3\.js\?v=[^"\']+')
    matches = pattern.findall(s)
    if len(matches) != 1:
        raise SystemExit(
            f'STOP: expected exactly one R3 loader URL, found {len(matches)}'
        )
    s = pattern.sub(new_url, s, count=1)
loader.write_text(s)
print('R3 loader: cache-busted to V11')
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

for f in "$TMPROOT/$ASSET" "$TMPROOT/$SOURCE"; do
    grep -Fq "PMD_SHIFTS_DATE_AUTHORITY_GUARD_V11" "$f"
    grep -Fq "!heading.hasAttribute('data-pmd-shifts-date-label')" "$f"
    grep -Fq "!dated.hasAttribute('data-pmd-date-locale-authority')" "$f"
    grep -Fq "locale === 'de' ? 'de-DE' : 'en-US'" "$f"
    if command -v node >/dev/null 2>&1; then
        TMPJS="$(mktemp /tmp/pmd-r3-v11.XXXXXX.js)"
        cp "$f" "$TMPJS"
        node --check "$TMPJS"
        rm -f "$TMPJS"
    fi
done

grep -Fq "pmd-admin-coverage-r3.js?v=20260901-shifts-date-v11" "$TMPROOT/$LOADER"
php -l "$TMPROOT/$LOADER"

echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY 3 TARGET FILES"
echo "========================================"

for f in "$ASSET" "$LOADER" "$SOURCE"; do
    mkdir -p "$BACKUP/$(dirname "$f")"
    sudo cp -a "$f" "$BACKUP/$f"
done

echo "Backup: $BACKUP"

echo ""
echo "========================================"
echo "5. APPLY ONLY 3 TARGET FILES"
echo "========================================"

APPLY_STARTED=1
sudo tee "$ASSET" >/dev/null < "$TMPROOT/$ASSET"
sudo tee "$LOADER" >/dev/null < "$TMPROOT/$LOADER"
sudo tee "$SOURCE" >/dev/null < "$TMPROOT/$SOURCE"

echo ""
echo "========================================"
echo "6. VERIFY LIVE"
echo "========================================"

for f in "$ASSET" "$SOURCE"; do
    grep -nF "PMD_SHIFTS_DATE_AUTHORITY_GUARD_V11" "$f"
    grep -Fq "locale === 'de' ? 'de-DE' : 'en-US'" "$f"
    if command -v node >/dev/null 2>&1; then
        node --check "$f"
    fi
done

grep -nF "pmd-admin-coverage-r3.js?v=20260901-shifts-date-v11" "$LOADER"
php -l "$LOADER"

echo "LIVE FILE CHECKS PASSED"

echo ""
echo "========================================"
echo "7. CLEAR VIEW CACHE"
echo "========================================"
sudo -u www-data php artisan view:clear || true

APPLY_STARTED=0

echo ""
echo "========================================"
echo "SUCCESS - R3 SHIFTS DATE AUTHORITY V11 FIXED"
echo "========================================"
echo "Fixes:"
echo "  - legacy R3 runtime no longer overwrites modern Shifts date labels"
echo "  - English no longer falls through to German in R3 locale formatting"
echo "  - R3 month/KPI locale fallback is corrected too"
echo "  - loader query string changed so Safari fetches the patched runtime"
echo "  - existing V8B/V9/V10 Shifts ownership remains intact"
echo "  - no schedule data, OTP, Portal MFA, Member actions, or header controls changed"
echo "Backup: $BACKUP"
