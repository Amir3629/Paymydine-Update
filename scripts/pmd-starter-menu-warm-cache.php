#!/usr/bin/env php
<?php

declare(strict_types=1);

use Admin\Services\PmdStarterMenuImageServiceV2;
use Admin\Services\PmdStarterMenuLibraryV4;
use Illuminate\Contracts\Console\Kernel;

$root = dirname(__DIR__);
require $root.'/vendor/autoload.php';
$app = require $root.'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

/** @var PmdStarterMenuLibraryV4 $library */
$library = $app->make(PmdStarterMenuLibraryV4::class);
/** @var PmdStarterMenuImageServiceV2 $images */
$images = $app->make(PmdStarterMenuImageServiceV2::class);

$options = getopt('', ['type::', 'max::', 'sleep-ms::']);
$requestedType = strtolower(trim((string)($options['type'] ?? 'all')));
$max = max(0, (int)($options['max'] ?? 0));
$sleepMs = max(0, min(5000, (int)($options['sleep-ms'] ?? 120)));

if (!$images->isConfigured()) {
    fwrite(STDERR, "ERROR: PMD_PEXELS_API_KEY is not configured.\n");
    exit(2);
}

$available = array_keys($library->restaurantTypes());
if ($requestedType === '' || $requestedType === 'all') {
    $types = $available;
} elseif (in_array($requestedType, $available, true)) {
    $types = [$requestedType];
} else {
    fwrite(STDERR, 'ERROR: unknown restaurant type: '.$requestedType."\n");
    fwrite(STDERR, 'Available: '.implode(', ', $available)."\n");
    exit(3);
}

$summary = [
    'checked' => 0,
    'cached' => 0,
    'created' => 0,
    'missing' => 0,
];

$started = microtime(true);
echo "PAYMYDINE STARTER PHOTO CACHE WARMUP V1\n";
echo 'Types: '.implode(', ', $types)."\n";
echo 'Library: '.PmdStarterMenuLibraryV4::VERSION."\n\n";

foreach ($types as $type) {
    $pack = $library->pack($type);
    $items = array_values(array_filter((array)($pack['items'] ?? []), 'is_array'));
    $typeTotal = count($items);
    $typeCached = 0;
    $typeCreated = 0;
    $typeMissing = 0;

    echo sprintf("[%s] %d items\n", $type, $typeTotal);

    foreach ($items as $index => $item) {
        if ($max > 0 && $summary['checked'] >= $max) break 2;

        $result = $images->warmAsset($item, $type);
        $summary['checked']++;

        $name = trim((string)($item['name'] ?? 'food'));
        if (!empty($result['ok']) && !empty($result['cached'])) {
            $summary['cached']++;
            $typeCached++;
            $state = 'cached';
        } elseif (!empty($result['ok'])) {
            $summary['created']++;
            $typeCreated++;
            $state = 'created';
        } else {
            $summary['missing']++;
            $typeMissing++;
            $state = 'missing:'.(string)($result['reason'] ?? 'unknown');
        }

        echo sprintf(
            "  %3d/%3d %-8s %s\n",
            $index + 1,
            $typeTotal,
            $state,
            $name
        );

        if ($sleepMs > 0 && $state !== 'cached') {
            usleep($sleepMs * 1000);
        }
    }

    echo sprintf(
        "[%s] done: %d cached, %d created, %d missing\n\n",
        $type,
        $typeCached,
        $typeCreated,
        $typeMissing
    );
}

$elapsed = microtime(true) - $started;
echo "======================================================\n";
echo "STARTER PHOTO CACHE WARMUP FINISHED\n";
echo "======================================================\n";
echo 'Checked: '.$summary['checked']."\n";
echo 'Already cached: '.$summary['cached']."\n";
echo 'Created now: '.$summary['created']."\n";
echo 'Missing: '.$summary['missing']."\n";
echo 'Elapsed seconds: '.number_format($elapsed, 1, '.', '')."\n";
echo "\nRe-running this script is safe: existing assets are skipped.\n";

exit($summary['missing'] > 0 ? 4 : 0);
