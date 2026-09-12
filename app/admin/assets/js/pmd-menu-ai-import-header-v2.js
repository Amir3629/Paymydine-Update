(function () {
  'use strict';

  // PMD_MENU_AI_IMPORT_HEADER_V3
  // Menu owns only the compact modal shell. The authenticated importer remains
  // Pmdmenuaiimport and all writes still flow through the existing Menu authority.
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
      try { return {item: item, hash: await sha256ForUrl(String(item.image || ''))}; }
      catch (error) { return null; }
    }));

    var groups = {};
    hashed.filter(Boolean).forEach(function (row) {
      if (!groups[row.hash]) groups[row.hash] = [];
      groups[row.hash].push(row.item);
    });

    return Object.keys(groups).map(function (hash) {
      return {hash: hash, items: groups[hash]};
    }).filter(function (group) {
      return group.items.length >= 5;
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
    repairButton.textContent = 'Checking…';

    try {
      var groups = await suspiciousRepeatedPhotoGroups();
      if (!groups.length) {
        window.alert('No repeated uploaded photo was detected on 5 or more menu items. Nothing was changed.');
        return;
      }
      var group = groups[0];
      var names = group.items.slice(0, 8).map(function (item) { return item.name; }).join(', ');
      var more = group.items.length > 8 ? (' and ' + (group.items.length - 8) + ' more') : '';
      if (!window.confirm(
        'The exact same uploaded image is attached to ' + group.items.length + ' foods.\n\n' +
        names + more + '\n\nRemove that repeated image so those foods use the PayMyDine logo instead?'
      )) return;

      repairButton.textContent = 'Removing…';
      await clearRepeatedPhotoGroup(group);
      needsReload = true;
      window.alert('Repeated image removed from ' + group.items.length + ' foods.');
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

  function compactIframe() {
    if (!iframe || !iframe.contentDocument) return;
    var doc = iframe.contentDocument;
    var root = doc.querySelector('[data-pmd-ai-import]');
    if (!root || !doc.body) return;

    // Keep only the actual importer workspace. The admin sidebar, global header,
    // clock and page chrome belong to the parent Menu page and must never appear
    // inside this modal card.
    if (root.parentNode) root.parentNode.removeChild(root);
    doc.body.innerHTML = '';
    doc.body.appendChild(root);

    var style = doc.createElement('style');
    style.id = 'pmd-ai-import-embedded-style-v3';
    style.textContent = ''
      + 'html,body{margin:0!important;padding:0!important;background:#fff!important;min-height:100%!important;overflow:auto!important}'
      + '.pmd-ai-import{max-width:none!important;margin:0!important;padding:18px!important;background:#fff!important}'
      + '.pmd-ai-import__header{display:none!important}'
      + '.pmd-ai-import__notice{box-shadow:none!important;margin:0 0 14px!important}'
      + '.pmd-ai-import__card{border:0!important;border-radius:0!important;box-shadow:none!important;padding:0!important;margin:0!important}'
      + '.pmd-ai-import__step{display:none!important}'
      + '.pmd-ai-import__card-copy{padding-right:0!important;margin-bottom:16px!important}'
      + '.pmd-ai-import__card-copy h2{font-size:21px!important;line-height:1.2!important}'
      + '.pmd-ai-import__card-copy p{font-size:13px!important}'
      + '.pmd-ai-import__upload-grid{display:grid!important;grid-template-columns:1fr!important}'
      + '.pmd-ai-import__drop{min-height:155px!important;border-radius:14px!important}'
      + '.pmd-ai-import__safety{margin-top:12px!important}'
      + '.pmd-ai-import__actions{margin-top:16px!important;padding-bottom:2px!important}'
      + '.pmd-ai-import__table{min-width:860px!important}'
      + '.pmd-ai-import__done{padding:28px 10px!important}';
    (doc.head || doc.documentElement).appendChild(style);
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
    setStyle(modal, 'padding', '20px');

    var backdrop = document.createElement('button');
    backdrop.type = 'button';
    backdrop.setAttribute('aria-label', 'Close AI import');
    backdrop.setAttribute('data-pmd-menu-ai-import-modal-close', '');
    setStyle(backdrop, 'position', 'absolute');
    setStyle(backdrop, 'inset', '0');
    setStyle(backdrop, 'border', '0');
    setStyle(backdrop, 'background', 'rgba(8,28,27,.32)');
    setStyle(backdrop, 'backdrop-filter', 'blur(4px)');
    setStyle(backdrop, 'cursor', 'default');

    var card = document.createElement('section');
    setStyle(card, 'position', 'relative');
    setStyle(card, 'z-index', '1');
    setStyle(card, 'display', 'grid');
    setStyle(card, 'grid-template-rows', '58px minmax(0,1fr)');
    setStyle(card, 'width', 'min(920px, calc(100vw - 40px))');
    setStyle(card, 'height', 'min(720px, calc(100vh - 40px))');
    setStyle(card, 'overflow', 'hidden');
    setStyle(card, 'border', '1px solid #d7e8ee');
    setStyle(card, 'border-radius', '18px');
    setStyle(card, 'background', '#ffffff');
    setStyle(card, 'box-shadow', '0 24px 70px rgba(7,31,29,.20)');

    var bar = document.createElement('header');
    setStyle(bar, 'display', 'flex');
    setStyle(bar, 'align-items', 'center');
    setStyle(bar, 'justify-content', 'space-between');
    setStyle(bar, 'gap', '14px');
    setStyle(bar, 'padding', '0 12px 0 18px');
    setStyle(bar, 'border-bottom', '1px solid #e1ecef');
    setStyle(bar, 'background', '#ffffff');

    var title = document.createElement('div');
    title.innerHTML = '<strong style="display:block;color:#10201f;font-size:15px;font-weight:900">Import menu with AI</strong><small style="color:#6b7b7a;font-size:11px">Upload one menu source, review, import</small>';
    bar.appendChild(title);

    var barActions = document.createElement('div');
    setStyle(barActions, 'display', 'flex');
    setStyle(barActions, 'align-items', 'center');
    setStyle(barActions, 'gap', '8px');

    repairButton = document.createElement('button');
    repairButton.type = 'button';
    repairButton.textContent = 'Fix old photos';
    setStyle(repairButton, 'min-height', '34px');
    setStyle(repairButton, 'padding', '0 11px');
    setStyle(repairButton, 'border', '1px solid #d3e5df');
    setStyle(repairButton, 'border-radius', '10px');
    setStyle(repairButton, 'background', '#f5faf8');
    setStyle(repairButton, 'color', '#075f4f');
    setStyle(repairButton, 'font-size', '11px');
    setStyle(repairButton, 'font-weight', '800');
    setStyle(repairButton, 'cursor', 'pointer');
    repairButton.addEventListener('click', repairRepeatedPhotos);
    barActions.appendChild(repairButton);

    var close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('data-pmd-menu-ai-import-modal-close', '');
    close.setAttribute('aria-label', 'Close');
    close.textContent = '×';
    setStyle(close, 'width', '34px');
    setStyle(close, 'height', '34px');
    setStyle(close, 'border', '1px solid #d7e8ee');
    setStyle(close, 'border-radius', '10px');
    setStyle(close, 'background', '#ffffff');
    setStyle(close, 'color', '#173752');
    setStyle(close, 'font-size', '22px');
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
    setStyle(iframe, 'background', '#ffffff');

    iframe.addEventListener('load', function () {
      try {
        var path = iframe.contentWindow.location.pathname;
        if (path.indexOf('/pmdmenus') !== -1) {
          closeModal(true);
          return;
        }
        if (path.indexOf('/pmdmenuaiimport') !== -1) compactIframe();
      } catch (error) {
        // Same-origin is expected; standalone route remains the fallback.
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
