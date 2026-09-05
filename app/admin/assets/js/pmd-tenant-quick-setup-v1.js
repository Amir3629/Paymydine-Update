/* PMD_TENANT_QUICK_SETUP_V1 */
(function () {
    'use strict';

    var root = document.querySelector('[data-pmd-quick-setup]');
    if (!root) return;

    var form = root.querySelector('[data-pmd-quick-setup-form]');

    var busy = false;

    function csrf(formData) {
        var meta = document.querySelector('meta[name="csrf-token"]');
        var input = document.querySelector('input[name="_token"]');
        var token = meta && meta.content ? meta.content : (input ? input.value : '');
        if (token && !formData.has('_token')) formData.append('_token', token);
    }

    async function handler(name, data) {
        data = data || new FormData();
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

    async function refreshStarterPhotos(button) {
        if (busy) return;
        var status = root.querySelector('[data-pmd-starter-photo-status]');
        busy = true;
        if (button) button.disabled = true;
        if (status) {
            status.textContent = 'Finding better photos and replacing only Quick Setup starter images…';
            status.classList.remove('is-error');
        }

        try {
            var payload = await handler('onRefreshStarterPhotos', new FormData());
            if (status) status.textContent = payload.message || 'Premium starter photos refreshed.';
        } catch (error) {
            if (status) {
                status.textContent = error && error.message ? error.message : 'Starter photos could not be refreshed.';
                status.classList.add('is-error');
            }
        } finally {
            busy = false;
            if (button) button.disabled = false;
        }
    }

    var refreshButton = root.querySelector('[data-pmd-refresh-starter-photos]');
    if (refreshButton) {
        refreshButton.addEventListener('click', function (event) {
            event.preventDefault();
            refreshStarterPhotos(refreshButton);
        });
    }

    function makeFloorRow() {
        var row = document.createElement('div');
        row.className = 'pmd-quick-setup__row';
        row.setAttribute('data-pmd-floor-row', '');
        row.innerHTML = ''
            + '<label><span>Floor name</span><input type="text" data-pmd-floor-name maxlength="80" placeholder="Terrace"></label>'
            + '<label class="is-small"><span>Tables</span><input type="number" data-pmd-floor-tables value="6" min="1" max="60"></label>'
            + '<button type="button" class="pmd-quick-setup__remove" data-pmd-remove-row aria-label="Remove floor">×</button>';
        return row;
    }

    function makeKdsRow() {
        var row = document.createElement('div');
        row.className = 'pmd-quick-setup__row';
        row.setAttribute('data-pmd-kds-row', '');
        row.innerHTML = ''
            + '<label><span>Station name</span><input type="text" data-pmd-kds-name maxlength="128" placeholder="Grill"></label>'
            + '<button type="button" class="pmd-quick-setup__remove" data-pmd-remove-row aria-label="Remove KDS">×</button>';
        return row;
    }

    root.addEventListener('click', function (event) {
        var addFloor = event.target.closest('[data-pmd-add-floor]');
        if (addFloor) {
            event.preventDefault();
            var host = root.querySelector('[data-pmd-floor-rows]');
            if (host && host.children.length < 8) host.appendChild(makeFloorRow());
            return;
        }

        var addKds = event.target.closest('[data-pmd-add-kds]');
        if (addKds) {
            event.preventDefault();
            var kdsHost = root.querySelector('[data-pmd-kds-rows]');
            if (kdsHost && kdsHost.children.length < 10) kdsHost.appendChild(makeKdsRow());
            return;
        }

        var remove = event.target.closest('[data-pmd-remove-row]');
        if (remove) {
            event.preventDefault();
            var row = remove.closest('[data-pmd-floor-row],[data-pmd-kds-row]');
            if (!row) return;

            if (row.matches('[data-pmd-floor-row]')) {
                var floorHost = root.querySelector('[data-pmd-floor-rows]');
                if (floorHost && floorHost.children.length <= 1) return;
            }
            row.remove();
        }
    });

    function value(selector) {
        var node = root.querySelector(selector);
        return node ? String(node.value || '').trim() : '';
    }

    function collect() {
        var selectedType = root.querySelector('input[name="restaurant_type"]:checked');
        var floors = Array.prototype.slice.call(root.querySelectorAll('[data-pmd-floor-row]')).map(function (row) {
            return {
                name: String(row.querySelector('[data-pmd-floor-name]')?.value || '').trim(),
                tables: Number(row.querySelector('[data-pmd-floor-tables]')?.value || 0)
            };
        }).filter(function (row) { return row.name && row.tables > 0; });

        var staff = {};
        root.querySelectorAll('[data-pmd-staff-count]').forEach(function (input) {
            staff[input.getAttribute('data-pmd-staff-count')] = Number(input.value || 0);
        });

        var kds = Array.prototype.slice.call(root.querySelectorAll('[data-pmd-kds-row]')).map(function (row) {
            return {name: String(row.querySelector('[data-pmd-kds-name]')?.value || '').trim()};
        }).filter(function (row) { return row.name; });

        return {
            restaurant_type: selectedType ? selectedType.value : '',
            floors: floors,
            staff: staff,
            kds: kds,
            starter_menu: Boolean(root.querySelector('[data-pmd-starter-menu]')?.checked)
        };
    }

    function setStatus(message, error) {
        var node = root.querySelector('[data-pmd-quick-setup-status]');
        if (!node) return;
        node.textContent = message || '';
        node.classList.toggle('is-error', Boolean(error));
    }

    function text(tag, value) {
        var node = document.createElement(tag);
        node.textContent = value;
        return node;
    }

    function renderResult(payload) {
        var result = root.querySelector('[data-pmd-quick-setup-result]');
        if (!result) return;
        result.hidden = false;
        result.innerHTML = '';

        result.appendChild(text('h2', 'Your restaurant setup is ready.'));
        result.appendChild(text('p', 'Theme, restaurant structure and selected starter data were prepared. Everything remains editable.'));

        var credentials = payload.staff && Array.isArray(payload.staff.credentials)
            ? payload.staff.credentials
            : [];

        if (credentials.length) {
            var wrap = document.createElement('div');
            wrap.className = 'pmd-quick-setup__credentials';
            var title = text('strong', 'Temporary staff credentials — copy these now');
            wrap.appendChild(title);

            var table = document.createElement('table');
            var thead = document.createElement('thead');
            var hr = document.createElement('tr');
            ['Role', 'Name', 'Username', 'Temporary password'].forEach(function (label) {
                var th = document.createElement('th');
                th.textContent = label;
                hr.appendChild(th);
            });
            thead.appendChild(hr);
            table.appendChild(thead);

            var tbody = document.createElement('tbody');
            credentials.forEach(function (entry) {
                var tr = document.createElement('tr');
                [entry.role, entry.name, entry.username, entry.temporary_password].forEach(function (cell) {
                    var td = document.createElement('td');
                    td.textContent = String(cell || '');
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            wrap.appendChild(table);
            result.appendChild(wrap);
        }

        var actions = document.createElement('div');
        actions.className = 'pmd-quick-setup__done-actions';
        [
            ['/admin/dashboardlab', 'Open dashboard'],
            ['/admin/pmdmenus', 'Review menu'],
            ['/admin/pmdteam', 'Review team']
        ].forEach(function (entry) {
            var link = document.createElement('a');
            link.href = entry[0];
            link.textContent = entry[1];
            actions.appendChild(link);
        });
        result.appendChild(actions);

        form.hidden = true;
        result.scrollIntoView({behavior: 'smooth', block: 'start'});
    }

    if (form) form.addEventListener('submit', async function (event) {
        event.preventDefault();
        if (busy) return;

        var payload = collect();
        if (!payload.restaurant_type) {
            setStatus('Choose a restaurant type.', true);
            return;
        }
        if (!payload.floors.length) {
            setStatus('Add at least one Floor with tables.', true);
            return;
        }

        var data = new FormData();
        data.append('payload', JSON.stringify(payload));

        var button = root.querySelector('[data-pmd-quick-setup-submit]');
        busy = true;
        if (button) button.disabled = true;
        setStatus('Preparing your restaurant…', false);

        try {
            var response = await handler('onApply', data);
            setStatus('', false);
            renderResult(response);
        } catch (error) {
            setStatus(error && error.message ? error.message : 'Quick Setup failed.', true);
        } finally {
            busy = false;
            if (button) button.disabled = false;
        }
    });

    window.PMDTenantQuickSetupV1 = {
        version: '1.0.0',
        collect: collect,
        inspect: function () {
            return {busy: busy, payload: collect()};
        }
    };
})();
