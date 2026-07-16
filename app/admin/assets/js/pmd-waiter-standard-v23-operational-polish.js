(function () {
  'use strict';

  if (window.PMDWaiterStandardV23) return;
  if (!/^\/admin\/(?:dashboardwaiternew|waiter)(?:$|[/?#])/.test(location.pathname + location.search + location.hash)) return;

  var launcher = document.querySelector('[data-pmd-waiter-v2-root]');
  if (!launcher) return;

  var activePos = null;
  var activeRoot = null;
  var syncTimer = null;
  var state = {
    version: 'pmd-waiter-standard-v2.3',
    active: true,
    userName: '',
    productCards: 0,
    chefRecommended: 0,
    bestsellers: 0,
    autoSyncRuns: 0,
    autoSyncSkips: 0,
    lastError: ''
  };

  function text(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function yes(value) {
    return value === true || value === 1 || value === '1' || value === 'true';
  }

  function itemId(item) {
    return String(item && (item.id || item.menu_id || item.item_id || item.menu_item_id) || '');
  }

  function lineId(line) {
    return String(line && (line.menu_id || line.item_id || line.menu_item_id || line.id ||
      (line.item && (line.item.id || line.item.menu_id)) ||
      (line.menu && (line.menu.id || line.menu.menu_id))) || '');
  }

  function decorateLauncher() {
    var actions = launcher.querySelector('.pmd-v2-top-actions');
    if (!actions) return;
    var refresh = actions.querySelector('[data-v2-refresh]');
    if (refresh) refresh.remove();

    var source = launcher.querySelector('[data-v2-user]');
    var userName = text(source && source.textContent).replace(new RegExp('\\s*(?:\\u00b7|-|\\|)\\s*LIVE SERVICE.*$', 'i'), '').trim() || 'ADMIN';
    var pill = actions.querySelector('[data-v23-online-user]');
    if (!pill) {
      pill = document.createElement('span');
      pill.className = 'pmd-v23-online-user';
      pill.setAttribute('data-v23-online-user', '');
      pill.innerHTML = '<i aria-hidden="true"></i><span>ONLINE</span><b data-v23-online-user-name></b>';
      actions.insertBefore(pill, actions.querySelector('[data-v2-sync]') || actions.firstChild);
    }
    pill.querySelector('[data-v23-online-user-name]').textContent = userName;
    state.userName = userName;
  }

  function categoryColor(index) {
    var colors = ['#2563eb','#dc2626','#16a34a','#f59e0b','#7c3aed','#0891b2','#ea580c','#db2777'];
    return colors[Math.abs(index) % colors.length];
  }

  function updateQuantities() {
    if (!activePos || !activePos.state || !activeRoot) return;
    var quantities = {};
    (Array.isArray(activePos.state.cart) ? activePos.state.cart : []).forEach(function (line) {
      var id = lineId(line);
      var qty = Number(line.quantity || line.qty || line.count || 1);
      if (id) quantities[id] = (quantities[id] || 0) + (Number.isFinite(qty) && qty > 0 ? qty : 1);
    });
    Array.prototype.slice.call(activeRoot.querySelectorAll('[data-pos-product]')).forEach(function (card) {
      var qty = quantities[String(card.getAttribute('data-pos-product') || '')] || 0;
      card.classList.toggle('has-v23-quantity', qty > 0);
      if (qty > 0) card.setAttribute('data-v23-quantity', String(qty)); else card.removeAttribute('data-v23-quantity');
    });
  }

  function decoratePos(pos, root) {
    if (!pos || !pos.state || !root) return;
    activePos = pos;
    activeRoot = root;

    var back = root.querySelector('[data-pos-close]');
    if (back) {
      back.textContent = '\u2190';
      back.setAttribute('aria-label', 'Back to floor');
      back.setAttribute('title', 'Back to floor');
      back.classList.add('pmd-v23-back-icon');
    }

    var subtitle = root.querySelector('.pmd-pos-table-title span');
    if (subtitle) {
      var table = pos.state.table || {};
      subtitle.textContent = text(table.section || table.area || table.zone || table.floor_name) || 'MAIN AREA';
    }

    var refresh = root.querySelector('[data-pos-refresh]');
    if (refresh) refresh.remove();

    var menu = Array.isArray(pos.state.menu) ? pos.state.menu : [];
    var byId = {};
    var categories = {};
    var categoryCount = 0;
    menu.forEach(function (item) {
      byId[itemId(item)] = item;
      var category = Array.isArray(item.category_ids) && item.category_ids.length ? String(item.category_ids[0]) : 'all';
      if (categories[category] == null) categories[category] = categoryCount++;
    });

    var cards = Array.prototype.slice.call(root.querySelectorAll('[data-pos-product]'));
    cards.forEach(function (card) {
      var item = byId[String(card.getAttribute('data-pos-product') || '')] || {};
      var category = Array.isArray(item.category_ids) && item.category_ids.length ? String(item.category_ids[0]) : 'all';
      card.style.setProperty('--pmd-v23-accent', categoryColor(categories[category] || 0));
      card.classList.add('pmd-v23-product-key');
      card.setAttribute('title', text(item.name || card.textContent) + ' - tap to add');
      var add = card.querySelector('.pmd-pos-plus');
      if (add) add.remove();
    });

    Array.prototype.slice.call(root.querySelectorAll('[data-pos-categories] .pmd-pos-category')).forEach(function (button, index) {
      if (!button.style.getPropertyValue('--pmd-v23-category-accent')) button.style.setProperty('--pmd-v23-category-accent', categoryColor(index));
    });

    var menuRoot = root.querySelector('[data-pos-menu]');
    if (menuRoot && menuRoot.getAttribute('data-v23-feedback-bound') !== '1') {
      menuRoot.setAttribute('data-v23-feedback-bound', '1');
      menuRoot.addEventListener('click', function (event) {
        var card = event.target.closest('[data-pos-product]');
        if (!card) return;
        card.classList.remove('is-v23-added');
        void card.offsetWidth;
        card.classList.add('is-v23-added');
        setTimeout(function () { card.classList.remove('is-v23-added'); }, 260);
        setTimeout(updateQuantities, 80);
      }, true);
      root.addEventListener('click', function (event) {
        if (event.target.closest('[data-pos-qty-minus],[data-pos-remove-line],[data-pos-clear],[data-pos-modal-add]')) setTimeout(updateQuantities, 80);
      });
    }

    state.productCards = cards.length;
    state.chefRecommended = menu.filter(function (item) { return yes(item.is_chef_recommended) || yes(item.chef_recommended); }).length;
    state.bestsellers = menu.filter(function (item) { return yes(item.is_bestseller) || yes(item.bestseller); }).length;
    updateQuantities();
    root.classList.add('pmd-waiter-standard-v23-active');
  }

  function canSync() {
    if (!activePos || !activePos.state || !activeRoot || !activeRoot.isConnected || document.hidden) return false;
    if (activePos.state.submitting || (activePos.state.payment && activePos.state.payment.open)) return false;
    if (Array.isArray(activePos.state.cart) && activePos.state.cart.length) return false;
    return typeof activePos.refresh === 'function';
  }

  function startSync() {
    if (syncTimer) clearInterval(syncTimer);
    syncTimer = setInterval(function () {
      if (!canSync()) { state.autoSyncSkips += 1; return; }
      Promise.resolve(activePos.refresh()).then(function () {
        state.autoSyncRuns += 1;
        setTimeout(function () { decoratePos(activePos, activeRoot); }, 0);
      }).catch(function (error) { state.lastError = text(error && error.message) || 'Auto-sync failed'; });
    }, 15000);
  }

  window.addEventListener('pmd:waiter-standard-v2-opened', function (event) {
    var pos = (event.detail || {}).pos || window.PMDWaiterPOS;
    var root = launcher.querySelector('[data-pmd-pos-root]');
    decoratePos(pos, root);
    startSync();
  });

  decorateLauncher();
  setTimeout(decorateLauncher, 250);
  setTimeout(decorateLauncher, 1000);

  window.PMDWaiterStandardV23 = {
    debug: function () {
      return {
        version: state.version,
        active: state.active,
        userName: state.userName,
        productCards: state.productCards,
        chefRecommended: state.chefRecommended,
        bestsellers: state.bestsellers,
        autoSyncRuns: state.autoSyncRuns,
        autoSyncSkips: state.autoSyncSkips,
        posOpen: !!(activeRoot && activeRoot.isConnected),
        lastError: state.lastError
      };
    },
    syncNow: function () {
      if (!activePos || typeof activePos.refresh !== 'function') return Promise.resolve(false);
      return Promise.resolve(activePos.refresh()).then(function () { decoratePos(activePos, activeRoot); return true; });
    }
  };

  console.info('[PMD] Waiter Standard POS V2.3 operational polish active');
})();
