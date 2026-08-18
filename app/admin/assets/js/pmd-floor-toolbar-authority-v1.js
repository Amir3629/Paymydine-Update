/* ============================================================
   PMD_FLOOR_TOOLBAR_AUTHORITY_V1

   Presentation-only authority for the clean shared Floor toolbar.
   - removes the redundant standalone Fit / Full Floor button
   - gives the row/full toggle the former Fit icon
   - labels the edit action "Edit layout" / "Layout bearbeiten"

   No Floor data, layout persistence, table lifecycle, polling or business
   behavior is changed here.
   ============================================================ */
(function () {
  'use strict';

  var ROUTES = {
    '/admin/dashboardlab': true,
    '/admin/managerlab': true,
    '/admin/reservationslab': true,
    '/admin/cashierlab': true
  };

  var path = String(window.location.pathname || '').replace(/\/+$/, '');
  if (!ROUTES[path]) return;

  var FIT_ICON =
    '<path d="M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3"></path>';

  function locale() {
    return String(
      window.PMD_ADMIN_LOCALE ||
      document.documentElement.getAttribute('lang') ||
      'en'
    ).toLowerCase();
  }

  function editLabel() {
    return locale().indexOf('de') === 0
      ? 'Layout bearbeiten'
      : 'Edit layout';
  }

  function apply() {
    var toolbar = document.getElementById('pmd-r2-floor-toolbar-v316');
    if (!toolbar) {
      return {
        toolbarFound: false,
        fitRemoved: false,
        stripUpdated: false,
        editUpdated: false
      };
    }

    var fit = toolbar.querySelector('[data-pmd-r2-tool="fit"]');
    var fitRemoved = false;
    if (fit) {
      fit.remove();
      fitRemoved = true;
    } else {
      fitRemoved = true;
    }

    var strip = toolbar.querySelector('[data-pmd-r2-tool="strip"]');
    var stripUpdated = false;
    if (strip) {
      var stripSvg = strip.querySelector('svg');
      if (stripSvg) {
        stripSvg.setAttribute('viewBox', '0 0 24 24');
        stripSvg.setAttribute('fill', 'none');
        stripSvg.setAttribute('stroke', 'currentColor');
        stripSvg.setAttribute('stroke-width', '2');
        stripSvg.setAttribute('stroke-linecap', 'round');
        stripSvg.setAttribute('stroke-linejoin', 'round');
        stripSvg.innerHTML = FIT_ICON;
      }

      var stripTextNode = strip.querySelector('span');
      var stripText = String(
        (stripTextNode && stripTextNode.textContent) ||
        strip.getAttribute('title') ||
        strip.getAttribute('aria-label') ||
        ''
      ).trim();

      if (stripText) {
        strip.setAttribute('aria-label', stripText);
        strip.setAttribute('title', stripText);
        strip.setAttribute('data-bs-original-title', stripText);
      }

      stripUpdated = Boolean(stripSvg);
    }

    var edit = toolbar.querySelector('[data-pmd-r2-tool="edit"]');
    var editUpdated = false;
    if (edit) {
      var label = editLabel();
      edit.setAttribute('aria-label', label);
      edit.setAttribute('title', label);
      edit.setAttribute('data-bs-original-title', label);

      var editText = edit.querySelector('span');
      if (editText) editText.textContent = label;
      editUpdated = true;
    }

    return {
      toolbarFound: true,
      fitRemoved: fitRemoved,
      stripUpdated: stripUpdated,
      editUpdated: editUpdated
    };
  }

  window.PMDFloorToolbarAuthorityV1 = {
    version: '1.0.0',
    apply: apply,
    audit: function () {
      var toolbar = document.getElementById('pmd-r2-floor-toolbar-v316');
      var fit = toolbar && toolbar.querySelector('[data-pmd-r2-tool="fit"]');
      var strip = toolbar && toolbar.querySelector('[data-pmd-r2-tool="strip"]');
      var edit = toolbar && toolbar.querySelector('[data-pmd-r2-tool="edit"]');
      var stripPath = strip && strip.querySelector('svg path');
      var editText = edit && edit.querySelector('span');

      return {
        version: '1.0.0',
        route: path,
        toolbarFound: Boolean(toolbar),
        fitRemoved: !fit,
        stripUsesFitIcon: Boolean(
          stripPath &&
          stripPath.getAttribute('d') ===
            'M8 3H5a2 2 0 0 0-2 2v3M16 3h3a2 2 0 0 1 2 2v3M8 21H5a2 2 0 0 1-2-2v-3M16 21h3a2 2 0 0 0 2-2v-3'
        ),
        editLabel: editText ? String(editText.textContent || '').trim() : null,
        ok: Boolean(
          toolbar &&
          !fit &&
          stripPath &&
          editText &&
          String(editText.textContent || '').trim() === editLabel()
        )
      };
    }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', apply, { once: true });
  } else {
    apply();
  }

  document.addEventListener('pageContentLoaded', apply, false);
  window.addEventListener('pageshow', apply, false);
})();
