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
  // PMD_STAFF_WORKFORCE_DAILY_RELIABILITY_V2_20261021: refresh on every opening; guard overlapping fetches and keep tab selection.
  var trigger = null, previousOverflow = '', controller = null, requestId = 0;
  var currentTab = 'presence', sending = false;
  function setTab(tabName) {
    currentTab = tabName;
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
    if (!url || overlay.hidden) return;
    if (controller) controller.abort();
    var ticket = ++requestId;
    var request = new AbortController();
    controller = request;
    if (refresh) refresh.disabled = true;
    container.innerHTML = '<p class="pmd-staff-ops__empty">Loading restaurant staff activity…</p>';
    try {
      var response = await fetch(url, {
        credentials:'same-origin',signal:request.signal,
        headers:{'X-Requested-With':'XMLHttpRequest','Accept':'text/html'},
        cache:'no-store'
      });
      if (!response.ok || response.redirected ||
          !String(response.headers.get('content-type') || '').includes('text/html')) {
        throw new Error('session');
      }
      var html = await response.text();
      if (requestId !== ticket || overlay.hidden) return;
      container.innerHTML = html;
      setTab(currentTab);
    } catch (error) {
      if (requestId !== ticket || error.name === 'AbortError') return;
      container.innerHTML = '<p class="pmd-staff-ops__empty" role="alert">Staff activity could not load. Check your session or retry.</p>';
    } finally {
      if (requestId === ticket) {
        if (refresh) refresh.disabled = false;
        controller = null;
      }
    }
  }
  function show() {
    trigger = document.activeElement;
    previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    overlay.hidden = false;
    overlay.setAttribute('aria-hidden','false');
    var closeButton = overlay.querySelector('.pmd-staff-ops__close');
    if (closeButton) closeButton.focus({preventScroll:true});
    // Attendance, requests and messages may have changed since last opening.
    load();
  }
  openButton.addEventListener('click', function () { if (overlay.hidden) show(); else close(); });
  // PMD_SHIFTS_WORKFORCE_DESK_V1_20261023: in-page shortcuts share
  // the existing fully authorized operations drawer and handlers.
  root.querySelectorAll('[data-pmd-staff-ops-shortcut]').forEach(function (shortcut) {
    shortcut.addEventListener('click', function () {
      var tab = shortcut.getAttribute('data-pmd-staff-ops-shortcut');
      if (['presence','requests','chat','activity'].indexOf(tab) === -1) return;
      currentTab = tab;
      if (overlay.hidden) show();
      else { setTab(tab);load(); }
    });
  });
  overlay.addEventListener('click', function (event) {
    if (event.target.closest('[data-pmd-staff-ops-close]')) { close(); return; }
    var tab = event.target.closest('[data-pmd-staff-ops-tab]');
    if (tab) setTab(tab.dataset.pmdStaffOpsTab);
  });
  refresh.addEventListener('click',load);
  // Keep request decisions and Team messages inside the Owner/Manager drawer.
  // The existing CSRF-protected server endpoints still authorize every write.
  overlay.addEventListener('submit', async function (event) {
    var form = event.target;
    if (!form || !form.matches || !form.matches('form')) return;
    var section = form.closest('[data-pmd-staff-ops-section]');
    if (!section || ['requests','chat'].indexOf(section.dataset.pmdStaffOpsSection) === -1) return;
    var action;
    try { action = new URL(form.action, window.location.href); }
    catch (error) { return; }
    if (action.origin !== window.location.origin ||
        !/\/shifts\/(?:handlerequest|sendteammessage)$/.test(action.pathname)) return;
    event.preventDefault();
    if (sending) return;
    sending = true;
    var actions = Array.prototype.slice.call(form.querySelectorAll('button[type="submit"]'));
    actions.forEach(function(button) { button.disabled = true; });
    var feedback = overlay.querySelector('[data-pmd-staff-ops-feedback]');
    if (feedback) feedback.remove();
    feedback = document.createElement('p');
    feedback.className = 'pmd-staff-ops__feedback';
    feedback.setAttribute('data-pmd-staff-ops-feedback', '');
    feedback.setAttribute('role', 'status');
    feedback.textContent = 'Saving…';
    form.appendChild(feedback);
    try {
      var response = await fetch(action.href, {
        method:'POST', credentials:'same-origin', body:new FormData(form),
        headers:{'X-Requested-With':'XMLHttpRequest','Accept':'text/html'},
        redirect:'follow',cache:'no-store'
      });
      // The canonical handlers redirect to Shifts on success.
      // Reject login redirects and validation failures rather than claiming success.
      var destination = new URL(response.url);
      if (!response.ok || !response.redirected ||
          destination.origin !== window.location.origin ||
          !/\/shifts\/?$/.test(destination.pathname)) throw new Error('save');
      if (!overlay.hidden) await load();
    } catch (error) {
      if (feedback.isConnected) {
        feedback.setAttribute('role','alert');
        feedback.textContent = 'Could not save. Check the form and try again.';
      }
    } finally {
      sending = false;
      actions.forEach(function(button) { button.disabled = false; });
    }
  });

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
