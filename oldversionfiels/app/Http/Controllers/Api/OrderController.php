<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class OrderController extends Controller
{
    /**
     * Store a new order
     */
    public function store(Request $request)
    {
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
            'total_amount' => 'required|numeric|min:0',
            'tip_amount' => 'nullable|numeric|min:0',
            'payment_method' => 'required|string|in:cash,card,paypal',
            'special_instructions' => 'nullable|string|max:500'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            DB::beginTransaction();

            // Generate order number
            $orderNumber = $this->generateOrderNumber();

            // Create main order record
            $orderId = DB::table('ti_orders')->insertGetId([
                'order_id' => $orderNumber,
                'customer_name' => $request->customer_name,
                'email' => $request->customer_email,
                'telephone' => $request->customer_phone,
                'location_id' => $request->location_id ?? 1, // Use provided location or default
                'table_id' => $request->table_id,
                'order_type' => 'dine_in', // Default to dine_in for table orders
                'order_total' => $request->total_amount,
                'order_date' => now(),
                'order_time' => now()->format('H:i:s'),
                'status_id' => 1, // Pending status
                'assignee_id' => null,
                'comment' => $request->special_instructions,
                'processed' => 0,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            // Create order items
            foreach ($request->items as $item) {
                // Verify menu item exists
                $menuItem = DB::table('ti_menus')
                    ->where('menu_id', $item['menu_id'])
                    ->where('menu_status', 1)
                    ->first();

                if (!$menuItem) {
                    throw new \Exception("Menu item with ID {$item['menu_id']} not found");
                }

                DB::table('ti_order_menus')->insert([
                    'order_id' => $orderId,
                    'menu_id' => $item['menu_id'],
                    'name' => $item['name'],
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'subtotal' => $item['price'] * $item['quantity'],
                    'comment' => $item['special_instructions'] ?? '',
                    'created_at' => now(),
                    'updated_at' => now()
                ]);

                // Update stock if tracked
                if ($menuItem->stock_qty !== null) {
                    DB::table('ti_menus')
                        ->where('menu_id', $item['menu_id'])
                        ->decrement('stock_qty', $item['quantity']);
                }
            }

            // Store tip amount if provided
            if ($request->tip_amount && $request->tip_amount > 0) {
                DB::table('ti_order_totals')->insert([
                    'order_id' => $orderId,
                    'code' => 'tip',
                    'title' => 'Tip',
                    'value' => $request->tip_amount,
                    'priority' => 0,
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
            }

            // Store payment method
            DB::table('ti_order_totals')->insert([
                'order_id' => $orderId,
                'code' => 'payment_method',
                'title' => 'Payment Method',
                'value' => $request->payment_method,
                'priority' => 0,
                'created_at' => now(),
                'updated_at' => now()
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
    }

    /**
     * Get order by ID
     */
    public function show($orderId)
    {
        try {
            $order = DB::table('ti_orders')
                ->leftJoin('ti_tables', 'ti_orders.table_id', '=', 'ti_tables.table_id')
                ->leftJoin('ti_statuses', 'ti_orders.status_id', '=', 'ti_statuses.status_id')
                ->where('ti_orders.order_id', $orderId)
                ->select([
                    'ti_orders.*',
                    'ti_tables.table_name',
                    'ti_statuses.status_name',
                    'ti_statuses.status_color'
                ])
                ->first();

            if (!$order) {
                return response()->json([
                    'error' => 'Order not found'
                ], 404);
            }

            // Get order items
            $items = DB::table('ti_order_menus')
                ->leftJoin('ti_menus', 'ti_order_menus.menu_id', '=', 'ti_menus.menu_id')
                ->where('ti_order_menus.order_id', $order->order_id)
                ->select([
                    'ti_order_menus.*',
                    'ti_menus.menu_photo'
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
            'status_id' => 'required|integer|exists:ti_statuses,status_id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $updated = DB::table('ti_orders')
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
            $query = DB::table('ti_orders')
                ->leftJoin('ti_tables', 'ti_orders.table_id', '=', 'ti_tables.table_id')
                ->leftJoin('ti_statuses', 'ti_orders.status_id', '=', 'ti_statuses.status_id')
                ->select([
                    'ti_orders.*',
                    'ti_tables.table_name',
                    'ti_statuses.status_name',
                    'ti_statuses.status_color'
                ])
                ->orderBy('ti_orders.created_at', 'desc');

            // Filter by status
            if ($request->has('status_id')) {
                $query->where('ti_orders.status_id', $request->status_id);
            }

            // Filter by date
            if ($request->has('date')) {
                $query->whereDate('ti_orders.order_date', $request->date);
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
        $number = DB::table('ti_orders')->max('order_id') + 1;
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
            $order = DB::table('ti_orders')
                ->leftJoin('ti_statuses', 'ti_orders.status_id', '=', 'ti_statuses.status_id')
                ->where('ti_orders.order_id', $orderId)
                ->select([
                    'ti_orders.order_id',
                    'ti_orders.status_id',
                    'ti_statuses.status_name',
                    'ti_orders.updated_at'
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
            'status_id' => 'required|integer|exists:ti_statuses,status_id'
        ]);

        if ($validator->fails()) {
            return response()->json([
                'error' => 'Validation failed',
                'errors' => $validator->errors()
            ], 422);
        }

        try {
            $updated = DB::table('ti_orders')
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
