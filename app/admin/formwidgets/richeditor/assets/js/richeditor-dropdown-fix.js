/**
 * Rich Editor Dropdown Fix - Bootstrap 5 compatibility
 * Uses custom click handler (Bootstrap Dropdown conflicts with Tooltip on same element).
 */
(function() {
  'use strict';

  function closeAllDropdowns(toolbar) {
    toolbar.querySelectorAll('.dropdown-menu.show, .note-dropdown-menu.show').forEach(function(m) {
      m.classList.remove('show');
      var t = m.closest('.dropdown') && m.closest('.dropdown').querySelector('.dropdown-toggle');
      if (t) { t.classList.remove('show'); t.setAttribute('aria-expanded', 'false'); }
    });
  }

  function fixNoteToolbarDropdowns(toolbar) {
    if (!toolbar) return;
    if (toolbar.dataset.dropdownFix === '1') return;
    toolbar.dataset.dropdownFix = '1';

    var closeHandler = null;
    function scheduleClose() {
      if (closeHandler) return;
      closeHandler = function(ev) {
        if (toolbar.contains(ev.target)) return;
        closeAllDropdowns(toolbar);
        document.removeEventListener('click', closeHandler);
        closeHandler = null;
      };
      setTimeout(function() { document.addEventListener('click', closeHandler); }, 10);
    }

    toolbar.addEventListener('click', function(e) {
      var toggle = e.target.closest('.dropdown-toggle');
      if (!toggle || !toolbar.contains(toggle)) return;
      var dropdown = toggle.closest('.dropdown');
      if (!dropdown) return;
      var menu = dropdown.querySelector('.dropdown-menu, .note-dropdown-menu');
      if (!menu) return;

      e.preventDefault();
      e.stopPropagation();
      e.stopImmediatePropagation();

      var wasShown = menu.classList.contains('show');
      closeAllDropdowns(toolbar);
      if (!wasShown) {
        menu.classList.add('show');
        toggle.classList.add('show');
        toggle.setAttribute('aria-expanded', 'true');
        scheduleClose();
      }
    }, true);
  }

  function ensureDropdownStructure(toolbar) {
    var toggles = toolbar.querySelectorAll('.dropdown-toggle, [data-toggle="dropdown"]');
    toggles.forEach(function(toggle) {
      toggle.removeAttribute('data-bs-toggle');
      toggle.removeAttribute('data-toggle');
      toggle.setAttribute('aria-haspopup', 'true');
      var menu = toggle.closest('.dropdown') && toggle.closest('.dropdown').querySelector('.dropdown-menu, .note-dropdown-menu');
      if (!menu || !menu.classList.contains('show')) {
        toggle.setAttribute('aria-expanded', 'false');
      }
      if (!toggle.closest('.dropdown')) {
        var group = toggle.closest('.note-btn-group');
        if (group && group.querySelector('.dropdown-menu, .note-dropdown-menu')) {
          group.classList.add('dropdown');
        }
      }
    });
  }

  function run() {
    var toolbars = document.querySelectorAll('.note-toolbar');
    toolbars.forEach(function(t) {
      ensureDropdownStructure(t);
      fixNoteToolbarDropdowns(t);
    });
  }

  // Run when DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', run);
  } else {
    run();
  }

  // Re-run when new toolbars appear (Summernote initializes async)
  const observer = new MutationObserver(function() {
    run();
  });
  observer.observe(document.body, { childList: true, subtree: true });

  // Also run after a short delay to catch Summernote's async render
  setTimeout(run, 500);
  setTimeout(run, 1500);
})();
