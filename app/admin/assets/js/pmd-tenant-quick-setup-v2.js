/* PMD_TENANT_QUICK_SETUP_V2 */
(function () {
    'use strict';

    var root = document.querySelector('[data-pmd-quick-setup]');
    if (!root) return;

    function csrf(data) {
        var meta = document.querySelector('meta[name="csrf-token"]');
        var input = document.querySelector('input[name="_token"]');
        var token = meta && meta.content ? meta.content : (input ? input.value : '');
        if (token && !data.has('_token')) data.append('_token', token);
    }

    async function handler(name) {
        var data = new FormData();
        csrf(data);

        var response = await fetch('/admin/pmdquicksetup', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'X-IGNITER-REQUEST-HANDLER': name,
                'X-Requested-With': 'XMLHttpRequest',
                'Accept': 'application/json'
            },
            body: data
        });

        var raw = await response.text();
        var payload = {};
        try { payload = raw ? JSON.parse(raw) : {}; }
        catch (error) { payload = {ok: false, message: raw || 'Request failed.'}; }

        if (!response.ok || payload.ok === false) {
            throw new Error(payload.message || ('Request failed (' + response.status + ')'));
        }
        return payload;
    }

    function polishStarterCopy() {
        root.querySelectorAll('.pmd-quick-setup__card-copy p').forEach(function (node) {
            var text = String(node.textContent || '').trim();
            if (text.indexOf('Optional. We can add a small editable sample menu') === 0) {
                node.textContent = 'Optional. We can prepare a fuller editable starter menu based on the restaurant type you selected.';
            }
        });
    }

    function installCompleteButton() {
        var refresh = root.querySelector('[data-pmd-refresh-starter-photos]');
        if (!refresh || root.querySelector('[data-pmd-complete-starter-menu]')) return;

        var button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('data-pmd-complete-starter-menu', '');
        button.textContent = 'Complete starter menu';
        refresh.parentNode.insertBefore(button, refresh);

        button.addEventListener('click', async function (event) {
            event.preventDefault();
            if (button.disabled) return;

            var status = root.querySelector('[data-pmd-starter-photo-status]');
            button.disabled = true;
            refresh.disabled = true;
            if (status) {
                status.classList.remove('is-error');
                status.textContent = 'Adding missing starter categories and foods…';
            }

            try {
                var completed = await handler('onCompleteStarterMenu');
                if (status) {
                    status.textContent = (completed.message || 'Starter menu completed.') + ' Refreshing starter photos…';
                }

                var photos = await handler('onRefreshStarterPhotos');
                if (status) {
                    status.textContent = (completed.message || 'Starter menu completed.') + ' ' + (photos.message || 'Starter photos refreshed.');
                }
            } catch (error) {
                if (status) {
                    status.textContent = error && error.message ? error.message : 'Starter menu update failed.';
                    status.classList.add('is-error');
                }
            } finally {
                button.disabled = false;
                refresh.disabled = false;
            }
        });
    }

    polishStarterCopy();
    installCompleteButton();

    window.PMDTenantQuickSetupV2 = {
        version: '2.0.0',
        completeButton: function () {
            return root.querySelector('[data-pmd-complete-starter-menu]');
        }
    };
})();
