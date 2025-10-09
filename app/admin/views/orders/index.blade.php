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
    
    /* Keep buttons and checkboxes visible */
    .list-table tbody tr .list-action {
        background-color: transparent !important;
    }
    
    /* Fix dropdown z-index issues - ULTRA HIGH PRIORITY */
    .dropdown {
        position: relative !important;
        z-index: 10000 !important;
    }
    
    .dropdown-menu {
        z-index: 99999 !important;
        position: absolute !important;
        background: white !important;
        border: 1px solid #dee2e6 !important;
        box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
        isolation: isolate !important; /* Creates new stacking context */
    }
    
    /* Ensure dropdown items are clickable and visible */
    .dropdown-item {
        position: relative !important;
        z-index: 100000 !important;
        background: white !important;
        isolation: isolate !important;
    }
    
    /* Reset ALL table elements to prevent interference */
    .list-table,
    .list-table *,
    .list-table td,
    .list-table tr,
    .list-table th {
        position: static !important;
        z-index: auto !important;
        isolation: auto !important;
    }
    
    /* Only allow dropdown containers to have high z-index */
    .dropdown,
    .dropdown *,
    .dropdown-menu,
    .dropdown-item {
        position: relative !important;
        z-index: inherit !important;
    }
    
    /* Force dropdown menu to be on top of everything */
    .dropdown-menu.show {
        z-index: 99999 !important;
        position: absolute !important;
        background: white !important;
        isolation: isolate !important;
    }
    
    /* Disable table row hover effects when dropdown is open */
    .dropdown.show ~ * .list-table tbody tr:hover,
    .dropdown.show ~ .list-table tbody tr:hover,
    .list-table:has(.dropdown.show) tbody tr:hover {
        background-color: inherit !important;
        transform: none !important;
        box-shadow: none !important;
    }
    
    /* Alternative: Disable all table row hover effects globally */
    .list-table tbody tr:hover {
        background-color: inherit !important;
        transform: none !important;
        box-shadow: none !important;
    }
    
    /* Ensure dropdown items stay on top during hover */
    .dropdown-item:hover {
        z-index: 999999 !important;
        isolation: isolate !important;
        position: relative !important;
    }
    
    /* Status dropdown menu styling */
    .dropdown-menu {
        padding: 4px !important;
        border-radius: 8px !important;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
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
</style>

<div class="row-fluid">
    {!! $this->renderList() !!}
</div>

