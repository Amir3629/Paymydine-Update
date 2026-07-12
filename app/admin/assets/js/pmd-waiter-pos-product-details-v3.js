(function () {
  'use strict';

  if (window.PMDWaiterPOSProductDetailsV3) return;

  var installedRoots = new WeakMap();
  var HOLD_MS = 520;
  var MOVE_TOLERANCE = 12;

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (c) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c];
    });
  }

  function toNumber(value) {
    var n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }

  function unique(values) {
    var seen = Object.create(null);
    return (values || []).filter(function (value) {
      value = String(value || '').trim();
      if (!value || seen[value]) return false;
      seen[value] = true;
      return true;
    });
  }

  function money(api, value) {
    var symbol = (api && api.state && api.state.settings && api.state.settings.currency) || '€';
    return symbol + toNumber(value).toFixed(2);
  }

  function itemById(api, id) {
    var menu = api && api.state && Array.isArray(api.state.menu) ? api.state.menu : [];
    return menu.find(function (item) { return String(item.id) === String(id); }) || null;
  }

  function buildModal(root) {
    var modal = root.querySelector('[data-pos-product-detail-modal]');
    if (modal) return modal;

    modal = document.createElement('div');
    modal.className = 'pmd-pos-detail-modal';
    modal.setAttribute('data-pos-product-detail-modal', '');
    modal.setAttribute('aria-hidden', 'true');
    modal.innerHTML = '' +
      '<div class="pmd-pos-detail-backdrop" data-pos-detail-close></div>' +
      '<section class="pmd-pos-detail-card" role="dialog" aria-modal="true" aria-labelledby="pmd-pos-detail-title">' +
        '<button type="button" class="pmd-pos-detail-close" data-pos-detail-close aria-label="Close product details">×</button>' +
        '<div class="pmd-pos-detail-gallery">' +
          '<div class="pmd-pos-detail-image-stage" data-pos-detail-image-stage></div>' +
          '<button type="button" class="pmd-pos-detail-arrow is-prev" data-pos-detail-prev aria-label="Previous image">‹</button>' +
          '<button type="button" class="pmd-pos-detail-arrow is-next" data-pos-detail-next aria-label="Next image">›</button>' +
          '<div class="pmd-pos-detail-dots" data-pos-detail-dots></div>' +
        '</div>' +
        '<div class="pmd-pos-detail-content">' +
          '<div class="pmd-pos-detail-headline">' +
            '<div>' +
              '<div class="pmd-pos-detail-kicker" data-pos-detail-kicker></div>' +
              '<h2 id="pmd-pos-detail-title" data-pos-detail-title></h2>' +
            '</div>' +
            '<strong class="pmd-pos-detail-price" data-pos-detail-price></strong>' +
          '</div>' +
          '<div class="pmd-pos-detail-badges" data-pos-detail-badges></div>' +
          '<p class="pmd-pos-detail-description" data-pos-detail-description></p>' +
          '<div class="pmd-pos-detail-allergens" data-pos-detail-allergens hidden></div>' +
          '<div class="pmd-pos-detail-nutrition" data-pos-detail-nutrition hidden></div>' +
          '<div class="pmd-pos-detail-meta" data-pos-detail-meta></div>' +
          '<div class="pmd-pos-detail-actions">' +
            '<button type="button" class="pmd-pos-detail-secondary" data-pos-detail-close>Close</button>' +
            '<button type="button" class="pmd-pos-detail-primary" data-pos-detail-add>Add to order</button>' +
          '</div>' +
        '</div>' +
      '</section>';
    root.appendChild(modal);
    return modal;
  }

  function install(root, api) {
    if (!root || !api) return null;
    var existing = installedRoots.get(root);
    if (existing) return existing;

    var modal = buildModal(root);
    var currentItem = null;
    var images = [];
    var imageIndex = 0;
    var lastFocused = null;
    var observer = null;
    var destroyed = false;

    function $(selector, parent) { return (parent || modal).querySelector(selector); }
    function $$(selector, parent) { return Array.prototype.slice.call((parent || modal).querySelectorAll(selector)); }

    function renderImage() {
      var stage = $('[data-pos-detail-image-stage]');
      var dots = $('[data-pos-detail-dots]');
      var prev = $('[data-pos-detail-prev]');
      var next = $('[data-pos-detail-next]');
      if (!stage || !dots) return;

      if (!images.length) {
        var initials = String((currentItem && currentItem.name) || 'Menu item').trim().split(/\s+/).slice(0, 2).map(function (part) { return part.charAt(0); }).join('').toUpperCase();
        stage.innerHTML = '<div class="pmd-pos-detail-placeholder" aria-label="No product image available"><span>' + esc(initials || 'FOOD') + '</span><small>No image uploaded</small></div>';
      } else {
        stage.innerHTML = '<img src="' + esc(images[imageIndex]) + '" alt="' + esc((currentItem && currentItem.name) || 'Menu item') + '" data-pos-detail-image>';
        var image = $('[data-pos-detail-image]');
        if (image) image.addEventListener('error', function () {
          images.splice(imageIndex, 1);
          if (imageIndex >= images.length) imageIndex = Math.max(0, images.length - 1);
          renderImage();
        }, {once:true});
      }

      dots.innerHTML = images.length > 1 ? images.map(function (_, index) {
        return '<button type="button" class="' + (index === imageIndex ? 'is-active' : '') + '" data-pos-detail-dot="' + index + '" aria-label="Show image ' + (index + 1) + '"></button>';
      }).join('') : '';
      $$('[data-pos-detail-dot]', dots).forEach(function (button) {
        button.onclick = function () { imageIndex = Number(button.dataset.posDetailDot || 0); renderImage(); };
      });
      if (prev) prev.hidden = images.length < 2;
      if (next) next.hidden = images.length < 2;
    }

    function badge(label, className) {
      return '<span class="pmd-pos-detail-badge ' + className + '">' + esc(label) + '</span>';
    }

    function nutritionCell(label, value, suffix) {
      if (value === null || value === undefined || value === '') return '';
      return '<div><small>' + esc(label) + '</small><b>' + esc(value) + esc(suffix || '') + '</b></div>';
    }

    function open(item) {
      if (!item) return;
      currentItem = item;
      lastFocused = document.activeElement;
      imageIndex = 0;
      images = unique([item.image].concat(item.images || [], item.gallery || [], item.additional_images || []));

      $('[data-pos-detail-title]').textContent = item.name || 'Menu item';
      $('[data-pos-detail-price]').textContent = money(api, item.price);
      $('[data-pos-detail-description]').textContent = item.description || 'No description has been added for this item.';

      var categoryNames = Array.isArray(item.category_names) ? item.category_names : [];
      $('[data-pos-detail-kicker]').textContent = categoryNames.length ? categoryNames.join(' · ') : 'Menu item';

      var badges = [];
      if (item.is_chef_recommended) badges.push(badge('Chef recommended', 'is-chef'));
      if (item.is_bestseller) badges.push(badge('Best seller', 'is-best'));
      if (item.halal) badges.push(badge('Halal', 'is-diet'));
      if (item.vegetarian) badges.push(badge('Vegetarian', 'is-diet'));
      if (item.vegan) badges.push(badge('Vegan', 'is-diet'));
      if (item.has_options) badges.push(badge('Customizable', 'is-info'));
      $('[data-pos-detail-badges]').innerHTML = badges.join('');

      var allergens = Array.isArray(item.allergens) ? item.allergens : [];
      var allergenBox = $('[data-pos-detail-allergens]');
      if (allergenBox) {
        allergenBox.hidden = allergens.length < 1;
        allergenBox.innerHTML = allergens.length ? '<div class="pmd-pos-detail-section-title"><span>Allergen information</span><small>Check with the guest before ordering</small></div><div class="pmd-pos-detail-allergen-list">' + allergens.map(function (allergen) {
          var name = typeof allergen === 'string' ? allergen : (allergen.name || 'Allergen');
          return '<span>' + esc(name) + '</span>';
        }).join('') + '</div>' : '';
      }

      var nutrition = '';
      nutrition += nutritionCell('Calories', item.calories, ' kcal');
      nutrition += nutritionCell('Protein', item.protein, ' g');
      nutrition += nutritionCell('Carbs', item.carbs, ' g');
      nutrition += nutritionCell('Fat', item.fat, ' g');
      nutrition += nutritionCell('Sugar', item.sugar, ' g');
      nutrition += nutritionCell('Serving', item.serving_size, '');
      var nutritionBox = $('[data-pos-detail-nutrition]');
      if (nutritionBox) {
        nutritionBox.hidden = !nutrition;
        nutritionBox.innerHTML = nutrition ? '<div class="pmd-pos-detail-section-title"><span>Nutrition</span><small>Restaurant-provided estimate</small></div><div class="pmd-pos-detail-nutrition-grid">' + nutrition + '</div>' : '';
      }

      var meta = [];
      if (toNumber(item.prep_minutes) > 0) meta.push('<span><b>' + esc(item.prep_minutes) + ' min</b><small>Preparation</small></span>');
      if (toNumber(item.minimum_qty) > 1) meta.push('<span><b>' + esc(item.minimum_qty) + '</b><small>Minimum quantity</small></span>');
      if (Array.isArray(item.options) && item.options.length) meta.push('<span><b>' + esc(item.options.length) + '</b><small>Option groups</small></span>');
      $('[data-pos-detail-meta]').innerHTML = meta.join('');

      renderImage();
      modal.classList.add('is-show');
      modal.setAttribute('aria-hidden', 'false');
      root.classList.add('pmd-pos-detail-open');
      var closeButton = $('.pmd-pos-detail-close');
      if (closeButton) setTimeout(function () { closeButton.focus(); }, 0);
    }

    function close() {
      modal.classList.remove('is-show');
      modal.setAttribute('aria-hidden', 'true');
      root.classList.remove('pmd-pos-detail-open');
      currentItem = null;
      images = [];
      if (lastFocused && typeof lastFocused.focus === 'function') {
        try { lastFocused.focus({preventScroll:true}); } catch (e) { try { lastFocused.focus(); } catch (_) {} }
      }
      lastFocused = null;
    }

    function nextImage(direction) {
      if (images.length < 2) return;
      imageIndex = (imageIndex + direction + images.length) % images.length;
      renderImage();
    }

    function bindCard(button) {
      if (!button || button.dataset.pmdProductDetailsBound === '1') return;
      button.dataset.pmdProductDetailsBound = '1';
      button.setAttribute('aria-description', 'Tap to add. Press and hold for product details.');
      button.title = 'Tap to add · Hold for details';

      var timer = null;
      var startX = 0;
      var startY = 0;
      var suppressClickUntil = 0;

      function cancelPress() {
        clearTimeout(timer);
        timer = null;
        button.classList.remove('is-long-pressing');
      }

      button.addEventListener('pointerdown', function (event) {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        startX = event.clientX;
        startY = event.clientY;
        button.classList.add('is-long-pressing');
        clearTimeout(timer);
        timer = setTimeout(function () {
          timer = null;
          button.classList.remove('is-long-pressing');
          suppressClickUntil = Date.now() + 900;
          var item = itemById(api, button.getAttribute('data-pos-product'));
          if (item) {
            if (navigator.vibrate) { try { navigator.vibrate(18); } catch (e) {} }
            open(item);
          }
        }, HOLD_MS);
      });

      button.addEventListener('pointermove', function (event) {
        if (!timer) return;
        if (Math.abs(event.clientX - startX) > MOVE_TOLERANCE || Math.abs(event.clientY - startY) > MOVE_TOLERANCE) cancelPress();
      });
      button.addEventListener('pointerup', cancelPress);
      button.addEventListener('pointercancel', cancelPress);
      button.addEventListener('pointerleave', function (event) { if (event.pointerType === 'mouse') cancelPress(); });
      button.addEventListener('contextmenu', function (event) { event.preventDefault(); });
      button.addEventListener('click', function (event) {
        if (Date.now() < suppressClickUntil) {
          event.preventDefault();
          event.stopPropagation();
          if (event.stopImmediatePropagation) event.stopImmediatePropagation();
        }
      }, true);
    }

    function decorateProducts() {
      root.querySelectorAll('.pmd-pos-plus').forEach(function (plus) { plus.remove(); });
      root.querySelectorAll('[data-pos-product]').forEach(bindCard);
    }

    $$('[data-pos-detail-close]').forEach(function (button) { button.onclick = close; });
    var prev = $('[data-pos-detail-prev]');
    var next = $('[data-pos-detail-next]');
    if (prev) prev.onclick = function () { nextImage(-1); };
    if (next) next.onclick = function () { nextImage(1); };
    var add = $('[data-pos-detail-add]');
    if (add) add.onclick = function () {
      if (!currentItem) return;
      var id = currentItem.id;
      close();
      api.addItem(id);
    };

    modal.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        close();
        return;
      }
      if (event.key !== 'Tab') return;
      var focusable = $$('button:not([hidden]):not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])');
      if (!focusable.length) return;
      var first = focusable[0];
      var last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    });

    observer = new MutationObserver(decorateProducts);
    var menu = root.querySelector('[data-pos-menu]');
    if (menu) observer.observe(menu, {childList:true, subtree:true});
    decorateProducts();

    var originalDestroy = api.destroy;
    api.destroy = function () {
      destroy();
      if (typeof originalDestroy === 'function') originalDestroy.call(api);
    };

    function destroy() {
      if (destroyed) return;
      destroyed = true;
      if (observer) observer.disconnect();
      close();
      modal.remove();
      installedRoots.delete(root);
    }

    var detailsApi = {
      version: 'pmd-waiter-pos-product-details-v3',
      open: function (id) { open(itemById(api, id)); },
      close: close,
      destroy: destroy,
      debug: function () {
        return {
          version: 'pmd-waiter-pos-product-details-v3',
          active: true,
          productCards: root.querySelectorAll('[data-pos-product]').length,
          plusIcons: root.querySelectorAll('.pmd-pos-plus').length,
          modalOpen: modal.classList.contains('is-show'),
          currentItemId: currentItem ? currentItem.id : null
        };
      }
    };

    api.productDetails = detailsApi;
    installedRoots.set(root, detailsApi);
    window.PMDWaiterPOSProductDetails = detailsApi;
    console.info('[PMD] Waiter POS product details v3 active', detailsApi.debug());
    return detailsApi;
  }

  window.PMDWaiterPOSProductDetailsV3 = {
    install: install,
    get: function (root) { return installedRoots.get(root) || null; }
  };
})();
