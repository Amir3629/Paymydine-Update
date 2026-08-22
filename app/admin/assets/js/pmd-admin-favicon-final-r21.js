/* PMD_ADMIN_FAVICON_FINAL_R21
 * Final browser-tab icon authority for every Admin workspace, including
 * CashierLab and other clean workspaces whose shared head can still emit the
 * legacy favicon.svg or /favicon.ico links.
 */
(function () {
    'use strict';

    var FINAL = '/app/admin/assets/images/pmd-favicon-final-20260822.svg?v=20260822-r21';

    function ensure(rel) {
        var selector = 'link[rel="' + rel + '"]';
        var link = document.head && document.head.querySelector(selector);

        if (!link && document.head) {
            link = document.createElement('link');
            link.setAttribute('rel', rel);
            document.head.appendChild(link);
        }

        if (!link) return;

        link.setAttribute('type', 'image/svg+xml');
        if (link.getAttribute('href') !== FINAL) {
            link.setAttribute('href', FINAL);
        }
    }

    function apply() {
        ensure('icon');
        ensure('shortcut icon');

        if (document.head) {
            Array.prototype.forEach.call(
                document.head.querySelectorAll('link[rel~="icon"]'),
                function (link) {
                    link.setAttribute('type', 'image/svg+xml');
                    link.setAttribute('href', FINAL);
                }
            );
        }
    }

    apply();

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', apply, { once: true });
    }

    document.addEventListener('pageContentLoaded', apply, false);
    window.addEventListener('pageshow', apply, false);

    window.PMDAdminFaviconFinalR21 = {
        version: '21.0.0',
        href: FINAL,
        apply: apply
    };
})();
