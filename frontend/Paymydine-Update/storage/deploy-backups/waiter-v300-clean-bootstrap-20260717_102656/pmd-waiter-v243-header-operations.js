(function () {
  'use strict';

  if (window.PMDWaiterV243HeaderOperations) return;
  window.PMDWaiterV243HeaderOperations = true;

  var root = document.querySelector('[data-pmd-waiter-v2-root]');
  if (!root) return;

  var OPS_URL = '/admin/dashboardwaiter-final-operations';

  var state = {
    mode: '',
    selectedCard: null
  };

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function ensureControls() {
    var existing = document.querySelector('.v243-ops-controls');
    if (existing) return existing;

    var topActions = root.querySelector('.pmd-v2-top-actions');
    if (!topActions) return null;

    var controls = document.createElement('div');
    controls.className = 'v243-ops-controls';
    controls.innerHTML =
      '<button type="button" data-v243-mode="status">TABLE STATUS</button>' +
      '<button type="button" data-v243-mode="merge">MERGE TABLES</button>' +
      '<button type="button" data-v243-mode="transfer">TRANSFER</button>';

    topActions.insertBefore(controls, topActions.firstChild);

    controls.querySelectorAll('[data-v243-mode]').forEach(function (button) {
      button.addEventListener('click', function () {
        var mode = button.getAttribute('data-v243-mode') || '';

        if (state.mode === mode) {
          cancelMode();
          return;
        }

        activateMode(mode);
      });
    });

    return controls;
  }

  function ensureSelectionBar() {
    var bar = document.querySelector('.v243-selection-bar');
    if (bar) return bar;

    bar = document.createElement('div');
    bar.className = 'v243-selection-bar';
    bar.innerHTML =
      '<div>' +
        '<strong data-v243-selection-title>SELECT A TABLE</strong>' +
        '<span data-v243-selection-help>Click a table to continue.</span>' +
      '</div>' +
      '<button type="button" aria-label="Cancel">×</button>';

    document.body.appendChild(bar);

    bar.querySelector('button').addEventListener('click', cancelMode);
    return bar;
  }

  function modeTitle(mode) {
    if (mode === 'merge') return 'SELECT SOURCE TABLE FOR MERGE';
    if (mode === 'transfer') return 'SELECT TABLE TO TRANSFER';
    return 'SELECT TABLE TO CHANGE STATUS';
  }

  function modeHelp(mode) {
    if (mode === 'merge') {
      return 'Choose the occupied table whose order should be merged.';
    }

    if (mode === 'transfer') {
      return 'Choose the table whose order should be transferred.';
    }

    return 'Choose any table to manage Available, Occupied, Cleaning or Reserved.';
  }

  function activateMode(mode) {
    state.mode = mode;

    var controls = ensureControls();
    var bar = ensureSelectionBar();

    controls.querySelectorAll('[data-v243-mode]').forEach(function (button) {
      button.classList.toggle(
        'is-active',
        button.getAttribute('data-v243-mode') === mode
      );
    });

    bar.querySelector('[data-v243-selection-title]').textContent = modeTitle(mode);
    bar.querySelector('[data-v243-selection-help]').textContent = modeHelp(mode);
    bar.classList.add('is-open');

    document.body.classList.add('v243-selecting-table');
  }

  function cancelMode() {
    state.mode = '';
    state.selectedCard = null;

    var controls = document.querySelector('.v243-ops-controls');
    var bar = document.querySelector('.v243-selection-bar');

    if (controls) {
      controls.querySelectorAll('[data-v243-mode]').forEach(function (button) {
        button.classList.remove('is-active');
      });
    }

    if (bar) bar.classList.remove('is-open');
    document.body.classList.remove('v243-selecting-table');
  }

  function triggerStatus(card) {
    /*
     * V2.4.1 created the lifecycle drawer and attached the reliable click
     * handler to this hidden button. Trigger it programmatically.
     */
    var button = card.querySelector('.v241-status-btn');

    if (button) {
      button.click();
      return true;
    }

    return false;
  }

  function ensureWorkspace() {
    var workspace = document.querySelector('.v243-workspace');
    if (workspace) return workspace;

    workspace = document.createElement('section');
    workspace.className = 'v243-workspace';
    workspace.innerHTML =
      '<header class="v243-workspace-head">' +
        '<div>' +
          '<strong data-v243-workspace-title>TABLE OPERATIONS</strong>' +
          '<small data-v243-workspace-subtitle></small>' +
        '</div>' +
        '<button type="button" aria-label="Close">×</button>' +
      '</header>' +
      '<iframe title="Table operations"></iframe>';

    document.body.appendChild(workspace);

    workspace.querySelector('button').addEventListener('click', function () {
      workspace.classList.remove('is-open');
      workspace.querySelector('iframe').src = 'about:blank';
      document.body.style.overflow = '';
    });

    return workspace;
  }

  function openOperation(card, mode) {
    var tableId = clean(card.getAttribute('data-v2-open-table'));
    var tableNumber =
      clean(card.getAttribute('data-v21-number')) ||
      clean((card.querySelector('strong') || {}).textContent) ||
      tableId;

    var workspace = ensureWorkspace();
    var separator = OPS_URL.indexOf('?') === -1 ? '?' : '&';

    var url = OPS_URL + separator +
      'table=' + encodeURIComponent(tableId) +
      '&table_number=' + encodeURIComponent(tableNumber) +
      '&action=' + encodeURIComponent(mode);

    workspace.querySelector('[data-v243-workspace-title]').textContent =
      mode === 'merge' ? 'MERGE TABLES' : 'TRANSFER TABLE';

    workspace.querySelector('[data-v243-workspace-subtitle]').textContent =
      'SOURCE TABLE ' + tableNumber;

    workspace.querySelector('iframe').src = url;
    workspace.classList.add('is-open');
    document.body.style.overflow = 'hidden';
  }

  function handleTableClick(event) {
    if (!state.mode) return;

    var card = event.target.closest('[data-v2-open-table]');
    if (!card || !root.contains(card)) return;

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    var mode = state.mode;
    cancelMode();

    if (mode === 'status') {
      if (!triggerStatus(card)) {
        /*
         * Wait briefly if the safe lifecycle layer is still decorating a
         * freshly rendered card.
         */
        setTimeout(function () {
          if (!triggerStatus(card)) {
            window.alert('Table status controls are still loading. Please try again.');
          }
        }, 120);
      }

      return;
    }

    openOperation(card, mode);
  }

  function removeCardActions() {
    root.querySelectorAll('.v242-card-actions').forEach(function (node) {
      node.remove();
    });
  }

  ensureControls();
  ensureSelectionBar();
  removeCardActions();

  /*
   * Capture phase ensures operation mode wins before the normal card click
   * opens the POS page.
   */
  root.addEventListener('click', handleTableClick, true);

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && state.mode) cancelMode();
  });

  /*
   * V2.4.2 may add direct controls when cards are refreshed. Remove them
   * without observing or rewriting the cards.
   */
  setInterval(removeCardActions, 1200);

  console.info('[PMD] Waiter V2.4.3 header table operations active');
})();
