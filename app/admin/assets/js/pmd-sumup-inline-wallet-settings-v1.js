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

    var section = document.createElement('section');
    section.className = 'pmd-provider-modal-section';
    section.setAttribute('data-pmd-sumup-wallet-settings', '1');

    var head = document.createElement('div');
    head.className = 'pmd-provider-modal-section__head';
    var headCopy = document.createElement('div');
    var strong = document.createElement('strong');
    strong.textContent = 'Online Card & Wallets';
    var span = document.createElement('span');
    span.textContent = 'PayMyDine uses the embedded SumUp Payment Widget. Card details stay with SumUp; eligible Apple Pay and Google Pay options render in the same checkout card.';
    headCopy.appendChild(strong);
    headCopy.appendChild(span);
    head.appendChild(headCopy);
    section.appendChild(head);

    var fields = document.createElement('div');
    fields.className = 'pmd-provider-modal-fields';
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

    var note = document.createElement('p');
    note.className = 'pmd-provider-modal-security';
    note.textContent = 'Apple Pay: register every domain/subdomain that will show the Apple Pay option. Apple Pay and Google Pay domain onboarding is managed in SumUp Dashboard → Settings → For developers → Payment wallets. Wero is not part of the current SumUp online-method list and stays with its configured provider.';
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
      save.disabled = true;
      status.textContent = 'Saving…';
      try {
        await postJson('/admin/payment-providers/sumup/connection', {
          environment: latest.env,
          api_key: '',
          affiliate_key: '',
          merchant_code: merchantInput ? String(merchantInput.value || '').trim() : String((latest.snapshot || {}).merchant_code || ''),
          google_pay_merchant_id: merchantId ? String(merchantId.value || '').trim() : '',
          google_pay_merchant_name: merchantName ? String(merchantName.value || '').trim() : ''
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
