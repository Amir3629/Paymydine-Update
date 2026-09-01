#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
cd "$ROOT"

JS="app/admin/assets/js/pmd-shifts-canonical-b4d2e55c5e6d.js"
ROTA="app/admin/views/pmdshifts/_server_rota_v13.blade.php"
BACKUP="/tmp/pmd-shifts-date-locale-v7-backup-$(date +%Y%m%d-%H%M%S)"
TMPROOT="$(mktemp -d /tmp/pmd-shifts-date-locale-v7.XXXXXX)"
APPLY_STARTED=0

cleanup() {
    rc=$?
    trap - EXIT
    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK V7"
        set +e
        sudo cp -a "$BACKUP/$JS" "$JS"
        sudo cp -a "$BACKUP/$ROTA" "$ROTA"
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

test -f "$JS" || { echo "STOP: missing $JS"; exit 20; }
test -f "$ROTA" || { echo "STOP: missing $ROTA"; exit 21; }

grep -Fq "function formattedDate(key)" "$JS" || {
    echo "STOP: Shifts formattedDate() not found."
    exit 22
}

grep -Fq "{{ \$selectedDay->format('l, F j, Y') }}" "$ROTA" || \
grep -Fq "PMD_SHIFTS_DATE_LOCALE_SERVER_V7" "$ROTA" || {
    echo "STOP: Server rota date anchor is unexpected."
    exit 23
}

echo "PRE-FLIGHT PASSED"

echo ""
echo "========================================"
echo "2. PREPARE IN /tmp"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

mkdir -p "$TMPROOT/$(dirname "$JS")" "$TMPROOT/$(dirname "$ROTA")"
cp "$JS" "$TMPROOT/$JS"
cp "$ROTA" "$TMPROOT/$ROTA"

python3 - "$TMPROOT/$JS" "$TMPROOT/$ROTA" <<'PY'
from pathlib import Path
import re
import sys

js = Path(sys.argv[1])
rota = Path(sys.argv[2])

# ------------------------------------------------------------
# JS: use the stable admin locale authority that is set in <head>.
# Never use a late-changing DOM lang value for Shifts dates.
# ------------------------------------------------------------
s = js.read_text()
marker = 'PMD_SHIFTS_DATE_LOCALE_JS_V7'
if marker not in s:
    pattern = re.compile(
        r"  function formattedDate\(key\) \{\n"
        r"    var date = parseDateKey\(key\);\n"
        r"    if \(!date\) return key;\n"
        r"    try \{\n"
        r"      return new Intl\.DateTimeFormat\(document\.documentElement\.lang \|\| 'en-GB', \{\n"
        r"        weekday: 'long',\n"
        r"        day: 'numeric',\n"
        r"        month: 'long',\n"
        r"        year: 'numeric'\n"
        r"      \}\)\.format\(date\);\n"
        r"    \} catch \(error\) \{\n"
        r"      return key;\n"
        r"    \}\n"
        r"  \}"
    )
    replacement = """  // PMD_SHIFTS_DATE_LOCALE_JS_V7\n  function shiftsDateLocale() {\n    var locale = String(window.PMD_ADMIN_LOCALE || 'en').trim().toLowerCase();\n    if (locale === 'de') return 'de-DE';\n    if (locale === 'tr') return 'tr-TR';\n    return 'en-US';\n  }\n\n  function formattedDate(key) {\n    var date = parseDateKey(key);\n    if (!date) return key;\n    try {\n      return new Intl.DateTimeFormat(shiftsDateLocale(), {\n        weekday: 'long',\n        day: 'numeric',\n        month: 'long',\n        year: 'numeric'\n      }).format(date);\n    } catch (error) {\n      return key;\n    }\n  }"""
    s, count = pattern.subn(replacement, s, count=1)
    if count != 1:
        raise SystemExit('STOP: exact formattedDate() body was not found once')

    old = "'<div><h2>' + escapeHtml(formattedDate(key)) + '</h2></div>'"
    new = "'<div><h2 data-pmd-no-translate lang=\"' + escapeHtml(String(window.PMD_ADMIN_LOCALE || 'en')) + '\">' + escapeHtml(formattedDate(key)) + '</h2></div>'"
    if old not in s:
        raise SystemExit('STOP: dynamic Shifts date markup anchor missing')
    s = s.replace(old, new, 1)

js.write_text(s)
print('Shifts JS locale authority: patched')

# ------------------------------------------------------------
# Server first paint: render the selected date in the SAME stable locale
# before any global i18n runtime runs, and opt the already-localized label
# out of generic text translation.
# ------------------------------------------------------------
s = rota.read_text()
marker = 'PMD_SHIFTS_DATE_LOCALE_SERVER_V7'
if marker not in s:
    anchor = "    $pmdServerDate = $selectedDay->toDateString();\n"
    if s.count(anchor) != 1:
        raise SystemExit('STOP: pmdServerDate anchor expected exactly once')

    block = """    $pmdServerDate = $selectedDay->toDateString();\n\n    // PMD_SHIFTS_DATE_LOCALE_SERVER_V7\n    // Use the same cookie authority as the global Admin i18n boot layer so\n    // first paint and later JS navigation can never disagree on language.\n    $pmdServerLocale = strtolower(trim((string)request()->cookie(\n        'pmd_admin_locale',\n        app()->getLocale()\n    )));\n    if (!in_array($pmdServerLocale, ['en', 'de', 'tr'], true)) {\n        $pmdServerLocale = 'en';\n    }\n\n    $pmdServerDateForLabel = clone $selectedDay;\n    $pmdServerDateForLabel->locale($pmdServerLocale);\n\n    if ($pmdServerLocale === 'de') {\n        $pmdServerDateLabel = $pmdServerDateForLabel->translatedFormat('l, j. F Y');\n    } elseif ($pmdServerLocale === 'tr') {\n        $pmdServerDateLabel = $pmdServerDateForLabel->translatedFormat('j F Y l');\n    } else {\n        $pmdServerDateLabel = $pmdServerDateForLabel->translatedFormat('l, F j, Y');\n    }\n"""
    s = s.replace(anchor, block, 1)

    old = """                <h2>\n                    {{ $selectedDay->format('l, F j, Y') }}\n                </h2>"""
    new = """                <h2\n                    data-pmd-no-translate\n                    lang=\"{{ $pmdServerLocale }}\"\n                >\n                    {{ $pmdServerDateLabel }}\n                </h2>"""
    if old not in s:
        raise SystemExit('STOP: server date h2 anchor missing')
    s = s.replace(old, new, 1)

rota.write_text(s)
print('Server first-paint date locale: patched')
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMPROOT/$ROTA"
grep -Fq "PMD_SHIFTS_DATE_LOCALE_JS_V7" "$TMPROOT/$JS"
grep -Fq "window.PMD_ADMIN_LOCALE" "$TMPROOT/$JS"
grep -Fq "PMD_SHIFTS_DATE_LOCALE_SERVER_V7" "$TMPROOT/$ROTA"
grep -Fq "data-pmd-no-translate" "$TMPROOT/$ROTA"

if command -v node >/dev/null 2>&1; then
    TMPJS="$(mktemp /tmp/pmd-shifts-date-locale.XXXXXX.js)"
    cp "$TMPROOT/$JS" "$TMPJS"
    node --check "$TMPJS"
    rm -f "$TMPJS"
fi

echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY 2 FILES"
echo "========================================"

mkdir -p "$BACKUP/$(dirname "$JS")" "$BACKUP/$(dirname "$ROTA")"
sudo cp -a "$JS" "$BACKUP/$JS"
sudo cp -a "$ROTA" "$BACKUP/$ROTA"
echo "Backup: $BACKUP"

echo ""
echo "========================================"
echo "5. APPLY ONLY 2 FILES"
echo "========================================"

APPLY_STARTED=1
sudo tee "$JS" >/dev/null < "$TMPROOT/$JS"
sudo tee "$ROTA" >/dev/null < "$TMPROOT/$ROTA"

echo ""
echo "========================================"
echo "6. VERIFY LIVE"
echo "========================================"

php -l "$ROTA"
grep -nF "PMD_SHIFTS_DATE_LOCALE_JS_V7" "$JS"
grep -nF "PMD_SHIFTS_DATE_LOCALE_SERVER_V7" "$ROTA"
grep -nF "data-pmd-no-translate" "$ROTA" | head -3

if command -v node >/dev/null 2>&1; then
    node --check "$JS"
fi

echo "LIVE FILE CHECKS PASSED"

echo ""
echo "========================================"
echo "7. CLEAR CACHE"
echo "========================================"
sudo -u www-data php artisan optimize:clear || true

APPLY_STARTED=0

echo ""
echo "========================================"
echo "SUCCESS - SHIFTS DATE LANGUAGE BLINK V7 FIXED"
echo "========================================"
echo "Fixes:"
echo "  - server first paint uses pmd_admin_locale"
echo "  - Shifts JS uses window.PMD_ADMIN_LOCALE"
echo "  - date label is excluded from generic i18n mutation"
echo "  - DE stays DE; EN stays EN; TR stays TR after refresh"
echo "  - no Shifts layout/actions were changed"
echo "Backup: $BACKUP"
