(function () {
  'use strict';

  if (window.PMDSumupInlineWalletSettingsV1) return;

  function csrf() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    return meta ? meta.content : '';
  }

  function currentEnvironment() {
    var active = document.querySelector('[data-provider-sumup-env].is-active');
    return active && active.dataset.providerSumupEnv ? String(active.dataset.providerSumupEnv) : 'test';
  }

  function currentSnapshot() {
    var api = window.PMDPaymentProviderCatalogueV3 || window.PMDPaymentProviderCatalogueV2;
    var state = api && typeof api.getState === 'function' ? api.getState() : null;
    var sumup = state && state.sumup ? state.sumup : {};
    var env = currentEnvironment();
    var snapshot = sumup.environments && sumup.environments[env] ? sumup.environments[env] : {};
    return { env: env, snapshot: snapshot };
  }

  async function postJson(url, body) {
    var response = await fetch(url, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest',
        'X-CSRF-TOKEN': csrf()
      },
      body: JSON.stringify(body)
    });
    var payload = await response.json().catch(function () { return {}; });
    if (!response.ok || payload.success === false) {
      throw new Error(String(payload.message || payload.error || ('HTTP ' + response.status)));
    }
    return payload;
  }

  function fileToBase64(file) {
    return new Promise(function (resolve, reject) {
      var reader = new FileReader();
      reader.onload = function () {
        var result = String(reader.result || '');
        var comma = result.indexOf(',');
        if (comma < 0) return reject(new Error('Could not read the verification file.'));
        resolve(result.slice(comma + 1));
      };
      reader.onerror = function () { reject(new Error('Could not read the verification file.')); };
      reader.readAsDataURL(file);
    });
  }

  function reorderFinanceSections() {
    if (!/^\/admin\/pmdfinance\/?$/.test(location.pathname)) return;
    var methods = document.getElementById('payment-methods');
    var providers = document.getElementById('payment-providers');
    if (!methods || !providers || !methods.parentNode || methods.previousElementSibling === providers) return;
    methods.parentNode.insertBefore(providers, methods);
  }

  function field(label, key, value, placeholder, help) {
    var wrapper = document.createElement('label');
    wrapper.className = 'pmd-provider-modal-field';

    var title = document.createElement('span');
    title.textContent = label;
    wrapper.appendChild(title);

    var input = document.createElement('input');
    input.type = 'text';
    input.value = value || '';
    input.placeholder = placeholder || '';
    input.autocomplete = 'off';
    input.setAttribute('data-pmd-sumup-wallet-field', key);
    wrapper.appendChild(input);

    if (help) {
      var small = document.createElement('small');
      small.textContent = help;
      wrapper.appendChild(small);
    }
    return wrapper;
  }

  function enhanceSumupModal() {
    if (!/^\/admin\/pmdfinance\/?$/.test(location.pathname)) return;
    var body = document.querySelector('.pmd-provider-modal__body');
    if (!body || body.querySelector('[data-pmd-sumup-wallet-settings="1"]')) return;

    var state = currentSnapshot();
    var snapshot = state.snapshot || {};
    var wallets = snapshot.wallets || {};
    var google = wallets.google_pay || {};
    var swift = wallets.swift_checkout || {};

    var section = document.createElement('section');
    section.className = 'pmd-provider-modal-section';
    section.setAttribute('data-pmd-sumup-wallet-settings', '1');

    var head = document.createElement('div');
    head.className = 'pmd-provider-modal-section__head';
    var headCopy = document.createElement('div');
    var strong = document.createElement('strong');
    strong.textContent = 'Online Card & Wallets';
    var span = document.createElement('span');
    span.textContent = 'Card / Wallet uses the embedded SumUp Payment Widget. Standalone Apple Pay and Google Pay use SumUp Swift Checkout buttons inside the same PayMyDine checkout card, so wallet selection never falls back to card fields.';
    headCopy.appendChild(strong);
    headCopy.appendChild(span);
    head.appendChild(headCopy);
    section.appendChild(head);

    var fields = document.createElement('div');
    fields.className = 'pmd-provider-modal-fields';
    fields.appendChild(field(
      'SumUp Wallet Public Key',
      'sumup-wallet-public-key',
      swift.public_key || '',
      'sup_pk_…',
      'Required for Apple Pay and Google Pay Swift Checkout. Copy the public sup_pk_ key from SumUp → Settings → For Developers → Toolkit → API Keys. Never paste the secret sup_sk_ key here.'
    ));
    fields.appendChild(field(
      'Google Pay Merchant ID',
      'google-pay-merchant-id',
      google.merchant_id || '',
      'Google merchant ID',
      'Provided by Google after Google Pay web registration. This is not the SumUp Merchant Code.'
    ));
    fields.appendChild(field(
      'Google Pay Merchant Name',
      'google-pay-merchant-name',
      google.merchant_name || '',
      'Restaurant or trading name',
      'Shown to the guest inside the Google Pay flow.'
    ));
    section.appendChild(fields);

    var appleFields = document.createElement('div');
    appleFields.className = 'pmd-provider-modal-fields';

    var appleDomain = document.createElement('label');
    appleDomain.className = 'pmd-provider-modal-field';
    var appleDomainTitle = document.createElement('span');
    appleDomainTitle.textContent = 'Apple Pay Domain';
    var appleDomainInput = document.createElement('input');
    appleDomainInput.type = 'text';
    appleDomainInput.value = location.hostname;
    appleDomainInput.readOnly = true;
    var appleDomainHelp = document.createElement('small');
    appleDomainHelp.textContent = 'PayMyDine serves the verification file automatically on this tenant domain.';
    appleDomain.appendChild(appleDomainTitle);
    appleDomain.appendChild(appleDomainInput);
    appleDomain.appendChild(appleDomainHelp);
    appleFields.appendChild(appleDomain);

    var appleFile = document.createElement('label');
    appleFile.className = 'pmd-provider-modal-field';
    var appleFileTitle = document.createElement('span');
    appleFileTitle.textContent = 'Apple Pay Verification File';
    var appleFileInput = document.createElement('input');
    appleFileInput.type = 'file';
    appleFileInput.setAttribute('data-pmd-extensionless-file', 'allowed');
    appleFileInput.setAttribute('data-pmd-sumup-apple-domain-file', '1');
    var appleFileHelp = document.createElement('small');
    appleFileHelp.textContent = 'Choose the file exactly as downloaded from SumUp. It normally has no file extension. No VPS upload is needed.';
    appleFile.appendChild(appleFileTitle);
    appleFile.appendChild(appleFileInput);
    appleFile.appendChild(appleFileHelp);
    appleFields.appendChild(appleFile);
    section.appendChild(appleFields);

    var appleActions = document.createElement('div');
    appleActions.className = 'pmd-provider-modal__footer-left';
    var appleUpload = document.createElement('button');
    appleUpload.type = 'button';
    appleUpload.className = 'pmd-provider-secondary';
    appleUpload.textContent = 'Upload & verify Apple Pay file';
    appleUpload.setAttribute('data-pmd-sumup-apple-domain-upload', '1');
    var appleStatus = document.createElement('span');
    appleStatus.className = 'pmd-provider-muted';
    appleStatus.setAttribute('data-pmd-sumup-apple-domain-status', '1');
    appleActions.appendChild(appleUpload);
    appleActions.appendChild(appleStatus);
    section.appendChild(appleActions);

    // PMD_SUMUP_APPLE_HOSTING_STATUS_R4
    fetch('/.well-known/apple-developer-merchantid-domain-association?ts=' + Date.now(), {
      credentials: 'same-origin',
      cache: 'no-store'
    }).then(function (response) {
      if (response.ok) appleStatus.textContent = 'Verification file is hosted for ' + location.hostname + '.';
    }).catch(function () {});

    appleUpload.addEventListener('click', async function () {
      if (appleUpload.disabled) return;
      var file = appleFileInput.files && appleFileInput.files[0];
      if (!file) {
        appleStatus.textContent = 'Choose the verification file downloaded from SumUp first.';
        return;
      }
      if (file.size < 64 || file.size > 131072) {
        appleStatus.textContent = 'Verification file size looks invalid.';
        return;
      }
      appleUpload.disabled = true;
      appleStatus.textContent = 'Uploading…';
      try {
        var encoded = await fileToBase64(file);
        var latest = currentSnapshot();
        var saved = await postJson('/admin/payment-providers/sumup/apple-pay-domain-file', {
          environment: latest.env,
          association_file_base64: encoded
        });
        var verify = await fetch('/.well-known/apple-developer-merchantid-domain-association?ts=' + Date.now(), {
          credentials: 'same-origin',
          cache: 'no-store'
        });
        if (!verify.ok) throw new Error('File saved, but public verification URL returned HTTP ' + verify.status + '.');
        appleStatus.textContent = 'Hosted for ' + String(saved.domain || location.hostname) + '. Next: add this exact domain in SumUp → Payment wallets and continue verification.';
      } catch (error) {
        appleStatus.textContent = error && error.message ? error.message : 'Could not host the Apple Pay verification file.';
      } finally {
        appleUpload.disabled = false;
      }
    });

    var note = document.createElement('p');
    note.className = 'pmd-provider-modal-security';
    note.textContent = 'Apple Pay: download the verification file from SumUp once, upload it here, then register this exact tenant domain in SumUp. PayMyDine hosts the public .well-known URL automatically. Google Pay production still requires Google web approval and a Google Merchant ID. Wero is not a SumUp online method.';
    section.appendChild(note);

    var actions = document.createElement('div');
    actions.className = 'pmd-provider-modal__footer-left';
    var save = document.createElement('button');
    save.type = 'button';
    save.className = 'pmd-provider-secondary';
    save.textContent = 'Save wallet settings';
    save.setAttribute('data-pmd-sumup-wallet-save', '1');
    var status = document.createElement('span');
    status.className = 'pmd-provider-muted';
    status.setAttribute('data-pmd-sumup-wallet-status', '1');
    actions.appendChild(save);
    actions.appendChild(status);
    section.appendChild(actions);

    var terminals = Array.prototype.find.call(body.querySelectorAll('.pmd-provider-modal-section'), function (node) {
      return /Terminals/i.test(node.textContent || '');
    });
    if (terminals) body.insertBefore(section, terminals);
    else body.appendChild(section);

    save.addEventListener('click', async function () {
      if (save.disabled) return;
      var latest = currentSnapshot();
      var root = section.closest('.pmd-provider-modal');
      var merchantInput = root ? root.querySelector('[data-provider-sumup-field="merchant-code"]') : null;
      var merchantId = section.querySelector('[data-pmd-sumup-wallet-field="google-pay-merchant-id"]');
      var merchantName = section.querySelector('[data-pmd-sumup-wallet-field="google-pay-merchant-name"]');
      var walletPublicKey = section.querySelector('[data-pmd-sumup-wallet-field="sumup-wallet-public-key"]');
      save.disabled = true;
      status.textContent = 'Saving…';
      try {
        await postJson('/admin/payment-providers/sumup/connection', {
          environment: latest.env,
          api_key: '',
          affiliate_key: '',
          merchant_code: merchantInput ? String(merchantInput.value || '').trim() : String((latest.snapshot || {}).merchant_code || ''),
          google_pay_merchant_id: merchantId ? String(merchantId.value || '').trim() : '',
          google_pay_merchant_name: merchantName ? String(merchantName.value || '').trim() : '',
          sumup_wallet_public_key: walletPublicKey ? String(walletPublicKey.value || '').trim() : ''
        });
        status.textContent = 'Saved';
        var catalogue = window.PMDPaymentProviderCatalogueV3 || window.PMDPaymentProviderCatalogueV2;
        if (catalogue && typeof catalogue.reload === 'function') await catalogue.reload();
      } catch (error) {
        status.textContent = error && error.message ? error.message : 'Could not save wallet settings.';
      } finally {
        save.disabled = false;
      }
    });
  }

  function refresh() {
    reorderFinanceSections();
    enhanceSumupModal();
  }

  var observer = new MutationObserver(function () { window.requestAnimationFrame(refresh); });

  function mount() {
    if (!/^\/admin\/pmdfinance\/?$/.test(location.pathname)) return;
    refresh();
    observer.observe(document.body, { childList: true, subtree: true });
  }

  window.PMDSumupInlineWalletSettingsV1 = { mount: mount, refresh: refresh };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, { once: true });
  else mount();
}());
