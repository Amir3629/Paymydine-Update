<?php

namespace Admin\Controllers\Concerns;

use Admin\Models\Orders_model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Canonical table reference for new waiter POS orders.
 *
 * TastyIgniter's orders table has no table_id column in the Mimoza tenant.
 * Core table-order flows use orders.order_type as the table foreign reference.
 * Store the actual table primary key there; model accessors and V150 resolve it
 * back to the human label. Historical "Table N" orders remain supported.
 */
trait PmdWaiterPosCanonicalTableReferenceV150Concern
{
    protected function fillNewOrder(Orders_model $order, array $table, array $payload, string $mode): void
    {
        $columns = Schema::getColumnListing('orders');
        $statusId = $this->resolveStatusId($mode);
        $locationId = (int)($table['location_id'] ?: ($payload['location_id'] ?? 0));

        if ($locationId < 1 && Schema::hasTable('locations')) {
            $locationId = (int)(DB::table('locations')->value('location_id') ?: 1);
        }

        $data = [
            'location_id' => $locationId ?: 1,
            'table_id' => (int)$table['id'],
            'order_type' => (string)(int)$table['id'],
            'status_id' => $statusId,
            'payment' => 'qr_pay_later',
            'settlement_status' => 'unpaid',
            'settled_amount' => 0,
            'order_date' => date('Y-m-d'),
            'order_time' => date('H:i:s'),
            'order_time_is_asap' => 1,
            'processed' => $mode === 'send' ? 1 : 0,
            'first_name' => 'Table',
            'last_name' => 'Guest',
            'email' => '',
            'telephone' => '',
            'comment' => trim((string)($payload['note'] ?? '')),
            'total_items' => 0,
            'order_total' => 0,
            'guest_count' => max(1, min(99, (int)($payload['guest_count'] ?? 1))),
            'ip_address' => request()->ip(),
            'user_agent' => (string)request()->userAgent(),
        ];

        foreach ($data as $key => $value) {
            if (in_array($key, $columns, true) && $value !== null) {
                $order->{$key} = $value;
            }
        }
    }
}
