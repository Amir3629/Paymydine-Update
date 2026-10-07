(function () {
  'use strict';

  var section = document.getElementById('reservation-guarantee');
  if (!section) return;

  var form = section.closest('form');
  var providerSelect = section.querySelector('[data-pmd-guarantee-provider-select]');
  var rows = Array.prototype.slice.call(
    section.querySelectorAll('[data-pmd-guarantee-method-row]')
  );
  var message = section.querySelector('[data-pmd-guarantee-method-message]');
  var masterToggle = section.querySelector('[data-pmd-guarantee-master-toggle]');
  var masterStatus = section.querySelector('[data-pmd-guarantee-master-status]');

  function providerState() {
    if (!providerSelect || providerSelect.selectedIndex < 0) {
      return {code: '', label: 'Provider', ready: false};
    }

    var option = providerSelect.options[providerSelect.selectedIndex];
    return {
      code: String(option.value || '').trim().toLowerCase(),
      label: String(option.textContent || option.value || '')
        .split(' · ')[0]
        .trim(),
      ready: String(option.getAttribute('data-pmd-guarantee-ready') || '0') === '1'
    };
  }

  function setMessage(text) {
    if (message) message.textContent = String(text || '');
  }

  function syncCardRow() {
    var provider = providerState();

    rows.forEach(function (row) {
      if (row.getAttribute('data-pmd-fixed-provider') !== '0') return;

      var input = row.querySelector('.pmd-guarantee-r22-method__input');
      var status = row.querySelector('[data-pmd-guarantee-method-status]');
      if (!input) return;

      row.setAttribute('data-pmd-guarantee-provider', provider.code);
      row.setAttribute('data-pmd-provider-ready', provider.ready ? '1' : '0');
      row.classList.toggle('is-ready', provider.ready);
      row.classList.toggle('is-unavailable', !provider.ready);
      input.disabled = !provider.ready;

      if (!provider.ready && input.checked) {
        input.checked = false;
        input.dispatchEvent(new Event('change', {bubbles: true}));
      }

      if (status) {
        status.textContent = provider.ready
          ? ('Ready via ' + provider.label)
          : (provider.label + ' setup required');
      }
    });
  }

  function sanitizeUnavailable() {
    rows.forEach(function (row) {
      var input = row.querySelector('.pmd-guarantee-r22-method__input');
      if (!input) return;
      if (input.disabled || row.getAttribute('data-pmd-provider-ready') !== '1') {
        input.checked = false;
      }
    });
  }

  function syncMaster() {
    if (!masterToggle || !masterStatus) return;
    var enabled = Boolean(masterToggle.checked);
    masterStatus.textContent = enabled ? 'Enabled' : 'Disabled';
    masterStatus.classList.toggle('is-active', enabled);
  }

  rows.forEach(function (row) {
    row.addEventListener('click', function (event) {
      var input = row.querySelector('.pmd-guarantee-r22-method__input');
      if (!input || !input.disabled) {
        setMessage('');
        return;
      }

      event.preventDefault();
      var status = row.querySelector('[data-pmd-guarantee-method-status]');
      setMessage(status ? String(status.textContent || '').trim() : 'Provider setup required.');
    });
  });

  if (providerSelect) {
    providerSelect.addEventListener('change', function () {
      setMessage('');
      syncCardRow();
    });
  }

  if (masterToggle) masterToggle.addEventListener('change', syncMaster);

  if (form) {
    form.addEventListener('submit', sanitizeUnavailable, true);
    if (window.jQuery) {
      window.jQuery(form).on('ajaxBeforeSend', sanitizeUnavailable);
    }
  }

  syncCardRow();
  sanitizeUnavailable();
  syncMaster();

  window.PMDFinanceGuaranteeR22 = {
    refresh: syncCardRow,
    sanitize: sanitizeUnavailable
  };
})();
