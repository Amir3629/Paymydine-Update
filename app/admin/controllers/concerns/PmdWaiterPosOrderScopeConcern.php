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

trait PmdWaiterPosOrderScopeConcern
{
    protected function applyTableScope($query, array $cols, array $table): void
    {
        $query->where(function ($q) use ($cols, $table) {
            $did = false;
            if (in_array('table_id', $cols, true)) {
                $q->where('table_id', (int)$table['id']);
                $did = true;
            }
            if (in_array('order_type', $cols, true)) {
                $values = array_values(array_unique(array_filter([
                    (string)$table['id'],
                    (string)$table['number'],
                    (string)$table['name'],
                    'Table '.(string)$table['number'],
                ])));
                if ($did) {
                    $q->orWhereIn('order_type', $values);
                } else {
                    $q->whereIn('order_type', $values);
                }
            }
        });
    }

    // PMD_CASHIER_UNPAID_ORDER_EDITABLE_R40
    //
    // Kitchen/service completion and financial settlement are separate
    // lifecycles. A completed/served order may still have an unpaid bill.
    //
    // Only cancellation or started/completed payment makes the order
    // structurally non-editable.
    protected function applyOpenScope($query, array $cols): void
    {
        $cancelled = array_values(
            array_filter(
                array_map('intval', [
                    setting('canceled_order_status'),
                ])
            )
        );

        if (
            $cancelled
            && in_array(
                'status_id',
                $cols,
                true
            )
        ) {
            $query->whereNotIn(
                'status_id',
                $cancelled
            );
        }

        if (
            in_array(
                'settled_amount',
                $cols,
                true
            )
        ) {
            $query->where(function ($q) {
                $q->whereNull(
                    'settled_amount'
                )->orWhere(
                    'settled_amount',
                    '<=',
                    0.0001
                );
            });
        }

        if (
            in_array(
                'settlement_status',
                $cols,
                true
            )
        ) {
            $query->where(function ($q) {
                $q->whereNull(
                    'settlement_status'
                )->orWhereNotIn(
                    'settlement_status',
                    [
                        'partial',
                        'paid',
                        'settled',
                        'closed',
                        'cancelled',
                        'canceled',
                        'failed',
                        'refunded',
                    ]
                );
            });

        } elseif (
            in_array(
                'payment_status',
                $cols,
                true
            )
        ) {
            $query->where(function ($q) {
                $q->whereNull(
                    'payment_status'
                )->orWhereNotIn(
                    'payment_status',
                    [
                        'partial',
                        'paid',
                        'settled',
                        'closed',
                        'cancelled',
                        'canceled',
                        'failed',
                        'refunded',
                    ]
                );
            });
        }
    }

    protected function orderBelongsToTable(Orders_model $order, array $table): bool
    {
        if (isset($order->table_id) && (int)$order->table_id === (int)$table['id']) {
            return true;
        }
        $type = strtolower(trim((string)($order->order_type ?? '')));
        $valid = array_map('strtolower', [
            (string)$table['id'],
            (string)$table['number'],
            (string)$table['name'],
            'Table '.(string)$table['number'],
        ]);
        return in_array($type, $valid, true);
    }

    protected function orderIsOpen(Orders_model $order): bool
    {
        /*
         * Do not treat completed/served kitchen status as financially
         * closed. Only explicit cancellation blocks the order here.
         */
        $cancelled = array_values(
            array_filter(
                array_map('intval', [
                    setting('canceled_order_status'),
                ])
            )
        );

        if (
            $cancelled
            && in_array(
                (int)$order->status_id,
                $cancelled,
                true
            )
        ) {
            return false;
        }

        /*
         * Once any money has been settled, structural item mutation
         * is disabled.
         */
        if (
            (float)(
                $order->settled_amount ?? 0
            ) > 0.0001
        ) {
            return false;
        }

        $financialStatus = strtolower(
            trim(
                (string)(
                    $order->settlement_status
                    ?? $order->payment_status
                    ?? ''
                )
            )
        );

        if (
            in_array(
                $financialStatus,
                [
                    'partial',
                    'paid',
                    'settled',
                    'closed',
                    'cancelled',
                    'canceled',
                    'failed',
                    'refunded',
                ],
                true
            )
        ) {
            return false;
        }

        /*
         * R39 invariant:
         * any recorded payment transaction locks item structure.
         */
        if (
            Schema::hasTable(
                'order_payment_transactions'
            )
            && Schema::hasColumn(
                'order_payment_transactions',
                'order_id'
            )
            && DB::table(
                'order_payment_transactions'
            )
                ->where(
                    'order_id',
                    (int)$order->getKey()
                )
                ->exists()
        ) {
            return false;
        }

        return true;
    }

    protected function findOrder(int $orderId): ?Orders_model
    {
        if ($orderId < 1) {
            return null;
        }
        return Orders_model::query()->where('order_id', $orderId)->first();
    }

}
