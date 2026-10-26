/* PMD_GENERAL_STAFF_NOTE_STABLE_CALENDAR_CARD_R15
 * Enhance the ORIGINAL Staff Note Bootstrap modal without replacing its
 * form, request handlers, CSRF, suggestions or submission state.
 * R41/R42/R14 and legacy top-menu styles are deliberately tolerated.
 */
(function () {
  'use strict';
  if (window.PMDGeneralStaffNoteR15) return;

  var MODAL_ID = 'addGeneralStaffNoteModal';
  var SELECTOR = '#' + MODAL_ID;

  function cssImportant(node, key, value) {
    if (node) node.style.setProperty(key, value, 'important');
  }

  function brandHeader() {
    var panel = document.getElementById('notification-panel');
    if (!panel) return;
    var note = panel.querySelector('#notif-note-btn');
    var history = panel.querySelector('#notif-history-link');
    if (note) {
      cssImportant(note, 'border', '1px solid #064b3c');
      cssImportant(note, 'background', 'linear-gradient(180deg,#0b765e,#075c47)');
      cssImportant(note, 'background-image', 'linear-gradient(180deg,#0b765e,#075c47)');
      cssImportant(note, 'color', '#fff');
    }
    if (history) {
      cssImportant(history, 'border', '1px solid #9fc6b6');
      cssImportant(history, 'background', '#eff8f2');
      cssImportant(history, 'background-image', 'none');
      cssImportant(history, 'color', '#075c47');
    }
  }

  function prepareModal() {
    var modal = document.getElementById(MODAL_ID);
    if (!modal) return null;
    // The old fade / slide animations conflict with the overlay equalizer.
    // This note card is immediate (same static open/close as Owner Hour Note).
    modal.classList.remove('fade');
    modal.setAttribute('data-pmd-general-note-r15', '1');
    modal.setAttribute('data-pmd-general-note-r14', '1');
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    if (modal.parentElement !== document.body) {
      document.body.appendChild(modal);
    }

    var header = modal.querySelector('.modal-header');
    if (header) {
      // The R41 SVG and R42 span have both been hidden by competing global
      // rules in Safari. One new text-glyph close is fully independent.
      var close = header.querySelector('[data-pmd-r15-note-close]');
      if (!close) {
        close = document.createElement('button');
        close.type = 'button';
        close.className = 'pmd-r15-note-close';
        close.setAttribute('data-pmd-r15-note-close', '1');
        close.setAttribute('aria-label', 'Close note');
        close.textContent = '\u00d7';
        header.appendChild(close);
      }
      header.querySelectorAll('button:not([data-pmd-r15-note-close])').forEach(function (obsolete) {
        obsolete.hidden = true;
        obsolete.tabIndex = -1;
        obsolete.setAttribute('aria-hidden','true');
        cssImportant(obsolete, 'display', 'none');
      });
    }

    var cancel = modal.querySelector('.modal-footer .btn-secondary');
    if (cancel && !cancel.querySelector('[data-pmd-r15-cancel-label]')) {
      // A real text span cannot be cut by the legacy icon/pseudo-element rules.
      cancel.textContent = '';
      var label = document.createElement('span');
      label.setAttribute('data-pmd-r15-cancel-label','');
      label.textContent = 'Cancel';
      cancel.appendChild(label);
    }
    return modal;
  }

  function closeNote(modal) {
    var $ = window.jQuery || window.$;
    if ($ && $.fn && typeof $.fn.modal === 'function') {
      $(modal).modal('hide');
      return;
    }
    if (window.bootstrap && window.bootstrap.Modal) {
      window.bootstrap.Modal.getOrCreateInstance(modal).hide();
    }
  }

  function afterShown() {
    prepareModal();
    window.requestAnimationFrame(function () {
      prepareModal();
    });
  }

  function init() {
    var modal = prepareModal();
    brandHeader();
    if (!modal) return;

    var $ = window.jQuery || window.$;
    if ($ && $.fn && typeof $.fn.modal === 'function') {
      $(modal)
        .off('.pmdGeneralNoteR15')
        .on('show.bs.modal.pmdGeneralNoteR15', function () {
          prepareModal();
          document.body.classList.add('pmd-general-note-r14-open');
        })
        .on('shown.bs.modal.pmdGeneralNoteR15', afterShown)
        .on('hidden.bs.modal.pmdGeneralNoteR15', function () {
          document.body.classList.remove('pmd-general-note-r14-open');
        });
    }

    document.addEventListener('click', function (event) {
      var target = event.target && event.target.closest ? event.target : null;
      if (!target) return;
      if (target.closest('#notif-note-btn')) {
        // Prepare synchronously, before the existing top_menu handler invokes
        // .modal('show'), avoiding any glimpse of the old animated shell.
        prepareModal();
        brandHeader();
        return;
      }
      if (target.closest('#notifDropdown, #notif-history-link')) {
        brandHeader();
        return;
      }
      if (!target.closest(SELECTOR + ' [data-pmd-r15-note-close]')) return;
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      closeNote(modal);
    }, true);

    var api = {
      version:'15.0.0',
      normalize:prepareModal,
      refreshHeader:brandHeader,
      audit:function () {
        var m = document.getElementById(MODAL_ID);
        var close = m && m.querySelector('[data-pmd-r15-note-close]');
        var cancel = m && m.querySelector('[data-pmd-r15-cancel-label]');
        function paint(el) {
          if (!el) return null;
          var css = window.getComputedStyle(el);
          var bounds = el.getBoundingClientRect();
          return {
            display:css.display,
            visibility:css.visibility,
            color:css.color,
            fontSize:css.fontSize,
            transform:css.transform,
            animation:css.animationName,
            width:Math.round(bounds.width),
            height:Math.round(bounds.height)
          };
        }
        return {
          portaled:!!(m && m.parentElement === document.body),
          hasFade:!!(m && m.classList.contains('fade')),
          closeButtonCount:m ? m.querySelectorAll('[data-pmd-r15-note-close]').length : 0,
          visibleCloseText:close && close.textContent.trim(),
          cancelText:cancel && cancel.textContent.trim(),
          originalFormPreserved:!!(m && m.querySelector('#addGeneralStaffNoteForm')),
          originalSubmitPreserved:!!(m && m.querySelector('#generalStaffNoteSubmitBtn')),
          noteButton:!!document.getElementById('notif-note-btn'),
          historyButton:!!document.getElementById('notif-history-link'),
          competingPlaneCount:m ? m.querySelectorAll('.pmd-console-global-modal-plane').length : 0,
          closePaint:paint(close),
          cancelPaint:paint(cancel),
          cardPaint:paint(m && m.querySelector('.modal-content'))
        };
      }
    };
    window.PMDGeneralStaffNoteR15 = api;
    window.PMDGeneralNoteNotificationR14 = api;
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, {once:true});
  } else init();
})();
