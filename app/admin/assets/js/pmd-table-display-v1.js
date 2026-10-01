(function () {
  'use strict';

  var root = document.querySelector('[data-pmd-table-display-v1]');
  if (!root || window.PMDTableDisplayV1) return;

  var boot = window.PMD_TABLE_DISPLAY_BOOT || {};
  var stateUrl = root.getAttribute('data-state-url') || '/admin/pmddevices/tabledisplaystate';
  var setupCodeUrl = root.getAttribute('data-setup-code-url') || '/admin/table-display/setup-code';
  var tableSelect = root.querySelector('[data-pmd-table-display-table]');
  var idle = root.querySelector('[data-pmd-table-display-idle]');
  var reaction = root.querySelector('[data-pmd-table-display-reaction]');
  var screen = root.querySelector('.pmd-table-display-screen');
  var qr = root.querySelector('[data-pmd-table-display-qr]');
  var logo = root.querySelector('[data-pmd-table-display-logo]');
  var restaurant = root.querySelector('[data-pmd-table-display-restaurant]');
  var tableLabel = root.querySelector('[data-pmd-table-display-table-label]');
  var reactionTable = root.querySelector('[data-pmd-table-display-reaction-table]');
  var reactionIcon = root.querySelector('[data-pmd-table-display-reaction-icon]');
  var reactionHeadline = root.querySelector('[data-pmd-table-display-reaction-headline]');
  var reactionMessage = root.querySelector('[data-pmd-table-display-reaction-message]');
  var reactionAmount = root.querySelector('[data-pmd-table-display-reaction-amount]');
  var reactionOrder = root.querySelector('[data-pmd-table-display-reaction-order]');
  var liveStatus = root.querySelector('[data-pmd-table-display-live-status]');
  var lastSync = root.querySelector('[data-pmd-table-display-last-sync]');
  var deviceState = root.querySelector('[data-pmd-table-display-device-state]');

  var selectedState = boot.selected || null;
  var simulationUntil = 0;
  var requestSerial = 0;
  var lastPresentedReactionKey = '';
  var liveReactionUntil = 0;

  function money(amount, currency) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: String(currency || 'EUR').toUpperCase()
      }).format(Number(amount || 0));
    } catch (error) {
      return Number(amount || 0).toFixed(2) + ' ' + String(currency || 'EUR');
    }
  }

  function setLive(ok, text) {
    if (!liveStatus) return;
    liveStatus.classList.toggle('is-offline', !ok);
    liveStatus.innerHTML = '<i></i>' + (text || (ok ? 'Live' : 'Offline'));
  }

  function renderIdentity(payload) {
    payload = payload || selectedState || {};
    var table = payload.table || {};
    var identity = payload.restaurant || boot.restaurant || {};
    if (tableLabel) tableLabel.textContent = table.name || ('Table ' + (table.number || ''));
    if (reactionTable) reactionTable.textContent = table.name || ('Table ' + (table.number || ''));
    if (qr && table.qr_image_url) qr.setAttribute('src', table.qr_image_url);
    if (restaurant) restaurant.textContent = identity.name || 'PayMyDine';
    if (logo && identity.logo) logo.setAttribute('src', identity.logo);
  }

  function renderEvent(event, payload) {
    event = event || {type: 'idle'};
    payload = payload || selectedState || {};
    renderIdentity(payload);

    var type = String(event.type || 'idle');
    var isIdle = type === 'idle';

    if (idle) idle.hidden = false;
    if (screen) screen.classList.toggle('has-reaction', !isIdle);
    if (reaction) {
      reaction.hidden = isIdle;
      reaction.className = 'pmd-table-display-reaction is-' + type;
    }
    if (deviceState) deviceState.textContent = isIdle ? 'QR ready' : String(event.headline || type).replace(/_/g, ' ');
    if (isIdle) return;

    if (reactionIcon) reactionIcon.textContent =
      type === 'waiter_call' ? '↟' :
      type === 'payment_requested' ? '▣' :
      type === 'table_unavailable' ? '×' : '✓';

    if (reactionHeadline) reactionHeadline.textContent = event.headline || 'PayMyDine';
    if (reactionMessage) reactionMessage.textContent = event.message || '';

    if (reactionAmount) {
      var hasAmount = Number(event.amount || 0) > 0;
      reactionAmount.hidden = !hasAmount;
      reactionAmount.textContent = hasAmount ? money(event.amount, event.currency) : '';
    }
    if (reactionOrder) {
      var orderId = Number(event.order_id || 0);
      reactionOrder.hidden = orderId < 1;
      reactionOrder.textContent = orderId > 0 ? ('Order #' + orderId) : '';
    }
  }

  function livePresentationEvent(event) {
    event = event || {type:'idle', key:'idle'};
    var type = String(event.type || 'idle');
    if (type === 'idle' || type === 'table_unavailable') return event;

    var key = String(event.key || (type + '-unknown'));
    var now = Date.now();

    if (key !== lastPresentedReactionKey) {
      lastPresentedReactionKey = key;
      liveReactionUntil = now + 3800;
      return event;
    }

    if (now < liveReactionUntil) return event;

    return {
      type:'idle',
      key:'idle',
      headline:'Scan to view the menu',
      message:''
    };
  }

  function simulate(type) {
    var order = (selectedState && selectedState.order) || {};
    var event = {type: type};

    if (type === 'order_received') {
      Object.assign(event, {headline:'Order received', message:'Your order was sent to the restaurant.', order_id:order.id || 184});
    } else if (type === 'waiter_call') {
      Object.assign(event, {headline:'Waiter called', message:'A team member has been notified.'});
    } else if (type === 'payment_requested') {
      Object.assign(event, {headline:'Ready to pay', message:'Tap or insert your card on the table display.', order_id:order.id || 184, amount:order.remaining_amount || order.total || 28.40, currency:'EUR'});
    } else if (type === 'payment_success') {
      Object.assign(event, {headline:'Payment approved', message:'Thank you. Your payment was received.', order_id:order.id || 184, amount:order.total || 28.40, currency:'EUR'});
    } else {
      event = {type:'idle'};
    }

    simulationUntil = type === 'idle' ? 0 : Date.now() + 6500;
    renderEvent(event, selectedState);
    if (type !== 'idle') {
      window.setTimeout(function () {
        if (Date.now() >= simulationUntil) {
          simulationUntil = 0;
          renderEvent((selectedState && selectedState.event) || {type:'idle'}, selectedState);
        }
      }, 6600);
    }
  }

  function csrf() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? String(meta.content || '') : '';
  }

  async function generateSetupCode() {
    var button = root.querySelector('[data-pmd-table-display-pair]');
    var box = root.querySelector('[data-pmd-table-display-setup-code]');
    var value = root.querySelector('[data-pmd-table-display-setup-code-value]');
    var expiry = root.querySelector('[data-pmd-table-display-setup-code-expiry]');
    var errorBox = root.querySelector('[data-pmd-table-display-setup-error]');

    if (!button || !tableSelect || !tableSelect.value) return;
    button.disabled = true;
    if (errorBox) {
      errorBox.hidden = true;
      errorBox.textContent = '';
    }

    try {
      var response = await fetch(setupCodeUrl, {
        method: 'POST',
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          'X-CSRF-TOKEN': csrf()
        },
        body: JSON.stringify({table_id: Number(tableSelect.value || 0)})
      });
      var payload = {};
      try { payload = await response.json(); } catch (ignored) {}
      if (!response.ok || payload.ok === false) {
        throw new Error(payload.message || payload.error || ('HTTP ' + response.status));
      }

      if (value) value.textContent = String(payload.code || '------');
      if (expiry) expiry.textContent = 'Valid for 10 minutes · enter once in the Android app';
      if (box) box.hidden = false;
    } catch (error) {
      if (errorBox) {
        errorBox.hidden = false;
        errorBox.textContent = (error && error.message) || 'Could not generate a setup code.';
      }
    } finally {
      button.disabled = false;
    }
  }

  async function refresh() {
    if (!tableSelect || !tableSelect.value) return;
    var serial = ++requestSerial;
    var url = new URL(stateUrl, window.location.origin);
    url.searchParams.set('table', tableSelect.value);
    url.searchParams.set('_', Date.now());

    try {
      var response = await fetch(url.toString(), {
        method:'GET',
        credentials:'same-origin',
        cache:'no-store',
        headers:{'Accept':'application/json','X-Requested-With':'XMLHttpRequest'}
      });
      if (!response.ok) throw new Error('HTTP ' + response.status);
      var payload = await response.json();
      if (serial !== requestSerial || !payload || payload.ok === false) return;

      selectedState = payload;
      renderIdentity(payload);
      if (Date.now() >= simulationUntil) renderEvent(livePresentationEvent(payload.event || {type:'idle'}), payload);
      setLive(true, 'Live');
      if (lastSync) lastSync.textContent = new Date().toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'});
    } catch (error) {
      setLive(false, 'Connection lost');
      if (deviceState) deviceState.textContent = 'Using last screen';
    }
  }

  if (tableSelect) {
    tableSelect.addEventListener('change', function () {
      simulationUntil = 0;
      lastPresentedReactionKey = '';
      liveReactionUntil = 0;
      var url = new URL(window.location.href);
      url.searchParams.set('table', tableSelect.value);
      window.history.replaceState({}, '', url.toString());
      refresh();
    });
  }

  var pairButton = root.querySelector('[data-pmd-table-display-pair]');
  if (pairButton) pairButton.addEventListener('click', generateSetupCode);

  root.querySelectorAll('[data-pmd-table-display-sim]').forEach(function (button) {
    button.addEventListener('click', function () {
      simulate(button.getAttribute('data-pmd-table-display-sim') || 'idle');
    });
  });

  if (selectedState) renderEvent(livePresentationEvent(selectedState.event || {type:'idle'}), selectedState);
  setLive(true, 'Live');
  refresh();
  window.setInterval(refresh, 2000);

  window.PMDTableDisplayV1 = {refresh:refresh, simulate:simulate, generateSetupCode:generateSetupCode};
})();