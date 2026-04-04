<?php

$targets = [
    'extensions',
    'app',
    'resources',
];

$patterns = [
    "/('description'\\s*=>\\s*\\[[^\\]]*'disabled'\\s*=>\\s*)true/s" => '$1false',
    "/('code'\\s*=>\\s*\\[[^\\]]*'readOnly'\\s*=>\\s*)true/s" => '$1false',
    "/('status'\\s*=>\\s*\\[[^\\]]*'disabled'\\s*=>\\s*)true/s" => '$1false',
    "/('is_default'\\s*=>\\s*\\[[^\\]]*'disabled'\\s*=>\\s*)true/s" => '$1false',
];

$extensions = ['php', 'yaml', 'yml', 'blade.php'];

$changed = [];

function shouldScan($file, $extensions) {
    foreach ($extensions as $ext) {
        if (str_ends_with($file, $ext)) return true;
    }
    return false;
}

$rii = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(__DIR__, FilesystemIterator::SKIP_DOTS));

foreach ($rii as $file) {
    $path = $file->getPathname();

    if (
        strpos($path, '/vendor/') !== false ||
        strpos($path, '/node_modules/') !== false ||
        strpos($path, '/old_vendor/') !== false ||
        strpos($path, '/storage/') !== false ||
        strpos($path, '/.git/') !== false
    ) {
        continue;
    }

    $allowed = false;
    foreach ($targets as $target) {
        if (strpos($path, DIRECTORY_SEPARATOR.$target.DIRECTORY_SEPARATOR) !== false) {
            $allowed = true;
            break;
        }
    }
    if (!$allowed) continue;
    if (!shouldScan($path, $extensions)) continue;

    $content = @file_get_contents($path);
    if ($content === false) continue;

    if (!preg_match('/payment|paypal|payregister|description|is_default|status|code/i', $content)) {
        continue;
    }

    $original = $content;
    foreach ($patterns as $pattern => $replacement) {
        $content = preg_replace($pattern, $replacement, $content);
    }

    if ($content !== $original) {
        $backup = $path.'.bak.'.date('Ymd_His');
        file_put_contents($backup, $original);
        file_put_contents($path, $content);
        $changed[] = [$path, $backup];
    }
}

echo "=== CHANGED FILES ===\n";
if (!$changed) {
    echo "No files changed\n";
    exit(0);
}

foreach ($changed as [$file, $backup]) {
    echo "FILE: $file\n";
    echo "BACKUP: $backup\n\n";
}
