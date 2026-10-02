'use strict';

const form = document.getElementById('unlock-form');
const input = document.getElementById('password');
const errorNode = document.getElementById('error');
const openButton = document.getElementById('open');
const cancelButton = document.getElementById('cancel');

cancelButton.addEventListener('click', () => window.PMDDeveloperExit.cancel());

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorNode.textContent = '';
  openButton.disabled = true;
  openButton.textContent = 'Opening…';
  try {
    const result = await window.PMDDeveloperExit.submit(input.value);
    if (!result || !result.ok) {
      errorNode.textContent = result && result.message ? result.message : 'Wrong password.';
      input.value = '';
      input.focus();
      openButton.disabled = false;
      openButton.textContent = 'Open Windows';
    }
  } catch (error) {
    errorNode.textContent = error && error.message ? error.message : 'Could not open Windows Desktop.';
    openButton.disabled = false;
    openButton.textContent = 'Open Windows';
  }
});
