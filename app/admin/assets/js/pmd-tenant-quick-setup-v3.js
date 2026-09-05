/* PMD_TENANT_QUICK_SETUP_V4_CACHE_FIRST */
(function () {
    'use strict';

    var root = document.querySelector('[data-pmd-quick-setup]');
    if (!root) return;

    var form = root.querySelector('[data-pmd-quick-setup-form]');
    var setupBusy = false;
    var photoBusy = false;

    function csrf(formData) {
        var meta = document.querySelector('meta[name="csrf-token"]');
        var input = document.querySelector('input[name="_token"]');
        var token = meta && meta.content ? meta.content : (input ? input.value : '');
        if (token && !formData.has('_token')) formData.append('_token', token);
    }

    function gatewayMessage(name) {
        if (name === 'onApply') {
            return 'The restaurant setup took longer than expected. Please reload this page before trying again so we can confirm what was saved.';
        }
        return 'Starter photo preparation is taking longer than expected. Your restaurant setup is already saved; you can retry the photo refresh.';
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
        var payload = null;
        try {
            payload = raw ? JSON.parse(raw) : {};
        } catch (error) {
            if ([502, 503, 504].indexOf(response.status) !== -1 || /gateway\s+time-?out/i.test(raw)) {
                throw new Error(gatewayMessage(name));
            }
            throw new Error('The server returned an unexpected response. Please try again.');
        }

        if (!response.ok || payload.ok === false) {
            throw new Error(payload.message || ('Request failed (' + response.status + ')'));
        }

        return payload;
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

    function renderResult(payload, starterMenuSelected, photosPending) {
        var result = root.querySelector('[data-pmd-quick-setup-result]');
        if (!result) return null;

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
            wrap.appendChild(text('strong', 'Temporary staff credentials — copy these now'));

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

        var photoStatus = null;
        if (starterMenuSelected) {
            photoStatus = document.createElement('div');
            photoStatus.className = 'pmd-quick-setup__photo-status';
            photoStatus.setAttribute('data-pmd-generated-photo-status', '');
            photoStatus.setAttribute('aria-live', 'polite');
            photoStatus.textContent = photosPending > 0
                ? 'Restaurant is ready. Preparing ' + photosPending + ' uncached starter photos…'
                : 'Starter photos loaded instantly from the PayMyDine image library.';
            result.appendChild(photoStatus);
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

        if (form) form.hidden = true;
        result.scrollIntoView({behavior: 'smooth', block: 'start'});
        return photoStatus;
    }

    function addSummary(target, source) {
        Object.keys(target).forEach(function (key) {
            target[key] += Number(source && source[key] ? source[key] : 0);
        });
    }

    async function refreshStarterPhotos(button, status) {
        if (photoBusy) return;
        photoBusy = true;
        if (button) button.disabled = true;

        var totals = {
            updated: 0,
            cached: 0,
            kept_old: 0,
            skipped_custom: 0,
            menu_missing: 0
        };
        var cursor = 0;
        var total = 0;

        if (status) {
            status.classList.remove('is-error');
            status.textContent = 'Checking the PayMyDine starter photo library…';
        }

        try {
            while (true) {
                var data = new FormData();
                data.append('cursor', String(cursor));
                var payload = await handler('onRefreshStarterPhotos', data);

                addSummary(totals, payload.summary || {});
                cursor = Number(payload.next_cursor || 0);
                total = Number(payload.total || total || 0);

                if (status) {
                    status.textContent = payload.done
                        ? 'Starter photos are ready.'
                        : 'Preparing starter photos · ' + cursor + ' / ' + total;
                }

                if (payload.done || cursor >= total) break;
                await new Promise(function (resolve) { window.setTimeout(resolve, 80); });
            }

            if (status) {
                var details = [];
                if (totals.cached) details.push(totals.cached + ' loaded from library');
                if (totals.updated && totals.updated !== totals.cached) details.push(totals.updated + ' updated');
                if (totals.skipped_custom) details.push(totals.skipped_custom + ' custom kept');
                if (totals.kept_old) details.push(totals.kept_old + ' already ready');
                status.textContent = 'Starter photos are ready' + (details.length ? ' · ' + details.join(' · ') : '') + '.';
            }
        } catch (error) {
            if (status) {
                status.textContent = error && error.message ? error.message : 'Starter photo preparation paused. Your restaurant setup is already saved.';
                status.classList.add('is-error');
            }
        } finally {
            photoBusy = false;
            if (button) button.disabled = false;
        }
    }

    function polishStarterCopy() {
        root.querySelectorAll('.pmd-quick-setup__card-copy p').forEach(function (node) {
            var value = String(node.textContent || '').trim();
            if (value.indexOf('Optional. We can add a small editable sample menu') === 0
                || value.indexOf('Optional. We can prepare a fuller editable starter menu') === 0) {
                node.textContent = 'Optional. We can prepare a complete editable starter menu with at least 100 items for the restaurant type you selected.';
            }
        });
    }

    function installCompletedActions() {
        var refresh = root.querySelector('[data-pmd-refresh-starter-photos]');
        if (!refresh) return;

        refresh.addEventListener('click', function (event) {
            event.preventDefault();
            refreshStarterPhotos(refresh, root.querySelector('[data-pmd-starter-photo-status]'));
        });

        if (root.querySelector('[data-pmd-complete-starter-menu]')) return;
        var button = document.createElement('button');
        button.type = 'button';
        button.setAttribute('data-pmd-complete-starter-menu', '');
        button.textContent = 'Complete starter menu';
        refresh.parentNode.insertBefore(button, refresh);

        button.addEventListener('click', async function (event) {
            event.preventDefault();
            if (button.disabled || photoBusy) return;

            var status = root.querySelector('[data-pmd-starter-photo-status]');
            button.disabled = true;
            refresh.disabled = true;
            if (status) {
                status.classList.remove('is-error');
                status.textContent = 'Adding missing starter categories and foods…';
            }

            try {
                var completed = await handler('onCompleteStarterMenu', new FormData());
                var pending = Number(completed.photos_pending || 0);

                if (pending > 0) {
                    if (status) status.textContent = (completed.message || 'Starter menu completed.') + ' Preparing uncached starter photos…';
                    button.disabled = false;
                    refresh.disabled = false;
                    await refreshStarterPhotos(refresh, status);
                } else {
                    if (status) status.textContent = (completed.message || 'Starter menu completed.') + ' Starter photos loaded from the PayMyDine image library.';
                    button.disabled = false;
                    refresh.disabled = false;
                }
            } catch (error) {
                if (status) {
                    status.textContent = error && error.message ? error.message : 'Starter menu update failed.';
                    status.classList.add('is-error');
                }
                button.disabled = false;
                refresh.disabled = false;
            }
        });
    }

    if (form) {
        form.addEventListener('submit', async function (event) {
            event.preventDefault();
            if (setupBusy) return;

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
            setupBusy = true;
            if (button) button.disabled = true;
            setStatus('Preparing your restaurant…', false);

            try {
                var response = await handler('onApply', data);
                setStatus('', false);

                var pending = Number(response.menu && response.menu.photos_pending ? response.menu.photos_pending : 0);
                var photoStatus = renderResult(response, payload.starter_menu, pending);

                if (payload.starter_menu && pending > 0) {
                    window.setTimeout(function () {
                        refreshStarterPhotos(null, photoStatus);
                    }, 120);
                }
            } catch (error) {
                setStatus(error && error.message ? error.message : 'Quick Setup failed.', true);
            } finally {
                setupBusy = false;
                if (button) button.disabled = false;
            }
        });
    }

    polishStarterCopy();
    installCompletedActions();

    var api = {
        version: '4.0.0',
        collect: collect,
        inspect: function () {
            return {
                setupBusy: setupBusy,
                photoBusy: photoBusy,
                payload: form ? collect() : null
            };
        },
        refreshStarterPhotos: function () {
            return refreshStarterPhotos(
                root.querySelector('[data-pmd-refresh-starter-photos]'),
                root.querySelector('[data-pmd-starter-photo-status],[data-pmd-generated-photo-status]')
            );
        }
    };

    window.PMDTenantQuickSetupV4 = api;
    window.PMDTenantQuickSetupV3 = api;
})();
