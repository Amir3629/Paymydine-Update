(function () {
  'use strict';

  var page = document.getElementById('pmd-devices-page');
  var modal = document.querySelector('[data-pmd-device-modal]');
  if (!page || !modal) return;

  var modalBody = modal.querySelector('[data-pmd-device-modal-body]');
  var modalTitle = modal.querySelector('[data-pmd-device-modal-title]');
  var statusNode = modal.querySelector('[data-pmd-device-status]');
  var saveButton = modal.querySelector('[data-pmd-device-save]');
  var deleteButton = modal.querySelector('[data-pmd-device-delete]');
  var lastTrigger = null;
  var inFlight = false;

  /* PMD_DEVICE_V6_MODAL_POLISH_V6_1
     Freeze the document at the exact current scroll position while the
     portaled modal is open. The modal body remains independently scrollable. */
  var lockedScrollY = 0;
  var pageScrollLocked = false;

  function lockPageScroll() {
    if (pageScrollLocked) return;
    lockedScrollY = window.pageYOffset || document.documentElement.scrollTop || 0;
    pageScrollLocked = true;
    document.documentElement.style.setProperty('--pmd-device-v6-scroll-y', lockedScrollY + 'px');
    document.documentElement.classList.add('pmd-device-v6-modal-open');
  }

  function unlockPageScroll() {
    var restoreY = lockedScrollY;
    document.documentElement.classList.remove('pmd-device-v6-modal-open');
    document.documentElement.style.removeProperty('--pmd-device-v6-scroll-y');
    lockedScrollY = 0;
    pageScrollLocked = false;
    window.scrollTo(0, restoreY);
  }

  if (modal.parentElement !== document.body) document.body.appendChild(modal);

  function setStatus(text, type) {
    if (!statusNode) return;
    statusNode.textContent = text || '';
    statusNode.classList.toggle('is-ok', type === 'ok');
    statusNode.classList.toggle('is-error', type === 'error');
  }

  /* PMD_CASH_DRAWER_SIMPLE_SETUP_R2
     The browser talks only to the loopback connector for discovery/status.
     Drawer actions still go through authenticated PayMyDine backend commands. */
  function drawerSetupForm(form) {
    return form && form.getAttribute('data-pmd-device-kind') === 'drawers'
      ? form.querySelector('[data-pmd-drawer-quick-setup]')
      : null;
  }

  function drawerLocalStatus(form, text, state) {
    var setup = drawerSetupForm(form);
    var node = setup && setup.querySelector('[data-pmd-local-status]');
    if (!node) return;
    node.textContent = text || '';
    node.setAttribute('data-state', state || 'unknown');
  }

  async function localConnectorGet(path, timeoutMs) {
    var controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    var timer = controller ? setTimeout(function () { controller.abort(); }, timeoutMs || 1800) : null;
    try {
      var response = await fetch('http://127.0.0.1:17877' + path + (path.indexOf('?') >= 0 ? '&' : '?') + '_=' + Date.now(), {
        method: 'GET',
        cache: 'no-store',
        mode: 'cors',
        signal: controller ? controller.signal : undefined,
        headers: {'Accept': 'application/json'}
      });
      var data = await response.json().catch(function () { return {}; });
      if (!response.ok || !data || data.ok === false) {
        throw new Error((data && data.message) || ('Connector HTTP ' + response.status));
      }
      return data;
    } finally {
      if (timer) clearTimeout(timer);
    }
  }

  function syncDrawerPrinterInputs(form) {
    var setup = drawerSetupForm(form);
    if (!setup) return;
    var select = setup.querySelector('[data-pmd-local-printer-select]');
    var nameInput = setup.querySelector('[data-pmd-local-printer-name]');
    var targetInput = setup.querySelector('[data-pmd-local-printer-target]');
    var value = select ? String(select.value || '').trim() : '';
    if (nameInput) nameInput.value = value;
    if (targetInput) targetInput.value = value;
  }

  async function checkDrawerConnector(form, quiet) {
    try {
      var health = await localConnectorGet('/health', 1600);
      if (health.paired) {
        drawerLocalStatus(form, 'Connected on this PC' + (health.display_name ? ' - ' + health.display_name : '') + '.', 'online');
      } else {
        drawerLocalStatus(form, 'Connector is running but not paired. Download the connector again.', 'warning');
      }
      return health;
    } catch (error) {
      drawerLocalStatus(form, 'Not connected on this PC. Download and run the PayMyDine connector once.', 'offline');
      if (!quiet) setStatus('Connector not detected on this PC.', 'error');
      return null;
    }
  }

  async function loadDrawerPrinters(form) {
    var setup = drawerSetupForm(form);
    var select = setup && setup.querySelector('[data-pmd-local-printer-select]');
    if (!select) return;
    setStatus('Finding printers...');
    var data;
    try {
      data = await localConnectorGet('/printers', 5000);
    } catch (error) {
      drawerLocalStatus(form, 'Connector is not available. Install it first, then try again.', 'offline');
      setStatus(error && error.message ? error.message : 'Could not read printers.', 'error');
      return;
    }

    var saved = String(setup.getAttribute('data-saved-printer') || '').trim();
    var printers = Array.isArray(data.printers) ? data.printers.filter(function (printer) {
      return printer && printer.name && !printer.offline;
    }) : [];
    select.replaceChildren();
    if (!printers.length) {
      var empty = document.createElement('option');
      empty.value = '';
      empty.textContent = 'No available Windows printers found';
      select.appendChild(empty);
      syncDrawerPrinterInputs(form);
      setStatus('No available printer was found.', 'error');
      return;
    }

    printers.forEach(function (printer) {
      var option = document.createElement('option');
      option.value = String(printer.name);
      option.textContent = String(printer.name) + (printer.default ? ' (Default)' : '') + (printer.port ? ' - ' + printer.port : '');
      select.appendChild(option);
    });

    var preferred = printers.find(function (printer) { return saved && String(printer.name) === saved; })
      || printers.find(function (printer) { return printer.default; })
      || printers[0];
    select.value = preferred ? String(preferred.name) : '';
    syncDrawerPrinterInputs(form);
    drawerLocalStatus(form, 'Connected. Printer list loaded from this PC.', 'online');
    setStatus('Printers found. Choose the receipt printer, then click Use this printer.', 'ok');
  }

  function initDrawerSimpleSetup(form) {
    var setup = drawerSetupForm(form);
    if (!setup) return;
    syncDrawerPrinterInputs(form);
    setTimeout(function () { checkDrawerConnector(form, true); }, 50);
  }

  function templateFor(key) {
    return document.querySelector('#pmd-device-modal-templates template[data-pmd-device-template="' + CSS.escape(key) + '"]');
  }

  function currentForm() {
    return modalBody ? modalBody.querySelector('[data-pmd-device-modal-form]') : null;
  }

  function setBusy(busy) {
    inFlight = Boolean(busy);
    [saveButton, deleteButton].forEach(function (button) {
      if (button) button.disabled = inFlight;
    });
    modal.querySelectorAll('[data-pmd-device-action]').forEach(function (button) {
      button.disabled = inFlight;
    });
  }

  function openModal(key, trigger) {
    var template = templateFor(key);
    if (!template || !modalBody) return false;

    lastTrigger = trigger || document.activeElement;
    modalBody.replaceChildren(template.content.cloneNode(true));
    var form = currentForm();
    var title = form && form.getAttribute('data-pmd-modal-title') || 'Device settings';
    var mode = form && form.getAttribute('data-pmd-device-mode') || 'view';

    if (modalTitle) modalTitle.textContent = title;
    if (saveButton) saveButton.hidden = mode === 'view';
    if (deleteButton) deleteButton.hidden = mode !== 'edit';
    setStatus('');
    setBusy(false);
    initDrawerSimpleSetup(form);

    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    lockPageScroll();

    requestAnimationFrame(function () {
      var focusTarget = modalBody.querySelector('input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])');
      if (focusTarget) focusTarget.focus({preventScroll: true});
      else modal.querySelector('[data-pmd-device-close]')?.focus({preventScroll: true});
    });
    return true;
  }

  function closeModal() {
    if (inFlight) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    unlockPageScroll();
    if (modalBody) modalBody.replaceChildren();
    setStatus('');
    if (lastTrigger && typeof lastTrigger.focus === 'function' && document.contains(lastTrigger)) {
      lastTrigger.focus({preventScroll: true});
    }
    lastTrigger = null;
  }

  function appendExtra(button, formData) {
    var raw = button && button.getAttribute('data-pmd-extra');
    if (!raw) return;
    raw.split('&').forEach(function (pair) {
      var pieces = pair.split('=');
      if (!pieces[0]) return;
      formData.append(decodeURIComponent(pieces[0]), decodeURIComponent(pieces.slice(1).join('=') || ''));
    });
  }

  function parseResponse(text) {
    if (!text) return {};
    try { return JSON.parse(text); }
    catch (error) { return {raw: text}; }
  }

  function resultNode() {
    return modalBody ? modalBody.querySelector('[data-pmd-device-result]') : null;
  }

  function showResult(data) {
    var node = resultNode();
    if (!node) return;
    node.hidden = false;
    try {
      node.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
    } catch (error) {
      node.textContent = String(data);
    }
  }

  function sectionId(kind) {
    return {
      terminals: 'payment-terminals',
      kds: 'kds',
      drawers: 'cash-drawers',
      biometric: 'biometric',
      integrations: 'device-configuration',
      pos: 'pos-devices'
    }[kind] || null;
  }

  async function refreshOverview(kind) {
    var response = await fetch(window.location.pathname, {
      method: 'GET',
      credentials: 'same-origin',
      headers: {'X-Requested-With': 'XMLHttpRequest', 'X-PMD-DEVICE-REFRESH': '1'},
      cache: 'no-store'
    });
    if (!response.ok) throw new Error('Saved, but the Devices list could not refresh (' + response.status + ')');

    var html = await response.text();
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var id = sectionId(kind);
    var nextSection = id ? doc.getElementById(id) : null;
    var currentSection = id ? document.getElementById(id) : null;
    if (nextSection && currentSection) currentSection.replaceWith(nextSection);

    var currentOverview = document.getElementById('hardware-overview');
    var nextOverview = doc.getElementById('hardware-overview');
    if (currentOverview && nextOverview) currentOverview.replaceWith(nextOverview);

    var currentTemplates = document.getElementById('pmd-device-modal-templates');
    var nextTemplates = doc.getElementById('pmd-device-modal-templates');
    if (currentTemplates && nextTemplates) currentTemplates.replaceWith(nextTemplates);
  }

  async function requestBackend(handler, button, closeAfter) {
    var form = currentForm();
    if (!form || inFlight) return;
    var deleting = handler === 'onDelete' || handler === 'onPmdDeviceNativeDeleteV4';
    var url = form.getAttribute('data-pmd-backend-url');
    if (!url) return;

    var confirmText = button && button.getAttribute('data-pmd-confirm');
    if (confirmText && !window.confirm(confirmText)) return;
    if (deleting && !confirmText && !window.confirm('Delete this device configuration?')) return;

    var formData = new FormData(form);
    appendExtra(button, formData);
    if (handler === 'onDelete') formData.append('_method', 'DELETE');

    setBusy(true);
    setStatus(handler === form.getAttribute('data-pmd-save-handler') ? 'Saving…' : (deleting ? 'Deleting…' : 'Working…'));

    try {
      var response = await fetch(url, {
        method: 'POST',
        credentials: 'same-origin',
        headers: {
          'X-IGNITER-REQUEST-HANDLER': handler,
          'X-Requested-With': 'XMLHttpRequest',
          'Accept': 'application/json'
        },
        body: formData
      });

      var text = await response.text();
      var data = parseResponse(text);
      var kind = form.getAttribute('data-pmd-device-kind') || '';
      var errorMessage = data.X_IGNITER_ERROR_MESSAGE || data.error || '';
      if (!response.ok || errorMessage) {
        throw new Error(errorMessage || ('Request failed (' + response.status + ')'));
      }

      // PMD_KDS_DEVICE_SAVE_VISIBILITY_V115: never report a false KDS save.
      if (kind === 'kds' && handler === form.getAttribute('data-pmd-save-handler')) {
        var stationId = Number(data && data.station_id || 0);
        if (!data || data.ok !== true || stationId < 1) {
          throw new Error('KDS station save was not confirmed by the server.');
        }
      }

      if (closeAfter) {
        setStatus(deleting ? 'Deleted' : 'Saved', 'ok');
        await refreshOverview(kind);
        setBusy(false);
        closeModal();
        return;
      }

      showResult(data.raw && Object.keys(data).length === 1 ? data.raw : data);
      if (kind === 'drawers' && handler === 'onApplyLocalPrinter') {
        drawerLocalStatus(form, 'Printer saved for this POS.', 'online');
        setStatus('Printer saved.', 'ok');
      } else if (kind === 'drawers' && handler === 'onTestPrintLocal') {
        setStatus('Test print sent.', 'ok');
      } else if (kind === 'drawers' && (handler === 'onTestConnection' || handler === 'onOpenDrawer')) {
        setStatus('Drawer test sent.', 'ok');
      } else {
        setStatus('Done', 'ok');
      }
    } catch (error) {
      var message = error && error.message ? error.message : 'Request failed';
      setStatus(message, 'error');
      showResult({error: message});
    } finally {
      setBusy(false);
    }
  }

  document.addEventListener('click', function (event) {
    var localCheck = event.target.closest('[data-pmd-local-check]');
    if (localCheck && modal.contains(localCheck)) {
      event.preventDefault();
      checkDrawerConnector(currentForm(), false);
      return;
    }

    var localPrinters = event.target.closest('[data-pmd-local-printers]');
    if (localPrinters && modal.contains(localPrinters)) {
      event.preventDefault();
      loadDrawerPrinters(currentForm());
      return;
    }

    var connectorDownload = event.target.closest('[data-pmd-connector-download]');
    if (connectorDownload && modal.contains(connectorDownload)) {
      drawerLocalStatus(currentForm(), 'Download started. Run the file on this PC, then click Check connection.', 'installing');
    }

    var opener = event.target.closest('[data-pmd-device-open]');
    if (opener) {
      event.preventDefault();
      openModal(opener.getAttribute('data-pmd-device-open'), opener);
      return;
    }

    if (event.target.closest('[data-pmd-device-close]')) {
      event.preventDefault();
      closeModal();
      return;
    }

    var action = event.target.closest('[data-pmd-device-action]');
    if (action && modal.contains(action)) {
      event.preventDefault();
      requestBackend(action.getAttribute('data-pmd-device-action'), action, false);
    }
  });

  modal.addEventListener('change', function (event) {
    if (event.target && event.target.matches('[data-pmd-local-printer-select]')) {
      syncDrawerPrinterInputs(currentForm());
    }
  });

  if (saveButton) {
    saveButton.addEventListener('click', function () {
      var form = currentForm();
      if (!form) return;
      if (typeof form.reportValidity === 'function' && !form.reportValidity()) return;
      requestBackend(form.getAttribute('data-pmd-save-handler') || 'onSave', saveButton, true);
    });
  }

  if (deleteButton) {
    deleteButton.addEventListener('click', function () {
      var form = currentForm();
      var handler = form && form.getAttribute('data-pmd-device-kind') === 'kds'
        ? 'onPmdDeviceNativeDeleteV4'
        : 'onDelete';
      requestBackend(handler, deleteButton, true);
    });
  }

  modal.addEventListener('submit', function (event) {
    var form = event.target.closest('[data-pmd-device-modal-form]');
    if (!form) return;
    event.preventDefault();
    if (typeof form.reportValidity === 'function' && !form.reportValidity()) return;
    requestBackend(form.getAttribute('data-pmd-save-handler') || 'onSave', saveButton, true);
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !modal.hidden) closeModal();
  });

  (function openFromRedirect() {
    var params = new URLSearchParams(window.location.search);
    var kind = params.get('pmd_device');
    var mode = params.get('pmd_mode');
    var id = params.get('pmd_id');
    if (!kind || !mode) return;
    var key = kind + ':' + mode + (id ? ':' + id : '');
    if (openModal(key, null)) {
      history.replaceState(null, '', window.location.pathname + window.location.hash);
    }
  })();

  window.PMDDeviceSettingsV6 = {
    ready: true,
    version: '6.1.0-r2',
    singlePage: true,
    childPagesRendered: false,
    inlineModal: true,
    modalPortal: modal.parentElement === document.body,
    modalAnimationMs: 180,
    backendAuthoritiesPreserved: true,
    ajaxSaveKeepsOverview: true,
    kdsPersistedIdConfirmation: true,
    noPolling: true,
    noMutationObserver: true,
    polishedFieldGeometry: '46px/12px',
    backgroundScrollLock: 'fixed-position-restore',
    backdropBlurPx: 8,
    backdropDimmed: true
  };

  console.info('[PMD Device Settings Inline V6] Ready', window.PMDDeviceSettingsV6);
})();
