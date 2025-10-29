<?php if(empty($value)): ?>
    <span
        class="label <?php echo e($value ? 'label-default' : ''); ?>"
        style="background-color: <?php echo e($record->status_color); ?>;"
    ><?php echo e($value ?? lang('admin::lang.text_incomplete')); ?></span>
<?php else: ?>
    <div class="dropdown">
        <button
            class="btn font-weight-bold p-0 dropdown-toggle"
            type="button"
            data-bs-toggle="dropdown"
            aria-haspopup="true"
            aria-expanded="false"
            style="border-bottom: 1px dashed;color: <?php echo e($record->status_color); ?>;"
        ><?php echo e($value ?? lang('admin::lang.text_incomplete')); ?></button>
        <div class="dropdown-menu" style="min-width: 150px;">
            <?php $__currentLoopData = $statusesOptions; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $index => $statusName): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                <?php if($record->status_id == $index) continue; ?>
                <?php
                    // Get the color for this status
                    $statusColor = $statusesColors[$index] ?? '#6c757d';
                    
                    // Convert hex to RGB for lighter background
                    $hex = ltrim($statusColor, '#');
                    if (strlen($hex) == 3) {
                        $r = hexdec(substr($hex, 0, 1) . substr($hex, 0, 1));
                        $g = hexdec(substr($hex, 1, 1) . substr($hex, 1, 1));
                        $b = hexdec(substr($hex, 2, 1) . substr($hex, 2, 1));
                    } else {
                        $r = hexdec(substr($hex, 0, 2));
                        $g = hexdec(substr($hex, 2, 2));
                        $b = hexdec(substr($hex, 4, 2));
                    }
                    
                    // Create background with 100% SOLID (no transparency)
                    $backgroundColor = "rgba($r, $g, $b, 1)";
                    $hoverBackgroundColor = "rgba($r, $g, $b, 1)";
                ?>
                <a
                    class="dropdown-item status-dropdown-item"
                    data-request="onUpdateStatus"
                    data-request-data="recordId: '<?php echo e($record->getKey()); ?>', statusId: '<?php echo e($index); ?>'"
                    style="background-color: <?php echo e($backgroundColor); ?>; color: #000000; font-weight: 500; border-left: 4px solid <?php echo e($statusColor); ?>; padding: 8px 12px; margin: 2px 0; transition: background-color 0.2s ease;"
                    onmouseover="this.style.backgroundColor='<?php echo e($hoverBackgroundColor); ?>'"
                    onmouseout="this.style.backgroundColor='<?php echo e($backgroundColor); ?>'"
                ><?php echo e($statusName); ?></a>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        </div>
    </div>
<?php endif; ?>
<?php /**PATH /Users/amir/Downloads/paymydine-main/app/admin/views/statuses/form/status_column.blade.php ENDPATH**/ ?>