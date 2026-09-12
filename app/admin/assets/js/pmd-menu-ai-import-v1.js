/* PMD_AI_MENU_IMPORT_V2 */
(function () {
  'use strict';

  var root = document.querySelector('[data-pmd-ai-import]');
  if (!root) return;

  var sourceInput = root.querySelector('[data-pmd-ai-menu-sources]');
  var analyseButton = root.querySelector('[data-pmd-ai-analyse]');
  var importButton = root.querySelector('[data-pmd-ai-import-confirm]');
  var review = root.querySelector('[data-pmd-ai-import-review]');
  var upload = root.querySelector('[data-pmd-ai-import-upload]');
  var done = root.querySelector('[data-pmd-ai-import-done]');
  var itemHost = root.querySelector('[data-pmd-ai-items]');
  var floorsHost = root.querySelector('[data-pmd-ai-floors]');
  var floorsSection = root.querySelector('[data-pmd-ai-floors-section]');
  var summary = root.querySelector('[data-pmd-ai-import-summary]');
  var uploadStatus = root.querySelector('[data-pmd-ai-import-status]');
  var reviewStatus = root.querySelector('[data-pmd-ai-import-review-status]');
  var selectAll = root.querySelector('[data-pmd-ai-select-all]');
  var canCreateCategories = root.dataset.canCreateCategories === '1';
  var canImportTables = root.dataset.canImportTables === '1';
  var busy = false;
  var draft = null;
  var categoryPromises = new Map();
  var IMPORT_CONCURRENCY = 4;

  function readJson(id) {
    var node = document.getElementById(id);
    if (!node) return [];
    try { return JSON.parse(node.textContent || '[]') || []; }
    catch (error) { return []; }
  }

  var categories = readJson('pmd-ai-import-categories');
  var existingItems = new Set(readJson('pmd-ai-import-existing-items').map(normalize));

  function normalize(value) {
    return String(value == null ? '' : value).trim().toLocaleLowerCase();
  }

  function csrf(data) {
    if (data.has('_token')) return;
    var meta = document.querySelector('meta[name="csrf-token"]');
    var hidden = document.querySelector('input[name="_token"]');
    var token = meta && meta.content ? meta.content : (hidden ? hidden.value : '');
    if (token) data.append('_token', token);
  }

  async function postUrl(url, data) {
    csrf(data);
    var response = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      headers: {'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest'},
      body: data
    });
    var raw = await response.text();
    var payload = {};
    try { payload = raw ? JSON.parse(raw) : {}; }
    catch (error) { payload = {message: raw || 'Request failed.'}; }
    if (!response.ok || payload.ok === false) throw new Error(payload.message || ('Request failed (' + response.status + ')'));
    return payload;
  }

  async function handler(endpoint, name, data) {
    csrf(data);
    var response = await fetch(endpoint, {
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

  function setText(node, text, error) {
    if (!node) return;
    node.textContent = text || '';
    node.classList.toggle('is-error', Boolean(error));
  }

  function updateFileLabel() {
    var node = root.querySelector('[data-pmd-ai-menu-source-label]');
    if (!node) return;
    var files = sourceInput && sourceInput.files ? Array.from(sourceInput.files) : [];
    node.textContent = files.length
      ? (files.length + (files.length === 1 ? ' file selected' : ' files selected'))
      : 'No files selected';
  }

  if (sourceInput) sourceInput.addEventListener('change', updateFileLabel);

  function categoryByName(name) {
    var key = normalize(name);
    return categories.find(function (row) { return normalize(row.name) === key; }) || null;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function rowValid(tr) {
    var name = tr.querySelector('[data-field="name"]').value.trim();
    var category = tr.querySelector('[data-field="category"]').value.trim();
    var price = tr.querySelector('[data-field="price"]').value.trim();
    var priceNumber = Number(price);
    var categoryOk = Boolean(categoryByName(category)) || canCreateCategories;
    return name.length >= 2 && category.length >= 2 && categoryOk && price !== '' && Number.isFinite(priceNumber) && priceNumber >= 0;
  }

  function syncRow(tr) {
    var check = tr.querySelector('[data-pmd-ai-row-select]');
    var warning = tr.querySelector('[data-pmd-ai-row-warning]');
    var duplicate = existingItems.has(normalize(tr.querySelector('[data-field="name"]').value));
    var valid = rowValid(tr);
    tr.classList.toggle('is-invalid', !valid);
    tr.classList.toggle('is-duplicate', duplicate);
    if (warning) {
      var messages = [];
      if (!valid) messages.push('Complete price/category before import');
      if (duplicate) messages.push('Item name already exists');
      warning.textContent = messages.join(' · ');
    }
    if (!valid) {
      check.checked = false;
      check.disabled = true;
    } else {
      check.disabled = false;
    }
  }

  function renderItems(items) {
    itemHost.innerHTML = '';
    var listId = 'pmd-ai-import-category-list';
    var datalist = document.getElementById(listId);
    if (!datalist) {
      datalist = document.createElement('datalist');
      datalist.id = listId;
      document.body.appendChild(datalist);
    }
    datalist.innerHTML = categories.map(function (row) {
      return '<option value="' + escapeHtml(row.name) + '"></option>';
    }).join('');

    items.forEach(function (item, index) {
      var duplicate = existingItems.has(normalize(item.name));
      var reasons = Array.isArray(item.review_reasons) ? item.review_reasons : [];
      var tr = document.createElement('tr');
      tr.dataset.index = String(index);
      tr.innerHTML = ''
        + '<td><input type="checkbox" data-pmd-ai-row-select ' + (duplicate ? '' : 'checked') + '></td>'
        + '<td><input type="text" maxlength="128" list="' + listId + '" data-field="category" value="' + escapeHtml(item.category || 'Menu') + '"></td>'
        + '<td><input type="text" maxlength="128" data-field="name" value="' + escapeHtml(item.name || '') + '"></td>'
        + '<td><input type="number" min="0" max="9999999" step="0.01" data-field="price" value="' + (item.price == null ? '' : escapeHtml(item.price)) + '"></td>'
        + '<td><textarea maxlength="1028" rows="2" data-field="description">' + escapeHtml(item.description || '') + '</textarea></td>'
        + '<td><span class="pmd-ai-import__confidence">' + Math.round(Number(item.confidence || 0) * 100) + '%</span>'
        + (reasons.length ? '<small>' + escapeHtml(reasons.join(' · ')) + '</small>' : '')
        + '<small data-pmd-ai-row-warning></small></td>';
      itemHost.appendChild(tr);
      tr.querySelectorAll('input,textarea').forEach(function (input) {
        input.addEventListener('input', function () { syncRow(tr); });
        input.addEventListener('change', function () { syncRow(tr); });
      });
      syncRow(tr);
    });
  }

  function renderFloors(floors) {
    floorsHost.innerHTML = '';
    if (!Array.isArray(floors) || !floors.length) {
      floorsSection.hidden = true;
      return;
    }
    floorsSection.hidden = false;
    floors.forEach(function (floor, index) {
      var row = document.createElement('label');
      row.className = 'pmd-ai-import__floor-row';
      row.innerHTML = '<input type="checkbox" data-pmd-ai-floor-select ' + (canImportTables ? 'checked' : 'disabled') + '>'
        + '<span>Floor</span><input type="text" maxlength="80" data-pmd-ai-floor-name value="' + escapeHtml(floor.name || '') + '" ' + (canImportTables ? '' : 'disabled') + '>'
        + '<span>Tables</span><input type="number" min="1" max="60" data-pmd-ai-floor-count value="' + escapeHtml(floor.table_count || '') + '" ' + (canImportTables ? '' : 'disabled') + '>'
        + '<small>' + Math.round(Number(floor.confidence || 0) * 100) + '% confidence</small>';
      row.dataset.index = String(index);
      floorsHost.appendChild(row);
    });
  }

  function showDraft(payload) {
    draft = payload.draft || {items: [], floors: []};
    draft.items = Array.isArray(draft.items) ? draft.items : [];
    renderItems(draft.items);
    renderFloors(Array.isArray(draft.floors) ? draft.floors : []);
    var itemCount = draft.items.length;
    var categoryCount = Array.isArray(draft.categories) ? draft.categories.length : 0;
    var floorCount = Array.isArray(draft.floors) ? draft.floors.length : 0;
    summary.textContent = itemCount + ' items · ' + categoryCount + ' categories' + (floorCount ? ' · ' + floorCount + ' floor areas detected' : '');
    upload.hidden = true;
    review.hidden = false;
    done.hidden = true;
    review.scrollIntoView({behavior: 'smooth', block: 'start'});
  }

  async function analyse() {
    if (busy) return;
    var sources = sourceInput && sourceInput.files ? Array.from(sourceInput.files) : [];
    if (!sources.length) {
      setText(uploadStatus, 'Choose at least one menu image, screenshot or PDF.', true);
      return;
    }

    var data = new FormData();
    sources.forEach(function (file) { data.append('menu_sources[]', file); });

    busy = true;
    analyseButton.disabled = true;
    setText(uploadStatus, 'AI is reading your menu. Nothing is being saved yet…', false);

    try {
      var payload = await postUrl('/admin/pmdmenuaiimport/analyse', data);
      setText(uploadStatus, '', false);
      showDraft(payload);
    } catch (error) {
      setText(uploadStatus, error.message || 'AI could not read these files.', true);
    } finally {
      busy = false;
      analyseButton.disabled = false;
    }
  }

  async function ensureCategory(name) {
    var existing = categoryByName(name);
    if (existing) return existing;
    if (!canCreateCategories) throw new Error('Category “' + name + '” does not exist and your account cannot create categories.');

    var key = normalize(name);
    if (categoryPromises.has(key)) return categoryPromises.get(key);

    var promise = (async function () {
      var data = new FormData();
      data.append('name', name);
      var result = await handler('/admin/menus', 'onPmdMenuManagerCreateCategoryV125', data);
      var created = {id: Number(result.category_id || 0), name: String(result.name || name)};
      if (!created.id) throw new Error('Category “' + name + '” could not be created.');
      categories.push(created);
      return created;
    })();

    categoryPromises.set(key, promise);
    try {
      return await promise;
    } catch (error) {
      categoryPromises.delete(key);
      throw error;
    }
  }

  function selectedFloorPayload() {
    return Array.from(floorsHost.querySelectorAll('.pmd-ai-import__floor-row')).map(function (row) {
      return {
        selected: Boolean(row.querySelector('[data-pmd-ai-floor-select]')?.checked),
        name: String(row.querySelector('[data-pmd-ai-floor-name]')?.value || '').trim(),
        table_count: Number(row.querySelector('[data-pmd-ai-floor-count]')?.value || 0)
      };
    });
  }

  async function importTablesIfSelected() {
    if (!canImportTables || floorsSection.hidden) return {imported: false};
    var floors = selectedFloorPayload().filter(function (row) { return row.selected; });
    if (!floors.length) return {imported: false};
    var data = new FormData();
    data.append('floors', JSON.stringify(floors));
    await postUrl('/admin/pmdmenuaiimport/importTables', data);
    return {imported: true};
  }

  async function importOneRow(tr) {
    if (!rowValid(tr)) throw new Error('Complete price/category before import.');

    var categoryName = tr.querySelector('[data-field="category"]').value.trim();
    var category = await ensureCategory(categoryName);
    var data = new FormData();
    data.append('menu_name', tr.querySelector('[data-field="name"]').value.trim());
    data.append('menu_price', tr.querySelector('[data-field="price"]').value.trim());
    data.append('menu_description', tr.querySelector('[data-field="description"]').value.trim());
    data.append('category_ids[]', String(category.id));

    // AI Menu Import never assigns a menu screenshot as a food image. Foods
    // created here intentionally have no image unless one is added later in
    // normal Menu editing, so Menu Manager uses the standard PayMyDine logo.
    await handler('/admin/menus', 'onPmdMenuManagerSaveV1', data);
    existingItems.add(normalize(tr.querySelector('[data-field="name"]').value));
  }

  async function importRowsFast(rows) {
    var cursor = 0;
    var completed = 0;
    var imported = 0;
    var failed = 0;
    var workerCount = Math.min(IMPORT_CONCURRENCY, rows.length);

    async function worker() {
      while (true) {
        var index = cursor++;
        if (index >= rows.length) return;
        var tr = rows[index];
        try {
          await importOneRow(tr);
          imported++;
        } catch (error) {
          failed++;
          tr.classList.add('is-failed');
          var warning = tr.querySelector('[data-pmd-ai-row-warning]');
          if (warning) warning.textContent = error.message || 'Import failed';
        } finally {
          completed++;
          setText(reviewStatus, 'Importing menu… ' + completed + ' of ' + rows.length + ' complete', false);
        }
      }
    }

    var workers = [];
    for (var i = 0; i < workerCount; i++) workers.push(worker());
    await Promise.all(workers);
    return {imported: imported, failed: failed};
  }

  async function importSelected() {
    if (busy) return;

    var rows = Array.from(itemHost.querySelectorAll('tr')).filter(function (tr) {
      var check = tr.querySelector('[data-pmd-ai-row-select]');
      return check && check.checked && !check.disabled;
    });
    var selectedFloors = canImportTables && !floorsSection.hidden
      ? selectedFloorPayload().filter(function (row) { return row.selected; })
      : [];

    if (!rows.length && !selectedFloors.length) {
      setText(reviewStatus, 'Select at least one valid item or Floor/Table row.', true);
      return;
    }
    if (!window.confirm('Import the selected restaurant data into PayMyDine? Menu items will be published and can be edited afterwards.')) return;

    busy = true;
    importButton.disabled = true;
    categoryPromises.clear();

    var imported = 0;
    var failed = 0;
    var tableImported = false;
    var tableWarning = '';

    try {
      if (rows.length) {
        setText(reviewStatus, 'Starting menu import…', false);
        var menuResult = await importRowsFast(rows);
        imported = menuResult.imported;
        failed = menuResult.failed;
      }

      try {
        if (selectedFloors.length) setText(reviewStatus, 'Importing reviewed Floor/Table layout…', false);
        var tableResult = await importTablesIfSelected();
        tableImported = Boolean(tableResult.imported);
      } catch (error) {
        tableWarning = error.message || 'Floor/Table import failed.';
      }

      review.hidden = true;
      done.hidden = false;
      var result = root.querySelector('[data-pmd-ai-import-result]');
      var parts = [imported + ' menu item' + (imported === 1 ? '' : 's') + ' imported'];
      if (failed) parts.push(failed + ' item' + (failed === 1 ? '' : 's') + ' need review');
      if (tableImported) parts.push('Floor/Table layout imported');
      if (tableWarning) parts.push('Floor/Table warning: ' + tableWarning);
      result.textContent = parts.join(' · ') + '.';

      if (window.parent !== window) {
        window.parent.postMessage({
          type: 'pmd-ai-menu-import-complete',
          imported: imported,
          failed: failed,
          tables: tableImported
        }, window.location.origin);
      }

      done.scrollIntoView({behavior: 'smooth', block: 'start'});
    } finally {
      busy = false;
      importButton.disabled = false;
    }
  }

  if (analyseButton) analyseButton.addEventListener('click', analyse);
  if (importButton) importButton.addEventListener('click', importSelected);
  if (selectAll) selectAll.addEventListener('change', function () {
    itemHost.querySelectorAll('[data-pmd-ai-row-select]').forEach(function (check) {
      if (!check.disabled) check.checked = selectAll.checked;
    });
  });

  var startOver = root.querySelector('[data-pmd-ai-start-over]');
  if (startOver) startOver.addEventListener('click', function () {
    draft = null;
    categoryPromises.clear();
    review.hidden = true;
    upload.hidden = false;
    done.hidden = true;
    setText(reviewStatus, '', false);
    upload.scrollIntoView({behavior: 'smooth', block: 'start'});
  });
})();
