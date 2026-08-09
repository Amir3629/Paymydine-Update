(function () {
  'use strict';

  var root = document.querySelector('[data-pmd-menu-checkout]');
  var form = document.getElementById('pmd-menu-checkout-form');
  var actions = root ? root.querySelector('[data-pmd-menu-header-actions]') : null;
  var baseline = '';
  var dirtyTrackingArmed = false;

  if (!root || !form || !actions) return;

  function serializeForm() {
    var data = [];

    Array.prototype.forEach.call(form.elements, function (field) {
      if (!field || !field.name || field.disabled) return;

      if (field.type === 'checkbox' || field.type === 'radio') {
        data.push(field.name + '=' + (field.checked ? '1' : '0'));
        return;
      }

      data.push(field.name + '=' + String(field.value == null ? '' : field.value));
    });

    return data.sort().join('&');
  }

  function setDirty(isDirty) {
    document.documentElement.classList.toggle('pmd-menu-dirty', Boolean(isDirty));
  }

  function evaluateDirty() {
    if (!dirtyTrackingArmed) return;
    setDirty(serializeForm() !== baseline);
  }

  function establishBaseline() {
    baseline = serializeForm();
    dirtyTrackingArmed = true;
    setDirty(false);
  }

  function installNotification() {
    var notificationRoot = document.getElementById('notif-root');
    if (!notificationRoot) return;

    notificationRoot.classList.remove('show');

    var toggle = notificationRoot.querySelector('#notifDropdown');
    if (toggle) {
      toggle.classList.remove('show');
      toggle.setAttribute('aria-expanded', 'false');

      Array.prototype.forEach.call(
        toggle.querySelectorAll('i.fa, i.fas, i.far'),
        function (node) { node.remove(); }
      );

      var oldBell = toggle.querySelector('#bell-icon');
      if (oldBell) oldBell.remove();

      var bell = document.createElement('span');
      bell.id = 'bell-icon';
      bell.setAttribute('aria-hidden', 'true');
      bell.innerHTML = '<svg viewBox="0 0 24 24"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"></path><path d="M10 21h4"></path></svg>';
      toggle.insertBefore(bell, toggle.firstChild);
    }

    Array.prototype.forEach.call(
      notificationRoot.querySelectorAll('.dropdown-menu.show'),
      function (menu) {
        menu.classList.remove('show');
        menu.style.removeProperty('display');
      }
    );

    actions.appendChild(notificationRoot);
  }

  installNotification();

  form.addEventListener('input', function (event) {
    if (!dirtyTrackingArmed || event.isTrusted !== true) return;
    evaluateDirty();
  }, true);

  form.addEventListener('change', function (event) {
    if (!dirtyTrackingArmed || event.isTrusted !== true) return;
    evaluateDirty();
  }, true);

  form.addEventListener('ajaxSuccess', function () {
    dirtyTrackingArmed = false;
    setDirty(false);

    window.setTimeout(function () {
      establishBaseline();
    }, 80);
  });

  document.documentElement.classList.remove('pmd-menu-booting');
  document.documentElement.classList.add('pmd-menu-ready');

  window.requestAnimationFrame(function () {
    window.requestAnimationFrame(function () {
      window.setTimeout(establishBaseline, 80);
    });
  });

  window.PMDMenuCheckoutV1 = {
    version: '1.0.0',
    evaluateDirty: evaluateDirty,
    establishBaseline: establishBaseline,
    dirtyTrackingArmed: function () { return dirtyTrackingArmed; },
    notificationRightmost: Boolean(document.querySelector('#pmd-menu-header #notif-root'))
  };
})();
