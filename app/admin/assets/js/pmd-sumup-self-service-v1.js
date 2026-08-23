(function () {
  'use strict';

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
      throw new Error(String(json.message || json.error || ('HTTP ' + response.status)));
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
    if (snapshot.connection_status === 'connected') return 'Connected';
    if (snapshot.connection_status === 'error') return 'Needs attention';
    if (snapshot.configured) return 'Connection not tested';
    return 'Not connected';
  }

  function pairPanel() {
    return [
      '<section class="pmd-sumup-panel" data-pmd-sumup-pair-section>',
        '<div class="pmd-sumup-panel-head">',
          '<div>',
            '<b>Add terminal</b>',
            '<span>Open Cloud API on the terminal and enter its temporary pairing code. PayMyDine stores the real Reader ID automatically.</span>',
          '</div>',
        '</div>',
        '<div class="pmd-sumup-pair">',
          '<label><span>Pairing code</span><input data-sumup-pair-code maxlength="9" placeholder="XXXXXXXXX" autocomplete="off"></label>',
          '<label><span>Terminal name (optional)</span><input data-sumup-pair-label maxlength="191" placeholder="Front Desk, Bar, Terrace…" autocomplete="off"></label>',
          '<button type="button" class="is-primary" data-sumup-pair ' + (state.busy ? 'disabled' : '') + '>Pair terminal</button>',
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
          '<b>' + esc(terminal.label || 'SumUp terminal') + '</b>',
          '<span class="' + (online ? 'is-online' : 'is-offline') + '"><i></i>' +
            (online ? 'Online' : esc(String(terminal.status || 'Offline').toLowerCase())) +
          '</span>',
        '</div>',
        '<div class="pmd-sumup-terminal-actions">',
          '<button type="button" data-sumup-terminal-test="' + esc(terminal.terminal_device_id) + '" ' + (state.busy ? 'disabled' : '') + '>Test</button>',
          '<button type="button" class="is-danger" data-sumup-terminal-remove="' + esc(terminal.terminal_device_id) + '" ' + (state.busy ? 'disabled' : '') + '>Remove</button>',
        '</div>',
      '</article>'
    ].join('');
  }

  function terminalList(terminals) {
    return [
      '<section class="pmd-sumup-panel">',
        '<div class="pmd-sumup-panel-head">',
          '<div><b>Terminals</b><span>Cashiers can choose between these terminals when more than one is available.</span></div>',
        '</div>',
        terminals.length
          ? '<div class="pmd-sumup-terminals">' + terminals.map(terminalRow).join('') + '</div>'
          : '<div class="pmd-sumup-empty">No terminal paired in this environment yet.</div>',
      '</section>'
    ].join('');
  }

  function connectionPanel(snapshot) {
    var connected = snapshot.connection_status === 'connected';
    var environmentLabel = state.environment === 'production' ? 'Production' : 'Test';

    if (!connected) {
      return [
        '<section class="pmd-sumup-panel is-muted">',
          '<div class="pmd-sumup-panel-head">',
            '<div>',
              '<b>Connect SumUp first</b>',
              '<span>Provider credentials belong in Payments & finance. Devices only manages terminal hardware.</span>',
            '</div>',
          '</div>',
          '<div class="pmd-sumup-actions">',
            '<a class="is-primary" href="/admin/pmdfinance#payment-providers">Manage SumUp connection</a>',
          '</div>',
        '</section>'
      ].join('');
    }

    return [
      '<section class="pmd-sumup-panel pmd-sumup-connection-summary">',
        '<div class="pmd-sumup-panel-head">',
          '<div>',
            '<b>SumUp connection</b>',
            '<span>' + esc(environmentLabel) + ' environment · Merchant ' + esc(snapshot.merchant_code || 'connected') + '</span>',
          '</div>',
          '<em>Ready</em>',
        '</div>',
        '<div class="pmd-sumup-actions">',
          '<a href="/admin/pmdfinance#payment-providers">Manage provider connection</a>',
        '</div>',
      '</section>'
    ].join('');
  }

  function render() {
    if (!state.root) return;

    if (!state.data) {
      state.root.innerHTML = '<div class="pmd-sumup-loading">Loading terminal settings…</div>';
      return;
    }

    state.environment = chooseEnvironment();

    var cfg = current();
    var connected = cfg.connection_status === 'connected';
    var terminals = Array.isArray(cfg.terminals) ? cfg.terminals : [];

    state.root.innerHTML = [
      '<div class="pmd-sumup-head">',
        '<div>',
          '<span class="pmd-sumup-kicker">PAYMENT TERMINALS</span>',
          '<h2>SumUp terminals</h2>',
          '<p>Pair and test this restaurant’s terminal devices here. Account credentials are managed once under Payments & finance.</p>',
        '</div>',
        '<div class="pmd-sumup-state ' + (connected ? 'is-good' : '') + '"><span></span>' + esc(statusLabel(cfg)) + '</div>',
      '</div>',
      state.message ? '<div class="pmd-sumup-message ' + (state.error ? 'is-error' : 'is-success') + '">' + esc(state.message) + '</div>' : '',
      connectionPanel(cfg),
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

  async function act(fn) {
    if (state.busy) return;

    state.busy = true;
    state.message = '';
    state.error = false;
    render();

    try {
      await fn();
    } catch (error) {
      state.message = error.message || 'Terminal request failed.';
      state.error = true;
    } finally {
      state.busy = false;
      render();
    }
  }

  async function pairTerminal() {
    var code = state.root.querySelector('[data-sumup-pair-code]');
    var label = state.root.querySelector('[data-sumup-pair-label]');

    await act(async function () {
      var json = await request('/admin/pmddevices/sumup/readers/pair', {
        method:'POST',
        headers:jsonHeaders(),
        body:JSON.stringify({
          environment:state.environment,
          pairing_code:code ? String(code.value || '').trim().toUpperCase() : '',
          label:(label ? String(label.value || '').trim() : '') || 'SumUp terminal'
        })
      });

      state.data = json.state;
      state.message = json.message || 'Terminal paired.';
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
      state.message = json.message || 'Terminal tested.';
    });
  }

  async function removeTerminal(id) {
    if (!window.confirm('Remove this SumUp terminal from PayMyDine?')) return;

    await act(async function () {
      var json = await request('/admin/pmddevices/sumup/readers/' + encodeURIComponent(String(id)), {
        method:'DELETE',
        headers:jsonHeaders(),
        body:'{}'
      });

      state.data = json.state;
      state.message = json.message || 'Terminal removed.';
    });
  }

  async function load() {
    try {
      var json = await request('/admin/pmddevices/sumup/state');
      state.data = json.state;
      state.environment = chooseEnvironment();
      render();
    } catch (error) {
      state.root.innerHTML = '<div class="pmd-sumup-message is-error">' + esc(error.message || 'Could not load terminal settings.') + '</div>';
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
    if (!/^\/admin\/pmddevices(?:\/|$)/.test(location.pathname)) return;

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
    if (!/^\/admin\/pmddevices(?:\/|$)/.test(location.pathname)) return;

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
