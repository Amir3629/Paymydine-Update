(function () {
  'use strict';

  var root = document.querySelector('[data-pmd-owner-page]');
  if (!root) return;

  var actions = root.querySelector('[data-pmd-owner-header-actions]');
  var form = root.querySelector('[data-pmd-owner-form]');
  var save = root.querySelector('[data-pmd-owner-save]');
  var baseline = '';
  var armed = false;
  var notificationObserver = null;

  function setImportant(node, property, value) {
    if (!node) return;
    node.style.setProperty(property, value, 'important');
  }

  function applyNotificationGeometry(notificationRoot) {
    if (!notificationRoot) return;

    var toggle = notificationRoot.querySelector('#notifDropdown');
    if (!toggle) return;

    var bell = toggle.querySelector('#bell-icon');
    var count = toggle.querySelector('#notification-count');

    /*
     * PMD_OWNER_NOTIFICATION_GRID_CENTER_V3
     *
     * Keep the bell in normal grid flow instead of absolutely positioning it.
     * That makes the visual centre identical to the 42x42 button centre even
     * if a legacy notification stylesheet adds offsets elsewhere.
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
    setImportant(notificationRoot, 'overflow', 'visible');

    setImportant(toggle, 'position', 'relative');
    setImportant(toggle, 'display', 'grid');
    setImportant(toggle, 'place-items', 'center');
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
    setImportant(toggle, 'overflow', 'visible');

    if (bell) {
      setImportant(bell, 'position', 'static');
      setImportant(bell, 'left', 'auto');
      setImportant(bell, 'right', 'auto');
      setImportant(bell, 'top', 'auto');
      setImportant(bell, 'bottom', 'auto');
      setImportant(bell, 'display', 'flex');
      setImportant(bell, 'align-items', 'center');
      setImportant(bell, 'justify-content', 'center');
      setImportant(bell, 'width', '20px');
      setImportant(bell, 'height', '20px');
      setImportant(bell, 'margin', '0');
      setImportant(bell, 'padding', '0');
      setImportant(bell, 'line-height', '1');
      setImportant(bell, 'transform', 'none');
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
    }

    if (count) {
      /* Badge belongs to the FRAME corner, never under the bell glyph. */
      setImportant(count, 'position', 'absolute');
      setImportant(count, 'top', '-7px');
      setImportant(count, 'right', '-8px');
      setImportant(count, 'left', 'auto');
      setImportant(count, 'bottom', 'auto');
      setImportant(count, 'z-index', '8');
      setImportant(count, 'margin', '0');
      setImportant(count, 'transform', 'none');
      setImportant(count, 'min-width', '18px');
      setImportant(count, 'height', '18px');
      setImportant(count, 'padding', '0 4px');
      setImportant(count, 'border-radius', '999px');
      setImportant(count, 'line-height', '14px');
      setImportant(count, 'text-align', 'center');
      setImportant(count, 'white-space', 'nowrap');
    }
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

    applyNotificationGeometry(notificationRoot);
  }

  function installNotificationGeometryGuard(notificationRoot) {
    if (!notificationRoot) return;

    if (notificationObserver) {
      notificationObserver.disconnect();
      notificationObserver = null;
    }

    var queued = false;
    notificationObserver = new MutationObserver(function () {
      if (queued) return;
      queued = true;

      window.requestAnimationFrame(function () {
        queued = false;
        applyNotificationGeometry(notificationRoot);
      });
    });

    /*
     * Observe class/child changes only. Observing style would make our own
     * inline geometry writes wake the observer again and could create a loop.
     */
    notificationObserver.observe(notificationRoot, {
      subtree: true,
      attributes: true,
      attributeFilter: ['class'],
      childList: true
    });

    [0, 80, 250, 700, 1400].forEach(function (delay) {
      window.setTimeout(function () {
        applyNotificationGeometry(notificationRoot);
      }, delay);
    });

    window.addEventListener('load', function () {
      applyNotificationGeometry(notificationRoot);
    }, { once: true });
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

    applyNotificationGeometry(notificationRoot);
    installNotificationGeometryGuard(notificationRoot);
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
    version: '3.0.1-notification-grid-center',
    notificationMoved: Boolean(root.querySelector('#notif-root')),
    evaluateDirty: evaluateDirty,
    establishBaseline: establishBaseline,
    applyNotificationGeometry: function () {
      applyNotificationGeometry(document.getElementById('notif-root'));
    },
    dirtyTrackingArmed: function () { return armed; }
  };
})();
