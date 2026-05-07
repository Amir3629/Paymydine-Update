<?php
echo "🔎 بررسی وجود TerminalDevicesController و مسیرهای مربوطه\n\n";

// مسیر کنترلر
$controllerPath = __DIR__ . '/app/admin/classes/TerminalDevicesController.php';

// بررسی وجود فایل
if (file_exists($controllerPath)) {
    echo "✅ فایل TerminalDevicesController.php وجود دارد: $controllerPath\n";
} else {
    echo "❌ فایل TerminalDevicesController.php پیدا نشد!\n";
}

// لیست تمام فایل‌های کنترلر در app/admin/classes
echo "\n📂 لیست کنترلرهای موجود در app/admin/classes:\n";
$dir = __DIR__ . '/app/admin/classes';
$files = glob($dir . '/*.php');
if ($files) {
    foreach ($files as $f) {
        echo " - " . basename($f) . "\n";
    }
} else {
    echo "⚠️ هیچ فایلی در app/admin/classes پیدا نشد!\n";
}

// بررسی روت‌ها
$routesFile = __DIR__ . '/app/admin/routes.php';
echo "\n🛣 بررسی مسیر 'terminal_devices' در routes.php:\n";
if (file_exists($routesFile)) {
    $routes = file_get_contents($routesFile);
    if (strpos($routes, 'terminal_devices') !== false) {
        preg_match_all('/Route::resource\(\'terminal_devices\',\s*\'([^\']+)\'\)/', $routes, $matches);
        if (!empty($matches[1])) {
            echo "✅ مسیر terminal_devices به کنترلر ثبت شده است: " . $matches[1][0] . "\n";
        } else {
            echo "⚠️ مسیر terminal_devices در routes.php پیدا شد اما کنترلر مشخص نیست.\n";
        }
    } else {
        echo "❌ مسیر terminal_devices در routes.php پیدا نشد.\n";
    }
} else {
    echo "❌ فایل routes.php وجود ندارد!\n";
}

echo "\n🔧 بررسی کامل شد. اکنون می‌توانید مشکل کنترلر و روت را تشخیص دهید.\n";
?>
