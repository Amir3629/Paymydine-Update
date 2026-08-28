(function () {
  'use strict';
  function one(sel, root) { return (root || document).querySelector(sel); }
  function all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  document.addEventListener('click', function (event) {
    var toggle = event.target.closest('[data-pmd-shifts-toggle]');
    if (toggle) {
      var target = document.getElementById(toggle.getAttribute('data-pmd-shifts-toggle'));
      if (target) target.hidden = !target.hidden;
      return;
    }
    var add = event.target.closest('[data-pmd-shift-date]');
    if (add) {
      var form = one('#shift-form');
      if (!form) return;
      form.hidden = false;
      var date = one('[data-pmd-shift-date-input]', form);
      if (date) date.value = add.getAttribute('data-pmd-shift-date') || '';
      form.scrollIntoView({behavior: 'smooth', block: 'nearest'});
      return;
    }
    var cancel = event.target.closest('[data-pmd-shift-cancel]');
    if (cancel) {
      var shiftForm = one('#shift-form');
      if (shiftForm) shiftForm.hidden = true;
      return;
    }
    var preset = event.target.closest('[data-pmd-shift-preset]');
    if (preset) {
      var root = one('#shift-form');
      if (!root) return;
      var label = one('[data-pmd-shift-label]', root);
      var start = one('[data-pmd-shift-start]', root);
      var end = one('[data-pmd-shift-end]', root);
      if (label) label.value = preset.getAttribute('data-pmd-shift-preset') || '';
      if (start) start.value = preset.getAttribute('data-start') || '';
      if (end) end.value = preset.getAttribute('data-end') || '';
    }
  });
  var custom = one('.pmd-shifts__custom-min');
  if (custom) {
    custom.addEventListener('focus', function () {
      var radio = one('input[name="extension_minutes"][value="0"]');
      if (radio) radio.checked = true;
    });
  }
  all('[data-pmd-eta-presets] input[type="radio"]').forEach(function (radio) {
    radio.addEventListener('change', function () {
      if (custom) custom.disabled = radio.value !== '0';
    });
  });
  var selected = one('[data-pmd-eta-presets] input[type="radio"]:checked');
  if (custom && selected) custom.disabled = selected.value !== '0';
})();
