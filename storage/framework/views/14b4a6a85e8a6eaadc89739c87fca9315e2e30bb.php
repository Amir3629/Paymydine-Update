<?php
    $saveActions = array_get($button->config, 'saveActions', ['continue', 'close', 'new']);
    $preferredAction = setting('admin_after_save_action', 'continue');
    $selectedAction = in_array($preferredAction, $saveActions) ? $preferredAction : 'continue';
?>
<div class="btn-group">
    <button
        type="button"
        tabindex="0"
        <?php echo $button->getAttributes(); ?>

    ><?php echo $button->label ?: $button->name; ?></button>
</div>
<input type="hidden" data-form-save-action="" name="<?php echo e($selectedAction); ?>" value="1">
<?php /**PATH /var/www/paymydine/app/admin/views/_partials/form/toolbar_save_button.blade.php ENDPATH**/ ?>