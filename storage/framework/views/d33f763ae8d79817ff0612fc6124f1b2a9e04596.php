<?php if(empty($value)): ?>
    <span
        class="label label-default"
        style="background-color: <?php echo e($record->status_color ?? '#6c757d'); ?>; color: #fff; padding: 6px 10px; border-radius: 6px; font-weight: 500;"
    ><?php echo e($value ?? lang('admin::lang.text_incomplete')); ?></span>
<?php else: ?>
    <?php
        $currentId = $record->status_id ?? null;
        $options = [];
        foreach ($statusesOptions ?? [] as $id => $name) {
            if ((int)$id === (int)$currentId) continue;
            $options[] = [
                'id' => (int)$id,
                'name' => $name,
                'color' => $statusesColors[$id] ?? '#6c757d',
            ];
        }
    ?>
    <div class="orders-status-cell">
        <button
            type="button"
            class="orders-status-trigger btn btn-link p-0 text-decoration-none font-weight-bold border-0 rounded px-2 py-1"
            style="border-bottom: 2px dashed <?php echo e($record->status_color ?? '#6c757d'); ?> !important; color: <?php echo e($record->status_color ?? '#6c757d'); ?> !important; font-size: 1em;"
            data-record-id="<?php echo e($record->getKey()); ?>"
            data-current-status-id="<?php echo e($currentId); ?>"
            data-current-name="<?php echo e(e($value)); ?>"
            data-current-color="<?php echo e($record->status_color ?? '#6c757d'); ?>"
            data-options="<?php echo e(json_encode($options, JSON_HEX_APOS | JSON_HEX_QUOT)); ?>"
            aria-haspopup="true"
            aria-expanded="false"
        ><?php echo e($value); ?></button>
    </div>
<?php endif; ?>
<?php /**PATH /var/www/paymydine/app/admin/views/orders/status_column.blade.php ENDPATH**/ ?>