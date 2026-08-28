/*
 * PMD_NEW_TENANT_ONBOARDING_R7
 *
 * 1) Converts known missing-prerequisite states into compact, actionable setup
 *    cards instead of presenting them as generic runtime failures.
 * 2) Claims the legacy provider-catalogue global before its script executes on
 *    Oman Finance, so the market-aware server render cannot be overwritten by
 *    the old global catalogue and visibly blink.
 *
 * This file does not invent readiness. It only recognizes explicit states that
 * already mean a prerequisite is missing.
 */
(function () {
  'use strict';

  if (window.PMDNewTenantOnboardingR7) return;

  var VERSION = '7.0.0';
  var observer = null;
  var scheduled = false;

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function isOmanFinance() {
    if (!/^\/admin\/pmdfinance\/?$/.test((window.PMDAdminCanonicalURLR81E ? window.PMDAdminCanonicalURLR81E.logicalPath() : window.location.pathname))) return false;

    if (document.body && document.body.classList.contains('pmd-finance-market-om')) {
      return true;
    }

    var finance = document.getElementById('pmd-finance-page');
    return !!(finance && /Paymob\s*\(Oman\)/i.test(clean(finance.textContent)));
  }

  /*
   * PMD_FINANCE_OMAN_LEGACY_CATALOGUE_BYPASS_R7
   * assets.json intentionally loads this file immediately BEFORE
   * pmd-payment-provider-catalogue-v1.js. That legacy file starts with:
   *   if (window.PMDPaymentProviderCatalogueV3) return;
   * so the old global catalogue never gets a chance to replace the correct
   * Oman first-paint row with "Provider adapter is not enabled yet".
   */
  if (isOmanFinance() && !window.PMDPaymentProviderCatalogueV3) {
    window.PMDPaymentProviderCatalogueV3 = {
      version: 'oman-market-owned-r7',
      marketOwned: true,
      bypassLegacyCatalogue: true
    };
  }

  function iconMarkup(type) {
    if (type === 'tables') {
      return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="5" width="16" height="10" rx="3"></rect><path d="M7 15v4M17 15v4M8 9h8"></path></svg>';
    }

    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5z"></path><path d="M8 8h8M8 12h8M8 16h5"></path></svg>';
  }

  function enhanceOrderComposer() {
    var errors = Array.prototype.slice.call(document.querySelectorAll('.pmd-coc-error'));
    var foundSetupState = false;

    errors.forEach(function (error) {
      var message = clean(error.querySelector('p') && error.querySelector('p').textContent);
      if (!/No active location menu source is available/i.test(message)) return;

      foundSetupState = true;
      if (error.getAttribute('data-pmd-onboarding-r7') === 'menu') return;

      error.setAttribute('data-pmd-onboarding-r7', 'menu');
      error.classList.add('pmd-setup-empty-state', 'pmd-setup-empty-state--menu');

      var shell = error.closest('.pmd-coc');
      if (shell) shell.classList.add('pmd-coc--setup-empty');

      var title = error.querySelector('strong');
      var copy = error.querySelector('p');
      var retry = error.querySelector('[data-coc-retry]');

      if (title) title.textContent = 'Set up your menu first';
      if (copy) {
        copy.textContent = 'This restaurant does not have an active menu yet. Add the menu and food items, then come back here to create the first order.';
      }

      if (!error.querySelector('.pmd-setup-empty-state__icon')) {
        var icon = document.createElement('span');
        icon.className = 'pmd-setup-empty-state__icon';
        icon.innerHTML = iconMarkup('menu');
        error.insertBefore(icon, error.firstChild);
      }

      if (!error.querySelector('.pmd-setup-empty-state__eyebrow')) {
        var eyebrow = document.createElement('span');
        eyebrow.className = 'pmd-setup-empty-state__eyebrow';
        eyebrow.textContent = 'RESTAURANT SETUP';
        if (title) error.insertBefore(eyebrow, title);
      }

      var actions = error.querySelector('.pmd-setup-empty-state__actions');
      if (!actions) {
        actions = document.createElement('div');
        actions.className = 'pmd-setup-empty-state__actions';

        var menuLink = document.createElement('a');
        menuLink.className = 'pmd-setup-empty-state__primary';
        menuLink.href = '/admin/pmdmenu';
        menuLink.textContent = 'Set up menu';
        actions.appendChild(menuLink);

        if (retry) {
          retry.textContent = 'Check again';
          retry.classList.add('pmd-setup-empty-state__secondary');
          actions.appendChild(retry);
        }

        error.appendChild(actions);
      }
    });

    if (!foundSetupState) {
      document.querySelectorAll('.pmd-coc.pmd-coc--setup-empty').forEach(function (shell) {
        shell.classList.remove('pmd-coc--setup-empty');
      });
    }
  }

  function positiveTableOptions(select) {
    if (!select) return [];
    return Array.prototype.slice.call(select.options || []).filter(function (option) {
      return Number(option.value || 0) > 0;
    });
  }

  function enhanceReservationComposer() {
    var root = document.getElementById('pmd-reservation-composer-v1');
    if (!root) return;

    var wrapper = root.querySelector('.pmd-reservation-composer-v1__tables');
    var select = wrapper && wrapper.querySelector('[name="tables[]"]');
    if (!wrapper || !select) return;

    var noTables = positiveTableOptions(select).length === 0;
    var existing = root.querySelector('[data-pmd-table-setup-r7]');

    if (!noTables) {
      if (existing) existing.remove();
      root.classList.remove('pmd-reservation-composer--needs-tables-r7');
      return;
    }

    root.classList.add('pmd-reservation-composer--needs-tables-r7');

    var recommendationVisuals = root.querySelectorAll(
      '[data-pmd-composer-auto-visual], [data-pmd-recommendation], .pmd-reservation-composer-v1__auto'
    );
    recommendationVisuals.forEach(function (node) {
      if (/^No table found$/i.test(clean(node.textContent))) {
        node.textContent = 'Set up tables first';
      }
    });

    Array.prototype.slice.call(root.querySelectorAll('*')).forEach(function (node) {
      if (node.children.length) return;
      var text = clean(node.textContent);
      if (/^No same-Floor table or merge matches\b/i.test(text)) {
        node.textContent = 'Add your first tables to enable automatic reservation assignment.';
        node.classList.add('pmd-table-setup-message-r7');
      }
    });

    if (existing) return;

    var card = document.createElement('div');
    card.className = 'pmd-table-setup-card-r7';
    card.setAttribute('data-pmd-table-setup-r7', '');
    card.innerHTML = [
      '<span class="pmd-table-setup-card-r7__icon">', iconMarkup('tables'), '</span>',
      '<div class="pmd-table-setup-card-r7__copy">',
        '<span>RESTAURANT SETUP</span>',
        '<strong>No tables are configured yet</strong>',
        '<p>Create the restaurant tables first. Reservations can then recommend and assign the right table automatically.</p>',
      '</div>',
      '<a class="pmd-table-setup-card-r7__action" href="/admin/tables">Set up tables</a>'
    ].join('');

    wrapper.insertAdjacentElement('afterend', card);
  }

  function enhance() {
    scheduled = false;
    enhanceOrderComposer();
    enhanceReservationComposer();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    window.requestAnimationFrame(enhance);
  }

  function mount() {
    enhance();

    if (!document.body || observer) return;
    observer = new MutationObserver(schedule);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  window.PMDNewTenantOnboardingR7 = {
    version: VERSION,
    refresh: enhance,
    isOmanFinance: isOmanFinance
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, {once: true});
  } else {
    mount();
  }
}());
