(function () {
  'use strict';

  if (window.PMDWaiterPOSV290) return;

  var PMD = window.PMDWaiterPOSV290 = {
    version: '2.9.0',
    installed: new WeakSet()
  };

  function text(node) {
    return String(node && node.textContent || '').replace(/\s+/g, ' ').trim();
  }

  function install(root) {
    if (!root || PMD.installed.has(root)) return;

    var app = root.querySelector('.pmd-pos-app');
    var workspace = root.querySelector('.pmd-pos-workspace');
    var catalog = root.querySelector('.pmd-pos-catalog');
    var categories = root.querySelector('[data-pos-categories],.pmd-pos-categories');
    var cart = root.querySelector('.pmd-pos-cart');

    if (!app || !workspace || !catalog || !categories || !cart) return;

    PMD.installed.add(root);

    var oldTopbar = root.querySelector('.pmd-pos-topbar');
    var title = text(oldTopbar && oldTopbar.querySelector('.pmd-pos-table-title strong')) || 'MENU';
    var subtitle = text(oldTopbar && oldTopbar.querySelector('.pmd-pos-table-title span')) || 'WAITER POS';
    var oldBack = oldTopbar && oldTopbar.querySelector('.pmd-pos-back');

    root.querySelectorAll(
      '.pmd-pos-topbar,.pmd-pos-tools,.pmd-pos-search-wrap,.pmd-pos-view-toggle'
    ).forEach(function (node) {
      node.remove();
    });

    var rail = document.createElement('aside');
    rail.className = 'pmd-pos-v290-left-rail';

    var header = document.createElement('div');
    header.className = 'pmd-pos-v290-title';
    header.innerHTML =
      '<strong>' + title + '</strong>' +
      '<span>' + subtitle + '</span>';

    var back = document.createElement('button');
    back.type = 'button';
    back.className = 'pmd-pos-v290-back';
    back.textContent = 'BACK TO TABLES';

    back.addEventListener('click', function () {
      if (oldBack) {
        oldBack.click();
      } else {
        document.dispatchEvent(
          new CustomEvent('pmd:waiter-pos-close', { bubbles: true })
        );
      }
    });

    rail.appendChild(header);
    rail.appendChild(categories);
    rail.appendChild(back);

    workspace.insertBefore(rail, workspace.firstChild);

    /* Force exact node order required by CSS grid. */
    workspace.appendChild(catalog);
    workspace.appendChild(cart);

    app.classList.add('pmd-pos-v290-active');

    console.info('[PMD] Waiter POS V2.9.0 final dashboard layout active');
  }

  function scan() {
    document.querySelectorAll('[data-pmd-pos-root]').forEach(install);
  }

  PMD.install = install;

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', scan, { once: true });
  } else {
    scan();
  }

  new MutationObserver(function (records) {
    if (records.some(function (record) {
      return Array.prototype.some.call(record.addedNodes || [], function (node) {
        return node.nodeType === 1 &&
          (node.matches?.('[data-pmd-pos-root]') ||
           node.querySelector?.('[data-pmd-pos-root]'));
      });
    })) {
      requestAnimationFrame(scan);
    }
  }).observe(document.documentElement, {
    childList: true,
    subtree: true
  });
})();
