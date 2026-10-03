/* PMD_MENU_INVENTORY_BRIDGE_R19 */
(function () {
  'use strict';

  var dataNode = document.getElementById('pmd-menu-inventory-r19-data');
  var modal = document.querySelector('[data-pmd-menu-inventory-r19-modal]');
  if (!dataNode || !modal) return;

  var snapshot = null;
  try { snapshot = JSON.parse(dataNode.textContent || 'null'); } catch (ignore) {}
  if (!snapshot || typeof snapshot !== 'object') {
    document.querySelectorAll('[data-pmd-stock-usage-r19]').forEach(function (button) {
      button.disabled = true;
      button.title = 'Inventory is not ready yet';
    });
    return;
  }

  var activeMenuId = 0;
  var busy = false;

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
      .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
  }

  function items() {
    return Array.isArray(snapshot.items) ? snapshot.items : [];
  }

  function recipes() {
    return Array.isArray(snapshot.recipes) ? snapshot.recipes : [];
  }

  function recipeFor(menuId) {
    return recipes().find(function (row) { return Number(row.menu_id) === Number(menuId); }) || null;
  }

  function itemOptions(selected) {
    return '<option value="">Choose stock item</option>' + items().map(function (item) {
      return '<option value="' + esc(item.id) + '"' +
        (Number(item.id) === Number(selected) ? ' selected' : '') + '>' +
        esc(item.name + ' · ' + (item.unit || '')) +
      '</option>';
    }).join('');
  }

  function csrf() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    if (meta && meta.content) return meta.content;
    var input = document.querySelector('input[name="_token"]');
    return input ? input.value : '';
  }

  function request(data) {
    var headers = {
      'Accept':'application/json',
      'Content-Type':'application/json',
      'X-Requested-With':'XMLHttpRequest',
      'X-IGNITER-REQUEST-HANDLER':'onSaveStockUsageR19'
    };
    var token = csrf();
    if (token) headers['X-CSRF-TOKEN'] = token;

    return fetch(window.location.href, {
      method:'POST',
      credentials:'same-origin',
      cache:'no-store',
      headers:headers,
      body:JSON.stringify(data || {})
    }).then(function (response) {
      return response.json().catch(function () { return null; }).then(function (json) {
        if (!response.ok || !json || json.ok === false) {
          throw new Error(json && json.error ? json.error : 'Stock usage could not be saved.');
        }
        return json;
      });
    });
  }

  function toast(message, error) {
    var node = document.createElement('div');
    node.textContent = String(message || '');
    node.style.cssText =
      'position:fixed;z-index:12000;right:22px;bottom:22px;max-width:360px;padding:11px 14px;border-radius:12px;' +
      'background:' + (error ? '#ad2940' : '#0b6653') + ';color:#fff;font:800 11px/1.3 system-ui,sans-serif;' +
      'box-shadow:0 14px 38px rgba(0,0,0,.16)';
    document.body.appendChild(node);
    setTimeout(function () { node.remove(); }, 2600);
  }

  function lineHtml(line) {
    line = line || {};
    return '<div class="pmd-menu-inventory-r19-line" data-pmd-menu-inventory-r19-line>' +
      '<select data-pmd-menu-inventory-r19-item>' + itemOptions(line.item_id || '') + '</select>' +
      '<input type="number" min="0" step="0.0001" placeholder="Amount per sale" value="' +
        esc(line.qty_per_sale == null ? '' : line.qty_per_sale) + '" data-pmd-menu-inventory-r19-qty>' +
      '<button type="button" data-pmd-menu-inventory-r19-remove aria-label="Remove">×</button>' +
    '</div>';
  }

  function renderLines(lines) {
    var host = modal.querySelector('[data-pmd-menu-inventory-r19-lines]');
    if (!host) return;
    if (!lines.length) {
      host.innerHTML = '<div class="pmd-menu-inventory-r19-empty">No stock usage connected yet. Add the ingredients consumed by one sale.</div>';
      return;
    }
    host.innerHTML = lines.map(lineHtml).join('');
  }

  function updateBadges() {
    document.querySelectorAll('[data-pmd-stock-usage-r19]').forEach(function (button) {
      var menuId = Number(button.getAttribute('data-pmd-stock-usage-r19') || 0);
      var recipe = recipeFor(menuId);
      var count = recipe && Array.isArray(recipe.lines) ? recipe.lines.length : 0;
      button.textContent = count ? ('Stock usage · ' + count) : 'Stock usage';
    });
  }

  function open(menuId) {
    activeMenuId = Number(menuId || 0);
    if (!activeMenuId) return;

    var card = document.querySelector('[data-pmd-menu-card][data-menu-id="' + activeMenuId + '"]');
    var title = card && card.querySelector('.pmd-menu-card__title-row h2');
    var titleNode = modal.querySelector('[data-pmd-menu-inventory-r19-title]');
    if (titleNode) titleNode.textContent = title ? title.textContent.trim() : 'Stock usage';

    var recipe = recipeFor(activeMenuId);
    var lines = recipe && Array.isArray(recipe.lines) ? recipe.lines : [];
    renderLines(lines);
    modal.hidden = false;
    modal.setAttribute('aria-hidden','false');
    document.body.style.overflow = 'hidden';
  }

  function close() {
    modal.hidden = true;
    modal.setAttribute('aria-hidden','true');
    activeMenuId = 0;
    document.body.style.overflow = '';
  }

  function addLine() {
    var host = modal.querySelector('[data-pmd-menu-inventory-r19-lines]');
    if (!host) return;
    var empty = host.querySelector('.pmd-menu-inventory-r19-empty');
    if (empty) host.innerHTML = '';
    host.insertAdjacentHTML('beforeend', lineHtml({}));
    var line = host.lastElementChild;
    var select = line && line.querySelector('select');
    if (select) select.focus();
  }

  function save() {
    if (busy || !activeMenuId) return;
    var lines = Array.prototype.slice.call(
      modal.querySelectorAll('[data-pmd-menu-inventory-r19-line]')
    ).map(function (line) {
      var item = line.querySelector('[data-pmd-menu-inventory-r19-item]');
      var qty = line.querySelector('[data-pmd-menu-inventory-r19-qty]');
      return {
        item_id:Number(item && item.value || 0),
        qty_per_sale:Number(qty && qty.value || 0)
      };
    }).filter(function (line) {
      return line.item_id > 0 && line.qty_per_sale > 0;
    });

    busy = true;
    modal.querySelectorAll('button,select,input').forEach(function (node) { node.disabled = true; });

    request({menu_id:activeMenuId,lines:lines})
      .then(function (json) {
        if (json.snapshot) snapshot = json.snapshot;
        updateBadges();
        close();
        toast('Stock usage saved.');
      })
      .catch(function (error) {
        toast(error.message || 'Could not save stock usage.', true);
      })
      .finally(function () {
        busy = false;
        modal.querySelectorAll('button,select,input').forEach(function (node) { node.disabled = false; });
      });
  }

  document.addEventListener('click', function (event) {
    var openButton = event.target.closest('[data-pmd-stock-usage-r19]');
    if (openButton) {
      event.preventDefault();
      event.stopPropagation();
      open(openButton.getAttribute('data-pmd-stock-usage-r19'));
      return;
    }
    if (event.target.closest('[data-pmd-menu-inventory-r19-close]')) {
      event.preventDefault();
      close();
      return;
    }
    if (event.target.closest('[data-pmd-menu-inventory-r19-add]')) {
      event.preventDefault();
      addLine();
      return;
    }
    var remove = event.target.closest('[data-pmd-menu-inventory-r19-remove]');
    if (remove) {
      event.preventDefault();
      var line = remove.closest('[data-pmd-menu-inventory-r19-line]');
      if (line) line.remove();
      var host = modal.querySelector('[data-pmd-menu-inventory-r19-lines]');
      if (host && !host.querySelector('[data-pmd-menu-inventory-r19-line]')) renderLines([]);
      return;
    }
    if (event.target.closest('[data-pmd-menu-inventory-r19-save]')) {
      event.preventDefault();
      save();
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !modal.hidden) close();
  });

  updateBadges();
}());
