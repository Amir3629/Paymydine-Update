(function () {
  'use strict';

  if (window.PMD_WAITER_POS_POLISH_V26) return;
  window.PMD_WAITER_POS_POLISH_V26 = true;

  var STYLE_URL = '/app/admin/assets/css/pmd-waiter-pos-polish-v26.css?v=26';
  var installedRoots = new WeakSet();
  var dashboardRequestAt = 0;
  var dashboardTimer = null;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char];
    });
  }

  function isOrderable(item) {
    if (!item) return false;
    if (item.orderable === false || item.price_configured === false) return false;
    return Number(item.price || 0) > 0;
  }

  function usableImage(value) {
    var url = String(value || '').trim();
    if (!url) return '';
    if (/\b(placeholder|no[-_ ]?image|missing[-_ ]?image|default[-_ ]?food)\b/i.test(url)) return '';
    return url;
  }

  function itemFor(api, id) {
    if (!api || !api.state || !Array.isArray(api.state.menu)) return null;
    return api.state.menu.find(function (item) {
      return String(item.id) === String(id);
    }) || null;
  }

  function showToast(root, message, isError) {
    var toast = root && root.querySelector('[data-pos-toast]');
    if (!toast) return;
    toast.textContent = String(message || '');
    toast.classList.toggle('is-error', !!isError);
    toast.classList.add('is-show');
    clearTimeout(toast.__pmdV26Timer);
    toast.__pmdV26Timer = setTimeout(function () {
      toast.classList.remove('is-show');
    }, 3300);
  }

  function ensureStyle(root) {
    var scope = root && root.getRootNode ? root.getRootNode() : document;
    if (!scope || !scope.querySelector) return;
    if (scope.querySelector('[data-pmd-pos-polish-v26-style]')) return;

    if (scope instanceof ShadowRoot) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = STYLE_URL;
      link.dataset.pmdPosPolishV26Style = '1';
      scope.prepend(link);
    }
  }

  function productTags(item) {
    var tags = [];
    if (item.vegan) tags.push(['Vegan', '']);
    else if (item.vegetarian) tags.push(['Vegetarian', '']);
    if (item.halal) tags.push(['Halal', '']);
    if (Array.isArray(item.allergens) && item.allergens.length) {
      tags.push(['Allergens', 'is-allergen']);
    }
    return tags.slice(0, 3);
  }

  function decorateProduct(button, api) {
    if (!button || !api) return;
    var id = button.getAttribute('data-pos-product');
    var item = itemFor(api, id);
    if (!item) return;

    button.querySelectorAll('.pmd-pos-plus').forEach(function (node) { node.remove(); });

    var orderable = isOrderable(item);
    button.classList.toggle('is-price-required', !orderable);
    button.dataset.pmdPosOrderable = orderable ? '1' : '0';
    button.setAttribute('aria-disabled', orderable ? 'false' : 'true');

    var price = button.querySelector('.pmd-pos-price');
    if (price && !orderable) {
      price.textContent = 'Price required';
    }

    if (!orderable && !button.querySelector('.pmd-pos-price-required-badge')) {
      var badge = document.createElement('span');
      badge.className = 'pmd-pos-price-required-badge';
      badge.textContent = 'Details available · ordering locked';
      var foot = button.querySelector('.pmd-pos-product-foot');
      if (foot) foot.appendChild(badge);
    }

    var image = usableImage(item.image || (Array.isArray(item.images) ? item.images[0] : ''));
    if (image && !button.querySelector('.pmd-pos-product-thumb')) {
      var thumb = document.createElement('span');
      thumb.className = 'pmd-pos-product-thumb';
      thumb.setAttribute('aria-hidden', 'true');
      var img = document.createElement('img');
      img.alt = '';
      img.loading = 'lazy';
      img.decoding = 'async';
      img.src = image;
      img.addEventListener('error', function () {
        button.classList.remove('has-pmd-thumb');
        thumb.remove();
      }, {once: true});
      thumb.appendChild(img);
      button.prepend(thumb);
      button.classList.add('has-pmd-thumb');
    }

    var content = Array.prototype.find.call(button.children, function (child) {
      return child.classList && !child.classList.contains('pmd-pos-product-thumb') && !child.classList.contains('pmd-pos-product-foot');
    });
    if (content && !content.querySelector('.pmd-pos-product-tags')) {
      var tags = productTags(item);
      if (tags.length) {
        var wrap = document.createElement('div');
        wrap.className = 'pmd-pos-product-tags';
        tags.forEach(function (tag) {
          var chip = document.createElement('span');
          chip.className = 'pmd-pos-product-tag' + (tag[1] ? ' ' + tag[1] : '');
          chip.textContent = tag[0];
          wrap.appendChild(chip);
        });
        content.appendChild(wrap);
      }
    }
  }

  function syncProducts(root, api) {
    root.querySelectorAll('[data-pos-product]').forEach(function (button) {
      decorateProduct(button, api);
    });
    var warning = root.querySelector('[data-pos-menu-warning]');
    if (warning) {
      warning.hidden = true;
      warning.setAttribute('aria-hidden', 'true');
    }
  }

  function syncDetailAction(root, api) {
    var button = root.querySelector('[data-pos-detail-add]');
    if (!button || !api || !api.productDetails || typeof api.productDetails.debug !== 'function') return;
    var debug = api.productDetails.debug();
    var item = itemFor(api, debug && debug.currentItemId);
    if (!item) return;
    var orderable = isOrderable(item);
    button.disabled = !orderable;
    button.textContent = orderable ? (item.has_options ? 'Choose options' : 'Add to order') : 'Price required';
    button.title = orderable ? '' : 'Configure a valid menu price before ordering this item.';
  }

  function install(root, api) {
    if (!root || !api || installedRoots.has(root)) return;
    installedRoots.add(root);
    ensureStyle(root);

    if (!api.__pmdV26OriginalAddItem && typeof api.addItem === 'function') {
      api.__pmdV26OriginalAddItem = api.addItem.bind(api);
      api.addItem = function (id) {
        var item = itemFor(api, id);
        if (!isOrderable(item)) {
          showToast(root, 'This food is visible, but it needs a valid price before it can be ordered.', true);
          return false;
        }
        return api.__pmdV26OriginalAddItem(id);
      };
    }

    root.addEventListener('click', function (event) {
      var target = event.target && event.target.nodeType === 1 ? event.target : null;
      if (!target) return;
      var card = target.closest('[data-pos-product]');
      if (card && card.dataset.pmdPosOrderable === '0') {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        showToast(root, 'This food needs a valid price before it can be added. Press and hold to view its details.', true);
        return;
      }
      var detailAdd = target.closest('[data-pos-detail-add]');
      if (detailAdd && detailAdd.disabled) {
        event.preventDefault();
        event.stopPropagation();
        event.stopImmediatePropagation();
        showToast(root, 'Configure the price first; the food details remain available.', true);
      }
    }, true);

    var observer = new MutationObserver(function () {
      syncProducts(root, api);
      syncDetailAction(root, api);
    });
    observer.observe(root, {childList: true, subtree: true, attributes: true, attributeFilter: ['class', 'aria-hidden']});

    var previousDestroy = api.destroy;
    api.destroy = function () {
      observer.disconnect();
      installedRoots.delete(root);
      if (typeof previousDestroy === 'function') return previousDestroy.apply(api, arguments);
    };

    syncProducts(root, api);
    syncDetailAction(root, api);
    api.polishV26 = {
      version: 'pmd-waiter-pos-polish-v2.6',
      refresh: function () {
        syncProducts(root, api);
        syncDetailAction(root, api);
      }
    };
    console.info('[PMD] Waiter POS polish v2.6 active', {
      table: api.state && api.state.table,
      menuItems: api.state && api.state.menu ? api.state.menu.length : 0
    });
  }

  function scanPosRoots() {
    var roots = Array.prototype.slice.call(document.querySelectorAll('[data-pmd-pos-root]'));
    document.querySelectorAll('[data-pmd-pos-viewport-host]').forEach(function (host) {
      if (!host.shadowRoot) return;
      var root = host.shadowRoot.querySelector('[data-pmd-pos-root]');
      if (root) roots.push(root);
    });

    roots.forEach(function (root) {
      var api = window.PMDWaiterPOSApp && typeof window.PMDWaiterPOSApp.get === 'function'
        ? window.PMDWaiterPOSApp.get(root)
        : null;
      if (!api && window.PMDWaiterPOS && window.PMDWaiterPOS.state && window.PMDWaiterPOS.state.root === root) {
        api = window.PMDWaiterPOS;
      }
      if (api) install(root, api);
    });
  }

  function dashboardOrders(payload) {
    var sections = payload && payload.sections || {};
    return sections.active_orders || sections.open_orders || payload.active_orders || payload.orders || [];
  }

  function cleanLineNote(value) {
    var note = String(value || '').replace(/\s+/g, ' ').trim();
    if (!note || /^\[guest_session:/i.test(note)) return '';
    return note;
  }

  async function decorateDashboardNotes() {
    if (location.pathname.replace(/\/+$/, '') !== '/admin/dashboardwaiter') return;
    var now = Date.now();
    if (now - dashboardRequestAt < 3000) return;
    dashboardRequestAt = now;

    try {
      var response = await fetch('/admin/pmd-waiter-dashboard-v9-tenant-data?note_visibility_v26=' + now, {
        credentials: 'same-origin',
        cache: 'no-store',
        headers: {'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest'}
      });
      var json = await response.json();
      if (!response.ok || !json || !json.ok) return;

      var byOrder = {};
      dashboardOrders(json).forEach(function (order) {
        var id = String(order.order_id || order.id || '');
        if (!id) return;
        var rows = [];
        (Array.isArray(order.items) ? order.items : []).forEach(function (item) {
          var note = cleanLineNote(item.note || item.comment || item.instructions);
          if (!note) return;
          rows.push({
            name: item.name || item.menu_name || 'Menu item',
            qty: item.qty || item.quantity || 1,
            note: note
          });
        });
        if (rows.length) byOrder[id] = rows;
      });

      document.querySelectorAll('#pmd-waiter-dashboard-root .pmd-w5-card[data-order]').forEach(function (card) {
        card.querySelectorAll('.pmd-v26-item-notes').forEach(function (node) { node.remove(); });
        var rows = byOrder[String(card.getAttribute('data-order') || '')] || [];
        if (!rows.length) return;
        var wrap = document.createElement('div');
        wrap.className = 'pmd-v26-item-notes';
        wrap.innerHTML = rows.slice(0, 6).map(function (row) {
          return '<div class="pmd-v26-item-note"><b>' + esc(row.name) + ' ×' + esc(row.qty) + '</b>' + esc(row.note) + '</div>';
        }).join('');
        var actions = card.querySelector('.pmd-w5-card-actions');
        if (actions) card.insertBefore(wrap, actions);
        else card.appendChild(wrap);
      });
    } catch (error) {
      console.warn('[PMD] Waiter POS v2.6 dashboard note visibility failed', error.message);
    }
  }

  function scheduleDashboardNotes() {
    clearTimeout(dashboardTimer);
    dashboardTimer = setTimeout(decorateDashboardNotes, 120);
  }

  document.addEventListener('pmd-waiter-dashboard-rendered', scheduleDashboardNotes);
  document.addEventListener('DOMContentLoaded', function () {
    scanPosRoots();
    scheduleDashboardNotes();
  }, {once: true});

  new MutationObserver(scanPosRoots).observe(document.documentElement, {childList: true, subtree: true});
  setInterval(scanPosRoots, 700);

  window.PMDWaiterPOSPolishV26 = {
    version: 'pmd-waiter-pos-polish-v2.6',
    install: install,
    scan: scanPosRoots,
    refreshDashboardNotes: decorateDashboardNotes,
    debug: function () {
      return {
        version: 'pmd-waiter-pos-polish-v2.6',
        active: true,
        dashboardRoute: location.pathname,
        shadowHosts: document.querySelectorAll('[data-pmd-pos-viewport-host]').length
      };
    }
  };

  scanPosRoots();
  scheduleDashboardNotes();
  console.info('[PMD] Waiter POS polish v2.6 loader active');
})();
