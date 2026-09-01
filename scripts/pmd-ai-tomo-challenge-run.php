<?php

/**
 * Safe entrypoint for PMD AI TOMO challenge fixtures.
 *
 * It runs the guarded fixture generator, then clamps any synthetic same-day
 * timestamps that would otherwise land a few minutes in the future when the
 * script is executed shortly after midnight. Use this file, not the lower-level
 * generator, for normal create/replace runs.
 */

require __DIR__.'/pmd-ai-tomo-challenge-fixtures.php';

if (PHP_SAPI !== 'cli') exit(2);

$options = getopt('', ['apply','cleanup','replace','tenant:','location:','confirm:']);
if (!array_key_exists('apply', $options) || array_key_exists('cleanup', $options)) {
    return;
}

if (($options['tenant'] ?? '') !== 'tomo' || (int)($options['location'] ?? 0) !== 1) {
    fwrite(STDERR, "FINALIZE_RESULT=STOP_WRONG_SCOPE\n");
    exit(20);
}

$cutoff = \Carbon\Carbon::now('Europe/Berlin')->subMinute();
$now = \Carbon\Carbon::now('Europe/Berlin');
$ids = taggedOrderIds();

if ($ids) {
    $updates = [];

    if (hasCol('orders', 'settled_at')) {
        DB::table('orders')
            ->whereIn('order_id', $ids)
            ->whereNotNull('settled_at')
            ->where('settled_at', '>', $cutoff->format('Y-m-d H:i:s'))
            ->update(['settled_at' => $cutoff->format('Y-m-d H:i:s')]);
        $updates[] = 'settled_at';
    }

    if (hasCol('orders', 'updated_at')) {
        DB::table('orders')
            ->whereIn('order_id', $ids)
            ->where('updated_at', '>', $now->format('Y-m-d H:i:s'))
            ->update(['updated_at' => $now->format('Y-m-d H:i:s')]);
        $updates[] = 'updated_at';
    }

    if (hasCol('orders', 'kitchen_ready_at')) {
        DB::table('orders')
            ->whereIn('order_id', $ids)
            ->whereNotNull('kitchen_ready_at')
            ->where('kitchen_ready_at', '>', $cutoff->format('Y-m-d H:i:s'))
            ->update(['kitchen_ready_at' => $cutoff->format('Y-m-d H:i:s')]);
        $updates[] = 'kitchen_ready_at';
    }
}

app('cache')->flush();

echo "FINALIZE_RESULT=PASS\n";
echo "TIMESTAMPS_CLAMPED_TO_NOW=".implode(',', $updates ?? [])."\n";
