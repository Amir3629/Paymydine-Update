from pathlib import Path

JS = Path('app/admin/assets/js/pmd-shifts-v1.js')
CSS = Path('app/admin/assets/css/pmd-shifts-dashboard-reservations-v4.css')

js = JS.read_text()
css = CSS.read_text()

# Version the shared UI stylesheet loader.
js = js.replace('data-pmd-shifts-exact-ui-v15', 'data-pmd-shifts-exact-ui-v16')
js = js.replace('pmd-shifts-dashboard-reservations-v4.css?v=15', 'pmd-shifts-dashboard-reservations-v4.css?v=16')

start = js.find('  function resourceEntriesForPerson(person, shifts) {')
end = js.find('  function weekStartKey(key) {', start)
if start < 0 or end < 0:
    raise SystemExit('Resource helper bounds not found')

helpers = r'''  function finalTimelineWindow(shift) {
    var dayStart = 360;
    var dayEnd = 1560;
    var window = shiftWindow(shift);
    var start = Math.max(dayStart, window.start);
    var end = Math.min(dayEnd, window.end);
    if (end <= start) end = Math.min(dayEnd, start + 30);
    return {start: start, end: end};
  }

  function finalShiftMarkup(shift, person) {
    var window = finalTimelineWindow(shift);
    var total = 1200;
    var left = ((window.start - 360) / total) * 100;
    var width = ((window.end - window.start) / total) * 100;
    var time = shift.start || 'All day';
    if (shift.end) time += '–' + shift.end;
    var attendance = (Array.isArray(shift.people) ? shift.people : []).find(function (assigned) {
      return Number(assigned && assigned.person_id || 0) === Number(person.id || 0);
    });
    var state = String(attendance && attendance.attendance || 'planned').toLowerCase();
    return '' +
      '<button type="button" class="pmd-shifts-final-shift' + (shift.confirmed ? ' is-confirmed' : '') + (state === 'absent' ? ' is-absent' : '') + '"' +
        ' data-pmd-shift-manage="' + Number(shift.id || 0) + '"' +
        ' style="left:' + left.toFixed(4) + '%;width:' + width.toFixed(4) + '%"' +
        ' title="' + escapeHtml((shift.label || 'Shift') + ' · ' + time) + '">' +
        '<strong>' + escapeHtml(time) + '</strong>' +
        '<span>' + escapeHtml(shift.label || 'Shift') + '</span>' +
      '</button>';
  }

  function finalTimeScaleMarkup() {
    var labels = [];
    for (var value = 360; value <= 1560; value += 120) {
      labels.push('<span>' + escapeHtml(minuteLabel(value)) + '</span>');
    }
    return labels.join('');
  }

  function finalSlotMarkup(person, key) {
    var slots = [];
    for (var value = 360; value < 1560; value += 30) {
      var time = minuteLabel(value);
      slots.push(
        '<button type="button" class="pmd-shifts-final-slot" data-pmd-person-slot-create' +
        ' data-person-id="' + Number(person.id || 0) + '" data-date="' + escapeHtml(key) + '" data-time="' + time + '"' +
        ' aria-label="Add ' + escapeHtml(person.name || 'team member') + ' at ' + time + '"><span>+</span></button>'
      );
    }
    return slots.join('');
  }

  function parseEmbeddedJson(doc, id) {
    try {
      var node = doc.getElementById(id);
      return JSON.parse((node && node.textContent) || '{}') || {};
    } catch (error) {
      return {};
    }
  }

'''
js = js[:start] + helpers + js[end:]

render_start = js.find('  function renderHourView(key) {')
render_end = js.find('  function dayPageUrl(key) {', render_start)
if render_start < 0 or render_end < 0:
    raise SystemExit('renderHourView bounds not found')

render = r'''  function renderHourView(key) {
    var host = root.querySelector('[data-pmd-shifts-hour-host]');
    if (!host) return;

    key = key || boot.selected_day || new Date().toISOString().slice(0, 10);
    boot.selected_day = key;

    var copyWeekInput = root.querySelector('[data-pmd-copy-week-form] input[name="week"]');
    if (copyWeekInput) copyWeekInput.value = weekStartKey(key);

    var globalAddShift = root.querySelector('.pmd-shifts__header [data-pmd-shift-open]');
    if (globalAddShift) globalAddShift.setAttribute('data-date', key);

    var shifts = shiftsForDate(key);
    var people = schedulingPeople();
    var todayKey = dateKey(new Date());

    var rows = people.map(function (person) {
      var personShifts = shifts.filter(function (shift) { return shiftHasPerson(shift, person.id); });
      var shiftsMarkup = personShifts.map(function (shift) { return finalShiftMarkup(shift, person); }).join('');
      return '' +
        '<div class="pmd-shifts-final-row" data-person-id="' + Number(person.id || 0) + '">' +
          '<div class="pmd-shifts-final-person">' +
            '<span class="pmd-shifts-final-avatar">' + escapeHtml(personInitials(person.name)) + '</span>' +
            '<span class="pmd-shifts-final-person-copy">' +
              '<button type="button" data-pmd-team-scroll-person="' + Number(person.id || 0) + '">' + escapeHtml(person.name || 'Team member') + '</button>' +
              '<small>' + escapeHtml(person.role || 'Team') + '</small>' +
            '</span>' +
          '</div>' +
          '<div class="pmd-shifts-final-track">' +
            '<div class="pmd-shifts-final-slots">' + finalSlotMarkup(person, key) + '</div>' +
            '<div class="pmd-shifts-final-shifts">' + shiftsMarkup + '</div>' +
          '</div>' +
        '</div>';
    }).join('');

    var emptyState = people.length ? '' : '' +
      '<div class="pmd-shifts-final-empty">' +
        '<strong>No team members yet</strong>' +
        '<button type="button" data-pmd-team-open>+ Member</button>' +
      '</div>';

    host.innerHTML = '' +
      '<div class="pmd-shifts-final-screen">' +
        '<header class="pmd-shifts-final-toolbar">' +
          '<div class="pmd-shifts-final-date">' +
            '<button type="button" class="pmd-shifts-final-nav" data-pmd-shifts-prev-day aria-label="Previous day">‹</button>' +
            '<div><h2>' + escapeHtml(formattedDate(key)) + '</h2></div>' +
            '<button type="button" class="pmd-shifts-final-nav" data-pmd-shifts-next-day aria-label="Next day">›</button>' +
          '</div>' +
          '<div class="pmd-shifts-final-actions">' +
            (key === todayKey ? '' : '<button type="button" class="pmd-shifts-final-soft" data-pmd-shifts-today>Today</button>') +
            '<label class="pmd-shifts-date-picker" title="Choose date">' +
              '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M8 3v4M16 3v4M3 10h18"></path></svg>' +
              '<input type="date" data-pmd-shifts-date-input value="' + escapeHtml(key) + '" aria-label="Choose date">' +
            '</label>' +
            '<button type="button" class="pmd-shifts-final-soft" data-pmd-copy-week>Copy week</button>' +
          '</div>' +
        '</header>' +
        emptyState +
        (people.length ? '' +
          '<div class="pmd-shifts-final-scroll">' +
            '<div class="pmd-shifts-final-board">' +
              '<div class="pmd-shifts-final-scale-row">' +
                '<div class="pmd-shifts-final-scale-person">Team</div>' +
                '<div class="pmd-shifts-final-scale">' + finalTimeScaleMarkup() + '</div>' +
              '</div>' +
              rows +
            '</div>' +
          '</div>' : '') +
      '</div>';

    host.hidden = false;

    try {
      var url = new URL(window.location.href);
      url.searchParams.set('month', monthKey(key));
      url.searchParams.set('day', key);
      url.hash = '';
      history.replaceState(null, '', url.toString());
    } catch (error) {}
  }

'''
js = js[:render_start] + render + js[render_end:]

old = r'''  function openHourDay(key) {
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
new = r'''  function loadDayData(key) {
    var url = dayPageUrl(key);
    root.classList.add('is-day-loading');
    return fetch(url, {credentials: 'same-origin', headers: {'X-Requested-With': 'XMLHttpRequest'}})
      .then(function (response) {
        if (!response.ok) throw new Error('Shift day request failed');
        return response.text();
      })
      .then(function (html) {
        var doc = new DOMParser().parseFromString(html, 'text/html');
        var nextBoot = parseEmbeddedJson(doc, 'pmd-shifts-bootstrap');
        var nextKpis = parseEmbeddedJson(doc, 'pmd-shifts-kpi-data');
        if (!nextBoot || !Array.isArray(nextBoot.shifts)) throw new Error('Shift day payload missing');
        boot = nextBoot;
        if (nextKpis && Object.keys(nextKpis).length) kpiCards = nextKpis;
        refreshVisibleKpis();
        renderHourView(key);
      })
      .finally(function () { root.classList.remove('is-day-loading'); });
  }

  function openHourDay(key) {
    key = String(key || '');
    if (!parseDateKey(key)) return;
    if (monthKey(key) !== String(boot.month || '')) {
      loadDayData(key).catch(function () { window.location.href = dayPageUrl(key); });
      return;
    }
    renderHourView(key);
  }

  function changeHourDay(delta) {
    openHourDay(shiftedDate(boot.selected_day, delta));
  }
'''
if old not in js:
    raise SystemExit('openHourDay block not found')
js = js.replace(old, new, 1)

# Add Today action before previous/next handling.
needle = "    if (event.target.closest('[data-pmd-shifts-prev-day]')) {\n"
insert = "    if (event.target.closest('[data-pmd-shifts-today]')) {\n      event.preventDefault();\n      openHourDay(dateKey(new Date()));\n      return;\n    }\n\n"
if needle not in js:
    raise SystemExit('Previous-day handler anchor missing')
js = js.replace(needle, insert + needle, 1)

JS.write_text(js)

append = r'''

/* PMD_SHIFTS_FINAL_ROTA_V16
 * Final Shifts planning model: one person per row, horizontal time axis.
 * No empty staff columns and no 30-minute vertical spreadsheet.
 */
body.pmd-shifts-page .pmd-shifts-final-screen{
  width:100%!important;
  min-width:0!important;
}
body.pmd-shifts-page .pmd-shifts-final-toolbar{
  display:flex!important;
  align-items:center!important;
  justify-content:space-between!important;
  gap:14px!important;
  width:100%!important;
  margin:0 0 12px!important;
  padding:12px 14px!important;
  border:1px solid #d7e4ec!important;
  border-radius:16px!important;
  background:#fff!important;
  box-sizing:border-box!important;
}
body.pmd-shifts-page .pmd-shifts-final-date,
body.pmd-shifts-page .pmd-shifts-final-actions{
  display:flex!important;
  align-items:center!important;
  gap:8px!important;
}
body.pmd-shifts-page .pmd-shifts-final-date h2{
  margin:0!important;
  color:#102a43!important;
  font-size:20px!important;
  font-weight:900!important;
  line-height:1.1!important;
  letter-spacing:-.025em!important;
}
body.pmd-shifts-page .pmd-shifts-final-nav,
body.pmd-shifts-page .pmd-shifts-final-soft{
  display:inline-flex!important;
  min-height:38px!important;
  align-items:center!important;
  justify-content:center!important;
  margin:0!important;
  border:1px solid #d4e1ea!important;
  border-radius:11px!important;
  background:#fff!important;
  color:#173752!important;
  font:inherit!important;
  font-size:11px!important;
  font-weight:850!important;
  cursor:pointer!important;
}
body.pmd-shifts-page .pmd-shifts-final-nav{
  width:38px!important;
  min-width:38px!important;
  padding:0!important;
  font-size:20px!important;
}
body.pmd-shifts-page .pmd-shifts-final-soft{
  padding:0 12px!important;
}
body.pmd-shifts-page .pmd-shifts-final-nav:hover,
body.pmd-shifts-page .pmd-shifts-final-soft:hover{
  border-color:#a9bfce!important;
  background:#f7fbfd!important;
}
body.pmd-shifts-page .pmd-shifts-final-scroll{
  width:100%!important;
  overflow-x:auto!important;
  overflow-y:hidden!important;
  border:1px solid #d7e4ec!important;
  border-radius:16px!important;
  background:#fff!important;
  box-sizing:border-box!important;
  scrollbar-width:thin!important;
}
body.pmd-shifts-page .pmd-shifts-final-board{
  min-width:1120px!important;
  width:100%!important;
}
body.pmd-shifts-page .pmd-shifts-final-scale-row,
body.pmd-shifts-page .pmd-shifts-final-row{
  display:grid!important;
  grid-template-columns:220px minmax(900px,1fr)!important;
  width:100%!important;
  min-width:0!important;
}
body.pmd-shifts-page .pmd-shifts-final-scale-row{
  min-height:42px!important;
  border-bottom:1px solid #dfe8ee!important;
  background:#f8fbfd!important;
}
body.pmd-shifts-page .pmd-shifts-final-scale-person{
  position:sticky!important;
  left:0!important;
  z-index:8!important;
  display:flex!important;
  align-items:center!important;
  padding:0 16px!important;
  border-right:1px solid #dfe8ee!important;
  background:#f8fbfd!important;
  color:#71849a!important;
  font-size:10px!important;
  font-weight:900!important;
  letter-spacing:.08em!important;
  text-transform:uppercase!important;
  box-sizing:border-box!important;
}
body.pmd-shifts-page .pmd-shifts-final-scale{
  display:grid!important;
  grid-template-columns:repeat(11,minmax(0,1fr))!important;
  align-items:center!important;
  padding:0 10px!important;
  color:#71849a!important;
  font-size:9.5px!important;
  font-weight:800!important;
  box-sizing:border-box!important;
}
body.pmd-shifts-page .pmd-shifts-final-scale span{
  transform:translateX(-50%)!important;
  white-space:nowrap!important;
}
body.pmd-shifts-page .pmd-shifts-final-scale span:first-child{
  transform:none!important;
}
body.pmd-shifts-page .pmd-shifts-final-scale span:last-child{
  transform:translateX(-100%)!important;
  text-align:right!important;
}
body.pmd-shifts-page .pmd-shifts-final-row{
  min-height:72px!important;
  border-bottom:1px solid #e5edf2!important;
}
body.pmd-shifts-page .pmd-shifts-final-row:last-child{
  border-bottom:0!important;
}
body.pmd-shifts-page .pmd-shifts-final-person{
  position:sticky!important;
  left:0!important;
  z-index:7!important;
  display:grid!important;
  grid-template-columns:38px minmax(0,1fr)!important;
  align-items:center!important;
  gap:10px!important;
  padding:10px 14px!important;
  border-right:1px solid #dfe8ee!important;
  background:#fff!important;
  box-sizing:border-box!important;
}
body.pmd-shifts-page .pmd-shifts-final-avatar{
  display:inline-flex!important;
  width:38px!important;
  height:38px!important;
  align-items:center!important;
  justify-content:center!important;
  border:1px solid #cadce8!important;
  border-radius:11px!important;
  background:#eef7fb!important;
  color:#173752!important;
  font-size:12px!important;
  font-weight:900!important;
}
body.pmd-shifts-page .pmd-shifts-final-person-copy{
  display:grid!important;
  gap:3px!important;
  min-width:0!important;
}
body.pmd-shifts-page .pmd-shifts-final-person-copy button{
  overflow:hidden!important;
  margin:0!important;
  padding:0!important;
  border:0!important;
  background:transparent!important;
  color:#102a43!important;
  font:inherit!important;
  font-size:12px!important;
  font-weight:900!important;
  text-align:left!important;
  text-overflow:ellipsis!important;
  white-space:nowrap!important;
  cursor:pointer!important;
}
body.pmd-shifts-page .pmd-shifts-final-person-copy small{
  overflow:hidden!important;
  color:#71849a!important;
  font-size:10px!important;
  font-weight:700!important;
  text-overflow:ellipsis!important;
  white-space:nowrap!important;
}
body.pmd-shifts-page .pmd-shifts-final-track{
  position:relative!important;
  min-width:0!important;
  min-height:72px!important;
  background:
    repeating-linear-gradient(to right,transparent 0,transparent calc(5% - 1px),#edf2f5 calc(5% - 1px),#edf2f5 5%),
    #fff!important;
}
body.pmd-shifts-page .pmd-shifts-final-slots{
  position:absolute!important;
  inset:0!important;
  z-index:1!important;
  display:grid!important;
  grid-template-columns:repeat(40,minmax(0,1fr))!important;
}
body.pmd-shifts-page .pmd-shifts-final-slot{
  position:relative!important;
  min-width:0!important;
  margin:0!important;
  padding:0!important;
  border:0!important;
  border-right:1px solid transparent!important;
  background:transparent!important;
  cursor:pointer!important;
}
body.pmd-shifts-page .pmd-shifts-final-slot span{
  position:absolute!important;
  top:50%!important;
  left:50%!important;
  display:inline-flex!important;
  width:20px!important;
  height:20px!important;
  align-items:center!important;
  justify-content:center!important;
  transform:translate(-50%,-50%)!important;
  border:1px solid #c7dbe7!important;
  border-radius:7px!important;
  background:#fff!important;
  color:#0d765f!important;
  font-size:14px!important;
  font-weight:900!important;
  opacity:0!important;
  transition:opacity .12s ease!important;
}
body.pmd-shifts-page .pmd-shifts-final-slot:hover span,
body.pmd-shifts-page .pmd-shifts-final-slot:focus-visible span{
  opacity:1!important;
}
body.pmd-shifts-page .pmd-shifts-final-shifts{
  position:absolute!important;
  inset:9px 0!important;
  z-index:3!important;
  pointer-events:none!important;
}
body.pmd-shifts-page .pmd-shifts-final-shift{
  position:absolute!important;
  top:0!important;
  bottom:0!important;
  display:grid!important;
  align-content:center!important;
  gap:2px!important;
  min-width:38px!important;
  margin:0!important;
  padding:7px 10px!important;
  border:1px solid #92bfe5!important;
  border-left:4px solid #2f80ed!important;
  border-radius:10px!important;
  background:#eaf3ff!important;
  color:#133f73!important;
  box-shadow:none!important;
  text-align:left!important;
  overflow:hidden!important;
  cursor:pointer!important;
  pointer-events:auto!important;
}
body.pmd-shifts-page .pmd-shifts-final-shift.is-confirmed{
  border-color:#8bcbb4!important;
  border-left-color:#20a36f!important;
  background:#eefaf5!important;
  color:#0b5946!important;
}
body.pmd-shifts-page .pmd-shifts-final-shift.is-absent{
  border-color:#e0a0a0!important;
  border-left-color:#d34b4b!important;
  background:#fff1f1!important;
  color:#8b2929!important;
}
body.pmd-shifts-page .pmd-shifts-final-shift strong,
body.pmd-shifts-page .pmd-shifts-final-shift span{
  overflow:hidden!important;
  text-overflow:ellipsis!important;
  white-space:nowrap!important;
}
body.pmd-shifts-page .pmd-shifts-final-shift strong{
  font-size:11px!important;
  font-weight:900!important;
}
body.pmd-shifts-page .pmd-shifts-final-shift span{
  font-size:9.5px!important;
  font-weight:750!important;
  opacity:.82!important;
}
body.pmd-shifts-page .pmd-shifts-final-empty{
  display:flex!important;
  min-height:150px!important;
  align-items:center!important;
  justify-content:center!important;
  flex-direction:column!important;
  gap:12px!important;
  border:1px solid #d7e4ec!important;
  border-radius:16px!important;
  background:#fff!important;
  color:#60758a!important;
}
body.pmd-shifts-page .pmd-shifts-final-empty strong{
  color:#102a43!important;
  font-size:16px!important;
}
body.pmd-shifts-page .pmd-shifts-final-empty button{
  min-height:38px!important;
  padding:0 14px!important;
  border:0!important;
  border-radius:10px!important;
  background:#006b57!important;
  color:#fff!important;
  font-weight:850!important;
  cursor:pointer!important;
}
body.pmd-shifts-page.is-day-loading .pmd-shifts-final-screen{
  opacity:.55!important;
  pointer-events:none!important;
}
@media(max-width:820px){
  body.pmd-shifts-page .pmd-shifts-final-toolbar{
    align-items:stretch!important;
    flex-direction:column!important;
  }
  body.pmd-shifts-page .pmd-shifts-final-date,
  body.pmd-shifts-page .pmd-shifts-final-actions{
    justify-content:center!important;
  }
  body.pmd-shifts-page .pmd-shifts-final-date h2{
    font-size:17px!important;
    text-align:center!important;
  }
  body.pmd-shifts-page .pmd-shifts-final-scale-row,
  body.pmd-shifts-page .pmd-shifts-final-row{
    grid-template-columns:180px minmax(900px,1fr)!important;
  }
}
'''

if 'PMD_SHIFTS_FINAL_ROTA_V16' in css:
    raise SystemExit('V16 CSS marker already exists')
CSS.write_text(css.rstrip() + append + '\n')

print('Prepared final Shifts rota V16')
