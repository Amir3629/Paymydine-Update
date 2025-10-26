<?php $options = $this->getSelectOptions($scope->scopeName) ?>
<div class="filter-scope select form-group">
    <select
        name="<?php echo e($this->getScopeName($scope)); ?>"
        data-control="selectlist"
        data-placeholder-text="<?php echo app('translator')->get($scope->label); ?>"
        data-show-search="<?php echo e(count($options['available']) > 10); ?>"
        <?php echo $scope->disabled ? 'disabled="disabled"' : ''; ?>

    >
        <option data-placeholder="true"></option>
        <?php $__currentLoopData = $options['available']; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $key => $value): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
            <option
                value="<?php echo e($key); ?>"
                <?php echo ($options['active'] == $key) ? 'selected="selected"' : ''; ?>

            ><?php echo e((strpos($value, 'lang:') !== false) ? lang($value) : $value); ?></option>
        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
    </select>
</div>
<?php /**PATH /Users/amir/Downloads/paymydine-main-9/app/admin/widgets/filter/scope_select.blade.php ENDPATH**/ ?>