<?php

namespace Admin\Services;

use Admin\Models\Allergens_model;
use Admin\Models\Categories_model;
use Admin\Models\Menus_model;
use Illuminate\Support\Facades\DB;

/**
 * PMD_TENANT_QUICK_SETUP_V2
 *
 * Keeps the original floor/staff/KDS onboarding authority and owns the
 * additive starter-menu upgrade path. The active catalogue is V3 (50+ items
 * per restaurant type) and the stable image service alias resolves V5.
 *
 * Upgrade rules:
 * - never deletes categories or foods
 * - never rewrites an existing food
 * - never removes restaurant-uploaded images
 * - only adds missing starter categories/items by exact starter name
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

        $itemPriority = 10;
        $created = 0;

        foreach ((array)$pack['items'] as $item) {
            if (!is_array($item)) continue;
            $categoryId = $categories[(string)($item['category'] ?? '')] ?? null;
            if (!$categoryId) continue;

            $menu = $this->createStarterItem($item, $categoryId, $locationId, $allergenMap, $itemPriority);
            $created++;
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
            // PMD_QUICK_SETUP_TIMEOUT_R1_20260905
            // External photo I/O must never hold the onboarding transaction open.
            // The browser starts resumable one-item photo batches after this
            // response has safely committed the restaurant structure and menu.
            'images' => [
                'attached' => 0,
                'cached' => 0,
                'missing' => 0,
                'deferred' => $created,
            ],
            'photos_deferred' => $created > 0,
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

                $menu = $this->createStarterItem($item, $categoryId, $locationId, $allergens, $itemPriority);
                $itemsCreated++;
                $itemPriority += 10;
            }

            return [
                'categories_created' => $categoriesCreated,
                'items_created' => $itemsCreated,
                'items_existing' => $itemsExisting,
                'photo_items_pending' => count((array)$pack['items']),
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
            'photos_deferred' => true,
            'message' => sprintf(
                'Starter menu completed: %d new foods and %d new categories added. Existing foods were not changed. Photos will load in small batches.',
                (int)$summary['items_created'],
                (int)$summary['categories_created']
            ),
        ];
    }

    /**
     * Refresh at most one starter image per HTTP request.
     *
     * Pexels search, image download and GD rendering are external/CPU work. A
     * full 50+ item pass inside one request exceeded the nginx/FPM time budget
     * and, during initial setup, kept the tenant transaction open. The cursor
     * response makes this operation resumable without schema or queue changes.
     */
    public function refreshStarterMenuImages(int $cursor = 0, int $limit = 1): array
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
        $items = array_values(array_filter(
            (array)$pack['items'],
            static fn($item) => is_array($item)
        ));
        $total = count($items);
        $cursor = max(0, min($cursor, $total));

        // One photo per request is deliberate. A single item can require more
        // than one provider query/candidate before the quality gate accepts it.
        $limit = 1;
        $batch = array_slice($items, $cursor, $limit);
        $summary = [
            'updated' => 0,
            'cached' => 0,
            'kept_old' => 0,
            'skipped_custom' => 0,
            'menu_missing' => 0,
        ];
        $processedItems = [];

        foreach ($batch as $item) {
            $name = trim((string)($item['name'] ?? ''));
            $menu = Menus_model::query()
                ->whereRaw('LOWER(menu_name) = ?', [mb_strtolower($name)])
                ->first();

            if (!$menu) {
                $summary['menu_missing']++;
                $processedItems[] = ['name' => $name, 'status' => 'menu_missing'];
                continue;
            }

            $result = $images->refreshMenu($menu, $item, $type);
            if (!empty($result['attached'])) {
                $summary['updated']++;
                if (!empty($result['cached'])) $summary['cached']++;
                $status = !empty($result['cached']) ? 'cached' : 'updated';
            } elseif (!empty($result['skipped_custom'])) {
                $summary['skipped_custom']++;
                $status = 'custom_preserved';
            } else {
                $summary['kept_old']++;
                $status = 'no_match';
            }

            $processedItems[] = ['name' => $name, 'status' => $status];
        }

        $nextCursor = min($total, $cursor + count($batch));
        $done = $nextCursor >= $total;

        return [
            'ok' => true,
            'provider' => 'pexels',
            'style' => 'pmd-studio-semantic-v5',
            'restaurant_type' => $type,
            'library_version' => self::STARTER_LIBRARY_VERSION,
            'cursor' => $cursor,
            'next_cursor' => $nextCursor,
            'total' => $total,
            'processed' => count($batch),
            'done' => $done,
            'summary' => $summary,
            'items' => $processedItems,
            'message' => $done
                ? sprintf('Starter photo pass finished: %d of %d items checked.', $nextCursor, $total)
                : sprintf('Starter photos: %d of %d items checked.', $nextCursor, $total),
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

    protected function attachStarterImage(
        PmdStarterMenuImageServiceV2 $images,
        Menus_model $menu,
        array $item,
        string $type,
        array &$summary,
        bool $replace
    ): void {
        try {
            $result = $replace
                ? $images->refreshMenu($menu, $item, $type)
                : $images->attachToMenu($menu, $item, $type);

            if (!empty($result['attached'])) $summary['attached']++;
            if (!empty($result['cached'])) $summary['cached']++;
            if (!empty($result['missing'])) $summary['missing']++;
        } catch (\Throwable $ignored) {
            $summary['missing']++;
        }
    }
}
