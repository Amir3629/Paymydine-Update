#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
cd "$ROOT"

GATE="app/Services/PmdSiteAccessWorkspaceGateService.php"
VIEW="app/admin/views/pmdshifts/index.blade.php"
BACKUP="/tmp/pmd-portal-loop-header-v6-backup-$(date +%Y%m%d-%H%M%S)"
TMPROOT="$(mktemp -d /tmp/pmd-portal-loop-header-v6.XXXXXX)"
APPLY_STARTED=0

cleanup() {
    rc=$?
    trap - EXIT
    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK V6"
        set +e
        sudo cp -a "$BACKUP/$GATE" "$GATE"
        sudo cp -a "$BACKUP/$VIEW" "$VIEW"
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

test -f "$GATE" || { echo "STOP: missing $GATE"; exit 20; }
test -f "$VIEW" || { echo "STOP: missing $VIEW"; exit 21; }

grep -Fq "PMD_PORTAL_SESSION_ROUTE_AUTHORITY_V2" "$GATE" || {
    echo "STOP: Portal Gate V5/V2 authority marker is missing."
    exit 22
}

grep -Fq "pmd-shifts__header" "$VIEW" || {
    echo "STOP: Shifts header not found."
    exit 23
}

grep -Fq "notification_bell" "$VIEW" || {
    echo "STOP: Shifts notification bell include not found."
    exit 24
}

echo "PRE-FLIGHT PASSED"

echo ""
echo "========================================"
echo "2. PREPARE IN /tmp"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

mkdir -p "$TMPROOT/$(dirname "$GATE")" "$TMPROOT/$(dirname "$VIEW")"
cp "$GATE" "$TMPROOT/$GATE"
cp "$VIEW" "$TMPROOT/$VIEW"

python3 - "$TMPROOT/$GATE" "$TMPROOT/$VIEW" <<'PY'
from pathlib import Path
import re
import sys

gate = Path(sys.argv[1])
view = Path(sys.argv[2])

# ------------------------------------------------------------
# Fix 1: Portal MFA uses /admin/login as its own setup/verify UI.
# V5 accidentally redirected /admin/login back to itself while the
# pmd_login_portal_security_v1 state existed, producing an infinite loop.
# ------------------------------------------------------------
s = gate.read_text()
marker = 'PMD_PORTAL_LOGIN_SELF_REDIRECT_FIX_V6'
if marker not in s:
    old = """        if (session()->has('pmd_login_portal_security_v1')) {
            return redirect(admin_url('login'));
        }
"""
    new = """        if (session()->has('pmd_login_portal_security_v1')) {
            // PMD_PORTAL_LOGIN_SELF_REDIRECT_FIX_V6
            // /admin/login is the Portal MFA setup/verify/recovery surface.
            // Never redirect that route to itself.
            if ($relative === 'login') return null;
            return redirect(admin_url('login'));
        }
"""
    count = s.count(old)
    if count != 1:
        raise SystemExit(
            f'STOP: Portal self-redirect block expected exactly once, found {count}'
        )
    s = s.replace(old, new, 1)
gate.write_text(s)
print('Portal login self-redirect: fixed')

# ------------------------------------------------------------
# Fix 2: Shifts page header has exactly one interactive control:
# the existing functional notification bell. Remove header Back and
# header Add Shift only. Add/Member actions inside the rota stay intact.
# ------------------------------------------------------------
s = view.read_text()
marker = 'PMD_SHIFTS_HEADER_NOTIFICATION_ONLY_V6'
start = s.find('<header class="pmd-shifts__header">')
if start < 0:
    raise SystemExit('STOP: Shifts header start missing')
end = s.find('</header>', start)
if end < 0:
    raise SystemExit('STOP: Shifts header end missing')
end += len('</header>')
header = s[start:end]

if marker not in header:
    # Remove the Dashboard/back anchor from the Shifts header only.
    back_pattern = re.compile(
        r'\n\s*<a\s+class="pmd-shifts__icon-button".*?</a>',
        re.S,
    )
    header, back_count = back_pattern.subn('', header, count=1)
    if back_count != 1:
        raise SystemExit(
            f'STOP: expected one Shifts header back button, found {back_count}'
        )

    # Remove only the header-level Add Shift button and its @if wrapper.
    add_pattern = re.compile(
        r'\n\s*@if\(\$ready\)\s*'
        r'<button\s+type="button"\s+class="pmd-shifts__header-icon is-primary"'
        r'.*?data-pmd-shift-open.*?</button>\s*@endif',
        re.S,
    )
    header, add_count = add_pattern.subn('', header, count=1)
    if add_count != 1:
        raise SystemExit(
            f'STOP: expected one Shifts header Add Shift button, found {add_count}'
        )

    anchor = '<div class="pmd-shifts__header-actions" aria-label="Shift actions">'
    if header.count(anchor) != 1:
        raise SystemExit('STOP: Shifts header actions anchor is unexpected')
    header = header.replace(
        anchor,
        '<!-- PMD_SHIFTS_HEADER_NOTIFICATION_ONLY_V6 -->\n        ' + anchor,
        1,
    )

    s = s[:start] + header + s[end:]

view.write_text(s)
print('Shifts header: notification-only')
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMPROOT/$GATE"
grep -Fq "PMD_PORTAL_LOGIN_SELF_REDIRECT_FIX_V6" "$TMPROOT/$GATE"
grep -Fq "PMD_SHIFTS_HEADER_NOTIFICATION_ONLY_V6" "$TMPROOT/$VIEW"

python3 - "$TMPROOT/$VIEW" <<'PY'
from pathlib import Path
import sys
s = Path(sys.argv[1]).read_text()
start = s.find('<header class="pmd-shifts__header">')
end = s.find('</header>', start)
if start < 0 or end < 0:
    raise SystemExit('STOP: Shifts header missing after patch')
header = s[start:end]
if 'notification_bell' not in header:
    raise SystemExit('STOP: notification bell disappeared')
if 'data-pmd-shift-open' in header:
    raise SystemExit('STOP: Add Shift still exists in header')
if 'pmd-shifts__icon-button' in header:
    raise SystemExit('STOP: Back button still exists in header')
print('Shifts header verification OK: notification is the only header control')
PY

echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY 2 FILES"
echo "========================================"

mkdir -p "$BACKUP/$(dirname "$GATE")" "$BACKUP/$(dirname "$VIEW")"
sudo cp -a "$GATE" "$BACKUP/$GATE"
sudo cp -a "$VIEW" "$BACKUP/$VIEW"
echo "Backup: $BACKUP"

echo ""
echo "========================================"
echo "5. APPLY ONLY 2 FILES"
echo "========================================"
APPLY_STARTED=1
sudo tee "$GATE" >/dev/null < "$TMPROOT/$GATE"
sudo tee "$VIEW" >/dev/null < "$TMPROOT/$VIEW"

echo ""
echo "========================================"
echo "6. VERIFY LIVE"
echo "========================================"
php -l "$GATE"
grep -nF "PMD_PORTAL_LOGIN_SELF_REDIRECT_FIX_V6" "$GATE"
grep -nF "PMD_SHIFTS_HEADER_NOTIFICATION_ONLY_V6" "$VIEW"

python3 - "$VIEW" <<'PY'
from pathlib import Path
import sys
s = Path(sys.argv[1]).read_text()
start = s.find('<header class="pmd-shifts__header">')
end = s.find('</header>', start)
header = s[start:end]
assert 'notification_bell' in header
assert 'data-pmd-shift-open' not in header
assert 'pmd-shifts__icon-button' not in header
print('LIVE Shifts header verification OK')
PY

echo "LIVE FILE CHECKS PASSED"

echo ""
echo "========================================"
echo "7. CLEAR CACHE"
echo "========================================"
sudo -u www-data php artisan optimize:clear || true

APPLY_STARTED=0

echo ""
echo "========================================"
echo "SUCCESS - PORTAL LOGIN LOOP + SHIFTS HEADER V6 FIXED"
echo "========================================"
echo "Fixes:"
echo "  - /admin/login no longer redirects to itself during Portal MFA"
echo "  - usernameportal can render QR / TOTP / recovery UI normally"
echo "  - Shifts header keeps ONLY the notification control"
echo "  - Shifts header Back button removed"
echo "  - Shifts header Add Shift button removed"
echo "  - Rota/member actions outside the header remain untouched"
echo "Backup: $BACKUP"
