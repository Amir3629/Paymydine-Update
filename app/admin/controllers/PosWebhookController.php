<?php

namespace Admin\Controllers;

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
    private string $urlPosAPI = 'https://pay-my-dine-api-pos.onrender.com';
    // private string $urlPosAPI = 'https://6fbebe8a021d.ngrok-free.app';

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

            // 1) Validate provider and order_id coming from the POS API
            $provider = $payload['provider'] ?? null;
            if (!$provider) {
                return response()->json(['error' => true, 'message' => 'Provider not specified'], 400);
            }

            $externalOrderId = $payload['order_id'] ?? null;
            if (!$externalOrderId) {
                return response()->json(['error' => true, 'message' => 'Order ID not found'], 400);
            }

            // 2) Get POS configuration (to retrieve access_token and domainPrefix if needed)
            $posDevice = Pos_devices_model::where('code', $provider)->first();
            if (!$posDevice) {
                return response()->json(['error' => true, 'message' => 'POS device not found'], 404);
            }

            $posConfig = Pos_configs_model::where('device_id', $posDevice->device_id)->first();
            if (!$posConfig) {
                return response()->json(['error' => true, 'message' => 'POS configuration not found'], 404);
            }

            $accessToken  = $posConfig->access_token;
            $domainPrefix = $posConfig->id_application; // used for Lightspeed

            // 3) Fetch the full order from POS API (which will query Square/Lightspeed)
            $baseUrl = $this->urlPosAPI . "/api/pos/{$provider}/order/{$externalOrderId}";

            // Lightspeed needs domainPrefix
            if ($provider === 'lightspeed' && !empty($domainPrefix)) {
                $baseUrl .= '?domainPrefix=' . urlencode($domainPrefix);
            }
            if ($provider === 'clover' && !empty($domainPrefix)) {
                $baseUrl .= '?merchantId=' . urlencode($domainPrefix);
            }

            Log::info("Fetching full order from POS API", [
                'url'          => $baseUrl,
                'access_token' => substr($accessToken, 0, 4) . '***',
                'provider'     => $provider,
            ]);

            $response = Http::withHeaders([
                'Authorization' => "Bearer {$accessToken}",
                'Content-Type'  => 'application/json',
            ])->get($baseUrl);

            $fullOrder = $response->json();
            if (!$fullOrder) {
                Log::error("Failed to fetch full order from POS API for order ID {$externalOrderId}", [
                    'status' => $response->status(),
                    'body'   => $response->body(),
                ]);

                return response()->json([
                    'error'   => true,
                    'message' => 'Failed to fetch full order from POS API',
                ], 400);
            }

            Log::info("Full order fetched from POS API", [$fullOrder]);

            // 4) Build cart differently per provider
            $cart       = [];
            $totalItems = 0;
            $orderTotal = 0.0;

            /**
             * ==============================
             *  SQUARE (current model)
             * ==============================
             */
            if ($provider === 'square') {
                if (!empty($fullOrder['line_items'])) {
                    foreach ($fullOrder['line_items'] as $item) {
                        $quantity = (int) ($item['quantity'] ?? 1);
                        $price    = ($item['total_money']['amount'] ?? 0) / 100; // total of the line in money

                        $cart[] = [
                            'menu_id'              => null,
                            'name'                 => $item['name'] ?? 'Unnamed Item',
                            'quantity'             => $quantity,
                            'price'                => $price,
                            'special_instructions' => '',
                            'options'              => [],
                        ];

                        $totalItems += $quantity;
                        $orderTotal += $price; // this is already the line total
                    }
                }
            }

            /**
             * ==============================
             *  LIGHTSPEED
             * ==============================
             *
             * Payload (sale) contains:
             *  - data.line_items: items
             *  - data.total_price_incl / data.total_price
             */
            if ($provider === 'lightspeed') {
                $sale     = $fullOrder['data'] ?? $fullOrder;
                $products = $sale['line_items'] ?? [];

                foreach ($products as $product) {
                    $quantity = (int) ($product['quantity'] ?? 1);

                    // line total and unit price
                    $lineTotal = (float) (
                        $product['total_price']
                        ?? $product['price_total']
                        ?? $product['price']
                        ?? 0
                    );

                    $unitPrice = $quantity > 0 ? $lineTotal / $quantity : $lineTotal;

                    $productData = $product['product']['data'] ?? ($product['product'] ?? null);

                    $name =
                        $product['description']
                        ?? ($productData['name'] ?? null)
                        ?? ($productData['variant_name'] ?? null)
                        ?? ($product['product_id'] ?? 'POS Item');

                    $description = $productData['description'] ?? null;

                    $cart[] = [
                        'menu_id'              => null,
                        'name'                 => $name,
                        'quantity'             => $quantity,
                        'price'                => $unitPrice,
                        'special_instructions' => $product['note'] ?? '',
                        'options'              => [],
                        'description'          => $description,
                    ];

                    $totalItems += $quantity;
                    $orderTotal += $lineTotal;
                }

                if (isset($sale['total_price_incl'])) {
                    $orderTotal = (float) $sale['total_price_incl'];
                } elseif (isset($sale['total_price'])) {
                    $orderTotal = (float) $sale['total_price'];
                }
            }

            /**
             * ==============================
             *  CLOVER
             * ==============================
             *
             * Endpoint: /api/pos/clover/order/{orderId}
             * Uses:
             *  - lineItems.elements: items
             *  - total: total in cents
             */
            if ($provider === 'clover') {
                $order     = $fullOrder;
                $lineItems = $order['lineItems']['elements'] ?? ($order['lineItems'] ?? []);

                foreach ($lineItems as $lineItem) {
                    $quantity = (int) ($lineItem['quantity'] ?? 1);

                    $lineTotalCents = $lineItem['price'] ?? $lineItem['amount'] ?? 0;
                    $lineTotal      = $lineTotalCents / 100;

                    $unitPrice = $quantity > 0 ? $lineTotal / $quantity : $lineTotal;

                    $itemData = $lineItem['item'] ?? [];

                    $name =
                        $lineItem['name']
                        ?? ($itemData['name'] ?? null)
                        ?? 'POS Item';

                    $description = $itemData['description'] ?? $name;

                    $cart[] = [
                        'menu_id'              => null,
                        'name'                 => $name,
                        'quantity'             => $quantity,
                        'price'                => $unitPrice,
                        'special_instructions' => $lineItem['note'] ?? '',
                        'options'              => [],
                        'description'          => $description,
                    ];

                    $totalItems += $quantity;
                    $orderTotal += $lineTotal;
                }

                if (isset($order['total'])) {
                    $orderTotal = $order['total'] / 100;
                }
            }

            // 5) Status "Received"
            $statusId = Statuses_model::where('status_name', 'Received')->value('status_id');

            // 6) Build order data to save
            $orderData = [
                'hash'         => $fullOrder['id'] ?? $externalOrderId,
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

            // 7) Insert / update order
            $existingOrder = DB::table('orders')->where('hash', $orderData['hash'])->first();

            if ($existingOrder) {
                DB::table('orders')->where('hash', $orderData['hash'])->update($orderData);
                $orderId = $existingOrder->order_id;
                Log::info("Existing POS order updated: order_id {$orderId}");
            } else {
                $orderId = DB::table('orders')->insertGetId($orderData);
                Log::info("New POS order inserted: order_id {$orderId}");
            }

            // 8) Create/update menu items and link them with the order
            foreach ($cart as &$item) {
                $existingMenu = DB::table('menus')->where('menu_name', $item['name'])->first();

                if ($existingMenu) {
                    $item['menu_id'] = $existingMenu->menu_id;
                } else {
                    $menuId = DB::table('menus')->insertGetId([
                        'menu_name'    => $item['name'],
                        'menu_price'   => $item['price'],
                        'menu_status'  => 1,
                        'menu_priority'=> 1,
                        'created_at'   => now(),
                        'updated_at'   => now(),
                    ]);
                    $item['menu_id'] = $menuId;
                    Log::info("New menu item created for POS order {$orderId}: menu_id {$menuId}");
                }
            }

            DB::table('orders')->where('order_id', $orderId)->update([
                'cart' => json_encode($cart),
            ]);

            Log::info("POS order saved successfully with cart update: order_id {$orderId}");

            // 9) Insert into order_menus
            DB::table('order_menus')->where('order_id', $orderId)->delete();

            foreach ($cart as $cartItem) {
                $subtotal = $cartItem['price'] * $cartItem['quantity'];

                DB::table('order_menus')->insert([
                    'order_id'      => $orderId,
                    'menu_id'       => $cartItem['menu_id'],
                    'name'          => $cartItem['name'],
                    'quantity'      => $cartItem['quantity'],
                    'price'         => $cartItem['price'],
                    'subtotal'      => $subtotal,
                    'comment'       => $cartItem['special_instructions'] ?? '',
                    'option_values' => serialize($cartItem['options'] ?? []),
                ]);
            }

            Log::info("Inserted order_menus records for order_id {$orderId}");

            // 10) Notification
            try {
                $status   = 'received';
                $orderIdLike = '%"order_id":'.$orderId.'%';
                $statusLike  = '%"status":"'.$status.'"%';

                 $exists = DB::table('notifications')
                    ->where('payload', 'like', $orderIdLike)
                    ->where('payload', 'like', $statusLike)
                    ->exists();

                if (!$exists) {
                     NotificationHelper::createOrderNotification([
                        'tenant_id'   => $orderData['location_id'] ?? 1,
                        'order_id'    => $orderId,
                        'table_id'    => null,
                        'status'      => 'received',
                        'status_name' => 'Received',
                        'message'     => "New POS order received (#{$orderId})",
                        'priority'    => 'high',
                    ]);
                }

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
                'error'   => true,
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

    private function orderMenusQuery()
    {
        return DB::table('order_menus');
    }

    private function orderMenuOptionsQuery()
    {
        return DB::table('order_menu_options');
    }
}


