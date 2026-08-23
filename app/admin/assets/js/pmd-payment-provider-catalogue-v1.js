(function () {
  'use strict';

  if (window.PMDPaymentProviderCatalogueV2) return;

  var root = null;
  var catalogue = null;
  var sumup = null;
  var environment = 'test';
  var busy = false;
  var message = '';
  var messageError = false;

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
    return map[value] || value;
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
    return map[value] || value;
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
    if (!values.length) return '<span class="pmd-provider-muted">Not enabled yet</span>';
    return '<div class="pmd-provider-card__chips">' + values.map(function (value) {
      return '<span>' + esc(formatter(value)) + '</span>';
    }).join('') + '</div>';
  }

  function sumupSnapshot() {
    var environments = sumup && sumup.environments ? sumup.environments : {};
    return environments[environment] || {
      configured: false,
      connection_status: 'not_configured',
      api_key_present: false,
      affiliate_key_present: false,
      merchant_code: '',
      terminals: []
    };
  }

  function sumupStatus(snapshot) {
    if (snapshot.connection_status === 'connected') return 'Connected';
    if (snapshot.connection_status === 'error') return 'Needs attention';
    if (snapshot.configured) return 'Saved, not tested';
    return 'Not connected';
  }

  function tab(key, label) {
    var snapshot = sumup && sumup.environments && sumup.environments[key]
      ? sumup.environments[key]
      : {};
    var connected = snapshot.connection_status === 'connected';
    return '<button type="button" data-provider-sumup-env="' + key + '" class="' +
      (environment === key ? 'is-active' : '') + '">' +
      (connected ? '<i></i>' : '') + esc(label) + '</button>';
  }

  function field(label, key, type, value, placeholder, readonly) {
    return '<label class="pmd-provider-field"><span>' + esc(label) + '</span><input ' +
      'data-provider-sumup-field="' + esc(key) + '" type="' + esc(type) + '" value="' +
      esc(value || '') + '" placeholder="' + esc(placeholder || '') + '" ' +
      (readonly ? 'readonly ' : '') + 'autocomplete="off"></label>';
  }

  function renderSumup() {
    var definition = provider('sumup');
    var snapshot = sumupSnapshot();
    var connected = snapshot.connection_status === 'connected';
    var active = sumup ? sumup.active_environment : null;
    var appId = sumup && sumup.app_id ? sumup.app_id : 'com.paymydine.cloud';
    var readyMethods = definition.implemented_payment_methods || [];
    var readyCapabilities = definition.implemented_capabilities || [];

    return [
      '<article class="pmd-provider-feature" id="provider-sumup">',
        '<div class="pmd-provider-feature__head">',
          '<div><h3>SumUp</h3><p>Connect this restaurant\'s own SumUp account once. PayMyDine reuses it for supported payments and Solo terminals.</p></div>',
          '<span class="pmd-provider-card__status ' + (connected ? 'is-connected' : '') + '">' + esc(sumupStatus(snapshot)) + '</span>',
        '</div>',
        '<div class="pmd-provider-tabs">', tab('test', 'Test'), tab('production', 'Production'), '</div>',
        message ? '<div class="pmd-provider-flash ' + (messageError ? 'is-error' : 'is-success') + '">' + esc(message) + '</div>' : '',
        '<div class="pmd-provider-connection">',
          '<div class="pmd-provider-connection__head">',
            '<div><strong>Connection</strong><span>' + (environment === 'test' ? 'Sandbox credentials for this restaurant.' : 'Live credentials for this restaurant.') + '</span></div>',
            active === environment ? '<em>Used for payments</em>' : '',
          '</div>',
          '<div class="pmd-provider-fields">',
            field('Secret API Key', 'api-key', 'password', '', snapshot.api_key_present ? 'Saved — leave blank to keep it' : 'sup_sk_…'),
            field('Affiliate Key', 'affiliate-key', 'password', '', snapshot.affiliate_key_present ? 'Saved — leave blank to keep it' : 'sup_afk_…'),
            field('Merchant Code', 'merchant-code', 'text', snapshot.merchant_code || '', 'Merchant code'),
            field('PayMyDine App ID', 'app-id', 'text', appId, '', true),
          '</div>',
          '<small class="pmd-provider-security-note">Secrets are stored only in the current restaurant tenant and are never shown back after saving.</small>',
          '<div class="pmd-provider-actions">',
            '<button type="button" class="btn btn-primary" data-provider-sumup-save ' + (busy ? 'disabled' : '') + '>Save &amp; test connection</button>',
            snapshot.configured ? '<button type="button" class="btn btn-outline-secondary" data-provider-sumup-test ' + (busy ? 'disabled' : '') + '>Test saved connection</button>' : '',
            connected && active !== environment ? '<button type="button" class="btn btn-outline-secondary" data-provider-sumup-activate ' + (busy ? 'disabled' : '') + '>Use ' + esc(environment) + ' for payments</button>' : '',
            '<a class="btn btn-outline-secondary" href="/admin/pmddevices#payment-terminals">Manage terminals</a>',
          '</div>',
          snapshot.last_error ? '<p class="pmd-provider-error">' + esc(snapshot.last_error) + '</p>' : '',
        '</div>',
        '<div class="pmd-provider-ready">',
          '<div><strong>Ready in PayMyDine now</strong>' + chips(readyCapabilities, capabilityLabel) + '</div>',
          '<div><strong>Payment methods</strong>' + chips(readyMethods, methodLabel) + '</div>',
        '</div>',
      '</article>'
    ].join('');
  }

  function renderProviderRow(definition) {
    var code = definition.provider_code;
    var label = definition.label || code;
    var readyMethods = definition.implemented_payment_methods || [];
    var readyCapabilities = definition.implemented_capabilities || [];
    var partlyReady = readyMethods.length > 0 || readyCapabilities.length > 0;

    return [
      '<article class="pmd-provider-row" id="provider-' + esc(code) + '">',
        '<div class="pmd-provider-row__identity">',
          '<strong>' + esc(label) + '</strong>',
          '<small>' + (partlyReady ? 'Part of this provider flow already exists in PayMyDine.' : 'Provider adapter is not enabled yet.') + '</small>',
        '</div>',
        '<div class="pmd-provider-row__ready">', chips(readyMethods, methodLabel), '</div>',
        '<span class="pmd-provider-card__status">' + (partlyReady ? 'Partly ready' : 'Next') + '</span>',
        '<button type="button" class="pmd-owner-action" data-pmd-inline-open="finance:provider:' + esc(code) + '">Configure</button>',
      '</article>'
    ].join('');
  }

  function render() {
    if (!root || !catalogue || !sumup) return;
    var others = (catalogue.providers || []).filter(function (item) {
      return item.provider_code !== 'sumup';
    });

    root.innerHTML = [
      '<div class="pmd-provider-catalogue pmd-provider-catalogue--embedded">',
        renderSumup(),
        '<div class="pmd-provider-list">', others.map(renderProviderRow).join(''), '</div>',
      '</div>'
    ].join('');

    bind();
  }

  function input(key) {
    var node = root.querySelector('[data-provider-sumup-field="' + key + '"]');
    return node ? String(node.value || '').trim() : '';
  }

  async function act(callback) {
    if (busy) return;
    busy = true;
    message = '';
    messageError = false;
    render();
    try {
      await callback();
    } catch (error) {
      message = error && error.message ? error.message : 'Provider request failed.';
      messageError = true;
    } finally {
      busy = false;
      render();
    }
  }

  async function saveSumup() {
    await act(async function () {
      var payload = await request('/admin/payment-providers/sumup/connection', {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({
          environment: environment,
          api_key: input('api-key'),
          affiliate_key: input('affiliate-key'),
          merchant_code: input('merchant-code')
        })
      });
      sumup = payload.state;
      message = payload.message || 'Connected to SumUp.';
    });
  }

  async function testSumup() {
    await act(async function () {
      var payload = await request('/admin/payment-providers/sumup/connection/test', {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ environment: environment })
      });
      sumup = payload.state;
      message = payload.message || 'SumUp connection is working.';
    });
  }

  async function activateSumup() {
    await act(async function () {
      var payload = await request('/admin/payment-providers/sumup/environment', {
        method: 'POST',
        headers: jsonHeaders(),
        body: JSON.stringify({ environment: environment })
      });
      sumup = payload.state;
      message = payload.message || 'Environment activated.';
    });
  }

  function bind() {
    root.querySelectorAll('[data-provider-sumup-env]').forEach(function (button) {
      button.onclick = function () {
        environment = button.dataset.providerSumupEnv;
        message = '';
        messageError = false;
        render();
      };
    });

    var save = root.querySelector('[data-provider-sumup-save]');
    var test = root.querySelector('[data-provider-sumup-test]');
    var activate = root.querySelector('[data-provider-sumup-activate]');
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

    if (sumup && sumup.active_environment) environment = sumup.active_environment;
    else if (sumup && sumup.environments && sumup.environments.test && sumup.environments.test.configured) environment = 'test';

    render();
  }

  function mount() {
    if (!/^\/admin\/pmdfinance\/?$/.test(location.pathname)) return;
    root = document.querySelector('[data-pmd-payment-provider-catalogue]');
    if (!root) return;

    load().catch(function (error) {
      var fallback = root.querySelector('[data-pmd-provider-fallback]');
      if (fallback) {
        var warning = document.createElement('div');
        warning.className = 'pmd-provider-flash is-error';
        warning.textContent = error && error.message ? error.message : 'Provider connections could not be loaded.';
        root.insertBefore(warning, fallback);
      } else {
        root.innerHTML = '<div class="pmd-provider-flash is-error">Provider connections could not be loaded.</div>';
      }
    });
  }

  window.PMDPaymentProviderCatalogueV2 = {
    mount: mount,
    reload: load,
    getState: function () { return { catalogue: catalogue, sumup: sumup }; }
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once:true});
  else mount();
}());
