(function () {
  'use strict';

  // PMD_MENU_AI_IMPORT_NATIVE_V6
  var modal = null;
  var trigger = null;
  var importerReady = false;
  var importerLoading = false;
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
    if (document.getElementById('pmd-menu-ai-native-v6-style')) return;
    var style = document.createElement('style');
    style.id = 'pmd-menu-ai-native-v6-style';
    style.textContent = `
      .pmd-menu-ai-native-modal .pmd-menu-modal__card{
        width:min(720px,calc(100vw - 36px))!important;
        max-height:min(760px,calc(100vh - 36px))!important;
        border-radius:20px!important;
        overflow:hidden!important;
        box-shadow:0 26px 80px rgba(19,45,36,.2)!important;
        transition:width .16s ease!important;
      }
      .pmd-menu-ai-native-modal[data-pmd-ai-stage="review"] .pmd-menu-modal__card{
        width:min(1180px,calc(100vw - 36px))!important;
      }
      .pmd-menu-ai-native-modal[data-pmd-ai-stage="done"] .pmd-menu-modal__card{
        width:min(560px,calc(100vw - 36px))!important;
      }
      .pmd-menu-ai-native-modal .pmd-menu-modal__header{
        min-height:66px!important;
        padding:14px 18px 14px 22px!important;
        border-bottom:1px solid #e7ece9!important;
        background:#fff!important;
      }
      .pmd-menu-ai-native-modal .pmd-menu-modal__header h2{
        margin:0!important;
        font-size:19px!important;
        line-height:1.25!important;
        letter-spacing:-.02em!important;
        color:#14221c!important;
      }
      .pmd-menu-ai-native-modal .pmd-menu-modal__close{
        width:40px!important;height:40px!important;border-radius:12px!important;
      }
      .pmd-menu-ai-native-modal .pmd-menu-modal__body{
        padding:0!important;background:#fff!important;overflow:auto!important;
      }
      .pmd-ai-import--native{max-width:none!important;margin:0!important;padding:22px!important;color:#17211b!important}
      .pmd-ai-import--native .pmd-ai-import__stage{margin:0!important;padding:0!important;border:0!important;background:transparent!important;box-shadow:none!important}
      .pmd-ai-import--native .pmd-ai-import__lead{margin:0 0 14px!important;color:#647169!important;font-size:14px!important;line-height:1.5!important}
      .pmd-ai-import--native .pmd-ai-import__drop{
        position:relative!important;min-height:170px!important;border:1.5px dashed #90b5a6!important;border-radius:15px!important;background:#f8fbf9!important;
        display:flex!important;flex-direction:column!important;justify-content:center!important;align-items:center!important;text-align:center!important;padding:20px!important;cursor:pointer!important;
        transition:border-color .15s ease,background .15s ease!important;
      }
      .pmd-ai-import--native .pmd-ai-import__drop:hover{border-color:#237b5d!important;background:#f2f8f5!important}
      .pmd-ai-import--native .pmd-ai-import__drop input{position:absolute!important;inset:0!important;width:100%!important;height:100%!important;opacity:0!important;cursor:pointer!important}
      .pmd-ai-import--native .pmd-ai-import__drop-icon{width:42px!important;height:42px!important;border-radius:12px!important;background:#e8f4ef!important;color:#087253!important;display:grid!important;place-items:center!important;margin-bottom:9px!important}
      .pmd-ai-import--native .pmd-ai-import__drop-icon svg{width:22px!important;height:22px!important;fill:none!important;stroke:currentColor!important;stroke-width:2!important;stroke-linecap:round!important;stroke-linejoin:round!important}
      .pmd-ai-import--native .pmd-ai-import__drop strong{font-size:15px!important;color:#182723!important}
      .pmd-ai-import--native .pmd-ai-import__drop small{color:#78847e!important;margin:4px 0 8px!important;font-size:12px!important}
      .pmd-ai-import--native .pmd-ai-import__drop>span:last-child{font-size:12px!important;color:#16805b!important;font-weight:800!important}
      .pmd-ai-import--native .pmd-ai-import__footer{display:flex!important;align-items:center!important;gap:12px!important;margin-top:16px!important}
      .pmd-ai-import--native .pmd-ai-import__hint{flex:1 1 auto!important;min-width:0!important;color:#748078!important;font-size:11px!important;line-height:1.4!important}
      .pmd-ai-import--native .pmd-ai-import__status{flex:1 1 auto!important;min-width:0!important;color:#68736c!important;font-size:12px!important;line-height:1.4!important}
      .pmd-ai-import--native .pmd-ai-import__status:empty{display:none!important}
      .pmd-ai-import--native .pmd-ai-import__status.is-error{color:#b43f3f!important}
      .pmd-ai-import--native .pmd-ai-import__primary,.pmd-ai-import--native .pmd-ai-import__secondary,.pmd-ai-import--native .pmd-ai-import__duplicates-toggle{
        min-height:40px!important;padding:0 15px!important;border-radius:10px!important;border:0!important;font-weight:800!important;white-space:nowrap!important;cursor:pointer!important
      }
      .pmd-ai-import--native .pmd-ai-import__primary{background:#075f4f!important;color:#fff!important}
      .pmd-ai-import--native .pmd-ai-import__primary:disabled{opacity:.45!important;cursor:not-allowed!important}
      .pmd-ai-import--native .pmd-ai-import__secondary{background:#eef2f0!important;color:#2c3931!important}
      .pmd-ai-import--native .pmd-ai-import__review-head{display:flex!important;align-items:flex-start!important;justify-content:space-between!important;gap:18px!important;margin:0 0 14px!important}
      .pmd-ai-import--native .pmd-ai-import__review-head h3{margin:0 0 3px!important;color:#17231d!important;font-size:17px!important}
      .pmd-ai-import--native .pmd-ai-import__review-head p{margin:0!important;color:#738078!important;font-size:12px!important}
      .pmd-ai-import--native .pmd-ai-import__review-tools{display:flex!important;align-items:center!important;gap:8px!important;flex-wrap:wrap!important;justify-content:flex-end!important}
      .pmd-ai-import--native .pmd-ai-import__summary{margin:0!important}
      .pmd-ai-import--native .pmd-ai-import__select-all{font-size:11px!important;font-weight:750!important;white-space:nowrap!important;color:#526159!important;padding:7px 2px!important}
      .pmd-ai-import--native .pmd-ai-import__duplicates-toggle{min-height:31px!important;padding:0 10px!important;background:#f1f5f3!important;color:#496157!important;font-size:11px!important}
      .pmd-ai-import--native .pmd-ai-import__table-wrap{overflow:auto!important;max-height:480px!important;border:1px solid #e1e8e4!important;border-radius:12px!important;background:#fff!important}
      .pmd-ai-import--native .pmd-ai-import__table{width:100%!important;border-collapse:separate!important;border-spacing:0!important;min-width:960px!important}
      .pmd-ai-import--native .pmd-ai-import__table th{position:sticky!important;top:0!important;z-index:2!important;text-align:left!important;padding:10px 9px!important;background:#f7f9f8!important;color:#64736b!important;font-size:10px!important;text-transform:uppercase!important;letter-spacing:.04em!important;border-bottom:1px solid #e7ece9!important}
      .pmd-ai-import--native .pmd-ai-import__table td{padding:9px!important;border-bottom:1px solid #edf1ef!important;vertical-align:middle!important;background:#fff!important}
      .pmd-ai-import--native .pmd-ai-import__table tr:last-child td{border-bottom:0!important}
      .pmd-ai-import--native .pmd-ai-import__table tr.is-duplicate td{background:#fbfaf7!important;color:#65716a!important}
      .pmd-ai-import--native .pmd-ai-import__table tr.is-invalid td{background:#fffaf8!important}
      .pmd-ai-import--native .pmd-ai-import__table tr.is-failed td{background:#fff4f4!important}
      .pmd-ai-import--native .pmd-ai-import__table input[type=text],.pmd-ai-import--native .pmd-ai-import__table input[type=number],.pmd-ai-import--native .pmd-ai-import__table textarea{width:100%!important;border:1px solid #d7e0db!important;border-radius:8px!important;background:#fff!important;padding:7px 8px!important;font:inherit!important;box-shadow:none!important}
      .pmd-ai-import--native .pmd-ai-import__table textarea{resize:vertical!important;min-height:38px!important}
      .pmd-ai-import--native .pmd-ai-import__confidence{display:inline-flex!important;padding:3px 6px!important;border-radius:999px!important;background:#eef2ef!important;font-size:10px!important;font-weight:800!important}
      .pmd-ai-import--native[data-can-import-tables="0"] .pmd-ai-import__floors{display:none!important}
      .pmd-ai-import--native .pmd-ai-import__review-footer{position:sticky!important;bottom:0!important;z-index:3!important;display:flex!important;align-items:center!important;gap:10px!important;margin:14px -22px -22px!important;padding:12px 22px!important;border-top:1px solid #e7ece9!important;background:rgba(255,255,255,.97)!important;backdrop-filter:blur(8px)!important}
      .pmd-ai-import--native .pmd-ai-import__done{text-align:center!important;padding:24px 6px!important}
      .pmd-ai-import--native .pmd-ai-import__done-mark{width:48px!important;height:48px!important;border-radius:50%!important;background:#e9f7ef!important;color:#187a4c!important;font-size:25px!important;display:grid!important;place-items:center!important;margin:0 auto 10px!important}
      .pmd-ai-import--native .pmd-ai-import__done h2{margin:0 0 7px!important;font-size:19px!important}.pmd-ai-import--native .pmd-ai-import__done p{margin:0!important;color:#657069!important;font-size:13px!important}
      .pmd-menu-ai-trigger{background:#075f4f!important;border-color:#075f4f!important;color:#fff!important;font-size:12px!important;font-weight:900!important;letter-spacing:-.02em!important}
      @media(max-width:760px){
        .pmd-menu-ai-native-modal .pmd-menu-modal__card,.pmd-menu-ai-native-modal[data-pmd-ai-stage="review"] .pmd-menu-modal__card,.pmd-menu-ai-native-modal[data-pmd-ai-stage="done"] .pmd-menu-modal__card{width:calc(100vw - 20px)!important;max-height:calc(100vh - 20px)!important}
        .pmd-ai-import--native{padding:16px!important}.pmd-ai-import--native .pmd-ai-import__review-head,.pmd-ai-import--native .pmd-ai-import__footer,.pmd-ai-import--native .pmd-ai-import__review-footer{flex-wrap:wrap!important}
        .pmd-ai-import--native .pmd-ai-import__review-footer{margin:12px -16px -16px!important;padding:12px 16px!important}
        .pmd-ai-import--native .pmd-ai-import__hint,.pmd-ai-import--native .pmd-ai-import__status{width:100%!important;flex-basis:100%!important}
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
      +     '<p class="pmd-ai-import__lead">Add one or more menu photos, screenshots or PDFs. PayMyDine combines them into one draft before anything is saved.</p>'
      +     '<label class="pmd-ai-import__drop">'
      +       '<input type="file" accept="image/jpeg,image/png,image/webp,application/pdf" multiple data-pmd-ai-menu-sources>'
      +       '<span class="pmd-ai-import__drop-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M12 16V4"></path><path d="m7 9 5-5 5 5"></path><path d="M5 20h14"></path></svg></span>'
      +       '<strong>Add menu files</strong>'
      +       '<small>JPG, PNG, WEBP or PDF · up to 12 files</small>'
      +       '<span data-pmd-ai-menu-source-label>No files selected</span>'
      +     '</label>'
      +     '<div class="pmd-ai-import__source-list" data-pmd-ai-source-list></div>'
      +     '<div class="pmd-ai-import__footer">'
      +       '<span class="pmd-ai-import__hint">You can click the upload area again to add more files. Menu screenshots are never used as food photos.</span>'
      +       '<span class="pmd-ai-import__status" data-pmd-ai-import-status aria-live="polite"></span>'
      +       '<button type="button" class="pmd-ai-import__primary" data-pmd-ai-analyse disabled>Read with AI</button>'
      +     '</div>'
      +   '</section>'
      +   '<section class="pmd-ai-import__stage" data-pmd-ai-import-review hidden>'
      +     '<div class="pmd-ai-import__review-head">'
      +       '<div><h3>Review AI results</h3><p>Only new, valid items are selected. Existing Menu items stay protected.</p></div>'
      +       '<div class="pmd-ai-import__review-tools">'
      +         '<div class="pmd-ai-import__summary" data-pmd-ai-import-summary></div>'
      +         '<button type="button" class="pmd-ai-import__duplicates-toggle" data-pmd-ai-duplicates-toggle hidden>Show existing</button>'
      +         '<label class="pmd-ai-import__select-all"><input type="checkbox" checked data-pmd-ai-select-all> Select ready</label>'
      +       '</div>'
      +     '</div>'
      +     '<div class="pmd-ai-import__no-new" data-pmd-ai-no-new hidden><strong>No new items to import</strong><p>AI found <span data-pmd-ai-no-new-count>0</span> items that are already in this Menu. Use “Show existing” if you want to inspect or rename them.</p></div>'
      +     '<div class="pmd-ai-import__table-wrap"><table class="pmd-ai-import__table"><thead><tr><th>Import</th><th>Category</th><th>Item</th><th>Price</th><th>Description</th><th>Status</th></tr></thead><tbody data-pmd-ai-items></tbody></table></div>'
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
      } else if (event.target.closest('[data-pmd-ai-import-close]')) {
        event.preventDefault();
        closeModal(true);
      }
    });

    return modal;
  }

  function ensureImporterScript() {
    if (importerReady || importerLoading) return;
    importerLoading = true;
    var script = document.createElement('script');
    script.src = '/app/admin/assets/js/pmd-menu-ai-import-v1.js?v=native-v6-20260912';
    script.async = false;
    script.onload = function () {
      importerReady = true;
      importerLoading = false;
    };
    script.onerror = function () {
      importerLoading = false;
      var status = modal && modal.querySelector('[data-pmd-ai-import-status]');
      if (status) {
        status.textContent = 'AI importer could not load. Refresh the Menu page.';
        status.classList.add('is-error');
      }
    };
    document.head.appendChild(script);
  }

  function importedAnything() {
    var done = modal && modal.querySelector('[data-pmd-ai-import-done]');
    return Boolean(done && !done.hidden);
  }

  function openModal() {
    buildModal();
    ensureImporterScript();
    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('pmd-menu-modal-open');
    var close = modal.querySelector('.pmd-menu-modal__close');
    if (close) close.focus({preventScroll:true});
  }

  function closeModal(forceReload) {
    if (!modal) return;
    if (forceReload || importedAnything()) {
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

  window.PMDMenuAiImportNativeV6 = {open:openModal, close:closeModal};

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
