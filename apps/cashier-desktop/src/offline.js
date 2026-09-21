'use strict';

const retry = document.getElementById('retry');
const status = document.getElementById('status');

retry.addEventListener('click', async () => {
  retry.disabled = true;
  status.textContent = 'Connecting…';
  try {
    await window.PayMyDineDesktop.retryCashier();
  } catch (error) {
    status.textContent = error.message || 'Still offline.';
    retry.disabled = false;
  }
});
