(function () {
  'use strict';

  var root = document.querySelector('[data-pmd-owner-page]');
  if (!root) return;

  var actions = root.querySelector('[data-pmd-owner-header-actions]');
  var form = root.querySelector('[data-pmd-owner-form]');
  var save = root.querySelector('[data-pmd-owner-save]');
  var baseline = '';
  var armed = false;

  function setImportant(node, property, value) {
    if (!node) return;
    node.style.setProperty(property, value, 'important');
  }

  function applyNotificationGeometry(notificationRoot) {
    if (!notificationRoot) return;

    var toggle = notificationRoot.querySelector('#notifDropdown');
    if (!toggle) return;

    var bell = toggle.querySelector('#bell-icon');
    var count = toggle.querySelector('#notification-count');

    setImportant(notificationRoot, 'position', 'relative');
    setImportant(notificationRoot, 'display', 'flex');
    setImportant(notificationRoot, 'align-items', 'center');
    setImportant(notificationRoot, 'justify-content', 'center');
    setImportant(notificationRoot, 'width', '46px');
    setImportant(notificationRoot, 'min-width', '46px');
    setImportant(notificationRoot, 'max-width', '46px');
    setImportant(notificationRoot, 'height', '46px');
    setImportant(notificationRoot, 'min-height', '46px');
    setImportant(notificationRoot, 'max-height', '46px');
    setImportant(notificationRoot, 'margin', '0');
    setImportant(notificationRoot, 'padding', '0');
    setImportant(notificationRoot, 'overflow', 'visible');

    setImportant(toggle, 'position', 'relative');
    setImportant(toggle, 'display', 'grid');
    setImportant(toggle, 'place-items', 'center');
    setImportant(toggle, 'align-items', 'center');
    setImportant(toggle, 'justify-content', 'center');
    setImportant(toggle, 'box-sizing', 'border-box');
    setImportant(toggle, 'width', '46px');
    setImportant(toggle, 'min-width', '46px');
    setImportant(toggle, 'max-width', '46px');
    setImportant(toggle, 'height', '46px');
    setImportant(toggle, 'min-height', '46px');
    setImportant(toggle, 'max-height', '46px');
    setImportant(toggle, 'margin', '0');
    setImportant(toggle, 'padding', '0');
    setImportant(toggle, 'left', 'auto');
    setImportant(toggle, 'right', 'auto');
    setImportant(toggle, 'top', 'auto');
    setImportant(toggle, 'bottom', 'auto');
    setImportant(toggle, 'line-height', '1');
    setImportant(toggle, 'text-indent', '0');
    setImportant(toggle, 'transform', 'none');
    setImportant(toggle, 'overflow', 'visible');

    if (bell) {
      setImportant(bell, 'position', 'static');
      setImportant(bell, 'left', 'auto');
      setImportant(bell, 'right', 'auto');
      setImportant(bell, 'top', 'auto');
      setImportant(bell, 'bottom', 'auto');
      setImportant(bell, 'display', 'flex');
      setImportant(bell, 'align-items', 'center');
      setImportant(bell, 'justify-content', 'center');
      setImportant(bell, 'width', '21px');
      setImportant(bell, 'height', '21px');
      setImportant(bell, 'margin', '0');
      setImportant(bell, 'padding', '0');
      setImportant(bell, 'line-height', '1');
      setImportant(bell, 'transform', 'none');
      setImportant(bell, 'pointer-events', 'none');

      var bellSvg = bell.querySelector('svg');
      if (bellSvg) {
        setImportant(bellSvg, 'display', 'block');
        setImportant(bellSvg, 'width', '21px');
        setImportant(bellSvg, 'height', '21px');
        setImportant(bellSvg, 'margin', '0');
        setImportant(bellSvg, 'padding', '0');
        setImportant(bellSvg, 'transform', 'none');
      }
    }

    if (count) {
      setImportant(count, 'position', 'absolute');
      setImportant(count, 'top', '-7px');
      setImportant(count, 'right', '-8px');
      setImportant(count, 'left', 'auto');
      setImportant(count, 'bottom', 'auto');
      setImportant(count, 'z-index', '8');
      setImportant(count, 'margin', '0');
      setImportant(count, 'transform', 'none');
      setImportant(count, 'min-width', '18px');
      setImportant(count, 'height', '18px');
      setImportant(count, 'padding', '0 4px');
      setImportant(count, 'border-radius', '999px');
      setImportant(count, 'line-height', '14px');
      setImportant(count, 'text-align', 'center');
      setImportant(count, 'white-space', 'nowrap');
    }
  }

  function normalizeBell(notificationRoot) {
    if (!notificationRoot) return;
    var toggle = notificationRoot.querySelector('#notifDropdown');
    if (!toggle) return;

    toggle.classList.remove('show');
    toggle.setAttribute('aria-expanded', 'false');

    Array.prototype.forEach.call(
      toggle.querySelectorAll('i.fa, i.fas, i.far, i.fal, i.fab'),
      function (node) { node.remove(); }
    );

    var bell = toggle.querySelector('#bell-icon');
    if (!bell) {
      bell = document.createElement('span');
      bell.id = 'bell-icon';
      toggle.insertBefore(bell, toggle.firstChild || null);
    }

    bell.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path></svg>';
    applyNotificationGeometry(notificationRoot);
  }

  function installNotificationGeometryGuard(notificationRoot) {
    applyNotificationGeometry(notificationRoot);
  }

  function dashboardNotificationGap() {
    var gap = document.createElement('span');
    gap.setAttribute('data-pmd-main-header-notification-gap-r67', '');
    gap.setAttribute('aria-hidden', 'true');
    gap.style.cssText =
      'position:relative!important;display:block!important;flex:0 0 10px!important;'
      + 'width:10px!important;min-width:10px!important;max-width:10px!important;'
      + 'height:46px!important;min-height:46px!important;max-height:46px!important;'
      + 'margin:0!important;padding:0!important;border:0!important;background:transparent!important;'
      + 'pointer-events:none!important;overflow:visible!important;';

    var divider = document.createElement('span');
    divider.setAttribute('data-pmd-main-header-notification-divider-r67', '');
    divider.setAttribute('aria-hidden', 'true');
    divider.style.cssText =
      'position:absolute!important;top:50%!important;right:5px!important;left:auto!important;'
      + 'transform:translateY(-50%)!important;display:block!important;width:1px!important;'
      + 'min-width:1px!important;max-width:1px!important;height:34px!important;min-height:34px!important;'
      + 'max-height:34px!important;margin:0!important;padding:0!important;border:0!important;'
      + 'background:#cfe0ec!important;pointer-events:none!important;';
    gap.appendChild(divider);
    return gap;
  }

  function installNotification() {
    if (!actions) return;
    var notificationRoot = document.getElementById('notif-root');
    if (!notificationRoot) return;

    notificationRoot.classList.remove('show');
    Array.prototype.forEach.call(notificationRoot.querySelectorAll('.dropdown-menu.show'), function (menu) {
      menu.classList.remove('show');
      menu.style.removeProperty('display');
    });

    normalizeBell(notificationRoot);
    var slot = actions.querySelector('[data-pmd-owner-notif-slot]');
    var oldGap = actions.querySelector('[data-pmd-main-header-notification-gap-r67]');
    if (oldGap) oldGap.remove();
    var gap = dashboardNotificationGap();

    if (slot) {
      slot.replaceWith(gap, notificationRoot);
    } else if (!actions.contains(notificationRoot)) {
      actions.appendChild(gap);
      actions.appendChild(notificationRoot);
    } else {
      actions.insertBefore(gap, notificationRoot);
    }

    applyNotificationGeometry(notificationRoot);
    installNotificationGeometryGuard(notificationRoot);
  }

  function serializeForm() {
    if (!form) return '';
    var data = [];
    Array.prototype.forEach.call(form.elements, function (field) {
      if (!field || !field.name || field.disabled) return;
      if (field.type === 'submit' || field.type === 'button') return;
      var type = String(field.type || '').toLowerCase();
      var value;
      if (type === 'checkbox' || type === 'radio') {
        value = field.checked ? '1' : '0';
      } else if (field.tagName === 'SELECT' && field.multiple) {
        value = Array.prototype.filter.call(field.options, function (option) {
          return option.selected;
        }).map(function (option) { return option.value; }).join(',');
      } else {
        value = String(field.value == null ? '' : field.value);
      }
      data.push(field.name + '=' + value);
    });
    return data.join('&');
  }

  function setSaveVisible(visible) {
    if (!save) return;
    save.classList.toggle('is-visible', Boolean(visible));
    save.setAttribute('aria-hidden', visible ? 'false' : 'true');
    save.tabIndex = visible ? 0 : -1;
  }

  function evaluateDirty() {
    if (!form || !armed) {
      setSaveVisible(false);
      return;
    }
    setSaveVisible(serializeForm() !== baseline);
  }

  function establishBaseline() {
    if (!form) return;
    baseline = serializeForm();
    armed = true;
    setSaveVisible(false);
  }

  function resetAfterSave() {
    if (!form) return;
    armed = false;
    setSaveVisible(false);
    window.setTimeout(establishBaseline, 80);
  }

  /* ----------------------------------------------------------------------
   * Türkiye R2 — İş Bankası + provider-neutral payment/fiscal architecture
   * ------------------------------------------------------------------- */

  function pmdAdminBase() {
    var path = String(window.location.pathname || '');
    var marker = path.indexOf('/pmdfinance');
    if (marker < 0) marker = path.indexOf('/pmddevices');
    if (marker < 0) marker = path.indexOf('/pmdsettings');
    if (marker >= 0) return path.slice(0, marker) || '/admin';
    var parts = path.split('/').filter(Boolean);
    return parts.length ? '/' + parts[0] : '/admin';
  }

  function pmdCsrf() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? String(meta.getAttribute('content') || '') : '';
  }

  function pmdEscape(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function pmdFetchJson(url, options) {
    options = options || {};
    options.headers = Object.assign({
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRF-TOKEN': pmdCsrf()
    }, options.headers || {});
    return window.fetch(url, options).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (json) {
        if (!response.ok || json.ok === false) {
          var message = json.message || ('HTTP ' + response.status);
          var error = new Error(message);
          error.payload = json;
          throw error;
        }
        return json;
      });
    });
  }

  function pmdTrCfg(data, code, key, fallback) {
    var integrations = data && data.integrations ? data.integrations : {};
    var config = integrations[code] && integrations[code].config ? integrations[code].config : {};
    return config[key] == null ? (fallback == null ? '' : fallback) : config[key];
  }

  function pmdTrStatus(data, code) {
    var integrations = data && data.integrations ? data.integrations : {};
    var state = integrations[code] && integrations[code].state ? integrations[code].state : {};
    if (state.production_ready) return 'Live';
    return String(state.status || 'Not configured').replace(/_/g, ' ');
  }

  function pmdField(label, name, value, extra) {
    extra = extra || '';
    return '<div class="pmd-owner-field"><label>' + pmdEscape(label) + '</label>'
      + '<input type="text" data-pmd-tr-r2-field="' + pmdEscape(name) + '" value="' + pmdEscape(value) + '" ' + extra + '></div>';
  }

  function pmdSelect(label, name, value, options) {
    var html = '<div class="pmd-owner-field"><label>' + pmdEscape(label) + '</label><select data-pmd-tr-r2-field="' + pmdEscape(name) + '">';
    Object.keys(options).forEach(function (key) {
      html += '<option value="' + pmdEscape(key) + '"' + (String(value) === String(key) ? ' selected' : '') + '>' + pmdEscape(options[key]) + '</option>';
    });
    return html + '</select></div>';
  }

  function pmdDisableLegacyTurkeyFields(container) {
    if (!container) return;
    container.style.display = 'none';
    Array.prototype.forEach.call(container.querySelectorAll('input,select,textarea,button'), function (field) {
      field.disabled = true;
    });
  }

  function pmdCollectFields(scope) {
    var out = {};
    Array.prototype.forEach.call(scope.querySelectorAll('[data-pmd-tr-r2-field]'), function (field) {
      var path = String(field.getAttribute('data-pmd-tr-r2-field') || '').split('.');
      if (path.length !== 2) return;
      if (!out[path[0]]) out[path[0]] = {};
      out[path[0]][path[1]] = String(field.value == null ? '' : field.value).trim();
    });
    return out;
  }

  function pmdSetText(node, text, ok) {
    if (!node) return;
    node.textContent = text;
    node.className = 'pmd-owner-status' + (ok ? ' is-active' : '');
  }

  function installTurkeyFinanceR2(data) {
    var host = document.getElementById('payment-providers');
    if (!host || !document.body.classList.contains('pmd-finance-market-tr')) return;
    if (document.getElementById('pmd-tr-r2-finance')) return;

    pmdDisableLegacyTurkeyFields(document.getElementById('turkey-payment-connections'));

    var cardBody = host.querySelector('.pmd-owner-card__body');
    if (!cardBody) return;
    var panel = document.createElement('div');
    panel.id = 'pmd-tr-r2-finance';
    panel.className = 'pmd-owner-grid';

    var isbank = pmdTrCfg.bind(null, data, 'isbank_api');
    var acq = pmdTrCfg.bind(null, data, 'acquirer');
    var fast = pmdTrCfg.bind(null, data, 'fast_request');
    var qr = pmdTrCfg.bind(null, data, 'tr_qr_fast');
    var ispay = pmdTrCfg.bind(null, data, 'ispay');

    panel.innerHTML = ''
      + '<div class="pmd-owner-panel" style="grid-column:1/-1">'
      + '<h3>Türkiye İş Bankası · API connection</h3>'
      + '<p class="pmd-provider-section-note"><strong>Important:</strong> the public Sandbox portal is for documentation. Real API calls are tested in UAT. PMD uses OAuth 2.0 + mTLS and stores only secret references.</p>'
      + '<div class="pmd-owner-form-grid">'
      + pmdSelect('Environment', 'isbank_api.environment', isbank('environment', 'uat'), {uat:'UAT / Test', production:'Production'})
      + pmdField('Client ID', 'isbank_api.client_id', isbank('client_id'))
      + pmdField('Client Secret Reference', 'isbank_api.client_secret_reference', isbank('client_secret_reference'), 'placeholder="env:PMD_TR_ISBANK_CLIENT_SECRET"')
      + pmdSelect('Auth mode', 'isbank_api.auth_mode', isbank('auth_mode', 'client_credentials'), {client_credentials:'App Security · client_credentials', s2s_password:'S2S Security · password'})
      + pmdField('API scope', 'isbank_api.scope', isbank('scope'), 'placeholder="Exact scope from subscribed API"')
      + pmdField('mTLS certificate file path', 'isbank_api.mtls_certificate_path', isbank('mtls_certificate_path'), 'placeholder="/secure/isbank/client-cert.pem"')
      + pmdField('mTLS private-key reference', 'isbank_api.mtls_private_key_reference', isbank('mtls_private_key_reference'), 'placeholder="env:PMD_TR_ISBANK_PRIVATE_KEY_PATH"')
      + pmdField('Private-key password reference · optional', 'isbank_api.mtls_private_key_password_reference', isbank('mtls_private_key_password_reference'), 'placeholder="env:PMD_TR_ISBANK_PRIVATE_KEY_PASSWORD"')
      + pmdField('S2S username · only for S2S', 'isbank_api.s2s_username', isbank('s2s_username'))
      + pmdField('S2S password reference · only for S2S', 'isbank_api.s2s_password_reference', isbank('s2s_password_reference'), 'placeholder="env:PMD_TR_ISBANK_S2S_PASSWORD"')
      + pmdField('Subscription status', 'isbank_api.subscription_status', isbank('subscription_status'), 'placeholder="pending / approved"')
      + '</div>'
      + '<div style="display:flex;gap:10px;align-items:center;margin-top:14px;flex-wrap:wrap">'
      + '<button type="button" class="pmd-owner-action" id="pmd-tr-r2-save">Save Türkiye payment setup</button>'
      + '<button type="button" class="pmd-owner-action" id="pmd-tr-r2-test-isbank">Test İş Bankası UAT connection</button>'
      + '<span id="pmd-tr-r2-isbank-status" class="pmd-owner-status">' + pmdEscape(pmdTrStatus(data, 'isbank_api')) + '</span>'
      + '</div></div>'

      + '<div class="pmd-owner-panel"><h3>Card · one method, three channels</h3>'
      + '<p class="pmd-provider-section-note">Tap/contactless and chip/insert are NOT separate payment methods. They are card entry modes. The restaurant may accept Card through online checkout, a physical POS/Yazarkasa POS, or an approved SoftPOS setup.</p>'
      + '<div class="pmd-owner-form-grid">'
      + pmdField('Provider', 'acquirer.provider', acq('provider', 'isbank'))
      + pmdField('Merchant ID', 'acquirer.merchant_id', acq('merchant_id'))
      + pmdSelect('Environment', 'acquirer.environment', acq('environment', 'uat'), {uat:'UAT / Test', production:'Production'})
      + pmdField('Contract status', 'acquirer.contract_status', acq('contract_status'))
      + pmdField('Virtual POS status', 'acquirer.virtual_pos_status', acq('virtual_pos_status'))
      + '</div><small>Provider connection: İş Bankası API · Card brands may include TROY, Visa, Mastercard, Amex, UnionPay and JCB according to the selected merchant product.</small></div>'

      + '<div class="pmd-owner-panel"><h3>FAST Ödeme İste</h3>'
      + '<p class="pmd-provider-section-note">Same-phone Request-to-Pay. PMD sends a request; the guest approves it inside their own FAST-connected bank app.</p>'
      + '<div class="pmd-owner-form-grid">'
      + pmdField('Provider', 'fast_request.provider', fast('provider', 'isbank'))
      + pmdField('Merchant ID', 'fast_request.merchant_id', fast('merchant_id'))
      + pmdSelect('Environment', 'fast_request.environment', fast('environment', 'uat'), {uat:'UAT / Test', production:'Production'})
      + pmdField('Activation status', 'fast_request.activation_status', fast('activation_status'))
      + '</div></div>'

      + '<div class="pmd-owner-panel"><h3>TR Karekod / FAST QR</h3>'
      + '<p class="pmd-provider-section-note">Payment-specific QR. It is best on a waiter/terminal/second screen so the guest can scan it in their banking app.</p>'
      + '<div class="pmd-owner-form-grid">'
      + pmdField('Provider', 'tr_qr_fast.provider', qr('provider', 'isbank'))
      + pmdField('Merchant ID', 'tr_qr_fast.merchant_id', qr('merchant_id'))
      + pmdSelect('Environment', 'tr_qr_fast.environment', qr('environment', 'uat'), {uat:'UAT / Test', production:'Production'})
      + pmdField('Activation status', 'tr_qr_fast.activation_status', qr('activation_status'))
      + '</div></div>'

      + '<div class="pmd-owner-panel"><h3>İş\'le Öde · optional</h3>'
      + '<p class="pmd-provider-section-note">Optional İş Bankası checkout for remittance / shopping-loan / overdraft-installment flows. Keep disabled unless the matching İşPay APIs are subscribed and approved.</p>'
      + '<div class="pmd-owner-form-grid">'
      + pmdField('Provider', 'ispay.provider', ispay('provider', 'isbank'))
      + pmdField('Merchant ID', 'ispay.merchant_id', ispay('merchant_id'))
      + pmdSelect('Environment', 'ispay.environment', ispay('environment', 'uat'), {uat:'UAT / Test', production:'Production'})
      + pmdField('Activation status', 'ispay.activation_status', ispay('activation_status'))
      + '</div></div>'

      + '<div class="pmd-owner-panel" style="grid-column:1/-1"><h3>Developer · UAT operation tester</h3>'
      + '<p class="pmd-provider-section-note">Copy an exact operation path from the API product you subscribed to in the İş Bankası UAT portal. PMD will not guess private/product-specific paths. This tester is blocked in Production.</p>'
      + '<div class="pmd-owner-form-grid">'
      + '<div class="pmd-owner-field"><label>HTTP method</label><select id="pmd-tr-r2-op-method"><option>GET</option><option>POST</option><option>PUT</option><option>PATCH</option><option>DELETE</option></select></div>'
      + '<div class="pmd-owner-field"><label>Operation path</label><input id="pmd-tr-r2-op-path" type="text" placeholder="/api/isbank/... exact UAT path"></div>'
      + '<div class="pmd-owner-field pmd-owner-field--full"><label>JSON payload</label><textarea id="pmd-tr-r2-op-payload" placeholder="{}">{}</textarea></div>'
      + '</div><div style="display:flex;gap:10px;align-items:center;margin-top:12px"><button type="button" class="pmd-owner-action" id="pmd-tr-r2-op-run">Run UAT operation</button><span id="pmd-tr-r2-op-status"></span></div>'
      + '<pre id="pmd-tr-r2-op-result" style="margin-top:12px;white-space:pre-wrap;max-height:320px;overflow:auto"></pre></div>';

    cardBody.insertBefore(panel, cardBody.firstChild || null);

    var saveButton = document.getElementById('pmd-tr-r2-save');
    var testButton = document.getElementById('pmd-tr-r2-test-isbank');
    var status = document.getElementById('pmd-tr-r2-isbank-status');
    var apiBase = pmdAdminBase() + '/_pmd/turkey';

    saveButton.addEventListener('click', function () {
      var integrations = pmdCollectFields(panel);
      ['acquirer','fast_request','tr_qr_fast','ispay'].forEach(function (code) {
        if (!integrations[code]) integrations[code] = {};
        integrations[code].provider_connection_code = 'isbank_api';
      });
      pmdSetText(status, 'Saving…', false);
      pmdFetchJson(apiBase + '/integrations-r2', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({integrations: integrations})
      }).then(function () {
        pmdSetText(status, 'Saved · activation still required', true);
      }).catch(function (error) {
        pmdSetText(status, error.message, false);
      });
    });

    testButton.addEventListener('click', function () {
      pmdSetText(status, 'Testing OAuth + mTLS…', false);
      pmdFetchJson(apiBase + '/isbank-test-r2', {method:'POST'}).then(function (json) {
        pmdSetText(status, 'UAT connection OK · ' + (json.result && json.result.auth_mode ? json.result.auth_mode : 'OAuth'), true);
      }).catch(function (error) {
        pmdSetText(status, 'Connection failed · ' + error.message, false);
      });
    });

    document.getElementById('pmd-tr-r2-op-run').addEventListener('click', function () {
      var opStatus = document.getElementById('pmd-tr-r2-op-status');
      var result = document.getElementById('pmd-tr-r2-op-result');
      var payload = {};
      try { payload = JSON.parse(document.getElementById('pmd-tr-r2-op-payload').value || '{}'); }
      catch (error) { opStatus.textContent = 'Invalid JSON'; return; }
      opStatus.textContent = 'Running…';
      result.textContent = '';
      pmdFetchJson(apiBase + '/isbank-operation-r2', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          method:document.getElementById('pmd-tr-r2-op-method').value,
          path:document.getElementById('pmd-tr-r2-op-path').value,
          payload:payload
        })
      }).then(function (json) {
        opStatus.textContent = 'OK';
        result.textContent = JSON.stringify(json.result || {}, null, 2);
      }).catch(function (error) {
        opStatus.textContent = error.message;
        result.textContent = error.payload ? JSON.stringify(error.payload, null, 2) : '';
      });
    });
  }

  function installTurkeyInvoiceR2(data) {
    var section = document.getElementById('turkey-edocument');
    if (!section || !document.body.classList.contains('pmd-finance-market-tr')) return;
    if (document.getElementById('pmd-tr-r2-invoice')) return;

    var titleP = section.querySelector('.pmd-owner-card__title p');
    if (titleP) titleP.textContent = 'Türkiye fiscal document routing: YN ÖKC receipt OR approved GMÖEBYS route; formal invoices route to e-Fatura/e-Arşiv through an authorized e-document provider.';

    var oldBody = section.querySelector('.pmd-owner-card__body');
    if (!oldBody) return;
    var oldGrid = oldBody.querySelector('.pmd-owner-grid');
    pmdDisableLegacyTurkeyFields(oldGrid);

    var edoc = pmdTrCfg.bind(null, data, 'e_document');
    var gmo = pmdTrCfg.bind(null, data, 'gmoebys');
    var panel = document.createElement('div');
    panel.id = 'pmd-tr-r2-invoice';
    panel.className = 'pmd-owner-grid';
    panel.innerHTML = ''
      + '<div class="pmd-owner-panel"><h3>Document logic · PMD decides automatically</h3>'
      + '<p class="pmd-provider-section-note"><strong>Normal sale + YN ÖKC route</strong> → YN ÖKC Fiş.<br><strong>Formal invoice + recipient registered in e-Fatura</strong> → e-Fatura.<br><strong>Formal invoice + recipient not registered in e-Fatura</strong> → e-Arşiv.<br><strong>Approved GMÖEBYS route</strong> → the approved provider owns the exact legal e-document output; PMD must not invent an ÖKC receipt.</p>'
      + '<p class="pmd-provider-section-note">Guest UI should ask only “Do you need an invoice?” and collect recipient/company details. The provider/GİB lookup decides e-Fatura vs e-Arşiv.</p></div>'
      + '<div class="pmd-owner-panel"><h3>e-Fatura / e-Arşiv provider</h3><div class="pmd-owner-form-grid">'
      + pmdField('Provider / Özel Entegratör', 'e_document.provider', edoc('provider', 'isnet_nettefatura'), 'placeholder="isnet_nettefatura / other authorized provider"')
      + pmdField('Restaurant tax / merchant identifier', 'e_document.merchant_identifier', edoc('merchant_identifier'))
      + pmdSelect('Environment', 'e_document.environment', edoc('environment', 'sandbox'), {sandbox:'Sandbox / Test', uat:'UAT', production:'Production'})
      + pmdField('Credential reference', 'e_document.credential_reference', edoc('credential_reference'), 'placeholder="env:PMD_TR_EDOCUMENT_SECRET"')
      + pmdField('Activation status', 'e_document.activation_status', edoc('activation_status'))
      + pmdField('Service / WSDL reference', 'e_document.service_reference', edoc('service_reference', 'https://nfhostservis.isnet.net.tr/ws/services/efatura?wsdl'))
      + '</div></div>'
      + '<div class="pmd-owner-panel"><h3>Fiscal mode A · YN ÖKC</h3>'
      + '<p class="pmd-provider-section-note">Physical fiscal-device route. Manufacturer/model is independent from the bank/payment provider.</p>'
      + '<a class="pmd-owner-action" href="' + pmdEscape(pmdAdminBase() + '/pmddevices#turkey-fiscal-device') + '">Open Devices & hardware</a></div>'
      + '<div class="pmd-owner-panel"><h3>Fiscal mode B · GMÖEBYS</h3><div class="pmd-owner-form-grid">'
      + pmdField('Approved provider', 'gmoebys.provider', gmo('provider'))
      + pmdField('Merchant identifier', 'gmoebys.merchant_identifier', gmo('merchant_identifier'))
      + pmdSelect('Environment', 'gmoebys.environment', gmo('environment', 'sandbox'), {sandbox:'Sandbox / Test', uat:'UAT', production:'Production'})
      + pmdField('Credential reference', 'gmoebys.credential_reference', gmo('credential_reference'))
      + pmdField('Activation status', 'gmoebys.activation_status', gmo('activation_status'))
      + pmdField('Approval reference', 'gmoebys.approval_reference', gmo('approval_reference'))
      + '</div><small>GMÖEBYS can replace a separate physical ÖKC only when the selected provider/merchant topology is actually approved for that regime.</small></div>'
      + '<div style="grid-column:1/-1;display:flex;align-items:center;gap:10px"><button type="button" class="pmd-owner-action" id="pmd-tr-r2-save-invoice">Save Türkiye fiscal / invoice setup</button><span id="pmd-tr-r2-invoice-status"></span></div>';
    oldBody.appendChild(panel);

    document.getElementById('pmd-tr-r2-save-invoice').addEventListener('click', function () {
      var status = document.getElementById('pmd-tr-r2-invoice-status');
      status.textContent = 'Saving…';
      pmdFetchJson(pmdAdminBase() + '/_pmd/turkey/integrations-r2', {
        method:'POST', headers:{'Content-Type':'application/json'},
        body:JSON.stringify({integrations:pmdCollectFields(panel)})
      }).then(function () { status.textContent = 'Saved'; })
        .catch(function (error) { status.textContent = error.message; });
    });
  }

  function installTurkeyTerminalR2(data) {
    var section = document.getElementById('turkey-fiscal-device');
    if (!section || document.getElementById('pmd-tr-r2-terminal')) return;

    var body = section.querySelector('.pmd-owner-card__body') || section;
    var panel = document.createElement('div');
    panel.id = 'pmd-tr-r2-terminal';
    panel.className = 'pmd-owner-panel';
    panel.style.marginTop = '16px';
    panel.innerHTML = ''
      + '<h3>Türkiye payment endpoint · provider-neutral</h3>'
      + '<p class="pmd-provider-section-note">The bank/provider and the physical hardware manufacturer are separate. A restaurant can use Beko/Token, Hugin, Worldline, VERA or another supported/certified device; SoftPOS is also modeled separately when the fiscal route legally allows it.</p>'
      + '<div class="pmd-owner-form-grid">'
      + '<div class="pmd-owner-field"><label>Payment provider</label><input id="pmd-tr-terminal-provider" value="isbank"></div>'
      + '<div class="pmd-owner-field"><label>Endpoint label</label><input id="pmd-tr-terminal-label" placeholder="Main counter / Waiter 1"></div>'
      + '<div class="pmd-owner-field"><label>Hardware manufacturer</label><input id="pmd-tr-terminal-manufacturer" placeholder="TOKEN / Hugin / Worldline / VERA / ..."></div>'
      + '<div class="pmd-owner-field"><label>Hardware model</label><input id="pmd-tr-terminal-model" placeholder="X30 TR / A910SF / ..."></div>'
      + '<div class="pmd-owner-field"><label>Acceptance channel</label><select id="pmd-tr-terminal-channel"><option value="physical_terminal">Physical terminal</option><option value="softpos">SoftPOS / Tap on Phone</option></select></div>'
      + '<div class="pmd-owner-field"><label>Fiscal mode</label><select id="pmd-tr-terminal-fiscal"><option value="yn_okc">YN ÖKC</option><option value="gmoebys">Approved GMÖEBYS</option></select></div>'
      + '<div class="pmd-owner-field"><label>Environment</label><select id="pmd-tr-terminal-env"><option value="uat">UAT / Test</option><option value="production">Production</option></select></div>'
      + '<div class="pmd-owner-field"><label>Provider terminal ID · if supplied</label><input id="pmd-tr-terminal-provider-id"></div>'
      + '<div class="pmd-owner-field"><label>Device serial · optional</label><input id="pmd-tr-terminal-serial"></div>'
      + '<div class="pmd-owner-field"><label>Fiscal device serial · YN ÖKC only</label><input id="pmd-tr-terminal-fiscal-serial"></div>'
      + '<div class="pmd-owner-field"><label>Provider product</label><input id="pmd-tr-terminal-product" placeholder="Yazarkasa POS / Payment Facilitator / SoftPOS"></div>'
      + '</div><div style="display:flex;gap:10px;align-items:center;margin-top:14px"><button type="button" class="pmd-owner-action" id="pmd-tr-terminal-save">Save endpoint</button><span id="pmd-tr-terminal-status"></span></div>'
      + '<div id="pmd-tr-terminal-list" class="pmd-owner-list" style="margin-top:14px"></div>';
    body.appendChild(panel);

    function renderTerminals(items) {
      var list = document.getElementById('pmd-tr-terminal-list');
      list.innerHTML = '';
      (items || []).forEach(function (item) {
        var row = document.createElement('div');
        row.className = 'pmd-owner-list-row';
        row.innerHTML = '<div><strong>' + pmdEscape(item.reader_label || item.reader_id) + '</strong><small>'
          + pmdEscape((item.hardware_manufacturer || 'No manufacturer') + ' · ' + (item.hardware_model || 'No model'))
          + '</small></div><div class="pmd-owner-meta">' + pmdEscape(item.acceptance_channel + ' · ' + item.fiscal_mode) + '</div>'
          + '<div class="pmd-owner-status">' + pmdEscape(item.terminal_status || 'configured') + '</div>';
        list.appendChild(row);
      });
      if (!items || !items.length) list.innerHTML = '<div class="pmd-owner-empty">No Türkiye payment endpoint configured yet.</div>';
    }
    renderTerminals(data.terminals || []);

    document.getElementById('pmd-tr-terminal-save').addEventListener('click', function () {
      var status = document.getElementById('pmd-tr-terminal-status');
      var terminal = {
        provider_code:document.getElementById('pmd-tr-terminal-provider').value,
        reader_label:document.getElementById('pmd-tr-terminal-label').value,
        hardware_manufacturer:document.getElementById('pmd-tr-terminal-manufacturer').value,
        hardware_model:document.getElementById('pmd-tr-terminal-model').value,
        acceptance_channel:document.getElementById('pmd-tr-terminal-channel').value,
        fiscal_mode:document.getElementById('pmd-tr-terminal-fiscal').value,
        environment:document.getElementById('pmd-tr-terminal-env').value,
        provider_terminal_id:document.getElementById('pmd-tr-terminal-provider-id').value,
        serial_number:document.getElementById('pmd-tr-terminal-serial').value,
        fiscal_device_serial:document.getElementById('pmd-tr-terminal-fiscal-serial').value,
        provider_product:document.getElementById('pmd-tr-terminal-product').value
      };
      status.textContent = 'Saving…';
      pmdFetchJson(pmdAdminBase() + '/_pmd/turkey/terminal-r2', {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({terminal:terminal})
      }).then(function () {
        status.textContent = 'Saved · not activated until provider/device verification';
        return pmdFetchJson(pmdAdminBase() + '/_pmd/turkey/integrations-r2');
      }).then(function (json) { renderTerminals(json.terminals || []); })
        .catch(function (error) { status.textContent = error.message; });
    });
  }

  function installTurkeyR2() {
    var isFinance = document.body.classList.contains('pmd-finance-market-tr');
    var isDevices = Boolean(document.getElementById('turkey-fiscal-device'));
    if (!isFinance && !isDevices) return;

    pmdFetchJson(pmdAdminBase() + '/_pmd/turkey/integrations-r2').then(function (data) {
      if (isFinance) {
        installTurkeyFinanceR2(data);
        installTurkeyInvoiceR2(data);
      }
      if (isDevices) installTurkeyTerminalR2(data);
    }).catch(function (error) {
      if (window.console) console.warn('[PMD] Türkiye R2 settings unavailable', error);
    });
  }

  installNotification();
  installTurkeyR2();

  if (form) {
    setSaveVisible(false);
    form.addEventListener('input', function (event) {
      if (!armed || event.isTrusted !== true) return;
      evaluateDirty();
    }, true);
    form.addEventListener('change', function (event) {
      if (!armed || event.isTrusted !== true) return;
      evaluateDirty();
    }, true);
    form.addEventListener('ajaxDone', resetAfterSave);
    form.addEventListener('ajaxSuccess', resetAfterSave);
    if (window.jQuery) window.jQuery(form).on('ajaxDone ajaxSuccess', resetAfterSave);
    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        window.setTimeout(establishBaseline, 80);
      });
    });
  }

  window.PMDOwnerSettingsV1 = {
    version: '4.1.0-turkey-isbank-r2',
    notificationMoved: Boolean(root.querySelector('#notif-root')),
    evaluateDirty: evaluateDirty,
    establishBaseline: establishBaseline,
    applyNotificationGeometry: function () {
      applyNotificationGeometry(document.getElementById('notif-root'));
    },
    dirtyTrackingArmed: function () { return armed; }
  };
})();
