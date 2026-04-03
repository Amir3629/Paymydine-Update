<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use App\Helpers\NotificationHelper;
use App\Support\Payments\PaymentMethodNormalizer;
use App\Support\Payments\PaymentVerificationService;

class OrderController extends Controller
{
    /**
     * Store a new order
     */
    public function store(Request $request)
    {
        \Log::info('PMD_API_ORDER_STORE_ENTER', [
            'payload' => $request->all(),
            'raw' => $request->getContent(),
            'connection_default' => DB::getDefaultConnection(),
        ]);

        $validator = Validator::make($request->all(), [
            'customer_name' => 'required|string|max:255',
            'customer_email' => 'nullable|email',
            'customer_phone' => 'nullable|string|max:20',
            'table_id' => 'nullable|string',
            'table_name' => 'nullable|string',
            'location_id' => 'nullable|integer',
            'items' => 'required|array|min:1',
            'items.*.menu_id' => 'required|integer',
            'items.*.name' => 'required|string',
            'items.*.quantity' => 'required|integer|min:1',
            'items.*.price' => 'required|numeric|min:0',
            'items.*.options' => 'nullable',
            'total_amount' => 'required|numeric|min:0',
            'tip_amount' => 'nullable|numeric|min:0',
            'tax_amount' => 'nullable|numeric|min:0',
            'coupon_code' => 'nullable|string|max:255',
            'coupon_discount' => 'nullable|numeric|min:0',
            'payment_method' => 'required|string|max:32',
            'stripe_payment_intent_id' => 'nullable|string|max:255',
            'paypal_order_id' => 'nullable|string|max:255',
            'paypal_capture_id' => 'nullable|string|max:255',
            'special_instructions' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            \Log::warning('PMD_API_ORDER_STORE_VALIDATION_FAIL', [
                'errors' => $validator->errors()->toArray(),
                'payload' => $request->all(),
            ]);

            return response()->json([
                'error' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $normalizedPaymentMethod = PaymentMethodNormalizer::normalizeMethod((string)$request->payment_method);
            if (!in_array($normalizedPaymentMethod, ['cash', 'card', 'paypal'], true)) {
                return response()->json([
                    'success' => false,
                    'error' => 'Unsupported payment method.',
                    'allowed' => ['cash', 'card', 'paypal'],
                ], 422);
            }

            if (in_array($normalizedPaymentMethod, ['card', 'paypal'], true)) {
                $verificationService = new PaymentVerificationService();
                $verification = $verificationService->verify($normalizedPaymentMethod, $request->all());

                if (!($verification['verified'] ?? false)) {
                    return response()->json([
                        'success' => false,
                        'error' => 'Payment verification failed.',
                        'reason' => (string)($verification['error'] ?? 'verification_not_confirmed'),
                        'payment_method' => $normalizedPaymentMethod,
                    ], 422);
                }
            }

            DB::beginTransaction();

            $orderNumber = $this->generateOrderNumber();
            $tableId = $request->table_id;

            if (!$tableId) {
                $orderType = 'delivery';
            } elseif ($tableId === 'cashier') {
                $orderType = 'cashier';
            } else {
                $orderType = $tableId;
            }

            $expectedTotal  = round((float) $request->total_amount, 2);
            $tipAmount      = round((float) ($request->tip_amount ?? 0), 2);
            $couponDiscount = round((float) ($request->coupon_discount ?? 0), 2);

            $orderId = DB::table('orders')->insertGetId([
                'order_id' => $orderNumber,
                'customer_name' => $request->customer_name,
                'email' => $request->customer_email,
                'telephone' => $request->customer_phone,
                'location_id' => $request->location_id ?? 1,
                'table_id' => $tableId,
                'order_type' => $orderType,
                'order_total' => $expectedTotal,
                'order_date' => now(),
                'order_time' => now()->format('H:i:s'),
                'status_id' => 1,
                'assignee_id' => null,
                'comment' => $request->special_instructions,
                'processed' => 1,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            \Log::info('PMD_API_ORDER_STORE_ORDER_CREATED', [
                'order_id' => $orderId,
                'expected_total' => $expectedTotal,
            ]);

            $computedSubtotal = 0.00;

            foreach ($request->items as $idx => $item) {
                $menuId = (int) $item['menu_id'];
                $qty = (int) $item['quantity'];
                $basePrice = round((float) $item['price'], 2);

                $menuItem = DB::table('menus')
                    ->where('menu_id', $menuId)
                    ->where('menu_status', 1)
                    ->first();

                if (!$menuItem) {
                    throw new \Exception("Menu item with ID {$menuId} not found");
                }

                $baseSubtotal = round($basePrice * $qty, 2);

                $orderMenuId = DB::table('order_menus')->insertGetId([
                    'order_id' => $orderId,
                    'menu_id' => $menuId,
                    'name' => $item['name'],
                    'quantity' => $qty,
                    'price' => $basePrice,
                    'subtotal' => $baseSubtotal,
                    'comment' => $item['special_instructions'] ?? '',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);

                $optionsPayload = $item['options'] ?? [];
                $optionIds = [];

                if (is_array($optionsPayload)) {
                    foreach ($optionsPayload as $k => $v) {
                        if (is_array($v)) {
                            foreach ($v as $vv) {
                                if (is_numeric($vv)) {
                                    $optionIds[] = (int) $vv;
                                } elseif (is_array($vv) && isset($vv['id']) && is_numeric($vv['id'])) {
                                    $optionIds[] = (int) $vv['id'];
                                } elseif (is_array($vv) && isset($vv['option_value_id']) && is_numeric($vv['option_value_id'])) {
                                    $optionIds[] = (int) $vv['option_value_id'];
                                }
                            }
                        } else {
                            if (is_numeric($v)) {
                                $optionIds[] = (int) $v;
                            } elseif (is_array($v) && isset($v['id']) && is_numeric($v['id'])) {
                                $optionIds[] = (int) $v['id'];
                            } elseif (is_array($v) && isset($v['option_value_id']) && is_numeric($v['option_value_id'])) {
                                $optionIds[] = (int) $v['option_value_id'];
                            }
                        }
                    }
                }

                $optionIds = array_values(array_unique(array_filter($optionIds)));

                $lineOptionTotal = 0.00;

                foreach ($optionIds as $optionValueId) {
                    $optionRow = DB::table('menu_option_values as mov')
                        ->leftJoin('menu_item_option_values as miov', function ($join) use ($menuId) {
                            $join->on('miov.option_value_id', '=', 'mov.option_value_id')
                                 ->where('miov.menu_id', '=', $menuId);
                        })
                        ->leftJoin('menu_item_options as mio', function ($join) use ($menuId) {
                            $join->on('mio.option_id', '=', 'mov.option_id')
                                 ->where('mio.menu_id', '=', $menuId);
                        })
                        ->where('mov.option_value_id', $optionValueId)
                        ->select([
                            'mov.option_value_id',
                            'mov.option_id',
                            'mov.value',
                            DB::raw('COALESCE(miov.new_price, mov.price, 0) as effective_price'),
                            'mio.menu_option_id',
                        ])
                        ->first();

                    if (!$optionRow) {
                        \Log::warning('PMD_API_ORDER_STORE_OPTION_NOT_FOUND', [
                            'order_id' => $orderId,
                            'menu_id' => $menuId,
                            'option_value_id' => $optionValueId,
                        ]);
                        continue;
                    }

                    $effectivePrice = round((float) $optionRow->effective_price, 2);
                    $lineOptionTotal += round($effectivePrice * $qty, 2);

                    DB::table('order_menu_options')->insert([
                        'order_id' => $orderId,
                        'menu_id' => $menuId,
                        'quantity' => $qty,
                        'order_menu_id' => $orderMenuId,
                        'order_option_name' => $optionRow->value,
                        'order_option_price' => $effectivePrice,
                        'menu_option_value_id' => $optionRow->option_value_id,
                        'order_menu_option_id' => $optionRow->menu_option_id ?: $optionRow->option_id,
                    ]);
                }

                $finalLineSubtotal = round($baseSubtotal + $lineOptionTotal, 2);

                DB::table('order_menus')
                    ->where('order_menu_id', $orderMenuId)
                    ->update([
                        'subtotal' => $finalLineSubtotal,
                        'updated_at' => now()
                    ]);

                $computedSubtotal += $finalLineSubtotal;

                if ($menuItem->stock_qty !== null) {
                    DB::table('menus')
                        ->where('menu_id', $menuId)
                        ->decrement('stock_qty', $qty);
                }

                \Log::info('PMD_API_ORDER_STORE_ITEM_DONE', [
                    'order_id' => $orderId,
                    'menu_id' => $menuId,
                    'qty' => $qty,
                    'base_price' => $basePrice,
                    'base_subtotal' => $baseSubtotal,
                    'line_option_total' => $lineOptionTotal,
                    'final_line_subtotal' => $finalLineSubtotal,
                    'option_ids' => $optionIds,
                ]);
            }

            $computedSubtotal = round($computedSubtotal, 2);

            $derivedTax = $request->filled('tax_amount')
                ? round((float) $request->tax_amount, 2)
                : round($expectedTotal - $computedSubtotal - $tipAmount + $couponDiscount, 2);

            if (abs($derivedTax) < 0.01) {
                $derivedTax = 0.00;
            }

            $orderTotals = [
                [
                    'order_id' => $orderId,
                    'code' => 'subtotal',
                    'title' => 'Subtotal',
                    'value' => $computedSubtotal,
                    'priority' => 1,
                    'created_at' => now(),
                    'updated_at' => now(),
                ],
            ];

            if ($derivedTax > 0) {
                $orderTotals[] = [
                    'order_id' => $orderId,
                    'code' => 'tax',
                    'title' => 'Tax',
                    'value' => $derivedTax,
                    'priority' => 2,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            if ($tipAmount > 0) {
                $orderTotals[] = [
                    'order_id' => $orderId,
                    'code' => 'tip',
                    'title' => 'Tip',
                    'value' => $tipAmount,
                    'priority' => 3,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            if ($couponDiscount > 0) {
                $title = 'Discount';
                if (!empty($request->coupon_code)) {
                    $title .= ' (' . $request->coupon_code . ')';
                }

                $orderTotals[] = [
                    'order_id' => $orderId,
                    'code' => 'coupon',
                    'title' => $title,
                    'value' => -$couponDiscount,
                    'priority' => 4,
                    'created_at' => now(),
                    'updated_at' => now(),
                ];
            }

            $orderTotals[] = [
                'order_id' => $orderId,
                'code' => 'payment_method',
                'title' => 'Payment Method',
                    'value' => $normalizedPaymentMethod,
                'priority' => 98,
                'created_at' => now(),
                'updated_at' => now(),
            ];

            $orderTotals[] = [
                'order_id' => $orderId,
                'code' => 'total',
                'title' => 'Total',
                'value' => $expectedTotal,
                'priority' => 99,
                'created_at' => now(),
                'updated_at' => now(),
            ];

            DB::table('order_totals')->insert($orderTotals);

            DB::table('orders')
                ->where('order_id', $orderId)
                ->update([
                    'order_total' => $expectedTotal,
                    'updated_at' => now()
                ]);

            DB::commit();

            \Log::info('PMD_API_ORDER_STORE_SUCCESS', [
                'order_id' => $orderId,
                'computed_subtotal' => $computedSubtotal,
                'derived_tax' => $derivedTax,
                'tip_amount' => $tipAmount,
                'coupon_discount' => $couponDiscount,
                'expected_total' => $expectedTotal,
            ]);

            try {
                if (\App\Helpers\SettingsHelper::areNewOrderNotificationsEnabled()) {
                    $notificationData = [
                        'tenant_id' => $request->location_id ?? 1,
                        'order_id' => $orderId,
                        'table_id' => $request->table_id,
                        'status' => 'received',
                        'status_name' => 'Received',
                        'message' => 'New order received',
                        'priority' => 'high'
                    ];

                    if ($request->has('table_name') && !empty($request->table_name)) {
                        $notificationData['table_name'] = $request->table_name;
                    }

                    NotificationHelper::createOrderNotification($notificationData);
                }
            } catch (\Exception $e) {
                \Log::warning('Failed to create order notification', [
                    'order_id' => $orderId,
                    'error' => $e->getMessage()
                ]);
            }

            return response()->json([
                'success' => true,
                'order_id' => $orderId,
                'message' => 'Order placed successfully'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();

            \Log::error('PMD_API_ORDER_STORE_EXCEPTION', [
                'message' => $e->getMessage(),
                'file' => $e->getFile(),
                'line' => $e->getLine(),
                'payload' => $request->all(),
            ]);

            return response()->json([
                'success' => false,
                'error' => 'Failed to create order',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function show($orderId)
    {
        try {
            $order = DB::table('orders')
                ->leftJoin('tables', 'orders.table_id', '=', 'tables.table_id')
                ->leftJoin('statuses', 'orders.status_id', '=', 'statuses.status_id')
                ->where('orders.order_id', $orderId)
                ->select([
                    'orders.*',
                    'tables.table_name',
                    'statuses.status_name',
                    'statuses.status_color'
                ])
                ->first();

            if (!$order) {
                return response()->json([
                    'error' => 'Order not found'
                ], 404);
            }

            // Get order items
            $items = DB::table('order_menus')
                ->leftJoin('menus', 'order_menus.menu_id', '=', 'menus.menu_id')
                ->where('order_menus.order_id', $order->order_id)
                ->select([
                    'order_menus.*',
                    'menus.menu_photo'
                ])
                ->get()
                ->map(function ($item) {
                    return [
                        'id' => $item->menu_id,
                        'name' => $item->name,
                        'quantity' => $item->quantity,
                        'price' => (float)$item->price,
                        'subtotal' => (float)$item->subtotal,
                        'comment' => $item->comment,
                        'image' => $item->menu_photo ? asset('uploads/' . $item->menu_photo) : null
                    ];
                });

            return response()->json([
                'id' => $order->order_id,
                'order_number' => $order->order_id,
                'customer_name' => $order->customer_name,
                'customer_email' => $order->email,
                'customer_phone' => $order->telephone,
                'table_id' => $order->table_id,
                'table_name' => $order->table_name,
                'order_type' => $order->order_type,
                'total_amount' => (float)$order->order_total,
                'status' => [
                    'id' => $order->status_id,
                    'name' => $order->status_name,
                    'color' => $order->status_color
                ],
                'special_instructions' => $order->comment,
                'items' => $items,
                'created_at' => $order->created_at,
                'updated_at' => $order->updated_at
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch order',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update order status
     */
    public function update(Request $request, $orderId)
    {
        $validator = Validator::make($request->all(), [
            'status_id' => 'required|integer|exists:statuses,status_id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $updated = DB::table('orders')
                ->where('order_id', $orderId)
                ->update([
                    'status_id' => $request->status_id,
                    'updated_at' => now()
                ]);

            if (!$updated) {
                return response()->json([
                    'error' => 'Order not found'
                ], 404);
            }

            return $this->show($orderId);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to update order',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all orders (for admin)
     */
    public function index(Request $request)
    {
        try {
            $query = DB::table('orders')
                ->leftJoin('tables', 'orders.table_id', '=', 'tables.table_id')
                ->leftJoin('statuses', 'orders.status_id', '=', 'statuses.status_id')
                ->select([
                    'orders.*',
                    'tables.table_name',
                    'statuses.status_name',
                    'statuses.status_color'
                ])
                ->orderBy('orders.created_at', 'desc');

            // Filter by status
            if ($request->has('status_id')) {
                $query->where('orders.status_id', $request->status_id);
            }

            // Filter by date
            if ($request->has('date')) {
                $query->whereDate('orders.order_date', $request->date);
            }

            $orders = $query->paginate(20);

            return response()->json([
                'orders' => $orders->items(),
                'pagination' => [
                    'current_page' => $orders->currentPage(),
                    'last_page' => $orders->lastPage(),
                    'per_page' => $orders->perPage(),
                    'total' => $orders->total()
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch orders',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Generate unique order number
     */
    private function generateOrderNumber()
    {
        $prefix = config('app.order_prefix', '#');
        $number = DB::table('orders')->max('order_id') + 1;
        return $prefix . str_pad($number, 6, '0', STR_PAD_LEFT);
    }

    /**
     * Get order status
     */
    public function getOrderStatus(Request $request)
    {
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

            // Map status_id to customer_status (0=Kitchen, 1=Preparing, 2=On Way)
            $customerStatus = 0; // Default to Kitchen
            if ($order->status_id == 3) {
                $customerStatus = 1; // Preparing
            } elseif ($order->status_id == 4) {
                $customerStatus = 2; // On Way
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'order_id' => (int)$order->order_id,
                    'status_id' => (int)$order->status_id,
                    'status_name' => $order->status_name,
                    'customer_status' => $customerStatus,
                    'updated_at' => $order->updated_at
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch order status',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Update order status
     */
    public function updateOrderStatus(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'order_id' => 'required|integer',
            'status_id' => 'required|integer|exists:statuses,status_id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $updated = DB::table('orders')
                ->where('order_id', $request->order_id)
                ->update([
                    'status_id' => $request->status_id,
                    'updated_at' => now()
                ]);

            if (!$updated) {
                return response()->json([
                    'error' => 'Order not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'message' => 'Order status updated successfully'
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to update order status',
                'message' => $e->getMessage()
            ], 500);
        }
    }
} 
