/* PMD_ONBOARDING_WELCOME_V5_MODAL_WIZARD */
(function () {
    'use strict';

    var path = String(window.location.pathname || '').replace(/\/+$/, '');
    if (path !== '/admin/dashboardlab' && path !== '/admin/ownerdashboard') return;
    if (window.PMDOnboardingWelcomeV1) return;

    var mounted = false;
    var overlay = null;
    var keydownHandler = null;
    var quickSetupLoading = false;
    var wizardRoot = null;
    var wizardStep = 0;

    var styleHref = '/app/admin/assets/css/pmd-onboarding-welcome-v1.css?v=5.0.0';
    var quickSetupStyleHref = '/app/admin/assets/css/pmd-tenant-quick-setup-v1.css?v=5.0.0-wizard';
    var quickSetupScriptSrc = '/app/admin/assets/js/pmd-tenant-quick-setup-v3.js?v=5.0.0-wizard';
    var platformLogoSrc = '/app/admin/assets/images/pmd-brand-mark.svg?v=pmd-exact-sidebar-logo-20260818-v2';

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
        ensureStylesheet(quickSetupStyleHref, 'data-pmd-quick-setup-wizard-style');
    }

    function ensureQuickSetupRuntime() {
        if (window.PMDTenantQuickSetupV4 || window.PMDTenantQuickSetupV3) {
            return Promise.resolve();
        }

        return new Promise(function (resolve, reject) {
            var existing = document.querySelector('script[data-pmd-quick-setup-wizard-runtime]');
            if (existing) {
                existing.addEventListener('load', function () { resolve(); }, {once: true});
                existing.addEventListener('error', function () { reject(new Error('Quick Setup controls could not be loaded.')); }, {once: true});
                return;
            }

            var script = document.createElement('script');
            script.src = quickSetupScriptSrc;
            script.async = true;
            script.setAttribute('data-pmd-quick-setup-wizard-runtime', '');
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

    function focusables() {
        if (!overlay) return [];
        return Array.prototype.slice.call(
            overlay.querySelectorAll('button:not([disabled]), a[href], input:not([disabled]), select:not([disabled]), textarea:not([disabled])')
        ).filter(function (node) {
            return node.offsetParent !== null && !node.hidden;
        });
    }

    function installKeyboardGuard() {
        if (keydownHandler) return;

        keydownHandler = function (event) {
            if (!overlay || event.key !== 'Tab') return;
            var items = focusables();
            if (!items.length) return;

            var first = items[0];
            var last = items[items.length - 1];

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

    function ensureOverlay() {
        if (overlay && overlay.parentNode) return overlay;
        if (!document.body) return null;

        overlay = document.createElement('div');
        overlay.className = 'pmd-onboarding-welcome-v1__overlay';
        overlay.setAttribute('data-pmd-onboarding-welcome-v1', '');
        document.body.appendChild(overlay);
        mounted = true;
        lockPage();
        installKeyboardGuard();
        return overlay;
    }

    function setQuickSetupUrl(open) {
        try {
            var url = new URL(window.location.href);
            if (open) {
                url.searchParams.set('quick_setup', '1');
            } else {
                url.searchParams.delete('quick_setup');
            }
            url.hash = '';
            window.history.replaceState({}, '', url.pathname + url.search);
        } catch (error) {
            // URL decoration is optional.
        }
    }

    function unmount() {
        removeKeyboardGuard();
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        overlay = null;
        wizardRoot = null;
        wizardStep = 0;
        mounted = false;
        unlockPage();
    }

    function renderWelcome() {
        ensureWelcomeStylesheet();
        var host = ensureOverlay();
        if (!host) return;

        host.classList.remove('is-quick-setup-wizard');
        host.innerHTML = ''
            + '<section class="pmd-onboarding-welcome-v1" role="dialog" aria-modal="true" aria-labelledby="pmd-onboarding-welcome-title" aria-describedby="pmd-onboarding-welcome-copy">'
            + '  <div class="pmd-onboarding-welcome-v1__brand" aria-hidden="true">'
            + '    <img src="' + platformLogoSrc + '" alt="" loading="eager" decoding="async">'
            + '  </div>'
            + '  <span class="pmd-onboarding-welcome-v1__eyebrow">Welcome to PayMyDine</span>'
            + '  <h2 id="pmd-onboarding-welcome-title">Your restaurant workspace is ready.</h2>'
            + '  <p id="pmd-onboarding-welcome-copy">We can prepare Floors, Tables, Team, KDS, a matching theme and a complete editable starter menu for you.</p>'
            + '  <div class="pmd-onboarding-welcome-v1__actions">'
            + '    <button class="pmd-onboarding-welcome-v1__primary" type="button" data-pmd-onboarding-primary>Quick setup</button>'
            + '    <button class="pmd-onboarding-welcome-v1__secondary" type="button" data-pmd-onboarding-skip>Not now</button>'
            + '  </div>'
            + '</section>';

        var primary = host.querySelector('[data-pmd-onboarding-primary]');
        window.setTimeout(function () {
            if (primary && typeof primary.focus === 'function') {
                try { primary.focus({preventScroll: true}); } catch (error) { primary.focus(); }
            }
        }, 30);
    }

    function extractQuickSetupRoot(html) {
        var parser = new DOMParser();
        var doc = parser.parseFromString(String(html || ''), 'text/html');
        var source = doc.querySelector('[data-pmd-quick-setup]');
        if (!source) throw new Error('Quick Setup could not be prepared.');

        var root = document.importNode(source, true);
        var standaloneHeader = root.querySelector('.pmd-quick-setup__header');
        if (standaloneHeader) standaloneHeader.remove();
        root.classList.add('pmd-quick-setup--modal-wizard');
        return root;
    }

    function validateStep(card, index) {
        if (!card) return true;

        if (index === 0) {
            var selectedType = card.querySelector('input[name="restaurant_type"]:checked');
            if (!selectedType) {
                var first = card.querySelector('input[name="restaurant_type"]');
                if (first) first.focus();
                return false;
            }
        }

        if (index === 1) {
            var rows = Array.prototype.slice.call(card.querySelectorAll('[data-pmd-floor-row]'));
            var valid = rows.some(function (row) {
                var name = String(row.querySelector('[data-pmd-floor-name]')?.value || '').trim();
                var tables = Number(row.querySelector('[data-pmd-floor-tables]')?.value || 0);
                return Boolean(name && tables > 0);
            });
            if (!valid) {
                var nameInput = card.querySelector('[data-pmd-floor-name]');
                if (nameInput) nameInput.focus();
                return false;
            }
        }

        return true;
    }

    function decorateWizard(root, wizard) {
        var form = root.querySelector('[data-pmd-quick-setup-form]');
        if (!form) {
            wizard.classList.add('is-server-state');
            return;
        }

        var cards = Array.prototype.slice.call(form.querySelectorAll(':scope > .pmd-quick-setup__card'));
        var submitRow = form.querySelector(':scope > .pmd-quick-setup__submit-row');
        if (!cards.length) return;

        cards.forEach(function (card, index) {
            card.setAttribute('data-pmd-modal-wizard-step', String(index));
        });

        var navigation = document.createElement('div');
        navigation.className = 'pmd-quick-setup-wizard__navigation';
        navigation.innerHTML = ''
            + '<button type="button" class="pmd-quick-setup-wizard__back" data-pmd-quick-setup-wizard-back>Back</button>'
            + '<div class="pmd-quick-setup-wizard__progress" aria-live="polite">'
            + '  <span data-pmd-quick-setup-wizard-progress></span>'
            + '</div>'
            + '<button type="button" class="pmd-quick-setup-wizard__next" data-pmd-quick-setup-wizard-next>Next</button>';

        if (submitRow) form.insertBefore(navigation, submitRow);
        else form.appendChild(navigation);

        var back = navigation.querySelector('[data-pmd-quick-setup-wizard-back]');
        var next = navigation.querySelector('[data-pmd-quick-setup-wizard-next]');
        var progress = navigation.querySelector('[data-pmd-quick-setup-wizard-progress]');
        var stepTitle = wizard.querySelector('[data-pmd-quick-setup-wizard-title]');

        function renderStep(index) {
            index = Math.max(0, Math.min(cards.length - 1, index));
            wizardStep = index;

            cards.forEach(function (card, cardIndex) {
                card.hidden = cardIndex !== index;
            });

            back.hidden = index === 0;
            next.hidden = index === cards.length - 1;
            if (submitRow) submitRow.hidden = index !== cards.length - 1;
            progress.textContent = 'Step ' + (index + 1) + ' of ' + cards.length;

            var heading = cards[index].querySelector('.pmd-quick-setup__card-copy h2');
            if (stepTitle) stepTitle.textContent = heading ? heading.textContent : 'Quick setup';

            wizard.setAttribute('data-pmd-quick-setup-step', String(index + 1));

            var scroller = wizard.querySelector('[data-pmd-quick-setup-wizard-body]');
            if (scroller) scroller.scrollTop = 0;

            window.setTimeout(function () {
                var focusTarget = cards[index].querySelector('input:checked, input, button');
                if (focusTarget && typeof focusTarget.focus === 'function') {
                    try { focusTarget.focus({preventScroll: true}); } catch (error) { focusTarget.focus(); }
                }
            }, 20);
        }

        back.addEventListener('click', function () {
            renderStep(wizardStep - 1);
        });

        next.addEventListener('click', function () {
            if (!validateStep(cards[wizardStep], wizardStep)) {
                wizard.classList.add('has-step-error');
                window.setTimeout(function () { wizard.classList.remove('has-step-error'); }, 450);
                return;
            }
            renderStep(wizardStep + 1);
        });

        renderStep(0);
    }

    async function buildQuickSetupWizard() {
        ensureQuickSetupStylesheet();

        var response = await fetch('/admin/pmdquicksetup?embed=1', {
            credentials: 'same-origin',
            headers: {'X-Requested-With': 'XMLHttpRequest', 'Accept': 'text/html'}
        });
        if (!response.ok) throw new Error('Quick Setup could not be loaded.');

        var root = extractQuickSetupRoot(await response.text());
        var host = ensureOverlay();
        if (!host) throw new Error('Dashboard is unavailable.');

        host.classList.add('is-quick-setup-wizard');
        host.innerHTML = ''
            + '<section class="pmd-quick-setup-wizard" role="dialog" aria-modal="true" aria-labelledby="pmd-quick-setup-wizard-title">'
            + '  <header class="pmd-quick-setup-wizard__header">'
            + '    <div class="pmd-quick-setup-wizard__brand" aria-hidden="true"><img src="' + platformLogoSrc + '" alt=""></div>'
            + '    <div class="pmd-quick-setup-wizard__heading">'
            + '      <span>PayMyDine setup</span>'
            + '      <h2 id="pmd-quick-setup-wizard-title" data-pmd-quick-setup-wizard-title>Quick setup</h2>'
            + '    </div>'
            + '    <button type="button" class="pmd-quick-setup-wizard__close" data-pmd-quick-setup-wizard-close aria-label="Close Quick Setup">×</button>'
            + '  </header>'
            + '  <div class="pmd-quick-setup-wizard__body" data-pmd-quick-setup-wizard-body></div>'
            + '</section>';

        var wizard = host.querySelector('.pmd-quick-setup-wizard');
        wizard.querySelector('[data-pmd-quick-setup-wizard-body]').appendChild(root);
        wizard.querySelector('[data-pmd-quick-setup-wizard-close]').addEventListener('click', function () {
            setQuickSetupUrl(false);
            unmount();
        });

        wizardRoot = root;
        decorateWizard(root, wizard);
        await ensureQuickSetupRuntime();
        return wizard;
    }

    async function openQuickSetup() {
        if (quickSetupLoading) return;
        quickSetupLoading = true;

        try {
            ensureWelcomeStylesheet();
            ensureOverlay();
            setQuickSetupUrl(true);
            await buildQuickSetupWizard();
        } finally {
            quickSetupLoading = false;
        }
    }

    function bindOverlayActions() {
        if (!overlay || overlay.getAttribute('data-pmd-onboarding-actions-bound') === '1') return;
        overlay.setAttribute('data-pmd-onboarding-actions-bound', '1');

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
                setQuickSetupUrl(false);
                unmount();
            }).catch(function () {
                skipButton.disabled = false;
                skipButton.removeAttribute('aria-busy');
            });
        });
    }

    function mount() {
        if (mounted || document.querySelector('[data-pmd-onboarding-welcome-v1]')) return;
        ensureWelcomeStylesheet();

        var params = new URLSearchParams(window.location.search || '');
        if (params.get('quick_setup') === '1') {
            ensureOverlay();
            bindOverlayActions();
            openQuickSetup().catch(function () {
                setQuickSetupUrl(false);
                unmount();
            });
            return;
        }

        status().then(function (state) {
            if (!state || !state.show_welcome) return;
            renderWelcome();
            bindOverlayActions();
        }).catch(function () {
            // Onboarding is optional. Never disturb Dashboard if probing fails.
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', mount, {once: true});
    } else {
        mount();
    }

    window.PMDOnboardingWelcomeV1 = {
        version: '5.0.0',
        mount: mount,
        unmount: unmount,
        openQuickSetup: openQuickSetup,
        inspect: function () {
            return {
                path: path,
                mounted: mounted,
                visible: Boolean(document.querySelector('[data-pmd-onboarding-welcome-v1]')),
                presentation: 'blurred-dashboard-modal-wizard',
                wizardStep: wizardStep + 1,
                quickSetupMounted: Boolean(wizardRoot),
                logo: platformLogoSrc,
                stylesheet: styleHref
            };
        }
    };
})();
