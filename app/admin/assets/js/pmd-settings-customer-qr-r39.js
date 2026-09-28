/* PMD_SETTINGS_CUSTOMER_QR_LIBRARY_R39
 * Settings-only bridge into the existing 10-design QR Template Studio.
 * Table QR identity remains owned by the canonical table backend.
 */
(function () {
  'use strict';

  if (window.PMDSettingsCustomerQrR39) return;

  var root = document.querySelector('[data-pmd-customer-qr-library-r39]');
  if (!root) return;

  var select = root.querySelector('[data-pmd-customer-qr-table-r39]');
  var openButton = root.querySelector('[data-pmd-customer-qr-studio-open-r39]');
  var status = root.querySelector('[data-pmd-customer-qr-status-r39]');
  var templateButtons = Array.prototype.slice.call(
    root.querySelectorAll('[data-pmd-customer-qr-template-r39]')
  );
  var selectedTemplateId = '';

  function csrfToken() {
    var meta = document.querySelector('meta[name="csrf-token"]');
    return meta && meta.content ? meta.content : '';
  }

  function setStatus(message, error) {
    if (!status) return;
    status.textContent = message || '';
    status.classList.toggle('is-error', Boolean(error));
  }

  function normalizeLogo(value) {
    value = String(value || '').trim();
    if (!value) return '';
    return value;
  }

  function selectedTableId() {
    return Number(select && select.value || 0) || 0;
  }

  function selectTemplate(button, announce) {
    if (!button) return;
    var id = String(
      button.getAttribute('data-pmd-customer-qr-template-r39') || ''
    ).trim();
    if (!id) return;

    selectedTemplateId = id;
    templateButtons.forEach(function (node) {
      var active = node === button;
      node.classList.toggle('is-selected', active);
      node.setAttribute('aria-pressed', active ? 'true' : 'false');
    });

    if (announce) {
      var name = String(
        button.getAttribute('data-pmd-customer-qr-template-name-r42') || id
      ).trim();
      setStatus(name + ' selected.', false);
    }
  }

  function initializeTemplateSelection() {
    var initial = templateButtons.find(function (button) {
      return button.getAttribute('aria-pressed') === 'true'
        || button.classList.contains('is-selected');
    }) || templateButtons[0] || null;

    if (initial) selectTemplate(initial, false);
  }

  function selectedTableIsActive() {
    if (!select || !select.options || select.selectedIndex < 0) return true;
    var option = select.options[select.selectedIndex];
    return !option || option.getAttribute('data-active') !== '0';
  }

  function chooseFirstActiveTable() {
    if (!select || !select.options || !select.options.length) return;
    var found = Array.prototype.find.call(select.options, function (option) {
      return option.value && option.getAttribute('data-active') !== '0';
    });
    if (found) select.value = found.value;
  }

  function fetchDesignData(tableId) {
    var headers = {
      'Accept': 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-IGNITER-REQUEST-HANDLER': 'onPmdCustomerQrDesignData'
    };
    var token = csrfToken();
    if (token) headers['X-CSRF-TOKEN'] = token;

    return fetch(window.location.href, {
      method: 'POST',
      credentials: 'same-origin',
      cache: 'no-store',
      headers: headers,
      body: JSON.stringify({table_id: tableId})
    }).then(function (response) {
      return response.text().then(function (body) {
        var payload = {};
        try {
          payload = body ? JSON.parse(body) : {};
        } catch (error) {
          payload = {message: body || 'QR design data could not be loaded.'};
        }

        if (!response.ok || payload.ok === false) {
          throw new Error(payload.message || 'QR design data could not be loaded.');
        }

        return payload;
      });
    });
  }

  function openStudio(payload, preferredTemplateId) {
    if (
      !window.PMDQrTemplateStudioV1 ||
      typeof window.PMDQrTemplateStudioV1.boot !== 'function'
    ) {
      throw new Error('QR Design Studio is not available.');
    }

    var adapter = document.createElement('div');
    adapter.hidden = true;
    adapter.setAttribute('data-pmd-qr-template-studio-v1', '1');
    adapter.setAttribute('data-pmd-qr-src', String(payload.data_url || ''));
    adapter.setAttribute('data-pmd-restaurant-name', String(payload.restaurant_name || 'Restaurant'));
    adapter.setAttribute('data-pmd-restaurant-logo', normalizeLogo(payload.restaurant_logo));
    adapter.setAttribute('data-pmd-table-name', String(payload.table_name || 'Table'));
    if (preferredTemplateId) {
      adapter.setAttribute(
        'data-pmd-qr-template-preselect',
        String(preferredTemplateId)
      );
    }

    var trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.setAttribute('data-pmd-qr-template-open-v1', '1');
    adapter.appendChild(trigger);
    document.body.appendChild(adapter);

    window.PMDQrTemplateStudioV1.boot();
    trigger.click();

    window.setTimeout(function () {
      if (adapter.parentNode) adapter.parentNode.removeChild(adapter);
    }, 0);
  }

  function onOpen() {
    var tableId = selectedTableId();
    if (!tableId || !openButton || openButton.disabled) {
      setStatus('Choose a table first.', true);
      return;
    }

    var original = openButton.innerHTML;
    openButton.disabled = true;
    openButton.classList.add('is-loading');
    setStatus('Preparing QR designs…', false);

    fetchDesignData(tableId)
      .then(function (payload) {
        openStudio(payload, selectedTemplateId);

        if (payload.active === false || !selectedTableIsActive()) {
          setStatus('This table is disabled. Its QR stays inactive until the table is enabled.', false);
        } else {
          var selectedButton = templateButtons.find(function (button) {
            return String(
              button.getAttribute('data-pmd-customer-qr-template-r39') || ''
            ) === selectedTemplateId;
          });
          var selectedName = selectedButton
            ? String(selectedButton.getAttribute('data-pmd-customer-qr-template-name-r42') || '').trim()
            : '';
          setStatus(
            selectedName
              ? selectedName + ' ready to preview or download.'
              : '10 QR designs ready.',
            false
          );
        }
      })
      .catch(function (error) {
        setStatus(error && error.message ? error.message : String(error), true);
      })
      .then(function () {
        openButton.disabled = false;
        openButton.classList.remove('is-loading');
        openButton.innerHTML = original;
      });
  }

  initializeTemplateSelection();

  templateButtons.forEach(function (button) {
    button.addEventListener('click', function () {
      selectTemplate(button, true);
    });
  });

  if (select) {
    chooseFirstActiveTable();

    /* Table choice is a preview tool, not a persisted frontend setting. */
    select.addEventListener('change', function (event) {
      event.stopPropagation();
      setStatus(
        selectedTableIsActive()
          ? ''
          : 'This table is disabled. Its QR stays inactive until the table is enabled.',
        false
      );
    });
  }

  if (openButton) {
    openButton.addEventListener('click', onOpen);
  }

  window.PMDSettingsCustomerQrR39 = {
    version: '1.1.0-r42',
    open: onOpen
  };
})();
