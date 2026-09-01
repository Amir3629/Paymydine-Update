#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
cd "$ROOT"

JS="app/admin/assets/js/pmd-shifts-canonical-locale-v8b.js"
ROTA="app/admin/views/pmdshifts/_server_rota_v13.blade.php"
BACKUP="/tmp/pmd-shifts-date-visible-lock-v9-backup-$(date +%Y%m%d-%H%M%S)"
TMPROOT="$(mktemp -d /tmp/pmd-shifts-date-visible-lock-v9.XXXXXX)"
APPLY_STARTED=0

cleanup() {
    rc=$?
    trap - EXIT
    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK V9"
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

test -f "$JS" || { echo "STOP: V8B JS missing: $JS"; exit 20; }
test -f "$ROTA" || { echo "STOP: server rota missing: $ROTA"; exit 21; }

grep -Fq "PMD_SHIFTS_DATE_LOCALE_PIN_JS_V8B" "$JS" || {
    echo "STOP: V8B JS marker missing."
    exit 22
}

grep -Fq "PMD_SHIFTS_DATE_LOCALE_PIN_SERVER_V8B" "$ROTA" || {
    echo "STOP: V8B server marker missing."
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
# Server first paint: remove the mutable visible text node completely.
# The user-visible date is rendered from data-pmd-fixed-date via ::after.
# Translation runtimes can mutate hidden/internal text all they want; there is
# no visible text node left to flash between languages.
# ------------------------------------------------------------
s = rota.read_text()

if 'PMD_SHIFTS_DATE_VISIBLE_LOCK_SERVER_V9' not in s:
    date_block_pos = s.find('class="pmd-shifts-final-date"')
    if date_block_pos < 0:
        raise SystemExit('STOP: pmd-shifts-final-date block missing')

    h2_start = s.find('<h2', date_block_pos)
    h2_open_end = s.find('>', h2_start)
    h2_close = s.find('</h2>', h2_open_end)
    if min(h2_start, h2_open_end, h2_close) < 0:
        raise SystemExit('STOP: server date H2 boundaries missing')

    h2_open = s[h2_start:h2_open_end + 1]
    h2_inner = s[h2_open_end + 1:h2_close]

    if '$pmdServerDateLabel' not in h2_inner:
        raise SystemExit('STOP: expected server date label text missing')

    required = [
        'data-pmd-no-translate',
        'data-pmd-i18n-skip',
        'data-pmd-shifts-date-label',
    ]
    for attr in required:
        if attr not in h2_open:
            raise SystemExit(f'STOP: V8B date H2 missing {attr}')

    # Add immutable display payload and accessible label.
    if 'data-pmd-fixed-date=' not in h2_open:
        h2_open = h2_open[:-1] + (
            '\n                    data-pmd-fixed-date="{{ $pmdServerDateLabel }}"'
            '\n                    aria-label="{{ $pmdServerDateLabel }}"'
            '\n                >'
        )

    # Empty visible text node. CSS pseudo-element owns the rendered label.
    s = s[:h2_start] + h2_open + '</h2>' + s[h2_close + len('</h2>'):]

    # Scoped style is intentionally kept in this server-first partial so it
    # cannot be stale-cached separately from the markup it protects.
    style = '''\n<style id="pmd-shifts-date-visible-lock-v9">\n  /* PMD_SHIFTS_DATE_VISIBLE_LOCK_SERVER_V9 */\n  body.pmd-shifts-page [data-pmd-shifts-date-label]::after {\n    content: attr(data-pmd-fixed-date);\n  }\n</style>\n'''

    root_pos = s.find('data-pmd-shifts-server-initial')
    root_start = s.rfind('<div', 0, root_pos)
    if root_pos < 0 or root_start < 0:
        raise SystemExit('STOP: server-first root not found for scoped style')
    s = s[:root_start] + style + s[root_start:]

rota.write_text(s)
print('Server visible date: locked to immutable data attribute')

# ------------------------------------------------------------
# Dynamic date navigation: new H2s must use the same immutable visual model.
# ------------------------------------------------------------
s = js.read_text()

if 'PMD_SHIFTS_DATE_VISIBLE_LOCK_JS_V9' not in s:
    marker = '  // PMD_SHIFTS_DATE_LOCALE_PIN_JS_V8B\n'
    if marker not in s:
        raise SystemExit('STOP: V8B JS locale marker missing')
    s = s.replace(
        marker,
        marker + '  // PMD_SHIFTS_DATE_VISIBLE_LOCK_JS_V9\n',
        1,
    )

    old = (
        "'<div><h2 data-pmd-no-translate data-pmd-i18n-skip "
        "data-pmd-shifts-date-label lang=\"' + "
        "escapeHtml(shiftsDateLocaleCode) + "
        "'\">' + escapeHtml(formattedDate(key)) + '</h2></div>'"
    )

    new = (
        "'<div><h2 data-pmd-no-translate data-pmd-i18n-skip "
        "data-pmd-shifts-date-label data-pmd-fixed-date=\"' + "
        "escapeHtml(formattedDate(key)) + "
        "'\" aria-label=\"' + escapeHtml(formattedDate(key)) + "
        "'\" lang=\"' + escapeHtml(shiftsDateLocaleCode) + "
        "'\"></h2></div>'"
    )

    if old not in s:
        raise SystemExit('STOP: exact V8B dynamic date markup missing')
    s = s.replace(old, new, 1)

js.write_text(s)
print('Dynamic visible date: locked to immutable data attribute')
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMPROOT/$ROTA"
grep -Fq "PMD_SHIFTS_DATE_VISIBLE_LOCK_SERVER_V9" "$TMPROOT/$ROTA"
grep -Fq 'data-pmd-fixed-date="{{ $pmdServerDateLabel }}"' "$TMPROOT/$ROTA"
grep -Fq 'content: attr(data-pmd-fixed-date)' "$TMPROOT/$ROTA"
grep -Fq "PMD_SHIFTS_DATE_VISIBLE_LOCK_JS_V9" "$TMPROOT/$JS"
grep -Fq "data-pmd-fixed-date" "$TMPROOT/$JS"

if command -v node >/dev/null 2>&1; then
    TMPJS="$(mktemp /tmp/pmd-shifts-date-v9.XXXXXX.js)"
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
grep -nF "PMD_SHIFTS_DATE_VISIBLE_LOCK_SERVER_V9" "$ROTA"
grep -nF 'data-pmd-fixed-date="{{ $pmdServerDateLabel }}"' "$ROTA"
grep -nF "PMD_SHIFTS_DATE_VISIBLE_LOCK_JS_V9" "$JS"

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
echo "SUCCESS - SHIFTS DATE VISIBLE LANGUAGE V9 LOCKED"
echo "========================================"
echo "Fixes:"
echo "  - visible date is no longer a mutable text node"
echo "  - visible date comes from immutable data-pmd-fixed-date via CSS ::after"
echo "  - generic/legacy translators cannot visibly flip German/English anymore"
echo "  - next/previous date navigation uses the same locked rendering"
echo "  - no schedule data, OTP, Portal MFA, Member actions, or header controls changed"
echo "Backup: $BACKUP"
