(function () {
  'use strict';

  function adminBase() {
    var path = String(window.location.pathname || '');
    ['pmdfinance', 'pmddevices', 'pmdsettings'].some(function (part) {
      var marker = path.indexOf('/' + part);
      if (marker >= 0) {
        path = path.slice(0, marker) || '/admin';
        return true;
      }
      return false;
    });
    return path || '/admin';
  }

  function csrf() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? String(meta.getAttribute('content') || '') : '';
  }

  function esc(value) {
    return String(value == null ? '' : value)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
  }

  function request(url, options) {
    options = options || {};
    options.headers = Object.assign({
      'Accept': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-CSRF-TOKEN': csrf()
    }, options.headers || {});
    return fetch(url, options).then(function (response) {
      return response.json().catch(function () { return {}; }).then(function (json) {
        if (!response.ok || json.ok === false) {
          var error = new Error(json.message || ('HTTP ' + response.status));
          error.payload = json;
          throw error;
        }
        return json;
      });
    });
  }

  function get(obj, path, fallback) {
    var value = obj;
    String(path || '').split('.').filter(Boolean).forEach(function (key) {
      if (value == null || typeof value !== 'object') { value = undefined; return; }
      value = value[key];
    });
    return value == null ? (fallback == null ? '' : fallback) : value;
  }

  function set(obj, path, value) {
    var keys = String(path || '').split('.').filter(Boolean);
    var cursor = obj;
    keys.forEach(function (key, index) {
      if (index === keys.length - 1) { cursor[key] = value; return; }
      if (!cursor[key] || typeof cursor[key] !== 'object') cursor[key] = {};
      cursor = cursor[key];
    });
  }

  function input(label, path, value, placeholder, readOnly) {
    return '<div class="pmd-owner-field"><label>' + esc(label) + '</label>'
      + '<input type="text" data-pmd-tr-r3-field="' + esc(path) + '" value="' + esc(value) + '"'
      + (placeholder ? ' placeholder="' + esc(placeholder) + '"' : '')
      + (readOnly ? ' readonly aria-readonly="true"' : '') + '></div>';
  }

  function select(label, path, value, options) {
    var html = '<div class="pmd-owner-field"><label>' + esc(label) + '</label><select data-pmd-tr-r3-field="' + esc(path) + '">';
    Object.keys(options).forEach(function (key) {
      html += '<option value="' + esc(key) + '"' + (String(value) === String(key) ? ' selected' : '') + '>' + esc(options[key]) + '</option>';
    });
    return html + '</select></div>';
  }

  function readonlyStatus(label, value, active) {
    return '<div class="pmd-owner-field"><label>' + esc(label) + '</label><div class="pmd-owner-status' + (active ? ' is-active' : '') + '">' + esc(value || 'Not configured') + '</div></div>';
  }

  function collect(scope) {
    var out = {};
    Array.prototype.forEach.call(scope.querySelectorAll('[data-pmd-tr-r3-field]'), function (field) {
      set(out, field.getAttribute('data-pmd-tr-r3-field'), String(field.value == null ? '' : field.value).trim());
    });
    return out;
  }

  function integration(data, code) {
    return get(data, 'integrations.' + code, {});
  }

  function cfg(data, code) {
    return get(data, 'integrations.' + code + '.config', {});
  }

  function status(data, code) {
    var state = get(data, 'integrations.' + code + '.state', {});
    if (state.production_ready) return 'Live / production ready';
    return String(state.status || 'Not configured').replace(/_/g, ' ');
  }

  function removeLegacy() {
    ['pmd-tr-r2-finance', 'pmd-tr-r2-invoice', 'pmd-tr-r2-terminal'].forEach(function (id) {
      var node = document.getElementById(id);
      if (node) node.remove();
    });
    var legacy = document.getElementById('turkey-payment-connections');
    if (legacy) legacy.remove();
  }

  function fixTurkeyVatCopy() {
    var finance = document.getElementById('pmd-finance-page');
    if (!finance || !document.body.classList.contains('pmd-finance-market-tr')) return;
    Array.prototype.forEach.call(finance.querySelectorAll('input[readonly]'), function (node) {
      if (String(node.value || '').toLowerCase().indexOf('added at checkout') >= 0) {
        node.value = 'Included in displayed menu prices for Türkiye';
      }
    });
    Array.prototype.forEach.call(finance.querySelectorAll('small'), function (node) {
      if (String(node.textContent || '').indexOf('Menu prices stay net') >= 0) {
        node.textContent = 'Türkiye consumer-facing menu prices are treated as VAT-inclusive. PMD keeps the VAT breakdown for fiscal/reporting purposes without adding surprise VAT at checkout.';
      }
    });
  }

  function productCard(title, key, data, description, pathsHtml) {
    var bank = cfg(data, 'isbank_api');
    var product = get(bank, 'products.' + key, {});
    var approval = String(product.approval_reference || '');
    var subStatus = String(product.subscription_status || 'pending');
    return '<div class="pmd-owner-panel"><h3>' + esc(title) + '</h3>'
      + '<p class="pmd-provider-section-note">' + esc(description) + '</p>'
      + '<div class="pmd-owner-form-grid">'
      + input('Scope from İş Bank UAT', 'isbank_api.products.' + key + '.scope', product.scope || '', 'Exact scope from approved API')
      + select('Security mode', 'isbank_api.products.' + key + '.auth_mode', product.auth_mode || 'client_credentials', {
          client_credentials: 'App Security · client_credentials',
          s2s_password: 'S2S Security · password'
        })
      + input('S2S username · only if bank says S2S', 'isbank_api.products.' + key + '.s2s_username', product.s2s_username || '')
      + input('S2S password reference · only if S2S', 'isbank_api.products.' + key + '.s2s_password_reference', product.s2s_password_reference || '', 'env:PMD_TR_ISBANK_..._S2S_PASSWORD')
      + input('UAT approval/reference', 'isbank_api.products.' + key + '.approval_reference', approval, 'Paste only after the bank sends approval/reference')
      + readonlyStatus('Subscription status', subStatus, subStatus === 'approved')
      + (pathsHtml || '')
      + '</div></div>';
  }

  function financePanel(data) {
    var host = document.querySelector('#payment-providers .pmd-owner-card__body');
    if (!host || !document.body.classList.contains('pmd-finance-market-tr')) return;
    if (document.getElementById('pmd-tr-r3-finance')) return;

    var bank = cfg(data, 'isbank_api');
    var sanal = cfg(data, 'isbank_sanal_pos');
    var panel = document.createElement('div');
    panel.id = 'pmd-tr-r3-finance';
    panel.className = 'pmd-owner-grid';

    var rtp = get(bank, 'products.request_to_pay', {});
    var pf = get(bank, 'products.payment_facilitator', {});
    var trqr = get(bank, 'products.tr_qr', {});

    panel.innerHTML = ''
      + '<div class="pmd-owner-panel" style="grid-column:1/-1"><h3>Türkiye İş Bankası · secure connection</h3>'
      + '<p class="pmd-provider-section-note">UAT and Production credentials are separate. The mTLS certificate/private key is transport security and can be shared only when İş Bankası explicitly allows it. Secrets stay on the VPS; PMD stores env:/config: references.</p>'
      + '<div class="pmd-owner-form-grid">'
      + select('Current environment', 'isbank_api.environment', bank.environment || 'uat', {uat:'UAT / Test', production:'Production'})
      + input('UAT Client ID', 'isbank_api.uat_client_id', bank.uat_client_id || bank.client_id || '')
      + input('UAT Client Secret reference', 'isbank_api.uat_client_secret_reference', bank.uat_client_secret_reference || bank.client_secret_reference || '', 'env:PMD_TR_ISBANK_UAT_CLIENT_SECRET')
      + input('Production Client ID', 'isbank_api.production_client_id', bank.production_client_id || '')
      + input('Production Client Secret reference', 'isbank_api.production_client_secret_reference', bank.production_client_secret_reference || '', 'env:PMD_TR_ISBANK_PROD_CLIENT_SECRET')
      + input('mTLS certificate file path', 'isbank_api.mtls_certificate_path', bank.mtls_certificate_path || '', '/secure/isbank/client-cert.pem')
      + input('mTLS private-key reference', 'isbank_api.mtls_private_key_reference', bank.mtls_private_key_reference || '', 'env:PMD_TR_ISBANK_PRIVATE_KEY_PATH')
      + input('Private-key password reference · optional', 'isbank_api.mtls_private_key_password_reference', bank.mtls_private_key_password_reference || '', 'env:PMD_TR_ISBANK_PRIVATE_KEY_PASSWORD')
      + readonlyStatus('PMD connection state', status(data, 'isbank_api'), Boolean(get(data, 'integrations.isbank_api.state.production_ready', false)))
      + '</div><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:14px">'
      + '<button type="button" class="pmd-owner-action" id="pmd-tr-r3-save-bank">Save secure bank setup</button>'
      + '<span id="pmd-tr-r3-bank-msg"></span></div></div>'

      + productCard('FAST Ödeme İste · Request To Pay Institutional', 'request_to_pay', data,
          'This is the API you subscribed to. PMD sends the request; the guest approves it in their own FAST-connected banking app.',
          input('Send HTTP method', 'isbank_api.products.request_to_pay.send_method', rtp.send_method || 'POST')
          + input('Send operation path', 'isbank_api.products.request_to_pay.send_path', rtp.send_path || '', '/api/isbank/... exact UAT path')
          + input('Status HTTP method', 'isbank_api.products.request_to_pay.status_method', rtp.status_method || 'GET')
          + input('Status operation path', 'isbank_api.products.request_to_pay.status_path', rtp.status_path || '', '/api/isbank/.../{request_id}'))

      + productCard('Payment Facilitator API', 'payment_facilitator', data,
          'Merchant/sub-merchant and physical/virtual POS terminal management. This is NOT the customer Card charge API.',
          input('Subdealer info method', 'isbank_api.products.payment_facilitator.operations.subdealer_info.method', get(pf, 'operations.subdealer_info.method', 'GET'))
          + input('Subdealer info path', 'isbank_api.products.payment_facilitator.operations.subdealer_info.path', get(pf, 'operations.subdealer_info.path', ''), '/api/isbank/...')
          + input('Terminal method', 'isbank_api.products.payment_facilitator.operations.terminal.method', get(pf, 'operations.terminal.method', 'POST'))
          + input('Terminal path', 'isbank_api.products.payment_facilitator.operations.terminal.path', get(pf, 'operations.terminal.path', ''), '/api/isbank/...')
          + input('Transaction query method', 'isbank_api.products.payment_facilitator.operations.transaction_query.method', get(pf, 'operations.transaction_query.method', 'GET'))
          + input('Transaction query path', 'isbank_api.products.payment_facilitator.operations.transaction_query.path', get(pf, 'operations.transaction_query.path', ''), '/api/isbank/...'))

      + productCard('TR Karekod / FAST QR · only after product approval', 'tr_qr', data,
          'Kept fail-closed. Do not enable until İş Bankası gives the matching product/scope and operation contract.',
          input('Create method', 'isbank_api.products.tr_qr.create_method', trqr.create_method || 'POST')
          + input('Create path', 'isbank_api.products.tr_qr.create_path', trqr.create_path || '', '/api/isbank/...')
          + input('Status method', 'isbank_api.products.tr_qr.status_method', trqr.status_method || 'GET')
          + input('Status path', 'isbank_api.products.tr_qr.status_path', trqr.status_path || '', '/api/isbank/.../{payment_id}'))

      + '<div class="pmd-owner-panel"><h3>İş Bankası Sanal POS · actual online Card acceptance</h3>'
      + '<p class="pmd-provider-section-note">Sanal POS is separate from Payment Facilitator. PMD stores the merchant setup now but does not invent the bank\'s 3DS/NestPay technical fields or endpoints. Add the bank technical pack/reference before runtime activation.</p>'
      + '<div class="pmd-owner-form-grid">'
      + select('Environment', 'isbank_sanal_pos.environment', sanal.environment || 'uat', {uat:'UAT / Test', production:'Production'})
      + input('Merchant ID', 'isbank_sanal_pos.merchant_id', sanal.merchant_id || '')
      + input('Store code', 'isbank_sanal_pos.store_code', sanal.store_code || '')
      + input('API username', 'isbank_sanal_pos.api_username', sanal.api_username || '')
      + input('API password reference', 'isbank_sanal_pos.api_password_reference', sanal.api_password_reference || '', 'env:PMD_TR_ISBANK_SANALPOS_PASSWORD')
      + input('3DS Store Key reference', 'isbank_sanal_pos.store_key_reference', sanal.store_key_reference || '', 'env:PMD_TR_ISBANK_SANALPOS_STORE_KEY')
      + input('Bank technical spec / contract reference', 'isbank_sanal_pos.technical_spec_reference', sanal.technical_spec_reference || '')
      + readonlyStatus('Activation state', status(data, 'isbank_sanal_pos'), Boolean(get(data, 'integrations.isbank_sanal_pos.state.production_ready', false)))
      + '</div></div>'

      + '<div class="pmd-owner-panel" style="grid-column:1/-1"><h3>UAT tools</h3>'
      + '<p class="pmd-provider-section-note">These tools are UAT-only and use the exact operation paths you copy from the approved UAT portal. They are blocked in Production.</p>'
      + '<div class="pmd-owner-form-grid">'
      + '<div class="pmd-owner-field"><label>Product</label><select id="pmd-tr-r3-test-product"><option value="request_to_pay">Request To Pay</option><option value="payment_facilitator">Payment Facilitator</option><option value="tr_qr">TR Karekod</option></select></div>'
      + '<div class="pmd-owner-field"><label>Request-to-Pay test action</label><select id="pmd-tr-r3-rtp-action"><option value="send">Send request</option><option value="status">Check status</option></select></div>'
      + '<div class="pmd-owner-field"><label>Request ID · for status</label><input id="pmd-tr-r3-request-id"></div>'
      + '<div class="pmd-owner-field pmd-owner-field--full"><label>JSON payload</label><textarea id="pmd-tr-r3-payload">{}</textarea></div>'
      + '</div><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:12px">'
      + '<button type="button" class="pmd-owner-action" id="pmd-tr-r3-test-oauth">Test OAuth + mTLS for selected product</button>'
      + '<button type="button" class="pmd-owner-action" id="pmd-tr-r3-run-rtp">Run Request-to-Pay UAT action</button>'
      + '<span id="pmd-tr-r3-uat-msg"></span></div><pre id="pmd-tr-r3-result" style="white-space:pre-wrap;max-height:320px;overflow:auto;margin-top:12px"></pre></div>';

    host.insertBefore(panel, host.firstChild || null);

    document.getElementById('pmd-tr-r3-save-bank').addEventListener('click', function () {
      var payload = collect(panel);
      var msg = document.getElementById('pmd-tr-r3-bank-msg');
      msg.textContent = 'Saving…';
      request(adminBase() + '/_pmd/turkey/integrations-r3', {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({integrations:payload})
      }).then(function () { msg.textContent = 'Saved · approval states remain fail-closed'; })
        .catch(function (error) { msg.textContent = error.message; });
    });

    document.getElementById('pmd-tr-r3-test-oauth').addEventListener('click', function () {
      var product = document.getElementById('pmd-tr-r3-test-product').value;
      var msg = document.getElementById('pmd-tr-r3-uat-msg');
      msg.textContent = 'Testing…';
      request(adminBase() + '/_pmd/turkey/isbank-test-product-r3', {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({product:product})
      }).then(function (json) { msg.textContent = 'OAuth/mTLS OK for ' + product; document.getElementById('pmd-tr-r3-result').textContent = JSON.stringify(json.result || {}, null, 2); })
        .catch(function (error) { msg.textContent = error.message; });
    });

    document.getElementById('pmd-tr-r3-run-rtp').addEventListener('click', function () {
      var msg = document.getElementById('pmd-tr-r3-uat-msg');
      var result = document.getElementById('pmd-tr-r3-result');
      var payload = {};
      try { payload = JSON.parse(document.getElementById('pmd-tr-r3-payload').value || '{}'); }
      catch (error) { msg.textContent = 'Invalid JSON'; return; }
      msg.textContent = 'Running…';
      request(adminBase() + '/_pmd/turkey/request-to-pay-r3', {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({
          action:document.getElementById('pmd-tr-r3-rtp-action').value,
          request_id:document.getElementById('pmd-tr-r3-request-id').value,
          payload:payload
        })
      }).then(function (json) { msg.textContent = 'OK'; result.textContent = JSON.stringify(json.result || {}, null, 2); })
        .catch(function (error) { msg.textContent = error.message; result.textContent = error.payload ? JSON.stringify(error.payload, null, 2) : ''; });
    });
  }

  function invoicePanel(data) {
    var section = document.getElementById('turkey-edocument');
    if (!section || !document.body.classList.contains('pmd-finance-market-tr')) return;
    if (document.getElementById('pmd-tr-r3-invoice')) return;

    var body = section.querySelector('.pmd-owner-card__body');
    if (!body) return;
    var oldGrid = body.querySelector('.pmd-owner-grid');
    if (oldGrid) oldGrid.style.display = 'none';

    var edoc = cfg(data, 'e_document');
    var gmo = cfg(data, 'gmoebys');
    var panel = document.createElement('div');
    panel.id = 'pmd-tr-r3-invoice';
    panel.className = 'pmd-owner-grid';
    panel.innerHTML = ''
      + '<div class="pmd-owner-panel"><h3>Invoice routing</h3><p class="pmd-provider-section-note">Normal YN ÖKC sale → Fiş. Formal invoice → PMD asks the authorized provider whether the recipient is registered for e-Fatura; registered → e-Fatura, otherwise → e-Arşiv. Customer never chooses the technical document type.</p></div>'
      + '<div class="pmd-owner-panel"><h3>e-Fatura / e-Arşiv provider</h3><div class="pmd-owner-form-grid">'
      + input('Provider / Özel Entegratör', 'e_document.provider', edoc.provider || 'isnet_nettefatura')
      + input('Restaurant tax / merchant identifier', 'e_document.merchant_identifier', edoc.merchant_identifier || '')
      + select('Environment', 'e_document.environment', edoc.environment || 'sandbox', {sandbox:'Sandbox / Test', uat:'UAT', production:'Production'})
      + input('WSDL / service reference', 'e_document.service_reference', edoc.service_reference || 'https://nfhostservis.isnet.net.tr/ws/services/efatura?wsdl')
      + input('Provider username', 'e_document.username', edoc.username || '')
      + input('Provider password reference', 'e_document.password_reference', edoc.password_reference || '', 'env:PMD_TR_EDOCUMENT_PASSWORD')
      + input('Recipient lookup operation', 'e_document.lookup_operation', edoc.lookup_operation || '')
      + input('Recipient tax-id field', 'e_document.lookup_tax_id_field', edoc.lookup_tax_id_field || 'taxIdentifier')
      + input('Registration result path', 'e_document.registration_result_path', edoc.registration_result_path || '', 'Example: Result.Registered')
      + input('Create invoice operation', 'e_document.create_operation', edoc.create_operation || '')
      + input('Invoice status operation', 'e_document.status_operation', edoc.status_operation || '')
      + readonlyStatus('Provider state', status(data, 'e_document'), Boolean(get(data, 'integrations.e_document.state.production_ready', false)))
      + '</div></div>'
      + '<div class="pmd-owner-panel"><h3>GMÖEBYS alternative fiscal route</h3><div class="pmd-owner-form-grid">'
      + input('Approved provider', 'gmoebys.provider', gmo.provider || '')
      + input('Merchant identifier', 'gmoebys.merchant_identifier', gmo.merchant_identifier || '')
      + select('Environment', 'gmoebys.environment', gmo.environment || 'sandbox', {sandbox:'Sandbox / Test', uat:'UAT', production:'Production'})
      + input('Credential reference', 'gmoebys.credential_reference', gmo.credential_reference || '', 'env:PMD_TR_GMOEBYS_SECRET')
      + input('Approval reference', 'gmoebys.approval_reference', gmo.approval_reference || '')
      + readonlyStatus('GMÖEBYS state', status(data, 'gmoebys'), Boolean(get(data, 'integrations.gmoebys.state.production_ready', false)))
      + '</div></div>'
      + '<div style="grid-column:1/-1;display:flex;gap:10px;align-items:center"><button type="button" class="pmd-owner-action" id="pmd-tr-r3-save-invoice">Save Türkiye invoice/fiscal setup</button><span id="pmd-tr-r3-invoice-msg"></span></div>';
    body.appendChild(panel);

    document.getElementById('pmd-tr-r3-save-invoice').addEventListener('click', function () {
      var msg = document.getElementById('pmd-tr-r3-invoice-msg');
      msg.textContent = 'Saving…';
      request(adminBase() + '/_pmd/turkey/integrations-r3', {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({integrations:collect(panel)})
      }).then(function () { msg.textContent = 'Saved'; }).catch(function (error) { msg.textContent = error.message; });
    });
  }

  function devicesPanel(data) {
    var section = document.getElementById('turkey-fiscal-device');
    if (!section) return;
    if (document.getElementById('pmd-tr-r3-devices')) return;

    var yn = cfg(data, 'yn_okc');
    var body = section.querySelector('.pmd-owner-card__body') || section;
    var panel = document.createElement('div');
    panel.id = 'pmd-tr-r3-devices';
    panel.className = 'pmd-owner-panel';
    panel.style.marginTop = '16px';
    panel.innerHTML = '<h3>YN ÖKC vendor adapter / local bridge</h3>'
      + '<p class="pmd-provider-section-note">PMD stays device-agnostic. The selected certified vendor/device GMP-3 SDK is wrapped by a local adapter. Saving this form does not certify hardware.</p>'
      + '<div class="pmd-owner-form-grid">'
      + input('Vendor driver / adapter name', 'yn_okc.vendor_driver', yn.vendor_driver || '')
      + input('Local adapter URL', 'yn_okc.local_agent_url', yn.local_agent_url || '', 'https://127.0.0.1:PORT')
      + input('Adapter credential reference', 'yn_okc.credential_reference', yn.credential_reference || '', 'env:PMD_TR_YN_OKC_AGENT_TOKEN')
      + readonlyStatus('YN ÖKC state', status(data, 'yn_okc'), Boolean(get(data, 'integrations.yn_okc.state.production_ready', false)))
      + '</div><div style="display:flex;gap:10px;align-items:center;margin-top:12px"><button type="button" class="pmd-owner-action" id="pmd-tr-r3-save-yn">Save adapter settings</button><span id="pmd-tr-r3-yn-msg"></span></div>';
    body.appendChild(panel);

    document.getElementById('pmd-tr-r3-save-yn').addEventListener('click', function () {
      var msg = document.getElementById('pmd-tr-r3-yn-msg');
      msg.textContent = 'Saving…';
      request(adminBase() + '/_pmd/turkey/integrations-r3', {
        method:'POST', headers:{'Content-Type':'application/json'}, body:JSON.stringify({integrations:collect(panel)})
      }).then(function () { msg.textContent = 'Saved · device approval still required'; }).catch(function (error) { msg.textContent = error.message; });
    });
  }

  function install() {
    var turkeyFinance = document.body.classList.contains('pmd-finance-market-tr');
    var turkeyDevices = document.body.classList.contains('pmd-devices-market-tr') || Boolean(document.getElementById('turkey-fiscal-device'));
    if (!turkeyFinance && !turkeyDevices) return;

    removeLegacy();
    fixTurkeyVatCopy();
    request(adminBase() + '/_pmd/turkey/integrations-r3').then(function (data) {
      removeLegacy();
      if (turkeyFinance) { financePanel(data); invoicePanel(data); fixTurkeyVatCopy(); }
      if (turkeyDevices) devicesPanel(data);
    }).catch(function (error) {
      if (window.console) console.warn('[PMD] Türkiye R3 settings failed', error);
    });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install);
  else install();
  window.setTimeout(install, 250);
  window.setTimeout(install, 900);
})();
