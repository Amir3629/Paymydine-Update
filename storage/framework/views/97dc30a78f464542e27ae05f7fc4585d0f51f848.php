<span class="d-none">
<?php echo $this->makePartial('lists/list_button', ['record' => $theme, 'column' => $this->getColumn('source')]); ?>

</span>

<?php if($theme->getTheme()->isActive() && $theme->getTheme()->hasCustomData()): ?>
    <?php echo $this->makePartial('lists/list_button', ['record' => $theme, 'column' => $this->getColumn('edit')]); ?>

<?php endif; ?>

<?php echo $this->makePartial('lists/list_button', ['record' => $theme, 'column' => $this->getColumn('default')]); ?>


<?php /**PATH /var/www/paymydine/app/system/views/themes/lists/list_buttons.blade.php ENDPATH**/ ?>