/* PMD_GLASS_NUMERIC_CONTROLS_V1_20261019
   Scoped enhancement only. Native number values/names/min/max/step remain
   authoritative; preserves existing form listeners and backend validations.
   Only binds inside the named Food/Discount/Shifts/Settings editors. */
(function () {
  'use strict';
  if (window.PMDGlassNumericControlsV1) return;
  window.PMDGlassNumericControlsV1 = true;

  var rootSelector = [
    '.pmd-menu-food-glass-v1',
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
      unit.textContent = label;
      unit.title = label === '%' ? 'Percentage' : 'Currency: ' + label;
      unit.hidden = !label;
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

  var scanQueued = false;
  function scan() {
    scanQueued = false;
    document.querySelectorAll(numberSelector).forEach(decorate);
    document.querySelectorAll('.pmd-glass-stepper').forEach(refresh);
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