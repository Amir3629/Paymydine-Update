<?php $__currentLoopData = $records ?? []; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $theme): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
    <?php if (! ($theme->getTheme())): ?>
        <?php echo $this->makePartial('lists/not_found', ['theme' => $theme]); ?>

    <?php else: ?>
        <div class="row mb-3">
            <div class="d-flex align-items-center bg-light p-4 w-100">
                <?php if($theme->getTheme()->hasParent()): ?>
                    <?php echo $this->makePartial('lists/child_theme', ['theme' => $theme]); ?>

                <?php else: ?>
                    <a
                        class="media-left mr-4 preview-thumb"
                        data-bs-toggle="modal"
                        data-bs-target="#theme-preview-<?php echo e($theme->code); ?>"
                        data-img-src="<?php echo e(URL::asset($theme->screenshot)); ?>"
                        style="width:200px;">
                        <img
                            class="img-responsive img-rounded"
                            alt=""
                            src="<?php echo e(URL::asset($theme->screenshot)); ?>"
                        />
                    </a>
                    <div class="media-body">
                        <span class="h5 media-heading"><?php echo e($theme->name); ?></span>&nbsp;&nbsp;
                        <?php if($theme->code === 'frontend-theme'): ?>
                            <span class="small text-dark">
                                PayMyDine guest experience theme · Version <?php echo e($theme->version); ?> · Crafted by the PayMyDine web team
                            </span>
                        <?php else: ?>
                            <span class="small text-muted">
                                <?php echo e($theme->code); ?>&nbsp;-&nbsp;
                                <?php echo e($theme->version); ?>

                                <?php echo app('translator')->get('system::lang.themes.text_author'); ?>
                                <b><?php echo e($theme->author); ?></b>
                            </span>
                        <?php endif; ?>
                        <?php if (! ($theme->getTheme()->hasParent())): ?>
                            <?php if($theme->code === 'frontend-theme'): ?>
                                <p class="description text-dark mt-3">
                                    A polished PayMyDine storefront that’s ready for launch. Personalise the colours, imagery, and layout directly from the admin panel—no extra setup required.
                                </p>
                            <?php else: ?>
                                <p class="description text-muted mt-3"><?php echo e($theme->description); ?></p>
                            <?php endif; ?>
                        <?php endif; ?>
                        <div class="list-action list-action--flex align-self-end my-3">
                            <?php echo $this->makePartial('lists/list_buttons', ['theme' => $theme]); ?>

                        </div>
                    </div>
                <?php endif; ?>
            </div>
            <?php if(strlen($theme->screenshot)): ?>
                <?php echo $this->makePartial('lists/screenshot', ['theme' => $theme]); ?>

            <?php endif; ?>
        </div>
    <?php endif; ?>
<?php endforeach; $__env->popLoop(); $loop = $__env->getLastLoop(); ?>
<?php /**PATH /var/www/paymydine/app/system/views/themes/lists/list_body.blade.php ENDPATH**/ ?>