#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
cd "$ROOT"

CONTROLLER="app/admin/controllers/Shifts.php"
OLD_JS="app/admin/assets/js/pmd-shifts-canonical-b4d2e55c5e6d.js"
NEW_JS="app/admin/assets/js/pmd-shifts-canonical-locale-v8.js"
ROTA="app/admin/views/pmdshifts/_server_rota_v13.blade.php"

BACKUP="/tmp/pmd-shifts-date-locale-v8-backup-$(date +%Y%m%d-%H%M%S)"
TMPROOT="$(mktemp -d /tmp/pmd-shifts-date-locale-v8.XXXXXX)"
APPLY_STARTED=0
NEW_JS_EXISTED=0

cleanup() {
    rc=$?
    trap - EXIT

    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK V8"
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
    echo "STOP: V7 server date marker missing from production."
    exit 24
}

OLD_LINE="        \$this->addJs('js/pmd-shifts-canonical-b4d2e55c5e6d.js');"
NEW_LINE="        \$this->addJs('js/pmd-shifts-canonical-locale-v8.js');"

if ! grep -Fq "$OLD_LINE" "$CONTROLLER" && ! grep -Fq "$NEW_LINE" "$CONTROLLER"; then
    echo "STOP: active Shifts JS registration is unexpected."
    exit 25
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
# 1) Controller: use a NEW asset filename so Safari/CDN cannot execute
#    the pre-V7 cached fingerprinted JS.
# ------------------------------------------------------------
s = controller.read_text()
old = "        $this->addJs('js/pmd-shifts-canonical-b4d2e55c5e6d.js');"
new = "        $this->addJs('js/pmd-shifts-canonical-locale-v8.js');"
if new not in s:
    if s.count(old) != 1:
        raise SystemExit(
            f'STOP: old Shifts JS registration expected once, found {s.count(old)}'
        )
    s = s.replace(old, new, 1)
controller.write_text(s)
print('Shifts controller: new uncached V8 JS registered')

# ------------------------------------------------------------
# 2) Server HTML: pin the exact locale onto the server-first rota and
#    exclude the already-localized date from BOTH known i18n runtimes.
# ------------------------------------------------------------
s = rota.read_text()

if 'PMD_SHIFTS_DATE_LOCALE_PIN_SERVER_V8' not in s:
    date_attr = '    data-date="{{ $pmdServerDate }}"\n'
    if s.count(date_attr) != 1:
        raise SystemExit(
            f'STOP: server rota date attribute expected once, found {s.count(date_attr)}'
        )
    s = s.replace(
        date_attr,
        date_attr
        + '    data-pmd-locale="{{ $pmdServerLocale }}"\n'
        + '    data-pmd-date-locale-authority="v8"\n',
        1,
    )

    h2_anchor = """                <h2
                    data-pmd-no-translate
                    lang=\"{{ $pmdServerLocale }}\"
                >"""
    h2_new = """                <h2
                    data-pmd-no-translate
                    data-pmd-i18n-skip
                    data-pmd-shifts-date-label
                    lang=\"{{ $pmdServerLocale }}\"
                >"""
    if h2_anchor not in s:
        raise SystemExit('STOP: V7 server date h2 anchor missing')
    s = s.replace(h2_anchor, h2_new, 1)

    marker_anchor = '    // PMD_SHIFTS_DATE_LOCALE_SERVER_V7\n'
    if marker_anchor not in s:
        raise SystemExit('STOP: V7 server locale marker missing')
    s = s.replace(
        marker_anchor,
        marker_anchor + '    // PMD_SHIFTS_DATE_LOCALE_PIN_SERVER_V8\n',
        1,
    )

rota.write_text(s)
print('Server date locale: pinned and isolated from translators')

# ------------------------------------------------------------
# 3) V8 JS: derive locale from server-rendered HTML, not from a global
#    that can initialize later. The value is captured once at startup.
# ------------------------------------------------------------
s = js.read_text()

if 'PMD_SHIFTS_DATE_LOCALE_PIN_JS_V8' not in s:
    old_fn = """  // PMD_SHIFTS_DATE_LOCALE_JS_V7
  function shiftsDateLocale() {
    var locale = String(window.PMD_ADMIN_LOCALE || 'en').trim().toLowerCase();
    if (locale === 'de') return 'de-DE';
    if (locale === 'tr') return 'tr-TR';
    return 'en-US';
  }
"""
    new_fn = """  // PMD_SHIFTS_DATE_LOCALE_JS_V7
  // PMD_SHIFTS_DATE_LOCALE_PIN_JS_V8
  var shiftsDateLocaleCode = (function () {
    var initial = root.querySelector('[data-pmd-shifts-server-initial]');
    var locale = String(
      (initial && initial.getAttribute('data-pmd-locale')) ||
      window.PMD_ADMIN_LOCALE ||
      'en'
    ).trim().toLowerCase();

    if (locale !== 'de' && locale !== 'tr') locale = 'en';
    return locale;
  }());

  function shiftsDateLocale() {
    if (shiftsDateLocaleCode === 'de') return 'de-DE';
    if (shiftsDateLocaleCode === 'tr') return 'tr-TR';
    return 'en-US';
  }
"""
    if old_fn not in s:
        raise SystemExit('STOP: exact V7 shiftsDateLocale() block missing')
    s = s.replace(old_fn, new_fn, 1)

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
        raise SystemExit('STOP: exact V7 dynamic date markup missing')
    s = s.replace(old_markup, new_markup, 1)

js.write_text(s)
print('V8 JS: locale pinned to server HTML and dynamic date isolated')
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMPROOT/$CONTROLLER"
php -l "$TMPROOT/$ROTA"

grep -Fq "pmd-shifts-canonical-locale-v8.js" "$TMPROOT/$CONTROLLER"
grep -Fq "PMD_SHIFTS_DATE_LOCALE_PIN_SERVER_V8" "$TMPROOT/$ROTA"
grep -Fq "data-pmd-locale=\"{{ \$pmdServerLocale }}\"" "$TMPROOT/$ROTA"
grep -Fq "data-pmd-i18n-skip" "$TMPROOT/$ROTA"
grep -Fq "PMD_SHIFTS_DATE_LOCALE_PIN_JS_V8" "$TMPROOT/$NEW_JS"
grep -Fq "data-pmd-i18n-skip" "$TMPROOT/$NEW_JS"

if command -v node >/dev/null 2>&1; then
    TMPJS="$(mktemp /tmp/pmd-shifts-locale-v8.XXXXXX.js)"
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

grep -nF "pmd-shifts-canonical-locale-v8.js" "$CONTROLLER"
grep -nF "PMD_SHIFTS_DATE_LOCALE_PIN_SERVER_V8" "$ROTA"
grep -nF "data-pmd-i18n-skip" "$ROTA" | head -3
grep -nF "PMD_SHIFTS_DATE_LOCALE_PIN_JS_V8" "$NEW_JS"

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
echo "SUCCESS - SHIFTS DATE LOCALE V8 PINNED"
echo "========================================"
echo "Fixes:"
echo "  - Shifts loads a NEW JS filename, bypassing stale Safari/CDN cache"
echo "  - date locale is embedded in server HTML and captured once"
echo "  - no dependence on late-changing html lang / runtime timing"
echo "  - date label is skipped by both generic Admin i18n runtimes"
echo "  - DE stays DE; EN stays EN; TR stays TR"
echo "  - no rota logic, OTP, Portal MFA, Member modal, or Shifts data changed"
echo "Backup: $BACKUP"
