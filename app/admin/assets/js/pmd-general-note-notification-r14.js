/* PMD_GENERAL_NOTE_NOTIFICATION_AUTHORITY_R14
 * Preserve the existing General Staff Note form, suggestion API and POST.
 * Correct the real header actions and portal the existing Bootstrap dialog.
 */
(function () {
  'use strict';
  if (window.PMDGeneralNoteNotificationR14) return;
  var modalId = 'addGeneralStaffNoteModal';
  var iconClose = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">' +
    '<path d="M5 5l14 14M19 5L5 19"></path></svg>';

  function important(node, name, value) {
    if (!node) return;
    if (node.style.getPropertyValue(name) === value && node.style.getPropertyPriority(name) === 'important') return;
    node.style.setProperty(name, value, 'important');
  }
  function notificationButtons() {
    var panel = document.getElementById('notification-panel');
    if (!panel) return;
    var note = panel.querySelector('#notif-note-btn');
    var history = panel.querySelector('#notif-history-link');
    if (note) {
      important(note, 'border', '1px solid #064b3c');
      important(note, 'background', 'linear-gradient(180deg,#0b765e,#075c47)');
      important(note, 'background-image', 'linear-gradient(180deg,#0b765e,#075c47)');
      important(note, 'color', '#fff');
    }
    if (history) {
      important(history, 'border', '1px solid #9fc6b6');
      important(history, 'background', '#eff8f2');
      important(history, 'background-image', 'none');
      important(history, 'color', '#075c47');
    }
  }
  function normalizeModal() {
    var modal = document.getElementById(modalId);
    if (!modal) return null;
    // Moving the ORIGINAL node preserves every existing AJAX and Bootstrap
    // handler. It avoids nav/sidebar stacking and overflow clipping.
    if (modal.parentElement !== document.body) document.body.appendChild(modal);
    modal.setAttribute('data-pmd-general-note-r14', '1');
    var header = modal.querySelector('.modal-header');
    var button = header && (header.querySelector('[data-pmd-r14-note-close]')
      || header.querySelector('[data-bs-dismiss="modal"]')
      || header.querySelector('button'));
    if (button) {
      button.classList.add('pmd-r14-note-close');
      button.classList.remove('btn-close', 'close', 'pmd-note-close-r41', 'pmd-note-close-r42');
      button.removeAttribute('aria-hidden');
      button.setAttribute('aria-label','Close');
      button.setAttribute('type','button');
      button.setAttribute('data-pmd-r14-note-close','');
      if (button.getAttribute('data-pmd-r14-note-icon') !== '1') {
        button.innerHTML = iconClose;
        button.setAttribute('data-pmd-r14-note-icon','1');
      }
    }
    var controls = modal.querySelectorAll('.modal-footer .btn, #generalStaffNoteSubmitBtn');
    controls.forEach(function (node) {
      [
        'height','min-height','max-height','min-width','width','max-width',
        'padding','line-height','border','background','background-color',
        'background-image','color','border-radius','box-shadow','transform'
      ].forEach(function (property) {
        if (node.style.getPropertyValue(property)) node.style.removeProperty(property);
      });
    });
    return modal;
  }
  function boot() {
    var modal = normalizeModal();
    notificationButtons();
    if (!modal) return;
    var $ = window.jQuery || window.$;
    if ($ && $.fn && $.fn.modal) {
      $(modal)
        .off('show.bs.modal.pmdNoteR14 shown.bs.modal.pmdNoteR14 hidden.bs.modal.pmdNoteR14')
        .on('show.bs.modal.pmdNoteR14', function () {
          normalizeModal();
          document.body.classList.add('pmd-general-note-r14-open');
        })
        .on('shown.bs.modal.pmdNoteR14', function () {
          // Legacy inline listeners set blue and malformed button dimensions;
          // normalize after they run without replacing their submit handlers.
          normalizeModal();
          window.requestAnimationFrame(function () { normalizeModal(); });
          window.setTimeout(normalizeModal, 0);
        })
        .on('hidden.bs.modal.pmdNoteR14', function () {
          document.body.classList.remove('pmd-general-note-r14-open');
        });
    }
    document.addEventListener('click', function (event) {
      var node = event.target && event.target.closest ? event.target : null;
      if (!node) return;
      if (node.closest('#notifDropdown,#notif-note-btn,#notif-history-link')) {
        notificationButtons();
        if (node.closest('#notif-note-btn')) normalizeModal();
        return;
      }
      var close = node.closest('#addGeneralStaffNoteModal [data-pmd-r14-note-close]');
      if (close && $ && $.fn && $.fn.modal) {
        event.preventDefault();
        event.stopPropagation();
        $(modal).modal('hide');
      }
    }, true);
    window.PMDGeneralNoteNotificationR14 = {
      version:'14.0.0',normalize:normalizeModal,refreshHeader:notificationButtons,
      audit:function () {
        var current = document.getElementById(modalId);
        return {
          bodyPortaled:!!(current && current.parentElement===document.body),
          closeButtons:current ? current.querySelectorAll('.modal-header [data-pmd-r14-note-close]').length : 0,
          noteButton:!!document.querySelector('#notification-panel #notif-note-btn'),
          historyButton:!!document.querySelector('#notification-panel #notif-history-link'),
          showing:!!(current && current.classList.contains('show'))
        };
      }
    };
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot, {once:true});
  else boot();
})();
