'use strict';

const form = document.getElementById('setup-form');
const input = document.getElementById('tenant');
const errorNode = document.getElementById('error');

(async () => {
  try {
    const cfg = await window.PayMyDineDesktop.getConfig();
    if (cfg && cfg.tenant) input.value = cfg.tenant;
  } catch (_) {}
})();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorNode.textContent = '';
  try {
    await window.PayMyDineDesktop.saveTenant(input.value);
  } catch (error) {
    errorNode.textContent = error && error.message ? error.message : 'Could not save restaurant address.';
  }
});
