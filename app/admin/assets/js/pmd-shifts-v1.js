(function () {
  'use strict';

  function one(selector, root) { return (root || document).querySelector(selector); }
  function all(selector, root) { return Array.prototype.slice.call((root || document).querySelectorAll(selector)); }
  function value(selector, next, root) { var el = one(selector, root); if (el) el.value = next == null ? '' : String(next); }
  function scrollToForm(form) { if (form) form.scrollIntoView({ behavior: 'smooth', block: 'start' }); }

  document.addEventListener('click', function (event) {
    var editPerson = event.target.closest('[data-pmd-edit-person]');
    if (editPerson) {
      var personForm = one('[data-pmd-person-form]');
      value('[data-pmd-person-id]', editPerson.dataset.id, personForm);
      value('[data-pmd-person-name]', editPerson.dataset.name, personForm);
      value('[data-pmd-person-department]', editPerson.dataset.department, personForm);
      value('[data-pmd-person-role]', editPerson.dataset.role, personForm);
      value('[data-pmd-person-station]', editPerson.dataset.station, personForm);
      value('[data-pmd-person-staff]', editPerson.dataset.staff || '0', personForm);
      scrollToForm(personForm);
      return;
    }

    if (event.target.closest('[data-pmd-person-clear]')) {
      var clearPerson = one('[data-pmd-person-form]');
      if (clearPerson) clearPerson.reset();
      value('[data-pmd-person-id]', '', clearPerson);
      return;
    }

    var editShift = event.target.closest('[data-pmd-edit-shift]');
    if (editShift) {
      var shiftForm = one('[data-pmd-shift-form]');
      value('[data-pmd-shift-id]', editShift.dataset.id, shiftForm);
      value('[data-pmd-shift-date]', editShift.dataset.date, shiftForm);
      value('[data-pmd-shift-label]', editShift.dataset.label, shiftForm);
      value('[data-pmd-shift-start]', editShift.dataset.start, shiftForm);
      value('[data-pmd-shift-end]', editShift.dataset.end, shiftForm);
      var selected = String(editShift.dataset.people || '').split(',').filter(Boolean);
      all('[data-pmd-shift-person]', shiftForm).forEach(function (input) {
        input.checked = selected.indexOf(String(input.value)) !== -1;
      });
      scrollToForm(shiftForm);
      return;
    }

    if (event.target.closest('[data-pmd-shift-clear]')) {
      var clearShift = one('[data-pmd-shift-form]');
      if (clearShift) clearShift.reset();
      value('[data-pmd-shift-id]', '', clearShift);
      return;
    }

    var preset = event.target.closest('[data-pmd-shift-preset]');
    if (preset) {
      var form = one('[data-pmd-shift-form]');
      var type = preset.getAttribute('data-pmd-shift-preset');
      if (type === 'lunch') {
        value('[data-pmd-shift-label]', 'Lunch', form); value('[data-pmd-shift-start]', '11:00', form); value('[data-pmd-shift-end]', '16:00', form);
      } else if (type === 'dinner') {
        value('[data-pmd-shift-label]', 'Dinner', form); value('[data-pmd-shift-start]', '17:00', form); value('[data-pmd-shift-end]', '23:00', form);
      } else if (type === 'full') {
        value('[data-pmd-shift-label]', 'Full day', form); value('[data-pmd-shift-start]', '10:00', form); value('[data-pmd-shift-end]', '23:00', form);
      }
    }
  });

  var etaCustom = one('.pmd-shifts__eta-custom');
  if (etaCustom) {
    etaCustom.addEventListener('focus', function () {
      var customRadio = one('[data-pmd-eta-presets] input[name="extension_preset"][value="0"]');
      if (customRadio) customRadio.checked = true;
    });
  }
})();
