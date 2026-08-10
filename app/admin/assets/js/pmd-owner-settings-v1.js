(function () {
  'use strict';

  var root = document.querySelector('[data-pmd-owner-page]');
  if (!root) return;

  var actions = root.querySelector('[data-pmd-owner-header-actions]');
  var form = root.querySelector('[data-pmd-owner-form]');
  var save = root.querySelector('[data-pmd-owner-save]');
  var baseline = '';
  var armed = false;

  function setImportant(node, property, value) {
    if (!node) return;
    node.style.setProperty(property, value, 'important');
  }

  function normalizeBell(notificationRoot) {
    if (!notificationRoot) return;
    var toggle = notificationRoot.querySelector('#notifDropdown');
    if (!toggle) return;

    toggle.classList.remove('show');
    toggle.setAttribute('aria-expanded', 'false');

    Array.prototype.forEach.call(
      toggle.querySelectorAll('i.fa, i.fas, i.far, i.fal, i.fab'),
      function (node) { node.remove(); }
    );

    var bell = toggle.querySelector('#bell-icon');
    if (!bell) {
      bell = document.createElement('span');
      bell.id = 'bell-icon';
      toggle.insertBefore(bell, toggle.firstChild || null);
    }

    bell.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path></svg>';

    /*
     * PMD_OWNER_NOTIFICATION_TRUE_CENTER_V2
     *
     * Legacy/global admin CSS can leave offsets on the notification anchor or
     * bell span. Use inline !important geometry so the bell's visual centre is
     * exactly the centre of the 42x42 frame on every consolidated owner page.
     * The unread badge remains independently anchored outside the frame.
     */
    setImportant(notificationRoot, 'position', 'relative');
    setImportant(notificationRoot, 'display', 'flex');
    setImportant(notificationRoot, 'align-items', 'center');
    setImportant(notificationRoot, 'justify-content', 'center');
    setImportant(notificationRoot, 'width', '42px');
    setImportant(notificationRoot, 'min-width', '42px');
    setImportant(notificationRoot, 'max-width', '42px');
    setImportant(notificationRoot, 'height', '42px');
    setImportant(notificationRoot, 'min-height', '42px');
    setImportant(notificationRoot, 'max-height', '42px');
    setImportant(notificationRoot, 'margin', '0');
    setImportant(notificationRoot, 'padding', '0');

    setImportant(toggle, 'position', 'relative');
    setImportant(toggle, 'display', 'inline-flex');
    setImportant(toggle, 'align-items', 'center');
    setImportant(toggle, 'justify-content', 'center');
    setImportant(toggle, 'box-sizing', 'border-box');
    setImportant(toggle, 'width', '42px');
    setImportant(toggle, 'min-width', '42px');
    setImportant(toggle, 'max-width', '42px');
    setImportant(toggle, 'height', '42px');
    setImportant(toggle, 'min-height', '42px');
    setImportant(toggle, 'max-height', '42px');
    setImportant(toggle, 'margin', '0');
    setImportant(toggle, 'padding', '0');
    setImportant(toggle, 'left', 'auto');
    setImportant(toggle, 'right', 'auto');
    setImportant(toggle, 'top', 'auto');
    setImportant(toggle, 'bottom', 'auto');
    setImportant(toggle, 'line-height', '1');
    setImportant(toggle, 'text-indent', '0');
    setImportant(toggle, 'transform', 'none');

    setImportant(bell, 'position', 'absolute');
    setImportant(bell, 'left', '50%');
    setImportant(bell, 'top', '50%');
    setImportant(bell, 'right', 'auto');
    setImportant(bell, 'bottom', 'auto');
    setImportant(bell, 'display', 'flex');
    setImportant(bell, 'align-items', 'center');
    setImportant(bell, 'justify-content', 'center');
    setImportant(bell, 'width', '20px');
    setImportant(bell, 'height', '20px');
    setImportant(bell, 'margin', '0');
    setImportant(bell, 'padding', '0');
    setImportant(bell, 'line-height', '1');
    setImportant(bell, 'transform', 'translate(-50%, -50%)');
    setImportant(bell, 'pointer-events', 'none');

    var bellSvg = bell.querySelector('svg');
    if (bellSvg) {
      setImportant(bellSvg, 'display', 'block');
      setImportant(bellSvg, 'width', '20px');
      setImportant(bellSvg, 'height', '20px');
      setImportant(bellSvg, 'margin', '0');
      setImportant(bellSvg, 'padding', '0');
      setImportant(bellSvg, 'transform', 'none');
    }

    var count = toggle.querySelector('#notification-count');
    if (count) {
      setImportant(count, 'position', 'absolute');
      setImportant(count, 'top', '-6px');
      setImportant(count, 'right', '-7px');
      setImportant(count, 'left', 'auto');
      setImportant(count, 'bottom', 'auto');
      setImportant(count, 'margin', '0');
      setImportant(count, 'transform', 'none');
    }
  }

  function installNotification() {
    if (!actions) return;
    var notificationRoot = document.getElementById('notif-root');
    if (!notificationRoot) return;

    notificationRoot.classList.remove('show');
    Array.prototype.forEach.call(
      notificationRoot.querySelectorAll('.dropdown-menu.show'),
      function (menu) {
        menu.classList.remove('show');
        menu.style.removeProperty('display');
      }
    );

    normalizeBell(notificationRoot);

    var slot = actions.querySelector('[data-pmd-owner-notif-slot]');
    if (slot) {
      slot.replaceWith(notificationRoot);
    } else {
      actions.appendChild(notificationRoot);
    }
  }

  function serializeForm() {
    if (!form) return '';
    var data = [];

    Array.prototype.forEach.call(form.elements, function (field) {
      if (!field || !field.name || field.disabled) return;
      if (field.type === 'submit' || field.type === 'button') return;

      var type = String(field.type || '').toLowerCase();
      var value;

      if (type === 'checkbox' || type === 'radio') {
        value = field.checked ? '1' : '0';
      } else if (field.tagName === 'SELECT' && field.multiple) {
        value = Array.prototype.filter.call(field.options, function (option) {
          return option.selected;
        }).map(function (option) {
          return option.value;
        }).join(',');
      } else {
        value = String(field.value == null ? '' : field.value);
      }

      data.push(field.name + '=' + value);
    });

    return data.join('&');
  }

  function setSaveVisible(visible) {
    if (!save) return;
    save.classList.toggle('is-visible', Boolean(visible));
    save.setAttribute('aria-hidden', visible ? 'false' : 'true');
    save.tabIndex = visible ? 0 : -1;
  }

  function evaluateDirty() {
    if (!form || !armed) {
      setSaveVisible(false);
      return;
    }
    setSaveVisible(serializeForm() !== baseline);
  }

  function establishBaseline() {
    if (!form) return;
    baseline = serializeForm();
    armed = true;
    setSaveVisible(false);
  }

  function resetAfterSave() {
    if (!form) return;
    armed = false;
    setSaveVisible(false);
    window.setTimeout(establishBaseline, 80);
  }

  installNotification();

  if (form) {
    setSaveVisible(false);

    form.addEventListener('input', function (event) {
      if (!armed || event.isTrusted !== true) return;
      evaluateDirty();
    }, true);

    form.addEventListener('change', function (event) {
      if (!armed || event.isTrusted !== true) return;
      evaluateDirty();
    }, true);

    form.addEventListener('ajaxDone', resetAfterSave);
    form.addEventListener('ajaxSuccess', resetAfterSave);

    if (window.jQuery) {
      window.jQuery(form).on('ajaxDone ajaxSuccess', resetAfterSave);
    }

    window.requestAnimationFrame(function () {
      window.requestAnimationFrame(function () {
        window.setTimeout(establishBaseline, 80);
      });
    });
  }

  window.PMDOwnerSettingsV1 = {
    version: '2.0.0-notification-true-center',
    notificationMoved: Boolean(root.querySelector('#notif-root')),
    evaluateDirty: evaluateDirty,
    establishBaseline: establishBaseline,
    dirtyTrackingArmed: function () { return armed; }
  };
})();
