/* PMD_ONBOARDING_WELCOME_V4_DASHBOARD_INLINE_QUICK_SETUP */
(function () {
    'use strict';

    var path = String(window.location.pathname || '').replace(/\/+$/, '');
    if (path !== '/admin/dashboardlab' && path !== '/admin/ownerdashboard') return;
    if (window.PMDOnboardingWelcomeV1) return;

    var mounted = false;
    var overlay = null;
    var keydownHandler = null;
    var quickSetupHost = null;
    var quickSetupLoading = false;

    var styleHref = '/app/admin/assets/css/pmd-onboarding-welcome-v1.css?v=4.0.0';
    var quickSetupStyleHref = '/app/admin/assets/css/pmd-tenant-quick-setup-v1.css?v=4.0.0';
    var quickSetupScriptSrc = '/app/admin/assets/js/pmd-tenant-quick-setup-v3.js?v=4.0.0-dashboard';
    var platformLogoSrc = '/assets/media/uploads/Paymydinelogo.png';

    function ensureStylesheet(href, marker) {
        var existing = document.querySelector('link[' + marker + ']');
        if (existing) return existing;

        var link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.setAttribute(marker, '');
        (document.head || document.documentElement).appendChild(link);
        return link;
    }

    function ensureWelcomeStylesheet() {
        ensureStylesheet(styleHref, 'data-pmd-onboarding-welcome-style');
    }

    function ensureQuickSetupStylesheet() {
        ensureStylesheet(quickSetupStyleHref, 'data-pmd-dashboard-quick-setup-style');
    }

    function ensureQuickSetupRuntime() {
        if (window.PMDTenantQuickSetupV4 || window.PMDTenantQuickSetupV3) {
            return Promise.resolve();
        }

        return new Promise(function (resolve, reject) {
            var script = document.createElement('script');
            script.src = quickSetupScriptSrc;
            script.async = true;
            script.setAttribute('data-pmd-dashboard-quick-setup-runtime', '');
            script.onload = function () { resolve(); };
            script.onerror = function () { reject(new Error('Quick Setup controls could not be loaded.')); };
            (document.body || document.documentElement).appendChild(script);
        });
    }

    function csrf(formData) {
        var meta = document.querySelector('meta[name="csrf-token"]');
        var input = document.querySelector('input[name="_token"]');
        var token = meta && meta.content ? meta.content : (input ? input.value : '');
        if (token && !formData.has('_token')) formData.append('_token', token);
    }

    async function status() {
        var response = await fetch('/admin/pmdquicksetup?status=1', {
            credentials: 'same-origin',
            headers: {'Accept': 'application/json', 'X-Requested-With': 'XMLHttpRequest'}
        });
        if (!response.ok) throw new Error('Status unavailable');
        return response.json();
    }

    async function skip() {
        var data = new FormData();
        csrf(data);
        var response = await fetch('/admin/pmdquicksetup', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'X-IGNITER-REQUEST-HANDLER': 'onSkip',
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            },
            body: data
        });
        if (!response.ok) throw new Error('Could not dismiss onboarding');
        return response.json();
    }

    function lockPage() {
        document.documentElement.classList.add('pmd-onboarding-welcome-open');
        if (document.body) document.body.classList.add('pmd-onboarding-welcome-open');
    }

    function unlockPage() {
        document.documentElement.classList.remove('pmd-onboarding-welcome-open');
        if (document.body) document.body.classList.remove('pmd-onboarding-welcome-open');
    }

    function installKeyboardGuard() {
        keydownHandler = function (event) {
            if (!overlay || event.key !== 'Tab') return;

            var focusable = overlay.querySelectorAll('button:not([disabled]), a[href]');
            if (!focusable.length) return;

            var first = focusable[0];
            var last = focusable[focusable.length - 1];

            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        };

        document.addEventListener('keydown', keydownHandler);
    }

    function removeKeyboardGuard() {
        if (keydownHandler) document.removeEventListener('keydown', keydownHandler);
        keydownHandler = null;
    }

    function unmount() {
        removeKeyboardGuard();
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        overlay = null;
        mounted = false;
        unlockPage();
    }

    function setQuickSetupUrl(open) {
        try {
            var url = new URL(window.location.href);
            if (open) {
                url.searchParams.set('quick_setup', '1');
                url.hash = 'pmd-dashboard-quick-setup';
            } else {
                url.searchParams.delete('quick_setup');
                if (url.hash === '#pmd-dashboard-quick-setup') url.hash = '';
            }
            window.history.replaceState({}, '', url.pathname + url.search + url.hash);
        } catch (error) {
            // URL decoration is optional; the inline setup itself remains usable.
        }
    }

    function insertQuickSetupHost(host) {
        var dashboard = document.querySelector('#pmd-dashboard-lab');
        if (!dashboard) throw new Error('Dashboard is unavailable.');

        var kpis = dashboard.querySelector('#pmd-r2-reservation-kpis-v307, .pmd-dashboard-lab__kpis');
        if (kpis && kpis.parentNode) {
            kpis.insertAdjacentElement('afterend', host);
            return;
        }

        var header = dashboard.querySelector('#pmd-r2-clean-header');
        if (header && header.parentNode) {
            header.insertAdjacentElement('afterend', host);
            return;
        }

        dashboard.insertAdjacentElement('afterbegin', host);
    }

    function extractQuickSetupRoot(html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(String(html || ''), 'text/html');
        var source = doc.querySelector('[data-pmd-quick-setup]');
        if (!source) throw new Error('Quick Setup could not be prepared inside Dashboard.');

        var root = document.importNode(source, true);
        var standaloneHeader = root.querySelector('.pmd-quick-setup__header');
        if (standaloneHeader) standaloneHeader.remove();

        root.classList.add('pmd-quick-setup--dashboard');
        return root;
    }

    async function buildQuickSetupHost() {
        ensureQuickSetupStylesheet();

        var response = await fetch('/admin/pmdquicksetup?embed=1', {
            credentials: 'same-origin',
            headers: {'X-Requested-With': 'XMLHttpRequest', 'Accept': 'text/html'}
        });
        if (!response.ok) throw new Error('Quick Setup could not be loaded.');

        var setupRoot = extractQuickSetupRoot(await response.text());
        var host = document.createElement('section');
        host.id = 'pmd-dashboard-quick-setup';
        host.className = 'pmd-dashboard-quick-setup';
        host.setAttribute('data-pmd-dashboard-quick-setup', '');
        host.innerHTML = ''
            + '<header class="pmd-dashboard-quick-setup__header">'
            + '  <div>'
            + '    <span class="pmd-dashboard-quick-setup__eyebrow">PayMyDine setup</span>'
            + '    <h2>Prepare your restaurant</h2>'
            + '    <p>Everything stays inside Dashboard and remains editable afterwards.</p>'
            + '  </div>'
            + '  <button type="button" class="pmd-dashboard-quick-setup__close" data-pmd-dashboard-quick-setup-close aria-label="Close Quick Setup">×</button>'
            + '</header>'
            + '<div class="pmd-dashboard-quick-setup__body" data-pmd-dashboard-quick-setup-body></div>';

        host.querySelector('[data-pmd-dashboard-quick-setup-body]').appendChild(setupRoot);
        host.querySelector('[data-pmd-dashboard-quick-setup-close]').addEventListener('click', function () {
            host.hidden = true;
            setQuickSetupUrl(false);
        });

        insertQuickSetupHost(host);
        quickSetupHost = host;
        await ensureQuickSetupRuntime();
        return host;
    }

    async function openQuickSetup() {
        if (quickSetupLoading) return;
        quickSetupLoading = true;

        try {
            var host = quickSetupHost || document.querySelector('[data-pmd-dashboard-quick-setup]');
            if (!host) host = await buildQuickSetupHost();

            host.hidden = false;
            quickSetupHost = host;
            setQuickSetupUrl(true);
            unmount();

            window.setTimeout(function () {
                try {
                    host.scrollIntoView({behavior: 'smooth', block: 'start'});
                } catch (error) {
                    host.scrollIntoView();
                }

                var firstControl = host.querySelector('input[name="restaurant_type"], input, button');
                if (firstControl && typeof firstControl.focus === 'function') {
                    try { firstControl.focus({preventScroll: true}); } catch (error) { firstControl.focus(); }
                }
            }, 40);
        } finally {
            quickSetupLoading = false;
        }
    }

    function mount() {
        if (mounted || document.querySelector('[data-pmd-onboarding-welcome-v1]')) return;

        ensureWelcomeStylesheet();

        var params = new URLSearchParams(window.location.search || '');
        if (params.get('quick_setup') === '1') {
            openQuickSetup().catch(function () {
                // Keep Dashboard usable if the optional setup fragment cannot load.
            });
            return;
        }

        status().then(function (state) {
            if (!state || !state.show_welcome) return;
            if (!document.body) return;

            overlay = document.createElement('div');
            overlay.className = 'pmd-onboarding-welcome-v1__overlay';
            overlay.setAttribute('data-pmd-onboarding-welcome-v1', '');
            overlay.innerHTML = ''
                + '<section class="pmd-onboarding-welcome-v1" role="dialog" aria-modal="true" aria-labelledby="pmd-onboarding-welcome-title" aria-describedby="pmd-onboarding-welcome-copy">'
                + '  <div class="pmd-onboarding-welcome-v1__brand" aria-hidden="true">'
                + '    <img src="' + platformLogoSrc + '" alt="" loading="eager" decoding="async">'
                + '  </div>'
                + '  <span class="pmd-onboarding-welcome-v1__eyebrow">Welcome to PayMyDine</span>'
                + '  <h2 id="pmd-onboarding-welcome-title">Your restaurant workspace is ready.</h2>'
                + '  <p id="pmd-onboarding-welcome-copy">Prepare Floors, Tables, Team, KDS, a matching theme and a complete editable starter menu directly inside Dashboard.</p>'
                + '  <div class="pmd-onboarding-welcome-v1__actions">'
                + '    <button class="pmd-onboarding-welcome-v1__primary" type="button" data-pmd-onboarding-primary>Quick setup</button>'
                + '    <button class="pmd-onboarding-welcome-v1__secondary" type="button" data-pmd-onboarding-skip>Not now</button>'
                + '  </div>'
                + '</section>';

            document.body.appendChild(overlay);
            mounted = true;
            lockPage();
            installKeyboardGuard();

            var logo = overlay.querySelector('.pmd-onboarding-welcome-v1__brand img');
            if (logo) {
                logo.addEventListener('error', function () {
                    if (logo.getAttribute('src') !== '/images/logo.png') logo.setAttribute('src', '/images/logo.png');
                }, {once: true});
            }

            var primary = overlay.querySelector('[data-pmd-onboarding-primary]');
            window.setTimeout(function () {
                if (primary && typeof primary.focus === 'function') {
                    try { primary.focus({preventScroll: true}); } catch (error) { primary.focus(); }
                }
            }, 40);

            overlay.addEventListener('click', function (event) {
                var primaryButton = event.target.closest('[data-pmd-onboarding-primary]');
                if (primaryButton) {
                    event.preventDefault();
                    if (primaryButton.disabled) return;
                    primaryButton.disabled = true;
                    primaryButton.setAttribute('aria-busy', 'true');

                    openQuickSetup().catch(function () {
                        primaryButton.disabled = false;
                        primaryButton.removeAttribute('aria-busy');
                    });
                    return;
                }

                var skipButton = event.target.closest('[data-pmd-onboarding-skip]');
                if (!skipButton) return;

                event.preventDefault();
                skipButton.disabled = true;
                skipButton.setAttribute('aria-busy', 'true');

                skip().then(function () {
                    unmount();
                }).catch(function () {
                    skipButton.disabled = false;
                    skipButton.removeAttribute('aria-busy');
                });
            });
        }).catch(function () {
            // Onboarding is optional. Never disturb the Dashboard if probing fails.
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount, {once: true});
    } else {
        mount();
    }

    window.PMDOnboardingWelcomeV1 = {
        version: '4.0.0',
        mount: mount,
        unmount: unmount,
        openQuickSetup: openQuickSetup,
        inspect: function () {
            return {
                path: path,
                mounted: mounted,
                visible: Boolean(document.querySelector('[data-pmd-onboarding-welcome-v1]')),
                presentation: 'centered-modal-to-dashboard-inline-cards',
                quickSetupVisible: Boolean(quickSetupHost && !quickSetupHost.hidden),
                logo: platformLogoSrc,
                stylesheet: styleHref
            };
        }
    };
})();
