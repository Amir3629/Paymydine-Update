(function () {
  'use strict';

  if (window.PMDWaiterStandardV23) return;
  if (!/^\/admin\/(?:dashboardwaiternew|waiter)(?:$|[/?#])/.test(location.pathname + location.search + location.hash)) return;

  var root = document.querySelector('[data-pmd-waiter-v2-root]');
  if (!root) return;

  var activePos = null;
  var activePosRoot = null;
  var autoSyncTimer = null;
  var feedbackTimer = null;

  var state = {
    version: 'pmd-waiter-standard-v2.3',
    active: true,
    headerDecorated: false,
    userName: '',
    productCards: 0,
    chefRecommended: 0,
    bestsellers: 0,
    autoSyncRuns: 0,
    autoSyncSkips: 0,
    lastAutoSyncAt: 0,
    lastError: ''
  };

  function clean(value) {
    return String(value == null ? '' : value).replace(/\s+/g, ' ').trim();
  }

  function yes(value) {
    return value === true || value === 1 || value === '1' || value === 'true';
  }

  function itemId(item) {
    return String(item && (item.id || item.menu_id || item.item_id || item.menu_item_id) || '');
  }

  function cartLineId(line) {
    return String(line && (
      line.menu_id || line.item_id || line.menu_item_id || line.id ||
      (line.item && (line.item.id || line.item.menu_id)) ||
      (line.menu && (line.menu.id || line.menu.menu_id))
    ) || '');
  }

  function cartLineQty(line) {
    var value = Number(line && (line.quantity || line.qty || line.count || 1));
    return Number.isFinite(value) && value > 0 ? value : 1;
  }

  function currentUserName() {
    var source = root.querySelector('[data-v2-user]');
    var text = clean(source && source.textContent);
    text = text.replace(/\s*[Â·|-]\s*LIVE SERVICE.*$/i, '').trim();
    return text || 'ADMIN';
  }

  function decorateLauncherHeader() {
    var actions = root.querySelector('.pmd-v2-top-actions');
    if (!actions) return;

    var refresh = actions.querySelector('[data-v2-refresh]');
    if (refresh) refresh.remove();

    var pill = actions.querySelector('[data-v23-online-user]');
    if (!pill) {
      pill = document.createElement('span');
      pill.className = 'pmd-v23-online-user';
      pill.setAttribute('data-v23-online-user', '');
      pill.innerHTML = '<i aria-hidden="true"></i><span>ONLINE</span><b data-v23-online-user-name>ADMIN</b>';
      var sync = actions.querySelector('[data-v2-sync]');
      actions.insertBefore(pill, sync || actions.firstChild);
    }

    var name = currentUserName();
    var nameNode = pill.querySelector('[data-v23-online-user-name]');
    if (nameNode) nameNode.textContent = name;
    state.userName = name;
    state.headerDecorated = true;
  }

  function categoryColor(index) {
    var palette = ['#2563eb', '#dc2626', '#16a34a', '#f59e0b', '#7c3aed', '#0891b2', '#ea580c', '#db2777'];
    return palette[Math.abs(index) % palette.length];
  }

  function updateProductQuantities() {
    if (!activePos || !activePos.state || !activePosRoot) return;

    var quantities = {};
    (Array.isArray(activePos.state.cart) ? activePos.state.cart : []).forEach(function (line) {
      var id = cartLineId(line);
      if (!id) return;
      quantities[id] = (quantities[id] || 0) + cartLineQty(line);
    });

    Array.prototype.slice.call(activePosRoot.querySelectorAll('[data-pos-product]')).forEach(function (button) {
      var id = String(button.getAttribute('data-pos-product') || '');
      var quantity = quantities[id] || 0;
      if (quantity > 0) {
        button.setAttribute('data-v23-quantity', String(quantity));
        button.classList.add('has-v23-quantity');
      } else {
        button.removeAttribute('data-v23-quantity');
        button.classList.remove('has-v23-quantity');
      }
    });
  }

  function decorateProducts(pos, posRoot) {
    var menu = Array.isArray(pos.state && pos.state.menu) ? pos.state.menu : [];
    var byId = {};
    menu.forEach(function (item) { byId[itemId(item)] = item; });

    var categoryMap = {};
    var categoryIndex = 0;
    menu.forEach(function (item) {
      var category = Array.isArray(item.category_ids) && item.category_ids.length ? String(item.category_ids[0]) : 'all';
      if (categoryMap[category] == null) categoryMap[category] = categoryIndex++;
    });

    var cards = Array.prototype.slice.call(posRoot.querySelectorAll('[data-pos-product]'));
    cards.forEach(function (button) {
      var id = String(button.getAttribute('data-pos-product') || '');
      var item = byId[id] || {};
      var category = Array.isArray(item.category_ids) && item.category_ids.length ? String(item.category_ids[0]) : 'all';
      var accent = categoryColor(categoryMap[category] || 0);
      button.style.setProperty('--pmd-v23-accent', accent);
      button.classList.add('pmd-v23-product-key');
      button.setAttribute('title', clean(item.name || button.textContent) + ' â€” tap to add');

      var plus = button.querySelector('.pmd-pos-plus');
      if (plus) plus.remove();
    });

    var categoryButtons = Array.prototype.slice.call(posRoot.querySelectorAll('[data-pos-categories] .pmd-pos-category'));
    categoryButtons.forEach(function (button, index) {
      button.style.setProperty('--pmd-v23-category-accent', categoryColor(index));
    });

    state.productCards = cards.length;
    state.chefRecommended = menu.filter(function (item) {
      return yes(item.is_chef_recommended) || yes(item.chef_recommended);
    }).length;
    state.bestsellers = menu.filter(function (item) {
      return yes(item.is_bestseller) || yes(item.bestseller);
    }).length;

    updateProductQuantities();
  }

  function decoratePosChrome(pos, posRoot) {
    var back = posRoot.querySelector('[data-pos-close]');
    if (back) {
      back.textContent = 'â†';
      back.setAttribute('aria-label', 'Back to floor');
      back.setAttribute('title', 'Back to floor');
      back.classList.add('pmd-v23-back-icon');
    }

    var subtitle = posRoot.querySelector('.pmd-pos-table-title span');
    if (subtitle) {
      var section = clean(pos.state && pos.state.table && (
        pos.state.table.section || pos.state.table.area || pos.state.table.zone || pos.state.table.floor_name
      ));
      subtitle.textContent = section || 'MAIN AREA';
    }

    var refresh = posRoot.querySelector('[data-pos-refresh]');
    if (refresh) refresh.remove();

    var waiter = posRoot.querySelector('.pmd-pos-waiter');
    if (waiter) waiter.setAttribute('title', 'Online waiter');
  }

  function bindProductFeedback(pos, posRoot) {
    var menu = posRoot.querySelector('[data-pos-menu]');
    if (!menu || menu.getAttribute('data-v23-feedback-bound') === '1') return;
    menu.setAttribute('data-v23-feedback-bound', '1');

    menu.addEventListener('click', function (event) {
      var button = event.target.closest('[data-pos-product]');
      if (!button) return;

      button.classList.remove('is-v23-added');
      void button.offsetWidth;
      button.classList.add('is-v23-added');
      clearTimeout(feedbackTimer);
      feedbackTimer = setTimeout(function () {
        button.classList.remove('is-v23-added');
      }, 260);

      setTimeout(updateProductQuantities, 0);
      setTimeout(updateProductQuantities, 120);
    }, true);

    posRoot.addEventListener('click', function (event) {
      if (event.target.closest('[data-pos-qty-minus],[data-pos-remove-line],[data-pos-clear],[data-pos-modal-add]')) {
        setTimeout(updateProductQuantities, 80);
      }
    });
  }

  function enhancePos(pos, posRoot) {
    if (!pos || !pos.state || !posRoot) return;
    activePos = pos;
    activePosRoot = posRoot;
    decoratePosChrome(pos, posRoot);
    decorateProducts(pos, posRoot);
    bindProductFeedback(pos, posRoot);
    posRoot.classList.add('pmd-waiter-standard-v23-active');
  }

  function canAutoSync() {
    if (!activePos || !activePos.state || !activePosRoot || !activePosRoot.isConnected) return false;
    if (document.hidden) return false;
    if (activePos.state.submitting) return false;
    if (activePos.state.payment && activePos.state.payment.open) return false;
    if (Array.isArray(activePos.state.cart) && activePos.state.cart.length > 0) return false;
    return typeof activePos.refresh === 'function';
  }

  function startAutoSync() {
    if (autoSyncTimer) clearInterval(autoSyncTimer);
    autoSyncTimer = setInterval(function () {
      if (!canAutoSync()) {
        state.autoSyncSkips += 1;
        return;
      }

      Promise.resolve(activePos.refresh())
        .then(function () {
          state.autoSyncRuns += 1;
          state.lastAutoSyncAt = Date.now();
          setTimeout(function () {
            if (activePos && activePosRoot) enhancePos(activePos, activePosRoot);
          }, 0);
        })
        .catch(function (error) {
          state.lastError = clean(error && error.message) || 'Auto-sync failed';
        });
    }, 15000);
  }

  window.addEventListener('pmd:waiter-standard-v2-opened', function (event) {
    var detail = event.detail || {};
    var pos = detail.pos || window.PMDWaiterPOS;
    var posRoot = pos && pos.state && pos.state.root
      ? pos.state.root
      : root.querySelector('[data-pmd-pos-root]');
    enhancePos(pos, posRoot);
    startAutoSync();
  });

  window.addEventListener('popstate', function () {
    if (activePosRoot && !activePosRoot.isConnected) {
      activePos = null;
      activePosRoot = null;
    }
  });

  decorateLauncherHeader();
  setTimeout(decorateLauncherHeader, 250);
  setTimeout(decorateLauncherHeader, 1000);

  window.PMDWaiterStandardV23 = {
    debug: function () {
      return {
        version: state.version,
        active: state.active,
        headerDecorated: state.headerDecorated,
        userName: state.userName,
        productCards: state.productCards,
        chefRecommended: state.chefRecommended,
        bestsellers: state.bestsellers,
        autoSyncRuns: state.autoSyncRuns,
        autoSyncSkips: state.autoSyncSkips,
        lastAutoSyncAt: state.lastAutoSyncAt,
        posOpen: !!(activePoÔ›Ûİ	‰ˆXİ]™TÜÔ›Ûİš\ĞÛÛ›™XİY
Kˆ\İ\œ›Üˆİ]K›\İ\œ›Ü‚ˆNÂˆKˆŞ[˜Ó›İÎˆ[˜İ[Ûˆ

HÂˆYˆ
XXİ]™TÜÈ\[ÙˆXİ]™TÜËœ™Yœ™\ÚOOH	Ù[˜İ[Û‰ÊH™]\›ˆ›ÛZ\ÙKœ™\ÛÛ™J˜[ÙJNÂˆ™]\›ˆ›ÛZ\ÙKœ™\ÛÛ™JXİ]™TÜËœ™Yœ™\Ú

JK[Š[˜İ[Ûˆ

HÂˆ[š[˜ÙTÜÊXİ]™TÜËXİ]™TÜÔ›Ûİ
NÂˆ™]\›ˆYNÂˆJNÂˆBˆNÂ‚ˆÛÛœÛÛKš[™›Ê	ÖÔQHØZ]\ˆİ[™\™ÔÈŒ‹ŒÈÜ\˜][Û˜[Û\ÚXİ]™IÊNÂŸJJ
NÂ