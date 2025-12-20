<?php

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
        // Return empty array if there's an error fetching options
        return [];
    }
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
        // Load Gift Card routes
        require __DIR__ . '/routes_gift_cards.php';
        
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
                // Menu endpoints
                Route::get('/menu', function () {
                    try {
                        // Get menu items with categories (matching old API structure)
                        $p = DB::connection()->getTablePrefix();
                        $query = "
                            SELECT 
                                m.menu_id as id,
                                m.menu_name as name,
                                m.menu_description as description,
                                CAST(m.menu_price AS DECIMAL(10,2)) as price,
                                COALESCE(c.name, 'Main') as category_name,
                                ma.name as image
                            FROM {$p}menus m
                            LEFT JOIN {$p}menu_categories mc ON m.menu_id = mc.menu_id
                            LEFT JOIN {$p}categories c ON mc.category_id = c.category_id
                            LEFT JOIN {$p}media_attachments ma ON ma.attachment_type = 'menus' 
                                AND ma.attachment_id = m.menu_id 
                                AND ma.tag = 'thumb'
                            WHERE m.menu_status = 1
                            ORDER BY c.priority ASC, m.menu_name ASC
                        ";
                        
                        $items = DB::select($query);
                        
                        // Convert prices to float, fix image paths, and add options
                        foreach ($items as &$item) {
                            $item->price = (float)$item->price;
                            if ($item->image) {
                                // If image exists, construct the relative URL for Next.js proxy
                                $item->image = "/api/media/" . $item->image;
                            } else {
                                // Use default image if none exists
                                $item->image = '/images/pasta.png';
                            }
                            
                            // Mark as regular menu item (not a combo)
                            $item->isCombo = false;
                            $item->comboId = null;
                            
                            // Fetch menu options for this item
                            $item->options = getMenuItemOptions($item->id);
                        }
                        
                        // Get combos from menu_combos table
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
                        
                        $combos = DB::select($combosQuery);
                        
                        // Format combos same as menu items
                        foreach ($combos as &$combo) {
                            $combo->price = (float)$combo->price;
                            if ($combo->image) {
                                // If image exists, construct the relative URL for Next.js proxy
                                $combo->image = "/api/media/" . $combo->image;
                            } else {
                                // Use default image if none exists
                                $combo->image = '/images/pasta.png';
                            }
                            
                            // Mark as combo
                            $combo->isCombo = true;
                            $combo->comboId = $combo->id;
                            
                            // Combos don't have options (they're pre-configured)
                            $combo->options = [];
                        }
                        
                        // Merge combos with regular menu items
                        $allItems = array_merge($items, $combos);
                        
                        // Get all enabled categories
                        $categoriesQuery = "
                            SELECT category_id as id, name, priority 
                            FROM {$p}categories 
                            WHERE status = 1 
                            ORDER BY priority ASC, name ASC
                        ";
                        $categories = DB::select($categoriesQuery);
                        
                        // Add "Combos" category if it doesn't exist and we have combos
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
                        
                        return response()->json([
                            'success' => true,
                            'data' => [
                                'items' => $allItems,
                                'categories' => $categories
                            ]
                        ]);

                    } catch (\Exception $e) {
                        return response()->json([
                            'success' => false,
                            'error' => 'Failed to fetch menu',
                            'message' => $e->getMessage()
                        ], 500);
                    }
                });

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
                        return response()->json([
                            'success' => false,
                            'error' => 'Internal server error: ' . $e->getMessage()
                        ], 500);
                    }
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
                        \Log::info('Square Payload', ['payload' => $squarePayload]);
                        // $cloverPayload     = formatOrderForCloverAPI($order, $items);
                        // $lightspeedPayload = formatOrderForLightspeedAPI($order, $items);

                        $baseUrl = 'https://pay-my-dine-api-pos.onrender.com';

                        foreach ($configs as $config) {

                            $device      = $config->devices;
                            $posCode     = strtolower($device->code ?? '');
                            $accessToken = $config->access_token ?? null;

                            if (!$posCode || !$accessToken) continue;

                            $url = null;
                            $payload = null;

                            switch ($posCode) {
                                case 'square':
                                    $url = "$baseUrl/api/pos/square/order/create";
                                    $payload = $squarePayload;
                                    break;

                                case 'clover':
                                    $url = "$baseUrl/api/pos/clover/order";
                                    if (!empty($config->id_application)) {
                                        $url .= '?merchantId=' . urlencode($config->id_application);
                                    }
                                    $payload = $cloverPayload;
                                    break;

                                case 'lightspeed':
                                    $url = "$baseUrl/api/pos/lightspeed/order";
                                    if (!empty($config->id_application)) {
                                        $url .= '?domainPrefix=' . urlencode($config->id_application);
                                    }
                                    $payload = $lightspeedPayload;
                                    break;

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
                        \Log::error('API: POS sync failed', [
                            'order_id' => $orderId,
                            'error'    => $e->getMessage()
                        ]);
                    }
                }

                function formatOrderForSquareAPI($order, $items)
                {
                    return [
                        'order_id' => $order->order_id,
                        'location_id' => $order->location_id,
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
                                'name'  => $item->name,
                                'price' => intval($item->price * 100),
                                'unitQty' => [
                                    'unit'     => 'UNIT',
                                    'quantity' => (int)$item->quantity,
                                ],
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
                                    'quantity' => (int)$item->quantity,
                                    'price'    => (float)$item->price,
                                    'price_total' => $item->quantity * $item->price,
                                ];
                            })->toArray(),
                            'created_at' => now()->toIso8601String(),
                        ],
                        'provider' => 'lightspeed',
                    ];
                }
                
                // Orders endpoint
                Route::post('/orders', function () {
                    try {
                        $input = request()->all();
                        
                        // Validate required fields
                        if (empty($input['table_id']) || empty($input['items']) || empty($input['customer_name'])) {
                            return response()->json([
                                'success' => false,
                                'error' => 'Missing required fields: table_id, items, customer_name'
                            ], 400);
                        }
                        
                        // Insert order
                        $orderId = DB::table('orders')->insertGetId([
                            'customer_id' => 1, // Default customer
                            'first_name' => $input['customer_name'],
                            'last_name' => '',
                            'email' => $input['customer_email'] ?? '',
                            'telephone' => $input['customer_phone'] ?? '',
                            'location_id' => $input['location_id'] ?? 1,
                            'cart' => json_encode($input['items']),
                            'total_items' => count($input['items']),
                            'comment' => $input['special_instructions'] ?? '',
                            'payment' => $input['payment_method'] ?? 'cash',
                            'order_type' => $input['table_id'], // Store actual table_id instead of 'dine_in'
                            'order_time' => now()->format('H:i:s'),
                            'order_date' => now()->format('Y-m-d'),
                            'order_total' => $input['total_amount'],
                            'status_id' => 1, // Received status
                            'created_at' => now(),
                            'updated_at' => now(),
                            'order_time_is_asap' => 1,
                            'ms_order_type' => 'dine_in'
                        ]);
                        
                        // Insert order menu items
                        foreach ($input['items'] as $item) {
                            // Calculate total price including options
                            $itemTotal = $item['price'] * $item['quantity'];
                            
                            // Insert order menu item
                            $orderMenuId = DB::table('order_menus')->insertGetId([
                                'order_id' => $orderId,
                                'menu_id' => $item['menu_id'],
                                'name' => $item['name'],
                                'quantity' => $item['quantity'],
                                'price' => $item['price'],
                                'subtotal' => $itemTotal,
                                'option_values' => '',
                                'comment' => ''
                            ]);
                            
                            // Process selected options and add their prices
                            if (!empty($item['options'])) {
                                foreach ($item['options'] as $optionType => $optionValueId) {
                                    // Get option details from menu options
                                    $optionValue = DB::table('menu_option_values')
                                        ->where('option_value_id', $optionValueId)
                                        ->first();
                                    
                                    if ($optionValue) {
                                        // Get the menu option ID for this option type
                                        $menuOption = DB::table('menu_item_options')
                                            ->where('menu_id', $item['menu_id'])
                                            ->where('option_id', function($query) use ($optionType) {
                                                $query->select('option_id')
                                                      ->from('menu_options')
                                                      ->where('option_name', $optionType);
                                            })
                                            ->first();
                                        
                                        if ($menuOption) {
                                            // Insert into order_menu_options table
                                            DB::table('order_menu_options')->insert([
                                                'order_id' => $orderId,
                                                'menu_id' => $item['menu_id'],
                                                'order_option_name' => $optionValue->value,
                                                'order_option_price' => $optionValue->price,
                                                'order_menu_id' => $orderMenuId,
                                                'order_menu_option_id' => $menuOption->menu_option_id,
                                                'menu_option_value_id' => $optionValueId,
                                                'quantity' => $item['quantity']
                                            ]);
                                            
                                            $itemTotal += $optionValue->price * $item['quantity'];
                                        }
                                    }
                                }
                                
                                // Update the subtotal with option prices
                                DB::table('order_menus')
                                    ->where('order_menu_id', $orderMenuId)
                                    ->update(['subtotal' => $itemTotal]);
                            }
                        }
                        
                        // Calculate actual subtotal from items and options
                        $subtotal = 0;
                        foreach ($input['items'] as $item) {
                            $itemTotal = $item['price'] * $item['quantity'];
                            
                            // Add option prices if they exist
                            if (!empty($item['options'])) {
                                foreach ($item['options'] as $optionType => $optionValueId) {
                                    $optionValue = DB::table('menu_option_values')
                                        ->where('option_value_id', $optionValueId)
                                        ->first();
                                    
                                    if ($optionValue) {
                                        $itemTotal += $optionValue->price * $item['quantity'];
                                    }
                                }
                            }
                            
                            $subtotal += $itemTotal;
                        }
                        
                        // Get service percentage from location settings (fallback to 10%)
                        $servicePercentage = 0.10; // Default fallback
                        if (isset($input['location_id'])) {
                            $serviceSetting = DB::table('location_options')
                                ->where('location_id', $input['location_id'])
                                ->where('item', 'service_charge_percentage')
                                ->first();
                            
                            if ($serviceSetting && isset($serviceSetting->value)) {
                                $serviceData = json_decode($serviceSetting->value, true);
                                if (isset($serviceData['value'])) {
                                    $servicePercentage = floatval($serviceData['value']) / 100;
                                }
                            }
                        }
                        
                        $serviceFee = $subtotal * $servicePercentage;
                        $tipAmount = $input['tip_amount'] ?? 0;
                        
                        // Handle coupon discount
                        $couponDiscount = 0;
                        $couponId = null;
                        $couponCode = null;
                        
                        if (!empty($input['coupon_code']) && isset($input['coupon_discount']) && $input['coupon_discount'] > 0) {
                            $couponDiscount = floatval($input['coupon_discount']);
                            $couponCode = $input['coupon_code'];
                            
                            // Get coupon ID from database
                            $coupon = DB::table('ti_igniter_coupons')
                                ->where('code', $couponCode)
                                ->first();
                            
                            if ($coupon) {
                                $couponId = $coupon->coupon_id;
                            }
                        }
                        
                        $total = $subtotal + $serviceFee + $tipAmount - $couponDiscount;
                        
                        DB::table('order_totals')->insert([
                            'order_id' => $orderId,
                            'code' => 'subtotal',
                            'title' => 'Subtotal',
                            'value' => $subtotal,
                            'priority' => 1,
                            'is_summable' => 1
                        ]);
                        
                        if ($serviceFee > 0) {
                            DB::table('order_totals')->insert([
                                'order_id' => $orderId,
                                'code' => 'service',
                                'title' => 'Service (' . round($servicePercentage * 100) . '%)',
                                'value' => $serviceFee,
                                'priority' => 2,
                                'is_summable' => 1
                            ]);
                        }
                        
                        if ($tipAmount > 0) {
                            DB::table('order_totals')->insert([
                                'order_id' => $orderId,
                                'code' => 'tip',
                                'title' => 'Tip',
                                'value' => $tipAmount,
                                'priority' => 3,
                                'is_summable' => 1
                            ]);
                        }
                        
                        // Save coupon discount to order_totals
                        if ($couponDiscount > 0) {
                            DB::table('order_totals')->insert([
                                'order_id' => $orderId,
                                'code' => 'coupon',
                                'title' => 'Coupon (' . $couponCode . ')',
                                'value' => -$couponDiscount, // Negative value for discount
                                'priority' => 3.5,
                                'is_summable' => 1
                            ]);
                            
                            // Save coupon history
                            if ($couponId) {
                                try {
                                    DB::table('ti_igniter_coupons_history')->insert([
                                        'coupon_id' => $couponId,
                                        'order_id' => $orderId,
                                        'customer_id' => 1, // Default customer, can be updated if customer tracking is added
                                        'code' => $couponCode,
                                        'min_total' => $coupon->min_total ?? null,
                                        'amount' => $couponDiscount,
                                        'status' => 1,
                                        'created_at' => now(),
                                        'updated_at' => now()
                                    ]);
                                    
                                    \Log::info('Coupon history saved', [
                                        'coupon_id' => $couponId,
                                        'order_id' => $orderId,
                                        'code' => $couponCode,
                                        'discount' => $couponDiscount
                                    ]);
                                } catch (\Exception $e) {
                                    \Log::error('Failed to save coupon history', [
                                        'error' => $e->getMessage(),
                                        'coupon_id' => $couponId,
                                        'order_id' => $orderId
                                    ]);
                                }
                            }
                        }
                        
                        DB::table('order_totals')->insert([
                            'order_id' => $orderId,
                            'code' => 'total',
                            'title' => 'Total',
                            'value' => $total,
                            'priority' => 4,
                            'is_summable' => 0
                        ]);
                        
                        \Log::info('API: Order submitted', ['order_id' => $orderId]);
                        
                        syncOrderToPOS($orderId);

                        \Log::info('API: Order sync to POS initiated', ['order_id' => $orderId]);
                        
                        return response()->json([
                            'success' => true,
                            'message' => 'Order submitted successfully',
                            'order_id' => $orderId,
                            'breakdown' => [
                                'subtotal' => round($subtotal, 2),
                                'service' => round($serviceFee, 2),
                                'service_percentage' => round($servicePercentage * 100, 1),
                                'tip' => round($tipAmount, 2),
                                'coupon_discount' => round($couponDiscount, 2),
                                'total' => round($total, 2)
                            ]
                        ]);
                        
                    } catch (Exception $e) {
                        return response()->json([
                            'success' => false,
                            'error' => 'Failed to submit order: ' . $e->getMessage()
                        ], 500);
                    }
                });
                
                // Menu endpoints
                Route::get('/menu', function () {
                    try {
                        // Get menu items with categories (matching old API structure)
                        $p = DB::connection()->getTablePrefix();
                        $query = "
                            SELECT 
                                m.menu_id as id,
                                m.menu_name as name,
                                m.menu_description as description,
                                CAST(m.menu_price AS DECIMAL(10,2)) as price,
                                COALESCE(c.name, 'Main') as category_name,
                                ma.name as image
                            FROM {$p}menus m
                            LEFT JOIN {$p}menu_categories mc ON m.menu_id = mc.menu_id
                            LEFT JOIN {$p}categories c ON mc.category_id = c.category_id
                            LEFT JOIN {$p}media_attachments ma ON ma.attachment_type = 'menus' 
                                AND ma.attachment_id = m.menu_id 
                                AND ma.tag = 'thumb'
                            WHERE m.menu_status = 1
                            ORDER BY c.priority ASC, m.menu_name ASC
                        ";
                        
                        $items = DB::select($query);
                        
                        // Convert prices to float, fix image paths, and add options
                        foreach ($items as &$item) {
                            $item->price = (float)$item->price;
                            if ($item->image) {
                                // If image exists, construct the relative URL for Next.js proxy
                                $item->image = "/api/media/" . $item->image;
                            } else {
                                // Use default image if none exists
                                $item->image = '/images/pasta.png';
                            }
                            
                            // Fetch menu options for this item
                            $item->options = getMenuItemOptions($item->id);
                        }
                        
                        // Get all enabled categories
                        $categoriesQuery = "
                            SELECT category_id as id, name, priority 
                            FROM {$p}categories 
                            WHERE status = 1 
                            ORDER BY priority ASC, name ASC
                        ";
                        $categories = DB::select($categoriesQuery);
                        
                        return response()->json([
                            'success' => true,
                            'data' => [
                                'items' => $items,
                                'categories' => $categories
                            ]
                        ]);

                    } catch (\Exception $e) {
                        return response()->json([
                            'success' => false,
                            'error' => 'Failed to fetch menu',
                            'message' => $e->getMessage()
                        ], 500);
                    }
                });

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
                } catch (Exception $e) { /* table may not exist, keep trying */ }
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

        // Tax settings JSON for Next.js (serve from 8000) - same pattern as /simple-theme
        Route::get('/tax-settings', function () {
            try {
                $settings = DB::table('settings')->get()->keyBy('item');
                
                return response()->json([
                    'success' => true,
                    'data' => [
                        'tax_mode' => $settings['tax_mode']->value ?? '0',
                        'tax_percentage' => $settings['tax_percentage']->value ?? '0',
                        'tax_menu_price' => $settings['tax_menu_price']->value ?? '1',
                    ],
                ]);
            } catch (Exception $e) {
                return response()->json([
                    'success' => true,
                    'data' => [
                        'tax_mode' => '0',
                        'tax_percentage' => '0',
                        'tax_menu_price' => '1',
                    ],
                ]);
            }
        });

        // Validate coupon code - same pattern as /tax-settings
        Route::post('/validate-coupon', function (\Illuminate\Http\Request $request) {
            try {
                $code = strtoupper(trim($request->input('code', '')));
                $subtotal = floatval($request->input('subtotal', 0));
                
                if (empty($code)) {
                    return response()->json([
                        'success' => false,
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
                        'message' => 'Invalid coupon code'
                    ]);
                }
                
                // Check minimum total requirement
                if ($coupon->min_total && $subtotal < $coupon->min_total) {
                    return response()->json([
                        'success' => false,
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
                    'data' => [
                        'coupon_id' => $coupon->coupon_id,
                        'code' => $coupon->code,
                        'name' => $coupon->name,
                        'type' => $coupon->type,
                        'discount' => $discount,
                        'discount_value' => floatval($coupon->discount),
                        'min_total' => floatval($coupon->min_total ?? 0),
                    ]
                ]);
            } catch (Exception $e) {
                return response()->json([
                    'success' => false,
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
        Route::any('{slug}', function ($slug) {
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
                    '/tax-settings',
                    '/validate-coupon',
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