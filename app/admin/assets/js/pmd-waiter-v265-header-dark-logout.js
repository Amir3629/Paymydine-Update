(function () {
  'use strict';

  if (window.PMDWaiterV265) return;
  window.PMDWaiterV265 = true;

  function removeHeaderAndTransfer() {
    document.querySelectorAll('.pmd-v2-topbar').forEach(function (el) {
      el.remove();
    });

    document.querySelectorAll(
      '[data-v243-mode="transfer"],' +
      '.v257-operation[data-v257-operation="transfer"],' +
      '.v257-operation[data-operation="transfer"],' +
      '.v257-transfer,[data-v257-transfer]'
    ).forEach(function (el) {
      el.remove();
    });

    /* Text fallback for generated right-rail buttons. */
    document.querySelectorAll('.v257-operation').forEach(function (button) {
      if (button.textContent.trim().toUpperCase() === 'TRANSFER') {
        button.remove();
      }
    });
  }

  function findExistingLogoutControl() {
    return Array.prototype.find.call(
      document.querySelectorAll('a[href*="logout" i], form[action*="logout" i]'),
      function (node) {
        return !node.classList.contains('pmd-v265-logout');
      }
    ) || null;
  }

  function performLogout() {
    var existing = findExistingLogoutControl();

    if (existing) {
      if (existing.tagName === 'FORM') {
        existing.requestSubmit ? existing.requestSubmit() : existing.submit();
        return;
      }

      if (existing.tagName === 'A') {
        existing.click();
        return;
      }
    }

    var token =
      document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
      || document.querySelector('input[name="_token"]')?.value
      || '';

    var form = document.createElement('form');
    form.method = 'POST';
    form.action = '/admin/logout';
    form.style.display = 'none';

    if (token) {
      var input = document.createElement('input');
      input.type = 'hidden';
      input.name = '_token';
      input.value = token;
      form.appendChild(input);
    }

    document.body.appendChild(form);
    form.submit();
  }

  function ensureLogoutButton() {
    if (document.querySelector('.pmd-v265-logout')) return;

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'pmd-v265-logout';
    button.textContent = 'LOG OUT';
    button.setAttribute('aria-label', 'Log out');
    button.addEventListener('click', performLogout);
    document.body.appendChild(button);
  }

  function mount() {
    removeHeaderAndTransfer();
    ensureLogoutButton();
  }

  mount();

  /*
   * Older UI layers may recreate header controls during refresh.
   * This observer watches only direct body descendants and removes
   * those controls; it never touches or rebuilds the table grid.
   */
  if (typeof MutationObserver === 'function') {
    new MutationObserver(mount).observe(document.body, {
      childList: true
    });
  }

  setInterval(mount, 2000);

  console.info('[PMD] Waiter V2.6.5 header removal, dark rail and logout active');
})();
