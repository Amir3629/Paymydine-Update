<?php
require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

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

    $content = file_get_contents($file);

    // Wrap $pmdAllocationColumn with implode if array
    $content_new = preg_replace(
        '/(\$pmdAllocationColumn\s*=)/',
        'if(is_array($pmdAllocationColumn)) { $pmdAllocationColumn = implode(\',\', $pmdAllocationColumn); }' . "\n" . '$1',
        $content
    );

    // Wrap $pmdJoinLeft with implode if array
    $content_new = preg_replace(
        '/(\$pmdJoinLeft\s*=)/',
        'if(is_array($pmdJoinLeft)) { $pmdJoinLeft = implode(\',\', $pmdJoinLeft); }' . "\n" . '$1',
        $content_new
    );

    if ($content_new !== $content) {
        file_put_contents($file, $content_new);
        echo "✅ اصلاح انجام شد: $file\n";
    } else {
        echo "ℹ️ تغییری نیاز نبود: $file\n";
    }
}

// Clear Laravel caches
echo "پاکسازی cache لاراول...\n";
shell_exec('sudo -u www-data php artisan view:clear');
shell_exec('sudo -u www-data php artisan cache:clear');
shell_exec('sudo -u www-data php artisan route:clear');
shell_exec('sudo -u www-data php artisan config:clear');

echo "اسکریپت اجرا شد، دوباره صفحه سفارش را چک کنید.\n";
