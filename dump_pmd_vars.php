<?php
$files = [
    'app/admin/controllers/Orders.php',
    'app/admin/views/orders/edit.blade.php',
    'app/admin/views/orders/index.blade.php',
];

foreach ($files as $file) {
    if (!file_exists($file)) {
        echo "⚠️ فایل پیدا نشد: $file\n";
        continue;
    }
    echo "==================== فایل: $file ====================\n";
    echo file_get_contents($file);
    echo "\n\n";
}
