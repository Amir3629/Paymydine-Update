(function () {
  function q(sel, root) {
    return (root || document).querySelector(sel);
  }

  function qa(sel, root) {
    return Array.prototype.slice.call((root || document).querySelectorAll(sel));
  }

  function setSpan(el, span) {
    if (!el) return;
    el.classList.remove('span-left', 'span-right', 'span-full');
    el.classList.add(span);
  }

  function setLabelText(group, text) {
    if (!group) return;
    var label = q('label.form-label', group);
    if (label) label.textContent = text;
  }

  function removeHelp(group) {
    if (!group) return;
    qa('.help-block', group).forEach(function (n) { n.remove(); });
  }

  function moveAfter(parent, node, afterNode) {
    if (!parent || !node) return;
    if (!afterNode) {
      parent.appendChild(node);
      return;
    }
    if (afterNode.nextSibling) parent.insertBefore(node, afterNode.nextSibling);
    else parent.appendChild(node);
  }

  function isVisible(el) {
    return !!(el && el.offsetParent !== null);
  }

  function getValue(group) {
    if (!group) return '';
    var input = q('input, textarea, select', group);
    if (!input) return '';
    return (input.value || '').trim();
  }

  function applyLayout() {
    var fieldsWrap = q('#form-outside-tabs .form-fields') || q('.form-widget .form-fields');
    if (!fieldsWrap) return;

    var tableNo   = q('[data-field-name="table_no"]', fieldsWrap);
    var posLabel  = q('[data-field-name="pos_table_label"]', fieldsWrap);
    var priority  = q('[data-field-name="priority"]', fieldsWrap);
    var minCap    = q('[data-field-name="min_capacity"]', fieldsWrap);
    var maxCap    = q('[data-field-name="max_capacity"]', fieldsWrap);
    var status    = q('[data-field-name="table_status"]', fieldsWrap);
    var joinable  = q('[data-field-name="is_joinable"]', fieldsWrap);
    var locations = q('[data-field-name="locations"]', fieldsWrap);
    var extraCap  = q('[data-field-name="extra_capacity"]', fieldsWrap);

    if (!tableNo || !priority || !minCap || !maxCap || !status || !joinable || !locations || !extraCap) {
      return;
    }

    setLabelText(tableNo, 'Table Number');
    setLabelText(priority, 'Priority');
    setLabelText(minCap, 'Minimum Capacity');
    setLabelText(maxCap, 'Maximum Capacity');
    setLabelText(status, 'Status');
    setLabelText(joinable, 'Is Joinable');
    setLabelText(locations, 'Location(s)');
    setLabelText(extraCap, 'Extra Capacity');

    removeHelp(tableNo);
    if (posLabel) removeHelp(posLabel);

    var posValue = getValue(posLabel);
    var isPosEdit = isVisible(posLabel) && posValue !== '';

    if (isPosEdit) {
      setSpan(tableNo,  'span-left');
      setSpan(posLabel, 'span-right');
      setSpan(priority, 'span-left');
      setSpan(locations,'span-right');
      setSpan(minCap,   'span-left');
      setSpan(maxCap,   'span-right');
      setSpan(status,   'span-left');
      setSpan(joinable, 'span-right');
      setSpan(extraCap, 'span-full');

      fieldsWrap.appendChild(tableNo);
      fieldsWrap.appendChild(posLabel);
      fieldsWrap.appendChild(priority);
      fieldsWrap.appendChild(locations);
      fieldsWrap.appendChild(minCap);
      fieldsWrap.appendChild(maxCap);
      fieldsWrap.appendChild(status);
      fieldsWrap.appendChild(joinable);
      fieldsWrap.appendChild(extraCap);
    } else {
      if (posLabel) {
        posLabel.style.display = 'none';
        posLabel.classList.add('hidden');
      }

      setSpan(tableNo,  'span-left');
      setSpan(priority, 'span-right');
      setSpan(minCap,   'span-left');
      setSpan(maxCap,   'span-right');
      setSpan(status,   'span-left');
      setSpan(joinable, 'span-right');
      setSpan(locations,'span-left');
      setSpan(extraCap, 'span-right');

      fieldsWrap.appendChild(tableNo);
      fieldsWrap.appendChild(priority);
      fieldsWrap.appendChild(minCap);
      fieldsWrap.appendChild(maxCap);
      fieldsWrap.appendChild(status);
      fieldsWrap.appendChild(joinable);
      fieldsWrap.appendChild(locations);
      fieldsWrap.appendChild(extraCap);
    }
  }

  function boot() {
    applyLayout();
    setTimeout(applyLayout, 150);
    setTimeout(applyLayout, 500);
    setTimeout(applyLayout, 1200);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

  document.addEventListener('ajaxComplete', function () {
    boot();
  });

  var mo = new MutationObserver(function () {
    boot();
  });

  window.addEventListener('load', function () {
    var target = q('.form-widget') || document.body;
    if (target) {
      mo.observe(target, { childList: true, subtree: true });
    }
  });
})();
