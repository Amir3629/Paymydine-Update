(function () {
  'use strict';

  if (window.PMDWaiterPOSV286) return;

  var installed = new WeakSet();
  var PMD = window.PMDWaiterPOSV286 = {
    version: '2.8.6'
  };

  function addStyle(scope) {
    if (!scope || !scope.querySelector) return;

    if (scope.querySelector('link[data-pmd-pos-v286-style]')) return;

    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href =
      '/app/admin/assets/css/' +
      'pmd-waiter-pos-v286-dashboard-rebuild.css?v=286';
    link.setAttribute('data-pmd-pos-v286-style', '1');
    scope.prepend(link);
  }

  function clean(value) {
    return String(value == null ? '' : value)
      .replace(/\s+/g, ' ')
      .trim();
  }

  function install(root) {
    if (!root || installed.has(root)) return;

    var app = root.querySelector('.pmd-pos-app');
    var catalog = root.querySelector('.pmd-pos-catalog');
    var categories = root.querySelector('[data-pos-categories]');
    var topbar = root.querySelector('.pmd-pos-topbar');

    if (!app || !catalog || !categories) return;

    installed.add(root);
    addStyle(root.getRootNode ? root.getRootNode() : document);

    var rail = document.createElement('aside');
    rail.className = 'pmd-pos-v286-left-rail';
    rail.setAttribute('data-pmd-pos-v286-left-rail', '1');

    var tableBox = document.createElement('div');
    tableBox.className = 'pmd-pos-v286-table';

    var tableTitle =
      topbar && topbar.querySelector('.pmd-pos-table-title strong');
    var tableArea =
      topbar && topbar.querySelector('.pmd-pos-table-title span');

    tableBox.innerHTML =
      '<strong>' +
      (clean(tableTitle && tableTitle.textContent) || 'TABLE') +
      '</strong>' +
      '<span>' +
      (clean(tableArea && tableArea.textContent) || 'WAITER POS') +
      '</span>';

    var originalBack =
      topbar && topbar.querySelector('.pmd-pos-back');

    var back = document.createElement('button');
    back.type = 'button';
    back.className = 'pmd-pos-v286-back';
    back.textContent = 'BACK TO TABLES';

    back.addEventListener('click', function () {
      if (originalBack) {
        originalBack.click();
        return;
      }

      document.dispatchEvent(
        new CustomEvent('pmd:waiter-pos-close', {
          bubbles: true
        })
      );
    });

    categories.parentNode.insertBefore(rail, categories);
    rail.appendChild(tableBox);
    rail.appendChild(categories);
    rail.appendChild(back);

    root.classList.add('pmd-pos-v286-active');

    console.info(
      '[PMD] Waiter POS V2.8.6 dashboard rebuild active'
    );
  }

  PMD.install = install;

  function scanDocument() {
    document
      .querySelectorAll('[data-pmd-pos-root]')
      .forEach(install);

    document
      .querySelectorAll('*')
      .forEach(function (host) {
        if (!host.shadowRoot) return;

        addStyle(host.shadowRoot);

        host.shadowRoot
          .querySelectorAll('[data-pmd-pos-root]')
          .forEach(install);
      });
  }

  function boot() {
    scanDocument();

    var observer = new MutationObserver(function (records) {
      var shouldScan = records.some(function (record) {
        return Array.prototype.some.call(
          record.addedNodes || [],
          function (node) {
            return (
              node.nodeType === 1 &&
              (
                node.matches?.('[data-pmd-pos-root]') ||
                node.querySelector?.('[data-pmd-pos-root]') ||
                node.shadowRoot
              )
            );
          }
        );
      });

      if (shouldScan) requestAnimationFrame(scanDocument);
    });

    observer.observe(document.documentElement, {
      childList: true,
      subtree: true
    });

    var attempts = 0;
    var timer = setInterval(function () {
      attempts += 1;
      scanDocument();
      if (attempts >= 80) clearInterval(timer);
    }, 250);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, {
      once: true
    });
  } else {
    boot();
  }
})();
