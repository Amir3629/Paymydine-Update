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

  if (window.PMDSumupSelfServiceV1) return;

  var state = {
    root: null,
    data: null,
    environment: null,
    busy: false,
    message: '',
    error: false
  };

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
      'Accept':'application/json',
      'Content-Type':'application/json',
      'X-Requested-With':'XMLHttpRequest',
      'X-CSRF-TOKEN':csrf()
    };
  }

  async function request(url, options) {
    var opts = Object.assign({
      credentials:'same-origin',
      cache:'no-store',
      headers:{
        'Accept':'application/json',
        'X-Requested-With':'XMLHttpRequest',
        'X-CSRF-TOKEN':csrf()
      }
    }, options || {});

    var response = await fetch(url, opts);
    var json = await response.json().catch(function () { return {}; });

    if (!response.ok || json.success === false) {
      var error = new Error(String(json.message || json.error || ('HTTP ' + response.status)));
      error.status = response.status;
      error.payload = json;
      throw error;
    }

    return json;
  }

  function chooseEnvironment() {
    if (!state.data) return null;
    var environments = state.data.environments || {};
    var active = state.data.active_environment || null;

    if (active && environments[active] && environments[active].connection_status === 'connected') {
      return active;
    }

    if (environments.test && environments.test.connection_status === 'connected') return 'test';
    if (environments.production && environments.production.connection_status === 'connected') return 'production';

    return active || 'test';
  }

  function current() {
    var environments = state.data && state.data.environments ? state.data.environments : {};
    var key = state.environment || chooseEnvironment() || 'test';

    return environments[key] || {
      environment:key,
      configured:false,
      connection_status:'not_configured',
      terminals:[]
    };
  }

  function statusLabel(snapshot) {
    if (snapshot.connection_status === 'connected') return settingsText('Connected');
    if (snapshot.connection_status === 'error') return settingsText('Needs attention');
    if (snapshot.configured) return settingsText('Connection not tested');
    return settingsText('Not connected');
  }

  function environmentLabel(snapshot) {
    var name = settingsText(state.environment === 'production' ? 'Production' : 'Test');
    var merchant = String(snapshot && snapshot.merchant_code ? snapshot.merchant_code : '').trim();
    return name + ' ' + settingsText('environment') + (merchant ? ' · ' + settingsText('Merchant') + ' ' + merchant : '');
  }

  function normalizePairingCode(value) {
    return String(value || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  }

  function pairPanel() {
    return [
      '<section class="pmd-sumup-panel pmd-sumup-pair-panel" data-pmd-sumup-pair-section>',
        '<div class="pmd-sumup-panel-head">',
          '<div>',
            '<b>' + settingsHtml('Add terminal') + '</b>',
            '<span>' + settingsHtml('Enter the temporary Cloud API pairing code shown on the Solo.') + '</span>',
          '</div>',
        '</div>',
        '<div class="pmd-sumup-pair">',
          '<label><span>' + settingsHtml('Pairing code') + '</span><input data-sumup-pair-code maxlength="18" placeholder="XXXXXXXXX" autocomplete="off" autocapitalize="characters" spellcheck="false"></label>',
          '<label><span>' + settingsHtml('Terminal name (optional)') + '</span><input data-sumup-pair-label maxlength="191" placeholder="Front Desk, Bar, Terrace…" autocomplete="off"></label>',
          '<button type="button" class="is-primary" data-sumup-pair ' + (state.busy ? 'disabled' : '') + '>' + settingsHtml('Pair terminal') + '</button>',
        '</div>',
      '</section>'
    ].join('');
  }

  function terminalRow(terminal) {
    var online = !!terminal.online;

    return [
      '<article class="pmd-sumup-terminal">',
        '<div class="pmd-sumup-terminal-icon">▣</div>',
        '<div class="pmd-sumup-terminal-copy">',
          '<b>' + esc(terminal.label || settingsText('SumUp terminal')) + '</b>',
          '<span class="' + (online ? 'is-online' : 'is-offline') + '"><i></i>' +
            (online ? settingsHtml('Online') : settingsHtml(String(terminal.status || 'Offline').toLowerCase())) +
          '</span>',
        '</div>',
        '<div class="pmd-sumup-terminal-actions">',
          '<button type="button" data-sumup-terminal-test="' + esc(terminal.terminal_device_id) + '" ' + (state.busy ? 'disabled' : '') + '>' + settingsHtml('Test') + '</button>',
          '<button type="button" class="is-danger" data-sumup-terminal-remove="' + esc(terminal.terminal_device_id) + '" ' + (state.busy ? 'disabled' : '') + '>' + settingsHtml('Remove') + '</button>',
        '</div>',
      '</article>'
    ].join('');
  }

  function terminalList(terminals) {
    return [
      '<section class="pmd-sumup-panel pmd-sumup-terminal-list-panel">',
        '<div class="pmd-sumup-panel-head">',
          '<div><b>' + settingsHtml('Terminals') + '</b><span>' + settingsHtml('Cashiers and Waiters can choose between these terminals when more than one is available.') + '</span></div>',
        '</div>',
        terminals.length
          ? '<div class="pmd-sumup-terminals">' + terminals.map(terminalRow).join('') + '</div>'
          : '<div class="pmd-sumup-empty">' + settingsHtml('No terminal paired in this environment yet.') + '</div>',
      '</section>'
    ].join('');
  }

  function disconnectedPanel() {
    return [
      '<section class="pmd-sumup-panel is-muted">',
        '<div class="pmd-sumup-panel-head">',
          '<div>',
            '<b>' + settingsHtml('Connect SumUp first') + '</b>',
            '<span>' + settingsHtml('Provider credentials are managed under Payments & finance.') + '</span>',
          '</div>',
        '</div>',
        '<div class="pmd-sumup-actions">',
          '<a class="is-primary" href="/admin/pmdfinance#payment-providers">' + settingsHtml('Manage SumUp connection') + '</a>',
        '</div>',
      '</section>'
    ].join('');
  }

  function render() {
    if (!state.root) return;

    if (!state.data) {
      state.root.innerHTML = '<div class="pmd-sumup-loading">' + settingsHtml('Loading terminal settings…') + '</div>';
      return;
    }

    state.environment = chooseEnvironment();

    var cfg = current();
    var connected = cfg.connection_status === 'connected';
    var terminals = Array.isArray(cfg.terminals) ? cfg.terminals : [];

    state.root.innerHTML = [
      '<div class="pmd-sumup-head">',
        '<div>',
          '<span class="pmd-sumup-kicker">' + settingsHtml('PAYMENT TERMINALS') + '</span>',
          '<h2>' + settingsHtml('SumUp terminals') + '</h2>',
          '<span class="pmd-sumup-head-meta">' + esc(environmentLabel(cfg)) + '</span>',
        '</div>',
        '<div class="pmd-sumup-state ' + (connected ? 'is-good' : '') + '"><span></span>' + esc(statusLabel(cfg)) + '</div>',
      '</div>',
      state.message ? '<div class="pmd-sumup-message ' + (state.error ? 'is-error' : 'is-success') + '">' + esc(state.message) + '</div>' : '',
      connected ? '' : disconnectedPanel(),
      connected ? pairPanel() : '',
      connected ? terminalList(terminals) : ''
    ].join('');

    bind();
  }

  function bind() {
    var pair = state.root.querySelector('[data-sumup-pair]');
    if (pair) pair.onclick = pairTerminal;

    state.root.querySelectorAll('[data-sumup-terminal-test]').forEach(function (button) {
      button.onclick = function () {
        testTerminal(Number(button.dataset.sumupTerminalTest));
      };
    });

    state.root.querySelectorAll('[data-sumup-terminal-remove]').forEach(function (button) {
      button.onclick = function () {
        removeTerminal(Number(button.dataset.sumupTerminalRemove));
      };
    });
  }

  function setBusyControls(disabled) {
    if (!state.root) return;
    state.root.querySelectorAll('[data-sumup-pair],[data-sumup-terminal-test],[data-sumup-terminal-remove]').forEach(function (button) {
      button.disabled = !!disabled;
    });
  }

  async function act(fn) {
    if (state.busy) return;

    state.busy = true;
    state.message = '';
    state.error = false;
    setBusyControls(true);

    try {
      await fn();
    } catch (error) {
      state.message = settingsText(error && error.message ? error.message : 'Terminal request failed.');
      state.error = true;
    } finally {
      state.busy = false;
      render();
    }
  }

  async function pairTerminal() {
    var codeInput = state.root.querySelector('[data-sumup-pair-code]');
    var labelInput = state.root.querySelector('[data-sumup-pair-label]');
    var pairingCode = normalizePairingCode(codeInput ? codeInput.value : '');
    var terminalLabel = labelInput ? String(labelInput.value || '').trim() : '';

    if (!/^[A-Z0-9]{8,9}$/.test(pairingCode)) {
      state.message = settingsText('Enter the 8 or 9 character pairing code shown on the Solo.');
      state.error = true;
      render();
      var nextInput = state.root.querySelector('[data-sumup-pair-code]');
      if (nextInput) nextInput.focus();
      return;
    }

    await act(async function () {
      var json = await request('/admin/pmddevices/sumup/readers/pair', {
        method:'POST',
        headers:jsonHeaders(),
        body:JSON.stringify({
          environment:state.environment,
          pairing_code:pairingCode,
          label:terminalLabel || 'SumUp terminal'
        })
      });

      state.data = json.state;
      state.message = settingsText(json.message || 'Terminal paired.');
    });
  }

  async function testTerminal(id) {
    await act(async function () {
      var json = await request('/admin/pmddevices/sumup/readers/' + encodeURIComponent(String(id)) + '/test', {
        method:'POST',
        headers:jsonHeaders(),
        body:'{}'
      });

      state.data = json.state;
      state.message = settingsText(json.message || 'Terminal tested.');
    });
  }

  async function removeTerminal(id) {
    if (!window.confirm(settingsText('Remove this SumUp terminal from PayMyDine?'))) return;

    await act(async function () {
      var json = await request('/admin/pmddevices/sumup/readers/' + encodeURIComponent(String(id)), {
        method:'DELETE',
        headers:jsonHeaders(),
        body:'{}'
      });

      state.data = json.state;
      state.message = settingsText(json.message || 'Terminal removed.');
    });
  }

  async function reconcileConnectedReaders() {
    var cfg = current();
    if (!cfg || cfg.connection_status !== 'connected') return;

    try {
      var json = await request('/admin/pmddevices/sumup/readers/sync', {
        method:'POST',
        headers:jsonHeaders(),
        body:JSON.stringify({environment:state.environment})
      });
      if (json && json.state) state.data = json.state;
      state.message = '';
      state.error = false;
    } catch (error) {
      // Environment/auth problems are product configuration problems, not
      // transient reader noise. Surface them immediately so the restaurant
      // does not waste fresh five-minute pairing codes on the wrong merchant.
      state.message = settingsText(error && error.message ? error.message : 'Could not verify the SumUp terminal environment.');
      state.error = true;
    }
  }

  async function load() {
    try {
      var json = await request('/admin/pmddevices/sumup/state');
      state.data = json.state;
      state.environment = chooseEnvironment();
      await reconcileConnectedReaders();
      state.environment = chooseEnvironment();
      render();
    } catch (error) {
      state.root.innerHTML = '<div class="pmd-sumup-message is-error">' + esc(settingsText(error && error.message ? error.message : 'Could not load terminal settings.')) + '</div>';
    }
  }

  function focusPairing() {
    var input = document.querySelector('[data-sumup-pair-code]');
    var section = document.querySelector('[data-pmd-sumup-pair-section]');

    if (section && section.scrollIntoView) {
      section.scrollIntoView({behavior:'smooth', block:'center'});
    }

    if (input) {
      window.setTimeout(function () { input.focus(); }, 250);
      return;
    }

    window.location.href = '/admin/pmdfinance#payment-providers';
  }

  function guardLegacyTerminalEditor(event) {
    if (!/^\/admin\/pmddevices(?:\/|$)/.test((window.PMDAdminCanonicalURLR81E ? window.PMDAdminCanonicalURLR81E.logicalPath() : location.pathname))) return;

    var trigger = event.target && event.target.closest
      ? event.target.closest('[data-pmd-device-open]')
      : null;

    if (!trigger) return;

    var action = String(trigger.getAttribute('data-pmd-device-open') || '');
    if (action.indexOf('terminals:') !== 0) return;

    event.preventDefault();
    event.stopPropagation();
    if (event.stopImmediatePropagation) event.stopImmediatePropagation();

    focusPairing();
  }

  function mount() {
    if (!/^\/admin\/pmddevices(?:\/|$)/.test((window.PMDAdminCanonicalURLR81E ? window.PMDAdminCanonicalURLR81E.logicalPath() : location.pathname))) return;

    var section = document.getElementById('payment-terminals');
    if (!section) return;

    var card = section.querySelector('.pmd-owner-card');
    if (!card || card.dataset.pmdSumupSelfService === '1') return;

    card.dataset.pmdSumupSelfService = '1';
    card.classList.add('pmd-sumup-self-service');
    card.innerHTML = '<div class="pmd-sumup-app" data-pmd-sumup-app></div>';
    state.root = card.querySelector('[data-pmd-sumup-app]');
    load();
  }

  document.addEventListener('click', guardLegacyTerminalEditor, true);

  window.PMDSumupSelfServiceV1 = {
    mount:mount,
    reload:load,
    focusPairing:focusPairing
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount);
  } else {
    mount();
  }
})();
