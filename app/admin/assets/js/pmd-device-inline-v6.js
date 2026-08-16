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

  if (modal.parentElement !== document.body) document.body.appendChild(modal);

  function setStatus(text, type) {
    if (!statusNode) return;
    statusNode.textContent = text || '';
    statusNode.classList.toggle('is-ok', type === 'ok');
    statusNode.classList.toggle('is-error', type === 'error');
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

    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.documentElement.classList.add('pmd-device-v6-modal-open');

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
    document.documentElement.classList.remove('pmd-device-v6-modal-open');
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
    var url = form.getAttribute('data-pmd-backend-url');
    if (!url) return;

    var confirmText = button && button.getAttribute('data-pmd-confirm');
    if (confirmText && !window.confirm(confirmText)) return;
    if (handler === 'onDelete' && !confirmText && !window.confirm('Delete this device configuration?')) return;

    var formData = new FormData(form);
    appendExtra(button, formData);
    if (handler === 'onDelete') formData.append('_method', 'DELETE');

    setBusy(true);
    setStatus(handler === form.getAttribute('data-pmd-save-handler') ? 'Saving…' : (handler === 'onDelete' ? 'Deleting…' : 'Working…'));

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
      var errorMessage = data.X_IGNITER_ERROR_MESSAGE || data.error || '';
      if (!response.ok || errorMessage) {
        throw new Error(errorMessage || ('Request failed (' + response.status + ')'));
      }

      var kind = form.getAttribute('data-pmd-device-kind') || '';
      if (closeAfter) {
        setStatus(handler === 'onDelete' ? 'Deleted' : 'Saved', 'ok');
        await refreshOverview(kind);
        setBusy(false);
        closeModal();
        return;
      }

      showResult(data.raw && Object.keys(data).length === 1 ? data.raw : data);
      setStatus('Done', 'ok');
    } catch (error) {
      var message = error && error.message ? error.message : 'Request failed';
      setStatus(message, 'error');
      showResult({error: message});
    } finally {
      setBusy(false);
    }
  }

  document.addEventListener('click', function (event) {
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
      requestBackend('onDelete', deleteButton, true);
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
    version: '6.0.0',
    singlePage: true,
    childPagesRendered: false,
    inlineModal: true,
    modalPortal: modal.parentElement === document.body,
    modalAnimationMs: 180,
    backendAuthoritiesPreserved: true,
    ajaxSaveKeepsOverview: true,
    noPolling: true,
    noMutationObserver: true
  };

  console.info('[PMD Device Settings Inline V6] Ready', window.PMDDeviceSettingsV6);
})();
