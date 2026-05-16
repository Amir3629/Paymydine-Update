<div class="container-fluid pt-4">
    <?php $__currentLoopData = $settings; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $item => $categories): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
        <?php if(!count($categories)) continue; ?>
        <?php if (! ($item == 'core')): ?><h5 class="mb-2 px-3"><?php echo e(ucwords($item)); ?></h5><?php endif; ?>

        <div class="row no-gutters mb-3">
            <?php $__currentLoopData = $categories; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $key => $category): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
                <?php
                    $isAboutCard = $category->code === 'about';
                ?>
                <div class="col-lg-4">
                    <a
                        class="text-reset d-block p-3 h-100 settings-card-link <?php echo e($isAboutCard ? 'settings-card-link--about' : ''); ?>"
                        href="<?php echo e($category->url); ?>"
                        role="button"
                    >
                        <div class="card shadow-sm h-100 <?php echo e($isAboutCard ? 'settings-card settings-card--about' : 'bg-light'); ?>">
                            <div class="card-body d-flex align-items-center">
                                <div class="pr-3 flex-shrink-0">
                                    <h5 class="mb-0">
                                        <div class="rounded-circle <?php echo e($isAboutCard ? 'about-card__icon' : 'bg-light about-card__icon'); ?> d-flex align-items-center justify-content-center">
                                            <?php if($item == 'core' && count(array_get($settingItemErrors, $category->code, []))): ?>
                                                <i
                                                    class="text-danger fa fa-exclamation-triangle fa-fw"
                                                    title="<?php echo app('translator')->get('system::lang.settings.alert_settings_errors'); ?>"
                                                ></i>
                                            <?php elseif($category->icon): ?>
                                                <i class="<?php echo e($isAboutCard ? 'text-white' : 'text-muted'); ?> <?php echo e($category->icon); ?> fa-fw"></i>
                                            <?php else: ?>
                                                <i class="<?php echo e($isAboutCard ? 'text-white' : 'text-muted'); ?> fa fa-puzzle-piece fa-fw"></i>
                                            <?php endif; ?>
                                        </div>
                                    </h5>
                                </div>
                                <div class="">
                                    <h5 class="mb-1"><?php echo app('translator')->get($category->label); ?></h5>
                                    <p class="no-margin text-muted"><?php echo $category->description ? lang($category->description) : ''; ?></p>
                                </div>
                            </div>
                        </div>
                    </a>
                </div>
            <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
        </div>
    <?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
</div>

<?php /**PATH /var/www/paymydine/app/system/views/settings/index.blade.php ENDPATH**/ ?>