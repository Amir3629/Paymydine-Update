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
    
    
    /* Status dropdown items with colors */
    .status-dropdown-item {
        border-radius: 4px !important;
        cursor: pointer !important;
        display: block !important;
        text-decoration: none !important;
    }
    
    .status-dropdown-item:hover {
        transform: translateX(2px) !important;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
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
    
    /* ============================================
       CRITICAL FIX: Status Dropdown Z-Index
       DROPDOWN MUST ALWAYS BE ABOVE EVERYTHING!
       ============================================ */
    /* Force status dropdown menus to appear above EVERYTHING - MAXIMUM z-index */
    .list-table .dropdown-menu,
    .list-table .dropdown-menu.show,
    .list-table td .dropdown-menu,
    .list-table td .dropdown-menu.show,
    .list-table .list-col-name-status-name .dropdown-menu,
    .list-table .list-col-name-status-name .dropdown-menu.show,
    .list-table [class*="status"] .dropdown-menu,
    .list-table [class*="status"] .dropdown-menu.show,
    .list-table .dropdown.show .dropdown-menu,
    .list-table .dropdown.show .dropdown-menu.show {
        z-index: 99999 !important;
        position: absolute !important;
        background-color: #ffffff !important;
        background: #ffffff !important;
        opacity: 1 !important;
        box-shadow: 0 8px 24px rgba(0, 0, 0, 0.2) !important;
        border: 1px solid #e5e9f2 !important;
        pointer-events: auto !important;
    }
    
    /* When dropdown is open, disable row hover effects to prevent "jumping" */
    /* IMPORTANT: Do NOT disable pointer-events - it blocks scrolling! */
    body.dropdown-open .list-table tbody tr:hover {
        transform: none !important;
        box-shadow: none !important;
        transition: none !important;
    }
    
    /* Disable hover transitions on rows when dropdown is open */
    body.dropdown-open .list-table tbody tr {
        transition: background-color 0.2s ease !important;
    }
    
    /* Ensure scrolling still works */
    body.dropdown-open,
    body.dropdown-open .page-wrapper,
    body.dropdown-open .list-table,
    body.dropdown-open .table-responsive,
    body.dropdown-open .list-table tbody {
        overflow: auto !important;
        overflow-y: auto !important;
        pointer-events: auto !important;
    }
    
    /* Prevent parent containers from clipping dropdowns (but keep scrolling on table-responsive) */
    .list-table table,
    .list-table tbody,
    .list-table tr,
    .list-table td,
    .list-table .list-col-name-status-name,
    .list-table [class*="status"],
    .list-table .dropdown {
        overflow: visible !important;
        overflow-x: visible !important;
        overflow-y: visible !important;
    }
    
    /* Keep scrolling enabled on main containers */
    .table-responsive {
        overflow-x: auto !important;
        overflow-y: auto !important;
    }
    
    /* Ensure page wrapper and body can scroll */
    .page-wrapper,
    body.dropdown-open,
    html {
        overflow: auto !important;
        overflow-y: auto !important;
    }
    
    /* Always allow scrolling on body */
    body {
        overflow-y: auto !important;
    }
    
    /* Ensure dropdown container doesn't interfere */
    .list-table .list-col-name-status-name .dropdown,
    .list-table td[class*="status"] .dropdown {
        position: relative !important;
        z-index: 1 !important;
    }
    
    /* Smart positioning for bottom rows - open upward */
    .list-table .dropdown-menu.dropdown-menu-top {
        top: auto !important;
        bottom: 100% !important;
        margin-top: 0 !important;
        margin-bottom: 4px !important;
        transform-origin: bottom center !important;
    }
</style>

<div class="row-fluid">
    {!! $this->renderList() !!}
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
// ============================================
// FORCE STATUS DROPDOWNS TO ALWAYS BE ON TOP
// This ensures dropdowns are ABOVE EVERYTHING
// ============================================
(function() {
    'use strict';
    
    function forceDropdownZIndex() {
        // Find all status dropdown menus
        const dropdowns = document.querySelectorAll('.list-table .dropdown-menu');
        
        dropdowns.forEach(function(dropdown) {
            // Force maximum z-index using inline styles (highest priority)
            dropdown.style.setProperty('z-index', '99999', 'important');
            dropdown.style.setProperty('position', 'absolute', 'important');
            
            // Ensure solid white background to block background content
            if (dropdown.classList.contains('show')) {
                dropdown.style.setProperty('background-color', '#ffffff', 'important');
                dropdown.style.setProperty('background', '#ffffff', 'important');
                dropdown.style.setProperty('opacity', '1', 'important');
            }
            
            // Prevent parent clipping (but skip scroll containers)
            let parent = dropdown.parentElement;
            let level = 0;
            while (parent && parent !== document.body && level < 10) {
                // Skip scroll containers - they need to keep their overflow
                const isScrollContainer = parent.classList.contains('table-responsive') || 
                                          parent.classList.contains('page-wrapper') ||
                                          parent.tagName === 'BODY' ||
                                          parent.tagName === 'HTML';
                
                if (!isScrollContainer) {
                    parent.style.setProperty('overflow', 'visible', 'important');
                    parent.style.setProperty('overflow-x', 'visible', 'important');
                    parent.style.setProperty('overflow-y', 'visible', 'important');
                }
                parent = parent.parentElement;
                level++;
            }
        });
    }
    
    function watchForDropdownOpen() {
        // Watch for when dropdowns open using MutationObserver
        const observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const target = mutation.target;
                    if (target.classList && target.classList.contains('dropdown-menu')) {
                        if (target.classList.contains('show')) {
                            // Dropdown just opened - force z-index immediately
                            target.style.setProperty('z-index', '99999', 'important');
                            target.style.setProperty('position', 'absolute', 'important');
                            target.style.setProperty('background-color', '#ffffff', 'important');
                            target.style.setProperty('background', '#ffffff', 'important');
                            target.style.setProperty('opacity', '1', 'important');
                            target.style.setProperty('box-shadow', '0 8px 24px rgba(0, 0, 0, 0.2)', 'important');
                            
                            // SMART POSITIONING: Check if dropdown fits below, if not open upward
                            setTimeout(function() {
                                const button = target.previousElementSibling || target.parentElement.querySelector('button');
                                if (button) {
                                    const buttonRect = button.getBoundingClientRect();
                                    const dropdownRect = target.getBoundingClientRect();
                                    const viewportHeight = window.innerHeight;
                                    const dropdownHeight = dropdownRect.height || 200; // Estimate if not rendered yet
                                    
                                    // Check if dropdown would go off-screen at bottom
                                    const spaceBelow = viewportHeight - buttonRect.bottom;
                                    const spaceAbove = buttonRect.top;
                                    
                                    if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
                                        // Not enough space below, open upward
                                        target.classList.add('dropdown-menu-top');
                                        target.style.setProperty('top', 'auto', 'important');
                                        target.style.setProperty('bottom', '100%', 'important');
                                        target.style.setProperty('margin-bottom', '4px', 'important');
                                        target.style.setProperty('margin-top', '0', 'important');
                                    } else {
                                        // Normal opening downward
                                        target.classList.remove('dropdown-menu-top');
                                        target.style.setProperty('top', '100%', 'important');
                                        target.style.setProperty('bottom', 'auto', 'important');
                                        target.style.setProperty('margin-top', '4px', 'important');
                                        target.style.setProperty('margin-bottom', '0', 'important');
                                    }
                                    
                                    // Also ensure it doesn't go off right edge
                                    const viewportWidth = window.innerWidth;
                                    if (dropdownRect.right > viewportWidth) {
                                        const overflow = dropdownRect.right - viewportWidth;
                                        const currentLeft = parseInt(target.style.left) || 0;
                                        target.style.setProperty('left', (currentLeft - overflow - 10) + 'px', 'important');
                                    }
                                }
                            }, 10);
                            
                            // Also force on parent containers (but skip scroll containers)
                            let parent = target.parentElement;
                            let level = 0;
                            while (parent && parent !== document.body && level < 10) {
                                // Skip scroll containers - they need to keep their overflow
                                const isScrollContainer = parent.classList.contains('table-responsive') || 
                                                          parent.classList.contains('page-wrapper') ||
                                                          parent.tagName === 'BODY' ||
                                                          parent.tagName === 'HTML';
                                
                                if (!isScrollContainer) {
                                    parent.style.setProperty('overflow', 'visible', 'important');
                                    parent.style.setProperty('overflow-x', 'visible', 'important');
                                    parent.style.setProperty('overflow-y', 'visible', 'important');
                                }
                                parent = parent.parentElement;
                                level++;
                            }
                            
                            // Disable row hover effects to prevent "jumping"
                            // IMPORTANT: Do NOT disable pointer-events - it blocks scrolling!
                            document.body.classList.add('dropdown-open');
                        } else {
                            // Dropdown closed - re-enable row hover effects
                            const openDropdowns = document.querySelectorAll('.list-table .dropdown-menu.show');
                            if (openDropdowns.length === 0) {
                                document.body.classList.remove('dropdown-open');
                            }
                        }
                    }
                }
                
                // Check for newly added dropdowns
                if (mutation.addedNodes) {
                    mutation.addedNodes.forEach(function(node) {
                        if (node.nodeType === 1 && node.classList && node.classList.contains('dropdown-menu')) {
                            node.style.setProperty('z-index', '99999', 'important');
                            node.style.setProperty('position', 'absolute', 'important');
                        }
                    });
                }
            });
            
            // Re-apply to all dropdowns
            forceDropdownZIndex();
        });
        
        // Observe the entire document for changes
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['class']
        });
    }
    
    // Initialize immediately
    forceDropdownZIndex();
    
    // Watch for dropdown opens
    watchForDropdownOpen();
    
    // Also listen for Bootstrap dropdown events
    document.addEventListener('show.bs.dropdown', function(e) {
        const dropdown = e.target.querySelector('.dropdown-menu');
        if (dropdown) {
            dropdown.style.setProperty('z-index', '99999', 'important');
            dropdown.style.setProperty('position', 'absolute', 'important');
            dropdown.style.setProperty('background-color', '#ffffff', 'important');
            dropdown.style.setProperty('background', '#ffffff', 'important');
            
            // Disable row hover effects (but keep scrolling enabled)
            document.body.classList.add('dropdown-open');
        }
    });
    
    // Smart positioning when dropdown is fully shown
    document.addEventListener('shown.bs.dropdown', function(e) {
        const dropdown = e.target.querySelector('.dropdown-menu');
        const button = e.target.querySelector('button') || e.target;
        
        if (dropdown && button) {
            setTimeout(function() {
                const buttonRect = button.getBoundingClientRect();
                const dropdownRect = dropdown.getBoundingClientRect();
                const viewportHeight = window.innerHeight;
                const viewportWidth = window.innerWidth;
                const dropdownHeight = dropdownRect.height;
                const dropdownWidth = dropdownRect.width;
                
                // Check space below and above
                const spaceBelow = viewportHeight - buttonRect.bottom;
                const spaceAbove = buttonRect.top;
                
                // If not enough space below and more space above, open upward
                if (spaceBelow < dropdownHeight && spaceAbove > spaceBelow) {
                    dropdown.classList.add('dropdown-menu-top');
                    dropdown.style.setProperty('top', 'auto', 'important');
                    dropdown.style.setProperty('bottom', '100%', 'important');
                    dropdown.style.setProperty('margin-bottom', '4px', 'important');
                    dropdown.style.setProperty('margin-top', '0', 'important');
                    dropdown.style.setProperty('transform-origin', 'bottom center', 'important');
                } else {
                    // Normal opening downward
                    dropdown.classList.remove('dropdown-menu-top');
                    dropdown.style.setProperty('top', '100%', 'important');
                    dropdown.style.setProperty('bottom', 'auto', 'important');
                    dropdown.style.setProperty('margin-top', '4px', 'important');
                    dropdown.style.setProperty('margin-bottom', '0', 'important');
                    dropdown.style.setProperty('transform-origin', 'top center', 'important');
                }
                
                // Check if dropdown goes off right edge of viewport
                if (dropdownRect.right > viewportWidth) {
                    const overflow = dropdownRect.right - viewportWidth;
                    const currentLeft = parseInt(dropdown.style.left) || 0;
                    dropdown.style.setProperty('left', (currentLeft - overflow - 10) + 'px', 'important');
                }
                
                // Check if dropdown goes off left edge
                if (dropdownRect.left < 0) {
                    dropdown.style.setProperty('left', '0px', 'important');
                }
            }, 10);
        }
    });
    
    document.addEventListener('hide.bs.dropdown', function(e) {
        // Check if any dropdowns are still open
        setTimeout(function() {
            const openDropdowns = document.querySelectorAll('.list-table .dropdown-menu.show');
            if (openDropdowns.length === 0) {
                document.body.classList.remove('dropdown-open');
            }
        }, 100);
    });
    
    // Click outside to close dropdown and re-enable rows
    document.addEventListener('click', function(e) {
        const dropdown = e.target.closest('.dropdown-menu');
        const dropdownToggle = e.target.closest('[data-toggle="dropdown"], [data-bs-toggle="dropdown"]');
        
        if (!dropdown && !dropdownToggle) {
            setTimeout(function() {
                const openDropdowns = document.querySelectorAll('.list-table .dropdown-menu.show');
                if (openDropdowns.length === 0) {
                    document.body.classList.remove('dropdown-open');
                }
            }, 100);
        }
    });
    
    // Re-apply on page updates
    document.addEventListener('ajaxUpdate', function() {
        setTimeout(forceDropdownZIndex, 100);
        setTimeout(forceDropdownZIndex, 500);
    });
    
    // Re-apply periodically (just in case)
    setInterval(forceDropdownZIndex, 1000);
    
    console.log('✅ Status dropdown z-index enforcer active - dropdowns will ALWAYS be on top!');
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

