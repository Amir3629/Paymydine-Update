(function () {
  'use strict';

  if (window.PMDWaiterFinalV2) return;

  var root = document.querySelector('[data-pmd-waiter-final2-root]');
  if (!root) return;

  var decoratedMounts = 0;
  var mobileBarRepairs = 0;

  function currentPosRoot() {
    return root.querySelector('[data-pmd-pos-root]');
  }

  function currentState() {
    return window.PMDWaiterPOS && window.PMDWaiterPOS.state ? window.PMDWaiterPOS.state : null;
  }

  function updateMobileOrderBar(posRoot) {
    if (!posRoot) return;
    var bar = posRoot.querySelector('[data-pos-mobile-cart]');
    if (!bar) return;

    bar.removeAttribute('hidden');
    bar.setAttribute('aria-label', 'Open current order');

    var title = bar.querySelector('b');
    if (title) title.textContent = 'ORDER';

    var arrow = bar.querySelector('[data-final2-cart-arrow]');
    if (!arrow) {
      arrow = document.createElement('span');
      arrow.setAttribute('data-final2-cart-arrow', '');
      arrow.className = 'pmd-final2-cart-arrow';
      arrow.setAttribute('aria-hidden', 'true');
      arrow.textContent = '›';
      bar.appendChild(arrow);
    }

    var state = currentState();
    var hasItems = !!(state && Array.isArray(state.cart) && state.cart.length);
    var hasOrder = !!(state && state.activeOrderId);
    bar.classList.toggle('has-items', hasItems || hasOrder);
    mobileBarRepairs += 1;
  }

  function simplifyProductCards(posRoot) {
    var cards = Array.prototype.slice.call(posRoot.querySelectorAll('[data-pos-product]'));
    cards.forEach(function (card) {
      var name = card.querySelector('.pmd-pos-product-name');
      card.setAttribute('aria-label', name ? ('Add ' + name.textContent) : 'Add item');
      var description = card.querySelector('.pmd-pos-product-desc');
      if (description) description.setAttribute('aria-hidden', 'true');
      var plus = card.querySelector('.pmd-pos-plus');
      if (plus) plus.setAttribute('aria-hidden', 'true');
    });
  }

  function decoratePos() {
    var posRoot = currentPosRoot();
    if (!posRoot) return false;

    posRoot.classList.add('pmd-final2-pos');
    simplifyProductCards(posRoot);
    updateMobileOrderBar(posRoot);

    var search = posRoot.querySelector('[data-pos-search]');
    if (search) search.placeholder = 'Search menu…';

    var catalog = posRoot.querySelector('.pmd-pos-catalog');
    if (catalog) catalog.setAttribute('data-final2-catalog', '');

    decoratedMounts += 1;
    return true;
  }

  function scheduleDecorate() {
    [0, 80, 240].forEach(function (delay) {
      setTimeout(decoratePos, delay);
    });
  }

  window.addEventListener('pmd:waiter-standard-v2-opened', scheduleDecorate);

  root.addEventListener('click', function (event) {
    var target = event.target && event.target.nodeType === 1 ? event.target : null;
    if (!target) return;

    if (target.closest('[data-pos-product], [data-pos-inc], [data-pos-dec], [data-pos-remove], [data-pos-clear]')) {
      setTimeout(function () {
        var posRoot = currentPosRoot();
        if (posRoot) updateMobileOrderBar(posRoot);
      }, 0);
    }
  }, true);

  document.addEventListener('visibilitychange', function () {
    if (!document.hidden) scheduleDecorate();
  });

  window.PMDWaiterFinalV2 = {
    version: 'pmd-waiter-final-v2',
    active: true,
    repair: scheduleDecorate,
    debug: function () {
      var posRoot = currentPosRoot();
      var bar = posRoot && posRoot.querySelector('[data-pos-mobile-cart]');
      return {
        version: 'pmd-waiter-final-v2',
        active: true,
        theme: root.getAttribute('data-theme'),
        posMounted: !!posRoot,
        categories: posRoot ? posRoot.querySelectorAll('[data-pos-category]').length : 0,
        products: posRoot ? posRoot.querySelectorAll('[data-pos-product]').length : 0,
        mobileOrderBar: !!bar,
        decoratedMounts: decoratedMounts,
        mobileBarRepairs: mobileBarRepairs
      };
    }
  };

  console.info('[PMD] Waiter Final V2 sharp workstation active');
})();
