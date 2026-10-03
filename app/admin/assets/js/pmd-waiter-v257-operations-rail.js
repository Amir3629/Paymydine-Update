(function () {
  'use strict';

  if (window.PMDWaiterV257OperationsRail) return;
  window.PMDWaiterV257OperationsRail = true;

  var root = document.querySelector('[data-pmd-waiter-v2-root]');
  if (!root) return;

  var state = {
    action: '',
    desiredStatus: ''
  };

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function original(selector) {
    return root.querySelector(selector) || document.querySelector(selector);
  }

  function ensureMessage() {
    var node = document.querySelector('.v257-selection-message');
    if (node) return node;

    node = document.createElement('div');
    node.className = 'v257-selection-message';
    document.body.appendChild(node);
    return node;
  }

  function message(text) {
    var node = ensureMessage();
    node.textContent = text;
    node.classList.toggle('is-open', !!text);
  }

  function ensureRail() {
    var rail = document.querySelector('.v257-operations-rail');
    if (rail) return rail;

    rail = document.createElement('aside');
    rail.className = 'v257-operations-rail';
    rail.setAttribute('aria-label', 'Table operations');
    rail.innerHTML =
      '<button type="button" class="v257-operation" data-v257-action="available">' +
        '<strong>SET AVAILABLE</strong><i></i>' +
      '</button>' +
      '<button type="button" class="v257-operation" data-v257-action="cleaning">' +
        '<strong>NEEDS CLEANING</strong><i></i>' +
      '</button>' +
      '<button type="button" class="v257-operation" data-v257-action="merge">' +
        '<strong>MERGE TABLES</strong><i></i>' +
      '</button>' +
      '<button type="button" class="v257-operation" data-v257-action="transfer">' +
        '<strong>TRANSFER</strong><i></i>' +
      '</button>' +
      '<button type="button" class="v257-operation" data-v257-action="theme">' +
        '<strong>MODE</strong><i></i>' +
      '</button>' +
      '<button type="button" class="v257-operation" data-v257-action="alerts">' +
        '<strong>NOTIFICATIONS</strong><em class="v257-alert-count">0</em>' +
      '</button>';

    document.body.appendChild(rail);

    rail.addEventListener('click', function (event) {
      var button = event.target.closest('[data-v257-action]');
      if (!button) return;
      activate(button.getAttribute('data-v257-action') || '');
    });

    return rail;
  }

  function clearActive() {
    state.action = '';
    state.desiredStatus = '';
    document.body.classList.remove('v257-selecting');
    message('');

    document.querySelectorAll('.v257-operation.is-active').forEach(function (node) {
      node.classList.remove('is-active');
    });
  }

  function setActive(action) {
    clearActive();
    state.action = action;

    var button = document.querySelector(
      '.v257-operation[data-v257-action="' + action + '"]'
    );
    if (button) button.classList.add('is-active');
  }

  function activate(action) {
    if (action === 'theme') {
      var toggle = original('[data-v221-theme-toggle]');
      if (toggle) toggle.click();
      return;
    }

    if (action === 'alerts') {
      var alerts = original('[data-v2-alerts]');
      if (alerts) alerts.click();
      return;
    }

    if (action === 'merge' || action === 'transfer') {
      setActive(action);

      var old = original(
        '.v243-ops-controls [data-v243-mode="' + action + '"]'
      );

      if (old) {
        old.click();
        message(
          action === 'merge'
            ? 'SELECT THE FIRST TABLE FOR MERGE'
            : 'SELECT THE TABLE TO TRANSFER'
        );
      }

      return;
    }

    if (action === 'available' || action === 'cleaning') {
      setActive(action);
      state.desiredStatus = action;
      document.body.classList.add('v257-selecting');
      message(
        action === 'available'
          ? 'SELECT A TABLE TO MARK AVAILABLE'
          : 'SELECT A TABLE THAT NEEDS CLEANING'
      );
    }
  }

  function clickDesiredStatus(card) {
    var hiddenStatus = card.querySelector('.v241-status-btn');

    if (!hiddenStatus) {
      window.alert('Table status controls are still loading. Please try again.');
      clearActive();
      return;
    }

    hiddenStatus.click();

    var attempts = 0;
    var timer = setInterval(function () {
      attempts += 1;

      var button = document.querySelector(
        '.v241-drawer [data-status="' + state.desiredStatus + '"]'
      );

      if (button) {
        clearInterval(timer);
        button.click();
        clearActive();
        return;
      }

      if (attempts > 12) {
        clearInterval(timer);
        clearActive();
        window.alert('Could not open the requested table status action.');
      }
    }, 50);
  }

  root.addEventListener('click', function (event) {
    if (!state.desiredStatus) return;

    var card = event.target.closest('[data-v2-open-table]');
    if (!card || !root.contains(card)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    clickDesiredStatus(card);
  }, true);

  function syncAlertCount() {
    var source = original('[data-v2-alert-count]');
    var target = document.querySelector('.v257-alert-count');
    if (!target) return;

    var count = clean(source && source.textContent) || '0';
    target.textContent = count;
  }

  function syncOperationMode() {
    var active = document.querySelector('.v243-ops-controls button.is-active');
    if (!active && (state.action === 'merge' || state.action === 'transfer')) {
      clearActive();
    }
  }

  ensureRail();
  ensureMessage();
  syncAlertCount();

  setInterval(function () {
    syncAlertCount();
    syncOperationMode();
  }, 500);

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') clearActive();
  });

  console.info('[PMD] Waiter V2.5.7 payment/calls/right-rail active');
})();
