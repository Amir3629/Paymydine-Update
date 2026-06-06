<?php


if (!function_exists('pmd_table_order_item_subtotal')) {
    function pmd_table_order_item_subtotal(array $items): float
    {
        return round(array_sum(array_map(function ($item) {
            if (is_object($item)) $item = (array)$item;
            return (float)($item['subtotal'] ?? (((float)($item['price'] ?? 0)) * ((float)($item['quantity'] ?? 0))));
        }, $items)), 4);
    }
}

if (!function_exists('pmd_table_order_tax_settings')) {
    function pmd_table_order_tax_settings(): array
    {
        $settings = [
            'tax_mode' => (string)setting('tax_mode', setting('tax_enabled', '0')),
            'tax_percentage' => (string)setting('tax_percentage', '0'),
            'tax_menu_price' => (string)setting('tax_menu_price', '1'),
        ];

        try {
            if (\Illuminate\Support\Facades\Schema::hasTable('settings')) {
                $hasSerializedColumn = \Illuminate\Support\Facades\Schema::hasColumn('settings', 'serialized');
                $columns = $hasSerializedColumn ? ['item', 'value', 'serialized'] : ['item', 'value'];
                $rows = \Illuminate\Support\Facades\DB::table('settings')
                    ->whereIn('item', ['tax_mode', 'tax_enabled', 'tax_percentage', 'tax_menu_price'])
                    ->get($columns);

                $values = [];
                foreach ($rows as $row) {
                    $value = $row->value;
                    if ($hasSerializedColumn && (int)($row->serialized ?? 0) === 1 && is_string($value)) {
                        $decoded = @unserialize($value);
                        if ($decoded !== false || $value === 'b:0;') {
                            $value = $decoded;
                        }
                    }
                    if (is_bool($value)) {
                        $value = $value ? '1' : '0';
                    }
                    $values[(string)$row->item] = $value;
                }

                $settings['tax_mode'] = (string)($values['tax_mode'] ?? $values['tax_enabled'] ?? $settings['tax_mode']);
                $settings['tax_percentage'] = (string)($values['tax_percentage'] ?? $settings['tax_percentage']);
                $settings['tax_menu_price'] = (string)($values['tax_menu_price'] ?? $settings['tax_menu_price']);
            }
        } catch (\Throwable $ignored) {}

        return [
            'enabled' => $settings['tax_mode'] === '1',
            'percentage' => max(0.0, round((float)$settings['tax_percentage'], 4)),
            'menu_price' => $settings['tax_menu_price'], // 0=included, 1=add at checkout
        ];
    }
}

if (!function_exists('pmd_table_order_calculate_totals')) {
    function pmd_table_order_calculate_totals(array $items): array
    {
        $subtotal = pmd_table_order_item_subtotal($items);
        $tax = pmd_table_order_tax_settings();
        $taxAmount = 0.0;
        $total = $subtotal;
        $taxTitle = null;
        $taxSummable = 0;

        if (($tax['enabled'] ?? false) && (float)($tax['percentage'] ?? 0) > 0) {
            $rate = (float)$tax['percentage'];
            if ((string)($tax['menu_price'] ?? '1') === '1') {
                $taxAmount = round($subtotal * ($rate / 100), 4);
                $total = round($subtotal + $taxAmount, 4);
                $taxTitle = 'VAT ('.$rate.'%)';
                $taxSummable = 1;
            } else {
                $taxAmount = round($subtotal - ($subtotal / (1 + ($rate / 100))), 4);
                $total = round($subtotal, 4);
                $taxTitle = 'VAT included ('.$rate.'%)';
                $taxSummable = 0;
            }
        }

        $rows = [
            ['code' => 'subtotal', 'title' => 'Subtotal', 'value' => round($subtotal, 4), 'priority' => 1, 'is_summable' => 1],
        ];
        if ($taxTitle !== null) {
            $rows[] = ['code' => 'tax', 'title' => $taxTitle, 'value' => round($taxAmount, 4), 'priority' => 2, 'is_summable' => $taxSummable];
        }
        $rows[] = ['code' => 'total', 'title' => 'Total', 'value' => round($total, 4), 'priority' => 99, 'is_summable' => 0];

        return ['subtotal' => round($subtotal, 4), 'tax' => round($taxAmount, 4), 'total' => round($total, 4), 'rows' => $rows];
    }
}

if (!function_exists('pmd_table_order_totals_from_order')) {
    function pmd_table_order_totals_from_order(int $orderId, array $items, float $fallbackOrderTotal): array
    {
        $fallbackSubtotal = pmd_table_order_item_subtotal($items);
        $rows = [];
        try {
            if (\Illuminate\Support\Facades\Schema::hasTable('order_totals')) {
                $rows = \Illuminate\Support\Facades\DB::table('order_totals')
                    ->where('order_id', $orderId)
                    ->orderBy('priority')
                    ->orderBy('order_total_id')
                    ->get(['code', 'title', 'value', 'priority', 'is_summable'])
                    ->map(fn($row) => [
                        'code' => (string)($row->code ?? ''),
                        'title' => (string)($row->title ?? ''),
                        'value' => round((float)($row->value ?? 0), 4),
                        'priority' => (int)($row->priority ?? 0),
                        'is_summable' => (int)($row->is_summable ?? 0),
                    ])->values()->all();
            }
        } catch (\Throwable $ignored) {}

        $byCode = [];
        foreach ($rows as $row) {
            $code = strtolower((string)($row['code'] ?? ''));
            if ($code !== '' && !isset($byCode[$code])) $byCode[$code] = $row;
        }

        $subtotal = isset($byCode['subtotal']) ? (float)$byCode['subtotal']['value'] : $fallbackSubtotal;
        $tax = array_sum(array_map(fn($row) => strtolower((string)($row['code'] ?? '')) === 'tax' ? (float)($row['value'] ?? 0) : 0, $rows));
        $total = isset($byCode['total']) ? (float)$byCode['total']['value'] : (float)$fallbackOrderTotal;
        if ($total <= 0) $total = $fallbackSubtotal;

        return ['subtotal' => round($subtotal, 4), 'tax' => round($tax, 4), 'total' => round($total, 4), 'rows' => $rows];
    }
}


// PMD_MENU_GALLERY_IMAGES_HELPERS_START
if (!function_exists('pmd_menu_gallery_image_url')) {
    function pmd_menu_gallery_image_url($path) {
        $path = trim((string)$path);

        if ($path === '') {
            return null;
        }

        if (preg_match('#^https?://#i', $path)) {
            return $path;
        }

        $path = ltrim($path, '/');

        if (strpos($path, 'api/media/') === 0) {
            return '/'.$path;
        }

        if (strpos($path, 'assets/media/') === 0) {
            return '/'.$path;
        }

        if (strpos($path, 'attachments/public/') === 0) {
            return '/assets/media/'.$path;
        }

        if (strpos($path, 'uploads/') === 0) {
            return '/assets/media/'.$path;
        }

        return '/assets/media/uploads/'.$path;
    }
}

if (!function_exists('pmd_menu_gallery_images_for_id')) {
    function pmd_menu_gallery_images_for_id($menuId) {
        static $galleryByMenuId = null;

        if ($galleryByMenuId === null) {
            $galleryByMenuId = [];

            try {
                if (!\Schema::hasTable('menu_images')) {
                    return [];
                }

                $rows = \DB::table('menu_images')
                    ->select('menu_id', 'image_path')
                    ->whereNotNull('image_path')
                    ->orderBy('menu_id')
                    ->orderBy('sort_order')
                    ->orderBy('id')
                    ->get();

                foreach ($rows as $row) {
                    $url = pmd_menu_gallery_image_url($row->image_path ?? '');

                    if (!$url) {
                        continue;
                    }

                    $id = (int)$row->menu_id;

                    if (!isset($galleryByMenuId[$id])) {
                        $galleryByMenuId[$id] = [];
                    }

                    if (!in_array($url, $galleryByMenuId[$id], true)) {
                        $galleryByMenuId[$id][] = $url;
                    }
                }
            } catch (\Throwable $e) {
                \Log::error('PMD /api/v1/menu gallery load failed', [
                    'error' => $e->getMessage(),
                ]);

                $galleryByMenuId = [];
            }
        }

        return $galleryByMenuId[(int)$menuId] ?? [];
    }
}
// PMD_MENU_GALLERY_IMAGES_HELPERS_END


require_once __DIR__.'/routes_sumup.php';

// Helper function to get menu item options
if (!function_exists('getMenuItemOptions')) {
    function getMenuItemOptions($menuId) {
    try {
        $p = DB::connection()->getTablePrefix();
        $optionsQuery = "
            SELECT
                mo.option_id as id,
                mo.option_name as name,
                mo.display_type,
                mio.required,
                mio.priority
            FROM {$p}menu_options mo
            INNER JOIN {$p}menu_item_options mio ON mo.option_id = mio.option_id
            WHERE mio.menu_id = ?
            ORDER BY mio.priority ASC, mo.option_name ASC
        ";

        $options = DB::select($optionsQuery, [$menuId]);

        // For each option, get its values
        foreach ($options as &$option) {
            $valuesQuery = "
                SELECT
                    mov.option_value_id as id,
                    mov.value,
                    COALESCE(miov.new_price, mov.price) as price,
                    miov.is_default
                FROM {$p}menu_option_values mov
                INNER JOIN {$p}menu_item_option_values miov ON mov.option_value_id = miov.option_value_id
                INNER JOIN {$p}menu_item_options mio ON miov.menu_option_id = mio.menu_option_id
                WHERE mio.menu_id = ? AND mio.option_id = ?
                ORDER BY miov.priority ASC, mov.value ASC
            ";

            $values = DB::select($valuesQuery, [$menuId, $option->id]);

            // Convert prices to float
            foreach ($values as &$value) {
                $value->price = (float)$value->price;
            }

            $option->values = $values;
        }

        return $options;

    } catch (\Exception $e) {
                \Log::error('PMD_ORDER_DEBUG exception', [
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'payload_all' => request()->all(),
                    'raw' => request()->getContent(),
                ]);
        // Return empty array if there's an error fetching options
        return [];
    }
    }
}

if (!function_exists('normalizeMenuFoodAttributes')) {
    function normalizeMenuFoodAttributes(&$item): void
    {
        $allergyTags = [];

        if (isset($item->allergy_names) && strlen((string)$item->allergy_names) > 0) {
            $allergyTags = array_values(array_filter(explode('||', (string)$item->allergy_names)));
            unset($item->allergy_names);
        } elseif (isset($item->allergens) && is_array($item->allergens)) {
            $allergyTags = $item->allergens;
        }

        $item->halal = (bool)($item->halal ?? $item->is_halal ?? 0);
        $item->vegetarian = (bool)($item->vegetarian ?? $item->is_vegetarian ?? 0);
        $item->vegan = (bool)($item->vegan ?? $item->is_vegan ?? 0);
        $item->allergens = $allergyTags;
        $item->allergy_tags = $allergyTags;
    }
}



if (!function_exists('pmdMenuColumnSelect')) {
    function pmdMenuColumnSelect($connection, string $tableAlias, string $column): string
    {
        try {
            if ($connection->getSchemaBuilder()->hasColumn('menus', $column)) {
                return $tableAlias.'.'.$column.' as '.$column;
            }
        } catch (\Throwable $e) {
            // Fall through to a null alias to keep pre-migration tenants working.
        }

        return 'NULL as '.$column;
    }
}

if (!function_exists('normalizeMenuNutrition')) {
    function normalizeMenuNutrition(&$item): void
    {
        $item->calories = isset($item->calories) && $item->calories !== null && $item->calories !== '' ? (int)$item->calories : null;

        foreach (['protein', 'carbs', 'fat', 'sugar'] as $field) {
            $item->{$field} = isset($item->{$field}) && $item->{$field} !== null && $item->{$field} !== '' ? (float)$item->{$field} : null;
        }

        $item->serving_size = isset($item->serving_size) && $item->serving_size !== '' ? (string)$item->serving_size : null;

        $hasNutrition = $item->calories !== null
            || $item->protein !== null
            || $item->carbs !== null
            || $item->fat !== null
            || $item->sugar !== null
            || $item->serving_size !== null;

        $item->nutrition = $hasNutrition ? [
            'calories' => $item->calories,
            'protein' => $item->protein,
            'carbs' => $item->carbs,
            'fat' => $item->fat,
            'sugar' => $item->sugar,
            'serving_size' => $item->serving_size,
            'disclaimer' => 'Restaurant-provided estimates. Values may vary by portion size, ingredients, and preparation.',
        ] : null;
    }
}

App::before(function () {
    /*
     * Register Main app routes
     *
     * The Main module intercepts all URLs that were not
     * handled by the admin modules.
     */

    Route::group([
        'middleware' => ['web'],
    ], function () {
        // Register Assets Combiner routes
        Route::any(config('system.assetsCombinerUri', '_assets').'/{asset}', 'System\Classes\Controller@combineAssets');

        // API Routes - Register these before the catch-all route
        Route::group(['prefix' => 'api'], function () {
            // Health check endpoint
            Route::get('/health', function () {
                return response()->json([
                    'status' => 'ok',
                    'timestamp' => now(),
                    'version' => '1.0.0'
                ]);
            });

            // Direct media serving route for TastyIgniter attachments
            Route::get('/media/{path}', function ($path) {
                // Remove any query parameters
                $path = explode('?', $path)[0];

                // First try the direct path (as stored in database)
                $mediaPath = base_path('assets/media/attachments/public/' . $path);

                if (!file_exists($mediaPath)) {
                    // If not found, search recursively for the filename
                    $filename = basename($path);
                    $searchPath = base_path('assets/media/attachments/public');

                    $foundPath = null;
                    $iterator = new RecursiveIteratorIterator(
                        new RecursiveDirectoryIterator($searchPath, RecursiveDirectoryIterator::SKIP_DOTS)
                    );

                    foreach ($iterator as $file) {
                        if ($file->getFilename() === $filename) {
                            $foundPath = $file->getPathname();
                            break;
                        }
                    }

                    if ($foundPath) {
                        $mediaPath = $foundPath;
                    }
                }

                if (file_exists($mediaPath)) {
                    $mimeType = mime_content_type($mediaPath);
                    return response()->file($mediaPath, [
                        'Content-Type' => $mimeType,
                        'Cache-Control' => 'public, max-age=31536000'
                    ]);
                } else {
                    // Fallback to pasta.png if image not found
                    $fallbackPath = public_path('images/pasta.png');
                    if (file_exists($fallbackPath)) {
                        return response()->file($fallbackPath, [
                            'Content-Type' => 'image/png',
                            'Cache-Control' => 'public, max-age=31536000'
                        ]);
                    } else {
                        abort(404);
                    }
                }
            })->where('path', '.*');

            /*
             * RE-ENABLED: /api/v1 routes (NOW SECURED)
             *
             * This group is now safe to use because:
             * 1. DetectTenant middleware added (line below)
             * 2. All hardcoded ti_* replaced with {$p} dynamic prefix
             * 3. Returns 404 when no tenant detected
             *
             * Note: This may create duplicates with routes.php and routes/api.php
             * But now all three sources are tenant-protected, so it's safe
             * (First registered route wins - they all have same middleware now)
             *
             * Fixed: 2025-10-10 - See EMERGENCY_FIX_CODE_CHANGES.md
             */

            // API v1 routes
            // Note: Must use full class name in App::before() context (middleware aliases not yet registered)

Route::prefix('v1')->middleware(['web', \App\Http\Middleware\DetectTenant::class])->group(function () {

                // ================================
                // COMPAT endpoints (frontend needs)
                // No tenant hardcoding; DetectTenant already applied
                // ================================

                Route::get('/settings-wrapped', function () {
                    try {
                        $conn = DB::connection('tenant');
                        $settings = $conn->table('settings')->get()->keyBy('item');
                        $payload = [
                            'site_name'        => optional($settings->get('site_name'))->value ?? 'PayMyDine',
                            'site_logo'        => optional($settings->get('site_logo'))->value ?? '',
                            'favicon_logo'     => optional($settings->get('favicon_logo'))->value ?? (optional($settings->get('site_logo'))->value ?? ''),
                            'default_currency' => optional($settings->get('default_currency'))->value ?? (optional($settings->get('default_currency_id'))->value ?? 'USD'),
                            'default_language' => optional($settings->get('default_language'))->value ?? 'en',
                            'order_prefix'     => optional($settings->get('invoice_prefix'))->value ?? '#',
                            'guest_order'      => optional($settings->get('guest_order'))->value ?? '1',
                        ];
                        return response()->json(['success' => true, 'data' => $payload]);
                    } catch (\Throwable $e) {
                \Log::error('PMD_ORDER_DEBUG exception', [
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'payload_all' => request()->all(),
                    'raw' => request()->getContent(),
                ]);
                        return response()->json(['success' => false, 'error' => 'Settings not found'], 404);
                    }
                });

                Route::get('/vat-settings', function () {
                    try {
                        $conn = DB::connection('tenant');
                        $settings = $conn->table('settings')->get()->keyBy('item');
                        $tax_mode       = optional($settings->get('tax_mode'))->value ?? optional($settings->get('tax_enabled'))->value ?? '0';
                        $tax_percentage = optional($settings->get('tax_percentage'))->value ?? '0';
                        $tax_menu_price = optional($settings->get('tax_menu_price'))->value ?? '1';
                        return response()->json(['success' => true, 'data' => [
                            'vat_mode' => (string)$tax_mode,
                            'vat_percentage' => (string)$tax_percentage,
                            'vat_menu_price' => (string)$tax_menu_price,
                            'tax_mode' => (string)$tax_mode, // Legacy compatibility
                            'tax_percentage' => (string)$tax_percentage, // Legacy compatibility
                            'tax_menu_price' => (string)$tax_menu_price, // Legacy compatibility
                        ]]);
                    } catch (\Throwable $e) {
                \Log::error('PMD_ORDER_DEBUG exception', [
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'payload_all' => request()->all(),
                    'raw' => request()->getContent(),
                ]);
                        return response()->json(['success' => false, 'error' => 'VAT settings not found'], 404);
                    }
                });

// Menu endpoints
                Route::get('/menu', function () {
                    try {
                        // DetectTenant has set default connection to tenant; use it explicitly for menu + combos
                        $conn = DB::connection('tenant');
                        $p = $conn->getTablePrefix();
                        $nutritionSelect = implode(",
                                ", array_map(function ($column) use ($conn) {
                            return pmdMenuColumnSelect($conn, 'm', $column);
                        }, ['calories', 'protein', 'carbs', 'fat', 'sugar', 'serving_size']));
                        $query = "
                            SELECT
                                m.menu_id as id,
                                m.menu_name as name,
                                m.menu_description as description,
                                CAST(m.menu_price AS DECIMAL(10,2)) as price,
                                COALESCE(c.name, 'Main') as category_name,
                                ma.name as image,
                                COALESCE(m.is_halal, 0) as halal,
                                COALESCE(m.is_vegetarian, 0) as vegetarian,
                                COALESCE(m.is_vegan, 0) as vegan,
                                {$nutritionSelect},
                                (
                                    SELECT GROUP_CONCAT(DISTINCT a.name ORDER BY a.name SEPARATOR '||')
                                    FROM {$p}allergenables aa
                                    INNER JOIN {$p}allergens a ON a.allergen_id = aa.allergen_id
                                    WHERE aa.allergenable_id = m.menu_id
                                        AND aa.allergenable_type IN ('menus', 'Admin\\Models\\Menus_model')
                                        AND a.status = 1
                                ) as allergy_names
                            FROM {$p}menus m
                            LEFT JOIN {$p}menu_categories mc ON m.menu_id = mc.menu_id
                            LEFT JOIN {$p}categories c ON mc.category_id = c.category_id
                            LEFT JOIN {$p}media_attachments ma ON ma.attachment_type = 'menus'
                                AND ma.attachment_id = m.menu_id
                                AND ma.tag = 'thumb'
                            WHERE m.menu_status = 1
                            ORDER BY c.priority ASC, COALESCE(m.menu_priority, 999999) ASC, m.menu_name ASC
                        ";

                        $items = $conn->select($query);

                        // Convert prices to float, fix image paths, add options, mark as non-combo
                        foreach ($items as &$item) {
                            $item->price = (float)$item->price;
                            normalizeMenuFoodAttributes($item);
                            normalizeMenuNutrition($item);
                            if ($item->image) {
                                // If image exists, construct the relative URL for Next.js proxy
                                $item->image = "/api/media/" . $item->image;
                            } else {
                                // Use default image if none exists
                                $item->image = '/images/pasta.png';
                            }
                            $item->isCombo = false;
                            $item->comboId = null;
                            // Fetch menu options for this item (uses default connection = tenant)
                            // PMD_MENU_GALLERY_IMAGES_RESPONSE_START
                            $item->images = pmd_menu_gallery_images_for_id((int)$item->id);
                            $item->gallery = $item->images;
                            $item->media = $item->images;
                            // PMD_MENU_GALLERY_IMAGES_RESPONSE_END
                            $item->options = getMenuItemOptions($item->id);
                        }

                        // Get combos from menu_combos on tenant DB (same connection as menu items)
                        $combosQuery = "
                            SELECT
                                mc.combo_id as id,
                                mc.combo_name as name,
                                mc.combo_description as description,
                                CAST(mc.combo_price AS DECIMAL(10,2)) as price,
                                'Combos' as category_name,
                                ma.name as image
                            FROM {$p}menu_combos mc
                            LEFT JOIN {$p}media_attachments ma ON ma.attachment_type = 'menu_combos'
                                AND ma.attachment_id = mc.combo_id
                                AND ma.tag = 'thumb'
                            WHERE mc.combo_status = 1
                            ORDER BY mc.combo_priority ASC, mc.combo_name ASC
                        ";
                        $combos = $conn->select($combosQuery);
                        foreach ($combos as &$combo) {
                            $combo->price = (float)$combo->price;
                            if ($combo->image) {
                                $combo->image = "/api/media/" . $combo->image;
                            } else {
                                $combo->image = '/images/pasta.png';
                            }
                            $combo->isCombo = true;
                            $combo->comboId = $combo->id;
                            $combo->options = [];
                            $combo->is_stock_out = false;
                            $combo->available = true;
                            $combo->halal = false;
                            $combo->vegetarian = false;
                            $combo->vegan = false;
                            $combo->allergens = [];
                            $combo->allergy_tags = [];
                            $combo->calories = null;
                            $combo->protein = null;
                            $combo->carbs = null;
                            $combo->fat = null;
                            $combo->sugar = null;
                            $combo->serving_size = null;
                            $combo->nutrition = null;
                        }
                        $allItems = array_merge($items, $combos);

                        // Get all enabled categories (tenant DB)
                        $categoriesQuery = "
                            SELECT category_id as id, name, priority
                            FROM {$p}categories
                            WHERE status = 1
                            ORDER BY priority ASC, name ASC
                        ";
                        $categories = $conn->select($categoriesQuery);

                        // Add "Combos" category if we have combos and it doesn't exist
                        if (count($combos) > 0) {
                            $hasCombosCategory = false;
                            foreach ($categories as $cat) {
                                if ($cat->name === 'Combos') {
                                    $hasCombosCategory = true;
                                    break;
                                }
                            }
                            if (!$hasCombosCategory) {
                                $categories[] = (object)[
                                    'id' => 'combos',
                                    'name' => 'Combos',
                                    'priority' => 999
                                ];
                            }
                        }

                        $settings = $conn->table('settings')->whereIn('item', ['site_logo', 'site_name', 'mail_from_address'])->get()->keyBy('item');
                        $logoValue = trim((string) optional($settings->get('site_logo'))->value);
                        $siteNameValue = trim((string) optional($settings->get('site_name'))->value);
                        $mailValue = trim((string) optional($settings->get('mail_from_address'))->value);
                        $hasCategories = count($categories) > 0;
                        $hasMenuItems = count($allItems) > 0;
                        $hasLogo = $logoValue !== '' && stripos($logoValue, 'default') === false && stripos($logoValue, 'placeholder') === false;
                        $hasCustomSettings = ($siteNameValue !== '' && strcasecmp($siteNameValue, 'PayMyDine') !== 0) || $mailValue !== '';
                        $isFrontendConfigured = $hasCategories || $hasMenuItems || $hasLogo || $hasCustomSettings;

                        return response()->json([
                            'success' => true,
                            'data' => [
                                'items' => $allItems,
                                'categories' => $categories,
                                'is_frontend_configured' => $isFrontendConfigured,
                                'setup_status' => [
                                    'has_categories' => $hasCategories,
                                    'has_menu_items' => $hasMenuItems,
                                    'has_logo' => $hasLogo,
                                    'has_custom_settings' => $hasCustomSettings,
                                ],
                            ]
                        ]);

                    } catch (\Exception $e) {
                \Log::error('PMD_ORDER_DEBUG exception', [
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'payload_all' => request()->all(),
                    'raw' => request()->getContent(),
                ]);
                        return response()->json([
                            'success' => false,
                            'error' => 'Failed to fetch menu',
                            'message' => $e->getMessage()
                        ], 500);
                    }                });

                // Table info endpoint
                Route::get('/table-info', function () {
                    try {
                        $table_id = request()->query('table_id');
                        $table_no = request()->query('table_no');
                        $qr_code = request()->query('qr_code');
                        $qr = request()->query('qr'); // Legacy support

                        // Priority order: qr_code  table_no  table_id
                        if ($qr_code) {
                            $table = DB::table('tables')->where('qr_code', $qr_code)->first();
                        } elseif ($qr) {
                            $table = DB::table('tables')->where('qr_code', $qr)->first();
                        } elseif ($table_no) {
                            $table = DB::table('tables')->where('table_no', $table_no)->first();
                        } elseif ($table_id) {
                            $table = DB::table('tables')->where('table_id', $table_id)->first();
                        } else {
                            return response()->json([
                                'success' => false,
                                'error' => 'table_id, table_no, or qr_code is required'
                            ], 400);
                        }

                        if (!$table) {
                            return response()->json([
                                'success' => false,
                                'error' => 'Table not found'
                            ], 404);
                        }

                        // Get location information
                        $location = DB::table('locationables')
                            ->where('locationable_id', $table_id)
                            ->where('locationable_type', 'tables')
                            ->first();

                        $location_id = $location ? $location->location_id : 1;

                        return response()->json([
                            'success' => true,
                            'data' => [
                                'table_id' => $table->table_id,
                                'table_no' => $table->table_no,
                                'table_name' => $table->table_name,
                                'location_id' => $location_id,
                                'qr_code' => $table->qr_code,
                                'min_capacity' => $table->min_capacity,
                                'max_capacity' => $table->max_capacity,
                                'status' => $table->table_status
                            ]
                        ]);
                    } catch (Exception $e) {
                \Log::error('PMD_ORDER_DEBUG exception', [
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'payload_all' => request()->all(),
                    'raw' => request()->getContent(),
                ]);
                        return response()->json([
                            'success' => false,
                            'error' => 'Internal server error: ' . $e->getMessage()
                        ], 500);
                    }
                });

                // Public table-order draft endpoints used by the customer QR frontend.
                // Keep these in the tenant-scoped public API layer so all devices on the same table can see active orders.
                $ensureTableOrderDraftTable = function () {
                    if (!\Illuminate\Support\Facades\Schema::hasTable('pmd_table_order_drafts')) {
                        \Illuminate\Support\Facades\Schema::create('pmd_table_order_drafts', function (\Illuminate\Database\Schema\Blueprint $table) {
                            $table->increments('id');
                            $table->string('table_id', 64)->nullable()->index();
                            $table->string('table_no', 64)->nullable()->index();
                            $table->string('table_name', 191)->nullable();
                            $table->string('qr', 191)->nullable()->index();
                            $table->string('status', 32)->default('draft')->index();
                            $table->unsignedInteger('order_id')->nullable()->index();
                            $table->longText('payload')->nullable();
                            $table->timestamps();
                        });
                    }
                };

                $resolveTableDraftContext = function (\Illuminate\Http\Request $request) {
                    $tableId = trim((string)$request->input('table_id', $request->query('table_id', '')));
                    $tableNo = trim((string)$request->input('table_no', $request->query('table_no', $request->query('table', ''))));
                    $qr = trim((string)$request->input('qr', $request->query('qr', '')));
                    $table = null;
                    foreach (array_values(array_unique(array_filter([$tableId, $tableNo], fn($v) => $v !== ''))) as $candidate) {
                        $table = DB::table('tables')->where('table_id', $candidate)->orWhere('table_no', $candidate)->first();
                        if ($table) break;
                    }
                    if (!$table && $qr !== '') $table = DB::table('tables')->where('qr_code', $qr)->first();
                    if ($table) {
                        $tableId = (string)($table->table_id ?? $tableId);
                        $tableNo = (string)($table->table_no ?? $tableNo);
                        if ($qr === '' && !empty($table->qr_code)) $qr = (string)$table->qr_code;
                    }
                    return [
                        'table' => $table,
                        'table_id' => $tableId,
                        'table_no' => $tableNo,
                        'table_name' => $table ? (string)($table->table_name ?? '') : '',
                        'qr' => $qr,
                        'candidates' => array_values(array_unique(array_filter([
                            $table ? (string)$table->table_id : null,
                            $table ? (string)$table->table_no : null,
                            $tableId,
                            $tableNo,
                        ], fn($v) => $v !== null && $v !== ''))),
                    ];
                };

                $normalizeDraftItems = function (array $items): array {
                    $normalized = [];
                    foreach ($items as $index => $item) {
                        $menuId = (int)($item['menu_id'] ?? $item['id'] ?? 0);
                        $qty = max(1, (int)($item['quantity'] ?? 1));
                        $hasPayloadPrice = array_key_exists('price', $item) && is_numeric($item['price']);
                        $price = $hasPayloadPrice ? (float)$item['price'] : null;
                        if ($menuId <= 0) continue;
                        $menu = DB::table('menus')->where('menu_id', $menuId)->where('menu_status', 1)->first();
                        if (!$menu) continue;
                        $name = trim((string)($item['name'] ?? '')) ?: (string)($menu->menu_name ?? ('Item '.($index + 1)));
                        $unitPrice = $hasPayloadPrice ? (float)$price : (float)($menu->menu_price ?? 0);
                        $lineSubtotal = array_key_exists('subtotal', $item) && is_numeric($item['subtotal'])
                            ? (float)$item['subtotal']
                            : round($unitPrice * $qty, 4);
                        $normalized[] = [
                            'id' => (int)round(microtime(true) * 1000) + $index,
                            'menu_id' => $menuId,
                            'name' => $name,
                            'quantity' => $qty,
                            'price' => $unitPrice,
                            'subtotal' => round($lineSubtotal, 4),
                            'options' => is_array($item['options'] ?? null) ? $item['options'] : [],
                            'guest_session_id' => trim((string)($item['guest_session_id'] ?? '')),
                        ];
                    }
                    return $normalized;
                };

                $formatTableOrderResponse = function ($draft = null, ?object $order = null, array $context = []) {
                    $items = [];
                    $status = 'empty';
                    $orderId = null;
                    $payment = null;
                    $settledAmount = 0.0;
                    $total = 0.0;
                    $subtotal = 0.0;
                    $taxAmount = 0.0;
                    $orderTotalsRows = [];
                    $statusName = null;
                    if ($draft) {
                        $payload = json_decode((string)($draft->payload ?? '[]'), true);
                        $items = is_array($payload['items'] ?? null) ? $payload['items'] : [];
                        $status = (string)($draft->status ?? 'draft');
                        $orderId = $draft->order_id ? (int)$draft->order_id : null;
                    }
                    if ($order) {
                        $statusName = (string)($order->status_name ?? '');
                        $status = ((float)($order->settled_amount ?? 0) > 0) ? 'partially_paid' : 'submitted_unpaid';
                        $orderId = (int)$order->order_id;
                        $payment = (string)($order->payment ?? '');
                        $settledAmount = (float)($order->settled_amount ?? 0);
                        $total = (float)($order->order_total ?? 0);
                        $items = DB::table('order_menus')
                            ->where('order_id', $orderId)
                            ->orderBy('order_menu_id')
                            ->get(['order_menu_id','menu_id','name','quantity','price','subtotal'])
                            ->map(fn($row) => [
                                'order_menu_id' => (int)($row->order_menu_id ?? 0),
                                'menu_id' => (int)($row->menu_id ?? 0),
                                'name' => (string)($row->name ?? ''),
                                'quantity' => (float)($row->quantity ?? 0),
                                'price' => (float)($row->price ?? 0),
                                'subtotal' => (float)($row->subtotal ?? 0),
                                'paid_quantity' => 0,
                                'unpaid_quantity' => (float)($row->quantity ?? 0),
                            ])->values()->all();
                        $resolvedTotals = pmd_table_order_totals_from_order($orderId, $items, (float)($order->order_total ?? 0));
                        $subtotal = (float)$resolvedTotals['subtotal'];
                        $taxAmount = (float)$resolvedTotals['tax'];
                        $total = (float)$resolvedTotals['total'];
                        $orderTotalsRows = $resolvedTotals['rows'];
                        if ($total > 0 && $settledAmount >= $total - 0.0001) $status = 'paid';
                    }
                    if (!$order) {
                        $resolvedTotals = pmd_table_order_calculate_totals($items);
                        $subtotal = (float)$resolvedTotals['subtotal'];
                        $taxAmount = (float)$resolvedTotals['tax'];
                        $total = (float)$resolvedTotals['total'];
                        $orderTotalsRows = $resolvedTotals['rows'];
                    }
                    $groups = [];
                    foreach ($items as $item) {
                        $guest = (string)($item['guest_session_id'] ?? 'table');
                        if (!isset($groups[$guest])) $groups[$guest] = ['guest_session_id' => $guest === 'table' ? null : $guest, 'items' => [], 'subtotal' => 0.0];
                        $groups[$guest]['items'][] = $item;
                        $groups[$guest]['subtotal'] += (float)($item['subtotal'] ?? 0);
                    }
                    $remaining = max(0, $total - $settledAmount);
                    $hasActive = (bool)($draft || $order);
                    return response()->json([
                        'success' => true,
                        'status' => $status,
                        'status_name' => $statusName,
                        'paymentStatus' => $status === 'paid' ? 'paid' : ($settledAmount > 0 ? 'partial' : 'unpaid'),
                        'deliveryStatus' => $statusName,
                        'hasActiveTableOrder' => $hasActive,
                        'canShowToNewDevice' => $hasActive,
                        'draft_id' => $draft ? (int)$draft->id : null,
                        'order_id' => $orderId,
                        'orderId' => $orderId,
                        'orderNumber' => $orderId,
                        'table_id' => $context['table_id'] ?? ($draft->table_id ?? null),
                        'table_no' => $context['table_no'] ?? ($draft->table_no ?? null),
                        'table_name' => $context['table_name'] ?? ($draft->table_name ?? null),
                        'items' => array_values($items),
                        'groups' => array_values($groups),
                        'total' => round($total, 4),
                        'order_totals' => $orderTotalsRows,
                        'totals' => ['subtotal' => round($subtotal, 4), 'tax' => round($taxAmount, 4), 'total' => round($total, 4), 'orderTotal' => round($total, 4), 'settledAmount' => round($settledAmount, 4), 'remainingAmount' => round($remaining, 4)],
                        'settlement' => ['orderTotal' => round($total, 4), 'settledAmount' => round($settledAmount, 4), 'remainingAmount' => round($remaining, 4), 'settlementStatus' => $status === 'paid' ? 'paid' : ($settledAmount > 0 ? 'partial' : 'unpaid')],
                        'payment' => $payment,
                        'updatedAt' => $order ? (string)($order->updated_at ?? '') : ($draft ? (string)($draft->updated_at ?? '') : null),
                    ]);
                };

                $findActiveSubmittedTableOrder = function (array $context) {
                    $candidates = $context['candidates'] ?? [];
                    if (empty($candidates)) return null;
                    $orders = DB::table('orders')
                        ->leftJoin('statuses', 'orders.status_id', '=', 'statuses.status_id')
                        ->where('orders.payment', 'qr_pay_later')
                        ->whereIn('orders.order_type', $candidates)
                        ->orderByDesc('orders.order_id')
                        ->limit(12)
                        ->get(['orders.*', 'statuses.status_name']);
                    $terminalStatusNames = ['completed', 'complete', 'delivered', 'delivery-complete', 'cancelled', 'canceled', 'cancel'];
                    foreach ($orders as $order) {
                        $total = (float)($order->order_total ?? 0);
                        $settled = (float)($order->settled_amount ?? 0);
                        $settlementStatus = strtolower(trim((string)($order->settlement_status ?? '')));
                        $statusName = strtolower(trim((string)($order->status_name ?? '')));
                        $normalizedStatus = str_replace([' ', '_'], '-', $statusName);
                        $isPaid = in_array($settlementStatus, ['paid', 'settled'], true) || $normalizedStatus === 'paid' || ($total > 0 && $settled >= $total - 0.0001);
                        $isTerminal = in_array($normalizedStatus, $terminalStatusNames, true);
                        if (!$isPaid || !$isTerminal) {
                            if ($isPaid && $statusName === '') {
                                $updatedAt = $order->updated_at ? \Illuminate\Support\Carbon::parse($order->updated_at) : null;
                                if ($updatedAt && $updatedAt->lt(now()->subHours(2))) continue;
                            }
                            return $order;
                        }
                    }
                    return null;
                };


                // PMD_PUBLIC_API_V1_VALIDATE_COUPON_FIX
                // Public tenant-scoped coupon validation for Next.js customer frontend.
                Route::post('/validate-coupon', function (\Illuminate\Http\Request $request) {
                    try {
                        $code = strtoupper(trim((string)$request->input('code', '')));
                        $amount = (float)$request->input('amount', $request->input('subtotal', 0));

                        if ($code === '') {
                            return response()->json([
                                'success' => false,
                                'valid' => false,
                                'message' => 'Coupon code is required',
                            ]);
                        }

                        if (!\Illuminate\Support\Facades\Schema::hasTable('igniter_coupons')) {
                            return response()->json([
                                'success' => false,
                                'valid' => false,
                                'message' => 'Coupons are not available',
                            ]);
                        }

                        $query = \Illuminate\Support\Facades\DB::table('igniter_coupons')
                            ->where('code', $code);

                        if (\Illuminate\Support\Facades\Schema::hasColumn('igniter_coupons', 'status')) {
                            $query->where('status', 1);
                        }

                        if (\Illuminate\Support\Facades\Schema::hasColumn('igniter_coupons', 'card_type')) {
                            $query->where(function ($q) {
                                $q->where('card_type', 'coupon')
                                  ->orWhereNull('card_type')
                                  ->orWhere('card_type', '');
                            });
                        }

                        $coupon = $query->first();

                        if (!$coupon) {
                            return response()->json([
                                'success' => false,
                                'valid' => false,
                                'message' => 'Invalid coupon code',
                            ]);
                        }

                        $minTotal = isset($coupon->min_total) ? (float)$coupon->min_total : 0.0;
                        if ($minTotal > 0 && $amount < $minTotal) {
                            return response()->json([
                                'success' => false,
                                'valid' => false,
                                'message' => 'Minimum order total of €'.number_format($minTotal, 2).' required',
                            ]);
                        }

                        $type = strtoupper((string)($coupon->type ?? 'F'));
                        $rawDiscount = (float)($coupon->discount ?? 0);
                        $discount = 0.0;

                        if ($type === 'P') {
                            $discount = $amount * ($rawDiscount / 100);
                        } else {
                            $discount = $rawDiscount;
                        }

                        if (isset($coupon->max_discount_cap) && (float)$coupon->max_discount_cap > 0) {
                            $discount = min($discount, (float)$coupon->max_discount_cap);
                        }

                        $discount = max(0, min($discount, $amount));
                        $discount = round($discount, 2);

                        return response()->json([
                            'success' => true,
                            'valid' => true,
                            'message' => 'Coupon applied',
                            'code' => $code,
                            'discountType' => $type,
                            'discountAmount' => $type === 'F' ? $rawDiscount : null,
                            'discountPercent' => $type === 'P' ? $rawDiscount : null,
                            'finalDiscountAmount' => $discount,
                            'data' => [
                                'coupon_id' => $coupon->coupon_id ?? null,
                                'code' => $code,
                                'name' => $coupon->name ?? $code,
                                'type' => $type,
                                'discount' => $discount,
                                'discount_value' => $rawDiscount,
                                'min_total' => $minTotal,
                                'finalDiscountAmount' => $discount,
                            ],
                        ]);
                    } catch (\Throwable $e) {
                        \Log::error('PMD coupon validation failed', [
                            'message' => $e->getMessage(),
                            'file' => $e->getFile(),
                            'line' => $e->getLine(),
                            'payload' => $request->all(),
                        ]);

                        return response()->json([
                            'success' => false,
                            'valid' => false,
                            'message' => 'Failed to validate coupon',
                        ], 500);
                    }
                });

                Route::get('/table-order-draft', function (\Illuminate\Http\Request $request) use ($ensureTableOrderDraftTable, $resolveTableDraftContext, $formatTableOrderResponse, $findActiveSubmittedTableOrder) {
                    $ensureTableOrderDraftTable();
                    $context = $resolveTableDraftContext($request);
                    if (($context['table_id'] ?? '') === '' && ($context['table_no'] ?? '') === '' && ($context['qr'] ?? '') === '') {
                        return response()->json(['success' => false, 'error' => 'table_id, table_no, or qr is required'], 422);
                    }
                    $draft = DB::table('pmd_table_order_drafts')
                        ->where('status', 'draft')
                        ->where(function ($q) use ($context) {
                            if (($context['table_id'] ?? '') !== '') $q->orWhere('table_id', $context['table_id']);
                            if (($context['table_no'] ?? '') !== '') $q->orWhere('table_no', $context['table_no']);
                            if (($context['qr'] ?? '') !== '') $q->orWhere('qr', $context['qr']);
                        })
                        ->orderByDesc('id')
                        ->first();
                    if ($draft) return $formatTableOrderResponse($draft, null, $context);
                    $order = $findActiveSubmittedTableOrder($context);
                    return $formatTableOrderResponse(null, $order, $context);
                });

                Route::post('/table-order-draft/confirm-items', function (\Illuminate\Http\Request $request) use ($ensureTableOrderDraftTable, $resolveTableDraftContext, $normalizeDraftItems, $formatTableOrderResponse) {
                    $ensureTableOrderDraftTable();
                    $request->validate(['guest_session_id' => 'required|string|max:191', 'items' => 'required|array|min:1']);
                    $context = $resolveTableDraftContext($request);
                    $items = $normalizeDraftItems((array)$request->input('items', []));
                    if (empty($items)) return response()->json(['success' => false, 'error' => 'No valid menu items'], 422);
                    $draft = DB::transaction(function () use ($context, $items) {
                        $query = DB::table('pmd_table_order_drafts')->where('status', 'draft')->where(function ($q) use ($context) {
                            if (($context['table_id'] ?? '') !== '') $q->orWhere('table_id', $context['table_id']);
                            if (($context['table_no'] ?? '') !== '') $q->orWhere('table_no', $context['table_no']);
                            if (($context['qr'] ?? '') !== '') $q->orWhere('qr', $context['qr']);
                        });
                        $draft = $query->lockForUpdate()->orderByDesc('id')->first();
                        $payload = $draft ? (json_decode((string)$draft->payload, true) ?: []) : [];
                        $existing = is_array($payload['items'] ?? null) ? $payload['items'] : [];
                        $merged = array_values(array_merge($existing, $items));
                        $data = [
                            'table_id' => $context['table_id'] ?: null,
                            'table_no' => $context['table_no'] ?: null,
                            'table_name' => $context['table_name'] ?: null,
                            'qr' => $context['qr'] ?: null,
                            'status' => 'draft',
                            'payload' => json_encode(['items' => $merged], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES),
                            'updated_at' => now(),
                        ];
                        if ($draft) {
                            DB::table('pmd_table_order_drafts')->where('id', $draft->id)->update($data);
                            return DB::table('pmd_table_order_drafts')->where('id', $draft->id)->first();
                        }
                        $data['created_at'] = now();
                        $id = DB::table('pmd_table_order_drafts')->insertGetId($data);
                        return DB::table('pmd_table_order_drafts')->where('id', $id)->first();
                    });
                    return $formatTableOrderResponse($draft, null, $context);
                });

                Route::post('/table-order-draft/submit', function (\Illuminate\Http\Request $request) use ($ensureTableOrderDraftTable, $resolveTableDraftContext, $formatTableOrderResponse, $findActiveSubmittedTableOrder) {
                    $ensureTableOrderDraftTable();
                    $context = $resolveTableDraftContext($request);
                    $draftId = (int)$request->input('draft_id', 0);
                    $orderId = null;
                    $draft = null;
                    DB::transaction(function () use (&$draft, &$orderId, $draftId, $context, $request) {
                        $query = DB::table('pmd_table_order_drafts')->where('status', 'draft');
                        if ($draftId > 0) $query->where('id', $draftId); else $query->where(function ($q) use ($context) {
                            if (($context['table_id'] ?? '') !== '') $q->orWhere('table_id', $context['table_id']);
                            if (($context['table_no'] ?? '') !== '') $q->orWhere('table_no', $context['table_no']);
                            if (($context['qr'] ?? '') !== '') $q->orWhere('qr', $context['qr']);
                        });
                        $draft = $query->lockForUpdate()->orderByDesc('id')->first();
                        if (!$draft) return;
                        $payload = json_decode((string)$draft->payload, true) ?: [];
                        $items = is_array($payload['items'] ?? null) ? $payload['items'] : [];
                        if (empty($items)) return;
                        // PMD_TABLE_ORDER_VAT_TOTALS_SUBMIT_SCOPE_20260604
                        // Table-order submit source of truth:
                        // item subtotal already includes priced options from frontend payload.
                        // We add VAT rows here so Admin / Order Status / Payment / Split all read the same totals.
                        $resolvedTotals = pmd_table_order_calculate_totals($items);
                        $itemsSubtotal = (float)$resolvedTotals['subtotal'];
                        $taxAmount = (float)$resolvedTotals['tax'];
                        $total = (float)$resolvedTotals['total'];
                        $orderNumber = (int)DB::table('orders')->max('order_id') + 1;
                        $comment = trim('Table Draft Basket | Table ID: '.($context['table_id'] ?? '').' | Table: '.(($context['table_name'] ?? '') ?: ($context['table_no'] ?? '')).' | [table_draft_id:'.$draft->id.']'.($request->input('guest_session_id') ? ' | [submitted_by:'.$request->input('guest_session_id').']' : ''), ' |');
                        $insert = [
                            'order_id' => $orderNumber,
                            'first_name' => 'Table',
                            'last_name' => 'Customer',
                            'email' => '',
                            'telephone' => '',
                            'location_id' => (int)(($context['table']->location_id ?? null) ?: $request->input('location_id', 1)),
                            'order_type' => (string)(($context['table_id'] ?? '') ?: ($context['table_no'] ?? 'table')),
                            'order_total' => round($total, 4),
                            'order_date' => now()->format('Y-m-d'),
                            'order_time' => now()->format('H:i:s'),
                            'status_id' => 1,
                            'comment' => $comment,
                            'processed' => 1,
                            'payment' => 'qr_pay_later',
                            'total_items' => array_sum(array_map(fn($i) => (int)($i['quantity'] ?? 1), $items)),
                            'ip_address' => $request->ip(),
                            'user_agent' => $request->userAgent() ?? 'API Client',
                            'created_at' => now(),
                            'updated_at' => now(),
                        ];
                        if (\Illuminate\Support\Facades\Schema::hasColumn('orders', 'settlement_status')) $insert['settlement_status'] = 'unpaid';
                        if (\Illuminate\Support\Facades\Schema::hasColumn('orders', 'settled_amount')) $insert['settled_amount'] = 0;
                        $orderId = DB::table('orders')->insertGetId($insert);
                        foreach ($items as $item) {
                            DB::table('order_menus')->insert([
                                'order_id' => $orderId,
                                'menu_id' => (int)($item['menu_id'] ?? 0),
                                'name' => (string)($item['name'] ?? 'Item'),
                                'quantity' => max(1, (int)($item['quantity'] ?? 1)),
                                'price' => (float)($item['price'] ?? 0),
                                'subtotal' => (float)($item['subtotal'] ?? 0),
                                'comment' => '[guest_session:'.(string)($item['guest_session_id'] ?? '').']',
                                'option_values' => !empty($item['options']) ? json_encode($item['options'], JSON_UNESCAPED_UNICODE|JSON_UNESCAPED_SLASHES) : null,
                            ]);
                        }
                        $totalsRows = array_map(function ($row) use ($orderId) {
                            return array_merge(['order_id' => $orderId], $row);
                        }, $resolvedTotals['rows']);

                        DB::table('order_totals')->insert($totalsRows);
                        DB::table('pmd_table_order_drafts')->where('id', $draft->id)->update(['status' => 'submitted', 'order_id' => $orderId, 'updated_at' => now()]);
                        try {
                            DB::table('notifications')->insert(['type' => 'order', 'title' => 'New table order #'.$orderId, 'table_id' => (int)($context['table_id'] ?: 0), 'table_name' => (string)(($context['table_name'] ?? '') ?: ($context['table_no'] ?? '')), 'payload' => json_encode(['order_id' => $orderId, 'draft_id' => (int)$draft->id]), 'status' => 'new', 'created_at' => now(), 'updated_at' => now()]);
                        } catch (\Throwable $ignored) {}
                    });
                    if (!$orderId) {
                        $existing = $findActiveSubmittedTableOrder($context);
                        if ($existing) return $formatTableOrderResponse(null, $existing, $context);
                        return response()->json(['success' => false, 'error' => 'No draft items to submit'], 422);
                    }
                    $order = DB::table('orders')->leftJoin('statuses', 'orders.status_id', '=', 'statuses.status_id')->where('orders.order_id', $orderId)->first(['orders.*', 'statuses.status_name']);
                    return $formatTableOrderResponse(null, $order, $context);
                });


                function syncOrderToPOS($orderId)
                {
                    try {
                        $order = DB::table('orders')->where('order_id', $orderId)->first();
                        $items = DB::table('order_menus')->where('order_id', $orderId)->get();

                        if (!$order) {
                            \Log::warning('API: Order not found for POS sync', ['order_id' => $orderId]);
                            return;
                        }

                        $configs = \Admin\Models\Pos_configs_model::with('devices')->get();

                        if ($configs->isEmpty()) {
                            \Log::warning('API: No POS configs found');
                            return;
                        }

                        // Recriar payloads
                        $squarePayload     = formatOrderForSquareAPI($order, $items);
                        $cloverPayload     = formatOrderForCloverAPI($order, $items);
                        $lightspeedPayload = formatOrderForLightspeedAPI($order, $items);

                        $baseUrl = 'https://api.ready2order.com/v1';

                        foreach ($configs as $config) {

                            $device      = $config->devices;
                            $posCode     = strtolower($device->code ?? '');
                            $accessToken = $config->access_token ?? null;

                            if (!$posCode || !$accessToken) continue;

                            $url = null;
                            $payload = null;

                            // PMD_ORACLE_SIMPHONY_PUSH_GUARD
                            if ($posCode === 'oracle_simphony') {
                                $isOraclePlaceholder =
                                    ($config->url ?? '') === 'https://placeholder.oracle.simphony.api'
                                    || ($config->username ?? '') === 'CLIENT_ID_PLACEHOLDER'
                                    || ($config->access_token ?? '') === 'CLIENT_SECRET_PLACEHOLDER'
                                    || ($config->id_application ?? '') === 'ORACLE_ORG_OR_GATEWAY_PLACEHOLDER';

                                if ($isOraclePlaceholder) {
                                    \Log::warning('API: Oracle Simphony push skipped - placeholder config', [
                                        'order_id' => $orderId,
                                        'config_id' => $config->config_id ?? null,
                                    ]);
                                    continue;
                                }
                            }

                            switch ($posCode) {
                                case 'square':
                                    $url = "$baseUrl/api/pos/square/order/create";
                                    $payload = $squarePayload;
                                    break;

                                case 'clover':
                                    $url = "$baseUrl/api/pos/clover/order/create";
                                    if (!empty($config->id_application)) {
                                        $url .= '?merchantId=' . urlencode($config->id_application);
                                    }
                                    $payload = $cloverPayload;
                                    break;

                                case 'lightspeed':
                                    $url = "$baseUrl/api/pos/lightspeed/order/create";
                                    if (!empty($config->id_application)) {
                                        $url .= '?domainPrefix=' . urlencode($config->id_application);
                                    }
                                    $payload = $lightspeedPayload;
                                    break;


                                // PMD_HELLOCASH_SYNC_ORDER_START
                                case 'hellocash':
                                // PMD_HYPERSOFT_SYNC_ORDER_START
                                case 'hypersoft':
                                    $baseUrl = trim((string)($config->url ?? ''));
                                    $cusToken = trim((string)($config->username ?? ''));
                                    $authToken = trim((string)($config->access_token ?? ''));

                                    $isPlaceholder =
                                        $baseUrl === '' ||
                                        str_contains($baseUrl, 'placeholder.hypersoft') ||
                                        $cusToken === '' ||
                                        $cusToken === 'CUS_TOKEN_PLACEHOLDER' ||
                                        $authToken === '' ||
                                        $authToken === 'AUTH_TOKEN_PLACEHOLDER';

                                    if ($isPlaceholder) {
                                        \Log::warning('API: Hypersoft sync skipped - placeholder config', [
                                            'order_id' => $orderId,
                                            'pos' => 'hypersoft',
                                            'config_id' => $config->config_id ?? null,
                                        ]);
                                        continue 2;
                                    }

                                    \Log::warning('API: Hypersoft sync skipped - live connector not finalized yet', [
                                        'order_id' => $orderId,
                                        'pos' => 'hypersoft',
                                        'config_id' => $config->config_id ?? null,
                                    ]);
                                    continue 2;

                                    $url = rtrim(($config->url ?? 'https://api.hellocash.business/api/v1'), '/') . '/invoices';
                                    $payload = formatOrderForHelloCashAPI($order, $items, $config);
                                    break;
                                // PMD_HELLOCASH_SYNC_ORDER_END

                                default:
                                    continue 2;
                            }

                            $response = Http::withToken($accessToken)
                                ->acceptJson()
                                ->post($url, $payload);

                            \Log::info('API: POS sync sent', [
                                'order_id' => $orderId,
                                'pos'      => $posCode,
                                'status'   => $response->status(),
                                'response' => $response->json()
                            ]);
                        }

                    } catch (\Exception $e) {
                \Log::error('PMD_ORDER_DEBUG exception', [
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'payload_all' => request()->all(),
                    'raw' => request()->getContent(),
                ]);
                        \Log::error('API: POS sync failed', [
                            'order_id' => $orderId,
                            'error'    => $e->getMessage()
                        ]);
                    }
                }


                // PMD_HELLOCASH_FORMATTER_START
                function formatOrderForHelloCashAPI($order, $items, $config)
                {
                    $cashierId = trim((string)($config->username ?? ''));

                    if ($cashierId === '') {
                        throw new \RuntimeException('helloCash requires cashier_id in pos_configs.username');
                    }

                    $helloItems = collect($items)->map(function ($item) {
                        $name = trim((string)($item->name ?? 'POS Item'));

                        $quantity = (float)($item->quantity ?? 1);
                        if ($quantity <= 0) {
                            $quantity = 1;
                        }

                        $price = round((float)($item->price ?? 0), 2);

                        $taxRate = null;
                        foreach (['tax_rate', 'tax', 'vat', 'menu_tax', 'item_tax_rate'] as $field) {
                            if (isset($item->$field) && $item->$field !== null && $item->$field !== '') {
                                $taxRate = (string)$item->$field;
                                break;
                            }
                        }

                        if ($taxRate === null) {
                            $taxRate = '19';
                        }

                        return [
                            'item_name'     => $name,
                            'item_quantity' => number_format($quantity, 3, '.', ''),
                            'item_price'    => number_format($price, 2, '.', ''),
                            'item_taxRate'  => (string)$taxRate,
                        ];
                    })->filter(function ($row) {
                        return trim((string)($row['item_name'] ?? '')) !== '';
                    })->values()->toArray();

                    if (empty($helloItems)) {
                        throw new \RuntimeException('helloCash payload has no items');
                    }

                    return [
                        'invoice_testMode' => true,
                        'cashier_id'       => $cashierId,
                        'items'            => $helloItems,
                    ];
                }
                // PMD_HELLOCASH_FORMATTER_END

                function formatOrderForSquareAPI($order, $items)
                {
                    return [
                        'order_id' => $order->order_id,
                        'location_id' => null,
                        'customer' => [
                            'name'  => $order->first_name,
                            'email' => $order->email,
                        ],
                        'total_money' => [
                            'amount'   => intval($order->order_total * 100),
                            'currency' => 'USD',
                        ],
                        'line_items' => collect($items)->map(function ($item) {
                            return [
                                'name' => $item->name,
                                'quantity' => strval($item->quantity),
                                'base_price_money' => [
                                    'amount'   => intval($item->price * 100),
                                    'currency' => 'USD',
                                ],
                            ];
                        })->toArray(),
                        'created_at' => now()->toIso8601String(),
                        'provider'   => 'square',
                    ];
                }

                function formatOrderForCloverAPI($order, $items)
                {
                    return [
                        'order_id' => $order->order_id,
                        'customer' => [
                            'name'  => $order->first_name,
                            'email' => $order->email,
                        ],
                        'line_items' => collect($items)->map(function ($item) {
                            return [
                                'name'     => $item->name,
                                'price'    => intval($item->price * 100),
                                'quantity' => (int) $item->quantity,
                            ];
                        })->toArray(),
                        'created_at' => now()->toIso8601String(),
                        'provider'   => 'clover',
                    ];
                }

                function formatOrderForLightspeedAPI($order, $items)
                {
                    return [
                        'payload' => [
                            'id' => (string) $order->order_id,
                            'totals' => [
                                'total_price' => (float) $order->order_total,
                            ],
                            'register_sale_products' => collect($items)->map(function ($item) {
                                return [
                                    'name'        => $item->name,
                                    'quantity'    => (int)$item->quantity,
                                    'price'       => (float)$item->price,
                                    'price_total' => $item->quantity * $item->price,
                                ];
                            })->toArray(),
                            'created_at' => now()->toIso8601String(),
                        ],
                        'provider' => 'lightspeed',
                    ];
                }

                // Orders endpoint

                // Single source of truth for menu: see Route::get('/menu', ...) at top of this v1 group (with DetectTenant + combos).

                Route::get('/categories', function () {
                    try {
                        $categories = DB::table('categories')
                            ->where('status', 1)
                            ->orderBy('priority', 'asc')
                            ->orderBy('name', 'asc')
                            ->get(['category_id as id', 'name', 'priority']);

                        return response()->json([
                            'success' => true,
                            'data' => $categories
                        ]);
                    } catch (\Exception $e) {
                \Log::error('PMD_ORDER_DEBUG exception', [
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'payload_all' => request()->all(),
                    'raw' => request()->getContent(),
                ]);
                        return response()->json([
                            'success' => false,
                            'error' => 'Failed to fetch categories',
                            'message' => $e->getMessage()
                        ], 500);
                    }
                });

                // Restaurant info endpoint
                Route::get('/restaurant', function () {
                    $restaurant = DB::table('locations')->first();

                    return response()->json([
                        'id' => 1,
                        'name' => $restaurant->location_name ?? 'PayMyDine',
                        'description' => $restaurant->description ?? '',
                        'address' => $restaurant->location_address_1 ?? '',
                        'phone' => $restaurant->location_telephone ?? '',
                        'email' => $restaurant->location_email ?? '',
                        'settings' => [
                            'currency' => $restaurant->location_currency ?? 'USD',
                            'timezone' => $restaurant->location_timezone ?? 'UTC',
                            'delivery_enabled' => (bool)($restaurant->offer_delivery ?? false),
                            'pickup_enabled' => (bool)($restaurant->offer_collection ?? false),
                        ]
                    ]);
                });

                // Valet request endpoint (simplified to match waiter-call & table-notes)
                Route::post('/valet-request', function (\Illuminate\Http\Request $request) {
                    $data = $request->validate([
                        'table_id'      => 'required|string',
                        'name'          => 'required|string|max:120',
                        'license_plate' => 'required|string|max:60',
                        'car_make'      => 'nullable|string|max:60',
                    ]);

                    // Get table info from database to get correct table_name
                    $tableInfo = \App\Helpers\TableHelper::getTableInfo($data['table_id']);
                    $tableName = $tableInfo ? $tableInfo['table_name'] : "Table {$data['table_id']}";

                    // Create notification directly (same pattern as waiter-call & table-notes)
                    $id = DB::table('notifications')->insertGetId([
                        'type'       => 'valet_request',
                        'title'      => "Valet Request from {$tableName}",
                        'table_id'   => (string)$data['table_id'],
                        'table_name' => $tableName,
                        'payload'    => json_encode([
                            'name'          => $data['name'],
                            'license_plate' => $data['license_plate'],
                            'car_make'      => $data['car_make'] ?? null,
                            'details'       => $tableName . ' · ' . $data['license_plate'] . ($data['car_make'] ? ' · ' . $data['car_make'] : ''),
                        ], JSON_UNESCAPED_UNICODE),
                        'status'     => 'new',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    return response()->json([
                        'ok'              => true,
                        'message'         => 'Valet request submitted successfully',
                        'notification_id' => $id,
                        'created_at'      => now()->toISOString(),
                    ], 201);
                });

                // --- Waiter Call ------------------------------------------------------------
                Route::post('/waiter-call', function (\Illuminate\Http\Request $request) {
                    // Accept both table_id and tableId; msg optional
                    $payload = $request->validate([
                        'table_id' => 'nullable|string',
                        'tableId'  => 'nullable|string',
                        'msg'      => 'nullable|string|max:240',
                    ]);

                    $table = $payload['table_id'] ?? $payload['tableId'] ?? null;
                    if (!$table) {
                        return response()->json(['ok' => false, 'error' => 'table_id is required'], 422);
                    }

                    // Get table info from database to get correct table_name
                    $tableInfo = \App\Helpers\TableHelper::getTableInfo($table);
                    $tableName = $tableInfo ? $tableInfo['table_name'] : "Table {$table}";
                    $tableOnly = $table;

                    // create notification
                    $id = DB::table('notifications')->insertGetId([
                        'type'       => 'waiter_call',
                        'title'      => "Waiter called from {$tableName}",
                        'table_id'   => (string)$tableOnly,
                        'table_name' => $tableName,
                        'payload'    => json_encode([
                            'message'   => $payload['msg'] ?? '',
                            'source'    => 'guest',
                            'details'   => $tableName,
                        ], JSON_UNESCAPED_UNICODE),
                        'status'     => 'new',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    return response()->json(['ok' => true, 'notification_id' => $id], 201);
                });

                // --- Table Note --------------------------------------------------------------
                Route::post('/table-notes', function (\Illuminate\Http\Request $request) {
                    $payload = $request->validate([
                        'table_id' => 'nullable|string',
                        'tableId'  => 'nullable|string',
                        'note'     => 'required|string|max:1000',
                    ]);

                    $table = $payload['table_id'] ?? $payload['tableId'] ?? null;
                    if (!$table) {
                        return response()->json(['ok' => false, 'error' => 'table_id is required'], 422);
                    }

                    // Get table info from database to get correct table_name
                    $tableInfo = \App\Helpers\TableHelper::getTableInfo($table);
                    $tableName = $tableInfo ? $tableInfo['table_name'] : "Table {$table}";
                    $tableOnly = $table;

                    $id = DB::table('notifications')->insertGetId([
                        'type'       => 'table_note',
                        'title'      => "Note from {$tableName}",
                        'table_id'   => (string)$tableOnly,
                        'table_name' => $tableName,
                        'payload'    => json_encode([
                            'note'    => $payload['note'],
                            'details' => $tableName,
                        ], JSON_UNESCAPED_UNICODE),
                        'status'     => 'new',
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);

                    return response()->json(['ok' => true, 'notification_id' => $id], 201);
                });
            });
        });

        // Theme settings JSON for Next.js (serve from 8000)
        Route::get('/simple-theme', function () {
            $tables = [
                // Prefer new code
                ['name' => 'themes', 'code' => 'frontend-theme'],
                ['name' => 'ti_themes', 'code' => 'frontend-theme'],
                // Legacy fallback
                ['name' => 'themes', 'code' => 'paymydine-nextjs'],
                ['name' => 'ti_themes', 'code' => 'paymydine-nextjs'],
            ];
            $row = null;
            foreach ($tables as $t) {
                try {
                    $candidate = DB::table($t['name'])->where('code', $t['code'])->select('data')->first();
                    if ($candidate && !empty($candidate->data)) { $row = $candidate; break; }
                } catch (Exception $e) {
                \Log::error('PMD_ORDER_DEBUG exception', [
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'payload_all' => request()->all(),
                    'raw' => request()->getContent(),
                ]); /* table may not exist, keep trying */ }
            }

            if ($row && !empty($row->data)) {
                $data = json_decode($row->data, true) ?: [];
                $adminTheme = $data['theme_configuration'] ?? 'light';
                $map = [
                    'light' => 'clean-light',
                    'dark' => 'modern-dark',
                    'gold' => 'gold-luxury',
                    'colorful' => 'vibrant-colors',
                    'minimal' => 'minimal',
                ];
                $frontend = $map[$adminTheme] ?? 'clean-light';
                return response()->json([
                    'success' => true,
                    'admin_theme' => $adminTheme,
                    'frontend_theme' => $frontend,
                    'data' => [
                        'theme_id' => $frontend,
                        'primary_color' => $data['primary_color'] ?? '#E7CBA9',
                        'secondary_color' => $data['secondary_color'] ?? '#EFC7B1',
                        'accent_color' => $data['accent_color'] ?? '#3B3B3B',
                        'background_color' => $data['background_color'] ?? '#FAFAFA',
                    ],
                ]);
            }

            return response()->json([
                'success' => true,
                'admin_theme' => 'NOT_FOUND',
                'frontend_theme' => 'clean-light',
                'data' => [
                    'theme_id' => 'clean-light',
                    'primary_color' => '#E7CBA9',
                    'secondary_color' => '#EFC7B1',
                    'accent_color' => '#3B3B3B',
                    'background_color' => '#FAFAFA',
                ],
            ]);
        });

        // VAT settings JSON for Next.js (serve from 8000) - same pattern as /simple-theme
        Route::get('/vat-settings', function () {
            try {
                $settings = DB::table('settings')->get()->keyBy('item');

                return response()->json([
                    'success' => true,
                    'data' => [
                        'vat_mode' => $settings['tax_mode']->value ?? '0',
                        'vat_percentage' => $settings['tax_percentage']->value ?? '0',
                        'vat_menu_price' => $settings['tax_menu_price']->value ?? '1',
                        'tax_mode' => $settings['tax_mode']->value ?? '0', // Legacy compatibility
                        'tax_percentage' => $settings['tax_percentage']->value ?? '0', // Legacy compatibility
                        'tax_menu_price' => $settings['tax_menu_price']->value ?? '1', // Legacy compatibility
                    ],
                ]);
            } catch (Exception $e) {
                \Log::error('PMD_ORDER_DEBUG exception', [
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'payload_all' => request()->all(),
                    'raw' => request()->getContent(),
                ]);
                return response()->json([
                    'success' => true,
                    'data' => [
                        'vat_mode' => '0',
                        'vat_percentage' => '0',
                        'vat_menu_price' => '1',
                        'tax_mode' => '0', // Legacy compatibility
                        'tax_percentage' => '0', // Legacy compatibility
                        'tax_menu_price' => '1', // Legacy compatibility
                    ],
                ]);
            }
        });

        // Validate coupon code - same pattern as /vat-settings
        Route::post('/validate-coupon', function (\Illuminate\Http\Request $request) {
            try {
                $code = strtoupper(trim($request->input('code', '')));
                $subtotal = floatval($request->input('subtotal', $request->input('amount', 0)));

                if (empty($code)) {
                    return response()->json([
                        'success' => false,
                        'valid' => false,
                        'message' => 'Coupon code is required'
                    ]);
                }

                // Find coupon by code
                // Use 'igniter_coupons' - Laravel will automatically add the 'ti_' prefix
                $coupon = DB::table('igniter_coupons')
                    ->where('code', $code)
                    ->where('status', 1)
                    ->first();

                if (!$coupon) {
                    return response()->json([
                        'success' => false,
                        'valid' => false,
                        'message' => 'Invalid coupon code'
                    ]);
                }

                // Check minimum total requirement
                if ($coupon->min_total && $subtotal < $coupon->min_total) {
                    return response()->json([
                        'success' => false,
                        'valid' => false,
                        'message' => 'Minimum order total of $' . number_format($coupon->min_total, 2) . ' required'
                    ]);
                }

                // Calculate discount
                $discount = 0;
                if ($coupon->type === 'F') {
                    // Fixed amount
                    $discount = min(floatval($coupon->discount), $subtotal);
                } else {
                    // Percentage
                    $discount = $subtotal * (floatval($coupon->discount) / 100);
                }

                return response()->json([
                    'success' => true,
                    'valid' => true,
                    'message' => 'Coupon applied',
                    'code' => $coupon->code,
                    'discountAmount' => $coupon->type === 'F' ? floatval($coupon->discount) : null,
                    'discountPercent' => $coupon->type === 'P' ? floatval($coupon->discount) : null,
                    'discountType' => $coupon->type,
                    'finalDiscountAmount' => round($discount, 2),
                    'data' => [
                        'coupon_id' => $coupon->coupon_id,
                        'code' => $coupon->code,
                        'name' => $coupon->name,
                        'type' => $coupon->type,
                        'discount' => round($discount, 2),
                        'discount_value' => floatval($coupon->discount),
                        'min_total' => floatval($coupon->min_total ?? 0),
                    ]
                ]);
            } catch (Exception $e) {
                \Log::error('PMD_ORDER_DEBUG exception', [
                    'message' => $e->getMessage(),
                    'file' => $e->getFile(),
                    'line' => $e->getLine(),
                    'payload_all' => request()->all(),
                    'raw' => request()->getContent(),
                ]);
                return response()->json([
                    'success' => false,
                    'valid' => false,
                    'message' => 'Failed to validate coupon: ' . $e->getMessage()
                ]);
            }
        });

        // If the active theme is frontend-theme, proxy root to Next.js server so URL stays 127.0.0.1:8000
        Route::get('/', function () {
            $active = params('default_themes.main', config('system.defaultTheme'));
            if ($active === 'frontend-theme') {
                // stream/proxy Next content
                $next = env('NEXT_PROXY_ORIGIN', 'http://localhost:3001');
                $ch = curl_init($next.'/');
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_HEADER, false);
                curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
                $resp = curl_exec($ch);
                $ctype = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'text/html; charset=UTF-8';
                curl_close($ch);
                return response($resp)->header('Content-Type', $ctype);
            }
            return app('System\\Classes\\Controller')->run('/');
        });

        // Catch-all: proxy all paths to Next when frontend-theme is active, otherwise run TI controller
        Route::any('{slug?}', function ($slug = null) {
            $active = params('default_themes.main', config('system.defaultTheme'));
            if ($active === 'frontend-theme') {
                $path = '/'.ltrim($slug ?? '', '/');
                // Exclusions to keep backend working
                $exclusions = [
                    '/admin',
                    config('system.assetsCombinerUri', '/_assets'),
                    '/api',
                    '/api-server.php',
                    '/simple-theme',
                    '/vat-settings',
                    '/validate-coupon',
                    '/orders',
                ];
                foreach ($exclusions as $ex) {
                    if ($path === $ex || strpos($path, rtrim($ex,'/').'/') === 0) {
                        return app('System\\Classes\\Controller')->run($path);
                    }
                }

                $next = env('NEXT_PROXY_ORIGIN', 'http://localhost:3001');
                // Preserve query string and path
                $uri = request()->getRequestUri();
                $target = rtrim($next, '/').'/'.ltrim($uri, '/');

                $ch = curl_init($target);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_HEADER, false);
                curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
                // Forward method/body
                $method = request()->getMethod();
                if ($method !== 'GET') {
                    curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
                    curl_setopt($ch, CURLOPT_POSTFIELDS, request()->getContent());
                }
                $resp = curl_exec($ch);
                $ctype = curl_getinfo($ch, CURLINFO_CONTENT_TYPE) ?: 'text/html; charset=UTF-8';
                curl_close($ch);

                return response($resp)->header('Content-Type', $ctype);
            }

            return app('System\\Classes\\Controller')->run($slug);
        })->where('slug', '(.*)?');
    });
});
// Updated: Thu Aug 21 22:21:44 CEST 2025


/* PMD_WORLDLINE_PUBLIC_API_ROUTES */
Route::get('/api/v1/payments/worldline/debug-config', function () {
    try {
        $svc = new \Admin\Classes\WorldlineHostedCheckoutService();
        $cfg = $svc->getConfig();

        return response()->json([
            'ok' => true,
            'provider' => 'worldline',
            'environment' => $svc->getEnvironment($cfg),
            'config_id' => $cfg['config_id'],
            'merchant_id_present' => !empty($cfg['merchant_id']),
            'api_key_id_present' => !empty($cfg['api_key_id']),
            'secret_api_key_present' => !empty($cfg['secret_api_key']),
            'webhook_secret_present' => !empty($cfg['webhook_secret']),
            'api_endpoint' => $cfg['api_endpoint'],
        ]);
    } catch (\Throwable $e) {
        \Log::error('WORLDLINE DEBUG CONFIG ERROR (PUBLIC API)', [
            'message' => $e->getMessage(),
        ]);

        return response()->json([
            'ok' => false,
            'provider' => 'worldline',
            'error' => $e->getMessage(),
        ], 500);
    }
});

Route::post('/api/v1/payments/worldline/create-hosted-checkout', function (\Illuminate\Http\Request $request) {
    try {
        $svc = new \Admin\Classes\WorldlineHostedCheckoutService();

        $payload = [
            'amount_minor' => (int) $request->input('amount_minor', 0),
            'currency' => (string) $request->input('currency', 'EUR'),
            'return_url' => (string) $request->input('return_url', url('/order-placed')),
            'locale' => (string) $request->input('locale', 'en_GB'),
            'country_code' => (string) $request->input('country_code', 'DE'),
            'merchant_customer_id' => (string) $request->input('merchant_customer_id', 'PMD-MIMOZA-TEST'),
        ];

        \Log::info('WORLDLINE CREATE HOSTED CHECKOUT HIT (PUBLIC API)', [
            'payload' => $payload,
            'host' => request()->getHost(),
        ]);

        $result = $svc->createHostedCheckout($payload);

        \Log::info('WORLDLINE CREATE HOSTED CHECKOUT OK (PUBLIC API)', $result);

        return response()->json([
            'ok' => true,
            'provider' => 'worldline',
            'redirect_url' => $result['redirect_url'],
            'hosted_checkout_id' => $result['hosted_checkout_id'],
            'environment' => $result['environment'],
            'meta' => $result['request_meta'],
        ]);
    } catch (\Throwable $e) {
        \Log::error('WORLDLINE CREATE HOSTED CHECKOUT ERROR (PUBLIC API)', [
            'message' => $e->getMessage(),
            'class' => get_class($e),
            'statusCode' => method_exists($e, 'getStatusCode') ? $e->getStatusCode() : null,
            'errorId' => method_exists($e, 'getErrorId') ? $e->getErrorId() : null,
            'responseBody' => method_exists($e, 'getResponseBody') ? $e->getResponseBody() : null,
            'trace' => $e->getTraceAsString(),
        ]);

        return response()->json([
            'ok' => false,
            'provider' => 'worldline',
            'error' => $e->getMessage(),
        ], 500);
    }
});

Route::match(['GET','POST'], '/api/v1/worldline/webhook', function (\Illuminate\Http\Request $request) {
    try {
        \Log::info('WORLDLINE WEBHOOK HIT (PUBLIC API)', [
            'host' => request()->getHost(),
            'headers' => $request->headers->all(),
            'payload' => $request->all(),
            'raw' => $request->getContent(),
        ]);

        return response()->json([
            'ok' => true,
            'provider' => 'worldline',
            'message' => 'Webhook received and logged. Signature verification comes in phase 2.',
        ]);
    } catch (\Throwable $e) {
        \Log::error('WORLDLINE WEBHOOK ERROR (PUBLIC API)', [
            'message' => $e->getMessage(),
        ]);

        return response()->json([
            'ok' => false,
            'provider' => 'worldline',
            'error' => $e->getMessage(),
        ], 500);
    }
});
/* /PMD_WORLDLINE_PUBLIC_API_ROUTES */




Route::get('/api/v1/payments/worldline/auth-diagnostic', function () {
    try {
        $svc = new \Admin\Classes\WorldlineHostedCheckoutService();
        $diag = $svc->getConfigForDiagnostics();

        \Log::info('WORLDLINE AUTH DIAGNOSTIC', $diag);

        return response()->json([
            'ok' => true,
            'provider' => 'worldline',
            'diagnostic' => $diag,
            'note' => 'If hosted checkout still returns authorization error, the endpoint is reachable but the credential set is not accepted for this merchant/environment combination.',
        ]);
    } catch (\Throwable $e) {
        \Log::error('WORLDLINE AUTH DIAGNOSTIC ERROR', [
            'message' => $e->getMessage(),
            'trace' => $e->getTraceAsString(),
        ]);

        return response()->json([
            'ok' => false,
            'provider' => 'worldline',
            'error' => $e->getMessage(),
        ], 500);
    }
});



Route::get('/api/v1/payments/worldline/status/{hostedCheckoutId}', function ($hostedCheckoutId) {
    try {
        $svc = new \Admin\Classes\WorldlineHostedCheckoutService();
        $result = $svc->getHostedCheckoutStatus((string)$hostedCheckoutId);

        \Log::info('WORLDLINE STATUS CHECK', $result);

        return response()->json([
            'ok' => true,
            'provider' => 'worldline',
            'result' => $result,
        ]);
    } catch (\Throwable $e) {
        \Log::error('WORLDLINE STATUS CHECK ERROR', [
            'message' => $e->getMessage(),
            'class' => get_class($e),
            'trace' => $e->getTraceAsString(),
        ]);

        return response()->json([
            'ok' => false,
            'provider' => 'worldline',
            'error' => $e->getMessage(),
        ], 500);
    }
});

Route::get('/api/v1/payments/worldline/return', function (\Illuminate\Http\Request $request) {
    try {
        $svc = new \Admin\Classes\WorldlineHostedCheckoutService();

        $hostedCheckoutId = (string)$request->query('hostedCheckoutId', '');
        $returnMac = (string)$request->query('RETURNMAC', '');

        if ($hostedCheckoutId === '') {
            return response()->json([
                'ok' => false,
                'provider' => 'worldline',
                'error' => 'Missing hostedCheckoutId on return URL',
            ], 422);
        }

        $host = request()->getHost();
        $saved = $svc->getCheckoutSession($host, $hostedCheckoutId);

        if (!$saved) {
            return response()->json([
                'ok' => false,
                'provider' => 'worldline',
                'error' => 'Hosted checkout session not found locally',
                'hosted_checkout_id' => $hostedCheckoutId,
            ], 404);
        }

        $savedReturnMac = (string)($saved['return_mac'] ?? '');
        $returnMacMatches = $savedReturnMac !== '' && $returnMac !== '' && hash_equals($savedReturnMac, $returnMac);

        $status = $svc->getHostedCheckoutStatus($hostedCheckoutId);

        \Log::info('WORLDLINE RETURN HANDLER', [
            'host' => $host,
            'hosted_checkout_id' => $hostedCheckoutId,
            'return_mac_matches' => $returnMacMatches,
            'status' => $status,
        ]);

        return response()->json([
            'ok' => true,
            'provider' => 'worldline',
            'hosted_checkout_id' => $hostedCheckoutId,
            'return_mac_matches' => $returnMacMatches,
            'saved_session' => $saved,
            'status_result' => $status,
        ]);
    } catch (\Throwable $e) {
        \Log::error('WORLDLINE RETURN HANDLER ERROR', [
            'message' => $e->getMessage(),
            'class' => get_class($e),
            'trace' => $e->getTraceAsString(),
        ]);

        return response()->json([
            'ok' => false,
            'provider' => 'worldline',
            'error' => $e->getMessage(),
        ], 500);
    }
});
