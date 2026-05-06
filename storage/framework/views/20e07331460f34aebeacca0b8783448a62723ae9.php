<div
    id="<?php echo e($this->getId('items-container')); ?>"
    class="field-connector"
    data-control="connector"
    data-alias="<?php echo e($this->alias); ?>"
    data-sortable-container="#<?php echo e($this->getId('items')); ?>"
    data-sortable-handle=".<?php echo e($this->getId('items')); ?>-handle"
    data-editable="<?php echo e(($this->previewMode || !$this->editable) ? 'false' : 'true'); ?>"
>
    <div
        id="<?php echo e($this->getId('items')); ?>"
        role="tablist"
        aria-multiselectable="true">
        <?php echo $this->makePartial('connector/connector_items'); ?>

    </div>

    <?php if (! ($this->previewMode || $this->hideNewButton)): ?>
        <div>
            <button
                type="button"
                class="btn btn-outline-default"
                data-control="load-item"
            ><i class="fa fa-plus"></i>&nbsp;&nbsp;<?php echo e($newRecordTitle); ?></button>
        </div>
    <?php endif; ?>
</div>
<?php /**PATH /var/www/paymydine/app/admin/formwidgets/connector/connector.blade.php ENDPATH**/ ?>