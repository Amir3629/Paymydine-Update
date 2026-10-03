#!/usr/bin/env php
<?php

declare(strict_types=1);

use App\Services\Inventory\PmdInventoryStockCatalog;
use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Str;

$root = dirname(__DIR__);
$stage = $argv[1] ?? '/tmp/pmd-rewe-audit';
$siteDir = rtrim($stage, '/').'/site';
$altDir = rtrim($stage, '/').'/alternates';
$manifestPath = rtrim($stage, '/').'/manifest.tsv';

if (!is_file($root.'/bootstrap/autoload.php') || !is_file($root.'/bootstrap/app.php')) {
    fwrite(STDERR, "PayMyDine bootstrap files were not found.\n");
    exit(1);
}
if (!is_dir($siteDir) || !is_file($manifestPath)) {
    fwrite(STDERR, "REWE stage is incomplete: {$stage}\n");
    exit(1);
}

chdir($root);
require $root.'/bootstrap/autoload.php';
$app = require $root.'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$liveDir = $root.'/app/admin/assets/images/pmd-inventory-rewe';
$liveAltDir = $liveDir.'/alternates';
$runtimePath = $root.'/storage/app/pmd-inventory-rewe-catalog-r18.json';

@mkdir($liveDir, 0755, true);
@mkdir($liveAltDir, 0755, true);
@mkdir(dirname($runtimePath), 0755, true);

$newItems = [
    'black-plums' => ['Black plums', 'Fruit', 'g', 'kg', 1000, ['black plum']],
    'cauliflower-and-broccoli' => ['Cauliflower & broccoli mix', 'Produce', 'g', 'kg', 1000, ['cauliflower broccoli mix']],
    'cherry-tomatoes-on-the-vine' => ['Cherry tomatoes on the vine', 'Produce', 'g', 'kg', 1000, ['vine cherry tomatoes']],
    'curly-parsley' => ['Curly parsley', 'Fresh herbs', 'g', 'bunch', null, ['curled parsley']],
    'flat-peaches' => ['Flat peaches', 'Fruit', 'g', 'kg', 1000, ['donut peaches|saturn peaches']],
    'green-chili-peppers' => ['Green chili peppers', 'Produce', 'g', 'kg', 1000, ['green chilli peppers']],
    'green-zucchini' => ['Green zucchini', 'Produce', 'g', 'kg', 1000, ['green courgette']],
    'hokkaido-pumpkin' => ['Hokkaido pumpkin', 'Produce', 'g', 'kg', 1000, ['red kuri squash']],
    'kanzi-apples' => ['Kanzi apples', 'Fruit', 'g', 'kg', 1000, ['kanzi apple']],
    'kiwi-berries' => ['Kiwi berries', 'Fruit', 'g', 'kg', 1000, ['kiwiberry|baby kiwi']],
    'mandarins' => ['Mandarins', 'Fruit', 'g', 'kg', 1000, ['mandarin orange|mandarine']],
    'mini-cucumbers' => ['Mini cucumbers', 'Produce', 'g', 'kg', 1000, ['mini cucumber|snack cucumber']],
    'mixed-bell-peppers' => ['Mixed bell peppers', 'Produce', 'g', 'kg', 1000, ['mixed peppers']],
    'mixed-chili-peppers' => ['Mixed chili peppers', 'Produce', 'g', 'kg', 1000, ['mixed chilli peppers']],
    'mixed-grapes' => ['Mixed grapes', 'Fruit', 'g', 'kg', 1000, ['mixed seedless grapes']],
    'orange-bell-pepper' => ['Orange bell pepper', 'Produce', 'g', 'kg', 1000, ['orange pepper']],
    'parsley-root' => ['Parsley root', 'Produce', 'g', 'kg', 1000, ['root parsley']],
    'red-and-yellow-bell-peppers' => ['Red & yellow bell peppers', 'Produce', 'g', 'kg', 1000, ['red yellow peppers']],
    'red-apples' => ['Red apples', 'Fruit', 'g', 'kg', 1000, ['red apple']],
    'red-grapes' => ['Red grapes', 'Fruit', 'g', 'kg', 1000, ['red grape']],
    'red-pointed-peppers' => ['Red pointed peppers', 'Produce', 'g', 'kg', 1000, ['pointed red pepper|sweet pointed pepper']],
    'romaine-lettuce-hearts' => ['Romaine lettuce hearts', 'Produce', 'g', 'kg', 1000, ['romaine hearts']],
    'soup-vegetable-bundle' => ['Soup vegetable bundle', 'Produce', 'piece', 'piece', 1, ['soup greens bundle|soup vegetables']],
    'sugar-snap-peas' => ['Sugar snap peas', 'Produce', 'g', 'kg', 1000, ['snap peas|mangetout']],
    'vine-tomatoes' => ['Vine tomatoes', 'Produce', 'g', 'kg', 1000, ['tomatoes on the vine']],
    'white-button-mushrooms' => ['White button mushrooms', 'Produce', 'g', 'kg', 1000, ['white mushrooms|button mushrooms']],
    'yellow-onions' => ['Yellow onions', 'Produce', 'g', 'kg', 1000, ['yellow onion']],
    'chanterelles' => ['Chanterelles', 'Produce', 'g', 'kg', 1000, ['chanterelle|chanterelle mushrooms']],
    'green-pears' => ['Green pears', 'Fruit', 'g', 'kg', 1000, ['green pear']],
    'hass-avocado' => ['Hass avocado', 'Produce', 'g', 'kg', 1000, ['hass avocados']],
    'physalis' => ['Physalis', 'Fruit', 'g', 'kg', 1000, ['cape gooseberry|golden berry']],
];

$manualExisting = [
    'red-onions' => 'Red onion',
    'mixed-salad' => 'Spring Mix Salad Greens',
];

$catalog = PmdInventoryStockCatalog::all();
$byName = [];
$byAlias = [];

foreach ($catalog as $row) {
    if (!is_array($row)) continue;
    $name = trim((string)($row['name'] ?? ''));
    $key = Str::slug($name);
    if ($key !== '' && !isset($byName[$key])) {
        $byName[$key] = $row;
    }
    foreach ((array)($row['aliases'] ?? []) as $alias) {
        $aliasKey = Str::slug((string)$alias);
        if ($aliasKey !== '' && !isset($byAlias[$aliasKey])) {
            $byAlias[$aliasKey] = $row;
        }
    }
}

$manifest = [];
$handle = fopen($manifestPath, 'rb');
$headers = $handle ? fgetcsv($handle, 0, "\t") : false;
if (!is_array($headers)) {
    fwrite(STDERR, "Invalid REWE manifest.tsv\n");
    exit(1);
}
while (($data = fgetcsv($handle, 0, "\t")) !== false) {
    if (!$data) continue;
    $data = array_pad($data, count($headers), '');
    $row = array_combine($headers, $data);
    if (!is_array($row)) continue;
    $slug = Str::slug((string)($row['slug'] ?? ''));
    if ($slug !== '') $manifest[$slug] = $row;
}
fclose($handle);

$imageMap = [];
$runtimeItems = [];
$unresolved = [];
$copied = 0;
$mappedExisting = 0;
$added = 0;

foreach ($manifest as $slug => $sourceRow) {
    $source = $siteDir.'/'.$slug.'.webp';
    if (!is_file($source) || (int)@filesize($source) < 3000) {
        $unresolved[] = $slug.' (missing image)';
        continue;
    }

    $targetName = null;

    if (isset($newItems[$slug])) {
        [$name, $category, $unit, $purchaseUnit, $factor, $aliases] = $newItems[$slug];
        $aliasList = [];
        foreach ($aliases as $aliasGroup) {
            foreach (explode('|', (string)$aliasGroup) as $alias) {
                $alias = trim($alias);
                if ($alias !== '') $aliasList[] = $alias;
            }
        }

        $runtimeItems[] = [
            'name' => $name,
            'category' => $category,
            'unit' => $unit,
            'purchase_unit' => $purchaseUnit,
            'purchase_to_base' => $factor,
            'aliases' => array_values(array_unique($aliasList)),
            'rewe_image_slug' => $slug,
        ];
        $targetName = $name;
        $added++;
    } elseif (isset($manualExisting[$slug])) {
        $targetName = $manualExisting[$slug];
        $mappedExisting++;
    } elseif (isset($byName[$slug])) {
        $targetName = (string)($byName[$slug]['name'] ?? '');
        $mappedExisting++;
    } elseif (isset($byAlias[$slug])) {
        $targetName = (string)($byAlias[$slug]['name'] ?? '');
        $mappedExisting++;
    }

    if (!$targetName) {
        $unresolved[] = $slug;
        continue;
    }

    $targetKey = Str::slug($targetName);
    if ($targetKey === '') {
        $unresolved[] = $slug.' (bad target)';
        continue;
    }

    $imageMap[$targetKey] = $slug;

    $destination = $liveDir.'/'.$slug.'.webp';
    if (!@copy($source, $destination)) {
        $unresolved[] = $slug.' (copy failed)';
        continue;
    }
    @chmod($destination, 0644);
    $copied++;
}

if (is_dir($altDir)) {
    foreach (glob($altDir.'/*.webp') ?: [] as $file) {
        $destination = $liveAltDir.'/'.basename($file);
        @copy($file, $destination);
        @chmod($destination, 0644);
    }
}

if ($unresolved) {
    fwrite(STDERR, "Install stopped because some REWE items were unresolved:\n");
    foreach ($unresolved as $row) fwrite(STDERR, " - {$row}\n");
    exit(2);
}

$payload = [
    'version' => '18.0.0',
    'generated_at' => gmdate('c'),
    'source' => 'user-provided REWE image pack',
    'image_count' => $copied,
    'image_map' => $imageMap,
    'items' => $runtimeItems,
];

file_put_contents(
    $runtimePath,
    json_encode($payload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
);
@chmod($runtimePath, 0644);

echo "REWE pack installed successfully.\n";
echo "Images copied      : {$copied}\n";
echo "Existing mappings  : {$mappedExisting}\n";
echo "New catalog items  : {$added}\n";
echo "Image map entries  : ".count($imageMap)."\n";
echo "Runtime manifest   : {$runtimePath}\n";
echo "Live image folder  : {$liveDir}\n";
