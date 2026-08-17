<?php

namespace Admin\Controllers\Concerns;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Safe V1.2 compatibility layer for the V2.2 waiter operations routes.
 *
 * The original V2.2 route file is already registered in production, but the
 * deployed POS controller did not include its action methods. This concern
 * restores a read-only operational summary and returns explicit JSON for the
 * remaining write endpoints instead of allowing Laravel to throw a fatal 500.
 */
trait PmdWaiterPosOperationsSummaryV12Concern
{
    public function operationsSummaryV22($orderId)
    {
        $order = $this->findOrder((int)$orderId);
        if (!$order) {
            return response()->json(['ok' => false, 'message' => 'Order not found.'], 404);
        }

        $items = [];
        if (Schema::hasTable('order_menus')) {
            $items = DB::table('order_menus')
                ->where('order_id', (int)$order->getKey())
                ->orderBy('order_menu_id')
                ->get()
                ->map(function ($row) {
                    $row = (array)$row;
                    return [
                        'order_menu_id' => (int)($row['order_menu_id'] ?? 0),
                        'menu_id' => (int)($row['menu_id'] ?? 0),
                        'name' => (string)($row['name'] ?? 'Item'),
                        'quantity' => (float)($row['quantity'] ?? 1),
                        'subtotal' => (float)($row['subtotal'] ?? 0),
                        'comment' => (string)($row['comment'] ?? ''),
                    ];
                })
                ->values()
                ->all();
        }

        $tableId = (int)($order->table_id ?? 0);
        $table = null;
        if ($tableId > 0 && Schema::hasTable('tables')) {
            $columns = Schema::getColumnListing('tables');
            $primary = in_array('table_id', $columns, true) ? 'table_id' : (in_array('id', $columns, true) ? 'id' : null);
            if ($primary) {
                $table = (array)(DB::table('tables')->where($primary, $tableId)->first() ?: []);
            }
        }

        return response()->json([
            'ok' => true,
            'version' => 'pmd-waiter-pos-v2.2-compat-v1.2',
            'order' => [
                'order_id' => (int)$order->getKey(),
                'status_id' => $order->status_id ?? null,
                'settlement_status' => (string)($order->settlement_status ?? $order->payment_status ?? 'unpaid'),
                'order_total' => (float)($order->order_total ?? $order->total ?? 0),
                'settled_amount' => (float)($order->settled_amount ?? 0),
                'comment' => (string)($order->comment ?? ''),
                'updated_at' => (string)($order->updated_at ?? ''),
            ],
            'table' => [
                'id' => $tableId ?: null,
                'number' => (string)($table['table_no'] ?? $table['table_number'] ?? $tableId ?: ''),
                'name' => (string)($table['table_name'] ?? $table['name'] ?? ($tableId ? 'Table '.$tableId : '')),
            ],
            'items' => $items,
            'capabilities' => [
                'transfer' => false,
                'merge' => false,
                'move_items' => false,
                'item_service' => false,
                'void_item' => false,
                'void_order' => false,
                'reopen' => false,
                'print_links' => true,
            ],
        ]);
    }

    public function transferOrderV22($orderId) { return $this->operationsUnavailableV12('transfer', $orderId); }
    public function mergeOrdersV22($orderId) { return $this->operationsUnavailableV12('merge', $orderId); }
    public function moveItemsV22($orderId) { return $this->operationsUnavailableV12('move-items', $orderId); }
    public function itemServiceV22($orderId) { return $this->operationsUnavailableV12('item-service', $orderId); }
    public function voidItemV22($orderId) { return $this->operationsUnavailableV12('void-item', $orderId); }
    public function voidOrderV22($orderId) { return $this->operationsUnavailableV12('void-order', $orderId); }
    public function reopenOrderV22($orderId) { return $this->operationsUnavailableV12('reopen', $orderId); }

    public function printLinksV22($orderId)
    {
        $order = $this->findOrder((int)$orderId);
        if (!$order) {
            return response()->json(['ok' => false, 'message' => 'Order not found.'], 404);
        }

        return response()->json([
            'ok' => true,
            'order_id' => (int)$order->getKey(),
            'invoice_url' => '/admin/orders/invoice/'.rawurlencode((string)$order->getKey()),
            'edit_url' => '/admin/orders/edit/'.rawurlencode((string)$order->getKey()),
        ]);
    }

    protected function operationsUnavailableV12(string $action, $orderId)
    {
        return response()->json([
            'ok' => false,
            'version' => 'pmd-waiter-pos-v2.2-compat-v1.2',
            'action' => $action,
            'order_id' => (int)$orderId,
            'message' => 'This destructive table operation is not enabled in the safe waiter workstation yet.',
        ], 409);
    }
}
