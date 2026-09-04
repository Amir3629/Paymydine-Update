<?php

namespace Admin\Traits;

/**
 * PMD_MENU_IMAGE_QUALITY_V1
 *
 * Technical quality gate for restaurant food photos.
 * Intentionally does NOT reject aspect ratios: all ten customer themes use
 * different image frames, so owners may upload portrait, landscape or square.
 *
 * Hard checks:
 * - valid JPG / PNG / WEBP image
 * - <= 5 MB upload
 * - >= 0.9 megapixels (no minimum file-size rule)
 * - <= 24 megapixels to keep processing predictable
 * - severe blur / blank / extreme exposure rejection when GD is available
 * - conservative QR / monochrome graphic rejection when GD is available
 *
 * Accepted files are re-encoded to WebP (when GD + imagewebp are available),
 * normally capped to 2200px on the longest edge, and metadata is stripped.
 * Extremely wide/tall photos are never downscaled below the 0.9 MP floor.
 */
trait PmdMenuImageQualityV1
{
    protected function preparePmdMenuImageUploadV1($file): array
    {
        if (!$file || !$file->isValid()) {
            throw new \RuntimeException('One of the selected food photos could not be uploaded.');
        }

        $originalName = basename((string)$file->getClientOriginalName());
        $originalName = mb_substr($originalName !== '' ? $originalName : 'photo', 0, 120);

        if ((int)$file->getSize() > 5 * 1024 * 1024) {
            throw new \RuntimeException('Photo "'.$originalName.'" is larger than 5 MB.');
        }

        $mime = strtolower((string)$file->getMimeType());
        if (!in_array($mime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
            throw new \RuntimeException('Photo "'.$originalName.'" must be JPG, PNG or WEBP.');
        }

        $path = (string)($file->getRealPath() ?: $file->getPathname());
        $info = @getimagesize($path);
        if (!is_array($info) || empty($info[0]) || empty($info[1])) {
            throw new \RuntimeException('Photo "'.$originalName.'" is damaged or is not a readable image.');
        }

        $detectedMime = strtolower((string)($info['mime'] ?? ''));
        if ($detectedMime !== '' && !in_array($detectedMime, ['image/jpeg', 'image/png', 'image/webp'], true)) {
            throw new \RuntimeException('Photo "'.$originalName.'" is not a supported food image.');
        }
        if ($detectedMime !== '') $mime = $detectedMime;

        $width = (int)$info[0];
        $height = (int)$info[1];
        $pixels = $width * $height;

        // No aspect-ratio rule on purpose. Only real pixel information matters.
        if ($pixels < 900000) {
            throw new \RuntimeException('Photo "'.$originalName.'" is too small. Please use a clearer, higher-resolution photo.');
        }
        if ($pixels > 24000000) {
            throw new \RuntimeException('Photo "'.$originalName.'" is too large to process safely. Please export a normal-sized copy.');
        }

        $analysis = $this->analyzePmdMenuImagePixelsV1($path, $mime);
        if (is_array($analysis)) {
            if (!empty($analysis['blank'])) {
                throw new \RuntimeException('Photo "'.$originalName.'" does not contain enough visible detail. Please use a real food photo.');
            }
            if (!empty($analysis['exposure_bad'])) {
                throw new \RuntimeException('Photo "'.$originalName.'" is too dark or too bright. Please choose a clearer photo.');
            }
            if (!empty($analysis['blur_bad'])) {
                throw new \RuntimeException('Photo "'.$originalName.'" is too blurry. Please choose a sharper photo.');
            }
            if (!empty($analysis['synthetic'])) {
                throw new \RuntimeException('Photo "'.$originalName.'" looks like a QR code, logo or graphic. Please use a real food photo.');
            }
        }

        $optimized = $this->optimizePmdMenuImageUploadV1($path, $mime);
        if ($optimized) {
            clearstatcache(true, $path);
        }

        return [
            'width' => $width,
            'height' => $height,
            'pixels' => $pixels,
            'mime' => strtolower((string)$file->getMimeType()),
            'analysis' => $analysis,
            'optimized' => $optimized,
        ];
    }

    protected function analyzePmdMenuImagePixelsV1(string $path, string $mime): ?array
    {
        if (!function_exists('imagecreatetruecolor') || !function_exists('imagecopyresampled')) return null;

        $source = $this->loadPmdMenuGdImageV1($path, $mime);
        if (!$source) return null;

        try {
            $sourceWidth = imagesx($source);
            $sourceHeight = imagesy($source);
            if ($sourceWidth < 1 || $sourceHeight < 1) return null;

            $maxSample = 192;
            $scale = min(1, $maxSample / max($sourceWidth, $sourceHeight));
            $width = max(8, (int)round($sourceWidth * $scale));
            $height = max(8, (int)round($sourceHeight * $scale));

            $sample = imagecreatetruecolor($width, $height);
            if (!$sample) return null;
            imagecopyresampled($sample, $source, 0, 0, 0, 0, $width, $height, $sourceWidth, $sourceHeight);

            $count = $width * $height;
            $gray = array_fill(0, $count, 0.0);
            $sum = 0.0;
            $sumSq = 0.0;
            $dark = 0;
            $bright = 0;
            $binary = 0;
            $satSum = 0.0;

            for ($y = 0; $y < $height; $y++) {
                for ($x = 0; $x < $width; $x++) {
                    $rgb = imagecolorat($sample, $x, $y);
                    $r = ($rgb >> 16) & 0xFF;
                    $g = ($rgb >> 8) & 0xFF;
                    $b = $rgb & 0xFF;
                    $lum = (0.2126 * $r) + (0.7152 * $g) + (0.0722 * $b);
                    $idx = ($y * $width) + $x;
                    $gray[$idx] = $lum;
                    $sum += $lum;
                    $sumSq += $lum * $lum;
                    if ($lum < 10) $dark++;
                    if ($lum > 245) $bright++;
                    if ($lum < 35 || $lum > 220) $binary++;
                    $max = max($r, $g, $b);
                    $min = min($r, $g, $b);
                    $satSum += ($max - $min) / 255;
                }
            }

            $mean = $count ? $sum / $count : 0.0;
            $variance = $count ? max(0.0, ($sumSq / $count) - ($mean * $mean)) : 0.0;
            $contrast = sqrt($variance);

            $edgeSum = 0.0;
            $edgeCount = 0;
            for ($y = 1; $y < $height - 1; $y++) {
                for ($x = 1; $x < $width - 1; $x++) {
                    $i = ($y * $width) + $x;
                    $lap = (4 * $gray[$i])
                        - $gray[$i - 1]
                        - $gray[$i + 1]
                        - $gray[$i - $width]
                        - $gray[$i + $width];
                    $edgeSum += abs($lap);
                    $edgeCount++;
                }
            }
            $edge = $edgeCount ? $edgeSum / $edgeCount : 0.0;
            $darkRatio = $count ? $dark / $count : 0.0;
            $brightRatio = $count ? $bright / $count : 0.0;
            $binaryRatio = $count ? $binary / $count : 0.0;
            $satMean = $count ? $satSum / $count : 0.0;

            return [
                'mean' => $mean,
                'contrast' => $contrast,
                'edge' => $edge,
                'dark_ratio' => $darkRatio,
                'bright_ratio' => $brightRatio,
                'binary_ratio' => $binaryRatio,
                'saturation' => $satMean,
                'blank' => $contrast < 6.0,
                'exposure_bad' => $mean < 12.0 || $mean > 244.0 || $darkRatio > 0.94 || $brightRatio > 0.94,
                'blur_bad' => $edge < 1.05 && $contrast < 50.0,
                // Deliberately conservative: only obvious monochrome, high-edge graphics.
                'synthetic' => $satMean < 0.035 && $binaryRatio > 0.78 && $edge > 20.0,
            ];
        } catch (\Throwable $e) {
            return null;
        } finally {
            if (isset($sample) && $sample) @imagedestroy($sample);
            if ($source) @imagedestroy($source);
        }
    }

    protected function optimizePmdMenuImageUploadV1(string $path, string $mime): bool
    {
        if (!function_exists('imagewebp') || !function_exists('imagecreatetruecolor') || !function_exists('imagecopyresampled')) {
            return false;
        }

        $source = $this->loadPmdMenuGdImageV1($path, $mime);
        if (!$source) return false;

        try {
            $source = $this->applyPmdMenuExifOrientationV1($source, $path, $mime);
            $sourceWidth = imagesx($source);
            $sourceHeight = imagesy($source);
            if ($sourceWidth < 1 || $sourceHeight < 1) return false;

            $maxEdge = 2200;
            $sourcePixels = max(1, $sourceWidth * $sourceHeight);
            $edgeScale = min(1, $maxEdge / max($sourceWidth, $sourceHeight));
            $pixelFloorScale = min(1, sqrt(900000 / $sourcePixels));
            $scale = min(1, max($edgeScale, $pixelFloorScale));
            $targetWidth = max(1, (int)round($sourceWidth * $scale));
            $targetHeight = max(1, (int)round($sourceHeight * $scale));

            $target = imagecreatetruecolor($targetWidth, $targetHeight);
            if (!$target) return false;
            imagealphablending($target, false);
            imagesavealpha($target, true);
            $transparent = imagecolorallocatealpha($target, 0, 0, 0, 127);
            imagefilledrectangle($target, 0, 0, $targetWidth, $targetHeight, $transparent);

            if (!imagecopyresampled($target, $source, 0, 0, 0, 0, $targetWidth, $targetHeight, $sourceWidth, $sourceHeight)) {
                @imagedestroy($target);
                return false;
            }

            $temporary = $path.'.pmd-quality-v1.webp';
            @unlink($temporary);
            $written = @imagewebp($target, $temporary, 84);
            @imagedestroy($target);
            if (!$written || !is_file($temporary) || filesize($temporary) < 1) {
                @unlink($temporary);
                return false;
            }

            if (!@rename($temporary, $path)) {
                @unlink($temporary);
                return false;
            }

            return true;
        } catch (\Throwable $e) {
            return false;
        } finally {
            if ($source) @imagedestroy($source);
        }
    }

    protected function loadPmdMenuGdImageV1(string $path, string $mime)
    {
        try {
            if ($mime === 'image/jpeg' && function_exists('imagecreatefromjpeg')) return @imagecreatefromjpeg($path);
            if ($mime === 'image/png' && function_exists('imagecreatefrompng')) return @imagecreatefrompng($path);
            if ($mime === 'image/webp' && function_exists('imagecreatefromwebp')) return @imagecreatefromwebp($path);
        } catch (\Throwable $e) {
            return false;
        }
        return false;
    }

    protected function applyPmdMenuExifOrientationV1($image, string $path, string $mime)
    {
        if ($mime !== 'image/jpeg' || !function_exists('exif_read_data') || !function_exists('imagerotate')) return $image;

        try {
            $exif = @exif_read_data($path, 'IFD0', true, false);
            $orientation = (int)($exif['IFD0']['Orientation'] ?? $exif['Orientation'] ?? 1);
            $rotated = null;
            if ($orientation === 3) $rotated = @imagerotate($image, 180, 0);
            if ($orientation === 6) $rotated = @imagerotate($image, -90, 0);
            if ($orientation === 8) $rotated = @imagerotate($image, 90, 0);
            if ($rotated) {
                @imagedestroy($image);
                return $rotated;
            }
        } catch (\Throwable $e) {
            return $image;
        }

        return $image;
    }
}
