(function () {
  'use strict';

  if (window.PMDWaiterV275) return;

  window.PMDWaiterV275 = {
    version: '2.7.5',
    logoutBound: true
  };

  var allowConfirmedLogout = false;

  function clean(value) {
    return String(value == null ? '' : value)
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isLogoutControl(element) {
    if (!element) return false;

    if (
      element.matches(
        '[data-v265-logout],' +
        '[data-pmd-waiter-logout],' +
        '.pmd-v265-logout,' +
        '.pmd-waiter-logout,' +
        'a[href*="logout"],' +
        'button[name="logout"]'
      )
    ) {
      return true;
    }

    return /^log\s*out$/i.test(
      clean(element.textContent).replace(/[↪→⟶⇥]+/g, '')
    );
  }

  function findLogoutControl(target) {
    var control = target.closest(
      'button, a, [role="button"], input[type="submit"]'
    );

    return isLogoutControl(control) ? control : null;
  }

  /*
   * Capture phase ensures the original logout handler cannot run
   * before confirmation is accepted.
   */
  document.addEventListener('click', function (event) {
    var logout = findLogoutControl(event.target);

    if (!logout) return;

    if (allowConfirmedLogout) {
      allowConfirmedLogout = false;
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    var accepted = window.confirm(
      'Are you sure you want to log out of Waiter POS?'
    );

    if (!accepted) return;

    allowConfirmedLogout = true;

    /*
     * Preserve the existing real logout workflow.
     * We do not invent or replace the server logout URL.
     */
    setTimeout(function () {
      logout.click();
    }, 0);
  }, true);

  /*
   * Also protect submit-based logout forms.
   */
  document.addEventListener('submit', function (event) {
    var form = event.target;

    if (!(form instanceof HTMLFormElement)) return;

    var action = clean(form.getAttribute('action')).toLowerCase();
    var looksLikeLogout =
      action.indexOf('logout') !== -1 ||
      Boolean(form.querySelector(
        '[data-v265-logout],' +
        '[data-pmd-waiter-logout],' +
        'button[name="logout"]'
      ));

    if (!looksLikeLogout || allowConfirmedLogout) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    if (!window.confirm(
      'Are you sure you want to log out of Waiter POS?'
    )) {
      return;
    }

    allowConfirmedLogout = true;

    if (typeof form.requestSubmit === 'function') {
      form.requestSubmit();
    } else {
      form.submit();
    }
  }, true);

  console.info(
    '[PMD] Waiter V2.7.5 logout confirmation active'
  );
})();
