'use strict';

const form = document.getElementById('setup-form');
const input = document.getElementById('tenant');
const errorNode = document.getElementById('error');
const button = form.querySelector('button[type="submit"]');
const devicePanel = document.getElementById('device-mode-panel');
const deviceCheckbox = document.getElementById('device-mode');
let deviceAlreadyEnabled = false;

function displayCode(tenant) {
  const value = String(tenant || '').trim().toLowerCase();
  return value.endsWith('.paymydine.com') ? value.slice(0, -'.paymydine.com'.length) : value;
}

(async () => {
  try {
    const cfg = await window.PayMyDineDesktop.getConfig();
    if (cfg && cfg.tenant) input.value = displayCode(cfg.tenant);

    if (cfg && cfg.platform === 'win32') {
      devicePanel.classList.add('visible');
      try {
        const state = await window.PayMyDineDesktop.deviceModeState();
        deviceAlreadyEnabled = Boolean(state && state.enabled);
        if (deviceAlreadyEnabled) {
          deviceCheckbox.checked = true;
          deviceCheckbox.disabled = true;
        }
      } catch (_) {}
    }
  } catch (_) {}
})();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorNode.textContent = '';
  button.disabled = true;

  try {
    if (deviceCheckbox && deviceCheckbox.checked && !deviceAlreadyEnabled) {
      button.textContent = 'Enabling Windows Device Mode…';
      const result = await window.PayMyDineDesktop.enableDeviceMode();
      if (!result || !result.ok) throw new Error('Windows Device Mode setup did not complete.');
      deviceAlreadyEnabled = true;
    }

    button.textContent = 'Opening PayMyDine…';
    await window.PayMyDineDesktop.saveTenant(input.value);
  } catch (error) {
    errorNode.textContent = error && error.message ? error.message : 'Could not complete PayMyDine setup.';
    button.disabled = false;
    button.textContent = 'Open PayMyDine';
  }
});
