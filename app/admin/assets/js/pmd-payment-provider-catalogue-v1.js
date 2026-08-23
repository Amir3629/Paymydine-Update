(function () {
    'use strict';

    var root = null;
    var state = null;

    function request(url) {
        return fetch(url, {
            credentials: 'same-origin',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest'
            }
        }).then(function (response) {
            if (!response.ok) {
                throw new Error('Provider state request failed: HTTP ' + response.status);
            }

            return response.json();
        });
    }

    function capabilityLabel(value) {
        var labels = {
            online_payments: 'Online payments',
            terminal_payments: 'Card terminals',
            refunds: 'Refunds',
            partial_refunds: 'Partial refunds',
            payment_links: 'Payment links',
            saved_payment_methods: 'Saved payment methods',
            webhooks: 'Webhooks',
            oauth: 'Connect account'
        };

        return labels[value] || value;
    }

    function methodLabel(value) {
        var labels = {
            card: 'Cards',
            apple_pay: 'Apple Pay',
            google_pay: 'Google Pay',
            wero: 'Wero',
            paypal: 'PayPal',
            klarna: 'Klarna',
            sepa_debit: 'SEPA Direct Debit',
            cash_app: 'Cash App Pay'
        };

        return labels[value] || value;
    }

    function connectedEnvironment(provider) {
        var environments = provider.environments || {};
        var active = null;

        Object.keys(environments).some(function (key) {
            var item = environments[key];

            if (item && item.is_active) {
                active = item;
                return true;
            }

            return false;
        });

        return active;
    }

    function renderProvider(provider) {
        var env = connectedEnvironment(provider);
        var connected = Boolean(env && env.connection_status === 'connected');
        var capabilities = provider.catalogue_capabilities || provider.capabilities || [];
        var methods = provider.catalogue_payment_methods || provider.payment_methods || [];

        return [
            '<article class="pmd-provider-card" data-provider="' + provider.provider_code + '">',
                '<header class="pmd-provider-card__header">',
                    '<div>',
                        '<h4>' + (provider.label || provider.provider_code) + '</h4>',
                        '<p>' + (connected ? 'Connected for this restaurant' : 'Not connected') + '</p>',
                    '</div>',
                    '<span class="pmd-provider-card__status ' + (connected ? 'is-connected' : '') + '">',
                        connected ? 'Connected' : 'Available',
                    '</span>',
                '</header>',
                '<div class="pmd-provider-card__section">',
                    '<strong>Capabilities</strong>',
                    '<div class="pmd-provider-card__chips">',
                        capabilities.map(function (item) {
                            return '<span>' + capabilityLabel(item) + '</span>';
                        }).join(''),
                    '</div>',
                '</div>',
                '<div class="pmd-provider-card__section">',
                    '<strong>Payment methods</strong>',
                    '<div class="pmd-provider-card__chips">',
                        methods.map(function (item) {
                            return '<span>' + methodLabel(item) + '</span>';
                        }).join(''),
                    '</div>',
                '</div>',
                '<footer class="pmd-provider-card__footer">',
                    provider.provider_code === 'sumup'
                        ? '<a class="btn btn-primary" href="/admin/pmddevices#payment-terminals">Manage SumUp</a>'
                        : '<button type="button" class="btn btn-outline-secondary" disabled>Integration next</button>',
                '</footer>',
            '</article>'
        ].join('');
    }

    function render() {
        if (!root || !state) return;

        var providers = state.providers || [];

        root.innerHTML = [
            '<section class="pmd-provider-catalogue">',
                '<div class="pmd-provider-catalogue__intro">',
                    '<div>',
                        '<p class="pmd-provider-catalogue__eyebrow">PAYMENTS</p>',
                        '<h3>Payment providers</h3>',
                        '<p>Connect this restaurant\'s own provider accounts once. PayMyDine then uses the same connection for the payment methods and terminal capabilities that provider supports.</p>',
                    '</div>',
                '</div>',
                '<div class="pmd-provider-catalogue__grid">',
                    providers.map(renderProvider).join(''),
                '</div>',
            '</section>'
        ].join('');
    }

    function mount() {
        root = document.querySelector('[data-pmd-payment-provider-catalogue]');
        if (!root) return;

        request('/admin/payment-providers/state')
            .then(function (payload) {
                state = payload;
                render();
            })
            .catch(function (error) {
                root.innerHTML = '<div class="alert alert-warning">Payment providers could not be loaded.</div>';
                console.warn('[PMD Payment Providers]', error);
            });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount, { once: true });
    } else {
        mount();
    }

    window.PMDPaymentProviderCatalogueV1 = {
        mount: mount,
        getState: function () { return state; }
    };
}());
