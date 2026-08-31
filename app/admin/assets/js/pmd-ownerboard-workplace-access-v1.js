/* PMD_OWNERBOARD_WORKPLACE_APPROVAL_V1
 * Reuse the existing Site Access hub authority from the clean Owner Dashboard.
 * This browser never becomes an approver just because it can see Ownerboard:
 * /siteaccess/hub/data and approve/decline still require the paired hub cookie.
 */
(function () {
  'use strict';

  var route = String(window.location.pathname || '').replace(/\/+$/, '');
  if (route !== '/admin/ownerboard') return;

  var dashboard = document.getElementById('pmd-ownerboard');
  if (!dashboard) return;

  var csrfMeta = document.querySelector('meta[name="csrf-token"]');
  var csrf = csrfMeta ? String(csrfMeta.getAttribute('content') || '') : '';
  var locale = String(dashboard.getAttribute('data-locale') || 'en').toLowerCase();
  var isDe = locale === 'de';
  var pollTimer = 0;
  var busy = false;

  var text = {
    title: isDe ? 'Neue Anmeldung' : 'New login request',
    titleMany: isDe ? 'Neue Anmeldungen' : 'New login requests',
    subtitle: isDe
      ? 'Dieses Restaurantgerät kann den neuen Browser bestätigen.'
      : 'This restaurant device can approve the new browser.',
    approve: isDe ? 'Bestätigen' : 'Approve',
    decline: isDe ? 'Ablehnen' : 'Decline',
    device: isDe ? 'Neues Gerät' : 'New device',
    open: isDe ? 'Workplace Access öffnen' : 'Open Workplace Access'
  };

  var panel = document.createElement('aside');
  panel.className = 'pmd-owner-workplace-requests';
  panel.setAttribute('data-pmd-owner-workplace-requests', '');
  panel.setAttribute('aria-live', 'polite');
  panel.hidden = true;
  document.body.appendChild(panel);

  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (character) {
      return {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#039;'
      }[character];
    });
  }

  function render(items) {
    items = Array.isArray(items) ? items : [];

    if (!items.length) {
      panel.hidden = true;
      panel.innerHTML = '';
      return;
    }

    var heading = items.length > 1 ? text.titleMany : text.title;
    var cards = items.map(function (item) {
      var id = Number(item.id || 0);
      if (!id) return '';

      var staff = escapeHtml(item.staff_name || 'Team member');
      var device = escapeHtml(item.device_name || text.device);
      var qr = escapeHtml(item.qr_image_url || '');

      return ''
        + '<article class="pmd-owner-workplace-request" data-challenge-id="' + id + '">'
        +   '<div class="pmd-owner-workplace-request__copy">'
        +     '<strong>' + staff + '</strong>'
        +     '<span>' + device + '</span>'
        +   '</div>'
        +   (qr
              ? '<img class="pmd-owner-workplace-request__qr" src="' + qr + '" alt="QR code" loading="eager">'
              : '')
        +   '<div class="pmd-owner-workplace-request__actions">'
        +     '<button type="button" class="is-approve" data-workplace-action="approve" data-challenge-id="' + id + '">' + text.approve + '</button>'
        +     '<button type="button" class="is-decline" data-workplace-action="decline" data-challenge-id="' + id + '">' + text.decline + '</button>'
        +   '</div>'
        + '</article>';
    }).join('');

    panel.innerHTML = ''
      + '<div class="pmd-owner-workplace-requests__head">'
      +   '<div><strong>' + escapeHtml(heading) + '</strong><span>' + escapeHtml(text.subtitle) + '</span></div>'
      +   '<span class="pmd-owner-workplace-requests__count">' + items.length + '</span>'
      + '</div>'
      + '<div class="pmd-owner-workplace-requests__list">' + cards + '</div>'
      + '<a class="pmd-owner-workplace-requests__open" href="/admin/siteaccess/hub">' + escapeHtml(text.open) + '</a>';

    panel.hidden = false;
  }

  function refresh() {
    if (busy || document.hidden) return;

    fetch('/admin/siteaccess/hub/data', {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Cache-Control': 'no-cache'
      }
    }).then(function (response) {
      if (response.status === 401 || response.status === 403 || response.status === 404) {
        return null;
      }
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    }).then(function (payload) {
      if (!payload || payload.ok !== true) {
        render([]);
        return;
      }
      render(payload.pending || []);
    }).catch(function () {
      /* Fail closed and quiet: an unpaired browser must not expose approval UI. */
      render([]);
    });
  }

  function act(action, challengeId, button) {
    if (busy || !csrf || !challengeId) return;
    if (action !== 'approve' && action !== 'decline') return;

    busy = true;
    panel.classList.add('is-busy');
    if (button) button.disabled = true;

    var body = new URLSearchParams();
    body.set('_token', csrf);
    body.set('challenge_id', String(challengeId));

    fetch('/admin/siteaccess/hub/' + action, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': csrf,
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: body.toString()
    }).then(function (response) {
      if (!response.ok) throw new Error('HTTP ' + response.status);
      return response.json();
    }).then(function (payload) {
      if (!payload || payload.ok !== true) throw new Error('Action rejected');
    }).catch(function () {
      /* Server remains the authority; refresh will show the true request state. */
    }).finally(function () {
      busy = false;
      panel.classList.remove('is-busy');
      refresh();
    });
  }

  panel.addEventListener('click', function (event) {
    var button = event.target.closest('[data-workplace-action]');
    if (!button) return;

    act(
      String(button.getAttribute('data-workplace-action') || ''),
      Number(button.getAttribute('data-challenge-id') || 0),
      button
    );
  });

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) refresh();
  });

  refresh();
  pollTimer = window.setInterval(refresh, 4000);

  window.addEventListener('pagehide', function () {
    if (pollTimer) window.clearInterval(pollTimer);
  }, { once: true });
})();
