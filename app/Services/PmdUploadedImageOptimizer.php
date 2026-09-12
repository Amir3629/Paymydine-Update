<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Log;

/**
 * PMD_UPLOAD_WEBP_AUTHORITY_V1
 *
 * One raster optimization authority for PayMyDine user uploads.
 *
 * - JPG / PNG -> WebP when the result is smaller
 * - oversized static WebP -> resized WebP when beneficial
 * - normal-sized WebP -> preserved (avoids generational loss)
 * - transparency is preserved
 * - common JPEG EXIF orientation is applied
 * - metadata is removed by re-encoding
 * - animated PNG/WebP, GIF, SVG, PDF and other files are untouched
 * - failures are fail-open: restaurant workflows keep the original upload
 */
class PmdUploadedImageOptimizer
{
    private static bool $warnedMissingGd = false;

    public function optimize(UploadedFile $file, string $profile = 'media'): UploadedFile
    {
        if (!config('pmd_images.enabled', true) || !$file->isValid()) {
            return $file;
        }

        if (!$this->webpRuntimeAvailable()) {
            if (!self::$warnedMissingGd) {
                self::$warnedMissingGd = true;
                Log::warning('PMD_IMAGE_WEBP_SKIPPED_RUNTIME_UNAVAILABLE');
            }

            return $file;
        }

        $path = (string)($file->getRealPath() ?: $file->getPathname());
        if ($path === '' || !is_file($path)) {
            return $file;
        }

        $info = @getimagesize($path);
        if (!is_array($info) || empty($info[0]) || empty($info[1])) {
            return $file;
        }

        $mime = strtolower((string)($info['mime'] ?? $file->getMimeType() ?? ''));
        if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
            return $file;
        }

        if ($this->isAnimatedRaster($path, $mime)) {
            return $file;
        }

        $sourceWidth = (int)$info[0];
        $sourceHeight = (int)$info[1];
        $pixels = $sourceWidth * $sourceHeight;
        $maxPixels = max(1000000, (int)config('pmd_images.max_pixels', 24000000));

        if ($pixels < 1 || $pixels > $maxPixels || !$this->hasSafeDecodeMemory($pixels)) {
            Log::debug('PMD_IMAGE_WEBP_SKIPPED_DECODE_GUARD', [
                'profile' => $profile,
                'pixels' => $pixels,
                'max_pixels' => $maxPixels,
            ]);

            return $file;
        }

        $settings = $this->profile($profile);
        $maxEdge = $settings['max_edge'];
        $quality = $settings['quality'];

        // A static WebP that is already within the requested dimensions is
        // already in the target format. Re-encoding it would only add loss.
        if ($mime === 'image/webp' && max($sourceWidth, $sourceHeight) <= $maxEdge) {
            return $file;
        }

        $source = null;
        $target = null;
        $temporary = null;

        try {
            $source = $this->loadGdImage($path, $mime);
            if (!$source) {
                return $file;
            }

            if ($mime === 'image/jpeg') {
                $source = $this->applyExifOrientation($source, $path);
            }

            $orientedWidth = imagesx($source);
            $orientedHeight = imagesy($source);
            if ($orientedWidth < 1 || $orientedHeight < 1) {
                return $file;
            }

            $scale = min(1, $maxEdge / max($orientedWidth, $orientedHeight));
            $targetWidth = max(1, (int)round($orientedWidth * $scale));
            $targetHeight = max(1, (int)round($orientedHeight * $scale));

            $target = imagecreatetruecolor($targetWidth, $targetHeight);
            if (!$target) {
                return $file;
            }

            // Preserve PNG/WebP alpha instead of flattening transparent logos.
            imagealphablending($target, false);
            imagesavealpha($target, true);
            $transparent = imagecolorallocatealpha($target, 0, 0, 0, 127);
            imagefilledrectangle($target, 0, 0, $targetWidth, $targetHeight, $transparent);

            if (!imagecopyresampled(
                $target,
                $source,
                0,
                0,
                0,
                0,
                $targetWidth,
                $targetHeight,
                $orientedWidth,
                $orientedHeight
            )) {
                return $file;
            }

            $temporary = tempnam(sys_get_temp_dir(), 'pmd-webp-');
            if (!$temporary) {
                return $file;
            }

            if (!@imagewebp($target, $temporary, $quality) || !is_file($temporary) || (int)@filesize($temporary) < 1) {
                @unlink($temporary);
                $temporary = null;
                return $file;
            }

            @chmod($temporary, 0600);
            clearstatcache(true, $temporary);

            $originalBytes = max(0, (int)$file->getSize());
            $optimizedBytes = max(0, (int)@filesize($temporary));

            // The purpose of this layer is storage reduction. If WebP would be
            // the same size or larger, keep the original instead of spending
            // more disk space merely to force an extension change.
            if ($originalBytes > 0 && $optimizedBytes >= $originalBytes) {
                Log::debug('PMD_IMAGE_WEBP_SKIPPED_NOT_SMALLER', [
                    'profile' => $profile,
                    'source_mime' => $mime,
                    'source_bytes' => $originalBytes,
                    'webp_bytes' => $optimizedBytes,
                ]);

                @unlink($temporary);
                $temporary = null;
                return $file;
            }

            $newName = $this->webpClientName(
                (string)$file->getClientOriginalName(),
                $profile
            );

            // The generated temporary file is not a PHP HTTP-upload inode, so
            // test=true is intentional. The original UploadedFile was already
            // accepted by PHP and route-specific validation still owns limits.
            $optimized = new UploadedFile(
                $temporary,
                $newName,
                'image/webp',
                UPLOAD_ERR_OK,
                true
            );

            $cleanup = $temporary;
            register_shutdown_function(static function () use ($cleanup): void {
                if (is_file($cleanup)) {
                    @unlink($cleanup);
                }
            });

            Log::debug('PMD_IMAGE_WEBP_NORMALIZED', [
                'profile' => $profile,
                'source_mime' => $mime,
                'source_bytes' => $originalBytes,
                'webp_bytes' => $optimizedBytes,
                'source_width' => $sourceWidth,
                'source_height' => $sourceHeight,
                'target_width' => $targetWidth,
                'target_height' => $targetHeight,
            ]);

            // Ownership of this file now belongs to the returned UploadedFile.
            $temporary = null;

            return $optimized;
        } catch (\Throwable $error) {
            Log::warning('PMD_IMAGE_WEBP_OPTIMIZATION_FAILED', [
                'profile' => $profile,
                'error_class' => get_class($error),
            ]);

            return $file;
        } finally {
            if ($target) {
                @imagedestroy($target);
            }
            if ($source) {
                @imagedestroy($source);
            }
            if ($temporary && is_file($temporary)) {
                @unlink($temporary);
            }
        }
    }

    private function profile(string $profile): array
    {
        $defaults = [
            'max_edge' => 2560,
            'quality' => 90,
        ];

        $configured = (array)config('pmd_images.profiles.'.$profile, []);
        $settings = array_merge($defaults, $configured);

        return [
            'max_edge' => max(512, min(6000, (int)$settings['max_edge'])),
            'quality' => max(70, min(100, (int)$settings['quality'])),
        ];
    }

    private function webpRuntimeAvailable(): bool
    {
        return function_exists('imagewebp')
            && function_exists('imagecreatetruecolor')
            && function_exists('imagecopyresampled');
    }

    private function loadGdImage(string $path, string $mime)
    {
        if ($mime === 'image/jpeg' && function_exists('imagecreatefromjpeg')) {
            return @imagecreatefromjpeg($path);
        }
        if ($mime === 'image/png' && function_exists('imagecreatefrompng')) {
            return @imagecreatefrompng($path);
        }
        if ($mime === 'image/webp' && function_exists('imagecreatefromwebp')) {
            return @imagecreatefromwebp($path);
        }

        return false;
    }

    private function applyExifOrientation($image, string $path)
    {
        if (!function_exists('exif_read_data')) {
            return $image;
        }

        try {
            $exif = @exif_read_data($path, 'IFD0', true, false);
            $orientation = (int)($exif['IFD0']['Orientation'] ?? $exif['Orientation'] ?? 1);

            if (($orientation === 2 || $orientation === 4) && function_exists('imageflip')) {
                @imageflip($image, $orientation === 2 ? IMG_FLIP_HORIZONTAL : IMG_FLIP_VERTICAL);
                return $image;
            }

            if (($orientation === 5 || $orientation === 7) && function_exists('imageflip')) {
                $rotated = @imagerotate($image, $orientation === 5 ? -90 : 90, 0);
                if ($rotated) {
                    @imagedestroy($image);
                    $image = $rotated;
                    @imageflip($image, IMG_FLIP_HORIZONTAL);
                }
                return $image;
            }

            $degrees = match ($orientation) {
                3 => 180,
                6 => -90,
                8 => 90,
                default => 0,
            };

            if ($degrees !== 0 && function_exists('imagerotate')) {
                $rotated = @imagerotate($image, $degrees, 0);
                if ($rotated) {
                    @imagedestroy($image);
                    return $rotated;
                }
            }
        } catch (\Throwable $error) {
            return $image;
        }

        return $image;
    }

    private function isAnimatedRaster(string $path, string $mime): bool
    {
        if (!in_array($mime, ['image/png', 'image/webp'], true)) {
            return false;
        }

        $length = min(max(0, (int)@filesize($path)), 1024 * 1024);
        if ($length < 1) {
            return false;
        }

        $bytes = @file_get_contents($path, false, null, 0, $length);
        if (!is_string($bytes) || $bytes === '') {
            return false;
        }

        if ($mime === 'image/webp') {
            return strpos($bytes, 'ANIM') !== false;
        }

        // APNG animation control chunk.
        return strpos($bytes, 'acTL') !== false;
    }

    private function webpClientName(string $name, string $profile): string
    {
        $name = basename(str_replace('\\', '/', trim($name)));
        $stem = pathinfo($name, PATHINFO_FILENAME);
        $extension = strtolower((string)pathinfo($name, PATHINFO_EXTENSION));
        $stem = trim((string)$stem);
        if ($stem === '') {
            $stem = 'image';
        }

        $stem = preg_replace('/[^\pL\pN._-]+/u', '-', $stem) ?: 'image';
        $stem = trim($stem, '.-_');

        // Media Manager persists the client filename. Including the original
        // raster extension prevents foo.jpg and foo.png from both collapsing
        // onto an existing foo.webp library entry.
        if ($profile === 'media' && $extension !== '' && $extension !== 'webp') {
            $stem .= '-'.$extension;
        }

        return ($stem !== '' ? $stem : 'image').'.webp';
    }

    private function hasSafeDecodeMemory(int $pixels): bool
    {
        $limit = $this->phpIniBytes((string)ini_get('memory_limit'));
        if ($limit <= 0) {
            return true;
        }

        $available = max(0, $limit - (int)memory_get_usage(true));
        // Approximate source + destination GD buffers plus working overhead.
        $estimated = ($pixels * 10) + (24 * 1024 * 1024);

        return $estimated < (int)floor($available * 0.85);
    }

    private function phpIniBytes(string $value): int
    {
        $value = trim($value);
        if ($value === '' || $value === '-1') {
            return -1;
        }

        $unit = strtolower(substr($value, -1));
        $number = (float)$value;

        return match ($unit) {
            'g' => (int)round($number * 1024 * 1024 * 1024),
            'm' => (int)round($number * 1024 * 1024),
            'k' => (int)round($number * 1024),
            default => (int)$number,
        };
    }
}
