'use strict';

const form = document.getElementById('setup-form');
const input = document.getElementById('tenant');
const errorNode = document.getElementById('error');
const button = form.querySelector('button[type="submit"]');

function displayCode(tenant) {
  const value = String(tenant || '').trim().toLowerCase();
  return value.endsWith('.paymydine.com') ? value.slice(0, -'.paymydine.com'.length) : value;
}

(async () => {
  try {
    const cfg = await window.PayMyDineDesktop.getConfig();
    if (cfg && cfg.tenant) input.value = displayCode(cfg.tenant);
  } catch (_) {}
})();

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorNode.textContent = '';
  button.disabled = true;
  button.textContent = 'Opening Cashier…';
  try {
    await window.PayMyDineDesktop.saveTenant(input.value);
  } catch (error) {
    errorNode.textContent = error && error.message ? error.message : 'Could not save this restaurant.';
    button.disabled = false;
    button.textContent = 'Continue';
  }
});
