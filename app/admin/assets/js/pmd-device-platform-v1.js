/* PMD_DEVICE_PLATFORM_V1 */
/* PMD_DEVICE_COMMAND_AJAX_SUBMITTER_V144
 * request.js uses jQuery serialize() and discards clicked submit buttons.
 * Mirror the specific operator-selected command to a real hidden form field.
 * Do not auto-retry or bypass session/auth/CSRF on failure.
 */
(function () {
  'use strict';
  if (window.__PMD_DEVICE_PLATFORM_V1__) return;
  window.__PMD_DEVICE_PLATFORM_V1__ = true;

  var COMMANDS = [
    'WAKE', 'SLEEP', 'SET_BRIGHTNESS', 'RELOAD_APP', 'REBOOT',
    'IDENTIFY', 'OPEN_RESTAURANT', 'CLOSE_RESTAURANT', 'USE_SCHEDULE'
  ];
  var SELECTOR = 'form[data-pmd-device-command-form-v144]';

  function deviceForm(element) {
    return element && typeof element.closest === 'function'
      ? element.closest(SELECTOR) : null;
  }

  function validCommand(value) {
    return COMMANDS.indexOf(String(value || '').trim().toUpperCase()) !== -1;
  }

  function setCommand(form, button) {
    if (!form || !button || button.name !== 'action') return false;
    var command = String(button.value || '').toUpperCase();
    var field = form.querySelector('input[name="pmd_device_command"]');
    if (!field || !validCommand(command)) return false;
    field.value = command;
    return true;
  }

  // Native capture precedes jQuery's delegated submit handler. It also handles
  // touch, mouse, keyboard-triggered buttons and the reboot confirmation.
  document.addEventListener('click', function (event) {
    var target = event.target;
    var button = target && typeof target.closest === 'function'
      ? target.closest('button[name="action"]') : null;
    if (!button) return;
    var form = deviceForm(button);
    if (!form) return;
    if (button.getAttribute('data-pmd-device-confirm')) {
      var type = button.getAttribute('data-pmd-device-confirm');
      var message = type === 'reboot'
        ? 'Reboot this PayMyDine device now?'
        : 'Continue with this device command?';
      if (!window.confirm(message)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
    }
    if (!setCommand(form, button)) {
      event.preventDefault();
      event.stopImmediatePropagation();
    }
  }, true);

  // A keyboard Enter on Brightness must never silently trigger the form's
  // FIRST button (OPEN/WAKE), which HTML implicit-submit would choose.
  document.addEventListener('keydown', function (event) {
    var input = event.target;
    if (event.key !== 'Enter' || !input ||
        input.name !== 'brightness') return;
    var form = deviceForm(input);
    if (!form) return;
    event.preventDefault();
    var setButton = form.querySelector(
      'button[name="action"][value="SET_BRIGHTNESS"]'
    );
    if (setButton && !setButton.disabled) setButton.click();
  }, true);

  document.addEventListener('submit', function (event) {
    var form = event.target;
    if (!form || typeof form.matches !== 'function' ||
        !form.matches(SELECTOR)) return;
    var selected = event.submitter;
    if (selected && selected.name === 'action') {
      if (!setCommand(form, selected)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        return;
      }
    }
    var field = form.querySelector('input[name="pmd_device_command"]');
    if (!field || !validCommand(field.value)) {
      event.preventDefault();
      event.stopImmediatePropagation();
      // No guessing and no implicit power/network actions.
      console.warn('[PayMyDine Devices] Choose a command before submitting.');
    }
  }, true);
})();
