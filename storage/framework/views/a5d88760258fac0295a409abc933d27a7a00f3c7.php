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
    <?php echo $this->renderList(); ?>

</div>

<?php /**PATH /Users/amir/Downloads/paymydine-main-9/app/admin/views/orders/index.blade.php ENDPATH**/ ?>