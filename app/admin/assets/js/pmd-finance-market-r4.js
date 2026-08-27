(function () {
  'use strict';

  if (window.PMDFinanceMarketR4) return;

  var state = null;
  var modal = null;
  var modalBody = null;
  var modalTitle = null;
  var modalStatus = null;
  var busy = false;

  function isFinance() {
    return /^\/admin\/pmdfinance\/?$/.test(location.pathname);
  }

  function markReady() {
    document.body.classList.remove('pmd-finance-market-r4-failed');
    document.body.classList.add('pmd-finance-market-r4-ready');
  }

  function markFailed() {
    document.body.classList.remove('pmd-finance-market-r4-ready');
    document.body.classList.add('pmd-finance-market-r4-failed');
  }

  function csrf() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? String(meta.content || '') : '';
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (ch) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch];
    });
  }

  function providerLabel(code) {
    code = String(code || '');
    if (code === 'paymob') return 'Paymob';
    if (code === 'vr_payment') return 'VR Payment';
    if (code === 'sumup') return 'SumUp';
    if (code === 'paypal') return 'PayPal';
    return code.replace(/_/g, ' ').replace(/\b\w/g, function (x) { return x.toUpperCase(); });
  }

  async function request(url, options) {
    options = options || {};
    options.credentials = 'same-origin';
    options.cache = 'no-store';
    options.headers = Object.assign({
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }, options.headers || {});

    if (options.method && options.method !== 'GET') {
      options.headers['Content-Type'] = 'application/json';
      options.headers['X-CSRF-TOKEN'] = csrf();
    }

    var response = await fetch(url, options);
    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok || payload.ok === false) {
      var error = new Error(String(payload.message || payload.error || ('HTTP ' + response.status)));
      error.payload = payload;
      throw error;
    }
    return payload;
  }

  function ensureStyle() {
    if (document.getElementById('pmd-finance-market-r4-style')) return;
    var style = document.createElement('style');
    style.id = 'pmd-finance-market-r4-style';
    style.textContent = [
      '.pmd-r4-market-pill{display:inline-flex;align-items:center;gap:7px;padding:6px 10px;border:1px solid #d9e7e2;border-radius:999px;background:#f6faf8;color:#31584c;font-size:12px;font-weight:800}',
      '.pmd-r4-modal[hidden]{display:none!important}.pmd-r4-modal{position:fixed;inset:0;z-index:14050;display:grid;place-items:center;padding:20px;background:rgba(4,20,17,.35);backdrop-filter:blur(8px)}',
      '.pmd-r4-card{width:min(900px,calc(100vw - 32px));max-height:92vh;overflow:auto;background:#fff;border:1px solid #dce8e4;border-radius:22px;box-shadow:0 28px 80px rgba(5,32,27,.22)}',
      '.pmd-r4-head{position:sticky;top:0;z-index:2;display:flex;align-items:center;justify-content:space-between;gap:14px;padding:19px 22px;background:#fff;border-bottom:1px solid #edf2f0}.pmd-r4-head h3{margin:0;font-size:21px;color:#16312a}.pmd-r4-close{width:40px;height:40px;border:1px solid #dce8e4;border-radius:12px;background:#fff;font-size:23px;cursor:pointer}',
      '.pmd-r4-body{padding:22px}.pmd-r4-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 16px}.pmd-r4-field{display:grid;gap:7px}.pmd-r4-field.full{grid-column:1/-1}.pmd-r4-field label{font-size:13px;font-weight:800;color:#526961}.pmd-r4-field input,.pmd-r4-field select{width:100%;height:48px;border:1px solid #d8e5e0;border-radius:12px;background:#fff;padding:10px 12px;color:#17372f}.pmd-r4-field input[readonly]{background:#f7faf9;color:#647a72}.pmd-r4-field small{font-size:12px;line-height:1.45;color:#72847e}',
      '.pmd-r4-section{margin:0 0 20px}.pmd-r4-section h4{margin:0 0 12px;font-size:15px;color:#17372f}.pmd-r4-divider{height:1px;background:#edf2f0;margin:20px 0}',
      '.pmd-r4-toggle{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:13px 14px;border:1px solid #e3ece9;border-radius:13px;background:#f9fbfa}.pmd-r4-toggle strong{font-size:14px}.pmd-r4-toggle input{width:20px;height:20px}',
      '.pmd-r4-safe-note{padding:13px 14px;border:1px solid #d7e7e1;border-radius:13px;background:#f6faf8;color:#31584c;font-size:13px;line-height:1.55}.pmd-r4-safe-note strong{display:block;color:#17372f;margin-bottom:3px}',
      '.pmd-r4-actions{display:flex;align-items:center;justify-content:space-between;gap:12px;flex-wrap:wrap;margin-top:20px;padding-top:17px;border-top:1px solid #edf2f0}.pmd-r4-actions-right{display:flex;gap:10px}.pmd-r4-btn{min-height:42px;border:1px solid #d6e4df;border-radius:11px;background:#fff;color:#17372f;padding:9px 15px;font-weight:800;cursor:pointer}.pmd-r4-btn.primary{background:#123d32;border-color:#123d32;color:#fff}.pmd-r4-btn:disabled{opacity:.55;cursor:not-allowed}',
      '.pmd-r4-status{font-size:13px;color:#60756d}.pmd-r4-status.ok{color:#067647}.pmd-r4-status.error{color:#b42318}',
      '.pmd-r4-method-hint{display:block;margin-top:4px;color:#72847e;font-size:12px}.pmd-r4-method-chips{display:flex;gap:6px;flex-wrap:wrap}.pmd-r4-method-chip{display:inline-flex;padding:5px 8px;border:1px solid #dce8e4;border-radius:999px;background:#fff;font-size:11px;font-weight:750;color:#36584e}',
      '@media(max-width:720px){.pmd-r4-grid{grid-template-columns:1fr}.pmd-r4-field.full{grid-column:auto}.pmd-r4-modal{padding:8px}.pmd-r4-card{width:100%;max-height:95vh}}'
    ].join('');
    document.head.appendChild(style);
  }

  function ensureModal() {
    if (modal) return modal;
    ensureStyle();
    modal = document.createElement('div');
    modal.className = 'pmd-r4-modal';
    modal.hidden = true;
    modal.innerHTML = '<div class="pmd-r4-card" role="dialog" aria-modal="true">' +
      '<div class="pmd-r4-head"><h3 data-pmd-r4-title>Settings</h3><button type="button" class="pmd-r4-close" data-pmd-r4-close aria-label="Close">×</button></div>' +
      '<div class="pmd-r4-body" data-pmd-r4-body></div></div>';
    document.body.appendChild(modal);
    modalBody = modal.querySelector('[data-pmd-r4-body]');
    modalTitle = modal.querySelector('[data-pmd-r4-title]');
    modal.addEventListener('click', function (event) {
      if (event.target === modal || event.target.closest('[data-pmd-r4-close]')) closeModal();
    });
    return modal;
  }

  function openModal(title, html) {
    ensureModal();
    modalTitle.textContent = title;
    modalBody.innerHTML = html;
    modalStatus = modalBody.querySelector('[data-pmd-r4-status]');
    modal.hidden = false;
    document.documentElement.style.overflow = 'hidden';
  }

  function closeModal() {
    if (!modal || busy) return;
    modal.hidden = true;
    document.documentElement.style.overflow = '';
  }

  function setModalStatus(text, kind) {
    if (!modalStatus) return;
    modalStatus.textContent = text || '';
    modalStatus.className = 'pmd-r4-status' + (kind ? ' ' + kind : '');
  }

  function setBusy(value) {
    busy = !!value;
    if (!modal) return;
    modal.querySelectorAll('button,input,select').forEach(function (node) {
      if (node.hasAttribute('data-pmd-r4-close')) return;
      if (!busy && node.hasAttribute('data-pmd-r4-static-disabled')) {
        node.disabled = true;
        return;
      }
      node.disabled = busy || node.hasAttribute('readonly');
    });
  }

  function currentPaymobProvider() {
    if (!state) return null;
    return (state.providers || []).find(function (provider) { return provider.code === 'paymob'; }) || null;
  }

  function paymobConnectionLabel(provider) {
    var connection = provider && provider.connection ? provider.connection : {};
    var status = String(connection.connection_status || 'Not tested');
    if (/connected/i.test(status)) return 'Connected';
    var present = provider && provider.admin_config && provider.admin_config.secret_present ? provider.admin_config.secret_present : {};
    if (Object.keys(present).some(function (key) { return !!present[key]; })) return 'Setup saved';
    return 'Not configured';
  }

  function renderOmanProvider() {
    var root = document.querySelector('[data-pmd-payment-provider-catalogue]');
    if (!root || !state || state.country_code !== 'OM') return;
    var provider = currentPaymobProvider();
    if (!provider) {
      root.innerHTML = '<div class="pmd-owner-empty">Paymob is not available for this Oman location.</div>';
      return;
    }

    var methods = (state.methods || []).filter(function (m) { return m.provider_candidates && m.provider_candidates.indexOf('paymob') !== -1; });
    var chips = methods.map(function (m) { return '<span class="pmd-r4-method-chip">' + esc(m.label.replace(' (Oman)', '')) + '</span>'; }).join('');
    root.innerHTML = '<div class="pmd-provider-catalogue-list">' +
      '<div class="pmd-owner-list-row">' +
      '<div><strong>Paymob</strong><small>Oman online payment provider · OMR</small></div>' +
      '<div class="pmd-r4-method-chips">' + chips + '</div>' +
      '<div class="pmd-owner-status">' + esc(paymobConnectionLabel(provider)) + '</div>' +
      '<button type="button" class="pmd-owner-action" data-pmd-r4-paymob>Configure</button>' +
      '</div></div>';

    var note = document.querySelector('#payment-providers .pmd-provider-section-note');
    if (note) note.textContent = 'Only providers available for this Oman location are shown. Test and Live credentials remain separate.';
  }

  function renderOmanMethods() {
    if (!state || state.country_code !== 'OM') return;
    var list = document.querySelector('#payment-methods .pmd-owner-list');
    if (!list) return;

    list.innerHTML = (state.methods || []).map(function (method) {
      var provider = method.provider_code ? providerLabel(method.provider_code) : (method.provider_candidates.length ? 'Not offered' : 'No provider required');
      var runtime = state.paymob_runtime && state.paymob_runtime.methods ? state.paymob_runtime.methods[method.code] : null;
      var hint = '';
      if (method.provider_candidates.indexOf('paymob') !== -1) {
        hint = runtime && runtime.integration_configured
          ? 'Paymob Integration ID configured. Guest offering remains locked until checkout settlement QA is complete.'
          : 'Configure the Paymob Integration ID. Guest offering remains locked until checkout settlement QA is complete.';
      } else {
        hint = 'Restaurant cash payment for Oman.';
      }

      return '<div class="pmd-owner-list-row">' +
        '<div><strong>' + esc(method.label) + '</strong><small class="pmd-r4-method-hint">' + esc(hint) + '</small></div>' +
        '<div class="pmd-owner-meta">Provider: ' + esc(provider) + '</div>' +
        '<div class="pmd-owner-status ' + (method.enabled ? 'is-active' : '') + '">' + (method.enabled ? 'Enabled' : 'Disabled') + '</div>' +
        '<button type="button" class="pmd-owner-action" data-pmd-r4-method="' + esc(method.code) + '">Edit</button>' +
        '</div>';
    }).join('') || '<div class="pmd-owner-empty">No Oman payment methods are available.</div>';

    var title = document.querySelector('#payment-methods .pmd-owner-card__title p');
    if (title) title.textContent = 'Payment choices for this Oman location only.';
  }

  function applyMarketVisibility() {
    if (!state) return;
    var fiskaly = document.getElementById('fiskaly');
    if (fiskaly) fiskaly.hidden = !state.fiskaly_visible;

    var fiskalyToggle = document.querySelector('input[name="finance[invoice_show_fiskaly]"]');
    if (fiskalyToggle) {
      var row = fiskalyToggle.closest('.pmd-owner-setting-row');
      if (row) row.hidden = !state.fiskaly_visible;
    }

    var actions = document.querySelector('#payment-methods .pmd-owner-card__actions');
    if (actions && state.country_code === 'OM') {
      actions.innerHTML = '<span class="pmd-r4-market-pill">Oman · OMR · Asia/Muscat</span>';
    }
  }

  function fieldValue(provider, name, definition) {
    var config = provider.admin_config || {};
    if (Object.prototype.hasOwnProperty.call(config, name)) return config[name];
    return definition && definition.default != null ? definition.default : '';
  }

  function renderPaymobField(provider, name, definition) {
    definition = definition || {};
    if (name === 'connection_status' || name === 'last_tested_at') return '';

    var readonly = !!definition.readonly;
    var secret = !!definition.secret;
    var type = definition.type || (secret ? 'password' : 'text');
    var value = fieldValue(provider, name, definition);
    var present = provider.admin_config && provider.admin_config.secret_present ? !!provider.admin_config.secret_present[name] : false;
    var help = definition.help ? '<small>' + esc(definition.help) + '</small>' : '';
    var control = '';

    if (type === 'select') {
      var options = definition.options || {};
      control = '<select data-pmd-r4-paymob-field="' + esc(name) + '">' + Object.keys(options).map(function (key) {
        return '<option value="' + esc(key) + '" ' + (String(value) === String(key) ? 'selected' : '') + '>' + esc(options[key]) + '</option>';
      }).join('') + '</select>';
    } else if (readonly) {
      control = '<input type="text" value="' + esc(value) + '" readonly>';
    } else {
      control = '<input type="' + (secret ? 'password' : 'text') + '" data-pmd-r4-paymob-field="' + esc(name) + '" value="' + (secret ? '' : esc(value)) + '" autocomplete="' + (secret ? 'new-password' : 'off') + '" placeholder="' + (secret && present ? 'Stored — leave blank to keep' : '') + '">';
    }

    return '<div class="pmd-r4-field"><label>' + esc(definition.label || name) + '</label>' + control + help + '</div>';
  }

  function openPaymob() {
    var provider = currentPaymobProvider();
    if (!provider) return;
    var fields = provider.fields || {};
    var connection = provider.connection || {};

    function group(names) {
      return names.filter(function (name) { return fields[name]; }).map(function (name) {
        return renderPaymobField(provider, name, fields[name]);
      }).join('');
    }

    var runtimeNote = provider.guest_runtime_ready
      ? '<div class="pmd-r4-toggle"><div><strong>Provider enabled</strong><small style="display:block;margin-top:3px;color:#72847e">Enable only after the required Oman credentials and Integration IDs are saved.</small></div><input type="checkbox" data-pmd-r4-paymob-enabled ' + (provider.enabled ? 'checked' : '') + '></div>'
      : '<div class="pmd-r4-safe-note"><strong>Configuration & API testing</strong>You can save Test/Live credentials and Integration IDs now. Guest payment offering is intentionally locked until the PMD checkout → verified callback → shared settlement path passes sandbox QA.</div>';

    var html = '<section class="pmd-r4-section">' + runtimeNote + '</section>' +
      '<section class="pmd-r4-section"><h4>Market & environment</h4><div class="pmd-r4-grid">' + group(['transaction_mode','country_code','api_base_url','currency','checkout_experience']) + '</div></section>' +
      '<div class="pmd-r4-divider"></div>' +
      '<section class="pmd-r4-section"><h4>Test / Sandbox</h4><div class="pmd-r4-grid">' + group(['test_secret_key','test_public_key','test_api_key','test_hmac_secret','test_integration_id_card','test_integration_id_omannet','test_integration_id_apple_pay','test_integration_id_google_pay']) + '</div></section>' +
      '<div class="pmd-r4-divider"></div>' +
      '<section class="pmd-r4-section"><h4>Live / Production</h4><div class="pmd-r4-grid">' + group(['live_secret_key','live_public_key','live_api_key','live_hmac_secret','live_integration_id_card','live_integration_id_omannet','live_integration_id_apple_pay','live_integration_id_google_pay']) + '</div></section>' +
      '<div class="pmd-r4-actions"><span class="pmd-r4-status" data-pmd-r4-status>' + esc(connection.connection_status || 'Not tested') + '</span>' +
      '<div class="pmd-r4-actions-right"><button type="button" class="pmd-r4-btn" data-pmd-r4-paymob-test>Test API connection</button><button type="button" class="pmd-r4-btn primary" data-pmd-r4-paymob-save>Save Paymob</button></div></div>';

    openModal('Paymob · Oman', html);
  }

  function collectPaymobConfig() {
    var config = {};
    if (!modalBody) return config;
    modalBody.querySelectorAll('[data-pmd-r4-paymob-field]').forEach(function (field) {
      var key = field.getAttribute('data-pmd-r4-paymob-field');
      var value = String(field.value == null ? '' : field.value).trim();
      if (field.type === 'password' && value === '') return;
      config[key] = value;
    });
    return config;
  }

  async function reload() {
    state = await request('/admin/payment-market/state');
    if (state.country_code === 'OM') {
      renderOmanProvider();
      renderOmanMethods();
    }
    applyMarketVisibility();
    markReady();
    return state;
  }

  async function savePaymob() {
    if (busy) return;
    setBusy(true);
    setModalStatus('Saving…');
    try {
      var enabledControl = modalBody.querySelector('[data-pmd-r4-paymob-enabled]');
      var enabled = !!(enabledControl && enabledControl.checked);
      var payload = await request('/admin/payment-market/paymob/save', {
        method: 'POST',
        body: JSON.stringify({enabled: enabled, config: collectPaymobConfig()})
      });
      setModalStatus(payload.message || 'Saved', 'ok');
      await reload();
      setTimeout(function () { setBusy(false); closeModal(); }, 350);
      return;
    } catch (error) {
      setModalStatus(error.message || 'Could not save Paymob.', 'error');
    }
    setBusy(false);
  }

  async function testPaymob() {
    if (busy) return;
    setBusy(true);
    setModalStatus('Testing API Key…');
    try {
      var payload = await request('/admin/payment-market/paymob/test', {
        method: 'POST',
        body: JSON.stringify({config: collectPaymobConfig()})
      });
      setModalStatus(payload.message || 'Connection successful.', 'ok');
      await reload();
    } catch (error) {
      setModalStatus(error.message || 'Paymob connection failed.', 'error');
    }
    setBusy(false);
  }

  function openMethod(code) {
    var method = (state.methods || []).find(function (item) { return item.code === code; });
    if (!method) return;
    var candidates = method.provider_candidates || [];
    var providerControl = '';

    if (!candidates.length) {
      providerControl = '<input type="text" value="No provider required" readonly><input type="hidden" data-pmd-r4-method-provider value="">';
    } else {
      providerControl = '<select data-pmd-r4-method-provider><option value="">Not offered</option>' + candidates.map(function (candidate) {
        return '<option value="' + esc(candidate) + '" ' + (method.provider_code === candidate ? 'selected' : '') + '>' + esc(providerLabel(candidate)) + '</option>';
      }).join('') + '</select>';
    }

    var runtime = state.paymob_runtime && state.paymob_runtime.methods ? state.paymob_runtime.methods[method.code] : null;
    var paymobBacked = candidates.indexOf('paymob') !== -1;
    var runtimeLocked = paymobBacked && !method.guest_runtime_ready;
    var readiness = paymobBacked
      ? (runtime && runtime.integration_configured ? 'Paymob Integration ID is configured.' : 'Paymob Integration ID is not configured yet.')
      : 'No provider connection is required.';
    if (runtimeLocked) readiness += ' Guest offering is still locked pending settlement sandbox QA.';

    var enabledAttr = runtimeLocked ? ' disabled data-pmd-r4-static-disabled="1"' : '';
    var html = '<div class="pmd-r4-grid">' +
      '<div class="pmd-r4-field full"><label>Payment method</label><input type="text" value="' + esc(method.label) + '" readonly></div>' +
      '<div class="pmd-r4-field full"><label>Provider</label>' + providerControl + '<small>' + esc(readiness) + '</small></div>' +
      '</div>' +
      '<div class="pmd-r4-divider"></div>' +
      '<div class="pmd-r4-toggle"><div><strong>Offer to guests</strong><small style="display:block;margin-top:3px;color:#72847e">' + (runtimeLocked ? 'Locked until Paymob checkout settlement passes sandbox QA.' : 'Disabled methods remain configured but are not offered.') + '</small></div><input type="checkbox" data-pmd-r4-method-enabled ' + (method.enabled ? 'checked' : '') + enabledAttr + '></div>' +
      '<div class="pmd-r4-actions"><span class="pmd-r4-status" data-pmd-r4-status></span><div class="pmd-r4-actions-right"><button type="button" class="pmd-r4-btn primary" data-pmd-r4-method-save="' + esc(method.code) + '">Save method</button></div></div>';

    openModal(method.label, html);
  }

  async function saveMethod(code) {
    if (busy) return;
    var providerField = modalBody.querySelector('[data-pmd-r4-method-provider]');
    var enabledField = modalBody.querySelector('[data-pmd-r4-method-enabled]');
    setBusy(true);
    setModalStatus('Saving…');
    try {
      var payload = await request('/admin/payment-market/methods/' + encodeURIComponent(code), {
        method: 'POST',
        body: JSON.stringify({
          provider_code: providerField ? String(providerField.value || '') : '',
          enabled: !!(enabledField && enabledField.checked && !enabledField.disabled)
        })
      });
      setModalStatus(payload.message || 'Saved', 'ok');
      await reload();
      setTimeout(function () { setBusy(false); closeModal(); }, 300);
      return;
    } catch (error) {
      setModalStatus(error.message || 'Could not save payment method.', 'error');
    }
    setBusy(false);
  }

  function bind() {
    document.addEventListener('click', function (event) {
      var paymob = event.target.closest('[data-pmd-r4-paymob]');
      if (paymob) { event.preventDefault(); openPaymob(); return; }
      var method = event.target.closest('[data-pmd-r4-method]');
      if (method) { event.preventDefault(); openMethod(method.getAttribute('data-pmd-r4-method')); return; }
      if (event.target.closest('[data-pmd-r4-paymob-save]')) { event.preventDefault(); savePaymob(); return; }
      if (event.target.closest('[data-pmd-r4-paymob-test]')) { event.preventDefault(); testPaymob(); return; }
      var save = event.target.closest('[data-pmd-r4-method-save]');
      if (save) { event.preventDefault(); saveMethod(save.getAttribute('data-pmd-r4-method-save')); }
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && modal && !modal.hidden) closeModal();
    });
  }

  async function mount() {
    if (!isFinance()) return;
    ensureStyle();
    bind();
    try {
      await reload();
      console.info('[PMD Finance Market R4]', {
        country: state.country_code,
        currency: state.currency && state.currency.code,
        providers: state.provider_codes,
        methods: (state.methods || []).map(function (m) { return m.code; }),
        paymobGuestRuntimeReady: state.paymob_guest_runtime_ready
      });
    } catch (error) {
      markFailed();
      console.error('[PMD Finance Market R4] failed', error);
    }
  }

  window.PMDFinanceMarketR4 = {
    version: '4.1.0',
    reload: reload,
    getState: function () { return state; },
    openPaymob: openPaymob
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once:true});
  else mount();
}());
