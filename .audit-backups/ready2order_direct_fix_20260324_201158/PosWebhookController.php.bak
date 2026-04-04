<?php

namespace Admin\Controllers\Api;

use Admin\Models\Orders_model;
use Admin\Models\Statuses_model;
use Admin\Models\Pos_configs_model;
use Admin\Models\Pos_devices_model;
use Illuminate\Http\Request;
use Illuminate\Routing\Controller;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use App\Helpers\NotificationHelper;

class PosWebhookController extends Controller
{
    /**
     * Handle incoming POS webhook payloads.
     *
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function handle(Request $request)
    {
        try {
            $payload = $request->all();
            Log::info('POS webhook received', $payload);

            //  Validate provider and order ID
            $provider = $payload['provider'] ?? null;
            if (!$provider) {
                return response()->json(['error' => true, 'message' => 'Provider not specified'], 400);
            }

            $externalOrderId = $payload['order_id'] ?? null;
            if (!$externalOrderId) {
                return response()->json(['error' => true, 'message' => 'Order ID not found'], 400);
            }

            //  Fetch POS device and configuration
            $posDevice = Pos_devices_model::where('code', $provider)->first();
            if (!$posDevice) {
                return response()->json(['error' => true, 'message' => 'POS device not found'], 404);
            }

            $posConfig = Pos_configs_model::where('device_id', $posDevice->device_id)->first();
            if (!$posConfig) {
                return response()->json(['error' => true, 'message' => 'POS configuration not found'], 404);
            }

            //  Fetch full order details from external POS API
            $accessToken = $posConfig->access_token;
            $apiUrl = "https://pay-my-dine-api-pos.onrender.com/api/pos/{$provider}/order/{$externalOrderId}";

            $response = Http::withHeaders([
                'Authorization' => "Bearer {$accessToken}",
                'Content-Type'  => 'application/json',
            ])->get($apiUrl);

            $fullOrder = $response->json();
            if (!$fullOrder) {
                Log::error("Failed to fetch full order from POS API for order ID {$externalOrderId}");
                return response()->json(['error' => true, 'message' => 'Failed to fetch full order from POS API'], 400);
            }

            //  Map order line items
            $cart = [];
            $totalItems = 0;
            $orderTotal = 0;

            if (!empty($fullOrder['line_items'])) {
                foreach ($fullOrder['line_items'] as $item) {
                    $quantity = (int) ($item['quantity'] ?? 1);
                    $price = ($item['total_money']['amount'] ?? 0) / 100; // Convert from cents

                    $cart[] = [
                        'menu_id' => null,
                        'name' => $item['name'] ?? 'Unnamed Item',
                        'quantity' => $quantity,
                        'price' => $price,
                        'special_instructions' => '',
                        'options' => [],
                    ];

                    $totalItems += $quantity;
                    $orderTotal += $price * $quantity;
                }
            }

            $statusId = Statuses_model::where('status_name', 'Received')->value('status_id');

            //  Prepare order data for insertion or update
            $orderData = [
                'hash'         => $fullOrder['id'],
                'location_id'  => 1,
                'order_total'  => $orderTotal,
                'order_type'   => 'POS',
                'status_id'    => $statusId,
                'cart'         => json_encode($cart),
                'total_items'  => $totalItems,
                'first_name'   => 'Table Unknown Customer',
                'last_name'    => '',
                'email'        => '',
                'telephone'    => '',
                'created_at'   => now(),
                'updated_at'   => now(),
                'order_time'   => now()->format('H:i:s'),
                'order_date'   => now()->format('Y-m-d'),
            ];

            //  Check if order already exists
            $existingOrder = DB::table('orders')->where('hash', $orderData['hash'])->first();

            if ($existingOrder) {
                DB::table('orders')->where('hash', $orderData['hash'])->update($orderData);
                $orderId = $existingOrder->order_id;
                Log::info("Existing POS order updated: order_id {$orderId}");
            } else {
                $orderId = DB::table('orders')->insertGetId($orderData);
                Log::info("New POS order inserted: order_id {$orderId}");
            }

            //  Insert or update items in 'menus' and link them to order
            foreach ($cart as &$item) {
                $existingMenu = DB::table('menus')->where('menu_name', $item['name'])->first();

                if ($existingMenu) {
                    $item['menu_id'] = $existingMenu->menu_id;
                } else {
                    $menuId = DB::table('menus')->insertGetId([
                        'menu_name' => $item['name'],
                        'menu_price' => $item['price'],
                        'menu_status' => 1,
                        'menu_priority' => 1,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $item['menu_id'] = $menuId;
                    Log::info("New menu item created for POS order {$orderId}: menu_id {$menuId}");
                }
            }

            //  Update order cart with valid menu IDs
            DB::table('orders')->where('order_id', $orderId)->update([
                'cart' => json_encode($cart),
            ]);

            Log::info("POS order saved successfully with cart update: order_id {$orderId}");

            /**
             * =====================================================
             *  Create a notification after order is saved
             * =====================================================
             */
            try {
                NotificationHelper::createOrderNotification([
                    'tenant_id'   => $orderData['location_id'] ?? 1,
                    'order_id'    => $orderId,
                    'table_id'    => null, // POS has no table association
                    'status'      => 'received',
                    'status_name' => 'Received',
                    'message'     => "New POS order received (#{$orderId})",
                    'priority'    => 'high',
                ]);

                Log::info("Notification created successfully for POS order {$orderId}");
            } catch (\Exception $e) {
                Log::error("Failed to create notification for POS order {$orderId}: " . $e->getMessage());
            }

            return response()->json([
                'success'  => true,
                'order_id' => $orderId,
            ], 200);

        } catch (\Exception $e) {
            Log::error('Error processing POS webhook: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'error' => true,
                'message' => $e->getMessage(),
            ], 500);
        }
    }

    /**
     * Map external POS location ID to internal restaurant location ID.
     *
     * @param mixed $posLocationId
     * @return int
     */
    private function mapLocation($posLocationId)
    {
        return \Admin\Models\Locations_model::first()->location_id ?? 1;
    }
}

