from pathlib import Path
import re

ROOT = Path('.')


def read(path):
    return (ROOT / path).read_text()


def write(path, text):
    p = ROOT / path
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(text)


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit('Missing authority for ' + label)
    return text.replace(old, new, 1)

# -----------------------------------------------------------------------------
# 1) Default access role: a personal-profile-only Team Member role.
# -----------------------------------------------------------------------------
role_path = 'app/admin/Services/PmdDefaultStaffRoleService.php'
role = read(role_path)
role = replace_once(role,
    "    public const RESERVATIONS = 'pmd-reservations';\n    public const KDS_PREFIX = 'pmd-kds:';",
    "    public const RESERVATIONS = 'pmd-reservations';\n    public const TEAM_MEMBER = 'pmd-team-member';\n    public const KDS_PREFIX = 'pmd-kds:';",
    'team member constant')
role = replace_once(role,
    "            [\n                'code' => self::RESERVATIONS,\n                'name' => 'Reservations',\n                'description' => 'Reservations workspace only. No side menu.',\n                'permissions' => [\n                    self::PMD_RESERVATIONS_WORKSPACE => 1,\n                    'Admin.Reservations' => 1,\n                ],\n            ],\n        ];",
    "            [\n                'code' => self::RESERVATIONS,\n                'name' => 'Reservations',\n                'description' => 'Reservations workspace only. No side menu.',\n                'permissions' => [\n                    self::PMD_RESERVATIONS_WORKSPACE => 1,\n                    'Admin.Reservations' => 1,\n                ],\n            ],\n            [\n                'code' => self::TEAM_MEMBER,\n                'name' => 'Team Member',\n                'description' => 'Personal My Work profile only. No operational workspace access.',\n                'permissions' => [\n                    'Admin.Dashboard' => 1,\n                ],\n            ],\n        ];",
    'team member definition')
role = replace_once(role,
    "            self::RESERVATIONS,\n        ], true) || str_starts_with($code, self::KDS_PREFIX);",
    "            self::RESERVATIONS,\n            self::TEAM_MEMBER,\n        ], true) || str_starts_with($code, self::KDS_PREFIX);",
    'managed code')
role = replace_once(role,
    "            self::RESERVATIONS => 'reservations', 'reservation' => 'reservations', 'reservations' => 'reservations',\n        ];",
    "            self::RESERVATIONS => 'reservations', 'reservation' => 'reservations', 'reservations' => 'reservations',\n            self::TEAM_MEMBER => 'mywork', 'team-member' => 'mywork',\n        ];",
    'team member route')
role = replace_once(role,
    "        $is = function (string $route) use ($path): bool {\n            return $path === 'admin/'.$route || str_starts_with($path, 'admin/'.$route.'/');\n        };\n\n        if ($code === self::MANAGER) {",
    "        $is = function (string $route) use ($path): bool {\n            return $path === 'admin/'.$route || str_starts_with($path, 'admin/'.$route.'/');\n        };\n\n        // Every PMD account owns a personal My Work page, regardless of operational role.\n        if ($is('mywork')) return true;\n        if ($code === self::TEAM_MEMBER) return $is('mywork');\n\n        if ($code === self::MANAGER) {",
    'my work role boundary')
write(role_path, role)

# -----------------------------------------------------------------------------
# 2) Shifts controller: unified Team + PMD access + request handling.
# -----------------------------------------------------------------------------
shifts_path = 'app/admin/controllers/Shifts.php'
shifts = read(shifts_path)

anchor = "        if ($veryBusyThreshold <= $busyThreshold) $veryBusyThreshold = min(1000, $busyThreshold + 1);\n\n        $this->vars['pmdShifts'] = ["
insert = "        if ($veryBusyThreshold <= $busyThreshold) $veryBusyThreshold = min(1000, $busyThreshold + 1);\n\n        $accessRoleService = app(PmdDefaultStaffRoleService::class);\n        $accessRoles = collect($accessRoleService->ensure())\n            ->reject(fn ($role) => strtolower((string)$role->code) === PmdDefaultStaffRoleService::OWNER)\n            ->values();\n        $accessStaff = Staffs_model::with(['role', 'user'])\n            ->whereNotSuperUser()\n            ->orderBy('staff_name')\n            ->get()\n            ->keyBy('staff_id');\n\n        $teamRequests = collect();\n        if (Schema::hasTable('pmd_staff_requests')) {\n            $teamRequests = DB::table('pmd_staff_requests as request')\n                ->leftJoin('pmd_operational_people as person', 'person.id', '=', 'request.person_id')\n                ->where('request.location_id', $locationId)\n                ->where('request.status', 'pending')\n                ->select(['request.*', 'person.display_name as person_name'])\n                ->orderByDesc('request.created_at')\n                ->limit(20)\n                ->get();\n        }\n\n        $this->vars['pmdShifts'] = ["
shifts = replace_once(shifts, anchor, insert, 'shifts access data')
shifts = replace_once(shifts,
    "            'roles' => $workforce->roleOptions(),\n            'current_shift' => $currentShift,",
    "            'roles' => $workforce->roleOptions(),\n            'access_roles' => $accessRoles,\n            'access_staff' => $accessStaff,\n            'team_requests' => $teamRequests,\n            'current_shift' => $currentShift,",
    'shifts vars')

new_saveperson = r'''    /**
     * Unified Team editor. Operational identity remains separate from PMD access,
     * but an Owner/Manager can create both in one quick form.
     */
    public function saveperson()
    {
        $this->assertOwnerOrManager();
        $this->requireReady();

        $locationId = $this->locationId();
        $id = max(0, (int)request()->input('id', 0));
        $existing = $id > 0
            ? DB::table('pmd_operational_people')->where('id', $id)->where('location_id', $locationId)->first()
            : null;
        if ($id > 0 && !$existing) abort(404);

        $existingStaff = $existing && !empty($existing->staff_id)
            ? Staffs_model::with(['role', 'user'])->whereNotSuperUser()->find((int)$existing->staff_id)
            : null;
        $wantsAccess = request()->boolean('give_access') || (bool)$existingStaff;

        $roleService = app(PmdDefaultStaffRoleService::class);
        $managedRoles = collect($roleService->ensure())
            ->reject(fn ($role) => strtolower((string)$role->code) === PmdDefaultStaffRoleService::OWNER)
            ->keyBy('staff_role_id');

        $input = [
            'display_name' => trim((string)request()->input('display_name', '')),
            'department' => trim((string)request()->input('department', '')),
            'job_role' => trim((string)request()->input('job_role', '')),
            'staff_role_id' => max(0, (int)request()->input('staff_role_id', 0)),
            'username' => trim((string)request()->input('username', '')),
            'password' => (string)request()->input('password', ''),
        ];

        $userId = $existingStaff && $existingStaff->user ? (int)$existingStaff->user->user_id : 0;
        $rules = [
            'display_name' => ['required', 'string', 'min:2', 'max:128'],
            'department' => ['nullable', 'in:kitchen,floor,bar,reception,other'],
            'job_role' => ['nullable', 'string', 'max:64'],
        ];
        if ($wantsAccess) {
            $rules['staff_role_id'] = ['required', 'integer', function ($attribute, $value, $fail) use ($managedRoles) {
                if (!$managedRoles->has((int)$value)) $fail('Choose a PMD access role.');
            }];
            $rules['username'] = [
                'required', 'alpha_dash', 'between:2,32',
                'unique:users,username'.($userId ? ','.$userId.',user_id' : ''),
            ];
            $rules['password'] = [$existingStaff ? 'nullable' : 'required', 'between:6,32'];
        }

        $validator = Validator::make($input, $rules);
        if ($validator->fails()) throw new ValidationException($validator);
        $clean = $validator->validated();

        DB::transaction(function () use ($existing, $existingStaff, $wantsAccess, $clean, $locationId, $id) {
            $linkedStaffId = $existingStaff ? (int)$existingStaff->staff_id : null;

            if ($wantsAccess) {
                $member = $existingStaff ?: new Staffs_model();
                $member->staff_name = $clean['display_name'];
                $member->staff_role_id = (int)$clean['staff_role_id'];
                $member->staff_status = 1;
                $member->sale_permission = 1;
                if (!$member->staff_email || !$member->exists) {
                    $member->staff_email = $this->technicalStaffEmail($clean['username']);
                }
                $member->save();

                $user = [
                    'username' => $clean['username'],
                    'super_user' => false,
                    'send_invite' => false,
                    'activate' => true,
                ];
                if (($clean['password'] ?? '') !== '') $user['password'] = $clean['password'];
                $member->addStaffUser($user);
                if ($locationId > 0) $member->addStaffLocations([$locationId]);
                $member->addStaffGroups([]);
                $linkedStaffId = (int)$member->staff_id;
            }

            $values = [
                'location_id' => $locationId,
                'staff_id' => $linkedStaffId,
                'display_name' => $clean['display_name'],
                'department' => trim((string)($clean['department'] ?? '')) ?: 'other',
                'job_role' => trim((string)($clean['job_role'] ?? '')) ?: null,
                'station_slug' => $existing ? ($existing->station_slug ?? null) : null,
                'is_active' => 1,
                'updated_at' => now(),
            ];

            if ($id > 0) {
                DB::table('pmd_operational_people')->where('id', $id)->where('location_id', $locationId)->update($values);
            } else {
                $values['created_at'] = now();
                DB::table('pmd_operational_people')->insert($values);
            }
        });

        return $this->redirectBackToSchedule($wantsAccess ? 'Team member and PMD access saved.' : 'Team member saved.');
    }

'''
pattern = re.compile(r"    /\*\* Compatibility endpoint\. New people should normally be created from Team\. \*/\n    public function saveperson\(\)\n    \{.*?\n    \}\n\n(?=    public function removeperson\(\))", re.S)
if not pattern.search(shifts):
    raise SystemExit('Missing saveperson method')
shifts = pattern.sub(new_saveperson, shifts, count=1)

# Team request handling endpoint.
request_method = r'''    public function handlerequest()
    {
        $this->assertOwnerOrManager();
        if (!Schema::hasTable('pmd_staff_requests')) abort(503, 'Staff request schema is not ready.');

        $validator = Validator::make(request()->all(), [
            'id' => ['required', 'integer', 'min:1'],
            'decision' => ['required', 'in:approved,declined'],
            'manager_reply' => ['nullable', 'string', 'max:1000'],
        ]);
        if ($validator->fails()) throw new ValidationException($validator);
        $clean = $validator->validated();

        $row = DB::table('pmd_staff_requests')
            ->where('id', (int)$clean['id'])
            ->where('location_id', $this->locationId())
            ->where('status', 'pending')
            ->first();
        if (!$row) abort(404);

        $staffId = 0;
        try { $staffId = (int)optional(AdminAuth::getUser()->staff)->staff_id; } catch (\Throwable $error) {}

        DB::table('pmd_staff_requests')->where('id', (int)$row->id)->update([
            'status' => $clean['decision'],
            'manager_reply' => trim((string)($clean['manager_reply'] ?? '')) ?: null,
            'handled_by_staff_id' => $staffId ?: null,
            'handled_at' => now(),
            'updated_at' => now(),
        ]);

        return $this->redirectBackToSchedule('Team request updated.');
    }

'''
shifts = replace_once(shifts,
    "    public function saveshift()\n    {",
    request_method + "    public function saveshift()\n    {",
    'request handler')

# Utility helper.
shifts = replace_once(shifts,
    "    private function redirectBackToSchedule(string $message)\n    {",
    "    private function technicalStaffEmail(string $username): string\n    {\n        $local = strtolower(trim(preg_replace('/[^a-z0-9._-]+/i', '-', $username), '-'));\n        if ($local === '') $local = 'staff';\n        return 'pmd-'.$local.'@staff.local';\n    }\n\n    private function redirectBackToSchedule(string $message)\n    {",
    'staff email helper')
write(shifts_path, shifts)

# -----------------------------------------------------------------------------
# 3) Shifts view: common team fields + access + pending requests + async month nav.
# -----------------------------------------------------------------------------
view_path = 'app/admin/views/pmdshifts/index.blade.php'
view = read(view_path)
view = replace_once(view,
    "    $capacity = $data['capacity'] ?? [];\n    $byDay = $shifts->groupBy(fn($s) => \\Carbon\\Carbon::parse($s->shift_date)->toDateString());",
    "    $capacity = $data['capacity'] ?? [];\n    $accessRoles = collect($data['access_roles'] ?? []);\n    $accessStaff = collect($data['access_staff'] ?? []);\n    $teamRequests = collect($data['team_requests'] ?? []);\n    $defaultAccessRole = $accessRoles->first(fn($role) => strtolower((string)$role->code) === \\Admin\\Services\\PmdDefaultStaffRoleService::TEAM_MEMBER) ?: $accessRoles->first();\n    $byDay = $shifts->groupBy(fn($s) => \\Carbon\\Carbon::parse($s->shift_date)->toDateString());",
    'view access vars')

old_boot_people = "    $bootPeople = $people->map(function($person) use ($departments) {\n        return [\n            'id' => (int)$person->id,\n            'name' => (string)$person->display_name,\n            'role' => (string)($person->job_role ?: ($departments[$person->department] ?? 'Team')),\n            'department' => (string)($person->department ?? 'other'),\n            'has_access' => !empty($person->staff_id),\n        ];\n    })->values();"
new_boot_people = "    $bootPeople = $people->map(function($person) use ($departments, $accessStaff) {\n        $staff = !empty($person->staff_id) ? $accessStaff->get((int)$person->staff_id) : null;\n        return [\n            'id' => (int)$person->id,\n            'name' => (string)$person->display_name,\n            'role' => (string)($person->job_role ?: ($departments[$person->department] ?? 'Team')),\n            'department' => (string)($person->department ?? 'other'),\n            'has_access' => !empty($person->staff_id),\n            'staff_id' => !empty($person->staff_id) ? (int)$person->staff_id : null,\n            'username' => $staff && $staff->user ? (string)$staff->user->username : '',\n            'staff_role_id' => $staff ? (int)$staff->staff_role_id : null,\n        ];\n    })->values();"
view = replace_once(view, old_boot_people, new_boot_people, 'boot people access')

view = replace_once(view,
    "                        <a href=\"{{ admin_url('shifts') }}?month={{ $monthStart->copy()->subMonth()->startOfMonth()->toDateString() }}\" aria-label=\"Previous month\">←</a>\n                        <strong>{{ $monthStart->format('F Y') }}</strong>\n                        <a href=\"{{ admin_url('shifts') }}?month={{ $monthStart->copy()->addMonth()->startOfMonth()->toDateString() }}\" aria-label=\"Next month\">→</a>",
    "                        <a data-pmd-shifts-month-nav href=\"{{ admin_url('shifts') }}?month={{ $monthStart->copy()->subMonth()->startOfMonth()->toDateString() }}\" aria-label=\"Previous month\">←</a>\n                        <strong data-pmd-shifts-month-title>{{ $monthStart->format('F Y') }}</strong>\n                        <a data-pmd-shifts-month-nav href=\"{{ admin_url('shifts') }}?month={{ $monthStart->copy()->addMonth()->startOfMonth()->toDateString() }}\" aria-label=\"Next month\">→</a>",
    'async month nav')

old_team_form = '''                    <form class="pmd-shifts__team-form" method="post" action="{{ admin_url('shifts/saveperson') }}" data-pmd-team-form>
                        @csrf
                        <input type="hidden" name="id" value="" data-pmd-team-person-id>
                        <input type="hidden" name="return_to" value="{{ $returnTo }}">
                        <div class="pmd-shifts__team-form-head"><strong data-pmd-team-form-title>Add person</strong><button type="button" data-pmd-team-new>New</button></div>
                        <label><span>Name</span><input required maxlength="128" name="display_name" data-pmd-team-name placeholder="e.g. Anna"></label>
                        <label><span>Role <small>optional</small></span><input maxlength="64" name="job_role" data-pmd-team-role placeholder="e.g. Waiter, Cashier, Chef"></label>
                        <label><span>Area <small>optional</small></span><select name="department" data-pmd-team-department>
                            @foreach($departments as $departmentKey => $departmentLabel)<option value="{{ $departmentKey }}">{{ $departmentLabel }}</option>@endforeach
                        </select></label>
                        <button type="submit" class="pmd-shifts__button">Save person</button>
                    </form>'''
new_team_form = '''                    <form class="pmd-shifts__team-form" method="post" action="{{ admin_url('shifts/saveperson') }}" data-pmd-team-form data-default-access-role="{{ (int)optional($defaultAccessRole)->staff_role_id }}">
                        @csrf
                        <input type="hidden" name="id" value="" data-pmd-team-person-id>
                        <input type="hidden" name="return_to" value="{{ $returnTo }}">
                        <div class="pmd-shifts__team-form-head"><strong data-pmd-team-form-title>Add team member</strong><button type="button" data-pmd-team-new>New</button></div>
                        <label><span>Name</span><input required maxlength="128" name="display_name" data-pmd-team-name placeholder="e.g. Anna"></label>
                        <div class="pmd-shifts__team-identity-row">
                            <label><span>Job role <small>optional</small></span><input maxlength="64" name="job_role" data-pmd-team-role placeholder="e.g. Bartender, Chef"></label>
                            <label><span>Area <small>optional</small></span><select name="department" data-pmd-team-department>
                                @foreach($departments as $departmentKey => $departmentLabel)<option value="{{ $departmentKey }}">{{ $departmentLabel }}</option>@endforeach
                            </select></label>
                        </div>

                        <label class="pmd-shifts__team-access-toggle">
                            <input type="checkbox" name="give_access" value="1" checked data-pmd-team-access-toggle>
                            <span><strong>Give PMD login</strong><small>Recommended for My Work. Turn off for roster-only people.</small></span>
                        </label>

                        <div class="pmd-shifts__team-access-fields" data-pmd-team-access-fields>
                            <label><span>Username</span><input maxlength="32" name="username" autocomplete="off" data-pmd-team-username placeholder="anna"></label>
                            <label><span>Access role</span><select name="staff_role_id" data-pmd-team-access-role>
                                @foreach($accessRoles as $accessRole)<option value="{{ (int)$accessRole->staff_role_id }}">{{ $accessRole->name }}</option>@endforeach
                            </select></label>
                            <label class="is-password"><span>Password <small data-pmd-team-password-hint>required for new login</small></span><span class="pmd-shifts__team-password-row"><input type="password" minlength="6" maxlength="32" name="password" autocomplete="new-password" data-pmd-team-password><button type="button" data-pmd-team-password-generate>Generate</button></span></label>
                            <small class="pmd-shifts__team-access-note">Team Member = personal My Work only. Choose Waiter/Cashier/KDS/etc only when operational access is actually needed.</small>
                        </div>
                        <button type="submit" class="pmd-shifts__button">Save member</button>
                    </form>'''
view = replace_once(view, old_team_form, new_team_form, 'unified team form')

# Add access datasets to team member button.
view = replace_once(view,
    "                                    data-department=\"{{ $person->department ?? 'other' }}\"\n                                >",
    "                                    data-department=\"{{ $person->department ?? 'other' }}\"\n                                    data-has-access=\"{{ !empty($person->staff_id) ? '1' : '0' }}\"\n                                    data-username=\"{{ !empty($person->staff_id) && $accessStaff->get((int)$person->staff_id) && $accessStaff->get((int)$person->staff_id)->user ? $accessStaff->get((int)$person->staff_id)->user->username : '' }}\"\n                                    data-staff-role-id=\"{{ !empty($person->staff_id) && $accessStaff->get((int)$person->staff_id) ? (int)$accessStaff->get((int)$person->staff_id)->staff_role_id : '' }}\"\n                                >",
    'team access datasets')

# Pending requests in same Team modal.
view = replace_once(view,
    "                    </section>\n                </div>\n                <footer class=\"pmd-shifts__modal-footer pmd-shifts__team-footer\">",
    "                    </section>\n\n                    <section class=\"pmd-shifts__team-requests\" aria-label=\"Pending team requests\">\n                        <header><strong>Requests</strong><span>{{ $teamRequests->count() ? $teamRequests->count().' pending' : 'Nothing waiting' }}</span></header>\n                        <div class=\"pmd-shifts__team-request-list\">\n                            @forelse($teamRequests as $teamRequest)\n                                <article class=\"pmd-shifts__team-request\">\n                                    <div><strong>{{ $teamRequest->person_name ?: 'Team member' }}</strong><small>{{ ucfirst(str_replace('_',' ',(string)$teamRequest->request_type)) }}@if($teamRequest->date_from) · {{ \\Carbon\\Carbon::parse($teamRequest->date_from)->format('d M') }}@endif</small><p>{{ $teamRequest->message ?: 'No note' }}</p></div>\n                                    <div class=\"pmd-shifts__team-request-actions\">\n                                        <form method=\"post\" action=\"{{ admin_url('shifts/handlerequest') }}\">@csrf<input type=\"hidden\" name=\"id\" value=\"{{ (int)$teamRequest->id }}\"><input type=\"hidden\" name=\"decision\" value=\"approved\"><input type=\"hidden\" name=\"return_to\" value=\"{{ $returnTo }}\"><button type=\"submit\">Approve</button></form>\n                                        <form method=\"post\" action=\"{{ admin_url('shifts/handlerequest') }}\">@csrf<input type=\"hidden\" name=\"id\" value=\"{{ (int)$teamRequest->id }}\"><input type=\"hidden\" name=\"decision\" value=\"declined\"><input type=\"hidden\" name=\"return_to\" value=\"{{ $returnTo }}\"><button type=\"submit\" class=\"is-decline\">Decline</button></form>\n                                    </div>\n                                </article>\n                            @empty\n                                <div class=\"pmd-shifts__team-empty\">No pending shift, leave or manager-message requests.</div>\n                            @endforelse\n                        </div>\n                    </section>\n                </div>\n                <footer class=\"pmd-shifts__modal-footer pmd-shifts__team-footer\">",
    'team request list')
write(view_path, view)

# -----------------------------------------------------------------------------
# 4) Shifts JS: Excel-like blank columns, async month navigation, quick access form,
#    and viewport-safe modal opening.
# -----------------------------------------------------------------------------
js_path = 'app/admin/assets/js/pmd-shifts-v1.js'
js = read(js_path)
js = js.replace('data-pmd-shifts-exact-ui-v9', 'data-pmd-shifts-exact-ui-v10')
js = js.replace('pmd-shifts-dashboard-reservations-v4.css?v=9', 'pmd-shifts-dashboard-reservations-v4.css?v=10')

js = replace_once(js,
    "  var teamDepartmentInput = teamModal && teamModal.querySelector('[data-pmd-team-department]');\n  var teamFormTitle = teamModal && teamModal.querySelector('[data-pmd-team-form-title]');",
    "  var teamDepartmentInput = teamModal && teamModal.querySelector('[data-pmd-team-department]');\n  var teamAccessToggle = teamModal && teamModal.querySelector('[data-pmd-team-access-toggle]');\n  var teamAccessFields = teamModal && teamModal.querySelector('[data-pmd-team-access-fields]');\n  var teamUsernameInput = teamModal && teamModal.querySelector('[data-pmd-team-username]');\n  var teamAccessRoleInput = teamModal && teamModal.querySelector('[data-pmd-team-access-role]');\n  var teamPasswordInput = teamModal && teamModal.querySelector('[data-pmd-team-password]');\n  var teamPasswordHint = teamModal && teamModal.querySelector('[data-pmd-team-password-hint]');\n  var teamFormTitle = teamModal && teamModal.querySelector('[data-pmd-team-form-title]');\n  var teamUsernameTouched = false;",
    'team access JS refs')

js = replace_once(js,
    "  function resetTeamForm() {\n    if (!teamForm) return;\n    teamForm.reset();\n    if (teamIdInput) teamIdInput.value = '';\n    if (teamDepartmentInput) teamDepartmentInput.value = 'other';\n    if (teamFormTitle) teamFormTitle.textContent = 'Add person';\n  }",
    "  function syncTeamAccessFields() {\n    if (!teamAccessFields || !teamAccessToggle) return;\n    teamAccessFields.hidden = !teamAccessToggle.checked;\n    teamAccessFields.querySelectorAll('input,select').forEach(function (field) { field.disabled = !teamAccessToggle.checked; });\n  }\n\n  function suggestedUsername(name) {\n    var value = String(name || '').trim().toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g, '');\n    value = value.replace(/[^a-z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 28);\n    return value || 'team-member';\n  }\n\n  function resetTeamForm() {\n    if (!teamForm) return;\n    teamForm.reset();\n    if (teamIdInput) teamIdInput.value = '';\n    if (teamDepartmentInput) teamDepartmentInput.value = 'other';\n    if (teamFormTitle) teamFormTitle.textContent = 'Add team member';\n    if (teamAccessToggle) { teamAccessToggle.checked = true; teamAccessToggle.disabled = false; }\n    if (teamAccessRoleInput) teamAccessRoleInput.value = teamForm.getAttribute('data-default-access-role') || teamAccessRoleInput.value;\n    if (teamPasswordInput) teamPasswordInput.value = '';\n    if (teamPasswordHint) teamPasswordHint.textContent = 'required for new login';\n    teamUsernameTouched = false;\n    syncTeamAccessFields();\n  }",
    'team access reset')

js = replace_once(js,
    "      if (teamDepartmentInput) teamDepartmentInput.value = personNode.getAttribute('data-department') || 'other';\n      if (teamFormTitle) teamFormTitle.textContent = 'Edit person';\n    }\n    teamModal.hidden = false;",
    "      if (teamDepartmentInput) teamDepartmentInput.value = personNode.getAttribute('data-department') || 'other';\n      var hasAccess = personNode.getAttribute('data-has-access') === '1';\n      if (teamAccessToggle) { teamAccessToggle.checked = hasAccess; teamAccessToggle.disabled = hasAccess; }\n      if (teamUsernameInput) teamUsernameInput.value = personNode.getAttribute('data-username') || suggestedUsername(personNode.getAttribute('data-name'));\n      if (teamAccessRoleInput && personNode.getAttribute('data-staff-role-id')) teamAccessRoleInput.value = personNode.getAttribute('data-staff-role-id');\n      if (teamPasswordInput) teamPasswordInput.value = '';\n      if (teamPasswordHint) teamPasswordHint.textContent = hasAccess ? 'leave blank to keep current password' : 'required for new login';\n      if (teamFormTitle) teamFormTitle.textContent = 'Edit team member';\n      teamUsernameTouched = hasAccess;\n      syncTeamAccessFields();\n    }\n    teamModal.hidden = false;",
    'team access edit')

# Make all modal cards reset their own scroll position when opened.
js = js.replace("    modal.hidden = false;\n    modal.setAttribute('aria-hidden', 'false');", "    modal.hidden = false;\n    modal.scrollTop = 0;\n    var modalBody = modal.querySelector('.pmd-shifts__modal-body');\n    if (modalBody) modalBody.scrollTop = 0;\n    modal.setAttribute('aria-hidden', 'false');", 1)
js = js.replace("    capacityModal.hidden = false;\n    capacityModal.setAttribute('aria-hidden', 'false');", "    capacityModal.hidden = false;\n    capacityModal.scrollTop = 0;\n    var capacityBody = capacityModal.querySelector('.pmd-shifts__modal-body');\n    if (capacityBody) capacityBody.scrollTop = 0;\n    capacityModal.setAttribute('aria-hidden', 'false');", 1)
js = js.replace("    teamModal.hidden = false;\n    teamModal.setAttribute('aria-hidden', 'false');", "    teamModal.hidden = false;\n    teamModal.scrollTop = 0;\n    var teamCard = teamModal.querySelector('.pmd-shifts__team-card');\n    if (teamCard) teamCard.scrollTop = 0;\n    teamModal.setAttribute('aria-hidden', 'false');", 1)

# Excel-like filler columns.
js = replace_once(js,
    "    var shifts = shiftsForDate(key);\n    var people = schedulingPeople();\n    var rowCount = 40;",
    "    var shifts = shiftsForDate(key);\n    var people = schedulingPeople();\n    var availableWidth = Math.max(980, host.getBoundingClientRect().width || root.getBoundingClientRect().width || 980);\n    var visualColumnCount = Math.max(4, Math.min(6, Math.floor((availableWidth - 110) / 248)));\n    var fillerCount = Math.max(0, visualColumnCount - people.length);\n    var fillerIndexes = Array.from({length: fillerCount}, function (_, index) { return index; });\n    var rowCount = 40;",
    'filler column sizing')
js = replace_once(js,
    "    var headerCells = people.map(function (person) {\n      return '' +\n        '<th scope=\"col\" class=\"pmd-shifts-resource-person\">' +\n          '<span class=\"pmd-shifts-resource-person__avatar\">' + escapeHtml(personInitials(person.name)) + '</span>' +\n          '<span class=\"pmd-shifts-resource-person__copy\"><strong>' + escapeHtml(person.name || 'Team member') + '</strong><small>' + escapeHtml(person.role || 'Team') + '</small></span>' +\n          '<span class=\"pmd-shifts-resource-person__source' + (person.has_access ? ' is-access' : '') + '\">' + (person.has_access ? 'PMD access' : 'Restaurant team') + '</span>' +\n        '</th>';\n    }).join('');",
    "    var headerCells = people.map(function (person) {\n      return '' +\n        '<th scope=\"col\" class=\"pmd-shifts-resource-person\">' +\n          '<span class=\"pmd-shifts-resource-person__avatar\">' + escapeHtml(personInitials(person.name)) + '</span>' +\n          '<span class=\"pmd-shifts-resource-person__copy\"><strong>' + escapeHtml(person.name || 'Team member') + '</strong><small>' + escapeHtml(person.role || 'Team') + '</small></span>' +\n          '<span class=\"pmd-shifts-resource-person__source' + (person.has_access ? ' is-access' : '') + '\">' + (person.has_access ? 'PMD access' : 'Restaurant team') + '</span>' +\n        '</th>';\n    }).join('') + fillerIndexes.map(function () {\n      return '<th scope=\"col\" class=\"pmd-shifts-resource-person is-filler\" aria-hidden=\"true\"></th>';\n    }).join('');",
    'filler headers')
js = replace_once(js,
    "      }).join('');\n      bodyRows.push('<tr><th scope=\"row\" class=\"pmd-shifts-resource-time\"><strong>' + slotTime + '</strong><span>' + (rowIndex % 2 === 0 ? 'hour' : 'half') + '</span></th>' + cells + '</tr>');",
    "      }).join('');\n      var fillerCells = fillerIndexes.map(function () { return '<td class=\"pmd-shifts-resource-cell is-filler\" aria-hidden=\"true\"></td>'; }).join('');\n      bodyRows.push('<tr><th scope=\"row\" class=\"pmd-shifts-resource-time\"><strong>' + slotTime + '</strong><span>' + (rowIndex % 2 === 0 ? 'hour' : 'half') + '</span></th>' + cells + fillerCells + '</tr>');",
    'filler body cells')

# Async month navigation using server-rendered calendar as the single rendering authority.
async_block = r'''
  function parseEmbeddedJson(doc, id) {
    try {
      var node = doc.getElementById(id);
      return JSON.parse((node && node.textContent) || '{}') || {};
    } catch (error) {
      return {};
    }
  }

  function refreshVisibleKpis() {
    visibleKpiCards().forEach(function (card) {
      var key = card.getAttribute('data-pmd-shifts-kpi-key') || '';
      if (key && kpiCards[key]) applyKpi(card, key);
    });
  }

  function loadCalendarUrl(url, pushHistory) {
    var frame = root.querySelector('[data-pmd-shifts-calendar-frame]');
    if (!frame) return Promise.reject(new Error('Calendar frame missing'));
    frame.classList.add('is-loading');
    return fetch(url, {credentials: 'same-origin', headers: {'X-Requested-With': 'XMLHttpRequest'}})
      .then(function (response) {
        if (!response.ok) throw new Error('Calendar request failed');
        return response.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var nextFrame = doc.querySelector('[data-pmd-shifts-calendar-frame]');
        if (!nextFrame) throw new Error('Calendar response missing frame');
        frame.innerHTML = nextFrame.innerHTML;
        boot = parseEmbeddedJson(doc, 'pmd-shifts-bootstrap');
        kpiCards = parseEmbeddedJson(doc, 'pmd-shifts-kpi-data');
        refreshVisibleKpis();
        var calendar = root.querySelector('[data-pmd-shifts-calendar]');
        var host = root.querySelector('[data-pmd-shifts-hour-host]');
        if (calendar) calendar.classList.remove('is-timeslot-screen');
        if (host) host.hidden = true;
        frame.hidden = false;
        if (pushHistory !== false) history.pushState({pmdShiftsMonth: true}, '', url);
        return boot;
      })
      .finally(function () { frame.classList.remove('is-loading'); });
  }
'''
js = replace_once(js,
    "  function changeHourDay(delta) {",
    async_block + "\n  function changeHourDay(delta) {",
    'async month functions')

js = replace_once(js,
    "    if (monthKey(next) !== String(boot.month || '')) {\n      var base = (boot.urls && boot.urls.shifts) || window.location.pathname;\n      window.location.href = base + '?month=' + encodeURIComponent(monthKey(next)) + '&day=' + encodeURIComponent(next) + '#pmd-shift-day';\n      return;\n    }\n    renderHourView(next);",
    "    if (monthKey(next) !== String(boot.month || '')) {\n      var base = (boot.urls && boot.urls.shifts) || window.location.pathname;\n      var url = base + '?month=' + encodeURIComponent(monthKey(next));\n      loadCalendarUrl(url, false).then(function () { renderHourView(next); }).catch(function () { window.location.href = url + '&day=' + encodeURIComponent(next) + '#pmd-shift-day'; });\n      return;\n    }\n    renderHourView(next);",
    'cross-month day navigation')

# Inject event handlers at start of document click delegation.
click_anchor = "  document.addEventListener('click', function (event) {\n    var kpiButton = event.target.closest('[data-pmd-shifts-kpi-menu-button]');"
click_new = "  document.addEventListener('click', function (event) {\n    var monthNav = event.target.closest('[data-pmd-shifts-month-nav]');\n    if (monthNav && root.contains(monthNav)) {\n      event.preventDefault();\n      loadCalendarUrl(monthNav.href, true).catch(function () { window.location.href = monthNav.href; });\n      return;\n    }\n\n    var generatePassword = event.target.closest('[data-pmd-team-password-generate]');\n    if (generatePassword && teamModal && teamModal.contains(generatePassword)) {\n      event.preventDefault();\n      var alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';\n      var password = '';\n      for (var p = 0; p < 12; p += 1) password += alphabet.charAt(Math.floor(Math.random() * alphabet.length));\n      if (teamPasswordInput) { teamPasswordInput.value = password; teamPasswordInput.type = 'text'; teamPasswordInput.focus(); teamPasswordInput.select(); }\n      return;\n    }\n\n    var kpiButton = event.target.closest('[data-pmd-shifts-kpi-menu-button]');"
js = replace_once(js, click_anchor, click_new, 'click handlers')

# Input/change listeners and browser history support before final load calls.
js = replace_once(js,
    "  loadExactSharedUiCss();\n  syncKpiMenus();",
    "  if (teamAccessToggle) teamAccessToggle.addEventListener('change', syncTeamAccessFields);\n  if (teamUsernameInput) teamUsernameInput.addEventListener('input', function () { teamUsernameTouched = true; });\n  if (teamNameInput) teamNameInput.addEventListener('input', function () {\n    if (teamUsernameInput && !teamUsernameTouched) teamUsernameInput.value = suggestedUsername(teamNameInput.value);\n  });\n  window.addEventListener('popstate', function () {\n    if (!root.querySelector('[data-pmd-shifts-calendar-frame]')) return;\n    loadCalendarUrl(window.location.href, false).catch(function () {});\n  });\n\n  loadExactSharedUiCss();\n  syncKpiMenus();",
    'team input and popstate')
write(js_path, js)

# -----------------------------------------------------------------------------
# 5) Shifts CSS polish: full sheet, filler cells, viewport-safe modals/access/request UI.
# -----------------------------------------------------------------------------
visual_path = 'app/admin/assets/css/pmd-shifts-dashboard-reservations-v4.css'
visual = read(visual_path)
visual = visual.replace('margin:0 auto;border:1px solid #dce7ee', 'margin:0;border:1px solid #dce7ee', 1)
visual += r'''

/* PMD_SHIFTS_FULL_SHEET_AND_ASYNC_MONTH_V10 */
body.pmd-shifts-page .pmd-shifts-resource-scroll{background:#f5f9fc;padding:0;box-shadow:none}
body.pmd-shifts-page .pmd-shifts-resource-table{border-radius:0;box-shadow:none;min-height:100%}
body.pmd-shifts-page .pmd-shifts-resource-person.is-filler{background:#f8fbfd}
body.pmd-shifts-page .pmd-shifts-resource-cell.is-filler{background:#fff}
body.pmd-shifts-page .pmd-shifts-resource-cell.is-filler:hover{background:#fff}
body.pmd-shifts-page .pmd-r2-yc-calendar-frame.is-loading{opacity:.58;pointer-events:none}
body.pmd-shifts-page .pmd-r2-yc-calendar-frame{transition:opacity .12s ease}
'''
write(visual_path, visual)

base_css_path = 'app/admin/assets/css/pmd-shifts-v1.css'
base_css = read(base_css_path)
base_css += r'''

/* PMD_SHIFTS_UNIFIED_TEAM_MODAL_V10 */
body.pmd-shifts-page .pmd-shifts__modal{align-items:start;overflow-y:auto;padding:18px 20px;overscroll-behavior:contain}
body.pmd-shifts-page .pmd-shifts__modal-card{margin:auto;max-height:calc(100dvh - 36px)}
body.pmd-shifts-page .pmd-shifts__modal-body{min-height:0;overflow:auto;overscroll-behavior:contain}
body.pmd-shifts-page .pmd-shifts__team-card{width:min(1080px,calc(100vw - 30px));overflow:hidden}
body.pmd-shifts-page .pmd-shifts__team-layout{grid-template-columns:minmax(300px,360px) minmax(300px,1fr) minmax(300px,1fr);min-height:0;overflow:auto;align-items:start}
body.pmd-shifts-page .pmd-shifts__team-identity-row{display:grid;grid-template-columns:1fr 1fr;gap:9px}
body.pmd-shifts-page .pmd-shifts__team-access-toggle{display:grid!important;grid-template-columns:auto 1fr;align-items:center;gap:10px;padding:11px;border:1px solid #cfe0e8;border-radius:12px;background:#fff;cursor:pointer}
body.pmd-shifts-page .pmd-shifts__team-access-toggle input{width:18px;height:18px;accent-color:#08745c}
body.pmd-shifts-page .pmd-shifts__team-access-toggle span{display:grid;gap:2px}
body.pmd-shifts-page .pmd-shifts__team-access-toggle strong{font-size:11px;color:#17342f}
body.pmd-shifts-page .pmd-shifts__team-access-toggle small{font-size:9px;color:#7c8d88}
body.pmd-shifts-page .pmd-shifts__team-access-fields{display:grid;gap:9px;padding:11px;border:1px solid #d9e8e3;border-radius:13px;background:#f5fbf8}
body.pmd-shifts-page .pmd-shifts__team-access-fields[hidden]{display:none}
body.pmd-shifts-page .pmd-shifts__team-password-row{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:7px}
body.pmd-shifts-page .pmd-shifts__team-password-row button{border:1px solid #cfe0e8;border-radius:10px;background:#fff;color:#075f4f;font-size:9.5px;font-weight:850;padding:0 9px;cursor:pointer}
body.pmd-shifts-page .pmd-shifts__team-access-note{color:#6f817c;font-size:9px;line-height:1.4}
body.pmd-shifts-page .pmd-shifts__team-requests{display:grid;align-content:start;gap:9px;min-width:0}
body.pmd-shifts-page .pmd-shifts__team-requests>header{display:flex;align-items:end;justify-content:space-between;gap:10px;padding:2px}
body.pmd-shifts-page .pmd-shifts__team-requests>header strong{font-size:14px;color:#17342f}
body.pmd-shifts-page .pmd-shifts__team-requests>header span{font-size:10px;color:#7a8a86}
body.pmd-shifts-page .pmd-shifts__team-request-list{display:grid;gap:7px;max-height:430px;overflow:auto}
body.pmd-shifts-page .pmd-shifts__team-request{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:10px;padding:10px;border:1px solid #dbe6ec;border-radius:13px;background:#fff}
body.pmd-shifts-page .pmd-shifts__team-request strong,body.pmd-shifts-page .pmd-shifts__team-request small{display:block}
body.pmd-shifts-page .pmd-shifts__team-request strong{font-size:11px;color:#17342f}
body.pmd-shifts-page .pmd-shifts__team-request small{margin-top:2px;font-size:9px;color:#72817d}
body.pmd-shifts-page .pmd-shifts__team-request p{margin:5px 0 0;color:#536862;font-size:9.5px;line-height:1.4}
body.pmd-shifts-page .pmd-shifts__team-request-actions{display:flex;gap:5px;align-items:start}
body.pmd-shifts-page .pmd-shifts__team-request-actions form{margin:0}
body.pmd-shifts-page .pmd-shifts__team-request-actions button{min-height:30px;padding:0 8px;border:1px solid #9bcdb9;border-radius:8px;background:#edf9f4;color:#075f4f;font-size:9px;font-weight:850;cursor:pointer}
body.pmd-shifts-page .pmd-shifts__team-request-actions button.is-decline{border-color:#e4c6c6;background:#fff6f6;color:#9a3434}
@media(max-width:980px){body.pmd-shifts-page .pmd-shifts__team-layout{grid-template-columns:1fr}body.pmd-shifts-page .pmd-shifts__team-requests{max-width:none}}
@media(max-width:560px){body.pmd-shifts-page .pmd-shifts__team-identity-row{grid-template-columns:1fr}}
'''
write(base_css_path, base_css)

# -----------------------------------------------------------------------------
# 6) My Work: personal staff profile/schedule/request page.
# -----------------------------------------------------------------------------
mywork_controller = r'''<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminAuth;
use Admin\Facades\AdminLocation;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\ValidationException;

/** PMD_MY_WORK_V1 */
class Mywork extends AdminController
{
    protected $requiredPermissions = null;

    public function __construct()
    {
        parent::__construct();
        $this->bodyClass = trim(($this->bodyClass ?? '').' pmd-my-work-page');
        $this->addCss('css/pmd-my-work-v1.css');
        AdminMenu::setContext('dashboard');
    }

    public function index()
    {
        Template::setTitle('My Work');
        Template::setHeading('My Work');

        $locationId = $this->locationId();
        $staffId = $this->staffId();
        $person = null;
        if ($staffId > 0 && Schema::hasTable('pmd_operational_people')) {
            $person = DB::table('pmd_operational_people')
                ->where('location_id', $locationId)
                ->where('staff_id', $staffId)
                ->where('is_active', 1)
                ->first();
        }

        $shifts = collect();
        if ($person && Schema::hasTable('pmd_operational_shift_people') && Schema::hasTable('pmd_operational_shifts')) {
            $from = now()->subMonth()->startOfDay()->toDateString();
            $to = now()->addMonths(2)->endOfDay()->toDateString();
            $shifts = DB::table('pmd_operational_shift_people as assignment')
                ->join('pmd_operational_shifts as shift', 'shift.id', '=', 'assignment.shift_id')
                ->where('shift.location_id', $locationId)
                ->where('assignment.person_id', (int)$person->id)
                ->whereBetween('shift.shift_date', [$from, $to])
                ->whereNotIn('shift.status', ['cancelled', 'canceled'])
                ->select(['shift.id', 'shift.shift_date', 'shift.label', 'shift.starts_at', 'shift.ends_at', 'shift.status', 'assignment.attendance_status'])
                ->orderBy('shift.shift_date')
                ->orderBy('shift.starts_at')
                ->get();
        }

        $requests = collect();
        if ($staffId > 0 && Schema::hasTable('pmd_staff_requests')) {
            $requests = DB::table('pmd_staff_requests')
                ->where('location_id', $locationId)
                ->where('staff_id', $staffId)
                ->orderByDesc('created_at')
                ->limit(20)
                ->get();
        }

        $this->vars['pmdMyWork'] = [
            'staff_id' => $staffId,
            'person' => $person,
            'shifts' => $shifts,
            'requests' => $requests,
            'requests_ready' => Schema::hasTable('pmd_staff_requests'),
        ];

        return $this->makeView('pmdmywork/index');
    }

    public function saverequest()
    {
        if (!Schema::hasTable('pmd_staff_requests')) abort(503, 'Staff request schema is not ready.');
        $staffId = $this->staffId();
        if ($staffId < 1) abort(403);
        $locationId = $this->locationId();
        $person = DB::table('pmd_operational_people')
            ->where('location_id', $locationId)
            ->where('staff_id', $staffId)
            ->where('is_active', 1)
            ->first();
        if (!$person) abort(403, 'Your PMD account is not linked to a restaurant team profile yet.');

        $validator = Validator::make(request()->all(), [
            'request_type' => ['required', 'in:shift_change,time_off,message'],
            'shift_id' => ['nullable', 'integer', 'min:1'],
            'date_from' => ['nullable', 'date'],
            'date_to' => ['nullable', 'date'],
            'message' => ['required', 'string', 'min:2', 'max:2000'],
        ]);
        if ($validator->fails()) throw new ValidationException($validator);
        $clean = $validator->validated();

        $shiftId = !empty($clean['shift_id']) ? (int)$clean['shift_id'] : null;
        if ($shiftId) {
            $ownsShift = DB::table('pmd_operational_shift_people as assignment')
                ->join('pmd_operational_shifts as shift', 'shift.id', '=', 'assignment.shift_id')
                ->where('assignment.person_id', (int)$person->id)
                ->where('assignment.shift_id', $shiftId)
                ->where('shift.location_id', $locationId)
                ->exists();
            if (!$ownsShift) throw ValidationException::withMessages(['shift_id' => 'Choose one of your own shifts.']);
        }

        $dateFrom = !empty($clean['date_from']) ? Carbon::parse($clean['date_from'])->toDateString() : null;
        $dateTo = !empty($clean['date_to']) ? Carbon::parse($clean['date_to'])->toDateString() : null;
        if ($dateFrom && $dateTo && $dateTo < $dateFrom) throw ValidationException::withMessages(['date_to' => 'End date must be after start date.']);

        DB::table('pmd_staff_requests')->insert([
            'location_id' => $locationId,
            'staff_id' => $staffId,
            'person_id' => (int)$person->id,
            'request_type' => $clean['request_type'],
            'shift_id' => $shiftId,
            'date_from' => $dateFrom,
            'date_to' => $dateTo,
            'message' => trim((string)$clean['message']),
            'status' => 'pending',
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        return redirect(admin_url('mywork'))->with('success', 'Request sent to your manager.');
    }

    private function staffId(): int
    {
        try { return (int)optional(AdminAuth::getUser()->staff)->staff_id; }
        catch (\Throwable $error) { return 0; }
    }

    private function locationId(): int
    {
        try { $id = (int)AdminLocation::getId(); if ($id > 0) return $id; }
        catch (\Throwable $error) {}
        return 1;
    }
}
'''
write('app/admin/controllers/Mywork.php', mywork_controller)

mywork_view = r'''@php
    $data = $pmdMyWork ?? [];
    $person = $data['person'] ?? null;
    $shifts = collect($data['shifts'] ?? []);
    $requests = collect($data['requests'] ?? []);
    $upcoming = $shifts->filter(fn($shift) => \Carbon\Carbon::parse($shift->shift_date)->endOfDay()->gte(now()->startOfDay()))->values();
    $past = $shifts->filter(fn($shift) => \Carbon\Carbon::parse($shift->shift_date)->endOfDay()->lt(now()->startOfDay()))->reverse()->take(8)->values();
@endphp

<div class="pmd-my-work" data-pmd-my-work>
    <header class="pmd-my-work__header">
        <div><span>My Work</span><h1>{{ $person->display_name ?? optional(optional(\Admin\Facades\AdminAuth::getUser())->staff)->staff_name ?? 'My profile' }}</h1><p>{{ $person ? (($person->job_role ?: 'Team member').' · '.ucfirst((string)$person->department)) : 'Ask your manager to link this PMD account to your Team profile.' }}</p></div>
        <a href="{{ admin_url('logout') }}">Sign out</a>
    </header>

    @if(!$person)
        <section class="pmd-my-work__notice"><strong>Profile link needed</strong><p>Your login works, but it is not linked to a restaurant Team member yet. Your manager can open Shifts → Team and link/create your account there.</p></section>
    @else
        <section class="pmd-my-work__stats">
            <article><span>Next shift</span><strong>{{ $upcoming->first() ? \Carbon\Carbon::parse($upcoming->first()->shift_date)->format('D d M') : '—' }}</strong><small>{{ $upcoming->first() ? substr((string)$upcoming->first()->starts_at,0,5).'–'.substr((string)$upcoming->first()->ends_at,0,5) : 'Nothing planned' }}</small></article>
            <article><span>Upcoming</span><strong>{{ $upcoming->count() }}</strong><small>scheduled shifts</small></article>
            <article><span>Requests</span><strong>{{ $requests->where('status','pending')->count() }}</strong><small>waiting for manager</small></article>
        </section>

        <main class="pmd-my-work__grid">
            <section class="pmd-my-work__card">
                <header><div><span>Schedule</span><h2>My shifts</h2></div></header>
                <div class="pmd-my-work__shift-list">
                    @forelse($upcoming as $shift)
                        <article class="pmd-my-work__shift">
                            <time><strong>{{ \Carbon\Carbon::parse($shift->shift_date)->format('d') }}</strong><small>{{ \Carbon\Carbon::parse($shift->shift_date)->format('M') }}</small></time>
                            <div><strong>{{ $shift->label ?: 'Shift' }}</strong><span>{{ substr((string)$shift->starts_at,0,5) ?: 'All day' }}@if($shift->ends_at)–{{ substr((string)$shift->ends_at,0,5) }}@endif</span></div>
                            <button type="button" data-pmd-my-work-request="shift_change" data-shift-id="{{ (int)$shift->id }}">Request change</button>
                        </article>
                    @empty
                        <div class="pmd-my-work__empty">No upcoming shifts yet.</div>
                    @endforelse
                </div>
                @if($past->isNotEmpty())
                    <details class="pmd-my-work__past"><summary>Previous shifts</summary>@foreach($past as $shift)<div><span>{{ \Carbon\Carbon::parse($shift->shift_date)->format('d M Y') }}</span><strong>{{ $shift->label }}</strong><small>{{ substr((string)$shift->starts_at,0,5) }}–{{ substr((string)$shift->ends_at,0,5) }}</small></div>@endforeach</details>
                @endif
            </section>

            <section class="pmd-my-work__card">
                <header><div><span>Requests</span><h2>Ask manager</h2></div></header>
                @if(!empty($data['requests_ready']))
                    <form method="post" action="{{ admin_url('mywork/saverequest') }}" class="pmd-my-work__request-form" data-pmd-my-work-request-form>
                        @csrf
                        <input type="hidden" name="request_type" value="message" data-pmd-my-work-request-type>
                        <input type="hidden" name="shift_id" value="" data-pmd-my-work-shift-id>
                        <div class="pmd-my-work__request-types">
                            <button type="button" class="is-active" data-pmd-my-work-type="message">Message</button>
                            <button type="button" data-pmd-my-work-type="time_off">Time off</button>
                            <button type="button" data-pmd-my-work-type="shift_change">Shift change</button>
                        </div>
                        <div class="pmd-my-work__dates" data-pmd-my-work-dates hidden><label>From<input type="date" name="date_from"></label><label>To<input type="date" name="date_to"></label></div>
                        <label class="pmd-my-work__message"><span>Message</span><textarea required minlength="2" maxlength="2000" rows="5" name="message" placeholder="Write a short note to your manager…"></textarea></label>
                        <button type="submit" class="pmd-my-work__send">Send request</button>
                    </form>
                @else
                    <div class="pmd-my-work__empty">Requests are being prepared. Ask your manager to run the latest PMD update.</div>
                @endif
            </section>

            <section class="pmd-my-work__card is-wide">
                <header><div><span>Status</span><h2>My requests</h2></div></header>
                <div class="pmd-my-work__request-list">
                    @forelse($requests as $request)
                        <article><div><strong>{{ ucfirst(str_replace('_',' ',(string)$request->request_type)) }}</strong><small>{{ \Carbon\Carbon::parse($request->created_at)->format('d M · H:i') }}</small><p>{{ $request->message }}</p>@if($request->manager_reply)<em>{{ $request->manager_reply }}</em>@endif</div><span class="is-{{ $request->status }}">{{ ucfirst((string)$request->status) }}</span></article>
                    @empty
                        <div class="pmd-my-work__empty">No requests yet.</div>
                    @endforelse
                </div>
            </section>
        </main>
    @endif
</div>

<script>
(function(){
  var root=document.querySelector('[data-pmd-my-work]'); if(!root)return;
  var form=root.querySelector('[data-pmd-my-work-request-form]'); if(!form)return;
  var typeInput=form.querySelector('[data-pmd-my-work-request-type]');
  var shiftInput=form.querySelector('[data-pmd-my-work-shift-id]');
  var dates=form.querySelector('[data-pmd-my-work-dates]');
  function selectType(type,shiftId){
    if(typeInput)typeInput.value=type;
    if(shiftInput)shiftInput.value=shiftId||'';
    if(dates)dates.hidden=type!=='time_off';
    form.querySelectorAll('[data-pmd-my-work-type]').forEach(function(button){button.classList.toggle('is-active',button.getAttribute('data-pmd-my-work-type')===type);});
    var message=form.querySelector('textarea'); if(message)message.focus();
  }
  root.addEventListener('click',function(event){
    var type=event.target.closest('[data-pmd-my-work-type]'); if(type){event.preventDefault();selectType(type.getAttribute('data-pmd-my-work-type')||'message','');return;}
    var shift=event.target.closest('[data-pmd-my-work-request]'); if(shift){event.preventDefault();selectType(shift.getAttribute('data-pmd-my-work-request')||'shift_change',shift.getAttribute('data-shift-id')||'');form.scrollIntoView({behavior:'smooth',block:'center'});}
  });
})();
</script>
'''
write('app/admin/views/pmdmywork/index.blade.php', mywork_view)

mywork_css = r'''body.pmd-my-work-page{background:#f8fbfd;color:#10201f}.pmd-my-work{max-width:1180px;margin:0 auto;padding:16px 20px 80px;font-family:Inter,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}.pmd-my-work *{box-sizing:border-box}.pmd-my-work__header{display:flex;align-items:center;justify-content:space-between;gap:20px;min-height:74px;margin-bottom:16px}.pmd-my-work__header span,.pmd-my-work__card header span{color:#08745c;font-size:10px;font-weight:900;text-transform:uppercase;letter-spacing:.08em}.pmd-my-work__header h1{margin:3px 0 2px;font-size:26px;letter-spacing:-.035em}.pmd-my-work__header p{margin:0;color:#6d7f7a;font-size:11px}.pmd-my-work__header>a{min-height:40px;display:inline-flex;align-items:center;padding:0 12px;border:1px solid #cfe0e8;border-radius:11px;background:#fff;color:#173752;font-size:11px;font-weight:800;text-decoration:none}.pmd-my-work__notice,.pmd-my-work__card,.pmd-my-work__stats article{border:1px solid #dce8e4;border-radius:18px;background:#fff;box-shadow:0 8px 24px rgba(25,57,50,.04)}.pmd-my-work__notice{padding:18px}.pmd-my-work__notice strong{font-size:14px}.pmd-my-work__notice p{margin:5px 0 0;color:#6d7f7a;font-size:11px}.pmd-my-work__stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px;margin-bottom:14px}.pmd-my-work__stats article{padding:15px}.pmd-my-work__stats span,.pmd-my-work__stats small{display:block;color:#758681;font-size:10px}.pmd-my-work__stats strong{display:block;margin:7px 0 3px;font-size:22px}.pmd-my-work__grid{display:grid;grid-template-columns:1.15fr .85fr;gap:14px}.pmd-my-work__card{overflow:hidden}.pmd-my-work__card.is-wide{grid-column:1/-1}.pmd-my-work__card>header{padding:15px 17px;border-bottom:1px solid #e6efec;background:#fbfdfc}.pmd-my-work__card h2{margin:3px 0 0;font-size:18px;letter-spacing:-.025em}.pmd-my-work__shift-list,.pmd-my-work__request-list{display:grid;padding:8px 14px}.pmd-my-work__shift{display:grid;grid-template-columns:50px minmax(0,1fr) auto;align-items:center;gap:10px;min-height:68px;border-bottom:1px solid #edf2f0}.pmd-my-work__shift:last-child{border-bottom:0}.pmd-my-work__shift time{display:grid;width:42px;height:42px;place-items:center;border-radius:12px;background:#edf9f4;color:#075f4f}.pmd-my-work__shift time strong,.pmd-my-work__shift time small{line-height:1}.pmd-my-work__shift time strong{font-size:15px}.pmd-my-work__shift time small{font-size:8px;text-transform:uppercase}.pmd-my-work__shift>div strong,.pmd-my-work__shift>div span{display:block}.pmd-my-work__shift>div strong{font-size:12px}.pmd-my-work__shift>div span{margin-top:3px;color:#74837f;font-size:10px}.pmd-my-work__shift button{min-height:32px;padding:0 9px;border:1px solid #cfe0e8;border-radius:9px;background:#fff;color:#075f4f;font-size:9px;font-weight:850;cursor:pointer}.pmd-my-work__empty{padding:18px;color:#758681;font-size:11px}.pmd-my-work__past{margin:0 14px 14px;border:1px solid #e2ebe8;border-radius:12px;background:#fafdfc}.pmd-my-work__past summary{padding:10px 12px;color:#536a63;font-size:10px;font-weight:850;cursor:pointer}.pmd-my-work__past div{display:grid;grid-template-columns:90px 1fr auto;gap:10px;padding:8px 12px;border-top:1px solid #e8efed;font-size:9.5px}.pmd-my-work__request-form{display:grid;gap:10px;padding:14px}.pmd-my-work__request-types{display:grid;grid-template-columns:repeat(3,1fr);gap:6px}.pmd-my-work__request-types button{min-height:34px;border:1px solid #d6e4df;border-radius:9px;background:#fff;color:#526861;font-size:9px;font-weight:850;cursor:pointer}.pmd-my-work__request-types button.is-active{border-color:#8fc6b2;background:#edf9f4;color:#075f4f}.pmd-my-work__dates{display:grid;grid-template-columns:1fr 1fr;gap:8px}.pmd-my-work__dates[hidden]{display:none}.pmd-my-work__dates label,.pmd-my-work__message{display:grid;gap:5px;color:#38514a;font-size:9.5px;font-weight:800}.pmd-my-work__dates input,.pmd-my-work__message textarea{width:100%;padding:9px 10px;border:1px solid #cfe0e8;border-radius:10px;background:#fff;color:#102a43;font:inherit;outline:none}.pmd-my-work__message textarea{resize:vertical;min-height:110px}.pmd-my-work__send{min-height:40px;border:1px solid #075f4f;border-radius:11px;background:#075f4f;color:#fff;font-size:10px;font-weight:850;cursor:pointer}.pmd-my-work__request-list article{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;padding:11px 3px;border-bottom:1px solid #edf2f0}.pmd-my-work__request-list article:last-child{border-bottom:0}.pmd-my-work__request-list strong,.pmd-my-work__request-list small{display:block}.pmd-my-work__request-list strong{font-size:11px}.pmd-my-work__request-list small{margin-top:2px;color:#7a8985;font-size:9px}.pmd-my-work__request-list p{margin:5px 0 0;color:#536862;font-size:10px}.pmd-my-work__request-list em{display:block;margin-top:6px;padding:7px 8px;border-radius:8px;background:#f3f7f5;color:#536862;font-size:9px;font-style:normal}.pmd-my-work__request-list article>span{height:max-content;padding:4px 7px;border-radius:999px;background:#fff6d9;color:#8a6615;font-size:8px;font-weight:900;text-transform:uppercase}.pmd-my-work__request-list article>span.is-approved{background:#edf9f4;color:#087052}.pmd-my-work__request-list article>span.is-declined{background:#fff0f0;color:#a13d3d}@media(max-width:760px){.pmd-my-work__stats,.pmd-my-work__grid{grid-template-columns:1fr}.pmd-my-work__card.is-wide{grid-column:auto}.pmd-my-work__request-types{grid-template-columns:1fr}.pmd-my-work__header{align-items:flex-start}.pmd-my-work__shift{grid-template-columns:44px 1fr}.pmd-my-work__shift button{grid-column:2;width:max-content}.pmd-my-work__past div{grid-template-columns:1fr}.pmd-my-work__dates{grid-template-columns:1fr}}
'''
write('app/admin/assets/css/pmd-my-work-v1.css', mywork_css)

# -----------------------------------------------------------------------------
# 7) Additive request schema.
# -----------------------------------------------------------------------------
migration = r'''<?php

namespace System\Database\Migrations;

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

class CreatePmdStaffRequests extends Migration
{
    public function up()
    {
        if (Schema::hasTable('pmd_staff_requests')) return;

        Schema::create('pmd_staff_requests', function (Blueprint $table) {
            $table->bigIncrements('id');
            $table->unsignedBigInteger('location_id');
            $table->unsignedBigInteger('staff_id');
            $table->unsignedBigInteger('person_id')->nullable();
            $table->string('request_type', 32);
            $table->unsignedBigInteger('shift_id')->nullable();
            $table->date('date_from')->nullable();
            $table->date('date_to')->nullable();
            $table->text('message')->nullable();
            $table->string('status', 24)->default('pending');
            $table->text('manager_reply')->nullable();
            $table->unsignedBigInteger('handled_by_staff_id')->nullable();
            $table->timestamp('handled_at')->nullable();
            $table->timestamps();
            $table->index(['location_id', 'status'], 'pmd_staff_requests_location_status_idx');
            $table->index(['staff_id', 'status'], 'pmd_staff_requests_staff_status_idx');
            $table->index(['person_id', 'created_at'], 'pmd_staff_requests_person_created_idx');
        });
    }

    public function down()
    {
        Schema::dropIfExists('pmd_staff_requests');
    }
}
'''
write('app/system/database/migrations/2026_08_28_235500_create_pmd_staff_requests.php', migration)

print('PMD Shifts workspace V10 staged')
