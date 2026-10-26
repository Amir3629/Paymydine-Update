/* PMD_ONLINE_STAFF_LIVE_V1
 * Same read-only tenant/location-scoped snapshot as Owner/Manager first paint.
 * One visible-tab 30s timer, no full dashboard/analytics reload and no
 * replacement of unchanged staff nodes. Never turns a failed read into zero.
 */
(function () {
  'use strict';
  if (window.PMDOnlineStaffLiveV1) return;

  function initialize() {
  var root = document.querySelector('[data-pmd-online-staff]');
  if (!root) return;

  var content = root.querySelector('[data-pmd-online-staff-content]');
  var article = root.querySelector('.pmd-manager-online-staff__card');
  var count = root.querySelector('[data-pmd-online-staff-count]');
  var countLabel = root.querySelector('[data-pmd-online-staff-count-label]');
  var summary = root.querySelector('.pmd-manager-online-staff__summary');
  var asOf = root.querySelector('[data-pmd-online-staff-asof]');
  if (!content || !count) return;

  var timer = null;
  var inFlight = false;
  var lastReadAt = Date.now();
  var stopped = false;
  var intervalMs = 30000;

  function setText(node, value) {
    if (node && node.textContent !== value) node.textContent = value;
  }

  function personNode(row) {
    var person = document.createElement('div');
    person.className = 'pmd-manager-online-staff__person';
    person.setAttribute('data-pmd-staff-id', String(row.staff_id));

    var identity = document.createElement('div');
    identity.className = 'pmd-manager-online-staff__identity';
    var dot = document.createElement('span');
    dot.className = 'pmd-manager-online-staff__dot';
    dot.setAttribute('aria-hidden', 'true');
    var personText = document.createElement('div');
    var name = document.createElement('strong');
    var role = document.createElement('span');
    setText(name, String(row.name || 'Staff'));
    setText(role, String(row.role || 'Staff'));
    personText.appendChild(name);
    personText.appendChild(role);
    identity.appendChild(dot);
    identity.appendChild(personText);

    var time = document.createElement('div');
    time.className = 'pmd-manager-online-staff__time';
    var since = document.createElement('span');
    var duration = document.createElement('strong');
    setText(since, String(row.since || '-'));
    setText(duration, String(row.duration || '-'));
    time.appendChild(since);
    time.appendChild(duration);
    person.appendChild(identity);
    person.appendChild(time);
    return person;
  }

  // PMD_ONLINE_STAFF_R37: preserve the shared empty icon on live refresh.
  function setEmptyNotice(node, message) {
    node.classList.add('pmd-r37-source-empty');
    node.setAttribute('role', 'status');
    var label = node.querySelector('.pmd-r37-empty-message');
    if (!label) {
      var icon = document.createElement('span');
      icon.className = 'pmd-r37-empty-icon';
      icon.setAttribute('aria-hidden', 'true');
      icon.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="16" rx="3"></rect><path d="M7 14l3-3 3 2 4-5"></path></svg>';
      label = document.createElement('span');
      label.className = 'pmd-r37-empty-message';
      node.replaceChildren(icon, label);
    }
    setText(label, message);
  }

  function render(snapshot) {
    if (!snapshot || typeof snapshot !== 'object') return;
    var connected = snapshot.connected === true;
    var rows = connected && Array.isArray(snapshot.rows)
      ? snapshot.rows.filter(function (row) {
          return row && Number(row.staff_id) > 0;
        }) : [];
    var label = String(snapshot.count_label || 'online');
    root.setAttribute('data-pmd-connected', connected ? 'true' : 'false');
    setText(count, connected ? String(rows.length) : '—');
    setText(countLabel, label);
    if (summary) summary.setAttribute(
      'aria-label', (connected ? String(rows.length) : 'Unknown') + ' ' + label
    );
    if (article) article.setAttribute('title', String(snapshot.source || ''));
    setText(asOf, String(snapshot.as_of || ''));

    var list = content.querySelector('.pmd-manager-online-staff__people');
    if (connected && rows.length) {
      if (!list) {
        list = document.createElement('div');
        list.className = 'pmd-manager-online-staff__people';
        content.replaceChildren(list);
      }
      var existing = Array.prototype.slice.call(
        list.querySelectorAll(':scope > [data-pmd-staff-id]')
      );
      var sameStaff = existing.length === rows.length &&
        existing.every(function (node, index) {
          return node.getAttribute('data-pmd-staff-id') === String(rows[index].staff_id);
        });

      if (!sameStaff) {
        var frag = document.createDocumentFragment();
        rows.forEach(function (row) { frag.appendChild(personNode(row)); });
        list.replaceChildren(frag);
      } else {
        rows.forEach(function (row, index) {
          var node = existing[index];
          setText(node.querySelector('.pmd-manager-online-staff__identity strong'),
            String(row.name || 'Staff'));
          setText(node.querySelector('.pmd-manager-online-staff__identity span:not(.pmd-manager-online-staff__dot)'),
            String(row.role || 'Staff'));
          setText(node.querySelector('.pmd-manager-online-staff__time span'),
            String(row.since || '-'));
          setText(node.querySelector('.pmd-manager-online-staff__time strong'),
            String(row.duration || '-'));
        });
      }
    } else {
      var message = String(snapshot.empty || (connected
        ? 'No staff are currently signed in.'
        : 'Staff presence is unavailable for this location.'));
      var empty = content.querySelector('.pmd-manager-online-staff__empty');
      if (!empty || content.children.length !== 1) {
        empty = document.createElement('div');
        empty.className = 'pmd-manager-online-staff__empty';
        content.replaceChildren(empty);
      }
      setEmptyNotice(empty, message);
    }
  }

  function schedule(ms) {
    if (timer !== null) clearTimeout(timer);
    timer = null;
    if (stopped || document.hidden) return;
    timer = setTimeout(refresh, ms);
  }

  function snapshotUrl() {
    var url = new URL(window.location.href);
    url.search = '';
    url.hash = '';
    url.searchParams.set('pmd_staff_online', '1');
    url.searchParams.set('_pmd_staff_online', String(Date.now()));
    return url.toString();
  }

  async function refresh() {
    timer = null;
    if (stopped || inFlight || document.hidden) return;
    inFlight = true;
    lastReadAt = Date.now();
    try {
      var response = await fetch(snapshotUrl(), {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          Accept: 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'Cache-Control': 'no-cache'
        }
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      var data = await response.json();
      if (!data || data.success !== true || !data.staff) {
        throw new Error('Invalid staff presence response');
      }
      render(data.staff);
      root.removeAttribute('data-pmd-online-staff-stale');
    } catch (error) {
      root.setAttribute('data-pmd-online-staff-stale', 'true');
      // Keep last known server state; a failed request is not zero online.
      console.warn('[PMD Staff Online] Refresh unavailable:', error.message);
    } finally {
      inFlight = false;
      schedule(intervalMs);
    }
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) {
      if (timer !== null) clearTimeout(timer);
      timer = null;
    } else {
      schedule(Date.now() - lastReadAt > 5000 ? 150 : intervalMs);
    }
  });

  window.addEventListener('pmd:dashboard:live-data', function (event) {
    var extras = event && event.detail && event.detail.extras;
    if (extras && extras.manager_online_staff) render(extras.manager_online_staff);
  });

  window.addEventListener('beforeunload', function () {
    stopped = true;
    if (timer !== null) clearTimeout(timer);
  });

  window.PMDOnlineStaffLiveV1 = {
    version: '1.0.0',
    refresh: refresh,
    audit: function () {
      return {
        active: true,
        connected: root.getAttribute('data-pmd-connected'),
        lastReadAt: lastReadAt,
        inFlight: inFlight,
        stale: root.hasAttribute('data-pmd-online-staff-stale')
      };
    }
  };
  schedule(intervalMs);
  }

  // AssetMaker may inject the script before server-rendered dashboard HTML.
  // Mount after parsing in that case; late scripts mount immediately.
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, {once: true});
  } else {
    initialize();
  }
})();
