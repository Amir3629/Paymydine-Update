(function () {
  'use strict';
  var input = document.querySelector('[data-pmd-menu-prep-time]');
  var field = document.querySelector('[data-pmd-prep-field]');
  if (!input || !field) return;
  var presets = Array.prototype.slice.call(field.querySelectorAll('[data-pmd-prep-preset]'));
  var custom = field.querySelector('[data-pmd-prep-custom]');
  var customWrap = field.querySelector('[data-pmd-prep-custom-wrap]');

  function active(button) {
    presets.forEach(function (item) { item.classList.toggle('is-active', item === button); item.setAttribute('aria-pressed', item === button ? 'true' : 'false'); });
    if (custom) { custom.classList.toggle('is-active', button === null); custom.setAttribute('aria-pressed', button === null ? 'true' : 'false'); }
    if (customWrap) customWrap.hidden = button !== null;
  }

  function sync() {
    var value = Number(input.value || 0);
    var match = null;
    presets.some(function (button) {
      var stored = Number(button.getAttribute('data-store') || 0);
      if (value === stored) { match = button; return true; }
      return false;
    });
    active(match);
  }

  presets.forEach(function (button) {
    button.addEventListener('click', function () {
      input.value = String(Math.max(1, Number(button.getAttribute('data-store') || 15)));
      active(button);
      input.dispatchEvent(new Event('change', {bubbles: true}));
    });
  });
  if (custom) custom.addEventListener('click', function () { active(null); input.focus(); });
  input.addEventListener('input', function () { if (!customWrap || !customWrap.hidden) active(null); });

  // The canonical Menu Manager fills/resets the number input before opening the
  // modal. Sync after those existing create/edit click handlers without owning
  // any save logic ourselves.
  document.addEventListener('click', function (event) {
    if (event.target.closest('[data-pmd-menu-edit], [data-pmd-menu-create], [data-pmd-menu-primary-create]')) {
      setTimeout(sync, 0);
    }
  });
  sync();
  window.PMDPrepTimeLabel = function (minutes) {
    var value = Number(minutes || 0);
    if (value === 10) return '5–10 min';
    if (value === 20) return '10–20 min';
    if (value === 30) return '20–30 min';
    if (value === 45) return '30–45 min';
    return value > 0 ? ('~' + Math.round(value) + ' min') : '';
  };
})();
