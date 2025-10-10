

=== routes.php (LINES 601-1053) ===
                'items.*.quantity' => 'required|integer|min:1',
                'items.*.price' => 'required|numeric|min:0',
                'total_amount' => 'required|numeric|min:0',
                'payment_method' => 'required|in:cash,card,paypal'
            ];
            
            // Only require table_id and table_name if not in cashier mode
            if (!$isCashier) {
                $validationRules['table_id'] = 'required|string|max:50';
                $validationRules['table_name'] = 'required|string|max:100';
            }
            
            $request->validate($validationRules);

            DB::beginTransaction();

            // Get next order number
            $orderNumber = DB::table('orders')->max('order_id') + 1;

            // Build order comment with table information or cashier mode
            $comment = '';
            if ($isCashier) {
                $comment .= "Cashier Order | ";
            } else {
                if ($request->has('table_id') && $request->table_id) {
                    $comment .= "Table ID: " . $request->table_id . " | ";
                }
                if ($request->has('table_name') && $request->table_name) {
                    $comment .= "Table: " . $request->table_name . " | ";
                }
            }
            if ($request->has('special_instructions') && $request->special_instructions) {
                $comment .= "Special Instructions: " . $request->special_instructions;
            }
            $comment = trim($comment, ' |');

            // Create main order record
            $orderId = DB::table('orders')->insertGetId([
                'order_id' => $orderNumber,
                'first_name' => $request->customer_name,
                'last_name' => 'Customer', // Default last name
                'email' => $request->customer_email ?? 'customer@example.com', // Default email
                'telephone' => $request->customer_phone ?? '0000000000', // Default phone
                'location_id' => 1, // Default location
                'order_type' => $isCashier ? 'cashier' : $request->table_id, // Store cashier or table_id
                'order_total' => $request->total_amount,
                'order_date' => now()->format('Y-m-d'),
                'order_time' => now()->format('H:i:s'),
                'status_id' => 1,
                'assignee_id' => null,
                'comment' => $comment,
                'processed' => 0,
                'payment' => $request->payment_method,
                'total_items' => count($request->items),
                'ip_address' => $request->ip(),
                'user_agent' => $request->userAgent() ?? 'API Client',
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Insert order items
            foreach ($request->items as $item) {
                $menuItem = DB::table('menus')
                    ->where('menu_id', $item['menu_id'])
                    ->where('menu_status', 1)
                    ->first();

                if (!$menuItem) {
                    throw new \Exception("Menu item with ID {$item['menu_id']} not found");
                }

                DB::table('order_menus')->insert([
                    'order_id' => $orderId,
                    'menu_id' => $item['menu_id'],
                    'name' => $item['name'],
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'subtotal' => $item['price'] * $item['quantity'],
                    'comment' => $item['special_instructions'] ?? ''
                ]);
            }

            // Store tip amount if provided
            if ($request->tip_amount && $request->tip_amount > 0) {
                DB::table('order_totals')->insert([
                    'order_id' => $orderId,
                    'code' => 'tip',
                    'title' => 'Tip',
                    'value' => $request->tip_amount,
                    'priority' => 0
                ]);
            }

            // Store payment method
            DB::table('order_totals')->insert([
                'order_id' => $orderId,
                'code' => 'payment_method',
                'title' => 'Payment Method',
                'value' => $request->payment_method,
                'priority' => 0
            ]);

            DB::commit();

            // Return success response matching the expected format
            return response()->json([
                'success' => true,
                'order_id' => $orderId,
                'message' => 'Order placed successfully'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            
            return response()->json([
                'success' => false,
                'error' => 'Failed to create order',
                'message' => $e->getMessage()
            ], 500);
        }
    });

    // Order status endpoints
    Route::get('/order-status', function (Request $request) {
        $orderId = $request->get('order_id');
        
        if (!$orderId) {
            return response()->json([
                'error' => 'order_id is required'
            ], 400);
        }

        try {
            $order = DB::table('orders')
                ->leftJoin('statuses', 'orders.status_id', '=', 'statuses.status_id')
                ->where('orders.order_id', $orderId)
                ->select([
                    'orders.order_id',
                    'orders.status_id',
                    'statuses.status_name',
                    'orders.updated_at'
                ])
                ->first();

            if (!$order) {
                return response()->json([
                    'error' => 'Order not found'
                ], 404);
            }

            // Map status_id to customer-friendly status (matching frontend expectations)
            $statusMap = [
                1 => 'pending',
                2 => 'confirmed',
                3 => 'preparing',
                4 => 'ready',
                5 => 'delivered',
                6 => 'cancelled'
            ];

            // Map to frontend expected customer_status numbers (0=Kitchen, 1=Preparing, 2=On Way)
            $customerStatusMap = [
                1 => 0, // pending -> Kitchen
                2 => 0, // confirmed -> Kitchen
                3 => 1, // preparing -> Preparing
                4 => 2, // ready -> On Way
                5 => 2, // delivered -> On Way
                6 => 0  // cancelled -> Kitchen
            ];

            return response()->json([
                'success' => true,
                'data' => [
                    'order_id' => $order->order_id,
                    'status_id' => $order->status_id,
                    'status_name' => $statusMap[$order->status_id] ?? 'unknown',
                    'customer_status' => $customerStatusMap[$order->status_id] ?? 0,
                    'updated_at' => $order->updated_at
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to get order status',
                'message' => $e->getMessage()
            ], 500);
        }
    });

    Route::post('/order-status', function (Request $request) {
        $request->validate([
            'order_id' => 'required|integer',
            'status' => 'required|string|in:pending,confirmed,preparing,ready,delivered,cancelled'
        ]);

        try {
            $statusMap = [
                'pending' => 1,
                'confirmed' => 2,
                'preparing' => 3,
                'ready' => 4,
                'delivered' => 5,
                'cancelled' => 6
            ];

            $statusId = $statusMap[$request->status];

            $updated = DB::table('orders')
                ->where('order_id', $request->order_id)
                ->update([
                    'status_id' => $statusId,
                    'updated_at' => now()
                ]);

            if ($updated) {
                return response()->json([
                    'success' => true,
                    'message' => 'Order status updated successfully'
                ]);
            } else {
                return response()->json([
                    'success' => false,
                    'error' => 'Failed to update order status'
                ], 400);
            }

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to update order status',
                'message' => $e->getMessage()
            ], 500);
        }
    });

    // Table endpoints
    Route::get('/table-info', function (Request $request) {
        $tableId = $request->get('table_id');
        
        if (!$tableId) {
            return response()->json([
                'error' => 'table_id is required'
            ], 400);
        }

        try {
            $table = DB::table('tables')
                ->where('table_id', $tableId)
                ->first();

            if (!$table) {
                return response()->json([
                    'error' => 'Table not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'table_id' => $table->table_id,
                    'table_name' => $table->table_name,
                    'location_id' => $table->location_id,
                    'status' => $table->status ?? 'available'
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to get table info',
                'message' => $e->getMessage()
            ], 500);
        }
    });

    // Get current table info from URL parameters (for QR code system)
    Route::get('/current-table', function (Request $request) {
        try {
            // Get table info from URL parameters (set by QR redirect)
            $tableId = $request->get('table_id');
            $tableName = $request->get('table_name');
            
            if (!$tableId || !$tableName) {
                return response()->json([
                    'success' => false,
                    'error' => 'Table information not found in URL parameters'
                ], 400);
            }

            // Verify table exists in database
            $table = DB::table('tables')
                ->where('table_id', $tableId)
                ->first();

            if (!$table) {
                return response()->json([
                    'success' => false,
                    'error' => 'Table not found in database'
                ], 400);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'table_id' => $tableId,
                    'table_name' => $tableName,
                    'location_id' => $table->location_id ?? 1,
                    'status' => $table->status ?? 'available'
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to get current table info',
                'message' => $e->getMessage()
            ], 500);
        }
    });

    // Waiter call endpoint
    Route::post('/waiter-call', function (Request $request) {
        $request->validate([
            'table_id' => 'required|string',
            'message' => 'required|string|max:500'
        ]);
        
        try {
            // For testing, use a default tenant ID
            $tenantId = 1;
            
            // Use transaction for data consistency
            return DB::transaction(function() use ($request, $tenantId) {
                // Store waiter call
                $callId = DB::table('waiter_calls')->insertGetId([
                    'table_id' => $request->table_id,
                    'message' => $request->message,
                    'status' => 'new',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
                
                // Get table info for notification
                $tableInfo = \App\Helpers\TableHelper::getTableInfo($request->table_id);
                $tableName = $tableInfo ? $tableInfo['table_name'] : "Table {$request->table_id}";
                
                // Create notification directly
                DB::table('notifications')->insert([
                    'type'       => 'waiter_call',
                    'title'      => "Waiter called from {$tableName}",
                    'table_id'   => (string)$request->table_id,
                    'table_name' => $tableName,
                    'payload'    => json_encode(['message' => $request->message]),
                    'status'     => 'new',
                    'created_at' => \Carbon\Carbon::now(),
                    'updated_at' => \Carbon\Carbon::now(),
                ]);
                
                return response()->json([
                    'ok' => true,
                    'message' => 'Waiter called successfully',
                    'id' => $callId,
                    'created_at' => now()->toISOString()
                ], 201);
            });
            
        } catch (\Exception $e) {
            \Log::error('Waiter call failed', [
                'error' => $e->getMessage(),
                'table_id' => $request->table_id,
                'tenant' => $tenantId ?? 'unknown'
            ]);
            
            return response()->json([
                'ok' => false,
                'error' => 'Failed to process waiter call'
            ], 500);
        }
    });
    
    // Table notes endpoint
    Route::post('/table-notes', function (Request $request) {
        $request->validate([
            'table_id' => 'required|string',
            'note' => 'required|string|max:500',
            'timestamp' => 'required|date'
        ]);
        
        try {
            // For testing, use a default tenant ID
            $tenantId = 1;
            
            // Use transaction for data consistency
            return DB::transaction(function() use ($request, $tenantId) {
                // Store table note
                $noteId = DB::table('table_notes')->insertGetId([
                    'table_id' => $request->table_id,
                    'note' => $request->note,
                    'timestamp' => $request->timestamp,
                    'status' => 'new',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
                
                // Get table info for notification
                $tableInfo = \App\Helpers\TableHelper::getTableInfo($request->table_id);
                $tableName = $tableInfo ? $tableInfo['table_name'] : "Table {$request->table_id}";
                
                // Create notification directly
                DB::table('notifications')->insert([
                    'type'       => 'table_note',
                    'title'      => "Note from {$tableName}",
                    'table_id'   => (string)$request->table_id,
                    'table_name' => $tableName,
                    'payload'    => json_encode(['note' => $request->note]),
                    'status'     => 'new',
                    'created_at' => \Carbon\Carbon::now(),
                    'updated_at' => \Carbon\Carbon::now(),
                ]);
                
                return response()->json([
                    'ok' => true,
                    'message' => 'Note submitted successfully',
                    'id' => $noteId,
                    'created_at' => now()->toISOString()
                ], 201);
            });
            
        } catch (\Exception $e) {
            \Log::error('Table note failed', [
                'error' => $e->getMessage(),
                'table_id' => $request->table_id,
                'tenant' => $tenantId ?? 'unknown'
            ]);
            
            return response()->json([
                'ok' => false,
                'error' => 'Failed to process table note'
            ], 500);
        }
    });

});  // End of api/v1 tenant-scoped group

// Admin Notifications API (JSON) - Secured with admin auth and tenant detection
Route::middleware(['web', 'admin', 'detect.tenant'])->prefix('admin/notifications-api')->group(function () {
    Route::get('count', [\Admin\Controllers\NotificationsApi::class, 'count']);
    Route::get('/',     [\Admin\Controllers\NotificationsApi::class, 'index']);
    Route::patch('{id}', [\Admin\Controllers\NotificationsApi::class, 'update']);
    Route::patch('mark-all-seen', [\Admin\Controllers\NotificationsApi::class, 'markAllSeen']);
});
