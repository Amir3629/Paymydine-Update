<?php $__currentLoopData = $records; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $record): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
    <?php
        // Get status color and create a lighter version for row background
        $statusColor = null;
        $lightBackground = 'transparent';
        $hoverBackground = 'rgba(0, 0, 0, 0.02)';
        
        if ($record->status && $record->status_color) {
            $statusColor = $record->status_color;
            
            // Convert hex to RGB and add opacity for lighter background
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
            
            // Create a very light background color (12% opacity for subtle effect)
            $lightBackground = "rgba($r, $g, $b, 0.12)";
            // Create hover background (20% opacity for slight emphasis)
            $hoverBackground = "rgba($r, $g, $b, 0.20)";
        }
        
        $rowId = 'order-row-' . $record->getKey();
    ?>
    <tr id="<?php echo e($rowId); ?>" style="background-color: <?php echo e($lightBackground); ?>; transition: background-color 0.3s ease;" 
        onmouseover="this.style.backgroundColor='<?php echo e($hoverBackground); ?>'" 
        onmouseout="this.style.backgroundColor='<?php echo e($lightBackground); ?>'"
    >
        <?php if($showDragHandle): ?>
            <td class="list-action">
                <div class="btn btn-handle">
                    <i class="fa fa-arrows-alt-v"></i>
                </div>
            </td>
        <?php endif; ?>

        <?php if($showCheckboxes): ?>
            <td class="list-action">
                <div class="form-check">
                    <input
                        type="checkbox"
                        id="<?php echo e('checkbox-'.$record->getKey()); ?>"
                        class="form-check-input"
                        value="<?php echo e($record->getKey()); ?>" name="checked[]"
                    />
                    <label class="form-check-label" for="<?php echo e('checkbox-'.$record->getKey()); ?>">&nbsp;</label>
                </div>
            </td>
        <?php endif; ?>

        <?php $__currentLoopData = $columns; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $key => $column): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
            <?php if($column->type != 'button') continue; ?>
            <td class="list-action <?php echo e($column->cssClass); ?>">
                <?php echo $this->makePartial('lists/list_button', ['record' => $record, 'column' => $column]); ?>

            </td>
        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>

        <?php $__currentLoopData = $columns; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $key => $column): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
            <?php if($column->type == 'button') continue; ?>
            <td
                class="list-col-index-<?php echo e($loop->index); ?> list-col-name-<?php echo e($column->getName()); ?> list-col-type-<?php echo e($column->type); ?> <?php echo e($column->cssClass); ?>"
            >
                <?php echo $this->getColumnValue($record, $column); ?>

            </td>
        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>

        <?php if($showFilter): ?>
            <td class="list-setup">&nbsp;</td>
        <?php endif; ?>

        <?php if($showSetup): ?>
            <td class="list-setup">&nbsp;</td>
        <?php endif; ?>
    </tr>
<?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>

<?php /**PATH /Users/amir/Downloads/paymydine-main-9/app/admin/views/orders/lists/list_body.blade.php ENDPATH**/ ?>