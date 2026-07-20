/**
 * Disable tooltips on specific elements where they're redundant
 * - Note & History buttons (already labeled)
 * - Settings menu-grid items (already show icon + text)
 */
(function() {
    'use strict';

    var EXCLUDE_SELECTOR = '#notif-note-btn, #notif-history-link, .menu-grid .menu-link, .dropdown-menu .menu-grid .menu-link, .media-finder .icon-container [data-find-name]';

    function disableTooltipsOnElements() {
        var elements = document.querySelectorAll(EXCLUDE_SELECTOR);
        elements.forEach(function(el) {
            if (!el) return;
            // Remove title so no tooltip appears
            el.removeAttribute('title');
            el.removeAttribute('data-bs-original-title');
            el.setAttribute('data-no-tooltip', '1');
            // Destroy Bootstrap 5 tooltip if it exists
            if (typeof bootstrap !== 'undefined' && bootstrap.Tooltip) {
                var instance = bootstrap.Tooltip.getInstance(el);
                if (instance) instance.dispose();
            }
            // jQuery/Bootstrap 4 tooltip
            if (typeof jQuery !== 'undefined' && jQuery(el).data && jQuery(el).data('bs.tooltip')) {
                jQuery(el).tooltip('dispose');
            }
        });
    }

    function init() {
        disableTooltipsOnElements();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Re-run when content is rendered (e.g. AJAX, dropdown opens)
    if (typeof jQuery !== 'undefined') {
        jQuery(document).on('render shown.bs.dropdown', function() {
            setTimeout(disableTooltipsOnElements, 50);
        });
    }

    // Catch dynamically added elements (notification panel, settings dropdown)
    var observer = new MutationObserver(function() {
        disableTooltipsOnElements();
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Fallback: run a few times to catch late-rendered content
    setTimeout(disableTooltipsOnElements, 200);
    setTimeout(disableTooltipsOnElements, 500);
})();
