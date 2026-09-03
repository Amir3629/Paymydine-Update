'use strict';

const retry = document.getElementById('retry');
const status = document.getElementById('status');

retry.addEventListener('click', async () => {
  retry.disabled = true;
  status.textContent = 'Reconnecting to PayMyDine…';
  try {
    const result = await window.PayMyDineDesktop.retryCashier();
    if (!result || result.ok === false) throw new Error('Restaurant is not configured.');
    status.textContent = 'Opening PayMyDine…';
  } catch (error) {
    status.textContent = error && error.message ? error.message : 'Could not reconnect.';
    retry.disabled = false;
  }
});
