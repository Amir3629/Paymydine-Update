<?php

namespace Admin\Services;

use Admin\Models\Menus_model;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * PMD_STARTER_MENU_IMAGES_V3
 *
 * Consistency-first starter menu photography.
 *
 * V3 keeps Pexels as the source, but no longer accepts any merely relevant
 * photo. Every image must fit a single PayMyDine art direction:
 * - bright / warm-neutral food photography
 * - close plated dish, landscape crop
 * - no people, hands, holding/eating scenes or restaurant-wide table scenes
 * - no dark-background / night / bar-table look
 * - fixed 8:5 crop and light normalization before WEBP output
 *
 * Existing restaurant-uploaded images are never replaced by refresh.
 */
class PmdStarterMenuImageServiceV3
{
    public const VERSION = '3.0.0';

    protected const PEXELS_ENDPOINT = 'https://api.pexels.com/v1/search';
    protected const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
    protected const TARGET_WIDTH = 1280;
    protected const TARGET_HEIGHT = 800;
    protected const TARGET_BYTES = 520000;
    protected const MIN_WIDTH = 1200;
    protected const MIN_HEIGHT = 700;

    /** @var array<int,bool> */
    protected array $usedPhotoIds = [];

    protected ?int $preferredPhotographerId = null;

    /** @var array{0:int,1:int,2:int}|null */
    protected ?array $styleAnchorRgb = null;

    public function isConfigured(): bool
    {
        return $this->apiKey() !== '';
    }

    public function attachToMenu(Menus_model $menu, array $item, string $restaurantType): array
    {
        return $this->writeMenuImage($menu, $item, $restaurantType, false);
    }

    public function refreshMenu(Menus_model $menu, array $item, string $restaurantType): array
    {
        return $this->writeMenuImage($menu, $item, $restaurantType, true);
    }

    protected function writeMenuImage(Menus_model $menu, array $item, string $restaurantType, bool $replaceStarter): array
    {
        $menuId = (int)($menu->menu_id ?? 0);
        if ($menuId < 1) {
            return ['attached' => false, 'missing' => true, 'reason' => 'menu_id'];
        }

        if (!$this->isConfigured()) {
            return ['attached' => false, 'missing' => true, 'reason' => 'pexels_key_missing'];
        }

        try {
            $connection = $menu->getConnection();
            $schema = $connection->getSchemaBuilder();
            if (!$schema->hasTable('menu_images')) {
                return ['attached' => false, 'missing' => true, 'reason' => 'menu_images'];
            }

            $existingQuery = $connection->table('menu_images')->where('menu_id', $menuId);
            if ($schema->hasColumn('menu_images', 'sort_order')) $existingQuery->orderBy('sort_order');
            $existing = $existingQuery->get(['image_path'])->pluck('image_path')
                ->map(static fn($path) => trim((string)$path))
                ->filter()->values()->all();

            if (!$replaceStarter && $existing) {
                return ['attached' => false, 'missing' => false, 'reason' => 'existing_image'];
            }

            if ($replaceStarter && $existing) {
                foreach ($existing as $path) {
                    if (!$this->isStarterPath($path)) {
                        return [
                            'attached' => false,
                            'missing' => false,
                            'skipped_custom' => true,
                            'reason' => 'custom_image_preserved',
                        ];
                    }
                }
            }

            $directory = base_path('assets/media/uploads');
            if (!is_dir($directory) && !@mkdir($directory, 0755, true) && !is_dir($directory)) {
                return ['attached' => false, 'missing' => true, 'reason' => 'directory'];
            }

            $filename = $this->filename($restaurantType, (string)($item['name'] ?? 'food'));
            $path = $directory.DIRECTORY_SEPARATOR.$filename;
            $cached = is_file($path) && (int)@filesize($path) > 0;
            $source = null;

            if (!$cached) {
                $source = $this->materialize($item, $restaurantType, $path);
                if (!$source) {
                    // Consistency beats coverage. Never replace an existing
                    // starter image with a weak/scene-style candidate.
                    return ['attached' => false, 'missing' => true, 'reason' => 'no_studio_match'];
                }
            }

            if (!is_file($path) || (int)@filesize($path) < 1) {
                return ['attached' => false, 'missing' => true, 'reason' => 'file_missing'];
            }

            $insert = function () use ($connection, $schema, $menuId, $filename) {
                $row = ['menu_id' => $menuId, 'image_path' => $filename];
                if ($schema->hasColumn('menu_images', 'sort_order')) $row['sort_order'] = 1;
                if ($schema->hasColumn('menu_images', 'created_at')) $row['created_at'] = now();
                if ($schema->hasColumn('menu_images', 'updated_at')) $row['updated_at'] = now();
                $connection->table('menu_images')->insert($row);
            };

            if ($replaceStarter) {
                $connection->transaction(function () use ($connection, $menuId, $insert) {
                    $connection->table('menu_images')->where('menu_id', $menuId)->delete();
                    $insert();
                });
            } else {
                $insert();
            }

            return [
                'attached' => true,
                'cached' => $cached,
                'missing' => false,
                'replaced' => $replaceStarter,
                'filename' => $filename,
                'source' => $source,
                'style' => 'pmd-studio-light-v3',
            ];
        } catch (\Throwable $error) {
            return ['attached' => false, 'missing' => true, 'reason' => 'exception'];
        }
    }

    protected function materialize(array $item, string $restaurantType, string $targetPath): ?array
    {
        if (!function_exists('imagecreatefromstring') || !function_exists('imagewebp')) return null;

        foreach ($this->queries($item, $restaurantType) as $query) {
            $candidates = $this->search($query);
            usort(
                $candidates,
                fn(array $a, array $b) => $this->candidateScore($b, $item) <=> $this->candidateScore($a, $item)
            );

            foreach ($candidates as $candidate) {
                $id = (int)($candidate['id'] ?? 0);
                if ($id > 0 && isset($this->usedPhotoIds[$id])) continue;

                $render = $this->downloadAndRender($candidate, $targetPath);
                if (!$render['ok']) continue;

                if ($id > 0) $this->usedPhotoIds[$id] = true;
                $photographerId = (int)($candidate['photographer_id'] ?? 0);
                if ($this->preferredPhotographerId === null && $photographerId > 0) {
                    $this->preferredPhotographerId = $photographerId;
                }
                $avg = $this->hexRgb((string)($candidate['avg_color'] ?? ''));
                if ($this->styleAnchorRgb === null && $avg) $this->styleAnchorRgb = $avg;

                $this->recordSource($targetPath, $candidate, $query, (array)$render['metrics']);

                return [
                    'id' => $id,
                    'provider' => 'pexels',
                    'photographer' => trim((string)($candidate['photographer'] ?? '')),
                    'landing_url' => trim((string)($candidate['url'] ?? '')),
                    'style' => 'pmd-studio-light-v3',
                ];
            }
        }

        return null;
    }

    protected function queries(array $item, string $restaurantType): array
    {
        $name = $this->searchName((string)($item['name'] ?? ''), $restaurantType);
        $cuisine = $this->cuisineTerm($restaurantType);

        return array_values(array_unique(array_filter([
            trim($name.' white plate light background food photography'),
            trim($name.' plated dish bright neutral background'),
            trim($name.' '.$cuisine.' close up food'),
        ])));
    }

    protected function searchName(string $name, string $restaurantType): string
    {
        $key = mb_strtolower(trim($name));
        $map = [
            'margherita' => 'margherita pizza',
            'diavola' => 'diavola pizza salami',
            'spaghetti carbonara' => 'spaghetti carbonara',
            'tagliatelle al ragù' => 'tagliatelle bolognese ragu pasta',
            'risotto ai funghi' => 'mushroom risotto',
            'burrata & tomato' => 'burrata tomato',
            'bruschetta' => 'tomato bruschetta',
            'melanzane alla parmigiana' => 'eggplant parmigiana',
            'tiramisù' => 'tiramisu dessert',
            'panna cotta' => 'panna cotta dessert',
            'flat white' => 'flat white coffee',
            'halloumi' => 'grilled halloumi',
            'mixed grill' => 'middle eastern mixed grill plate',
            'beef fillet' => 'beef fillet plated',
            'filet mignon 220g' => 'filet mignon steak',
            'ribeye 300g' => 'ribeye steak',
            'new york strip 300g' => 'new york strip steak',
        ];

        if (isset($map[$key])) return $map[$key];
        return preg_replace('/\\b\\d+\\s*g\\b/iu', '', trim($name)) ?: trim($name);
    }

    protected function cuisineTerm(string $type): string
    {
        return [
            'german' => 'German cuisine',
            'turkish' => 'Turkish cuisine',
            'arabic' => 'Middle Eastern cuisine',
            'persian' => 'Persian cuisine',
            'italian' => 'Italian cuisine',
            'spanish' => 'Spanish tapas',
            'japanese' => 'Japanese cuisine',
            'chinese' => 'Chinese cuisine',
            'vietnamese' => 'Vietnamese cuisine',
            'mexican' => 'Mexican cuisine',
            'mediterranean' => 'Mediterranean cuisine',
            'steakhouse' => 'steakhouse',
            'cafe' => 'cafe brunch',
            'fine_dining' => 'fine dining',
            'bar' => 'gastropub',
        ][strtolower(trim($type))] ?? str_replace('_', ' ', strtolower(trim($type))).' cuisine';
    }

    protected function search(string $query): array
    {
        try {
            $response = Http::acceptJson()
                ->withHeaders([
                    'Authorization' => $this->apiKey(),
                    'User-Agent' => 'PayMyDine-StarterMenu/3.0 (+https://paymydine.com)',
                ])
                ->timeout(12)
                ->get(self::PEXELS_ENDPOINT, [
                    'query' => mb_substr($query, 0, 180),
                    'orientation' => 'landscape',
                    'size' => 'large',
                    'per_page' => 30,
                ]);

            if (!$response->successful()) return [];
            $payload = (array)$response->json();
            $photos = isset($payload['photos']) && is_array($payload['photos']) ? $payload['photos'] : [];

            return array_values(array_filter(
                $photos,
                fn($photo) => is_array($photo) && $this->candidateIsUsable($photo)
            ));
        } catch (\Throwable $error) {
            return [];
        }
    }

    protected function candidateIsUsable(array $candidate): bool
    {
        $id = (int)($candidate['id'] ?? 0);
        if ($id < 1 || isset($this->usedPhotoIds[$id])) return false;

        $width = (int)($candidate['width'] ?? 0);
        $height = (int)($candidate['height'] ?? 0);
        if ($width < self::MIN_WIDTH || $height < self::MIN_HEIGHT || $width <= $height) return false;
        $ratio = $width / max(1, $height);
        if ($ratio < 1.30 || $ratio > 2.05) return false;

        $src = (array)($candidate['src'] ?? []);
        $url = trim((string)($src['large2x'] ?? $src['large'] ?? $src['original'] ?? ''));
        if (!$this->urlIsAllowed($url)) return false;

        $alt = $this->normaliseText((string)($candidate['alt'] ?? ''));
        foreach ([
            'person', 'people', 'woman', 'women', 'man ', 'men ', 'girl', 'boy',
            'hand', 'hands', 'holding', 'eating', 'serving food', 'chef', 'waiter',
            'friends', 'family', 'couple', 'group of', 'dining table', 'table setting',
            'restaurant interior', 'kitchen interior', 'outdoor', 'outside', 'picnic',
            'street food', 'market', 'buffet', 'takeaway', 'take out', 'plastic container',
            'disposable container', 'paper plate', 'food tray', 'meal prep', 'lunch box',
            'food box', 'delivery box', 'party table', 'wedding table', 'bar counter'
        ] as $blocked) {
            if ($alt !== '' && str_contains($alt, $blocked)) return false;
        }

        $avg = $this->hexRgb((string)($candidate['avg_color'] ?? ''));
        if ($avg) {
            $luma = $this->luma($avg[0], $avg[1], $avg[2]);
            if ($luma < 78) return false;
        }

        return true;
    }

    protected function candidateScore(array $candidate, array $item): int
    {
        $width = (int)($candidate['width'] ?? 0);
        $height = max(1, (int)($candidate['height'] ?? 1));
        $ratio = $width / $height;

        $score = min(70, (int)(min($width, 3000) / 45));
        $score += max(0, 35 - (int)(abs($ratio - 1.6) * 70));

        $alt = $this->normaliseText((string)($candidate['alt'] ?? ''));
        $name = $this->normaliseText((string)($item['name'] ?? ''));
        $category = $this->normaliseText((string)($item['category'] ?? ''));

        foreach ($this->importantTokens($name) as $token) {
            if ($token !== '' && str_contains($alt, $token)) $score += 28;
        }
        foreach ($this->importantTokens($category) as $token) {
            if ($token !== '' && str_contains($alt, $token)) $score += 7;
        }

        foreach (['plate', 'plated', 'dish', 'bowl', 'close up', 'closeup', 'food photography'] as $wanted) {
            if ($alt !== '' && str_contains($alt, $wanted)) $score += 8;
        }

        $photographerId = (int)($candidate['photographer_id'] ?? 0);
        if ($this->preferredPhotographerId !== null && $photographerId === $this->preferredPhotographerId) {
            $score += 35;
        }

        $avg = $this->hexRgb((string)($candidate['avg_color'] ?? ''));
        if ($avg) {
            $fixedTarget = [188, 171, 149];
            $score += max(0, 32 - (int)($this->rgbDistance($avg, $fixedTarget) / 4));
            if ($this->styleAnchorRgb) {
                $score += max(0, 30 - (int)($this->rgbDistance($avg, $this->styleAnchorRgb) / 4));
            }
        }

        return $score;
    }

    protected function importantTokens(string $text): array
    {
        $stop = ['with','and','the','alla','al','ba','plate','selection','classic','grilled'];
        return array_values(array_filter(
            preg_split('/\\s+/u', $text) ?: [],
            static fn($token) => mb_strlen($token) >= 4 && !in_array($token, $stop, true)
        ));
    }

    protected function normaliseText(string $value): string
    {
        $value = mb_strtolower(trim($value));
        $value = preg_replace('/[^\\pL\\pN]+/u', ' ', $value) ?: '';
        return trim(preg_replace('/\\s+/u', ' ', $value) ?: '');
    }

    protected function downloadAndRender(array $candidate, string $targetPath): array
    {
        $src = (array)($candidate['src'] ?? []);
        $url = trim((string)($src['large2x'] ?? $src['large'] ?? $src['original'] ?? ''));
        if (!$this->urlIsAllowed($url)) return ['ok' => false, 'metrics' => []];

        $download = $targetPath.'.download-'.bin2hex(random_bytes(4));
        $output = $targetPath.'.tmp-'.bin2hex(random_bytes(4));

        try {
            $response = Http::withHeaders([
                    'User-Agent' => 'PayMyDine-StarterMenu/3.0 (+https://paymydine.com)'
                ])
                ->timeout(20)
                ->withOptions(['sink' => $download])
                ->get($url);

            if (!$response->successful() || !is_file($download)) return ['ok' => false, 'metrics' => []];
            $bytes = (int)@filesize($download);
            if ($bytes < 30000 || $bytes > self::MAX_SOURCE_BYTES) return ['ok' => false, 'metrics' => []];

            $raw = @file_get_contents($download);
            if ($raw === false || $raw === '') return ['ok' => false, 'metrics' => []];
            $source = @imagecreatefromstring($raw);
            if (!$source) return ['ok' => false, 'metrics' => []];

            $width = imagesx($source);
            $height = imagesy($source);
            if ($width < self::MIN_WIDTH || $height < self::MIN_HEIGHT || $width <= $height) {
                imagedestroy($source);
                return ['ok' => false, 'metrics' => []];
            }

            $metrics = $this->visualMetrics($source);
            if (!$this->passesStudioProfile($metrics)) {
                imagedestroy($source);
                return ['ok' => false, 'metrics' => $metrics];
            }

            $targetRatio = self::TARGET_WIDTH / self::TARGET_HEIGHT;
            $sourceRatio = $width / max(1, $height);

            if ($sourceRatio > $targetRatio) {
                $cropHeight = $height;
                $cropWidth = (int)round($height * $targetRatio);
                $cropX = (int)floor(($width - $cropWidth) / 2);
                $cropY = 0;
            } else {
                $cropWidth = $width;
                $cropHeight = (int)round($width / $targetRatio);
                $cropX = 0;
                $cropY = (int)floor(($height - $cropHeight) / 2);
            }

            $canvas = imagecreatetruecolor(self::TARGET_WIDTH, self::TARGET_HEIGHT);
            $bg = imagecolorallocate($canvas, 246, 243, 238);
            imagefill($canvas, 0, 0, $bg);

            imagecopyresampled(
                $canvas,
                $source,
                0,
                0,
                $cropX,
                $cropY,
                self::TARGET_WIDTH,
                self::TARGET_HEIGHT,
                $cropWidth,
                $cropHeight
            );

            $edgeLuma = (float)($metrics['edge_luma'] ?? 155.0);
            $brightness = (int)round(max(-14, min(18, 166 - $edgeLuma)));
            if ($brightness !== 0 && defined('IMG_FILTER_BRIGHTNESS')) {
                @imagefilter($canvas, IMG_FILTER_BRIGHTNESS, $brightness);
            }
            if (defined('IMG_FILTER_COLORIZE')) {
                @imagefilter($canvas, IMG_FILTER_COLORIZE, 3, 2, -1);
            }

            $ok = imagewebp($canvas, $output, 84);
            if ($ok && is_file($output) && (int)@filesize($output) > self::TARGET_BYTES) {
                $ok = imagewebp($canvas, $output, 78);
            }
            if ($ok && is_file($output) && (int)@filesize($output) > self::TARGET_BYTES) {
                $ok = imagewebp($canvas, $output, 72);
            }

            imagedestroy($canvas);
            imagedestroy($source);

            if (!$ok || !is_file($output) || (int)@filesize($output) < 18000) {
                return ['ok' => false, 'metrics' => $metrics];
            }

            @chmod($output, 0644);
            if (!@rename($output, $targetPath)) return ['ok' => false, 'metrics' => $metrics];

            return ['ok' => true, 'metrics' => $metrics];
        } catch (\Throwable $error) {
            return ['ok' => false, 'metrics' => []];
        } finally {
            if (is_file($download)) @unlink($download);
            if (is_file($output)) @unlink($output);
        }
    }

    protected function visualMetrics($image): array
    {
        $width = imagesx($image);
        $height = imagesy($image);
        $step = max(5, (int)floor(min($width, $height) / 120));

        $edgeSamples = 0;
        $edgeLumaSum = 0.0;
        $darkEdge = 0;
        $neutralLightEdge = 0;
        $skinEdge = 0;

        for ($y = 0; $y < $height; $y += $step) {
            for ($x = 0; $x < $width; $x += $step) {
                $edge = $x < $width * 0.22 || $x > $width * 0.78
                    || $y < $height * 0.20 || $y > $height * 0.80;
                if (!$edge) continue;

                $rgb = imagecolorat($image, $x, $y);
                $r = ($rgb >> 16) & 0xFF;
                $g = ($rgb >> 8) & 0xFF;
                $b = $rgb & 0xFF;
                $luma = $this->luma($r, $g, $b);
                $sat = $this->saturation($r, $g, $b);

                $edgeSamples++;
                $edgeLumaSum += $luma;
                if ($luma < 72) $darkEdge++;
                if ($luma > 145 && $sat < 0.42) $neutralLightEdge++;
                if ($this->looksLikeSkin($r, $g, $b)) $skinEdge++;
            }
        }

        $edgeSamples = max(1, $edgeSamples);

        return [
            'edge_luma' => round($edgeLumaSum / $edgeSamples, 2),
            'dark_edge_ratio' => round($darkEdge / $edgeSamples, 4),
            'neutral_light_edge_ratio' => round($neutralLightEdge / $edgeSamples, 4),
            'skin_edge_ratio' => round($skinEdge / $edgeSamples, 4),
            'samples' => $edgeSamples,
        ];
    }

    protected function passesStudioProfile(array $metrics): bool
    {
        $edgeLuma = (float)($metrics['edge_luma'] ?? 0);
        $darkEdge = (float)($metrics['dark_edge_ratio'] ?? 1);
        $neutralLight = (float)($metrics['neutral_light_edge_ratio'] ?? 0);
        $skin = (float)($metrics['skin_edge_ratio'] ?? 1);

        if ($edgeLuma < 108) return false;
        if ($darkEdge > 0.24) return false;
        if ($neutralLight < 0.08) return false;
        if ($skin > 0.045) return false;

        return true;
    }

    protected function looksLikeSkin(int $r, int $g, int $b): bool
    {
        $max = max($r, $g, $b);
        $min = min($r, $g, $b);

        $classic = $r > 95 && $g > 40 && $b > 20
            && ($max - $min) > 15
            && abs($r - $g) > 15
            && $r > $g && $r > $b;

        $light = $r > 200 && $g > 170 && $b > 120
            && abs($r - $g) <= 35
            && $r > $b && $g > $b
            && ($r - $b) > 20;

        return $classic || $light;
    }

    protected function luma(int $r, int $g, int $b): float
    {
        return 0.2126 * $r + 0.7152 * $g + 0.0722 * $b;
    }

    protected function saturation(int $r, int $g, int $b): float
    {
        $max = max($r, $g, $b);
        $min = min($r, $g, $b);
        if ($max <= 0) return 0.0;
        return ($max - $min) / $max;
    }

    /** @return array{0:int,1:int,2:int}|null */
    protected function hexRgb(string $hex): ?array
    {
        $hex = ltrim(trim($hex), '#');
        if (!preg_match('/^[0-9a-fA-F]{6}$/', $hex)) return null;
        return [hexdec(substr($hex, 0, 2)), hexdec(substr($hex, 2, 2)), hexdec(substr($hex, 4, 2))];
    }

    protected function rgbDistance(array $a, array $b): float
    {
        return sqrt(
            (($a[0] ?? 0) - ($b[0] ?? 0)) ** 2
            + (($a[1] ?? 0) - ($b[1] ?? 0)) ** 2
            + (($a[2] ?? 0) - ($b[2] ?? 0)) ** 2
        );
    }

    protected function urlIsAllowed(string $url): bool
    {
        if (!str_starts_with(strtolower($url), 'https://')) return false;
        $host = strtolower((string)parse_url($url, PHP_URL_HOST));
        return $host === 'images.pexels.com' || str_ends_with($host, '.pexels.com');
    }

    protected function filename(string $type, string $name): string
    {
        $typeSlug = Str::slug($type) ?: 'restaurant';
        $itemSlug = Str::slug($name) ?: 'food';
        return 'pmdstarter_v3_'.$typeSlug.'_'.$itemSlug.'.webp';
    }

    protected function isStarterPath(string $path): bool
    {
        $base = strtolower(basename(str_replace('\\\\', '/', $path)));
        return str_starts_with($base, 'pmdstarter_v1_')
            || str_starts_with($base, 'pmdstarter_v2_')
            || str_starts_with($base, 'pmdstarter_v3_');
    }

    protected function apiKey(): string
    {
        $value = trim((string)(config('services.pexels.key') ?? ''));
        if ($value !== '') return $value;
        $value = trim((string)env('PMD_PEXELS_API_KEY', ''));
        if ($value !== '') return $value;
        return trim((string)getenv('PMD_PEXELS_API_KEY'));
    }

    protected function recordSource(string $targetPath, array $candidate, string $query, array $metrics): void
    {
        try {
            $manifest = storage_path('app/pmd-starter-menu-image-sources-v3.json');
            $directory = dirname($manifest);
            if (!is_dir($directory)) @mkdir($directory, 0755, true);

            $handle = @fopen($manifest, 'c+');
            if (!$handle) return;
            if (!flock($handle, LOCK_EX)) { fclose($handle); return; }

            rewind($handle);
            $data = json_decode((string)stream_get_contents($handle), true);
            if (!is_array($data)) $data = [];

            $data[basename($targetPath)] = [
                'provider' => 'pexels',
                'style_profile' => 'pmd-studio-light-v3',
                'query' => $query,
                'photo_id' => (int)($candidate['id'] ?? 0),
                'alt' => trim((string)($candidate['alt'] ?? '')),
                'avg_color' => trim((string)($candidate['avg_color'] ?? '')),
                'photographer' => trim((string)($candidate['photographer'] ?? '')),
                'photographer_id' => (int)($candidate['photographer_id'] ?? 0),
                'photographer_url' => trim((string)($candidate['photographer_url'] ?? '')),
                'landing_url' => trim((string)($candidate['url'] ?? '')),
                'visual_metrics' => $metrics,
                'saved_at' => now()->toIso8601String(),
            ];

            ftruncate($handle, 0);
            rewind($handle);
            fwrite($handle, json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
            fflush($handle);
            flock($handle, LOCK_UN);
            fclose($handle);
        } catch (\Throwable $error) {
            // Audit metadata must never make onboarding fail.
        }
    }
}
