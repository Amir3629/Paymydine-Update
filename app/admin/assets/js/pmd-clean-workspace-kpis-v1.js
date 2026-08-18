/* ==========================================================
   PMD CLEAN WORKSPACE - KPI COMPONENT V1
   Shared by Reservations Lab / Cashier Lab / Manager Lab.

   Initial render performs zero DOM writes. Cards and chooser already exist
   in Blade. This runtime only reacts to explicit user interaction.

   Deliberately absent:
   - fetch/XHR
   - Dashboard2/Reservations2 browser runtime
   - DOM mutation observers
   - timers / settle passes
   - resize handlers
   - animation frames
   ========================================================== */
(function () {
  'use strict';

  var root = document.getElementById('pmd-dashboard-lab');
  if (!root || root.getAttribute('data-pmd-clean-workspace') !== 'v1') return;

  var expectedPath = String(
    root.getAttribute('data-pmd-clean-workspace-path') || ''
  ).replace(/\/+$/, '');
  var currentPath = String(window.location.pathname || '').replace(/\/+$/, '');
  if (!expectedPath || currentPath !== expectedPath) return;

  var section = document.querySelector('[data-pmd-dashboard-lab-kpis]');
  var dataNode = document.getElementById('pmd-dashboard-lab-kpi-data');
  if (!section || !dataNode) return;

  var cards = {};
  var activeMenu = null;
  var cookieName = root.getAttribute('data-pmd-clean-workspace-kpi-cookie') || '';
  var storageKey = root.getAttribute('data-pmd-clean-workspace-kpi-storage') || '';
  var textVisible = section.getAttribute('data-pmd-kpi-text-visible') || 'Visible in this card';
  var textAlready = section.getAttribute('data-pmd-kpi-text-already') || 'Already visible';
  var textShow = section.getAttribute('data-pmd-kpi-text-show') || 'Show in this card';

  try {
    cards = JSON.parse(dataNode.textContent || '{}') || {};
  } catch (error) {
    cards = {};
  }

  function icon(name) {
    var paths = {
      money:
        '<circle cx="12" cy="12" r="9"></circle>' +
        '<path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4h-6M12 6v2M12 16v2"></path>',
      users:
        '<circle cx="9" cy="8" r="3"></circle>' +
        '<path d="M3 20a6 6 0 0 1 12 0M16 5a3 3 0 0 1 0 6M17 14a5 5 0 0 1 4 5"></path>',
      timer:
        '<circle cx="12" cy="13" r="8"></circle>' +
        '<path d="M12 9v4l2 2M9 2h6M12 2v3"></path>',
      utensils:
        '<path d="M7 3v8M4 3v5a3 3 0 0 0 6 0V3M7 11v10M17 3v18M17 3c3 2 3 7 0 9"></path>',
      flame:
        '<path d="M12 3c1.8 3 5 4.6 5 9a5 5 0 0 1 -10 0c0 -2.3 1.2 -4.4 3.5 -6.5c.2 2 1 3 1.5 3.5c1.2 -1.4 1.2 -3.7 0 -6z"></path>',
      table:
        '<path d="M3 10h18M5 10v8M19 10v8"></path>' +
        '<path d="M4 6h16a1 1 0 0 1 1 1v3h-18v-3a1 1 0 0 1 1 -1z"></path>',
      menu:
        '<path d="M4 6h16M4 12h16M4 18h16"></path>',
      star:
        '<path d="M12 3l2.8 5.7l6.2 .9l-4.5 4.4l1.1 6.2l-5.6 -3l-5.6 3l1.1 -6.2l-4.5 -4.4l6.2 -.9z"></path>',
      calendar:
        '<rect x="3" y="5" width="18" height="16" rx="2"></rect>' +
        '<path d="M16 3v4M8 3v4M3 11h18"></path>',
      clock:
        '<circle cx="12" cy="12" r="9"></circle>' +
        '<path d="M12 7v5l3 2"></path>',
      pending:
        '<circle cx="12" cy="12" r="9"></circle>' +
        '<path d="M12 7v5M12 16h.01"></path>',
      'user-off':
        '<circle cx="9" cy="8" r="3"></circle>' +
        '<path d="M3 20a6 6 0 0 1 9 -5.2M15 15a6 6 0 0 1 3 5M3 3l18 18"></path>',
      cancel:
        '<circle cx="12" cy="12" r="9"></circle>' +
        '<path d="M9 9l6 6M15 9l-6 6"></path>',
      occupancy:
        '<rect x="3" y="4" width="18" height="16" rx="2"></rect>' +
        '<path d="M7 8h3v3h-3zM14 8h3v3h-3zM7 14h3v2h-3zM14 14h3v2h-3z"></path>',
      list:
        '<path d="M9 6h11M9 12h11M9 18h11M4 6h.01M4 12h.01M4 18h.01"></path>',
      seats:
        '<path d="M6 11v-4a3 3 0 0 1 6 0v4M4 11h10v6h-10zM6 17v3M12 17v3"></path>'
    };

    return (
      '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      (paths[name] || paths.money) +
      '</svg>'
    );
  }

  function visibleCards() {
    return Array.prototype.slice.call(
      section.querySelectorAll('[data-pmd-dashboard-lab-slot]')
    ).sort(function (left, right) {
      return Number(left.getAttribute('data-pmd-dashboard-lab-slot')) -
        Number(right.getAttribute('data-pmd-dashboard-lab-slot'));
    });
  }

  function selectedKeys() {
    return visibleCards().map(function (card) {
      return card.getAttribute('data-pmd-dashboard2-kpi') || '';
    });
  }

  function closeMenu() {
    if (!activeMenu) return;

    var menu = activeMenu;
    var card = menu.closest('[data-pmd-dashboard-lab-slot]');
    var button = card
      ? card.querySelector('[data-pmd-dashboard-lab-kpi-menu-button]')
      : null;

    menu.hidden = true;
    activeMenu = null;

    if (button) button.setAttribute('aria-expanded', 'false');
  }

  function syncMenus() {
    var selected = selectedKeys();

    visibleCards().forEach(function (card) {
      var current = card.getAttribute('data-pmd-dashboard2-kpi');

      Array.prototype.forEach.call(
        card.querySelectorAll('[data-pmd-dashboard-lab-kpi-option]'),
        function (option) {
          var key = option.getAttribute('data-pmd-dashboard-lab-kpi-option');
          var isCurrent = key === current;
          var duplicate = selected.indexOf(key) !== -1 && !isCurrent;
          var copy = option.querySelector('small');
          var check = option.querySelector('.pmd-r2-kpi-v2401-check');

          option.disabled = duplicate;
          option.classList.toggle('is-selected', isCurrent);

          if (copy) {
            copy.textContent = isCurrent
              ? textVisible
              : (duplicate ? textAlready : textShow);
          }

          if (check) check.textContent = isCurrent ? '✓' : '';
        }
      );
    });
  }

  function persistSelection() {
    var keys = selectedKeys();

    if (cookieName) {
      document.cookie =
        cookieName + '=' + encodeURIComponent(keys.join(',')) +
        '; Path=/admin; Max-Age=31536000; SameSite=Lax';
    }

    if (storageKey) {
      try {
        localStorage.setItem(storageKey, JSON.stringify(keys));
      } catch (error) {
        // Cookie remains the server-first-paint preference authority.
      }
    }
  }

  function applyCard(card, key) {
    var data = cards[key];
    if (!card || !data) return false;

    var iconNode = card.querySelector('.pmd-r2-kpi-v2401-icon');
    var titleNode = card.querySelector('.pmd-r2-kpi-v2401-title');
    var valueNode = card.querySelector('.pmd-r2-kpi-v2401-value');
    var descriptionNode = card.querySelector('.pmd-r2-kpi-v2401-description');

    card.setAttribute('data-pmd-dashboard2-kpi', key);
    card.setAttribute('data-pmd-kpi-v2401-key', key);
    card.setAttribute('data-pmd-kpi-v2401-tone', data.tone || 'green');
    card.setAttribute('data-pmd-connected', data.connected ? 'true' : 'false');
    card.setAttribute('data-pmd-period', data.period || 'current');
    card.title = data.source || '';

    if (iconNode) iconNode.innerHTML = icon(data.icon || 'money');
    if (titleNode) titleNode.textContent = data.title || key;
    // PMD_KPI_ZERO_SWAP_V1
    if (valueNode) {
      var pmdValue = data.value == null ? '' : String(data.value).trim();
      valueNode.textContent = (!pmdValue || pmdValue === '—' || pmdValue === '–' || pmdValue === '-')
        ? '0'
        : String(data.value);
    }
    if (descriptionNode) descriptionNode.textContent = data.description || '';

    persistSelection();
    syncMenus();
    return true;
  }

  section.addEventListener('click', function (event) {
    var menuButton = event.target.closest('[data-pmd-dashboard-lab-kpi-menu-button]');

    if (menuButton && section.contains(menuButton)) {
      event.preventDefault();
      event.stopPropagation();

      var card = menuButton.closest('[data-pmd-dashboard-lab-slot]');
      var menu = card
        ? card.querySelector('[data-pmd-dashboard-lab-kpi-menu]')
        : null;

      if (!menu) return;

      var shouldOpen = menu.hidden;
      closeMenu();

      if (shouldOpen) {
        menu.hidden = false;
        activeMenu = menu;
        menuButton.setAttribute('aria-expanded', 'true');
      }
      return;
    }

    var option = event.target.closest('[data-pmd-dashboard-lab-kpi-option]');
    if (!option || !section.contains(option) || option.disabled) return;

    event.preventDefault();
    event.stopPropagation();

    var optionCard = option.closest('[data-pmd-dashboard-lab-slot]');
    var key = option.getAttribute('data-pmd-dashboard-lab-kpi-option');

    closeMenu();
    applyCard(optionCard, key);
  });

  document.addEventListener('click', function (event) {
    if (!activeMenu || activeMenu.contains(event.target)) return;

    var card = activeMenu.closest('[data-pmd-dashboard-lab-slot]');
    var button = card
      ? card.querySelector('[data-pmd-dashboard-lab-kpi-menu-button]')
      : null;

    if (button && button.contains(event.target)) return;
    closeMenu();
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape') closeMenu();
  });

  window.PMDCleanWorkspaceKpisV1 = {
    version: '1.0.0-server-first-paint',
    workspace: root.getAttribute('data-pmd-clean-workspace-key') || '',
    renderAuthority: 'server-first-paint',
    bootFetches: 0,
    selected: selectedKeys,
    choose: function (slot, key) {
      var card = section.querySelector(
        '[data-pmd-dashboard-lab-slot="' + String(slot) + '"]'
      );
      return applyCard(card, key);
    }
  };
})();
