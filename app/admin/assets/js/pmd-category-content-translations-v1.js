// PMD_CATEGORY_CONTENT_TRANSLATIONS_ADMIN_V1
(function () {
  'use strict';

  var path = String((window.PMDAdminCanonicalURLR81E ? window.PMDAdminCanonicalURLR81E.logicalPath() : window.location.pathname) || '').replace(/\/+$/, '');
  if (path !== '/admin/menu' && path !== '/admin/pmdmenus') return;

  var modal = document.querySelector('[data-pmd-menu-modal]');
  var categoryContent = modal && modal.querySelector('[data-pmd-category-modal-content]');
  var form = modal && modal.querySelector('[data-pmd-category-form]');
  var nameInput = form && form.querySelector('[data-pmd-category-name]');
  var saveButton = modal && modal.querySelector('[data-pmd-menu-save]');
  var titleNode = modal && modal.querySelector('[data-pmd-menu-modal-title]');
  var statusNode = modal && modal.querySelector('[data-pmd-menu-modal-status]');
  if (!modal || !categoryContent || !form || !nameInput || !saveButton) return;

  var section = null;
  var tabs = null;
  var panels = null;
  var autoButton = null;
  var translationStatus = null;
  var categoryIdInput = null;
  var sourceInput = null;
  var presentInput = null;
  var sourceLocale = 'en';
  var enabledLocales = ['en'];
  var targetLocales = [];
  var activeLocale = '';
  var translations = {};
  var currentCategoryId = 0;
  var loadRun = 0;
  var openingEdit = false;
  var installQueued = false;

  var languageNames = {
    en:'English', de:'Deutsch', ar:'العربية', tr:'Türkçe', fa:'فارسی', ja:'日本語',
    fr:'Français', es:'Español', it:'Italiano', pt:'Português', nl:'Nederlands',
    ru:'Русский', pl:'Polski', sv:'Svenska', no:'Norsk', da:'Dansk', fi:'Suomi',
    el:'Ελληνικά', he:'עברית', ur:'اردو', hi:'हिन्दी', zh:'中文', ko:'한국어'
  };

  function localeBase(value) {
    return String(value || '').trim().toLowerCase().replace(/_/g, '-').split('-')[0] || '';
  }

  function localeLabel(locale) {
    return languageNames[locale] || String(locale || '').toUpperCase();
  }

  function activeAdminLocale() {
    var candidates = [
      window.PMD_PLATFORM_MESSAGES_LOCALE,
      window.PMD_ADMIN_LOCALE,
      document.documentElement && document.documentElement.lang
    ];
    for (var i = 0; i < candidates.length; i++) {
      var locale = localeBase(candidates[i]);
      if (locale) return locale;
    }
    return '';
  }

  function isRtl(locale) {
    return ['ar','fa','he','ur'].indexOf(localeBase(locale)) !== -1;
  }

  function ensureHidden(name, value) {
    var input = form.querySelector('input[name="'+name+'"]');
    if (!input) {
      input = document.createElement('input');
      input.type = 'hidden';
      input.name = name;
      form.appendChild(input);
    }
    input.value = value == null ? '' : String(value);
    return input;
  }

  function ensureUi() {
    categoryIdInput = ensureHidden('category_id', currentCategoryId || '');
    sourceInput = ensureHidden('pmd_category_translation_source_locale', sourceLocale);
    presentInput = ensureHidden('pmd_category_translations_present', '1');

    if (section && section.isConnected) return;

    section = document.createElement('section');
    section.className = 'pmd-menu-form__section pmd-menu-form__section--compact pmd-menu-content-translations pmd-category-content-translations';
    section.setAttribute('data-pmd-category-content-translations', 'v1');
    section.hidden = true;
    section.innerHTML = '' +
      '<div class="pmd-menu-content-translations__head">' +
        '<div class="pmd-menu-content-translations__title"><h3>Translations</h3><div data-pmd-category-translation-tabs></div></div>' +
        '<div class="pmd-menu-content-translations__actions"><button type="button" data-pmd-category-auto-translate>Auto translate</button><span class="pmd-menu-content-translations__status" data-pmd-category-translation-status></span></div>' +
      '</div>' +
      '<div data-pmd-category-translation-panels></div>';
    form.appendChild(section);

    tabs = section.querySelector('[data-pmd-category-translation-tabs]');
    panels = section.querySelector('[data-pmd-category-translation-panels]');
    autoButton = section.querySelector('[data-pmd-category-auto-translate]');
    translationStatus = section.querySelector('[data-pmd-category-translation-status]');
  }

  function setTranslationStatus(text, kind) {
    if (!translationStatus) return;
    translationStatus.textContent = text || '';
    translationStatus.className = 'pmd-menu-content-translations__status' + (kind ? ' is-'+kind : '');
  }

  function setModalStatus(text, error) {
    if (!statusNode) return;
    statusNode.textContent = text || '';
    statusNode.classList.toggle('is-error', Boolean(error));
    statusNode.classList.toggle('is-ok', Boolean(text) && !error);
  }

  function render() {
    ensureUi();
    targetLocales = enabledLocales.filter(function (locale) { return locale && locale !== sourceLocale; });
    if (!targetLocales.length) {
      section.hidden = true;
      if (presentInput) presentInput.disabled = true;
      return;
    }

    if (sourceInput) sourceInput.value = sourceLocale;
    if (categoryIdInput) categoryIdInput.value = currentCategoryId ? String(currentCategoryId) : '';
    if (presentInput) presentInput.disabled = false;
    if (targetLocales.indexOf(activeLocale) === -1) activeLocale = targetLocales[0];
    section.hidden = false;

    tabs.textContent = '';
    targetLocales.forEach(function (locale) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'pmd-menu-content-translations__tab';
      button.setAttribute('data-pmd-category-translation-tab', locale);
      button.setAttribute('aria-pressed', locale === activeLocale ? 'true' : 'false');
      button.textContent = localeLabel(locale);
      tabs.appendChild(button);
    });

    panels.textContent = '';
    targetLocales.forEach(function (locale) {
      var panel = document.createElement('div');
      panel.className = 'pmd-menu-content-translations__panel';
      panel.setAttribute('data-pmd-category-translation-panel', locale);
      panel.hidden = locale !== activeLocale;

      var label = document.createElement('label');
      label.className = 'pmd-menu-content-translations__field';
      var caption = document.createElement('span');
      caption.textContent = 'Category name';
      label.appendChild(caption);

      var input = document.createElement('input');
      input.type = 'text';
      input.name = 'pmd_category_translations['+locale+'][name]';
      input.maxLength = 160;
      input.value = String(translations[locale] || '');
      input.dir = isRtl(locale) ? 'rtl' : 'auto';
      input.setAttribute('data-pmd-category-translation-target', locale);
      input.setAttribute('data-pmd-category-translation-source', String(nameInput.value || '').trim());
      label.appendChild(input);
      panel.appendChild(label);
      panels.appendChild(panel);
    });
  }

  async function loadCategory(categoryId) {
    var run = ++loadRun;
    currentCategoryId = Number(categoryId || 0) || 0;
    translations = {};
    setTranslationStatus('', '');
    ensureUi();

    try {
      var response = await fetch('/api/v1/menu-content-translations', {
        credentials:'same-origin',
        headers:{'Accept':'application/json'},
        cache:'no-store'
      });
      if (!response.ok) throw new Error('translations');
      var data = await response.json();
      if (run !== loadRun) return;
      var payload = data && data.data ? data.data : data || {};
      var configuredLocale = localeBase(payload.default_locale || 'en') || 'en';
      enabledLocales = Array.isArray(payload.enabled_locales) ? payload.enabled_locales.map(localeBase).filter(Boolean) : [configuredLocale];
      if (enabledLocales.indexOf(configuredLocale) === -1) enabledLocales.unshift(configuredLocale);
      enabledLocales = enabledLocales.filter(function (locale, index, list) { return locale && list.indexOf(locale) === index; });

      var adminLocale = activeAdminLocale();
      sourceLocale = adminLocale && enabledLocales.indexOf(adminLocale) !== -1 ? adminLocale : configuredLocale;
      if (enabledLocales.indexOf(sourceLocale) === -1) enabledLocales.unshift(sourceLocale);

      if (currentCategoryId > 0) {
        var row = payload.categories && payload.categories[String(currentCategoryId)];
        var source = row && row.translations || {};
        Object.keys(source).forEach(function (locale) {
          var key = localeBase(locale);
          if (key) translations[key] = String(source[locale] || '');
        });
      }

      activeLocale = enabledLocales.filter(function (locale) { return locale !== sourceLocale; })[0] || '';
      render();
    } catch (error) {
      sourceLocale = activeAdminLocale() || 'en';
      enabledLocales = [sourceLocale];
      activeLocale = '';
      render();
    }
  }

  function splitTranslateChunks(text) {
    var clean = String(text || '').trim();
    if (!clean) return [];
    if (clean.length <= 420) return [clean];
    var chunks = [];
    var rest = clean;
    while (rest.length) {
      if (rest.length <= 420) { chunks.push(rest); break; }
      var cut = rest.lastIndexOf(' ', 420);
      if (cut < 220) cut = 420;
      chunks.push(rest.slice(0, cut).trim());
      rest = rest.slice(cut).trim();
    }
    return chunks.filter(Boolean);
  }

  async function translateChunk(text, source, target) {
    var memory = 'https://api.mymemory.translated.net/get?q='+encodeURIComponent(text)+'&langpair='+encodeURIComponent(source+'|'+target);
    try {
      var response = await fetch(memory, {method:'GET', mode:'cors', credentials:'omit'});
      if (response.ok) {
        var data = await response.json();
        var translated = data && data.responseData && String(data.responseData.translatedText || '').trim();
        if (translated && translated.toUpperCase().indexOf('MYMEMORY WARNING') === -1) return translated;
      }
    } catch (error) {}

    var google = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl='+encodeURIComponent(source)+'&tl='+encodeURIComponent(target)+'&dt=t&q='+encodeURIComponent(text);
    var fallback = await fetch(google, {method:'GET', mode:'cors', credentials:'omit'});
    if (!fallback.ok) throw new Error('translate');
    var body = await fallback.json();
    var segments = body && body[0];
    if (!Array.isArray(segments)) throw new Error('translate');
    var output = segments.map(function (row) { return Array.isArray(row) ? String(row[0] || '') : ''; }).join('').trim();
    if (!output) throw new Error('translate');
    return output;
  }

  async function translateText(text, source, target) {
    var chunks = splitTranslateChunks(text);
    var result = [];
    for (var i = 0; i < chunks.length; i++) result.push(await translateChunk(chunks[i], source, target));
    return result.join(' ').trim();
  }

  async function autoTranslate() {
    if (!activeLocale || !section || !autoButton) return;
    var input = section.querySelector('[data-pmd-category-translation-panel="'+activeLocale+'"] [data-pmd-category-translation-target]');
    var source = String(nameInput.value || '').trim();
    if (!input || !source) return;
    if (String(input.value || '').trim()) {
      setTranslationStatus('Translation already entered.', 'good');
      return;
    }

    autoButton.disabled = true;
    autoButton.textContent = 'Translating…';
    setTranslationStatus('', '');
    try {
      var translated = await translateText(source, sourceLocale, activeLocale);
      input.value = translated;
      translations[activeLocale] = translated;
      setTranslationStatus('Translated ✓ Review before saving.', 'good');
    } catch (error) {
      setTranslationStatus('Auto translate unavailable — enter manually.', 'warn');
    } finally {
      autoButton.disabled = false;
      autoButton.textContent = 'Auto translate';
    }
  }

  function categoryNameFromButton(button) {
    var label = button && button.querySelector('.pmd-menu-manager__category-label');
    return String(label ? label.textContent : '').trim();
  }

  function editGlyph() {
    return '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 20h4l11-11-4-4L4 16v4z"></path><path d="m13.5 6.5 4 4"></path></svg>';
  }

  function installEditTriggers() {
    var manager = document.querySelector('[data-pmd-menu-manager]');
    if (!manager) return;
    manager.querySelectorAll('[data-pmd-category-filter][data-pmd-category-id][data-pmd-category-kind="regular"]').forEach(function (button) {
      if (button.querySelector('[data-pmd-category-translation-edit]')) return;
      var edit = document.createElement('span');
      edit.className = 'pmd-category-translation-edit';
      edit.setAttribute('data-pmd-category-translation-edit', button.getAttribute('data-pmd-category-id') || '');
      edit.setAttribute('role', 'button');
      edit.setAttribute('tabindex', '0');
      edit.setAttribute('aria-label', 'Edit category');
      edit.setAttribute('title', 'Edit category');
      edit.innerHTML = editGlyph();
      button.appendChild(edit);
    });
  }

  function scheduleInstallEditTriggers() {
    if (installQueued) return;
    installQueued = true;
    requestAnimationFrame(function () {
      installQueued = false;
      installEditTriggers();
    });
  }

  function prepareCreate() {
    currentCategoryId = 0;
    translations = {};
    ensureUi();
    if (categoryIdInput) categoryIdInput.value = '';
    form.removeAttribute('data-pmd-category-editing');
    window.setTimeout(function () { loadCategory(0); }, 0);
  }

  function openEdit(button) {
    if (!button) return;
    var manager = document.querySelector('[data-pmd-menu-manager]');
    if (!manager || manager.dataset.pmdSortMode !== '0') return;
    var categoryId = Number(button.getAttribute('data-pmd-category-id') || 0) || 0;
    if (!categoryId) return;
    var name = categoryNameFromButton(button);
    var create = manager.querySelector('[data-pmd-category-create]');
    if (!create || create.disabled) return;

    openingEdit = true;
    create.click();
    openingEdit = false;

    currentCategoryId = categoryId;
    ensureUi();
    categoryIdInput.value = String(categoryId);
    form.setAttribute('data-pmd-category-editing', String(categoryId));
    nameInput.value = name;
    if (titleNode) titleNode.textContent = 'Edit category';
    saveButton.textContent = 'Save category';
    loadCategory(categoryId);
  }

  async function refreshCategoryUi(targetCategory) {
    var currentManager = document.querySelector('[data-pmd-menu-manager]');
    if (!currentManager) return;
    var active = currentManager.querySelector('[data-pmd-category-filter].is-active');
    var activeValue = active ? String(active.getAttribute('data-pmd-category-filter') || 'all') : 'all';

    var response = await fetch('/admin/pmdmenus', {
      credentials:'same-origin',
      headers:{'X-Requested-With':'XMLHttpRequest'},
      cache:'no-store'
    });
    if (!response.ok) throw new Error('Saved, but the Menu page could not refresh.');
    var html = await response.text();
    var doc = new DOMParser().parseFromString(html, 'text/html');
    var nextManager = doc.querySelector('[data-pmd-menu-manager]');
    if (!nextManager) throw new Error('Menu refresh payload is incomplete.');

    var notification = document.getElementById('notif-root');
    currentManager.replaceWith(nextManager);
    if (notification) {
      var slot = nextManager.querySelector('[data-pmd-menu-notif-slot]');
      if (slot) slot.replaceWith(notification);
    }

    var nextChoices = doc.querySelector('[data-pmd-menu-category-choices]');
    var liveChoices = modal.querySelector('[data-pmd-menu-category-choices]');
    if (nextChoices && liveChoices) liveChoices.innerHTML = nextChoices.innerHTML;

    installEditTriggers();

    var desired = String(targetCategory || activeValue || 'all');
    var target = nextManager.querySelector('[data-pmd-category-filter="'+desired+'"]') || nextManager.querySelector('[data-pmd-category-filter="all"]');
    if (target) target.click();
  }

  async function saveCategory() {
    if (saveButton.disabled) return;
    if (typeof form.reportValidity === 'function' && !form.reportValidity()) return;

    ensureUi();
    if (sourceInput) sourceInput.value = sourceLocale;
    if (categoryIdInput) categoryIdInput.value = currentCategoryId ? String(currentCategoryId) : '';

    var wasNew = currentCategoryId < 1;
    var formData = new FormData(form);
    saveButton.disabled = true;
    setModalStatus('Saving…', false);

    try {
      var response = await fetch('/admin/pmd-menu-category-content-v1', {
        method:'POST',
        credentials:'same-origin',
        headers:{'Accept':'application/json','X-Requested-With':'XMLHttpRequest'},
        body:formData,
        cache:'no-store'
      });
      var result = await response.json().catch(function () { return {}; });
      if (!response.ok || result.ok === false) throw new Error(result.message || 'Could not save category.');

      await refreshCategoryUi(wasNew ? result.category_id : null);
      setModalStatus('Saved', false);
      var close = modal.querySelector('[data-pmd-menu-close]');
      if (close) close.click();
    } catch (error) {
      setModalStatus(error && error.message ? error.message : 'Could not save category.', true);
    } finally {
      saveButton.disabled = false;
    }
  }

  document.addEventListener('click', function (event) {
    var edit = event.target && event.target.closest && event.target.closest('[data-pmd-category-translation-edit]');
    if (edit) {
      var button = edit.closest('[data-pmd-category-filter][data-pmd-category-id]');
      if (button) {
        event.preventDefault();
        event.stopPropagation();
        openEdit(button);
      }
      return;
    }

    var create = event.target && event.target.closest && event.target.closest('[data-pmd-category-create]');
    if (create && !openingEdit) {
      window.setTimeout(prepareCreate, 0);
      return;
    }

    var tab = event.target && event.target.closest && event.target.closest('[data-pmd-category-translation-tab]');
    if (tab && section && section.contains(tab)) {
      event.preventDefault();
      activeLocale = String(tab.getAttribute('data-pmd-category-translation-tab') || '');
      render();
      return;
    }

    var auto = event.target && event.target.closest && event.target.closest('[data-pmd-category-auto-translate]');
    if (auto && section && section.contains(auto)) {
      event.preventDefault();
      autoTranslate();
    }
  }, true);

  document.addEventListener('click', function (event) {
    if (event.target && event.target.closest && event.target.closest('[data-pmd-menu-save]') === saveButton && !categoryContent.hidden) {
      event.preventDefault();
      event.stopImmediatePropagation();
      saveCategory();
    }
  }, true);

  document.addEventListener('keydown', function (event) {
    var edit = event.target && event.target.closest && event.target.closest('[data-pmd-category-translation-edit]');
    if (!edit || (event.key !== 'Enter' && event.key !== ' ')) return;
    event.preventDefault();
    var button = edit.closest('[data-pmd-category-filter][data-pmd-category-id]');
    if (button) openEdit(button);
  }, true);

  form.addEventListener('input', function (event) {
    var target = event.target;
    if (target && target.hasAttribute && target.hasAttribute('data-pmd-category-translation-target')) {
      translations[String(target.getAttribute('data-pmd-category-translation-target') || '')] = String(target.value || '');
      return;
    }
    if (target === nameInput && section && !section.hidden) {
      section.querySelectorAll('[data-pmd-category-translation-source]').forEach(function (input) {
        input.setAttribute('data-pmd-category-translation-source', String(nameInput.value || '').trim());
      });
    }
  }, true);

  var observer = new MutationObserver(scheduleInstallEditTriggers);
  observer.observe(document.body, {childList:true, subtree:true});

  ensureUi();
  installEditTriggers();
})();