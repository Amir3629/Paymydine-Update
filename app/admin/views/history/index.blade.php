<script id="pmd-history-flow-authority-r16">
(function () {
    'use strict';

    document.documentElement.classList.add('pmd-history-flow-r16');

    if (document.body) {
        /*
         * The global admin exact-layout runtime already has a proven normal-flow
         * contract for Settings. Mark History as the same static/flow shell
         * before that runtime initializes, so it never applies the legacy
         * absolute animated wrapper to this page.
         */
        document.body.classList.add('pmd-settings-suite');
    }
})();
</script>

<style id="pmd-history-first-paint-r16">
/* PMD_HISTORY_FIRST_PAINT_R16
 * Match the final normal-flow geometry before external styles/runtime execute.
 */
html.pmd-history-flow-r16,
html.pmd-history-flow-r16 body {
    height: auto !important;
    min-height: 100% !important;
    max-height: none !important;
    margin-top: 0 !important;
    padding-top: 0 !important;
    overflow-x: hidden !important;
    overflow-y: auto !important;
    background: #f8fbfd !important;
}

html.pmd-history-flow-r16 body {
    position: relative !important;
    min-height: 100vh !important;
}

html.pmd-history-flow-r16 body .page-wrapper {
    position: relative !important;
    top: 0 !important;
    right: auto !important;
    bottom: auto !important;
    left: 0 !important;
    height: auto !important;
    min-height: 100vh !important;
    max-height: none !important;
    overflow-x: hidden !important;
    overflow-y: visible !important;
    transform: none !important;
    transition: none !important;
}

html.pmd-history-flow-r16 body .page-content,
html.pmd-history-flow-r16 body .content-wrapper,
html.pmd-history-flow-r16 body .container-fluid {
    position: relative !important;
    top: 0 !important;
    left: 0 !important;
    width: 100% !important;
    height: auto !important;
    max-height: none !important;
    margin: 0 !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
    overflow-x: hidden !important;
    overflow-y: visible !important;
    transform: none !important;
    transition: none !important;
}

@media (min-width: 821px) {
    html.pmd-history-flow-r16.pmd-sm2-collapsed body .page-wrapper {
        margin-left: 86px !important;
        width: calc(100vw - 86px) !important;
    }

    html.pmd-history-flow-r16.pmd-sm2-expanded body .page-wrapper {
        margin-left: 198px !important;
        width: calc(100vw - 198px) !important;
    }
}

@media (max-width: 820px) {
    html.pmd-history-flow-r16 body .page-wrapper {
        margin-left: 0 !important;
        width: 100% !important;
    }
}

html.pmd-history-flow-r16 .navbar-top,
html.pmd-history-flow-r16 .navbar-fixed-top,
html.pmd-history-flow-r16 .page-title-section {
    display: none !important;
    visibility: hidden !important;
    height: 0 !important;
    min-height: 0 !important;
    max-height: 0 !important;
    margin: 0 !important;
    padding: 0 !important;
    overflow: hidden !important;
}

#pmd-history-page {
    box-sizing: border-box !important;
    width: 100% !important;
    min-height: 100vh !important;
    margin: 0 !important;
    padding: 0 30px 54px !important;
    background: #f8fbfd !important;
    opacity: 1 !important;
    visibility: visible !important;
    transform: none !important;
    animation: none !important;
    transition: none !important;
}

@media (max-width: 900px) {
    #pmd-history-page {
        padding: 0 16px 42px !important;
    }
}
</style>

<link rel="stylesheet" href="/app/admin/assets/css/pmd-history-stable-r15.css?v=20260822_1">
<link rel="stylesheet" href="/app/admin/assets/css/pmd-history-flow-r16.css?v=20260822_1">

<div id="pmd-history-page" class="pmd-owner-page pmd-history-page" data-pmd-history-page>
    <header class="pmd-owner-header pmd-history-header">
        <div class="pmd-owner-header__left">
            <a
                class="pmd-owner-header-button"
                href="{{ admin_url('dashboardlab') }}"
                aria-label="Back"
                title="Back"
            >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="m15 18-6-6 6-6"></path>
                </svg>
            </a>

            <h1>History</h1>
        </div>

        <div class="pmd-owner-header__actions" data-pmd-owner-header-actions>
            <button
                type="button"
                class="pmd-owner-header-button pmd-history-refresh"
                aria-label="Refresh history"
                title="Refresh history"
                data-pmd-history-refresh
            >
                <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M20 11a8 8 0 1 0-2.34 5.66"></path>
                    <path d="M20 4v7h-7"></path>
                </svg>
            </button>
        </div>
    </header>

    <main class="pmd-history-shell">
        <section class="pmd-history-card" aria-labelledby="pmd-history-card-title">
            <div class="pmd-history-card__header">
                <span class="pmd-history-card__icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24">
                        <path d="M3 12a9 9 0 1 0 3-6.7"></path>
                        <path d="M3 4v6h6"></path>
                        <path d="M12 7v5l3 2"></path>
                    </svg>
                </span>

                <div class="pmd-history-card__title">
                    <h2 id="pmd-history-card-title">Activity history</h2>
                    <p>Orders, table activity, staff notes and service events.</p>
                </div>
            </div>

            <div class="pmd-history-card__body">
                <div class="history-page-content pmd-history-list">
                    {!! $this->renderList() !!}
                </div>
            </div>
        </section>
    </main>
</div>

<script>
(function () {
    'use strict';

    var root = document.getElementById('pmd-history-page');

    if (!root) {
        return;
    }

    function unlockPageScroll() {
        document.body.classList.remove('pmd-history-modal-open');
        document.documentElement.style.removeProperty('overflow');
        document.documentElement.style.removeProperty('overflow-y');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('overflow-y');
    }

    unlockPageScroll();

    window.addEventListener('pageshow', function () {
        unlockPageScroll();
    });

    var refresh = root.querySelector('[data-pmd-history-refresh]');

    if (refresh) {
        refresh.addEventListener('click', function () {
            unlockPageScroll();
            window.location.reload();
        });
    }

    function closeModal(modal) {
        if (!modal) {
            return;
        }

        modal.hidden = true;
        document.body.classList.remove('pmd-history-modal-open');
    }

    function openModal(modal) {
        if (!modal) {
            return;
        }

        modal.hidden = false;
        document.body.classList.add('pmd-history-modal-open');

        var close = modal.querySelector('[data-pmd-history-close]');
        if (close) {
            close.focus();
        }
    }

    document.addEventListener('click', function (event) {
        var opener = event.target.closest('[data-pmd-history-open]');

        if (opener) {
            event.preventDefault();
            event.stopPropagation();

            openModal(
                document.getElementById(
                    opener.getAttribute('data-pmd-history-open')
                )
            );
            return;
        }

        var closer = event.target.closest('[data-pmd-history-close]');

        if (closer) {
            event.preventDefault();
            closeModal(closer.closest('[data-pmd-history-modal]'));
            return;
        }

        var overlay = event.target.closest('[data-pmd-history-modal]');

        if (overlay && event.target === overlay) {
            closeModal(overlay);
        }
    });

    document.addEventListener('keydown', function (event) {
        if (event.key !== 'Escape') {
            return;
        }

        var open = document.querySelector('[data-pmd-history-modal]:not([hidden])');
        closeModal(open);
    });
})();
</script>
