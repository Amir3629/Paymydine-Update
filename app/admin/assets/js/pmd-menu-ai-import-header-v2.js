(function () {
  'use strict';

  // PMD_MENU_AI_IMPORT_HEADER_V2
  // Menu owns the trigger; Pmdmenuaiimport remains the authenticated import
  // authority. The workspace is opened in a same-origin modal card so the
  // operator does not have to leave Menu Manager.
  var modal = null;
  var iframe = null;
  var needsReload = false;
  var previousOverflow = '';

  function adminBase() {
    var parts = window.location.pathname.split('/').filter(Boolean);
    return '/' + (parts[0] || 'admin');
  }

  function setStyle(node, property, value) {
    node.style.setProperty(property, value, 'important');
  }

  function injectEmbeddedStyles() {
    if (!iframe || !iframe.contentDocument) return;
    var doc = iframe.contentDocument;
    var style = doc.getElementById('pmd-ai-import-embedded-style-v2');
    if (!style) {
      style = doc.createElement('style');
      style.id = 'pmd-ai-import-embedded-style-v2';
      style.textContent = ''
        + '#pmd-side-menu2{display:none!important}'
        + '.page-wrapper,.page-content,.main-content,.content-wrapper{margin-left:0!important;padding-left:0!important;left:0!important;width:100%!important;max-width:none!important}'
        + '.pmd-ai-import{max-width:none!important;padding:22px 24px 40px!important}'
        + '.pmd-ai-import__header{padding-top:0!important}'
        + '.pmd-ai-import__header .pmd-ai-import__back{display:none!important}'
        + 'body{overflow:auto!important;background:#f8fbfd!important}';
      (doc.head || doc.documentElement).appendChild(style);
    }
  }

  function closeModal(forceReload) {
    if (!modal) return;
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.documentElement.style.overflow = previousOverflow;
    if (iframe) iframe.src = 'about:blank';

    if (forceReload || needsReload) {
      window.location.reload();
      return;
    }

    var trigger = document.querySelector('[data-pmd-menu-ai-import-trigger]');
    if (trigger) trigger.focus();
  }

  function buildModal() {
    if (modal) return modal;

    modal = document.createElement('div');
    modal.setAttribute('data-pmd-menu-ai-import-modal', '');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Import menu with AI');
    modal.setAttribute('aria-hidden', 'true');
    modal.hidden = true;

    setStyle(modal, 'position', 'fixed');
    setStyle(modal, 'inset', '0');
    setStyle(modal, 'z-index', '30000');
    setStyle(modal, 'display', 'grid');
    setStyle(modal, 'place-items', 'center');
    setStyle(modal, 'padding', '24px');

    var backdrop = document.createElement('button');
    backdrop.type = 'button';
    backdrop.setAttribute('aria-label', 'Close AI import');
    backdrop.setAttribute('data-pmd-menu-ai-import-modal-close', '');
    setStyle(backdrop, 'position', 'absolute');
    setStyle(backdrop, 'inset', '0');
    setStyle(backdrop, 'border', '0');
    setStyle(backdrop, 'background', 'rgba(7, 31, 29, .34)');
    setStyle(backdrop, 'backdrop-filter', 'blur(5px)');
    setStyle(backdrop, 'cursor', 'default');

    var card = document.createElement('section');
    setStyle(card, 'position', 'relative');
    setStyle(card, 'z-index', '1');
    setStyle(card, 'display', 'grid');
    setStyle(card, 'grid-template-rows', '62px minmax(0, 1fr)');
    setStyle(card, 'width', 'min(1480px, calc(100vw - 48px))');
    setStyle(card, 'height', 'min(920px, calc(100vh - 48px))');
    setStyle(card, 'overflow', 'hidden');
    setStyle(card, 'border', '1px solid #d7e8ee');
    setStyle(card, 'border-radius', '22px');
    setStyle(card, 'background', '#ffffff');
    setStyle(card, 'box-shadow', '0 30px 90px rgba(7,31,29,.22)');

    var bar = document.createElement('header');
    setStyle(bar, 'display', 'flex');
    setStyle(bar, 'align-items', 'center');
    setStyle(bar, 'justify-content', 'space-between');
    setStyle(bar, 'gap', '16px');
    setStyle(bar, 'padding', '0 18px 0 22px');
    setStyle(bar, 'border-bottom', '1px solid #e1ecef');
    setStyle(bar, 'background', '#ffffff');
    bar.innerHTML = '<div><strong style="display:block;color:#10201f;font-size:16px;font-weight:900">Import menu with AI</strong><small style="color:#6b7b7a;font-size:11px">Upload, review, then import into this Menu</small></div>';

    var close = document.createElement('button');
    close.type = 'button';
    close.setAttribute('data-pmd-menu-ai-import-modal-close', '');
    close.setAttribute('aria-label', 'Close');
    close.textContent = '×';
    setStyle(close, 'width', '40px');
    setStyle(close, 'height', '40px');
    setStyle(close, 'border', '1px solid #d7e8ee');
    setStyle(close, 'border-radius', '12px');
    setStyle(close, 'background', '#ffffff');
    setStyle(close, 'color', '#173752');
    setStyle(close, 'font-size', '25px');
    setStyle(close, 'line-height', '1');
    setStyle(close, 'cursor', 'pointer');
    bar.appendChild(close);

    iframe = document.createElement('iframe');
    iframe.setAttribute('title', 'PayMyDine AI menu import');
    iframe.setAttribute('data-pmd-menu-ai-import-frame', '');
    setStyle(iframe, 'display', 'block');
    setStyle(iframe, 'width', '100%');
    setStyle(iframe, 'height', '100%');
    setStyle(iframe, 'border', '0');
    setStyle(iframe, 'background', '#f8fbfd');

    iframe.addEventListener('load', function () {
      try {
        var path = iframe.contentWindow.location.pathname;
        if (path.indexOf('/pmdmenus') !== -1) {
          closeModal(true);
          return;
        }
        if (path.indexOf('/pmdmenuaiimport') !== -1) injectEmbeddedStyles();
      } catch (error) {
        // Same-origin is expected. If browser policy changes, the standalone
        // workspace is still available as a fallback from the trigger.
      }
    });

    card.appendChild(bar);
    card.appendChild(iframe);
    modal.appendChild(backdrop);
    modal.appendChild(card);
    document.body.appendChild(modal);

    modal.addEventListener('click', function (event) {
      if (event.target.closest('[data-pmd-menu-ai-import-modal-close]')) {
        event.preventDefault();
        closeModal(false);
      }
    });

    return modal;
  }

  function openModal() {
    buildModal();
    needsReload = false;
    previousOverflow = document.documentElement.style.overflow || '';
    document.documentElement.style.overflow = 'hidden';
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    iframe.src = adminBase() + '/pmdmenuaiimport?embed=1&_=' + Date.now();
  }

  function mount() {
    var actions = document.querySelector('[data-pmd-menu-header-actions]');
    if (!actions) return false;

    var staleTrigger = document.querySelector('[data-pmd-menu-ai-import-trigger]');
    if (staleTrigger) staleTrigger.remove();

    var button = document.createElement('button');
    button.type = 'button';
    button.className = 'pmd-dashboard-lab__header-action pmd-menu-header-action pmd-menu-ai-import-trigger';
    button.setAttribute('data-pmd-menu-ai-import-trigger', '');
    button.setAttribute('aria-label', 'Import menu with AI');
    button.setAttribute('title', 'Import menu with AI');

    button.style.setProperty('background', '#075f4f', 'important');
    button.style.setProperty('border-color', '#075f4f', 'important');
    button.style.setProperty('color', '#ffffff', 'important');
    button.style.setProperty('font-size', '12px', 'important');
    button.style.setProperty('font-weight', '900', 'important');
    button.style.setProperty('letter-spacing', '-0.02em', 'important');
    button.innerHTML = '<span aria-hidden="true">AI</span>';
    button.addEventListener('click', openModal);

    var gap = actions.querySelector('[data-pmd-main-header-notification-gap-r67]');
    var slot = actions.querySelector('[data-pmd-menu-notif-slot]');
    var root = actions.querySelector('#notif-root');
    var anchor = gap || slot || root;
    if (anchor) actions.insertBefore(button, anchor);
    else actions.appendChild(button);

    return true;
  }

  window.addEventListener('message', function (event) {
    if (event.origin !== window.location.origin || !event.data) return;
    if (event.data.type === 'pmd-ai-menu-import-complete') needsReload = true;
    if (event.data.type === 'pmd-ai-menu-import-close') closeModal(Boolean(event.data.reload));
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && modal && !modal.hidden) closeModal(false);
  });

  if (!mount() && document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', mount, {once: true});
  }
})();
