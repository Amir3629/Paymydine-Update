#!/usr/bin/env php
<?php

declare(strict_types=1);

use Illuminate\Support\Str;

/**
 * PMD_INVENTORY_SUPERMARKET_MASTER_CATALOG_R14
 *
 * Materializes a broad supermarket / wholesale starter catalog from
 * Ingredient Atlas and downloads its catalog thumbnails locally.
 *
 * Default scope:
 * - food
 * - household
 * - personal-care
 *
 * Pet records are intentionally excluded from restaurant stock.
 *
 * Output:
 * - storage/app/pmd-inventory-atlas-catalog-r14.json
 * - storage/app/pmd-inventory-atlas-sources-r14.json
 * - app/admin/assets/images/pmd-inventory-atlas/*.webp
 *
 * Every downloaded image is re-rendered onto a clean 512x512 white canvas.
 * There is no keyword image search. Each photo stays attached to its Atlas
 * catalog record; unresolved PMD core items keep the UI fallback.
 */

$root = dirname(__DIR__);
$autoload = $root.'/vendor/autoload.php';
if (!is_file($autoload)) {
    fwrite(STDERR, "vendor/autoload.php was not found. Run this from a deployed PayMyDine checkout.\n");
    exit(1);
}
require $autoload;

$options = getopt('', ['force', 'clean', 'limit::', 'sleep-ms::']);
$force = array_key_exists('force', $options);
$clean = array_key_exists('clean', $options);
$limit = max(0, (int)($options['limit'] ?? 0));
$sleepMs = max(0, min(2000, (int)($options['sleep-ms'] ?? 45)));

if (!function_exists('curl_init')) {
    fwrite(STDERR, "PHP cURL is required.\n");
    exit(1);
}
if (!function_exists('imagecreatefromstring') || !function_exists('imagewebp')) {
    fwrite(STDERR, "PHP GD with WebP support is required.\n");
    exit(1);
}

$datasetBase = 'https://huggingface.co/datasets/ionicam/ingredient-atlas/raw/main';
$imageBase = 'https://huggingface.co/datasets/ionicam/ingredient-atlas/resolve/main';
$metadataUrl = $datasetBase.'/metadata.jsonl';

$outDir = $root.'/app/admin/assets/images/pmd-inventory-atlas';
$catalogPath = $root.'/storage/app/pmd-inventory-atlas-catalog-r14.json';
$auditPath = $root.'/storage/app/pmd-inventory-atlas-sources-r14.json';
$tmpMetadata = sys_get_temp_dir().'/pmd-inventory-atlas-r14-'.getmypid().'.jsonl';

foreach ([$outDir, dirname($catalogPath), dirname($auditPath)] as $directory) {
    if (!is_dir($directory) && !@mkdir($directory, 0755, true) && !is_dir($directory)) {
        fwrite(STDERR, "Could not create {$directory}\n");
        exit(1);
    }
}

if ($clean) {
    foreach (glob($outDir.'/*.webp') ?: [] as $file) {
        @unlink($file);
    }
}

echo "PayMyDine Inventory R14 - Supermarket Master Catalog\n";
echo "Source: Ingredient Atlas public catalog\n";
echo "Scope: food + household + personal-care (pet excluded)\n";
echo "Images: normalized to white 512x512 WebP cards\n";
echo "Destination: {$outDir}\n\n";

echo "Downloading Ingredient Atlas metadata ... ";
if (!downloadFile($metadataUrl, $tmpMetadata, 30 * 1024 * 1024)) {
    fwrite(STDERR, "FAILED\nCould not download Ingredient Atlas metadata. Existing Inventory remains usable.\n");
    exit(1);
}
echo "OK\n";

$records = loadAtlasRecords($tmpMetadata);
@unlink($tmpMetadata);

if (count($records) < 1500) {
    fwrite(STDERR, "Ingredient Atlas metadata looked incomplete (".count($records)." rows). Aborting.\n");
    exit(1);
}

echo "Atlas records loaded: ".count($records)."\n";

$catalog = [];
$audit = [
    'source' => 'Ingredient Atlas',
    'source_repo' => 'https://github.com/ionmesca/ingredient-atlas',
    'source_dataset' => 'https://huggingface.co/datasets/ionicam/ingredient-atlas',
    'image_license' => 'CC0-1.0',
    'metadata_license' => 'CC0-1.0',
    'installed_at' => gmdate('c'),
    'scope' => ['food', 'household', 'personal-care'],
    'items' => [],
];

$eligible = [];
foreach ($records as $row) {
    if (!recordIsEligible($row)) {
        continue;
    }

    $catalogRow = catalogRow($row);
    if (!$catalogRow) {
        continue;
    }

    $eligible[] = [$row, $catalogRow];
}

usort($eligible, static function (array $a, array $b): int {
    return strcasecmp((string)$a[1]['name'], (string)$b[1]['name']);
});

if ($limit > 0) {
    $eligible = array_slice($eligible, 0, $limit);
}

$total = count($eligible);
$saved = 0;
$skipped = 0;
$failed = 0;
$catalogOnly = 0;

foreach ($eligible as $index => [$row, $catalogRow]) {
    $catalog[] = $catalogRow;

    $n = $index + 1;
    $name = (string)$catalogRow['name'];
    $atlasSlug = (string)$catalogRow['atlas_slug'];
    $target = $outDir.'/'.$atlasSlug.'.webp';

    $fileName = trim((string)($row['file_name'] ?? ''));
    if ($fileName === '') {
        echo "[{$n}/{$total}] CATALOG {$name} (no image path)\n";
        $catalogOnly++;
        continue;
    }

    if (!$force && is_file($target) && (int)@filesize($target) > 4000) {
        echo "[{$n}/{$total}] SKIP    {$name}\n";
        $skipped++;
        continue;
    }

    echo "[{$n}/{$total}] GET     {$name} ... ";

    $sourcePath = null;
    $tmp = $target.'.source-'.bin2hex(random_bytes(4));

    $webpUrl = $imageBase.'/'.encodePath($fileName).'?download=true';
    if (downloadFile($webpUrl, $tmp, 5 * 1024 * 1024) && imageLooksValid($tmp)) {
        $sourcePath = $fileName;
    } else {
        @unlink($tmp);

        $pngFile = preg_replace(
            '#^images/webp/512/(.+)\.webp$#',
            'images/png/512/$1.png',
            $fileName
        );

        if (is_string($pngFile) && $pngFile !== $fileName) {
            $pngUrl = $imageBase.'/'.encodePath($pngFile).'?download=true';
            if (downloadFile($pngUrl, $tmp, 8 * 1024 * 1024) && imageLooksValid($tmp)) {
                $sourcePath = $pngFile;
            }
        }
    }

    if (!$sourcePath || !normalizeToWhiteWebp($tmp, $target)) {
        @unlink($tmp);
        echo "FAILED\n";
        $failed++;
        usleep($sleepMs * 1000);
        continue;
    }

    @unlink($tmp);
    @chmod($target, 0644);

    $audit['items'][$atlasSlug] = [
        'name' => $name,
        'kind' => (string)$catalogRow['atlas_kind'],
        'category' => (string)$catalogRow['category'],
        'atlas_category' => (string)$catalogRow['atlas_category'],
        'atlas_subcategory' => (string)$catalogRow['atlas_subcategory'],
        'review_status' => (string)($row['review_status'] ?? ''),
        'source_path' => $sourcePath,
        'saved_file' => basename($target),
        'sha256_saved' => hash_file('sha256', $target) ?: null,
    ];

    echo "OK\n";
    $saved++;
    usleep($sleepMs * 1000);
}

$catalogPayload = [
    'version' => '14.0.0',
    'generated_at' => gmdate('c'),
    'source' => 'Ingredient Atlas',
    'scope' => ['food', 'household', 'personal-care'],
    'count' => count($catalog),
    'items' => $catalog,
];

file_put_contents(
    $catalogPath,
    json_encode($catalogPayload, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
);
file_put_contents(
    $auditPath,
    json_encode($audit, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
);

echo "\nDone. catalog=".count($catalog)." saved={$saved} skipped={$skipped} catalog_only={$catalogOnly} failed={$failed}\n";
echo "Catalog: {$catalogPath}\n";
echo "Audit: {$auditPath}\n";

function loadAtlasRecords(string $path): array
{
    $records = [];
    $handle = @fopen($path, 'rb');
    if (!$handle) {
        return [];
    }

    while (($line = fgets($handle)) !== false) {
        $line = trim($line);
        if ($line === '') continue;

        $row = json_decode($line, true);
        if (is_array($row)) {
            $records[] = $row;
        }
    }

    fclose($handle);
    return $records;
}

function recordIsEligible(array $row): bool
{
    $review = strtolower(trim((string)($row['review_status'] ?? '')));
    if (in_array($review, ['rejected', 'blocked'], true)) {
        return false;
    }

    $kind = atlasKind($row);
    return in_array($kind, ['food', 'household', 'personal-care'], true);
}

function atlasKind(array $row): string
{
    $kind = strtolower(trim((string)($row['kind'] ?? '')));
    $kind = str_replace('_', '-', $kind);

    if ($kind !== '') {
        return $kind;
    }

    $category = strtolower(trim((string)($row['category'] ?? '')));
    if ($category === 'household') return 'household';
    if (in_array($category, ['personal-care', 'personal care', 'personal_care'], true)) {
        return 'personal-care';
    }

    return 'food';
}

function catalogRow(array $row): ?array
{
    $name = trim((string)($row['display_name'] ?? $row['displayName'] ?? ''));
    $slug = normalizeKey((string)($row['slug'] ?? $name));
    if ($name === '' || $slug === '') {
        return null;
    }

    $kind = atlasKind($row);
    $atlasCategory = strtolower(trim((string)($row['category'] ?? '')));
    $atlasSubcategory = strtolower(trim((string)($row['subcategory'] ?? '')));

    $category = pmdCategory($kind, $atlasCategory, $atlasSubcategory, $name);
    [$unit, $purchaseUnit, $factor] = unitDefaults($category, $name, $atlasSubcategory);

    $aliases = [];
    foreach (['aliases', 'aliases_de'] as $field) {
        $values = $row[$field] ?? [];
        if (!is_array($values)) continue;
        foreach ($values as $value) {
            $value = trim((string)$value);
            if ($value !== '') $aliases[] = $value;
        }
    }
    $aliases[] = str_replace('-', ' ', $slug);
    $aliases = array_values(array_unique($aliases));

    return [
        'name' => $name,
        'category' => $category,
        'unit' => $unit,
        'purchase_unit' => $purchaseUnit,
        'purchase_to_base' => $factor,
        'aliases' => $aliases,
        'cuisines' => [],
        'catalog_source' => 'ingredient-atlas',
        'atlas_slug' => $slug,
        'image_slug' => $slug,
        'atlas_kind' => $kind,
        'atlas_category' => $atlasCategory,
        'atlas_subcategory' => $atlasSubcategory,
    ];
}

function pmdCategory(string $kind, string $atlasCategory, string $subcategory, string $name): string
{
    $haystack = strtolower($name.' '.$atlasCategory.' '.$subcategory);

    if ($kind === 'personal-care') {
        return 'Personal care';
    }

    if ($kind === 'household' || $atlasCategory === 'household') {
        if (containsAny($haystack, [
            'clean', 'detergent', 'dishwash', 'laundry', 'bleach', 'disinfect',
            'sanit', 'degreas', 'soap', 'rinse aid', 'drain', 'descaler',
            'fabric softener', 'stain remover', 'air freshener'
        ])) return 'Cleaning';

        if (containsAny($haystack, [
            'toilet paper', 'paper towel', 'tissue', 'napkin', 'wipe',
            'trash bag', 'garbage bag', 'bin liner', 'foil', 'cling film',
            'parchment', 'baking paper'
        ])) return 'Paper & hygiene';

        if (containsAny($haystack, [
            'cup', 'lid', 'straw', 'takeaway', 'takeout', 'food container',
            'pizza box', 'burger box', 'paper bag', 'plastic bag',
            'cutlery', 'disposable', 'food storage'
        ])) return 'Packaging';

        if (containsAny($haystack, [
            'mop', 'broom', 'brush', 'sponge', 'scrubber', 'cloth',
            'microfiber', 'dustpan', 'bucket', 'squeegee', 'glove',
            'coffee filter', 'batter', 'light bulb', 'thermometer'
        ])) return 'Kitchen & utility';

        return 'Household supplies';
    }

    if ($atlasCategory === 'produce') {
        if (containsAny($haystack, [
            'fruit', 'berry', 'berries', 'apple', 'pear', 'banana', 'orange',
            'lemon', 'lime', 'grape', 'melon', 'mango', 'papaya', 'pineapple',
            'peach', 'plum', 'apricot', 'fig', 'date', 'kiwi', 'pomegranate',
            'coconut', 'cherry', 'currant'
        ])) return 'Fruit';
        return 'Produce';
    }

    if ($atlasCategory === 'herbs') return 'Fresh herbs';

    if ($atlasCategory === 'meat') {
        if (containsAny($haystack, [
            'chicken', 'turkey', 'duck', 'goose', 'quail', 'poultry'
        ])) return 'Poultry';
        return 'Meat';
    }

    if ($atlasCategory === 'seafood') return 'Seafood';
    if ($atlasCategory === 'dairy') return 'Dairy & eggs';
    if ($atlasCategory === 'grains') return 'Dry goods';
    if ($atlasCategory === 'spices') return 'Spices';
    if ($atlasCategory === 'condiments') return 'Oils & condiments';
    if ($atlasCategory === 'bakery') return 'Bakery';
    if ($atlasCategory === 'frozen') return 'Frozen';

    if ($atlasCategory === 'beverages') {
        if (containsAny($haystack, [
            'vodka','gin','rum','whisky','whiskey','bourbon','tequila','mezcal',
            'brandy','cognac','raki','arak','ouzo','sake','soju','liqueur',
            'amaretto','aperol','campari','vermouth','sambuca','grappa',
            'limoncello','absinthe','spirit'
        ])) return 'Spirits';

        if (containsAny($haystack, [
            'beer','lager','pilsner','pils','ipa','stout','porter','ale','cider'
        ])) return 'Beer & cider';

        if (containsAny($haystack, [
            'wine','champagne','prosecco','cava','sherry','port wine'
        ])) return 'Wine';

        if (containsAny($haystack, ['juice','nectar'])) return 'Juice';
        if (containsAny($haystack, [
            'coffee','espresso','tea','matcha','chai'
        ])) return 'Coffee & tea';
        if (containsAny($haystack, [
            'water','tonic','club soda','soda water','mineral water'
        ])) return 'Water & mixers';
        if (containsAny($haystack, [
            'cola','soda','soft drink','lemonade','ginger ale','energy drink',
            'root beer'
        ])) return 'Soft drinks';

        return 'Beverages';
    }

    if (containsAny($haystack, ['coffee','tea','matcha'])) return 'Coffee & tea';
    if (containsAny($haystack, ['juice','nectar'])) return 'Juice';

    return match ($atlasCategory) {
        'fruit' => 'Fruit',
        'vegetables', 'vegetable' => 'Produce',
        'poultry' => 'Poultry',
        'nuts', 'legumes' => 'Dry goods',
        default => 'Pantry',
    };
}

function unitDefaults(string $category, string $name, string $subcategory): array
{
    $haystack = strtolower($name.' '.$subcategory);

    if (in_array($category, [
        'Juice', 'Water & mixers', 'Soft drinks', 'Beer & cider',
        'Wine', 'Spirits', 'Beverages'
    ], true)) {
        return ['bottle', 'bottle', 1.0];
    }

    if ($category === 'Dairy & eggs') {
        if (containsAny($haystack, ['egg'])) return ['piece', 'tray', null];
        if (containsAny($haystack, [
            'milk','cream','kefir','ayran','drink','liquid'
        ])) return ['l', 'l', 1.0];
        return ['g', 'kg', 1000.0];
    }

    if (in_array($category, [
        'Produce','Fruit','Fresh herbs','Meat','Poultry','Seafood',
        'Dry goods','Spices','Oils & condiments','Bakery','Frozen','Pantry'
    ], true)) {
        if ($category === 'Oils & condiments' && containsAny($haystack, [
            'oil','vinegar','sauce','juice','syrup','water'
        ])) return ['l', 'l', 1.0];

        return ['g', 'kg', 1000.0];
    }

    if ($category === 'Coffee & tea') {
        return ['g', 'kg', 1000.0];
    }

    if ($category === 'Cleaning') {
        if (containsAny($haystack, [
            'tablet','pod','powder','sponge','wipe','cloth'
        ])) return ['pack', 'pack', 1.0];
        return ['bottle', 'bottle', 1.0];
    }

    if (in_array($category, [
        'Paper & hygiene','Packaging','Household supplies','Personal care'
    ], true)) {
        return ['pack', 'pack', 1.0];
    }

    if ($category === 'Kitchen & utility') {
        return ['piece', 'piece', 1.0];
    }

    return ['piece', 'piece', 1.0];
}

function containsAny(string $value, array $needles): bool
{
    foreach ($needles as $needle) {
        if ($needle !== '' && str_contains($value, $needle)) {
            return true;
        }
    }
    return false;
}

function normalizeKey(string $value): string
{
    $value = trim($value);
    if ($value === '') return '';

    if (class_exists(Str::class)) {
        return Str::slug($value);
    }

    $ascii = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
    if (is_string($ascii) && $ascii !== '') $value = $ascii;

    $value = strtolower($value);
    $value = str_replace('&', ' and ', $value);
    $value = preg_replace('/[^a-z0-9]+/', '-', $value) ?? '';
    return trim($value, '-');
}

function encodePath(string $path): string
{
    return implode('/', array_map(
        static fn (string $part): string => rawurlencode($part),
        explode('/', ltrim($path, '/'))
    ));
}

function imageLooksValid(string $path): bool
{
    if (!is_file($path) || (int)@filesize($path) < 2500) return false;
    $info = @getimagesize($path);
    if (!is_array($info)) return false;
    return (int)($info[0] ?? 0) >= 96 && (int)($info[1] ?? 0) >= 96;
}

function normalizeToWhiteWebp(string $sourcePath, string $targetPath): bool
{
    $raw = @file_get_contents($sourcePath);
    if (!is_string($raw) || $raw === '') return false;

    $source = @imagecreatefromstring($raw);
    if (!$source) return false;

    $width = imagesx($source);
    $height = imagesy($source);
    if ($width < 1 || $height < 1) {
        imagedestroy($source);
        return false;
    }

    $canvasSize = 512;
    $inner = 458;
    $scale = min($inner / $width, $inner / $height);
    $targetWidth = max(1, (int)round($width * $scale));
    $targetHeight = max(1, (int)round($height * $scale));
    $x = (int)floor(($canvasSize - $targetWidth) / 2);
    $y = (int)floor(($canvasSize - $targetHeight) / 2);

    $canvas = imagecreatetruecolor($canvasSize, $canvasSize);
    $white = imagecolorallocate($canvas, 255, 255, 255);
    imagefilledrectangle($canvas, 0, 0, $canvasSize, $canvasSize, $white);

    imagealphablending($source, true);
    imagecopyresampled(
        $canvas,
        $source,
        $x,
        $y,
        0,
        0,
        $targetWidth,
        $targetHeight,
        $width,
        $height
    );

    $tmp = $targetPath.'.tmp-'.bin2hex(random_bytes(4));
    $ok = imagewebp($canvas, $tmp, 82);
    if ($ok && is_file($tmp) && (int)@filesize($tmp) > 280000) {
        $ok = imagewebp($canvas, $tmp, 72);
    }

    imagedestroy($canvas);
    imagedestroy($source);

    if (!$ok || !is_file($tmp) || (int)@filesize($tmp) < 3000) {
        @unlink($tmp);
        return false;
    }

    @chmod($tmp, 0644);
    if (!@rename($tmp, $targetPath)) {
        @unlink($tmp);
        return false;
    }

    return true;
}

function downloadFile(string $url, string $target, int $maxBytes): bool
{
    $fp = @fopen($target, 'wb');
    if (!$fp) return false;

    $bytes = 0;
    $tooLarge = false;

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_TIMEOUT => 35,
        CURLOPT_USERAGENT => 'PayMyDine-InventoryCatalog/14.0 (+https://paymydine.com)',
        CURLOPT_HTTPHEADER => ['Accept: application/octet-stream,application/json,image/webp,image/png,*/*'],
        CURLOPT_WRITEFUNCTION => static function ($curl, string $chunk) use ($fp, &$bytes, &$tooLarge, $maxBytes): int {
            $length = strlen($chunk);
            $bytes += $length;
            if ($bytes > $maxBytes) {
                $tooLarge = true;
                return 0;
            }
            return fwrite($fp, $chunk);
        },
    ]);

    $ok = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    fclose($fp);

    if (!$ok || $tooLarge || $status < 200 || $status >= 300 || $error !== '') {
        @unlink($target);
        return false;
    }

    if (!is_file($target) || (int)@filesize($target) < 1) {
        @unlink($target);
        return false;
    }

    return true;
}
