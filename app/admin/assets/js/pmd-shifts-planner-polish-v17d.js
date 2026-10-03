/* PMD_SHIFTS_PLANNER_POLISH_V17D */
(function () {
  'use strict';

  if (!/^\/admin\/shifts\/?$/.test(window.location.pathname)) return;

  var root = document.querySelector('[data-pmd-shifts-root]');
  if (!root) return;

  var modal = root.querySelector('[data-pmd-shift-modal]');
  if (!modal) return;

  var breakInput = modal.querySelector('[data-pmd-shift-break]');
  var breakOptions = modal.querySelector('[data-pmd-break-options-v17c]');
  var breakChoices = breakOptions && breakOptions.querySelector('.pmd-shifts-break-options-v17c__buttons');
  var customRow = breakOptions && breakOptions.querySelector('[data-pmd-break-custom-v17c]');
  var oldCustomButton = breakOptions && breakOptions.querySelector('[data-pmd-break-custom-open-v17c]');

  if (!breakInput || !breakOptions || !breakChoices || !customRow) return;

  var locale = String(window.PMD_ADMIN_LOCALE || document.documentElement.lang || 'en').toLowerCase();
  var customText = locale.indexOf('de') === 0 ? 'Eigene' : (locale.indexOf('tr') === 0 ? 'Özel' : 'Custom');

  if (oldCustomButton) oldCustomButton.remove();

  customRow.hidden = false;
  customRow.classList.add('pmd-shifts-break-custom-v17d');
  customRow.setAttribute('data-pmd-break-custom-v17d', '1');

  breakInput.hidden = false;
  breakInput.removeAttribute('aria-hidden');
  breakInput.setAttribute('min', '0');
  breakInput.setAttribute('max', '240');
  breakInput.setAttribute('step', '1');
  breakInput.setAttribute('inputmode', 'numeric');
  breakInput.setAttribute('aria-label', customText + ' pause minutes');

  if (!customRow.querySelector('.pmd-shifts-break-custom-v17d__label')) {
    var label = document.createElement('span');
    label.className = 'pmd-shifts-break-custom-v17d__label';
    label.textContent = customText;
    customRow.insertBefore(label, breakInput);
  }

  if (!customRow.querySelector('.pmd-shifts-break-custom-v17d__suffix')) {
    var suffix = document.createElement('span');
    suffix.className = 'pmd-shifts-break-custom-v17d__suffix';
    suffix.textContent = 'min';
    customRow.appendChild(suffix);
  }

  breakChoices.appendChild(customRow);

  function clamp(value) {
    var number = Number(value);
    if (!Number.isFinite(number)) number = 0;
    return Math.max(0, Math.min(240, Math.round(number)));
  }

  function keepCustomVisible() {
    customRow.hidden = false;
    breakInput.hidden = false;
    var normalized = clamp(breakInput.value);
    if (String(breakInput.value) !== String(normalized)) breakInput.value = String(normalized);
  }

  modal.addEventListener('click', function (event) {
    if (event.target.closest('[data-pmd-break-choice-v17c]')) {
      window.setTimeout(keepCustomVisible, 0);
    }
  });

  breakInput.addEventListener('input', function () {
    window.setTimeout(keepCustomVisible, 0);
  });
  breakInput.addEventListener('change', keepCustomVisible);

  root.addEventListener('click', function (event) {
    if (event.target.closest('[data-pmd-person-slot-create], [data-pmd-shift-open], [data-pmd-shift-manage]')) {
      window.setTimeout(keepCustomVisible, 0);
    }
  });

  keepCustomVisible();

  console.info('[PMD Shifts Planner Polish V17D] Ready', {
    pauseRow: 'single-line-with-live-custom-field',
    slotHover: false,
    slotPlus: false
  });
})();
