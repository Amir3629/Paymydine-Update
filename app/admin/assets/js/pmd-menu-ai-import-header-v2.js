(function () {
  'use strict';

  // PMD_MENU_AI_IMPORT_NATIVE_V4
  // One native Menu Manager modal. No iframe, no nested admin shell, no DOM moves.
  var modal = null;
  var trigger = null;
  var repairButton = null;
  var importerReady = false;
  var needsReload = false;

  function adminBase() {
    var parts = window.location.pathname.split('/').filter(Boolean);
    return '/' + (parts[0] || 'admin');
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function safeJson(value) {
    return JSON.stringify(value)
      .replace(/</g, '\\u003c')
      .replace(/>/g, '\\u003e')
      .replace(/&/g, '\\u0026');
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

  function importerCategories() {
    var seen = {};
    var rows = [];
    document.querySelectorAll('[data-pmd-category-filter][data-pmd-category-id]').forEach(function (button) {
      var id = Number(button.getAttribute('data-pmd-category-id') || 0);
      if (id < 1 || seen[id]) return;
      var label = button.querySelector('.pmd-menu-manager__category-label');
      var name = String(label ? label.textContent : button.textContent || '').trim();
      if (!name) return;
      seen[id] = true;
      rows.push({id: id, name: name});
    });
    return rows;
  }

  function existingItemNames() {
    var catalog = readCatalog();
    return Object.keys(catalog).map(function (key) {
      return String(catalog[key] && catalog[key].name || '').trim();
    }).filter(Boolean);
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
        try { await handler('onPmdMenuManagerSaveV1', menuDataForImageClear(item)); }
        catch (error) { failures.push((item.name || ('#' + item.id)) + ': ' + (error.message || 'failed')); }
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
        window.alert('No repeated imported screenshot was detected. Nothing was changed.');
        return;
      }
      var group = groups[0];
      var names = group.items.slice(0, 8).map(function (item) { return item.name; }).join(', ');
      var more = group.items.length > 8 ? (' and ' + (group.items.length - 8) + ' more') : '';
      if (!window.confirm('The exact same uploaded image is attached to ' + group.items.length + ' foods.\n\n' + names + more + '\n\nRemove this repeated image so foods without a real photo use the PayMyDine logo?')) return;
      repairButton.textContent = 'Removing…';
      await clearRepeatedPhotoGroup(group);
      needsReload = true;
      window.alert('Repeated screenshot removed from ' + group.items.length + ' foods.');
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

  function installStyles() {
    if (document.getElementById('pmd-menu-ai-native-v4-style')) return;
    var style = document.createElement('style');
    style.id = 'pmd-menu-ai-native-v4-style';
    style.textContent = `
      .pmd-menu-ai-native-modal .pmd-menu-modal__card{width:min(980px,calc(100vw - 48px))!important;max-height:min(780px,calc(100vh - 48px))!important}
      .pmd-menu-ai-native-modal .pmd-menu-modal__header{min-height:76px!important;padding:16px 20px!important}
      .pmd-menu-ai-native-modal .pmd-menu-modal__header>div:first-child{min-width:0}
      .pmd-menu-ai-native-modal .pmd-menu-modal__eyebrow{color:#0b7c5a!important}
      .pmd-menu-ai-native-modal .pmd-menu-modal__header h2{margin:2px 0 0!important;font-size:20px!important;line-height:1.2!important}
      .pmd-menu-ai-native-modal__header-actions{display:flex;align-items:center;gap:9px}
      .pmd-menu-ai-native-modal__repair{height:38px;padding:0 13px;border:1px solid #c9ded6;border-radius:11px;background:#f3faf7;color:#0b6a50;font-size:12px;font-weight:800;cursor:pointer}
      .pmd-menu-ai-native-modal__repair:disabled{opacity:.55;cursor:wait}
      .pmd-menu-ai-native-modal .pmd-menu-modal__body{padding:0!important;background:#f7faf9!important;overflow:auto!important}
      .pmd-ai-import--native{max-width:none!important;margin:0!important;padding:18px!important;color:#17211b!important}
      .pmd-ai-import--native .pmd-ai-import__card,.pmd-ai-import--native .pmd-ai-import__notice{position:relative;background:#fff;border:1px solid #dfe9e5;border-radius:16px;box-shadow:none;padding:20px;margin:0}
      .pmd-ai-import--native .pmd-ai-import__notice{display:flex;gap:8px;flex-wrap:wrap;margin-bottom:14px}
      .pmd-ai-import--native .pmd-ai-import__notice.is-warning{border-color:#ead9a4;background:#fffaf0}
      .pmd-ai-import--native .pmd-ai-import__step{display:none!important}
      .pmd-ai-import--native .pmd-ai-import__card-copy{padding:0;margin:0 0 16px}
      .pmd-ai-import--native .pmd-ai-import__card-copy h2{margin:0 0 5px;font-size:18px;line-height:1.3}
      .pmd-ai-import--native .pmd-ai-import__card-copy p,.pmd-ai-import--native .pmd-ai-import__section-head p{margin:0;color:#6d7973;font-size:13px}
      .pmd-ai-import--native .pmd-ai-import__upload-grid{display:block}
      .pmd-ai-import--native .pmd-ai-import__drop{min-height:145px;border:1.5px dashed #96b9aa;border-radius:14px;background:#f7fcfa;display:flex;flex-direction:column;justify-content:center;align-items:center;text-align:center;padding:18px;cursor:pointer}
      .pmd-ai-import--native .pmd-ai-import__drop:hover{border-color:#4b9b7b;background:#f1faf6}
      .pmd-ai-import--native .pmd-ai-import__drop input{position:absolute;opacity:0;pointer-events:none}
      .pmd-ai-import--native .pmd-ai-import__drop-icon{width:42px;height:42px;border-radius:12px;background:#e9f7f1;color:#087253;display:grid;place-items:center;font-size:24px;font-weight:700;margin-bottom:8px}
      .pmd-ai-import--native .pmd-ai-import__drop strong{font-size:15px;color:#182723}
      .pmd-ai-import--native .pmd-ai-import__drop small{color:#78847e;margin:4px 0 8px}
      .pmd-ai-import--native .pmd-ai-import__drop>span:last-child{font-size:12px;color:#16805b;font-weight:750}
      .pmd-ai-import--native .pmd-ai-import__safety{margin-top:12px;padding:10px 12px;border-radius:10px;background:#f4f6f5;color:#667169;font-size:12px;line-height:1.45}
      .pmd-ai-import--native .pmd-ai-import__actions{display:flex;align-items:center;gap:10px;justify-content:flex-end;margin-top:16px}
      .pmd-ai-import--native .pmd-ai-import__status{margin-right:auto;color:#68736c;font-size:12px}
      .pmd-ai-import--native .pmd-ai-import__status.is-error{color:#b43f3f}
      .pmd-ai-import--native .pmd-ai-import__primary,.pmd-ai-import--native .pmd-ai-import__secondary{min-height:40px;padding:0 16px;border-radius:11px;border:0;font-weight:800;cursor:pointer}
      .pmd-ai-import--native .pmd-ai-import__primary{background:#137954;color:#fff}
      .pmd-ai-import--native .pmd-ai-import__primary:disabled{opacity:.5;cursor:not-allowed}
      .pmd-ai-import--native .pmd-ai-import__secondary{background:#edf2ef;color:#2c3931}
      .pmd-ai-import--native .pmd-ai-import__summary{display:inline-flex;padding:6px 10px;border-radius:999px;background:#edf7f1;color:#206d49;font-size:12px;font-weight:800;margin-bottom:16px}
      .pmd-ai-import--native .pmd-ai-import__section-head{display:flex;justify-content:space-between;gap:16px;align-items:end;margin:7px 0 10px}
      .pmd-ai-import--native .pmd-ai-import__section-head h3{margin:0 0 4px;font-size:16px}
      .pmd-ai-import--native .pmd-ai-import__select-all{font-size:12px;font-weight:700;white-space:nowrap}
      .pmd-ai-import--native .pmd-ai-import__table-wrap{overflow:auto;max-height:430px;border:1px solid #e1e8e4;border-radius:12px;background:#fff}
      .pmd-ai-import--native .pmd-ai-import__table{width:100%;border-collapse:collapse;min-width:930px}
      .pmd-ai-import--native .pmd-ai-import__table th{position:sticky;top:0;z-index:2;text-align:left;padding:9px;background:#f6f9f7;color:#617068;font-size:11px}
      .pmd-ai-import--native .pmd-ai-import__table td{padding:8px;border-top:1px solid #edf1ef;vertical-align:top}
      .pmd-ai-import--native .pmd-ai-import__table input[type=text],.pmd-ai-import--native .pmd-ai-import__table input[type=number],.pmd-ai-import--native .pmd-ai-import__table textarea,.pmd-ai-import--native .pmd-ai-import__floor-row input[type=text],.pmd-ai-import--native .pmd-ai-import__floor-row input[type=number]{width:100%;border:1px solid #d5dfda;border-radius:8px;background:#fff;padding:7px 8px;font:inherit}
      .pmd-ai-import--native .pmd-ai-import__table textarea{resize:vertical}
      .pmd-ai-import--native .pmd-ai-import__table tr.is-invalid{background:#fff9f5}
      .pmd-ai-import--native .pmd-ai-import__table tr.is-duplicate{background:#fcfaf1}
      .pmd-ai-import--native .pmd-ai-import__table tr.is-failed{background:#fff1f1}
      .pmd-ai-import--native .pmd-ai-import__table td:last-child small{display:block;color:#94663a;margin-top:4px;max-width:180px}
      .pmd-ai-import--native .pmd-ai-import__confidence{display:inline-flex;padding:3px 6px;border-radius:999px;background:#eef2ef;font-size:10px;font-weight:800}
      .pmd-ai-import--native .pmd-ai-import__photo-cell span{font-size:11px;color:#7f8983}
      .pmd-ai-import--native .pmd-ai-import__floors{margin-top:20px;padding-top:15px;border-top:1px solid #e7ebe8}
      .pmd-ai-import--native .pmd-ai-import__floor-row{display:grid;grid-template-columns:26px 44px minmax(150px,1fr) 48px 100px 110px;gap:8px;align-items:center;padding:8px 0}
      .pmd-ai-import--native .pmd-ai-import__floor-row small{color:#77817b}
      .pmd-ai-import--native .pmd-ai-import__permission-note{padding:9px 11px;background:#fff8e9;border-radius:9px;color:#79622c;font-size:12px}
      .pmd-ai-import--native .pmd-ai-import__done{text-align:center;padding:34px 22px}
      .pmd-ai-import--native .pmd-ai-import__done-mark{width:48px;height:48px;border-radius:50%;background:#e9f7ef;color:#187a4c;font-size:25px;display:grid;place-items:center;margin:0 auto 10px}
      .pmd-ai-import--native .pmd-ai-import__done h2{margin:0 0 7px}
      .pmd-ai-import--native .pmd-ai-import__done p{color:#657069}
      .pmd-menu-ai-trigger{background:#075f4f!important;border-color:#075f4f!important;color:#fff!important;font-size:12px!important;font-weight:900!important;letter-spacing:-.02em!important}
      @media(max-width:720px){.pmd-menu-ai-native-modal .pmd-menu-modal__card{width:calc(100vw - 20px)!important;max-height:calc(100vh - 20px)!important}.pmd-menu-ai-native-modal .pmd-menu-modal__header{padding:12px 14px!important}.pmd-menu-ai-native-modal__repair{display:none}.pmd-ai-import--native{padding:10px!important}.pmd-ai-import--native .pmd-ai-import__card{padding:14px!important}.pmd-ai-import--native .pmd-ai-import__actions{flex-wrap:wrap}.pmd-ai-import--native .pmd-ai-import__status{width:100%;margin:0}.pmd-ai-import--native .pmd-ai-import__floor-row{grid-template-columns:24px 1fr}.pmd-ai-import--native .pmd-ai-import__floor-row>span{display:none}.pmd-ai-import--native .pmd-ai-import__floor-row small{grid-column:2}}
    `;
    document.head.appendChild(style);
  }

  function buildImporterMarkup() {
    var categories = importerCategories();
    var existingItems = existingItemNames();
    var canCreateCategories = Boolean(document.querySelector('[data-pmd-category-create]'));
    return ''
      + '<div class="pmd-ai-import pmd-ai-import--native" data-pmd-ai-import data-can-create-categories="' + (canCreateCategories ? '1' : '0') + '" data-can-import-tables="0" data-ai-enabled="1">'
      +   '<section class="pmd-ai-import__card" data-pmd-ai-import-upload>'
      +     '<div class="pmd-ai-import__card-copy"><h2>Upload your menu</h2><p>Choose one or more clear menu photos, screenshots or PDFs. AI will read the visible categories, item names and prices.</p></div>'
      +     '<div class="pmd-ai-import__upload-grid"><label class="pmd-ai-import__drop">'
      +       '<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple data-pmd-ai-menu-sources>'
      +       '<span class="pmd-ai-import__drop-icon" aria-hidden="true">+</span>'
      +       '<strong>Choose menu image or PDF</strong><small>JPG, PNG, WEBP or PDF · up to 12 files</small>'
      +       '<span data-pmd-ai-menu-source-label>No files selected</span>'
      +     '</label></div>'
      +     '<div class="pmd-ai-import__safety"><strong>Menu data only.</strong> The uploaded menu image is used only for reading text and prices. It is never attached to food items. Foods without a real photo use the PayMyDine logo.</div>'
      +     '<div class="pmd-ai-import__actions"><span class="pmd-ai-import__status" data-pmd-ai-import-status aria-live="polite"></span><button type="button" class="pmd-ai-import__primary" data-pmd-ai-analyse>Read with AI</button></div>'
      +   '</section>'
      +   '<section class="pmd-ai-import__card" data-pmd-ai-import-review hidden>'
      +     '<div class="pmd-ai-import__card-copy"><h2>Review what AI found</h2><p>Edit anything that is wrong. Only checked rows will be imported.</p></div>'
      +     '<div class="pmd-ai-import__summary" data-pmd-ai-import-summary></div>'
      +     '<div class="pmd-ai-import__section-head"><div><h3>Menu items</h3><p>Names, categories, prices and visible descriptions.</p></div><label class="pmd-ai-import__select-all"><input type="checkbox" checked data-pmd-ai-select-all> Select all valid</label></div>'
      +     '<div class="pmd-ai-import__table-wrap"><table class="pmd-ai-import__table"><thead><tr><th>Import</th><th>Category</th><th>Item</th><th>Price</th><th>Description</th><th>Photo</th><th>Review</th></tr></thead><tbody data-pmd-ai-items></tbody></table></div>'
      +     '<section class="pmd-ai-import__floors" data-pmd-ai-floors-section hidden><div class="pmd-ai-import__section-head"><div><h3>Floor & table structure</h3><p>Detected floor/table data can be reviewed in Quick Setup.</p></div></div><div data-pmd-ai-floors></div><p class="pmd-ai-import__permission-note">Table layout import is intentionally disabled from the Menu modal. Use Quick Setup for floor/table migration.</p></section>'
      +     '<div class="pmd-ai-import__actions"><button type="button" class="pmd-ai-import__secondary" data-pmd-ai-start-over>Start over</button><span class="pmd-ai-import__status" data-pmd-ai-import-review-status aria-live="polite"></span><button type="button" class="pmd-ai-import__primary" data-pmd-ai-import-confirm>Import selected items</button></div>'
      +   '</section>'
      +   '<section class="pmd-ai-import__card pmd-ai-import__done" data-pmd-ai-import-done hidden><div class="pmd-ai-import__done-mark">✓</div><h2>Import completed</h2><p data-pmd-ai-import-result></p><div class="pmd-ai-import__actions" style="justify-content:center"><button type="button" class="pmd-ai-import__primary" data-pmd-ai-import-close>Close &amp; review Menu</button></div></section>'
      +   '<script type="application/json" id="pmd-ai-import-categories">' + safeJson(categories) + '<\/script>'
      +   '<script type="application/json" id="pmd-ai-import-existing-items">' + safeJson(existingItems) + '<\/script>'
      + '</div>';
  }

  function buildModal() {
    if (modal) return modal;
    installStyles();

    document.querySelectorAll('[data-pmd-menu-ai-import-modal]').forEach(function (node) { node.remove(); });
    modal = document.createElement('div');
    modal.className = 'pmd-menu-modal pmd-menu-ai-native-modal';
    modal.setAttribute('data-pmd-menu-ai-import-modal', '');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'pmd-menu-ai-native-title');
    modal.setAttribute('aria-hidden', 'true');
    modal.hidden = true;
    modal.innerHTML = ''
      + '<div class="pmd-menu-modal__backdrop" data-pmd-menu-ai-import-close></div>'
      + '<section class="pmd-menu-modal__card" role="document">'
      +   '<header class="pmd-menu-modal__header">'
      +     '<div><span class="pmd-menu-modal__eyebrow">PayMyDine AI</span><h2 id="pmd-menu-ai-native-title">Import menu with AI</h2></div>'
      +     '<div class="pmd-menu-ai-native-modal__header-actions">'
      +       '<button type="button" class="pmd-menu-ai-native-modal__repair" data-pmd-ai-fix-old-photos>Fix old photos</button>'
      +       '<button type="button" class="pmd-menu-modal__close" data-pmd-menu-ai-import-close aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg></button>'
      +     '</div>'
      +   '</header>'
      +   '<div class="pmd-menu-modal__body">' + buildImporterMarkup() + '</div>'
      + '</section>';
    document.body.appendChild(modal);
    repairButton = modal.querySelector('[data-pmd-ai-fix-old-photos]');
    if (repairButton) repairButton.addEventListener('click', repairRepeatedPhotos);
    modal.addEventListener('click', function (event) {
      if (event.target.closest('[data-pmd-menu-ai-import-close]')) {
        event.preventDefault();
        closeModal(false);
        return;
      }
      if (event.target.closest('[data-pmd-ai-import-close]')) {
        event.preventDefault();
        closeModal(true);
      }
    });
    return modal;
  }

  function ensureImporterScript() {
    if (window.PMDAiMenuImportNativeV4Loading) return;
    window.PMDAiMenuImportNativeV4Loading = true;
    var script = document.createElement('script');
    script.src = '/app/admin/assets/js/pmd-menu-ai-import-v1.js?v=native-v4-20260912';
    script.async = false;
    script.onload = function () {
      importerReady = true;
      var button = modal && modal.querySelector('[data-pmd-ai-analyse]');
      if (button) button.disabled = false;
    };
    script.onerror = function () {
      var button = modal && modal.querySelector('[data-pmd-ai-analyse]');
      if (button) button.disabled = true;
      var status = modal && modal.querySelector('[data-pmd-ai-import-status]');
      if (status) {
        status.textContent = 'AI importer could not load. Refresh the Menu page.';
        status.classList.add('is-error');
      }
    };
    var analyse = modal && modal.querySelector('[data-pmd-ai-analyse]');
    if (analyse) analyse.disabled = true;
    document.head.appendChild(script);
  }

  function importedAnything() {
    var done = modal && modal.querySelector('[data-pmd-ai-import-done]');
    return Boolean(done && !done.hidden);
  }

  function openModal() {
    buildModal();
    if (!importerReady) ensureImporterScript();
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('pmd-menu-modal-open');
    var close = modal.querySelector('.pmd-menu-modal__close');
    if (close) close.focus({preventScroll: true});
  }

  function closeModal(forceReload) {
    if (!modal) return;
    if (forceReload || needsReload || importedAnything()) {
      window.location.reload();
      return;
    }
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('pmd-menu-modal-open');
    if (trigger) trigger.focus({preventScroll: true});
  }

  function mountTrigger() {
    var actions = document.querySelector('[data-pmd-menu-header-actions]');
    if (!actions) return false;
    document.querySelectorAll('[data-pmd-menu-ai-import-trigger]').forEach(function (node) { node.remove(); });
    trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'pmd-dashboard-lab__header-action pmd-menu-header-action pmd-menu-ai-trigger';
    trigger.setAttribute('data-pmd-menu-ai-import-trigger', '');
    trigger.setAttribute('aria-label', 'Import menu with AI');
    trigger.setAttribute('title', 'Import menu with AI');
    trigger.innerHTML = '<span aria-hidden="true">AI</span>';
    trigger.addEventListener('click', function (event) {
      event.preventDefault();
      openModal();
    });
    var gap = actions.querySelector('[data-pmd-main-header-notification-gap-r67]');
    var slot = actions.querySelector('[data-pmd-menu-notif-slot]');
    var notifRoot = actions.querySelector('#notif-root');
    var anchor = gap || slot || notifRoot;
    if (anchor) actions.insertBefore(trigger, anchor);
    else actions.appendChild(trigger);
    return true;
  }

  function boot() {
    buildModal();
    ensureImporterScript();
    mountTrigger();
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && modal && !modal.hidden) closeModal(false);
  });

  window.PMDMenuAiImportNativeV4 = {
    open: openModal,
    close: closeModal,
    repairRepeatedPhotos: repairRepeatedPhotos
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once: true});
  else boot();
})();
