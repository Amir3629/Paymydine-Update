/* PMD_STAFF_HOUR_NOTES_CLIENT_R11
 * /admin/mywork is also the Android Staff WebView. Authenticated polling
 * while the app is open; no pretended push notification or background delivery.
 * Text is always rendered with textContent (no untrusted HTML insertion).
 */
(function () {
  'use strict';
  function init() {
    var section = document.querySelector('[data-pmd-staff-hour-notices]');
    var list = section && section.querySelector('[data-pmd-hour-notice-list]');
    if (!section || !list || section.dataset.pmdNotesBound === '1') return;
    section.dataset.pmdNotesBound = '1';
    var endpoint = section.getAttribute('data-pmd-staff-notes-url');
    var prefix = section.getAttribute('data-pmd-staff-notes-confirm-prefix');
    var alertBox = document.querySelector('[data-pmd-staff-hour-alert]');
    var alertText = alertBox && alertBox.querySelector('[data-pmd-hour-alert-text]');
    var unreadNode = section.querySelector('[data-pmd-staff-hour-unread]');
    var tokenMeta = document.querySelector('meta[name="csrf-token"]');
    var csrfToken = tokenMeta ? tokenMeta.getAttribute('content') : '';
    var busy = false;

    function countUnread(items) {
      return items.filter(function (item) { return !item.confirmed; }).length;
    }
    function paintCount(count) {
      if (unreadNode) unreadNode.textContent = count ? (count + ' new') : '';
      if (alertBox) alertBox.hidden = count === 0;
      if (alertText) alertText.textContent = count + ' new team ' + (count === 1 ? 'note' : 'notes') + ' for you.';
    }
    function append(tag, className, parent, value) {
      var el = document.createElement(tag);
      if (className) el.className = className;
      if (value !== undefined) el.textContent = String(value);
      parent.appendChild(el);
      return el;
    }
    function display(items) {
      if (!Array.isArray(items)) return;
      list.textContent = '';
      paintCount(countUnread(items));
      if (!items.length) {
        append('div', 'pmd-staff-hour-notices__empty', list, 'No notes for your account right now.');
        return;
      }
      items.forEach(function (item) {
        var card = append('article', 'pmd-staff-hour-notice ' + (item.confirmed ? 'is-confirmed' : 'is-unread'), list);
        card.setAttribute('data-pmd-hour-note-id', String(item.id));
        var body = append('div', 'pmd-staff-hour-notice__body', card);
        var when = append('time', '', body, String(item.date) + ' · ' + String(item.time));
        when.setAttribute('datetime', String(item.date) + 'T' + String(item.time));
        append('p', '', body, item.message);
        if (item.confirmed) {
          append('span', 'pmd-staff-hour-notice__confirmed', card, 'Confirmed');
        } else {
          var form = append('form', '', card);
          form.setAttribute('method', 'post');
          form.setAttribute('action', prefix.replace(/\/$/, '') + '/' + encodeURIComponent(String(item.id)) + '/confirm');
          form.setAttribute('data-pmd-hour-note-confirm', '');
          var hidden = append('input', '', form);
          hidden.type = 'hidden';
          hidden.name = '_token';
          hidden.value = csrfToken;
          var button = append('button', '', form, 'Confirm');
          button.type = 'submit';
        }
      });
    }
    function refresh() {
      if (busy || document.visibilityState === 'hidden' || !endpoint) return;
      busy = true;
      fetch(endpoint, {
        method: 'GET',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {'Accept':'application/json','X-Requested-With':'XMLHttpRequest'}
      }).then(function (response) {
        if (!response.ok) throw new Error('Staff notes HTTP ' + response.status);
        return response.json();
      }).then(function (data) {
        if (data && data.ok === true) display(data.notes || []);
      }).catch(function (error) {
        // Server-rendered cards remain usable when the phone is offline.
        console.warn('[PMD Staff Hour Notes] refresh unavailable', error);
      }).finally(function () { busy = false; });
    }

    list.addEventListener('submit', function (event) {
      var form = event.target.closest('form[data-pmd-hour-note-confirm]');
      if (!form || !window.fetch || !csrfToken) return; // native POST fallback
      event.preventDefault();
      var button = form.querySelector('button[type="submit"]');
      if (button && button.disabled) return;
      if (button) button.disabled = true;
      fetch(form.action, {
        method: 'POST', credentials: 'same-origin',
        headers: {'X-CSRF-TOKEN': csrfToken,'Accept':'application/json','X-Requested-With':'XMLHttpRequest'}
      }).then(function (response) {
        if (!response.ok) throw new Error('Confirmation HTTP ' + response.status);
        return response.json();
      }).then(function (data) {
        if (!data || data.ok !== true) throw new Error('Note not confirmed');
        var card = form.closest('[data-pmd-hour-note-id]');
        if (card) {
          card.classList.remove('is-unread');
          card.classList.add('is-confirmed');
          append('span','pmd-staff-hour-notice__confirmed',card,'Confirmed');
          form.remove();
        }
        refresh();
      }).catch(function () {
        // Retain ordinary CSRF-protected form semantics as failover.
        form.submit();
      });
    });

    refresh();
    window.setInterval(refresh, 60000);
    document.addEventListener('visibilitychange', function () {
      if (document.visibilityState === 'visible') refresh();
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once:true});
  else init();
})();
