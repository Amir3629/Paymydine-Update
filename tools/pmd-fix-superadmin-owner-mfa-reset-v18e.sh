#!/usr/bin/env bash
set -euo pipefail

cd /var/www/paymydine

FILE="app/Services/PmdSuperAdminOwnerMfaResetService.php"
BACKUP="/tmp/pmd-superadmin-owner-mfa-v18e-backup-$(date +%Y%m%d-%H%M%S)"
TMP="$(mktemp /tmp/pmd-superadmin-owner-mfa-v18e.XXXXXX.php)"
APPLY_STARTED=0

cleanup() {
    rc=$?
    trap - EXIT
    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK V18E"
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
    echo "STOP: Owner MFA reset service missing"
    exit 21
}
grep -Fq "PMD_SUPERADMIN_OWNER_MFA_RESET_V18D" "$FILE" || {
    echo "STOP: V18D resolver is not installed; refusing blind patch"
    exit 22
}
grep -Fq "PmdOwnerTotpService::TABLE" "$FILE" || {
    echo "STOP: Owner MFA table authority missing"
    exit 23
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
marker = 'PMD_SUPERADMIN_OWNER_MFA_RESET_V18E'

if marker in s:
    print('V18E already present in temp source')
    raise SystemExit(0)

old_schema = """            if (\n                !Schema::connection('tenant')->hasTable('staffs')\n                || !Schema::connection('tenant')->hasTable('users')\n            ) {\n"""
new_schema = """            if (!Schema::connection('tenant')->hasTable('users')) {\n"""
if s.count(old_schema) != 1:
    raise SystemExit(f'STOP: V18D schema block count={s.count(old_schema)}')
s = s.replace(old_schema, new_schema, 1)

start = s.find('            // PMD_SUPERADMIN_OWNER_MFA_RESET_V18D')
end_marker = "\n\n            if ($owners->count() !== 1) {"
end = s.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit('STOP: V18D Owner resolver block not found')

new_resolver = r'''            // PMD_SUPERADMIN_OWNER_MFA_RESET_V18E
            // Canonical Owner authority is users.super_user. A valid framework
            // Super User may have no staff row, so support recovery must never
            // require staffs/staff_status just to disable that user's MFA.
            $owners = DB::connection('tenant')
                ->table('users')
                ->where('super_user', 1)
                ->select([
                    'user_id',
                    'username',
                    'super_user',
                    'staff_id',
                ])
                ->orderBy('user_id')
                ->get()
                ->unique('user_id')
                ->values();'''

s = s[:start] + new_resolver + s[end:]

old_name = "'owner_name' => trim((string)($owner->staff_name ?? '')) ?: 'Owner',"
new_name = "'owner_name' => trim((string)($owner->username ?? '')) ?: 'Owner',"
if old_name not in s:
    raise SystemExit('STOP: owner_name return anchor missing')
s = s.replace(old_name, new_name, 1)

for forbidden in [
    "join('staffs as staff'",
    "where('staff.staff_status'",
    'role.code',
]:
    if forbidden in s:
        raise SystemExit(f'STOP: forbidden resolver dependency remains: {forbidden}')

p.write_text(s)
print('Owner resolver patched: users.super_user only; staff row no longer required')
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMP"
grep -Fq "PMD_SUPERADMIN_OWNER_MFA_RESET_V18E" "$TMP"
grep -Fq -- "->table('users')" "$TMP"
grep -Fq -- "->where('super_user', 1)" "$TMP"
if grep -Fq "join('staffs as staff'" "$TMP"; then
    echo "STOP: staff join still exists"
    exit 30
fi
if grep -Fq "where('staff.staff_status'" "$TMP"; then
    echo "STOP: staff status dependency still exists"
    exit 31
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
grep -nF "PMD_SUPERADMIN_OWNER_MFA_RESET_V18E" "$FILE"
grep -nF -- "->table('users')" "$FILE"
grep -nF -- "->where('super_user', 1)" "$FILE"
if grep -Fq "join('staffs as staff'" "$FILE"; then
    echo "STOP: staff join exists in live service"
    exit 32
fi
if grep -Fq "where('staff.staff_status'" "$FILE"; then
    echo "STOP: staff status dependency exists in live service"
    exit 33
fi

echo "LIVE FILE CHECKS PASSED"

APPLY_STARTED=0

echo ""
echo "========================================"
echo "SUCCESS - SUPERADMIN OWNER MFA RESET V18E INSTALLED"
echo "========================================"
echo "Fix:"
echo "  - Owner is resolved directly from users.super_user"
echo "  - a missing/null staff row can no longer block emergency MFA reset"
echo "  - no staff role or staff status is required"
echo "  - pmd_owner_mfa reset verification remains active"
echo "  - trusted Owner sign-ins are still revoked"
echo "  - Workplace Hub/site_hub remains untouched"
echo ""
echo "IMPORTANT: click Reset Owner MFA ONE MORE TIME after V18E."
echo "Then refresh the old 6-digit page; it must be rejected by V18C."
echo "Backup: $BACKUP"
