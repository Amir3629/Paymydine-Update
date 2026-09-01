/* PMD_COUPON_SIMPLIFY_R23
 * UI-only authority for /admin/coupons.
 * - Header plus stays hidden by CSS.
 * - Only Coupon / Gift card / Voucher remain owner-visible.
 * - Existing Credit/Comp DOM, records and backend support stay intact.
 * - Smart add card reuses the existing create modal authority.
 */
(function () {
    'use strict';

    var allowed = {
        coupon: true,
        gift_card: true,
        voucher: true
    };

    var observer = null;
    var observedRoot = null;
    var queued = false;
    var filterToggleBound = false;

    function isCouponPage() {
        return String(window.location.pathname || '').replace(/\/+$/, '') === '/admin/coupons';
    }

    function localeCopy() {
        var cookie = document.cookie.match(/(?:^|; )pmd_admin_locale=([^;]+)/);
        var locale = String((cookie && cookie[1]) || document.documentElement.lang || 'en').toLowerCase();

        if (locale.indexOf('de') === 0) {
            return {
                title: 'Neuen Gutschein / Karte anlegen',
                help: 'Gutschein, Geschenkkarte oder Voucher erstellen.'
            };
        }

        // PMD_COUPON_TR_RUNTIME_COPY_R2A
        if (
            locale.indexOf('tr') === 0 &&
            window.PMDAdminI18n &&
            typeof window.PMDAdminI18n.translate === 'function'
        ) {
            return {
                title: window.PMDAdminI18n.translate('Add new coupon / card'),
                help: window.PMDAdminI18n.translate('Create a coupon, gift card or voucher.')
            };
        }

        return {
            title: 'Add new coupon / card',
            help: 'Create a coupon, gift card or voucher.'
        };
    }

    function openExistingCreate(root) {
        var trigger = root.querySelector('[data-pmd-coupon-create]');
        if (!trigger) return;
        trigger.click();
    }

    function buildActionCard(root) {
        var copy = localeCopy();
        var card = document.createElement('div');

        card.className = 'pmd-coupon-smart-add-card pmd-smart-add-card';
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-disabled', 'false');
        card.setAttribute('data-pmd-coupon-smart-add-r23', '');
        card.setAttribute('data-pmd-smart-action', 'coupon');
        card.setAttribute('aria-label', copy.title);

        var plus = document.createElement('span');
        plus.className = 'pmd-coupon-smart-add-card__plus pmd-smart-add-card__plus';
        plus.setAttribute('aria-hidden', 'true');
        plus.textContent = '+';

        var body = document.createElement('span');
        body.className = 'pmd-coupon-smart-add-card__copy pmd-smart-add-card__copy';

        var title = document.createElement('strong');
        title.textContent = copy.title;

        var help = document.createElement('small');
        help.textContent = copy.help;

        body.appendChild(title);
        body.appendChild(help);
        card.appendChild(plus);
        card.appendChild(body);

        card.addEventListener('click', function () {
            openExistingCreate(root);
        }, false);

        card.addEventListener('keydown', function (event) {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            openExistingCreate(root);
        }, false);

        return card;
    }

    function installGridCard(root) {
        if (!root || !document.documentElement.contains(root)) return false;

        var grid = root.querySelector('[data-pmd-coupon-grid]');
        if (!grid) return false;

        var existing = grid.querySelector('[data-pmd-coupon-smart-add-r23]');
        if (!existing) {
            grid.insertBefore(buildActionCard(root), grid.firstChild);
        } else if (existing !== grid.firstElementChild) {
            grid.insertBefore(existing, grid.firstChild);
        }

        grid.setAttribute('data-pmd-coupon-smart-ready-r23', '1');
        return true;
    }

    function bindFilterReset(root) {
        if (filterToggleBound) return;
        filterToggleBound = true;

        root.addEventListener('click', function (event) {
            var button = event.target.closest('[data-pmd-type-filter]');
            if (!button || !root.contains(button)) return;

            var type = button.getAttribute('data-pmd-type-filter');
            if (!allowed[type] || !button.classList.contains('is-active')) return;

            var all = root.querySelector('[data-pmd-type-filter="all"]');
            if (!all) return;

            event.preventDefault();
            event.stopImmediatePropagation();
            all.click();
        }, true);
    }

    function observe(root) {
        if (observedRoot === root && observer) return;

        if (observer) observer.disconnect();
        observedRoot = root;

        observer = new MutationObserver(function () {
            if (queued) return;
            queued = true;

            window.requestAnimationFrame(function () {
                queued = false;
                installGridCard(observedRoot);
            });
        });

        observer.observe(root, {
            childList: true,
            subtree: true
        });
    }

    function boot() {
        if (!isCouponPage()) return;

        var root = document.querySelector('[data-pmd-coupon-manager]');
        if (!root) return;

        installGridCard(root);
        bindFilterReset(root);
        observe(root);

        window.PMDCouponSimplifyR23 = {
            version: '23.0.2',
            install: function () { return installGridCard(root); },
            allowedTypes: ['coupon', 'gift_card', 'voucher']
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', boot, { once: true });
    } else {
        boot();
    }

    document.addEventListener('pageContentLoaded', boot, false);
})();
