/* PMD_COUPON_SIMPLIFY_R23
 * UI-only authority for /admin/coupons.
 * - Header plus stays hidden by CSS.
 * - Only Coupon / Gift card / Voucher remain owner-visible.
 * - Existing Credit/Comp records and backend support are untouched.
 * - Smart add card reuses the existing create modal authority.
 */
(function () {
    'use strict';

    var path = String(window.location.pathname || '').replace(/\/+$/, '');
    if (path !== '/admin/coupons') return;

    var root = document.querySelector('[data-pmd-coupon-manager]');
    if (!root) return;

    var allowed = {
        coupon: true,
        gift_card: true,
        voucher: true
    };

    function localeCopy() {
        var cookie = document.cookie.match(/(?:^|; )pmd_admin_locale=([^;]+)/);
        var locale = String((cookie && cookie[1]) || document.documentElement.lang || 'en').toLowerCase();

        if (locale.indexOf('de') === 0) {
            return {
                title: 'Neuen Gutschein / Karte anlegen',
                help: 'Gutschein, Geschenkkarte oder Voucher erstellen.'
            };
        }

        return {
            title: 'Add new coupon / card',
            help: 'Create a coupon, gift card or voucher.'
        };
    }

    function removeRetiredTypeUi(scope) {
        scope = scope || root;

        Array.prototype.forEach.call(
            scope.querySelectorAll('[data-pmd-type-filter]'),
            function (node) {
                var type = node.getAttribute('data-pmd-type-filter');
                if (type === 'all' || !allowed[type]) node.remove();
            }
        );

        Array.prototype.forEach.call(
            scope.querySelectorAll('[data-pmd-card-type]'),
            function (node) {
                var type = node.getAttribute('data-pmd-card-type');
                if (!allowed[type]) node.remove();
            }
        );

        Array.prototype.forEach.call(
            scope.querySelectorAll('[data-pmd-coupon-card]'),
            function (node) {
                var type = node.getAttribute('data-card-type');
                if (!allowed[type]) node.remove();
            }
        );
    }

    function openExistingCreate() {
        var trigger = root.querySelector('[data-pmd-coupon-create]');
        if (!trigger) return;
        trigger.click();
    }

    function buildActionCard() {
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

        card.addEventListener('click', openExistingCreate, false);
        card.addEventListener('keydown', function (event) {
            if (event.key !== 'Enter' && event.key !== ' ') return;
            event.preventDefault();
            openExistingCreate();
        }, false);

        return card;
    }

    function installGridCard() {
        var grid = root.querySelector('[data-pmd-coupon-grid]');
        if (!grid) return false;

        removeRetiredTypeUi(root);

        var existing = grid.querySelector('[data-pmd-coupon-smart-add-r23]');
        if (!existing) {
            grid.insertBefore(buildActionCard(), grid.firstChild);
        } else if (existing !== grid.firstElementChild) {
            grid.insertBefore(existing, grid.firstChild);
        }

        grid.setAttribute('data-pmd-coupon-smart-ready-r23', '1');
        return true;
    }

    installGridCard();

    /* Existing coupon save/status actions replace only the refresh zone. Keep a
     * tiny observer on the Coupon root so the smart card is restored after that
     * exact replacement. It does no polling, no layout reads and no data work. */
    var queued = false;
    var observer = new MutationObserver(function () {
        if (queued) return;
        queued = true;

        window.requestAnimationFrame(function () {
            queued = false;
            installGridCard();
        });
    });

    observer.observe(root, {
        childList: true,
        subtree: true
    });

    window.PMDCouponSimplifyR23 = {
        version: '23.0.0',
        install: installGridCard,
        allowedTypes: ['coupon', 'gift_card', 'voucher']
    };
})();
