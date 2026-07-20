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

    protected function applyOpenScope($query, array $cols): void
    {
        $closed = array_values(array_filter(array_map('intval', [
            setting('completed_order_status'),
            setting('canceled_order_status'),
        ])));
        if ($closed && in_array('status_id', $cols, true)) {
            $query->whereNotIn('status_id', $closed);
        }
        if (in_array('settlement_status', $cols, true)) {
            $query->where(function ($q) {
                $q->whereNull('settlement_status')->orWhereNotIn('settlement_status', ['paid', 'settled', 'closed', 'cancelled', 'failed']);
            });
        } elseif (in_array('payment_status', $cols, true)) {
            $query->where(function ($q) {
                $q->whereNull('payment_status')->orWhereNotIn('payment_status', ['paid', 'settled', 'closed']);
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
        $closed = array_values(array_filter(array_map('intval', [
            setting('completed_order_status'),
            setting('canceled_order_status'),
        ])));
        if ($closed && in_array((int)$order->status_id, $closed, true)) {
            return false;
        }
        return !in_array(strtolower((string)($order->settlement_status ?? $order->payment_status ?? '')), ['paid', 'settled', 'cancelled', 'failed', 'closed'], true);
    }

    protected function findOrder(int $orderId): ?Orders_model
    {
        if ($orderId < 1) {
            return null;
        }
        return Orders_model::query()->where('order_id', $orderId)->first();
    }

}
