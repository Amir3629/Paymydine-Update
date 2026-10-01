#!/usr/bin/env php
<?php

declare(strict_types=1);

use App\Services\Inventory\PmdInventoryStockCatalog;
use Illuminate\Support\Str;

$root = dirname(__DIR__);
$autoload = $root.'/vendor/autoload.php';
if (!is_file($autoload)) {
    fwrite(STDERR, "vendor/autoload.php was not found. Run this from a deployed PayMyDine checkout.\n");
    exit(1);
}
require $autoload;

$options = getopt('', ['force', 'limit::', 'sleep-ms::']);
$force = array_key_exists('force', $options);
$limit = max(0, (int)($options['limit'] ?? 0));
$sleepMs = max(0, min(3000, (int)($options['sleep-ms'] ?? 180)));

if (!function_exists('curl_init')) {
    fwrite(STDERR, "PHP cURL is required.\n");
    exit(1);
}
if (!function_exists('imagecreatefromstring') || !function_exists('imagewebp')) {
    fwrite(STDERR, "PHP GD with WebP support is required.\n");
    exit(1);
}

$outDir = $root.'/app/admin/assets/images/pmd-inventory-items';
$manifestPath = $root.'/storage/app/pmd-inventory-image-sources-v1.json';

if (!is_dir($outDir) && !mkdir($outDir, 0755, true) && !is_dir($outDir)) {
    fwrite(STDERR, "Could not create {$outDir}\n");
    exit(1);
}
if (!is_dir(dirname($manifestPath))) {
    @mkdir(dirname($manifestPath), 0755, true);
}

$manifest = [];
if (is_file($manifestPath)) {
    $decoded = json_decode((string)file_get_contents($manifestPath), true);
    if (is_array($decoded)) {
        $manifest = $decoded;
    }
}

$items = PmdInventoryStockCatalog::all();
if ($limit > 0) {
    $items = array_slice($items, 0, $limit);
}

$total = count($items);
$saved = 0;
$skipped = 0;
$missing = 0;
$failed = 0;

echo "PayMyDine Inventory image materializer\n";
echo "Items: {$total} | destination: {$outDir}\n";
echo "Source policy: Openverse CC0/Public Domain photographs only.\n\n";

foreach ($items as $index => $item) {
    $name = trim((string)($item['name'] ?? ''));
    $category = trim((string)($item['category'] ?? ''));
    if ($name === '') {
        continue;
    }

    $slug = Str::slug($name);
    if ($slug === '') {
        $slug = substr(sha1($name), 0, 20);
    }

    $filename = $slug.'.webp';
    $target = $outDir.'/'.$filename;
    $n = $index + 1;

    if (!$force && is_file($target) && (int)@filesize($target) > 5000) {
        echo "[{$n}/{$total}] SKIP  {$name}\n";
        $skipped++;
        continue;
    }

    echo "[{$n}/{$total}] FETCH {$name} ... ";

    $candidate = null;
    $usedQuery = '';
    foreach (queriesFor($name, $category) as $query) {
        $results = openverseSearch($query);
        foreach ($results as $row) {
            if (!candidateIsSafe($row)) {
                continue;
            }
            $candidate = $row;
            $usedQuery = $query;
            break 2;
        }
    }

    if (!$candidate) {
        echo "NO SAFE MATCH\n";
        $missing++;
        usleep($sleepMs * 1000);
        continue;
    }

    $ok = downloadAsWebp((string)$candidate['url'], $target);
    if (!$ok) {
        echo "DOWNLOAD FAILED\n";
        $failed++;
        usleep($sleepMs * 1000);
        continue;
    }

    $manifest[$filename] = [
        'item_name' => $name,
        'category' => $category,
        'query' => $usedQuery,
        'openverse_id' => trim((string)($candidate['id'] ?? '')),
        'title' => trim((string)($candidate['title'] ?? '')),
        'creator' => trim((string)($candidate['creator'] ?? '')),
        'license' => strtolower(trim((string)($candidate['license'] ?? ''))),
        'license_url' => trim((string)($candidate['license_url'] ?? '')),
        'source' => trim((string)($candidate['source'] ?? '')),
        'landing_url' => trim((string)($candidate['foreign_landing_url'] ?? '')),
        'download_url' => trim((string)($candidate['url'] ?? '')),
        'saved_at' => gmdate('c'),
    ];
    file_put_contents(
        $manifestPath,
        json_encode($manifest, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)
    );

    echo "OK\n";
    $saved++;
    usleep($sleepMs * 1000);
}

echo "\nDone. saved={$saved} skipped={$skipped} missing={$missing} failed={$failed}\n";
echo "Manifest: {$manifestPath}\n";

function queriesFor(string $name, string $category): array
{
    $categoryHint = match ($category) {
        'Fruit' => 'fruit',
        'Fresh herbs' => 'fresh herb',
        'Spices' => 'spice ingredient',
        'Meat' => 'raw meat ingredient',
        'Poultry' => 'raw poultry ingredient',
        'Seafood' => 'fresh seafood ingredient',
        'Dairy & eggs' => 'dairy ingredient',
        'Bakery', 'Bakery & dessert' => 'bakery ingredient',
        'Coffee & tea' => 'beverage ingredient',
        'Soft drinks' => 'drink bottle',
        'Beer & cider' => 'beer bottle',
        'Wine' => 'wine bottle',
        'Spirits' => 'spirit bottle',
        'Packaging' => 'restaurant packaging',
        'Cleaning' => 'cleaning supply',
        default => 'food ingredient',
    };

    return array_values(array_unique(array_filter([
        trim($name.' '.$categoryHint),
        trim($name.' food ingredient'),
        trim($name.' restaurant stock'),
        trim($name),
    ])));
}

function openverseSearch(string $query): array
{
    $params = http_build_query([
        'q' => mb_substr($query, 0, 180),
        'license' => 'cc0,pdm',
        'category' => 'photograph',
        'source' => 'stocksnap,wikimedia,flickr',
        'mature' => 'false',
        'page_size' => 20,
    ]);

    $url = 'https://api.openverse.org/v1/images/?'.$params;
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => true,
        CURLOPT_CONNECTTIMEOUT => 8,
        CURLOPT_TIMEOUT => 16,
        CURLOPT_HTTPHEADER => [
            'Accept: application/json',
            'User-Agent: PayMyDine-InventoryImages/1.0 (+https://paymydine.com)',
        ],
    ]);

    $body = curl_exec($ch);
    $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
    curl_close($ch);

    if (!is_string($body) || $body === '' || $status < 200 || $status >= 300) {
        return [];
    }

    $json = json_decode($body, true);
    return is_array($json['results'] ?? null) ? $json['results'] : [];
}

function candidateIsSafe(array $candidate): bool
{
    $license = strtolower(trim((string)($candidate['license'] ?? '')));
    if (!in_array($license, ['cc0', 'pdm'], true)) {
        return false;
    }
    if (!empty($candidate['mature'])) {
        return false;
    }

    $url = trim((string)($candidate['url'] ?? ''));
    if (!allowedImageUrl($url)) {
        return false;
    }

    $title = strtolower(trim((string)($candidate['title'] ?? '')));
    foreach (['logo', 'icon', 'diagram', 'vector', 'map', 'poster', 'menu board'] as $blocked) {
        if ($title !== '' && str_contains($title, $blocked)) {
            return false;
        }
    }

    $width = (int)($candidate['width'] ?? 0);
    $height = (int)($candidate['height'] ?? 0);
    if ($width > 0 && $height > 0 && ($width * $height) < 180000) {
        return false;
    }

    return true;
}

function allowedImageUrl(string $url): bool
{
    if (!str_starts_with(strtolower($url), 'https://')) {
        return false;
    }

    $host = strtolower((string)parse_url($url, PHP_URL_HOST));
    if ($host === 'cdn.stocksnap.io' || $host === 'upload.wikimedia.org') {
        return true;
    }

    return $host === 'live.staticflickr.com' || str_ends_with($host, '.staticflickr.com');
}

function downloadAsWebp(string $url, string $target): bool
{
    if (!allowedImageUrl($url)) {
        return false;
    }

    $tmp = $target.'.download-'.bin2hex(random_bytes(4));
    $out = $target.'.tmp-'.bin2hex(random_bytes(4));

    try {
        $fp = fopen($tmp, 'wb');
        if (!$fp) {
            return false;
        }

        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_FILE => $fp,
            CURLOPT_FOLLOWLOCATION => true,
            CURLOPT_CONNECTTIMEOUT => 8,
            CURLOPT_TIMEOUT => 20,
            CURLOPT_USERAGENT => 'PayMyDine-InventoryImages/1.0 (+https://paymydine.com)',
        ]);
        $ok = curl_exec($ch);
        $status = (int)curl_getinfo($ch, CURLINFO_RESPONSE_CODE);
        curl_close($ch);
        fclose($fp);

        if (!$ok || $status < 200 || $status >= 300 || !is_file($tmp)) {
            return false;
        }

        $bytes = (int)filesize($tmp);
        if ($bytes < 8000 || $bytes > 10 * 1024 * 1024) {
            return false;
        }

        $raw = file_get_contents($tmp);
        if (!is_string($raw) || $raw === '') {
            return false;
        }

        $source = @imagecreatefromstring($raw);
        if (!$source) {
            return false;
        }

        $width = imagesx($source);
        $height = imagesy($source);
        if ($width < 1 || $height < 1) {
            imagedestroy($source);
            return false;
        }

        $maxEdge = 720;
        $scale = min(1, $maxEdge / max($width, $height));
        $targetWidth = max(1, (int)round($width * $scale));
        $targetHeight = max(1, (int)round($height * $scale));

        $canvas = imagecreatetruecolor($targetWidth, $targetHeight);
        imagealphablending($canvas, false);
        imagesavealpha($canvas, true);
        $transparent = imagecolorallocatealpha($canvas, 255, 255, 255, 127);
        imagefilledrectangle($canvas, 0, 0, $targetWidth, $targetHeight, $transparent);
        imagecopyresampled(
            $canvas,
            $source,
            0,
            0,
            0,
            0,
            $targetWidth,
            $targetHeight,
            $width,
            $height
        );

        $written = imagewebp($canvas, $out, 76);
        if ($written && is_file($out) && (int)filesize($out) > 260000) {
            $written = imagewebp($canvas, $out, 68);
        }
        if ($written && is_file($out) && (int)filesize($out) > 260000) {
            $written = imagewebp($canvas, $out, 60);
        }

        imagedestroy($canvas);
        imagedestroy($source);

        if (!$written || !is_file($out) || (int)filesize($out) < 5000) {
            return false;
        }

        @chmod($out, 0644);
        return @rename($out, $target);
    } catch (Throwable $error) {
        return false;
    } finally {
        if (is_file($tmp)) {
            @unlink($tmp);
        }
        if (is_file($out)) {
            @unlink($out);
        }
    }
}
