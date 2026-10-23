/* PMD_DEVICE_FLEET_SIMPLE_UI_V150
 * A presentation-only filter/expander. The server retains the authoritative
 * manager guard, command serializer and pairing/heartbeat checks.
 * Never send device control requests from this script.
 */
(function () {
  'use strict';
  if (window.__PMD_DEVICE_FLEET_V150__) return;
  window.__PMD_DEVICE_FLEET_V150__ = true;

  function start() {
    var toolbar = document.querySelector('[data-pmd-device-fleet-toolbar]');
    var list = document.querySelector('[data-pmd-device-list]');
    if (!toolbar || !list) return;
    var rows = Array.prototype.slice.call(list.querySelectorAll('[data-pmd-device-row]'));
    var count = toolbar.querySelector('[data-pmd-device-count]');
    var empty = document.querySelector('[data-pmd-device-empty]');
    var search = toolbar.querySelector('[data-pmd-device-search]');
    var tabs = Array.prototype.slice.call(
      toolbar.querySelectorAll('[data-pmd-device-filter]')
    );
    var activeFilter = 'online';
    var text = '';

    // Active physical screens first, then recognized apps, then old/offline
    // pairings. Never delete a trusted device or guess its identity.
    rows.sort(function (a, b) {
      var onlineA = a.getAttribute('data-pmd-device-online') === '1' ? 1 : 0;
      var onlineB = b.getAttribute('data-pmd-device-online') === '1' ? 1 : 0;
      if (onlineA !== onlineB) return onlineB - onlineA;
      var typeA = a.getAttribute('data-pmd-device-group') || '';
      var typeB = b.getAttribute('data-pmd-device-group') || '';
      if (typeA !== typeB) return typeA === 'table' ? -1 : typeB === 'table' ? 1 : typeA.localeCompare(typeB);
      return (Number(a.getAttribute('data-pmd-device-id')) || 0) -
             (Number(b.getAttribute('data-pmd-device-id')) || 0);
    });
    rows.forEach(function (row) { list.appendChild(row); });

    function matchesGroup(row, key) {
      var group = row.getAttribute('data-pmd-device-group') || '';
      var online = row.getAttribute('data-pmd-device-online') === '1';
      if (key === 'online') return online;
      if (key === 'offline') return !online;
      if (key === 'staff' || key === 'table') return group === key;
      return true;
    }
    function apply() {
      var visible = 0;
      rows.forEach(function (row) {
        var words = (row.textContent || '').toLocaleLowerCase();
        var match = matchesGroup(row, activeFilter) &&
          (!text || words.indexOf(text) !== -1);
        row.hidden = !match;
        if (match) visible += 1;
      });
      if (count) count.textContent = visible + ' / ' + rows.length + ' devices';
      if (empty) empty.hidden = visible !== 0;
      tabs.forEach(function (tab) {
        var key = tab.getAttribute('data-pmd-device-filter') || '';
        var tally = toolbar.querySelector('[data-pmd-fleet-tab-count="' + key + '"]');
        if (tally) tally.textContent = '(' + rows.filter(function (r) {
          return matchesGroup(r, key);
        }).length + ')';
        tab.setAttribute('aria-pressed', key === activeFilter ? 'true' : 'false');
      });
    }
    toolbar.addEventListener('click', function (event) {
      var tab = event.target && event.target.closest
        ? event.target.closest('[data-pmd-device-filter]') : null;
      if (!tab || !toolbar.contains(tab)) return;
      activeFilter = tab.getAttribute('data-pmd-device-filter') || 'online';
      apply();
    });
    if (search) {
      search.addEventListener('input', function () {
        text = String(search.value || '').trim().toLocaleLowerCase();
        // Searching must find any registered device, even if it is offline
        // and the default Connected tab was selected.
        if (text) activeFilter = 'all';
        apply();
      });
    }
    list.addEventListener('click', function (event) {
      var button = event.target && event.target.closest
        ? event.target.closest('[data-pmd-device-more]') : null;
      if (!button) return;
      var row = button.closest('[data-pmd-device-row]');
      if (!row) return;
      var expand = row.getAttribute('data-pmd-device-expanded') !== '1';
      row.setAttribute('data-pmd-device-expanded', expand ? '1' : '0');
      button.setAttribute('aria-expanded', expand ? 'true' : 'false');
      button.textContent = expand ? 'Hide details' : 'Details';
    });
    apply();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', start, {once: true});
  } else start();
})();
