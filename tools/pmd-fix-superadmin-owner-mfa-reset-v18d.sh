#!/usr/bin/env bash
set -euo pipefail

cd /var/www/paymydine

FILE="app/Services/PmdSuperAdminOwnerMfaResetService.php"
BACKUP="/tmp/pmd-superadmin-owner-mfa-v18d-backup-$(date +%Y%m%d-%H%M%S)"
TMP="$(mktemp /tmp/pmd-superadmin-owner-mfa-v18d.XXXXXX.php)"
APPLY_STARTED=0

cleanup() {
    rc=$?
    trap - EXIT
    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK V18D"
        set +e
        sudo cp -a "$BACKUP/$FILE" "$FILE"
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

test -f "$FILE" || { echo "STOP: missing $FILE"; exit 20; }
grep -Fq "class PmdSuperAdminOwnerMfaResetService" "$FILE" || {
    echo "STOP: expected V18B reset service not found"
    exit 21
}

grep -Fq "PmdOwnerTotpService::TABLE" "$FILE" || {
    echo "STOP: Owner MFA table authority missing"
    exit 22
}

cp "$FILE" "$TMP"

echo "PRE-FLIGHT PASSED"

echo ""
echo "========================================"
echo "2. PREPARE IN /tmp"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

python3 - "$TMP" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()
marker = 'PMD_SUPERADMIN_OWNER_MFA_RESET_V18D'

if marker in s:
    print('V18D already present in temp source')
    raise SystemExit(0)

old_schema = """            if (\n                !Schema::connection('tenant')->hasTable('staffs')\n                || !Schema::connection('tenant')->hasTable('staff_roles')\n                || !Schema::connection('tenant')->hasTable('users')\n            ) {\n"""
new_schema = """            if (\n                !Schema::connection('tenant')->hasTable('staffs')\n                || !Schema::connection('tenant')->hasTable('users')\n            ) {\n"""
if s.count(old_schema) != 1:
    raise SystemExit(f'STOP: identity schema block count={s.count(old_schema)}')
s = s.replace(old_schema, new_schema, 1)

start = s.find("            $owners = DB::connection('tenant')")
end_marker = "\n\n            if ($owners->count() !== 1) {"
end = s.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit('STOP: Owner resolver block not found')

new_resolver = r'''            // PMD_SUPERADMIN_OWNER_MFA_RESET_V18D
            // Production authority: the restaurant Owner login is the enabled
            // super-user account. Do not depend on staff_roles.code/name here:
            // older tenant schemas do not have the code column, and raw aliases
            // are unsafe with the tenant table prefix.
            $owners = DB::connection('tenant')
                ->table('staffs as staff')
                ->join('users as user', 'user.staff_id', '=', 'staff.staff_id')
                ->where('user.super_user', 1)
                ->where('staff.staff_status', 1)
                ->select([
                    'user.user_id',
                    'user.username',
                    'user.super_user',
                    'staff.staff_id',
                    'staff.staff_name',
                ])
                ->orderBy('user.user_id')
                ->get()
                ->unique('user_id')
                ->values();'''

s = s[:start] + new_resolver + s[end:]

if 'role.code' in s:
    raise SystemExit('STOP: role.code still remains after patch')

p.write_text(s)
print('Owner resolver patched: super_user authority, no role schema dependency')
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMP"
grep -Fq "PMD_SUPERADMIN_OWNER_MFA_RESET_V18D" "$TMP"
grep -Fq "where('user.super_user', 1)" "$TMP"
if grep -Fq "role.code" "$TMP"; then
    echo "STOP: broken role.code reference still exists"
    exit 30
fi

echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY THE RESET SERVICE"
echo "========================================"

sudo mkdir -p "$BACKUP/$(dirname "$FILE")"
sudo cp -a "$FILE" "$BACKUP/$FILE"
echo "Backup: $BACKUP"

echo ""
echo "========================================"
echo "5. APPLY ONLY ONE FILE"
echo "========================================"

APPLY_STARTED=1
sudo tee "$FILE" >/dev/null < "$TMP"

echo ""
echo "========================================"
echo "6. VERIFY LIVE"
echo "========================================"

php -l "$FILE"
grep -nF "PMD_SUPERADMIN_OWNER_MFA_RESET_V18D" "$FILE"
grep -nF "where('user.super_user', 1)" "$FILE"
if grep -Fq "role.code" "$FILE"; then
    echo "STOP: broken role.code reference exists in live service"
    exit 31
fi

echo "LIVE FILE CHECKS PASSED"

APPLY_STARTED=0

echo ""
echo "========================================"
echo "SUCCESS - SUPERADMIN OWNER MFA RESET V18D INSTALLED"
echo "========================================"
echo "Fix:"
echo "  - removes the invalid staff_roles.code dependency"
echo "  - resolves the Owner using the real enabled super_user account"
echo "  - avoids raw SQL aliases that break under the ti_ tenant prefix"
echo "  - existing reset verification still confirms pmd_owner_mfa is inactive"
echo "  - trusted Owner sign-ins are still revoked"
echo "  - Workplace Hub/site_hub remains untouched"
echo ""
echo "IMPORTANT: click Reset Owner MFA ONE MORE TIME after this install."
echo "Previous reset attempts failed before reaching the MFA update."
echo "Backup: $BACKUP"
