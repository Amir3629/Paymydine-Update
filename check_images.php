<?php


$testDisk = '6933980910771278432906';
$extensions = ['webp', 'jpg', 'jpeg', 'png'];

echo "Testing disk: {$testDisk}\n";
echo "Expected path structure: " . substr($testDisk, 0, 3) . '/' . substr($testDisk, 3, 3) . '/' . substr($testDisk, 6, 3) . "/{$testDisk}.{ext}\n\n";

$basePath = __DIR__ . '/assets/media/attachments/public/';
$p1 = substr($testDisk, 0, 3);
$p2 = substr($testDisk, 3, 3);
$p3 = substr($testDisk, 6, 3);

echo "Checking path: {$p1}/{$p2}/{$p3}/{$testDisk}.{ext}\n";

foreach ($extensions as $ext) {
    $candidate = $basePath . $p1 . '/' . $p2 . '/' . $p3 . '/' . $testDisk . '.' . $ext;
    echo "  Checking: {$candidate}\n";
    if (file_exists($candidate)) {
        echo "   FOUND: {$candidate}\n";
        exit(0);
    }
}

echo "\n File not found in expected location\n";
echo "Searching recursively...\n";

$searchPath = $basePath;
$iterator = new RecursiveIteratorIterator(
    new RecursiveDirectoryIterator($searchPath, RecursiveDirectoryIterator::SKIP_DOTS)
);

$found = false;
foreach ($iterator as $file) {
    $fileBasename = pathinfo($file->getFilename(), PATHINFO_FILENAME);
    if ($fileBasename === $testDisk || strpos($file->getFilename(), $testDisk) === 0) {
        echo " FOUND via search: " . $file->getPathname() . "\n";
        $found = true;
        break;
    }
}

if (!$found) {
    echo " File not found anywhere\n";
    echo "\nChecking what files exist in {$p1}/{$p2}/{$p3}/:\n";
    $dirPath = $basePath . $p1 . '/' . $p2 . '/' . $p3 . '/';
    if (is_dir($dirPath)) {
        $files = glob($dirPath . '*');
        foreach ($files as $file) {
            echo "  - " . basename($file) . "\n";
        }
    } else {
        echo "  Directory does not exist\n";
    }
}
