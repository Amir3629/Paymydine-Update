from pathlib import Path
import re

# PMD185 V11: production hotfix + compact operations UI.
# Product scope is intentionally limited to Shifts controller/view/JS/CSS.

controller = Path('app/admin/controllers/Shifts.php')
text = controller.read_text()

old = """        if ($wantsAccess) {
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
"""
new = """        if ($wantsAccess) {
            // Mirror the canonical Team account guard before touching the DB.
            // This converts duplicate staff names into a normal form error
            // instead of allowing a lower-level account save to explode.
            $rules['display_name'][] = 'unique:staffs,staff_name'.($existingStaff ? ','.(int)$existingStaff->staff_id.',staff_id' : '');
            $rules['staff_role_id'] = ['required', 'integer', function ($attribute, $value, $fail) use ($managedRoles) {
                if (!$managedRoles->has((int)$value)) $fail('Choose a PMD access role.');
            }];
            $rules['username'] = [
                'required', 'alpha_dash', 'between:2,32',
                'unique:users,username'.($userId ? ','.$userId.',user_id' : ''),
            ];
            $rules['password'] = [$existingStaff ? 'nullable' : 'required', 'between:6,32'];
        }

        $validator = Validator::make($input, $rules, [
            'display_name.unique' => 'That name already has a PMD account. Use Advanced to manage the existing account.',
            'username.unique' => 'That username is already in use.',
            'password.required' => 'Add a password for the new PMD login.',
        ]);
        if ($validator->fails()) {
            return $this->redirectTeamFailure($validator->errors()->first());
        }
        $clean = $validator->validated();

        try {
            DB::transaction(function () use ($existing, $existingStaff, $wantsAccess, $clean, $locationId, $id) {
"""
if old not in text:
    raise SystemExit('saveperson validation anchor not found')
text = text.replace(old, new, 1)

old = """            if ($id > 0) {
                DB::table('pmd_operational_people')->where('id', $id)->where('location_id', $locationId)->update($values);
            } else {
                $values['created_at'] = now();
                DB::table('pmd_operational_people')->insert($values);
            }
        });

        return $this->redirectBackToSchedule($wantsAccess ? 'Team member and PMD access saved.' : 'Team member saved.');
    }
"""
new = """                if ($id > 0) {
                    DB::table('pmd_operational_people')->where('id', $id)->where('location_id', $locationId)->update($values);
                } else {
                    $values['created_at'] = now();
                    DB::table('pmd_operational_people')->insert($values);
                }
            });
        } catch (\\Throwable $error) {
            // A bad account edge-case must never surface as a raw HTTP 500
            // from the Owner's simple Team form. Keep the transaction atomic,
            // report the real exception server-side, and return a clean error.
            report($error);
            return $this->redirectTeamFailure('Could not save this member. Check the name, username and password, then try again.');
        }

        return $this->redirectBackToSchedule($wantsAccess ? 'Member + login saved.' : 'Member saved.');
    }
"""
if old not in text:
    raise SystemExit('saveperson transaction tail anchor not found')
text = text.replace(old, new, 1)

anchor = """    private function redirectBackToSchedule(string $message)
    {
"""
helper = """    private function redirectTeamFailure(string $message)
    {
        $back = trim((string)request()->input('return_to', ''));
        $target = ($back !== '' && str_starts_with($back, '/admin/')) ? $back : admin_url('shifts');
        return redirect($target)->with('error', $message)->withInput();
    }

    private function redirectBackToSchedule(string $message)
    {
"""
if anchor not in text:
    raise SystemExit('redirect helper anchor not found')
text = text.replace(anchor, helper, 1)
controller.write_text(text)

# JS: browser-native required fields + CSS cache bust.
js_path = Path('app/admin/assets/js/pmd-shifts-v1.js')
js = js_path.read_text()
js = js.replace("var teamUsernameTouched = false;", "var teamUsernameTouched = false;\n  var teamHasExistingAccess = false;", 1)
js = js.replace("data-pmd-shifts-exact-ui-v10", "data-pmd-shifts-exact-ui-v11")
js = js.replace("pmd-shifts-dashboard-reservations-v4.css?v=10", "pmd-shifts-dashboard-reservations-v4.css?v=11")

old = """  function syncTeamAccessFields() {
    if (!teamAccessFields || !teamAccessToggle) return;
    teamAccessFields.hidden = !teamAccessToggle.checked;
    teamAccessFields.querySelectorAll('input,select').forEach(function (field) { field.disabled = !teamAccessToggle.checked; });
  }
"""
new = """  function syncTeamAccessFields() {
    if (!teamAccessFields || !teamAccessToggle) return;
    var enabled = !!teamAccessToggle.checked;
    teamAccessFields.hidden = !enabled;
    teamAccessFields.querySelectorAll('input,select').forEach(function (field) { field.disabled = !enabled; });
    if (teamUsernameInput) teamUsernameInput.required = enabled;
    if (teamAccessRoleInput) teamAccessRoleInput.required = enabled;
    if (teamPasswordInput) teamPasswordInput.required = enabled && !teamHasExistingAccess;
  }
"""
if old not in js:
    raise SystemExit('syncTeamAccessFields anchor not found')
js = js.replace(old, new, 1)

old = """    teamUsernameTouched = false;
    syncTeamAccessFields();
  }
"""
new = """    teamUsernameTouched = false;
    teamHasExistingAccess = false;
    syncTeamAccessFields();
  }
"""
if old not in js:
    raise SystemExit('resetTeamForm anchor not found')
js = js.replace(old, new, 1)

old = """      var hasAccess = personNode.getAttribute('data-has-access') === '1';
      if (teamAccessToggle) { teamAccessToggle.checked = hasAccess; teamAccessToggle.disabled = hasAccess; }
"""
new = """      var hasAccess = personNode.getAttribute('data-has-access') === '1';
      teamHasExistingAccess = hasAccess;
      if (teamAccessToggle) { teamAccessToggle.checked = hasAccess; teamAccessToggle.disabled = hasAccess; }
"""
if old not in js:
    raise SystemExit('existing access anchor not found')
js = js.replace(old, new, 1)
js_path.write_text(js)

# View: remove explanatory clutter; keep only actionable labels.
view_path = Path('app/admin/views/pmdshifts/index.blade.php')
view = view_path.read_text()
replacements = {
    '<div><span class="pmd-shifts__eyebrow">Schedule</span><h2 id="pmd-shift-modal-title" data-pmd-shift-modal-title>Add shift</h2></div>': '<div><h2 id="pmd-shift-modal-title" data-pmd-shift-modal-title>Add shift</h2></div>',
    '<label class="is-full"><span>Note <small>optional</small></span><textarea name="notes" maxlength="2000" rows="3" data-pmd-shift-notes placeholder="Private planning note for this shift…"></textarea></label>': '<label class="is-full"><span>Note</span><textarea name="notes" maxlength="2000" rows="2" data-pmd-shift-notes placeholder="Optional note"></textarea></label>',
    '<legend><strong>Who is working?</strong><small>Add or remove people for this Shift here.</small></legend>': '<legend><strong>Team</strong></legend>',
    '<div><span class="pmd-shifts__eyebrow">Restaurant team</span><h2 id="pmd-team-modal-title">Team</h2></div>': '<div><h2 id="pmd-team-modal-title">Team</h2></div>',
    '<div class="pmd-shifts__team-form-head"><strong data-pmd-team-form-title>Add team member</strong><button type="button" data-pmd-team-new>New</button></div>': '<div class="pmd-shifts__team-form-head"><strong data-pmd-team-form-title>New member</strong><button type="button" data-pmd-team-new>Clear</button></div>',
    '<label><span>Job role <small>optional</small></span><input maxlength="64" name="job_role" data-pmd-team-role placeholder="e.g. Bartender, Chef"></label>': '<label><span>Role</span><input maxlength="64" name="job_role" data-pmd-team-role placeholder="Bartender, Chef…"></label>',
    '<label><span>Area <small>optional</small></span><select name="department" data-pmd-team-department>': '<label><span>Area</span><select name="department" data-pmd-team-department>',
    '<span><strong>Give PMD login</strong><small>Recommended for My Work. Turn off for roster-only people.</small></span>': '<span><strong>PMD login</strong></span>',
    '<label><span>Access role</span><select name="staff_role_id" data-pmd-team-access-role>': '<label><span>Access</span><select name="staff_role_id" data-pmd-team-access-role>',
    '<small class="pmd-shifts__team-access-note">Team Member = personal My Work only. Choose Waiter/Cashier/KDS/etc only when operational access is actually needed.</small>': '',
    '<button type="submit" class="pmd-shifts__button">Save member</button>': '<button type="submit" class="pmd-shifts__button">Save</button>',
    '<header><strong>{{ $people->count() }} people</strong><span>Click a person to edit.</span></header>': '<header><strong>{{ $people->count() }} people</strong></header>',
    '<section class="pmd-shifts__team-requests" aria-label="Pending team requests">': '<section class="pmd-shifts__team-requests {{ $teamRequests->isEmpty() ? \'is-empty\' : \'\' }}" aria-label="Pending team requests">',
    '<a href="{{ admin_url(\'settings/team\') }}">Advanced access accounts</a>': '<a href="{{ admin_url(\'settings/team\') }}">Advanced</a>',
    '<div><span class="pmd-shifts__eyebrow">Kitchen timing</span><h2 id="pmd-capacity-modal-title">Peak time & capacity</h2></div>': '<div><h2 id="pmd-capacity-modal-title">Kitchen capacity</h2></div>',
    '<div class="pmd-shifts__capacity-copy"><strong>Live Kitchen load</strong><small>PMD counts active food items already released to Kitchen.</small></div>': '<div class="pmd-shifts__capacity-copy"><strong>Live load</strong></div>',
    '<label><span>Busy from</span><input type="number" name="busy_item_threshold"': '<label><span>Busy at</span><input type="number" name="busy_item_threshold"',
    '<label><span>Add when busy</span><input type="number" name="busy_extra_minutes"': '<label><span>+ minutes</span><input type="number" name="busy_extra_minutes"',
    '<label><span>Very busy from</span><input type="number" name="very_busy_item_threshold"': '<label><span>Very busy at</span><input type="number" name="very_busy_item_threshold"',
    '<label><span>Add when very busy</span><input type="number" name="very_busy_extra_minutes"': '<label><span>+ minutes</span><input type="number" name="very_busy_extra_minutes"',
    '<span><strong>Peak time window</strong><small>Optional known rush period. PMD uses the larger of Peak or live-load buffer, never both.</small></span>': '<span><strong>Peak time</strong></span>',
    '<label><span>Peak buffer</span><input type="number" name="peak_extra_minutes"': '<label><span>Buffer (min)</span><input type="number" name="peak_extra_minutes"',
}
for before, after in replacements.items():
    if before not in view:
        raise SystemExit('view anchor not found: ' + before[:80])
    view = view.replace(before, after, 1)
# Remove repeated unit captions inside capacity; labels already carry meaning.
view = view.replace('<small>active items</small>', '', 2)
view = view.replace('<small>minutes</small>', '', 3)
view_path.write_text(view)

# CSS bridge: compact, flatter, fewer nested cards. Also quiet the oversized KPI row.
css_path = Path('app/admin/assets/css/pmd-shifts-dashboard-reservations-v4.css')
css = css_path.read_text()
css = css.replace('gap:14px!important;\n  width:min(1480px,100%)!important;\n  margin:14px auto!important;\n  padding:0 0 8px!important;', 'gap:9px!important;\n  width:min(1480px,100%)!important;\n  margin:8px auto!important;\n  padding:0 0 4px!important;', 1)
css = css.replace('min-height:118px!important;\n  border-width:2px!important;\n  box-shadow:0 3px 0 rgba(8,35,48,.24)!important;', 'min-height:84px!important;\n  border-width:1px!important;\n  box-shadow:none!important;', 1)
css = css.replace('body.pmd-shifts-page #pmd-r2-reservation-kpis-v307 .pmd-r2-kpi-v2401-value{font-size:30px!important}', 'body.pmd-shifts-page #pmd-r2-reservation-kpis-v307 .pmd-r2-kpi-v2401-value{font-size:23px!important}', 1)
css = css.replace('body.pmd-shifts-page #pmd-r2-reservation-kpis-v307 .pmd-r2-kpi-v2401-description{opacity:.9!important}', 'body.pmd-shifts-page #pmd-r2-reservation-kpis-v307 .pmd-r2-kpi-v2401-description{display:none!important}', 1)
css = css.replace('body.pmd-shifts-page .pmd-shifts__team-card{width:min(1080px,calc(100vw - 30px))!important}', 'body.pmd-shifts-page .pmd-shifts__team-card{width:min(860px,calc(100vw - 24px))}', 1)
css += r'''

/* PMD_SHIFTS_COMPACT_OPERATIONS_V11 */
body.pmd-shifts-page .pmd-shifts__modal{padding:12px}
body.pmd-shifts-page .pmd-shifts__modal-card{border-radius:16px;background:#fff;box-shadow:0 24px 70px rgba(6,28,24,.18)}
body.pmd-shifts-page .pmd-shifts__modal-card:not(.pmd-shifts__team-card):not(.pmd-shifts__capacity-card){width:min(760px,calc(100vw - 24px))}
body.pmd-shifts-page .pmd-shifts__modal-header{padding:11px 14px}
body.pmd-shifts-page .pmd-shifts__modal-header h2{font-size:19px}
body.pmd-shifts-page .pmd-shifts__modal-close{width:36px;height:36px;border-radius:10px}
body.pmd-shifts-page .pmd-shifts__eyebrow{display:none}
body.pmd-shifts-page .pmd-shifts__modal-body{padding:12px}
body.pmd-shifts-page .pmd-shifts__modal-footer{padding:9px 12px}
body.pmd-shifts-page .pmd-shifts__preset-row{gap:6px;margin-bottom:9px}
body.pmd-shifts-page .pmd-shifts__preset-row button{min-height:32px;padding:0 10px}
body.pmd-shifts-page .pmd-shifts__form-grid{gap:8px;padding:0;border:0;border-radius:0;background:transparent}
body.pmd-shifts-page .pmd-shifts__form-grid label{gap:4px}
body.pmd-shifts-page .pmd-shifts__form-grid input{height:40px;border-radius:9px}
body.pmd-shifts-page .pmd-shifts__form-grid textarea{min-height:52px;padding:8px 10px;border-radius:9px}
body.pmd-shifts-page .pmd-shifts__person-picker{grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:6px;margin-top:10px;padding:10px 0 0;border:0;border-top:1px solid #e4ece9;border-radius:0;background:transparent}
body.pmd-shifts-page .pmd-shifts__person-picker legend{padding:0 0 4px}
body.pmd-shifts-page .pmd-shifts__person-picker legend small{display:none}
body.pmd-shifts-page .pmd-shifts__person-option{padding:7px 8px;border-radius:9px}
body.pmd-shifts-page .pmd-shifts__button{min-height:36px;border-radius:10px}

body.pmd-shifts-page .pmd-shifts__team-card{max-height:calc(100dvh - 24px)}
body.pmd-shifts-page .pmd-shifts__team-layout{grid-template-columns:minmax(300px,330px) minmax(0,1fr);gap:0;padding:12px}
body.pmd-shifts-page .pmd-shifts__team-form{gap:8px;padding:0 12px 0 0;border:0;border-radius:0;background:transparent}
body.pmd-shifts-page .pmd-shifts__team-form-head{min-height:30px}
body.pmd-shifts-page .pmd-shifts__team-form-head strong{font-size:13px}
body.pmd-shifts-page .pmd-shifts__team-form input,body.pmd-shifts-page .pmd-shifts__team-form select{height:38px;padding:0 10px;border-radius:9px;font-size:12px}
body.pmd-shifts-page .pmd-shifts__team-identity-row{gap:7px}
body.pmd-shifts-page .pmd-shifts__team-access-toggle{grid-template-columns:auto 1fr;gap:8px;padding:8px 0;border:0;border-top:1px solid #e4ece9;border-bottom:1px solid #e4ece9;border-radius:0;background:transparent}
body.pmd-shifts-page .pmd-shifts__team-access-toggle small{display:none}
body.pmd-shifts-page .pmd-shifts__team-access-fields{grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;padding:0;border:0;border-radius:0;background:transparent}
body.pmd-shifts-page .pmd-shifts__team-access-fields .is-password{grid-column:1/-1}
body.pmd-shifts-page .pmd-shifts__team-access-fields label>span small{display:none}
body.pmd-shifts-page .pmd-shifts__team-access-note{display:none}
body.pmd-shifts-page .pmd-shifts__team-list{padding-left:12px;border-left:1px solid #e4ece9;gap:7px}
body.pmd-shifts-page .pmd-shifts__team-list>header{min-height:30px;align-items:center;padding:0}
body.pmd-shifts-page .pmd-shifts__team-list>header span{display:none}
body.pmd-shifts-page .pmd-shifts__team-list-scroll{gap:5px;max-height:360px;padding:0}
body.pmd-shifts-page .pmd-shifts__team-person{grid-template-columns:32px minmax(0,1fr) auto;gap:8px;padding:7px 8px;border-radius:9px}
body.pmd-shifts-page .pmd-shifts__team-person-avatar{width:30px;height:30px;border-radius:8px}
body.pmd-shifts-page .pmd-shifts__team-empty{padding:10px;border-radius:9px;font-size:10px}
body.pmd-shifts-page .pmd-shifts__team-requests{grid-column:1/-1;margin-top:10px;padding-top:10px;border-top:1px solid #e4ece9}
body.pmd-shifts-page .pmd-shifts__team-requests.is-empty{display:none}
body.pmd-shifts-page .pmd-shifts__team-footer a{font-size:9.5px}

body.pmd-shifts-page .pmd-shifts__capacity-card{width:min(640px,calc(100vw - 24px))}
body.pmd-shifts-page .pmd-shifts__capacity-section{gap:8px;padding:0;border:0;border-radius:0;background:transparent}
body.pmd-shifts-page .pmd-shifts__capacity-section+.pmd-shifts__capacity-section{margin-top:10px;padding-top:10px;border-top:1px solid #e4ece9}
body.pmd-shifts-page .pmd-shifts__capacity-copy{display:block}
body.pmd-shifts-page .pmd-shifts__capacity-copy small{display:none}
body.pmd-shifts-page .pmd-shifts__capacity-toggle{padding:0;border:0;background:transparent}
body.pmd-shifts-page .pmd-shifts__capacity-toggle small{display:none}
body.pmd-shifts-page .pmd-shifts__capacity-card .pmd-shifts__form-grid{grid-template-columns:repeat(4,minmax(0,1fr))}
body.pmd-shifts-page .pmd-shifts__capacity-card .pmd-shifts__capacity-section:last-child .pmd-shifts__form-grid{grid-template-columns:repeat(3,minmax(0,1fr))}

@media(max-width:760px){
  body.pmd-shifts-page .pmd-shifts__team-layout{grid-template-columns:1fr;gap:12px;padding:10px}
  body.pmd-shifts-page .pmd-shifts__team-form{padding:0}
  body.pmd-shifts-page .pmd-shifts__team-list{padding:10px 0 0;border-left:0;border-top:1px solid #e4ece9}
  body.pmd-shifts-page .pmd-shifts__team-access-fields{grid-template-columns:1fr}
  body.pmd-shifts-page .pmd-shifts__team-access-fields .is-password{grid-column:auto}
  body.pmd-shifts-page .pmd-shifts__capacity-card .pmd-shifts__form-grid,body.pmd-shifts-page .pmd-shifts__capacity-card .pmd-shifts__capacity-section:last-child .pmd-shifts__form-grid{grid-template-columns:repeat(2,minmax(0,1fr))}
}
'''
css_path.write_text(css)

print('PMD Shifts V11 patch staged')
