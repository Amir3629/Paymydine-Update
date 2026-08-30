#!/usr/bin/env python3
from pathlib import Path
import datetime as dt
import re
import shutil
import subprocess
import sys

ROOT = Path(sys.argv[1] if len(sys.argv) > 1 else '/var/www/paymydine').resolve()
STAMP = dt.datetime.utcnow().strftime('%Y%m%d_%H%M%S')
BACKUP = ROOT / '.pmd-hotfix-backups' / ('shifts-canonical-' + STAMP)

PATHS = {
    'controller': ROOT / 'app/admin/controllers/Shifts.php',
    'view': ROOT / 'app/admin/views/pmdshifts/index.blade.php',
    'js': ROOT / 'app/admin/assets/js/pmd-shifts-v1.js',
    'css': ROOT / 'app/admin/assets/css/pmd-shifts-dashboard-reservations-v4.css',
    'menu': ROOT / 'app/admin/views/_partials/pmd_side_menu2_single_menu.blade.php',
    'settings': ROOT / 'app/admin/controllers/Pmdsettings.php',
    'retired': ROOT / 'app/Http/Middleware/PmdAdminRetiredPagesR77.php',
}

for name, path in PATHS.items():
    if not path.is_file():
        raise SystemExit(f'ERROR: missing {name}: {path}')

original = {name: path.read_text(encoding='utf-8') for name, path in PATHS.items()}
updated = dict(original)


def must_replace(name, old, new, label, count=1):
    text = updated[name]
    if new != '' and new in text:
        print(f'ALREADY: {label}')
        return
    found = text.count(old)
    if found != count:
        raise RuntimeError(f'{label}: expected {count} exact match(es), found {found}')
    updated[name] = text.replace(old, new, count)
    print(f'PATCH: {label}')


def must_regex(name, pattern, replacement, label, count=1):
    text = updated[name]
    out, n = re.subn(pattern, replacement, text, count=count, flags=re.S)
    if n != count:
        raise RuntimeError(f'{label}: expected {count} regex match(es), found {n}')
    updated[name] = out
    print(f'PATCH: {label}')


# Shifts controller: reconcile legacy login users and reject exact duplicates.
must_replace(
    'controller',
    "use App\\Services\\PmdKitchenOperationsSchemaService;\n",
    "use App\\Services\\PmdKitchenOperationsSchemaService;\nuse App\\Services\\PmdOperationalRosterReconciler;\n",
    'Shifts controller imports roster reconciler',
)

must_replace(
    'controller',
    "        if ($ready) {\n            $people = DB::table('pmd_operational_people')\n",
    """        if ($ready) {\n            // PMD_SHIFTS_CANONICAL_ROSTER_V1\n            // Existing enabled Staff/User logins must be real operational people\n            // before the rota reads the location roster. Failure is non-fatal so\n            // one legacy account can never blank the whole Shifts workspace.\n            try {\n                app(PmdOperationalRosterReconciler::class)->reconcileLocation($locationId);\n            } catch (\\Throwable $error) {\n                logger()->warning('PMD Shifts roster reconciliation failed', [\n                    'location_id' => $locationId,\n                    'message' => $error->getMessage(),\n                ]);\n            }\n\n            $people = DB::table('pmd_operational_people')\n""",
    'Shifts controller reconciles legacy roster before query',
)

needle = "        $personIds = array_values(array_unique(array_map('intval', (array)($clean['person_ids'] ?? []))));\n\n        DB::transaction(function () use ($clean, $locationId, $personIds) {\n"
replacement = """        $personIds = array_values(array_unique(array_map('intval', (array)($clean['person_ids'] ?? []))));\n\n        // PMD_SHIFTS_EXACT_DUPLICATE_GUARD_V1\n        // Overlaps are allowed and are connected visually in the rota, but the\n        // exact same person/date/start/end record is never useful and is blocked.\n        $editId = (int)($clean['id'] ?? 0);\n        $duplicateDate = Carbon::parse($clean['shift_date'])->toDateString();\n        $duplicateStart = !empty($clean['starts_at']) ? $clean['starts_at'].':00' : null;\n        $duplicateEnd = !empty($clean['ends_at']) ? $clean['ends_at'].':00' : null;\n        if ($personIds && $duplicateStart !== null && $duplicateEnd !== null) {\n            $duplicateQuery = DB::table('pmd_operational_shifts as s')\n                ->join('pmd_operational_shift_people as sp', 'sp.shift_id', '=', 's.id')\n                ->where('s.location_id', $locationId)\n                ->where('s.shift_date', $duplicateDate)\n                ->where('s.starts_at', $duplicateStart)\n                ->where('s.ends_at', $duplicateEnd)\n                ->whereIn('sp.person_id', $personIds)\n                ->whereNotIn('s.status', ['cancelled', 'canceled']);\n            if ($editId > 0) $duplicateQuery->where('s.id', '<>', $editId);\n            if ($duplicateQuery->exists()) {\n                return $this->redirectTeamFailure('That exact shift already exists for one of the selected members. Edit the existing shift instead.');\n            }\n        }\n\n        DB::transaction(function () use ($clean, $locationId, $personIds) {\n"""
must_replace('controller', needle, replacement, 'Shifts controller exact duplicate guard')

# Shifts Blade: remove redundant Team surfaces, keep modal, expose remove.
header_members = """            <button type=\"button\" class=\"pmd-shifts__header-icon\" data-pmd-team-scroll aria-label=\"Members\" title=\"Members\">\n                <svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"9\" cy=\"8\" r=\"3\"></circle><path d=\"M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5\"></path></svg>\n                <span class=\"pmd-shifts__header-count\">{{ $people->count() }}</span>\n            </button>\n"""
must_replace('view', header_members, "", 'Remove Shifts header Members-count button')

team_panel_pattern = r"\n\s*\{\{-- PMD_SHIFTS_SIMPLE_TEAM_WORKSPACE_V14 --\}\}\n\s*<section id=\"pmd-shifts-team-panel\"\b.*?</section>\n"
must_regex(
    'view',
    team_panel_pattern,
    "\n        {{-- PMD_SHIFTS_CANONICAL_TEAM_SURFACE_V1: Team editing lives in the existing modal; no duplicate lower panel. --}}\n",
    'Remove lower Shifts Team panel',
)

must_replace(
    'view',
    '<div class="pmd-shifts__picker-empty">No members yet. <a href="#pmd-shifts-team-panel" data-pmd-team-scroll>Add a member below</a>.</div>',
    '<div class="pmd-shifts__picker-empty">No members yet. <button type="button" class="pmd-shifts__picker-member-open" data-pmd-team-open>Add a member</button>.</div>',
    'Make empty person picker open Member modal directly',
)

must_replace(
    'view',
    """                    <footer class=\"pmd-shifts__modal-footer\">\n                        <button type=\"button\" class=\"pmd-shifts__button is-soft\" data-pmd-shift-close>Cancel</button>\n                        <button type=\"submit\" class=\"pmd-shifts__button\">Save shift</button>\n                    </footer>\n""",
    """                    <footer class=\"pmd-shifts__modal-footer\">\n                        <button type=\"button\" class=\"pmd-shifts__button is-danger\" data-pmd-shift-remove-current hidden>Remove shift</button>\n                        <span class=\"pmd-shifts__modal-footer-spacer\" aria-hidden=\"true\"></span>\n                        <button type=\"button\" class=\"pmd-shifts__button is-soft\" data-pmd-shift-close>Cancel</button>\n                        <button type=\"submit\" class=\"pmd-shifts__button\">Save shift</button>\n                    </footer>\n""",
    'Expose Remove shift action in edit modal',
)

# Shifts JS: no late CSS, deterministic roles, direct member edit, connected
# overlap groups, + Member toolbar, edit-modal remove action.
must_replace(
    'js',
    "/* PMD_SHIFTS_CONNECTED_WORKSPACE_V5\n",
    "/* PMD_SHIFTS_CANONICAL_INTERACTION_V1 */\n/* PMD_SHIFTS_CONNECTED_WORKSPACE_V5\n",
    'Mark canonical Shifts interaction authority',
)

must_replace(
    'js',
    "  var notesInput = modal && modal.querySelector('[data-pmd-shift-notes]');\n",
    "  var notesInput = modal && modal.querySelector('[data-pmd-shift-notes]');\n  var removeCurrentButton = modal && modal.querySelector('[data-pmd-shift-remove-current]');\n",
    'Bind current-shift remove button',
)

late_css_pattern = r"  function loadExactSharedUiCss\(\) \{.*?\n  \}\n\n  function setScrollLock"
late_css_replacement = """  function loadExactSharedUiCss() {\n    // The controller already registers pmd-shifts-dashboard-reservations-v4.css\n    // in <head>. Never inject the same authority after first paint.\n    return;\n  }\n\n  function setScrollLock"""
must_regex('js', late_css_pattern, late_css_replacement, 'Disable late duplicate Shifts CSS injection')

must_replace(
    'js',
    "    if (notesInput) notesInput.value = '';\n    personInputs.forEach(function (input) { input.checked = false; });\n",
    """    if (notesInput) notesInput.value = '';\n    if (removeCurrentButton) {\n      removeCurrentButton.hidden = true;\n      removeCurrentButton.removeAttribute('data-pmd-shift-remove');\n    }\n    personInputs.forEach(function (input) { input.checked = false; });\n""",
    'Reset edit-modal remove action',
)

must_replace(
    'js',
    "    if (title) title.textContent = values.id ? 'Edit shift' : 'Add shift';\n\n    var selectedPeople = Array.isArray(values.person_ids)\n",
    """    if (title) title.textContent = values.id ? 'Edit shift' : 'Add shift';\n    if (removeCurrentButton) {\n      if (values.id) {\n        removeCurrentButton.hidden = false;\n        removeCurrentButton.setAttribute('data-pmd-shift-remove', String(values.id));\n      } else {\n        removeCurrentButton.hidden = true;\n        removeCurrentButton.removeAttribute('data-pmd-shift-remove');\n      }\n    }\n\n    var selectedPeople = Array.isArray(values.person_ids)\n""",
    'Show Remove shift only while editing',
)

scheduling_pattern = r"  function schedulingPeople\(\) \{.*?\n  \}\n\n  function personInitials"
scheduling_replacement = r"""  function normalizeRole(value) {
    return String(value || '').toLowerCase().replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim();
  }

  function roleMeta(person) {
    var role = normalizeRole(person && person.role);
    var department = normalizeRole(person && person.department || 'other');
    var text = (role + ' ' + department).trim();

    if (department === 'kitchen' || /\b(kitchen|chef|cook|kds|dish|prep|boh)\b/.test(text)) return {family:'kitchen', rank:10};
    if (!role || /^(team|team member|staff|employee)$/.test(role)) return {family:'team_member', rank:20};
    if (/\b(cashier|till|checkout|pos)\b/.test(role)) return {family:'cashier', rank:40};
    if (/\b(reservation|reservations|reception|host|front desk)\b/.test(role) || department === 'reception') return {family:'reservations', rank:50};
    if (/\b(manager|supervisor|owner)\b/.test(role)) return {family:'manager', rank:60};
    if (/\b(bar|bartender|barman|barmaid)\b/.test(role) || department === 'bar') return {family:'bar', rank:70};
    if (/\b(accountant|accounting|finance|bookkeep)\b/.test(role)) return {family:'accountant', rank:80};
    if (/\b(waiter|server|service|runner|floor)\b/.test(role) || department === 'floor') return {family:'waiter', rank:30};
    return {family:'other', rank:90};
  }

  function schedulingPeople() {
    var people = Array.isArray(boot.people) ? boot.people.slice() : [];
    return people.sort(function (left, right) {
      var leftMeta = roleMeta(left);
      var rightMeta = roleMeta(right);
      if (leftMeta.rank !== rightMeta.rank) return leftMeta.rank - rightMeta.rank;
      return String(left.name || '').localeCompare(String(right.name || ''), undefined, {sensitivity:'base'});
    });
  }

  function personInitials"""
must_regex('js', scheduling_pattern, scheduling_replacement, 'Use requested Dienstplan role order')

shift_markup_pattern = r"  function finalShiftMarkup\(shift, person\) \{.*?\n  \}\n\n  function finalTimeScaleMarkup"
shift_markup_replacement = r"""  function shiftStateForPerson(shift, person) {
    var attendance = (Array.isArray(shift.people) ? shift.people : []).find(function (assigned) {
      return Number(assigned && assigned.person_id || 0) === Number(person.id || 0);
    });
    return String(attendance && attendance.attendance || 'planned').toLowerCase();
  }

  function shiftTimeLabel(shift) {
    var time = shift.start || 'All day';
    if (shift.end) time += '–' + shift.end;
    return time;
  }

  function finalShiftMarkup(shift, person) {
    var window = finalTimelineWindow(shift);
    var total = 1440;
    var left = ((window.start - 360) / total) * 100;
    var width = ((window.end - window.start) / total) * 100;
    var time = shiftTimeLabel(shift);
    var state = shiftStateForPerson(shift, person);
    return '' +
      '<button type="button" class="pmd-shifts-final-shift' + (shift.confirmed ? ' is-confirmed' : '') + (state === 'absent' ? ' is-absent' : '') + '"' +
        ' data-pmd-shift-manage="' + Number(shift.id || 0) + '"' +
        ' style="left:' + left.toFixed(4) + '%;width:' + width.toFixed(4) + '%"' +
        ' title="' + escapeHtml((shift.label || 'Shift') + ' · ' + time + ' · click to edit') + '">' +
        '<strong>' + escapeHtml(time) + '</strong>' +
        '<span>' + escapeHtml(shift.label || 'Shift') + '</span>' +
      '</button>';
  }

  function groupedPersonShifts(personShifts) {
    var sorted = personShifts.slice().sort(function (left, right) {
      var leftWindow = shiftWindow(left);
      var rightWindow = shiftWindow(right);
      if (leftWindow.start !== rightWindow.start) return leftWindow.start - rightWindow.start;
      if (leftWindow.end !== rightWindow.end) return leftWindow.end - rightWindow.end;
      return Number(left.id || 0) - Number(right.id || 0);
    });
    var groups = [];
    sorted.forEach(function (shift) {
      var window = shiftWindow(shift);
      var current = groups.length ? groups[groups.length - 1] : null;
      if (current && window.start <= current.end) {
        current.shifts.push(shift);
        current.end = Math.max(current.end, window.end);
      } else {
        groups.push({start:window.start, end:window.end, shifts:[shift]});
      }
    });
    return groups;
  }

  function finalShiftGroupMarkup(group, person) {
    if (!group || !Array.isArray(group.shifts) || group.shifts.length === 0) return '';
    if (group.shifts.length === 1) return finalShiftMarkup(group.shifts[0], person);

    var start = Math.max(360, Number(group.start || 360));
    var end = Math.min(1800, Number(group.end || start + 30));
    if (end <= start) end = Math.min(1800, start + 30);
    var left = ((start - 360) / 1440) * 100;
    var width = ((end - start) / 1440) * 100;
    var segments = group.shifts.map(function (shift) {
      var state = shiftStateForPerson(shift, person);
      var time = shiftTimeLabel(shift);
      return '' +
        '<button type="button" class="pmd-shifts-final-shift-segment' + (shift.confirmed ? ' is-confirmed' : '') + (state === 'absent' ? ' is-absent' : '') + '"' +
          ' data-pmd-shift-manage="' + Number(shift.id || 0) + '"' +
          ' title="' + escapeHtml((shift.label || 'Shift') + ' · ' + time + ' · click to edit') + '">' +
          '<strong>' + escapeHtml(time) + '</strong>' +
          '<span>' + escapeHtml(shift.label || 'Shift') + '</span>' +
        '</button>';
    }).join('');

    return '' +
      '<div class="pmd-shifts-final-shift-group" style="left:' + left.toFixed(4) + '%;width:' + width.toFixed(4) + '%"' +
        ' title="Connected coverage · ' + group.shifts.length + ' editable shifts">' +
        '<span class="pmd-shifts-final-shift-group__coverage" aria-hidden="true"></span>' +
        '<div class="pmd-shifts-final-shift-group__segments">' + segments + '</div>' +
      '</div>';
  }

  function finalTimeScaleMarkup"""
must_regex('js', shift_markup_pattern, shift_markup_replacement, 'Connect overlapping/touching shifts without merging records')

must_replace(
    'js',
    """      var personShifts = shifts.filter(function (shift) { return shiftHasPerson(shift, person.id); });\n      var shiftsMarkup = personShifts.map(function (shift) { return finalShiftMarkup(shift, person); }).join('');\n      return '' +\n        '<div class=\"pmd-shifts-final-row\" data-person-id=\"' + Number(person.id || 0) + '\">' +\n          '<div class=\"pmd-shifts-final-person\">' +\n            '<span class=\"pmd-shifts-final-avatar\">' + escapeHtml(personInitials(person.name)) + '</span>' +\n            '<span class=\"pmd-shifts-final-person-copy\">' +\n              '<button type=\"button\" data-pmd-team-scroll-person=\"' + Number(person.id || 0) + '\">' + escapeHtml(person.name || 'Team member') + '</button>' +\n              '<small>' + escapeHtml(person.role || 'Team') + '</small>' +\n            '</span>' +\n          '</div>' +\n""",
    """      var personShifts = shifts.filter(function (shift) { return shiftHasPerson(shift, person.id); });\n      var shiftsMarkup = groupedPersonShifts(personShifts).map(function (group) { return finalShiftGroupMarkup(group, person); }).join('');\n      var meta = roleMeta(person);\n      return '' +\n        '<div class=\"pmd-shifts-final-row\" data-person-id=\"' + Number(person.id || 0) + '\" data-pmd-role-family=\"' + meta.family + '\">' +\n          '<div class=\"pmd-shifts-final-person\">' +\n            '<span class=\"pmd-shifts-final-avatar\">' + escapeHtml(personInitials(person.name)) + '</span>' +\n            '<span class=\"pmd-shifts-final-person-copy\">' +\n              '<button type=\"button\" data-pmd-team-edit data-person-id=\"' + Number(person.id || 0) + '\"' +\n                ' data-name=\"' + escapeHtml(person.name || '') + '\" data-role=\"' + escapeHtml(person.role || '') + '\"' +\n                ' data-department=\"' + escapeHtml(person.department || 'other') + '\" data-has-access=\"' + (person.has_access ? '1' : '0') + '\"' +\n                ' data-username=\"' + escapeHtml(person.username || '') + '\" data-staff-role-id=\"' + escapeHtml(person.staff_role_id == null ? '' : String(person.staff_role_id)) + '\"' +\n                ' title=\"Edit member\">' + escapeHtml(person.name || 'Team member') + '</button>' +\n              '<small>' + escapeHtml(person.role || 'Team') + '</small>' +\n            '</span>' +\n          '</div>' +\n""",
    'Render role family and direct member edit on each person row',
)

must_replace(
    'js',
    """          '<div class=\"pmd-shifts-final-actions\">' +\n            (key === todayKey ? '' : '<button type=\"button\" class=\"pmd-shifts-final-soft\" data-pmd-shifts-today>Today</button>') +\n            '<label class=\"pmd-shifts-date-picker\" title=\"Choose date\">' +\n""",
    """          '<div class=\"pmd-shifts-final-actions\">' +\n            '<button type=\"button\" class=\"pmd-shifts-final-member-add\" data-pmd-team-open>+ Member</button>' +\n            (key === todayKey ? '' : '<button type=\"button\" class=\"pmd-shifts-final-soft\" data-pmd-shifts-today>Today</button>') +\n            '<label class=\"pmd-shifts-date-picker\" title=\"Choose date\">' +\n""",
    'Add Member next to Dienstplan calendar controls',
)

must_replace(
    'js',
    "    root.classList.add('is-day-loading');\n    return fetch(url, {credentials: 'same-origin', headers: {'X-Requested-With': 'XMLHttpRequest'}})\n",
    "    root.classList.remove('is-day-loading');\n    return fetch(url, {credentials: 'same-origin', headers: {'X-Requested-With': 'XMLHttpRequest'}})\n",
    'Remove async day opacity/loading effect',
)

# Canonical Shifts CSS: stable first paint + roles + groups + chooser + bell.
css_marker = '/* PMD_SHIFTS_CANONICAL_VISUAL_V1 */'
if css_marker not in updated['css']:
    canonical_css = r'''

/* PMD_SHIFTS_CANONICAL_VISUAL_V1
 * One visual owner: this existing Shifts authority. No late overlay and no
 * refresh/day-change animation. Role identity colors follow the person row.
 */
body.pmd-shifts-page #pmd-shifts,
body.pmd-shifts-page #pmd-shifts *,
body.pmd-shifts-page #pmd-shifts *::before,
body.pmd-shifts-page #pmd-shifts *::after{animation:none!important;animation-duration:0s!important;animation-delay:0s!important;transition:none!important}
body.pmd-shifts-page #pmd-shifts,body.pmd-shifts-page #pmd-shifts.is-day-loading,body.pmd-shifts-page #pmd-shifts.is-day-loading .pmd-shifts-final-screen{opacity:1!important;filter:none!important;transform:none!important;visibility:visible!important}
body.pmd-shifts-page #pmd-shifts-team-panel,body.pmd-shifts-page .pmd-shifts__header [data-pmd-team-scroll]{display:none!important}
body.pmd-shifts-page .pmd-shifts-final-row{--pmd-role-bg:#f2f4f7;--pmd-role-border:#a8b2bf;--pmd-role-accent:#6b7787;--pmd-role-text:#435063;--pmd-role-avatar:#eef1f5;--pmd-role-avatar-border:#b6c0cb}
body.pmd-shifts-page .pmd-shifts-final-row[data-pmd-role-family="kitchen"]{--pmd-role-bg:#fff4d8;--pmd-role-border:#e1aa2f;--pmd-role-accent:#c17a00;--pmd-role-text:#654400;--pmd-role-avatar:#fff1c4;--pmd-role-avatar-border:#e8bf63}
body.pmd-shifts-page .pmd-shifts-final-row[data-pmd-role-family="team_member"]{--pmd-role-bg:#e9faf6;--pmd-role-border:#63b9a7;--pmd-role-accent:#17806c;--pmd-role-text:#17594e;--pmd-role-avatar:#e2f7f2;--pmd-role-avatar-border:#79c4b5}
body.pmd-shifts-page .pmd-shifts-final-row[data-pmd-role-family="waiter"]{--pmd-role-bg:#eaf3ff;--pmd-role-border:#80afe5;--pmd-role-accent:#2f80ed;--pmd-role-text:#174d91;--pmd-role-avatar:#e7f1ff;--pmd-role-avatar-border:#8db6e5}
body.pmd-shifts-page .pmd-shifts-final-row[data-pmd-role-family="cashier"]{--pmd-role-bg:#eaf9ef;--pmd-role-border:#72bd8d;--pmd-role-accent:#27864c;--pmd-role-text:#1e6239;--pmd-role-avatar:#e6f7ec;--pmd-role-avatar-border:#7bc194}
body.pmd-shifts-page .pmd-shifts-final-row[data-pmd-role-family="reservations"]{--pmd-role-bg:#f3ecff;--pmd-role-border:#aa88df;--pmd-role-accent:#7c4dcc;--pmd-role-text:#55318d;--pmd-role-avatar:#f0e8ff;--pmd-role-avatar-border:#b197dc}
body.pmd-shifts-page .pmd-shifts-final-row[data-pmd-role-family="manager"]{--pmd-role-bg:#edf0ff;--pmd-role-border:#8997dc;--pmd-role-accent:#4f5fbd;--pmd-role-text:#354080;--pmd-role-avatar:#e9edff;--pmd-role-avatar-border:#98a3dc}
body.pmd-shifts-page .pmd-shifts-final-row[data-pmd-role-family="bar"]{--pmd-role-bg:#fff0f4;--pmd-role-border:#dc8da4;--pmd-role-accent:#b94e70;--pmd-role-text:#7f3650;--pmd-role-avatar:#ffebf1;--pmd-role-avatar-border:#df9caf}
body.pmd-shifts-page .pmd-shifts-final-row[data-pmd-role-family="accountant"]{--pmd-role-bg:#eaf8fb;--pmd-role-border:#78bdcb;--pmd-role-accent:#26889d;--pmd-role-text:#246071;--pmd-role-avatar:#e5f6fa;--pmd-role-avatar-border:#82c2cf}
body.pmd-shifts-page .pmd-shifts-final-row[data-pmd-role-family="other"]{--pmd-role-bg:#f2f4f7;--pmd-role-border:#a8b2bf;--pmd-role-accent:#6b7787;--pmd-role-text:#435063;--pmd-role-avatar:#eef1f5;--pmd-role-avatar-border:#b6c0cb}
body.pmd-shifts-page .pmd-shifts-final-row .pmd-shifts-final-avatar{border-color:var(--pmd-role-avatar-border)!important;background:var(--pmd-role-avatar)!important;color:var(--pmd-role-text)!important}
body.pmd-shifts-page .pmd-shifts-final-row .pmd-shifts-final-person-copy button{color:var(--pmd-role-text)!important}
body.pmd-shifts-page .pmd-shifts-final-row .pmd-shifts-final-shift{border-color:var(--pmd-role-border)!important;border-left-color:var(--pmd-role-accent)!important;background:var(--pmd-role-bg)!important;color:var(--pmd-role-text)!important}
body.pmd-shifts-page .pmd-shifts-final-row .pmd-shifts-final-shift.is-confirmed{border-color:var(--pmd-role-border)!important;border-left-color:var(--pmd-role-accent)!important;background:var(--pmd-role-bg)!important;color:var(--pmd-role-text)!important;box-shadow:inset 0 0 0 1px rgba(23,128,108,.22)!important}
body.pmd-shifts-page .pmd-shifts-final-row .pmd-shifts-final-shift.is-absent{border-color:#e0a0a0!important;border-left-color:#d34b4b!important;background:#fff1f1!important;color:#8b2929!important;box-shadow:none!important}
body.pmd-shifts-page .pmd-shifts-final-shift-group{position:absolute!important;top:0!important;bottom:0!important;min-width:70px!important;pointer-events:none!important}
body.pmd-shifts-page .pmd-shifts-final-shift-group__coverage{position:absolute!important;inset:0!important;border:1px solid var(--pmd-role-border)!important;border-left:4px solid var(--pmd-role-accent)!important;border-radius:10px!important;background:var(--pmd-role-bg)!important;box-sizing:border-box!important}
body.pmd-shifts-page .pmd-shifts-final-shift-group__segments{position:absolute!important;inset:4px 5px 4px 7px!important;z-index:2!important;display:flex!important;align-items:stretch!important;gap:4px!important;min-width:0!important;pointer-events:none!important}
body.pmd-shifts-page .pmd-shifts-final-shift-segment{display:grid!important;align-content:center!important;flex:1 1 0!important;min-width:0!important;margin:0!important;padding:3px 7px!important;border:1px solid var(--pmd-role-border)!important;border-radius:7px!important;background:rgba(255,255,255,.72)!important;color:var(--pmd-role-text)!important;font:inherit!important;text-align:left!important;overflow:hidden!important;cursor:pointer!important;pointer-events:auto!important}
body.pmd-shifts-page .pmd-shifts-final-shift-segment:hover,body.pmd-shifts-page .pmd-shifts-final-shift-segment:focus-visible{background:#fff!important;outline:1px solid var(--pmd-role-accent)!important;outline-offset:0!important}
body.pmd-shifts-page .pmd-shifts-final-shift-segment strong,body.pmd-shifts-page .pmd-shifts-final-shift-segment span{overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
body.pmd-shifts-page .pmd-shifts-final-shift-segment strong{font-size:9.5px!important;font-weight:900!important}
body.pmd-shifts-page .pmd-shifts-final-shift-segment span{font-size:8.5px!important;font-weight:750!important;opacity:.82!important}
body.pmd-shifts-page .pmd-shifts-final-shift-segment.is-absent{border-color:#e0a0a0!important;background:#fff1f1!important;color:#8b2929!important}
body.pmd-shifts-page .pmd-shifts-final-member-add{display:inline-flex!important;align-items:center!important;justify-content:center!important;min-height:38px!important;padding:0 13px!important;border:1px solid #0b6b59!important;border-radius:11px!important;background:#0b6b59!important;color:#fff!important;font:inherit!important;font-size:11px!important;font-weight:900!important;white-space:nowrap!important;cursor:pointer!important}
body.pmd-shifts-page .pmd-shifts-final-member-add:hover,body.pmd-shifts-page .pmd-shifts-final-member-add:focus-visible{border-color:#075548!important;background:#075548!important;color:#fff!important;outline:none!important}
body.pmd-shifts-page .pmd-shifts__modal-footer-spacer{flex:1 1 auto!important}
body.pmd-shifts-page .pmd-shifts__button.is-danger{border-color:#dc8f8f!important;background:#fff1f1!important;color:#9a3030!important}
body.pmd-shifts-page .pmd-shifts__button.is-danger:hover{border-color:#c96b6b!important;background:#ffe6e6!important}
body.pmd-shifts-page .pmd-shifts__button[hidden]{display:none!important}
body.pmd-shifts-page .pmd-shifts__picker-member-open{margin:0;padding:0;border:0;background:transparent;color:#0b6b59;font:inherit;font-weight:850;text-decoration:underline;cursor:pointer}
body.pmd-shifts-page #pmd-r2-reservation-kpis-v307 .pmd-shifts__kpi-menu{position:absolute!important;top:calc(100% + 8px)!important;right:0!important;left:auto!important;z-index:10080!important;display:grid!important;gap:4px!important;width:286px!important;min-width:286px!important;max-width:min(286px,calc(100vw - 28px))!important;margin:0!important;padding:8px!important;border:1px solid #d6e2ea!important;border-radius:16px!important;background:#fff!important;box-shadow:0 18px 45px rgba(23,55,82,.16)!important;color:#173752!important;overflow:hidden!important}
body.pmd-shifts-page #pmd-r2-reservation-kpis-v307 .pmd-shifts__kpi-menu[hidden]{display:none!important}
body.pmd-shifts-page #pmd-r2-reservation-kpis-v307 .pmd-r2-kpi-v2401-option{display:flex!important;align-items:center!important;justify-content:space-between!important;gap:12px!important;width:100%!important;min-height:54px!important;margin:0!important;padding:9px 10px!important;border:0!important;border-radius:12px!important;background:transparent!important;color:#173752!important;box-shadow:none!important;text-align:left!important;cursor:pointer!important}
body.pmd-shifts-page #pmd-r2-reservation-kpis-v307 .pmd-r2-kpi-v2401-option:hover:not(:disabled),body.pmd-shifts-page #pmd-r2-reservation-kpis-v307 .pmd-r2-kpi-v2401-option:focus-visible:not(:disabled){background:#f2f7fa!important;outline:none!important}
body.pmd-shifts-page #pmd-r2-reservation-kpis-v307 .pmd-r2-kpi-v2401-option.is-selected{background:#eaf5f1!important}
body.pmd-shifts-page .pmd-shifts__notification-slot,body.pmd-shifts-page .pmd-shifts__notification-root,body.pmd-shifts-page .pmd-shifts__notification-root #notifDropdown{width:46px!important;min-width:46px!important;height:46px!important;min-height:46px!important}
body.pmd-shifts-page .pmd-shifts__notification-root #notifDropdown{border-radius:14px!important}
'''
    updated['css'] = updated['css'].rstrip() + canonical_css + '\n'
    print('PATCH: Append canonical Shifts visual authority')
else:
    print('ALREADY: canonical Shifts visual authority')

# Side menu: Shifts calendar-clock icon, no Team item, settings activity clean.
old_shifts_link = """        <a class=\"pmd-sm2__item {{ $pmdActive(['shifts']) ? 'is-active' : '' }}\" href=\"{{ admin_url('shifts') }}\">\n            <svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"M4 5h16v15h-16z\"/><path d=\"M8 3v4M16 3v4M4 10h16\"/><path d=\"M8 14h3M13 14h3M8 17h3\"/></svg>\n            <span class=\"pmd-sm2__label\">{{ $pmdSm2T('nav.shifts', 'Shifts') }}</span>\n        </a>\n"""
new_shifts_link = """        {{-- PMD_SHIFTS_CANONICAL_NAV_V1 --}}\n        <a class=\"pmd-sm2__item {{ $pmdActive(['shifts']) ? 'is-active' : '' }}\" href=\"{{ admin_url('shifts') }}\">\n            <svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><rect x=\"3\" y=\"4\" width=\"18\" height=\"17\" rx=\"2\"/><path d=\"M8 2v4M16 2v4M3 9h18\"/><circle cx=\"12\" cy=\"14\" r=\"3\"/><path d=\"M12 12.5V14l1 1\"/></svg>\n            <span class=\"pmd-sm2__label\">{{ $pmdSm2T('nav.shifts', 'Shifts') }}</span>\n        </a>\n"""
must_replace('menu', old_shifts_link, new_shifts_link, 'Change Shifts side-menu icon')

team_nav = """        <a class=\"pmd-sm2__item {{ $pmdActive(['pmdteam']) ? 'is-active' : '' }}\" href=\"{{ admin_url('settings/team') }}\">\n            <svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"9\" cy=\"8\" r=\"3\"/><path d=\"M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5\"/></svg>\n            <span class=\"pmd-sm2__label\">{{ $pmdSm2T('nav.team', 'Team') }}</span>\n        </a>\n"""
must_replace('menu', team_nav, "", 'Remove Team side-menu item')

must_replace(
    'menu',
    "$pmdActive(['pmdsettings', 'pmddevices', 'pmdteam', 'pmdfinance', 'pmdadvanced', 'languages', 'currencies'])",
    "$pmdActive(['pmdsettings', 'pmddevices', 'pmdfinance', 'pmdadvanced', 'languages', 'currencies'])",
    'Remove pmdteam from Settings active routes',
)

# Settings: remove Team & Access group at controller payload source.
must_replace(
    'settings',
    "        $this->vars['pmdSettingsGroups'] = $this->groups($locationId);\n",
    """        // PMD_SETTINGS_NO_TEAM_CARD_V1: Team/member authority is Shifts.\n        $this->vars['pmdSettingsGroups'] = collect($this->groups($locationId))\n            ->reject(fn ($group) => strtolower((string)($group['id'] ?? '')) === 'team')\n            ->values()\n            ->all();\n""",
    'Remove Team & Access from Settings payload',
)

# Canonical retired-page routing: Team browser pages now resolve to Shifts.
must_replace(
    'retired',
    """            'pmdteam' =>\n                'settings/team',\n\n            // PMD_UNIFIED_TEAM_V1: old People browser workspace now resolves\n            // to the single Team authority. Write/backend descendants remain untouched.\n            'people' =>\n                'settings/team',\n""",
    """            // PMD_SHIFTS_SINGLE_TEAM_AUTHORITY_V1\n            'pmdteam' =>\n                'shifts',\n\n            'people' =>\n                'shifts',\n\n            'settings/team' =>\n                'shifts',\n""",
    'Retire browser Team/People pages to Shifts',
)

# Validate all transforms before touching disk.
checks = [
    ('controller', 'PMD_SHIFTS_CANONICAL_ROSTER_V1'),
    ('controller', 'PMD_SHIFTS_EXACT_DUPLICATE_GUARD_V1'),
    ('view', 'PMD_SHIFTS_CANONICAL_TEAM_SURFACE_V1'),
    ('view', 'data-pmd-shift-remove-current'),
    ('js', 'PMD_SHIFTS_CANONICAL_INTERACTION_V1'),
    ('js', 'groupedPersonShifts'),
    ('js', 'data-pmd-role-family'),
    ('css', 'PMD_SHIFTS_CANONICAL_VISUAL_V1'),
    ('menu', 'PMD_SHIFTS_CANONICAL_NAV_V1'),
    ('settings', 'PMD_SETTINGS_NO_TEAM_CARD_V1'),
    ('retired', 'PMD_SHIFTS_SINGLE_TEAM_AUTHORITY_V1'),
]
for name, token in checks:
    if token not in updated[name]:
        raise RuntimeError(f'post-transform check failed: {name} missing {token}')

if 'id="pmd-shifts-team-panel"' in updated['view']:
    raise RuntimeError('Team panel still present in Shifts Blade')
if 'class="pmd-shifts__header-icon" data-pmd-team-scroll' in updated['view']:
    raise RuntimeError('Members header button still present in Shifts Blade')

BACKUP.mkdir(parents=True, exist_ok=False)
for name, path in PATHS.items():
    rel = path.relative_to(ROOT)
    dest = BACKUP / rel
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(path, dest)

print(f'BACKUP: {BACKUP}')

try:
    for name, path in PATHS.items():
        if updated[name] == original[name]:
            continue
        tmp = path.with_name(path.name + '.pmdtmp')
        tmp.write_text(updated[name], encoding='utf-8')
        shutil.copymode(path, tmp)
        tmp.replace(path)
        print(f'WRITE: {path.relative_to(ROOT)}')

    commands = [
        ['php', '-l', str(PATHS['controller'])],
        ['php', '-l', str(PATHS['settings'])],
        ['php', '-l', str(PATHS['retired'])],
    ]
    if shutil.which('node'):
        commands.append(['node', '--check', str(PATHS['js'])])

    for command in commands:
        result = subprocess.run(command, cwd=str(ROOT), text=True, stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        print(result.stdout.strip())
        if result.returncode != 0:
            raise RuntimeError('validation command failed: ' + ' '.join(command))

except Exception:
    print('ERROR: validation failed; restoring all touched files from backup', file=sys.stderr)
    for name, path in PATHS.items():
        source = BACKUP / path.relative_to(ROOT)
        if source.exists():
            shutil.copy2(source, path)
    raise

print('OK: canonical Shifts patch applied')
print('NOTE: database migration is NOT run by this patch')
print('NOTE: PmdSiteAccessGateMiddleware is NOT changed by this patch')
