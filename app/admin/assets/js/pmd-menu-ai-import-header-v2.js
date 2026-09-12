(function () {
  'use strict';

  // PMD_MENU_AI_IMPORT_HEADER_V2
  // Menu owns the trigger; Pmdmenuaiimport remains the authenticated import
  // authority. The workspace opens in a same-origin modal card so the operator
  // does not have to leave Menu Manager.
  var modal = null;
  var iframe = null;
  var needsReload = false;
  var previousOverflow = '';
  var repairButton = null;

  function adminBase() {
    var parts = window.location.pathname.split('/').filter(Boolean);
    return '/' + (parts[0] || 'admin');
  }

  function setStyle(node, property, value) {
    node.style.setProperty(property, value, 'important');
  }

  function csrf(data) {
    if (data.has('_token')) return;
    var meta = document.querySelector('meta[name="csrf-token"]');
    var hidden = document.querySelector('input[name="_token"]');
    var token = meta && meta.content ? meta.content : (hidden ? hidden.value : '');
    if (token) data.append('_token', token);
  }

  async function handler(name, data) {
    csrf(data);
    var response = await fetch(adminBase() + '/menus', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'X-IGNITER-REQUEST-HANDLER': name,
        'X-Requested-With': 'XMLHttpRequest',
        'Accept': 'application/json'
      },
      body: data
    });
    var raw = await response.text();
    var payload = {};
    try { payload = raw ? JSON.parse(raw) : {}; }
    catch (error) { payload = {message: raw || 'Request failed.'}; }
    if (!response.ok || payload.ok === false || payload.X_IGNITER_ERROR_MESSAGE) {
      throw new Error(payload.message || payload.error || payload.X_IGNITER_ERROR_MESSAGE || ('Request failed (' + response.status + ')'));
    }
    return payload;
  }

  function readCatalog() {
    var node = document.getElementById('pmd-menu-manager-catalog');
    if (!node) return {};
    try { return JSON.parse(node.textContent || '{}') || {}; }
    catch (error) { return {}; }
  }

  function appendOptional(data, key, value) {
    if (value === null || value === undefined || value === '') return;
    data.append(key, String(value));
  }

  function menuDataForImageClear(item) {
    var data = new FormData();
    data.append('menu_id', String(Number(item.id || 0)));
    data.append('menu_name', String(item.name || '').trim());
    data.append('menu_price', String(Number(item.price || 0)));
    data.append('menu_description', String(item.description || '').trim());
    (Array.isArray(item.category_ids) ? item.category_ids : []).forEach(function (id) {
      if (Number(id) > 0) data.append('category_ids[]', String(Number(id)));
    });

    data.append('is_halal', item.is_halal ? '1' : '0');
    data.append('is_vegetarian', item.is_vegetarian ? '1' : '0');
    data.append('is_vegan', item.is_vegan ? '1' : '0');
    data.append('allergen_ids_present', '1');
    (Array.isArray(item.allergen_ids) ? item.allergen_ids : []).forEach(function (id) {
      if (Number(id) > 0) data.append('allergen_ids[]', String(Number(id)));
    });

    appendOptional(data, 'calories', item.calories);
    appendOptional(data, 'serving_size', item.serving_size);
    appendOptional(data, 'protein', item.protein);
    appendOptional(data, 'carbs', item.carbs);
    appendOptional(data, 'fat', item.fat);
    appendOptional(data, 'sugar', item.sugar);
    appendOptional(data, 'prep_time_minutes', item.prep_time_minutes);

    // Menus_model::afterSave reads this raw request payload and its canonical
    // gallery authority clears menu_images for this food.
    data.append('menu_images_inline_json', '[]');
    return data;
  }

  async function sha256ForUrl(url) {
    if (!window.crypto || !window.crypto.subtle) throw new Error('Secure image hashing is unavailable in this browser.');
    var response = await fetch(url, {credentials: 'same-origin', cache: 'force-cache'});
    if (!response.ok) throw new Error('Could not read one of the food images.');
    var bytes = await response.arrayBuffer();
    var digest = await window.crypto.subtle.digest('SHA-256', bytes);
    return Array.from(new Uint8Array(digest)).map(function (value) {
      return value.toString(16).padStart(2, '0');
    }).join('');
  }

  async function suspiciousRepeatedPhotoGroups() {
    var catalog = readCatalog();
    var rows = Object.keys(catalog).map(function (key) { return catalog[key]; }).filter(function (item) {
      var image = String(item && item.image || '');
      return Number(item && item.id || 0) > 0 && image.indexOf('pmdmenu_') !== -1;
    });

    var hashed = await Promise.all(rows.map(async function (item) {
      try {
        return {item: item, hash: await sha256ForUrl(String(item.image || ''))};
      } catch (error) {
        return null;
      }
    }));

    var groups = {};
    hashed.filter(Boolean).forEach(function (row) {
      if (!groups[row.hash]) groups[row.hash] = [];
      groups[row.hash].push(row.item);
    });

    return Object.keys(groups).map(function (hash) {
      return {hash: hash, items: groups[hash]};
    }).filter(function (group) {
      return group.items.length >= 3;
    }).sort(function (a, b) {
      return b.items.length - a.items.length;
    });
  }

  async function clearRepeatedPhotoGroup(group) {
    var items = group.items.slice();
    var cursor = 0;
    var failures = [];

    async function worker() {
      while (true) {
        var index = cursor++;
        if (index >= items.length) return;
        var item = items[index];
        try {
          await handler('onPmdMenuManagerSaveV1', menuDataForImageClear(item));
        } catch (error) {
          failures.push((item.name || ('#' + item.id)) + ': ' + (error.message || 'failed'));
        }
      }
    }

    var workers = [];
    for (var i = 0; i < Math.min(3, items.length); i++) workers.push(worker());
    await Promise.all(workers);
    if (failures.length) throw new Error(failures.slice(0, 3).join('\n'));
  }

  async function repairRepeatedPhotos() {
    if (!repairButton || repairButton.disabled) return;
    var original = repairButton.textContent;
    repairButton.disabled = true;
    repairButton.textContent = 'Checking photos…';

    try {
      var groups = await suspiciousRepeatedPhotoGroups();
      if (!groups.length) {
        window.alert('No repeated uploaded photo was detected on 3 or more menu items. Nothing was changed.');
        return;
      }

      var group = groups[0];
      var names = group.items.slice(0, 8).map(function (item) { return item.name; }).join(', ');
      var more = group.items.length > 8 ? (' and ' + (group.items.length - 8) + ' more') : '';
      var approved = window.confirm(
        'PayMyDine found the exact same uploaded image on ' + group.items.length + ' foods.\n\n' +
        names + more + '\n\n' +
        'This looks like the menu screenshot that was accidentally reused by AI Import. Remove that repeated image from these foods so they use the PayMyDine logo instead?'
      );
      if (!approved) return;

      repairButton.textContent = 'Removing repeated photo…';
      await clearRepeatedPhotoGroup(group);
      needsReload = true;
      window.alert('Repeated menu screenshot removed from ' + group.items.length + ' foods. PayMyDine logo will be used where no real food photo exists.');
      window.location.reload();
    } catch (error) {
      window.alert(error.message || 'Repeated photos could not be repaired.');
    } finally {
      if (repairButton) {
        repairButton.disabled = false;
        repairButton.textContent = original;
      }
    }
  }

  function injectEmbeddedStyles() {
    if (!iframe || !iframe.contentDocument) return;
    var doc = iframe.contentDocument;
    var style = doc.getElementById('pmd-ai-import-embedded-style-v2');
    if (!style) {
      style = doc.createElement('style');
      style.id = 'pmd-ai-import-embedded-style-v2';
      style.textContent = ''
        + '#pmd-side-menu2{display:none!important}'
        + '.page-wrapper,.page-content,.main-content,.content-wrapper{margin-left:0!important;padding-left:0!important;left:0!important;width:100%!important;max-width:none!important}'
        + '.pmd-ai-import{max-width:none!important;padding:22px 24px 40px!important}'
        + '.pmd-ai-import__header{padding-top:0!important}'
        + '.pmd-ai-import__header .pmd-ai-import__back{display:none!important}'
        + 'body{overflow:auto!important;background:#f8fbfd!important}';
      (doc.head || doc.documentElement).appendChild(style);
    }
  }

  function closeModal(forceReload) {
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = previousOverflow;
    if (iframe) iframe.src = 'about:blank';

    if (forceReload || needsReload) {
      window.location.reload();
      return;
    }

    var trigger = document.querySelector('[data-pmd-menu-ai-import-trigger]');
    if (trigger) trigger.focus();
  }

  function buildModal() {
    if (modal) return modal;

    modal = document.createElement('div');
    modal.setAttribute('data-pmd-menu-ai-import-modal', '');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Import menu with AI');
    modal.setAttribute('aria-hidden', 'true');
    modal.hidden = true;

    setStyle(modal, 'position', 'fixed');
    setStyle(modal, 'inset', '0');
    setStyle(modal, 'z-index', '30000');
    setStyle(modal, 'display', 'grid');
    setStyle(modal, 'place-items', 'center');
    setStyle(modal, 'padding', '24px');

    var backdrop = document.createElement('button');
    backdrop.type = 'button';
    backdrop.setAttribute('aria-label', 'Close AI import');
    backdrop.setAttribute('data-pmd-menu-ai-import-modal-close', '');
    setStyle(backdrop, 'position', 'absolute');
    setStyle(backdrop, 'inset', '0');
    setStyle(backdrop, 'border', '0');
    setStyle(backdrop, 'background', 'rgba(7, 31, 29, .34)');
    setStyle(backdrop, 'backdrop-filter', 'blur(5px)');
    setStyle(backdrop, 'cursor', 'default');

    var card = document.createElement('section');
    setStyle(card, 'position', 'relative');
    setStyle(card, 'z-index', '1');
    setStyle(card, 'display', 'grid');
    setStyle(card, 'grid-template-rows', '62px minmax(0, 1fr)');
    setStyle(card, 'width', 'min(1480px, calc(100vw - 48px))');
    setStyle(card, 'height', 'min(920px, calc(100vh - 48px))');
    setStyle(card, 'overflow', 'hidden');
    setStyle(card, 'border', '1px solid #d7e8ee');
    setStyle(card, 'border-radius', '22px');
    setStyle(card, 'background', '#ffffff');
    setStyle(card, 'box-shadow', '0 30px 90px rgba(7,31,29,.22)');

    var bar = document.createElement('header');
    setStyle(bar, 'display', 'flex');
    setStyle(bar, 'align-items', 'center');
    setStyle(bar, 'justify-content', 'space-between');
    setStyle(bar, 'gap', '16px');
    setStyle(bar, 'padding', '0 18px 0 22px');
    setStyle(bar, 'border-bottom', '1px solid #e1ecef');
    setStyle(bar, 'background', '#ffffff');

    var title = document.createElement('div');
    title.innerHTML = '<strong style="display:block;color:#10201f;font-size:16px;font-weight:900">Import menu with AI</strong><small style="color:#6b7b7a;font-size:11px">Upload, review, then import into this Menu</small>';
    bar.appendChild(title);

    var barActions = document.createElement('div');
    setStyle(barActions, 'display', 'flex');
    setStyle(barActions, 'align-items', 'center');
    setStyle(barActions, 'gap', '10px');

    repairButton = document.createElement('button');
    repairButton.type = 'button';
    repairButton.textContent = 'Fix repeated photos';
    setStyle(repairButton, 'min-height', '40px');
    setStyle(repairButton, 'padding', '0 14px');
    setStyle(repairButton, 'border', '1px solid #b9dfd3');
    setStyle(repairButton, 'border-radius', '12px');
    setStyle(repairButton, 'background', '#edf8f4');
    setStyle(repairButton, 'color', '#075f4f');
    setStyle(repairButton, 'font-size', '12px');
    setStyle(repairButton, 'font-weight', '850');
    setStyle(repairButton, 'cursor', 'pointer');
    repairButton.addEventListener('click', repairRepeatedPhotos);
    barActions.appendChild(repairButton);

    var close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('data-pmd-menu-ai-import-modal-close', '');
    close.setAttribute('aria-label', 'Close');
    close.textContent = '×';
    setStyle(close, 'width', '40px');
    setStyle(close, 'height', '40px');
    setStyle(close, 'border', '1px solid #d7e8ee');
    setStyle(close, 'border-radius', '12px');
    setStyle(close, 'background', '#ffffff');
    setStyle(close, 'color', '#173752');
    setStyle(close, 'font-size', '25px');
    setStyle(close, 'line-height', '1');
    setStyle(close, 'cursor', 'pointer');
    barActions.appendChild(close);
    bar.appendChild(barActions);

    iframe = document.createElement('iframe');
    iframe.setAttribute('title', 'PayMyDine AI menu import');
    iframe.setAttribute('data-pmd-menu-ai-import-frame', '');
    setStyle(iframe, 'display', 'block');
    setStyle(iframe, 'width', '100%');
    setStyle(iframe, 'height', '100%');
    setStyle(iframe, 'border', '0');
    setStyle(iframe, 'background', '#f8fbfd');

    iframe.addEventListener('load', function () {
      try {
        var path = iframe.contentWindow.location.pathname;
        if (path.indexOf('/pmdmenus') !== -1) {
          closeModal(true);
          return;
        }
        if (path.indexOf('/pmdmenuaiimport') !== -1) injectEmbeddedStyles();
      } catch (error) {
        // Same-origin is expected. Standalone import remains the fallback.
      }
    });

    card.appendChild(bar);
    card.appendChild(iframe);
    modal.appendChild(backdrop);
    modal.appendChild(card);
    document.body.appendChild(modal);

    modal.addEventListener('click', function (event) {
      if (event.target.closest('[data-pmd-menu-ai-import-modal-close]')) {
        event.preventDefault();
        closeModal(false);
      }
    });

    return modal;
  }

  function openModal() {
    buildModal();
    needsReload = false;
    previousOverflow = document.documentElement.style.overflow || '';
    document.documentElement.style.overflow = 'hidden';
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    iframe.src = adminBase() + '/pmdmenuaiimport?embed=1&_=' + Date.now();
  }

  function mount() {
    var actions = document.querySelector('[data-pmd-menu-header-actions]');
    if (!actions) return false;

    var staleTrigger = document.querySelector('[data-pmd-menu-ai-import-trigger]');
    if (staleTrigger) staleTrigger.remove();

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'pmd-dashboard-lab__header-action pmd-menu-header-action pmd-menu-ai-import-trigger';
    button.setAttribute('data-pmd-menu-ai-import-trigger', '');
    button.setAttribute('aria-label', 'Import menu with AI');
    button.setAttribute('title', 'Import menu with AI');
    button.style.setProperty('background', '#075f4f', 'important');
    button.style.setProperty('border-color', '#075f4f', 'important');
    button.style.setProperty('color', '#ffffff', 'important');
    button.style.setProperty('font-size', '12px', 'important');
    button.style.setProperty('font-weight', '900', 'important');
    button.style.setProperty('letter-spacing', '-0.02em', 'important');
    button.innerHTML = '<span aria-hidden="true">AI</span>';
    button.addEventListener('click', openModal);

    var gap = actions.querySelector('[data-pmd-main-header-notification-gap-r67]');
    var slot = actions.querySelector('[data-pmd-menu-notif-slot]');
    var notifRoot = actions.querySelector('#notif-root');
    var anchor = gap || slot || notifRoot;
    if (anchor) actions.insertBefore(button, anchor);
    else actions.appendChild(button);

    return true;
  }

  window.addEventListener('message', function (event) {
    if (event.origin !== window.location.origin || !event.data) return;
    if (event.data.type === 'pmd-ai-menu-import-complete') needsReload = true;
    if (event.data.type === 'pmd-ai-menu-import-close') closeModal(Boolean(event.data.reload));
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && modal && !modal.hidden) closeModal(false);
  });

  window.PMDMenuAiImportV2 = {
    open: openModal,
    repairRepeatedPhotos: repairRepeatedPhotos
  };

  if (!mount() && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, {once: true});
  }
})();
