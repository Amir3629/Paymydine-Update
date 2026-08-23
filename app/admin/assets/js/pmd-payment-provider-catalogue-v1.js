(function () {
    'use strict';

    if (window.PMDPaymentProviderCatalogueV1) return;

    var root = null;
    var catalogue = null;
    var sumup = null;
    var sumupEnvironment = 'test';
    var busy = false;
    var flash = '';
    var flashError = false;

    function esc(value) {
        return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
            return {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            }[char];
        });
    }

    function csrf() {
        var meta = document.querySelector('meta[name="csrf-token"]');
        return meta ? meta.content : '';
    }

    function headers() {
        return {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            'X-CSRF-TOKEN': csrf()
        };
    }

    async function request(url, options) {
        var response = await fetch(url, Object.assign({
            credentials: 'same-origin',
            cache: 'no-store',
            headers: {
                'Accept': 'application/json',
                'X-Requested-With': 'XMLHttpRequest',
                'X-CSRF-TOKEN': csrf()
            }
        }, options || {}));

        var json = await response.json().catch(function () { return {}; });
        if (!response.ok || json.success === false || json.ok === false) {
            throw new Error(String(json.message || json.error || ('HTTP ' + response.status)));
        }

        return json;
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

    function providerDefinition(code) {
        var providers = catalogue && catalogue.providers ? catalogue.providers : [];
        return providers.find(function (provider) {
            return provider.provider_code === code;
        }) || {
            provider_code: code,
            label: code,
            capabilities: [],
            payment_methods: []
        };
    }

    function chips(values, formatter) {
        if (!values || !values.length) return '<span class="pmd-provider-muted">None advertised yet</span>';
        return '<div class="pmd-provider-card__chips">' + values.map(function (value) {
            return '<span>' + esc(formatter(value)) + '</span>';
        }).join('') + '</div>';
    }

    function sumupSnapshot() {
        var environments = sumup && sumup.environments ? sumup.environments : {};
        return environments[sumupEnvironment] || {
            environment: sumupEnvironment,
            configured: false,
            connection_status: 'not_configured',
            api_key_present: false,
            affiliate_key_present: false,
            merchant_code: '',
            terminals: []
        };
    }

    function sumupStatus(snapshot) {
        if (snapshot.connection_status === 'connected') return 'Connected';
        if (snapshot.connection_status === 'error') return 'Needs attention';
        if (snapshot.configured) return 'Saved, not tested';
        return 'Not connected';
    }

    function sumupTab(key, label) {
        var snapshot = sumup && sumup.environments && sumup.environments[key]
            ? sumup.environments[key]
            : {};
        var connected = snapshot.connection_status === 'connected';

        return '<button type="button" data-provider-sumup-env="' + key + '" class="' +
            (sumupEnvironment === key ? 'is-active' : '') + '">' +
            (connected ? '<i></i>' : '') + esc(label) + '</button>';
    }

    function sumupField(label, key, type, value, placeholder, readonly) {
        return '<label class="pmd-provider-field"><span>' + esc(label) + '</span>' +
            '<input data-provider-sumup-field="' + esc(key) + '" type="' + esc(type) +
            '" value="' + esc(value || '') + '" placeholder="' + esc(placeholder || '') + '" ' +
            (readonly ? 'readonly' : '') + ' autocomplete="off"></label>';
    }

    function renderSumup() {
        var provider = providerDefinition('sumup');
        var snapshot = sumupSnapshot();
        var connected = snapshot.connection_status === 'connected';
        var activeEnvironment = sumup ? sumup.active_environment : null;
        var appId = sumup && sumup.app_id ? sumup.app_id : 'com.paymydine.cloud';

        return [
            '<article class="pmd-provider-card pmd-provider-card--featured" id="provider-sumup">',
                '<header class="pmd-provider-card__header">',
                    '<div>',
                        '<h4>SumUp</h4>',
                        '<p>Connect this restaurant\'s own SumUp account once. The same connection is then used for supported payments and Solo terminals.</p>',
                    '</div>',
                    '<span class="pmd-provider-card__status ' + (connected ? 'is-connected' : '') + '">' + esc(sumupStatus(snapshot)) + '</span>',
                '</header>',
                '<div class="pmd-provider-tabs">',
                    sumupTab('test', 'Test'),
                    sumupTab('production', 'Production'),
                '</div>',
                flash ? '<div class="pmd-provider-flash ' + (flashError ? 'is-error' : 'is-success') + '">' + esc(flash) + '</div>' : '',
                '<div class="pmd-provider-connection">',
                    '<div class="pmd-provider-connection__head">',
                        '<div><strong>Connection</strong><span>' + (sumupEnvironment === 'test' ? 'Use the restaurant\'s SumUp sandbox credentials.' : 'Use the restaurant\'s live SumUp credentials.') + '</span></div>',
                        activeEnvironment === sumupEnvironment ? '<em>Used for payments</em>' : '',
                    '</div>',
                    '<div class="pmd-provider-fields">',
                        sumupField('Secret API Key', 'api-key', 'password', '', snapshot.api_key_present ? 'Saved — leave blank to keep it' : 'sup_sk_…'),
                        sumupField('Affiliate Key', 'affiliate-key', 'password', '', snapshot.affiliate_key_present ? 'Saved — leave blank to keep it' : 'sup_afk_…'),
                        sumupField('Merchant Code', 'merchant-code', 'text', snapshot.merchant_code || '', 'Merchant code'),
                        sumupField('PayMyDine App ID', 'app-id', 'text', appId, '', true),
                    '</div>',
                    '<small class="pmd-provider-security-note">Saved secrets stay inside this restaurant tenant and are never shown back in the browser.</small>',
                    '<div class="pmd-provider-actions">',
                        '<button type="button" class="btn btn-primary" data-provider-sumup-save ' + (busy ? 'disabled' : '') + '>Save &amp; test connection</button>',
                        snapshot.configured ? '<button type="button" class="btn btn-outline-secondary" data-provider-sumup-test ' + (busy ? 'disabled' : '') + '>Test saved connection</button>' : '',
                        connected && activeEnvironment !== sumupEnvironment ? '<button type="button" class="btn btn-outline-secondary" data-provider-sumup-activate ' + (busy ? 'disabled' : '') + '>Use ' + esc(sumupEnvironment) + ' for payments</button>' : '',
                        '<a class="btn btn-outline-secondary" href="/admin/pmddevices#payment-terminals">Manage terminals</a>',
                    '</div>',
                    snapshot.last_error ? '<p class="pmd-provider-error">' + esc(snapshot.last_error) + '</p>' : '',
                '</div>',
                '<div class="pmd-provider-card__section">',
                    '<strong>Platform capabilities</strong>',
                    chips(provider.catalogue_capabilities || provider.capabilities || [], capabilityLabel),
                '</div>',
                '<div class="pmd-provider-card__section">',
                    '<strong>Payment methods</strong>',
                    chips(provider.catalogue_payment_methods || provider.payment_methods || [], methodLabel),
                '</div>',
            '</article>'
        ].join('');
    }

    function renderGenericProvider(provider) {
        var label = provider.label || provider.provider_code;
        var capabilities = provider.catalogue_capabilities || provider.capabilities || [];
        var methods = provider.catalogue_payment_methods || provider.payment_methods || [];

        return [
            '<article class="pmd-provider-card" id="provider-' + esc(provider.provider_code) + '">',
                '<header class="pmd-provider-card__header">',
                    '<div>',
                        '<h4>' + esc(label) + '</h4>',
                        '<p>Provider adapter foundation is available. Account-specific connection flow is the next implementation step.</p>',
                    '</div>',
                    '<span class="pmd-provider-card__status">Next</span>',
                '</header>',
                '<div class="pmd-provider-card__section"><strong>Platform capabilities</strong>' + chips(capabilities, capabilityLabel) + '</div>',
                '<div class="pmd-provider-card__section"><strong>Payment methods</strong>' + chips(methods, methodLabel) + '</div>',
                '<footer class="pmd-provider-card__footer">',
                    '<a class="btn btn-outline-secondary" href="/admin/payments?mode=providers">Open existing provider settings</a>',
                '</footer>',
            '</article>'
        ].join('');
    }

    function render() {
        if (!root || !catalogue || !sumup) return;

        var providers = (catalogue.providers || []).filter(function (provider) {
            return provider.provider_code !== 'sumup';
        });

        root.innerHTML = [
            '<section class="pmd-provider-catalogue">',
                '<div class="pmd-provider-catalogue__intro">',
                    '<div>',
                        '<p class="pmd-provider-catalogue__eyebrow">PAYMENTS</p>',
                        '<h3>Payment providers</h3>',
                        '<p>Each restaurant connects its own accounts here. Payment methods and terminal devices then use those connections instead of asking for credentials again.</p>',
                    '</div>',
                    '<a class="btn btn-outline-secondary" href="/admin/payments">Payment methods</a>',
                '</div>',
                renderSumup(),
                '<div class="pmd-provider-catalogue__grid">',
                    providers.map(renderGenericProvider).join(''),
                '</div>',
            '</section>'
        ].join('');

        bind();
    }

    function sumupInput(key) {
        var input = root.querySelector('[data-provider-sumup-field="' + key + '"]');
        return input ? String(input.value || '').trim() : '';
    }

    async function act(callback) {
        if (busy) return;
        busy = true;
        flash = '';
        flashError = false;
        render();

        try {
            await callback();
        } catch (error) {
            flash = error.message || 'Provider request failed.';
            flashError = true;
        } finally {
            busy = false;
            render();
        }
    }

    async function reloadSumup() {
        var payload = await request('/admin/payment-providers/sumup/state');
        sumup = payload.state;
    }

    async function saveSumup() {
        await act(async function () {
            var payload = await request('/admin/payment-providers/sumup/connection', {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify({
                    environment: sumupEnvironment,
                    api_key: sumupInput('api-key'),
                    affiliate_key: sumupInput('affiliate-key'),
                    merchant_code: sumupInput('merchant-code')
                })
            });

            sumup = payload.state;
            flash = payload.message || 'Connected to SumUp.';
        });
    }

    async function testSumup() {
        await act(async function () {
            var payload = await request('/admin/payment-providers/sumup/connection/test', {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify({ environment: sumupEnvironment })
            });

            sumup = payload.state;
            flash = payload.message || 'SumUp connection is working.';
        });
    }

    async function activateSumup() {
        await act(async function () {
            var payload = await request('/admin/payment-providers/sumup/environment', {
                method: 'POST',
                headers: headers(),
                body: JSON.stringify({ environment: sumupEnvironment })
            });

            sumup = payload.state;
            flash = payload.message || 'Environment activated.';
        });
    }

    function bind() {
        root.querySelectorAll('[data-provider-sumup-env]').forEach(function (button) {
            button.addEventListener('click', function () {
                sumupEnvironment = button.dataset.providerSumupEnv;
                flash = '';
                flashError = false;
                render();
            });
        });

        var save = root.querySelector('[data-provider-sumup-save]');
        var test = root.querySelector('[data-provider-sumup-test]');
        var activate = root.querySelector('[data-provider-sumup-activate]');

        if (save) save.addEventListener('click', saveSumup);
        if (test) test.addEventListener('click', testSumup);
        if (activate) activate.addEventListener('click', activateSumup);
    }

    async function load() {
        var results = await Promise.all([
            request('/admin/payment-providers/state'),
            request('/admin/payment-providers/sumup/state')
        ]);

        catalogue = results[0];
        sumup = results[1].state;

        if (sumup && sumup.active_environment) {
            sumupEnvironment = sumup.active_environment;
        } else if (sumup && sumup.environments && sumup.environments.test && sumup.environments.test.configured) {
            sumupEnvironment = 'test';
        }

        render();
    }

    function mount() {
        if (!/^\/admin\/payment-providers(?:\/|$)/.test(location.pathname)) return;

        root = document.querySelector('[data-pmd-payment-provider-catalogue]');
        if (!root) return;

        load().catch(function (error) {
            root.innerHTML = '<div class="alert alert-warning">' + esc(error.message || 'Payment providers could not be loaded.') + '</div>';
            console.warn('[PMD Payment Providers]', error);
        });
    }

    window.PMDPaymentProviderCatalogueV1 = {
        mount: mount,
        reload: load,
        getState: function () {
            return { catalogue: catalogue, sumup: sumup };
        }
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount, { once: true });
    } else {
        mount();
    }
}());
