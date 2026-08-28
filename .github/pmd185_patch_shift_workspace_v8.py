from pathlib import Path

BRANCH_MARKER = 'PMD_SHIFTS_COMBINED_WORKSPACE_V8'

settings_path = Path('app/admin/controllers/Pmdsettings.php')
shifts_controller_path = Path('app/admin/controllers/Shifts.php')
blade_path = Path('app/admin/views/pmdshifts/index.blade.php')
js_path = Path('app/admin/assets/js/pmd-shifts-v1.js')
css_path = Path('app/admin/assets/css/pmd-shifts-dashboard-reservations-v4.css')

# 1. Remove duplicate operational shortcuts from Settings Center.
settings = settings_path.read_text()
for line in [
    "                    $this->item('Preparation & ETA', 'Food prep ranges, Kitchen team signal and simple live ETA controls.', 'timer', admin_url('shifts').'#pmd-kitchen-eta', ''),\n",
    "                    $this->item('People & shifts', 'Plan operational roles and confirm who is in the Kitchen today.', 'users', admin_url('shifts'), ''),\n",
]:
    if line not in settings:
        raise SystemExit('Settings tile line not found: ' + line.strip())
    settings = settings.replace(line, '', 1)
settings_path.write_text(settings)

# 2. Make the simple Shifts roster editor preserve advanced PMD-account/station links
#    and return to the Shifts workspace after save/deactivate.
controller = shifts_controller_path.read_text()
old = """        $clean = $validator->validated();
        $locationId = $this->locationId();

        $linkedStaffId = !empty($clean['staff_id']) ? (int)$clean['staff_id'] : null;
        if ($linkedStaffId) {
            $validStaff = Staffs_model::whereNotSuperUser()->where('staff_status', 1)->where('staff_id', $linkedStaffId)->exists();
            if (!$validStaff) throw ValidationException::withMessages(['staff_id' => 'Choose an active PMD staff account.']);
        }

        $values = [
            'location_id' => $locationId,
            'staff_id' => $linkedStaffId,
            'display_name' => trim((string)$clean['display_name']),
            'department' => trim((string)($clean['department'] ?? '')) ?: 'other',
            'job_role' => trim((string)($clean['job_role'] ?? '')) ?: null,
            'station_slug' => trim((string)($clean['station_slug'] ?? '')) ?: null,
            'is_active' => 1,
            'updated_at' => now(),
        ];

        $id = (int)($clean['id'] ?? 0);
"""
new = """        $clean = $validator->validated();
        $locationId = $this->locationId();
        $id = (int)($clean['id'] ?? 0);
        $existing = $id > 0
            ? DB::table('pmd_operational_people')->where('id', $id)->where('location_id', $locationId)->first()
            : null;

        // PMD_SHIFTS_SIMPLE_PERSON_EDITOR_V8
        // Shifts edits only operational identity. If access/station fields were
        // not posted, preserve the advanced values already owned by Team & Access.
        $linkedStaffId = request()->exists('staff_id')
            ? (!empty($clean['staff_id']) ? (int)$clean['staff_id'] : null)
            : ($existing && !empty($existing->staff_id) ? (int)$existing->staff_id : null);
        if ($linkedStaffId) {
            $validStaff = Staffs_model::whereNotSuperUser()->where('staff_status', 1)->where('staff_id', $linkedStaffId)->exists();
            if (!$validStaff) throw ValidationException::withMessages(['staff_id' => 'Choose an active PMD staff account.']);
        }

        $stationSlug = request()->exists('station_slug')
            ? (trim((string)($clean['station_slug'] ?? '')) ?: null)
            : ($existing ? ($existing->station_slug ?? null) : null);

        $values = [
            'location_id' => $locationId,
            'staff_id' => $linkedStaffId,
            'display_name' => trim((string)$clean['display_name']),
            'department' => trim((string)($clean['department'] ?? '')) ?: 'other',
            'job_role' => trim((string)($clean['job_role'] ?? '')) ?: null,
            'station_slug' => $stationSlug,
            'is_active' => 1,
            'updated_at' => now(),
        ];

"""
if old not in controller:
    raise SystemExit('Shifts simple-person authority block not found')
controller = controller.replace(old, new, 1)
controller = controller.replace(
    "        return redirect(admin_url('settings/team'))->with('success', 'Person saved.');",
    "        return $this->redirectBackToSchedule('Person saved.');",
    1,
)
controller = controller.replace(
    "        return redirect(admin_url('settings/team'))->with('success', 'Person removed from the active roster.');",
    "        return $this->redirectBackToSchedule('Person removed from the active roster.');",
    1,
)
shifts_controller_path.write_text(controller)

# 3. Blade: month cells become compact current/next-team summaries, Team is a modal
#    inside Shifts, and the header no longer navigates away for basic roster work.
blade = blade_path.read_text()
anchor = """    $byDay = $shifts->groupBy(fn($s) => \\Carbon\\Carbon::parse($s->shift_date)->toDateString());
    $returnTo = request()->getRequestUri();

"""
helpers = r'''    $byDay = $shifts->groupBy(fn($s) => \Carbon\Carbon::parse($s->shift_date)->toDateString());
    $returnTo = request()->getRequestUri();

    // PMD_SHIFTS_MONTH_TEAM_SUMMARY_V8
    // A month cell shows the team that matters operationally: the active Shift
    // for today, otherwise the next Shift today, and the first planned Shift on
    // other dates. The cell stays intentionally compact (max five role rows).
    $pmdShiftMinutes = static function ($value) {
        $value = trim((string)$value);
        if ($value === '') return null;
        $parts = explode(':', $value);
        if (count($parts) < 2) return null;
        return ((int)$parts[0] * 60) + (int)$parts[1];
    };

    $pmdRelevantShiftForDay = static function ($date, $dayShifts) use ($pmdShiftMinutes) {
        $ordered = collect($dayShifts)->sortBy(function ($shift) use ($pmdShiftMinutes) {
            $start = $pmdShiftMinutes($shift->starts_at ?? null);
            return $start === null ? 9999 : $start;
        })->values();
        if ($ordered->isEmpty()) return null;

        $day = \Carbon\Carbon::parse($date)->startOfDay();
        if (!$day->isToday()) return $ordered->first();

        $nowMinutes = ((int)now()->format('H') * 60) + (int)now()->format('i');
        foreach ($ordered as $shift) {
            $start = $pmdShiftMinutes($shift->starts_at ?? null);
            $end = $pmdShiftMinutes($shift->ends_at ?? null);
            if ($start === null) $start = 0;
            if ($end === null) $end = 1440;
            if ($end <= $start) $end += 1440;
            if ($nowMinutes >= $start && $nowMinutes < $end) return $shift;
        }
        foreach ($ordered as $shift) {
            $start = $pmdShiftMinutes($shift->starts_at ?? null);
            if ($start !== null && $start > $nowMinutes) return $shift;
        }
        return $ordered->last();
    };

    $pmdShiftTeamRows = static function ($shift) {
        if (!$shift) return [];
        $groups = [
            'Kitchen' => [],
            'Waiters' => [],
            'Cashier' => [],
            'Bar' => [],
            'Other' => [],
        ];
        foreach (collect($shift->people ?? []) as $person) {
            $name = trim((string)($person->display_name_snapshot ?? ''));
            if ($name === '') continue;
            $department = strtolower(trim((string)($person->department_snapshot ?? 'other')));
            $role = strtolower(trim((string)($person->job_role_snapshot ?? '')));

            if ($department === 'kitchen') $group = 'Kitchen';
            elseif (str_contains($role, 'cashier') || str_contains($role, 'till')) $group = 'Cashier';
            elseif (str_contains($role, 'waiter') || str_contains($role, 'server') || $department === 'floor') $group = 'Waiters';
            elseif ($department === 'bar' || str_contains($role, 'bartender') || $role === 'bar') $group = 'Bar';
            else $group = 'Other';

            if (!in_array($name, $groups[$group], true)) $groups[$group][] = $name;
        }

        $rows = [];
        foreach ($groups as $label => $names) {
            if (!$names) continue;
            $visible = array_slice($names, 0, 3);
            $text = implode(', ', $visible);
            if (count($names) > 3) $text .= ' +'.(count($names) - 3);
            $rows[] = ['label' => $label, 'names' => $text];
            if (count($rows) >= 5) break;
        }
        return $rows;
    };

'''
if anchor not in blade:
    raise SystemExit('Blade top authority anchor not found')
blade = blade.replace(anchor, helpers, 1)

old_team_link = """            <a class=\"pmd-shifts__header-button is-soft\" href=\"{{ admin_url('settings/team') }}\">\n                <svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"9\" cy=\"8\" r=\"3\"></circle><path d=\"M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5\"></path></svg>\n                <span>Team</span>\n            </a>\n"""
new_team_link = """            <button type=\"button\" class=\"pmd-shifts__header-button is-soft\" data-pmd-team-open aria-label=\"Restaurant team\">\n                <svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"9\" cy=\"8\" r=\"3\"></circle><path d=\"M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5\"></path></svg>\n                <span>Team</span>\n            </button>\n"""
if old_team_link not in blade:
    raise SystemExit('Team header link not found')
blade = blade.replace(old_team_link, new_team_link, 1)

old_calendar = r'''                                <a
                                    class="pmd-yc-day {{ !$inMonth ? 'is-outside' : '' }} {{ $day->isToday() ? 'is-today' : '' }}"
                                    href="{{ admin_url('shifts') }}?month={{ $monthStart->toDateString() }}&day={{ $date }}#pmd-shift-day"
                                    data-pmd-shift-day-open
                                    data-date="{{ $date }}"
                                    aria-label="Open {{ $day->format('F j') }} hour view"
                                >
                                    <span class="pmd-yc-day__number">{{ $day->format('j') }}</span>
                                    <span class="pmd-yc-day__operations">
                                        @foreach($dayShifts->take(3) as $shift)
                                            @php $shiftPeople = collect($shift->people ?? []); @endphp
                                            <span class="pmd-r2-yc-entry is-shift">
                                                {{ $shift->starts_at ? substr((string)$shift->starts_at,0,5) : 'All day' }}{{ $shift->ends_at ? '–'.substr((string)$shift->ends_at,0,5) : '' }} · {{ $shift->label }} · {{ $shiftPeople->count() }}
                                            </span>
                                        @endforeach
                                        @if($dayShifts->count() > 3)<span class="pmd-shifts-yc-more">+{{ $dayShifts->count()-3 }} more</span>@endif
                                    </span>
                                </a>
'''
new_calendar = r'''                                @php
                                    $focusShift = $pmdRelevantShiftForDay($date, $dayShifts);
                                    $teamRows = $pmdShiftTeamRows($focusShift);
                                    $focusTime = $focusShift
                                        ? (($focusShift->starts_at ? substr((string)$focusShift->starts_at,0,5) : 'All day').($focusShift->ends_at ? '–'.substr((string)$focusShift->ends_at,0,5) : ''))
                                        : '';
                                @endphp
                                <div
                                    class="pmd-yc-day {{ !$inMonth ? 'is-outside' : '' }} {{ $day->isToday() ? 'is-today' : '' }}"
                                    data-pmd-shift-day-open
                                    data-date="{{ $date }}"
                                    tabindex="0"
                                    aria-label="Open {{ $day->format('F j') }} staff schedule"
                                >
                                    <span class="pmd-yc-day__number">{{ $day->format('j') }}</span>
                                    <span class="pmd-yc-day__operations pmd-shifts-yc-team-summary">
                                        @if($focusShift)
                                            <span class="pmd-shifts-yc-context">{{ $focusTime }}</span>
                                            @foreach($teamRows as $teamRow)
                                                <button
                                                    type="button"
                                                    class="pmd-shifts-yc-team-row"
                                                    data-pmd-calendar-shift-edit="{{ (int)$focusShift->id }}"
                                                    title="Edit {{ $focusShift->label }}"
                                                ><strong>{{ $teamRow['label'] }}:</strong><span>{{ $teamRow['names'] }}</span></button>
                                            @endforeach
                                        @elseif($dayShifts->isNotEmpty())
                                            <span class="pmd-shifts-yc-context">{{ $dayShifts->count() }} planned shifts</span>
                                        @endif
                                    </span>
                                </div>
'''
if old_calendar not in blade:
    raise SystemExit('Legacy calendar-cell block not found')
blade = blade.replace(old_calendar, new_calendar, 1)

capacity_anchor = """        <div class=\"pmd-shifts__modal\" data-pmd-capacity-modal hidden aria-hidden=\"true\" role=\"dialog\" aria-modal=\"true\" aria-labelledby=\"pmd-capacity-modal-title\">\n"""
team_modal = r'''        <div class="pmd-shifts__modal" data-pmd-team-modal hidden aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="pmd-team-modal-title">
            <button type="button" class="pmd-shifts__modal-backdrop" data-pmd-team-close tabindex="-1" aria-label="Close"></button>
            <section class="pmd-shifts__modal-card pmd-shifts__team-card" role="document">
                <header class="pmd-shifts__modal-header">
                    <div><span class="pmd-shifts__eyebrow">Restaurant team</span><h2 id="pmd-team-modal-title">Team</h2></div>
                    <button type="button" class="pmd-shifts__modal-close" data-pmd-team-close aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"></path></svg></button>
                </header>
                <div class="pmd-shifts__team-layout">
                    <form class="pmd-shifts__team-form" method="post" action="{{ admin_url('shifts/saveperson') }}" data-pmd-team-form>
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
                    </form>

                    <section class="pmd-shifts__team-list" aria-label="Restaurant team members">
                        <header><strong>{{ $people->count() }} people</strong><span>Click a person to edit.</span></header>
                        <div class="pmd-shifts__team-list-scroll">
                            @forelse($people as $person)
                                <button
                                    type="button"
                                    class="pmd-shifts__team-person"
                                    data-pmd-team-edit
                                    data-person-id="{{ (int)$person->id }}"
                                    data-name="{{ $person->display_name }}"
                                    data-role="{{ $person->job_role ?? '' }}"
                                    data-department="{{ $person->department ?? 'other' }}"
                                >
                                    <span class="pmd-shifts__team-person-avatar">{{ strtoupper(substr(trim((string)$person->display_name),0,1)) }}</span>
                                    <span><strong>{{ $person->display_name }}</strong><small>{{ $person->job_role ?: ($departments[$person->department] ?? 'Team') }}</small></span>
                                    @if(!empty($person->staff_id))<em>PMD access</em>@endif
                                </button>
                            @empty
                                <div class="pmd-shifts__team-empty">No people yet. Add the first person with only a name.</div>
                            @endforelse
                        </div>
                    </section>
                </div>
                <footer class="pmd-shifts__modal-footer pmd-shifts__team-footer">
                    <a href="{{ admin_url('settings/team') }}">Advanced access accounts</a>
                    <button type="button" class="pmd-shifts__button is-soft" data-pmd-team-close>Done</button>
                </footer>
            </section>
        </div>

'''
if capacity_anchor not in blade:
    raise SystemExit('Capacity modal anchor not found')
blade = blade.replace(capacity_anchor, team_modal + capacity_anchor, 1)
blade_path.write_text(blade)

# 4. JS: Team modal, calendar-row editing, keyboard day-open, and v8 CSS cache key.
js = js_path.read_text()
js = js.replace('pmd-shifts-dashboard-reservations-v4.css?v=7', 'pmd-shifts-dashboard-reservations-v4.css?v=8')
js = js.replace('data-pmd-shifts-exact-ui-v7', 'data-pmd-shifts-exact-ui-v8')

old_vars = """  var modal = root.querySelector('[data-pmd-shift-modal]');
  var capacityModal = root.querySelector('[data-pmd-capacity-modal]');
  var form = modal && modal.querySelector('[data-pmd-shift-form]');
"""
new_vars = """  var modal = root.querySelector('[data-pmd-shift-modal]');
  var capacityModal = root.querySelector('[data-pmd-capacity-modal]');
  var teamModal = root.querySelector('[data-pmd-team-modal]');
  var teamForm = teamModal && teamModal.querySelector('[data-pmd-team-form]');
  var teamIdInput = teamModal && teamModal.querySelector('[data-pmd-team-person-id]');
  var teamNameInput = teamModal && teamModal.querySelector('[data-pmd-team-name]');
  var teamRoleInput = teamModal && teamModal.querySelector('[data-pmd-team-role]');
  var teamDepartmentInput = teamModal && teamModal.querySelector('[data-pmd-team-department]');
  var teamFormTitle = teamModal && teamModal.querySelector('[data-pmd-team-form-title]');
  var form = modal && modal.querySelector('[data-pmd-shift-form]');
"""
if old_vars not in js:
    raise SystemExit('JS modal variable block not found')
js = js.replace(old_vars, new_vars, 1)

old_close = """    if (!capacityModal || capacityModal.hidden) setScrollLock(false);
"""
new_close = """    if ((!capacityModal || capacityModal.hidden) && (!teamModal || teamModal.hidden)) setScrollLock(false);
"""
if old_close not in js:
    raise SystemExit('JS closeModal lock block not found')
js = js.replace(old_close, new_close, 1)

old_capacity_close = """    if (!modal || modal.hidden) setScrollLock(false);
    if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
    lastTrigger = null;
  }

  function findShift(id) {
"""
new_capacity_close = """    if ((!modal || modal.hidden) && (!teamModal || teamModal.hidden)) setScrollLock(false);
    if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
    lastTrigger = null;
  }

  function resetTeamForm() {
    if (!teamForm) return;
    teamForm.reset();
    if (teamIdInput) teamIdInput.value = '';
    if (teamDepartmentInput) teamDepartmentInput.value = 'other';
    if (teamFormTitle) teamFormTitle.textContent = 'Add person';
  }

  function openTeam(trigger, personNode) {
    if (!teamModal) return;
    lastTrigger = trigger || null;
    resetTeamForm();
    if (personNode) {
      if (teamIdInput) teamIdInput.value = personNode.getAttribute('data-person-id') || '';
      if (teamNameInput) teamNameInput.value = personNode.getAttribute('data-name') || '';
      if (teamRoleInput) teamRoleInput.value = personNode.getAttribute('data-role') || '';
      if (teamDepartmentInput) teamDepartmentInput.value = personNode.getAttribute('data-department') || 'other';
      if (teamFormTitle) teamFormTitle.textContent = 'Edit person';
    }
    teamModal.hidden = false;
    teamModal.setAttribute('aria-hidden', 'false');
    setScrollLock(true);
    window.setTimeout(function () { if (teamNameInput) teamNameInput.focus(); }, 0);
  }

  function closeTeam() {
    if (!teamModal) return;
    teamModal.hidden = true;
    teamModal.setAttribute('aria-hidden', 'true');
    if ((!modal || modal.hidden) && (!capacityModal || capacityModal.hidden)) setScrollLock(false);
    if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
    lastTrigger = null;
  }

  function findShift(id) {
"""
if old_capacity_close not in js:
    raise SystemExit('JS closeCapacity anchor not found')
js = js.replace(old_capacity_close, new_capacity_close, 1)

# Calendar group-row edit must win before the parent cell day-open handler.
old_day_handler = """    var day = event.target.closest('[data-pmd-shift-day-open]');
    if (day && root.contains(day)) {
      event.preventDefault();
      renderHourView(day.getAttribute('data-date') || '');
      return;
    }
"""
new_day_handler = """    var calendarShiftEdit = event.target.closest('[data-pmd-calendar-shift-edit]');
    if (calendarShiftEdit && root.contains(calendarShiftEdit)) {
      event.preventDefault();
      event.stopPropagation();
      var calendarShift = findShift(calendarShiftEdit.getAttribute('data-pmd-calendar-shift-edit'));
      if (calendarShift) openModal(calendarShiftEdit, valuesFromShift(calendarShift));
      return;
    }

    var day = event.target.closest('[data-pmd-shift-day-open]');
    if (day && root.contains(day)) {
      event.preventDefault();
      renderHourView(day.getAttribute('data-date') || '');
      return;
    }
"""
if old_day_handler not in js:
    raise SystemExit('JS day handler not found')
js = js.replace(old_day_handler, new_day_handler, 1)

capacity_handler_anchor = """    var capacityOpen = event.target.closest('[data-pmd-capacity-open]');
"""
team_handlers = """    var teamOpen = event.target.closest('[data-pmd-team-open]');
    if (teamOpen) {
      event.preventDefault();
      openTeam(teamOpen, null);
      return;
    }
    var teamClose = event.target.closest('[data-pmd-team-close]');
    if (teamClose) {
      event.preventDefault();
      closeTeam();
      return;
    }
    var teamEdit = event.target.closest('[data-pmd-team-edit]');
    if (teamEdit) {
      event.preventDefault();
      openTeam(teamEdit, teamEdit);
      return;
    }
    var teamNew = event.target.closest('[data-pmd-team-new]');
    if (teamNew) {
      event.preventDefault();
      resetTeamForm();
      if (teamNameInput) teamNameInput.focus();
      return;
    }

"""
if capacity_handler_anchor not in js:
    raise SystemExit('JS capacity click anchor not found')
js = js.replace(capacity_handler_anchor, team_handlers + capacity_handler_anchor, 1)

old_keydown = """  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
    closeKpiMenu();
    if (modal && !modal.hidden) closeModal();
    if (capacityModal && !capacityModal.hidden) closeCapacity();
  });
"""
new_keydown = """  document.addEventListener('keydown', function (event) {
    if ((event.key === 'Enter' || event.key === ' ') && event.target && event.target.matches && event.target.matches('[data-pmd-shift-day-open]')) {
      event.preventDefault();
      renderHourView(event.target.getAttribute('data-date') || '');
      return;
    }
    if (event.key !== 'Escape') return;
    closeKpiMenu();
    if (modal && !modal.hidden) closeModal();
    if (capacityModal && !capacityModal.hidden) closeCapacity();
    if (teamModal && !teamModal.hidden) closeTeam();
  });
"""
if old_keydown not in js:
    raise SystemExit('JS keydown block not found')
js = js.replace(old_keydown, new_keydown, 1)
js_path.write_text(js)

# 5. CSS: compact resource scheduler, calendar team rows, and Shifts-native Team modal.
css = css_path.read_text()
css = css.replace(
    'body.pmd-shifts-page .pmd-shifts-resource-scroll{width:100%;overflow:auto;border:1px solid #d7e4ec;border-radius:18px;background:#fff;max-height:calc(100dvh - 190px)}',
    'body.pmd-shifts-page .pmd-shifts-resource-scroll{width:max-content;max-width:100%;overflow:auto;border:1px solid #d7e4ec;border-radius:18px;background:#fff;max-height:calc(100dvh - 190px)}',
    1,
)
css = css.replace(
    'body.pmd-shifts-page .pmd-shifts-resource-table{width:100%;min-width:max(100%,760px);border-collapse:separate;border-spacing:0;table-layout:fixed;background:#fff;color:#102a43}',
    'body.pmd-shifts-page .pmd-shifts-resource-table{width:max-content;min-width:0;border-collapse:separate;border-spacing:0;table-layout:fixed;background:#fff;color:#102a43}',
    1,
)
css = css.replace(
    'body.pmd-shifts-page .pmd-shifts-resource-person{min-width:190px;padding:10px 12px;text-align:left;vertical-align:middle}',
    'body.pmd-shifts-page .pmd-shifts-resource-person{width:210px;min-width:210px;max-width:210px;padding:10px 12px;text-align:left;vertical-align:middle}',
    1,
)
css = css.replace(
    'body.pmd-shifts-page .pmd-shifts-resource-cell{height:46px;padding:0;background:#fff;vertical-align:top}',
    'body.pmd-shifts-page .pmd-shifts-resource-cell{width:210px;min-width:210px;max-width:210px;height:46px;padding:0;background:#fff;vertical-align:top}',
    1,
)

marker = '/* PMD_SHIFTS_COMBINED_WORKSPACE_V8 */'
if marker not in css:
    css += r'''

/* PMD_SHIFTS_COMBINED_WORKSPACE_V8
 * Month = role-group team summary; Day = compact fixed staff resources;
 * Team = lightweight operational roster inside Shifts.
 */
body.pmd-shifts-page #pmd-r2-calendar-surface-v160 .pmd-yc-day{cursor:pointer}
body.pmd-shifts-page .pmd-shifts-yc-team-summary{display:grid!important;align-content:start!important;gap:3px!important;min-width:0!important;margin-top:4px!important}
body.pmd-shifts-page .pmd-shifts-yc-context{display:block;min-width:0;overflow:hidden;color:#7b8b99;font-size:9px;font-weight:850;line-height:1.1;text-overflow:ellipsis;white-space:nowrap}
body.pmd-shifts-page .pmd-shifts-yc-team-row{display:flex;width:100%;min-width:0;align-items:center;gap:4px;margin:0;padding:2px 4px;border:0;border-radius:6px;background:transparent;color:#173752;font:inherit;line-height:1.15;text-align:left;cursor:pointer}
body.pmd-shifts-page .pmd-shifts-yc-team-row:hover,body.pmd-shifts-page .pmd-shifts-yc-team-row:focus-visible{background:#eaf3ff;outline:none}
body.pmd-shifts-page .pmd-shifts-yc-team-row strong{flex:0 0 auto;font-size:9px;font-weight:900}
body.pmd-shifts-page .pmd-shifts-yc-team-row span{display:block;min-width:0;overflow:hidden;font-size:9px;font-weight:750;text-overflow:ellipsis;white-space:nowrap}
body.pmd-shifts-page .pmd-shifts__team-card{width:min(880px,calc(100vw - 28px))!important}
body.pmd-shifts-page .pmd-shifts__team-layout{display:grid;grid-template-columns:minmax(250px,320px) minmax(0,1fr);gap:18px;padding:18px}
body.pmd-shifts-page .pmd-shifts__team-form{display:grid;align-content:start;gap:12px;padding:16px;border:1px solid #d8e5ec;border-radius:16px;background:#f8fbfd}
body.pmd-shifts-page .pmd-shifts__team-form-head{display:flex;align-items:center;justify-content:space-between;gap:10px}
body.pmd-shifts-page .pmd-shifts__team-form-head strong{font-size:14px;font-weight:900;color:#17342f}
body.pmd-shifts-page .pmd-shifts__team-form-head button{border:0;background:transparent;color:#08745c;font-size:11px;font-weight:850;cursor:pointer}
body.pmd-shifts-page .pmd-shifts__team-form label{display:grid;gap:5px;margin:0}
body.pmd-shifts-page .pmd-shifts__team-form label>span{font-size:10.5px;font-weight:850;color:#27433f}
body.pmd-shifts-page .pmd-shifts__team-form label small{font-weight:700;color:#84938f}
body.pmd-shifts-page .pmd-shifts__team-form input,body.pmd-shifts-page .pmd-shifts__team-form select{width:100%;height:44px;padding:0 12px;border:1px solid #cfe0e8;border-radius:12px;background:#fff;color:#102a43;font-size:13px;font-weight:700;outline:none}
body.pmd-shifts-page .pmd-shifts__team-form input:focus,body.pmd-shifts-page .pmd-shifts__team-form select:focus{border-color:#79bda8;box-shadow:0 0 0 3px rgba(121,189,168,.16)}
body.pmd-shifts-page .pmd-shifts__team-list{display:grid;min-width:0;grid-template-rows:auto minmax(0,1fr);gap:10px}
body.pmd-shifts-page .pmd-shifts__team-list>header{display:flex;align-items:end;justify-content:space-between;gap:10px;padding:2px 2px 0}
body.pmd-shifts-page .pmd-shifts__team-list>header strong{font-size:14px;font-weight:900;color:#17342f}
body.pmd-shifts-page .pmd-shifts__team-list>header span{font-size:10px;font-weight:700;color:#7a8a86}
body.pmd-shifts-page .pmd-shifts__team-list-scroll{display:grid;align-content:start;gap:7px;max-height:430px;overflow:auto;padding-right:3px}
body.pmd-shifts-page .pmd-shifts__team-person{display:grid;grid-template-columns:38px minmax(0,1fr) auto;align-items:center;gap:10px;width:100%;min-width:0;padding:9px 10px;border:1px solid #dbe6ec;border-radius:13px;background:#fff;color:#17342f;text-align:left;cursor:pointer}
body.pmd-shifts-page .pmd-shifts__team-person:hover,body.pmd-shifts-page .pmd-shifts__team-person:focus-visible{border-color:#79bda8;background:#f2fbf7;outline:none}
body.pmd-shifts-page .pmd-shifts__team-person-avatar{display:grid;width:36px;height:36px;place-items:center;border-radius:11px;background:#eaf3ff;color:#173752;font-size:12px;font-weight:900}
body.pmd-shifts-page .pmd-shifts__team-person>span:nth-child(2){display:grid;min-width:0;gap:2px}
body.pmd-shifts-page .pmd-shifts__team-person strong,body.pmd-shifts-page .pmd-shifts__team-person small{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
body.pmd-shifts-page .pmd-shifts__team-person strong{font-size:12px;font-weight:900}
body.pmd-shifts-page .pmd-shifts__team-person small{font-size:9.5px;font-weight:750;color:#778783}
body.pmd-shifts-page .pmd-shifts__team-person em{padding:3px 6px;border-radius:999px;background:#edf9f4;color:#075c47;font-size:8px;font-style:normal;font-weight:900;text-transform:uppercase;white-space:nowrap}
body.pmd-shifts-page .pmd-shifts__team-empty{padding:18px;border:1px dashed #cad9e1;border-radius:14px;color:#758781;font-size:12px;font-weight:700}
body.pmd-shifts-page .pmd-shifts__team-footer{justify-content:space-between!important}
body.pmd-shifts-page .pmd-shifts__team-footer a{color:#5e746f;font-size:10px;font-weight:800;text-decoration:none}
body.pmd-shifts-page .pmd-shifts__team-footer a:hover{text-decoration:underline}
@media(max-width:760px){body.pmd-shifts-page .pmd-shifts__team-layout{grid-template-columns:1fr}body.pmd-shifts-page .pmd-shifts__team-list-scroll{max-height:280px}}
'''
css_path.write_text(css)

print('Patched:', settings_path, shifts_controller_path, blade_path, js_path, css_path)
