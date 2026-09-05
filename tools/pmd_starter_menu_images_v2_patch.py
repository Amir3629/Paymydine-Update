from pathlib import Path

ROOT = Path('.')

v2 = r'''<?php

namespace Admin\Services;

use Admin\Models\Menus_model;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Str;

/**
 * PMD_STARTER_MENU_IMAGES_V2
 *
 * Premium starter-photo provider for Quick Setup.
 *
 * V2 intentionally does NOT use the broad Openverse fallback from V1. The
 * first release proved that a permissive public-domain search could return
 * semantically wrong, duplicated or low-quality food photography.
 *
 * V2 uses Pexels search with a server-side API key, landscape/large results,
 * deterministic per-item caching and exact starter-photo replacement rules.
 * User-uploaded food images are never removed by refreshStarterMenuImages().
 */
class PmdStarterMenuImageServiceV2
{
    public const VERSION = '2.0.0';

    protected const PEXELS_ENDPOINT = 'https://api.pexels.com/v1/search';
    protected const MAX_SOURCE_BYTES = 12 * 1024 * 1024;
    protected const MAX_EDGE = 1600;
    protected const TARGET_BYTES = 550000;
    protected const MIN_WIDTH = 1200;
    protected const MIN_HEIGHT = 700;

    /** @var array<int,bool> */
    protected array $usedPhotoIds = [];

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
                    // Refresh is deliberately non-destructive. If a premium
                    // replacement cannot be sourced, keep the current V1 photo.
                    return ['attached' => false, 'missing' => true, 'reason' => 'no_premium_photo'];
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
            usort($candidates, fn(array $a, array $b) => $this->candidateScore($b, $item) <=> $this->candidateScore($a, $item));

            foreach ($candidates as $candidate) {
                $id = (int)($candidate['id'] ?? 0);
                if ($id > 0 && isset($this->usedPhotoIds[$id])) continue;

                if ($this->downloadAsWebp($candidate, $targetPath)) {
                    if ($id > 0) $this->usedPhotoIds[$id] = true;
                    $this->recordSource($targetPath, $candidate, $query);

                    return [
                        'id' => $id,
                        'provider' => 'pexels',
                        'photographer' => trim((string)($candidate['photographer'] ?? '')),
                        'landing_url' => trim((string)($candidate['url'] ?? '')),
                    ];
                }
            }
        }

        return null;
    }

    protected function queries(array $item, string $restaurantType): array
    {
        $name = $this->searchName((string)($item['name'] ?? ''), $restaurantType);
        $category = trim((string)($item['category'] ?? ''));
        $cuisine = $this->cuisineTerm($restaurantType);

        // No broad "Italian food" style fallback. Every query remains tied to
        // the actual dish or its category, which prevents the V1 lasagna/ravioli
        // mismatch seen on Carbonara, Tagliatelle and Risotto.
        return array_values(array_unique(array_filter([
            trim($name.' plated restaurant food'),
            trim($name.' '.$cuisine.' dish'),
            trim($name.' food photography'),
            trim($category.' '.$cuisine.' plated dish'),
        ])));
    }

    protected function searchName(string $name, string $restaurantType): string
    {
        $key = mb_strtolower(trim($name));
        $map = [
            'margherita' => 'margherita pizza',
            'diavola' => 'diavola pizza',
            'tagliatelle al ragù' => 'tagliatelle bolognese ragu pasta',
            'risotto ai funghi' => 'mushroom risotto',
            'melanzane alla parmigiana' => 'eggplant parmigiana',
            'flat white' => 'flat white coffee',
            'halloumi' => 'grilled halloumi',
            'mixed grill' => 'middle eastern mixed grill',
            'beef fillet' => 'beef fillet fine dining',
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
                    'User-Agent' => 'PayMyDine-StarterMenu/2.0 (+https://paymydine.com)',
                ])
                ->timeout(10)
                ->get(self::PEXELS_ENDPOINT, [
                    'query' => mb_substr($query, 0, 180),
                    'orientation' => 'landscape',
                    'size' => 'large',
                    'per_page' => 15,
                ]);

            if (!$response->successful()) return [];
            $payload = (array)$response->json();
            $photos = isset($payload['photos']) && is_array($payload['photos']) ? $payload['photos'] : [];

            return array_values(array_filter($photos, fn($photo) => is_array($photo) && $this->candidateIsUsable($photo)));
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

        $src = (array)($candidate['src'] ?? []);
        $url = trim((string)($src['large2x'] ?? $src['large'] ?? $src['original'] ?? ''));
        if (!$this->urlIsAllowed($url)) return false;

        $alt = mb_strtolower(trim((string)($candidate['alt'] ?? '')));
        foreach (['restaurant interior', 'kitchen interior', 'menu board', 'food menu', 'person holding', 'people eating'] as $blocked) {
            if ($alt !== '' && str_contains($alt, $blocked)) return false;
        }

        return true;
    }

    protected function candidateScore(array $candidate, array $item): int
    {
        $width = (int)($candidate['width'] ?? 0);
        $height = max(1, (int)($candidate['height'] ?? 1));
        $ratio = $width / $height;
        $score = min(80, (int)(min($width, 3000) / 40));
        if ($ratio >= 1.25 && $ratio <= 1.8) $score += 30;

        $alt = $this->normaliseText((string)($candidate['alt'] ?? ''));
        $name = $this->normaliseText((string)($item['name'] ?? ''));
        $category = $this->normaliseText((string)($item['category'] ?? ''));

        foreach ($this->importantTokens($name) as $token) {
            if ($token !== '' && str_contains($alt, $token)) $score += 24;
        }
        foreach ($this->importantTokens($category) as $token) {
            if ($token !== '' && str_contains($alt, $token)) $score += 8;
        }

        return $score;
    }

    protected function importantTokens(string $text): array
    {
        $stop = ['with','and','the','alla','al','ba','plate','selection','classic','grilled'];
        return array_values(array_filter(preg_split('/\\s+/u', $text) ?: [], static function ($token) use ($stop) {
            return mb_strlen($token) >= 4 && !in_array($token, $stop, true);
        }));
    }

    protected function normaliseText(string $value): string
    {
        $value = mb_strtolower(trim($value));
        $value = preg_replace('/[^\\pL\\pN]+/u', ' ', $value) ?: '';
        return trim(preg_replace('/\\s+/u', ' ', $value) ?: '');
    }

    protected function downloadAsWebp(array $candidate, string $targetPath): bool
    {
        $src = (array)($candidate['src'] ?? []);
        $url = trim((string)($src['large2x'] ?? $src['large'] ?? $src['original'] ?? ''));
        if (!$this->urlIsAllowed($url)) return false;

        $download = $targetPath.'.download-'.bin2hex(random_bytes(4));
        $output = $targetPath.'.tmp-'.bin2hex(random_bytes(4));

        try {
            $response = Http::withHeaders(['User-Agent' => 'PayMyDine-StarterMenu/2.0 (+https://paymydine.com)'])
                ->timeout(18)
                ->withOptions(['sink' => $download])
                ->get($url);

            if (!$response->successful() || !is_file($download)) return false;
            $bytes = (int)@filesize($download);
            if ($bytes < 30000 || $bytes > self::MAX_SOURCE_BYTES) return false;

            $raw = @file_get_contents($download);
            if ($raw === false || $raw === '') return false;
            $source = @imagecreatefromstring($raw);
            if (!$source) return false;

            $width = imagesx($source);
            $height = imagesy($source);
            if ($width < self::MIN_WIDTH || $height < self::MIN_HEIGHT || $width <= $height) {
                imagedestroy($source);
                return false;
            }

            $scale = min(1, self::MAX_EDGE / max($width, $height));
            $targetWidth = max(1, (int)round($width * $scale));
            $targetHeight = max(1, (int)round($height * $scale));

            $canvas = imagecreatetruecolor($targetWidth, $targetHeight);
            imagecopyresampled($canvas, $source, 0, 0, 0, 0, $targetWidth, $targetHeight, $width, $height);

            $ok = imagewebp($canvas, $output, 82);
            if ($ok && is_file($output) && (int)@filesize($output) > self::TARGET_BYTES) $ok = imagewebp($canvas, $output, 76);
            if ($ok && is_file($output) && (int)@filesize($output) > self::TARGET_BYTES) $ok = imagewebp($canvas, $output, 70);

            imagedestroy($canvas);
            imagedestroy($source);

            if (!$ok || !is_file($output) || (int)@filesize($output) < 15000) return false;
            @chmod($output, 0644);
            if (!@rename($output, $targetPath)) return false;
            return true;
        } catch (\Throwable $error) {
            return false;
        } finally {
            if (is_file($download)) @unlink($download);
            if (is_file($output)) @unlink($output);
        }
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
        return 'pmdstarter_v2_'.$typeSlug.'_'.$itemSlug.'.webp';
    }

    protected function isStarterPath(string $path): bool
    {
        $base = strtolower(basename(str_replace('\\\\', '/', $path)));
        return str_starts_with($base, 'pmdstarter_v1_') || str_starts_with($base, 'pmdstarter_v2_');
    }

    protected function apiKey(): string
    {
        $value = trim((string)(config('services.pexels.key') ?? ''));
        if ($value !== '') return $value;
        $value = trim((string)env('PMD_PEXELS_API_KEY', ''));
        if ($value !== '') return $value;
        return trim((string)getenv('PMD_PEXELS_API_KEY'));
    }

    protected function recordSource(string $targetPath, array $candidate, string $query): void
    {
        try {
            $manifest = storage_path('app/pmd-starter-menu-image-sources-v2.json');
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
                'query' => $query,
                'photo_id' => (int)($candidate['id'] ?? 0),
                'alt' => trim((string)($candidate['alt'] ?? '')),
                'photographer' => trim((string)($candidate['photographer'] ?? '')),
                'photographer_url' => trim((string)($candidate['photographer_url'] ?? '')),
                'landing_url' => trim((string)($candidate['url'] ?? '')),
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
'''

(ROOT / 'app/admin/Services/PmdStarterMenuImageServiceV2.php').write_text(v2, encoding='utf-8')

service_path = ROOT / 'app/admin/Services/PmdTenantQuickSetupService.php'
service = service_path.read_text(encoding='utf-8')
service = service.replace('PMD_STARTER_MENU_IMAGES_V1', 'PMD_STARTER_MENU_IMAGES_V2')
service = service.replace('app(PmdStarterMenuImageServiceV1::class)', 'app(PmdStarterMenuImageServiceV2::class)')

needle = '''    protected function safeCount(string $table): int\n    {\n'''
method = r'''    public function refreshStarterMenuImages(): array
    {
        $type = strtolower(trim((string)setting('pmd_onboarding_restaurant_type', '')));
        $starterMenu = (bool)setting('pmd_onboarding_starter_menu', false);

        if ($type === '' || !$starterMenu) {
            throw new \RuntimeException('This restaurant does not have a Quick Setup starter menu to refresh.');
        }

        $types = $this->restaurantTypes();
        if (!isset($types[$type])) {
            throw new \RuntimeException('The saved restaurant type is not available.');
        }

        $images = app(PmdStarterMenuImageServiceV2::class);
        if (!$images->isConfigured()) {
            throw new \RuntimeException('Premium starter photos are not configured yet. Add PMD_PEXELS_API_KEY on the server first.');
        }

        $pack = app(PmdStarterMenuLibraryV1::class)->pack($type);
        $summary = [
            'updated' => 0,
            'cached' => 0,
            'kept_old' => 0,
            'skipped_custom' => 0,
            'menu_missing' => 0,
        ];

        foreach ($pack['items'] as $item) {
            $menu = Menus_model::query()
                ->where('menu_name', (string)$item['name'])
                ->first();

            if (!$menu) {
                $summary['menu_missing']++;
                continue;
            }

            $result = $images->refreshMenu($menu, $item, $type);
            if (!empty($result['attached'])) {
                $summary['updated']++;
                if (!empty($result['cached'])) $summary['cached']++;
            } elseif (!empty($result['skipped_custom'])) {
                $summary['skipped_custom']++;
            } else {
                $summary['kept_old']++;
            }
        }

        return [
            'ok' => true,
            'provider' => 'pexels',
            'restaurant_type' => $type,
            'summary' => $summary,
            'message' => sprintf(
                'Premium starter photos refreshed: %d updated, %d custom photos preserved, %d old starter photos kept.',
                $summary['updated'],
                $summary['skipped_custom'],
                $summary['kept_old']
            ),
        ];
    }

'''
if needle not in service:
    raise SystemExit('safeCount insertion point not found')
service = service.replace(needle, method + needle, 1)
service_path.write_text(service, encoding='utf-8')

controller_path = ROOT / 'app/admin/controllers/Pmdquicksetup.php'
controller = controller_path.read_text(encoding='utf-8')
insert_before = '''    public function onApply()\n    {\n'''
refresh_handler = r'''    public function onRefreshStarterPhotos()
    {
        try {
            return response()->json(
                app(PmdTenantQuickSetupService::class)->refreshStarterMenuImages()
            );
        } catch (\RuntimeException $error) {
            return response()->json([
                'ok' => false,
                'message' => $error->getMessage(),
            ], 409);
        } catch (\Throwable $error) {
            logger()->error('PMD Starter photo refresh failed', [
                'type' => get_class($error),
                'message' => $error->getMessage(),
            ]);

            return response()->json([
                'ok' => false,
                'message' => 'Starter photos could not be refreshed. Existing photos were preserved where replacement failed.',
            ], 500);
        }
    }

'''
if insert_before not in controller:
    raise SystemExit('controller insertion point not found')
controller = controller.replace(insert_before, refresh_handler + insert_before, 1)
controller_path.write_text(controller, encoding='utf-8')

view_path = ROOT / 'app/admin/views/pmdquicksetup/index.blade.php'
view = view_path.read_text(encoding='utf-8')
old_actions = '''            <div class="pmd-quick-setup__done-actions">\n                <a href="{{ admin_url('dashboardlab') }}">Open dashboard</a>\n                <a href="{{ admin_url('pmdmenus') }}">Review menu</a>\n                <a href="{{ admin_url('pmdteam') }}">Review team</a>\n            </div>\n'''
new_actions = '''            <div class="pmd-quick-setup__done-actions">\n                <a href="{{ admin_url('dashboardlab') }}">Open dashboard</a>\n                <a href="{{ admin_url('pmdmenus') }}">Review menu</a>\n                <a href="{{ admin_url('pmdteam') }}">Review team</a>\n                @if(!empty($state['starter_menu']))\n                    <button type="button" data-pmd-refresh-starter-photos>Refresh premium starter photos</button>\n                @endif\n            </div>\n            @if(!empty($state['starter_menu']))\n                <div class="pmd-quick-setup__photo-status" data-pmd-starter-photo-status aria-live="polite"></div>\n            @endif\n'''
if old_actions not in view:
    raise SystemExit('completed actions block not found')
view = view.replace(old_actions, new_actions, 1)
view = view.replace(
    'Includes categories, item descriptions, suggested prices, lightweight starter photos, nutrition and allergen suggestions. Review these against your real recipes before publishing.',
    'Includes categories, item descriptions, suggested prices, curated starter photos, nutrition and allergen suggestions. Review these against your real recipes before publishing.'
)
view = view.replace(
    '''                </label>\n            </section>\n\n            <div class="pmd-quick-setup__submit-row">''',
    '''                </label>\n                <small class="pmd-quick-setup__photo-credit">Starter photos are sourced through Pexels and saved locally as optimized WebP files.</small>\n            </section>\n\n            <div class="pmd-quick-setup__submit-row">''',
    1
)
view_path.write_text(view, encoding='utf-8')

js_path = ROOT / 'app/admin/assets/js/pmd-tenant-quick-setup-v1.js'
js = js_path.read_text(encoding='utf-8')
js = js.replace("    var form = root.querySelector('[data-pmd-quick-setup-form]');\n    if (!form) return;\n\n    var busy = false;", "    var form = root.querySelector('[data-pmd-quick-setup-form]');\n\n    var busy = false;")
handler_end = '''        return payload;\n    }\n\n'''
refresh_js = r'''    async function refreshStarterPhotos(button) {
        if (busy) return;
        var status = root.querySelector('[data-pmd-starter-photo-status]');
        busy = true;
        if (button) button.disabled = true;
        if (status) {
            status.textContent = 'Finding better photos and replacing only Quick Setup starter images…';
            status.classList.remove('is-error');
        }

        try {
            var payload = await handler('onRefreshStarterPhotos', new FormData());
            if (status) status.textContent = payload.message || 'Premium starter photos refreshed.';
        } catch (error) {
            if (status) {
                status.textContent = error && error.message ? error.message : 'Starter photos could not be refreshed.';
                status.classList.add('is-error');
            }
        } finally {
            busy = false;
            if (button) button.disabled = false;
        }
    }

    var refreshButton = root.querySelector('[data-pmd-refresh-starter-photos]');
    if (refreshButton) {
        refreshButton.addEventListener('click', function (event) {
            event.preventDefault();
            refreshStarterPhotos(refreshButton);
        });
    }

'''
if handler_end not in js:
    raise SystemExit('js handler insertion point not found')
js = js.replace(handler_end, handler_end + refresh_js, 1)
js = js.replace("    form.addEventListener('submit', async function (event) {", "    if (form) form.addEventListener('submit', async function (event) {")
js_path.write_text(js, encoding='utf-8')

css_path = ROOT / 'app/admin/assets/css/pmd-tenant-quick-setup-v1.css'
css = css_path.read_text(encoding='utf-8')
css = css.replace(
    '.pmd-quick-setup__back,\n.pmd-quick-setup__done-actions a {',
    '.pmd-quick-setup__back,\n.pmd-quick-setup__done-actions a,\n.pmd-quick-setup__done-actions button {'
)
css += r'''

/* PMD_STARTER_MENU_IMAGES_V2 */
.pmd-quick-setup__done-actions button {
    cursor:pointer;
    font-family:inherit;
}
.pmd-quick-setup__done-actions button:disabled {
    opacity:.6;
    cursor:wait;
}
.pmd-quick-setup__photo-status {
    min-height:20px;
    margin:14px auto 0;
    color:var(--muted);
    font-size:12.5px;
}
.pmd-quick-setup__photo-status.is-error { color:#ad3535; }
.pmd-quick-setup__photo-credit {
    display:block;
    margin:9px 3px 0;
    color:var(--muted);
    font-size:11.5px;
}
'''
css_path.write_text(css, encoding='utf-8')

print('PMD Starter Menu Images V2 patch applied')
