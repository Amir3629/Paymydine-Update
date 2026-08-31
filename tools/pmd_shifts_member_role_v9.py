#!/usr/bin/env python3
from pathlib import Path
import datetime as dt
import hashlib
import os
import re
import shutil
import subprocess
import sys

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else '/var/www/paymydine').resolve()
STAMP = dt.datetime.now(dt.timezone.utc).strftime('%Y%m%d_%H%M%S')
BACKUP = ROOT / '.pmd-hotfix-backups' / ('shifts-member-role-v9-' + STAMP)

ROLE_SERVICE = ROOT / 'app/admin/Services/PmdDefaultStaffRoleService.php'
ROLE_LANDING = ROOT / 'app/admin/Services/PmdRoleLandingService.php'
ROSTER = ROOT / 'app/Services/PmdOperationalRosterReconciler.php'
CONTROLLER = ROOT / 'app/admin/controllers/Shifts.php'
VIEW = ROOT / 'app/admin/views/pmdshifts/index.blade.php'
JS = ROOT / 'app/admin/assets/js/pmd-shifts-v1.js'
GATE = ROOT / 'app/Http/Middleware/PmdSiteAccessGateMiddleware.php'

PATHS = [ROLE_SERVICE, ROLE_LANDING, ROSTER, CONTROLLER, VIEW, JS, GATE]
for path in PATHS:
    if not path.is_file():
        raise SystemExit(f'ERROR: missing required file: {path}')

role_service = ROLE_SERVICE.read_text(encoding='utf-8')
role_landing = ROLE_LANDING.read_text(encoding='utf-8')
roster = ROSTER.read_text(encoding='utf-8')
controller = CONTROLLER.read_text(encoding='utf-8')
view = VIEW.read_text(encoding='utf-8')
js = JS.read_text(encoding='utf-8')
gate = GATE.read_text(encoding='utf-8')

if 'PMD_TRUSTED_DEVICE_LOGIN_GATE_V1' not in gate or 'finalizeAdminHtml' in gate:
    raise SystemExit('ERROR: V8 security-only trusted-device middleware is not active')
if 'PMD_SHIFTS_ROLE_FAMILY_PALETTE_V2' not in (ROOT / 'app/admin/assets/css/pmd-shifts-dashboard-reservations-v4.css').read_text(encoding='utf-8'):
    raise SystemExit('ERROR: expected V8 Shifts palette is not active')
if 'PMD_OPERATIONAL_ROSTER_RECONCILE_V2' not in roster:
    raise SystemExit('ERROR: expected roster reconciler V2 state')

originals = {
    ROLE_SERVICE: role_service,
    ROLE_LANDING: role_landing,
    ROSTER: roster,
    CONTROLLER: controller,
    VIEW: view,
    JS: js,
}
created = []


def exact(text, old, new, label, count=1):
    found = text.count(old)
    if found != count:
        raise RuntimeError(f'{label}: expected {count} exact match(es), found {found}')
    print('PATCH: ' + label)
    return text.replace(old, new, count)


def regex(text, pattern, replacement, label, count=1):
    out, found = re.subn(pattern, lambda _m: replacement, text, count=count, flags=re.S)
    if found != count:
        raise RuntimeError(f'{label}: expected {count} regex match(es), found {found}')
    print('PATCH: ' + label)
    return out


# Access roles: Team Member -> Kitchen Staff; add Sonstige.
# Keep the historical pmd-team-member code for compatibility.
if 'PMD_DEFAULT_STAFF_ROLES_V5' not in role_service:
    role_service = exact(
        role_service,
        '/** PMD_DEFAULT_STAFF_ROLES_V4 */',
        '/** PMD_DEFAULT_STAFF_ROLES_V5 */',
        'Advance default staff role authority to V5',
    )
    role_service = exact(
        role_service,
        "    public const TEAM_MEMBER = 'pmd-team-member';\n    public const KDS_PREFIX = 'pmd-kds:';",
        "    public const TEAM_MEMBER = 'pmd-team-member'; // compatibility code; display name is Kitchen Staff\n    public const SONSTIGE = 'pmd-sonstige';\n    public const KDS_PREFIX = 'pmd-kds:';",
        'Add Sonstige access-role code',
    )
    old_team = """            [
                'code' => self::TEAM_MEMBER,
                'name' => 'Team Member',
                'description' => 'Staff Portal only. No operational PMD workspace or side menu.',
                'permissions' => [
                    'Admin.Dashboard' => 1,
                ],
            ],
"""
    new_team = """            [
                'code' => self::TEAM_MEMBER,
                'name' => 'Kitchen Staff',
                'description' => 'Kitchen staff portal only. No operational PMD workspace or side menu.',
                'permissions' => [
                    'Admin.Dashboard' => 1,
                ],
            ],
            [
                'code' => self::SONSTIGE,
                'name' => 'Sonstige',
                'description' => 'Other staff portal only. No operational PMD workspace or side menu.',
                'permissions' => [
                    'Admin.Dashboard' => 1,
                ],
            ],
"""
    role_service = exact(role_service, old_team, new_team, 'Rename Team Member to Kitchen Staff and add Sonstige')
    role_service = exact(
        role_service,
        "            self::TEAM_MEMBER,\n        ], true) || str_starts_with($code, self::KDS_PREFIX);",
        "            self::TEAM_MEMBER,\n            self::SONSTIGE,\n        ], true) || str_starts_with($code, self::KDS_PREFIX);",
        'Make Sonstige a managed PMD access role',
    )
    role_service = exact(
        role_service,
        "            self::TEAM_MEMBER => 'mywork', 'team-member' => 'mywork',\n",
        "            self::TEAM_MEMBER => 'mywork', 'team-member' => 'mywork', 'team member' => 'mywork', 'kitchen staff' => 'mywork',\n            self::SONSTIGE => 'mywork', 'sonstige' => 'mywork',\n",
        'Route Kitchen Staff and Sonstige to My Work',
    )
    role_service = exact(
        role_service,
        "        if ($code === self::TEAM_MEMBER) return $is('mywork');",
        "        if (in_array($code, [self::TEAM_MEMBER, self::SONSTIGE], true)) return $is('mywork');",
        'Restrict Kitchen Staff and Sonstige to My Work',
    )
else:
    print('ALREADY: default access roles V5')

if 'PMD_ROLE_LANDING_SERVICE_V3' not in role_landing:
    role_landing = exact(
        role_landing,
        ' * PMD_ROLE_LANDING_SERVICE_V2',
        ' * PMD_ROLE_LANDING_SERVICE_V3',
        'Advance role landing authority to V3',
    )
    role_landing = exact(
        role_landing,
        "        'pmd-team-member' => 'mywork',\n        'team-member' => 'mywork',\n        'team member' => 'mywork',\n",
        "        'pmd-team-member' => 'mywork',\n        'team-member' => 'mywork',\n        'team member' => 'mywork',\n        'kitchen staff' => 'mywork',\n        'pmd-sonstige' => 'mywork',\n        'sonstige' => 'mywork',\n",
        'Add Kitchen Staff and Sonstige landing aliases',
    )
else:
    print('ALREADY: role landing V3')

# Operational Role is the single category/area authority. Access Role is permissions only.
if 'PMD_OPERATIONAL_ROSTER_RECONCILE_V3' not in roster:
    roster = exact(
        roster,
        ' * PMD_OPERATIONAL_ROSTER_RECONCILE_V2',
        ' * PMD_OPERATIONAL_ROSTER_RECONCILE_V3',
        'Advance roster reconciler to V3',
    )
    roster = exact(
        roster,
        "        } elseif ($code === PmdDefaultStaffRoleService::TEAM_MEMBER) {\n            $department = 'other';\n            $label = 'Team member';\n        } elseif ($code === '') {",
        "        } elseif ($code === PmdDefaultStaffRoleService::TEAM_MEMBER) {\n            $department = 'kitchen';\n            $label = 'Kitchen Staff';\n        } elseif ($code === PmdDefaultStaffRoleService::SONSTIGE) {\n            $department = 'other';\n            $label = 'Sonstige';\n        } elseif ($code === '') {",
        'Give Kitchen Staff and Sonstige correct legacy defaults',
    )

    enrich_pattern = r"    private function enrichmentUpdates\(\$person, array \$role\): array\n    \{.*?\n    \}\n\n    private function syncFutureAssignmentSnapshots"
    enrich_replacement = r'''    private function enrichmentUpdates($person, array $role): array
    {
        $updates = [];
        $department = strtolower(trim((string)($person->department ?? '')));
        $jobRole = trim((string)($person->job_role ?? ''));
        $jobRoleKey = strtolower(trim((string)preg_replace('/\s+/', ' ', $jobRole)));
        $roleCode = strtolower(trim((string)($role['code'] ?? '')));

        // PMD_OPERATIONAL_ROLE_IS_AREA_V1
        // Access Role controls permissions only. Operational Role owns the
        // Dienstplan family/color/category. Only empty/legacy-generic roles are
        // filled from Access Role.
        if ($jobRole === '' || in_array($jobRoleKey, ['team', 'team member'], true)) {
            $jobRole = trim((string)($role['label'] ?? '')) ?: 'Sonstige';
            if (trim((string)($person->job_role ?? '')) !== $jobRole) {
                $updates['job_role'] = $jobRole;
            }
        }

        $derivedDepartment = $this->departmentForOperationalRole($jobRole);
        if ($department !== $derivedDepartment) {
            $updates['department'] = $derivedDepartment;
        }

        if (str_starts_with($roleCode, PmdDefaultStaffRoleService::KDS_PREFIX)) {
            $station = trim((string)($role['station_slug'] ?? '')) ?: null;
            if (($person->station_slug ?? null) !== $station) {
                $updates['station_slug'] = $station;
            }
        }

        return $updates;
    }

    private function departmentForOperationalRole(string $jobRole): string
    {
        $role = strtolower(trim((string)preg_replace('/[_-]+/', ' ', $jobRole)));
        $role = trim((string)preg_replace('/\s+/', ' ', $role));

        if (
            str_contains($role, 'kitchen') || str_contains($role, 'chef')
            || str_contains($role, 'cook') || str_contains($role, 'kds')
            || str_contains($role, 'dish') || str_contains($role, 'prep')
            || str_contains($role, 'boh')
        ) return 'kitchen';

        if (
            str_contains($role, 'bartender') || str_contains($role, 'barman')
            || str_contains($role, 'barmaid') || $role === 'bar'
        ) return 'bar';

        if (
            str_contains($role, 'reservation') || str_contains($role, 'reception')
            || str_contains($role, 'host') || str_contains($role, 'front desk')
        ) return 'reception';

        if (
            str_contains($role, 'waiter') || str_contains($role, 'server')
            || str_contains($role, 'service') || str_contains($role, 'runner')
            || str_contains($role, 'floor') || str_contains($role, 'cashier')
            || str_contains($role, 'till') || str_contains($role, 'checkout')
            || $role === 'pos'
        ) return 'floor';

        return 'other';
    }

    private function syncFutureAssignmentSnapshots'''
    roster = regex(roster, enrich_pattern, enrich_replacement, 'Make operational Role the only area/category authority')
else:
    print('ALREADY: roster reconciler V3')

# Shifts saveperson: Area is no longer accepted; internal department derives from Role.
if 'PMD_SHIFTS_ROLE_ONLY_MEMBER_V1' not in controller:
    controller = exact(
        controller,
        "            'display_name' => trim((string)request()->input('display_name', '')),\n            'department' => trim((string)request()->input('department', '')),\n            'job_role' => trim((string)request()->input('job_role', '')),",
        "            'display_name' => trim((string)request()->input('display_name', '')),\n            'job_role' => trim((string)request()->input('job_role', '')),",
        'Stop accepting Area from Member form',
    )
    controller = exact(
        controller,
        "            'display_name' => ['required', 'string', 'min:2', 'max:128'],\n            'department' => ['nullable', 'in:kitchen,floor,bar,reception,other'],\n            'job_role' => ['nullable', 'string', 'max:64'],",
        "            'display_name' => ['required', 'string', 'min:2', 'max:128'],\n            'job_role' => ['required', 'string', 'min:2', 'max:64'],",
        'Require one operational Role instead of Area + Role',
    )
    controller = exact(
        controller,
        "                'department' => trim((string)($clean['department'] ?? '')) ?: 'other',\n                'job_role' => trim((string)($clean['job_role'] ?? '')) ?: null,",
        "                // PMD_SHIFTS_ROLE_ONLY_MEMBER_V1\n                'department' => $this->departmentForMemberRole((string)($clean['job_role'] ?? '')),\n                'job_role' => trim((string)($clean['job_role'] ?? '')) ?: 'Sonstige',",
        'Derive internal area/category from Role on every save',
    )

    helper = r'''
    private function departmentForMemberRole(string $jobRole): string
    {
        $role = strtolower(trim((string)preg_replace('/[_-]+/', ' ', $jobRole)));
        $role = trim((string)preg_replace('/\s+/', ' ', $role));
        if (str_contains($role, 'kitchen') || str_contains($role, 'chef') || str_contains($role, 'cook') || str_contains($role, 'kds') || str_contains($role, 'dish') || str_contains($role, 'prep') || str_contains($role, 'boh')) return 'kitchen';
        if (str_contains($role, 'bartender') || str_contains($role, 'barman') || str_contains($role, 'barmaid') || $role === 'bar') return 'bar';
        if (str_contains($role, 'reservation') || str_contains($role, 'reception') || str_contains($role, 'host') || str_contains($role, 'front desk')) return 'reception';
        if (str_contains($role, 'waiter') || str_contains($role, 'server') || str_contains($role, 'service') || str_contains($role, 'runner') || str_contains($role, 'floor') || str_contains($role, 'cashier') || str_contains($role, 'till') || str_contains($role, 'checkout') || $role === 'pos') return 'floor';
        return 'other';
    }

'''
    anchor = re.search(r"\n    private function technicalStaffEmail\(", controller)
    if not anchor:
        raise RuntimeError('Insert Role->department helper: technicalStaffEmail() anchor not found')
    controller = controller[:anchor.start()] + '\n' + helper + controller[anchor.start()+1:]
    print('PATCH: Add Role-to-category inference helper')
else:
    print('ALREADY: Shifts Member Role-only save authority')

# Remove Area selector from Member modal.
if 'PMD_SHIFTS_MEMBER_NO_AREA_V1' not in view:
    area_pattern = r"\n\s*<label\b[^>]*>(?:(?!</label>).)*data-pmd-team-department(?:(?!</label>).)*</label>"
    view, area_count = re.subn(area_pattern, '', view, count=1, flags=re.S)
    if area_count != 1:
        raise RuntimeError(f'Remove Area field: expected 1 label, found {area_count}')
    modal_match = re.search(r'(\n\s*)(<[^>]+data-pmd-team-modal[^>]*>)', view)
    if not modal_match:
        raise RuntimeError('Member modal anchor missing')
    marker = modal_match.group(1) + '{{-- PMD_SHIFTS_MEMBER_NO_AREA_V1: Role owns operational category; Access Role owns permissions. --}}' + modal_match.group(1) + modal_match.group(2)
    view = view[:modal_match.start()] + marker + view[modal_match.end():]
    print('PATCH: Remove Area field from Member modal')
else:
    print('ALREADY: Member modal has no Area')

# Member browser editor no longer reads/resets Area.
if 'PMD_SHIFTS_MEMBER_ROLE_ONLY_UI_V1' not in js:
    js = exact(
        js,
        "  var teamRoleInput = teamModal && teamModal.querySelector('[data-pmd-team-role]');\n  var teamDepartmentInput = teamModal && teamModal.querySelector('[data-pmd-team-department]');\n",
        "  var teamRoleInput = teamModal && teamModal.querySelector('[data-pmd-team-role]');\n  // PMD_SHIFTS_MEMBER_ROLE_ONLY_UI_V1: no duplicate Area control.\n",
        'Remove Area binding from Member JS',
    )
    js = exact(js, "    if (teamDepartmentInput) teamDepartmentInput.value = 'other';\n", '', 'Remove Area reset from Member JS')
    js = exact(js, "      if (teamDepartmentInput) teamDepartmentInput.value = personNode.getAttribute('data-department') || 'other';\n", '', 'Remove Area edit hydration from Member JS')
else:
    print('ALREADY: Member Role-only JS')

# Fresh JS fingerprint.
js_hash = hashlib.sha256(js.encode('utf-8')).hexdigest()[:12]
js_name = f'pmd-shifts-canonical-{js_hash}.js'
js_target = JS.parent / js_name
controller, js_count = re.subn(
    r"\$this->addJs\('js/pmd-shifts-canonical-[0-9a-f]{12}\.js'\);",
    lambda _m: "$this->addJs('js/" + js_name + "');",
    controller,
    count=1,
)
if js_count != 1:
    raise RuntimeError(f'Fingerprint Member JS: expected 1 registration, found {js_count}')

for token, text, label in [
    ('PMD_DEFAULT_STAFF_ROLES_V5', role_service, 'role service'),
    ("'name' => 'Kitchen Staff'", role_service, 'role service'),
    ("'name' => 'Sonstige'", role_service, 'role service'),
    ('PMD_ROLE_LANDING_SERVICE_V3', role_landing, 'role landing'),
    ('PMD_OPERATIONAL_ROSTER_RECONCILE_V3', roster, 'roster'),
    ('PMD_OPERATIONAL_ROLE_IS_AREA_V1', roster, 'roster'),
    ('PMD_SHIFTS_ROLE_ONLY_MEMBER_V1', controller, 'controller'),
    ('PMD_SHIFTS_MEMBER_NO_AREA_V1', view, 'view'),
    ('PMD_SHIFTS_MEMBER_ROLE_ONLY_UI_V1', js, 'js'),
    (js_name, controller, 'controller'),
]:
    if token not in text:
        raise RuntimeError(f'Pre-write validation: {label} missing {token}')

BACKUP.mkdir(parents=True, exist_ok=False)
for path in originals:
    dest = BACKUP / path.relative_to(ROOT)
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, dest)
print(f'BACKUP: {BACKUP}')

try:
    ROLE_SERVICE.write_text(role_service, encoding='utf-8')
    ROLE_LANDING.write_text(role_landing, encoding='utf-8')
    ROSTER.write_text(roster, encoding='utf-8')
    CONTROLLER.write_text(controller, encoding='utf-8')
    VIEW.write_text(view, encoding='utf-8')
    JS.write_text(js, encoding='utf-8')

    existed = js_target.exists()
    js_target.write_text(js, encoding='utf-8')
    st = JS.stat()
    os.chown(js_target, st.st_uid, st.st_gid)
    os.chmod(js_target, st.st_mode & 0o777)
    if not existed:
        created.append(js_target)

    for php_file in [ROLE_SERVICE, ROLE_LANDING, ROSTER, CONTROLLER]:
        result = subprocess.run(['php', '-l', str(php_file)], cwd=str(ROOT), text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        print(result.stdout.strip())
        if result.returncode != 0:
            raise RuntimeError(f'PHP lint failed: {php_file}')

    node = shutil.which('node')
    if node:
        result = subprocess.run([node, '--check', str(JS)], cwd=str(ROOT), text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        if result.stdout.strip(): print(result.stdout.strip())
        if result.returncode != 0:
            raise RuntimeError('JavaScript syntax check failed')

    if 'data-pmd-team-department' in VIEW.read_text(encoding='utf-8'):
        raise RuntimeError('Area field still exists after write')
    if hashlib.sha256(js_target.read_bytes()).hexdigest()[:12] != js_hash:
        raise RuntimeError('fingerprinted JS hash mismatch')
except Exception:
    print('ERROR: V9 validation failed; restoring backup', file=sys.stderr)
    for path, content in originals.items():
        path.write_text(content, encoding='utf-8')
    for target in created:
        try: target.unlink()
        except FileNotFoundError: pass
    raise

print('OK: Area removed; Role is the operational category authority')
print('OK: Team Member access role renamed to Kitchen Staff')
print('OK: Sonstige access role added')
print('ASSET_JS: ' + js_name)
print('NOTE: access-role DB rows are created/renamed by ensure() on the next Shifts request')
