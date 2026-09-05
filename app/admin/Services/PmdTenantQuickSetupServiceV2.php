<?php

namespace Admin\Services;

use Admin\Models\Allergens_model;
use Admin\Models\Categories_model;
use Admin\Models\Menus_model;
use Illuminate\Support\Facades\DB;

/**
 * PMD_TENANT_QUICK_SETUP_V3_FAST
 *
 * Keeps the original floor/staff/KDS onboarding authority and owns the
 * additive starter-menu upgrade path. The active catalogue is V3 (50+ items
 * per restaurant type) and the stable image service alias resolves V5.
 *
 * Fast-path rules:
 * - never performs Pexels/network work inside the setup transaction
 * - missing starter photos are prepared later in one-item HTTP chunks
 * - never deletes categories or foods
 * - never rewrites an existing food
 * - never removes restaurant-uploaded images
 */
class PmdTenantQuickSetupServiceV2 extends PmdTenantQuickSetupService
{
    public const STARTER_LIBRARY_VERSION = PmdStarterMenuLibraryV3::VERSION;

    public function restaurantTypes(): array
    {
        return app(PmdStarterMenuLibraryV3::class)->restaurantTypes();
    }

    protected function seedStarterMenu(string $type, int $locationId, array $allergenMap): array
    {
        if ($this->safeCount('menus') > 0 || $this->safeCount('categories') > 0) {
            throw new \RuntimeException('Starter Menu cannot be installed after Menu content exists.');
        }

        $pack = app(PmdStarterMenuLibraryV3::class)->pack($type);
        $categories = [];
        $priority = 10;

        foreach ((array)$pack['categories'] as $name) {
            $category = $this->createCategory((string)$name, $locationId, $priority);
            $categories[(string)$name] = (int)$category->category_id;
            $priority += 10;
        }

        $imageSummary = ['attached' => 0, 'cached' => 0, 'pending' => 0];
        $itemPriority = 10;
        $created = 0;

        foreach ((array)$pack['items'] as $item) {
            if (!is_array($item)) continue;
            $categoryId = $categories[(string)($item['category'] ?? '')] ?? null;
            if (!$categoryId) continue;

            $this->createStarterItem($item, $categoryId, $locationId, $allergenMap, $itemPriority);
            $created++;
            $imageSummary['pending']++;
            $itemPriority += 10;
        }

        setting()->set([
            'pmd_starter_menu_library_version' => self::STARTER_LIBRARY_VERSION,
        ]);

        return [
            'created' => true,
            'pack' => $type,
            'library_version' => self::STARTER_LIBRARY_VERSION,
            'categories' => count($categories),
            'items' => $created,
            'images' => $imageSummary,
            'photos_pending' => $imageSummary['pending'],
            'review_required' => true,
            'note' => 'Starter prices, allergens and nutrition are suggestions and must be reviewed against the restaurant recipes.',
        ];
    }

    public function completeStarterMenu(): array
    {
        $type = strtolower(trim((string)setting('pmd_onboarding_restaurant_type', '')));
        $starterMenu = (bool)setting('pmd_onboarding_starter_menu', false);

        if ($type === '' || !$starterMenu) {
            throw new \RuntimeException('This restaurant does not have a Quick Setup starter menu to complete.');
        }

        if (!isset($this->restaurantTypes()[$type])) {
            throw new \RuntimeException('The saved restaurant type is not available.');
        }

        $locationId = $this->locationId();
        if ($locationId < 1) {
            throw new \RuntimeException('Active restaurant location is unavailable.');
        }

        $pack = app(PmdStarterMenuLibraryV3::class)->pack($type);
        $allergens = $this->ensureReferenceAllergens();

        $summary = DB::transaction(function () use ($pack, $locationId, $allergens) {
            $categoryIds = [];
            $categoriesCreated = 0;
            $itemsCreated = 0;
            $itemsExisting = 0;
            $imageSummary = ['attached' => 0, 'cached' => 0, 'pending' => 0];

            $priority = 10;
            foreach ((array)$pack['categories'] as $name) {
                $name = trim((string)$name);
                if ($name === '') continue;

                $category = Categories_model::query()
                    ->whereRaw('LOWER(name) = ?', [mb_strtolower($name)])
                    ->first();

                if (!$category) {
                    $category = $this->createCategory($name, $locationId, $priority);
                    $categoriesCreated++;
                } else {
                    $category->locations()->syncWithoutDetaching([$locationId]);
                }

                $categoryIds[$name] = (int)$category->category_id;
                $priority += 10;
            }

            $itemPriority = max(10, ((int)Menus_model::query()->max('menu_priority')) + 10);
            foreach ((array)$pack['items'] as $item) {
                if (!is_array($item)) continue;
                $name = trim((string)($item['name'] ?? ''));
                $categoryName = trim((string)($item['category'] ?? ''));
                $categoryId = $categoryIds[$categoryName] ?? null;
                if ($name === '' || !$categoryId) continue;

                $existing = Menus_model::query()
                    ->whereRaw('LOWER(menu_name) = ?', [mb_strtolower($name)])
                    ->first();

                if ($existing) {
                    $itemsExisting++;
                    continue;
                }

                $this->createStarterItem($item, $categoryId, $locationId, $allergens, $itemPriority);
                $itemsCreated++;
                $imageSummary['pending']++;
                $itemPriority += 10;
            }

            return [
                'categories_created' => $categoriesCreated,
                'items_created' => $itemsCreated,
                'items_existing' => $itemsExisting,
                'images' => $imageSummary,
            ];
        });

        setting()->set([
            'pmd_starter_menu_library_version' => self::STARTER_LIBRARY_VERSION,
            'pmd_starter_menu_completed_at' => now()->toIso8601String(),
        ]);
        setting()->save();

        return [
            'ok' => true,
            'restaurant_type' => $type,
            'library_version' => self::STARTER_LIBRARY_VERSION,
            'summary' => $summary,
            'photos_pending' => (int)($summary['images']['pending'] ?? 0),
            'message' => sprintf(
                'Starter menu completed: %d new foods and %d new categories added. Existing foods were not changed.',
                (int)$summary['items_created'],
                (int)$summary['categories_created']
            ),
        ];
    }

    /**
     * Compatibility entry point. It is intentionally bounded to one item so a
     * stale client can never turn photo refresh back into a 50-item request.
     */
    public function refreshStarterMenuImages(): array
    {
        return $this->refreshStarterMenuImagesChunk(0, 1);
    }

    public function refreshStarterMenuImagesChunk(int $cursor = 0, int $limit = 1): array
    {
        $type = strtolower(trim((string)setting('pmd_onboarding_restaurant_type', '')));
        $starterMenu = (bool)setting('pmd_onboarding_starter_menu', false);

        if ($type === '' || !$starterMenu) {
            throw new \RuntimeException('This restaurant does not have a Quick Setup starter menu to refresh.');
        }

        if (!isset($this->restaurantTypes()[$type])) {
            throw new \RuntimeException('The saved restaurant type is not available.');
        }

        $images = app(PmdStarterMenuImageServiceV2::class);
        if (!$images->isConfigured()) {
            throw new \RuntimeException('Premium starter photos are not configured yet. Add PMD_PEXELS_API_KEY on the server first.');
        }

        $pack = app(PmdStarterMenuLibraryV3::class)->pack($type);
        $items = array_values(array_filter((array)($pack['items'] ?? []), 'is_array'));
        $total = count($items);
        $cursor = max(0, min($cursor, $total));

        // One item per request is deliberate. Even a slow external image call
        // stays isolated from the setup request and from every other photo.
        $limit = max(1, min($limit, 1));
        $slice = array_slice($items, $cursor, $limit);
        $summary = [
            'updated' => 0,
            'cached' => 0,
            'kept_old' => 0,
            'skipped_custom' => 0,
            'menu_missing' => 0,
        ];

        $processed = 0;
        foreach ($slice as $item) {
            $processed++;
            $menu = Menus_model::query()
                ->whereRaw('LOWER(menu_name) = ?', [mb_strtolower((string)($item['name'] ?? ''))])
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

        $nextCursor = min($total, $cursor + $processed);
        $done = $nextCursor >= $total;

        return [
            'ok' => true,
            'provider' => 'pexels',
            'style' => 'pmd-studio-semantic-v5',
            'restaurant_type' => $type,
            'library_version' => self::STARTER_LIBRARY_VERSION,
            'cursor' => $cursor,
            'next_cursor' => $nextCursor,
            'processed' => $processed,
            'total' => $total,
            'done' => $done,
            'summary' => $summary,
            'message' => $done
                ? 'Starter photo preparation finished.'
                : sprintf('Preparing starter photos: %d/%d', $nextCursor, $total),
        ];
    }

    protected function createCategory(string $name, int $locationId, int $priority): Categories_model
    {
        $category = new Categories_model();
        $category->fill($this->filterColumns('categories', [
            'name' => $name,
            'description' => 'Starter category — review and edit for your restaurant.',
            'parent_id' => null,
            'priority' => $priority,
            'status' => 1,
            'frontend_visible' => 1,
            'pmd_kind' => 'regular',
        ]));
        $category->save();
        $category->locations()->syncWithoutDetaching([$locationId]);
        return $category;
    }

    protected function createStarterItem(
        array $item,
        int $categoryId,
        int $locationId,
        array $allergenMap,
        int $priority
    ): Menus_model {
        $nutrition = (array)($item['nutrition'] ?? []);
        $menu = new Menus_model();
        $menu->fill($this->filterColumns('menus', [
            'menu_name' => (string)($item['name'] ?? ''),
            'menu_description' => (string)($item['description'] ?? ''),
            'menu_price' => (float)($item['price'] ?? 0),
            'menu_category_id' => $categoryId,
            'menu_status' => 1,
            'menu_priority' => $priority,
            'minimum_qty' => 1,
            'prep_time_minutes' => (int)($item['prep'] ?? 15),
            'is_stock_out' => 0,
            'is_halal' => !empty($item['halal']),
            'is_vegetarian' => !empty($item['vegetarian']),
            'is_vegan' => !empty($item['vegan']),
            'calories' => (int)($nutrition['calories'] ?? 0),
            'protein' => (float)($nutrition['protein'] ?? 0),
            'carbs' => (float)($nutrition['carbs'] ?? 0),
            'fat' => (float)($nutrition['fat'] ?? 0),
            'sugar' => (float)($nutrition['sugar'] ?? 0),
            'serving_size' => '1 serving',
            'is_chef_recommended' => !empty($item['chef']),
            'is_manual_bestseller' => !empty($item['bestseller']),
            'bestseller_override_mode' => !empty($item['bestseller']) ? 'force_on' : 'auto',
        ]));
        $menu->save();
        $menu->locations()->syncWithoutDetaching([$locationId]);
        $menu->addMenuCategories([$categoryId]);

        $allergenIds = [];
        foreach ((array)($item['allergens'] ?? []) as $name) {
            if (isset($allergenMap[$name])) $allergenIds[] = $allergenMap[$name];
        }
        if ($allergenIds) $menu->allergens()->sync(array_values(array_unique($allergenIds)));

        return $menu;
    }
}
