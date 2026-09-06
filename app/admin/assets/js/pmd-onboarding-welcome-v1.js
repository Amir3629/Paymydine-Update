/* PMD_ONBOARDING_WELCOME_V2_CENTERED_MODAL */
(function () {
    'use strict';

    var path = String(window.location.pathname || '').replace(/\/+$/, '');
    if (path !== '/admin/dashboardlab' && path !== '/admin/ownerdashboard') return;
    if (window.PMDOnboardingWelcomeV1) return;

    var mounted = false;
    var overlay = null;

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

    function unmount() {
        if (overlay && overlay.parentNode) overlay.parentNode.removeChild(overlay);
        overlay = null;
        mounted = false;
        unlockPage();
    }

    function mount() {
        if (mounted || document.querySelector('[data-pmd-onboarding-welcome-v1]')) return;

        status().then(function (state) {
            if (!state || !state.show_welcome) return;
            if (!document.body) return;

            overlay = document.createElement('div');
            overlay.className = 'pmd-onboarding-welcome-v1__overlay';
            overlay.setAttribute('data-pmd-onboarding-welcome-v1', '');
            overlay.innerHTML = ''
                + '<section class="pmd-onboarding-welcome-v1" role="dialog" aria-modal="true" aria-labelledby="pmd-onboarding-welcome-title" aria-describedby="pmd-onboarding-welcome-copy">'
                + '  <div class="pmd-onboarding-welcome-v1__brand" aria-hidden="true">'
                + '    <img src="/app/admin/assets/images/paymydine-logo.svg" alt="" width="58" height="74">'
                + '  </div>'
                + '  <span class="pmd-onboarding-welcome-v1__eyebrow">Welcome to PayMyDine</span>'
                + '  <h2 id="pmd-onboarding-welcome-title">Your restaurant workspace is ready.</h2>'
                + '  <p id="pmd-onboarding-welcome-copy">We can prepare Floors, Tables, Team, KDS, a matching theme and a complete editable starter menu for you.</p>'
                + '  <div class="pmd-onboarding-welcome-v1__actions">'
                + '    <a class="pmd-onboarding-welcome-v1__primary" href="/admin/pmdquicksetup" data-pmd-onboarding-primary>Quick setup</a>'
                + '    <button class="pmd-onboarding-welcome-v1__secondary" type="button" data-pmd-onboarding-skip>Not now</button>'
                + '  </div>'
                + '</section>';

            document.body.appendChild(overlay);
            mounted = true;
            lockPage();

            var primary = overlay.querySelector('[data-pmd-onboarding-primary]');
            window.setTimeout(function () {
                if (primary && typeof primary.focus === 'function') primary.focus({preventScroll: true});
            }, 40);

            overlay.addEventListener('click', function (event) {
                var button = event.target.closest('[data-pmd-onboarding-skip]');
                if (!button) return;
                event.preventDefault();
                button.disabled = true;
                button.setAttribute('aria-busy', 'true');

                skip().then(function () {
                    unmount();
                }).catch(function () {
                    button.disabled = false;
                    button.removeAttribute('aria-busy');
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
        version: '2.0.0',
        mount: mount,
        unmount: unmount,
        inspect: function () {
            return {
                path: path,
                mounted: mounted,
                visible: Boolean(document.querySelector('[data-pmd-onboarding-welcome-v1]')),
                presentation: 'centered-modal'
            };
        }
    };
})();
