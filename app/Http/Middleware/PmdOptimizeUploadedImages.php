<?php

namespace App\Http\Middleware;

use App\Services\PmdUploadedImageOptimizer;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Main\Classes\MediaLibrary;

/**
 * PMD_UPLOAD_WEBP_MIDDLEWARE_V1
 *
 * Normalizes the active PayMyDine persisted raster upload surfaces before
 * their existing controllers/widgets store them. Existing authorities still
 * own validation and persistence; this middleware only replaces a candidate
 * that is already inside the endpoint's original size/dimension boundaries.
 *
 * Important exclusions:
 * - AI menu source files are transient OCR/vision input, not persisted media.
 * - The legacy enhanced menu gallery already owns its own WebP normalization.
 */
class PmdOptimizeUploadedImages
{
    public function __construct(private PmdUploadedImageOptimizer $optimizer)
    {
    }

    public function handle(Request $request, Closure $next)
    {
        $files = $request->files->all();
        if (!config('pmd_images.enabled', true) || empty($files)) {
            return $next($request);
        }

        // Do not recompress menu screenshots/PDFs that are sent to AI vision.
        if ($request->is('admin/pmdmenuaiimport/analyse')) {
            return $next($request);
        }

        foreach ($files as $key => $value) {
            $request->files->set(
                $key,
                $this->transform($value, (string)$key, (string)$key, $request)
            );
        }

        return $next($request);
    }

    private function transform($value, string $path, string $rootField, Request $request)
    {
        if (is_array($value)) {
            $result = [];
            foreach ($value as $key => $child) {
                $result[$key] = $this->transform(
                    $child,
                    $path.'.'.(string)$key,
                    $rootField,
                    $request
                );
            }

            return $result;
        }

        if (!$value instanceof UploadedFile || !$value->isValid()) {
            return $value;
        }

        $policy = $this->policy($path, $rootField, $request);
        if ($policy === null) {
            return $value;
        }

        // Preserve each existing endpoint's original upload-size semantics.
        // If an original file is too large, leave it untouched so the existing
        // validator/widget returns the same error it did before this middleware.
        $size = (int)$value->getSize();
        if ($size < 1 || ($policy['max_bytes'] > 0 && $size > $policy['max_bytes'])) {
            return $value;
        }

        // Staff avatars also have an existing 3000x3000 validation boundary.
        // Check the ORIGINAL pixels before optimization so downscaling cannot
        // turn a previously-invalid avatar into a valid request.
        if (!empty($policy['max_width']) || !empty($policy['max_height'])) {
            $realPath = (string)($value->getRealPath() ?: $value->getPathname());
            $info = $realPath !== '' ? @getimagesize($realPath) : false;
            if (!is_array($info) || empty($info[0]) || empty($info[1])) {
                return $value;
            }
            if (!empty($policy['max_width']) && (int)$info[0] > (int)$policy['max_width']) {
                return $value;
            }
            if (!empty($policy['max_height']) && (int)$info[1] > (int)$policy['max_height']) {
                return $value;
            }
        }

        return $this->optimizer->optimize($value, $policy['profile']);
    }

    private function policy(string $path, string $rootField, Request $request): ?array
    {
        $leaf = strtolower((string)preg_replace('/^.*\./', '', $path));
        $root = strtolower($rootField);

        // AI import source images are read-only analysis input and should retain
        // their original pixels. This field exclusion also protects future route
        // changes that keep the same payload name.
        if ($root === 'menu_sources' || str_starts_with(strtolower($path), 'menu_sources.')) {
            return null;
        }

        // Existing legacy gallery quality authority already re-encodes these.
        if ($root === 'images' && (string)$request->input('pmd_menu_enhancements_v1', '') === '1') {
            return null;
        }

        if ($root === 'avatar' || $leaf === 'avatar') {
            return [
                'profile' => 'avatar',
                'max_bytes' => 2 * 1024 * 1024,
                'max_width' => 3000,
                'max_height' => 3000,
            ];
        }

        if (
            $root === 'pmd_restaurant_logo'
            || $leaf === 'pmd_restaurant_logo'
            || str_contains($leaf, 'logo')
        ) {
            return [
                'profile' => 'logo',
                'max_bytes' => 5 * 1024 * 1024,
            ];
        }

        // Current Menu Manager and Combo Manager both persist the `image`
        // field with a 5 MB validation limit.
        if ($root === 'image' || $leaf === 'image') {
            return [
                'profile' => 'menu',
                'max_bytes' => 5 * 1024 * 1024,
            ];
        }

        // Generic reusable media uploads enter through MediaManager as
        // `file_data`. Mirror its dynamic original-size limit before changing
        // bytes so compression can never bypass that existing validation.
        if ($root === 'file_data' || $leaf === 'file_data') {
            return [
                'profile' => 'media',
                'max_bytes' => $this->mediaManagerLimitBytes(),
            ];
        }

        // `images` without the legacy enhancement flag is treated as a normal
        // menu/photo batch. Current PMD persisted galleries are 5 MB per file.
        if ($root === 'images') {
            return [
                'profile' => 'menu',
                'max_bytes' => 5 * 1024 * 1024,
            ];
        }

        // Unknown future file fields are deliberately not rewritten. New upload
        // surfaces should be added here with their original validation limit so
        // this optimization layer never weakens endpoint validation.
        return null;
    }

    private function mediaManagerLimitBytes(): int
    {
        // Media Manager itself guarantees a minimum effective 2 MB allowance.
        // If tenant settings are unavailable this early in a request, use that
        // safe floor so compression cannot make an oversized upload pass later.
        $fallbackKb = 2048;

        try {
            $maxSizeMb = (float)MediaLibrary::instance()->getConfig('max_size', 30);
            $maxSizeKb = (int)round(max(1, $maxSizeMb) * 1024);
            $phpMaxKb = $this->phpUploadMaxSizeKb();

            $effectiveMaxKb = $maxSizeKb > 0
                ? max($fallbackKb, min($maxSizeKb, $phpMaxKb ?: PHP_INT_MAX))
                : max($fallbackKb, $phpMaxKb);

            return max($fallbackKb, $effectiveMaxKb) * 1024;
        } catch (\Throwable $error) {
            return $fallbackKb * 1024;
        }
    }

    private function phpUploadMaxSizeKb(): int
    {
        $upload = $this->iniSizeToKb((string)ini_get('upload_max_filesize'));
        $post = $this->iniSizeToKb((string)ini_get('post_max_size'));

        if ($upload > 0 && $post > 0) {
            return min($upload, $post);
        }

        return max($upload, $post, 0);
    }

    private function iniSizeToKb(string $value): int
    {
        $value = trim($value);
        if ($value === '' || $value === '-1') {
            return 0;
        }

        $unit = strtolower(substr($value, -1));
        $number = (float)$value;

        return match ($unit) {
            'g' => (int)round($number * 1024 * 1024),
            'm' => (int)round($number * 1024),
            'k' => (int)round($number),
            default => (int)round($number / 1024),
        };
    }
}
