(function () {
  'use strict';

  var root = document.querySelector('[data-pmd-owner-page]');
  if (!root) return;

  var actions = root.querySelector('[data-pmd-owner-header-actions]');
  var form = root.querySelector('[data-pmd-owner-form]');
  var save = root.querySelector('[data-pmd-owner-save]');
  var baseline = '';
  var armed = false;

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
    version: '1.0.0',
    notificationMoved: Boolean(root.querySelector('#notif-root')),
    evaluateDirty: evaluateDirty,
    establishBaseline: establishBaseline,
    dirtyTrackingArmed: function () { return armed; }
  };
})();
