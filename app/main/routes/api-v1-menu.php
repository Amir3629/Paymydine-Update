<?php

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

