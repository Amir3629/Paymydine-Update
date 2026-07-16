(function () {
  'use strict';

  if (window.PMDWaiterStandardV23OwnerFilters) return;
  if (!/^\/admin\/(?:dashboardwaiternew|waiter)(?:$|[/?#])/.test(location.pathname + location.search + location.hash)) return;

  var state = {
    version: 'pmd-waiter-standard-v2.3-owner-filters',
    mounted: 0,
    chef: 0,
    bestsellers: 0,
    activeKey: ''
  };

  function ensureLegacyKeysHidden() {
    if (document.getElementById('pmd-v23-hide-legacy-special-keys')) return;
    var style = document.createElement('style');
    style.id = 'pmd-v23-hide-legacy-special-keys';
    style.textContent = 'body.pmd-waiter-standard-v23-page [data-v21-virtual="popular"],body.pmd-waiter-standard-v23-page [data-v21-virtual="recent"]{display:none!important}';
    document.head.appendChild(style);
  }

  function yes(value) {
    return value === true || value === 1 || value === '1' || value === 'true';
  }

  function idOf(item) {
    return String(item && (item.id || item.menu_id || item.item_id || item.menu_item_id) || '');
  }

  function mount(pos, posRoot) {
    if (!pos || !pos.state || !posRoot) return;
    ensureLegacyKeysHidden();
    var categories = posRoot.querySelector('[data-pos-categories]');
    var menuRoot = posRoot.querySelector('[data-pos-menu]');
    var menu = Array.isArray(pos.state.menu) ? pos.state.menu : [];
    if (!categories || !menuRoot) return;

    var definitions = [
      { key: 'chef', label: 'CHEF RECOMMENDATIONS', match: function (item) { return yes(item.is_chef_recommended) || yes(item.chef_recommended); } },
      { key: 'bestseller', label: 'BEST SELLERS', match: function (item) { return yes(item.is_bestseller) || yes(item.bestseller); } }
    ];

    Array.prototype.slice.call(categories.querySelectorAll('[data-v21-virtual="popular"],[data-v21-virtual="recent"]')).forEach(function (button) {
      button.remove();
    });

    var allButton = categories.querySelector('[data-pos-category="all"]');

    definitions.slice().reverse().forEach(function (definition) {
      var button = categories.querySelector('[data-v23-owner-filter="' + definition.key + '"]');
      if (!button) {
        button = document.createElement('button');
        button.type = 'button';
        button.className = 'pmd-pos-category pmd-v23-special-category';
        button.setAttribute('data-v23-owner-filter', definition.key);
        button.style.setProperty('--pmd-v23-category-accent', definition.key === 'chef' ? '#7c3aed' : '#ea580c');
        button.textContent = definition.label;
        categories.insertBefore(button, allButton || categories.firstChild);
      }
      var enabled = menu.some(definition.match);
      button.hidden = !enabled;
      button.disabled = !enabled;
      button.setAttribute('aria-disabled', enabled ? 'false' : 'true');
      if (!enabled && state.activeKey === definition.key) state.activeKey = '';
    });

    function clearEmpty() {
      var empty = menuRoot.querySelector('.pmd-v23-special-empty');
      if (empty) empty.remove();
    }

    function apply(key) {
      var definition = definitions.find(function (row) { return row.key === key; });
      if (!definition) return;
      state.activeKey = key;
      clearEmpty();

      Array.prototype.slice.call(categories.querySelectorAll('.pmd-pos-category')).forEach(function (button) {
        button.classList.toggle('is-active', button.getAttribute('data-v23-owner-filter') === key);
      });

      var visible = 0;
      Array.prototype.slice.call(menuRoot.querySelectorAll('[data-pos-product]')).forEach(function (button) {
        var productId = String(button.getAttribute('data-pos-product') || '');
        var item = menu.find(function (row) { return idOf(row) === productId; });
        var show = !!item && definition.match(item);
        button.hidden = !show;
        if (show) visible += 1;
      });

      if (!visible) {
        var empty = document.createElement('div');
        empty.className = 'pmd-v23-special-empty';
        empty.textContent = key === 'chef'
          ? 'No Chef Recommendations are enabled by the owner.'
          : 'No Best Sellers are currently enabled or detected.';
        menuRoot.appendChild(empty);
      }
    }

    Array.prototype.slice.call(categories.querySelectorAll('[data-v23-owner-filter]')).forEach(function (button) {
      if (button.getAttribute('data-v23-filter-bound') === '1') return;
      button.setAttribute('data-v23-filter-bound', '1');
      button.addEventListener('click', function () {
        if (!button.disabled) apply(button.getAttribute('data-v23-owner-filter'));
      });
    });

    if (categories.getAttribute('data-v23-standard-filter-bound') !== '1') {
      categories.setAttribute('data-v23-standard-filter-bound', '1');
      categories.addEventListener('click', function (event) {
        var standard = event.target.closest('[data-pos-category]');
        if (!standard || standard.hasAttribute('data-v23-owner-filter')) return;
        state.activeKey = '';
        clearEmpty();
        Array.prototype.slice.call(categories.querySelectorAll('[data-v23-owner-filter]')).forEach(function (button) {
          button.classList.remove('is-active');
        });
      }, true);
    }

    state.chef = menu.filter(definitions[0].match).length;
    state.bestsellers = menu.filter(definitions[1].match).length;
    state.mounted += 1;

    if (state.activeKey) apply(state.activeKey);
  }

  ensureLegacyKeysHidden();

  window.addEventListener('pmd:waiter-standard-v2-opened', function (event) {
    var detail = event.detail || {};
    var pos = detail.pos || window.PMDWaiterPOS;
    var root = document.querySelector('[data-pmd-waiter-v2-root]');
    var posRoot = root && root.querySelector('[data-pmd-pos-root]');
    setTimeout(function () { mount(pos, posRoot); }, 0);
    setTimeout(function () { mount(pos, posRoot); }, 180);
  });

  window.PMDWaiterStandardV23OwnerFilters = {
    mount: mount,
    debug: function () { return Object.assign({}, state); }
  };

  console.info('[PMD] Waiter V2.3 owner Chef Recommendations + Best Sellers active');
})();
