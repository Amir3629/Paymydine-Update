(function () {
  'use strict';

  if (window.PMDWaiterStandardV221) return;

  var pageRoot = document.querySelector('[data-pmd-waiter-v2-root]');
  if (!pageRoot) return;

  var STORAGE_KEY = 'pmd-waiter-pos-theme';
  var decorated = new WeakSet();
  var observers = new WeakMap();
  var state = {
    version: 'pmd-waiter-standard-v2.2.1',
    theme: 'light',
    themeToggles: 0,
    paymentDecorations: 0,
    keypadPresses: 0,
    lastError: ''
  };

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function number(value, fallback) {
    var parsed = Number(String(value == null ? '' : value).replace(/[^0-9.-]/g, ''));
    return Number.isFinite(parsed) ? parsed : (fallback || 0);
  }

  function preferredTheme() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === 'light' || saved === 'dark') return saved;
    } catch (error) {}
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  function applyTheme(theme) {
    theme = theme === 'dark' ? 'dark' : 'light';
    state.theme = theme;
    document.documentElement.setAttribute('data-pmd-pos-theme', theme);
    document.body.classList.add('pmd-waiter-standard-v221-page');
    try { localStorage.setItem(STORAGE_KEY, theme); } catch (error) {}

    Array.prototype.slice.call(document.querySelectorAll('[data-v221-theme-toggle]')).forEach(function (button) {
      button.textContent = theme === 'dark' ? '☀' : '☾';
      button.title = theme === 'dark' ? 'Use light mode' : 'Use dark mode';
      button.setAttribute('aria-label', button.title);
      button.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
    });
  }

  function addThemeToggle(container) {
    if (!container || container.querySelector('[data-v221-theme-toggle]')) return;
    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'pmd-v221-theme-toggle';
    button.setAttribute('data-v221-theme-toggle', '1');
    button.addEventListener('click', function () {
      state.themeToggles += 1;
      applyTheme(state.theme === 'dark' ? 'light' : 'dark');
    });
    container.insertBefore(button, container.firstChild || null);
    applyTheme(state.theme);
  }

  function installThemeButtons(posRoot) {
    addThemeToggle(pageRoot.querySelector('.pmd-v2-top-actions'));
    if (posRoot) addThemeToggle(posRoot.querySelector('.pmd-pos-top-right'));
  }

  function activeCashInput(modal) {
    return modal.querySelector('[data-pos-cash-received]');
  }

  function payableAmount(modal) {
    var grand = modal.querySelector('.pmd-pos-pay-total-row.is-grand strong');
    if (grand) return Math.max(0, number(grand.textContent, 0));
    var remaining = modal.querySelector('.pmd-pos-balance-card.is-remaining b');
    return Math.max(0, number(remaining && remaining.textContent, 0));
  }

  function setCashValue(modal, value) {
    var input = activeCashInput(modal);
    if (!input) return;
    input.value = value === '' ? '' : Number(value).toFixed(2);
    input.dispatchEvent(new Event('input', {bubbles:true}));
    input.dispatchEvent(new Event('change', {bubbles:true}));
  }

  function keypadValue(input) {
    var current = clean(input && input.value);
    return /^\d+(?:\.\d{0,2})?$/.test(current) ? current : '';
  }

  function pressKey(modal, key) {
    var input = activeCashInput(modal);
    if (!input) return;
    state.keypadPresses += 1;

    if (key === 'due') return setCashValue(modal, payableAmount(modal));
    if (key === 'ceil5') return setCashValue(modal, Math.ceil(payableAmount(modal) / 5) * 5);
    if (key === 'ceil10') return setCashValue(modal, Math.ceil(payableAmount(modal) / 10) * 10);
    if (key === 'clear') return setCashValue(modal, '');

    var current = keypadValue(input);
    if (key === 'back') {
      current = current.slice(0, -1);
      input.value = current;
      input.dispatchEvent(new Event('input', {bubbles:true}));
      return;
    }

    if (key === '00') current += '00';
    else current += key;

    current = current.replace(/^0+(?=\d)/, '');
    var cents = current.replace(/\D/g, '').slice(0, 8);
    if (!cents) return setCashValue(modal, '');
    setCashValue(modal, Number(cents) / 100);
  }

  function buildTenderPanel(modal) {
    var panel = document.createElement('section');
    panel.className = 'pmd-v221-tender-panel';
    panel.setAttribute('data-v221-tender-panel', '1');
    panel.innerHTML = '' +
      '<div class="pmd-v221-tender-title"><span>Amount tendered</span><strong data-v221-due>0.00</strong></div>' +
      '<div class="pmd-v221-keypad" aria-label="Cash keypad">' +
        ['1','2','3','4','5','6','7','8','9','clear','0','00','back'].map(function (key) {
          var label = key === 'clear' ? 'C' : (key === 'back' ? '⌫' : key);
          return '<button type="button" data-v221-key="' + key + '">' + label + '</button>';
        }).join('') +
      '</div>' +
      '<div class="pmd-v221-quick-cash">' +
        '<button type="button" data-v221-key="due">EXACT</button>' +
        '<button type="button" data-v221-key="ceil5">NEXT 5</button>' +
        '<button type="button" data-v221-key="ceil10">NEXT 10</button>' +
      '</div>';

    panel.addEventListener('click', function (event) {
      var button = event.target.closest('[data-v221-key]');
      if (button) pressKey(modal, button.getAttribute('data-v221-key'));
    });

    return panel;
  }

  function updateTenderPanel(modal) {
    var due = modal.querySelector('[data-v221-due]');
    if (due) due.textContent = payableAmount(modal).toFixed(2);
    var cashBlock = modal.querySelector('[data-pos-cash-field]');
    var panel = modal.querySelector('[data-v221-tender-panel]');
    if (panel) panel.hidden = !!(cashBlock && cashBlock.hidden);
  }

  function decoratePayment(posRoot) {
    var modal = posRoot && posRoot.querySelector('[data-pos-payment-modal]');
    var dialog = modal && modal.querySelector('.pmd-pos-payment-dialog');
    var body = dialog && dialog.querySelector('.pmd-pos-payment-body');
    var main = body && body.querySelector('.pmd-pos-payment-main');
    var summary = body && body.querySelector('.pmd-pos-payment-summary');
    if (!modal || !dialog || !body || !main || !summary) return;

    dialog.classList.add('pmd-v221-toast-payment');

    if (!decorated.has(dialog)) {
      var left = document.createElement('section');
      left.className = 'pmd-v221-payment-left';
      var center = document.createElement('section');
      center.className = 'pmd-v221-payment-center';

      var balance = main.querySelector('[data-pos-payment-balance]');
      var blocks = Array.prototype.slice.call(main.children).filter(function (node) {
        return node !== balance;
      });

      if (balance) left.appendChild(balance);
      if (blocks[0]) left.appendChild(blocks[0]);
      blocks.slice(1).forEach(function (node) { center.appendChild(node); });

      var tender = buildTenderPanel(modal);
      var collection = center.querySelector('[data-pos-collection-fields]');
      center.insertBefore(tender, collection || center.firstChild || null);

      main.appendChild(left);
      main.appendChild(center);
      body.insertBefore(summary, null);

      decorated.add(dialog);
      state.paymentDecorations += 1;
    }

    updateTenderPanel(modal);

    if (!observers.has(dialog) && window.MutationObserver) {
      var observer = new MutationObserver(function () {
        requestAnimationFrame(function () { updateTenderPanel(modal); });
      });
      observer.observe(dialog, {childList:true, subtree:true, attributes:true, attributeFilter:['hidden','class']});
      observers.set(dialog, observer);
    }
  }

  function installForPos(posRoot) {
    if (!posRoot) return;
    installThemeButtons(posRoot);
    decoratePayment(posRoot);
  }

  applyTheme(preferredTheme());
  installThemeButtons(null);

  window.addEventListener('pmd:waiter-standard-v2-opened', function () {
    requestAnimationFrame(function () {
      installForPos(document.querySelector('[data-v2-pos-host] [data-pmd-pos-root]'));
    });
  });

  document.addEventListener('click', function (event) {
    if (event.target.closest('[data-pos-payment]')) {
      setTimeout(function () {
        installForPos(document.querySelector('[data-v2-pos-host] [data-pmd-pos-root]'));
      }, 40);
    }
  }, true);

  window.PMDWaiterStandardV221 = {
    active: true,
    setTheme: applyTheme,
    debug: function () {
      return {
        version: state.version,
        active: true,
        theme: state.theme,
        themeToggles: state.themeToggles,
        paymentDecorations: state.paymentDecorations,
        keypadPresses: state.keypadPresses,
        lastError: state.lastError,
        v22: window.PMDWaiterStandardV22 && typeof window.PMDWaiterStandardV22.debug === 'function'
          ? window.PMDWaiterStandardV22.debug()
          : null
      };
    }
  };

  console.info('[PMD] Waiter Standard POS V2.2.1 theme + Toast tender active');
})();
