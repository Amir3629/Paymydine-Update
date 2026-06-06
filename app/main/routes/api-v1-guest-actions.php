<?php

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
