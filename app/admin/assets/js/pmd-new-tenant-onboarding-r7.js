/*
 * PMD_NEW_TENANT_ONBOARDING_R9
 *
 * 1) Converts known missing-prerequisite states into compact, actionable setup
 *    cards instead of presenting them as generic runtime failures.
 * 2) Claims the legacy provider-catalogue global before its script executes on
 *    Oman Finance, so the market-aware server render cannot be overwritten by
 *    the old global catalogue and visibly blink.
 * 3) Shows a simple first-time Owner Dashboard welcome card when the canonical
 *    public menu contract explicitly reports zero categories and zero menu items.
 *
 * No setup state is persisted here. Existing tenant/menu data remains authority.
 */
(function () {
  'use strict';

  if (window.PMDNewTenantOnboardingR7) return;

  var VERSION = '9.0.0';
  var observer = null;
  var scheduled = false;
  var ownerWelcomeRequested = false;
  var ownerWelcomeState = null;

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function logicalPath() {
    var value = window.PMDAdminCanonicalURLR81E
      ? window.PMDAdminCanonicalURLR81E.logicalPath()
      : window.location.pathname;
    value = String(value || '').replace(/\/+$/, '');
    return value || '/';
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
        menuLink.href = '/admin/menu';
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

  function isOwnerDashboard() {
    var path = logicalPath();
    return path === '/admin/ownerdashboard' || path === '/admin/dashboardlab';
  }

  function explicitEmptyMenu(payload) {
    if (!payload || payload.success === false) return null;

    var data = payload.data && typeof payload.data === 'object'
      ? payload.data
      : payload;
    var status = data && data.setup_status && typeof data.setup_status === 'object'
      ? data.setup_status
      : null;

    if (status
      && typeof status.has_categories === 'boolean'
      && typeof status.has_menu_items === 'boolean') {
      return status.has_categories === false && status.has_menu_items === false;
    }

    if (data && Array.isArray(data.categories) && Array.isArray(data.items)) {
      return data.categories.length === 0 && data.items.length === 0;
    }

    return null;
  }

  function ensureOwnerWelcomeStyles() {
    if (document.getElementById('pmd-owner-welcome-r9-style')) return;

    var style = document.createElement('style');
    style.id = 'pmd-owner-welcome-r9-style';
    style.textContent = [
      '#pmd-owner-welcome-r9{box-sizing:border-box;width:min(1480px,100%);margin:10px auto 22px;padding:22px 24px;border:1px solid #cee1ea;border-radius:20px;background:#fff;box-shadow:0 10px 28px rgba(16,47,66,.06);color:#102f42}',
      '#pmd-owner-welcome-r9 *{box-sizing:border-box}',
      '#pmd-owner-welcome-r9 .pmd-ow9-head{display:flex;align-items:center;gap:18px;margin-bottom:18px}',
      '#pmd-owner-welcome-r9 .pmd-ow9-logo{display:flex;align-items:center;justify-content:center;flex:0 0 92px;width:92px;min-height:58px}',
      '#pmd-owner-welcome-r9 .pmd-ow9-logo img{display:block;max-width:92px;max-height:58px;width:auto;height:auto;object-fit:contain}',
      '#pmd-owner-welcome-r9 .pmd-ow9-copy{min-width:0}',
      '#pmd-owner-welcome-r9 .pmd-ow9-kicker{display:block;margin:0 0 4px;color:#08705d;font-size:11px;font-weight:850;letter-spacing:.11em;text-transform:uppercase}',
      '#pmd-owner-welcome-r9 h2{margin:0;color:#102f42;font-size:22px;font-weight:850;line-height:1.2}',
      '#pmd-owner-welcome-r9 .pmd-ow9-intro{margin:6px 0 0;color:#667d89;font-size:13px;line-height:1.45}',
      '#pmd-owner-welcome-r9 .pmd-ow9-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:11px}',
      '#pmd-owner-welcome-r9 .pmd-ow9-step{display:flex;align-items:center;gap:12px;min-height:76px;padding:13px 14px;border:1px solid #dbe7ee;border-radius:15px;background:#fbfdfe;color:#173752;text-decoration:none!important;transition:transform .16s ease,border-color .16s ease,background .16s ease}',
      '#pmd-owner-welcome-r9 .pmd-ow9-step:hover{transform:translateY(-1px);border-color:#83bfb1;background:#f7fbfa}',
      '#pmd-owner-welcome-r9 .pmd-ow9-number{display:grid;place-items:center;flex:0 0 36px;width:36px;height:36px;border-radius:11px;background:#e8f5f1;color:#08705d;font-size:13px;font-weight:900}',
      '#pmd-owner-welcome-r9 .pmd-ow9-step strong{display:block;margin:0 0 3px;color:#102f42;font-size:13px;font-weight:850;line-height:1.25}',
      '#pmd-owner-welcome-r9 .pmd-ow9-step span:last-child{display:block;color:#71858f;font-size:11.5px;line-height:1.35}',
      '@media(max-width:860px){#pmd-owner-welcome-r9 .pmd-ow9-grid{grid-template-columns:1fr}#pmd-owner-welcome-r9 .pmd-ow9-head{align-items:flex-start}}',
      '@media(max-width:560px){#pmd-owner-welcome-r9{margin:8px 0 18px;padding:18px;border-radius:17px}#pmd-owner-welcome-r9 .pmd-ow9-logo{flex-basis:72px;width:72px}#pmd-owner-welcome-r9 .pmd-ow9-logo img{max-width:72px;max-height:48px}#pmd-owner-welcome-r9 h2{font-size:19px}}'
    ].join('');
    document.head.appendChild(style);
  }

  function renderOwnerWelcome(show) {
    var existing = document.getElementById('pmd-owner-welcome-r9');
    if (show !== true) {
      if (existing) existing.remove();
      return;
    }

    var root = document.getElementById('pmd-dashboard-lab');
    if (!root || existing) return;

    ensureOwnerWelcomeStyles();

    var card = document.createElement('section');
    card.id = 'pmd-owner-welcome-r9';
    card.setAttribute('data-pmd-owner-first-setup', 'v1');
    card.setAttribute('aria-labelledby', 'pmd-owner-welcome-title-r9');
    card.innerHTML = [
      '<div class="pmd-ow9-head">',
        '<div class="pmd-ow9-logo"><img src="/assets/media/uploads/Paymydinelogo.png" alt="PayMyDine"></div>',
        '<div class="pmd-ow9-copy">',
          '<span class="pmd-ow9-kicker">Getting started</span>',
          '<h2 id="pmd-owner-welcome-title-r9">Welcome to PayMyDine</h2>',
          '<p class="pmd-ow9-intro">Get your restaurant ready in a few simple steps.</p>',
        '</div>',
      '</div>',
      '<div class="pmd-ow9-grid">',
        '<a class="pmd-ow9-step" href="/admin/pmdsettings/restaurant">',
          '<span class="pmd-ow9-number">1</span>',
          '<span><strong>Restaurant details</strong><span>Add your basic restaurant information.</span></span>',
        '</a>',
        '<a class="pmd-ow9-step" href="/admin/menu">',
          '<span class="pmd-ow9-number">2</span>',
          '<span><strong>Build your digital menu</strong><span>Add categories, food, prices and photos.</span></span>',
        '</a>',
        '<a class="pmd-ow9-step" href="/admin/tables">',
          '<span class="pmd-ow9-number">3</span>',
          '<span><strong>Add your tables</strong><span>Create the tables your team will use.</span></span>',
        '</a>',
      '</div>'
    ].join('');

    var header = root.querySelector('#pmd-r2-clean-header');
    if (header && header.parentNode === root) {
      header.insertAdjacentElement('afterend', card);
    } else if (root.firstChild) {
      root.insertBefore(card, root.firstChild);
    } else {
      root.appendChild(card);
    }
  }

  function requestOwnerWelcome() {
    if (!isOwnerDashboard()) {
      renderOwnerWelcome(false);
      return;
    }

    if (ownerWelcomeState !== null) {
      renderOwnerWelcome(ownerWelcomeState === true);
      return;
    }

    if (ownerWelcomeRequested) return;
    ownerWelcomeRequested = true;

    fetch('/api/v1/menu', {
      method: 'GET',
      credentials: 'same-origin',
      headers: {'Accept': 'application/json'},
      cache: 'no-store'
    }).then(function (response) {
      if (!response.ok) throw new Error('menu-setup-state');
      return response.json();
    }).then(function (payload) {
      var empty = explicitEmptyMenu(payload);
      ownerWelcomeState = empty === true;
      renderOwnerWelcome(ownerWelcomeState);
    }).catch(function () {
      ownerWelcomeState = false;
      renderOwnerWelcome(false);
    });
  }

  function enhance() {
    scheduled = false;
    enhanceOrderComposer();
    enhanceReservationComposer();
    requestOwnerWelcome();
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
    ownerWelcome: function () { return ownerWelcomeState; }
  };
  window.PMDNewTenantOnboardingR9 = window.PMDNewTenantOnboardingR7;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, {once: true});
  } else {
    mount();
  }
}());
