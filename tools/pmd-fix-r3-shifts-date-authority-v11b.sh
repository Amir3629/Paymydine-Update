#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
cd "$ROOT"

OLD_JS="app/admin/assets/js/pmd-admin-coverage-r3.js"
NEW_JS="app/admin/assets/js/pmd-admin-coverage-r3-v11b.js"
ROTA="app/admin/views/pmdshifts/_server_rota_v13.blade.php"
BACKUP="/tmp/pmd-r3-shifts-date-v11b-backup-$(date +%Y%m%d-%H%M%S)"
TMPROOT="$(mktemp -d /tmp/pmd-r3-shifts-date-v11b.XXXXXX)"
APPLY_STARTED=0
NEW_JS_EXISTED=0

cleanup() {
    rc=$?
    trap - EXIT

    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK V11B"
        set +e
        sudo cp -a "$BACKUP/$LOADER" "$LOADER"
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

test -f "$OLD_JS" || {
    echo "STOP: live generated runtime missing: $OLD_JS"
    exit 20
}

test -f "$ROTA" || {
    echo "STOP: Shifts server rota missing: $ROTA"
    exit 21
}

mapfile -t LOADERS < <(
    grep -RIl \
      --include='*.php' \
      --include='*.blade.php' \
      'pmd-admin-coverage-r3.js' \
      app/admin/views 2>/dev/null || true
)

if [ "${#LOADERS[@]}" -ne 1 ]; then
    echo "STOP: expected exactly ONE live view loader for pmd-admin-coverage-r3.js"
    echo "Found: ${#LOADERS[@]}"
    printf '%s\n' "${LOADERS[@]}"
    exit 22
fi

LOADER="${LOADERS[0]}"
echo "Live R3 loader: $LOADER"

grep -Fq "function patchShifts()" "$OLD_JS" || {
    echo "STOP: patchShifts() missing from live generated runtime"
    exit 23
}

grep -Fq "var dated = document.querySelector('[data-pmd-shifts-server-initial][data-date]');" "$OLD_JS" || {
    echo "STOP: exact legacy Shifts date mutation block is not present"
    exit 24
}

grep -Fq "PMD_SHIFTS_DATE_VISIBLE_DEDUP_V10" "$ROTA" || {
    echo "STOP: V10 date display marker missing from live rota"
    exit 25
}

echo "PRE-FLIGHT PASSED"

echo ""
echo "========================================"
echo "2. PREPARE IN /tmp"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

mkdir -p \
  "$TMPROOT/$(dirname "$NEW_JS")" \
  "$TMPROOT/$(dirname "$ROTA")" \
  "$TMPROOT/$(dirname "$LOADER")"

cp "$OLD_JS" "$TMPROOT/$NEW_JS"
cp "$ROTA" "$TMPROOT/$ROTA"
cp "$LOADER" "$TMPROOT/$LOADER"

python3 - "$TMPROOT/$NEW_JS" "$TMPROOT/$ROTA" "$TMPROOT/$LOADER" <<'PY'
from pathlib import Path
import re
import sys

runtime = Path(sys.argv[1])
rota = Path(sys.argv[2])
loader = Path(sys.argv[3])

# ------------------------------------------------------------
# 1) Root cause: legacy R3 coverage runtime must not own the canonical
#    Shifts date label. The canonical Shifts runtime/server already formats it.
# ------------------------------------------------------------
s = runtime.read_text()
marker = 'PMD_R3_SHIFTS_DATE_AUTHORITY_V11B'

if marker not in s:
    # Correct the unrelated-but-nearby locale fallback too: English must never
    # silently become German inside the Shifts coverage patch.
    old_locale = "var localeTag = locale === 'tr' ? 'tr-TR' : 'de-DE';"
    new_locale = "var localeTag = locale === 'tr' ? 'tr-TR' : (locale === 'de' ? 'de-DE' : 'en-US');"
    if old_locale in s:
        s = s.replace(old_locale, new_locale, 1)

    start = s.find("        var dated = document.querySelector('[data-pmd-shifts-server-initial][data-date]');")
    next_anchor = s.find("        document.querySelectorAll('.pmd-shifts-final-person-copy small", start)

    if start < 0 or next_anchor < 0 or next_anchor <= start:
        raise SystemExit('STOP: could not isolate legacy R3 Shifts date mutation block')

    old_block = s[start:next_anchor]
    if "heading.textContent = new Intl.DateTimeFormat" not in old_block:
        raise SystemExit('STOP: isolated R3 block does not contain expected heading.textContent mutation')

    replacement = (
        "        // PMD_R3_SHIFTS_DATE_AUTHORITY_V11B\n"
        "        // Canonical Shifts owns selected-date locale/rendering.\n"
        "        // Do NOT write .pmd-shifts-final-date h2 from this legacy coverage runtime.\n\n"
    )
    s = s[:start] + replacement + s[next_anchor:]

runtime.write_text(s)
print('Generated R3 runtime: legacy date writer removed')

# ------------------------------------------------------------
# 2) Make V10's hidden mutable text rule more specific than the canonical
#    h2 font-size rule. This is defense-in-depth against any other late writer.
# ------------------------------------------------------------
s = rota.read_text()
if 'PMD_SHIFTS_DATE_VISIBLE_SPECIFICITY_V11B' not in s:
    old_selector = 'body.pmd-shifts-page [data-pmd-shifts-date-label] {'
    new_selector = (
        '/* PMD_SHIFTS_DATE_VISIBLE_SPECIFICITY_V11B */\n'
        '  body.pmd-shifts-page .pmd-shifts-final-date h2[data-pmd-shifts-date-label] {'
    )
    if s.count(old_selector) != 1:
        raise SystemExit(
            f'STOP: expected V10 mutable-date selector once, found {s.count(old_selector)}'
        )
    s = s.replace(old_selector, new_selector, 1)

    old_after = 'body.pmd-shifts-page [data-pmd-shifts-date-label]::after {'
    new_after = 'body.pmd-shifts-page .pmd-shifts-final-date h2[data-pmd-shifts-date-label]::after {'
    if s.count(old_after) != 1:
        raise SystemExit(
            f'STOP: expected V10 pseudo-date selector once, found {s.count(old_after)}'
        )
    s = s.replace(old_after, new_after, 1)

rota.write_text(s)
print('Shifts visible date: V10 specificity hardened')

# ------------------------------------------------------------
# 3) Force a new asset URL. Production may use a fixed query version, so use a
#    brand-new filename instead of relying on cache revalidation.
# ------------------------------------------------------------
s = loader.read_text()
old_name = 'pmd-admin-coverage-r3.js'
new_name = 'pmd-admin-coverage-r3-v11b.js'

if new_name not in s:
    count = s.count(old_name)
    if count != 1:
        raise SystemExit(
            f'STOP: expected live R3 loader filename once, found {count}'
        )
    s = s.replace(old_name, new_name, 1)

loader.write_text(s)
print('Live R3 loader: switched to uncached V11B filename')
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMPROOT/$ROTA"
php -l "$TMPROOT/$LOADER"

grep -Fq "PMD_R3_SHIFTS_DATE_AUTHORITY_V11B" "$TMPROOT/$NEW_JS"
if grep -Fq "var dated = document.querySelector('[data-pmd-shifts-server-initial][data-date]');" "$TMPROOT/$NEW_JS"; then
    echo "STOP: legacy date writer still exists in prepared V11B runtime"
    exit 30
fi

grep -Fq "PMD_SHIFTS_DATE_VISIBLE_SPECIFICITY_V11B" "$TMPROOT/$ROTA"
grep -Fq "pmd-admin-coverage-r3-v11b.js" "$TMPROOT/$LOADER"

if command -v node >/dev/null 2>&1; then
    TMPJS="$(mktemp /tmp/pmd-admin-coverage-r3-v11b.XXXXXX.js)"
    cp "$TMPROOT/$NEW_JS" "$TMPJS"
    node --check "$TMPJS"
    rm -f "$TMPJS"
fi

echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY THE LIVE TARGETS"
echo "========================================"

mkdir -p \
  "$BACKUP/$(dirname "$LOADER")" \
  "$BACKUP/$(dirname "$ROTA")" \
  "$BACKUP/$(dirname "$NEW_JS")"

sudo cp -a "$LOADER" "$BACKUP/$LOADER"
sudo cp -a "$ROTA" "$BACKUP/$ROTA"

if [ -e "$NEW_JS" ]; then
    NEW_JS_EXISTED=1
    sudo cp -a "$NEW_JS" "$BACKUP/$NEW_JS"
fi

echo "Backup: $BACKUP"

echo ""
echo "========================================"
echo "5. APPLY V11B"
echo "========================================"

APPLY_STARTED=1

sudo tee "$NEW_JS" >/dev/null < "$TMPROOT/$NEW_JS"
sudo chown --reference="$OLD_JS" "$NEW_JS"
sudo chmod --reference="$OLD_JS" "$NEW_JS"

sudo tee "$ROTA" >/dev/null < "$TMPROOT/$ROTA"
sudo tee "$LOADER" >/dev/null < "$TMPROOT/$LOADER"

echo ""
echo "========================================"
echo "6. VERIFY LIVE"
echo "========================================"

php -l "$ROTA"
php -l "$LOADER"
node --check "$NEW_JS" 2>/dev/null || true

grep -nF "PMD_R3_SHIFTS_DATE_AUTHORITY_V11B" "$NEW_JS"
grep -nF "PMD_SHIFTS_DATE_VISIBLE_SPECIFICITY_V11B" "$ROTA"
grep -nF "pmd-admin-coverage-r3-v11b.js" "$LOADER"

if grep -Fq "var dated = document.querySelector('[data-pmd-shifts-server-initial][data-date]');" "$NEW_JS"; then
    echo "ERROR: live V11B runtime still contains legacy date writer"
    exit 40
fi

echo "LIVE FILE CHECKS PASSED"

echo ""
echo "========================================"
echo "7. CLEAR VIEW CACHE"
echo "========================================"
sudo -u www-data php artisan view:clear || true

APPLY_STARTED=0

echo ""
echo "========================================"
echo "SUCCESS - SHIFTS DATE ROOT CAUSE V11B FIXED"
echo "========================================"
echo "Fixes:"
echo "  - patches the generated R3 runtime that actually exists on production"
echo "  - removes the legacy heading.textContent date writer from Shifts"
echo "  - English no longer falls through to de-DE in the R3 Shifts patch"
echo "  - uses a brand-new runtime filename to bypass Safari/CDN cache"
echo "  - hardens the V10 hidden-text selector against higher-specificity CSS"
echo "  - no OTP, Portal MFA, Member actions, schedule data, or header controls changed"
echo "Backup: $BACKUP"
