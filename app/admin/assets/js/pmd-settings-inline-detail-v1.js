(function () {
  'use strict';

  // PMD_SETTINGS_REPORTS_PLATFORM_I18N_V16
  function settingsText(value) {
    var runtime = window.PMDPlatformMessages;
    value = String(value == null ? '' : value);
    return runtime && typeof runtime.fromEnglish === 'function'
      ? runtime.fromEnglish(value, 'settings.', value)
      : value;
  }

  function boot() {
    var modal = document.querySelector('[data-pmd-inline-modal]');
    var templates = document.querySelector('[data-pmd-inline-templates]');
    if (!modal || !templates) return;

    var bodyNode = modal.querySelector('[data-pmd-inline-modal-body]');
    var titleNode = modal.querySelector('[data-pmd-inline-modal-title]');
    var statusNode = modal.querySelector('[data-pmd-inline-status]');
    var saveButton = modal.querySelector('[data-pmd-inline-save]');
    var lastTrigger = null;
    var inFlight = false;
    var lockedScrollY = 0;
    var bodyStyleBefore = null;

    if (modal.parentElement !== document.body) document.body.appendChild(modal);

    function setStatus(text, type) {
      if (!statusNode) return;
      statusNode.textContent = text || '';
      statusNode.classList.toggle('is-ok', type === 'ok');
      statusNode.classList.toggle('is-error', type === 'error');
    }

    function setBusy(busy) {
      inFlight = Boolean(busy);
      modal.querySelectorAll('button').forEach(function (button) {
        if (!button.hasAttribute('data-pmd-inline-close')) button.disabled = inFlight;
      });
    }

    function lockBackground() {
      if (document.documentElement.classList.contains('pmd-settings-inline-modal-open')) return;
      lockedScrollY = window.scrollY || window.pageYOffset || 0;
      bodyStyleBefore = {
        position: document.body.style.position,
        top: document.body.style.top,
        left: document.body.style.left,
        right: document.body.style.right,
        width: document.body.style.width,
        overflow: document.body.style.overflow
      };
      document.documentElement.classList.add('pmd-settings-inline-modal-open');
      document.body.style.position = 'fixed';
      document.body.style.top = (-lockedScrollY) + 'px';
      document.body.style.left = '0';
      document.body.style.right = '0';
      document.body.style.width = '100%';
      document.body.style.overflow = 'hidden';
    }

    function unlockBackground() {
      if (!document.documentElement.classList.contains('pmd-settings-inline-modal-open')) return;
      document.documentElement.classList.remove('pmd-settings-inline-modal-open');
      if (bodyStyleBefore) {
        document.body.style.position = bodyStyleBefore.position;
        document.body.style.top = bodyStyleBefore.top;
        document.body.style.left = bodyStyleBefore.left;
        document.body.style.right = bodyStyleBefore.right;
        document.body.style.width = bodyStyleBefore.width;
        document.body.style.overflow = bodyStyleBefore.overflow;
      } else {
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.left = '';
        document.body.style.right = '';
        document.body.style.width = '';
        document.body.style.overflow = '';
      }
      window.scrollTo(0, lockedScrollY);
      bodyStyleBefore = null;
    }

    function templateFor(key) {
      var catalog = document.querySelector('[data-pmd-inline-templates]');
      return catalog ? catalog.querySelector('template[data-pmd-inline-template="' + CSS.escape(key) + '"]') : null;
    }

    function currentForm() {
      return bodyNode ? bodyNode.querySelector('[data-pmd-inline-form]') : null;
    }

    function isWorldlineForm(form) {
      var code = form ? form.querySelector('input[name="Payment[code]"]') : null;
      return Boolean(code && String(code.value || '').toLowerCase() === 'worldline');
    }

    function adminRuntimeEndpoint(suffix) {
      var firstSegment = window.location.pathname.split('/').filter(Boolean)[0] || 'admin';
      return window.location.origin + '/' + firstSegment + '/_pmd/' + suffix;
    }

    function worldlineTerminalEndpoint() {
      return adminRuntimeEndpoint('worldline-terminal-config');
    }

    function worldlineConnectTestEndpoint() {
      return adminRuntimeEndpoint('worldline-connect-test');
    }

    function injectWorldlineTerminalFields(form) {
      if (!isWorldlineForm(form) || form.querySelector('[data-pmd-worldline-terminal-settings]')) return;
      var grid = form.querySelector('.pmd-inline-grid');
      if (!grid) return;

      var wrapper = document.createElement('div');
      wrapper.setAttribute('data-pmd-worldline-terminal-settings', '1');
      wrapper.className = 'pmd-inline-section';
      wrapper.style.marginTop = '18px';
      wrapper.innerHTML = '' +
        '<div class="pmd-inline-section__head">' +
          '<h3>Worldline Terminal API</h3>' +
          '<p>Card-present Terminal API uses a separate Worldline Bearer key. It never reuses the Connect Secret API Key.</p>' +
        '</div>' +
        '<div class="pmd-inline-grid">' +
          '<div class="pmd-inline-field">' +
            '<label>Terminal API Merchant ID</label>' +
            '<input type="text" data-pmd-worldline-terminal-merchant maxlength="255" autocomplete="off">' +
            '<small>Usually the UMID supplied for Terminal API. Leave blank to use the Connect Merchant ID.</small>' +
          '</div>' +
          '<div class="pmd-inline-field">' +
            '<label>Terminal API Base URL</label>' +
            '<input type="url" data-pmd-worldline-terminal-base maxlength="500" autocomplete="off">' +
            '<small>Integration defaults to Worldline IACC. For Live, enter the production URL supplied by Worldline.</small>' +
          '</div>' +
          '<div class="pmd-inline-field pmd-inline-field--full">' +
            '<label>Terminal API Bearer Key</label>' +
            '<input type="password" data-pmd-worldline-terminal-token maxlength="4096" autocomplete="new-password" placeholder="Loading…">' +
            '<small>Separate Terminal API credential requested from Worldline. Leave blank to keep the stored key.</small>' +
          '</div>' +
        '</div>' +
        '<div class="pmd-inline-note" data-pmd-worldline-terminal-readiness>Checking Terminal API configuration…</div>';

      grid.insertAdjacentElement('afterend', wrapper);
    }

    async function loadWorldlineTerminalSettings(form) {
      if (!isWorldlineForm(form)) return;
      injectWorldlineTerminalFields(form);
      var tokenInput = form.querySelector('[data-pmd-worldline-terminal-token]');
      var merchantInput = form.querySelector('[data-pmd-worldline-terminal-merchant]');
      var baseInput = form.querySelector('[data-pmd-worldline-terminal-base]');
      var readiness = form.querySelector('[data-pmd-worldline-terminal-readiness]');
      if (!tokenInput || !merchantInput || !baseInput) return;

      try {
        var response = await fetch(worldlineTerminalEndpoint(), {
          method: 'GET',
          credentials: 'same-origin',
          headers: {'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest'},
          cache: 'no-store'
        });
        var payload = parsePayload(await response.text());
        if (!response.ok || !payload.success) throw new Error(payload.error || 'Unable to load Terminal API settings.');

        merchantInput.value = String(payload.terminal_merchant_id || '');
        baseInput.value = String(payload.terminal_api_base_url || '');
        tokenInput.placeholder = payload.terminal_api_token_present
          ? 'Stored — leave blank to keep'
          : 'Enter Terminal API Bearer Key';
        if (readiness) {
          readiness.textContent = payload.terminal_ready
            ? 'Terminal API credentials are stored and the terminal is ready for a provider test.'
            : 'Terminal payments stay disabled until Terminal ID, merchant ID, API URL and the separate Bearer key are configured.';
        }
      } catch (error) {
        tokenInput.placeholder = 'Enter Terminal API Bearer Key';
        if (readiness) readiness.textContent = error && error.message ? error.message : 'Unable to load Terminal API settings.';
      }
    }

    async function saveWorldlineTerminalSettings(form) {
      if (!isWorldlineForm(form)) return;
      var tokenInput = form.querySelector('[data-pmd-worldline-terminal-token]');
      var merchantInput = form.querySelector('[data-pmd-worldline-terminal-merchant]');
      var baseInput = form.querySelector('[data-pmd-worldline-terminal-base]');
      if (!tokenInput || !merchantInput || !baseInput) return;

      var data = new FormData();
      var csrf = form.querySelector('input[name="_token"]');
      if (csrf && csrf.value) data.append('_token', csrf.value);
      data.append('terminal_merchant_id', String(merchantInput.value || '').trim());
      data.append('terminal_api_base_url', String(baseInput.value || '').trim());
      if (String(tokenInput.value || '').trim() !== '') {
        data.append('terminal_api_token', String(tokenInput.value || '').trim());
      }

      var response = await fetch(worldlineTerminalEndpoint(), {
        method: 'POST',
        credentials: 'same-origin',
        headers: {'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest'},
        body: data
      });
      var payload = parsePayload(await response.text());
      if (!response.ok || !payload.success) {
        throw new Error(payload.error || payload.message || ('Terminal settings save failed (' + response.status + ')'));
      }
    }

    async function requestWorldlineConnectionTest(actionButton) {
      var form = currentForm();
      if (!form || !isWorldlineForm(form) || inFlight) return;
      setBusy(true);
      setStatus('Testing Worldline Connect…');
      try {
        var data = new FormData();
        var csrf = form.querySelector('input[name="_token"]');
        if (csrf && csrf.value) data.append('_token', csrf.value);
        var response = await fetch(worldlineConnectTestEndpoint(), {
          method: 'POST',
          credentials: 'same-origin',
          headers: {'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest'},
          body: data
        });
        var payload = parsePayload(await response.text());
        displayResult(payload);
        if (!response.ok || !payload.success) {
          throw new Error(payload.error || payload.message || ('Worldline connection test failed (' + response.status + ')'));
        }
        setStatus(settingsText('Done'), 'ok');
      } catch (error) {
        var msg = error && error.message ? error.message : 'Worldline connection test failed';
        setStatus(msg, 'error');
        displayResult({error: msg});
      } finally {
        setBusy(false);
      }
    }

    function openModal(key, trigger) {
      var template = templateFor(key);
      if (!template || !bodyNode) return false;
      lastTrigger = trigger || document.activeElement;
      bodyNode.replaceChildren(template.content.cloneNode(true));
      var form = currentForm();
      if (!form) return false;
      if (titleNode) titleNode.textContent = form.getAttribute('data-pmd-inline-title') || settingsText('Settings');
      setStatus('');
      setBusy(false);
      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      lockBackground();
      if (String(key || '').toLowerCase() === 'finance:provider:worldline' || isWorldlineForm(form)) {
        void loadWorldlineTerminalSettings(form);
      }
      requestAnimationFrame(function () {
        var target = bodyNode.querySelector('input:not([type="hidden"]):not([disabled]):not([readonly]), select:not([disabled]), textarea:not([disabled]), button:not([disabled])');
        if (target) target.focus({preventScroll: true});
        else modal.querySelector('[data-pmd-inline-close]')?.focus({preventScroll: true});
      });
      return true;
    }

    function closeModal() {
      if (inFlight) return;
      modal.hidden = true;
      modal.setAttribute('aria-hidden', 'true');
      if (bodyNode) bodyNode.replaceChildren();
      setStatus('');
      unlockBackground();
      if (lastTrigger && typeof lastTrigger.focus === 'function' && document.contains(lastTrigger)) {
        lastTrigger.focus({preventScroll: true});
      }
      lastTrigger = null;
    }

    function makeFormData(form) {
      var data = new FormData(form);
      form.querySelectorAll('[data-pmd-omit-empty]').forEach(function (field) {
        if (!field.name) return;
        if (String(field.value || '').trim() === '') data.delete(field.name);
      });
      return data;
    }

    function parsePayload(text) {
      if (!text) return {};
      try { return JSON.parse(text); }
      catch (error) { return {raw: text}; }
    }

    function displayResult(payload) {
      var node = bodyNode ? bodyNode.querySelector('[data-pmd-inline-result]') : null;
      if (!node) return;
      node.hidden = false;
      try { node.textContent = typeof payload === 'string' ? payload : JSON.stringify(payload, null, 2); }
      catch (error) { node.textContent = String(payload); }
    }

    async function refreshSelectors(form) {
      var raw = form.getAttribute('data-pmd-refresh-selectors') || '';
      var selectors = raw.split(',').map(function (x) { return x.trim(); }).filter(Boolean);
      if (!selectors.length) return;
      var response = await fetch(window.location.pathname, {
        method: 'GET',
        credentials: 'same-origin',
        headers: {'X-Requested-With': 'XMLHttpRequest', 'X-PMD-SETTINGS-INLINE-REFRESH': '1'},
        cache: 'no-store'
      });
      if (!response.ok) throw new Error(settingsText('Saved, but this settings section could not refresh') + ' (' + response.status + ')');
      var html = await response.text();
      var doc = new DOMParser().parseFromString(html, 'text/html');
      selectors.forEach(function (selector) {
        var current = document.querySelector(selector);
        var next = doc.querySelector(selector);
        if (current && next) current.replaceWith(next);
      });
      var currentTemplates = document.querySelector('[data-pmd-inline-templates]');
      var nextTemplates = doc.querySelector('[data-pmd-inline-templates]');
      if (currentTemplates && nextTemplates) currentTemplates.replaceWith(nextTemplates);
    }

    async function requestBackend(handler, closeAfter, actionButton) {
      var form = currentForm();
      if (!form || inFlight) return;
      var url = form.getAttribute('data-pmd-backend-url');
      if (!url) return;
      if (typeof form.reportValidity === 'function' && handler === (form.getAttribute('data-pmd-save-handler') || 'onSave') && !form.reportValidity()) return;

      setBusy(true);
      setStatus(handler === (form.getAttribute('data-pmd-save-handler') || 'onSave') ? 'Saving…' : 'Working…');
      try {
        var response = await fetch(url, {
          method: 'POST',
          credentials: 'same-origin',
          headers: {
            'X-IGNITER-REQUEST-HANDLER': handler,
            'X-Requested-With': 'XMLHttpRequest',
            'X-PMD-INLINE-SETTINGS': '1',
            'Accept': 'application/json'
          },
          body: makeFormData(form)
        });
        var text = await response.text();
        var payload = parsePayload(text);
        var message = payload.X_IGNITER_ERROR_MESSAGE || payload.error || payload.message || '';
        if (!response.ok) {
          throw new Error(message || ('Request failed (' + response.status + ')'));
        }
        if (payload.X_IGNITER_ERROR_MESSAGE) throw new Error(payload.X_IGNITER_ERROR_MESSAGE);

        if (closeAfter) {
          if (isWorldlineForm(form)) {
            await saveWorldlineTerminalSettings(form);
          }
          setStatus(settingsText('Saved'), 'ok');
          await refreshSelectors(form);
          setBusy(false);
          closeModal();
          return;
        }
        displayResult(payload.raw && Object.keys(payload).length === 1 ? payload.raw : payload);
        setStatus(settingsText('Done'), 'ok');
      } catch (error) {
        var msg = error && error.message ? error.message : 'Request failed';
        setStatus(msg, 'error');
        displayResult({error: msg});
      } finally {
        setBusy(false);
      }
    }

    document.addEventListener('click', function (event) {
      var opener = event.target.closest('[data-pmd-inline-open]');
      if (opener) {
        event.preventDefault();
        openModal(opener.getAttribute('data-pmd-inline-open'), opener);
        return;
      }
      if (event.target.closest('[data-pmd-inline-close]')) {
        event.preventDefault();
        closeModal();
        return;
      }
      var action = event.target.closest('[data-pmd-inline-action]');
      if (action && modal.contains(action)) {
        event.preventDefault();
        var form = currentForm();
        var handler = action.getAttribute('data-pmd-inline-action');
        if (handler === 'onTestProviderConnection' && isWorldlineForm(form)) {
          void requestWorldlineConnectionTest(action);
          return;
        }
        requestBackend(handler, false, action);
      }
    });

    if (saveButton) {
      saveButton.addEventListener('click', function () {
        var form = currentForm();
        if (!form) return;
        requestBackend(form.getAttribute('data-pmd-save-handler') || 'onSave', true, saveButton);
      });
    }

    modal.addEventListener('submit', function (event) {
      var form = event.target.closest('[data-pmd-inline-form]');
      if (!form) return;
      event.preventDefault();
      requestBackend(form.getAttribute('data-pmd-save-handler') || 'onSave', true, saveButton);
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !modal.hidden) closeModal();
    });

    window.PMDSettingsInlineDetailV1 = {
      ready: true,
      version: '1.2.0-worldline-runtime',
      samePage: true,
      modalPortal: modal.parentElement === document.body,
      fieldGeometry: '46px/12px',
      backdropBlurPx: 8,
      modalAnimationMs: 180,
      backgroundScrollLock: 'fixed-position-restore',
      ajaxSave: true,
      worldlineConnectRuntimeTest: true,
      worldlineTerminalApiSettings: true,
      noPolling: true,
      noMutationObserver: true
    };
    console.info('[PMD Settings Inline Detail V1] Ready', window.PMDSettingsInlineDetailV1);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once: true});
  else boot();
})();
