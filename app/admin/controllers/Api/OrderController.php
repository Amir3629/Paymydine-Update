<?php

namespace Admin\Controllers\Api;

use Admin\Models\Orders_model;
use Admin\Models\Menus_model;
use Admin\Models\Locations_model;
use Illuminate\Http\Request;
use System\Classes\BaseController;

class OrderController extends BaseController
{
    public function __construct()
    {
        parent::__construct();
        
        // Enable CORS for frontend requests
        header('Access-Control-Allow-Origin: *');
        header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
        header('Access-Control-Allow-Headers: Content-Type, Authorization');
    }

    public function createOrder(Request $request, $locationId)
    {
        try {
            // Validate location
            $location = Locations_model::findOrFail($locationId);

            // Validate request data to match frontend structure
            $isCashier = $request->has('is_cashier') && $request->is_cashier;
            
            // Also check if this is a cashier table order
            if (!$isCashier && $request->has('table_id')) {
                $cashierTable = DB::table('tables')->where('table_name', 'Cashier')->first();
                if ($cashierTable && $request->table_id == $cashierTable->table_id) {
                    $isCashier = true;
                }
            }
            
            $validationRules = [
                'items' => 'required|array|min:1',
                'items.*.menu_id' => 'required|integer',
                'items.*.name' => 'required|string',
                'items.*.quantity' => 'required|integer|min:1',
                'items.*.price' => 'required|numeric|min:0',
                'customer_name' => 'required|string|max:255',
                'customer_email' => 'nullable|email',
                'customer_phone' => 'nullable|string|max:20',
                'table_id' => 'nullable|string',
                'table_name' => 'nullable|string',
                'total_amount' => 'required|numeric|min:0',
                'tip_amount' => 'nullable|numeric|min:0',
                'payment_method' => 'required|string|in:cash,card,paypal',
                'special_instructions' => 'nullable|string|max:500'
            ];
            
            $request->validate($validationRules);

            // Validate and get menu items
            $orderItems = [];
            $total = 0;

            foreach ($request->items as $item) {
                $menuItem = Menus_model::findOrFail($item['menu_id']);
                $subtotal = $item['price'] * $item['quantity'];
                
                $orderItems[] = [
                    'menu_id' => $item['menu_id'],
                    'name' => $item['name'],
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'subtotal' => $subtotal,
                    'comment' => $item['special_instructions'] ?? '',
                ];

                $total += $subtotal;
            }

            // Create order using the expected field names
            $order = Orders_model::create([
                'location_id' => $locationId,
                'customer_name' => $request->customer_name,
                'email' => $request->customer_email,
                'telephone' => $request->customer_phone,
                'table_id' => $request->table_id,
                'order_type' => $isCashier ? 'cashier' : $request->table_id, // Store cashier or table_id
                'status_id' => 1, // New order
                'total_items' => count($orderItems),
                'order_total' => $request->total_amount,
                'order_time' => now(),
                'order_date' => now()->format('Y-m-d'),
                'ip_address' => $request->ip(),
                'comment' => $request->special_instructions,
            ]);

            // Add order items
            foreach ($orderItems as $item) {
                $order->addOrderItem($item);
            }

            // Store tip amount if provided
            if ($request->tip_amount && $request->tip_amount > 0) {
                \DB::table('order_totals')->insert([
                    'order_id' => $order->order_id,
                    'code' => 'tip',
                    'title' => 'Tip',
                    'value' => $request->tip_amount,
                    'priority' => 0,
                    'created_at' => now(),
                    'updated_at' => now()
                ]);
            }

            // Store payment method
            \DB::table('order_totals')->insert([
                'order_id' => $order->order_id,
                'code' => 'payment_method',
                'title' => 'Payment Method',
                'value' => $request->payment_method,
                'priority' => 0,
                'created_at' => now(),
                'updated_at' => now()
            ]);

            return response()->json([
                'success' => true,
                'order_id' => $order->order_id,
                'message' => 'Order placed successfully'
            ], 201);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to create order',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    public function requestWaiter(Request $request, $locationId)
    {
        try {
            $request->validate([
                'tableNumber' => 'required|integer',
                'note' => 'nullable|string',
            ]);

            // Create waiter request record
            // This is a simplified version - you might want to create a proper model for this
            \DB::table('waiter_requests')->insert([
                'location_id' => $locationId,
                'table_number' => $request->tableNumber,
                'note' => $request->note,
                'status' => 'pending',
                'created_at' => now(),
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Waiter has been notified'
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to request waiter'
            ], 500);
        }
    }

    /**
     * Get order status (matching frontend expectations)
     */
    public function getOrderStatus(Request $request, $locationId)
    {
        $orderId = $request->get('order_id');
        
        if (!$orderId) {
            return response()->json([
                'error' => 'order_id is required'
            ], 400);
        }

        try {
            $order = Orders_model::where('location_id', $locationId)
                                ->where('order_id', $orderId)
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
                    'status_name' => $order->status->status_name ?? 'Pending',
                    'customer_status' => $customerStatus,
                    'updated_at' => $order->updated_at ?? $order->order_time
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
    public function updateOrderStatus(Request $request, $locationId)
    {
        $validator = \Validator::make($request->all(), [
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
            $order = Orders_model::where('location_id', $locationId)
                                ->where('order_id', $request->order_id)
                                ->first();

            if (!$order) {
                return response()->json([
                    'error' => 'Order not found'
                ], 404);
            }

            $order->update([
                'status_id' => $request->status_id,
                'updated_at' => now()
            ]);

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
