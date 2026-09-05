/*
 * PMD_NEW_TENANT_ONBOARDING_R8
 *
 * 1) Converts known missing-prerequisite states into compact, actionable setup
 *    cards instead of presenting them as generic runtime failures.
 * 2) Claims the legacy provider-catalogue global before its script executes on
 *    Oman Finance, so the market-aware server render cannot be overwritten by
 *    the old global catalogue and visibly blink.
 * 3) Restores the proven Getting started / Quick setup card on the CURRENT
 *    Owner Dashboard for pre-launch restaurants. The retired native Dashboard
 *    stays retired; only its onboarding concept is restored.
 *
 * This file does not invent readiness. It only recognizes explicit states that
 * already mean a prerequisite is missing.
 */
(function () {
  'use strict';

  if (window.PMDNewTenantOnboardingR7) return;

  var VERSION = '8.0.0';
  var observer = null;
  var scheduled = false;
  var quickSetupRequested = false;
  var quickSetupPayload = null;

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function logicalPath() {
    return String(
      (window.PMDAdminCanonicalURLR81E
        ? window.PMDAdminCanonicalURLR81E.logicalPath()
        : window.location.pathname) || ''
    ).replace(/\/+$/, '') || '/';
  }

  function isOmanFinance() {
    if (!/^\/admin\/pmdfinance\/?$/.test(logicalPath())) return false;

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

  /*
   * PMD_NEW_TENANT_OWNER_QUICK_SETUP_R8
   * The legacy native Dashboard is redirect-only now, which is why its
   * onboarding widget disappeared. Restore ONLY that card on the current
   * Owner Dashboard. The server decides pre-launch state from first-order
   * existence and returns the already-registered onboarding steps.
   */
  function isOwnerDashboard() {
    var path = logicalPath();
    return path === '/admin/ownerdashboard' || path === '/admin/dashboardlab';
  }

  function activeLocale() {
    return clean(
      window.PMD_PLATFORM_MESSAGES_LOCALE ||
      window.PMD_ADMIN_LOCALE ||
      (document.documentElement && document.documentElement.lang) ||
      'en'
    ).toLowerCase().replace(/_/g, '-').split('-')[0] || 'en';
  }

  function ensureQuickSetupStyles() {
    if (document.getElementById('pmd-owner-quick-setup-r8-style')) return;

    var style = document.createElement('style');
    style.id = 'pmd-owner-quick-setup-r8-style';
    style.textContent = [
      '#pmd-owner-quick-setup-r8{box-sizing:border-box;width:min(1480px,100%);margin:14px auto 22px;padding:20px 22px;border:1px solid #d5e3ec;border-radius:18px;background:#fff;box-shadow:0 8px 28px rgba(23,55,82,.06);color:#173752}',
      '#pmd-owner-quick-setup-r8 *{box-sizing:border-box}',
      '#pmd-owner-quick-setup-r8 .pmd-oqs8-head{display:flex;align-items:flex-start;justify-content:space-between;gap:18px;margin-bottom:15px}',
      '#pmd-owner-quick-setup-r8 .pmd-oqs8-kicker{display:block;margin:0 0 4px;color:#0a6c5c;font-size:11px;font-weight:800;letter-spacing:.09em;text-transform:uppercase}',
      '#pmd-owner-quick-setup-r8 h2{margin:0;color:#102f42;font-size:20px;font-weight:800;line-height:1.2}',
      '#pmd-owner-quick-setup-r8 .pmd-oqs8-progress{flex:0 0 auto;padding:7px 11px;border-radius:999px;background:#eef7f4;color:#075f50;font-size:12px;font-weight:800;white-space:nowrap}',
      '#pmd-owner-quick-setup-r8 .pmd-oqs8-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}',
      '#pmd-owner-quick-setup-r8 .pmd-oqs8-step{display:flex;align-items:center;gap:12px;min-height:66px;padding:11px 13px;border:1px solid #dbe7ee;border-radius:14px;background:#fbfdfe;color:#173752;text-decoration:none!important;transition:border-color .16s ease,background .16s ease,transform .16s ease}',
      '#pmd-owner-quick-setup-r8 .pmd-oqs8-step:hover{border-color:#7fbcae;background:#f6fbf9;transform:translateY(-1px)}',
      '#pmd-owner-quick-setup-r8 .pmd-oqs8-step.is-done{background:#f6fbf9;border-color:#c9e4dc}',
      '#pmd-owner-quick-setup-r8 .pmd-oqs8-icon{display:grid;place-items:center;flex:0 0 36px;width:36px;height:36px;border-radius:11px;background:#eef4f7;color:#31586f;font-size:14px}',
      '#pmd-owner-quick-setup-r8 .is-done .pmd-oqs8-icon{background:#dff3ec;color:#08705d}',
      '#pmd-owner-quick-setup-r8 .pmd-oqs8-copy{min-width:0;flex:1}',
      '#pmd-owner-quick-setup-r8 .pmd-oqs8-copy strong{display:block;margin:0 0 2px;color:#102f42;font-size:13px;font-weight:800;line-height:1.25}',
      '#pmd-owner-quick-setup-r8 .pmd-oqs8-copy span{display:block;overflow:hidden;color:#6c808b;font-size:11px;line-height:1.35;text-overflow:ellipsis;white-space:nowrap}',
      '#pmd-owner-quick-setup-r8 .pmd-oqs8-arrow{flex:0 0 auto;color:#8095a1;font-size:18px;line-height:1}',
      '#pmd-owner-quick-setup-r8 .is-done .pmd-oqs8-arrow{color:#16806d}',
      '@media(max-width:760px){#pmd-owner-quick-setup-r8{margin:10px 0 18px;padding:16px;border-radius:16px}#pmd-owner-quick-setup-r8 .pmd-oqs8-grid{grid-template-columns:1fr}#pmd-owner-quick-setup-r8 .pmd-oqs8-head{align-items:center}#pmd-owner-quick-setup-r8 .pmd-oqs8-copy span{white-space:normal}}'
    ].join('');
    document.head.appendChild(style);
  }

  function renderOwnerQuickSetup(payload) {
    var root = document.getElementById('pmd-dashboard-lab');
    if (!root) return;

    var existing = document.getElementById('pmd-owner-quick-setup-r8');
    if (!payload || payload.success !== true || payload.show !== true) {
      if (existing) existing.remove();
      return;
    }

    if (existing) return;

    var steps = Array.isArray(payload.steps) ? payload.steps : [];
    if (!steps.length) return;

    ensureQuickSetupStyles();

    var completed = steps.filter(function (step) { return step && step.completed === true; }).length;
    var card = document.createElement('section');
    card.id = 'pmd-owner-quick-setup-r8';
    card.setAttribute('data-pmd-new-tenant-quick-setup', 'v1');

    var head = document.createElement('div');
    head.className = 'pmd-oqs8-head';

    var titleWrap = document.createElement('div');
    var kicker = document.createElement('span');
    kicker.className = 'pmd-oqs8-kicker';
    kicker.textContent = 'Quick setup';
    var title = document.createElement('h2');
    title.textContent = clean(payload.title) || 'Getting started';
    titleWrap.appendChild(kicker);
    titleWrap.appendChild(title);

    var progress = document.createElement('span');
    progress.className = 'pmd-oqs8-progress';
    progress.textContent = completed + ' / ' + steps.length;

    head.appendChild(titleWrap);
    head.appendChild(progress);
    card.appendChild(head);

    var grid = document.createElement('div');
    grid.className = 'pmd-oqs8-grid';

    steps.forEach(function (step) {
      if (!step) return;
      var link = document.createElement('a');
      link.className = 'pmd-oqs8-step' + (step.completed === true ? ' is-done' : '');
      link.href = clean(step.url) || '#';

      var icon = document.createElement('span');
      icon.className = 'pmd-oqs8-icon';
      if (step.completed === true) {
        icon.innerHTML = '<i class="fa fa-check" aria-hidden="true"></i>';
      } else {
        var iconClass = clean(step.icon).replace(/[^a-zA-Z0-9 _-]/g, '');
        icon.innerHTML = '<i class="fa ' + iconClass + '" aria-hidden="true"></i>';
      }

      var copy = document.createElement('span');
      copy.className = 'pmd-oqs8-copy';
      var label = document.createElement('strong');
      label.textContent = clean(step.label);
      var description = document.createElement('span');
      description.textContent = clean(step.description);
      copy.appendChild(label);
      copy.appendChild(description);

      var arrow = document.createElement('span');
      arrow.className = 'pmd-oqs8-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = step.completed === true ? '✓' : '›';

      link.appendChild(icon);
      link.appendChild(copy);
      link.appendChild(arrow);
      grid.appendChild(link);
    });

    card.appendChild(grid);

    var header = root.querySelector('#pmd-r2-clean-header');
    if (header && header.parentNode === root) {
      header.insertAdjacentElement('afterend', card);
    } else if (root.firstChild) {
      root.insertBefore(card, root.firstChild);
    } else {
      root.appendChild(card);
    }
  }

  function requestOwnerQuickSetup() {
    if (!isOwnerDashboard()) return;

    if (quickSetupPayload) {
      renderOwnerQuickSetup(quickSetupPayload);
      return;
    }

    if (quickSetupRequested) return;
    quickSetupRequested = true;

    fetch('/api/v1/pmd-new-tenant-quick-setup?locale=' + encodeURIComponent(activeLocale()), {
      method: 'GET',
      credentials: 'same-origin',
      headers: {'Accept': 'application/json'},
      cache: 'no-store'
    }).then(function (response) {
      if (!response.ok) throw new Error('quick-setup');
      return response.json();
    }).then(function (payload) {
      quickSetupPayload = payload || {success:false, show:false};
      renderOwnerQuickSetup(quickSetupPayload);
    }).catch(function () {
      quickSetupPayload = {success:false, show:false};
    });
  }

  function enhance() {
    scheduled = false;
    enhanceOrderComposer();
    enhanceReservationComposer();
    requestOwnerQuickSetup();
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
    isOmanFinance: isOmanFinance,
    quickSetup: function () { return quickSetupPayload; }
  };
  window.PMDNewTenantOnboardingR8 = window.PMDNewTenantOnboardingR7;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, {once: true});
  } else {
    mount();
  }
}());