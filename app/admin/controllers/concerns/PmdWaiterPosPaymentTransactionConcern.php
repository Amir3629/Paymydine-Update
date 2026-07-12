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
            'invoice' => '/admin/orders/invoice/'.$orderId,
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
