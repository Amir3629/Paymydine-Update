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
