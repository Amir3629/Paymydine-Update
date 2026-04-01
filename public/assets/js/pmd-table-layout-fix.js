(function () {
  function q(sel, root) { return (root || document).querySelector(sel); }
  function qa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

  function setSpan(el, span) {
    if (!el) return;
    ['span-left','span-right','span-full'].forEach(c => el.classList.remove(c));
    el.classList.add(span);
  }

  function clearHelp(group) {
    if (!group) return;
    qa('.help-block', group).forEach(n => n.remove());
  }

  function fixSelectWidth(group) {
    if (!group) return;
    qa('.ss-content,.ss-main', group).forEach(n => {
      n.style.width = '';
      n.style.maxWidth = '';
      n.style.minWidth = '';
    });
  }

  function moveAfter(node, afterNode) {
    if (!node || !afterNode || !afterNode.parentNode) return;
    if (afterNode.nextElementSibling !== node) {
      afterNode.parentNode.insertBefore(node, afterNode.nextElementSibling);
    }
  }

  function run() {
    const fields = q('#form-outside-tabs .form-fields') || q('.form-widget .form-fields');
    if (!fields) return false;

    const tableNo   = q('[data-field-name="table_no"]', fields);
    const posLabel  = q('[data-field-name="pos_table_label"]', fields);
    const priority  = q('[data-field-name="priority"]', fields);
    const minCap    = q('[data-field-name="min_capacity"]', fields);
    const maxCap    = q('[data-field-name="max_capacity"]', fields);
    const status    = q('[data-field-name="table_status"]', fields);
    const joinable  = q('[data-field-name="is_joinable"]', fields);
    const locations = q('[data-field-name="locations"]', fields);

    if (!tableNo || !priority) return false;

    clearHelp(tableNo);
    if (posLabel) clearHelp(posLabel);

    const posInput = posLabel ? q('input,textarea', posLabel) : null;
    const posValue = posInput ? String(posInput.value || '').trim() : '';
    const hasPos = !!posValue;

    if (hasPos && posLabel) {
      // ردیف اول
      setSpan(tableNo, 'span-left');
      setSpan(posLabel, 'span-right');

      // ردیف دوم
      setSpan(priority, 'span-left');
      if (locations) {
        setSpan(locations, 'span-right');
        moveAfter(locations, priority);
        fixSelectWidth(locations);
      }

      // ردیف‌های بعدی
      if (minCap) setSpan(minCap, 'span-left');
      if (maxCap) setSpan(maxCap, 'span-right');
      if (status) setSpan(status, 'span-left');
      if (joinable) setSpan(joinable, 'span-right');

      // متن اضافی زیر Table Number حذف شود
      const lbl = q('label', tableNo);
      if (lbl && lbl.textContent.trim() !== 'Table Number') lbl.textContent = 'Table Number';
    } else {
      if (posLabel) posLabel.style.display = 'none';
      setSpan(tableNo, 'span-left');
      setSpan(priority, 'span-right');
      if (locations) setSpan(locations, 'span-full');
    }

    return true;
  }

  let n = 0;
  const t = setInterval(() => {
    n++;
    try { run(); } catch (e) {}
    if (n > 40) clearInterval(t);
  }, 250);

  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(run, 100);
    setTimeout(run, 500);
    setTimeout(run, 1200);
  });

  document.addEventListener('ajaxComplete', () => {
    setTimeout(run, 100);
    setTimeout(run, 500);
    setTimeout(run, 1200);
  });
})();
