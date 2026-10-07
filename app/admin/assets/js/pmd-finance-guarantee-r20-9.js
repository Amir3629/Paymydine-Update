(function () {
  'use strict';

  var section = document.getElementById('reservation-guarantee');
  if (!section) return;

  var form = section.closest('form');
  var providerSelect = section.querySelector('[data-pmd-guarantee-provider-select]')
    || section.querySelector('select[name="finance[reservation_guarantee_provider]"]');
  var methodRows = Array.prototype.slice.call(
    section.querySelectorAll('[data-pmd-guarantee-method-row]')
  );
  var message = section.querySelector('[data-pmd-guarantee-method-message]');
  var masterToggle = section.querySelector('[data-pmd-guarantee-master-toggle]');
  var masterStatus = section.querySelector('[data-pmd-guarantee-master-status]');

  function selectedProviderState() {
    if (!providerSelect || providerSelect.selectedIndex < 0) {
      return {code: '', label: '', ready: false};
    }

    var option = providerSelect.options[providerSelect.selectedIndex];
    var rawLabel = String(option.textContent || option.value || '').trim();
    var label = rawLabel.split(' · ')[0].trim();

    return {
      code: String(option.value || '').trim().toLowerCase(),
      label: label,
      ready: String(option.getAttribute('data-pmd-guarantee-ready') || '0') === '1'
    };
  }

  function setMessage(text) {
    if (!message) return;
    message.textContent = String(text || '');
  }

  function setRowReady(row, ready, label) {
    var input = row.querySelector('.pmd-guarantee-method__input');
    var copy = row.querySelector('.pmd-guarantee-method__copy small');
    if (!input) return;

    row.classList.toggle('is-ready', Boolean(ready));
    row.classList.toggle('is-unavailable', !ready);
    row.setAttribute('data-pmd-provider-ready', ready ? '1' : '0');
    row.setAttribute('aria-disabled', ready ? 'false' : 'true');
    input.disabled = !ready;

    if (!ready && input.checked) {
      input.checked = false;
      input.dispatchEvent(new Event('change', {bubbles: true}));
    }

    if (copy && label) copy.textContent = label;
  }

  function updateCardMethod() {
    var provider = selectedProviderState();

    methodRows.forEach(function (row) {
      if (row.getAttribute('data-pmd-fixed-provider') !== '0') return;

      row.setAttribute('data-pmd-guarantee-provider', provider.code);
      setRowReady(
        row,
        provider.ready,
        provider.ready
          ? ('Ready via ' + (provider.label || 'provider'))
          : ((provider.label || 'Provider') + ' not configured')
      );
    });
  }

  function sanitizeUnavailableMethods() {
    methodRows.forEach(function (row) {
      var input = row.querySelector('.pmd-guarantee-method__input');
      if (!input) return;
      if (input.disabled || row.getAttribute('data-pmd-provider-ready') !== '1') {
        input.checked = false;
      }
    });
  }

  function syncMasterStatus() {
    if (!masterToggle || !masterStatus) return;
    var enabled = Boolean(masterToggle.checked);
    masterStatus.textContent = enabled ? 'Enabled' : 'Disabled';
    masterStatus.classList.toggle('is-active', enabled);
  }

  methodRows.forEach(function (row) {
    var input = row.querySelector('.pmd-guarantee-method__input');

    if (input && input.disabled) input.checked = false;

    row.addEventListener('click', function (event) {
      if (!input || !input.disabled) {
        setMessage('');
        return;
      }

      event.preventDefault();
      var providerLabel = row.querySelector('.pmd-guarantee-method__copy small');
      setMessage(
        providerLabel
          ? String(providerLabel.textContent || '').trim()
          : 'Configure the required payment provider first.'
      );
    });
  });

  if (providerSelect) {
    providerSelect.addEventListener('change', function () {
      setMessage('');
      updateCardMethod();
    });
  }

  if (masterToggle) {
    masterToggle.addEventListener('change', syncMasterStatus);
  }

  if (form) {
    form.addEventListener('submit', sanitizeUnavailableMethods, true);
    form.addEventListener('ajaxBeforeSend', sanitizeUnavailableMethods, true);
    if (window.jQuery) {
      window.jQuery(form).on('ajaxBeforeSend', sanitizeUnavailableMethods);
    }
  }

  updateCardMethod();
  sanitizeUnavailableMethods();
  syncMasterStatus();

  window.PMDFinanceGuaranteeR21 = {
    refresh: updateCardMethod,
    sanitize: sanitizeUnavailableMethods
  };
  window.PMDFinanceGuaranteeR209 = window.PMDFinanceGuaranteeR21;
})();
