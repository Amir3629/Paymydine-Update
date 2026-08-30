/* PMD_SHIFTS_LIVE_ATTENDANCE_V1 */
(function () {
  'use strict';

  function start() {
    if (!document.body || !document.body.classList.contains('pmd-shifts-page')) return;

    var root = document.querySelector('[data-pmd-shifts-root]');
    if (!root) return;

    var style = document.createElement('style');
    style.setAttribute('data-pmd-shifts-live-style', '');
    style.textContent = '' +
      'body.pmd-shifts-page .pmd-shifts-final-shift{min-width:0!important;max-width:none!important;width:auto!important;align-content:center!important;grid-template-rows:auto auto!important;gap:3px!important;padding:7px 10px!important;line-height:1.15!important;}' +
      'body.pmd-shifts-page .pmd-shifts-final-shift strong{display:block!important;margin:0!important;font-size:12px!important;line-height:1.2!important;font-variant-numeric:tabular-nums!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;}' +
      'body.pmd-shifts-page .pmd-shifts-final-shift span{display:block!important;margin:0!important;font-size:10px!important;line-height:1.2!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important;}' +
      'body.pmd-shifts-page .pmd-shifts-live-state{display:inline-flex!important;width:max-content!important;max-width:100%!important;min-height:18px!important;align-items:center!important;margin-top:4px!important;padding:2px 7px!important;border:1px solid #d9e5e2!important;border-radius:999px!important;background:#f4f8f7!important;color:#657973!important;font-size:9px!important;font-weight:850!important;line-height:1.15!important;white-space:nowrap!important;overflow:hidden!important;text-overflow:ellipsis!important;}' +
      'body.pmd-shifts-page .pmd-shifts-live-state.is-working{border-color:#a7d9c7!important;background:#eaf8f2!important;color:#087155!important;}' +
      'body.pmd-shifts-page .pmd-shifts-live-state.is-worked{border-color:#c7dbea!important;background:#f2f8fc!important;color:#315f7c!important;}' +
      'body.pmd-shifts-page .pmd-shifts-live-state.is-not_started{border-color:#eed7a5!important;background:#fff9e9!important;color:#896414!important;}' +
      'body.pmd-shifts-page .pmd-shifts-live-state.is-open{border-color:#e5c1bc!important;background:#fff3f1!important;color:#914a42!important;}';
    document.head.appendChild(style);

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

    function setKpi(title, value) {
      if (value == null) return;
      root.querySelectorAll('.pmd-r2-kpi-v2401-card').forEach(function (card) {
        var label = card.querySelector('.pmd-r2-kpi-v2401-title');
        if (!label || String(label.textContent || '').trim().toLowerCase() !== String(title).toLowerCase()) return;
        var node = card.querySelector('.pmd-r2-kpi-v2401-value');
        if (node) node.textContent = String(value);
      });
    }

    function paintAttendance(payload) {
      var rows = payload && payload.rows ? payload.rows : {};
      root.querySelectorAll('.pmd-shifts-final-row[data-person-id]').forEach(function (row) {
        var personId = String(Number(row.getAttribute('data-person-id') || 0));
        var copy = row.querySelector('.pmd-shifts-final-person-copy');
        if (!copy) return;
        var old = copy.querySelector('[data-pmd-shifts-live-state]');
        if (old) old.remove();

        var state = rows[personId] || null;
        if (!state || !state.label || state.state === 'off') return;
        var badge = document.createElement('span');
        badge.className = 'pmd-shifts-live-state is-' + String(state.state || 'off').replace(/[^a-z_]/g, '');
        badge.setAttribute('data-pmd-shifts-live-state', '');
        badge.textContent = String(state.label || '');
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
        repairGeometry();
        fetchAttendance(!!force);
      }, 80);
    }

    repairGeometry();
    fetchAttendance(true);

    var host = root.querySelector('[data-pmd-shifts-hour-host]') || root;
    var observer = new MutationObserver(function () {
      lastFetchKey = '';
      refreshSoon(false);
    });
    observer.observe(host, {childList:true,subtree:true});

    window.setInterval(function () {
      repairGeometry();
      fetchAttendance(true);
    }, 15000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, {once:true});
  else start();
})();
