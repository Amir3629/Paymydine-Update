from pathlib import Path
import re

BASE = 'e17e0faec1edc3acdc6587a677c040d91085186a'

SHIFT_CONTROLLER = Path('app/admin/controllers/Shifts.php')
SHIFT_VIEW = Path('app/admin/views/pmdshifts/index.blade.php')
SHIFT_JS = Path('app/admin/assets/js/pmd-shifts-v1.js')
SHIFT_CSS = Path('app/admin/assets/css/pmd-shifts-dashboard-reservations-v4.css')
MENU_CONTROLLER = Path('app/admin/controllers/Pmdmenus.php')
MENU_VIEW = Path('app/admin/views/pmdmenus/index.blade.php')
MENU_CSS = Path('app/admin/assets/css/pmd-menu-manager-v129.css')
SCHEMA_SERVICE = Path('app/Services/PmdKitchenOperationsSchemaService.php')
MIGRATION = Path('app/system/database/migrations/2026_08_29_160000_add_break_minutes_to_pmd_operational_shifts.php')


def replace_once(text, old, new, label):
    if old not in text:
        raise SystemExit(f'{label}: anchor not found')
    return text.replace(old, new, 1)

# ---------------------------------------------------------------------------
# Shifts controller: mandatory PMD access in the unified Member flow + pause.
# ---------------------------------------------------------------------------
php = SHIFT_CONTROLLER.read_text()
php = replace_once(
    php,
    "        $wantsAccess = request()->boolean('give_access') || (bool)$existingStaff;",
    "        // PMD_SHIFTS_MEMBER_LOGIN_REQUIRED_V17\n        // Every newly saved restaurant member must have a PMD login. Existing\n        // linked members keep their current password unless a new one is supplied.\n        $wantsAccess = true;",
    'mandatory member access',
)

php = replace_once(
    php,
    "        $scheduledHoursMonth = 0.0;\n        foreach ($shifts as $shift) {",
    "        $scheduledHoursMonth = 0.0;\n        $hasBreakMinutes = $ready && Schema::hasColumn('pmd_operational_shifts', 'break_minutes');\n        foreach ($shifts as $shift) {",
    'month hours break flag',
)
php = replace_once(
    php,
    "            $assigned = collect($shift->people ?? [])->count();\n            if ($assigned < 1) continue;\n            $scheduledHoursMonth += (($end - $start) / 60) * $assigned;",
    "            $assigned = collect($shift->people ?? [])->count();\n            if ($assigned < 1) continue;\n            $breakMinutes = $hasBreakMinutes ? max(0, min(240, (int)($shift->break_minutes ?? 0))) : 0;\n            $workedMinutes = max(0, ($end - $start) - $breakMinutes);\n            $scheduledHoursMonth += ($workedMinutes / 60) * $assigned;",
    'month hours subtract pause',
)

php = replace_once(
    php,
    "            'notes' => ['nullable', 'string', 'max:2000'],\n            'person_ids' => ['nullable', 'array'],",
    "            'notes' => ['nullable', 'string', 'max:2000'],\n            'break_minutes' => ['nullable', 'integer', 'min:0', 'max:240'],\n            'person_ids' => ['nullable', 'array'],",
    'break validation',
)
php = replace_once(
    php,
    "            if (Schema::hasColumn('pmd_operational_shifts', 'notes')) {\n                $values['notes'] = trim((string)($clean['notes'] ?? '')) ?: null;\n            }",
    "            if (Schema::hasColumn('pmd_operational_shifts', 'notes')) {\n                $values['notes'] = trim((string)($clean['notes'] ?? '')) ?: null;\n            }\n            if (Schema::hasColumn('pmd_operational_shifts', 'break_minutes')) {\n                $values['break_minutes'] = max(0, min(240, (int)($clean['break_minutes'] ?? 30)));\n            }",
    'break persistence',
)

# Preserve pause in the legacy copy-week endpoint even though the UI button is removed.
php = replace_once(
    php,
    "                    'ends_at' => $shift->ends_at,\n                    'notes' => $shift->notes ?? null,",
    "                    'ends_at' => $shift->ends_at,\n                    'notes' => $shift->notes ?? null,\n                    'break_minutes' => Schema::hasColumn('pmd_operational_shifts', 'break_minutes') ? max(0, min(240, (int)($shift->break_minutes ?? 0))) : 0,",
    'copy week pause',
)
SHIFT_CONTROLLER.write_text(php.rstrip() + '\n')

# ---------------------------------------------------------------------------
# Shifts view: remove capacity/copy-week; add pause; mandatory login fields.
# ---------------------------------------------------------------------------
view = SHIFT_VIEW.read_text()
view = view.replace("    $capacity = $data['capacity'] ?? [];\n", '', 1)

view, count = re.subn(
    r'\n\s*<button type="button" class="pmd-shifts__header-icon" data-pmd-capacity-open.*?</button>',
    '',
    view,
    count=1,
    flags=re.S,
)
if count != 1:
    raise SystemExit('capacity header button not found')

# boot shift pause
view = replace_once(
    view,
    "            'notes' => (string)($shift->notes ?? ''),\n            'confirmed' =>",
    "            'notes' => (string)($shift->notes ?? ''),\n            'break_minutes' => isset($shift->break_minutes) ? max(0, min(240, (int)$shift->break_minutes)) : 0,\n            'confirmed' =>",
    'boot pause',
)

# team incomplete login label
view = replace_once(
    view,
    "<strong>{{ $personAccess && $personAccess->user ? $personAccess->user->username : 'No login' }}</strong>",
    "<strong>{{ $personAccess && $personAccess->user ? $personAccess->user->username : 'Set password' }}</strong>",
    'team login status',
)
view = view.replace('Use + Member. A name is enough.', 'Use + Member to create the account.', 1)

# shift quick controls + pause field
old_presets = '''                        <div class="pmd-shifts__preset-row">\n                            <button type="button" data-pmd-shift-preset="Lunch" data-start="11:00" data-end="16:00">Lunch</button>\n                            <button type="button" data-pmd-shift-preset="Dinner" data-start="17:00" data-end="23:00">Dinner</button>\n                            <button type="button" data-pmd-shift-preset="Full day" data-start="" data-end="">Full day</button>\n                        </div>'''
new_presets = '''                        <div class="pmd-shifts__preset-row pmd-shifts__shift-quick-row">\n                            <button type="button" data-pmd-shift-duration="480">8 hours</button>\n                            <button type="button" data-pmd-shift-break-default="30">30 min Pause</button>\n                        </div>'''
view = replace_once(view, old_presets, new_presets, 'shift quick controls')

view = replace_once(
    view,
    '''                            <label><span>Start</span><input type="time" name="starts_at" data-pmd-shift-start></label>\n                            <label><span>End</span><input type="time" name="ends_at" data-pmd-shift-end></label>\n                            <label class="is-full"><span>Note</span>''',
    '''                            <label><span>Start</span><input type="time" name="starts_at" data-pmd-shift-start></label>\n                            <label><span>End</span><input type="time" name="ends_at" data-pmd-shift-end></label>\n                            <label><span>Pause (min)</span><input type="number" name="break_minutes" min="0" max="240" step="5" value="30" data-pmd-shift-break></label>\n                            <label class="is-full"><span>Note</span>''',
    'pause field',
)

# mandatory access: remove toggle, always show fields, hidden give_access authority
access_toggle_pattern = r'''\n\s*<label class="pmd-shifts__team-access-toggle">\s*<input type="checkbox" name="give_access" value="1" data-pmd-team-access-toggle>\s*<span><strong>Create PMD login</strong></span>\s*</label>'''
view, count = re.subn(access_toggle_pattern, '\n                    <input type="hidden" name="give_access" value="1">', view, count=1, flags=re.S)
if count != 1:
    raise SystemExit('team access toggle not found')
view = replace_once(
    view,
    '<div class="pmd-shifts__team-access-fields" data-pmd-team-access-fields hidden>',
    '<div class="pmd-shifts__team-access-fields is-required" data-pmd-team-access-fields>',
    'always-visible team access fields',
)
view = replace_once(view, 'name="username" autocomplete="off" data-pmd-team-username', 'name="username" autocomplete="off" required data-pmd-team-username', 'username required')
view = replace_once(view, 'name="staff_role_id" data-pmd-team-access-role', 'name="staff_role_id" required data-pmd-team-access-role', 'role required')
view = replace_once(view, 'name="password" autocomplete="new-password" data-pmd-team-password', 'name="password" autocomplete="new-password" required data-pmd-team-password', 'password required')

# Remove Kitchen capacity modal and hidden copy-week form from Shifts.
view, count = re.subn(
    r'\n\s*<div class="pmd-shifts__modal" data-pmd-capacity-modal.*?</div>\n\s*<form data-pmd-copy-week-form.*?</form>',
    '',
    view,
    count=1,
    flags=re.S,
)
if count != 1:
    raise SystemExit('capacity modal/copy week block not found')
SHIFT_VIEW.write_text(view.rstrip() + '\n')

# ---------------------------------------------------------------------------
# Shifts JS: 24h restaurant-day timeline, 8h default, pause, no Copy week.
# ---------------------------------------------------------------------------
js = SHIFT_JS.read_text()
js = js.replace('data-pmd-shifts-exact-ui-v16', 'data-pmd-shifts-exact-ui-v17')
js = js.replace('pmd-shifts-dashboard-reservations-v4.css?v=16', 'pmd-shifts-dashboard-reservations-v4.css?v=17')

js = replace_once(js, "  var endInput = modal && modal.querySelector('[data-pmd-shift-end]');\n  var notesInput", "  var endInput = modal && modal.querySelector('[data-pmd-shift-end]');\n  var breakInput = modal && modal.querySelector('[data-pmd-shift-break]');\n  var notesInput", 'break input binding')

js = replace_once(
    js,
    "    if (labelInput) labelInput.value = 'Dinner';\n    if (startInput) startInput.value = '';\n    if (endInput) endInput.value = '';\n    if (notesInput) notesInput.value = '';",
    "    if (labelInput) labelInput.value = 'Shift';\n    if (startInput) startInput.value = '09:00';\n    if (endInput) endInput.value = '17:00';\n    if (breakInput) breakInput.value = '30';\n    if (notesInput) notesInput.value = '';",
    '8h reset defaults',
)
js = replace_once(
    js,
    "    if (values.end !== undefined && endInput) endInput.value = values.end || '';\n    if (values.notes !== undefined",
    "    if (values.end !== undefined && endInput) endInput.value = values.end || '';\n    if (values.break_minutes !== undefined && breakInput) breakInput.value = String(values.break_minutes == null ? 30 : values.break_minutes);\n    if (values.notes !== undefined",
    'open modal pause',
)

# mandatory access JS without toggle
sync_start = js.find('  function syncTeamAccessFields() {')
sync_end = js.find('  function suggestedUsername(name) {', sync_start)
if sync_start < 0 or sync_end < 0:
    raise SystemExit('syncTeamAccessFields bounds missing')
js = js[:sync_start] + '''  function syncTeamAccessFields() {\n    if (!teamAccessFields) return;\n    teamAccessFields.hidden = false;\n    teamAccessFields.querySelectorAll('input,select').forEach(function (field) { field.disabled = false; });\n    if (teamUsernameInput) teamUsernameInput.required = true;\n    if (teamAccessRoleInput) teamAccessRoleInput.required = true;\n    if (teamPasswordInput) teamPasswordInput.required = !teamHasExistingAccess;\n  }\n\n''' + js[sync_end:]
js = js.replace("    if (teamAccessToggle) { teamAccessToggle.checked = false; teamAccessToggle.disabled = false; }\n", '')
js = js.replace("      if (teamAccessToggle) { teamAccessToggle.checked = hasAccess; teamAccessToggle.disabled = hasAccess; }\n", '')
js = js.replace("  if (teamAccessToggle) teamAccessToggle.addEventListener('change', syncTeamAccessFields);\n", '')

js = replace_once(
    js,
    "      notes: shift.notes || '',\n      person_ids:",
    "      notes: shift.notes || '',\n      break_minutes: Number(shift.break_minutes == null ? 0 : shift.break_minutes),\n      person_ids:",
    'valuesFromShift pause',
)

# 24-hour restaurant day: 06:00 -> 06:00 next day.
js = js.replace('    var dayEnd = 1560;', '    var dayEnd = 1800;', 1)
js = js.replace('    var total = 1200;', '    var total = 1440;', 1)
js = js.replace('    for (var value = 360; value <= 1560; value += 120) {', '    for (var value = 360; value <= 1800; value += 120) {', 1)
js = js.replace('    for (var value = 360; value < 1560; value += 30) {', '    for (var value = 360; value < 1800; value += 30) {', 1)

# Remove copy-week wiring/button from V16 render.
js = re.sub(r"\n\s*var copyWeekInput = root\.querySelector\('\[data-pmd-copy-week-form\] input\[name=\\\"week\\\"\]'\);\n\s*if \(copyWeekInput\) copyWeekInput\.value = weekStartKey\(key\);", '', js, count=1)
js = js.replace("            '<button type=\"button\" class=\"pmd-shifts-final-soft\" data-pmd-copy-week>Copy week</button>' +\n", '', 1)
js = re.sub(r"\n\s*var copyWeek = event\.target\.closest\('\[data-pmd-copy-week\]'\);.*?\n\s*}\n", '\n', js, count=1, flags=re.S)

# Slot create defaults to eight hours.
js = replace_once(js, '        end: minuteLabel(personStartMinutes + 4 * 60),', '        end: minuteLabel(personStartMinutes + 8 * 60),\n        break_minutes: 30,', 'slot 8h default')

# Quick 8-hour and pause actions before legacy preset handling.
preset_anchor = "    var preset = event.target.closest('[data-pmd-shift-preset]');\n"
quick_handlers = '''    var durationQuick = event.target.closest('[data-pmd-shift-duration]');\n    if (durationQuick && modal && modal.contains(durationQuick)) {\n      event.preventDefault();\n      var duration = Math.max(30, Number(durationQuick.getAttribute('data-pmd-shift-duration') || 480));\n      if (startInput && endInput) endInput.value = minuteLabel(minuteValue(startInput.value, 9 * 60) + duration);\n      return;\n    }\n\n    var breakQuick = event.target.closest('[data-pmd-shift-break-default]');\n    if (breakQuick && modal && modal.contains(breakQuick)) {\n      event.preventDefault();\n      if (breakInput) breakInput.value = String(Math.max(0, Number(breakQuick.getAttribute('data-pmd-shift-break-default') || 30)));\n      return;\n    }\n\n'''
if preset_anchor not in js:
    raise SystemExit('preset event anchor missing')
js = js.replace(preset_anchor, quick_handlers + preset_anchor, 1)

# Start changes keep an eight-hour default on new shifts.
listener_anchor = "  if (teamNameInput) teamNameInput.addEventListener('input', function () {\n"
start_listener = "  if (startInput) startInput.addEventListener('change', function () {\n    if (!idInput || !idInput.value) {\n      if (endInput) endInput.value = minuteLabel(minuteValue(startInput.value, 9 * 60) + 8 * 60);\n    }\n  });\n"
if listener_anchor not in js:
    raise SystemExit('teamName listener anchor missing')
js = js.replace(listener_anchor, start_listener + listener_anchor, 1)

SHIFT_JS.write_text(js.rstrip() + '\n')

# ---------------------------------------------------------------------------
# Shifts CSS: centered date navigation + explicit horizontal 24h scrolling.
# ---------------------------------------------------------------------------
css = SHIFT_CSS.read_text().rstrip()
css += r'''

/* PMD_SHIFTS_OPERATIONAL_FINAL_V17
 * Centered day navigation and explicit 24h horizontal rota geometry.
 */
body.pmd-shifts-page .pmd-shifts-final-toolbar{
  position:relative!important;
  display:grid!important;
  grid-template-columns:minmax(0,1fr) auto minmax(0,1fr)!important;
  align-items:center!important;
}
body.pmd-shifts-page .pmd-shifts-final-date{
  grid-column:2!important;
  justify-self:center!important;
}
body.pmd-shifts-page .pmd-shifts-final-date h2{
  text-align:center!important;
}
body.pmd-shifts-page .pmd-shifts-final-actions{
  grid-column:3!important;
  justify-self:end!important;
}
body.pmd-shifts-page .pmd-shifts-final-scroll{
  overflow-x:auto!important;
  overflow-y:hidden!important;
  overscroll-behavior-x:contain!important;
  scrollbar-gutter:stable!important;
  -webkit-overflow-scrolling:touch!important;
}
body.pmd-shifts-page .pmd-shifts-final-board{
  min-width:1900px!important;
}
body.pmd-shifts-page .pmd-shifts-final-scale-row,
body.pmd-shifts-page .pmd-shifts-final-row{
  grid-template-columns:220px minmax(1680px,1fr)!important;
}
body.pmd-shifts-page .pmd-shifts-final-scale{
  display:flex!important;
  align-items:center!important;
  justify-content:space-between!important;
  gap:0!important;
}
body.pmd-shifts-page .pmd-shifts-final-track{
  background:
    repeating-linear-gradient(to right,transparent 0,transparent calc(4.1666667% - 1px),#edf2f5 calc(4.1666667% - 1px),#edf2f5 4.1666667%),
    #fff!important;
}
body.pmd-shifts-page .pmd-shifts-final-slots{
  grid-template-columns:repeat(48,minmax(0,1fr))!important;
}
body.pmd-shifts-page .pmd-shifts__shift-quick-row{
  margin-bottom:2px!important;
}
body.pmd-shifts-page .pmd-shifts__team-access-fields.is-required{
  display:grid!important;
}
@media(max-width:820px){
  body.pmd-shifts-page .pmd-shifts-final-toolbar{
    display:flex!important;
    flex-direction:column!important;
  }
  body.pmd-shifts-page .pmd-shifts-final-date,
  body.pmd-shifts-page .pmd-shifts-final-actions{
    justify-self:auto!important;
  }
  body.pmd-shifts-page .pmd-shifts-final-scale-row,
  body.pmd-shifts-page .pmd-shifts-final-row{
    grid-template-columns:180px minmax(1680px,1fr)!important;
  }
}
'''
SHIFT_CSS.write_text(css.rstrip() + '\n')

# ---------------------------------------------------------------------------
# Schema: persist break minutes without changing historical shift hours.
# Existing rows remain 0; new UI writes 30 by default.
# ---------------------------------------------------------------------------
schema = SCHEMA_SERVICE.read_text()
notes_block = '''        } elseif (!$schema->hasColumn('pmd_operational_shifts', 'notes')) {\n            $schema->table('pmd_operational_shifts', function (Blueprint $table) {\n                $table->text('notes')->nullable()->after('ends_at');\n            });\n        }\n'''
if notes_block not in schema:
    raise SystemExit('schema shift notes block not found')
schema = schema.replace(notes_block, notes_block + '''\n        if ($schema->hasTable('pmd_operational_shifts') && !$schema->hasColumn('pmd_operational_shifts', 'break_minutes')) {\n            $schema->table('pmd_operational_shifts', function (Blueprint $table) {\n                $table->unsignedSmallInteger('break_minutes')->default(0)->after('ends_at');\n            });\n        }\n''', 1)
SCHEMA_SERVICE.write_text(schema.rstrip() + '\n')

MIGRATION.write_text('''<?php\n\nnamespace System\\Database\\Migrations;\n\nuse Illuminate\\Database\\Migrations\\Migration;\nuse Illuminate\\Database\\Schema\\Blueprint;\nuse Illuminate\\Support\\Facades\\Schema;\n\nclass AddBreakMinutesToPmdOperationalShifts extends Migration\n{\n    public function up()\n    {\n        if (Schema::hasTable('pmd_operational_shifts') && !Schema::hasColumn('pmd_operational_shifts', 'break_minutes')) {\n            Schema::table('pmd_operational_shifts', function (Blueprint $table) {\n                // Historical rows remain 0. New Shifts UI explicitly defaults to 30.\n                $table->unsignedSmallInteger('break_minutes')->default(0)->after('ends_at');\n            });\n        }\n    }\n\n    public function down()\n    {\n        if (Schema::hasTable('pmd_operational_shifts') && Schema::hasColumn('pmd_operational_shifts', 'break_minutes')) {\n            Schema::table('pmd_operational_shifts', function (Blueprint $table) {\n                $table->dropColumn('break_minutes');\n            });\n        }\n    }\n}\n''')

# ---------------------------------------------------------------------------
# Menu controller: expose Kitchen capacity settings in the Menu workspace.
# ---------------------------------------------------------------------------
menu_php = MENU_CONTROLLER.read_text()
vars_anchor = "        $this->vars['pmdMenuManagerStats'] = [\n"
capacity_vars = '''        $pmdCanManageKitchenCapacityV17 = in_array($pmdMenuManagerRole, ['owner', 'manager'], true);\n        $pmdBusyThresholdV17 = $this->pmdSettingIntV17('eta_busy_item_threshold', 10, 1, 500);\n        $pmdVeryBusyThresholdV17 = $this->pmdSettingIntV17('eta_very_busy_item_threshold', 25, 2, 1000);\n        if ($pmdVeryBusyThresholdV17 <= $pmdBusyThresholdV17) $pmdVeryBusyThresholdV17 = min(1000, $pmdBusyThresholdV17 + 1);\n\n        $this->vars['pmdMenuManagerCanManageKitchenCapacity'] = $pmdCanManageKitchenCapacityV17;\n        $this->vars['pmdMenuManagerKitchenCapacity'] = [\n            'busy_item_threshold' => $pmdBusyThresholdV17,\n            'very_busy_item_threshold' => $pmdVeryBusyThresholdV17,\n            'busy_extra_minutes' => $this->pmdSettingIntV17('eta_busy_extra_minutes', 5, 0, 120),\n            'very_busy_extra_minutes' => $this->pmdSettingIntV17('eta_very_busy_extra_minutes', 10, 0, 240),\n            'peak_enabled' => $this->pmdSettingBoolV17('pmd_kitchen_peak_enabled', false),\n            'peak_start' => $this->pmdSettingTimeV17('pmd_kitchen_peak_start', '18:00'),\n            'peak_end' => $this->pmdSettingTimeV17('pmd_kitchen_peak_end', '21:00'),\n            'peak_extra_minutes' => $this->pmdSettingIntV17('pmd_kitchen_peak_extra_minutes', 5, 0, 120),\n        ];\n\n'''
if vars_anchor not in menu_php:
    raise SystemExit('menu stats vars anchor missing')
menu_php = menu_php.replace(vars_anchor, capacity_vars + vars_anchor, 1)

helper_anchor = "    protected function comboDerivedProfile(array $items, array $catalog): array\n"
helpers = '''    private function pmdSettingValueV17(string $key, $default)\n    {\n        try {\n            if (!Schema::hasTable('settings')) return $default;\n            $query = DB::table('settings')->where('item', $key);\n            if (Schema::hasColumn('settings', 'setting_id')) $query->orderByDesc('setting_id');\n            $value = $query->value('value');\n            return ($value === null || $value === '') ? $default : $value;\n        } catch (\\Throwable $error) {\n            return $default;\n        }\n    }\n\n    private function pmdSettingIntV17(string $key, int $default, int $min, int $max): int\n    {\n        return max($min, min($max, (int)$this->pmdSettingValueV17($key, $default)));\n    }\n\n    private function pmdSettingBoolV17(string $key, bool $default): bool\n    {\n        $value = $this->pmdSettingValueV17($key, $default ? 1 : 0);\n        return in_array(strtolower(trim((string)$value)), ['1', 'true', 'yes', 'on'], true);\n    }\n\n    private function pmdSettingTimeV17(string $key, string $default): string\n    {\n        $value = trim((string)$this->pmdSettingValueV17($key, $default));\n        return preg_match('/^(?:[01]\\d|2[0-3]):[0-5]\\d$/', $value) ? $value : $default;\n    }\n\n'''
if helper_anchor not in menu_php:
    raise SystemExit('menu helper anchor missing')
menu_php = menu_php.replace(helper_anchor, helpers + helper_anchor, 1)
MENU_CONTROLLER.write_text(menu_php.rstrip() + '\n')

# ---------------------------------------------------------------------------
# Menu view: Kitchen capacity icon + modal; save authority remains Shifts::saveeta.
# ---------------------------------------------------------------------------
menu_view = MENU_VIEW.read_text()
menu_view = replace_once(
    menu_view,
    "    $totalCatalogueCards = count($cards) + count($combos);\n",
    "    $totalCatalogueCards = count($cards) + count($combos);\n    $kitchenCapacity = $pmdMenuManagerKitchenCapacity ?? [];\n    $canManageKitchenCapacity = !empty($pmdMenuManagerCanManageKitchenCapacity);\n",
    'menu capacity vars',
)

notif_anchor = '''\n\n\n            <span\n                data-pmd-main-header-notification-gap-r67=""'''
capacity_button = '''\n\n        @if($canManageKitchenCapacity)\n            <button\n                type="button"\n                class="pmd-dashboard-lab__header-action"\n                data-pmd-menu-capacity-open\n                aria-label="Kitchen capacity"\n                title="Kitchen capacity"\n            >\n                <svg viewBox="0 0 24 24" aria-hidden="true">\n                    <path d="M12 3c1.8 3 5 4.6 5 9a5 5 0 0 1-10 0c0-2.3 1.2-4.4 3.5-6.5.2 2 1 3 1.5 3.5 1.2-1.4 1.2-3.7 0-6z"></path>\n                </svg>\n            </button>\n        @endif\n'''
if notif_anchor not in menu_view:
    raise SystemExit('menu notification gap anchor missing')
menu_view = menu_view.replace(notif_anchor, capacity_button + notif_anchor, 1)

capacity_modal = r'''

@if($canManageKitchenCapacity)
<div class="pmd-menu-capacity-modal" data-pmd-menu-capacity-modal hidden aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="pmd-menu-capacity-title">
    <button type="button" class="pmd-menu-capacity-modal__backdrop" data-pmd-menu-capacity-close tabindex="-1" aria-label="Close"></button>
    <section class="pmd-menu-capacity-card" role="document">
        <header class="pmd-menu-capacity-card__header">
            <h2 id="pmd-menu-capacity-title">Kitchen capacity</h2>
            <button type="button" data-pmd-menu-capacity-close aria-label="Close">×</button>
        </header>
        <form method="post" action="{{ admin_url('shifts/saveeta') }}">
            @csrf
            <input type="hidden" name="return_to" value="{{ request()->getRequestUri() }}">
            <div class="pmd-menu-capacity-card__body">
                <div class="pmd-menu-capacity-grid">
                    <label><span>Busy at</span><input type="number" name="busy_item_threshold" min="1" max="500" value="{{ (int)($kitchenCapacity['busy_item_threshold'] ?? 10) }}"></label>
                    <label><span>+ minutes</span><input type="number" name="busy_extra_minutes" min="0" max="120" value="{{ (int)($kitchenCapacity['busy_extra_minutes'] ?? 5) }}"></label>
                    <label><span>Very busy at</span><input type="number" name="very_busy_item_threshold" min="2" max="1000" value="{{ (int)($kitchenCapacity['very_busy_item_threshold'] ?? 25) }}"></label>
                    <label><span>+ minutes</span><input type="number" name="very_busy_extra_minutes" min="0" max="240" value="{{ (int)($kitchenCapacity['very_busy_extra_minutes'] ?? 10) }}"></label>
                </div>
                <label class="pmd-menu-capacity-toggle">
                    <input type="hidden" name="peak_enabled_present" value="1">
                    <input type="checkbox" name="peak_enabled" value="1" {{ !empty($kitchenCapacity['peak_enabled']) ? 'checked' : '' }}>
                    <span>Peak time</span>
                </label>
                <div class="pmd-menu-capacity-grid">
                    <label><span>Starts</span><input type="time" name="peak_start" value="{{ $kitchenCapacity['peak_start'] ?? '18:00' }}"></label>
                    <label><span>Ends</span><input type="time" name="peak_end" value="{{ $kitchenCapacity['peak_end'] ?? '21:00' }}"></label>
                    <label><span>Peak buffer</span><input type="number" name="peak_extra_minutes" min="0" max="120" value="{{ (int)($kitchenCapacity['peak_extra_minutes'] ?? 5) }}"></label>
                </div>
            </div>
            <footer class="pmd-menu-capacity-card__footer">
                <button type="button" class="is-soft" data-pmd-menu-capacity-close>Cancel</button>
                <button type="submit">Save</button>
            </footer>
        </form>
    </section>
</div>
<script data-pmd-menu-capacity-v17>
(function () {
  'use strict';
  var modal = document.querySelector('[data-pmd-menu-capacity-modal]');
  if (!modal) return;
  function openModal() {
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.style.overflow = 'hidden';
  }
  function closeModal() {
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = '';
  }
  document.addEventListener('click', function (event) {
    if (event.target.closest('[data-pmd-menu-capacity-open]')) { event.preventDefault(); openModal(); return; }
    if (event.target.closest('[data-pmd-menu-capacity-close]')) { event.preventDefault(); closeModal(); }
  });
  document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && !modal.hidden) closeModal(); });
})();
</script>
@endif
'''
parts = menu_view.rsplit('</div>', 1)
if len(parts) != 2:
    raise SystemExit('menu outer closing div not found')
menu_view = parts[0] + capacity_modal + '\n</div>' + parts[1]
MENU_VIEW.write_text(menu_view.rstrip() + '\n')

# Menu capacity modal styling.
menu_css = MENU_CSS.read_text().rstrip()
menu_css += r'''

/* PMD_MENU_KITCHEN_CAPACITY_V17 */
body.pmd-menu-manager-page .pmd-menu-capacity-modal[hidden]{display:none!important}
body.pmd-menu-manager-page .pmd-menu-capacity-modal{
  position:fixed!important;
  inset:0!important;
  z-index:25050!important;
  display:flex!important;
  align-items:center!important;
  justify-content:center!important;
  padding:24px!important;
  box-sizing:border-box!important;
}
body.pmd-menu-manager-page .pmd-menu-capacity-modal__backdrop{
  position:absolute!important;
  inset:0!important;
  width:100%!important;
  height:100%!important;
  border:0!important;
  background:rgba(17,38,54,.28)!important;
  backdrop-filter:blur(7px)!important;
}
body.pmd-menu-manager-page .pmd-menu-capacity-card{
  position:relative!important;
  z-index:1!important;
  width:min(720px,calc(100vw - 32px))!important;
  max-height:calc(100vh - 48px)!important;
  overflow:auto!important;
  border:1px solid #cfe0ea!important;
  border-radius:18px!important;
  background:#fff!important;
  box-shadow:0 24px 70px rgba(16,42,67,.18)!important;
}
body.pmd-menu-manager-page .pmd-menu-capacity-card__header,
body.pmd-menu-manager-page .pmd-menu-capacity-card__footer{
  display:flex!important;
  align-items:center!important;
  justify-content:space-between!important;
  gap:12px!important;
  padding:14px 16px!important;
  border-bottom:1px solid #e0e9ef!important;
}
body.pmd-menu-manager-page .pmd-menu-capacity-card__header h2{margin:0!important;font-size:20px!important;font-weight:900!important;color:#102a43!important}
body.pmd-menu-manager-page .pmd-menu-capacity-card__header button{
  width:38px!important;height:38px!important;border:1px solid #cfe0ea!important;border-radius:11px!important;background:#fff!important;color:#16354c!important;font-size:25px!important;line-height:1!important
}
body.pmd-menu-manager-page .pmd-menu-capacity-card__body{display:grid!important;gap:14px!important;padding:16px!important}
body.pmd-menu-manager-page .pmd-menu-capacity-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important;gap:12px!important}
body.pmd-menu-manager-page .pmd-menu-capacity-grid label{display:grid!important;gap:6px!important;color:#173752!important;font-size:11px!important;font-weight:850!important}
body.pmd-menu-manager-page .pmd-menu-capacity-grid input{
  width:100%!important;min-height:44px!important;padding:0 12px!important;border:1px solid #d6e2ea!important;border-radius:11px!important;background:#fff!important;color:#102a43!important;box-sizing:border-box!important
}
body.pmd-menu-manager-page .pmd-menu-capacity-toggle{display:flex!important;align-items:center!important;gap:10px!important;font-size:12px!important;font-weight:850!important;color:#173752!important}
body.pmd-menu-manager-page .pmd-menu-capacity-card__footer{justify-content:flex-end!important;border-top:1px solid #e0e9ef!important;border-bottom:0!important}
body.pmd-menu-manager-page .pmd-menu-capacity-card__footer button{min-height:42px!important;padding:0 16px!important;border:0!important;border-radius:11px!important;background:#006b57!important;color:#fff!important;font-weight:850!important}
body.pmd-menu-manager-page .pmd-menu-capacity-card__footer button.is-soft{border:1px solid #d2e0e8!important;background:#fff!important;color:#17445b!important}
@media(max-width:640px){body.pmd-menu-manager-page .pmd-menu-capacity-grid{grid-template-columns:1fr!important}}
'''
MENU_CSS.write_text(menu_css.rstrip() + '\n')

print('Prepared PMD Shifts/Menu operations V17')
