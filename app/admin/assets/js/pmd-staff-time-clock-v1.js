/* PMD_STAFF_PORTAL_TIME_CLOCK_CLIENT_V1 */
(function () {
  'use strict';

  var state = window.PMD_STAFF_TIME_CLOCK || null;
  if (!state) return;

  var schedule = document.getElementById('schedule');
  if (!schedule || schedule.querySelector('[data-pmd-staff-time-clock]')) return;

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[character];
    });
  }

  function csrf() {
    var node = document.querySelector('meta[name="csrf-token"]');
    return node ? String(node.getAttribute('content') || '') : '';
  }

  function duration(seconds) {
    seconds = Math.max(0, Math.floor(Number(seconds || 0)));
    var hours = Math.floor(seconds / 3600);
    var minutes = Math.floor((seconds % 3600) / 60);
    var secs = seconds % 60;
    return String(hours).padStart(2, '0') + ':' + String(minutes).padStart(2, '0') + ':' + String(secs).padStart(2, '0');
  }

  var ready = !!state.ready;
  var active = ready && !!state.active;
  var title = active ? 'Working now' : (ready ? 'Ready to start' : 'Time clock unavailable');
  var meta = '';
  if (active) {
    meta = 'Started ' + escapeHtml(state.check_in_label || '') + ' · <b data-pmd-clock-elapsed>' + duration(state.elapsed_seconds) + '</b>';
  } else if (ready && state.scheduled_label) {
    meta = escapeHtml(state.scheduled_label);
  } else if (ready && state.last_check_out_label) {
    meta = 'Last shift ended ' + escapeHtml(state.last_check_out_label) + (state.last_hours != null ? ' · ' + Number(state.last_hours).toFixed(2) + 'h' : '');
  } else if (ready) {
    meta = 'Start when you arrive. PMD uses server time.';
  } else {
    meta = 'Attendance storage is not ready for this restaurant.';
  }

  var action = active ? state.clock_out_url : state.clock_in_url;
  var button = active ? 'Check out' : 'Start shift';
  var form = ready && action ? '' +
    '<form method="post" action="' + escapeHtml(action) + '">' +
      '<input type="hidden" name="_token" value="' + escapeHtml(csrf()) + '">' +
      '<button type="submit" class="pmd-staff-time-clock__button">' + button + '</button>' +
    '</form>' : '';

  var card = document.createElement('section');
  card.className = 'pmd-staff-time-clock' + (active ? ' is-active' : '');
  card.setAttribute('data-pmd-staff-time-clock', '');
  card.innerHTML = '' +
    '<span class="pmd-staff-time-clock__icon" aria-hidden="true">' +
      '<svg viewBox="0 0 24 24"><circle cx="12" cy="13" r="8"></circle><path d="M12 9v4l3 2M9 2h6M12 2v3"></path></svg>' +
    '</span>' +
    '<span class="pmd-staff-time-clock__copy">' +
      '<small>Time clock</small>' +
      '<strong>' + title + '</strong>' +
      '<span>' + meta + '</span>' +
    '</span>' +
    form;

  var monthNav = schedule.querySelector('.pmd-staff-month-nav');
  if (monthNav) schedule.insertBefore(card, monthNav);
  else schedule.insertBefore(card, schedule.firstChild);

  if (active) {
    var elapsed = card.querySelector('[data-pmd-clock-elapsed]');
    var base = Math.max(0, Number(state.elapsed_seconds || 0));
    var startedAt = Date.now();
    window.setInterval(function () {
      if (!elapsed) return;
      elapsed.textContent = duration(base + Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
  }
})();
