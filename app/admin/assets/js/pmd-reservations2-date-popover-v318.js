(function () {
  'use strict';

  var ROOT_ID = 'pmd-reservations2';
  var HEADER_ID = 'pmd-r2-clean-header';
  var WRAP_ID = 'pmd-r2-date-popover-v318';
  var BUTTON_ID = 'pmd-r2-date-button-v318';
  var PANEL_ID = 'pmd-r2-date-panel-v318';
  var applying = false;

  function textOf(node) {
    return String(node && node.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function findRangePanel() {
    var root = document.getElementById(ROOT_ID);
    if (!root) return null;

    var candidates = Array.prototype.slice.call(root.querySelectorAll('div,section,form'));
    return candidates.find(function (node) {
      var text = textOf(node);
      var buttons = node.querySelectorAll('button');
      var inputs = node.querySelectorAll('input[type="date"], input');
      return buttons.length >= 4 && inputs.length >= 2 &&
        text.indexOf('Today') !== -1 &&
        text.indexOf('Tomorrow') !== -1 &&
        text.indexOf('7 days') !== -1 &&
        text.indexOf('This month') !== -1 &&
        text.indexOf('FROM') !== -1 &&
        text.indexOf('TO') !== -1;
    }) || null;
  }

  function findSummary(panel) {
    if (!panel) return null;
    var children = Array.prototype.slice.call(panel.querySelectorAll('button,div,span,strong'));
    return children.find(function (node) {
      var text = textOf(node);
      return /\d{4}/.test(text) && (text.indexOf('All tables') !== -1 || text.indexOf('Table ') !== -1);
    }) || null;
  }

  function findHeaderActions(header) {
    if (!header) return null;
    return header.querySelector('.pmd-r2__hero-actions, .pmd-r2-clean-header__actions, [data-pmd-header-actions]') ||
      Array.prototype.slice.call(header.querySelectorAll('div')).find(function (node) {
        return node.querySelectorAll('a,button').length >= 2;
      }) || header;
  }

  function labelFromPanel(panel) {
    var summary = findSummary(panel);
    if (summary) return textOf(summary);
    var inputs = panel ? panel.querySelectorAll('input') : [];
    if (inputs.length >= 2) {
      return (inputs[0].value || 'From') + ' – ' + (inputs[1].value || 'To');
    }
    return 'Date range';
  }

  function close() {
    var wrap = document.getElementById(WRAP_ID);
    var button = document.getElementById(BUTTON_ID);
    if (wrap) wrap.classList.remove('is-open');
    if (button) button.setAttribute('aria-expanded', 'false');
  }

  function open() {
    var wrap = document.getElementById(WRAP_ID);
    var button = document.getElementById(BUTTON_ID);
    if (wrap) wrap.classList.add('is-open');
    if (button) button.setAttribute('aria-expanded', 'true');
  }

  function createShell(header, panel) {
    var actions = findHeaderActions(header);
    if (!actions) return null;

    var existing = document.getElementById(WRAP_ID);
    if (existing) return existing;

    var wrap = document.createElement('div');
    wrap.id = WRAP_ID;
    wrap.className = 'pmd-r2-date-popover-v318';

    var button = document.createElement('button');
    button.type = 'button';
    button.id = BUTTON_ID;
    button.className = 'pmd-r2-date-trigger-v318';
    button.setAttribute('aria-haspopup', 'dialog');
    button.setAttribute('aria-expanded', 'false');
    button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="5" width="18" height="16" rx="2"></rect><path d="M16 3v4M8 3v4M3 11h18"></path></svg><span>Date</span>';

    var card = document.createElement('div');
    card.id = PANEL_ID;
    card.className = 'pmd-r2-date-card-v318';
    card.setAttribute('role', 'dialog');
    card.setAttribute('aria-label', 'Reservation date range');

    var head = document.createElement('div');
    head.className = 'pmd-r2-date-card-head-v318';
    head.innerHTML = '<div><strong>Reservation period</strong><span>Choose a quick range or custom dates</span></div><button type="button" aria-label="Close">×</button>';
    head.querySelector('button').addEventListener('click', close);

    var body = document.createElement('div');
    body.className = 'pmd-r2-date-card-body-v318';
    body.appendChild(panel);

    card.appendChild(head);
    card.appendChild(body);
    wrap.appendChild(button);
    wrap.appendChild(card);

    var firstAction = actions.querySelector('a,button');
    if (firstAction) {
      actions.insertBefore(wrap, firstAction);
    } else {
      actions.appendChild(wrap);
    }

    button.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      wrap.classList.contains('is-open') ? close() : open();
    });

    card.addEventListener('click', function (event) {
      event.stopPropagation();
    });

    document.addEventListener('click', function () {
      close();
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') close();
    });

    return wrap;
  }

  function sync() {
    if (applying) return;
    applying = true;
    try {
      var header = document.getElementById(HEADER_ID);
      var panel = findRangePanel();
      if (!header || !panel) return;

      panel.classList.add('pmd-r2-date-original-v318');
      var wrap = createShell(header, panel);
      if (!wrap) return;

      var trigger = document.getElementById(BUTTON_ID);
      var label = labelFromPanel(panel);
      if (trigger) {
        trigger.title = label;
        var span = trigger.querySelector('span');
        if (span) span.textContent = 'Date';
      }

      var summary = findSummary(panel);
      if (summary) summary.classList.add('pmd-r2-date-summary-v318');
    } finally {
      applying = false;
    }
  }

  function boot() {
    sync();
    new MutationObserver(function () {
      window.requestAnimationFrame(sync);
    }).observe(document.body, {childList: true, subtree: true});

    [100, 300, 700, 1200, 2500, 5000].forEach(function (delay) {
      setTimeout(sync, delay);
    });

    console.info('[PMD Reservations2 Date Popover V3.1.8] Ready');
  }

  window.PMDReservations2DatePopoverV318 = {version: '3.1.8', refresh: sync, close: close};

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, {once: true});
  } else {
    boot();
  }
})();