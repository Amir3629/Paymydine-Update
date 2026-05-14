<div class="media-finder">
    <div class="grid">
        <?php if($this->previewMode): ?>
            <a>
                <div class="img-cover">
                    <img src="<?php echo e($this->getMediaThumb($mediaItem)); ?>" class="img-responsive">
                </div>
            </a>
        <?php else: ?>
            <?php if(is_null($mediaItem)): ?>
                <a class="find-button blank-cover">
                    <i class="fa fa-plus"></i>
                </a>
            <?php else: ?>
                <i class="find-remove-button fa fa-times-circle" title="<?php echo app('translator')->get('admin::lang.text_remove'); ?>"></i>
                <a class="<?php echo e($useAttachment ? 'find-config-button' : ''); ?>" data-media-finder-cover>
                    <div class="img-cover">
                        
                        <?php $mediaFileType = $this->getMediaFileType($mediaItem); ?>
                        <img
                            data-find-image
                            src="<?php echo e($mediaFileType === 'image' ? $this->getMediaThumb($mediaItem) : ''); ?>"
                            class="img-responsive"
                            alt=""
                            style="display: <?php echo e($mediaFileType === 'image' ? 'block' : 'none'); ?>;"
                        />
                        <div class="media-icon" style="display: <?php echo e($mediaFileType === 'image' ? 'none' : 'block'); ?>;">
                            <i
                                data-find-file
                                class="fa fa-<?php echo e($mediaFileType); ?> fa-3x text-muted mb-2"
                            ></i>
                        </div>
                    </div>
                </a>
            <?php endif; ?>
            <input
                type="hidden"
                <?php echo (!is_null($mediaItem) && !$useAttachment) ? 'name="'.$fieldName.'"' : ''; ?>

                value="<?php echo e($this->getMediaPath($mediaItem)); ?>"
                data-find-value
            />
            <input
                type="hidden"
                value="<?php echo e($this->getMediaIdentifier($mediaItem)); ?>"
                data-find-identifier
            />
        <?php endif; ?>
    </div>
    <?php if(!is_null($mediaItem)): ?>
        <div class="icon-container icon-container-below">
            <span data-find-name data-no-tooltip><?php echo e($this->getMediaName($mediaItem)); ?></span>
        </div>
    <?php endif; ?>
</div>




<?php /**PATH /var/www/paymydine/app/admin/formwidgets/mediafinder/image_grid.blade.php ENDPATH**/ ?>