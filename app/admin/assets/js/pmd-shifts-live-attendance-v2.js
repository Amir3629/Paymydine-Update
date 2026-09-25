/* PMD_SHIFTS_LIVE_ATTENDANCE_V1 */
/* PMD_SHIFTS_LIVE_ATTENDANCE_V2_NO_LATE_SHIFT_PAINT
/* PMD_SHIFT_ATTENDANCE_IDEMPOTENT_V134 */
 * Attendance may update badges/KPIs after load, but it must never restyle
 * or recompute already-painted shift bars. Server/V17 own bar geometry/text.
 */
(function () {
  'use strict';

  function start() {
    if (!document.body || !document.body.classList.contains('pmd-shifts-page')) return;

    var root = document.querySelector('[data-pmd-shifts-root]');
    if (!root) return;

    /* PMD_SHIFT_ATTENDANCE_FIRST_PAINT_V134
     * Badge geometry/colors now come from static first-paint CSS.
     * Runtime owns data freshness only.
     */

    function minutes(clock) {
      var match = String(clock || '').match(/^([01]\d|2[0-3]):([0-5]\d)$/);
      return match ? Number(match[1]) * 60 + Number(match[2]) : null;
    }

    function shiftTimes(button) {
      var strong = button.querySelector('strong');
      var text = String(strong ? strong.textContent : button.getAttribute('title') || '');
      var match = text.match(/([0-2]\d:[0-5]\d)\s*[–—-]\s*([0-2]\d:[0-5]\d)/);
      if (!match) return null;
      var start = minutes(match[1]);
      var end = minutes(match[2]);
      if (start == null || end == null) return null;
      if (end <= start) end += 1440;
      return {start:start,end:end};
    }

    function repairGeometry() {
      root.querySelectorAll('.pmd-shifts-final-shift').forEach(function (button) {
        var time = shiftTimes(button);
        if (!time) return;
        var dayStart = 360;
        var dayEnd = 1800;
        var startMinute = Math.max(dayStart, time.start);
        var endMinute = Math.min(dayEnd, time.end);
        if (endMinute <= startMinute) endMinute = Math.min(dayEnd, startMinute + 30);
        var left = ((startMinute - dayStart) / 1440) * 100;
        var right = ((dayEnd - endMinute) / 1440) * 100;

        // Left + right is the geometry authority. Width:auto prevents any old
        // shared component width/max-width rule from shrinking an 8h shift.
        button.style.setProperty('left', left.toFixed(5) + '%', 'important');
        button.style.setProperty('right', right.toFixed(5) + '%', 'important');
        button.style.setProperty('width', 'auto', 'important');
        button.style.setProperty('min-width', '0', 'important');
        button.style.setProperty('max-width', 'none', 'important');
      });
    }

    function bootDay() {
      try {
        var url = new URL(window.location.href);
        var day = String(url.searchParams.get('day') || '');
        if (/^\d{4}-\d{2}-\d{2}$/.test(day)) return day;
      } catch (error) {}
      try {
        var node = document.getElementById('pmd-shifts-bootstrap');
        var boot = JSON.parse((node && node.textContent) || '{}');
        if (/^\d{4}-\d{2}-\d{2}$/.test(String(boot.selected_day || ''))) return String(boot.selected_day);
      } catch (error) {}
      return new Date().toISOString().slice(0, 10);
    }

    function adminPrefix() {
      var parts = String(window.location.pathname || '').split('/').filter(Boolean);
      var index = parts.indexOf('shifts');
      if (index > 0) return '/' + parts.slice(0, index).join('/');
      return parts.length ? '/' + parts[0] : '/admin';
    }

    var endpoint = adminPrefix() + '/_pmd/shifts/attendance-v1';
    var lastFetchKey = '';
    var fetchTimer = null;

    function bootAttendanceV134() {
      try {
        var node = document.getElementById('pmd-shifts-bootstrap');
        var boot = JSON.parse((node && node.textContent) || '{}');
        var live = boot && boot.live_attendance;
        return live && live.ok && live.ready ? live : null;
      } catch (error) {
        return null;
      }
    }

    function setKpi(title, value) {
      if (value == null) return;
      root.querySelectorAll('.pmd-r2-kpi-v2401-card').forEach(function (card) {
        var label = card.querySelector('.pmd-r2-kpi-v2401-title');
        if (!label || String(label.textContent || '').trim().toLowerCase() !== String(title).toLowerCase()) return;
        var node = card.querySelector('.pmd-r2-kpi-v2401-value');
        if (node && String(node.textContent || '').trim() !== String(value)) {
          node.textContent = String(value);
        }
      });
    }

    function paintAttendance(payload) {
      var rows = payload && payload.rows ? payload.rows : {};

      root.querySelectorAll('.pmd-shifts-final-row[data-person-id]').forEach(function (row) {
        var personId = String(Number(row.getAttribute('data-person-id') || 0));
        var copy = row.querySelector('.pmd-shifts-final-person-copy');
        if (!copy) return;

        var current = copy.querySelector('[data-pmd-shifts-live-state]');
        var next = rows[personId] || null;
        var nextState = next && next.state
          ? String(next.state).replace(/[^a-z_]/g, '')
          : 'off';
        var nextLabel = next && next.label
          ? String(next.label)
          : '';

        if (!nextLabel || nextState === 'off') {
          if (current) current.remove();
          return;
        }

        if (current) {
          var currentState = String(
            current.getAttribute('data-pmd-shifts-live-state-code') || ''
          );
          var currentLabel = String(current.textContent || '');

          if (currentState === nextState && currentLabel === nextLabel) {
            return;
          }

          current.className = 'pmd-shifts-live-state is-' + nextState;
          current.setAttribute('data-pmd-shifts-live-state-code', nextState);
          current.textContent = nextLabel;
          return;
        }

        var badge = document.createElement('span');
        badge.className = 'pmd-shifts-live-state is-' + nextState;
        badge.setAttribute('data-pmd-shifts-live-state', '');
        badge.setAttribute('data-pmd-shifts-live-state-code', nextState);
        badge.textContent = nextLabel;
        copy.appendChild(badge);
      });

      setKpi('Present now', payload.present_now);
      setKpi('Missing now', payload.missing_now);
    }

    function fetchAttendance(force) {
      var day = bootDay();
      var key = day + '|' + window.location.pathname;
      if (!force && key === lastFetchKey) return;
      lastFetchKey = key;

      fetch(endpoint + '?day=' + encodeURIComponent(day), {
        credentials: 'same-origin',
        headers: {'Accept':'application/json','Cache-Control':'no-cache','X-Requested-With':'XMLHttpRequest'}
      }).then(function (response) {
        return response.ok ? response.json() : null;
      }).then(function (payload) {
        if (!payload || !payload.ok || !payload.ready) return;
        paintAttendance(payload);
      }).catch(function () {});
    }

    function refreshSoon(force) {
      window.clearTimeout(fetchTimer);
      fetchTimer = window.setTimeout(function () {
        fetchAttendance(!!force);
      }, 80);
    }

    function hasRenderedBoardMutation(mutations) {
      return mutations.some(function (mutation) {
        var nodes = Array.prototype.slice.call(mutation.addedNodes || []).concat(Array.prototype.slice.call(mutation.removedNodes || []));
        return nodes.some(function (node) {
          if (!node || node.nodeType !== 1) return false;
          if (node.matches && node.matches('.pmd-shifts-final-screen,.pmd-shifts-final-row,.pmd-shifts-final-shift')) return true;
          return !!(node.querySelector && node.querySelector('.pmd-shifts-final-screen,.pmd-shifts-final-row,.pmd-shifts-final-shift'));
        });
      });
    }

    var bootLiveV134 = bootAttendanceV134();
    if (bootLiveV134) {
      // Server HTML already carries these values. Idempotent paint is useful
      // for client-rendered day navigation and performs zero DOM writes when
      // the first paint is already identical.
      paintAttendance(bootLiveV134);
    }

    fetchAttendance(true);

    var host = root.querySelector('[data-pmd-shifts-hour-host]') || root;
    var observer = new MutationObserver(function (mutations) {
      // Ignore our own attendance badge changes; react only when the canonical
      // Shifts renderer replaces the day board or its shift buttons.
      if (!hasRenderedBoardMutation(mutations)) return;

      var embedded = bootAttendanceV134();
      if (embedded) paintAttendance(embedded);

      lastFetchKey = '';
      refreshSoon(true);
    });
    observer.observe(host, {childList:true,subtree:true});

    window.setInterval(function () {
      fetchAttendance(true);
    }, 15000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
