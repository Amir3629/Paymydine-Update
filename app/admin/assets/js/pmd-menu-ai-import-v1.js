/* PMD_AI_MENU_IMPORT_V3 */
(function () {
  'use strict';

  var root = document.querySelector('[data-pmd-ai-import]');
  if (!root) return;

  var sourceInput = root.querySelector('[data-pmd-ai-menu-sources]');
  var sourceDrop = sourceInput ? sourceInput.closest('.pmd-ai-import__drop') : null;
  var sourceList = root.querySelector('[data-pmd-ai-source-list]');
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
  var duplicateToggle = root.querySelector('[data-pmd-ai-duplicates-toggle]');
  var noNew = root.querySelector('[data-pmd-ai-no-new]');
  var canCreateCategories = root.dataset.canCreateCategories === '1';
  var canImportTables = root.dataset.canImportTables === '1';
  var busy = false;
  var draft = null;
  var categoryPromises = new Map();
  var selectedSources = [];
  var hideDuplicates = true;
  var IMPORT_CONCURRENCY = 4;
  var MAX_SOURCES = 12;

  installPolishStyles();

  function installPolishStyles() {
    if (document.getElementById('pmd-ai-import-v3-polish')) return;
    var style = document.createElement('style');
    style.id = 'pmd-ai-import-v3-polish';
    style.textContent = `
      .pmd-ai-import__source-list{display:flex;flex-wrap:wrap;gap:7px;margin-top:10px}
      .pmd-ai-import__source-list:empty{display:none}
      .pmd-ai-import__source-chip{display:inline-flex;align-items:center;gap:7px;max-width:100%;padding:6px 8px 6px 10px;border:1px solid #dce7e1;border-radius:10px;background:#fff;color:#405048;font-size:11px}
      .pmd-ai-import__source-chip-name{max-width:250px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-weight:700}
      .pmd-ai-import__source-chip-size{color:#87928c;white-space:nowrap}
      .pmd-ai-import__source-chip button{border:0;background:transparent;color:#78847e;font-size:16px;line-height:1;padding:0 2px;cursor:pointer}
      .pmd-ai-import__drop.is-dragover{border-color:#0b7757!important;background:#eff9f4!important}
      .pmd-ai-import__summary-grid{display:flex;align-items:center;gap:7px;flex-wrap:wrap}
      .pmd-ai-import__stat{display:inline-flex;align-items:center;gap:5px;padding:5px 9px;border-radius:999px;background:#f0f4f2;color:#55645c;font-size:11px;font-weight:750}
      .pmd-ai-import__stat strong{font-size:12px;color:#183128}
      .pmd-ai-import__stat.is-ready{background:#eaf7f0;color:#176a49}
      .pmd-ai-import__stat.is-existing{background:#f3f1ea;color:#77643b}
      .pmd-ai-import__stat.is-review{background:#fff0ec;color:#9b4e3e}
      .pmd-ai-import__duplicates-toggle{border:0;background:#f1f5f3;color:#496157;border-radius:9px;min-height:30px;padding:0 10px;font-size:11px;font-weight:800;cursor:pointer}
      .pmd-ai-import.is-hiding-duplicates tr.is-duplicate{display:none!important}
      .pmd-ai-import__no-new{margin:12px 0 0;padding:18px;border:1px solid #dfe8e3;border-radius:12px;background:#f8fbf9;text-align:center;color:#53635b}
      .pmd-ai-import__no-new strong{display:block;color:#173129;font-size:14px;margin-bottom:4px}
      .pmd-ai-import__no-new p{margin:0;font-size:12px;line-height:1.45}
      .pmd-ai-import__review-state{display:flex;flex-direction:column;align-items:flex-start;gap:5px}
      .pmd-ai-import__state-badge{display:inline-flex;padding:4px 7px;border-radius:999px;background:#edf2ef;color:#53645b;font-size:10px;font-weight:850;white-space:nowrap}
      tr.is-duplicate .pmd-ai-import__state-badge{background:#f2efe6;color:#806838}
      tr.is-invalid .pmd-ai-import__state-badge{background:#fff0ec;color:#9d4e3d}
      .pmd-ai-import__review-state small{margin:0!important;color:#79847e!important;font-size:10px!important;line-height:1.35!important}
    `;
    document.head.appendChild(style);
  }

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

  function humanBytes(bytes) {
    var size = Number(bytes || 0);
    if (size < 1024) return size + ' B';
    if (size < 1024 * 1024) return Math.round(size / 102.4) / 10 + ' KB';
    return Math.round(size / (1024 * 102.4)) / 10 + ' MB';
  }

  function sourceKey(file) {
    return [file.name, file.size, file.lastModified, file.type].join('::');
  }

  function sourceLooksAllowed(file) {
    var mime = String(file.type || '').toLowerCase();
    if (['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].indexOf(mime) !== -1) return true;
    return /\.(jpe?g|png|webp|pdf)$/i.test(String(file.name || ''));
  }

  function addSources(files) {
    var incoming = Array.from(files || []);
    if (!incoming.length) return;

    var invalid = incoming.filter(function (file) { return !sourceLooksAllowed(file); });
    incoming = incoming.filter(sourceLooksAllowed);

    var seen = new Set(selectedSources.map(sourceKey));
    incoming.forEach(function (file) {
      if (selectedSources.length >= MAX_SOURCES) return;
      var key = sourceKey(file);
      if (seen.has(key)) return;
      seen.add(key);
      selectedSources.push(file);
    });

    if (invalid.length) {
      setText(uploadStatus, 'Only JPG, PNG, WEBP and PDF files can be read.', true);
    } else if (selectedSources.length >= MAX_SOURCES && incoming.length) {
      setText(uploadStatus, 'You can upload up to 12 menu files at once.', false);
    } else {
      setText(uploadStatus, '', false);
    }

    renderSourceSelection();
  }

  function renderSourceSelection() {
    var label = root.querySelector('[data-pmd-ai-menu-source-label]');
    if (label) {
      label.textContent = selectedSources.length
        ? (selectedSources.length + (selectedSources.length === 1 ? ' file selected' : ' files selected'))
        : 'No files selected';
    }

    if (sourceList) {
      sourceList.innerHTML = selectedSources.map(function (file, index) {
        return '<span class="pmd-ai-import__source-chip">'
          + '<span class="pmd-ai-import__source-chip-name" title="' + escapeHtml(file.name) + '">' + escapeHtml(file.name) + '</span>'
          + '<span class="pmd-ai-import__source-chip-size">' + humanBytes(file.size) + '</span>'
          + '<button type="button" data-pmd-ai-remove-source="' + index + '" aria-label="Remove ' + escapeHtml(file.name) + '">×</button>'
          + '</span>';
      }).join('');
    }

    if (analyseButton && !busy) analyseButton.disabled = selectedSources.length === 0;
  }

  if (sourceInput) {
    sourceInput.addEventListener('change', function () {
      addSources(sourceInput.files);
      sourceInput.value = '';
    });
  }

  if (sourceList) {
    sourceList.addEventListener('click', function (event) {
      var button = event.target.closest('[data-pmd-ai-remove-source]');
      if (!button) return;
      event.preventDefault();
      var index = Number(button.getAttribute('data-pmd-ai-remove-source'));
      if (Number.isInteger(index) && index >= 0 && index < selectedSources.length) {
        selectedSources.splice(index, 1);
        renderSourceSelection();
      }
    });
  }

  if (sourceDrop) {
    ['dragenter', 'dragover'].forEach(function (name) {
      sourceDrop.addEventListener(name, function (event) {
        event.preventDefault();
        sourceDrop.classList.add('is-dragover');
      });
    });
    ['dragleave', 'drop'].forEach(function (name) {
      sourceDrop.addEventListener(name, function (event) {
        event.preventDefault();
        sourceDrop.classList.remove('is-dragover');
      });
    });
    sourceDrop.addEventListener('drop', function (event) {
      addSources(event.dataTransfer ? event.dataTransfer.files : []);
    });
  }

  function categoryByName(name) {
    var key = normalize(name);
    return categories.find(function (row) { return normalize(row.name) === key; }) || null;
  }

  function escapeHtml(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function rowState(tr) {
    var name = tr.querySelector('[data-field="name"]').value.trim();
    var category = tr.querySelector('[data-field="category"]').value.trim();
    var price = tr.querySelector('[data-field="price"]').value.trim();
    var priceNumber = Number(price);
    var categoryOk = Boolean(categoryByName(category)) || canCreateCategories;
    var valid = name.length >= 2 && category.length >= 2 && categoryOk && price !== '' && Number.isFinite(priceNumber) && priceNumber >= 0;
    var duplicate = existingItems.has(normalize(name));
    return {valid: valid, duplicate: duplicate};
  }

  function rowValid(tr) {
    var state = rowState(tr);
    return state.valid && !state.duplicate;
  }

  function reviewCounts() {
    var rows = Array.from(itemHost.querySelectorAll('tr'));
    var counts = {found: rows.length, ready: 0, duplicate: 0, review: 0};
    rows.forEach(function (tr) {
      var state = rowState(tr);
      if (state.duplicate) counts.duplicate++;
      else if (state.valid) counts.ready++;
      else counts.review++;
    });
    return counts;
  }

  function selectedCount() {
    return Array.from(itemHost.querySelectorAll('[data-pmd-ai-row-select]')).filter(function (check) {
      return check.checked && !check.disabled;
    }).length;
  }

  function updateReviewSummary() {
    var counts = reviewCounts();
    if (summary) {
      summary.innerHTML = '<div class="pmd-ai-import__summary-grid">'
        + '<span class="pmd-ai-import__stat"><strong>' + counts.found + '</strong> found</span>'
        + '<span class="pmd-ai-import__stat is-ready"><strong>' + counts.ready + '</strong> ready</span>'
        + (counts.duplicate ? '<span class="pmd-ai-import__stat is-existing"><strong>' + counts.duplicate + '</strong> already in Menu</span>' : '')
        + (counts.review ? '<span class="pmd-ai-import__stat is-review"><strong>' + counts.review + '</strong> need review</span>' : '')
        + '</div>';
    }

    root.classList.toggle('is-hiding-duplicates', hideDuplicates);
    if (duplicateToggle) {
      duplicateToggle.hidden = counts.duplicate === 0;
      duplicateToggle.textContent = hideDuplicates
        ? ('Show existing (' + counts.duplicate + ')')
        : 'Hide existing';
    }

    if (noNew) {
      noNew.hidden = !(counts.ready === 0 && counts.review === 0 && counts.duplicate > 0 && hideDuplicates);
      var countNode = noNew.querySelector('[data-pmd-ai-no-new-count]');
      if (countNode) countNode.textContent = String(counts.duplicate);
    }

    if (selectAll) {
      var selectable = Array.from(itemHost.querySelectorAll('[data-pmd-ai-row-select]')).filter(function (check) { return !check.disabled; });
      selectAll.disabled = selectable.length === 0;
      selectAll.checked = selectable.length > 0 && selectable.every(function (check) { return check.checked; });
    }

    if (importButton && !busy) importButton.disabled = selectedCount() === 0;
  }

  function syncRow(tr) {
    var check = tr.querySelector('[data-pmd-ai-row-select]');
    var stateHost = tr.querySelector('[data-pmd-ai-row-warning]');
    var state = rowState(tr);
    var wasDuplicate = tr.dataset.duplicate === '1';

    tr.dataset.duplicate = state.duplicate ? '1' : '0';
    tr.classList.toggle('is-invalid', !state.valid);
    tr.classList.toggle('is-duplicate', state.duplicate);

    if (stateHost) {
      var label = state.duplicate ? 'Already in Menu' : (!state.valid ? 'Needs review' : 'Ready');
      var detail = '';
      if (!state.valid) detail = 'Check category and price.';
      if (state.duplicate) detail = 'Rename it if this should be a separate item.';
      stateHost.innerHTML = '<span class="pmd-ai-import__state-badge">' + label + '</span>'
        + (detail ? '<small>' + detail + '</small>' : '');
    }

    check.disabled = !state.valid || state.duplicate;
    if (check.disabled) check.checked = false;
    else if (wasDuplicate && !state.duplicate) check.checked = true;

    updateReviewSummary();
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
      tr.dataset.duplicate = duplicate ? '1' : '0';
      tr.innerHTML = ''
        + '<td><input type="checkbox" data-pmd-ai-row-select ' + (duplicate ? '' : 'checked') + '></td>'
        + '<td><input type="text" maxlength="128" list="' + listId + '" data-field="category" value="' + escapeHtml(item.category || 'Menu') + '"></td>'
        + '<td><input type="text" maxlength="128" data-field="name" value="' + escapeHtml(item.name || '') + '"></td>'
        + '<td><input type="number" min="0" max="9999999" step="0.01" data-field="price" value="' + (item.price == null ? '' : escapeHtml(item.price)) + '"></td>'
        + '<td><textarea maxlength="1028" rows="2" data-field="description">' + escapeHtml(item.description || '') + '</textarea></td>'
        + '<td><div class="pmd-ai-import__review-state"><span class="pmd-ai-import__confidence">' + Math.round(Number(item.confidence || 0) * 100) + '%</span>'
        + (reasons.length ? '<small>' + escapeHtml(reasons.join(' · ')) + '</small>' : '')
        + '<span data-pmd-ai-row-warning></span></div></td>';
      itemHost.appendChild(tr);
      tr.querySelectorAll('input,textarea').forEach(function (input) {
        input.addEventListener('input', function () { syncRow(tr); });
        input.addEventListener('change', function () { syncRow(tr); });
      });
      syncRow(tr);
    });

    updateReviewSummary();
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
    hideDuplicates = true;
    renderItems(draft.items);
    renderFloors(Array.isArray(draft.floors) ? draft.floors : []);
    upload.hidden = true;
    review.hidden = false;
    done.hidden = true;
    updateReviewSummary();
    review.scrollIntoView({behavior: 'smooth', block: 'start'});
  }

  async function analyse() {
    if (busy) return;
    if (!selectedSources.length) {
      setText(uploadStatus, 'Choose at least one menu image, screenshot or PDF.', true);
      return;
    }

    var data = new FormData();
    selectedSources.forEach(function (file) { data.append('menu_sources[]', file, file.name); });

    busy = true;
    analyseButton.disabled = true;
    setText(uploadStatus, 'AI is reading ' + selectedSources.length + (selectedSources.length === 1 ? ' file' : ' files') + '…', false);

    try {
      var payload = await postUrl('/admin/pmdmenuaiimport/analyse', data);
      setText(uploadStatus, '', false);
      showDraft(payload);
    } catch (error) {
      setText(uploadStatus, error.message || 'AI could not read these files.', true);
    } finally {
      busy = false;
      analyseButton.disabled = selectedSources.length === 0;
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
    try { return await promise; }
    catch (error) { categoryPromises.delete(key); throw error; }
  }

  function selectedFloorPayload() {
    return Array.from(floorsHost.querySelectorAll('.pmd-ai-import__floor-row')).map(function (row) {
      return {
        selected: Boolean(row.querySelector('[data-pmd-ai-floor-select]') && row.querySelector('[data-pmd-ai-floor-select]').checked),
        name: String((row.querySelector('[data-pmd-ai-floor-name]') || {}).value || '').trim(),
        table_count: Number((row.querySelector('[data-pmd-ai-floor-count]') || {}).value || 0)
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
    if (!rowValid(tr)) throw new Error('This row is not ready to import.');
    var categoryName = tr.querySelector('[data-field="category"]').value.trim();
    var category = await ensureCategory(categoryName);
    var data = new FormData();
    data.append('menu_name', tr.querySelector('[data-field="name"]').value.trim());
    data.append('menu_price', tr.querySelector('[data-field="price"]').value.trim());
    data.append('menu_description', tr.querySelector('[data-field="description"]').value.trim());
    data.append('category_ids[]', String(category.id));
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
          if (warning) warning.innerHTML = '<span class="pmd-ai-import__state-badge">Failed</span><small>' + escapeHtml(error.message || 'Import failed') + '</small>';
        } finally {
          completed++;
          setText(reviewStatus, 'Importing… ' + completed + ' of ' + rows.length, false);
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
      setText(reviewStatus, 'Choose at least one ready item to import.', true);
      return;
    }
    if (!window.confirm('Import the selected items into PayMyDine?')) return;

    busy = true;
    importButton.disabled = true;
    categoryPromises.clear();

    var imported = 0;
    var failed = 0;
    var tableImported = false;
    var tableWarning = '';

    try {
      if (rows.length) {
        setText(reviewStatus, 'Starting import…', false);
        var menuResult = await importRowsFast(rows);
        imported = menuResult.imported;
        failed = menuResult.failed;
      }

      try {
        if (selectedFloors.length) setText(reviewStatus, 'Importing Floor/Table layout…', false);
        var tableResult = await importTablesIfSelected();
        tableImported = Boolean(tableResult.imported);
      } catch (error) {
        tableWarning = error.message || 'Floor/Table import failed.';
      }

      review.hidden = true;
      done.hidden = false;
      var result = root.querySelector('[data-pmd-ai-import-result]');
      var parts = [imported + ' menu item' + (imported === 1 ? '' : 's') + ' imported'];
      if (failed) parts.push(failed + ' need review');
      if (tableImported) parts.push('Floor/Table layout imported');
      if (tableWarning) parts.push('Floor/Table warning: ' + tableWarning);
      result.textContent = parts.join(' · ') + '.';
      done.scrollIntoView({behavior: 'smooth', block: 'start'});
    } finally {
      busy = false;
      importButton.disabled = selectedCount() === 0;
    }
  }

  if (analyseButton) analyseButton.addEventListener('click', analyse);
  if (importButton) importButton.addEventListener('click', importSelected);

  if (selectAll) selectAll.addEventListener('change', function () {
    itemHost.querySelectorAll('[data-pmd-ai-row-select]').forEach(function (check) {
      if (!check.disabled) check.checked = selectAll.checked;
    });
    updateReviewSummary();
  });

  if (duplicateToggle) duplicateToggle.addEventListener('click', function () {
    hideDuplicates = !hideDuplicates;
    updateReviewSummary();
  });

  var startOver = root.querySelector('[data-pmd-ai-start-over]');
  if (startOver) startOver.addEventListener('click', function () {
    draft = null;
    categoryPromises.clear();
    selectedSources = [];
    hideDuplicates = true;
    if (sourceInput) sourceInput.value = '';
    renderSourceSelection();
    itemHost.innerHTML = '';
    review.hidden = true;
    upload.hidden = false;
    done.hidden = true;
    setText(reviewStatus, '', false);
    upload.scrollIntoView({behavior: 'smooth', block: 'start'});
  });

  renderSourceSelection();
})();
