(function () {
  'use strict';

  var VERSION = '1.1.1-kpi-stable-r79d';
  var state = {
    type: 'all',
    status: 'all',
    search: '',
    mode: 'create',
    editId: null,
    originalType: null,
    deleteArmed: false,
    busy: false,
    catalog: {},
    copy: {}
  };

  function q(selector, root) { return (root || document).querySelector(selector); }
  function qa(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }
  function main() { return q('[data-pmd-coupon-manager]'); }
  function modal() { return q('[data-pmd-coupon-modal]'); }
  function form() { return q('[data-pmd-coupon-form]'); }
  function copy(key, fallback) { return state.copy[key] || fallback || key; }

  function readJson(id) {
    var node = document.getElementById(id);
    if (!node) return {};
    try { return JSON.parse(node.textContent || '{}'); }
    catch (error) { return {}; }
  }

  function reloadDataFromDom() {
    state.catalog = readJson('pmd-coupon-manager-catalog');
    state.copy = readJson('pmd-coupon-manager-copy');
  }

  function ensureCsrf(formData) {
    if (!formData || formData.has('_token')) return;
    var meta = q('meta[name="csrf-token"]');
    var hidden = q('input[name="_token"]');
    var token = meta && meta.content ? meta.content : (hidden ? hidden.value : '');
    if (token) formData.append('_token', token);
  }

  async function backend(handler, formData) {
    ensureCsrf(formData);
    var response = await fetch('/admin/coupons', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'X-IGNITER-REQUEST-HANDLER': handler,
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json'
      },
      body: formData
    });

    var text = await response.text();
    var data = {};
    try { data = text ? JSON.parse(text) : {}; }
    catch (error) { data = {message: text || 'Request failed'}; }

    var message = data.message || data.error || data.X_IGNITER_ERROR_MESSAGE || '';
    if (!response.ok || data.ok === false || data.X_IGNITER_ERROR_MESSAGE) {
      throw new Error(message || ('Request failed (' + response.status + ')'));
    }
    return data;
  }

  function setModalStatus(text, kind) {
    var node = q('[data-pmd-coupon-modal-status]');
    if (!node) return;
    node.textContent = text || '';
    node.classList.toggle('is-error', kind === 'error');
    node.classList.toggle('is-ok', kind === 'ok');
  }

  function setBusy(busy) {
    state.busy = !!busy;
    qa('[data-pmd-coupon-save], [data-pmd-coupon-close], [data-pmd-coupon-delete]').forEach(function (button) {
      button.disabled = state.busy;
    });
  }

  function setType(type, force) {
    var input = q('[data-pmd-card-type-input]');
    if (!input) return;
    if (!force && state.mode === 'edit' && state.originalType && type !== state.originalType) return;

    input.value = type;
    qa('[data-pmd-card-type]').forEach(function (button) {
      button.classList.toggle('is-selected', button.getAttribute('data-pmd-card-type') === type);
      button.classList.toggle('is-locked', state.mode === 'edit' && button.getAttribute('data-pmd-card-type') !== state.originalType);
      button.setAttribute('aria-pressed', button.getAttribute('data-pmd-card-type') === type ? 'true' : 'false');
    });

    var discount = type === 'coupon' || type === 'voucher';
    var balance = type === 'gift_card' || type === 'credit' || type === 'comp';
    var gift = type === 'gift_card';
    var discountSection = q('[data-pmd-discount-section]');
    var balanceSection = q('[data-pmd-balance-section]');
    var giftSection = q('[data-pmd-gift-section]');
    if (discountSection) discountSection.hidden = !discount;
    if (balanceSection) balanceSection.hidden = !balance;
    if (giftSection) giftSection.hidden = !gift;
  }

  function setDiscountType(type) {
    var input = q('[data-pmd-discount-type-input]');
    if (input) input.value = type;
    qa('[data-pmd-discount-type]').forEach(function (button) {
      var selected = button.getAttribute('data-pmd-discount-type') === type;
      button.classList.toggle('is-selected', selected);
      button.setAttribute('aria-pressed', selected ? 'true' : 'false');
    });
    var discountInput = q('[data-pmd-coupon-discount]');
    if (discountInput) {
      discountInput.max = type === 'P' ? '100' : '9999999';
      discountInput.step = type === 'P' ? '0.1' : '0.01';
    }
  }

  function setGiftOption(name, value) {
    var input = q('[data-pmd-gift-option-input="' + name + '"]');
    if (input) input.value = value ? '1' : '0';
    var button = q('[data-pmd-gift-option="' + name + '"]');
    if (button) {
      button.classList.toggle('is-selected', !!value);
      button.setAttribute('aria-pressed', value ? 'true' : 'false');
    }
    if (name === 'is_purchasable') {
      var wrap = q('[data-pmd-purchase-price-wrap]');
      if (wrap) wrap.hidden = !value;
    }
  }

  function resetDelete() {
    state.deleteArmed = false;
    var button = q('[data-pmd-coupon-delete]');
    var label = q('[data-pmd-coupon-delete-label]');
    if (button) button.classList.remove('is-armed');
    if (label) label.textContent = copy('delete', 'Delete');
  }

  function resetForm() {
    var node = form();
    if (!node) return;
    node.reset();
    q('[data-pmd-coupon-id]').value = '';
    q('[data-pmd-card-type-input]').value = 'coupon';
    q('[data-pmd-discount-type-input]').value = 'F';
    q('[data-pmd-coupon-status]').checked = true;
    q('[data-pmd-coupon-initial-balance]').readOnly = false;
    q('[data-pmd-current-balance-wrap]').hidden = true;
    q('[data-pmd-coupon-current-balance]').value = '';
    setGiftOption('is_purchasable', false);
    setGiftOption('is_reloadable', false);
    setGiftOption('is_transferable', false);
    setDiscountType('F');
    state.originalType = null;
    setType('coupon', true);
    resetDelete();
    setModalStatus('', '');
    var deleteButton = q('[data-pmd-coupon-delete]');
    if (deleteButton) deleteButton.hidden = true;
  }

  function openModal(mode, item) {
    var node = modal();
    if (!node) return;
    resetForm();
    state.mode = mode;
    state.editId = item ? Number(item.id) : null;
    state.originalType = item ? item.card_type : null;

    var title = q('[data-pmd-coupon-modal-title]');
    if (title) title.textContent = mode === 'edit' ? copy('modal_edit', 'Edit coupon / card') : copy('modal_create', 'Create coupon / card');

    if (item) {
      q('[data-pmd-coupon-id]').value = String(item.id || '');
      q('[data-pmd-coupon-name]').value = item.name || '';
      q('[data-pmd-coupon-code]').value = item.code || '';
      q('[data-pmd-coupon-description]').value = item.description || '';
      q('[data-pmd-coupon-discount]').value = item.discount == null ? '' : String(item.discount);
      q('[data-pmd-coupon-initial-balance]').value = item.initial_balance == null ? '' : String(item.initial_balance);
      q('[data-pmd-coupon-initial-balance]').readOnly = true;
      q('[data-pmd-coupon-current-balance]').value = item.current_balance == null ? '' : String(item.current_balance);
      q('[data-pmd-current-balance-wrap]').hidden = !(item.card_type === 'gift_card' || item.card_type === 'credit' || item.card_type === 'comp');
      q('[data-pmd-coupon-purchase-price]').value = item.purchase_price == null ? '' : String(item.purchase_price);
      q('[data-pmd-coupon-min-total]').value = item.min_total == null ? '0' : String(item.min_total);
      q('[data-pmd-coupon-redemptions]').value = item.redemptions == null ? '0' : String(item.redemptions);
      q('[data-pmd-coupon-customer-redemptions]').value = item.customer_redemptions == null ? '0' : String(item.customer_redemptions);
      q('[data-pmd-coupon-expiry]').value = item.expiry_date || '';
      q('[data-pmd-coupon-status]').checked = !!item.status;
      setDiscountType(item.discount_type === 'P' ? 'P' : 'F');
      setGiftOption('is_purchasable', !!item.is_purchasable);
      setGiftOption('is_reloadable', !!item.is_reloadable);
      setGiftOption('is_transferable', !!item.is_transferable);
      setType(item.card_type || 'coupon', true);
      var deleteButton = q('[data-pmd-coupon-delete]');
      if (deleteButton) deleteButton.hidden = false;
    } else {
      setType('coupon', true);
    }

    qa('[data-pmd-card-type]').forEach(function (button) {
      button.classList.toggle('is-locked', mode === 'edit' && button.getAttribute('data-pmd-card-type') !== state.originalType);
    });

    node.hidden = false;
    node.setAttribute('aria-hidden', 'false');
    document.body.classList.add('pmd-coupon-modal-open');
    var scroll = q('[data-pmd-coupon-modal-scroll]');
    if (scroll) scroll.scrollTop = 0;
    var focus = q('[data-pmd-coupon-name]');
    if (focus) focus.focus({preventScroll: true});
  }

  function closeModal() {
    if (state.busy) return;
    var node = modal();
    if (!node) return;
    node.hidden = true;
    node.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('pmd-coupon-modal-open');
    state.editId = null;
    state.originalType = null;
    resetDelete();
  }

  function generateCode() {
    var type = q('[data-pmd-card-type-input]') ? q('[data-pmd-card-type-input]').value : 'coupon';
    var prefix = {coupon: 'CP', gift_card: 'GC', voucher: 'V', credit: 'CR', comp: 'COMP'}[type] || 'CP';
    var bytes = new Uint8Array(4);
    if (window.crypto && window.crypto.getRandomValues) window.crypto.getRandomValues(bytes);
    else for (var i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    var suffix = Array.prototype.map.call(bytes, function (value) { return value.toString(16).padStart(2, '0'); }).join('').toUpperCase();
    var input = q('[data-pmd-coupon-code]');
    if (input) { input.value = prefix + '-' + suffix; input.focus(); }
  }

  function applyFilters() {
    var root = main();
    if (!root) return;
    var search = state.search.trim().toLowerCase();
    var visible = 0;
    qa('[data-pmd-coupon-card]', root).forEach(function (card) {
      var typeOk = state.type === 'all' || card.getAttribute('data-card-type') === state.type;
      var statusOk = state.status === 'all' || card.getAttribute('data-status') === state.status;
      var searchOk = !search || (card.getAttribute('data-search') || '').indexOf(search) !== -1;
      var show = typeOk && statusOk && searchOk;
      card.hidden = !show;
      if (show) visible++;
    });
    var noResults = q('[data-pmd-coupon-no-results]', root);
    if (noResults) noResults.hidden = visible !== 0 || qa('[data-pmd-coupon-card]', root).length === 0;
  }

  async function refreshWorkspace() {
    var url = new URL(window.location.href);
    url.searchParams.delete('pmd_mode');
    url.searchParams.delete('pmd_id');
    url.searchParams.set('pmd_refresh', String(Date.now()));

    var response = await fetch(url.toString(), {
      method: 'GET',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {'Accept': 'text/html'}
    });
    if (!response.ok) throw new Error(copy('refresh_error', 'Could not refresh workspace.'));

    var html = await response.text();
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var next = q('[data-pmd-coupon-refresh-zone]', doc);
    var current = q('[data-pmd-coupon-refresh-zone]');
    if (!next || !current) throw new Error(copy('refresh_error', 'Could not refresh workspace.'));

    current.replaceWith(next);
    var nextCatalog = doc.getElementById('pmd-coupon-manager-catalog');
    var currentCatalog = document.getElementById('pmd-coupon-manager-catalog');
    if (nextCatalog && currentCatalog) currentCatalog.textContent = nextCatalog.textContent;
    var nextCopy = doc.getElementById('pmd-coupon-manager-copy');
    var currentCopy = document.getElementById('pmd-coupon-manager-copy');
    if (nextCopy && currentCopy) currentCopy.textContent = nextCopy.textContent;
    reloadDataFromDom();

    // PMD_COUPON_KPI_AUTOFIT_R79
    // The refresh zone includes the KPI row, so observe and fit the
    // newly rendered nodes again after save/toggle/delete refreshes.
    observeCouponKpiRow();
    scheduleCouponKpiFit();

    var searchInput = q('[data-pmd-coupon-search]');
    if (searchInput) searchInput.value = state.search;
    qa('[data-pmd-type-filter]').forEach(function (button) { button.classList.toggle('is-active', button.getAttribute('data-pmd-type-filter') === state.type); });
    qa('[data-pmd-status-filter]').forEach(function (button) { button.classList.toggle('is-active', button.getAttribute('data-pmd-status-filter') === state.status); });
    applyFilters();
  }

  async function saveCoupon() {
    if (state.busy) return;
    var node = form();
    if (!node) return;
    if (!node.reportValidity()) return;

    var saveButton = q('[data-pmd-coupon-save]');
    var previous = saveButton ? saveButton.textContent : '';
    setBusy(true);
    if (saveButton) saveButton.textContent = copy('saving', 'Saving...');
    setModalStatus('', '');

    try {
      var data = new FormData(node);
      await backend('onPmdCouponSaveV1', data);
      setModalStatus(copy('saved', 'Saved'), 'ok');
      await refreshWorkspace();
      setBusy(false);
      if (saveButton) saveButton.textContent = previous || copy('save', 'Save');
      closeModal();
    } catch (error) {
      setBusy(false);
      if (saveButton) saveButton.textContent = previous || copy('save', 'Save');
      setModalStatus(error.message || copy('save_error', 'Could not save.'), 'error');
    }
  }

  async function toggleStatus(id, button) {
    if (!id || state.busy) return;
    state.busy = true;
    if (button) button.disabled = true;
    try {
      var data = new FormData();
      data.append('coupon_id', String(id));
      await backend('onPmdCouponToggleStatusV1', data);
      await refreshWorkspace();
    } catch (error) {
      window.alert(error.message || copy('toggle_error', 'Could not change status.'));
    } finally {
      state.busy = false;
      if (button && document.body.contains(button)) button.disabled = false;
    }
  }

  async function deleteCoupon() {
    if (state.busy || !state.editId) return;
    var button = q('[data-pmd-coupon-delete]');
    var label = q('[data-pmd-coupon-delete-label]');
    if (!state.deleteArmed) {
      state.deleteArmed = true;
      if (button) button.classList.add('is-armed');
      if (label) label.textContent = copy('delete_permanently', 'Delete permanently');
      setModalStatus(copy('delete_confirm', 'Delete permanently?'), 'error');
      return;
    }

    setBusy(true);
    if (label) label.textContent = copy('deleting', 'Deleting...');
    try {
      var data = new FormData();
      data.append('coupon_id', String(state.editId));
      await backend('onPmdCouponDeleteV1', data);
      await refreshWorkspace();
      setBusy(false);
      closeModal();
    } catch (error) {
      setBusy(false);
      setModalStatus(error.message || copy('delete_error', 'Could not delete.'), 'error');
      resetDelete();
    }
  }

  async function copyCode(code, button) {
    if (!code) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) await navigator.clipboard.writeText(code);
      else {
        var area = document.createElement('textarea');
        area.value = code;
        area.style.position = 'fixed';
        area.style.opacity = '0';
        document.body.appendChild(area);
        area.select();
        document.execCommand('copy');
        area.remove();
      }
      if (button) button.setAttribute('title', copy('copied', 'Copied'));
    } catch (error) {}
  }

  function handleLegacyOpen() {
    var params = new URLSearchParams(window.location.search);
    var mode = params.get('pmd_mode');
    if (mode === 'create') {
      openModal('create');
      return;
    }
    if (mode === 'edit') {
      var id = params.get('pmd_id');
      var item = state.catalog[String(id || '')];
      if (item) openModal('edit', item);
    }
  }

  document.addEventListener('click', function (event) {
    var target = event.target.closest('button, [data-pmd-coupon-close]');
    if (!target) return;

    if (target.matches('[data-pmd-coupon-create]')) { openModal('create'); return; }
    if (target.matches('[data-pmd-coupon-close]')) { closeModal(); return; }
    if (target.matches('[data-pmd-card-type]')) { setType(target.getAttribute('data-pmd-card-type'), false); return; }
    if (target.matches('[data-pmd-discount-type]')) { setDiscountType(target.getAttribute('data-pmd-discount-type')); return; }
    if (target.matches('[data-pmd-gift-option]')) {
      var name = target.getAttribute('data-pmd-gift-option');
      var input = q('[data-pmd-gift-option-input="' + name + '"]');
      setGiftOption(name, !input || input.value !== '1');
      return;
    }
    if (target.matches('[data-pmd-generate-code]')) { generateCode(); return; }
    if (target.matches('[data-pmd-coupon-save]')) { saveCoupon(); return; }
    if (target.matches('[data-pmd-coupon-delete]')) { deleteCoupon(); return; }
    if (target.matches('[data-pmd-coupon-edit]')) {
      var id = target.getAttribute('data-pmd-coupon-edit');
      var item = state.catalog[String(id || '')];
      if (item) openModal('edit', item);
      return;
    }
    if (target.matches('[data-pmd-coupon-toggle]')) { toggleStatus(Number(target.getAttribute('data-pmd-coupon-toggle')), target); return; }
    if (target.matches('[data-pmd-copy-code]')) { copyCode(target.getAttribute('data-pmd-copy-code'), target); return; }
    if (target.matches('[data-pmd-type-filter]')) {
      state.type = target.getAttribute('data-pmd-type-filter') || 'all';
      qa('[data-pmd-type-filter]').forEach(function (button) { button.classList.toggle('is-active', button === target); });
      applyFilters();
      return;
    }
    if (target.matches('[data-pmd-status-filter]')) {
      state.status = target.getAttribute('data-pmd-status-filter') || 'all';
      qa('[data-pmd-status-filter]').forEach(function (button) { button.classList.toggle('is-active', button === target); });
      applyFilters();
    }
  });

  document.addEventListener('input', function (event) {
    if (event.target.matches('[data-pmd-coupon-search]')) {
      state.search = event.target.value || '';
      applyFilters();
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && modal() && !modal().hidden) closeModal();
  });

  function mountNotificationIntoHeader() {
    var header = document.getElementById('pmd-r2-clean-header');
    if (!header) return false;

    var slot = header.querySelector('.pmd-owner-notif-slot');
    var root = document.getElementById('notif-root');
    if (!slot || !root) return false;

    if (!header.contains(root)) slot.replaceWith(root);
    if (!header.contains(root)) return false;

    var trigger = root.querySelector('#notifDropdown');
    if (trigger) {
      trigger.setAttribute('aria-label', copy('notifications', 'Notifications'));
      trigger.setAttribute('title', copy('notifications', 'Notifications'));
    }

    root.removeAttribute('hidden');
    root.removeAttribute('aria-hidden');
    root.setAttribute('data-pmd-coupon-notification', 'mounted-v11');
    return true;
  }

  function rect(node) {
    if (!node) return null;
    var r = node.getBoundingClientRect();
    return {
      x: Math.round(r.x),
      y: Math.round(r.y),
      width: Math.round(r.width),
      height: Math.round(r.height)
    };
  }

  // PMD_COUPON_KPI_AUTOFIT_R79
  //
  // Currency formatting can produce materially wider values than simple
  // integer KPIs. Keep the normal CSS font size unless the ACTUAL rendered
  // value crosses its own copy boundary; then shrink only that value.
  //
  // No fixed currency assumptions and no per-currency hacks.
  var pmdKpiFitFrame = 0;
  var pmdKpiResizeObserver = null;

  // PMD_COUPON_KPI_STABLE_TIERS_R79D
  function fitCouponKpiValues() {
    qa('.pmd-coupon-kpi__copy > strong').forEach(function (value) {
      if (!value) return;

      // Remove any inline typography left by the retired R79/R79B
      // pixel fitting engine.
      value.style.removeProperty('font-size');
      value.style.removeProperty('letter-spacing');

      var text = String(
        value.textContent || ''
      )
        .replace(/\s+/g, '')
        .trim();

      var length = Array.from(text).length;
      var size = 'normal';

      if (length >= 14) {
        size = 'nano';
      } else if (length >= 11) {
        size = 'micro';
      } else if (length >= 8) {
        size = 'tight';
      } else if (length === 7) {
        size = 'compact';
      }

      if (size === 'normal') {
        value.removeAttribute(
          'data-pmd-kpi-size'
        );
      } else {
        value.setAttribute(
          'data-pmd-kpi-size',
          size
        );
      }

      value.setAttribute(
        'data-pmd-kpi-fit',
        'stable-' + size
      );
    });
  }

  function scheduleCouponKpiFit() {
    window.cancelAnimationFrame(pmdKpiFitFrame);

    pmdKpiFitFrame = window.requestAnimationFrame(
      fitCouponKpiValues
    );
  }

  function observeCouponKpiRow() {
    // PMD_COUPON_KPI_STABLE_TIERS_R79D
    // Intentionally disabled.
    //
    // KPI content tiers are deterministic and the responsive grid
    // already handles viewport geometry. Watching our own font-size
    // changes caused the visible R79B blinking loop.
    return;
  }

  function mountCouponKpiAutoFit() {
    scheduleCouponKpiFit();
    observeCouponKpiRow();

    window.addEventListener(
      'resize',
      scheduleCouponKpiFit,
      {passive: true}
    );

    // Web-font metrics can change after first paint.
    if (
      document.fonts
      && document.fonts.ready
      && typeof document.fonts.ready.then === 'function'
    ) {
      document.fonts.ready.then(
        scheduleCouponKpiFit
      );
    }
  }

  function init() {
    reloadDataFromDom();
    mountNotificationIntoHeader();
    handleLegacyOpen();
    mountCouponKpiAutoFit();
    window.PMDCouponManagerV1 = {
      version: VERSION,
      samePageCreateEdit: true,
      legacyDetailPagesRetired: true,
      polling: false,
      mutationObserver: false,
      refreshWorkspace: refreshWorkspace,
      audit: function () {
        return {
          version: VERSION,
          cards: qa('[data-pmd-coupon-card]').length,
          modalOpen: !!(modal() && !modal().hidden),
          bodyScrollLocked: document.body.classList.contains('pmd-coupon-modal-open'),
          typeFilter: state.type,
          statusFilter: state.status,
          legacyCreateLinkCount: qa('a[href*="/coupons/create"]').length,
          legacyEditLinkCount: qa('a[href*="/coupons/edit/"]').length,
          header: rect(document.getElementById('pmd-r2-clean-header')),
          createAction: rect(q('[data-pmd-coupon-create]')),
          notification: rect(document.querySelector('#pmd-r2-clean-header #notifDropdown') || document.querySelector('#pmd-r2-clean-header .pmd-dashboard-lab__notif-slot')),
          notificationMounted: Boolean(document.querySelector('#pmd-r2-clean-header #notif-root'))
        };
      }
    };
    if (window.console && console.info) console.info('[PMD Coupon Manager V1] Ready', window.PMDCouponManagerV1.audit());
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true});
  else init();
})();

/* PMD_COUPON_ASSET_CACHE_BUST_R79C */
