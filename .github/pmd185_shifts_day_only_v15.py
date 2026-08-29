from pathlib import Path

VIEW = Path('app/admin/views/pmdshifts/index.blade.php')
JS = Path('app/admin/assets/js/pmd-shifts-v1.js')
CSS = Path('app/admin/assets/css/pmd-shifts-dashboard-reservations-v4.css')

# ---------------------------------------------------------------------------
# View: remove the custom PMD month calendar entirely. The Shifts workspace
# now owns one planning surface: the Hour/Dienstplan sheet for the selected day.
# ---------------------------------------------------------------------------
view = VIEW.read_text()
start_marker = '        <section id="pmd-r2-calendar-surface-v160"'
end_marker = '        {{-- PMD_SHIFTS_SIMPLE_TEAM_WORKSPACE_V14 --}}'
start = view.find(start_marker)
end = view.find(end_marker, start)
if start < 0 or end < 0:
    raise SystemExit('Shifts calendar surface bounds not found')

day_surface = '''        {{-- PMD_SHIFTS_DAY_ONLY_WORKSPACE_V15 --}}
        <section
            id="pmd-shifts-day-surface"
            class="pmd-shifts-day-surface"
            data-pmd-shifts-day-surface
            aria-label="Daily shift plan"
        >
            <section
                id="pmd-shift-day"
                class="pmd-r2-yc-selected pmd-shifts-hour-host"
                data-pmd-shifts-hour-host
            ></section>
        </section>

'''
view = view[:start] + day_surface + view[end:]
view = view.replace("'open_hour_on_boot' => request()->filled('day'),", "'open_hour_on_boot' => true,", 1)
VIEW.write_text(view)

# ---------------------------------------------------------------------------
# JS: Hour sheet is the primary surface. Same-month date moves stay instant;
# cross-month moves use the canonical server route with month+day parameters.
# ---------------------------------------------------------------------------
js = JS.read_text()
js = js.replace('data-pmd-shifts-exact-ui-v14', 'data-pmd-shifts-exact-ui-v15')
js = js.replace('pmd-shifts-dashboard-reservations-v4.css?v=14', 'pmd-shifts-dashboard-reservations-v4.css?v=15')

old_render_start = '''  function updateCalendarSelection(key) {
    root.querySelectorAll('[data-pmd-shift-day-open]').forEach(function (day) {
      day.classList.toggle('is-selected', day.getAttribute('data-date') === key);
    });
  }

  function renderHourView(key) {
    var host = root.querySelector('[data-pmd-shifts-hour-host]');
    var frame = root.querySelector('[data-pmd-shifts-calendar-frame]');
    var calendar = root.querySelector('[data-pmd-shifts-calendar]');
    if (!host || !frame || !calendar) return;

    key = key || boot.selected_day || new Date().toISOString().slice(0, 10);
    boot.selected_day = key;
    updateCalendarSelection(key);
'''
new_render_start = '''  function weekStartKey(key) {
    var date = parseDateKey(key);
    if (!date) return key;
    var mondayOffset = (date.getDay() + 6) % 7;
    date.setDate(date.getDate() - mondayOffset);
    return dateKey(date);
  }

  function renderHourView(key) {
    var host = root.querySelector('[data-pmd-shifts-hour-host]');
    if (!host) return;

    key = key || boot.selected_day || new Date().toISOString().slice(0, 10);
    boot.selected_day = key;

    var copyWeekInput = root.querySelector('[data-pmd-copy-week-form] input[name="week"]');
    if (copyWeekInput) copyWeekInput.value = weekStartKey(key);

    var globalAddShift = root.querySelector('.pmd-shifts__header [data-pmd-shift-open]');
    if (globalAddShift) globalAddShift.setAttribute('data-date', key);
'''
if old_render_start not in js:
    raise SystemExit('renderHourView start anchor missing')
js = js.replace(old_render_start, new_render_start, 1)

host_start = js.find("    host.innerHTML = '' +")
host_end = js.find('    frame.hidden = true;', host_start)
if host_start < 0 or host_end < 0:
    raise SystemExit('Hour host render bounds missing')

new_host = '''    host.innerHTML = '' +
      '<div class="pmd-r2-timeslot-screen pmd-shifts-resource-screen">' +
        '<header class="pmd-r2-day-view__header pmd-shifts-day-header">' +
          '<div class="pmd-r2-day-view__date-nav">' +
            '<button type="button" class="pmd-r2-day-view__month-button" data-pmd-shifts-prev-day aria-label="Previous day">‹</button>' +
            '<div class="pmd-r2-day-view__title"><h2>' + escapeHtml(formattedDate(key)) + '</h2></div>' +
            '<button type="button" class="pmd-r2-day-view__month-button" data-pmd-shifts-next-day aria-label="Next day">›</button>' +
          '</div>' +
          '<div class="pmd-r2-day-view__summary">' +
            '<span><strong>' + shifts.length + '</strong> shifts</span>' +
            '<span><strong>' + people.length + '</strong> team</span>' +
            '<span><strong>' + totalScheduledHours(shifts) + '</strong> staff hours</span>' +
            '<label class="pmd-shifts-date-picker" title="Choose date">' +
              '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M8 3v4M16 3v4M3 10h18"></path></svg>' +
              '<input type="date" data-pmd-shifts-date-input value="' + escapeHtml(key) + '" aria-label="Choose date">' +
            '</label>' +
            '<button type="button" class="pmd-shifts-hour-header-action" data-pmd-shift-open data-date="' + escapeHtml(key) + '">+ Shift</button>' +
            '<button type="button" class="pmd-shifts-hour-header-action is-soft" data-pmd-copy-week>Copy week</button>' +
          '</div>' +
        '</header>' +
        emptyState +
        (people.length ? '<div class="pmd-shifts-resource-scroll"><table class="pmd-shifts-resource-table"><thead><tr><th scope="col" class="pmd-shifts-resource-corner"><span>Time</span></th>' + headerCells + '</tr></thead><tbody>' + bodyRows.join('') + '</tbody></table></div>' : '') +
      '</div>';

'''
js = js[:host_start] + new_host + js[host_end:]

tail_start = js.find('    frame.hidden = true;', host_start)
functions_end = js.find('  function submitRemoveShift(id) {', tail_start)
if tail_start < 0 or functions_end < 0:
    raise SystemExit('Calendar function cleanup bounds missing')

new_day_functions = '''    host.hidden = false;

    try {
      var url = new URL(window.location.href);
      url.searchParams.set('month', monthKey(key));
      url.searchParams.set('day', key);
      url.hash = '';
      history.replaceState(null, '', url.toString());
    } catch (error) {}
  }

  function dayPageUrl(key) {
    var base = (boot.urls && boot.urls.shifts) || window.location.pathname;
    return base + '?month=' + encodeURIComponent(monthKey(key)) + '&day=' + encodeURIComponent(key);
  }

  function openHourDay(key) {
    key = String(key || '');
    if (!parseDateKey(key)) return;
    if (monthKey(key) !== String(boot.month || '')) {
      window.location.href = dayPageUrl(key);
      return;
    }
    renderHourView(key);
  }

  function changeHourDay(delta) {
    openHourDay(shiftedDate(boot.selected_day, delta));
  }

'''
js = js[:tail_start] + new_day_functions + js[functions_end:]

old_popstate = '''  window.addEventListener('popstate', function () {
    if (!root.querySelector('[data-pmd-shifts-calendar-frame]')) return;
    loadCalendarUrl(window.location.href, false).catch(function () {});
  });

'''
js = js.replace(old_popstate, '', 1)

month_handler_start = js.find("    var monthNav = event.target.closest('[data-pmd-shifts-month-nav]');")
month_handler_end = js.find("    var generatePassword = event.target.closest('[data-pmd-team-password-generate]');", month_handler_start)
if month_handler_start < 0 or month_handler_end < 0:
    raise SystemExit('Month handler bounds missing')
js = js[:month_handler_start] + js[month_handler_end:]

calendar_handler_start = js.find("    var calendarShiftEdit = event.target.closest('[data-pmd-calendar-shift-edit]');")
calendar_handler_end = js.find("    if (event.target.closest('[data-pmd-shifts-prev-day]'))", calendar_handler_start)
if calendar_handler_start < 0 or calendar_handler_end < 0:
    raise SystemExit('Calendar click handler bounds missing')
js = js[:calendar_handler_start] + js[calendar_handler_end:]

keydown_old = '''  document.addEventListener('keydown', function (event) {
    if ((event.key === 'Enter' || event.key === ' ') && event.target && event.target.matches && event.target.matches('[data-pmd-shift-day-open]')) {
      event.preventDefault();
      renderHourView(event.target.getAttribute('data-date') || '');
      return;
    }
    if (event.key !== 'Escape') return;
'''
keydown_new = '''  document.addEventListener('change', function (event) {
    var dateInput = event.target && event.target.closest
      ? event.target.closest('[data-pmd-shifts-date-input]')
      : null;
    if (!dateInput || !root.contains(dateInput)) return;
    openHourDay(dateInput.value);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key !== 'Escape') return;
'''
if keydown_old not in js:
    raise SystemExit('Keydown calendar anchor missing')
js = js.replace(keydown_old, keydown_new, 1)

JS.write_text(js)

# ---------------------------------------------------------------------------
# CSS: restore the exact configurable KPI geometry from the Dashboard authority
# and add the day-only Date control. Old month-calendar selectors become dead
# because the month DOM no longer exists.
# ---------------------------------------------------------------------------
css = CSS.read_text()
append = r'''

/* PMD_SHIFTS_DAY_ONLY_WORKSPACE_V15
 * Shifts is one Dienstplan surface. No PMD month calendar is rendered.
 * KPI geometry matches the canonical configurable Dashboard cards exactly.
 */
body.pmd-shifts-page #pmd-r2-reservation-kpis-v307.pmd-shifts-exact-kpis{
  gap:14px!important;
  margin:16px auto 0!important;
  padding:0 2px 8px!important;
}
body.pmd-shifts-page #pmd-r2-reservation-kpis-v307 .pmd-r2-kpi-v2401-card{
  grid-template-columns:52px minmax(0,1fr) 34px!important;
  gap:13px!important;
  min-height:118px!important;
  padding:15px!important;
  border-radius:18px!important;
}
body.pmd-shifts-page #pmd-r2-reservation-kpis-v307 .pmd-r2-kpi-v2401-icon{
  width:52px!important;
  height:52px!important;
  border-radius:15px!important;
}
body.pmd-shifts-page #pmd-r2-reservation-kpis-v307 .pmd-r2-kpi-v2401-value{
  font-size:30px!important;
}
body.pmd-shifts-page #pmd-r2-reservation-kpis-v307 .pmd-r2-kpi-v2401-description{
  display:block!important;
  margin:6px 0 0!important;
  font-size:11px!important;
  line-height:1.2!important;
}

body.pmd-shifts-page .pmd-shifts-day-surface{
  display:block!important;
  width:min(1480px,100%)!important;
  min-width:0!important;
  margin:0 auto 18px!important;
  padding:0!important;
}
body.pmd-shifts-page .pmd-shifts-day-surface .pmd-shifts-hour-host{
  display:block!important;
  width:100%!important;
  min-width:0!important;
  margin:0!important;
}
body.pmd-shifts-page .pmd-shifts-day-header{
  grid-template-columns:minmax(300px,1fr) auto!important;
  margin:0 0 14px!important;
}
body.pmd-shifts-page .pmd-shifts-day-header .pmd-r2-day-view__date-nav{
  justify-content:flex-start!important;
}
body.pmd-shifts-page .pmd-shifts-day-header .pmd-r2-day-view__title{
  text-align:left!important;
}
body.pmd-shifts-page .pmd-shifts-date-picker{
  position:relative!important;
  display:inline-grid!important;
  place-items:center!important;
  flex:0 0 38px!important;
  width:38px!important;
  min-width:38px!important;
  height:38px!important;
  margin:0!important;
  padding:0!important;
  border:1px solid #d4e1ea!important;
  border-radius:11px!important;
  background:#fff!important;
  color:#23405b!important;
  cursor:pointer!important;
  overflow:hidden!important;
}
body.pmd-shifts-page .pmd-shifts-date-picker svg{
  display:block!important;
  width:18px!important;
  height:18px!important;
  fill:none!important;
  stroke:currentColor!important;
  stroke-width:1.9!important;
  stroke-linecap:round!important;
  stroke-linejoin:round!important;
  pointer-events:none!important;
}
body.pmd-shifts-page .pmd-shifts-date-picker input{
  position:absolute!important;
  inset:0!important;
  width:100%!important;
  height:100%!important;
  margin:0!important;
  padding:0!important;
  border:0!important;
  opacity:0!important;
  cursor:pointer!important;
}
body.pmd-shifts-page .pmd-shifts-date-picker:hover{
  border-color:#9fb9ca!important;
  background:#f7fbfd!important;
}
@media(max-width:900px){
  body.pmd-shifts-page .pmd-shifts-day-header{
    grid-template-columns:1fr!important;
  }
  body.pmd-shifts-page .pmd-shifts-day-header .pmd-r2-day-view__date-nav{
    justify-content:center!important;
  }
  body.pmd-shifts-page .pmd-shifts-day-header .pmd-r2-day-view__title{
    text-align:center!important;
  }
  body.pmd-shifts-page .pmd-shifts-day-header .pmd-r2-day-view__summary{
    justify-content:center!important;
  }
}
'''
if 'PMD_SHIFTS_DAY_ONLY_WORKSPACE_V15' in css:
    raise SystemExit('V15 CSS marker already exists')
CSS.write_text(css.rstrip() + append + '\n')

print('Prepared Shifts day-only V15')
