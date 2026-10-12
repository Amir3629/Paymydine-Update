<?php

namespace Admin\Controllers\Concerns;

use Admin\Facades\AdminAuth;
use Admin\Models\Menus_model;
use Admin\Models\Orders_model;
use Admin\Models\Payments_model;
use App\Services\TerminalPayments\TerminalPaymentService;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Validation\ValidationException;

trait PmdWaiterPosPaymentTransactionConcern
{
    /**
     * R21: a cloned group restaurant can reach POS before its old template's
     * split-payment tables exist. Bootstrap only this signed-in tenant's
     * settlement schema, BEFORE any order/payment DB transaction begins.
     *
     * Never alter the payment provider/catalog configuration. Never infer
     * that switching the dashboard report scope changes the POS database.
     */
    protected function pmdEnsurePaymentStorageR21(): void
    {
        if (DB::getDefaultConnection() !== 'tenant'
            || trim((string)DB::connection('tenant')->getDatabaseName()) === '') {
            throw ValidationException::withMessages([
                'payment' => 'Restaurant payment database context is unavailable.',
            ]);
        }

        $schema = DB::connection('tenant')->getSchemaBuilder();
        $required = [
            'order_payment_transactions' => [
                'id', 'order_id', 'amount', 'idempotency_key',
                'settlement_status', 'payment_method',
            ],
            'order_payment_transaction_items' => [
                'id', 'transaction_id', 'order_menu_id',
                'quantity_paid', 'unit_price', 'line_total',
            ],
            'payment_attempts' => ['id', 'order_id', 'provider_code', 'amount', 'status'],
            'orders' => ['order_id', 'settlement_status', 'settled_amount'],
        ];
        $missing = false;
        foreach ($required as $table => $columns) {
            if (!$schema->hasTable($table)
                || array_diff($columns, $schema->getColumnListing($table))) {
                $missing = true;
                break;
            }
        }

        if (!$missing) return;

        $report = app(\App\Services\PmdTenantProductBaselineR1::class)
            ->repairCurrentTenant(['payment_runtime', 'orders']);
        $healthy = !empty($report['ok'])
            && !empty($report['steps']['payment_runtime']['ok'])
            && !empty($report['steps']['order_settlement']['ok']);
        foreach ($required as $table => $columns) {
            if (!$schema->hasTable($table)
                || array_diff($columns, $schema->getColumnListing($table))) {
                $healthy = false;
                break;
            }
        }
        // Quick POS uses schema memoization for performance. A missing-table
        // result cached before repair must not persist in this request.
        $this->pmdPosSchemaTableCache = [];
        $this->pmdPosSchemaColumnCache = [];

        if (!$healthy) {
            throw ValidationException::withMessages([
                'payment' => 'Restaurant payment storage is incomplete. No payment was recorded; contact support.',
            ]);
        }
    }

    protected function insertPaymentTransaction(array $data): int
    {
        if (!Schema::hasTable('order_payment_transactions')) {
            throw ValidationException::withMessages([
                'payment' => 'Split payment tables are missing. Run the PayMyDine payment migrations first.',
            ]);
        }
        $data['created_at'] = now();
        $data['updated_at'] = now();
        return (int)DB::table('order_payment_transactions')->insertGetId($this->filterColumns('order_payment_transactions', $data));
    }

    protected function insertPaymentAllocations(int $transactionId, array $rows): void
    {
        if (!Schema::hasTable('order_payment_transaction_items')) {
            throw ValidationException::withMessages(['payment' => 'Payment allocation table is missing.']);
        }
        $columns = Schema::getColumnListing('order_payment_transaction_items');
        $allocationColumn = in_array('order_menu_id', $columns, true)
            ? 'order_menu_id'
            : (in_array('order_item_id', $columns, true) ? 'order_item_id' : null);
        if (!$allocationColumn) {
            throw ValidationException::withMessages(['payment' => 'Payment allocation column is missing.']);
        }

        $inserts = [];
        foreach ($rows as $row) {
            $insert = [
                'transaction_id' => $transactionId,
                $allocationColumn => (int)$row['order_menu_id'],
                'quantity_paid' => (float)$row['quantity_paid'],
                'unit_price' => (float)$row['unit_price'],
                'line_total' => (float)$row['line_total'],
                'created_at' => now(),
                'updated_at' => now(),
            ];
            if (in_array('menu_id', $columns, true)) {
                $insert['menu_id'] = (int)$row['menu_id'];
            }
            if (in_array('order_menu_id', $columns, true)) {
                $insert['order_menu_id'] = (int)$row['order_menu_id'];
            }
            $inserts[] = array_intersect_key($insert, array_flip($columns));
        }
        DB::table('order_payment_transaction_items')->insert($inserts);
    }

    protected function tableForOrder(Orders_model $order): ?array
    {
        $candidates = array_values(array_unique(array_filter([
            isset($order->table_id) ? (string)$order->table_id : null,
            (string)($order->order_type ?? ''),
        ])));
        foreach ($candidates as $candidate) {
            if (is_numeric($candidate)) {
                $table = $this->resolveTable((int)$candidate);
                if ($table) {
                    return $table;
                }
            }
            if (Schema::hasTable('tables')) {
                $row = DB::table('tables')->where('table_name', $candidate)->first();
                if ($row) {
                    $id = (int)($row->table_no ?? $row->table_id ?? 0);
                    if ($id > 0) {
                        return $this->resolveTable($id);
                    }
                }
            }
        }
        return null;
    }

    protected function orderUrls(int $orderId): array
    {
        return [
            'edit' => '/admin/orders/edit/'.$orderId,
            'dashboard' => '/admin/dashboardwaiter',
            'payment' => '/admin/payments?order_id='.$orderId,
            // PMD_CANONICAL_CASHIER_INVOICE_URL_R49
            'invoice' => '/admin/pmd-cashier-order-center/invoice/'.$orderId,
        ];
    }

    protected function currencySymbol(): string
    {
        try {
            return function_exists('currency') ? (string)currency()->getDefault()->currency_symbol : '€';
        } catch (\Throwable $ignored) {
            return '€';
        }
    }

    protected function currencyCode(): string
    {
        try {
            return function_exists('currency') ? (string)currency()->getDefault()->currency_code : 'EUR';
        } catch (\Throwable $ignored) {
            return 'EUR';
        }
    }

    protected function filterColumns(string $table, array $data): array
    {
        if (!Schema::hasTable($table)) {
            return $data;
        }
        return array_intersect_key($data, array_flip(Schema::getColumnListing($table)));
    }
}
