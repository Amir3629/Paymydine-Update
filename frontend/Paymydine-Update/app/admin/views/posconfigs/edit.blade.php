<div class="row-fluid">
    {!! form_open([
        'id' => 'edit-form',
        'role' => 'form',
        'method' => 'PATCH',
    ]) !!}

    {!! $this->renderForm() !!}

    {!! form_close() !!}
</div>

<!-- PMD_R2O_SYNC_TABLES_MOUNT_START -->
<div id="pmd-r2o-sync-mount" style="display:none;">
    <button type="button"
       id="pmd-r2o-sync-btn"
       class="btn btn-default"
       data-toolbar-default-sized="1"
       style="align-items:center !important; justify-content:center !important; text-align:center !important; padding:0.55rem 1.75rem !important; min-width:110px !important; width:auto !important; height:40px !important; min-height:40px !important; line-height:1.3 !important; border-radius:12px !important; font-weight:600 !important; background:rgb(241, 244, 251) !important; border:1px solid rgb(201, 210, 227) !important; color:rgb(32, 41, 56) !important; box-shadow:none !important; box-sizing:border-box !important; transition:transform .2s ease, box-shadow .2s ease !important; pointer-events:auto !important; display:inline-flex !important; visibility:visible !important; opacity:1 !important; position:relative !important; z-index:99999 !important; text-decoration:none !important;">
        <i class="fa fa-refresh" style="color:rgb(32, 41, 56) !important;"></i>&nbsp; Sync Tables
    </button>
</div>

<div id="pmd-r2o-sync-overlay"
     style="display:none; position:fixed; inset:0; background:rgba(15,23,42,.42); z-index:2147483000; align-items:center; justify-content:center; padding:20px;">
    <div id="pmd-r2o-sync-modal"
         style="width:min(1100px, calc(100vw - 40px)); max-height:calc(100vh - 40px); overflow:auto; background:#fff; border-radius:18px; box-shadow:0 30px 80px rgba(0,0,0,.28); padding:22px; position:relative; margin:0 auto;">
        <div style="display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:16px;">
            <div>
                <div style="font-size:22px; font-weight:700; color:#223047;">Ready2Order Table Sync</div>
                <div id="pmd-r2o-sync-subtitle" style="font-size:13px; color:#667085; margin-top:4px;">Sync result</div>
            </div>
            <button type="button" id="pmd-r2o-sync-close"
                    style="border:none; background:#eef2f7; color:#223047; width:38px; height:38px; border-radius:10px; font-size:20px; cursor:pointer;">×</button>
        </div>

        <div id="pmd-r2o-sync-summary" style="display:grid; grid-template-columns:repeat(4, minmax(0,1fr)); gap:12px; margin-bottom:18px;"></div>

        <div style="display:grid; grid-template-columns:1fr 1fr; gap:16px; margin-bottom:16px;">
            <div style="border:1px solid #e5e7eb; border-radius:14px; padding:14px;">
                <div style="font-weight:700; margin-bottom:10px; color:#223047;">New tables created in PayMyDine</div>
                <div id="pmd-r2o-created-list" style="font-size:14px; color:#223047;"></div>
            </div>
            <div style="border:1px solid #e5e7eb; border-radius:14px; padding:14px;">
                <div style="font-weight:700; margin-bottom:10px; color:#223047;">Already existing / matched tables</div>
                <div id="pmd-r2o-matched-list" style="font-size:14px; color:#223047;"></div>
            </div>
        </div>

        <div style="border:1px solid #e5e7eb; border-radius:14px; padding:14px; margin-bottom:16px;">
            <div style="font-weight:700; margin-bottom:10px; color:#223047;">All known tables (API + imported orders + mappings)</div>
            <div id="pmd-r2o-fetched-list" style="font-size:14px; color:#223047;"></div>
        </div>

        <div style="border:1px solid #e5e7eb; border-radius:14px; padding:14px;">
            <div style="font-weight:700; margin-bottom:10px; color:#223047;">Warnings / debug</div>
            <pre id="pmd-r2o-debug" style="white-space:pre-wrap; word-break:break-word; font-size:12px; color:#444; background:#f8fafc; padding:12px; border-radius:10px; margin:0;"></pre>
        </div>
    </div>
</div>

<script>
(function () {
    function looksLikeReady2OrderPage() {
        try {
            var txt = ((document.body && document.body.innerText) || '').toLowerCase();
            if (txt.indexOf('ready2order') !== -1) return true;
            if (txt.indexOf('api.ready2order.com') !== -1) return true;
        } catch (e) {}
        return false;
    }

    function esc(v) {
        return String(v == null ? '' : v)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function ensureOverlayInBody() {
        var overlay = document.getElementById('pmd-r2o-sync-overlay');
        if (overlay && overlay.parentNode !== document.body) {
            document.body.appendChild(overlay);
        }
    }

    function showModal() {
        ensureOverlayInBody();
        var overlay = document.getElementById('pmd-r2o-sync-overlay');
        if (overlay) overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    function hideModal() {
        var overlay = document.getElementById('pmd-r2o-sync-overlay');
        if (overlay) overlay.style.display = 'none';
        document.body.style.overflow = '';
    }

    function renderBadges(sync, autoCreate) {
        var cards = [
            ['Tables visible now', sync && sync.fetched_total != null ? sync.fetched_total : 0],
            ['New in mappings', sync && sync.inserted != null ? sync.inserted : 0],
            ['Matched existing', autoCreate && autoCreate.matched_existing != null ? autoCreate.matched_existing : 0],
            ['Created in PMD', autoCreate && autoCreate.created_new_tables != null ? autoCreate.created_new_tables : 0]
        ];
        document.getElementById('pmd-r2o-sync-summary').innerHTML = cards.map(function (x) {
            return '<div style="border:1px solid #e5e7eb; border-radius:14px; padding:14px; background:#f8fafc;">'
                + '<div style="font-size:13px; color:#667085; margin-bottom:6px;">' + esc(x[0]) + '</div>'
                + '<div style="font-size:24px; font-weight:700; color:#223047;">' + esc(x[1]) + '</div>'
                + '</div>';
        }).join('');
    }

    function renderList(elId, rows, emptyText, formatter) {
        var el = document.getElementById(elId);
        if (!rows || !rows.length) {
            el.innerHTML = '<div style="color:#667085;">' + esc(emptyText) + '</div>';
            return;
        }
        el.innerHTML = rows.map(function (row) {
            return '<div style="padding:9px 10px; border:1px solid #eef2f7; border-radius:10px; margin-bottom:8px;">'
                + formatter(row)
                + '</div>';
        }).join('');
    }

    function renderResult(data) {
        var sync = data && data.sync ? data.sync : null;
        var autoCreate = data && data.auto_create ? data.auto_create : null;
        var debug = data && data.debug ? data.debug : {};

        document.getElementById('pmd-r2o-sync-subtitle').innerText =
            data && data.success
                ? 'Sync finished. Review fetched, matched, and newly created tables.'
                : 'Sync finished with warnings. Review debug output below.';

        renderBadges(sync, autoCreate);

        renderList(
            'pmd-r2o-created-list',
            autoCreate && autoCreate.created_tables ? autoCreate.created_tables : [],
            'No new tables were created in PayMyDine.',
            function (r) {
                return '<strong>' + esc(r.external_table_name) + '</strong>'
                    + ' <span style="color:#667085;">→ local table #' + esc(r.local_table_id) + '</span>';
            }
        );

        renderList(
            'pmd-r2o-matched-list',
            autoCreate && autoCreate.matched_tables ? autoCreate.matched_tables : [],
            'No existing tables were matched.',
            function (r) {
                return '<strong>' + esc(r.external_table_name) + '</strong>'
                    + ' <span style="color:#667085;">→ local #' + esc(r.local_table_id || '') + ' ' + esc(r.local_table_name || '') + '</span>';
            }
        );

        renderList(
            'pmd-r2o-fetched-list',
            sync && sync.tables ? sync.tables : [],
            'ready2order did not return any tables.',
            function (r) {
                return '<strong>' + esc(r.external_table_name) + '</strong>'
                    + (r.external_area ? ' <span style="color:#667085;">(' + esc(r.external_area) + ')</span>' : '')
                    + ' <span style="color:#667085;">| external id: ' + esc(r.external_table_id) + ' | sync: ' + esc(r.sync_status) + '</span>';
            }
        );

        document.getElementById('pmd-r2o-debug').textContent = JSON.stringify(debug, null, 2);
        showModal();
    }

    function bindAjax(btn) {
        if (!btn || btn.dataset.bound === '1') return;
        btn.dataset.bound = '1';

        btn.addEventListener('click', function (e) {
            e.preventDefault();

            var oldHtml = btn.innerHTML;
            btn.innerHTML = '<i class="fa fa-refresh" style="color:rgb(32, 41, 56) !important;"></i>&nbsp; Syncing Tables...';
            btn.style.pointerEvents = 'none';

            fetch("{{ url('r2o_sync_tables_ajax.php') }}", {
                method: 'GET',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Accept': 'application/json'
                },
                credentials: 'same-origin'
            })
            .then(function (r) {
                if (!r.ok) throw new Error('HTTP ' + r.status);
                return r.json();
            })
            .then(function (data) {
                renderResult(data || {});
            })
            .catch(function (err) {
                renderResult({
                    success: false,
                    debug: { error: String(err && err.message ? err.message : err) }
                });
            })
            .finally(function () {
                btn.innerHTML = oldHtml;
                btn.style.pointerEvents = 'auto';
            });
        });
    }

    function mountR2OButton() {
        if (!looksLikeReady2OrderPage()) return;

        var toolbar = document.querySelector('.toolbar-pos-configs-edit-right');
        var btn = document.getElementById('pmd-r2o-sync-btn');
        if (!toolbar || !btn) return;

        if (!document.getElementById('pmd-r2o-sync-btn-mounted')) {
            btn.id = 'pmd-r2o-sync-btn-mounted';
            toolbar.appendChild(btn);
        }

        bindAjax(document.getElementById('pmd-r2o-sync-btn-mounted'));
        ensureOverlayInBody();
    }

    document.addEventListener('DOMContentLoaded', function () {
        mountR2OButton();
        setTimeout(mountR2OButton, 300);
        setTimeout(mountR2OButton, 1000);

        var closeBtn = document.getElementById('pmd-r2o-sync-close');
        var overlay = document.getElementById('pmd-r2o-sync-overlay');

        if (closeBtn) {
            closeBtn.addEventListener('click', hideModal);
        }

        if (overlay) {
            overlay.addEventListener('click', function (e) {
                if (e.target === overlay) hideModal();
            });
        }

        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape') hideModal();
        });
    });
})();
</script>
<!-- PMD_R2O_SYNC_TABLES_MOUNT_END -->



<script>
// PMD_HIDE_R2O_MODAL_SECTIONS_SAFE
(function () {
    function hideR2OSections() {
        try {
            var fetched = document.getElementById('pmd-r2o-fetched-list');
            if (fetched) {
                var fetchedCard = fetched.closest('div[style*="border:1px solid #e5e7eb"]');
                if (fetchedCard) fetchedCard.style.display = 'none';
            }

            var debug = document.getElementById('pmd-r2o-debug');
            if (debug) {
                var debugCard = debug.closest('div[style*="border:1px solid #e5e7eb"]');
                if (debugCard) debugCard.style.display = 'none';
            }
        } catch (e) {
            console.warn('PMD hide-only patch warning:', e);
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        hideR2OSections();

        var obs = new MutationObserver(function () {
            hideR2OSections();
        });

        obs.observe(document.body, {
            childList: true,
            subtree: true
        });
    });
})();
</script>

