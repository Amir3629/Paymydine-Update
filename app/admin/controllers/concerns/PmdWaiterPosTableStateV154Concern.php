<?php

namespace Admin\Controllers\Concerns;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Independent table lifecycle for waiter POS orders.
 *
 * A new/updated order may occupy a table. Payment never frees a table here.
 * Release happens only through the explicit waiter table-status endpoint.
 */
trait PmdWaiterPosTableStateV154Concern
{
    protected function markTableOccupiedForWaiterOrderV154(array $table, $order): void
    {
        if (!Schema::hasTable('tables') || !Schema::hasColumn('tables', 'operational_status')) {
            return;
        }

        $tableId = (int)($table['id'] ?? 0);
        if ($tableId < 1) {
            return;
        }

        $columns = Schema::getColumnListing('tables');
        $pk = in_array('table_id', $columns, true) ? 'table_id' : (in_array('id', $columns, true) ? 'id' : null);
        if (!$pk) {
            return;
        }

        $row = DB::table('tables')->where($pk, $tableId)->lockForUpdate()->first();
        if (!$row) {
            return;
        }

        $old = strtolower(trim((string)($row->operational_status ?? 'available')));
        if ($old === 'occupied') {
            return;
        }

        $updates = ['operational_status' => 'occupied'];
        if (in_array('operational_status_updated_at', $columns, true)) {
            $updates['operational_status_updated_at'] = date('Y-m-d H:i:s');
        }
        if (in_array('operational_status_updated_by', $columns, true)) {
            $updates['operational_status_updated_by'] = $this->currentUserId();
        }
        if (in_array('updated_at', $columns, true)) {
            $updates['updated_at'] = date('Y-m-d H:i:s');
        }

        DB::table('tables')->where($pk, $tableId)->update($updates);

        if (Schema::hasTable('pmd_table_status_history')) {
            DB::table('pmd_table_status_history')->insert([
                'table_id' => $tableId,
                'old_status' => $old ?: 'available',
                'new_status' => 'occupied',
                'reason' => 'order_created_or_updated',
                'actor_id' => $this->currentUserId(),
                'order_id' => $order ? (int)$order->getKey() : null,
                'context' => json_encode([
                    'source' => 'waiter_pos_v154',
                    'table_number' => (string)($table['number'] ?? ''),
                ]),
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ]);
        }
    }
}
