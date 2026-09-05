<?php

namespace Admin\Services;

use Admin\Models\Allergens_model;
use Admin\Models\Categories_model;
use Admin\Models\Menus_model;
use Illuminate\Support\Facades\DB;

/**
 * PMD_TENANT_QUICK_SETUP_V2
 *
 * Extends the original onboarding authority without changing its floor/staff/
 * KDS behaviour. V2 owns only the starter-menu catalogue and an explicit,
 * additive "complete starter menu" upgrade for restaurants that already used
 * Quick Setup.
 *
 * Upgrade rules:
 * - never deletes categories or foods
 * - never rewrites an existing food
 * - never removes restaurant-uploaded images
 * - only adds missing V2 starter categories/items by exact starter name
 */
class PmdTenantQuickSetupServiceV2 extends PmdTenantQuickSetupService
{
    public const STARTER_LIBRARY_VERSION = PmdStarterMenuLibraryV2::VERSION;

    public function restaurantTypes(): array
    {
        return app(PmdStarterMenuLibraryV2::class)->restaurantTypes();
    }

    protected function seedStarterMenu(string $type, int $locationId, array $allergenMap): array
    {
        if ($this->safeCount('menus') > 0 || $this->safeCount('categories') > 0) {
            throw new \RuntimeException('Starter Menu cannot be installed after Menu content exists.');
        }

        $pack = app(PmdStarterMenuLibraryV2::class)->pack($type);
        $categories = [];
        $priority = 10;

        foreach ((array)$pack['categories'] as $name) {
            $category = $this->createCategory((string)$name, $locationId, $priority);
            $categories[(string)$name] = (int)$category->category_id;
            $priority += 10;
        }

        $images = app(PmdStarterMenuImageServiceV2::class);
        $imageSummary = ['attached' => 0, 'cached' => 0, 'missing' => 0];
        $itemPriority = 10;
        $created = 0;

        foreach ((array)$pack['items'] as $item) {
            if (!is_array($item)) continue;
            $categoryId = $categories[(string)($item['category'] ?? '')] ?? null;
            if (!$categoryId) continue;

            $menu = $this->createStarterItem($item, $categoryId, $locationId, $allergenMap, $itemPriority);
            $created++;
            $this->attachStarterImage($images, $menu, $item, $type, $imageSummary, false);
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

        $pack = app(PmdStarterMenuLibraryV2::class)->pack($type);
        $allergens = $this->ensureReferenceAllergens();
        $images = app(PmdStarterMenuImageServiceV2::class);

        $summary = DB::transaction(function () use ($pack, $type, $locationId, $allergens, $images) {
            $categoryIds = [];
            $categoriesCreated = 0;
            $itemsCreated = 0;
            $itemsExisting = 0;
            $imageSummary = ['attached' => 0, 'cached' => 0, 'missing' => 0];

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
                $this->attachStarterImage($images, $menu, $item, $type, $imageSummary, false);
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
            'message' => sprintf(
                'Starter menu completed: %d new foods and %d new categories added. Existing foods were not changed.',
                (int)$summary['items_created'],
                (int)$summary['categories_created']
            ),
        ];
    }

    public function refreshStarterMenuImages(): array
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

        $pack = app(PmdStarterMenuLibraryV2::class)->pack($type);
        $summary = [
            'updated' => 0,
            'cached' => 0,
            'kept_old' => 0,
            'skipped_custom' => 0,
            'menu_missing' => 0,
        ];

        foreach ((array)$pack['items'] as $item) {
            if (!is_array($item)) continue;
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

        return [
            'ok' => true,
            'provider' => 'pexels',
            'style' => 'pmd-studio-semantic-v4',
            'restaurant_type' => $type,
            'library_version' => self::STARTER_LIBRARY_VERSION,
            'summary' => $summary,
            'message' => sprintf(
                'Starter photos refreshed: %d updated, %d custom photos preserved, %d old starter photos kept.',
                $summary['updated'],
                $summary['skipped_custom'],
                $summary['kept_old']
            ),
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
