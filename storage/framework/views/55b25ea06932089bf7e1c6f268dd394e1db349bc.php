<div style="font-size: 15px; line-height: 1.5;">
    <p style="font-weight: normal; color: #364a63; margin-bottom: 8px; font-size: 15px;"><?php echo e($formModel->location->location_name); ?></p>
    <div style="font-size: 14px; color: #8094ae; line-height: 1.5;">
        <?php echo e(format_address($formModel->location->getAddress())); ?>

    </div>
</div>
<?php /**PATH /var/www/paymydine/app/admin/views/orders/form/field_location.blade.php ENDPATH**/ ?>