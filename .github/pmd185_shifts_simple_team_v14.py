from pathlib import Path

# Keep Staff Portal route files aligned with the production V13 baseline.
admin_routes = Path('app/admin/routes.php')
main_routes = Path('app/main/routes.php')
loader = "require_once base_path('routes/pmd-staff-portal-v1.php');\n"
marker = "// PMD_STAFF_PORTAL_V1_PUBLIC_ROUTE_LOADER\n"

admin_text = admin_routes.read_text()
if loader not in admin_text:
    anchor = "require_once base_path('routes/admin-app-before.php');\n"
    if anchor not in admin_text:
        raise SystemExit('admin route anchor missing')
    admin_text = admin_text.replace(anchor, anchor + loader, 1)
admin_routes.write_text(admin_text)

main_text = main_routes.read_text()
main_text = main_text.replace(marker + loader + "\n", '', 1)
main_text = main_text.replace(marker + loader, '', 1)
main_routes.write_text(main_text)

view = Path('app/admin/views/pmdshifts/index.blade.php')
text = view.read_text()

# Notification count seed before root markup.
anchor = "@endphp\n\n<div id=\"pmd-shifts\""
seed = """    try {\n        $pmdShiftsNotificationCount = app(\\Admin\\Services\\PmdNotificationCountV1::class)->currentNewCount();\n    } catch (\\Throwable $error) {\n        $pmdShiftsNotificationCount = 0;\n    }\n@endphp\n\n<div id=\"pmd-shifts\""" 
if 'pmdShiftsNotificationCount' not in text:
    if anchor not in text:
        raise SystemExit('view php end anchor missing')
    text = text.replace(anchor, seed, 1)

old_header = '''        <div class="pmd-shifts__header-actions">\n            <button type="button" class="pmd-shifts__header-button is-soft" data-pmd-capacity-open aria-label="Kitchen capacity & peak time">\n                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c1.8 3 5 4.6 5 9a5 5 0 0 1-10 0c0-2.3 1.2-4.4 3.5-6.5.2 2 1 3 1.5 3.5 1.2-1.4 1.2-3.7 0-6z"></path></svg>\n                <span>Peak time</span>\n            </button>\n            <a class="pmd-shifts__header-button is-soft" href="{{ admin_url('people') }}" aria-label="People">\n                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"></circle><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5"></path></svg>\n                <span>People</span>\n            </a>\n            @if($ready)\n                <button type="button" class="pmd-shifts__header-button" data-pmd-shift-open data-date="{{ $selectedDay->toDateString() }}">\n                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>\n                    <span>Add shift</span>\n                </button>\n            @endif\n        </div>'''
new_header = '''        <div class="pmd-shifts__header-actions" aria-label="Shift actions">\n            <span class="pmd-shifts__notification-slot" data-pmd-shifts-notification-slot aria-label="Notifications">\n                <span class="pmd-shifts__notification-fallback" aria-hidden="true">\n                    <svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>\n                    @if($pmdShiftsNotificationCount > 0)<em>{{ $pmdShiftsNotificationCount }}</em>@endif\n                </span>\n            </span>\n            <button type="button" class="pmd-shifts__header-icon" data-pmd-team-scroll aria-label="Members" title="Members">\n                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3"></circle><path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5"></path></svg>\n                <span class="pmd-shifts__header-count">{{ $people->count() }}</span>\n            </button>\n            <button type="button" class="pmd-shifts__header-icon" data-pmd-capacity-open aria-label="Kitchen capacity" title="Kitchen capacity">\n                <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3c1.8 3 5 4.6 5 9a5 5 0 0 1-10 0c0-2.3 1.2-4.4 3.5-6.5.2 2 1 3 1.5 3.5 1.2-1.4 1.2-3.7 0-6z"></path></svg>\n            </button>\n            @if($ready)\n                <button type="button" class="pmd-shifts__header-icon is-primary" data-pmd-shift-open data-date="{{ $selectedDay->toDateString() }}" aria-label="Add shift" title="Add shift">\n                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>\n                </button>\n            @endif\n        </div>'''
if old_header not in text:
    raise SystemExit('old shifts header not found')
text = text.replace(old_header, new_header, 1)

text = text.replace('No restaurant people yet. <a href="{{ admin_url(\'settings/team\') }}">Add people in Team</a>.', 'No members yet. <a href="#pmd-shifts-team-panel" data-pmd-team-scroll>Add a member below</a>.', 1)

team_panel = '''\n\n        {{-- PMD_SHIFTS_SIMPLE_TEAM_WORKSPACE_V14 --}}\n        <section id="pmd-shifts-team-panel" class="pmd-shifts-team-panel" data-pmd-shifts-team-panel aria-label="Restaurant members">\n            <header class="pmd-shifts-team-panel__header">\n                <div><h2>Team</h2><span>{{ $people->count() }} members</span></div>\n                <button type="button" class="pmd-shifts-team-panel__add" data-pmd-team-open>+ Member</button>\n            </header>\n            <div class="pmd-shifts-team-panel__list">\n                @forelse($people as $person)\n                    @php $personAccess = !empty($person->staff_id) ? $accessStaff->get((int)$person->staff_id) : null; @endphp\n                    <button\n                        type="button"\n                        class="pmd-shifts-team-row"\n                        data-pmd-team-edit\n                        data-pmd-team-panel-person-id="{{ (int)$person->id }}"\n                        data-person-id="{{ (int)$person->id }}"\n                        data-name="{{ $person->display_name }}"\n                        data-role="{{ $person->job_role ?? '' }}"\n                        data-department="{{ $person->department ?? 'other' }}"\n                        data-has-access="{{ !empty($person->staff_id) ? '1' : '0' }}"\n                        data-username="{{ $personAccess && $personAccess->user ? $personAccess->user->username : '' }}"\n                        data-staff-role-id="{{ $personAccess ? (int)$personAccess->staff_role_id : '' }}"\n                    >\n                        <span class="pmd-shifts-team-row__avatar">{{ strtoupper(substr(trim((string)$person->display_name),0,1)) }}</span>\n                        <span class="pmd-shifts-team-row__person"><strong>{{ $person->display_name }}</strong><small>{{ $person->job_role ?: 'Team member' }}</small></span>\n                        <span class="pmd-shifts-team-row__meta"><small>Area</small><strong>{{ $departments[$person->department] ?? ucfirst((string)$person->department) }}</strong></span>\n                        <span class="pmd-shifts-team-row__meta"><small>Login</small><strong>{{ $personAccess && $personAccess->user ? $personAccess->user->username : 'No login' }}</strong></span>\n                        <span class="pmd-shifts-team-row__chevron">›</span>\n                    </button>\n                @empty\n                    <div class="pmd-shifts-team-panel__empty"><strong>No members yet</strong><span>Use + Member. A name is enough.</span></div>\n                @endforelse\n            </div>\n        </section>\n'''
modal_anchor = '\n\n        <div class="pmd-shifts__modal" data-pmd-shift-modal'
if 'PMD_SHIFTS_SIMPLE_TEAM_WORKSPACE_V14' not in text:
    if modal_anchor not in text:
        raise SystemExit('shift modal anchor missing')
    text = text.replace(modal_anchor, team_panel + modal_anchor, 1)

start = text.find('        <div class="pmd-shifts__modal" data-pmd-team-modal')
end = text.find('        <div class="pmd-shifts__modal" data-pmd-capacity-modal', start)
if start < 0 or end < 0:
    raise SystemExit('team modal bounds missing')
new_team_modal = '''        <div class="pmd-shifts__modal" data-pmd-team-modal hidden aria-hidden="true" role="dialog" aria-modal="true" aria-labelledby="pmd-team-modal-title">\n            <button type="button" class="pmd-shifts__modal-backdrop" data-pmd-team-close tabindex="-1" aria-label="Close"></button>\n            <section class="pmd-shifts__modal-card pmd-shifts__team-card pmd-shifts__team-editor-card" role="document">\n                <header class="pmd-shifts__modal-header">\n                    <div><h2 id="pmd-team-modal-title">Member</h2></div>\n                    <button type="button" class="pmd-shifts__modal-close" data-pmd-team-close aria-label="Close"><svg viewBox="0 0 24 24"><path d="M6 6l12 12M18 6 6 18"></path></svg></button>\n                </header>\n                <form class="pmd-shifts__team-form pmd-shifts__team-editor" method="post" action="{{ admin_url('shifts/saveperson') }}" data-pmd-team-form data-default-access-role="{{ (int)optional($defaultAccessRole)->staff_role_id }}">\n                    @csrf\n                    <input type="hidden" name="id" value="" data-pmd-team-person-id>\n                    <input type="hidden" name="return_to" value="{{ $returnTo }}">\n                    <div class="pmd-shifts__team-form-head"><strong data-pmd-team-form-title>Add member</strong></div>\n                    <label><span>Name</span><input required maxlength="128" name="display_name" data-pmd-team-name placeholder="Anna"></label>\n                    <div class="pmd-shifts__team-identity-row">\n                        <label><span>Role</span><input maxlength="64" name="job_role" data-pmd-team-role placeholder="Chef, Waiter…"></label>\n                        <label><span>Area</span><select name="department" data-pmd-team-department>\n                            @foreach($departments as $departmentKey => $departmentLabel)<option value="{{ $departmentKey }}">{{ $departmentLabel }}</option>@endforeach\n                        </select></label>\n                    </div>\n                    <label class="pmd-shifts__team-access-toggle">\n                        <input type="checkbox" name="give_access" value="1" data-pmd-team-access-toggle>\n                        <span><strong>Create PMD login</strong></span>\n                    </label>\n                    <div class="pmd-shifts__team-access-fields" data-pmd-team-access-fields hidden>\n                        <label><span>Username</span><input maxlength="32" name="username" autocomplete="off" data-pmd-team-username></label>\n                        <label><span>Access</span><select name="staff_role_id" data-pmd-team-access-role>\n                            @foreach($accessRoles as $accessRole)<option value="{{ (int)$accessRole->staff_role_id }}">{{ $accessRole->name }}</option>@endforeach\n                        </select></label>\n                        <label class="is-password"><span>Password <small data-pmd-team-password-hint>required</small></span><span class="pmd-shifts__team-password-row"><input type="password" minlength="6" maxlength="32" name="password" autocomplete="new-password" data-pmd-team-password><button type="button" data-pmd-team-password-generate>Generate</button></span></label>\n                    </div>\n                    <footer class="pmd-shifts__modal-footer pmd-shifts__team-editor-footer">\n                        <button type="button" class="pmd-shifts__button is-soft" data-pmd-team-close>Cancel</button>\n                        <button type="submit" class="pmd-shifts__button">Save member</button>\n                    </footer>\n                </form>\n            </section>\n        </div>\n\n'''
text = text[:start] + new_team_modal + text[end:]
view.write_text(text)

js = Path('app/admin/assets/js/pmd-shifts-v1.js')
j = js.read_text()
j = j.replace('data-pmd-shifts-exact-ui-v11', 'data-pmd-shifts-exact-ui-v14')
j = j.replace('pmd-shifts-dashboard-reservations-v4.css?v=11', 'pmd-shifts-dashboard-reservations-v4.css?v=14')

j = j.replace("if (teamAccessToggle) { teamAccessToggle.checked = true; teamAccessToggle.disabled = false; }", "if (teamAccessToggle) { teamAccessToggle.checked = false; teamAccessToggle.disabled = false; }")

old_person_header = "'<span class=\"pmd-shifts-resource-person__copy\"><a class=\"pmd-shifts-resource-person__link\" href=\"/admin/people?person=' + Number(person.id || 0) + '\">' + escapeHtml(person.name || 'Team member') + '</a><small>' + escapeHtml(person.role || 'Team') + '</small></span>' +"
new_person_header = "'<span class=\"pmd-shifts-resource-person__copy\"><button type=\"button\" class=\"pmd-shifts-resource-person__link\" data-pmd-team-scroll-person=\"' + Number(person.id || 0) + '\">' + escapeHtml(person.name || 'Team member') + '</button><small>' + escapeHtml(person.role || 'Team') + '</small></span>' +"
if old_person_header not in j:
    raise SystemExit('resource person header anchor missing')
j = j.replace(old_person_header, new_person_header, 1)

j = j.replace("'<a href=\"/admin/settings/team\">Open Team</a>' +", "'<button type=\"button\" data-pmd-team-scroll>Open Team</button>' +", 1)

insert_anchor = "  function closeTeam() {\n"
helper = '''  function mountHeaderNotification() {\n    var slot = root.querySelector('[data-pmd-shifts-notification-slot]');\n    var notificationRoot = document.getElementById('notif-root');\n    if (!slot || !notificationRoot) return false;\n    if (!slot.contains(notificationRoot)) {\n      slot.innerHTML = '';\n      slot.appendChild(notificationRoot);\n    }\n    notificationRoot.classList.add('pmd-shifts__notification-root');\n    var trigger = notificationRoot.querySelector('#notifDropdown');\n    if (trigger) {\n      trigger.setAttribute('aria-label', 'Notifications');\n      trigger.setAttribute('title', 'Notifications');\n    }\n    return true;\n  }\n\n  function ensureHeaderNotification() {\n    var attempts = 0;\n    function tryMount() {\n      if (mountHeaderNotification()) return;\n      attempts += 1;\n      if (attempts < 20) window.setTimeout(tryMount, 150);\n    }\n    tryMount();\n  }\n\n  function scrollToTeamPanel(personId) {\n    var panel = root.querySelector('[data-pmd-shifts-team-panel]');\n    if (!panel) return;\n    panel.scrollIntoView({behavior: 'smooth', block: 'start'});\n    if (!personId) return;\n    var row = panel.querySelector('[data-pmd-team-panel-person-id=\"' + Number(personId || 0) + '\"]');\n    if (!row) return;\n    row.classList.add('is-focused');\n    window.setTimeout(function () { row.classList.remove('is-focused'); }, 1600);\n  }\n\n'''
if 'function mountHeaderNotification()' not in j:
    if insert_anchor not in j:
        raise SystemExit('closeTeam anchor missing')
    j = j.replace(insert_anchor, helper + insert_anchor, 1)

j = j.replace('  loadExactSharedUiCss();\n  syncKpiMenus();', '  loadExactSharedUiCss();\n  syncKpiMenus();\n  ensureHeaderNotification();', 1)

event_anchor = "    var teamOpen = event.target.closest('[data-pmd-team-open]');\n"
team_events = '''    var teamScrollPerson = event.target.closest('[data-pmd-team-scroll-person]');\n    if (teamScrollPerson) {\n      event.preventDefault();\n      scrollToTeamPanel(teamScrollPerson.getAttribute('data-pmd-team-scroll-person'));\n      return;\n    }\n    var teamScroll = event.target.closest('[data-pmd-team-scroll]');\n    if (teamScroll) {\n      event.preventDefault();\n      scrollToTeamPanel(null);\n      return;\n    }\n\n'''
if 'data-pmd-team-scroll-person' not in j[j.find('document.addEventListener'):]:
    if event_anchor not in j:
        raise SystemExit('team event anchor missing')
    j = j.replace(event_anchor, team_events + event_anchor, 1)

js.write_text(j)

css = Path('app/admin/assets/css/pmd-shifts-dashboard-reservations-v4.css')
c = css.read_text()
if 'PMD_SHIFTS_SIMPLE_TEAM_WORKSPACE_V14' not in c:
    c += r'''

/* PMD_SHIFTS_SIMPLE_TEAM_WORKSPACE_V14 */
body.pmd-shifts-page .pmd-shifts__header-actions{display:flex;align-items:center;justify-content:flex-end;gap:8px}
body.pmd-shifts-page .pmd-shifts__header-icon,
body.pmd-shifts-page .pmd-shifts__notification-slot{position:relative;display:inline-grid;place-items:center;flex:0 0 44px;width:44px;height:44px;margin:0;padding:0;border:1px solid #d3e1e8;border-radius:13px;background:#fff;color:#173752;box-shadow:0 3px 10px rgba(23,55,82,.04);box-sizing:border-box}
body.pmd-shifts-page .pmd-shifts__header-icon{cursor:pointer}
body.pmd-shifts-page .pmd-shifts__header-icon:hover{background:#f5faf8;border-color:#afcec4}
body.pmd-shifts-page .pmd-shifts__header-icon.is-primary{background:#073f36;border-color:#073f36;color:#fff}
body.pmd-shifts-page .pmd-shifts__header-icon svg,
body.pmd-shifts-page .pmd-shifts__notification-fallback svg{width:20px;height:20px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round}
body.pmd-shifts-page .pmd-shifts__header-count{position:absolute;right:-5px;top:-6px;display:grid;place-items:center;min-width:18px;height:18px;padding:0 4px;border:2px solid #fff;border-radius:999px;background:#173752;color:#fff;font-size:9px;font-weight:900;line-height:1;box-sizing:border-box}
body.pmd-shifts-page .pmd-shifts__notification-fallback{position:relative;display:grid;place-items:center;width:100%;height:100%}
body.pmd-shifts-page .pmd-shifts__notification-fallback em{position:absolute;right:-6px;top:-7px;display:grid;place-items:center;min-width:18px;height:18px;padding:0 4px;border:2px solid #fff;border-radius:999px;background:#d83a31;color:#fff;font-size:9px;font-style:normal;font-weight:900;line-height:1;box-sizing:border-box}
body.pmd-shifts-page .pmd-shifts__notification-slot:has(#notif-root){border:0;background:transparent;box-shadow:none}
body.pmd-shifts-page .pmd-shifts__notification-root{position:relative!important;display:grid!important;place-items:center!important;width:44px!important;height:44px!important;margin:0!important;padding:0!important;border:0!important;background:transparent!important;list-style:none!important;overflow:visible!important}
body.pmd-shifts-page .pmd-shifts__notification-root #notifDropdown{position:relative!important;display:grid!important;place-items:center!important;width:44px!important;height:44px!important;margin:0!important;padding:0!important;border:1px solid #d3e1e8!important;border-radius:13px!important;background:#fff!important;color:#173752!important;box-shadow:0 3px 10px rgba(23,55,82,.04)!important;overflow:visible!important}
body.pmd-shifts-page .pmd-shifts__notification-root #notifDropdown>i{display:none!important}
body.pmd-shifts-page .pmd-shifts__notification-root #bell-icon{display:grid!important;place-items:center!important;width:20px!important;height:20px!important;margin:0!important;padding:0!important;color:#173752!important}
body.pmd-shifts-page .pmd-shifts__notification-root #bell-icon svg{width:20px!important;height:20px!important;fill:none!important;stroke:currentColor!important;stroke-width:2!important}
body.pmd-shifts-page .pmd-shifts__notification-root #notification-count{position:absolute!important;right:-7px!important;top:-8px!important;z-index:5!important;min-width:18px!important;height:18px!important;padding:0 4px!important;border:2px solid #fff!important;border-radius:999px!important;background:#d83a31!important;color:#fff!important;font-size:9px!important;font-weight:900!important;line-height:14px!important;text-align:center!important}
body.pmd-shifts-page .pmd-shifts__notification-root #notification-panel,
body.pmd-shifts-page .pmd-shifts__notification-root .dropdown-menu{position:absolute!important;top:50px!important;right:0!important;left:auto!important;z-index:10080!important}

body.pmd-shifts-page .pmd-shifts-team-panel{width:min(1480px,100%);margin:16px auto 28px;border:1px solid #d7e4e5;border-radius:16px;background:#fff;box-shadow:0 7px 22px rgba(17,55,47,.04);overflow:hidden;scroll-margin-top:18px}
body.pmd-shifts-page .pmd-shifts-team-panel__header{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:12px 14px;border-bottom:1px solid #e5eeed;background:#fbfdfc}
body.pmd-shifts-page .pmd-shifts-team-panel__header>div{display:flex;align-items:baseline;gap:8px}
body.pmd-shifts-page .pmd-shifts-team-panel__header h2{margin:0;color:#123b33;font-size:17px;font-weight:900;letter-spacing:-.02em}
body.pmd-shifts-page .pmd-shifts-team-panel__header span{color:#78908a;font-size:10px;font-weight:800}
body.pmd-shifts-page .pmd-shifts-team-panel__add{min-height:34px;padding:0 12px;border:1px solid #0a594b;border-radius:10px;background:#0a594b;color:#fff;font:inherit;font-size:11px;font-weight:900;cursor:pointer}
body.pmd-shifts-page .pmd-shifts-team-panel__list{display:grid}
body.pmd-shifts-page .pmd-shifts-team-row{display:grid;grid-template-columns:38px minmax(180px,1.6fr) minmax(100px,.75fr) minmax(120px,.9fr) 22px;align-items:center;gap:10px;width:100%;min-height:58px;padding:8px 14px;border:0;border-bottom:1px solid #edf2f1;background:#fff;color:#173752;text-align:left;font:inherit;cursor:pointer;transition:background .12s ease,box-shadow .12s ease}
body.pmd-shifts-page .pmd-shifts-team-row:last-child{border-bottom:0}
body.pmd-shifts-page .pmd-shifts-team-row:hover,body.pmd-shifts-page .pmd-shifts-team-row.is-focused{background:#f1faf6;box-shadow:inset 3px 0 0 #14936e}
body.pmd-shifts-page .pmd-shifts-team-row__avatar{display:grid;place-items:center;width:34px;height:34px;border-radius:10px;background:#eef6f4;color:#0d6655;font-size:11px;font-weight:900}
body.pmd-shifts-page .pmd-shifts-team-row__person,body.pmd-shifts-page .pmd-shifts-team-row__meta{display:grid;gap:2px;min-width:0}
body.pmd-shifts-page .pmd-shifts-team-row__person strong,body.pmd-shifts-page .pmd-shifts-team-row__meta strong{overflow:hidden;color:#173752;font-size:11.5px;font-weight:900;text-overflow:ellipsis;white-space:nowrap}
body.pmd-shifts-page .pmd-shifts-team-row__person small,body.pmd-shifts-page .pmd-shifts-team-row__meta small{color:#7b8e89;font-size:9px;font-weight:800;text-transform:none}
body.pmd-shifts-page .pmd-shifts-team-row__chevron{color:#8ca09b;font-size:20px;font-weight:500;text-align:right}
body.pmd-shifts-page .pmd-shifts-team-panel__empty{display:grid;gap:2px;padding:18px;color:#72857f;font-size:11px}
body.pmd-shifts-page .pmd-shifts-team-panel__empty strong{color:#173752;font-size:12px}

body.pmd-shifts-page .pmd-shifts__team-editor-card{width:min(520px,calc(100vw - 24px))!important;max-height:calc(100dvh - 24px)!important}
body.pmd-shifts-page .pmd-shifts__team-editor{display:grid!important;grid-template-columns:1fr!important;gap:9px!important;padding:12px!important;border:0!important;background:#fff!important;overflow:auto!important}
body.pmd-shifts-page .pmd-shifts__team-editor .pmd-shifts__team-form-head{min-height:auto!important;margin:0 0 2px!important}
body.pmd-shifts-page .pmd-shifts__team-editor .pmd-shifts__team-identity-row{grid-template-columns:1fr 1fr!important;gap:8px!important}
body.pmd-shifts-page .pmd-shifts__team-editor .pmd-shifts__team-access-toggle{margin-top:2px!important;padding:9px 0!important}
body.pmd-shifts-page .pmd-shifts__team-editor .pmd-shifts__team-access-fields{grid-template-columns:1fr 1fr!important;gap:8px!important}
body.pmd-shifts-page .pmd-shifts__team-editor .pmd-shifts__team-access-fields .is-password{grid-column:1/-1!important}
body.pmd-shifts-page .pmd-shifts__team-editor-footer{margin:2px -12px -12px!important;padding:10px 12px!important}
body.pmd-shifts-page .pmd-shifts-resource-person__link{display:block;width:100%;margin:0;padding:0;border:0;background:transparent;color:#18364c;font:inherit;font-size:11px;font-weight:900;text-align:left;cursor:pointer;text-decoration:none}
body.pmd-shifts-page .pmd-shifts-resource-person__link:hover{color:#08745c;text-decoration:underline}
body.pmd-shifts-page .pmd-shifts-resource-empty-state button{display:inline-flex;align-items:center;justify-content:center;margin-top:6px;min-height:34px;padding:0 11px;border:1px solid #cddfd9;border-radius:9px;background:#fff;color:#0d6655;font:inherit;font-size:10px;font-weight:900;cursor:pointer}

@media(max-width:760px){
  body.pmd-shifts-page .pmd-shifts__header-actions{gap:6px}
  body.pmd-shifts-page .pmd-shifts__header-icon,body.pmd-shifts-page .pmd-shifts__notification-slot{width:40px;height:40px;flex-basis:40px}
  body.pmd-shifts-page .pmd-shifts-team-row{grid-template-columns:34px minmax(0,1fr) 20px}
  body.pmd-shifts-page .pmd-shifts-team-row__meta{display:none}
  body.pmd-shifts-page .pmd-shifts__team-editor .pmd-shifts__team-identity-row,body.pmd-shifts-page .pmd-shifts__team-editor .pmd-shifts__team-access-fields{grid-template-columns:1fr!important}
  body.pmd-shifts-page .pmd-shifts__team-editor .pmd-shifts__team-access-fields .is-password{grid-column:auto!important}
}
'''
css.write_text(c)

print('Prepared focused Shifts V14 + restored V13 route content')
