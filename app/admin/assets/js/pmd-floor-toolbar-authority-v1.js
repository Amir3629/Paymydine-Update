/* ============================================================
   PMD_FLOOR_TOOLBAR_AUTHORITY_V2

   Presentation-only authority for the clean shared Floor toolbar.
   - removes the redundant standalone Fit / Full Floor button
   - keeps one row/full floor as ONE icon-only toggle
   - shows inward arrows while Full Floor is active (action: One row)
   - shows outward arrows while One row is active (action: Full Floor)
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

  /* Action icon while the current view is One row: expand back to Full Floor. */
  var EXPAND_ICON =
    '<path d="M9 9 4 4M4 4h4M4 4v4"></path>' +
    '<path d="M15 9 20 4M20 4h-4M20 4v4"></path>' +
    '<path d="M9 15 4 20M4 20h4M4 20v-4"></path>' +
    '<path d="M15 15 20 20M20 20h-4M20 20v-4"></path>';

  /* Action icon while the current view is Full Floor: collapse into One row. */
  var COLLAPSE_ICON =
    '<path d="M4 4l5 5M9 5v4H5"></path>' +
    '<path d="M20 4l-5 5M15 5v4h4"></path>' +
    '<path d="M4 20l5-5M5 15h4v4"></path>' +
    '<path d="M20 20l-5-5M19 15h-4v4"></path>';

  function locale() {
    return String(
      window.PMD_ADMIN_LOCALE ||
      document.documentElement.getAttribute('lang') ||
      'en'
    ).toLowerCase();
  }

  function isGerman() {
    return locale().indexOf('de') === 0;
  }

  function editLabel() {
    return isGerman()
      ? 'Layout bearbeiten'
      : 'Edit layout';
  }

  function stripActionLabel(oneRowActive) {
    if (oneRowActive) {
      return isGerman()
        ? 'Gesamter Floor'
        : 'Full Floor';
    }

    return isGerman()
      ? 'Eine Reihe'
      : 'One row';
  }

  function configureSvg(svg, markup) {
    if (!svg) return false;

    svg.setAttribute('viewBox', '0 0 24 24');
    svg.setAttribute('fill', 'none');
    svg.setAttribute('stroke', 'currentColor');
    svg.setAttribute('stroke-width', '2');
    svg.setAttribute('stroke-linecap', 'round');
    svg.setAttribute('stroke-linejoin', 'round');
    svg.innerHTML = markup;
    return true;
  }

  function syncStrip(strip) {
    if (!strip) return false;

    var oneRowActive = strip.getAttribute('aria-pressed') === 'true';
    var actionLabel = stripActionLabel(oneRowActive);
    var svg = strip.querySelector('svg');

    configureSvg(
      svg,
      oneRowActive ? EXPAND_ICON : COLLAPSE_ICON
    );

    /*
     * The visual button is icon-only. Accessibility/tooltip text stays on the
     * button so removing the visible German/English wording loses no meaning.
     */
    var text = strip.querySelector('span');
    if (text) {
      text.textContent = '';
      text.hidden = true;
      text.setAttribute('aria-hidden', 'true');
    }

    strip.setAttribute('aria-label', actionLabel);
    strip.setAttribute('title', actionLabel);
    strip.setAttribute('data-bs-original-title', actionLabel);
    strip.setAttribute(
      'data-pmd-floor-toggle-icon',
      oneRowActive ? 'expand' : 'collapse'
    );

    return Boolean(svg);
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
    if (fit) fit.remove();

    var strip = toolbar.querySelector('[data-pmd-r2-tool="strip"]');
    var stripUpdated = syncStrip(strip);

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
      fitRemoved: !toolbar.querySelector('[data-pmd-r2-tool="fit"]'),
      stripUpdated: stripUpdated,
      editUpdated: editUpdated
    };
  }

  function syncAfterToggle() {
    window.requestAnimationFrame(function () {
      apply();
      window.setTimeout(apply, 40);
    });
  }

  window.PMDFloorToolbarAuthorityV1 = {
    version: '2.0.0',
    apply: apply,
    audit: function () {
      var toolbar = document.getElementById('pmd-r2-floor-toolbar-v316');
      var fit = toolbar && toolbar.querySelector('[data-pmd-r2-tool="fit"]');
      var strip = toolbar && toolbar.querySelector('[data-pmd-r2-tool="strip"]');
      var edit = toolbar && toolbar.querySelector('[data-pmd-r2-tool="edit"]');
      var editText = edit && edit.querySelector('span');
      var stripText = strip && strip.querySelector('span');
      var oneRowActive = Boolean(
        strip && strip.getAttribute('aria-pressed') === 'true'
      );
      var expectedIcon = oneRowActive ? 'expand' : 'collapse';
      var expectedAction = stripActionLabel(oneRowActive);

      return {
        version: '2.0.0',
        route: path,
        toolbarFound: Boolean(toolbar),
        fitRemoved: !fit,
        oneRowActive: oneRowActive,
        stripIcon: strip
          ? strip.getAttribute('data-pmd-floor-toggle-icon')
          : null,
        stripAction: strip ? strip.getAttribute('aria-label') : null,
        stripTextHidden: Boolean(
          strip &&
          (!stripText || stripText.hidden || !String(stripText.textContent || '').trim())
        ),
        editLabel: editText ? String(editText.textContent || '').trim() : null,
        ok: Boolean(
          toolbar &&
          !fit &&
          strip &&
          strip.getAttribute('data-pmd-floor-toggle-icon') === expectedIcon &&
          strip.getAttribute('aria-label') === expectedAction &&
          (!stripText || stripText.hidden || !String(stripText.textContent || '').trim()) &&
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

  /*
   * The Floor runtime owns the actual row/full state. Re-read aria-pressed
   * after the existing toggle handler runs; no MutationObserver or poller.
   */
  document.addEventListener('click', function (event) {
    var target = event.target && event.target.closest
      ? event.target.closest('[data-pmd-r2-tool="strip"]')
      : null;

    if (!target) return;
    syncAfterToggle();
  }, false);

  document.addEventListener('pageContentLoaded', apply, false);
  window.addEventListener('pageshow', apply, false);
})();
