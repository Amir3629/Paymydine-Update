/* PMD_SHIFTS_PORTAL_MFA_RESET_V1 */
(function () {
  'use strict';

  var root = document.querySelector('[data-pmd-shifts-root]');
  if (!root) return;

  var modal = root.querySelector('[data-pmd-team-modal]');
  var form = modal && modal.querySelector('[data-pmd-team-form]');
  var footer = modal && modal.querySelector('.pmd-shifts__team-editor-footer');
  if (!modal || !form || !footer) return;

  var boot = {};
  try {
    var node = document.getElementById('pmd-shifts-bootstrap');
    boot = JSON.parse((node && node.textContent) || '{}') || {};
  } catch (error) {
    boot = {};
  }

  var selectedPersonId = 0;
  var selectedName = 'this member';
  var statusNonce = 0;

  var spacer = footer.querySelector('.pmd-shifts__modal-footer-spacer');
  if (!spacer) {
    spacer = document.createElement('span');
    spacer.className = 'pmd-shifts__modal-footer-spacer';
    spacer.setAttribute('aria-hidden', 'true');
    footer.insertBefore(spacer, footer.firstChild);
  }

  var resetButton = document.createElement('button');
  resetButton.type = 'button';
  resetButton.className = 'pmd-shifts__button is-danger';
  resetButton.hidden = true;
  resetButton.setAttribute('data-pmd-portal-mfa-reset', '1');
  resetButton.textContent = 'Reset Portal Authenticator';
  footer.insertBefore(resetButton, spacer);

  function shiftsBase() {
    var base = boot && boot.urls && boot.urls.shifts
      ? String(boot.urls.shifts)
      : String(window.location.pathname || '');
    return base.replace(/[?#].*$/, '').replace(/\/+$/, '');
  }

  function endpoint(action) {
    return shiftsBase() + '/' + action;
  }

  function hideReset() {
    selectedPersonId = 0;
    selectedName = 'this member';
    resetButton.hidden = true;
    resetButton.disabled = false;
    resetButton.removeAttribute('title');
  }

  function requestHeaders() {
    return {
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    };
  }

  function refreshStatus(personId) {
    personId = Number(personId || 0);
    hideReset();
    if (!personId) return;

    var nonce = ++statusNonce;
    fetch(endpoint('portalmfastatus') + '?person_id=' + encodeURIComponent(personId), {
      credentials: 'same-origin',
      cache: 'no-store',
      headers: requestHeaders()
    })
      .then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (data) {
          return {response: response, data: data || {}};
        });
      })
      .then(function (result) {
        if (nonce !== statusNonce) return;
        var data = result.data || {};
        if (!result.response.ok || !data.ok) {
          hideReset();
          return;
        }

        selectedPersonId = personId;
        selectedName = String(data.target_name || 'this member');
        resetButton.title = String(data.message || '');
        resetButton.hidden = !(data.can_reset && data.has_portal_mfa);
      })
      .catch(function () {
        if (nonce === statusNonce) hideReset();
      });
  }

  function postReset() {
    if (!selectedPersonId || resetButton.hidden || resetButton.disabled) return;

    var confirmation = 'Reset ' + selectedName + "'s Portal Authenticator?\n\n"
      + 'Their old phone and all Portal recovery codes will stop working immediately. '
      + 'They must sign in with usernameportal + password and scan a NEW QR.';
    if (!window.confirm(confirmation)) return;

    resetButton.disabled = true;
    resetButton.textContent = 'Resetting...';

    var body = new URLSearchParams();
    body.set('_token', String(boot.csrf || ''));
    body.set('person_id', String(selectedPersonId));

    fetch(endpoint('resetportalmfa'), {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8'
      },
      body: body.toString()
    })
      .then(function (response) {
        return response.json().catch(function () { return {}; }).then(function (data) {
          return {response: response, data: data || {}};
        });
      })
      .then(function (result) {
        var data = result.data || {};
        if (!result.response.ok || !data.ok) {
          throw new Error(String(data.message || 'Portal Authenticator reset was refused.'));
        }
        resetButton.hidden = true;
        window.alert(String(data.message || 'Portal Authenticator reset.'));
      })
      .catch(function (error) {
        window.alert(error && error.message ? error.message : 'Portal Authenticator reset failed.');
      })
      .finally(function () {
        resetButton.disabled = false;
        resetButton.textContent = 'Reset Portal Authenticator';
      });
  }

  document.addEventListener('click', function (event) {
    var edit = event.target.closest('[data-pmd-team-edit]');
    if (edit && root.contains(edit)) {
      var personId = Number(edit.getAttribute('data-person-id') || 0);
      window.setTimeout(function () { refreshStatus(personId); }, 0);
      return;
    }

    if (event.target.closest('[data-pmd-team-open], [data-pmd-team-new], [data-pmd-team-close]')) {
      statusNonce += 1;
      hideReset();
      return;
    }

    if (event.target.closest('[data-pmd-portal-mfa-reset]')) {
      event.preventDefault();
      postReset();
    }
  });
})();
