(function () {
  'use strict';

  if (window.PMD_WAITER_POS_SIMPLE_V27) return;
  window.PMD_WAITER_POS_SIMPLE_V27 = true;

  // Prevent the old V2.6 loader from installing its document-wide observers.
  window.PMD_WAITER_POS_POLISH_V26 = true;

  var installedRoots = new WeakSet();
  var hostRetries = new WeakMap();
  var dashboardRequestAt = 0;
  var dashboardTimer = null;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[char];
    });
  }

  function isOrderable(item) {
    return !!item && item.orderable !== false && item.price_configured !== false && Number(item.price || 0) > 0;
  }

  function usableImage(value) {
    var url = String(value || '').trim();
    if (!url || /\b(placeholder|no[-_ ]?image|missing[-_ ]?image|default[-_ ]?food)\b/i.test(url)) return '';
    return url;
  }

  function itemFor(api, id) {
    if (!api || !api.state || !Array.isArray(api.state.menu)) return null;
    return api.state.menu.find(function (item) { return String(item.id) === String(id); }) || null;
  }

  function money(api, item) {
    var symbol = api && api.state && api.state.settings && api.state.settings.currency || '€';
    return symbol + Number(item && item.price || 0).toFixed(2);
  }

  function showToast(root, message, isError) {
    var toast = root && root.querySelector('[data-pos-toast]');
    if (!toast) return;
    toast.textContent = String(message || '');
    toast.classList.toggle('is-error', !!isError);
    toast.classList.add('is-show');
    clearTimeout(toast.__pmdV27Timer);
    toast.__pmdV27Timer = setTimeout(function () { toast.classList.remove('is-show'); }, 3200);
  }

  function addStyle(scope, href, key) {
    if (!scope || !scope.querySelector || scope.querySelector('link[' + key + ']')) return;
    var link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = href;
    link.setAttribute(key, '1');
    scope.prepend(link);
  }

  function ensureStyles(root) {
    var scope = root && root.getRootNode ? root.getRootNode() : document;
    addStyle(scope, '/app/admin/assets/css/pmd-waiter-pos-polish-v26.css?v=27', 'data-pmd-pos-polish-v26-style');
    addStyle(scope, '/app/admin/assets/css/pmd-waiter-pos-simple-v27.css?v=27', 'data-pmd-pos-simple-v27-style');
  }

  function productTags(item) {
    var tags = [];
    if (item.vegan) tags.push(['Vegan', '']);
    else if (item.vegetarian) tags.push(['Vegetarian', '']);
    if (item.halal) tags.push(['Halal', '']);
    if (Array.isArray(item.allergens) && item.allergens.length) tags.push(['Allergens', 'is-allergen']);
    return tags.slice(0, 3);
  }

  function decorateProduct(button, api) {
    if (!button || !api || button.dataset.pmdV27Decorating === '1') return;
    var item = itemFor(api, button.getAttribute('data-pos-product'));
    if (!item) return;

    button.dataset.pmdV27Decorating = '1';
    button.querySelectorAll('.pmd-pos-plus').forEach(function (node) { node.remove(); });

    var orderable = isOrderable(item);
    if (button.dataset.pmdPosOrderable !== (orderable ? '1' : '0')) {
      button.dataset.pmdPosOrderable = orderable ? '1' : '0';
      button.classList.toggle('is-price-required', !orderable);
      button.setAttribute('aria-disabled', orderable ? 'false' : 'true');
    }

    var price = button.querySelector('.pmd-pos-price');
    var priceText = orderable ? money(api, item) : 'Price required';
    if (price && price.textContent !== priceText) price.textContent = priceText;

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
    delete button.dataset.pmdV27Decorating;
  }

  function syncProducts(root, api) {
    root.querySelectorAll('[data-pos-product]').forEach(function (button) { decorateProduct(button, api); });
    var warning = root.querySelector('[data-pos-menu-warning]');
    if (warning) warning.hidden = true;
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
    var price = root.querySelector('.pmd-pos-detail-price');
    if (price) price.textContent = orderable ? money(api, item) : 'Price required';
  }

  function install(root, api) {
    if (!root || !api || installedRoots.has(root)) return;
    installedRoots.add(root);
    ensureStyles(root);

    if (!api.__pmdV27OriginalAddItem && typeof api.addItem === 'function') {
      api.__pmdV27OriginalAddItem = api.addItem.bind(api);
      api.addItem = function (id) {
        var item = itemFor(api, id);
        if (!isOrderable(item)) {
          showToast(root, 'This food needs a valid price before it can be ordered.', true);
          return false;
        }
        return api.__pmdV27OriginalAddItem(id);
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
        showToast(root, 'Price must be configured first. Press and hold to view details.', true);
      }
      setTimeout(function () { syncDetailAction(root, api); }, 0);
    }, true);

    root.addEventListener('pointerup', function () {
      setTimeout(function () { syncDetailAction(root, api); }, 40);
    }, true);

    var menu = root.querySelector('[data-pos-menu]');
    var scheduled = false;
    var observer = null;
    if (menu) {
      observer = new MutationObserver(function () {
        if (scheduled) return;
        scheduled = true;
        requestAnimationFrame(function () {
          scheduled = false;
          syncProducts(root, api);
        });
      });
      // Observe only direct menu replacement. Decorations inside cards cannot retrigger this observer.
      observer.observe(menu, {childList: true});
    }

    var previousDestroy = api.destroy;
    api.destroy = function () {
      if (observer) observer.disconnect();
      installedRoots.delete(root);
      if (typeof previousDestroy === 'function') return previousDestroy.apply(api, arguments);
    };

    syncProducts(root, api);
    syncDetailAction(root, api);
    api.polishV27 = {
      version: 'pmd-waiter-pos-simple-v2.7',
      refresh: function () { syncProducts(root, api); syncDetailAction(root, api); }
    };

    console.info('[PMD] Waiter POS stability v2.7 active', {
      table: api.state && api.state.table,
      menuItems: api.state && api.state.menu ? api.state.menu.length : 0
    });
  }

  function scanHost(host) {
    if (!host || !host.shadowRoot) return false;
    var root = host.shadowRoot.querySelector('[data-pmd-pos-root]');
    if (!root) return false;
    var api = window.PMDWaiterPOSApp && typeof window.PMDWaiterPOSApp.get === 'function'
      ? window.PMDWaiterPOSApp.get(root)
      : null;
    if (!api && window.PMDWaiterPOS && window.PMDWaiterPOS.state && window.PMDWaiterPOS.state.root === root) api = window.PMDWaiterPOS;
    if (!api) return false;
    install(root, api);
    return true;
  }

  function watchHost(host) {
    if (!host || hostRetries.has(host)) return;
    var attempts = 0;
    var timer = setInterval(function () {
      attempts += 1;
      if (!document.documentElement.contains(host) || scanHost(host) || attempts >= 60) {
        clearInterval(timer);
        hostRetries.delete(host);
      }
    }, 250);
    hostRetries.set(host, timer);
  }

  function scanExisting() {
    document.querySelectorAll('[data-pmd-pos-root]').forEach(function (root) {
      var api = window.PMDWaiterPOSApp && typeof window.PMDWaiterPOSApp.get === 'function' ? window.PMDWaiterPOSApp.get(root) : null;
      if (api) install(root, api);
    });
    document.querySelectorAll('[data-pmd-pos-viewport-host]').forEach(watchHost);
  }

  function cleanNote(value) {
    var note = String(value || '').replace(/\s+/g, ' ').trim();
    if (!note || /^\[guest_session:/i.test(note)) return '';
    return note;
  }

  function dashboardOrders(payload) {
    var sections = payload && payload.sections || {};
    return sections.active_orders || sections.open_orders || payload.active_orders || payload.orders || [];
  }

  async function decorateDashboardNotes() {
    if (location.pathname.replace(/\/+$/, '') !== '/admin/dashboardwaiter') return;
    var now = Date.now();
    if (now - dashboardRequestAt < 10000) return;
    dashboardRequestAt = now;
    try {
      var response = await fetch('/admin/pmd-waiter-dashboard-v9-tenant-data?note_visibility_v27=' + now, {
        credentials: 'same-origin', cache: 'no-store', headers: {'Accept':'application/json','X-Requested-With':'XMLHttpRequest'}
      });
      var json = await response.json();
      if (!response.ok || !json || !json.ok) return;
      var byOrder = {};
      dashboardOrders(json).forEach(function (order) {
        var id = String(order.order_id || order.id || '');
        if (!id) return;
        byOrder[id] = (Array.isArray(order.items) ? order.items : []).map(function (item) {
          var note = cleanNote(item.note || item.comment || item.instructions);
          return note ? {name:item.name || item.menu_name || 'Menu item', qty:item.qty || item.quantity || 1, note:note} : null;
        }).filter(Boolean);
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
        if (actions) card.insertBefore(wrap, actions); else card.appendChild(wrap);
      });
    } catch (error) {
      console.warn('[PMD] Waiter POS v2.7 dashboard note visibility failed', error.message);
    }
  }

  function scheduleDashboardNotes() {
    clearTimeout(dashboardTimer);
    dashboardTimer = setTimeout(decorateDashboardNotes, 180);
  }

  // Only direct children of <html> are watched; dashboard subtree refreshes are ignored.
  new MutationObserver(function (mutations) {
    mutations.forEach(function (mutation) {
      mutation.addedNodes.forEach(function (node) {
        if (node && node.nodeType === 1 && node.matches && node.matches('[data-pmd-pos-viewport-host]')) watchHost(node);
      });
    });
  }).observe(document.documentElement, {childList: true});

  document.addEventListener('pmd-waiter-dashboard-rendered', scheduleDashboardNotes);
  document.addEventListener('DOMContentLoaded', function () { scanExisting(); scheduleDashboardNotes(); }, {once:true});

  window.addEventListener('pmd:waiter-pos-order-updated', function () {
    var bridge = window.PMDWaiterPOSBridge;
    if (!bridge || typeof bridge.close !== 'function' || !bridge.debug || !bridge.debug().overlayOpen) return;
    setTimeout(function () { bridge.close(); }, 900);
  });

  window.PMDWaiterPOSSimpleV27 = {
    version: 'pmd-waiter-pos-simple-v2.7',
    install: install,
    scan: scanExisting,
    refreshDashboardNotes: decorateDashboardNotes,
    debug: function () {
      return {
        version: 'pmd-waiter-pos-simple-v2.7',
        active: true,
        legacyV26Blocked: window.PMD_WAITER_POS_POLISH_V26 === true,
        shadowHosts: document.querySelectorAll('[data-pmd-pos-viewport-host]').length
      };
    }
  };
  window.PMDWaiterPOSPolishV26 = window.PMDWaiterPOSSimpleV27;

  scanExisting();
  scheduleDashboardNotes();
  console.info('[PMD] Waiter POS stability v2.7 loader active');
})();