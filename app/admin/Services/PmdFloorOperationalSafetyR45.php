<?php

namespace Admin\Services;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_FLOOR_OPERATIONAL_SAFETY_R45
 *
 * A destructive Floor action must fail closed when the real physical state
 * OR the financial state is active/unknown. The old Admin UI checked only
 * the enable flag or a limited settlement_status column. Waiter/Cashier
 * maintain independent physical and billing lifecycles.
 *
 * No mutations here. The actual controller/service rechecks this guard
 * immediately before each write; client-side disabled buttons are advisory.
 */
class PmdFloorOperationalSafetyR45
{
    private function deny(string $code, string $message, string $status = 'unknown'): array
    {
        return [
            'allowed' => false,
            'reason' => $code,
            'message' => $message,
            'operational_status' => $status,
        ];
    }

    public function inspectTable(int $tableId, int $locationId = 0, $tableRow = null): array
    {
        if ($tableId < 1 || $locationId < 1) {
            return $this->deny('identity', 'Active table or restaurant location is unavailable.');
        }

        try {
            if (!Schema::hasTable('tables') || !Schema::hasColumn('tables', 'operational_status')) {
                return $this->deny('status_unavailable',
                    'Table safety status cannot be verified. Try again after refreshing.');
            }

            $row = $tableRow ?: DB::table('tables')->where('table_id', $tableId)->first();
            if (!$row) {
                return $this->deny('missing', 'Table no longer exists. Refresh before retrying.');
            }

            $actualId = (int)(data_get($row, 'table_id') ?? 0);
            if ($actualId !== $tableId) {
                return $this->deny('identity', 'Table identity changed. Refresh before retrying.');
            }

            $status = strtolower(trim((string)(data_get($row, 'operational_status') ?? '')));
            if (!in_array($status, ['available', 'free'], true)) {
                $text = $status === '' ? 'unknown' : $status;
                return $this->deny('physical_status',
                    'This table is '.$text.'. Only available tables without an open bill can be disabled or removed.',
                    $text);
            }

            if (!Schema::hasTable('orders')) {
                return $this->deny('orders_unavailable',
                    'Bill status cannot be verified. Table removal and disabling are unavailable.', $status);
            }

            $columns = Schema::getColumnListing('orders');
            $linkColumns = array_values(array_intersect(
                ['table_id', 'dining_table_id', 'location_table_id'], $columns
            ));
            if (!$linkColumns && !in_array('order_type', $columns, true)) {
                return $this->deny('orders_unavailable',
                    'Order-to-table links cannot be verified. Try again later.', $status);
            }

            $queries = [];
            foreach ($linkColumns as $linkColumn) {
                $queries[] = DB::table('orders')->where($linkColumn, $tableId);
            }

            // Some legacy dine-in checks use order_type "Table 7" or "7"
            // with an empty table_id. Check these references too. Do NOT
            // let a settled historical order block a table permanently.
            if (in_array('order_type', $columns, true)) {
                $number = trim((string)(data_get($row, 'table_no') ?? ''));
                $name = trim((string)(data_get($row, 'table_name') ?? ''));
                $posLabel = trim((string)(data_get($row, 'pos_table_label') ?? ''));
                $labels = array_values(array_unique(array_filter([
                    $number, $name, $posLabel,
                    $number !== '' ? 'Table '.$number : '',
                ], static function ($v) { return $v !== ''; })));
                foreach ($labels as $label) {
                    if (in_array('table_id', $columns, true)) {
                        $queries[] = DB::table('orders')
                            ->where('order_type', $label)->whereNull('table_id');
                        $queries[] = DB::table('orders')
                            ->where('order_type', $label)->where('table_id', 0);
                    } else {
                        $queries[] = DB::table('orders')->where('order_type', $label);
                    }
                }
            }

            $needed = array_values(array_intersect([
                'table_id', 'settlement_status', 'payment_status', 'payment',
                'settled_amount', 'order_total', 'total', 'total_amount',
                'grand_total', 'status', 'order_status', 'status_name'
            ], $columns));

            foreach ($queries as $query) {
                if (in_array('location_id', $columns, true)) {
                    $query->where('location_id', $locationId);
                }
                if (in_array('deleted_at', $columns, true)) {
                    $query->whereNull('deleted_at');
                }
                if (in_array('status_id', $columns, true)) {
                    try {
                        $cancelledId = (int)setting('canceled_order_status');
                        if ($cancelledId > 0) $query->where('status_id', '<>', $cancelledId);
                    } catch (\\Throwable $e) {
                        // Missing setting: textual cancellation is inspected below.
                    }
                }

            foreach ($query->select($needed)->cursor() as $order) {
                $rowStatus = strtolower(trim((string)(
                    data_get($order, 'status')
                    ?: data_get($order, 'order_status')
                    ?: data_get($order, 'status_name')
                    ?: ''
                )));
                if (in_array($rowStatus, ['cancelled', 'canceled', 'void', 'voided'], true)) {
                    continue;
                }

                $settlement = strtolower(trim((string)(data_get($order, 'settlement_status') ?? '')));
                $paymentStatus = strtolower(trim((string)(data_get($order, 'payment_status') ?? '')));
                $paymentRaw = strtolower(trim((string)(data_get($order, 'payment') ?? '')));
                $statuses = array_filter([$settlement, $paymentStatus], static function ($v) {
                    return $v !== '';
                });

                $unfinished = ['open', 'unpaid', 'partial', 'part_paid',
                    'partially_paid', 'pending', 'awaiting_payment',
                    'incomplete', 'not_paid', 'processing'];
                foreach ($statuses as $statusValue) {
                    if (in_array($statusValue, $unfinished, true)) {
                        return $this->deny('open_bill',
                            'An open or partially paid bill is linked to this table. Settle it first.',
                            $status);
                    }
                }

                $totals = ['order_total', 'grand_total', 'total_amount', 'total'];
                $amount = null;
                foreach ($totals as $column) {
                    if (in_array($column, $columns, true) && data_get($order, $column) !== null) {
                        $amount = max(0, (float)data_get($order, $column));
                        break;
                    }
                }
                $settled = in_array('settled_amount', $columns, true)
                    ? max(0, (float)(data_get($order, 'settled_amount') ?? 0))
                    : null;
                if ($amount !== null && $amount > 0.005 && $settled !== null &&
                    $settled + 0.005 < $amount && !$statuses) {
                    return $this->deny('open_bill',
                        'This table has an unsettled bill. Settle it before changing availability.',
                        $status);
                }

                $closed = ['paid', 'settled', 'closed', 'fully_paid', 'refunded',
                    'cancelled', 'canceled', 'void', 'voided'];
                if (array_intersect($statuses, $closed)) {
                    continue;
                }
                if (!$statuses && in_array($paymentRaw, ['paid', 'settled', 'refunded'], true)) {
                    continue;
                }
                if (!$statuses && $amount !== null && $amount > 0.005 &&
                    $settled !== null && $settled + 0.005 >= $amount) {
                    continue;
                }

                // Unknown legacy bill status cannot be interpreted as settled.
                return $this->deny('unverified_bill',
                    'A linked bill cannot be confirmed closed. Review its payment status first.',
                    $status);
                }
            }

            return [
                'allowed' => true,
                'reason' => 'available',
                'message' => '',
                'operational_status' => $status,
            ];
        } catch (\Throwable $error) {
            logger()->warning('PMD R45 table safety read failed', [
                'location_id' => $locationId,
                'table_id' => $tableId,
                'error' => $error->getMessage(),
            ]);
            return $this->deny('verification_error',
                'The current table and bill status could not be verified. Please retry.');
        }
    }

    /**
     * A Floor may be removed only when ALL explicitly assigned tables
     * are available and have no live/unverified bills. No physical tables
     * are deleted by registry removal; assignments ordinarily move to Main.
     */
    public function inspectFloor(int $locationId, string $floorId): array
    {
        if ($locationId < 1 || trim($floorId) === '') {
            return ['allowed' => false, 'reason' => 'identity',
                'message' => 'Active Floor identity is unavailable.', 'table_count' => 0];
        }

        try {
            $service = app(PmdSharedFloorRegistryV1::class);
            $snapshot = $service->snapshot($locationId);
            $floor = $service->findById((array)($snapshot['floors'] ?? []), $floorId);
            if (!$floor || $service->isDefaultFloorId((string)($floor['id'] ?? ''))) {
                return ['allowed' => false, 'reason' => 'protected_floor',
                    'message' => 'The default or missing Floor cannot be removed.', 'table_count' => 0];
            }

            $ids = [];
            foreach ((array)($snapshot['table_assignments'] ?? []) as $tableId => $assignedId) {
                if ((string)$assignedId === $floorId && (int)$tableId > 0) {
                    $ids[] = (int)$tableId;
                }
            }
            foreach ($ids as $tableId) {
                $safety = $this->inspectTable($tableId, $locationId);
                if (!$safety['allowed']) {
                    return ['allowed' => false, 'reason' => 'active_tables',
                        'message' => 'Floor cannot be removed while one of its tables is occupied, reserved, cleaning, or has an open/unverified bill. Resolve table '. $tableId .' first.',
                        'table_count' => count($ids), 'blocked_table_id' => $tableId];
                }
            }

            return ['allowed' => true, 'reason' => 'available', 'message' => '',
                'table_count' => count($ids)];
        } catch (\Throwable $error) {
            logger()->warning('PMD R45 Floor safety read failed', [
                'location_id' => $locationId, 'floor_id' => $floorId,
                'error' => $error->getMessage(),
            ]);
            return ['allowed' => false, 'reason' => 'verification_error',
                'message' => 'Floor safety could not be verified. Please retry.',
                'table_count' => 0];
        }
    }

    public function assertTableCanChange(int $tableId, int $locationId): void
    {
        $check = $this->inspectTable($tableId, $locationId);
        if (!$check['allowed']) throw new \DomainException($check['message']);
    }

    public function assertFloorCanRemove(int $locationId, string $floorId): void
    {
        $check = $this->inspectFloor($locationId, $floorId);
        if (!$check['allowed']) throw new \DomainException($check['message']);
    }
}
