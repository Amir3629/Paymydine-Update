<?php
    $updatesCount = $item->unreadCount();
    $hasSettingsError = count(array_filter(Session::get('settings.errors', [])))
?>
<li class="nav-item dropdown">
    <span title="Settings" class="media-toolbar-tooltip-wrap">
    <a class="nav-link" href="" data-bs-toggle="dropdown" aria-label="Settings">
        <i class="fa fa-gear" role="button"></i>
        <?php if($hasSettingsError): ?>
            <span class="badge badge-danger"><i class="fa fa-exclamation text-white"></i></span>
        <?php elseif($updatesCount): ?>
            <span class="badge badge-danger">&nbsp;</span>
        <?php endif; ?>
    </a>
    </span>

    <ul class="dropdown-menu">
        <div class='menu menu-grid row'>
            <?php $__currentLoopData = $item->options(); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $label => [$icon, $link]): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                <div class="menu-item col col-4">
                    <a class="menu-link" href="<?php echo e($link); ?>" title="<?php echo app('translator')->get($label); ?>" aria-label="<?php echo app('translator')->get($label); ?>">
                        <i class="<?php echo e($icon); ?>"></i>
                        <span><?php echo app('translator')->get($label); ?></span>
                    </a>
                </div>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        </div>
        <?php if(!$hasSettingsError && $updatesCount): ?>
            <a
                class="dropdown-item border-top text-center alert-warning"
                href="<?php echo e(admin_url('updates')); ?>"
            ><?php echo e(sprintf(lang('system::lang.updates.text_update_found'), $updatesCount)); ?></a>
        <?php endif; ?>
        <div class="dropdown-footer">
            <a
                class="text-center<?php echo e($hasSettingsError ? ' text-danger' : ''); ?>"
                href="<?php echo e(admin_url('settings')); ?>"
                title="All settings"
                aria-label="All settings"
            ><i class="fa fa-ellipsis-h"></i></a>
        </div>
    </ul>
</li>
<?php /**PATH /var/www/paymydine/app/admin/views/_partials/top_settings_menu.blade.php ENDPATH**/ ?>