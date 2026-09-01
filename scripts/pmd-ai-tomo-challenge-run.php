<?php

/**
 * Safe entrypoint for PMD AI TOMO challenge fixtures.
 *
 * It runs the guarded fixture generator, then:
 * - clamps any synthetic same-day timestamps that would otherwise land a few
 *   minutes in the future when the script is executed shortly after midnight;
 * - gives synthetic categories non-conflicting nested-tree positions;
 * - attaches synthetic menu/category rows explicitly to TOMO location 1 when
 *   the legacy locationables pivot exists.
 *
 * This runner intentionally rejects --replace. To refresh fixtures, run the
 * separately scoped cleanup script first, then run this creator again.
 */

if (PHP_SAPI !== 'cli') exit(2);

$runnerOptions = getopt('', ['apply','cleanup','replace','tenant:','location:','confirm:']);
if (array_key_exists('replace', $runnerOptions)) {
    fwrite(STDERR, "STOP: --replace is disabled in the safe runner. Run pmd-ai-tomo-challenge-cleanup.php first, then create again.\n");
    exit(21);
}
if (array_key_exists('cleanup', $runnerOptions)) {
    fwrite(STDERR, "STOP: use scripts/pmd-ai-tomo-challenge-cleanup.php for cleanup.\n");
    exit(22);
}

require __DIR__.'/pmd-ai-tomo-challenge-fixtures.php';

if (!array_key_exists('apply', $runnerOptions)) {
    return;
}

if (($runnerOptions['tenant'] ?? '') !== 'tomo' || (int)($runnerOptions['location'] ?? 0) !== 1) {
    fwrite(STDERR, "FINALIZE_RESULT=STOP_WRONG_SCOPE\n");
    exit(20);
}

$cutoff = \Carbon\Carbon::now('Europe/Berlin')->subMinute();
$now = \Carbon\Carbon::now('Europe/Berlin');
$ids = taggedOrderIds();
$updates = [];

if ($ids) {
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

$fixtureCategories = Schema::hasTable('categories') && hasCol('categories', 'name')
    ? DB::table('categories')
        ->where('name', 'like', PMD_FIXTURE_PREFIX.'%')
        ->orderBy('category_id')
        ->pluck('category_id')->map('intval')->all()
    : [];

$categoryPositions = 0;
if (
    $fixtureCategories
    && hasCol('categories', 'nest_left')
    && hasCol('categories', 'nest_right')
) {
    $maxRight = (int)DB::table('categories')
        ->whereNotIn('category_id', $fixtureCategories)
        ->max('nest_right');
    $cursor = max(0, $maxRight) + 1;

    foreach ($fixtureCategories as $categoryId) {
        DB::table('categories')->where('category_id', $categoryId)->update([
            'nest_left' => $cursor,
            'nest_right' => $cursor + 1,
        ]);
        $cursor += 2;
        $categoryPositions++;
    }
}

$locationLinks = 0;
if (
    Schema::hasTable('locationables')
    && hasCol('locationables', 'location_id')
    && hasCol('locationables', 'locationable_type')
    && hasCol('locationables', 'locationable_id')
) {
    $fixtureMenus = Schema::hasTable('menus') && hasCol('menus', 'menu_name')
        ? DB::table('menus')
            ->where('menu_name', 'like', PMD_FIXTURE_PREFIX.'%')
            ->pluck('menu_id')->map('intval')->all()
        : [];

    foreach ([
        'menus' => $fixtureMenus,
        'categories' => $fixtureCategories,
    ] as $type => $fixtureIds) {
        foreach ($fixtureIds as $fixtureId) {
            $exists = DB::table('locationables')
                ->where('location_id', 1)
                ->where('locationable_type', $type)
                ->where('locationable_id', $fixtureId)
                ->exists();

            if (!$exists) {
                DB::table('locationables')->insert([
                    'location_id' => 1,
                    'locationable_type' => $type,
                    'locationable_id' => $fixtureId,
                ]);
                $locationLinks++;
            }
        }
    }
}

echo "FINALIZE_RESULT=PASS\n";
echo "TIMESTAMPS_CLAMPED_TO_NOW=".implode(',', $updates)."\n";
echo "CATEGORY_TREE_POSITIONS_NORMALIZED={$categoryPositions}\n";
echo "LOCATIONABLE_LINKS_CREATED={$locationLinks}\n";
