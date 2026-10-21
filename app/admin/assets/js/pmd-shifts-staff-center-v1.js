/* PMD_SHIFTS_STAFF_CENTER_UI_V1_20261021 */
(function () {
  'use strict';
  var root = document.querySelector('[data-pmd-shifts-root]');
  if (!root) return;
  var openButton = root.querySelector('[data-pmd-staff-ops-open]');
  var overlay = root.querySelector('[data-pmd-staff-ops-dialog]');
  if (!overlay || !openButton) return;
  var container = overlay.querySelector('[data-pmd-staff-ops-content]');
  var refresh = overlay.querySelector('[data-pmd-staff-ops-refresh]');
  var url = openButton.getAttribute('data-pmd-staff-ops-url');
  var trigger = null, previousOverflow = '', controller = null, loaded = false;
  function setTab(tabName) {
    overlay.querySelectorAll('[data-pmd-staff-ops-tab]').forEach(function (tab) {
      tab.setAttribute('aria-selected', String(tab.dataset.pmdStaffOpsTab === tabName));
    });
    overlay.querySelectorAll('[data-pmd-staff-ops-section]').forEach(function (section) {
      section.hidden = section.dataset.pmdStaffOpsSection !== tabName;
    });
  }
  function close() {
    if (overlay.hidden) return;
    overlay.hidden = true;
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = previousOverflow;
    if (controller) controller.abort();
    controller = null;
    if (trigger && trigger.isConnected) trigger.focus({preventScroll:true});
  }
  function getFocusables() {
    return Array.prototype.slice.call(overlay.querySelectorAll('button:not([disabled]):not([hidden]), a[href], textarea:not([disabled])'))
      .filter(function (node) { return node.getClientRects().length > 0 && !node.closest('[hidden]'); });
  }
  async function load() {
    if (!url) return;
    if (controller) controller.abort();
    controller = new AbortController();
    refresh.disabled = true;
    container.innerHTML = '<p class="pmd-staff-ops__empty">Loading restaurant staff activity…</p>';
    try {
      var response = await fetch(url, {credentials:'same-origin', signal:controller.signal, headers:{'X-Requested-With':'XMLHttpRequest','Accept':'text/html'},cache:'no-store'});
      if (!response.ok || response.redirected || !String(response.headers.get('content-type') || '').includes('text/html')) throw new Error('session');
      var html = await response.text();
      if (overlay.hidden) return;
      container.innerHTML = html;
      loaded = true;
      setTab('presence');
    } catch (error) {
      if (error.name === 'AbortError') return;
      container.innerHTML = '<p class="pmd-staff-ops__empty">Staff activity could not load. Check your session or retry.</p>';
    } finally { refresh.disabled = false; controller = null; }
  }
  function show() {
    trigger = document.activeElement;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden','false');
    var closeButton = overlay.querySelector('.pmd-staff-ops__close');
    if (closeButton) closeButton.focus({preventScroll:true});
    if (!loaded) load();
  }
  openButton.addEventListener('click', function () { if (overlay.hidden) show(); else close(); });
  overlay.addEventListener('click', function (event) {
    if (event.target.closest('[data-pmd-staff-ops-close]')) { close(); return; }
    var tab = event.target.closest('[data-pmd-staff-ops-tab]');
    if (tab) setTab(tab.dataset.pmdStaffOpsTab);
  });
  refresh.addEventListener('click',load);
  document.addEventListener('keydown',function(event) {
    if (overlay.hidden) return;
    if (event.key === 'Escape') { event.preventDefault();close();return; }
    if (event.key !== 'Tab') return;
    var nodes=getFocusables();
    if (!nodes.length) return;
    var first=nodes[0],last=nodes[nodes.length-1];
    if (event.shiftKey && document.activeElement === first) {event.preventDefault();last.focus();}
    else if (!event.shiftKey && document.activeElement === last) {event.preventDefault();first.focus();}
  });
})();
