// PMD_MENU_CONTENT_TRANSLATIONS_ADMIN_V1
(function () {
  'use strict';

  var path = String((window.PMDAdminCanonicalURLR81E ? window.PMDAdminCanonicalURLR81E.logicalPath() : window.location.pathname) || '').replace(/\/+$/, '');
  if (path !== '/admin/menu' && path !== '/admin/pmdmenus') return;

  var modal = document.querySelector('[data-pmd-menu-modal]');
  var form = modal && modal.querySelector('[data-pmd-menu-form]');
  if (!modal || !form) return;

  var menuIdInput = form.querySelector('[data-pmd-menu-id]');
  var nameInput = form.querySelector('[data-pmd-menu-name]');
  var descriptionInput = form.querySelector('[data-pmd-menu-description]');
  var section = null;
  var panels = null;
  var tabs = null;
  var autoButton = null;
  var statusNode = null;
  var marker = null;
  var defaultLocale = 'en';
  var enabledLocales = ['en'];
  var targetLocales = [];
  var activeLocale = '';
  var payload = {menus:{}, categories:{}};
  var values = {};
  var loadRun = 0;
  var refreshTimer = 0;

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
    return languageNames[locale] || locale.toUpperCase();
  }

  function isRtl(locale) {
    return ['ar','fa','he','ur'].indexOf(localeBase(locale)) !== -1;
  }

  function escapeNamePart(value) {
    return String(value == null ? '' : value).replace(/[^0-9]/g, '');
  }

  function ensureState(locale) {
    if (!values[locale]) values[locale] = {menu:{name:'', description:''}, categories:{}, options:{}};
    return values[locale];
  }

  function payloadMenu() {
    var id = String(Number(menuIdInput && menuIdInput.value || 0) || 0);
    return payload && payload.menus && payload.menus[id] ? payload.menus[id] : null;
  }

  function loadPayloadIntoState() {
    values = {};
    targetLocales.forEach(function (locale) {
      var state = ensureState(locale);
      var menu = payloadMenu();
      var menuTranslation = menu && menu.translations && menu.translations[locale] || {};
      state.menu.name = String(menuTranslation.name || '');
      state.menu.description = String(menuTranslation.description || '');

      var categories = payload && payload.categories || {};
      Object.keys(categories).forEach(function (categoryId) {
        var translated = categories[categoryId] && categories[categoryId].translations && categories[categoryId].translations[locale];
        if (translated) state.categories[categoryId] = String(translated);
      });

      var optionRows = menu && menu.options || {};
      Object.keys(optionRows).forEach(function (groupIndex) {
        var row = optionRows[groupIndex] || {};
        if (!state.options[groupIndex]) state.options[groupIndex] = {name:'', values:{}};
        state.options[groupIndex].name = String(row.translations && row.translations[locale] || '');
        Object.keys(row.values || {}).forEach(function (valueIndex) {
          state.options[groupIndex].values[valueIndex] = String(row.values[valueIndex].translations && row.values[valueIndex].translations[locale] || '');
        });
      });
    });
  }

  function ensureUi() {
    if (section && section.isConnected) return;

    var detailsSection = nameInput && nameInput.closest('.pmd-menu-form__section');
    var optionsSection = form.querySelector('[data-pmd-menu-options-builder]');
    if (!detailsSection) return;

    section = document.createElement('section');
    section.className = 'pmd-menu-form__section pmd-menu-content-translations';
    section.setAttribute('data-pmd-menu-content-translations', '');
    section.hidden = true;
    section.innerHTML = '' +
      '<div class="pmd-menu-content-translations__head">' +
        '<div class="pmd-menu-content-translations__title"><h3>Translations</h3><div data-pmd-menu-translation-tabs></div></div>' +
        '<div class="pmd-menu-content-translations__actions"><button type="button" data-pmd-menu-auto-translate>Auto translate</button><span data-pmd-menu-translation-status></span></div>' +
      '</div>' +
      '<div data-pmd-menu-translation-panels></div>';

    if (optionsSection && optionsSection.parentNode === detailsSection.parentNode) {
      optionsSection.parentNode.insertBefore(section, optionsSection);
    } else {
      detailsSection.insertAdjacentElement('afterend', section);
    }

    tabs = section.querySelector('[data-pmd-menu-translation-tabs]');
    panels = section.querySelector('[data-pmd-menu-translation-panels]');
    autoButton = section.querySelector('[data-pmd-menu-auto-translate]');
    statusNode = section.querySelector('[data-pmd-menu-translation-status]');

    marker = form.querySelector('input[name="pmd_menu_translations_present"]');
    if (!marker) {
      marker = document.createElement('input');
      marker.type = 'hidden';
      marker.name = 'pmd_menu_translations_present';
      marker.value = '1';
      form.appendChild(marker);
    }
  }

  function selectedCategories() {
    return Array.prototype.slice.call(form.querySelectorAll('input[name="category_ids[]"]:checked')).map(function (input) {
      var label = input.closest('label');
      var name = label && label.querySelector('b');
      return {id:String(Number(input.value || 0) || 0), name:String(name && name.textContent || '').trim()};
    }).filter(function (row) { return row.id !== '0' && row.name; });
  }

  function sourceOptions() {
    var groups = {};
    Array.prototype.slice.call(form.querySelectorAll('input[name^="options["]')).forEach(function (input) {
      var name = String(input.name || '');
      var groupMatch = name.match(/^options\[(\d+)\]\[name\]$/);
      if (groupMatch) {
        var g = groupMatch[1];
        if (!groups[g]) groups[g] = {name:'', values:{}};
        groups[g].name = String(input.value || '').trim();
        return;
      }
      var valueMatch = name.match(/^options\[(\d+)\]\[values\]\[(\d+)\]\[name\]$/);
      if (valueMatch) {
        var groupIndex = valueMatch[1];
        var valueIndex = valueMatch[2];
        if (!groups[groupIndex]) groups[groupIndex] = {name:'', values:{}};
        groups[groupIndex].values[valueIndex] = String(input.value || '').trim();
      }
    });
    return groups;
  }

  function field(labelText, inputName, value, sourceText, multiline, locale, statePath) {
    var label = document.createElement('label');
    label.className = 'pmd-menu-content-translations__field';
    var caption = document.createElement('span');
    caption.textContent = labelText;
    label.appendChild(caption);

    var control = multiline ? document.createElement('textarea') : document.createElement('input');
    if (!multiline) control.type = 'text';
    if (multiline) control.rows = 3;
    control.name = inputName;
    control.value = value || '';
    control.maxLength = multiline ? 5000 : 160;
    control.dir = isRtl(locale) ? 'rtl' : 'auto';
    control.setAttribute('data-pmd-translation-target', locale);
    control.setAttribute('data-pmd-translation-source', sourceText || '');
    control.setAttribute('data-pmd-translation-state-path', statePath);
    label.appendChild(control);
    return label;
  }

  function setStatePath(locale, path, value) {
    var state = ensureState(locale);
    var parts = String(path || '').split('.');
    if (parts[0] === 'menu') {
      state.menu[parts[1]] = value;
      return;
    }
    if (parts[0] === 'categories') {
      state.categories[parts[1]] = value;
      return;
    }
    if (parts[0] === 'options') {
      var g = parts[1];
      if (!state.options[g]) state.options[g] = {name:'', values:{}};
      if (parts[2] === 'name') state.options[g].name = value;
      if (parts[2] === 'values') state.options[g].values[parts[3]] = value;
    }
  }

  function renderLocalePanel(locale) {
    var state = ensureState(locale);
    var panel = document.createElement('div');
    panel.className = 'pmd-menu-content-translations__panel';
    panel.setAttribute('data-pmd-translation-panel', locale);
    panel.hidden = locale !== activeLocale;

    var menuBlock = document.createElement('div');
    menuBlock.className = 'pmd-menu-content-translations__block';
    menuBlock.appendChild(field(
      'Food name',
      'pmd_translations['+locale+'][menu][name]',
      state.menu.name,
      String(nameInput && nameInput.value || '').trim(),
      false,
      locale,
      'menu.name'
    ));
    menuBlock.appendChild(field(
      'Description',
      'pmd_translations['+locale+'][menu][description]',
      state.menu.description,
      String(descriptionInput && descriptionInput.value || '').trim(),
      true,
      locale,
      'menu.description'
    ));
    panel.appendChild(menuBlock);

    var categories = selectedCategories();
    if (categories.length) {
      var categoryBlock = document.createElement('div');
      categoryBlock.className = 'pmd-menu-content-translations__block';
      var heading = document.createElement('strong');
      heading.className = 'pmd-menu-content-translations__subhead';
      heading.textContent = 'Categories';
      categoryBlock.appendChild(heading);
      var categoryGrid = document.createElement('div');
      categoryGrid.className = 'pmd-menu-content-translations__compact-grid';
      categories.forEach(function (category) {
        categoryGrid.appendChild(field(
          category.name,
          'pmd_translations['+locale+'][categories]['+escapeNamePart(category.id)+'][name]',
          state.categories[category.id] || '',
          category.name,
          false,
          locale,
          'categories.'+category.id
        ));
      });
      categoryBlock.appendChild(categoryGrid);
      panel.appendChild(categoryBlock);
    }

    var groups = sourceOptions();
    var groupKeys = Object.keys(groups).filter(function (key) { return groups[key].name; });
    if (groupKeys.length) {
      var optionBlock = document.createElement('div');
      optionBlock.className = 'pmd-menu-content-translations__block';
      var optionHeading = document.createElement('strong');
      optionHeading.className = 'pmd-menu-content-translations__subhead';
      optionHeading.textContent = 'Sides & options';
      optionBlock.appendChild(optionHeading);

      groupKeys.forEach(function (groupIndex) {
        var group = groups[groupIndex];
        if (!state.options[groupIndex]) state.options[groupIndex] = {name:'', values:{}};
        var card = document.createElement('div');
        card.className = 'pmd-menu-content-translations__option';
        card.appendChild(field(
          group.name,
          'pmd_translations['+locale+'][options]['+groupIndex+'][name]',
          state.options[groupIndex].name || '',
          group.name,
          false,
          locale,
          'options.'+groupIndex+'.name'
        ));
        Object.keys(group.values).filter(function (key) { return group.values[key]; }).forEach(function (valueIndex) {
          card.appendChild(field(
            group.values[valueIndex],
            'pmd_translations['+locale+'][options]['+groupIndex+'][values]['+valueIndex+'][name]',
            state.options[groupIndex].values[valueIndex] || '',
            group.values[valueIndex],
            false,
            locale,
            'options.'+groupIndex+'.values.'+valueIndex
          ));
        });
        optionBlock.appendChild(card);
      });
      panel.appendChild(optionBlock);
    }

    return panel;
  }

  function render() {
    ensureUi();
    if (!section || !tabs || !panels) return;

    targetLocales = enabledLocales.filter(function (locale) { return locale && locale !== defaultLocale; });
    if (!targetLocales.length) {
      section.hidden = true;
      if (marker) marker.disabled = true;
      return;
    }

    if (targetLocales.indexOf(activeLocale) === -1) activeLocale = targetLocales[0];
    section.hidden = false;
    if (marker) marker.disabled = false;

    tabs.textContent = '';
    targetLocales.forEach(function (locale) {
      var button = document.createElement('button');
      button.type = 'button';
      button.className = 'pmd-menu-content-translations__tab';
      button.setAttribute('data-pmd-translation-tab', locale);
      button.setAttribute('aria-pressed', locale === activeLocale ? 'true' : 'false');
      button.textContent = localeLabel(locale);
      tabs.appendChild(button);
    });

    panels.textContent = '';
    targetLocales.forEach(function (locale) { panels.appendChild(renderLocalePanel(locale)); });
  }

  function scheduleRender() {
    window.clearTimeout(refreshTimer);
    refreshTimer = window.setTimeout(render, 40);
  }

  function setStatus(text, kind) {
    if (!statusNode) return;
    statusNode.textContent = text || '';
    statusNode.className = 'pmd-menu-content-translations__status' + (kind ? ' is-'+kind : '');
  }

  function splitTranslateChunks(text) {
    var clean = String(text || '').trim();
    if (!clean) return [];
    if (clean.length <= 420) return [clean];
    var chunks = [];
    var remaining = clean;
    while (remaining.length) {
      if (remaining.length <= 420) { chunks.push(remaining); break; }
      var cut = remaining.lastIndexOf(' ', 420);
      if (cut < 220) cut = 420;
      chunks.push(remaining.slice(0, cut).trim());
      remaining = remaining.slice(cut).trim();
    }
    return chunks.filter(Boolean);
  }

  async function translateChunk(text, source, target) {
    var myMemory = 'https://api.mymemory.translated.net/get?q='+encodeURIComponent(text)+'&langpair='+encodeURIComponent(source+'|'+target);
    try {
      var response = await fetch(myMemory, {method:'GET', mode:'cors', credentials:'omit'});
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
    var output = [];
    for (var i = 0; i < chunks.length; i++) output.push(await translateChunk(chunks[i], source, target));
    return output.join(' ').trim();
  }

  async function autoTranslate() {
    if (!activeLocale || !section || !autoButton) return;
    var controls = Array.prototype.slice.call(section.querySelectorAll('[data-pmd-translation-panel="'+activeLocale+'"] [data-pmd-translation-target]'));
    var empty = controls.filter(function (control) {
      return !String(control.value || '').trim() && String(control.getAttribute('data-pmd-translation-source') || '').trim();
    });
    if (!empty.length) {
      setStatus('Nothing empty to translate.', 'good');
      return;
    }

    autoButton.disabled = true;
    autoButton.textContent = 'Translating…';
    setStatus('', '');

    try {
      for (var i = 0; i < empty.length; i++) {
        var control = empty[i];
        var sourceText = String(control.getAttribute('data-pmd-translation-source') || '').trim();
        var translated = await translateText(sourceText, defaultLocale, activeLocale);
        control.value = translated;
        setStatePath(activeLocale, control.getAttribute('data-pmd-translation-state-path'), translated);
      }
      setStatus('Translated ✓ Review before saving.', 'good');
    } catch (error) {
      setStatus('Auto translate unavailable — enter manually.', 'warn');
    } finally {
      autoButton.disabled = false;
      autoButton.textContent = 'Auto translate';
    }
  }

  async function loadForCurrentFood() {
    var run = ++loadRun;
    ensureUi();
    setStatus('', '');
    var menuId = String(Number(menuIdInput && menuIdInput.value || 0) || 0);
    try {
      var url = '/api/v1/menu-content-translations' + (menuId !== '0' ? '?menu_id='+encodeURIComponent(menuId) : '');
      var response = await fetch(url, {credentials:'same-origin', headers:{'Accept':'application/json'}, cache:'no-store'});
      if (!response.ok) throw new Error('translations');
      var data = await response.json();
      if (run !== loadRun) return;
      payload = data && data.data ? data.data : data || {};
      defaultLocale = localeBase(payload.default_locale || 'en') || 'en';
      enabledLocales = Array.isArray(payload.enabled_locales) ? payload.enabled_locales.map(localeBase).filter(Boolean) : [defaultLocale];
      if (enabledLocales.indexOf(defaultLocale) === -1) enabledLocales.unshift(defaultLocale);
      targetLocales = enabledLocales.filter(function (locale) { return locale !== defaultLocale; });
      activeLocale = targetLocales[0] || '';
      loadPayloadIntoState();
      render();
    } catch (error) {
      if (run !== loadRun) return;
      defaultLocale = 'en';
      enabledLocales = ['en'];
      targetLocales = [];
      values = {};
      render();
    }
  }

  document.addEventListener('click', function (event) {
    var tab = event.target && event.target.closest && event.target.closest('[data-pmd-translation-tab]');
    if (tab && section && section.contains(tab)) {
      activeLocale = String(tab.getAttribute('data-pmd-translation-tab') || '');
      render();
      return;
    }
    if (event.target === autoButton || (event.target && event.target.closest && event.target.closest('[data-pmd-menu-auto-translate]') === autoButton)) {
      autoTranslate();
      return;
    }

    var optionAction = event.target && event.target.closest && event.target.closest('[data-pmd-option-group-add],[data-pmd-option-value-add],[data-pmd-option-group-remove],[data-pmd-option-value-remove]');
    if (optionAction && form.contains(optionAction)) scheduleRender();
  }, true);

  form.addEventListener('input', function (event) {
    var target = event.target;
    if (!(target instanceof HTMLInputElement) && !(target instanceof HTMLTextAreaElement) && !(target instanceof HTMLSelectElement)) return;
    if (target.hasAttribute('data-pmd-translation-target')) {
      setStatePath(
        String(target.getAttribute('data-pmd-translation-target') || ''),
        String(target.getAttribute('data-pmd-translation-state-path') || ''),
        String(target.value || '')
      );
      return;
    }
    if (target === nameInput || target === descriptionInput || String(target.name || '').indexOf('options[') === 0) scheduleRender();
  }, true);

  form.addEventListener('change', function (event) {
    var target = event.target;
    if (target && target.matches && target.matches('input[name="category_ids[]"]')) scheduleRender();
  }, true);

  modal.addEventListener('pmd:menu:open', function () { window.setTimeout(loadForCurrentFood, 80); });

  var modalObserver = new MutationObserver(function () {
    if (!modal.hidden && modal.getAttribute('aria-hidden') !== 'true') window.setTimeout(loadForCurrentFood, 100);
  });
  modalObserver.observe(modal, {attributes:true, attributeFilter:['hidden','aria-hidden']});

  ensureUi();
})();
