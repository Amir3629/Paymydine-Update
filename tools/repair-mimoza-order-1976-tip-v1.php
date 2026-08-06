<?php

declare(strict_types=1);

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

require '/var/www/paymydine/vendor/autoload.php';
$app = require '/var/www/paymydine/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$orderId = 1976;
$expectedSubtotal = 259.30;
$expectedPaid = 285.23;

function closeEnough(float $left, float $right): bool
{
    return abs($left - $right) <= 0.011;
}

function out(array $payload): void
{
    echo json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES).PHP_EOL;
}

$connection = DB::connection();
$pdo = $connection->getPdo();
$pdo->exec('USE `mimoza`');

$result = DB::transaction(function () use ($orderId, $expectedSubtotal, $expectedPaid) {
    $order = DB::table('orders')->where('order_id', $orderId)->lockForUpdate()->first();
    if (!$order) {
        throw new RuntimeException('Order 1976 was not found in database mimoza.');
    }

    $subtotal = round((float)DB::table('order_totals')
        ->where('order_id', $orderId)
        ->where('code', 'subtotal')
        ->value('value'), 2);

    $total = round((float)DB::table('order_totals')
        ->where('order_id', $orderId)
        ->where('code', 'total')
        ->value('value'), 2);

    $tip = round((float)DB::table('order_totals')
        ->where('order_id', $orderId)
        ->where('code', 'tip')
        ->sum('value'), 2);

    $discount = abs(round((float)DB::table('order_totals')
        ->where('order_id', $orderId)
        ->whereIn('code', ['discount', 'coupon'])
        ->sum('value'), 2));

    $paid = 0.0;
    if (Schema::hasTable('order_payment_transactions')) {
        $paid = round((float)DB::table('order_payment_transactions')
            ->where('order_id', $orderId)
            ->whereNotIn('settlement_status', ['failed', 'cancelled'])
            ->sum('amount'), 2);
    }

    if (closeEnough($tip, 25.93) && closeEnough($total, $expectedPaid)) {
        return [
            'status' => 'already_repaired',
            'database' => 'mimoza',
            'order_id' => $orderId,
            'subtotal' => $subtotal,
            'tip' => $tip,
            'discount' => $discount,
            'total' => $total,
            'paid_transactions' => $paid,
        ];
    }

    $guards = [
        'settlement_paid' => strtolower((string)($order->settlement_status ?? '')) === 'paid',
        'subtotal_matches' => closeEnough($subtotal, $expectedSubtotal),
        'paid_matches' => closeEnough($paid, $expectedPaid),
        'no_existing_tip' => closeEnough($tip, 0.0),
        'no_existing_discount' => closeEnough($discount, 0.0),
        'current_total_is_known' => closeEnough($total, $expectedSubtotal) || closeEnough($total, $expectedPaid),
    ];

    if (in_array(false, $guards, true)) {
        throw new RuntimeException('Order 1976 guard mismatch: '.json_encode([
            'guards' => $guards,
            'subtotal' => $subtotal,
            'tip' => $tip,
            'discount' => $discount,
            'total' => $total,
            'paid_transactions' => $paid,
            'settlement_status' => (string)($order->settlement_status ?? ''),
        ]));
    }

    $calculatedTip = round($paid - $subtotal, 2);
    if (!closeEnough($calculatedTip, 25.93)) {
        throw new RuntimeException('Calculated tip is not the expected 25.93.');
    }

    $tipValues = [
        'title' => 'Tip',
        'value' => $calculatedTip,
        'priority' => 3,
    ];
    if (Schema::hasColumn('order_totals', 'is_summable')) {
        $tipValues['is_summable'] = 1;
    }

    DB::table('order_totals')->updateOrInsert([
        'order_id' => $orderId,
        'code' => 'tip',
    ], $tipValues);

    $totalValues = [
        'title' => 'Total',
        'value' => $expectedPaid,
        'priority' => 99,
    ];
    if (Schema::hasColumn('order_totals', 'is_summable')) {
        $totalValues['is_summable'] = 0;
    }

    DB::table('order_totals')->updateOrInsert([
        'order_id' => $orderId,
        'code' => 'total',
    ], $totalValues);

    DB::table('order_totals')
        ->where('order_id', $orderId)
        ->where('code', 'payment_reference')
        ->delete();

    $orderUpdate = [
        'order_total' => $expectedPaid,
        'updated_at' => now(),
    ];

    if (Schema::hasColumn('orders', 'settled_amount')) {
        $orderUpdate['settled_amount'] = $expectedPaid;
    }
    if (Schema::hasColumn('orders', 'settlement_reference')
        && in_array(strtolower(trim((string)($order->settlement_reference ?? ''))), ['[object object]', 'object object'], true)) {
        $orderUpdate['settlement_reference'] = null;
    }

    DB::table('orders')->where('order_id', $orderId)->update($orderUpdate);

    return [
        'status' => 'repaired',
        'database' => 'mimoza',
        'order_id' => $orderId,
        'subtotal' => $subtotal,
        'tip' => $calculatedTip,
        'discount' => 0.0,
        'total' => $expectedPaid,
        'paid_transactions' => $paid,
        'database_migration' => false,
    ];
});

out($result);
