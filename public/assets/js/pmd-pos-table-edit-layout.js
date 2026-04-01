(function () {
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function setSpan(el, span) {
    if (!el) return;
    el.classList.remove('span-left', 'span-right', 'span-full');
    el.classList.add(span);
  }

  function isPosEditPage() {
    var posGroup = qs('[data-field-name="pos_table_label"]');
    if (!posGroup) return false;
    if (posGroup.offsetParent === null) return false;
    var input = qs('input, textarea', posGroup);
    if (!input) return false;
    return String(input.value || '').trim() !== '';
  }

  function runFix() {
    if (!isPosEditPage()) return;

    var fieldsWrap = qs('#form-outside-tabs .form-fields') || qs('.form-fields');
    if (!fieldsWrap) return;

    var tableNo   = qs('[data-field-name="table_no"]', fieldsWrap);
    var posLabel  = qs('[data-field-name="pos_table_label"]', fieldsWrap);
    var priority  = qs('[data-field-name="priority"]', fieldsWrap);
    var locations = qs('[data-field-name="locations"]', fieldsWrap);
    if (!tableNo || !posLabel || !priority || !locations) return;

    setSpan(tableNo, 'span-left');
    setSpan(posLabel, 'span-right');
    setSpan(priority, 'span-left');
    setSpan(locations, 'span-right');

    var help = qs('.help-block', tableNo);
    if (help) help.remove();

    if (priority.nextElementSibling !== locations) {
      fieldsWrap.insertBefore(locations, priority.nextElementSibling);
    }
  }

  document.addEventListener('DOMContentLoaded', function () {
    runFix();
    setTimeout(runFix, 150);
    setTimeout(runFix, 500);
    setTimeout(runFix, 1200);
  });

  document.addEventListener('ajaxPromise', function () {
    setTimeout(runFix, 150);
    setTimeout(runFix, 500);
  });
})();
