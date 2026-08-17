(function () {
  'use strict';

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

    function openModal(key, trigger) {
      var template = templateFor(key);
      if (!template || !bodyNode) return false;
      lastTrigger = trigger || document.activeElement;
      bodyNode.replaceChildren(template.content.cloneNode(true));
      var form = currentForm();
      if (!form) return false;
      if (titleNode) titleNode.textContent = form.getAttribute('data-pmd-inline-title') || 'Settings';
      setStatus('');
      setBusy(false);
      modal.hidden = false;
      modal.setAttribute('aria-hidden', 'false');
      lockBackground();
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
      if (!response.ok) throw new Error('Saved, but this settings section could not refresh (' + response.status + ')');
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
          setStatus('Saved', 'ok');
          await refreshSelectors(form);
          setBusy(false);
          closeModal();
          return;
        }
        displayResult(payload.raw && Object.keys(payload).length === 1 ? payload.raw : payload);
        setStatus('Done', 'ok');
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
        requestBackend(action.getAttribute('data-pmd-inline-action'), false, action);
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
      version: '1.0.0',
      samePage: true,
      modalPortal: modal.parentElement === document.body,
      fieldGeometry: '46px/12px',
      backdropBlurPx: 8,
      modalAnimationMs: 180,
      backgroundScrollLock: 'fixed-position-restore',
      ajaxSave: true,
      noPolling: true,
      noMutationObserver: true
    };
    console.info('[PMD Settings Inline Detail V1] Ready', window.PMDSettingsInlineDetailV1);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once: true});
  else boot();
})();
