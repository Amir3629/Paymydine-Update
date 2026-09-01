#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
cd "$ROOT"

ROTA="app/admin/views/pmdshifts/_server_rota_v13.blade.php"
BACKUP="/tmp/pmd-shifts-date-visible-dedup-v10-backup-$(date +%Y%m%d-%H%M%S)"
TMP="$(mktemp /tmp/pmd-shifts-date-visible-dedup-v10.XXXXXX.blade.php)"
APPLY_STARTED=0

cleanup() {
    rc=$?
    trap - EXIT

    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK V10"
        set +e
        sudo cp -a "$BACKUP/$ROTA" "$ROTA"
        echo "ROLLBACK COMPLETE"
        echo "Backup kept at: $BACKUP"
    fi

    rm -f "$TMP"
    exit "$rc"
}
trap cleanup EXIT

echo "========================================"
echo "1. PRE-FLIGHT"
echo "========================================"

test -f "$ROTA" || { echo "STOP: missing $ROTA"; exit 20; }
grep -Fq "PMD_SHIFTS_DATE_VISIBLE_LOCK_SERVER_V9" "$ROTA" || {
    echo "STOP: V9 visible-date marker missing."
    exit 21
}
grep -Fq "data-pmd-fixed-date" "$ROTA" || {
    echo "STOP: fixed date attribute missing."
    exit 22
}

echo "PRE-FLIGHT PASSED"

echo ""
echo "========================================"
echo "2. PREPARE IN /tmp"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

cp "$ROTA" "$TMP"

python3 - "$TMP" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()

marker = 'PMD_SHIFTS_DATE_VISIBLE_DEDUP_V10'
if marker in s:
    print('V10 visible-date dedup already present')
    raise SystemExit(0)

old = '''<style id="pmd-shifts-date-visible-lock-v9">
  /* PMD_SHIFTS_DATE_VISIBLE_LOCK_SERVER_V9 */
  body.pmd-shifts-page [data-pmd-shifts-date-label]::after {
    content: attr(data-pmd-fixed-date);
  }
</style>'''

new = '''<style id="pmd-shifts-date-visible-lock-v9">
  /* PMD_SHIFTS_DATE_VISIBLE_LOCK_SERVER_V9 */
  /* PMD_SHIFTS_DATE_VISIBLE_DEDUP_V10 */
  /*
   * Legacy Admin coverage code can still assign heading.textContent after
   * Shifts has rendered. Keep that mutable text in the DOM for compatibility,
   * but make it zero-size. The only visible label is the server-pinned
   * data-pmd-fixed-date value rendered by ::after.
   */
  body.pmd-shifts-page [data-pmd-shifts-date-label] {
    font-size:0!important;
    line-height:0!important;
    color:transparent!important;
    text-shadow:none!important;
    white-space:nowrap!important;
  }
  body.pmd-shifts-page [data-pmd-shifts-date-label]::after {
    content:attr(data-pmd-fixed-date)!important;
    display:inline-block!important;
    color:#102a43!important;
    font-size:20px!important;
    line-height:1.25!important;
    white-space:nowrap!important;
  }
</style>'''

if s.count(old) != 1:
    raise SystemExit(
        f'STOP: expected exact V9 style block once, found {s.count(old)}'
    )

s = s.replace(old, new, 1)
p.write_text(s)
print('V10: injected date text hidden; fixed localized date remains visible')
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMP"
grep -Fq "PMD_SHIFTS_DATE_VISIBLE_DEDUP_V10" "$TMP"
grep -Fq "font-size:0!important" "$TMP"
grep -Fq "content:attr(data-pmd-fixed-date)!important" "$TMP"
grep -Fq "font-size:20px!important" "$TMP"

echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY 1 FILE"
echo "========================================"

mkdir -p "$BACKUP/$(dirname "$ROTA")"
sudo cp -a "$ROTA" "$BACKUP/$ROTA"
echo "Backup: $BACKUP"

echo ""
echo "========================================"
echo "5. APPLY ONLY 1 FILE"
echo "========================================"

APPLY_STARTED=1
sudo tee "$ROTA" >/dev/null < "$TMP"

echo ""
echo "========================================"
echo "6. VERIFY LIVE"
echo "========================================"

php -l "$ROTA"
grep -nF "PMD_SHIFTS_DATE_VISIBLE_DEDUP_V10" "$ROTA"
grep -nF "font-size:0!important" "$ROTA" | head -2
grep -nF "content:attr(data-pmd-fixed-date)!important" "$ROTA"

echo "LIVE FILE CHECKS PASSED"

echo ""
echo "========================================"
echo "7. CLEAR CACHE"
echo "========================================"
sudo -u www-data php artisan optimize:clear || true

APPLY_STARTED=0

echo ""
echo "========================================"
echo "SUCCESS - SHIFTS DATE DUPLICATE/BLINK V10 FIXED"
echo "========================================"
echo "Fixes:"
echo "  - mutable heading.textContent is zero-size and cannot appear beside the date"
echo "  - only data-pmd-fixed-date is visible"
echo "  - legacy i18n runtime may still mutate DOM text but cannot cause visible blink"
echo "  - no Shifts JS, schedule data, OTP, Portal MFA, Member actions, or header controls changed"
echo "Backup: $BACKUP"
