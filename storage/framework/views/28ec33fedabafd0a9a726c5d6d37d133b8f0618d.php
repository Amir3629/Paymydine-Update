<div class="row-fluid">
    <?php
        $mode = (string)request()->get('mode', (string)session('payments.form_mode', 'methods'));
        if (!in_array($mode, ['methods', 'providers'], true)) {
            $mode = 'methods';
        }
        $isProvidersMode = $mode === 'providers';
        $toggleLabel = $isProvidersMode ? 'Manage Methods' : 'Manage Providers';
        $toggleHref = $isProvidersMode ? admin_url('payments?mode=methods') : admin_url('payments?mode=providers');
    ?>

    <div class="toolbar-action" style="margin: 12px 0 16px 0;">
        <div class="progress-indicator-container">
            <a href="<?php echo e($toggleHref); ?>" class="btn btn-primary">
                <?php echo e($toggleLabel); ?>

            </a>
        </div>
    </div>

    <?php echo $this->renderList(); ?>

</div>
<?php /**PATH /var/www/paymydine/app/admin/views/payments/index.blade.php ENDPATH**/ ?>