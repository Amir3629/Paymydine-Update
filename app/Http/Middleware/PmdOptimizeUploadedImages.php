<?php

namespace App\Http\Middleware;

use App\Services\PmdUploadedImageOptimizer;
use Closure;
use Illuminate\Http\Request;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;
use Main\Classes\MediaLibrary;

/**
 * PMD_UPLOAD_WEBP_MIDDLEWARE_V2
 *
 * Normalizes persisted raster uploads before their existing storage authorities
 * run, while preserving the storage semantics expected by each endpoint.
 *
 * Two delivery modes are intentional:
 * - in_place: keep the original PHP UploadedFile object/inode and replace only
 *   its bytes. Use this for controllers that call UploadedFile::move() directly
 *   or infer the final extension from MIME (Menu, restaurant logo, avatar).
 * - replacement: return a synthetic WebP UploadedFile whose client filename is
 *   also .webp. Use this for authorities that persist the client filename or raw
 *   attachment name (Combo media and Media Manager).
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

        // Preserve original source pixels for AI menu vision/OCR.
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

        // Preserve the endpoint's ORIGINAL upload-size semantics. An oversized
        // source is left untouched so the existing validator still rejects it.
        $size = (int)$value->getSize();
        if ($size < 1 || ($policy['max_bytes'] > 0 && $size > $policy['max_bytes'])) {
            return $value;
        }

        // Staff avatars already have a 3000x3000 validation boundary. Check the
        // original pixels before optimization so resizing cannot bypass it.
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

        $optimized = $this->optimizer->optimize($value, $policy['profile']);
        if (!$optimized instanceof UploadedFile || $optimized === $value) {
            return $value;
        }

        if (($policy['mode'] ?? 'replacement') !== 'in_place') {
            return $optimized;
        }

        // Direct-move authorities must keep the original PHP upload object.
        // Copy only the normalized WebP bytes back into that original upload
        // pathname. This mirrors the already-proven PMD menu gallery strategy.
        $sourcePath = (string)($optimized->getRealPath() ?: $optimized->getPathname());
        $targetPath = (string)($value->getRealPath() ?: $value->getPathname());
        if ($sourcePath === '' || $targetPath === '' || !is_file($sourcePath) || !is_file($targetPath)) {
            return $value;
        }

        try {
            $bytes = @file_get_contents($sourcePath);
            if ($bytes === false || $bytes === '') {
                return $value;
            }

            if (@file_put_contents($targetPath, $bytes, LOCK_EX) === false) {
                return $value;
            }

            clearstatcache(true, $targetPath);
            Log::debug('PMD_IMAGE_WEBP_IN_PLACE_READY', [
                'profile' => $policy['profile'],
                'path' => $request->path(),
                'field' => $path,
                'bytes' => (int)@filesize($targetPath),
            ]);

            return $value;
        } catch (\Throwable $error) {
            Log::warning('PMD_IMAGE_WEBP_IN_PLACE_FAILED', [
                'profile' => $policy['profile'],
                'path' => $request->path(),
                'field' => $path,
                'error_class' => get_class($error),
            ]);

            return $value;
        }
    }

    private function policy(string $path, string $rootField, Request $request): ?array
    {
        $leaf = strtolower((string)preg_replace('/^.*\./', '', $path));
        $root = strtolower($rootField);

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
                'mode' => 'in_place',
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
                'mode' => 'in_place',
                'max_bytes' => 5 * 1024 * 1024,
            ];
        }

        // Menu uses UploadedFile::move() directly and chooses its stored
        // extension from MIME. Keep the real PHP upload object for that route.
        if (($root === 'image' || $leaf === 'image') && $request->is('admin/menus')) {
            return [
                'profile' => 'menu',
                'mode' => 'in_place',
                'max_bytes' => 5 * 1024 * 1024,
            ];
        }

        // Combo attachment persistence uses the client filename, so it needs a
        // replacement UploadedFile named *.webp when conversion succeeds.
        if (($root === 'image' || $leaf === 'image') && $request->is('admin/combos')) {
            return [
                'profile' => 'menu',
                'mode' => 'replacement',
                'max_bytes' => 5 * 1024 * 1024,
            ];
        }

        if ($root === 'image' || $leaf === 'image') {
            return [
                'profile' => 'menu',
                'mode' => 'replacement',
                'max_bytes' => 5 * 1024 * 1024,
            ];
        }

        if ($root === 'file_data' || $leaf === 'file_data') {
            return [
                'profile' => 'media',
                'mode' => 'replacement',
                'max_bytes' => $this->mediaManagerLimitBytes(),
            ];
        }

        if ($root === 'images') {
            return [
                'profile' => 'menu',
                'mode' => 'replacement',
                'max_bytes' => 5 * 1024 * 1024,
            ];
        }

        // Unknown future file fields are deliberately not rewritten. New upload
        // surfaces must register their existing validation/storage semantics.
        return null;
    }

    private function mediaManagerLimitBytes(): int
    {
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
