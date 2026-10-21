/* PMD_SHIFTS_NEW_PASSWORD_VISIBILITY_V1
 * Only a newly typed/generated web password can be shown temporarily.
 * The current saved password is never requested, populated, or displayed.
 */
(function () {
  'use strict';

  var root = document.querySelector('[data-pmd-shifts-root]');
  var modal = root && root.querySelector('[data-pmd-team-modal]');
  var form = modal && modal.querySelector('[data-pmd-team-form]');
  var input = modal && modal.querySelector('[data-pmd-team-password]');
  var toggle = modal && modal.querySelector('[data-pmd-team-password-visibility]');

  // Enhance the current Shifts field without overwriting its Blade template.
  // This avoids conflicts with existing Floor, Staff, and UI improvements.
  if (form && input && !toggle) {
    var wrapper = document.createElement('span');
    wrapper.className = 'pmd-shifts__password-input-wrap';
    input.parentNode.insertBefore(wrapper, input);
    wrapper.appendChild(input);

    toggle = document.createElement('button');
    toggle.type = 'button';
    toggle.hidden = true;
    toggle.disabled = true;
    toggle.setAttribute('data-pmd-team-password-visibility', '');
    toggle.setAttribute('aria-pressed', 'false');
    toggle.setAttribute('aria-label', 'Show new password');
    toggle.title = 'Show new password';
    toggle.innerHTML = '<svg data-pmd-password-icon-show viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M2 12s3.8-7 10-7 10 7 10 7-3.8 7-10 7S2 12 2 12Z"></path>' +
      '<circle cx="12" cy="12" r="3"></circle></svg>' +
      '<svg data-pmd-password-icon-hide viewBox="0 0 24 24" aria-hidden="true">' +
      '<path d="M3 3 21 21M10.6 5.1A11 11 0 0 1 12 5c6.2 0 10 7 10 7a15 15 0 0 1-3.1 3.9M6.3 6.3C3.6 8.3 2 12 2 12s3.8 7 10 7c1.8 0 3.4-.6 4.8-1.5M10 10a3 3 0 0 0 4 4"></path></svg>';
    wrapper.appendChild(toggle);
  }
  if (!form || !input || !toggle) return;

  // Do not enable the eye for prefilled/autofilled values on first paint.
  var newlyEntered = false;

  function syncVisibility() {
    var canReveal = newlyEntered && input.value.length > 0 && !input.disabled;
    if (!canReveal) input.type = 'password';
    toggle.hidden = !canReveal;
    toggle.disabled = !canReveal;
    var revealed = canReveal && input.type === 'text';
    toggle.setAttribute('aria-pressed', revealed ? 'true' : 'false');
    toggle.setAttribute('aria-label', revealed ? 'Hide new password' : 'Show new password');
    toggle.title = revealed ? 'Hide new password' : 'Show new password';
  }

  function resetVisibility() {
    newlyEntered = false;
    input.type = 'password';
    syncVisibility();
  }

  input.addEventListener('input', function () {
    newlyEntered = input.value.length > 0;
    syncVisibility();
  });

  toggle.addEventListener('click', function (event) {
    event.preventDefault();
    if (!newlyEntered || !input.value || input.disabled) {
      resetVisibility();
      return;
    }
    input.type = input.type === 'password' ? 'text' : 'password';
    syncVisibility();
    input.focus({preventScroll: true});
  });

  // The existing Shifts controller resets member forms between edits.
  form.addEventListener('reset', resetVisibility);
  document.addEventListener('click', function (event) {
    if (!event.target || typeof event.target.closest !== 'function') return;
    var action = event.target.closest(
      '[data-pmd-team-open], [data-pmd-team-edit], [data-pmd-team-new], [data-pmd-team-close]'
    );
    if (action && root.contains(action)) resetVisibility();
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !modal.hidden) resetVisibility();
  });

  syncVisibility();
}());
