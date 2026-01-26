<?php
// File: app/admin/formwidgets/mediafinder/image_image.blade.php
// Minimal fallback preview for image mode

/** @var mixed $mediaItem */
$src = '';
$alt = '';

if (is_object($mediaItem ?? null)) {
    // Try common properties/methods used by TI media items
    $src = $mediaItem->path ?? (method_exists($mediaItem, 'getPath') ? $mediaItem->getPath() : '');
    $alt = $mediaItem->file_name ?? $mediaItem->filename ?? 'image';
} elseif (is_array($mediaItem ?? null)) {
    $src = $mediaItem['path'] ?? '';
    $alt = $mediaItem['file_name'] ?? $mediaItem['filename'] ?? 'image';
}

?>
<div class="mediafinder-preview">
    <?php if (!empty($src)): ?>
        <img src="<?= e($src) ?>" alt="<?= e($alt) ?>" style="max-width: 100%; height: auto;">
    <?php else: ?>
        <div class="ti-placeholder" style="padding: .75rem; border: 1px dashed #ccc; border-radius: .5rem;">
            <?= lang('system::lang.media.text_no_image') ?: 'No image selected' ?>
        </div>
    <?php endif; ?>
</div>