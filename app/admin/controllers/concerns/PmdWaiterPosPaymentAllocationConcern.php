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

trait PmdWaiterPosPaymentAllocationConcern
{
    protected function couponResult(string $code, float $amount): array
    {
        if ($code === '') {
            return ['ok' => false, 'message' => 'Coupon code is required.', 'discount' => 0];
        }
        if (!Schema::hasTable('igniter_coupons')) {
            return ['ok' => false, 'message' => 'Coupons are not available.', 'discount' => 0];
        }

        $query = DB::table('igniter_coupons')->where('code', $code);
        if (Schema::hasColumn('igniter_coupons', 'status')) {
            $query->where('status', 1);
        }
        if (Schema::hasColumn('igniter_coupons', 'card_type')) {
            $query->where(function ($q) {
                $q->where('card_type', 'coupon')->orWhereNull('card_type')->orWhere('card_type', '');
            });
        }
        $coupon = $query->first();
        if (!$coupon) {
            return ['ok' => false, 'message' => 'Invalid coupon code.', 'discount' => 0];
        }

        $minTotal = (float)($coupon->min_total ?? 0);
        if ($minTotal > 0 && $amount < $minTotal) {
            return [
                'ok' => false,
                'message' => 'Minimum payment amount of '.$this->currencySymbol().number_format($minTotal, 2).' required.',
                'discount' => 0,
            ];
        }

        $type = strtoupper((string)($coupon->type ?? 'F'));
        $raw = (float)($coupon->discount ?? 0);
        $discount = $type === 'P' ? $amount * ($raw / 100) : $raw;
        if ((float)($coupon->max_discount_cap ?? 0) > 0) {
            $discount = min($discount, (float)$coupon->max_discount_cap);
        }
        $discount = round(max(0, min($discount, $amount)), 4);

        return [
            'ok' => true,
            'message' => 'Coupon applied.',
            'code' => $code,
            'name' => (string)($coupon->name ?? $code),
            'type' => $type,
            'value' => $raw,
            'discount' => $discount,
        ];
    }

    protected function resolvePaymentAllocation(array $summary, array $payload): array
    {
        $remaining = (float)$summary['settlement']['remaining_amount'];
        $grossRatio = max(0.000001, (float)$summary['settlement']['gross_ratio']);
        $mode = strtolower(trim((string)($payload['split_mode'] ?? 'full')));
        if (!in_array($mode, ['full', 'equal', 'items', 'custom'], true)) {
            $mode = 'full';
        }

        $unpaidItems = collect($summary['items'])->filter(fn ($item) => (float)$item['unpaid_quantity'] > 0.0001)->values();
        if ($unpaidItems->isEmpty()) {
            throw ValidationException::withMessages(['items' => 'No unpaid items remain.']);
        }

        if ($mode === 'items') {
            $requested = collect($payload['selected_items'] ?? []);
            if ($requested->isEmpty()) {
                throw ValidationException::withMessages(['selected_items' => 'Select at least one unpaid item.']);
            }
            $rows = [];
            $baseSubtotal = 0.0;
            foreach ($requested as $selected) {
                $id = (int)($selected['order_menu_id'] ?? 0);
                $qty = round((float)($selected['quantity'] ?? 0), 3);
                $item = $unpaidItems->firstWhere('order_menu_id', $id);
                if (!$item || $qty <= 0 || $qty > (float)$item['unpaid_quantity'] + 0.0001) {
                    throw ValidationException::withMessages(['selected_items' => 'An item quantity is invalid or already paid.']);
                }
                $lineTotal = round((float)$item['unit_price'] * $qty, 4);
                $rows[] = [
                    'order_menu_id' => $id,
                    'menu_id' => (int)$item['menu_id'],
                    'quantity_paid' => $qty,
                    'unit_price' => (float)$item['unit_price'],
                    'line_total' => $lineTotal,
                ];
                $baseSubtotal += $lineTotal;
            }
            return [
                'mode' => $mode,
                'gross_amount' => round($baseSubtotal * $grossRatio, 4),
                'rows' => $rows,
            ];
        }

        $targetGross = $mode === 'full'
            ? $remaining
            : round((float)($payload['amount'] ?? 0), 4);
        if ($targetGross <= 0 || $targetGross > $remaining + 0.02) {
            throw ValidationException::withMessages(['amount' => 'Enter an amount between 0.01 and the remaining balance.']);
        }
        if (abs($targetGross - $remaining) <= 0.02) {
            $targetGross = $remaining;
        }

        $targetSubtotal = round($targetGross / $grossRatio, 4);
        $rows = [];
        $left = $targetSubtotal;
        foreach ($unpaidItems as $item) {
            if ($left <= 0.0001) {
                break;
            }
            $unit = (float)$item['unit_price'];
            if ($unit <= 0) {
                continue;
            }
            $maxQty = (float)$item['unpaid_quantity'];
            $maxLine = $unit * $maxQty;
            if ($left >= $maxLine - 0.0001) {
                $qty = $maxQty;
            } else {
                $qty = round(min($maxQty, $left / $unit), 3);
                if ($qty <= 0) {
                    continue;
                }
            }
            $lineTotal = round($unit * $qty, 4);
            $rows[] = [
                'order_menu_id' => (int)$item['order_menu_id'],
                'menu_id' => (int)$item['menu_id'],
                'quantity_paid' => $qty,
                'unit_price' => $unit,
                'line_total' => $lineTotal,
            ];
            $left = round(max(0, $left - $lineTotal), 4);
        }

        if (!$rows) {
            throw ValidationException::withMessages(['amount' => 'Could not allocate this payment to unpaid items.']);
        }

        $allocatedSubtotal = array_sum(array_column($rows, 'line_total'));
        $allocatedGross = round($allocatedSubtotal * $grossRatio, 4);
        if ($targetGross === $remaining) {
            $allocatedGross = $remaining;
        } elseif (abs($allocatedGross - $targetGross) > 0.05) {
            throw ValidationException::withMessages(['amount' => 'Payment amount cannot be allocated precisely. Choose another amount or pay by items.']);
        }

        return [
            'mode' => $mode,
            'gross_amount' => $allocatedGross,
            'rows' => $rows,
        ];
    }

}
