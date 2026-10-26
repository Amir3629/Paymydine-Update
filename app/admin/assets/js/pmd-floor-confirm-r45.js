/* PMD_FLOOR_CONFIRM_R45
 * One in-platform destructive confirmation for Floor and Table.
 * Browser-native confirm() is intentionally not used.
 * No fetches, data writes or role changes; caller owns the actual POST.
 */
(function () {
  'use strict';
  if (window.PMDFloorConfirmR45) return;

  var active = null;

  function open(options) {
    options = options || {};
    if (active) return Promise.resolve(false);

    return new Promise(function (resolve) {
      var previousFocus = options.trigger || document.activeElement;
      var layer = document.createElement('div');
      layer.className = 'pmd-r45-confirm-layer';
      layer.setAttribute('data-pmd-r45-confirm', '');
      var backdrop = document.createElement('div');
      backdrop.className = 'pmd-r45-confirm-backdrop';
      backdrop.setAttribute('aria-hidden', 'true');
      var box = document.createElement('section');
      box.className = 'pmd-r45-confirm-card';
      box.setAttribute('role', 'alertdialog');
      box.setAttribute('aria-modal', 'true');
      box.setAttribute('aria-labelledby', 'pmd-r45-confirm-title');
      box.setAttribute('aria-describedby', 'pmd-r45-confirm-message');

      var header = document.createElement('header');
      header.className = 'pmd-r45-confirm-heading';
      var title = document.createElement('h2');
      title.id = 'pmd-r45-confirm-title';
      title.textContent = String(options.title || 'Confirm removal');
      var close = document.createElement('button');
      close.type = 'button';
      close.className = 'pmd-r45-confirm-close';
      close.setAttribute('aria-label', 'Close confirmation');
      close.textContent = '×';
      header.appendChild(title);
      header.appendChild(close);

      var message = document.createElement('p');
      message.id = 'pmd-r45-confirm-message';
      message.className = 'pmd-r45-confirm-message';
      message.textContent = String(options.message || 'Proceed with this change?');

      var actions = document.createElement('footer');
      actions.className = 'pmd-r45-confirm-actions';
      var cancel = document.createElement('button');
      cancel.type = 'button';
      cancel.className = 'pmd-r45-confirm-cancel';
      cancel.textContent = 'Cancel';
      var submit = document.createElement('button');
      submit.type = 'button';
      submit.className = 'pmd-r45-confirm-submit';
      submit.textContent = String(options.confirmLabel || 'Remove');
      actions.appendChild(cancel);
      actions.appendChild(submit);
      box.appendChild(header);
      box.appendChild(message);
      box.appendChild(actions);
      layer.appendChild(backdrop);
      layer.appendChild(box);

      var settled = false;
      function done(accepted) {
        if (settled) return;
        settled = true;
        document.removeEventListener('keydown', onKey, true);
        layer.remove();
        active = null;
        if (previousFocus && document.contains(previousFocus) &&
            typeof previousFocus.focus === 'function') {
          previousFocus.focus({preventScroll:true});
        }
        resolve(Boolean(accepted));
      }

      function onKey(event) {
        if (event.key === 'Escape') {
          event.preventDefault();
          event.stopImmediatePropagation();
          done(false);
        } else if (event.key === 'Tab') {
          var items = [close, cancel, submit];
          var current = items.indexOf(document.activeElement);
          var direction = event.shiftKey ? -1 : 1;
          var next = items[(current + direction + items.length) % items.length];
          event.preventDefault();
          next.focus();
        }
      }

      close.addEventListener('click', function () { done(false); });
      cancel.addEventListener('click', function () { done(false); });
      backdrop.addEventListener('click', function () { done(false); });
      submit.addEventListener('click', function () { done(true); });
      active = {layer: layer, cancel: function () { done(false); }};
      document.body.appendChild(layer);
      document.addEventListener('keydown', onKey, true);
      cancel.focus({preventScroll:true});
    });
  }

  window.PMDFloorConfirmR45 = {open:open, version:'45.0.0'};
})();
