<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminAuth;
use Admin\Facades\AdminMenu;
use Admin\Facades\Template;
use Admin\Models\Allergens_model;
use Admin\Models\Categories_model;
use Admin\Models\Menu_combos_model;
use Admin\Models\Menus_model;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * PMD Menu Manager V1.2.9
 *
 * Server-rendered Menu workspace. Menus.php remains the food write authority
 * and Combos.php remains the combo write authority. This controller owns only
 * catalogue/presentation data and first-paint state.
 */
class Pmdmenus extends AdminController
{
    protected $requiredPermissions = 'Admin.Menus';

    public function __construct()
    {
        parent::__construct();

        $this->bodyClass = trim(($this->bodyClass ?? '').' pmd-settings-suite pmd-owner-settings-page pmd-menu-manager-page pmd-menu-manager-v12 pmd-menu-manager-v129');
        $this->addCss('css/pmd-owner-settings-v1.css');
        $this->addCss('css/pmd-settings-suite-first-paint-v1.css');
        $this->addCss('css/pmd-menu-manager-v129.css');
        $this->addCss('css/pmd-menu-smart-categories-v1.css');
        $this->addJs('js/pmd-menu-manager-v129.js');
        $this->addJs('js/pmd-menu-smart-categories-v1.js');

        AdminMenu::setContext('menus', 'restaurant');
    }

    public function index()
    {
        Template::setTitle('Menu');
        Template::setHeading('Menu');

        $menus = Menus_model::with(['categories', 'allergens', 'menu_images', 'media'])
            ->orderByRaw('COALESCE(menu_priority, 999999) ASC')
            ->orderBy('menu_name', 'asc')
            ->get();

        $categories = Categories_model::query();
        if (Schema::hasColumn('categories', 'status')) {
            $categories->where('status', 1);
        }
        $categories = $categories
            ->orderByRaw('COALESCE(priority, 999999) ASC')
            ->orderBy('name', 'asc')
            ->get(['category_id', 'name']);

        $allergens = collect();
        if (Schema::hasTable('allergens')) {
            $allergensQuery = Allergens_model::query();
            if (Schema::hasColumn('allergens', 'status')) {
                $allergensQuery->where('status', 1);
            }
            $allergens = $allergensQuery
                ->orderBy('name', 'asc')
                ->get(['allergen_id', 'name']);
        }

        // PMD_FOOD_IMAGE_NO_LEGACY_AUTOMATCH_R3
        // New Foods never inherit/guess images from shared legacy bytes.
        $legacyImageIndex = [];
        $cards = [];
        $catalog = [];

        foreach ($menus as $menu) {
            $menuCategories = $menu->categories
                ->sortBy(static fn($category) => (int)($category->priority ?? 999999))
                ->values();
            $categoryIds = $menuCategories->pluck('category_id')->map(static fn($id) => (int)$id)->values()->all();
            $categoryNames = $menuCategories->pluck('name')->map(static fn($name) => (string)$name)->values()->all();
            $menuAllergens = $menu->allergens->sortBy('name')->values();
            $allergenIds = $menuAllergens->pluck('allergen_id')->map(static fn($id) => (int)$id)->values()->all();
            $allergenNames = $menuAllergens->pluck('name')->map(static fn($name) => (string)$name)->values()->all();
            $image = $this->menuImageUrl($menu, $legacyImageIndex);

            $card = [
                'id' => (int)$menu->menu_id,
                'name' => (string)$menu->menu_name,
                'description' => trim((string)$menu->menu_description),
                'price' => (float)$menu->menu_price,
                'category_id' => $categoryIds[0] ?? null,
                'category_name' => $categoryNames[0] ?? 'Uncategorized',
                'category_ids' => $categoryIds,
                'category_names' => $categoryNames,
                'image' => $image,
                'menu_status' => (bool)$menu->menu_status,
                'is_stock_out' => !empty($menu->is_stock_out),
                'is_halal' => !empty($menu->is_halal),
                'is_vegetarian' => !empty($menu->is_vegetarian),
                'is_vegan' => !empty($menu->is_vegan),
                'allergen_ids' => $allergenIds,
                'allergen_names' => $allergenNames,
                'calories' => $menu->calories !== null ? (int)$menu->calories : null,
                'serving_size' => $menu->serving_size !== null ? trim((string)$menu->serving_size) : '',
                'protein' => $menu->protein !== null ? (float)$menu->protein : null,
                'carbs' => $menu->carbs !== null ? (float)$menu->carbs : null,
                'fat' => $menu->fat !== null ? (float)$menu->fat : null,
                'sugar' => $menu->sugar !== null ? (float)$menu->sugar : null,
                'prep_time_minutes' => $menu->prep_time_minutes !== null ? (int)$menu->prep_time_minutes : 15,
            ];

            $cards[] = $card;
            $catalog[(string)$menu->menu_id] = $card;
        }

        // PMD_MENU_ALL_FOODS_CATEGORY_ORDER_V1_6
        //
        // All Foods is a view, not a second ordering authority.
        // Category priority owns the outer grouping; existing menu_priority
        // owns each category's internal food order. A multi-category food is
        // rendered once under the first category in current category priority.
        // Uncategorized foods remain at the end.
        $pmdOrderedCardsV16 = [];
        $pmdSeenMenuIdsV16 = [];

        foreach ($categories as $pmdCategoryV16) {
            $pmdCategoryIdV16 = (int)$pmdCategoryV16->category_id;

            foreach ($cards as $pmdCardV16) {
                $pmdMenuIdV16 = (int)($pmdCardV16['id'] ?? 0);

                if (
                    $pmdMenuIdV16 < 1
                    || isset($pmdSeenMenuIdsV16[$pmdMenuIdV16])
                    || !in_array(
                        $pmdCategoryIdV16,
                        array_map('intval', (array)($pmdCardV16['category_ids'] ?? [])),
                        true
                    )
                ) {
                    continue;
                }

                $pmdSeenMenuIdsV16[$pmdMenuIdV16] = true;
                $pmdOrderedCardsV16[] = $pmdCardV16;
            }
        }

        foreach ($cards as $pmdCardV16) {
            $pmdMenuIdV16 = (int)($pmdCardV16['id'] ?? 0);

            if (
                $pmdMenuIdV16 < 1
                || isset($pmdSeenMenuIdsV16[$pmdMenuIdV16])
            ) {
                continue;
            }

            $pmdSeenMenuIdsV16[$pmdMenuIdV16] = true;
            $pmdOrderedCardsV16[] = $pmdCardV16;
        }

        $cards = $pmdOrderedCardsV16;

        $user = AdminAuth::getUser();
        $canManageCategories = $user && $user->hasPermission('Admin.Categories');

        // PMD_MENU_CATEGORY_DELETE_OWNER_MANAGER_V130
        $pmdMenuManagerRole = '';

        try {
            if ($user) {
                if (!empty($user->is_super_user)) {
                    $pmdMenuManagerRole = 'owner';
                } elseif (!empty($user->staff_id)) {
                    $pmdMenuManagerRoleRow = DB::table('staffs as s')
                        ->leftJoin(
                            'staff_roles as r',
                            'r.staff_role_id',
                            '=',
                            's.staff_role_id'
                        )
                        ->where(
                            's.staff_id',
                            (int)$user->staff_id
                        )
                        ->select(
                            'r.code as role_code',
                            'r.name as role_name'
                        )
                        ->first();

                    $pmdMenuManagerRoleCode = strtolower(
                        trim(
                            (string)(
                                $pmdMenuManagerRoleRow->role_code
                                ?? ''
                            )
                        )
                    );

                    $pmdMenuManagerRoleName = strtolower(
                        trim(
                            (string)(
                                $pmdMenuManagerRoleRow->role_name
                                ?? ''
                            )
                        )
                    );

                    if (
                        $pmdMenuManagerRoleCode === 'owner'
                        || $pmdMenuManagerRoleName === 'owner'
                    ) {
                        $pmdMenuManagerRole = 'owner';
                    } elseif (
                        $pmdMenuManagerRoleCode === 'manager'
                        || $pmdMenuManagerRoleName === 'manager'
                    ) {
                        $pmdMenuManagerRole = 'manager';
                    }
                }
            }
        } catch (\Throwable $error) {
            $pmdMenuManagerRole = '';
        }

        $canDeleteCategories =
            $canManageCategories
            && in_array(
                $pmdMenuManagerRole,
                ['owner', 'manager'],
                true
            );

        // PMD_MENU_COMBO_OWNER_MANAGER_BRIDGE_V1
        // Existing Owner/Manager Menu access must not be blocked by a stale
        // Admin.Combos role bit. Other roles still require Admin.Combos.
        $canManageCombos = (bool)(
            $user
            && Schema::hasTable('menu_combos')
            && Schema::hasTable('menu_combo_items')
            && (
                !empty($user->is_super_user)
                || $user->hasPermission('Admin.Combos')
                || (
                    $user->hasPermission('Admin.Menus')
                    && in_array(
                        $pmdMenuManagerRole,
                        ['owner', 'manager'],
                        true
                    )
                )
            )
        );

        $comboCards = [];
        $comboCatalog = [];

        if ($canManageCombos) {
            $combos = Menu_combos_model::with(['combo_items.menu'])
                ->orderByRaw('COALESCE(combo_priority, 999999) ASC')
                ->orderBy('combo_name', 'asc')
                ->get();

            foreach ($combos as $combo) {
                $items = $combo->combo_items
                    ->filter(static fn($item) => $item->menu)
                    ->map(static function ($item) use ($catalog) {
                        $menuId = (int)$item->menu_id;
                        $food = $catalog[(string)$menuId] ?? [];
                        return [
                            'menu_id' => $menuId,
                            'name' => (string)$item->menu->menu_name,
                            'quantity' => max(1, (int)$item->quantity),
                            'image' => (string)($food['image'] ?? ''),
                        ];
                    })
                    ->values()
                    ->all();

                $profile = $this->comboDerivedProfile($items, $catalog);
                $comboImage = '';
                if (Schema::hasTable('media_attachments')) {
                    $comboImageName = DB::table('media_attachments')
                        ->where('attachment_type', 'menu_combos')
                        ->where('attachment_id', (int)$combo->combo_id)
                        ->where('tag', 'thumb')
                        ->orderByRaw('COALESCE(priority, 999999) ASC')
                        ->orderBy('id', 'asc')
                        ->value('name');
                    if ($comboImageName) {
                        $comboImage = '/api/media/'.ltrim((string)$comboImageName, '/');
                    }
                }
                if ($comboImage !== '') {
                    $profile['images'] = array_values(array_unique(array_merge([$comboImage], (array)($profile['images'] ?? []))));
                    $profile['images'] = array_slice($profile['images'], 0, 4);
                }
                $card = [
                    'id' => (int)$combo->combo_id,
                    'image' => $comboImage,
                    'name' => (string)$combo->combo_name,
                    'description' => $this->comboEditableDescription((string)$combo->combo_description),
                    'price' => (float)$combo->combo_price,
                    'combo_status' => (bool)$combo->combo_status,
                    'items' => $items,
                    'item_count' => array_sum(array_map(static fn($item) => (int)$item['quantity'], $items)),
                ] + $profile;

                $comboCards[] = $card;
                $comboCatalog[(string)$combo->combo_id] = $card;
            }
        }

        $hasCombos = count($comboCards) > 0;
        $publishedFoods = count(array_filter($cards, static fn($item) => $item['menu_status']));
        $publishedCombos = count(array_filter($comboCards, static fn($item) => $item['combo_status']));

        $this->vars['pmdMenuManagerCards'] = $cards;
        $this->vars['pmdMenuManagerCatalog'] = $catalog;
        $this->vars['pmdMenuManagerCategories'] = $categories;
        $this->vars['pmdMenuManagerAllergens'] = $allergens;
        $this->vars['pmdMenuManagerCombos'] = $comboCards;
        $this->vars['pmdMenuManagerComboCatalog'] = $comboCatalog;
        $this->vars['pmdMenuManagerCanManageCategories'] = (bool)$canManageCategories;
        $this->vars['pmdMenuManagerCanDeleteCategories'] = (bool)$canDeleteCategories;
        $this->vars['pmdMenuManagerCanManageCombos'] = (bool)$canManageCombos;
        $this->vars['pmdMenuManagerHasCombos'] = $hasCombos;
        $this->vars['pmdMenuManagerStats'] = [
            'total' => count($cards) + count($comboCards),
            'published' => $publishedFoods + $publishedCombos,
            'stock_out' => count(array_filter($cards, static fn($item) => $item['is_stock_out'])),
            'foods' => count($cards),
            'combos' => count($comboCards),
        ];

        return $this->makeView('pmdmenus/index');
    }

    protected function comboDerivedProfile(array $items, array $catalog): array
    {
        $images = [];
        $allergenNames = [];
        $allergenIds = [];
        $hasFood = false;
        $allHalal = true;
        $allVegetarian = true;
        $allVegan = true;
        $nutritionFields = ['calories', 'protein', 'carbs', 'fat', 'sugar'];
        $nutritionTotals = array_fill_keys($nutritionFields, 0.0);
        $nutritionComplete = array_fill_keys($nutritionFields, true);
        $prepTime = 0;

        foreach ($items as $entry) {
            $food = $catalog[(string)($entry['menu_id'] ?? 0)] ?? null;
            if (!$food) continue;
            $hasFood = true;
            $quantity = max(1, (int)($entry['quantity'] ?? 1));

            $image = trim((string)($food['image'] ?? ''));
            if ($image !== '' && !in_array($image, $images, true)) $images[] = $image;

            $allHalal = $allHalal && !empty($food['is_halal']);
            $allVegetarian = $allVegetarian && (!empty($food['is_vegetarian']) || !empty($food['is_vegan']));
            $allVegan = $allVegan && !empty($food['is_vegan']);

            foreach ((array)($food['allergen_names'] ?? []) as $name) {
                $name = trim((string)$name);
                if ($name !== '') $allergenNames[$name] = $name;
            }
            foreach ((array)($food['allergen_ids'] ?? []) as $id) {
                $id = (int)$id;
                if ($id > 0) $allergenIds[$id] = $id;
            }

            foreach ($nutritionFields as $field) {
                $value = $food[$field] ?? null;
                if ($value === null || $value === '' || !is_numeric($value)) {
                    $nutritionComplete[$field] = false;
                    continue;
                }
                $nutritionTotals[$field] += ((float)$value) * $quantity;
            }

            $prep = $food['prep_time_minutes'] ?? null;
            if ($prep !== null && $prep !== '' && is_numeric($prep)) {
                $prepTime = max($prepTime, (int)$prep);
            }
        }

        ksort($allergenNames, SORT_NATURAL | SORT_FLAG_CASE);
        sort($allergenIds);
        $nutrition = [];
        foreach ($nutritionFields as $field) {
            $nutrition[$field] = $hasFood && $nutritionComplete[$field]
                ? round($nutritionTotals[$field], $field === 'calories' ? 0 : 1)
                : null;
        }

        return [
            'image' => $images[0] ?? '',
            'images' => array_slice($images, 0, 4),
            'is_halal' => $hasFood && $allHalal,
            'is_vegetarian' => $hasFood && $allVegetarian,
            'is_vegan' => $hasFood && $allVegan,
            'allergen_ids' => array_values($allergenIds),
            'allergen_names' => array_values($allergenNames),
            'calories' => $nutrition['calories'],
            'protein' => $nutrition['protein'],
            'carbs' => $nutrition['carbs'],
            'fat' => $nutrition['fat'],
            'sugar' => $nutrition['sugar'],
            'prep_time_minutes' => $prepTime > 0 ? $prepTime : null,
        ];
    }

    protected function comboEditableDescription(string $description): string
    {
        $description = preg_replace('/\n*Includes:.*$/ms', '', $description);
        return trim((string)$description);
    }

    protected function menuImageUrl($menu, array $legacyImageIndex): string
    {
        try {
            $firstGallery = $menu->menu_images->sortBy('sort_order')->first();
            if ($firstGallery && trim((string)$firstGallery->image_path) !== '') {
                return $this->normalizeImageUrl((string)$firstGallery->image_path);
            }
        } catch (\Throwable $e) {
        }

        try {
            if (method_exists($menu, 'getThumb')) {
                $thumb = $menu->getThumb();
                if (is_string($thumb) && trim($thumb) !== '' && !str_contains($thumb, 'default-image.png')) {
                    return $this->normalizeImageUrl($thumb);
                }
            }
        } catch (\Throwable $e) {
        }

        try {
            foreach (($menu->media ?? []) as $media) {
                foreach (['getPath', 'getUrl'] as $method) {
                    if (method_exists($media, $method)) {
                        $value = $media->{$method}();
                        if (is_string($value) && trim($value) !== '') {
                            return $this->normalizeImageUrl($value);
                        }
                    }
                }
            }
        } catch (\Throwable $e) {
        }

        $slug = $this->menuNameSlug((string)$menu->menu_name);
        if ($slug !== '' && isset($legacyImageIndex[$slug])) {
            return $legacyImageIndex[$slug];
        }

        if ($slug !== '') {
            $tokens = array_values(array_filter(explode('-', $slug)));
            $best = null;
            $bestScore = 0;
            foreach ($legacyImageIndex as $candidateSlug => $url) {
                $candidateTokens = array_values(array_filter(explode('-', $candidateSlug)));
                $score = count(array_intersect($tokens, $candidateTokens)) * 20;
                if (str_contains($slug, $candidateSlug) || str_contains($candidateSlug, $slug)) $score += 60;
                if ($score > $bestScore) {
                    $bestScore = $score;
                    $best = $url;
                }
            }
            if ($best && $bestScore >= 20) return $best;
        }

        return ''; // PMD V1.2.1: local placeholder, no broken default-image request
    }

    protected function normalizeImageUrl(string $value): string
    {
        $value = trim(str_replace('\\', '/', $value));
        if ($value === '') return ''; // PMD V1.2.1: local placeholder, no broken default-image request
        if (preg_match('#^https?://#i', $value)) {
            $path = parse_url($value, PHP_URL_PATH);
            return $path ? url($path) : $value;
        }

        $value = ltrim($value, '/');
        if (str_starts_with($value, 'api/media/')) return url('/'.$value);
        if (str_starts_with($value, 'assets/media/')) return url('/'.$value);
        if (str_starts_with($value, 'attachments/public/')) return url('/assets/media/'.$value);
        if (str_starts_with($value, 'uploads/')) return url('/assets/media/'.$value);

        $uploadPath = base_path('assets/media/uploads/'.basename($value));
        if (is_file($uploadPath)) return url('/assets/media/uploads/'.basename($value));

        return url('/api/media/'.basename($value));
    }

    protected function menuNameSlug(string $value): string
    {
        $value = strtolower($value);
        $value = preg_replace('/[^a-z0-9]+/i', '-', $value);
        return trim((string)$value, '-');
    }

    protected function legacyPmdNewImageIndex(): array
    {
        $index = [];
        $root = base_path('assets/media/attachments/public');
        if (!is_dir($root)) return $index;

        try {
            $iterator = new \RecursiveIteratorIterator(
                new \RecursiveDirectoryIterator($root, \FilesystemIterator::SKIP_DOTS)
            );
            foreach ($iterator as $file) {
                if (!$file->isFile()) continue;
                $name = $file->getFilename();
                if (!preg_match('/^pmdnew_.*?\.(png|jpe?g|webp)$/i', $name)) continue;
                $stem = preg_replace('/\.(png|jpe?g|webp)$/i', '', $name);
                $stem = preg_replace('/^pmdnew_\d{8}_\d{6}_\d+_/i', '', $stem);
                $slug = $this->menuNameSlug((string)$stem);
                if ($slug === '') continue;
                $relative = ltrim(str_replace(str_replace('\\', '/', base_path()), '', str_replace('\\', '/', $file->getPathname())), '/');
                $index[$slug] = url('/'.$relative);
            }
        } catch (\Throwable $e) {
            return [];
        }

        return $index;
    }
}
