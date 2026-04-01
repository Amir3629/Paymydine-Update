<style>
    /* Orders list row styling with status colors */
    .list-table tbody tr {
        border-left: 4px solid transparent;
    }
    
    .list-table tbody tr:hover {
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        transform: translateY(-1px);
    }
    
    /* Smooth transitions for all order rows */
    .list-table tbody tr {
        transition: all 0.3s ease, background-color 0.3s ease, transform 0.2s ease;
    }
    
    /* Make text slightly more prominent on colored backgrounds */
    .list-table tbody tr td {
        font-weight: 500;
    }
    
    /* Make rows bigger - increased padding and height for better touch interaction */
    .list-table tbody tr {
        min-height: 60px !important;
        height: auto !important;
    }
    
    .list-table tbody tr td {
        padding: 16px 12px !important;
        vertical-align: middle !important;
        font-size: 15px !important;
        line-height: 1.5 !important;
    }
    
    /* Make buttons and icons bigger in rows */
    .list-table tbody tr td .btn,
    .list-table tbody tr td .list-action {
        min-height: 40px !important;
        padding: 8px 12px !important;
        font-size: 14px !important;
    }
    
    .list-table tbody tr td .btn i,
    .list-table tbody tr td .list-action i {
        font-size: 16px !important;
    }
    
    /* Make edit button bigger - larger for better touch interaction */
    .list-table tbody tr td .btn-edit {
        min-height: 48px !important;
        min-width: 48px !important;
        height: 48px !important;
        width: 48px !important;
        padding: 12px 16px !important;
        font-size: 16px !important;
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        border-radius: 20px !important;
    }
    
    .list-table tbody tr td .btn-edit i {
        font-size: 20px !important;
        margin: 0 !important;
    }
    
    /* Keep buttons and checkboxes visible */
    .list-table tbody tr .list-action {
        background-color: transparent !important;
    }
    
    /* Hide bulk selection summary and select-all controls */
    .list-table .bulk-actions .btn-counter,
    .list-table .bulk-actions .btn-select-all,
    .list-table .bulk-actions .btn-counter + span,
    .list-table .bulk-actions .btn-select-all.btn {
        display: none !important;
    }
    
    
    /* History toggle styles - instant, no effects */
    .order-row.hide-row {
        display: none !important;
    }
    
    /* Base state: Light background, dark text, medium border */
    .orders-history-toggle:not(.active) {
        background: rgb(241, 244, 251) !important;
        color: rgb(32, 41, 56) !important;
        border-color: rgb(201, 210, 227) !important;
    }
    
    /* Hover state: Darker border, keep dark text for contrast */
    .orders-history-toggle:not(.active):hover {
        background: rgb(233, 237, 246) !important;
        color: rgb(32, 41, 56) !important; /* Keep dark text */
        border-color: rgb(141, 157, 185) !important; /* Darker border - different from text */
    }
    
    /* Force dark text and icon on hover - highest specificity */
    .orders-history-toggle:not(.active):hover,
    .orders-history-toggle:not(.active):hover *,
    .orders-history-toggle:not(.active):hover i,
    .orders-history-toggle:not(.active):hover span,
    button.orders-history-toggle:not(.active):hover,
    button.orders-history-toggle:not(.active):hover *,
    button.orders-history-toggle:not(.active):hover i,
    button.orders-history-toggle:not(.active):hover span,
    .btn.orders-history-toggle:not(.active):hover,
    .btn.orders-history-toggle:not(.active):hover *,
    .btn.orders-history-toggle:not(.active):hover i,
    .btn.orders-history-toggle:not(.active):hover span,
    .btn.btn-light.orders-history-toggle:not(.active):hover,
    .btn.btn-light.orders-history-toggle:not(.active):hover *,
    .btn.btn-light.orders-history-toggle:not(.active):hover i,
    .btn.btn-light.orders-history-toggle:not(.active):hover span {
        color: rgb(32, 41, 56) !important; /* Force dark text - NEVER white on hover when not active */
    }
    
    /* Focus state: Similar to hover but with focus ring */
    .orders-history-toggle:not(.active):focus,
    .orders-history-toggle:not(.active):focus-visible {
        background: rgb(233, 237, 246) !important;
        color: rgb(32, 41, 56) !important; /* Keep dark text */
        border-color: rgb(141, 157, 185) !important; /* Darker border */
        box-shadow: 0 0 0 0.2rem rgba(141, 157, 185, 0.25) !important;
        outline: none !important;
    }
    
    /* Force dark text and icon on focus - highest specificity */
    .orders-history-toggle:not(.active):focus,
    .orders-history-toggle:not(.active):focus-visible,
    .orders-history-toggle:not(.active):focus *,
    .orders-history-toggle:not(.active):focus-visible *,
    .orders-history-toggle:not(.active):focus i,
    .orders-history-toggle:not(.active):focus-visible i,
    .orders-history-toggle:not(.active):focus span,
    .orders-history-toggle:not(.active):focus-visible span,
    button.orders-history-toggle:not(.active):focus,
    button.orders-history-toggle:not(.active):focus *,
    button.orders-history-toggle:not(.active):focus i,
    button.orders-history-toggle:not(.active):focus span,
    .btn.orders-history-toggle:not(.active):focus,
    .btn.orders-history-toggle:not(.active):focus *,
    .btn.orders-history-toggle:not(.active):focus i,
    .btn.orders-history-toggle:not(.active):focus span,
    .btn.btn-light.orders-history-toggle:not(.active):focus,
    .btn.btn-light.orders-history-toggle:not(.active):focus *,
    .btn.btn-light.orders-history-toggle:not(.active):focus i,
    .btn.btn-light.orders-history-toggle:not(.active):focus span {
        color: rgb(32, 41, 56) !important; /* Force dark text - NEVER white on focus when not active */
    }
    
    /* Active (pressed) state: Even darker border, keep dark text */
    .orders-history-toggle:not(.active):active {
        background: rgb(225, 230, 241) !important;
        color: rgb(32, 41, 56) !important; /* Keep dark text */
        border-color: rgb(100, 120, 155) !important; /* Even darker border */
    }
    
    /* Force dark text and icon on active (pressed) - highest specificity */
    .orders-history-toggle:not(.active):active,
    .orders-history-toggle:not(.active):active *,
    .orders-history-toggle:not(.active):active i,
    .orders-history-toggle:not(.active):active span,
    button.orders-history-toggle:not(.active):active,
    button.orders-history-toggle:not(.active):active *,
    button.orders-history-toggle:not(.active):active i,
    button.orders-history-toggle:not(.active):active span,
    .btn.orders-history-toggle:not(.active):active,
    .btn.orders-history-toggle:not(.active):active *,
    .btn.orders-history-toggle:not(.active):active i,
    .btn.orders-history-toggle:not(.active):active span,
    .btn.btn-light.orders-history-toggle:not(.active):active,
    .btn.btn-light.orders-history-toggle:not(.active):active *,
    .btn.btn-light.orders-history-toggle:not(.active):active i,
    .btn.btn-light.orders-history-toggle:not(.active):active span {
        color: rgb(32, 41, 56) !important; /* Force dark text - NEVER white when pressed (not active) */
    }
    
    /* Active state (toggled on): Light background, dark text - same as inactive */
    .orders-history-toggle.active {
        background: rgb(241, 244, 251) !important;
        color: rgb(32, 41, 56) !important; /* Dark text - NOT white */
        border-color: rgb(201, 210, 227) !important;
    }
    
    /* Force dark text and icon on active state - highest specificity */
    .orders-history-toggle.active,
    .orders-history-toggle.active *,
    .orders-history-toggle.active i,
    .orders-history-toggle.active span,
    button.orders-history-toggle.active,
    button.orders-history-toggle.active *,
    button.orders-history-toggle.active i,
    button.orders-history-toggle.active span,
    .btn.orders-history-toggle.active,
    .btn.orders-history-toggle.active *,
    .btn.orders-history-toggle.active i,
    .btn.orders-history-toggle.active span,
    .btn.btn-light.orders-history-toggle.active,
    .btn.btn-light.orders-history-toggle.active *,
    .btn.btn-light.orders-history-toggle.active i,
    .btn.btn-light.orders-history-toggle.active span {
        color: rgb(32, 41, 56) !important; /* Force dark text - NEVER white when active */
    }
    
    /* Active state hover: Darker border, keep dark text */
    .orders-history-toggle.active:hover {
        background: rgb(233, 237, 246) !important;
        color: rgb(32, 41, 56) !important; /* Dark text - NOT white */
        border-color: rgb(141, 157, 185) !important; /* Darker border */
    }
    
    /* Force dark text and icon on active hover - highest specificity */
    .orders-history-toggle.active:hover,
    .orders-history-toggle.active:hover *,
    .orders-history-toggle.active:hover i,
    .orders-history-toggle.active:hover span,
    button.orders-history-toggle.active:hover,
    button.orders-history-toggle.active:hover *,
    button.orders-history-toggle.active:hover i,
    button.orders-history-toggle.active:hover span,
    .btn.orders-history-toggle.active:hover,
    .btn.orders-history-toggle.active:hover *,
    .btn.orders-history-toggle.active:hover i,
    .btn.orders-history-toggle.active:hover span,
    .btn.btn-light.orders-history-toggle.active:hover,
    .btn.btn-light.orders-history-toggle.active:hover *,
    .btn.btn-light.orders-history-toggle.active:hover i,
    .btn.btn-light.orders-history-toggle.active:hover span {
        color: rgb(32, 41, 56) !important; /* Force dark text - NEVER white on hover when active */
    }
    
    /* Active state focus */
    .orders-history-toggle.active:focus,
    .orders-history-toggle.active:focus-visible {
        background: rgb(233, 237, 246) !important;
        color: rgb(32, 41, 56) !important; /* Dark text - NOT white */
        border-color: rgb(141, 157, 185) !important; /* Darker border */
        box-shadow: 0 0 0 0.2rem rgba(141, 157, 185, 0.25) !important;
        outline: none !important;
    }
    
    /* Force dark text and icon on active focus - highest specificity */
    .orders-history-toggle.active:focus,
    .orders-history-toggle.active:focus-visible,
    .orders-history-toggle.active:focus *,
    .orders-history-toggle.active:focus-visible *,
    .orders-history-toggle.active:focus i,
    .orders-history-toggle.active:focus-visible i,
    .orders-history-toggle.active:focus span,
    .orders-history-toggle.active:focus-visible span,
    button.orders-history-toggle.active:focus,
    button.orders-history-toggle.active:focus *,
    button.orders-history-toggle.active:focus i,
    button.orders-history-toggle.active:focus span,
    .btn.orders-history-toggle.active:focus,
    .btn.orders-history-toggle.active:focus *,
    .btn.orders-history-toggle.active:focus i,
    .btn.orders-history-toggle.active:focus span,
    .btn.btn-light.orders-history-toggle.active:focus,
    .btn.btn-light.orders-history-toggle.active:focus *,
    .btn.btn-light.orders-history-toggle.active:focus i,
    .btn.btn-light.orders-history-toggle.active:focus span {
        color: rgb(32, 41, 56) !important; /* Force dark text - NEVER white on focus when active */
    }
    
    /* Active state pressed */
    .orders-history-toggle.active:active {
        background: rgb(225, 230, 241) !important;
        color: rgb(32, 41, 56) !important; /* Dark text - NOT white */
        border-color: rgb(100, 120, 155) !important; /* Even darker border */
    }
    
    /* Force dark text and icon on active pressed - highest specificity */
    .orders-history-toggle.active:active,
    .orders-history-toggle.active:active *,
    .orders-history-toggle.active:active i,
    .orders-history-toggle.active:active span,
    button.orders-history-toggle.active:active,
    button.orders-history-toggle.active:active *,
    button.orders-history-toggle.active:active i,
    button.orders-history-toggle.active:active span,
    .btn.orders-history-toggle.active:active,
    .btn.orders-history-toggle.active:active *,
    .btn.orders-history-toggle.active:active i,
    .btn.orders-history-toggle.active:active span,
    .btn.btn-light.orders-history-toggle.active:active,
    .btn.btn-light.orders-history-toggle.active:active *,
    .btn.btn-light.orders-history-toggle.active:active i,
    .btn.btn-light.orders-history-toggle.active:active span {
        color: rgb(32, 41, 56) !important; /* Force dark text - NEVER white when pressed (active) */
    }
    
    /* History button icon - dark when NOT active (all states) */
    .orders-history-toggle:not(.active) i,
    .orders-history-toggle:not(.active):hover i,
    .orders-history-toggle:not(.active):focus i,
    .orders-history-toggle:not(.active):active i,
    button.orders-history-toggle:not(.active) i,
    button.orders-history-toggle:not(.active):hover i,
    button.orders-history-toggle:not(.active):focus i,
    button.orders-history-toggle:not(.active):active i,
    .btn.orders-history-toggle:not(.active) i,
    .btn.orders-history-toggle:not(.active):hover i,
    .btn.orders-history-toggle:not(.active):focus i,
    .btn.orders-history-toggle:not(.active):active i,
    .btn.btn-light.orders-history-toggle:not(.active) i,
    .btn.btn-light.orders-history-toggle:not(.active):hover i,
    .btn.btn-light.orders-history-toggle:not(.active):focus i,
    .btn.btn-light.orders-history-toggle:not(.active):active i {
        color: rgb(32, 41, 56) !important; /* Dark icon - NEVER white when not active */
        margin-right: 8px !important;
    }
    
    /* History button icon - dark when active (same as inactive) */
    .orders-history-toggle.active i,
    .orders-history-toggle.active:hover i,
    .orders-history-toggle.active:focus i,
    .orders-history-toggle.active:active i,
    button.orders-history-toggle.active i,
    button.orders-history-toggle.active:hover i,
    button.orders-history-toggle.active:focus i,
    button.orders-history-toggle.active:active i,
    .btn.orders-history-toggle.active i,
    .btn.orders-history-toggle.active:hover i,
    .btn.orders-history-toggle.active:focus i,
    .btn.orders-history-toggle.active:active i,
    .btn.btn-light.orders-history-toggle.active i,
    .btn.btn-light.orders-history-toggle.active:hover i,
    .btn.btn-light.orders-history-toggle.active:focus i,
    .btn.btn-light.orders-history-toggle.active:active i {
        color: rgb(32, 41, 56) !important; /* Dark icon - NOT white when active */
        margin-right: 8px !important;
    }
    
    /* History button spacing - text */
    .orders-history-toggle span {
        margin-left: 4px !important;
    }
    
    /* Ensure History button text maintains dark color when NOT active (all states) */
    .orders-history-toggle:not(.active) span,
    .orders-history-toggle:not(.active):hover span,
    .orders-history-toggle:not(.active):focus span,
    .orders-history-toggle:not(.active):active span,
    button.orders-history-toggle:not(.active) span,
    button.orders-history-toggle:not(.active):hover span,
    button.orders-history-toggle:not(.active):focus span,
    button.orders-history-toggle:not(.active):active span,
    .btn.orders-history-toggle:not(.active) span,
    .btn.orders-history-toggle:not(.active):hover span,
    .btn.orders-history-toggle:not(.active):focus span,
    .btn.orders-history-toggle:not(.active):active span,
    .btn.btn-light.orders-history-toggle:not(.active) span,
    .btn.btn-light.orders-history-toggle:not(.active):hover span,
    .btn.btn-light.orders-history-toggle:not(.active):focus span,
    .btn.btn-light.orders-history-toggle:not(.active):active span {
        color: rgb(32, 41, 56) !important; /* Dark text - NEVER white when not active */
    }
    
    /* Dark text and icon when active (same as inactive) */
    .orders-history-toggle.active span,
    .orders-history-toggle.active:hover span,
    .orders-history-toggle.active:focus span,
    .orders-history-toggle.active:active span,
    button.orders-history-toggle.active span,
    button.orders-history-toggle.active:hover span,
    button.orders-history-toggle.active:focus span,
    button.orders-history-toggle.active:active span,
    .btn.orders-history-toggle.active span,
    .btn.orders-history-toggle.active:hover span,
    .btn.orders-history-toggle.active:focus span,
    .btn.orders-history-toggle.active:active span,
    .btn.btn-light.orders-history-toggle.active span,
    .btn.btn-light.orders-history-toggle.active:hover span,
    .btn.btn-light.orders-history-toggle.active:focus span,
    .btn.btn-light.orders-history-toggle.active:active span {
        color: rgb(32, 41, 56) !important; /* Dark text - NOT white when active */
    }
    
    /* Orders status panel – مستطيل: horizontal bar, all buttons in one row */
    .orders-status-panel {
        position: fixed;
        z-index: 100000;
        display: flex;
        flex-direction: row;
        flex-wrap: nowrap;
        align-items: stretch;
        gap: 0;
        background: #fff;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.15), 0 0 1px rgba(0,0,0,0.1);
        border: 1px solid #e5e9f2;
        padding: 6px;
        overflow: hidden;
    }
    .orders-status-option {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        white-space: nowrap;
        padding: 10px 14px;
        margin: 0;
        border: none;
        border-radius: 0;
        background: transparent;
        color: #5c6370;
        font-weight: 500;
        font-size: 13px;
        cursor: pointer;
        transition: color 0.15s ease;
        text-decoration: none;
        line-height: 1.3;
        border-bottom: 2px solid #d0d3d9;
    }
    .orders-status-option:hover {
        color: #2d3139;
        border-bottom-color: #9ca0a8;
    }
    .orders-status-option:not(:last-child) {
        margin-right: 8px;
    }
</style>

<div class="row-fluid">
    {!! $this->renderList() !!}


<!-- PMD_R2O_ORDERS_TABLE_NAME_FIX_START -->
<script>
(function () {
    function getOrderIdFromRow(tr) {
        try {
            var tds = tr.querySelectorAll('td');
            if (!tds || tds.length < 5) return null;

            var idCell = tds[2];
            if (!idCell) return null;

            var txt = (idCell.innerText || idCell.textContent || '').trim();
            if (/^\d+$/.test(txt)) return txt;

            var link = tr.querySelector('a[href*="/admin/orders/edit/"]');
            if (link) {
                var m = link.getAttribute('href').match(/\/admin\/orders\/edit\/(\d+)/);
                if (m) return m[1];
            }
        } catch (e) {}

        return null;
    }

    function getTableCellFromRow(tr) {
        try {
            var tds = tr.querySelectorAll('td');
            if (!tds || tds.length < 5) return null;
            return tds[4];
        } catch (e) {
            return null;
        }
    }

    function applyMap(data) {
        if (!data || !data.orders) return;

        var rows = document.querySelectorAll('table tbody tr');
        rows.forEach(function (tr) {
            var orderId = getOrderIdFromRow(tr);
            if (!orderId) return;

            var rowData = data.orders[String(orderId)];
            if (!rowData || !rowData.table_name) return;

            var cell = getTableCellFromRow(tr);
            if (!cell) return;

            var current = (cell.innerText || cell.textContent || '').trim();
            if (current === rowData.table_name) return;

            cell.textContent = rowData.table_name;
            cell.setAttribute('data-r2o-table-fixed', '1');
        });
    }

    function loadAndApply() {
        fetch("{{ url('r2o_order_table_names_ajax.php') }}", {
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
            applyMap(data);
        })
        .catch(function (err) {
            console.log('R2O table name fix skipped:', err.message);
        });
    }

    function init() {
        loadAndApply();
        setTimeout(loadAndApply, 500);
        setTimeout(loadAndApply, 1500);
        setTimeout(loadAndApply, 3000);

        var target = document.querySelector('table tbody') || document.body;
        if (!target) return;

        var obs = new MutationObserver(function () {
            loadAndApply();
        });

        obs.observe(target, {
            childList: true,
            subtree: true
        });
    }

    document.addEventListener('DOMContentLoaded', init);
})();
</script>
<!-- PMD_R2O_ORDERS_TABLE_NAME_FIX_END -->

</div>

<script>
(function() {
    'use strict';
    
    let isHistoryMode = false;
    
    // Toggle function
    window.toggleOrdersHistory = function(button) {
        isHistoryMode = !isHistoryMode;
        const rows = document.querySelectorAll('tbody tr.order-row');
        
        if (!rows.length) {
            console.warn('No order rows found');
            return false;
        }
        
        // Update button state
        if (button) {
            const icon = button.querySelector('i');
            if (isHistoryMode) {
                button.classList.add('active');
                if (icon) {
                    icon.className = 'fa fa-list';
                    button.innerHTML = '<i class="fa fa-list"></i> <span>Active Orders</span>';
                } else {
                    button.innerHTML = '<i class="fa fa-list"></i> <span>Active Orders</span>';
                }
            } else {
                button.classList.remove('active');
                if (icon) {
                    icon.className = 'fa fa-history';
                    button.innerHTML = '<i class="fa fa-history"></i> <span>History</span>';
                } else {
                    button.innerHTML = '<i class="fa fa-history"></i> <span>History</span>';
                }
            }
        }
        
        // Toggle rows instantly - no effects
        rows.forEach((row) => {
            const isHistoryRow = row.getAttribute('data-is-history') === '1';
            
            if (isHistoryMode) {
                // Show only history rows
                if (isHistoryRow) {
                    row.classList.remove('hide-row', 'fade-out', 'fade-in');
                    row.style.display = '';
                } else {
                    row.classList.add('hide-row');
                    row.style.display = 'none';
                }
            } else {
                // Show only active rows
                if (!isHistoryRow) {
                    row.classList.remove('hide-row', 'fade-out', 'fade-in');
                    row.style.display = '';
                } else {
                    row.classList.add('hide-row');
                    row.style.display = 'none';
                }
            }
        });
        
        return false;
    };
    
    // Initialize on page load
    function initOrdersHistoryToggle() {
        const rows = document.querySelectorAll('tbody tr.order-row, tbody tr[id^="order-row-"]');
        
        // By default, hide history rows
        rows.forEach(row => {
            const isHistoryRow = row.getAttribute('data-is-history') === '1';
            if (isHistoryRow && !isHistoryMode) {
                row.classList.add('hide-row');
                row.style.display = 'none';
            }
        });
        
        // Find button by ID or class
        const historyBtn = document.getElementById('orders-history-btn') || 
                          document.querySelector('button.orders-history-toggle');
        
        // Add click event listener as backup (in case onclick doesn't work)
        if (historyBtn && !historyBtn.dataset.listenerAdded) {
            historyBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                window.toggleOrdersHistory(this);
                return false;
            });
            historyBtn.dataset.listenerAdded = 'true';
        }
    }
    
    // Run on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initOrdersHistoryToggle);
    } else {
        setTimeout(initOrdersHistoryToggle, 500);
    }
    
    // Also listen for AJAX updates (when list refreshes)
    document.addEventListener('ajaxUpdate', function() {
        setTimeout(initOrdersHistoryToggle, 300);
        // Reapply current mode after refresh
        if (isHistoryMode) {
            setTimeout(() => {
                const btn = document.getElementById('orders-history-btn') || 
                           document.querySelector('button.orders-history-toggle');
                if (btn) toggleOrdersHistory(btn);
            }, 500);
        }
    });
    
    // Event delegation as ultimate fallback
    document.addEventListener('click', function(e) {
        const btn = e.target.closest('button.orders-history-toggle');
        if (btn && !e.defaultPrevented) {
            e.preventDefault();
            e.stopPropagation();
            window.toggleOrdersHistory(btn);
            return false;
        }
    }, true);
})();
</script>

<script>
// Orders status panel: open floating panel on trigger click, no in-table dropdown
(function() {
    'use strict';
    let panelEl = null;

    function closePanel() {
        if (panelEl && panelEl.parentNode) {
            panelEl.parentNode.removeChild(panelEl);
            panelEl = null;
        }
        document.removeEventListener('click', outsideClick);
    }

    function outsideClick(e) {
        if (panelEl && !panelEl.contains(e.target) && !e.target.closest('.orders-status-trigger')) {
            closePanel();
        }
    }

    function openPanel(trigger) {
        closePanel();
        var optionsJson = trigger.getAttribute('data-options') || '[]';
        var options = [];
        try {
            options = JSON.parse(optionsJson.replace(/\\u0022/g, '"').replace(/\\u0027/g, "'"));
        } catch (err) {
            return;
        }
        if (!options.length) return;

        var recordId = trigger.getAttribute('data-record-id');
        var rect = trigger.getBoundingClientRect();
        var panel = document.createElement('div');
        panel.className = 'orders-status-panel';
        panel.setAttribute('role', 'menu');

        options.forEach(function(opt) {
            var btn = document.createElement('button');
            btn.type = 'button';
            btn.className = 'orders-status-option';
            btn.setAttribute('role', 'menuitem');
            var c = opt.color || '#6c757d';
            btn.style.borderBottomColor = c;
            btn.textContent = opt.name;
            btn.dataset.recordId = recordId;
            btn.dataset.statusId = String(opt.id);
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                var form = document.querySelector('form[data-request]') || document.querySelector('.list-table') && document.querySelector('.list-table').closest('form');
                if (form && typeof jQuery !== 'undefined' && jQuery(form).request) {
                    jQuery(form).request('onUpdateStatus', {
                        data: { recordId: recordId, statusId: opt.id }
                    });
                }
                closePanel();
            });
            panel.appendChild(btn);
        });

        document.body.appendChild(panel);
        panelEl = panel;

        var panelRect = panel.getBoundingClientRect();
        var viewportH = window.innerHeight;
        var viewportW = window.innerWidth;
        var top = rect.bottom + 6;
        var left = rect.left;
        if (top + panelRect.height > viewportH - 10) {
            top = rect.top - panelRect.height - 6;
        }
        if (left + panelRect.width > viewportW - 10) {
            left = viewportW - panelRect.width - 10;
        }
        if (left < 10) left = 10;
        panel.style.top = top + 'px';
        panel.style.left = left + 'px';

        setTimeout(function() {
            document.addEventListener('click', outsideClick);
        }, 0);
    }

    document.addEventListener('click', function(e) {
        var trigger = e.target.closest('.orders-status-trigger');
        if (trigger) {
            e.preventDefault();
            e.stopPropagation();
            openPanel(trigger);
        }
    });
})();
</script>

<script>
// ============================================
// ENFORCE LARGER EDIT BUTTON SIZE
// Make edit buttons at least 2 times bigger
// ============================================
(function() {
    'use strict';
    
    function enforceLargeEditButtons() {
        const editButtons = document.querySelectorAll('.list-table .btn-edit');
        
        editButtons.forEach(button => {
            // Check if styles are already correct to avoid unnecessary re-applications
            const currentWidth = window.getComputedStyle(button).width;
            const currentHeight = window.getComputedStyle(button).height;
            const inlineStyle = button.getAttribute('style') || '';
            
            // Skip if already correctly styled (avoid triggering reflows)
            if (currentWidth === '48px' && currentHeight === '48px' && 
                inlineStyle.includes('width: 48px') && inlineStyle.includes('height: 48px')) {
                return; // Already correctly styled, skip to prevent reflow
            }
            
            button.style.setProperty('min-height', '48px', 'important');
            button.style.setProperty('min-width', '48px', 'important');
            button.style.setProperty('height', '48px', 'important');
            button.style.setProperty('width', '48px', 'important');
            button.style.setProperty('padding', '12px 16px', 'important');
            button.style.setProperty('display', 'inline-flex', 'important');
            button.style.setProperty('align-items', 'center', 'important');
            button.style.setProperty('justify-content', 'center', 'important');
            
            const icons = button.querySelectorAll('i, svg, span.fa');
            icons.forEach(icon => {
                icon.style.setProperty('font-size', '20px', 'important');
                icon.style.setProperty('margin', '0', 'important');
            });
        });
    }
    
    // Run immediately
    enforceLargeEditButtons();
    
    // Run on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', enforceLargeEditButtons);
    } else {
        setTimeout(enforceLargeEditButtons, 100);
    }
    
    // Run on AJAX updates
    document.addEventListener('ajaxUpdate', function() {
        setTimeout(enforceLargeEditButtons, 100);
    });
    
    // Watch for new buttons being added
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.addedNodes.length > 0) {
                setTimeout(enforceLargeEditButtons, 100);
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    
    // REMOVED: setInterval - was causing reflows every 2 seconds that affected other buttons
    // MutationObserver handles new buttons, so periodic check is unnecessary
    
    console.log('✅ Large edit button enforcer active - edit buttons will be 2x bigger!');
})();
</script>



{{-- PMD ORDER TABLE NAME LOOKUP START --}}
<script>
document.addEventListener('DOMContentLoaded', function () {
    function collectOrderIds() {
        const ids = [];
        document.querySelectorAll('a[href*="/admin/orders/edit/"]').forEach(function (a) {
            const m = a.getAttribute('href').match(/\/admin\/orders\/edit\/(\d+)/);
            if (m) ids.push(parseInt(m[1], 10));
        });
        return Array.from(new Set(ids)).filter(Boolean);
    }

    function findRowByOrderId(orderId) {
        const link = document.querySelector('a[href*="/admin/orders/edit/' + orderId + '"]');
        return link ? link.closest('tr') : null;
    }

    function setTableCell(row, value) {
        if (!row) return;

        const cells = row.querySelectorAll('td');
        if (!cells || cells.length < 5) return;

        // معمولا ستون table name حدودا cell شماره 4 است
        // اگر ساختار کمی فرق کرد، fallback داریم
        let target = cells[4] || null;

        if (!target) {
            for (const td of cells) {
                const text = (td.innerText || '').trim();
                if (text === 'Table' || text === '—' || /^Table\s+\d+$/i.test(text)) {
                    target = td;
                    break;
                }
            }
        }

        if (target) {
            target.textContent = value;
        }
    }

    const ids = collectOrderIds();
    if (!ids.length) return;

    fetch('/order_table_name_lookup_ajax.php?ids=' + ids.join(','), {
        headers: { 'X-Requested-With': 'XMLHttpRequest' }
    })
    .then(r => r.json())
    .then(data => {
        if (!data || !data.success || !data.orders) return;

        Object.keys(data.orders).forEach(function (orderId) {
            const row = findRowByOrderId(orderId);
            if (!row) return;

            const item = data.orders[orderId];
            if (!item || !item.table_name) return;

            setTableCell(row, item.table_name);
        });
    })
    .catch(() => {});
});
</script>
{{-- PMD ORDER TABLE NAME LOOKUP END --}}

