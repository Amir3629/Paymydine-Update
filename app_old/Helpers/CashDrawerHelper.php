<?php

namespace App\Helpers;

use Admin\Models\Cash_drawers_model;
use Admin\Services\CashDrawerService\CashDrawerService;
use Illuminate\Support\Facades\Log;

/**
 * Cash Drawer Helper
 * Utility functions for cash drawer operations
 */
class CashDrawerHelper
{
    /**
     * Open cash drawer for order if payment is cash
     * @param int $orderId
     * @param int|null $locationId
     * @param string|null $paymentMethod
     * @return bool
     */
    public static function openDrawerForOrder($orderId, $locationId = null, $paymentMethod = null)
    {
        try {
            // Get payment method from order if not provided
            if (!$paymentMethod) {
                $paymentTotal = \DB::table('order_totals')
                    ->where('order_id', $orderId)
                    ->where('code', 'payment_method')
                    ->first();
                
                if ($paymentTotal) {
                    $paymentMethod = strtolower($paymentTotal->value ?? '');
                }
            }

            // Only open drawer for cash payments
            if (!in_array($paymentMethod, ['cash', 'cod'])) {
                return false;
            }

            // Get location from order if not provided
            if (!$locationId) {
                $order = \DB::table('orders')->where('order_id', $orderId)->first();
                if ($order) {
                    $locationId = $order->location_id ?? null;
                }
            }

            if (!$locationId) {
                Log::warning('Cash Drawer: No location ID for order', ['order_id' => $orderId]);
                return false;
            }

            // Get drawer for location
            $drawer = Cash_drawers_model::getDefaultDrawer($locationId);

            if (!$drawer) {
                Log::info('Cash Drawer: No drawer configured for location', [
                    'location_id' => $locationId,
                    'order_id' => $orderId,
                ]);
                return false;
            }

            // Check if auto-open is enabled
            if (!$drawer->auto_open_on_cash) {
                Log::info('Cash Drawer: Auto-open disabled for drawer', [
                    'drawer_id' => $drawer->drawer_id,
                    'order_id' => $orderId,
                ]);
                return false;
            }

            // Open drawer
            $result = CashDrawerService::openDrawer($drawer, [
                'order_id' => $orderId,
                'location_id' => $locationId,
                'trigger_method' => 'cash_payment',
            ]);

            if ($result['success']) {
                Log::info('Cash Drawer: Opened for cash payment', [
                    'drawer_id' => $drawer->drawer_id,
                    'order_id' => $orderId,
                    'location_id' => $locationId,
                ]);
            } else {
                Log::warning('Cash Drawer: Failed to open for cash payment', [
                    'drawer_id' => $drawer->drawer_id,
                    'order_id' => $orderId,
                    'location_id' => $locationId,
                    'error' => $result['message'],
                ]);
            }

            return $result['success'];
        } catch (\Exception $e) {
            Log::error('Cash Drawer: Exception opening drawer for order', [
                'order_id' => $orderId,
                'location_id' => $locationId,
                'error' => $e->getMessage(),
            ]);
            return false;
        }
    }

    /**
     * Check if cash drawer should open for payment method
     * @param string $paymentMethod
     * @return bool
     */
    public static function shouldOpenDrawer($paymentMethod)
    {
        $paymentMethod = strtolower($paymentMethod ?? '');
        return in_array($paymentMethod, ['cash', 'cod']);
    }
}
