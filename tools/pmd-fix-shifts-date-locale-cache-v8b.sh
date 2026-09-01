#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
cd "$ROOT"

CONTROLLER="app/admin/controllers/Shifts.php"
OLD_JS="app/admin/assets/js/pmd-shifts-canonical-b4d2e55c5e6d.js"
NEW_JS="app/admin/assets/js/pmd-shifts-canonical-locale-v8b.js"
ROTA="app/admin/views/pmdshifts/_server_rota_v13.blade.php"

BACKUP="/tmp/pmd-shifts-date-locale-v8b-backup-$(date +%Y%m%d-%H%M%S)"
TMPROOT="$(mktemp -d /tmp/pmd-shifts-date-locale-v8b.XXXXXX)"
APPLY_STARTED=0
NEW_JS_EXISTED=0

cleanup() {
    rc=$?
    trap - EXIT

    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK V8B"
        set +e
        sudo cp -a "$BACKUP/$CONTROLLER" "$CONTROLLER"
        sudo cp -a "$BACKUP/$ROTA" "$ROTA"
        if [ "$NEW_JS_EXISTED" -eq 1 ]; then
            sudo cp -a "$BACKUP/$NEW_JS" "$NEW_JS"
        else
            sudo rm -f "$NEW_JS"
        fi
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

test -f "$CONTROLLER" || { echo "STOP: missing $CONTROLLER"; exit 20; }
test -f "$OLD_JS" || { echo "STOP: missing $OLD_JS"; exit 21; }
test -f "$ROTA" || { echo "STOP: missing $ROTA"; exit 22; }

grep -Fq "PMD_SHIFTS_DATE_LOCALE_JS_V7" "$OLD_JS" || {
    echo "STOP: V7 JS marker missing from production."
    exit 23
}

grep -Fq "PMD_SHIFTS_DATE_LOCALE_SERVER_V7" "$ROTA" || {
    echo "STOP: V7 server marker missing from production."
    exit 24
}

grep -Fq "data-pmd-shifts-server-initial" "$ROTA" || {
    echo "STOP: server-first Shifts root missing."
    exit 25
}

OLD_LINE="        \$this->addJs('js/pmd-shifts-canonical-b4d2e55c5e6d.js');"
NEW_LINE="        \$this->addJs('js/pmd-shifts-canonical-locale-v8b.js');"

if ! grep -Fq "$OLD_LINE" "$CONTROLLER" && ! grep -Fq "$NEW_LINE" "$CONTROLLER"; then
    echo "STOP: active Shifts JS registration is unexpected."
    exit 26
fi

echo "PRE-FLIGHT PASSED"

echo ""
echo "========================================"
echo "2. PREPARE IN /tmp"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

mkdir -p \
    "$TMPROOT/$(dirname "$CONTROLLER")" \
    "$TMPROOT/$(dirname "$ROTA")" \
    "$TMPROOT/$(dirname "$NEW_JS")"

cp "$CONTROLLER" "$TMPROOT/$CONTROLLER"
cp "$ROTA" "$TMPROOT/$ROTA"
cp "$OLD_JS" "$TMPROOT/$NEW_JS"

python3 - "$TMPROOT/$CONTROLLER" "$TMPROOT/$ROTA" "$TMPROOT/$NEW_JS" <<'PY'
from pathlib import Path
import sys

controller = Path(sys.argv[1])
rota = Path(sys.argv[2])
js = Path(sys.argv[3])

# ------------------------------------------------------------
# Controller: new asset filename defeats stale Safari/CDN copies.
# ------------------------------------------------------------
s = controller.read_text()
old = "        $this->addJs('js/pmd-shifts-canonical-b4d2e55c5e6d.js');"
new = "        $this->addJs('js/pmd-shifts-canonical-locale-v8b.js');"
if new not in s:
    if s.count(old) != 1:
        raise SystemExit(
            f'STOP: old Shifts JS registration expected once, found {s.count(old)}'
        )
    s = s.replace(old, new, 1)
controller.write_text(s)
print('Shifts controller: V8B uncached JS registered')

# ------------------------------------------------------------
# Server-first rota: target ONLY the opening tag that owns
# data-pmd-shifts-server-initial. Other data-date attributes are unrelated.
# ------------------------------------------------------------
s = rota.read_text()

root_marker = 'data-pmd-shifts-server-initial'
marker_pos = s.find(root_marker)
if marker_pos < 0:
    raise SystemExit('STOP: server-first root marker missing')

tag_start = s.rfind('<div', 0, marker_pos)
tag_end = s.find('>', marker_pos)
if tag_start < 0 or tag_end < 0:
    raise SystemExit('STOP: could not isolate server-first root opening tag')

opening = s[tag_start:tag_end + 1]
if 'data-pmd-date-locale-authority="v8b"' not in opening:
    date_attr = 'data-date="{{ $pmdServerDate }}"'
    if opening.count(date_attr) != 1:
        raise SystemExit(
            'STOP: server-first root must contain exactly one selected-day data-date'
        )
    opening_new = opening.replace(
        date_attr,
        date_attr
        + '\n    data-pmd-locale="{{ $pmdServerLocale }}"'
        + '\n    data-pmd-date-locale-authority="v8b"',
        1,
    )
    s = s[:tag_start] + opening_new + s[tag_end + 1:]

# Find the date H2 structurally inside pmd-shifts-final-date and make it
# invisible to BOTH translation runtimes.
date_block = 'class="pmd-shifts-final-date"'
date_pos = s.find(date_block)
if date_pos < 0:
    raise SystemExit('STOP: Shifts date block missing')

h2_start = s.find('<h2', date_pos)
h2_end = s.find('>', h2_start)
h2_close = s.find('</h2>', h2_end)
if h2_start < 0 or h2_end < 0 or h2_close < 0:
    raise SystemExit('STOP: Shifts date heading could not be isolated')

heading_segment = s[h2_start:h2_close + len('</h2>')]
if '$pmdServerDateLabel' not in heading_segment:
    raise SystemExit('STOP: expected V7 server date label not found in date heading')

h2_open = s[h2_start:h2_end + 1]
attrs = [
    'data-pmd-no-translate',
    'data-pmd-i18n-skip',
    'data-pmd-shifts-date-label',
]
for attr in attrs:
    if attr not in h2_open:
        h2_open = h2_open[:-1] + f'\n                    {attr}\n                >'

s = s[:h2_start] + h2_open + s[h2_end + 1:]

if 'PMD_SHIFTS_DATE_LOCALE_PIN_SERVER_V8B' not in s:
    marker = '    // PMD_SHIFTS_DATE_LOCALE_SERVER_V7\n'
    if marker not in s:
        raise SystemExit('STOP: V7 server locale marker missing')
    s = s.replace(
        marker,
        marker + '    // PMD_SHIFTS_DATE_LOCALE_PIN_SERVER_V8B\n',
        1,
    )

rota.write_text(s)
print('Server date locale: V8B root pinned and translator-isolated')

# ------------------------------------------------------------
# New JS: capture locale from server-first root exactly once.
# Do not depend on html lang or a late global initializer.
# ------------------------------------------------------------
s = js.read_text()

if 'PMD_SHIFTS_DATE_LOCALE_PIN_JS_V8B' not in s:
    marker = '  // PMD_SHIFTS_DATE_LOCALE_JS_V7\n'
    start = s.find(marker)
    end_marker = '\n\n  function formattedDate(key) {'
    end = s.find(end_marker, start)
    if start < 0 or end < 0:
        raise SystemExit('STOP: V7 shiftsDateLocale block boundaries missing')

    replacement = """  // PMD_SHIFTS_DATE_LOCALE_JS_V7
  // PMD_SHIFTS_DATE_LOCALE_PIN_JS_V8B
  var shiftsDateLocaleCode = (function () {
    var initial = root.querySelector('[data-pmd-shifts-server-initial]');
    var locale = String(
      (initial && initial.getAttribute('data-pmd-locale')) ||
      'en'
    ).trim().toLowerCase();

    if (locale !== 'de' && locale !== 'tr') locale = 'en';
    return locale;
  }());

  function shiftsDateLocale() {
    if (shiftsDateLocaleCode === 'de') return 'de-DE';
    if (shiftsDateLocaleCode === 'tr') return 'tr-TR';
    return 'en-US';
  }"""

    s = s[:start] + replacement + s[end:]

    old_markup = (
        "'<div><h2 data-pmd-no-translate lang=\"' + "
        "escapeHtml(String(window.PMD_ADMIN_LOCALE || 'en')) + "
        "'\">' + escapeHtml(formattedDate(key)) + '</h2></div>'"
    )
    new_markup = (
        "'<div><h2 data-pmd-no-translate data-pmd-i18n-skip "
        "data-pmd-shifts-date-label lang=\"' + "
        "escapeHtml(shiftsDateLocaleCode) + "
        "'\">' + escapeHtml(formattedDate(key)) + '</h2></div>'"
    )

    if old_markup not in s:
        raise SystemExit('STOP: V7 dynamic date markup missing')
    s = s.replace(old_markup, new_markup, 1)

js.write_text(s)
print('V8B JS: locale pinned to server HTML')
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMPROOT/$CONTROLLER"
php -l "$TMPROOT/$ROTA"

grep -Fq "pmd-shifts-canonical-locale-v8b.js" "$TMPROOT/$CONTROLLER"
grep -Fq "PMD_SHIFTS_DATE_LOCALE_PIN_SERVER_V8B" "$TMPROOT/$ROTA"
grep -Fq 'data-pmd-date-locale-authority="v8b"' "$TMPROOT/$ROTA"
grep -Fq 'data-pmd-locale="{{ $pmdServerLocale }}"' "$TMPROOT/$ROTA"
grep -Fq "data-pmd-i18n-skip" "$TMPROOT/$ROTA"
grep -Fq "PMD_SHIFTS_DATE_LOCALE_PIN_JS_V8B" "$TMPROOT/$NEW_JS"
grep -Fq "shiftsDateLocaleCode" "$TMPROOT/$NEW_JS"

if command -v node >/dev/null 2>&1; then
    TMPJS="$(mktemp /tmp/pmd-shifts-locale-v8b.XXXXXX.js)"
    cp "$TMPROOT/$NEW_JS" "$TMPJS"
    node --check "$TMPJS"
    rm -f "$TMPJS"
fi

echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY 3 TARGETS"
echo "========================================"

mkdir -p "$BACKUP/$(dirname "$CONTROLLER")"
sudo cp -a "$CONTROLLER" "$BACKUP/$CONTROLLER"

mkdir -p "$BACKUP/$(dirname "$ROTA")"
sudo cp -a "$ROTA" "$BACKUP/$ROTA"

if [ -e "$NEW_JS" ]; then
    NEW_JS_EXISTED=1
    mkdir -p "$BACKUP/$(dirname "$NEW_JS")"
    sudo cp -a "$NEW_JS" "$BACKUP/$NEW_JS"
fi

echo "Backup: $BACKUP"

echo ""
echo "========================================"
echo "5. APPLY ONLY 3 TARGETS"
echo "========================================"

APPLY_STARTED=1
sudo tee "$CONTROLLER" >/dev/null < "$TMPROOT/$CONTROLLER"
sudo tee "$ROTA" >/dev/null < "$TMPROOT/$ROTA"
sudo tee "$NEW_JS" >/dev/null < "$TMPROOT/$NEW_JS"

sudo chown --reference="$OLD_JS" "$NEW_JS"
sudo chmod --reference="$OLD_JS" "$NEW_JS"

echo ""
echo "========================================"
echo "6. VERIFY LIVE"
echo "========================================"

php -l "$CONTROLLER"
php -l "$ROTA"

grep -nF "pmd-shifts-canonical-locale-v8b.js" "$CONTROLLER"
grep -nF "PMD_SHIFTS_DATE_LOCALE_PIN_SERVER_V8B" "$ROTA"
grep -nF 'data-pmd-date-locale-authority="v8b"' "$ROTA"
grep -nF "data-pmd-i18n-skip" "$ROTA" | head -3
grep -nF "PMD_SHIFTS_DATE_LOCALE_PIN_JS_V8B" "$NEW_JS"

if command -v node >/dev/null 2>&1; then
    node --check "$NEW_JS"
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
echo "SUCCESS - SHIFTS DATE LOCALE V8B PINNED"
echo "========================================"
echo "Fixes:"
echo "  - targets only the real server-first Shifts root"
echo "  - ignores unrelated duplicate data-date attributes"
echo "  - loads a brand-new JS filename to bypass stale Safari/CDN cache"
echo "  - locale is embedded in server HTML and captured once"
echo "  - date label is skipped by both known Admin translation runtimes"
echo "  - no OTP, Portal MFA, Member actions, schedule data, or layout logic changed"
echo "Backup: $BACKUP"
