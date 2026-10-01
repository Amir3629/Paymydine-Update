#!/usr/bin/env php
<?php

declare(strict_types=1);

use App\Services\Inventory\PmdInventoryStockCatalog;
use Illuminate\Support\Str;

/**
 * PMD_INVENTORY_INGREDIENT_ATLAS_R13
 *
 * Deterministic catalog-photo installer.
 *
 * R12 searched Openverse independently for every item. That was legally safe,
 * but semantically weak: a licensed photo matching words like "cream",
 * "emmental" or "ayran" could still depict the wrong subject.
 *
 * R13 uses Ingredient Atlas instead:
 * - one curated shopping/grocery catalog;
 * - exact slug/display-name/alias resolution only;
 * - app-ready 512px WebP assets;
 * - CC0-1.0 image + metadata license;
 * - no fuzzy image search and no arbitrary substitution;
 * - unmatched PayMyDine items simply keep the built-in emoji fallback.
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
$sleepMs = max(0, min(2000, (int)($options['sleep-ms'] ?? 80)));

if (!function_exists('curl_init')) {
    fwrite(STDERR, "PHP cURL is required.\n");
    exit(1);
}

$datasetBase = 'https://huggingface.co/datasets/ionicam/ingredient-atlas/raw/main';
$imageBase = 'https://huggingface.co/datasets/ionicam/ingredient-atlas/resolve/main';
$metadataUrl = $datasetBase.'/metadata.jsonl';

$outDir = $root.'/app/admin/assets/images/pmd-inventory-atlas';
$auditPath = $root.'/storage/app/pmd-inventory-atlas-sources-r13.json';
$tmpMetadata = sys_get_temp_dir().'/pmd-inventory-atlas-'.getmypid().'.jsonl';

if (!is_dir($outDir) && !mkdir($outDir, 0755, true) && !is_dir($outDir)) {
    fwrite(STDERR, "Could not create {$outDir}\n");
    exit(1);
}
if (!is_dir(dirname($auditPath))) {
    @mkdir(dirname($auditPath), 0755, true);
}

if ($clean) {
    foreach (glob($outDir.'/*.webp') ?: [] as $file) {
        @unlink($file);
    }
}

echo "PayMyDine Inventory R13 - Ingredient Atlas installer\n";
echo "Dataset: Ingredient Atlas v0.1.x public catalog\n";
echo "Policy: exact slug/name/alias matching only; no fuzzy image search.\n";
echo "Destination: {$outDir}\n\n";

echo "Downloading Ingredient Atlas metadata ... ";
if (!downloadFile($metadataUrl, $tmpMetadata, 20 * 1024 * 1024)) {
    fwrite(STDERR, "FAILED\nCould not download Ingredient Atlas metadata. Existing UI remains unchanged.\n");
    exit(1);
}
echo "OK\n";

[$primary, $aliases, $recordCount] = loadAtlasLookup($tmpMetadata);
@unlink($tmpMetadata);

if ($recordCount < 1000) {
    fwrite(STDERR, "Ingredient Atlas metadata looked incomplete ({$recordCount} rows). Aborting.\n");
    exit(1);
}

echo "Atlas records loaded: {$recordCount}\n";

$items = PmdInventoryStockCatalog::all();
if ($limit > 0) {
    $items = array_slice($items, 0, $limit);
}

$manualAliases = [
    'beef-mince' => 'ground-beef',
    'lamb-mince' => 'ground-lamb',
    'cream' => 'heavy-cream',
    'emmental' => 'emmental',
    'eggs' => 'eggs',
    'rose-wine' => 'rose-wine',
    'aluminium-foil' => 'aluminum-foil',
    'spring-onion' => 'green-onion',
    'rocket' => 'arugula',
    'aubergine' => 'eggplant',
];

$audit = [
    'source' => 'Ingredient Atlas',
    'source_repo' => 'https://github.com/ionmesca/ingredient-atlas',
    'source_dataset' => 'https://huggingface.co/datasets/ionicam/ingredient-atlas',
    'image_license' => 'CC0-1.0',
    'metadata_license' => 'CC0-1.0',
    'installed_at' => gmdate('c'),
    'items' => [],
];

$total = count($items);
$saved = 0;
$skipped = 0;
$unmatched = 0;
$failed = 0;

foreach ($items as $index => $item) {
    $name = trim((string)($item['name'] ?? ''));
    if ($name === '') {
        continue;
    }

    $n = $index + 1;
    $targetSlug = Str::slug($name);
    if ($targetSlug === '') {
        $targetSlug = substr(sha1($name), 0, 20);
    }
    $target = $outDir.'/'.$targetSlug.'.webp';

    $lookupKey = normalizeKey($name);
    $record = resolveRecord($lookupKey, $primary, $aliases);

    if (!$record && isset($manualAliases[$lookupKey])) {
        $record = resolveRecord($manualAliases[$lookupKey], $primary, $aliases);
    }

    if (!$record) {
        echo "[{$n}/{$total}] MISS  {$name}\n";
        $unmatched++;
        continue;
    }

    $fileName = trim((string)($record['file_name'] ?? ''));
    if ($fileName === '' || !str_starts_with($fileName, 'images/webp/512/')) {
        echo "[{$n}/{$total}] MISS  {$name} (no 512 WebP)\n";
        $unmatched++;
        continue;
    }

    if (!$force && is_file($target) && (int)@filesize($target) > 4000) {
        echo "[{$n}/{$total}] SKIP  {$name} -> ".($record['display_name'] ?? $record['slug'] ?? '')."\n";
        $skipped++;
        continue;
    }

    $url = $imageBase.'/'.encodePath($fileName).'?download=true';
    echo "[{$n}/{$total}] GET   {$name} -> ".($record['display_name'] ?? $record['slug'] ?? '')." ... ";

    $tmp = $target.'.tmp-'.bin2hex(random_bytes(4));
    if (!downloadFile($url, $tmp, 4 * 1024 * 1024)) {
        @unlink($tmp);
        echo "FAILED\n";
        $failed++;
        usleep($sleepMs * 1000);
        continue;
    }

    if (!validWebp($tmp)) {
        @unlink($tmp);
        echo "INVALID\n";
        $failed++;
        usleep($sleepMs * 1000);
        continue;
    }

    @chmod($tmp, 0644);
    if (!@rename($tmp, $target)) {
        @unlink($tmp);
        echo "WRITE FAILED\n";
        $failed++;
        usleep($sleepMs * 1000);
        continue;
    }

    $audit['items'][$targetSlug] = [
        'paymydine_name' => $name,
        'atlas_slug' => (string)($record['slug'] ?? ''),
        'atlas_name' => (string)($record['display_name'] ?? ''),
        'atlas_category' => (string)($record['category'] ?? ''),
        'atlas_subcategory' => $record['subcategory'] ?? null,
        'review_status' => (string)($record['review_status'] ?? ''),
        'replacement_promoted' => (bool)($record['replacement_promoted'] ?? false),
        'source_path' => $fileName,
        'sha256_expected' => (string)($record['webp512_sha256'] ?? ''),
        'sha256_saved' => hash_file('sha256', $target) ?: null,
    ];

    echo "OK\n";
    $saved++;
    usleep($sleepMs * 1000);
}

file_put_contents(
    $auditPath,
    json_encode($audit, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
);

echo "\nDone. saved={$saved} skipped={$skipped} unmatched={$unmatched} failed={$failed}\n";
echo "Audit: {$auditPath}\n";
echo "Important: unmatched items intentionally keep the PayMyDine fallback instead of receiving a guessed photo.\n";

function loadAtlasLookup(string $path): array
{
    $primary = [];
    $aliases = [];
    $rows = 0;

    $handle = fopen($path, 'rb');
    if (!$handle) {
        throw new RuntimeException('Could not open Ingredient Atlas metadata.');
    }

    while (($line = fgets($handle)) !== false) {
        $line = trim($line);
        if ($line === '') continue;

        $row = json_decode($line, true);
        if (!is_array($row)) continue;
        $rows++;

        $slug = normalizeKey((string)($row['slug'] ?? ''));
        $display = normalizeKey((string)($row['display_name'] ?? ''));

        if ($slug !== '') {
            $primary[$slug] = $row;
        }
        if ($display !== '' && !isset($primary[$display])) {
            $primary[$display] = $row;
        }

        foreach (['aliases', 'aliases_de'] as $aliasField) {
            $values = $row[$aliasField] ?? [];
            if (!is_array($values)) continue;

            foreach ($values as $value) {
                $key = normalizeKey((string)$value);
                if ($key === '' || isset($primary[$key]) || isset($aliases[$key])) continue;
                $aliases[$key] = $row;
            }
        }
    }

    fclose($handle);

    return [$primary, $aliases, $rows];
}

function resolveRecord(string $key, array $primary, array $aliases): ?array
{
    if ($key === '') return null;
    if (isset($primary[$key]) && is_array($primary[$key])) return $primary[$key];
    if (isset($aliases[$key]) && is_array($aliases[$key])) return $aliases[$key];
    return null;
}

function normalizeKey(string $value): string
{
    $value = trim($value);
    if ($value === '') return '';

    if (class_exists(Str::class)) {
        return Str::slug($value);
    }

    $ascii = @iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $value);
    if (is_string($ascii) && $ascii !== '') {
        $value = $ascii;
    }

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

function validWebp(string $path): bool
{
    if (!is_file($path) || (int)@filesize($path) < 4000) {
        return false;
    }

    $info = @getimagesize($path);
    if (!is_array($info)) {
        return false;
    }

    if (($info['mime'] ?? '') !== 'image/webp') {
        return false;
    }

    $width = (int)($info[0] ?? 0);
    $height = (int)($info[1] ?? 0);
    return $width >= 128 && $height >= 128;
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
        CURLOPT_TIMEOUT => 30,
        CURLOPT_USERAGENT => 'PayMyDine-InventoryAtlas/1.0 (+https://paymydine.com)',
        CURLOPT_HTTPHEADER => ['Accept: application/octet-stream,application/json,image/webp,*/*'],
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
