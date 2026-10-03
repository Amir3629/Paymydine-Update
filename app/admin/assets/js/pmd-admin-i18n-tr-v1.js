(function () {
    'use strict';

    /*
     * PMD_TURKISH_ADMIN_I18N_COMPAT_SHIM_V4
     *
     * Turkish translation ownership moved to:
     *   app/admin/i18n/platform/tr.php
     *
     * This file intentionally contains no Turkish catalogue and no DOM
     * translator. It remains temporarily because older shared layouts may
     * still request this asset. The generic pmd-admin-i18n-v1.js runtime is
     * the only browser translation runtime for EN/DE/TR.
     */

    function runCanonicalRuntime() {
        if (
            window.PMDAdminI18n
            && typeof window.PMDAdminI18n.run === 'function'
        ) {
            window.PMDAdminI18n.run();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener(
            'DOMContentLoaded',
            runCanonicalRuntime,
            { once: true }
        );
    } else {
        runCanonicalRuntime();
    }
})();
