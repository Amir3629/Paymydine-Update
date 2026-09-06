/* PMD_ONBOARDING_WELCOME_V1 */
(function () {
    'use strict';

    var path = String(window.location.pathname || '').replace(/\/+$/, '');
    if (path !== '/admin/dashboardlab' && path !== '/admin/ownerdashboard') return;
    if (window.PMDOnboardingWelcomeV1) return;

    var mounted = false;

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

    function mount() {
        if (mounted || document.querySelector('[data-pmd-onboarding-welcome-v1]')) return;

        status().then(function (state) {
            if (!state || !state.show_welcome) return;

            var dashboard = document.querySelector('#pmd-dashboard-lab');
            if (!dashboard) return;

            var card = document.createElement('section');
            card.className = 'pmd-onboarding-welcome-v1';
            card.setAttribute('data-pmd-onboarding-welcome-v1', '');
            card.innerHTML = ''
                + '<div class="pmd-onboarding-welcome-v1__row">'
                + '  <div><span class="pmd-onboarding-welcome-v1__eyebrow">Welcome to PayMyDine</span>'
                + '  <h2>Your restaurant workspace is ready.</h2>'
                + '  <p>Want us to prepare Floors, Tables, Team, KDS, a matching theme and an optional starter menu?</p></div>'
                + '  <div class="pmd-onboarding-welcome-v1__actions">'
                + '    <a href="/admin/pmdquicksetup">Quick setup</a>'
                + '    <button type="button" data-pmd-onboarding-skip>Not now</button>'
                + '  </div>'
                + '</div>';

            var header = dashboard.querySelector('#pmd-r2-clean-header');
            if (header && header.parentNode) header.insertAdjacentElement('afterend', card);
            else dashboard.insertAdjacentElement('afterbegin', card);
            mounted = true;

            card.addEventListener('click', function (event) {
                var button = event.target.closest('[data-pmd-onboarding-skip]');
                if (!button) return;
                event.preventDefault();
                button.disabled = true;
                skip().then(function () {
                    card.remove();
                }).catch(function () {
                    button.disabled = false;
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
        version: '1.0.0',
        mount: mount,
        inspect: function () {
            return {
                path: path,
                mounted: mounted,
                visible: Boolean(document.querySelector('[data-pmd-onboarding-welcome-v1]'))
            };
        }
    };
})();
