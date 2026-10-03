<?php

namespace Admin\Controllers\Concerns;

use Admin\Models\Orders_model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Adds a readable audit entry to the existing order_notes history whenever a
 * waiter submits meaningful order/item instructions. The canonical kitchen
 * line note remains order_menus.comment.
 */
trait PmdWaiterPosNoteHistoryV26Concern
{
    protected function recordWaiterPosNoteHistoryV26(
        Orders_model $order,
        array $cart,
        string $orderNote,
        string $mode
    ): void {
        if (!Schema::hasTable('order_notes')) {
            return;
        }

        $lines = [];
        $orderNote = $this->cleanWaiterPosNoteV26($orderNote);
        if ($orderNote !== '') {
            $lines[] = 'Order note: '.$orderNote;
        }

        foreach ($cart as $row) {
            if (!is_array($row)) {
                continue;
            }
            $comment = $this->cleanWaiterPosNoteV26($row['comment'] ?? '');
            if ($comment === '') {
                continue;
            }
            $name = trim((string)($row['name'] ?? 'Menu item')) ?: 'Menu item';
            $qty = max(1, min(99, (int)($row['quantity'] ?? $row['qty'] ?? 1)));
            $lines[] = 'Item note — '.$name.' ×'.$qty.': '.$comment;
        }

        if (!$lines) {
            return;
        }

        try {
            $cols = Schema::getColumnListing('order_notes');
            $header = $mode === 'send'
                ? 'Waiter POS · Sent to kitchen'
                : 'Waiter POS · Saved / held';
            $data = [
                'order_id' => (int)$order->getKey(),
                'staff_id' => $this->currentUserId(),
                'note' => $header."\n".implode("\n", $lines),
                'status' => 'active',
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ];
            $data = array_intersect_key($data, array_flip($cols));
            if (!empty($data['order_id']) && !empty($data['note'])) {
                DB::table('order_notes')->insert($data);
            }
        } catch (\Throwable $e) {
            report($e);
        }
    }

    protected function cleanWaiterPosNoteV26($value): string
    {
        $value = trim(preg_replace('/\s+/u', ' ', (string)$value));
        if ($value === '') {
            return '';
        }
        return mb_substr($value, 0, 1200);
    }
}
