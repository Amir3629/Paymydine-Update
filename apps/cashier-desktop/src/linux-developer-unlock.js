'use strict';

const form = document.getElementById('unlock-form');
const password = document.getElementById('password');
const errorNode = document.getElementById('error');
const openButton = document.getElementById('open');
const cancelButton = document.getElementById('cancel');

cancelButton.addEventListener('click', () => window.PayMyDineLinuxDeveloper.cancel());

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  errorNode.textContent = '';
  openButton.disabled = true;
  try {
    const result = await window.PayMyDineLinuxDeveloper.submit(password.value);
    if (!result || !result.ok) {
      errorNode.textContent = result && result.message ? result.message : 'Wrong password.';
      password.value = '';
      password.focus();
      openButton.disabled = false;
    }
  } catch (error) {
    errorNode.textContent = error && error.message ? error.message : 'Could not open the developer desktop.';
    openButton.disabled = false;
  }
});
