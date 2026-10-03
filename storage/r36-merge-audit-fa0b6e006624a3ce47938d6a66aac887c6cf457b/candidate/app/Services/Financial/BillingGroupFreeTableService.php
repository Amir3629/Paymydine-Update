<?php

namespace App\Services\Financial;

use Admin\Facades\AdminAuth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use RuntimeException;

final class BillingGroupFreeTableService
{
    /** @var BillingGroupService */
    private $groups;

    /** @var BillingGroupInvoiceService */
    private $invoices;

    /** @var BillingGroupFiscalService */
    private $fiscal;

    public function __construct(
        BillingGroupService $groups,
        BillingGroupInvoiceService $invoices,
        BillingGroupFiscalService $fiscal
    ) {
        $this->groups = $groups;
        $this->invoices = $invoices;
        $this->fiscal = $fiscal;
    }

    /** @return int[] */
    public function preflight(int $tableId): array
    {
        if (!BillingGroupService::schemaReady()) return [];
        if ($tableId < 1 || !Schema::hasTable('tables')) return [];

        $columns = Schema::getColumnListing('tables');
        $pk = in_array('table_id', $columns, true) ? 'table_id' : (in_array('id', $columns, true) ? 'id' : null);
        if (!$pk) return [];

        $table = DB::table('tables')->where($pk, $tableId)->lockForUpdate()->first();
        if (!$table) throw new RuntimeException('Table not found.');

        $candidates = array_values(array_unique(array_filter([
            (string)$tableId,
            isset($table->table_id) ? (string)$table->table_id : null,
            isset($table->table_no) ? (string)$table->table_no : null,
            isset($table->table_number) ? (string)$table->table_number : null,
        ], static fn ($value) => trim((string)$value) !== '')));

        $rows = DB::table('pmd_billing_groups')
            ->where('status', 'open')
            ->whereIn('table_id', $candidates)
            ->orderBy('id')
            ->lockForUpdate()
            ->get();

        $groupIds = [];
        foreach ($rows as $group) {
            $groupIds[] = (int)$group->id;
            if ((string)$group->mode !== 'r36') continue;

            $summary = $this->groups->summaryForPublicId((string)$group->public_id);
            if (!$summary) throw new RuntimeException('Final Bill could not be refreshed.');

            $activeReservation = DB::table('pmd_billing_group_payments')
                ->where('billing_group_id', (int)$group->id)
                ->where('status', 'reserved')
                ->where(function ($query) {
                    $query->whereNull('reserved_until')->orWhere('reserved_until', '>', now());
                })
                ->lockForUpdate()
                ->exists();

            if (($summary['paymentStatus'] ?? 'unpaid') === 'reconciliation_required') {
                throw new RuntimeException('A provider-confirmed payment requires reconciliation before this table can be freed.');
            }
            if ($activeReservation) {
                throw new RuntimeException('A payment is still reserved for this Final Bill. Cancel or complete it before freeing the table.');
            }
            if (($summary['paymentStatus'] ?? 'unpaid') !== 'paid') {
                throw new RuntimeException('The Final Bill is not fully paid. Finish payment before freeing the table.');
            }
        }

        return array_values(array_unique(array_filter($groupIds, static fn ($id) => $id > 0)));
    }

    /** @param int[] $groupIds */
    public function closeAfterFree(array $groupIds): void
    {
        if (!BillingGroupService::schemaReady()) return;

        $actorId = null;
        try {
            $user = AdminAuth::getUser();
            $actorId = $user ? (int)$user->getKey() : null;
        } catch (\Throwable $ignored) {
        }

        foreach (array_values(array_unique(array_map('intval', $groupIds))) as $groupId) {
            if ($groupId < 1) continue;
            $group = DB::table('pmd_billing_groups')->where('id', $groupId)->lockForUpdate()->first();
            if (!$group || (string)$group->status !== 'open') continue;

            $updates = ['status' => 'closed', 'updated_at' => now()];
            if (Schema::hasColumn('pmd_billing_groups', 'closed_at')) $updates['closed_at'] = now();
            if (Schema::hasColumn('pmd_billing_groups', 'closed_by')) $updates['closed_by'] = $actorId;
            DB::table('pmd_billing_groups')->where('id', $groupId)->update($updates);

            if ((string)$group->mode === 'r36') {
                // Local-only fiscal preparation is intentionally inside the table-free
                // transaction so the canonical invoice can already know whether TSS
                // evidence is required. The network SIGN DE call happens after commit.
                $this->fiscal->prepareClosedGroup($groupId);
                $this->invoices->finalizeClosedPaidGroup($groupId);
            }
        }
    }

    /**
     * Run SIGN DE only after the R45 financial/table transaction committed.
     * A remote fiscal error never rewinds a captured payment or re-occupies a table;
     * the durable Final Bill is marked failed/blocked for explicit retry instead.
     *
     * @param int[] $groupIds
     * @return array<int,array<string,mixed>>
     */
    public function fiscalizeAfterCommit(array $groupIds): array
    {
        $results = [];
        foreach (array_values(array_unique(array_map('intval', $groupIds))) as $groupId) {
            if ($groupId < 1) continue;
            try {
                $results[$groupId] = $this->fiscal->finalizeClosedGroup($groupId);
            } catch (\Throwable $e) {
                report($e);
                $results[$groupId] = [
                    'required' => true,
                    'status' => 'failed',
                    'error' => $e->getMessage(),
                ];
            }
        }
        return $results;
    }
}
