#!/usr/bin/env bash
set -euo pipefail

ROOT="/var/www/paymydine"
cd "$ROOT"

REF="refs/remotes/origin/feature/portal-personal-mfa-20260901"
CONTROLLER="app/admin/controllers/SuperAdminR2Controller.php"
ROUTES="routes/pmd-superadmin-r2.php"
VIEW="app/admin/views/superadmin_r2/restaurants.blade.php"
SERVICE="app/Services/PmdSuperAdminOwnerPortalMfaResetService.php"
REF_SERVICE="app/Services/PmdPortalTotpService.php"

BACKUP="/tmp/pmd-superadmin-owner-mfa-v18-backup-$(date +%Y%m%d-%H%M%S)"
TMPROOT="$(mktemp -d /tmp/pmd-superadmin-owner-mfa-v18.XXXXXX)"
APPLY_STARTED=0
SERVICE_EXISTED=0

cleanup() {
    rc=$?
    trap - EXIT

    if [ "$rc" -ne 0 ] && [ "$APPLY_STARTED" -eq 1 ]; then
        echo ""
        echo "ERROR DETECTED - ROLLING BACK SUPERADMIN OWNER MFA V18"
        set +e

        sudo cp -a "$BACKUP/$CONTROLLER" "$CONTROLLER"
        sudo cp -a "$BACKUP/$ROUTES" "$ROUTES"
        sudo cp -a "$BACKUP/$VIEW" "$VIEW"

        if [ "$SERVICE_EXISTED" -eq 1 ]; then
            sudo cp -a "$BACKUP/$SERVICE" "$SERVICE"
        else
            sudo rm -f "$SERVICE"
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
test -f "$ROUTES" || { echo "STOP: missing $ROUTES"; exit 21; }
test -f "$VIEW" || { echo "STOP: missing $VIEW"; exit 22; }
test -f "$REF_SERVICE" || { echo "STOP: missing live Portal MFA service"; exit 23; }

grep -Fq "class SuperAdminR2Controller" "$CONTROLLER" || { echo "STOP: SuperAdmin R2 controller authority missing"; exit 24; }
grep -Fq "PMD_SUPERADMIN_R2_ROUTE_AUTHORITY" "$ROUTES" || { echo "STOP: SuperAdmin R2 route authority missing"; exit 25; }
grep -Fq "Restaurant registry" "$VIEW" || { echo "STOP: SuperAdmin restaurant registry view anchor missing"; exit 26; }
grep -Fq "PmdPortalTotpService" "$REF_SERVICE" || { echo "STOP: Portal MFA service is unexpected"; exit 27; }

git cat-file -e "$REF:$SERVICE" || { echo "STOP: support reset service missing on fetched branch"; exit 28; }

if grep -Fq "PMD_SUPERADMIN_OWNER_PORTAL_MFA_RESET_V1" "$CONTROLLER"; then
    if grep -Fq "/superadmin/tenants/reset-owner-portal-mfa" "$ROUTES" \
       && grep -Fq "Reset Owner MFA" "$VIEW" \
       && test -f "$SERVICE"; then
        echo "SuperAdmin Owner Portal MFA reset is already installed. Nothing changed."
        exit 0
    fi
    echo "STOP: mixed/partial SuperAdmin Owner MFA installation state"
    exit 29
fi

echo "PRE-FLIGHT PASSED"

echo ""
echo "========================================"
echo "2. PREPARE ALL CHANGES IN /tmp"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

for path in "$CONTROLLER" "$ROUTES" "$VIEW" "$SERVICE"; do
    mkdir -p "$TMPROOT/$(dirname "$path")"
done

cp "$CONTROLLER" "$TMPROOT/$CONTROLLER"
cp "$ROUTES" "$TMPROOT/$ROUTES"
cp "$VIEW" "$TMPROOT/$VIEW"
git show "$REF:$SERVICE" > "$TMPROOT/$SERVICE"
test -s "$TMPROOT/$SERVICE"

python3 - "$TMPROOT/$CONTROLLER" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()

marker = 'PMD_SUPERADMIN_OWNER_PORTAL_MFA_RESET_V1'
import_anchor = 'use App\\Services\\SuperAdminTenantLifecycleService;'
import_line = 'use App\\Services\\PmdSuperAdminOwnerPortalMfaResetService;'

if import_line not in s:
    if s.count(import_anchor) != 1:
        raise SystemExit(f'STOP: SuperAdmin service import anchor count={s.count(import_anchor)}')
    s = s.replace(import_anchor, import_anchor + '\n' + import_line, 1)

method_anchor = '    public function status(Request $request)\n'
if marker not in s:
    if s.count(method_anchor) != 1:
        raise SystemExit(f'STOP: SuperAdmin status method anchor count={s.count(method_anchor)}')

    method = r'''    /** PMD_SUPERADMIN_OWNER_PORTAL_MFA_RESET_V1 */
    public function resetOwnerPortalMfa(
        Request $request,
        PmdSuperAdminOwnerPortalMfaResetService $resetter
    ) {
        $request->validate([
            'id' => 'required|integer',
            'confirmation' => 'required|in:reset-owner-portal-mfa',
        ]);

        $tenant = DB::connection('mysql')
            ->table('tenants')
            ->where('id', (int)$request->input('id'))
            ->first();

        if (!$tenant) {
            return redirect('/superadmin/new')
                ->withErrors(['tenant' => 'Restaurant not found.']);
        }

        if (strtolower(trim((string)($tenant->status ?? ''))) === 'removed') {
            return redirect('/superadmin/new')->with(
                'warning',
                'Restore the restaurant before resetting its Owner Portal Authenticator.'
            );
        }

        $result = $resetter->resetForTenant($tenant);

        $audit = [
            'surface' => 'superadmin_restaurant_registry',
            'action' => 'owner_portal_mfa_emergency_reset',
            'success' => (bool)($result['ok'] ?? false),
            'result_code' => (string)($result['code'] ?? ''),
            'superadmin_id' => (int)Session::get('superadmin_id', 0),
            'superadmin_username' => (string)Session::get('superadmin_username', ''),
            'tenant_id' => (int)($tenant->id ?? 0),
            'tenant_name' => (string)($tenant->name ?? ''),
            'tenant_domain' => (string)($tenant->domain ?? ''),
            'tenant_database' => (string)($tenant->database ?? ''),
            'owner_user_id' => (int)($result['owner_user_id'] ?? 0),
            'owner_staff_id' => (int)($result['owner_staff_id'] ?? 0),
            'owner_username' => (string)($result['owner_username'] ?? ''),
            'had_active_factor' => (bool)($result['had_active_factor'] ?? false),
            'ip' => (string)$request->ip(),
        ];

        if (!empty($result['ok'])) {
            Log::warning('PMD SuperAdmin Owner Portal MFA emergency reset', $audit);
            return redirect('/superadmin/new')->with(
                'success',
                trim((string)($tenant->name ?? 'Restaurant')).': '.(string)$result['message']
            );
        }

        Log::warning('PMD SuperAdmin Owner Portal MFA emergency reset refused/failed', $audit + [
            'message' => (string)($result['message'] ?? 'Unknown reset failure.'),
        ]);

        return redirect('/superadmin/new')->with(
            'warning',
            trim((string)($tenant->name ?? 'Restaurant')).': '.(string)($result['message'] ?? 'Owner Portal MFA reset failed.')
        );
    }

'''
    s = s.replace(method_anchor, method + method_anchor, 1)

p.write_text(s)
print('SuperAdminR2Controller.php: support-only Owner Portal MFA reset prepared')
PY

python3 - "$TMPROOT/$ROUTES" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()
route = """            // PMD_SUPERADMIN_OWNER_PORTAL_MFA_RESET_V1
            Route::post('/superadmin/tenants/reset-owner-portal-mfa', [SuperAdminR2Controller::class, 'resetOwnerPortalMfa'])
                ->name('pmd.superadmin.tenants.reset-owner-portal-mfa');
"""

if '/superadmin/tenants/reset-owner-portal-mfa' not in s:
    anchor = """            Route::post('/superadmin/tenants/provision', [SuperAdminR2Controller::class, 'provision'])
                ->name('pmd.superadmin.tenants.provision');
"""
    if s.count(anchor) != 1:
        raise SystemExit(f'STOP: SuperAdmin provision route anchor count={s.count(anchor)}')
    s = s.replace(anchor, anchor + '\n' + route, 1)

p.write_text(s)
print('pmd-superadmin-r2.php: authenticated POST reset route prepared')
PY

python3 - "$TMPROOT/$VIEW" <<'PY'
from pathlib import Path
import sys

p = Path(sys.argv[1])
s = p.read_text()
marker = 'PMD_SUPERADMIN_OWNER_PORTAL_MFA_RESET_V1'

if marker not in s:
    anchor = '                                <form class="tenant-status-form" method="POST" action="/superadmin/tenants/status">'
    if s.count(anchor) != 1:
        raise SystemExit(f'STOP: tenant status form anchor count={s.count(anchor)}')

    block = '''                                {{-- PMD_SUPERADMIN_OWNER_PORTAL_MFA_RESET_V1 --}}
                                <form
                                    method="POST"
                                    action="/superadmin/tenants/reset-owner-portal-mfa"
                                    onsubmit="return confirm('Reset the Owner Portal Authenticator for this restaurant? The old Authenticator and all Portal recovery codes will stop working. The Owner must sign in with their password and enroll a new QR.');"
                                >
                                    @csrf
                                    <input type="hidden" name="id" value="{{ $tenant->id }}">
                                    <input type="hidden" name="confirmation" value="reset-owner-portal-mfa">
                                    <button class="btn btn-soft" type="submit" title="Support emergency recovery only">Reset Owner MFA</button>
                                </form>
'''
    s = s.replace(anchor, block + anchor, 1)

p.write_text(s)
print('restaurants.blade.php: Reset Owner MFA row action prepared')
PY

echo ""
echo "========================================"
echo "3. VERIFY TEMP"
echo "NO PRODUCTION WRITES YET"
echo "========================================"

php -l "$TMPROOT/$CONTROLLER"
php -l "$TMPROOT/$ROUTES"
php -l "$TMPROOT/$SERVICE"
php -l "$TMPROOT/$VIEW"

grep -Fq "PMD_SUPERADMIN_OWNER_PORTAL_MFA_RESET_V1" "$TMPROOT/$CONTROLLER"
grep -Fq "/superadmin/tenants/reset-owner-portal-mfa" "$TMPROOT/$ROUTES"
grep -Fq "Reset Owner MFA" "$TMPROOT/$VIEW"
grep -Fq "class PmdSuperAdminOwnerPortalMfaResetService" "$TMPROOT/$SERVICE"
grep -Fq "resetUser" "$TMPROOT/$SERVICE"
grep -Fq "owner_identity_ambiguous" "$TMPROOT/$SERVICE"

echo "ALL TEMP CHECKS PASSED"

echo ""
echo "========================================"
echo "4. BACKUP ONLY THE 4 V18 TARGETS"
echo "========================================"

for path in "$CONTROLLER" "$ROUTES" "$VIEW"; do
    sudo mkdir -p "$BACKUP/$(dirname "$path")"
    sudo cp -a "$path" "$BACKUP/$path"
done

if [ -e "$SERVICE" ]; then
    SERVICE_EXISTED=1
    sudo mkdir -p "$BACKUP/$(dirname "$SERVICE")"
    sudo cp -a "$SERVICE" "$BACKUP/$SERVICE"
fi

echo "Backup: $BACKUP"

echo ""
echo "========================================"
echo "5. APPLY ONLY THE 4 V18 TARGETS"
echo "========================================"

APPLY_STARTED=1

sudo tee "$CONTROLLER" >/dev/null < "$TMPROOT/$CONTROLLER"
sudo tee "$ROUTES" >/dev/null < "$TMPROOT/$ROUTES"
sudo tee "$VIEW" >/dev/null < "$TMPROOT/$VIEW"
sudo tee "$SERVICE" >/dev/null < "$TMPROOT/$SERVICE"

sudo chown --reference="$CONTROLLER" "$CONTROLLER" || true
sudo chmod --reference="$CONTROLLER" "$CONTROLLER" || true
sudo chown --reference="$REF_SERVICE" "$SERVICE"
sudo chmod --reference="$REF_SERVICE" "$SERVICE"

echo ""
echo "========================================"
echo "6. VERIFY LIVE"
echo "========================================"

php -l "$CONTROLLER"
php -l "$ROUTES"
php -l "$SERVICE"
php -l "$VIEW"

grep -nF "PMD_SUPERADMIN_OWNER_PORTAL_MFA_RESET_V1" "$CONTROLLER"
grep -nF "/superadmin/tenants/reset-owner-portal-mfa" "$ROUTES"
grep -nF "Reset Owner MFA" "$VIEW"
grep -nF "class PmdSuperAdminOwnerPortalMfaResetService" "$SERVICE"

echo "LIVE FILE CHECKS PASSED"

echo ""
echo "========================================"
echo "7. CLEAR ROUTE/VIEW CACHE"
echo "========================================"

sudo -u www-data php artisan route:clear || true
sudo -u www-data php artisan view:clear || true

APPLY_STARTED=0

echo ""
echo "========================================"
echo "SUCCESS - SUPERADMIN OWNER PORTAL MFA RESET V18 INSTALLED"
echo "========================================"
echo "Behavior now:"
echo "  - SuperAdmin Restaurants rows have Reset Owner MFA"
echo "  - action is POST + CSRF behind SuperAdminAuth"
echo "  - tenant Owner is resolved from real Owner/SuperUser identity"
echo "  - missing or multiple Owner identities fail closed"
echo "  - only Portal MFA + Portal recovery codes are reset"
echo "  - Owner restaurant-security TOTP and Workplace Hub are NOT reset"
echo "  - old Portal sessions fail on their next request via existing factor-generation guard"
echo "  - next password-authenticated Owner Portal login requires a NEW QR"
echo "  - reset never approves a login and never bypasses the password"
echo "  - action is written to the application security log"
echo "Backup: $BACKUP"
