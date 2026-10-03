(function () {
  'use strict';

  // PMD_SETTINGS_DYNAMIC_I18N_V17
  function settingsText(value) {
    var runtime = window.PMDPlatformMessages;
    value = String(value == null ? '' : value);
    return runtime && typeof runtime.fromEnglish === 'function'
      ? runtime.fromEnglish(value, 'settings.', value)
      : value;
  }

  function settingsHtml(value) {
    return esc(settingsText(value));
  }

  if (window.PMDPaymentProviderCatalogueV3) return;

  var root = null;
  var catalogue = null;
  var sumup = null;
  var environment = 'test';
  var busy = false;
  var modalOpen = false;
  var message = '';
  var messageError = false;
  var modalHost = null;
  var previousBodyOverflow = '';

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char];
    });
  }

  function csrf() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.content : '';
  }

  function jsonHeaders() {
    return {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRF-TOKEN': csrf()
    };
  }

  async function request(url, options) {
    var response = await fetch(url, Object.assign({
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': csrf()
      }
    }, options || {}));

    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok || payload.success === false || payload.ok === false) {
      throw new Error(String(payload.message || payload.error || ('HTTP ' + response.status)));
    }
    return payload;
  }

  function capabilityLabel(value) {
    var map = {
      online_payments: 'Online payments',
      terminal_payments: 'Card terminals',
      refunds: 'Refunds',
      partial_refunds: 'Partial refunds',
      payment_links: 'Payment links',
      saved_payment_methods: 'Saved payment methods',
      webhooks: 'Webhooks',
      oauth: 'Connect account'
    };
    return settingsText(map[value] || value);
  }

  function methodLabel(value) {
    var map = {
      card: 'Cards',
      apple_pay: 'Apple Pay',
      google_pay: 'Google Pay',
      wero: 'Wero',
      paypal: 'PayPal',
      klarna: 'Klarna',
      sepa_debit: 'SEPA Direct Debit',
      cash_app: 'Cash App Pay'
    };
    return settingsText(map[value] || value);
  }

  function provider(code) {
    var list = catalogue && catalogue.providers ? catalogue.providers : [];
    return list.find(function (item) { return item.provider_code === code; }) || {
      provider_code: code,
      label: code,
      capabilities: [],
      payment_methods: [],
      implemented_capabilities: [],
      implemented_payment_methods: []
    };
  }

  function chips(values, formatter) {
    values = Array.isArray(values) ? values : [];
    if (!values.length) return '<span class="pmd-provider-muted">' + settingsHtml('Not enabled yet') + '</span>';
    return '<div class="pmd-provider-chips">' + values.map(function (value) {
      return '<span>' + esc(formatter(value)) + '</span>';
    }).join('') + '</div>';
  }

  function environments() {
    return sumup && sumup.environments ? sumup.environments : {};
  }

  function sumupSnapshot(key) {
    var envs = environments();
    key = key || environment;
    return envs[key] || {
      environment: key,
      configured: false,
      connection_status: 'not_configured',
      api_key_present: false,
      affiliate_key_present: false,
      merchant_code: '',
      terminals: []
    };
  }

  function bestSumupEnvironment() {
    var envs = environments();
    if (sumup && sumup.active_environment && envs[sumup.active_environment]) return sumup.active_environment;
    if (envs.test && envs.test.connection_status === 'connected') return 'test';
    if (envs.production && envs.production.connection_status === 'connected') return 'production';
    if (envs.test && envs.test.configured) return 'test';
    if (envs.production && envs.production.configured) return 'production';
    return 'test';
  }

  function sumupStatus(snapshot) {
    if (snapshot.connection_status === 'connected') return settingsText('Connected');
    if (snapshot.connection_status === 'error') return settingsText('Needs attention');
    if (snapshot.configured) return settingsText('Saved, not tested');
    return settingsText('Not connected');
  }

  function sumupStatusClass(snapshot) {
    if (snapshot.connection_status === 'connected') return 'is-connected';
    if (snapshot.connection_status === 'error') return 'is-error';
    return '';
  }

  function statusBadge(label, className) {
    return '<span class="pmd-provider-status ' + esc(className || '') + '">' + esc(label) + '</span>';
  }

  function rowNote(definition, code) {
    if (code === 'sumup') {
      var key = bestSumupEnvironment();
      var snapshot = sumupSnapshot(key);
      var count = Array.isArray(snapshot.terminals) ? snapshot.terminals.length : 0;
      if (snapshot.connection_status === 'connected') {
        var environmentLabel = settingsText(key === 'production' ? 'Production' : 'Test');
        return environmentLabel + ' ' + settingsText('connected') +
          (count ? ' · ' + count + ' ' + settingsText(count === 1 ? 'terminal' : 'terminals') : '');
      }
      if (snapshot.configured) return settingsText('Connection saved; test it before taking payments.');
      return settingsText("Connect this restaurant's SumUp account, then pair its terminals.");
    }

    var readyMethods = definition.implemented_payment_methods || [];
    var readyCapabilities = definition.implemented_capabilities || [];
    if (readyMethods.length || readyCapabilities.length) return settingsText('Part of this provider flow already exists in PayMyDine.');
    return settingsText('Provider adapter is not enabled yet.');
  }

  function providerStatus(definition) {
    var code = definition.provider_code;
    if (code === 'sumup') {
      var snapshot = sumupSnapshot(bestSumupEnvironment());
      return {
        label: sumupStatus(snapshot),
        className: sumupStatusClass(snapshot)
      };
    }

    var ready = (definition.implemented_payment_methods || []).length ||
      (definition.implemented_capabilities || []).length;
    return {label: settingsText(ready ? 'Partly ready' : 'Next'), className: ready ? 'is-partial' : ''};
  }

  function renderProviderRow(definition) {
    var code = definition.provider_code;
    var label = definition.label || code;
    var status = providerStatus(definition);
    var methods = definition.implemented_payment_methods || [];
    var capabilities = definition.implemented_capabilities || [];
    var ready = methods.slice();

    capabilities.forEach(function (capability) {
      var text = capabilityLabel(capability);
      if (ready.indexOf(text) === -1 && capability !== 'online_payments') ready.push(text);
    });

    var methodMarkup = methods.length
      ? chips(methods, methodLabel)
      : chips(capabilities, capabilityLabel);

    var action = code === 'sumup'
      ? '<button type="button" class="pmd-provider-configure" data-provider-configure="sumup">' + settingsHtml('Configure') + '</button>'
      : '<button type="button" class="pmd-provider-configure" data-pmd-inline-open="finance:provider:' + esc(code) + '">' + settingsHtml('Configure') + '</button>';

    return [
      '<article class="pmd-provider-row" id="provider-' + esc(code) + '">',
        '<div class="pmd-provider-row__identity">',
          '<strong>' + esc(label) + '</strong>',
          '<small>' + esc(rowNote(definition, code)) + '</small>',
        '</div>',
        '<div class="pmd-provider-row__methods">' + methodMarkup + '</div>',
        '<div class="pmd-provider-row__status">' + statusBadge(status.label, status.className) + '</div>',
        '<div class="pmd-provider-row__action">' + action + '</div>',
      '</article>'
    ].join('');
  }

  function renderList() {
    if (!root || !catalogue || !sumup) return;
    var definitions = catalogue.providers || [];

    root.innerHTML = [
      '<div class="pmd-provider-list" data-provider-list>',
        definitions.map(renderProviderRow).join(''),
      '</div>'
    ].join('');

    bindList();
  }

  function ensureModalHost() {
    if (modalHost && document.body.contains(modalHost)) return modalHost;
    modalHost = document.createElement('div');
    modalHost.setAttribute('data-pmd-provider-modal-host', '');
    document.body.appendChild(modalHost);
    return modalHost;
  }

  function field(label, key, type, value, placeholder, readonly, help) {
    return [
      '<label class="pmd-provider-modal-field">',
        '<span>' + settingsHtml(label) + '</span>',
        '<input data-provider-sumup-field="' + esc(key) + '" type="' + esc(type) + '" value="' + esc(value || '') + '" placeholder="' + esc(placeholder ? settingsText(placeholder) : '') + '" ' + (readonly ? 'readonly ' : '') + 'autocomplete="off">',
        help ? '<small>' + settingsHtml(help) + '</small>' : '',
      '</label>'
    ].join('');
  }

  function envButton(key, label) {
    var snapshot = sumupSnapshot(key);
    var connected = snapshot.connection_status === 'connected';
    var active = sumup && sumup.active_environment === key;
    return [
      '<button type="button" data-provider-sumup-env="' + key + '" class="' + (environment === key ? 'is-active' : '') + '">',
        '<span>' + settingsHtml(label) + '</span>',
        connected ? '<small><i></i>' + settingsHtml(active ? 'Active' : 'Connected') + '</small>' : '<small>' + settingsHtml(snapshot.configured ? 'Saved' : 'Not connected') + '</small>',
      '</button>'
    ].join('');
  }

  function terminalSummary(snapshot) {
    var terminals = Array.isArray(snapshot.terminals) ? snapshot.terminals : [];
    if (!terminals.length) return '<span>' + settingsHtml('No terminal paired in this environment.') + '</span>';
    var online = terminals.filter(function (terminal) { return !!terminal.online; }).length;
    return '<span>' + terminals.length + ' ' + settingsHtml(terminals.length === 1 ? 'terminal' : 'terminals') + ' · ' + online + ' ' + settingsHtml('online') + '</span>';
  }

  function renderSumupModal() {
    var host = ensureModalHost();
    if (!modalOpen) {
      host.innerHTML = '';
      return;
    }

    var definition = provider('sumup');
    var snapshot = sumupSnapshot(environment);
    var connected = snapshot.connection_status === 'connected';
    var active = sumup ? sumup.active_environment : null;
    var appId = sumup && sumup.app_id ? sumup.app_id : 'com.paymydine.cloud';
    var savedApi = !!snapshot.api_key_present;
    var savedAffiliate = !!snapshot.affiliate_key_present;

    host.innerHTML = [
      '<div class="pmd-provider-modal" role="presentation">',
        '<button type="button" class="pmd-provider-modal__backdrop" aria-label="' + settingsHtml('Close') + '" data-provider-modal-close></button>',
        '<section class="pmd-provider-modal__dialog" role="dialog" aria-modal="true" aria-labelledby="pmd-sumup-modal-title">',
          '<header class="pmd-provider-modal__header">',
            '<div>',
              '<span class="pmd-provider-modal__kicker">' + settingsHtml('PAYMENT PROVIDER') + '</span>',
              '<h2 id="pmd-sumup-modal-title">' + settingsHtml('Configure SumUp') + '</h2>',
              '<p>' + settingsHtml("Connect this restaurant's own SumUp account. Test and production credentials stay separate.") + '</p>',
            '</div>',
            '<button type="button" class="pmd-provider-modal__close" data-provider-modal-close aria-label="' + settingsHtml('Close') + '">×</button>',
          '</header>',
          '<div class="pmd-provider-modal__body">',
            '<div class="pmd-provider-modal__summary">',
              '<div><strong>' + esc(sumupStatus(snapshot)) + '</strong><span>' + settingsHtml(environment === 'production' ? 'Production' : 'Test') + ' ' + settingsHtml('environment') + '</span></div>',
              statusBadge(sumupStatus(snapshot), sumupStatusClass(snapshot)),
            '</div>',
            '<div class="pmd-provider-env-tabs" role="tablist" aria-label="' + settingsHtml('SumUp environment') + '">',
              envButton('test', 'Test'),
              envButton('production', 'Production'),
            '</div>',
            message ? '<div class="pmd-provider-modal-message ' + (messageError ? 'is-error' : 'is-success') + '">' + esc(message) + '</div>' : '',
            '<section class="pmd-provider-modal-section">',
              '<div class="pmd-provider-modal-section__head"><div><strong>' + settingsHtml('Connection') + '</strong><span>' + settingsHtml(environment === 'test' ? "Use the restaurant's SumUp sandbox credentials." : "Use the restaurant's live SumUp credentials.") + '</span></div>' + (active === environment ? '<em>' + settingsHtml('Used for payments') + '</em>' : '') + '</div>',
              '<div class="pmd-provider-modal-fields">',
                field('Secret API Key', 'api-key', 'password', '', savedApi ? 'Saved — leave blank to keep it' : 'Enter Secret API Key', false, savedApi ? 'A secret is already stored for this environment.' : ''),
                field('Affiliate Key', 'affiliate-key', 'password', '', savedAffiliate ? 'Saved — leave blank to keep it' : 'Enter Affiliate Key', false, savedAffiliate ? 'A key is already stored for this environment.' : ''),
                field('Merchant Code', 'merchant-code', 'text', snapshot.merchant_code || '', 'Merchant code', false, 'Can be resolved automatically when the API key allows it.'),
                field('PayMyDine App ID', 'app-id', 'text', appId, '', true, 'Managed by PayMyDine.'),
              '</div>',
              '<p class="pmd-provider-modal-security">' + settingsHtml('Saved secrets stay inside the current restaurant tenant and are never shown back in the browser.') + '</p>',
            '</section>',
            '<section class="pmd-provider-modal-section is-compact">',
              '<div class="pmd-provider-modal-section__head">',
                '<div><strong>' + settingsHtml('Terminals') + '</strong>' + terminalSummary(snapshot) + '</div>',
                '<a class="pmd-provider-modal-link" href="/admin/pmddevices#payment-terminals">' + settingsHtml('Manage terminals') + '</a>',
              '</div>',
            '</section>',
            '<section class="pmd-provider-modal-section is-compact">',
              '<div class="pmd-provider-modal-section__head"><div><strong>' + settingsHtml('Available in PayMyDine') + '</strong><span>' + settingsHtml('Only flows already implemented by PayMyDine are shown here.') + '</span></div></div>',
              '<div class="pmd-provider-modal-ready">',
                '<div><span>' + settingsHtml('Capabilities') + '</span>' + chips(definition.implemented_capabilities || [], capabilityLabel) + '</div>',
                '<div><span>' + settingsHtml('Payment methods') + '</span>' + chips(definition.implemented_payment_methods || [], methodLabel) + '</div>',
              '</div>',
            '</section>',
            snapshot.last_error ? '<div class="pmd-provider-modal-message is-error">' + esc(snapshot.last_error) + '</div>' : '',
          '</div>',
          '<footer class="pmd-provider-modal__footer">',
            '<div class="pmd-provider-modal__footer-left">',
              snapshot.configured ? '<button type="button" class="pmd-provider-secondary" data-provider-sumup-test ' + (busy ? 'disabled' : '') + '>' + settingsHtml('Test saved connection') + '</button>' : '',
              connected && active !== environment ? '<button type="button" class="pmd-provider-secondary" data-provider-sumup-activate ' + (busy ? 'disabled' : '') + '>' + settingsHtml('Use for payments') + '</button>' : '',
            '</div>',
            '<div class="pmd-provider-modal__footer-right">',
              '<button type="button" class="pmd-provider-secondary" data-provider-modal-close ' + (busy ? 'disabled' : '') + '>' + settingsHtml('Cancel') + '</button>',
              '<button type="button" class="pmd-provider-primary" data-provider-sumup-save ' + (busy ? 'disabled' : '') + '>' + settingsHtml(busy ? 'Working…' : 'Save & test connection') + '</button>',
            '</div>',
          '</footer>',
        '</section>',
      '</div>'
    ].join('');

    bindModal();
  }

  function inputValue(key) {
    var host = ensureModalHost();
    var node = host.querySelector('[data-provider-sumup-field="' + key + '"]');
    return node ? String(node.value || '').trim() : '';
  }

  function captureSumupForm() {
    return {
      environment: environment,
      api_key: inputValue('api-key'),
      affiliate_key: inputValue('affiliate-key'),
      merchant_code: inputValue('merchant-code')
    };
  }

  function openSumupModal() {
    environment = bestSumupEnvironment();
    message = '';
    messageError = false;
    modalOpen = true;
    previousBodyOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    renderSumupModal();
    window.setTimeout(function () {
      var close = ensureModalHost().querySelector('[data-provider-modal-close]');
      if (close) close.focus({preventScroll: true});
    }, 0);
  }

  function closeSumupModal() {
    if (busy) return;
    modalOpen = false;
    message = '';
    messageError = false;
    renderSumupModal();
    document.body.style.overflow = previousBodyOverflow;
  }

  async function perform(action) {
    if (busy) return;
    busy = true;
    message = '';
    messageError = false;
    renderSumupModal();

    try {
      await action();
    } catch (error) {
      message = settingsText(error && error.message ? error.message : 'Provider request failed.');
      messageError = true;
    } finally {
      busy = false;
      renderList();
      renderSumupModal();
    }
  }

  async function saveSumup() {
    var form = captureSumupForm();
    await perform(async function () {
      var payload = await request('/admin/payment-providers/sumup/connection', {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify(form)
      });
      sumup = payload.state;
      message = settingsText(payload.message || 'Connected to SumUp.');
      messageError = false;
    });
  }

  async function testSumup() {
    var env = environment;
    await perform(async function () {
      var payload = await request('/admin/payment-providers/sumup/connection/test', {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({environment: env})
      });
      sumup = payload.state;
      message = settingsText(payload.message || 'SumUp connection is working.');
      messageError = false;
    });
  }

  async function activateSumup() {
    var env = environment;
    await perform(async function () {
      var payload = await request('/admin/payment-providers/sumup/environment', {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({environment: env})
      });
      sumup = payload.state;
      message = settingsText(payload.message || 'Environment activated.');
      messageError = false;
    });
  }

  function bindList() {
    var configure = root.querySelector('[data-provider-configure="sumup"]');
    if (configure) configure.onclick = openSumupModal;
  }

  function bindModal() {
    var host = ensureModalHost();
    host.querySelectorAll('[data-provider-modal-close]').forEach(function (button) {
      button.onclick = closeSumupModal;
    });

    host.querySelectorAll('[data-provider-sumup-env]').forEach(function (button) {
      button.onclick = function () {
        if (busy) return;
        environment = button.dataset.providerSumupEnv;
        message = '';
        messageError = false;
        renderSumupModal();
      };
    });

    var save = host.querySelector('[data-provider-sumup-save]');
    var test = host.querySelector('[data-provider-sumup-test]');
    var activate = host.querySelector('[data-provider-sumup-activate]');
    if (save) save.onclick = saveSumup;
    if (test) test.onclick = testSumup;
    if (activate) activate.onclick = activateSumup;
  }

  async function load() {
    var results = await Promise.all([
      request('/admin/payment-providers/state'),
      request('/admin/payment-providers/sumup/state')
    ]);

    catalogue = results[0];
    sumup = results[1].state;
    environment = bestSumupEnvironment();
    renderList();
    renderSumupModal();
  }

  function mount() {
    if (!/^\/admin\/pmdfinance\/?$/.test((window.PMDAdminCanonicalURLR81E ? window.PMDAdminCanonicalURLR81E.logicalPath() : location.pathname))) return;
    root = document.querySelector('[data-pmd-payment-provider-catalogue]');
    if (!root) return;

    root.classList.add('pmd-provider-catalogue-root');

    load().catch(function (error) {
      var fallback = root.querySelector('[data-pmd-provider-fallback]');
      var warning = document.createElement('div');
      warning.className = 'pmd-provider-modal-message is-error';
      warning.textContent = settingsText(error && error.message ? error.message : 'Provider connections could not be loaded.');
      if (fallback) root.insertBefore(warning, fallback);
      else root.appendChild(warning);
    });
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && modalOpen) closeSumupModal();
  });

  window.PMDPaymentProviderCatalogueV3 = {
    mount: mount,
    reload: load,
    openSumup: openSumupModal,
    getState: function () { return {catalogue: catalogue, sumup: sumup}; }
  };
  window.PMDPaymentProviderCatalogueV2 = window.PMDPaymentProviderCatalogueV3;

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once:true});
  else mount();
}());
