<?php

namespace Admin\Services;

use Admin\Models\Menus_model;

/**
 * PMD_STARTER_MENU_IMAGES_V6_CACHE_FIRST
 *
 * Adds a canonical shared starter-photo cache in front of the existing V5.1
 * Pexels resolver. Image binaries stay on disk/object storage; tenant databases
 * only store the normal menu_images.image_path reference.
 *
 * This lets PayMyDine pre-warm each cuisine once. Every future tenant can then
 * attach those local assets during Quick Setup without waiting for Pexels.
 */
class PmdStarterMenuImageServiceV6 extends PmdStarterMenuImageServiceV5
{
    public const VERSION = '6.0.1';

    /** @var array<string,array{table:bool,sort:bool,created:bool,updated:bool}> */
    protected array $menuImageSchemaCache = [];

    public function warmAsset(array $item, string $restaurantType): array
    {
        $directory = base_path('assets/media/uploads');
        if (!is_dir($directory) && !@mkdir($directory, 0755, true) && !is_dir($directory)) {
            return ['ok' => false, 'cached' => false, 'missing' => true, 'reason' => 'directory'];
        }

        $filename = $this->filename($restaurantType, (string)($item['name'] ?? 'food'));
        $path = $directory.DIRECTORY_SEPARATOR.$filename;

        if (is_file($path) && (int)@filesize($path) > 0) {
            return [
                'ok' => true,
                'cached' => true,
                'missing' => false,
                'filename' => $filename,
            ];
        }

        if (!$this->isConfigured()) {
            return [
                'ok' => false,
                'cached' => false,
                'missing' => true,
                'reason' => 'pexels_key_missing',
                'filename' => $filename,
            ];
        }

        try {
            $source = $this->materialize($item, $restaurantType, $path);
            if (!$source || !is_file($path) || (int)@filesize($path) < 1) {
                return [
                    'ok' => false,
                    'cached' => false,
                    'missing' => true,
                    'reason' => 'no_studio_match',
                    'filename' => $filename,
                ];
            }

            return [
                'ok' => true,
                'cached' => false,
                'created' => true,
                'missing' => false,
                'filename' => $filename,
                'source' => $source,
            ];
        } catch (\Throwable $error) {
            return [
                'ok' => false,
                'cached' => false,
                'missing' => true,
                'reason' => 'exception',
                'filename' => $filename,
            ];
        }
    }

    /**
     * Attach only an already-warmed local asset. This method never calls an
     * external provider and is therefore safe inside the Quick Setup database
     * transaction.
     */
    public function attachCachedToMenu(Menus_model $menu, array $item, string $restaurantType): array
    {
        $menuId = (int)($menu->menu_id ?? 0);
        if ($menuId < 1) {
            return ['attached' => false, 'cached' => false, 'missing' => true, 'reason' => 'menu_id'];
        }

        try {
            $connection = $menu->getConnection();
            $schema = $this->menuImagesSchema($connection);
            if (!$schema['table']) {
                return ['attached' => false, 'cached' => false, 'missing' => true, 'reason' => 'menu_images'];
            }

            $existingQuery = $connection->table('menu_images')->where('menu_id', $menuId);
            if ($schema['sort']) $existingQuery->orderBy('sort_order');
            $existing = $existingQuery->get(['image_path'])->pluck('image_path')
                ->map(static fn($path) => trim((string)$path))
                ->filter()->values()->all();

            if ($existing) {
                $custom = false;
                foreach ($existing as $path) {
                    if (!$this->isStarterPath($path)) {
                        $custom = true;
                        break;
                    }
                }

                return [
                    'attached' => false,
                    'cached' => true,
                    'missing' => false,
                    'already_attached' => true,
                    'skipped_custom' => $custom,
                    'reason' => $custom ? 'custom_image_preserved' : 'existing_image',
                ];
            }

            $filename = $this->filename($restaurantType, (string)($item['name'] ?? 'food'));
            $path = base_path('assets/media/uploads').DIRECTORY_SEPARATOR.$filename;
            if (!is_file($path) || (int)@filesize($path) < 1) {
                return [
                    'attached' => false,
                    'cached' => false,
                    'missing' => true,
                    'reason' => 'cache_miss',
                    'filename' => $filename,
                ];
            }

            $row = ['menu_id' => $menuId, 'image_path' => $filename];
            if ($schema['sort']) $row['sort_order'] = 1;
            if ($schema['created']) $row['created_at'] = now();
            if ($schema['updated']) $row['updated_at'] = now();
            $connection->table('menu_images')->insert($row);

            return [
                'attached' => true,
                'cached' => true,
                'missing' => false,
                'filename' => $filename,
                'style' => 'pmd-studio-semantic-v5-cache-first',
            ];
        } catch (\Throwable $error) {
            return ['attached' => false, 'cached' => false, 'missing' => true, 'reason' => 'exception'];
        }
    }

    /**
     * Schema introspection is comparatively expensive. Quick Setup may attach
     * 100+ cached photos, so inspect the tenant menu_images table only once per
     * connection for the lifetime of this service instance.
     */
    protected function menuImagesSchema($connection): array
    {
        $key = (string)$connection->getName();
        if (isset($this->menuImageSchemaCache[$key])) {
            return $this->menuImageSchemaCache[$key];
        }

        $builder = $connection->getSchemaBuilder();
        $table = $builder->hasTable('menu_images');
        if (!$table) {
            return $this->menuImageSchemaCache[$key] = [
                'table' => false,
                'sort' => false,
                'created' => false,
                'updated' => false,
            ];
        }

        return $this->menuImageSchemaCache[$key] = [
            'table' => true,
            'sort' => $builder->hasColumn('menu_images', 'sort_order'),
            'created' => $builder->hasColumn('menu_images', 'created_at'),
            'updated' => $builder->hasColumn('menu_images', 'updated_at'),
        ];
    }
}
