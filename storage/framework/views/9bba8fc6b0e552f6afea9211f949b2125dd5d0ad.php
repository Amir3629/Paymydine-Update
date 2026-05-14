<?php
    use Admin\Facades\AdminLocation;
    $userPanel = \Admin\Classes\UserPanel::forUser();
    $faviconPath = setting('favicon_logo');
    $defaultAvatar = $userPanel->getAvatarUrl().'&s=64';
    $profileImage = $faviconPath
        ? asset('assets/media/uploads/'.ltrim($faviconPath, '/'))
        : $defaultAvatar;
?>
<li class="nav-item dropdown">
    <a href="#" class="nav-link" data-bs-toggle="dropdown" title="<?php echo e($userPanel->getUserName()); ?> - Account" aria-label="<?php echo e($userPanel->getUserName()); ?> - Account">
        <img
            class="rounded-circle navbar-profile-avatar"
            src="<?php echo e($profileImage); ?>"
            alt="<?php echo e($userPanel->getUserName()); ?>"
        >
    </a>
    <div class="dropdown-menu profile-dropdown-menu">
        <div class="d-flex flex-column w-100 align-items-center">
            <div class="pt-4 px-4 pb-2">
                <img class="rounded-circle" src="<?php echo e($profileImage); ?>">
            </div>
            <div class="pb-3 text-center">
                <div class="text-uppercase"><?php echo e($userPanel->getUserName()); ?></div>
                <div class="text-muted"><?php echo e($userPanel->getRoleName()); ?></div>
            </div>
        </div>
        <div role="separator" class="dropdown-divider"></div>
        <?php $__currentLoopData = $item->options(); $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
            <a class="dropdown-item <?php echo e($item->cssClass); ?>" <?php echo Html::attributes($item->attributes); ?>>
                <i class="<?php echo e($item->iconCssClass); ?>"></i><span><?php echo app('translator')->get($item->label); ?></span>
            </a>
        <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        
        <?php if(AdminLocation::listLocations()->isNotEmpty()): ?>
            <div role="separator" class="dropdown-divider"></div>
            <div class="dropdown-header">
                <i class="fa fa-location-dot"></i>
                <span><?php echo app('translator')->get('admin::lang.side_menu.location'); ?></span>
            </div>
            <?php
                $locations = \Admin\Classes\UserPanel::listLocations(null, null, null);
            ?>
            <?php $__currentLoopData = $locations; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $location): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                <a
                    class="dropdown-item <?php echo e($location->active ? 'active' : ''); ?>"
                    data-request="mainmenu::onChooseLocation"
                    <?php if (! ($location->active)): ?>data-request-data="location: '<?php echo e($location->id); ?>'"<?php endif; ?>
                    href="#"
                >
                    <span><?php echo e($location->name); ?></span>
                </a>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        <?php endif; ?>
        <!-- <div role="separator" class="dropdown-divider"></div>
        <a class="dropdown-item text-black-50" href="https://tastyigniter.com/support" target="_blank">
            <i class="fa fa-circle-question fa-fw"></i><?php echo app('translator')->get('admin::lang.text_support'); ?>
        </a>
        <a class="dropdown-item text-black-50" href="https://tastyigniter.com/docs" target="_blank">
            <i class="fa fa-book fa-fw"></i><?php echo app('translator')->get('admin::lang.text_documentation'); ?>
        </a>
        <a class="dropdown-item text-black-50" href="https://forum.tastyigniter.com" target="_blank">
            <i class="fa fa-comments fa-fw"></i><?php echo app('translator')->get('admin::lang.text_community_support'); ?>
        </a>
    </div> -->
</li>

<?php /**PATH /var/www/paymydine/app/admin/views/_partials/top_nav_user_menu.blade.php ENDPATH**/ ?>