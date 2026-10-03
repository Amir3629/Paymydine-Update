(function () {
  'use strict';

  if (
    !/^\/admin\/(?:dashboardwaiternew|waiter)(?:$|[/?#])/
      .test(location.pathname + location.search + location.hash)
  ) {
    return;
  }

  var VERSION =
    'pmd-waiter-standard-v2.3.1-stable-owner-filters';

  var activePos = null;
  var activeRoot = null;
  var internalAllClick = false;
  var reapplyTimer = null;

  var state = {
    version: VERSION,
    active: true,
    mounted: 0,
    repairs: 0,
    chef: 0,
    bestsellers: 0,
    activeKey: '',
    lastApplied: '',
    lastError: ''
  };

  var definitions = [
    {
      key: 'bestseller',
      legacyKey: 'bestseller',
      label: 'BEST SELLERS',
      accent: '#ea580c',
      match: function (item) {
        return yes(item && item.is_bestseller) ||
          yes(item && item.bestseller);
      }
    },
    {
      key: 'chef',
      legacyKey: 'chef',
      label: 'CHEF RECOMMENDATIONS',
      accent: '#7c3aed',
      match: function (item) {
        return yes(item && item.is_chef_recommended) ||
          yes(item && item.chef_recommended);
      }
    }
  ];

  var normalColors = [
    '#2563eb',
    '#dc2626',
    '#15803d',
    '#d97706',
    '#7c3aed',
    '#0e7490',
    '#be185d',
    '#0f766e'
  ];

  function yes(value) {
    return value === true ||
      value === 1 ||
      value === '1' ||
      value === 'true';
  }

  function idOf(item) {
    return String(
      item && (
        item.id ||
        item.menu_id ||
        item.item_id ||
        item.menu_item_id
      ) || ''
    );
  }

  function getMenu(pos) {
    return pos &&
      pos.state &&
      Array.isArray(pos.state.menu)
        ? pos.state.menu
        : [];
  }

  function categoryColor(index) {
    return normalColors[
      Math.abs(Number(index) || 0) % normalColors.length
    ];
  }

  function clearReapplyTimer() {
    if (reapplyTimer) {
      clearTimeout(reapplyTimer);
      reapplyTimer = null;
    }
  }

  function removeLegacyButtons(categories) {
    Array.prototype.slice.call(
      categories.querySelectorAll(
        '[data-v21-virtual="popular"],' +
        '[data-v21-virtual="recent"]'
      )
    ).forEach(function (button) {
      button.remove();
    });
  }

  function createSpecialButton(categories, definition) {
    var selector =
      '[data-v23-owner-filter="' + definition.key + '"]';

    var button = categories.querySelector(selector);

    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className =
        'pmd-pos-category ' +
        'pmd-v23-special-category ' +
        'pmd-v231-stable-category';

      button.setAttribute(
        'data-v23-owner-filter',
        definition.key
      );

      button.setAttribute(
        'data-v21-virtual',
        definition.legacyKey
      );

      button.textContent = definition.label;
    }

    button.hidden = false;
    button.disabled = false;

    button.removeAttribute('hidden');
    button.removeAttribute('disabled');

    button.setAttribute('aria-disabled', 'false');

    button.style.setProperty(
      '--pmd-v23-category-accent',
      definition.accent
    );

    button.style.setProperty(
      '--pmd-v231-category-color',
      definition.accent
    );

    return button;
  }

  function paintCategories(categories) {
    var standardButtons = Array.prototype.slice.call(
      categories.querySelectorAll('[data-pos-category]')
    );

    standardButtons.forEach(function (button, index) {
      var color = categoryColor(index);

      button.style.setProperty(
        '--pmd-v23-category-accent',
        color
      );

      button.style.setProperty(
        '--pmd-v231-category-color',
        color
      );

      button.classList.add('pmd-v231-stable-category');
    });

    definitions.forEach(function (definition) {
      var button = categories.querySelector(
        '[data-v23-owner-filter="' +
          definition.key +
        '"]'
      );

      if (!button) return;

      button.style.setProperty(
        '--pmd-v23-category-accent',
        definition.accent
      );

      button.style.setProperty(
        '--pmd-v231-category-color',
        definition.accent
      );
    });
  }

  function clearEmpty(menuRoot) {
    Array.prototype.slice.call(
      menuRoot.querySelectorAll('.pmd-v23-special-empty')
    ).forEach(function (empty) {
      empty.remove();
    });
  }

  function updateCounts(pos) {
    var menu = getMenu(pos);

    state.bestsellers = menu.filter(
      definitions[0].match
    ).length;

    state.chef = menu.filter(
      definitions[1].match
    ).length;
  }

  function ensureStructure(pos, root) {
    if (!pos || !pos.state || !root) return false;

    activePos = pos;
    activeRoot = root;

    var categories =
      root.querySelector('[data-pos-categories]');

    var menuRoot =
      root.querySelector('[data-pos-menu]');

    if (!categories || !menuRoot) return false;

    removeLegacyButtons(categories);

    var allButton = categories.querySelector(
      '[data-pos-category="all"]'
    );

    var specialButtons = definitions.map(function (definition) {
      return createSpecialButton(categories, definition);
    });

    /*
     * Stable order:
     * BEST SELLERS
     * CHEF RECOMMENDATIONS
     * ALL
     * Standard categories
     */
    specialButtons.forEach(function (button) {
      categories.insertBefore(
        button,
        allButton || categories.firstChild
      );
    });

    paintCategories(categories);
    updateCounts(pos);
    bindInteractions(pos, root, categories);

    state.mounted += 1;

    return true;
  }

  function renderSpecialFilter(key, pos, root) {
    if (!ensureStructure(pos, root)) return;

    var definition = definitions.find(function (row) {
      return row.key === key;
    });

    if (!definition) return;

    var categories =
      root.querySelector('[data-pos-categories]');

    var menuRoot =
      root.querySelector('[data-pos-menu]');

    if (!categories || !menuRoot) return;

    clearEmpty(menuRoot);

    Array.prototype.slice.call(
      categories.querySelectorAll('.pmd-pos-category')
    ).forEach(function (button) {
      button.classList.remove('is-active');
    });

    var selected = categories.querySelector(
      '[data-v23-owner-filter="' + key + '"]'
    );

    if (selected) {
      selected.classList.add('is-active');
    }

    var menu = getMenu(pos);
    var visible = 0;

    Array.prototype.slice.call(
      menuRoot.querySelectorAll('[data-pos-product]')
    ).forEach(function (productButton) {
      var productId = String(
        productButton.getAttribute('data-pos-product') || ''
      );

      var item = menu.find(function (row) {
        return idOf(row) === productId;
      });

      var show = !!item && definition.match(item);

      productButton.hidden = !show;
      productButton.classList.toggle(
        'pmd-v231-filtered-out',
        !show
      );

      if (show) visible += 1;
    });

    if (!visible) {
      var empty = document.createElement('div');

      empty.className = 'pmd-v23-special-empty';

      empty.textContent =
        key === 'chef'
          ? 'No Chef Recommendations are currently enabled.'
          : 'No Best Sellers are currently enabled.';

      menuRoot.appendChild(empty);
    }

    state.activeKey = key;
    state.lastApplied = key;
  }

  function activateSpecial(key, pos, root) {
    state.activeKey = key;

    var categories =
      root.querySelector('[data-pos-categories]');

    if (!categories) return;

    /*
     * Special categories must search through the full menu,
     * not only the previously selected normal category.
     */
    if (
      pos &&
      pos.state &&
      String(pos.state.category || '') !== 'all'
    ) {
      var allButton = categories.querySelector(
        '[data-pos-category="all"]'
      );

      if (allButton) {
        internalAllClick = true;
        allButton.click();
        internalAllClick = false;

        setTimeout(function () {
          renderSpecialFilter(key, pos, root);
        }, 0);

        setTimeout(function () {
          renderSpecialFilter(key, pos, root);
        }, 90);

        return;
      }
    }

    renderSpecialFilter(key, pos, root);
  }

  function scheduleRepair(pos, root, preserveSpecial) {
    clearReapplyTimer();

    reapplyTimer = setTimeout(function () {
      try {
        ensureStructure(pos, root);

        if (preserveSpecial && state.activeKey) {
          renderSpecialFilter(
            state.activeKey,
            pos,
            root
          );
        }

        state.repairs += 1;
      } catch (error) {
        state.lastError =
          String(error && error.message || error || '');
      }
    }, 0);

    setTimeout(function () {
      try {
        ensureStructure(pos, root);

        if (preserveSpecial && state.activeKey) {
          renderSpecialFilter(
            state.activeKey,
            pos,
            root
          );
        }
      } catch (error) {
        state.lastError =
          String(error && error.message || error || '');
      }
    }, 100);
  }

  function bindInteractions(pos, root, categories) {
    if (
      root.getAttribute(
        'data-v231-category-stability-bound'
      ) === '1'
    ) {
      return;
    }

    root.setAttribute(
      'data-v231-category-stability-bound',
      '1'
    );

    root.addEventListener('click', function (event) {
      var special = event.target.closest(
        '[data-v23-owner-filter]'
      );

      if (special) {
        event.preventDefault();
        event.stopPropagation();

        activateSpecial(
          special.getAttribute('data-v23-owner-filter'),
          pos,
          root
        );

        return;
      }

      var standard = event.target.closest(
        '[data-pos-category]'
      );

      if (standard) {
        if (!internalAllClick) {
          state.activeKey = '';
          state.lastApplied = '';
        }

        /*
         * The core engine recreates all category buttons.
         * Repair immediately after that synchronous render.
         */
        scheduleRepair(
          pos,
          root,
          internalAllClick && !!state.activeKey
        );
      }
    }, true);

    var search = root.querySelector('[data-pos-search]');

    if (
      search &&
      search.getAttribute(
        'data-v231-search-bound'
      ) !== '1'
    ) {
      search.setAttribute(
        'data-v231-search-bound',
        '1'
      );

      search.addEventListener('input', function () {
        scheduleRepair(
          pos,
          root,
          !!state.activeKey
        );
      });
    }
  }

  function mount(pos, root) {
    try {
      if (!ensureStructure(pos, root)) return;

      if (state.activeKey) {
        renderSpecialFilter(
          state.activeKey,
          pos,
          root
        );
      }
    } catch (error) {
      state.lastError =
        String(error && error.message || error || '');
    }
  }

  window.addEventListener(
    'pmd:waiter-standard-v2-opened',
    function (event) {
      var detail = event.detail || {};

      var pos =
        detail.pos ||
        window.PMDWaiterPOS ||
        activePos;

      var launcher =
        document.querySelector('[data-pmd-waiter-v2-root]');

      var root = launcher &&
        launcher.querySelector('[data-pmd-pos-root]');

      setTimeout(function () {
        mount(pos, root);
      }, 0);

      setTimeout(function () {
        mount(pos, root);
      }, 180);
    }
  );

  window.PMDWaiterStandardV23OwnerFilters = {
    mount: mount,

    repair: function () {
      if (!activePos || !activeRoot) return false;

      mount(activePos, activeRoot);

      return true;
    },

    debug: function () {
      return {
        version: state.version,
        active: state.active,
        mounted: state.mounted,
        repairs: state.repairs,
        chef: state.chef,
        bestsellers: state.bestsellers,
        activeKey: state.activeKey,
        lastApplied: state.lastApplied,
        posConnected:
          !!(activeRoot && activeRoot.isConnected),
        lastError: state.lastError
      };
    }
  };

  console.info(
    '[PMD] Waiter V2.3.1 stable coloured categories active'
  );
})();
