(function () {
  'use strict';

  var root = document.querySelector('[data-pmd-shifts-root]');
  var modal = document.querySelector('[data-pmd-shift-modal]');
  if (!root || !modal) return;

  var form = modal.querySelector('[data-pmd-shift-form]');
  var title = modal.querySelector('[data-pmd-shift-modal-title]');
  var idInput = modal.querySelector('[data-pmd-shift-id]');
  var dateInput = modal.querySelector('[data-pmd-shift-date-input]');
  var labelInput = modal.querySelector('[data-pmd-shift-label]');
  var startInput = modal.querySelector('[data-pmd-shift-start]');
  var endInput = modal.querySelector('[data-pmd-shift-end]');
  var notesInput = modal.querySelector('[data-pmd-shift-notes]');
  var personInputs = Array.prototype.slice.call(modal.querySelectorAll('[data-pmd-shift-person]'));
  var lastTrigger = null;

  function setScrollLock(locked) {
    document.documentElement.style.overflow = locked ? 'hidden' : '';
    document.body.style.overflow = locked ? 'hidden' : '';
  }

  function clearPresets() {
    modal.querySelectorAll('[data-pmd-shift-preset]').forEach(function (button) {
      button.classList.remove('is-active');
    });
  }

  function resetForm(date) {
    if (form) form.reset();
    if (idInput) idInput.value = '';
    if (dateInput) dateInput.value = date || '';
    if (labelInput) labelInput.value = 'Dinner';
    if (startInput) startInput.value = '';
    if (endInput) endInput.value = '';
    if (notesInput) notesInput.value = '';
    personInputs.forEach(function (input) { input.checked = false; });
    clearPresets();
  }

  function openModal(trigger, values) {
    lastTrigger = trigger || null;
    values = values || {};
    resetForm(values.date || new Date().toISOString().slice(0, 10));

    if (values.id && idInput) idInput.value = values.id;
    if (values.label && labelInput) labelInput.value = values.label;
    if (values.start !== undefined && startInput) startInput.value = values.start || '';
    if (values.end !== undefined && endInput) endInput.value = values.end || '';
    if (values.notes !== undefined && notesInput) notesInput.value = values.notes || '';
    if (title) title.textContent = values.id ? 'Edit shift' : 'Add shift';

    var selectedPeople = String(values.people || '')
      .split(',')
      .map(function (value) { return value.trim(); })
      .filter(Boolean);
    personInputs.forEach(function (input) {
      input.checked = selectedPeople.indexOf(String(input.value)) !== -1;
    });

    modal.hidden = false;
    modal.setAttribute('aria-hidden', 'false');
    setScrollLock(true);
    window.setTimeout(function () {
      if (labelInput) labelInput.focus();
    }, 0);
  }

  function closeModal() {
    modal.hidden = true;
    modal.setAttribute('aria-hidden', 'true');
    setScrollLock(false);
    if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
    lastTrigger = null;
  }

  function valuesFromTrigger(trigger) {
    return {
      id: trigger.getAttribute('data-id') || '',
      date: trigger.getAttribute('data-date') || '',
      label: trigger.getAttribute('data-label') || '',
      start: trigger.getAttribute('data-start') || '',
      end: trigger.getAttribute('data-end') || '',
      notes: trigger.getAttribute('data-notes') || '',
      people: trigger.getAttribute('data-people') || ''
    };
  }

  document.addEventListener('click', function (event) {
    var add = event.target.closest('[data-pmd-shift-open]');
    if (add) {
      event.preventDefault();
      openModal(add, {date: add.getAttribute('data-date') || ''});
      return;
    }

    var edit = event.target.closest('[data-pmd-shift-edit]');
    if (edit) {
      event.preventDefault();
      openModal(edit, valuesFromTrigger(edit));
      return;
    }

    var close = event.target.closest('[data-pmd-shift-close]');
    if (close) {
      event.preventDefault();
      closeModal();
      return;
    }

    var preset = event.target.closest('[data-pmd-shift-preset]');
    if (preset) {
      event.preventDefault();
      clearPresets();
      preset.classList.add('is-active');
      if (labelInput) labelInput.value = preset.getAttribute('data-pmd-shift-preset') || 'Shift';
      if (startInput) startInput.value = preset.getAttribute('data-start') || '';
      if (endInput) endInput.value = preset.getAttribute('data-end') || '';
    }
  });

  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && !modal.hidden) closeModal();
  });
})();
