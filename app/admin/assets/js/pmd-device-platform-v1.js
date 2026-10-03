/* PMD_DEVICE_PLATFORM_V1 */
(function () {
  'use strict';
  if (window.__PMD_DEVICE_PLATFORM_V1__) return;
  window.__PMD_DEVICE_PLATFORM_V1__ = true;

  document.addEventListener('click', function (event) {
    var button = event.target.closest('[data-pmd-device-confirm]');
    if (!button) return;

    var type = button.getAttribute('data-pmd-device-confirm');
    var message = type === 'reboot'
      ? 'Reboot this PayMyDine device now?'
      : 'Continue with this device command?';

    if (!window.confirm(message)) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);
})();
