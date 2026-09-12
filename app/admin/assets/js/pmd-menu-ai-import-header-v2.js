(function () {
  'use strict';

  // PMD_MENU_AI_IMPORT_NATIVE_V5
  // Compact native Menu Manager modal. No iframe, no nested cards, no duplicate shell.
  var modal = null;
  var trigger = null;
  var importerReady = false;
  var needsReload = false;
  var stageObserver = null;

  function safeJson(value) {
    return JSON.stringify(value)
      .replace(/</g, '\u003c')
      .replace(/>/g, '\u003e')
      .replace(/&/g, '\u0026');
  }

  function readCatalog() {
    var node = document.getElementById('pmd-menu-manager-catalog');
    if (!node) return {};
    try { return JSON.parse(node.textContent || '{}') || {}; }
    catch (error) { return {}; }
  }

  function importerCategories() {
    var seen = {};
    var rows = [];
    document.querySelectorAll('[data-pmd-category-filter][data-pmd-category-id]').forEach(function (button) {
      var id = Number(button.getAttribute('data-pmd-category-id') || 0);
      if (id < 1 || seen[id]) return;
      var label = button.querySelector('.pmd-menu-manager__category-label');
      var name = String(label ? label.textContent : button.textContent || '').trim();
      if (!name) return;
      seen[id] = true;
      rows.push({id: id, name: name});
    });
    return rows;
  }

  function existingItemNames() {
    var catalog = readCatalog();
    return Object.keys(catalog).map(function (key) {
      return String(catalog[key] && catalog[key].name || '').trim();
    }).filter(Boolean);
  }

  function installStyles() {
    if (document.getElementById('pmd-menu-ai-native-v5-style')) return;
    var style = document.createElement('style');
    style.id = 'pmd-menu-ai-native-v5-style';
    style.textContent = `
      .pmd-menu-ai-native-modal .pmd-menu-modal__card{
        width:min(680px,calc(100vw - 40px))!important;
        max-height:min(720px,calc(100vh - 40px))!important;
        border-radius:20px!important;
        overflow:hidden!important;
        transition:width .16s ease!important;
      }
      .pmd-menu-ai-native-modal[data-pmd-ai-stage="review"] .pmd-menu-modal__card{
        width:min(1080px,calc(100vw - 40px))!important;
      }
      .pmd-menu-ai-native-modal[data-pmd-ai-stage="done"] .pmd-menu-modal__card{
        width:min(560px,calc(100vw - 40px))!important;
      }
      .pmd-menu-ai-native-modal .pmd-menu-modal__header{
        min-height:64px!important;
        padding:14px 18px!important;
        border-bottom:1px solid #e5ece8!important;
        background:#fff!important;
      }
      .pmd-menu-ai-native-modal .pmd-menu-modal__header>div:first-child{min-width:0}
      .pmd-menu-ai-native-modal .pmd-menu-modal__header h2{
        margin:0!important;
        font-size:19px!important;
        line-height:1.25!important;
        letter-spacing:-.02em!important;
        color:#14221c!important;
      }
      .pmd-menu-ai-native-modal .pmd-menu-modal__close{
        width:40px!important;
        height:40px!important;
        border-radius:12px!important;
      }
      .pmd-menu-ai-native-modal .pmd-menu-modal__body{
        padding:0!important;
        background:#fff!important;
        overflow:auto!important;
      }
      .pmd-ai-import--native{
        max-width:none!important;
        margin:0!important;
        padding:22px!important;
        color:#17211b!important;
      }
      .pmd-ai-import--native .pmd-ai-import__stage{
        margin:0!important;
        padding:0!important;
        border:0!important;
        border-radius:0!important;
        background:transparent!important;
        box-shadow:none!important;
      }
      .pmd-ai-import--native .pmd-ai-import__lead{
        margin:0 0 16px!important;
        color:#5e6b64!important;
        font-size:14px!important;
        line-height:1.5!important;
      }
      .pmd-ai-import--native .pmd-ai-import__drop{
        position:relative!important;
        min-height:170px!important;
        border:1.5px dashed #8fb6a6!important;
        border-radius:14px!important;
        background:#f7fbf9!important;
        display:flex!important;
        flex-direction:column!important;
        justify-content:center!important;
        align-items:center!important;
        text-align:center!important;
        padding:20px!important;
        cursor:pointer!important;
        transition:border-color .15s ease,background .15s ease!important;
      }
      .pmd-ai-import--native .pmd-ai-import__drop:hover{
        border-color:#338a68!important;
        background:#f1f9f5!important;
      }
      .pmd-ai-import--native .pmd-ai-import__drop input{
        position:absolute!important;
        inset:0!important;
        width:100%!important;
        height:100%!important;
        opacity:0!important;
        cursor:pointer!important;
      }
      .pmd-ai-import--native .pmd-ai-import__drop-icon{
        width:40px!important;
        height:40px!important;
        border-radius:12px!important;
        background:#e8f5ef!important;
        color:#087253!important;
        display:grid!important;
        place-items:center!important;
        margin-bottom:9px!important;
      }
      .pmd-ai-import--native .pmd-ai-import__drop-icon svg{
        width:21px!important;
        height:21px!important;
        fill:none!important;
        stroke:currentColor!important;
        stroke-width:2!important;
        stroke-linecap:round!important;
        stroke-linejoin:round!important;
      }
      .pmd-ai-import--native .pmd-ai-import__drop strong{
        font-size:15px!important;
        color:#182723!important;
      }
      .pmd-ai-import--native .pmd-ai-import__drop small{
        color:#78847e!important;
        margin:4px 0 8px!important;
        font-size:12px!important;
      }
      .pmd-ai-import--native .pmd-ai-import__drop>span:last-child{
        font-size:12px!important;
        color:#16805b!important;
        font-weight:750!important;
      }
      .pmd-ai-import--native .pmd-ai-import__footer{
        display:flex!important;
        align-items:center!important;
        gap:14px!important;
        margin-top:16px!important;
      }
      .pmd-ai-import--native .pmd-ai-import__hint{
        flex:1 1 auto!important;
        min-width:0!important;
        color:#748078!important;
        font-size:12px!important;
        line-height:1.4!important;
      }
      .pmd-ai-import--native .pmd-ai-import__status{
        flex:1 1 auto!important;
        min-width:0!important;
        color:#68736c!important;
        font-size:12px!important;
        line-height:1.4!important;
      }
      .pmd-ai-import--native .pmd-ai-import__status:empty{display:none!important}
      .pmd-ai-import--native .pmd-ai-import__status.is-error{color:#b43f3f!important}
      .pmd-ai-import--native .pmd-ai-import__primary,
      .pmd-ai-import--native .pmd-ai-import__secondary{
        min-height:40px!important;
        padding:0 16px!important;
        border-radius:11px!important;
        border:0!important;
        font-weight:800!important;
        white-space:nowrap!important;
        cursor:pointer!important;
      }
      .pmd-ai-import--native .pmd-ai-import__primary{background:#0d6f52!important;color:#fff!important}
      .pmd-ai-import--native .pmd-ai-import__primary:disabled{opacity:.5!important;cursor:not-allowed!important}
      .pmd-ai-import--native .pmd-ai-import__secondary{background:#edf2ef!important;color:#2c3931!important}
      .pmd-ai-import--native .pmd-ai-import__review-head{
        display:flex!important;
        align-items:flex-start!important;
        justify-content:space-between!important;
        gap:16px!important;
        margin:0 0 14px!important;
      }
      .pmd-ai-import--native .pmd-ai-import__review-head h3{
        margin:0 0 3px!important;
        color:#17231d!important;
        font-size:17px!important;
      }
      .pmd-ai-import--native .pmd-ai-import__review-head p{
        margin:0!important;
        color:#738078!important;
        font-size:12px!important;
      }
      .pmd-ai-import--native .pmd-ai-import__review-tools{
        display:flex!important;
        align-items:center!important;
        gap:10px!important;
        flex-wrap:wrap!important;
        justify-content:flex-end!important;
      }
      .pmd-ai-import--native .pmd-ai-import__summary{
        display:inline-flex!important;
        padding:5px 9px!important;
        border-radius:999px!important;
        background:#edf7f1!important;
        color:#206d49!important;
        font-size:11px!important;
        font-weight:800!important;
        white-space:nowrap!important;
      }
      .pmd-ai-import--native .pmd-ai-import__select-all{
        font-size:12px!important;
        font-weight:700!important;
        white-space:nowrap!important;
        color:#526159!important;
      }
      .pmd-ai-import--native .pmd-ai-import__table-wrap{
        overflow:auto!important;
        max-height:430px!important;
        border:1px solid #e1e8e4!important;
        border-radius:12px!important;
        background:#fff!important;
      }
      .pmd-ai-import--native .pmd-ai-import__table{width:100%!important;border-collapse:collapse!important;min-width:880px!important}
      .pmd-ai-import--native .pmd-ai-import__table th{
        position:sticky!important;
        top:0!important;
        z-index:2!important;
        text-align:left!important;
        padding:9px!important;
        background:#f6f9f7!important;
        color:#617068!important;
        font-size:11px!important;
      }
      .pmd-ai-import--native .pmd-ai-import__table td{padding:8px!important;border-top:1px solid #edf1ef!important;vertical-align:top!important}
      .pmd-ai-import--native .pmd-ai-import__table input[type=text],
      .pmd-ai-import--native .pmd-ai-import__table input[type=number],
      .pmd-ai-import--native .pmd-ai-import__table textarea{
        width:100%!important;
        border:1px solid #d5dfda!important;
        border-radius:8px!important;
        background:#fff!important;
        padding:7px 8px!important;
        font:inherit!important;
      }
      .pmd-ai-import--native .pmd-ai-import__table textarea{resize:vertical!important}
      .pmd-ai-import--native .pmd-ai-import__table tr.is-invalid{background:#fff9f5!important}
      .pmd-ai-import--native .pmd-ai-import__table tr.is-duplicate{background:#fcfaf1!important}
      .pmd-ai-import--native .pmd-ai-import__table tr.is-failed{background:#fff1f1!important}
      .pmd-ai-import--native .pmd-ai-import__table td:last-child small{display:block!important;color:#94663a!important;margin-top:4px!important;max-width:190px!important}
      .pmd-ai-import--native .pmd-ai-import__confidence{display:inline-flex!important;padding:3px 6px!important;border-radius:999px!important;background:#eef2ef!important;font-size:10px!important;font-weight:800!important}
      .pmd-ai-import--native[data-can-import-tables="0"] .pmd-ai-import__floors{display:none!important}
      .pmd-ai-import--native .pmd-ai-import__review-footer{
        display:flex!important;
        align-items:center!important;
        gap:10px!important;
        margin-top:14px!important;
      }
      .pmd-ai-import--native .pmd-ai-import__done{text-align:center!important;padding:24px 6px!important}
      .pmd-ai-import--native .pmd-ai-import__done-mark{width:48px!important;height:48px!important;border-radius:50%!important;background:#e9f7ef!important;color:#187a4c!important;font-size:25px!important;display:grid!important;place-items:center!important;margin:0 auto 10px!important}
      .pmd-ai-import--native .pmd-ai-import__done h2{margin:0 0 7px!important;font-size:19px!important}
      .pmd-ai-import--native .pmd-ai-import__done p{margin:0!important;color:#657069!important;font-size:13px!important}
      .pmd-menu-ai-trigger{background:#075f4f!important;border-color:#075f4f!important;color:#fff!important;font-size:12px!important;font-weight:900!important;letter-spacing:-.02em!important}
      @media(max-width:720px){
        .pmd-menu-ai-native-modal .pmd-menu-modal__card,
        .pmd-menu-ai-native-modal[data-pmd-ai-stage="review"] .pmd-menu-modal__card,
        .pmd-menu-ai-native-modal[data-pmd-ai-stage="done"] .pmd-menu-modal__card{
          width:calc(100vw - 20px)!important;
          max-height:calc(100vh - 20px)!important;
        }
        .pmd-menu-ai-native-modal .pmd-menu-modal__header{padding:12px 14px!important}
        .pmd-ai-import--native{padding:16px!important}
        .pmd-ai-import--native .pmd-ai-import__footer,
        .pmd-ai-import--native .pmd-ai-import__review-footer,
        .pmd-ai-import--native .pmd-ai-import__review-head{flex-wrap:wrap!important}
        .pmd-ai-import--native .pmd-ai-import__hint,
        .pmd-ai-import--native .pmd-ai-import__status{width:100%!important;flex-basis:100%!important}
      }
    `;
    document.head.appendChild(style);
  }

  function buildImporterMarkup() {
    var categories = importerCategories();
    var existingItems = existingItemNames();
    var canCreateCategories = Boolean(document.querySelector('[data-pmd-category-create]'));
    return ''
      + '<div class="pmd-ai-import pmd-ai-import--native" data-pmd-ai-import data-can-create-categories="' + (canCreateCategories ? '1' : '0') + '" data-can-import-tables="0" data-ai-enabled="1">'
      +   '<section class="pmd-ai-import__stage" data-pmd-ai-import-upload>'
      +     '<p class="pmd-ai-import__lead">Upload a menu photo, screenshot or PDF. AI will extract the items, categories and prices for you to review.</p>'
      +     '<label class="pmd-ai-import__drop">'
      +       '<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple data-pmd-ai-menu-sources>'
      +       '<span class="pmd-ai-import__drop-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 16V4"></path><path d="m7 9 5-5 5 5"></path><path d="M5 20h14"></path></svg></span>'
      +       '<strong>Choose menu files</strong>'
      +       '<small>JPG, PNG, WEBP or PDF · up to 12 files</small>'
      +       '<span data-pmd-ai-menu-source-label>No files selected</span>'
      +     '</label>'
      +     '<div class="pmd-ai-import__footer">'
      +       '<span class="pmd-ai-import__hint">Nothing is saved until you review and confirm. Menu screenshots are never used as food photos.</span>'
      +       '<span class="pmd-ai-import__status" data-pmd-ai-import-status aria-live="polite"></span>'
      +       '<button type="button" class="pmd-ai-import__primary" data-pmd-ai-analyse>Read with AI</button>'
      +     '</div>'
      +   '</section>'
      +   '<section class="pmd-ai-import__stage" data-pmd-ai-import-review hidden>'
      +     '<div class="pmd-ai-import__review-head">'
      +       '<div><h3>Review items</h3><p>Edit anything that is wrong, then import only the checked rows.</p></div>'
      +       '<div class="pmd-ai-import__review-tools"><span class="pmd-ai-import__summary" data-pmd-ai-import-summary></span><label class="pmd-ai-import__select-all"><input type="checkbox" checked data-pmd-ai-select-all> Select all valid</label></div>'
      +     '</div>'
      +     '<div class="pmd-ai-import__table-wrap"><table class="pmd-ai-import__table"><thead><tr><th>Import</th><th>Category</th><th>Item</th><th>Price</th><th>Description</th><th>Review</th></tr></thead><tbody data-pmd-ai-items></tbody></table></div>'
      +     '<section class="pmd-ai-import__floors" data-pmd-ai-floors-section hidden><div data-pmd-ai-floors></div></section>'
      +     '<div class="pmd-ai-import__review-footer">'
      +       '<button type="button" class="pmd-ai-import__secondary" data-pmd-ai-start-over>Start over</button>'
      +       '<span class="pmd-ai-import__status" data-pmd-ai-import-review-status aria-live="polite"></span>'
      +       '<button type="button" class="pmd-ai-import__primary" data-pmd-ai-import-confirm>Import selected</button>'
      +     '</div>'
      +   '</section>'
      +   '<section class="pmd-ai-import__stage pmd-ai-import__done" data-pmd-ai-import-done hidden>'
      +     '<div class="pmd-ai-import__done-mark">✓</div><h2>Import complete</h2><p data-pmd-ai-import-result></p>'
      +     '<div class="pmd-ai-import__review-footer" style="justify-content:center"><button type="button" class="pmd-ai-import__primary" data-pmd-ai-import-close>Back to Menu</button></div>'
      +   '</section>'
      +   '<script type="application/json" id="pmd-ai-import-categories">' + safeJson(categories) + '<\/script>'
      +   '<script type="application/json" id="pmd-ai-import-existing-items">' + safeJson(existingItems) + '<\/script>'
      + '</div>';
  }

  function syncStage() {
    if (!modal) return;
    var review = modal.querySelector('[data-pmd-ai-import-review]');
    var done = modal.querySelector('[data-pmd-ai-import-done]');
    var stage = done && !done.hidden ? 'done' : (review && !review.hidden ? 'review' : 'upload');
    modal.setAttribute('data-pmd-ai-stage', stage);

    var summary = modal.querySelector('[data-pmd-ai-import-summary]');
    if (summary && stage === 'review') {
      summary.textContent = String(summary.textContent || '').replace(/\s*·\s*\d+\s+floor areas detected\s*$/i, '');
    }
  }

  function watchStage() {
    if (!modal || stageObserver) return;
    var upload = modal.querySelector('[data-pmd-ai-import-upload]');
    var review = modal.querySelector('[data-pmd-ai-import-review]');
    var done = modal.querySelector('[data-pmd-ai-import-done]');
    stageObserver = new MutationObserver(syncStage);
    [upload, review, done].filter(Boolean).forEach(function (node) {
      stageObserver.observe(node, {attributes:true, attributeFilter:['hidden']});
    });
    syncStage();
  }

  function buildModal() {
    if (modal) return modal;
    installStyles();

    document.querySelectorAll('[data-pmd-menu-ai-import-modal]').forEach(function (node) { node.remove(); });
    modal = document.createElement('div');
    modal.className = 'pmd-menu-modal pmd-menu-ai-native-modal';
    modal.setAttribute('data-pmd-menu-ai-import-modal', '');
    modal.setAttribute('data-pmd-ai-stage', 'upload');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'pmd-menu-ai-native-title');
    modal.setAttribute('aria-hidden', 'true');
    modal.hidden = true;
    modal.innerHTML = ''
      + '<div class="pmd-menu-modal__backdrop" data-pmd-menu-ai-import-close></div>'
      + '<section class="pmd-menu-modal__card" role="document">'
      +   '<header class="pmd-menu-modal__header">'
      +     '<div><h2 id="pmd-menu-ai-native-title">Import menu with AI</h2></div>'
      +     '<button type="button" class="pmd-menu-modal__close" data-pmd-menu-ai-import-close aria-label="Close"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"></path></svg></button>'
      +   '</header>'
      +   '<div class="pmd-menu-modal__body">' + buildImporterMarkup() + '</div>'
      + '</section>';
    document.body.appendChild(modal);
    watchStage();
    modal.addEventListener('click', function (event) {
      if (event.target.closest('[data-pmd-menu-ai-import-close]')) {
        event.preventDefault();
        closeModal(false);
        return;
      }
      if (event.target.closest('[data-pmd-ai-import-close]')) {
        event.preventDefault();
        closeModal(true);
      }
    });
    return modal;
  }

  function ensureImporterScript() {
    if (window.PMDAiMenuImportNativeV5Loading) return;
    window.PMDAiMenuImportNativeV5Loading = true;
    var script = document.createElement('script');
    script.src = '/app/admin/assets/js/pmd-menu-ai-import-v1.js?v=native-v5-20260912';
    script.async = false;
    script.onload = function () {
      importerReady = true;
      var button = modal && modal.querySelector('[data-pmd-ai-analyse]');
      if (button) button.disabled = false;
    };
    script.onerror = function () {
      var button = modal && modal.querySelector('[data-pmd-ai-analyse]');
      if (button) button.disabled = true;
      var status = modal && modal.querySelector('[data-pmd-ai-import-status]');
      if (status) {
        status.textContent = 'AI importer could not load. Refresh the Menu page.';
        status.classList.add('is-error');
      }
    };
    var analyse = modal && modal.querySelector('[data-pmd-ai-analyse]');
    if (analyse) analyse.disabled = true;
    document.head.appendChild(script);
  }

  function importedAnything() {
    var done = modal && modal.querySelector('[data-pmd-ai-import-done]');
    return Boolean(done && !done.hidden);
  }

  function openModal() {
    buildModal();
    if (!importerReady) ensureImporterScript();
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('pmd-menu-modal-open');
    var close = modal.querySelector('.pmd-menu-modal__close');
    if (close) close.focus({preventScroll:true});
  }

  function closeModal(forceReload) {
    if (!modal) return;
    if (forceReload || needsReload || importedAnything()) {
      window.location.reload();
      return;
    }
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('pmd-menu-modal-open');
    if (trigger) trigger.focus({preventScroll:true});
  }

  function mountTrigger() {
    var actions = document.querySelector('[data-pmd-menu-header-actions]');
    if (!actions) return false;
    document.querySelectorAll('[data-pmd-menu-ai-import-trigger]').forEach(function (node) { node.remove(); });
    trigger = document.createElement('button');
    trigger.type = 'button';
    trigger.className = 'pmd-dashboard-lab__header-action pmd-menu-header-action pmd-menu-ai-trigger';
    trigger.setAttribute('data-pmd-menu-ai-import-trigger', '');
    trigger.setAttribute('aria-label', 'Import menu with AI');
    trigger.setAttribute('title', 'Import menu with AI');
    trigger.innerHTML = '<span aria-hidden="true">AI</span>';
    trigger.addEventListener('click', function (event) {
      event.preventDefault();
      openModal();
    });
    var gap = actions.querySelector('[data-pmd-main-header-notification-gap-r67]');
    var slot = actions.querySelector('[data-pmd-menu-notif-slot]');
    var notifRoot = actions.querySelector('#notif-root');
    var anchor = gap || slot || notifRoot;
    if (anchor) actions.insertBefore(trigger, anchor);
    else actions.appendChild(trigger);
    return true;
  }

  function boot() {
    buildModal();
    ensureImporterScript();
    mountTrigger();
  }

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && modal && !modal.hidden) closeModal(false);
  });

  window.PMDMenuAiImportNativeV5 = {open:openModal, close:closeModal};

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
