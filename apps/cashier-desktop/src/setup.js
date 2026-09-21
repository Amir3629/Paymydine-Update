'use strict';

const form = document.getElementById('setup-form');
const input = document.getElementById('tenant');
const errorNode = document.getElementById('error');
const button = form.querySelector('button[type="submit"]');
const devicePanel = document.getElementById('device-mode-panel');
const deviceCheckbox = document.getElementById('device-mode');
const deviceStatus = document.getElementById('device-mode-status');
let deviceAlreadyEnabled = false;
let devicePreflight = null;

function displayCode(tenant) {
  const value = String(tenant || '').trim().toLowerCase();
  return value.endsWith('.paymydine.com') ? value.slice(0, -'.paymydine.com'.length) : value;
}

function cleanRemoteError(error) {
  let message = error && error.message ? String(error.message) : 'Could not complete PayMyDine setup.';
  message = message.replace(/^Error invoking remote method ['"][^'"]+['"]:\s*Error:\s*/i, '');
  message = message.replace(/^Error:\s*/i, '');
  return message.trim();
}

function renderDeviceCompatibility(preflight) {
  if (!deviceStatus || !deviceCheckbox) return;
  devicePreflight = preflight || null;

  if (!preflight) {
    deviceStatus.textContent = 'Could not detect this Windows edition. Strict Device Mode will stay disabled until compatibility can be verified.';
    deviceStatus.className = 'device-status unsupported';
    deviceCheckbox.checked = false;
    deviceCheckbox.disabled = true;
    return;
  }

  deviceStatus.textContent = preflight.message || '';
  deviceStatus.className = preflight.supported ? 'device-status supported' : 'device-status unsupported';

  if (!preflight.supported && !deviceAlreadyEnabled) {
    deviceCheckbox.checked = false;
    deviceCheckbox.disabled = true;
  }
}

(async () => {
  try {
    const cfg = await window.PayMyDineDesktop.getConfig();
    if (cfg && cfg.tenant) input.value = displayCode(cfg.tenant);

    if (cfg && cfg.platform === 'win32') {
      devicePanel.classList.add('visible');
      try {
        const [state, preflight] = await Promise.all([
          window.PayMyDineDesktop.deviceModeState(),
          window.PayMyDineDesktop.deviceModePreflight(),
        ]);
        deviceAlreadyEnabled = Boolean(state && state.enabled);
        renderDeviceCompatibility(preflight || (state && state.preflight) || null);

        if (deviceAlreadyEnabled) {
          deviceCheckbox.checked = true;
          deviceCheckbox.disabled = true;
          deviceStatus.textContent = `Device Mode is already enabled on this Windows account${state && state.windows ? ` · ${state.windows}` : ''}.`;
          deviceStatus.className = 'device-status supported';
        }
      } catch (error) {
        renderDeviceCompatibility(null);
      }
    }
  } catch (_) {}
})();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorNode.textContent = '';
  button.disabled = true;

  try {
    if (deviceCheckbox && deviceCheckbox.checked && !deviceAlreadyEnabled) {
      if (!devicePreflight || !devicePreflight.supported) {
        throw new Error(devicePreflight && devicePreflight.message
          ? devicePreflight.message
          : 'Strict Windows Device Mode compatibility could not be verified on this PC.');
      }

      button.textContent = 'Enabling Windows Device Mode…';
      const result = await window.PayMyDineDesktop.enableDeviceMode();
      if (!result || !result.ok) throw new Error('Windows Device Mode setup did not complete.');
      deviceAlreadyEnabled = true;
    }

    button.textContent = 'Opening PayMyDine…';
    await window.PayMyDineDesktop.saveTenant(input.value);
  } catch (error) {
    errorNode.textContent = cleanRemoteError(error);
    button.disabled = false;
    button.textContent = 'Open PayMyDine';
  }
});
