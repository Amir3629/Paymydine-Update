(function () {
  'use strict';

  var section = document.getElementById('reservation-guarantee');
  if (!section) return;

  var providerSelect = section.querySelector(
    'select[name="finance[reservation_guarantee_provider]"]'
  );
  var methodRows = Array.prototype.slice.call(
    section.querySelectorAll('[data-pmd-guarantee-method-row]')
  );
  var message = section.querySelector('[data-pmd-guarantee-method-message]');

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

  function updateCardMethod() {
    var provider = selectedProviderState();

    methodRows.forEach(function (row) {
      if (row.getAttribute('data-pmd-fixed-provider') !== '0') return;

      var input = row.querySelector('.pmd-guarantee-method__input');
      var status = row.querySelector('[data-pmd-guarantee-method-status]');
      if (!input) return;

      row.setAttribute('data-pmd-guarantee-provider', provider.code);
      row.setAttribute('data-pmd-provider-ready', provider.ready ? '1' : '0');
      row.classList.toggle('is-ready', provider.ready);
      row.classList.toggle('is-unavailable', !provider.ready);
      input.disabled = !provider.ready;

      if (status) {
        status.classList.toggle('is-ready', provider.ready);
        status.textContent = provider.ready
          ? 'Ready'
          : ('Configure ' + (provider.label || 'provider') + ' first');
      }

      if (!provider.ready && input.checked) {
        input.checked = false;
        input.dispatchEvent(new Event('change', {bubbles: true}));
      }
    });
  }

  methodRows.forEach(function (row) {
    row.addEventListener('click', function (event) {
      var input = row.querySelector('.pmd-guarantee-method__input');
      if (!input || !input.disabled) {
        setMessage('');
        return;
      }

      event.preventDefault();
      var status = row.querySelector('[data-pmd-guarantee-method-status]');
      setMessage(
        status
          ? String(status.textContent || '').trim()
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

  updateCardMethod();

  window.PMDFinanceGuaranteeR209 = {
    refresh: updateCardMethod
  };
})();
