@include('admin::_partials.pmd_settings_family_first_paint_v18')

<script>
(function () {
    document.documentElement.classList.add(
        'pmd-settings-family-v18-route',
        'pmd-history-modern-r14-route'
    );
})();
</script>

<link rel="stylesheet" href="/app/admin/assets/css/pmd-history-modern-r14.css?v=20260822_1">

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

    var refresh = root.querySelector('[data-pmd-history-refresh]');

    if (refresh) {
        refresh.addEventListener('click', function () {
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
