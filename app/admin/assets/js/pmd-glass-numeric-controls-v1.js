/* PMD_GLASS_NUMERIC_CONTROLS_V1_20261019
   Scoped enhancement only. Native number values/names/min/max/step remain
   authoritative; preserves existing form listeners and backend validations.
   Only binds inside the named Food/Discount/Shifts/Settings editors. */
(function () {
  'use strict';
  if (window.PMDGlassNumericControlsV1) return;
  window.PMDGlassNumericControlsV1 = true;

  var rootSelector = [
    // PMD_GLASS_NUMERIC_COMPACT_MONEY_R3_20261019: includes Kitchen Capacity number fields.
    '.pmd-menu-food-glass-v1',
    '.pmd-menu-capacity-card',
    '[data-pmd-combo-modal-content]',
    '[data-pmd-coupon-modal]',
    '[data-pmd-shift-modal]',
    '[data-pmd-team-modal]',
    '#pmd-restaurant-profile',
    '#pmd-frontend-settings',
    '#pmd-devices-page',
    '[data-pmd-device-modal]',
    '#pmd-finance-page',
    '.pmd-settings-inline-modal'
  ].join(',');

  var numberSelector = rootSelector.split(',').map(function (scope) {
    return scope + ' input[type="number"]';
  }).join(',');

  function currency() {
    var node = document.querySelector('[data-pmd-glass-currency-code]');
    var code = String(node && node.getAttribute('data-pmd-glass-currency-code') || '').trim().toUpperCase();
    return /^[A-Z]{3}$/.test(code) ? code : '';
  }

  function precisionOf(value) {
    var text = String(value == null ? '' : value).toLowerCase();
    if (text.indexOf('e-') !== -1) return Math.min(6, Number(text.split('e-')[1]) || 0);
    return Math.min(6, (text.split('.')[1] || '').length);
  }

  function unitFor(input) {
    var name = String(input.name || '').toLowerCase();
    if (/reservation_guarantee_amount_eur/.test(name)) return 'EUR';
    if (/percent|percentage|tax_rate|vat_rate|interest_rate/.test(name)) return '%';
    if (input.hasAttribute('data-pmd-coupon-discount')) {
      var modal = input.closest('[data-pmd-coupon-modal]');
      var currentType = modal && modal.querySelector('[data-pmd-discount-type-input]');
      return String(currentType && currentType.value || 'F').toUpperCase() === 'P' ? '%' : currency();
    }
    if (/service_charge_value/.test(name)) {
      var select = document.querySelector('#pmd-frontend-settings select[name="frontend[service_charge_type]"]');
      return select && String(select.value).toLowerCase() !== 'fixed' ? '%' : currency();
    }
    if (input.hasAttribute('data-option-value-price')) return currency();
    if (/(?:^|[^a-z])(?:price|amount|balance|deposit|fee|cost|subtotal|total|tip|surcharge|charge)(?:[^a-z]|$)/.test(name)) {
      return currency();
    }
    return '';
  }

  function currentBounds(input) {
    var min = input.min === '' ? -Infinity : Number(input.min);
    var max = input.max === '' ? Infinity : Number(input.max);
    return {
      min: Number.isFinite(min) ? min : -Infinity,
      max: Number.isFinite(max) ? max : Infinity
    };
  }

  function refresh(wrap) {
    var input = wrap && wrap.querySelector('input[type="number"]');
    if (!input) return;
    var disabled = Boolean(input.disabled || input.readOnly);
    var limits = currentBounds(input);
    var value = input.value === '' ? NaN : Number(input.value);
    var minus = wrap.querySelector('[data-pmd-numeric-direction="-1"]');
    var plus = wrap.querySelector('[data-pmd-numeric-direction="1"]');
    if (minus) minus.disabled = disabled || (Number.isFinite(value) && value <= limits.min);
    if (plus) plus.disabled = disabled || (Number.isFinite(value) && value >= limits.max);
    var unit = wrap.querySelector('[data-pmd-numeric-unit]');
    var label = unitFor(input);
    if (unit) {
      // PMD_GLASS_NUMERIC_CONTROLS_QA_R2_20261019: no childList writes when unchanged (observer loop guard).
      var caption = label === '%' ? 'Percentage' : 'Currency: ' + label;
      if (unit.textContent !== label) unit.textContent = label;
      if (unit.title !== caption) unit.title = caption;
      if (unit.hidden !== !label) unit.hidden = !label;
    }
    wrap.classList.toggle('pmd-glass-stepper--has-unit', Boolean(label));
    wrap.classList.toggle('pmd-glass-stepper--disabled', disabled);
  }

  function step(input, direction) {
    if (!input || input.disabled || input.readOnly) return;
    var before = input.value;
    var bounds = currentBounds(input);
    var increment = Number(input.step);
    if (!Number.isFinite(increment) || increment <= 0) increment = 1;
    var start = before === '' ? (Number.isFinite(bounds.min) ? bounds.min : 0) : Number(before);
    if (!Number.isFinite(start)) start = Number.isFinite(bounds.min) ? bounds.min : 0;
    try {
      if (before === '') {
        var initial = direction > 0 ? start : start;
        input.value = String(initial);
      }
      if (direction > 0) input.stepUp();
      else input.stepDown();
    } catch (error) {
      var precision = Math.max(precisionOf(input.step), precisionOf(start), precisionOf(bounds.min));
      precision = Math.min(6, precision);
      var next = start + increment * direction;
      next = Math.max(bounds.min, Math.min(bounds.max, next));
      input.value = Number(next.toFixed(precision)).toString();
    }
    if (input.value !== before) {
      input.dispatchEvent(new Event('input', {bubbles:true}));
      input.dispatchEvent(new Event('change', {bubbles:true}));
    }
    refresh(input.closest('.pmd-glass-stepper'));
    input.focus({preventScroll:true});
  }

  function button(direction, caption) {
    var element = document.createElement('button');
    element.type = 'button';
    element.className = 'pmd-glass-stepper__button';
    element.setAttribute('data-pmd-numeric-direction', String(direction));
    element.setAttribute('aria-label', caption);
    element.textContent = direction > 0 ? '+' : '\u2212';
    return element;
  }

  function decorate(input) {
    if (!input || input.dataset.pmdGlassStepperBound === '1') return;
    if (!input.closest(rootSelector) || !input.parentNode) return;
    if (input.closest('.pmd-glass-stepper')) return;
    if (input.hasAttribute('data-pmd-no-stepper')) return;

    var german = String(document.documentElement.lang || '').toLowerCase().indexOf('de') === 0;
    var before = button(-1, german ? 'Wert verringern' : 'Decrease value');
    var after = button(1, german ? 'Wert erhöhen' : 'Increase value');
    var host = document.createElement('div');
    host.className = 'pmd-glass-stepper';
    var center = document.createElement('div');
    center.className = 'pmd-glass-stepper__center';
    var badge = document.createElement('span');
    badge.className = 'pmd-glass-stepper__unit';
    badge.setAttribute('data-pmd-numeric-unit', '');
    badge.setAttribute('aria-hidden', 'true');
    var parent = input.parentNode;
    parent.insertBefore(host, input);
    center.appendChild(input);
    center.appendChild(badge);
    host.appendChild(before);
    host.appendChild(center);
    host.appendChild(after);
    input.dataset.pmdGlassStepperBound = '1';

    before.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      step(input, -1);
    });
    after.addEventListener('click', function (event) {
      event.preventDefault();
      event.stopPropagation();
      step(input, 1);
    });
    input.addEventListener('input', function () { refresh(host); });
    input.addEventListener('change', function () { refresh(host); });
    refresh(host);
  }


  // PMD_FOOD_SERVING_AND_EMPTY_OPTIONS_QA_V5_20261019
  // Serving size is intentionally saved as text (e.g. "350 g", "1 portion").
  // Increment recognized numeric-with-unit text only; preserve custom values.
  function parseServingV5(text) {
    var raw = String(text == null ? '' : text).trim();
    if (!raw) return {empty:true, value:0, unit:'', space:'', fraction:0, comma:false, step:1};
    var match = /^(\d+(?:[.,]\d+)?)(\s*)([\p{L}][\p{L}\s]*)?$/u.exec(raw);
    if (!match) return null;
    var value = Number(match[1].replace(',', '.'));
    if (!Number.isFinite(value) || value < 0) return null;
    var unit = String(match[3] || '').trim();
    var normalized = unit.toLowerCase();
    var step = /^(g|gr|gram|grams|ml|milliliter|milliliters)$/.test(normalized) ? 10
      : /^(kg|kilogram|kilograms|l|liter|liters|litre|litres|oz|lb|lbs)$/.test(normalized) ? 0.1
      : 1;
    var fractionalText = String(match[1]).split(/[.,]/)[1] || '';
    return {
      empty:false, value:value, unit:unit, space:match[2] || '',
      fraction:Math.max(fractionalText.length, step < 1 ? 1 : 0),
      comma:match[1].indexOf(',') !== -1, step:step
    };
  }

  function refreshServingV5(host) {
    var input = host && host.querySelector('input[data-pmd-menu-serving-size]');
    if (!input) return;
    var parsed = parseServingV5(input.value);
    var disabled = input.disabled || input.readOnly;
    var decrease = host.querySelector('[data-pmd-numeric-direction="-1"]');
    var increase = host.querySelector('[data-pmd-numeric-direction="1"]');
    if (decrease) decrease.disabled = disabled || !parsed || parsed.empty || parsed.value <= 0;
    if (increase) increase.disabled = disabled || !parsed;
    host.classList.toggle('pmd-glass-stepper--disabled', Boolean(disabled));
  }

  function stepServingV5(input, direction) {
    if (!input || input.disabled || input.readOnly) return;
    var parsed = parseServingV5(input.value);
    if (!parsed) return;
    if (parsed.empty && direction < 0) return;
    var next = Math.max(0, parsed.value + direction * parsed.step);
    if (next === parsed.value && !parsed.empty) return;
    var digits = Math.min(4, parsed.fraction);
    var value = next.toFixed(digits);
    if (digits === 0) value = String(Math.round(next));
    if (parsed.comma) value = value.replace('.', ',');
    var updated = value + (parsed.unit ? parsed.space + parsed.unit : '');
    if (updated.length > Number(input.maxLength || 64)) return;
    if (input.value !== updated) {
      input.value = updated;
      input.dispatchEvent(new Event('input', {bubbles:true}));
      input.dispatchEvent(new Event('change', {bubbles:true}));
    }
    refreshServingV5(input.closest('.pmd-glass-stepper'));
    if (typeof input.focus === 'function') input.focus({preventScroll:true});
  }

  function decorateServingV5(input) {
    if (!input || input.dataset.pmdGlassServingBound === '1') return;
    if (!input.closest('.pmd-menu-food-glass-v1') || !input.parentElement) return;
    if (input.closest('.pmd-glass-stepper')) return;
    var german = String(document.documentElement.lang || '').toLowerCase().indexOf('de') === 0;
    var host = document.createElement('div');
    host.className = 'pmd-glass-stepper pmd-glass-stepper--serving';
    var center = document.createElement('div');
    center.className = 'pmd-glass-stepper__center';
    var minus = button(-1, german ? 'Portionsgröße verringern' : 'Decrease serving size');
    var plus = button(1, german ? 'Portionsgröße erhöhen' : 'Increase serving size');
    input.parentElement.insertBefore(host, input);
    center.appendChild(input);
    host.appendChild(minus);
    host.appendChild(center);
    host.appendChild(plus);
    input.dataset.pmdGlassServingBound = '1';
    minus.addEventListener('click', function(event) {
      event.preventDefault();
      event.stopPropagation();
      stepServingV5(input, -1);
    });
    plus.addEventListener('click', function(event) {
      event.preventDefault();
      event.stopPropagation();
      stepServingV5(input, 1);
    });
    input.addEventListener('input', function () { refreshServingV5(host); });
    input.addEventListener('change', function () { refreshServingV5(host); });
    refreshServingV5(host);
  }

  var scanQueued = false;
  function scan() {
    scanQueued = false;
    document.querySelectorAll(numberSelector).forEach(decorate);
    document.querySelectorAll('.pmd-menu-food-glass-v1 [data-pmd-menu-serving-size]').forEach(decorateServingV5);
    document.querySelectorAll('.pmd-glass-stepper').forEach(function (host) {
      if (host.classList.contains('pmd-glass-stepper--serving')) refreshServingV5(host);
      else refresh(host);
    });
  }
  function schedule() {
    if (scanQueued) return;
    scanQueued = true;
    window.requestAnimationFrame(scan);
  }

  document.addEventListener('click', function (event) {
    if (event.target && event.target.closest &&
      event.target.closest('[data-pmd-discount-type],[data-pmd-gift-option],[data-pmd-menu-translation-switch]')) {
      window.requestAnimationFrame(scan);
    }
  }, true);
  document.addEventListener('change', function (event) {
    if (event.target && (
      event.target.matches('[data-pmd-discount-type-input]') ||
      event.target.matches('[name="frontend[service_charge_type]"]')
    )) schedule();
  }, true);

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', schedule, {once:true});
  } else schedule();

  var attach = function () {
    if (!document.body) return;
    var observer = new MutationObserver(function (changes) {
      if (changes.some(function (change) { return change.addedNodes.length > 0; })) schedule();
    });
    observer.observe(document.body, {childList:true, subtree:true});
  };
  if (document.body) attach();
  else document.addEventListener('DOMContentLoaded', attach, {once:true});
})();

/* PMD_MENU_TRANSLATION_LEGACY_COLLAPSE_GUARD_V4_20261019
   A previously cached legacy Food translation renderer may still create an
   always-expanded section. Collapse only THAT legacy DOM after it appears.
   The current V2 switcher is never modified. The old translation inputs,
   source/target locale values and Auto Translate handlers remain intact.
*/
(function () {
  'use strict';
  function initialize() {
    var page = document.body && document.body.classList.contains('pmd-menu-manager-page');
    if (!page) return;
    var modal = document.querySelector('[data-pmd-menu-modal]');
    var form = modal && modal.querySelector('[data-pmd-menu-form]');
    if (!modal || !form || form.dataset.pmdTranslationCollapseGuard === '1') return;
    form.dataset.pmdTranslationCollapseGuard = '1';
    var scheduled = false;
    function sync() {
      scheduled = false;
      // PMD_MENU_TRANSLATION_DUPLICATE_RUNTIME_GUARD_V4_20261019: a cached old renderer can coexist briefly with the new
      // renderer. Disable the obsolete translation inputs to avoid duplicate
      // form keys overriding the authoritative language-switcher values.
      var sections = Array.prototype.slice.call(form.querySelectorAll('[data-pmd-menu-content-translations]'));
      var authoritative = sections.some(function (part) {
        return Boolean(part.querySelector('[data-pmd-menu-translation-switch]'));
      });
      sections.forEach(function (section) {
        if (section.querySelector('[data-pmd-menu-translation-switch]')) return;
        if (authoritative) {
          if (!section.hidden) section.hidden = true;
          section.querySelectorAll('[data-pmd-translation-target]').forEach(function (field) {
            if (!field.disabled) field.disabled = true;
          });
          return;
        }
        var tabs = section.querySelector('[data-pmd-menu-translation-tabs]');
        var panels = section.querySelector('[data-pmd-menu-translation-panels]');
        var heading = section.querySelector('.pmd-menu-content-translations__title');
        if (!tabs || !panels || !heading) return;
        var toggle = heading.querySelector('[data-pmd-menu-translation-legacy-switch]');
        if (!toggle) {
          toggle = document.createElement('button');
          toggle.type = 'button';
          toggle.className = 'pmd-menu-translation-switch-v3';
          toggle.setAttribute('data-pmd-menu-translation-legacy-switch', '');
          toggle.setAttribute('aria-expanded','false');
          if (!panels.id) panels.id = 'pmd-menu-legacy-translation-panels-v4';
          toggle.setAttribute('aria-controls', panels.id);
          toggle.innerHTML =
            '<span data-pmd-menu-legacy-switch-label>Languages</span>' +
            '<span class="pmd-menu-translation-switch-v3__direction" data-pmd-menu-legacy-switch-language></span>' +
            '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5"/></svg>';
          heading.insertBefore(toggle,tabs);
          section.dataset.pmdLegacyTranslationOpen = '0';
        }
        var expanded = section.dataset.pmdLegacyTranslationOpen === '1';
        if (tabs.hidden === expanded) tabs.hidden = !expanded;
        if (panels.hidden === expanded) panels.hidden = !expanded;
        if (toggle.getAttribute('aria-expanded') !== String(expanded)) {
          toggle.setAttribute('aria-expanded', String(expanded));
        }
        var language = tabs.querySelector('[aria-pressed="true"]');
        if (!language) language = tabs.querySelector('[data-pmd-translation-tab]');
        var locale = String(language && language.textContent || '').trim();
        var chosen = toggle.querySelector('[data-pmd-menu-legacy-switch-language]');
        if (chosen && chosen.textContent !== locale) chosen.textContent = locale;
      });
    }
    function queue() {
      if (scheduled) return;
      scheduled = true;
      window.requestAnimationFrame(sync);
    }
    document.addEventListener('click',function (event) {
      if (!form.contains(event.target)) return;
      var toggle = event.target.closest && event.target.closest('[data-pmd-menu-translation-legacy-switch]');
      if (toggle) {
        event.preventDefault();
        var section = toggle.closest('[data-pmd-menu-content-translations]');
        if (!section) return;
        section.dataset.pmdLegacyTranslationOpen = section.dataset.pmdLegacyTranslationOpen === '1' ? '0' : '1';
        sync();
        return;
      }
      var tab = event.target.closest && event.target.closest('[data-pmd-translation-tab]');
      var auto = event.target.closest && event.target.closest('[data-pmd-menu-auto-translate]');
      if (tab || auto) {
        var current = event.target.closest('[data-pmd-menu-content-translations]');
        if (current && current.querySelector('[data-pmd-menu-translation-legacy-switch]')) {
          current.dataset.pmdLegacyTranslationOpen = '1';
          queue();
        }
      }
    },true);
    modal.addEventListener('pmd:menu:open',function () {
      form.querySelectorAll('[data-pmd-menu-translation-legacy-switch]').forEach(function (button) {
        var section = button.closest('[data-pmd-menu-content-translations]');
        if (section) section.dataset.pmdLegacyTranslationOpen = '0';
      });
      queue();
    });
    var observer = new MutationObserver(function (changes) {
      if (changes.some(function (change) { return change.addedNodes.length > 0 || change.removedNodes.length > 0; })) {
        queue();
      }
    });
    observer.observe(form,{childList:true,subtree:true});
    queue();
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, {once:true});
  } else initialize();
})();
