<?php
/**
 * Test the media route logic directly (simulating what happens in the route)
 */

$testPath = '6933980910771278432906.png';
$basePath = __DIR__ . '/assets/media/attachments/public/';

echo "Testing path: {$testPath}\n";
echo "Base path: {$basePath}\n\n";

// Simulate route handler logic
$path = explode('?', $testPath)[0];
$mediaPath = $basePath . $path;

echo "1. Direct path: {$mediaPath}\n";
if (file_exists($mediaPath)) {
    echo "   ✅ EXISTS\n";
    exit(0);
} else {
    echo "   ❌ NOT FOUND\n";
}

// Extract disk name
$filename = basename($path);
$pathWithoutExt = pathinfo($filename, PATHINFO_FILENAME);
echo "\n2. Extracted disk name: {$pathWithoutExt}\n";
echo "   Length: " . strlen($pathWithoutExt) . "\n";
echo "   Is alphanumeric: " . (ctype_alnum($pathWithoutExt) ? 'YES' : 'NO') . "\n";

if (strlen($pathWithoutExt) >= 9 && ctype_alnum($pathWithoutExt)) {
    $disk = $pathWithoutExt;
    $p1 = substr($disk, 0, 3);
    $p2 = substr($disk, 3, 3);
    $p3 = substr($disk, 6, 3);
    
    echo "\n3. Building path structure: {$p1}/{$p2}/{$p3}/{$disk}.{ext}\n";
    
    $extensions = ['webp', 'jpg', 'jpeg', 'png'];
    foreach ($extensions as $ext) {
        $candidate = $basePath . $p1 . '/' . $p2 . '/' . $p3 . '/' . $disk . '.' . $ext;
        echo "   Checking: {$candidate}\n";
        if (file_exists($candidate)) {
            echo "   ✅ FOUND: {$candidate}\n";
            exit(0);
        }
    }
    
    echo "   ❌ NOT FOUND in expected location\n";
    
    // Try the constructed directory
    $constructedDir = $basePath . $p1 . '/' . $p2 . '/' . $p3 . '/';
    echo "\n4. Checking if directory exists: {$constructedDir}\n";
    if (is_dir($constructedDir)) {
        echo "   ✅ Directory exists\n";
        $files = glob($constructedDir . '*');
        echo "   Files in directory:\n";
        foreach ($files as $file) {
            echo "     - " . basename($file) . "\n";
        }
    } else {
        echo "   ❌ Directory does not exist\n";
    }
} else {
    echo "\n3. Disk name validation failed\n";
}

echo "\n❌ File not found using route handler logic\n";
