#!/usr/bin/env php
<?php

declare(strict_types=1);

/**
 * PMD VR simulator settlement audit / narrowly-scoped repair.
 *
 * Default READ ONLY:
 *   php scripts/pmd-vr-simulator-settlement-audit-r6.php --tenant=tomo
 *
 * Repair ONLY simulator settlements created through exact idempotency key
 * terminal-attempt-{attempt_id}. Orders with another paid transaction are skipped.
 *
 *   php scripts/pmd-vr-simulator-settlement-audit-r6.php --tenant=tomo --repair
 */

if (PHP_SAPI !== 'cli') {
    fwrite(STDERR, "CLI only.\n");
    exit(2);
}

$options = getopt('', ['tenant:', 'repair', 'help']);
if (isset($options['help'])) {
    echo "Usage:\n";
    echo "  php scripts/pmd-vr-simulator-settlement-audit-r6.php --tenant=tomo\n";
    echo "  php scripts/pmd-vr-simulator-settlement-audit-r6.php --tenant=tomo --repair\n";
    exit(0);
}

$root = dirname(__DIR__);
require $root.'/bootstrap/autoload.php';
$app = require $root.'/bootstrap/app.php';
$kernel = $app->make(\Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\Config;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$tenantDomain = strtolower(trim((string)($options['tenant'] ?? '')));
if ($tenantDomain === '') {
    fwrite(STDERR, "--tenant is required.\n");
    exit(3);
}
if (!str_contains($tenantDomain, '.')) {
    $tenantDomain .= '.paymydine.com';
}

$tenant = DB::connection('mysql')
    ->table('tenants')
    ->whereRaw('LOWER(domain) = ?', [$tenantDomain])
    ->first();

if (!$tenant) {
    fwrite(STDERR, "Tenant not found: {$tenantDomain}\n");
    exit(4);
}

$tenantDb = trim((string)($tenant->database ?? $tenant->database_name ?? ''));
if ($tenantDb === '') {
    fwrite(STDERR, "Tenant database missing.\n");
    exit(5);
}

Config::set('database.connections.mysql.database', $tenantDb);
DB::purge('mysql');
DB::reconnect('mysql');

if (!Schema::hasTable('payment_attempts')) {
    fwrite(STDERR, "payment_attempts table missing.\n");
    exit(6);
}

$repair = isset($options['repair']);

$attempts = DB::table('payment_attempts')
    ->whereRaw('LOWER(provider_code) = ?', ['vr_payment'])
    ->where('terminal_id', 'like', 'PMD-VR-SIM-%')
    ->orderBy('id')
    ->get();

echo "Tenant: {$tenantDomain}\n";
echo "Mode: ".($repair ? "REPAIR" : "READ-ONLY AUDIT")."\n";
echo "Simulator attempts: ".$attempts->count()."\n\n";

$summary = [
    'attempts' => 0,
    'fake_paid_attempts' => 0,
    'repairable' => 0,
    'repaired' => 0,
    'skipped' => 0,
];

foreach ($attempts as $attempt) {
    $summary['attempts']++;
    $attemptId = (int)$attempt->id;
    $orderId = (int)$attempt->order_id;
    $status = strtolower((string)($attempt->status ?? ''));
    $key = 'terminal-attempt-'.$attemptId;

    $order = Schema::hasTable('orders')
        ? DB::table('orders')->where('order_id', $orderId)->first()
        : null;

    $matching = collect();
    $otherPaid = collect();

    if (Schema::hasTable('order_payment_transactions')) {
        if (Schema::hasColumn('order_payment_transactions', 'idempotency_key')) {
            $matching = DB::table('order_payment_transactions')
                ->where('order_id', $orderId)
                ->where('idempotency_key', $key)
                ->get();
        }

        $matchedIds = $matching->pluck('id')->map(fn ($v) => (int)$v)->all();

        $otherPaid = DB::table('order_payment_transactions')
            ->where('order_id', $orderId)
            ->whereRaw('LOWER(COALESCE(settlement_status, "")) = ?', ['paid'])
            ->when($matchedIds, fn ($q) => $q->whereNotIn('id', $matchedIds))
            ->get();
    }

    $fakePaid = $status === 'paid' || $matching->isNotEmpty();
    if ($fakePaid) $summary['fake_paid_attempts']++;

    $repairable = $matching->count() === 1 && $otherPaid->isEmpty();
    if ($repairable) $summary['repairable']++;

    echo sprintf(
        "attempt=%d order=%d terminal=%s status=%s amount=%s order_settlement=%s settled=%s matching_tx=%d other_paid_tx=%d repairable=%s\n",
        $attemptId,
        $orderId,
        (string)($attempt->terminal_id ?? ''),
        (string)($attempt->status ?? ''),
        (string)($attempt->amount ?? ''),
        (string)($order->settlement_status ?? 'n/a'),
        (string)($order->settled_amount ?? 'n/a'),
        $matching->count(),
        $otherPaid->count(),
        $repairable ? 'YES' : 'NO'
    );

    if (!$repair || !$fakePaid) {
        continue;
    }

    if (!$repairable) {
        $summary['skipped']++;
        echo "  SKIP: not narrowly repairable; manual reconciliation required.\n";
        continue;
    }

    $tx = $matching->first();
    $txId = (int)$tx->id;

    DB::transaction(function () use ($attemptId, $orderId, $txId) {
        if (Schema::hasTable('order_payment_transaction_items')) {
            DB::table('order_payment_transaction_items')
                ->where('transaction_id', $txId)
                ->delete();
        }

        DB::table('order_payment_transactions')
            ->where('id', $txId)
            ->delete();

        $orderUpdate = [
            'settled_amount' => 0,
            'settlement_status' => 'unpaid',
            'updated_at' => now(),
        ];

        foreach (['settlement_method', 'settlement_reference', 'settled_at'] as $column) {
            if (Schema::hasColumn('orders', $column)) {
                $orderUpdate[$column] = null;
            }
        }

        DB::table('orders')
            ->where('order_id', $orderId)
            ->update($orderUpdate);

        $attemptUpdate = [
            'status' => 'simulated_approved',
            'error_message' => null,
            'updated_at' => now(),
        ];
        DB::table('payment_attempts')
            ->where('id', $attemptId)
            ->update(array_intersect_key(
                $attemptUpdate,
                array_flip(Schema::getColumnListing('payment_attempts'))
            ));
    });

    $summary['repaired']++;
    echo "  REPAIRED: simulator-created settlement removed; order set back to unpaid.\n";
}

echo "\nSummary:\n";
echo json_encode($summary, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES)."\n";

if (!$repair && $summary['repairable'] > 0) {
    echo "\nTo repair ONLY the narrowly verified simulator settlements above:\n";
    echo "php scripts/pmd-vr-simulator-settlement-audit-r6.php --tenant={$tenantDomain} --repair\n";
}
