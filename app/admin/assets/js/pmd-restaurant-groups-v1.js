(function () {
  'use strict';

  var path = location.pathname.replace(/\/+$/, '');
  if (path.indexOf('/admin') !== 0 || /\/admin\/(?:login|logout|reset)/.test(path)) return;
  if (path.indexOf('/admin/group/') === 0) return;

  var adminPrefix = '/admin';
  var context = null;
  var currentScope = 'all';

  function csrf() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    if (meta) return meta.getAttribute('content') || '';
    var input = document.querySelector('input[name="_token"]');
    return input ? input.value : '';
  }

  function api(url, options) {
    options = options || {};
    options.credentials = 'same-origin';
    options.cache = 'no-store';
    options.headers = Object.assign({
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest'
    }, options.headers || {});
    if (options.method && options.method !== 'GET') {
      options.headers['Content-Type'] = 'application/json';
      options.headers['X-CSRF-TOKEN'] = csrf();
    }
    return fetch(url, options).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (data) {
        if (!response.ok || data.ok === false) {
          throw new Error(data.message || ('Request failed (' + response.status + ')'));
        }
        return data;
      });
    });
  }

  function esc(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char];
    });
  }

  function money(value, currency) {
    try {
      return new Intl.NumberFormat(document.documentElement.lang || undefined, {
        style: 'currency',
        currency: currency,
        maximumFractionDigits: 2
      }).format(Number(value || 0));
    } catch (error) {
      return String(Number(value || 0).toFixed(2)) + ' ' + currency;
    }
  }

  function card(key) {
    return document.querySelector('[data-pmd-dashboard2-kpi="' + key + '"]');
  }

  function writeCard(key, value, description) {
    var node = card(key);
    if (!node) return;
    var valueNode = node.querySelector('.pmd-r2-kpi-v2401-value');
    var descriptionNode = node.querySelector('.pmd-r2-kpi-v2401-description');
    if (valueNode) valueNode.textContent = value;
    if (descriptionNode && description) descriptionNode.textContent = description;
  }

  function total(snapshot) {
    return snapshot.totals && snapshot.totals.length === 1 ? snapshot.totals[0] : null;
  }

  function renderDashboard(snapshot) {
    var one = total(snapshot);
    var locations = Array.isArray(snapshot.locations) ? snapshot.locations : [];

    if (one) {
      writeCard('revenue', money(one.revenue, one.currency), one.locations + ' location' + (one.locations === 1 ? '' : 's'));
      writeCard('guests', String(one.guests), String(one.orders) + ' paid orders');
      writeCard('tips', money(one.tips, one.currency), 'Paid-order tips');
      writeCard('channels', String(one.orders), one.dine_in + ' dine-in · ' + one.takeaway + ' takeaway · ' + one.delivery + ' delivery');
    } else if (snapshot.mixed_currency) {
      writeCard('revenue', 'Mixed', snapshot.totals.map(function (row) {
        return money(row.revenue, row.currency);
      }).join(' · '));
      writeCard('tips', 'Mixed', snapshot.totals.map(function (row) {
        return money(row.tips, row.currency);
      }).join(' · '));
      var orderCount = snapshot.totals.reduce(function (sum, row) { return sum + Number(row.orders || 0); }, 0);
      var guestCount = snapshot.totals.reduce(function (sum, row) { return sum + Number(row.guests || 0); }, 0);
      writeCard('guests', String(guestCount), String(orderCount) + ' paid orders');
    }

    writeCard(
      'turnover',
      snapshot.turnover_minutes == null ? '—' : Math.round(Number(snapshot.turnover_minutes)) + ' min',
      'Weighted across selected locations'
    );

    var occupancy = locations.map(function (row) { return row.occupancy_percent; }).filter(function (value) {
      return value !== null && value !== undefined;
    });
    writeCard(
      'occupancy',
      occupancy.length ? Math.round(occupancy.reduce(function (a,b){return a+Number(b);},0) / occupancy.length) + '%' : '—',
      'Average selected-location occupancy'
    );

    var available = locations.reduce(function (sum,row){ return sum + Number(row.menu_available || 0); },0);
    var menuTotal = locations.reduce(function (sum,row){ return sum + Number(row.menu_total || 0); },0);
    writeCard('menu', menuTotal ? available + '/' + menuTotal : '—', 'Available menu items');

    if (currentScope === 'all' || Number(currentScope) !== Number(context.current_tenant_id)) {
      writeCard('kitchen', '—', 'Kitchen time stays location-specific');
    }
  }

  function accountTools(host) {
    if (!context || host.querySelector('[data-pmd-group-account]')) return;

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'pmd-group-tool-btn';
    button.setAttribute('data-pmd-group-account', '1');
    button.textContent = 'Business account';
    host.appendChild(button);

    var backdrop = document.createElement('div');
    backdrop.className = 'pmd-group-share-backdrop';
    backdrop.hidden = true;

    var panel = document.createElement('aside');
    panel.className = 'pmd-group-share-panel';
    panel.hidden = true;

    var foodCourtSection = '';
    if (context.group.type === 'food_court') {
      foodCourtSection =
        '<div class="pmd-group-account-section">' +
          '<h4>Pickup board</h4>' +
          '<p>Create a display link for the locations you choose. The board shows order numbers only.</p>' +
          '<div class="pmd-group-targets" data-display-targets></div>' +
          '<button type="button" class="pmd-group-btn soft" data-create-display>Create pickup board</button>' +
          '<div class="pmd-group-display-result" data-display-result hidden>' +
            '<input type="text" readonly data-display-url>' +
            '<button type="button" class="pmd-group-btn soft" data-copy-display>Copy link</button>' +
          '</div>' +
          '<div class="pmd-group-share-status" data-display-status></div>' +
        '</div>';
    }

    panel.innerHTML =
      '<div class="pmd-group-share-head">' +
        '<div><h3>Business account</h3><p>' + esc(context.group.name) + ' · ' + esc(context.owner.username) + '</p></div>' +
        '<button type="button" class="pmd-group-share-close" data-account-close aria-label="Close">×</button>' +
      '</div>' +
      '<div class="pmd-group-share-body">' +
        '<div class="pmd-group-account-section">' +
          '<h4>Shared Owner password</h4>' +
          '<p>Changing it here changes the sign-in password for every location in this Business Account.</p>' +
          '<div class="pmd-group-field"><label>Current password</label><input type="password" autocomplete="current-password" data-current-password></div>' +
          '<div class="pmd-group-field"><label>New password</label><input type="password" minlength="14" maxlength="128" autocomplete="new-password" data-new-password></div>' +
          '<div class="pmd-group-field"><label>Confirm new password</label><input type="password" minlength="14" maxlength="128" autocomplete="new-password" data-confirm-password></div>' +
          '<button type="button" class="pmd-group-btn primary" data-change-password>Change password</button>' +
          '<div class="pmd-group-share-status" data-password-status></div>' +
        '</div>' +
        foodCourtSection +
      '</div>';

    document.body.appendChild(backdrop);
    document.body.appendChild(panel);

    function open() {
      backdrop.hidden = false;
      panel.hidden = false;
    }

    function close() {
      backdrop.hidden = true;
      panel.hidden = true;
    }

    button.addEventListener('click', open);
    backdrop.addEventListener('click', close);
    panel.querySelector('[data-account-close]').addEventListener('click', close);

    var change = panel.querySelector('[data-change-password]');
    var passwordStatus = panel.querySelector('[data-password-status]');

    change.addEventListener('click', function () {
      var current = panel.querySelector('[data-current-password]').value;
      var next = panel.querySelector('[data-new-password]').value;
      var confirm = panel.querySelector('[data-confirm-password]').value;

      passwordStatus.className = 'pmd-group-share-status';
      if (!current || next.length < 14 || next !== confirm) {
        passwordStatus.textContent = 'Enter the current password and matching new passwords of at least 14 characters.';
        passwordStatus.classList.add('is-error');
        return;
      }

      change.disabled = true;
      passwordStatus.textContent = 'Changing password…';

      api(adminPrefix + '/group/password', {
        method: 'POST',
        body: JSON.stringify({
          current_password: current,
          new_password: next,
          new_password_confirmation: confirm
        })
      }).then(function (data) {
        passwordStatus.textContent = data.message || 'Password changed. Sign in again.';
        passwordStatus.classList.add('is-ok');
        window.setTimeout(function () {
          location.href = adminPrefix + '/login';
        }, 900);
      }).catch(function (error) {
        passwordStatus.textContent = error.message;
        passwordStatus.classList.add('is-error');
        change.disabled = false;
      });
    });

    if (context.group.type === 'food_court') {
      var targetHost = panel.querySelector('[data-display-targets]');
      var createDisplay = panel.querySelector('[data-create-display]');
      var displayStatus = panel.querySelector('[data-display-status]');
      var displayResult = panel.querySelector('[data-display-result]');
      var displayUrl = panel.querySelector('[data-display-url]');
      var copyDisplay = panel.querySelector('[data-copy-display]');

      targetHost.innerHTML = context.sites.map(function (site) {
        return '<label class="pmd-group-target"><input type="checkbox" checked value="' +
          Number(site.tenant_id) + '"><span>' + esc(site.label) +
          '<small>' + esc(site.domain || '') + '</small></span></label>';
      }).join('');

      createDisplay.addEventListener('click', function () {
        var selected = Array.prototype.map.call(
          targetHost.querySelectorAll('input:checked'),
          function (input) { return Number(input.value); }
        );

        displayStatus.className = 'pmd-group-share-status';
        if (!selected.length) {
          displayStatus.textContent = 'Choose at least one location.';
          displayStatus.classList.add('is-error');
          return;
        }

        createDisplay.disabled = true;
        displayStatus.textContent = 'Creating pickup board…';

        api(adminPrefix + '/group/foodcourt/display', {
          method: 'POST',
          body: JSON.stringify({targets: selected})
        }).then(function (data) {
          displayUrl.value = data.url || '';
          displayResult.hidden = !displayUrl.value;
          displayStatus.textContent = displayUrl.value
            ? 'Pickup board created. Keep this private display link on the venue screen.'
            : 'Pickup board was created without a display URL.';
          displayStatus.classList.add(displayUrl.value ? 'is-ok' : 'is-error');
        }).catch(function (error) {
          displayStatus.textContent = error.message;
          displayStatus.classList.add('is-error');
        }).finally(function () {
          createDisplay.disabled = false;
        });
      });

      copyDisplay.addEventListener('click', function () {
        if (!displayUrl.value) return;

        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(displayUrl.value).then(function () {
            copyDisplay.textContent = 'Copied';
            window.setTimeout(function () {
              copyDisplay.textContent = 'Copy link';
            }, 1200);
          });
          return;
        }

        displayUrl.select();
        try { document.execCommand('copy'); } catch (error) {}
      });
    }
  }

  function dashboardScope() {
    if (path !== '/admin/ownerdashboard' && path !== '/admin/dashboardlab') return;
    if (!context) return;

    var host = document.querySelector('#pmd-r2-clean-header .pmd-r2-clean-actions')
      || document.querySelector('#pmd-r2-clean-header')
      || document.querySelector('#pmd-dashboard-lab');

    if (!host || document.querySelector('[data-pmd-group-scope]')) return;

    var wrap = document.createElement('div');
    wrap.className = 'pmd-group-scope-wrap';
    wrap.setAttribute('data-pmd-group-scope', '1');

    var select = null;

    if (context.capabilities.aggregate_dashboard) {
      select = document.createElement('select');
      select.className = 'pmd-group-scope';
      select.setAttribute('aria-label', 'Dashboard location scope');
      select.innerHTML = '<option value="all">All locations</option>' + context.sites.map(function (site) {
        return '<option value="' + Number(site.tenant_id) + '">' + esc(site.label) + '</option>';
      }).join('');
      wrap.appendChild(select);
    }

    var badge = document.createElement('span');
    badge.className = 'pmd-group-badge';
    badge.textContent = context.group.type === 'food_court'
      ? 'Food Court'
      : (context.capabilities.aggregate_dashboard ? 'Multi-location' : 'Business account');
    wrap.appendChild(badge);

    accountTools(wrap);

    if (host.classList && host.classList.contains('pmd-r2-clean-actions')) {
      host.insertBefore(wrap, host.firstChild);
    } else {
      host.insertBefore(wrap, host.firstChild);
    }

    if (!select) return;

    try {
      currentScope = localStorage.getItem('pmd.group.scope.' + context.group.uuid) || 'all';
    } catch (error) {
      currentScope = 'all';
    }

    if (currentScope !== 'all' && !context.sites.some(function (site) {
      return String(site.tenant_id) === String(currentScope);
    })) currentScope = 'all';

    select.value = currentScope;

    function load() {
      select.disabled = true;
      api(adminPrefix + '/group/snapshot?scope=' + encodeURIComponent(currentScope) + '&period=today')
        .then(renderDashboard)
        .catch(function () {})
        .finally(function () { select.disabled = false; });
    }

    select.addEventListener('change', function () {
      currentScope = select.value;
      try {
        localStorage.setItem('pmd.group.scope.' + context.group.uuid, currentScope);
      } catch (error) {}
      load();
    });

    load();
  }

  function publishingType() {
    if (/\/admin\/menus(?:\/|$)/.test(path)) return 'menu';
    if (/\/admin\/(?:discounts|coupons)(?:\/|$)/.test(path)) return 'coupon';
    if (/\/admin\/(?:settings|pmdsettings)(?:\/|$)/.test(path)) return 'setting';
    return null;
  }

  function sharing() {
    var type = publishingType();
    if (!type || !context || !context.capabilities.publish || context.sites.length < 2) return;
    if (document.querySelector('[data-pmd-group-share-trigger]')) return;

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'pmd-group-share-trigger';
    trigger.setAttribute('data-pmd-group-share-trigger', '1');
    trigger.textContent = 'Apply to locations';
    document.body.appendChild(trigger);

    var backdrop = document.createElement('div');
    backdrop.className = 'pmd-group-share-backdrop';
    backdrop.hidden = true;

    var panel = document.createElement('aside');
    panel.className = 'pmd-group-share-panel';
    panel.hidden = true;
    panel.innerHTML =
      '<div class="pmd-group-share-head">' +
        '<div><h3>Apply to locations</h3><p>Save this location first. Then publish the saved item to the locations you select.</p></div>' +
        '<button type="button" class="pmd-group-share-close" data-close aria-label="Close">×</button>' +
      '</div>' +
      '<div class="pmd-group-share-body">' +
        '<div class="pmd-group-field"><label>Saved item</label><select data-entity></select></div>' +
        '<div class="pmd-group-field"><label>Target locations</label><div class="pmd-group-targets" data-targets></div></div>' +
        '<label class="pmd-group-overwrite"><input type="checkbox" data-overwrite><span>Overwrite a target only if it changed after the preview. Leave this off unless you reviewed that location.</span></label>' +
        '<div class="pmd-group-preview" data-preview hidden></div>' +
        '<div class="pmd-group-share-status" data-status></div>' +
        '<div class="pmd-group-share-actions"><button type="button" class="pmd-group-btn soft" data-preview-btn>Preview</button><button type="button" class="pmd-group-btn primary" data-apply disabled>Apply changes</button></div>' +
      '</div>';

    document.body.appendChild(backdrop);
    document.body.appendChild(panel);

    var entity = panel.querySelector('[data-entity]');
    var targets = panel.querySelector('[data-targets]');
    var status = panel.querySelector('[data-status]');
    var previewBox = panel.querySelector('[data-preview]');
    var previewButton = panel.querySelector('[data-preview-btn]');
    var applyButton = panel.querySelector('[data-apply]');
    var overwrite = panel.querySelector('[data-overwrite]');
    var operation = null;

    targets.innerHTML = context.sites.filter(function (site) {
      return Number(site.tenant_id) !== Number(context.current_tenant_id) && site.can_publish;
    }).map(function (site) {
      return '<label class="pmd-group-target"><input type="checkbox" value="' + Number(site.tenant_id) + '"><span>' +
        esc(site.label) + '<small>' + esc(site.domain || '') + '</small></span></label>';
    }).join('');

    function setStatus(message, mode) {
      status.textContent = message || '';
      status.className = 'pmd-group-share-status' + (mode ? ' is-' + mode : '');
    }

    function open() {
      backdrop.hidden = false;
      panel.hidden = false;
      operation = null;
      applyButton.disabled = true;
      previewBox.hidden = true;
      setStatus('Loading saved items…');

      api(adminPrefix + '/group/catalog?type=' + encodeURIComponent(type))
        .then(function (data) {
          var items = Array.isArray(data.items) ? data.items : [];
          entity.innerHTML = items.map(function (item) {
            return '<option value="' + esc(item.id) + '">' + esc(item.label) + '</option>';
          }).join('');

          if (type === 'menu') {
            var match = path.match(/\/menus\/edit\/(\d+)$/);
            if (match && Array.prototype.some.call(entity.options, function (option) { return option.value === match[1]; })) {
              entity.value = match[1];
            }
          }

          setStatus(items.length ? 'Choose the locations, then preview.' : 'No saved items are available on this location.', items.length ? '' : 'error');
          previewButton.disabled = !items.length;
        })
        .catch(function (error) {
          setStatus(error.message, 'error');
        });
    }

    function close() {
      backdrop.hidden = true;
      panel.hidden = true;
    }

    trigger.addEventListener('click', open);
    backdrop.addEventListener('click', close);
    panel.querySelector('[data-close]').addEventListener('click', close);

    previewButton.addEventListener('click', function () {
      var selected = Array.prototype.map.call(
        targets.querySelectorAll('input:checked'),
        function (input) { return Number(input.value); }
      );

      if (!selected.length) {
        setStatus('Choose at least one other location.', 'error');
        return;
      }

      previewButton.disabled = true;
      applyButton.disabled = true;
      setStatus('Checking target locations…');

      api(adminPrefix + '/group/publish/preview', {
        method: 'POST',
        body: JSON.stringify({
          type: type,
          entity_id: entity.value,
          targets: selected
        })
      }).then(function (data) {
        operation = data.operation;
        previewBox.hidden = false;
        previewBox.innerHTML = '<strong>Ready to publish</strong><br>' + data.targets.map(function (target) {
          return esc(target.label) + (target.existing ? ' · update existing copy' : ' · create copy');
        }).join('<br>');
        setStatus('Preview created. Apply only after checking these targets.', 'ok');
        applyButton.disabled = false;
      }).catch(function (error) {
        operation = null;
        previewBox.hidden = true;
        setStatus(error.message, 'error');
      }).finally(function () {
        previewButton.disabled = false;
      });
    });

    applyButton.addEventListener('click', function () {
      if (!operation) return;

      applyButton.disabled = true;
      previewButton.disabled = true;
      setStatus('Publishing…');

      api(adminPrefix + '/group/publish/apply', {
        method: 'POST',
        body: JSON.stringify({
          operation: operation,
          overwrite: overwrite.checked
        })
      }).then(function (data) {
        var failed = data.results.filter(function (row) { return !row.ok; });
        if (failed.length) {
          setStatus(failed.length + ' location(s) were not updated. Review the conflict and create a new preview.', 'error');
        } else {
          setStatus('Changes applied to all selected locations.', 'ok');
          operation = null;
          applyButton.disabled = true;
        }
      }).catch(function (error) {
        setStatus(error.message, 'error');
      }).finally(function () {
        previewButton.disabled = false;
        if (operation) applyButton.disabled = false;
      });
    });
  }

  api(adminPrefix + '/group/context')
    .then(function (data) {
      if (!data.enabled) return;
      context = data;
      dashboardScope();
      sharing();
    })
    .catch(function () {});
})();
