<?php
echo "🔍 اسکریپت تشخیص کامل Terminal Devices\n\n";

require __DIR__.'/vendor/autoload.php';
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

// Boot Laravel
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// 1️⃣ بررسی کنترلر
$controllerPath = __DIR__.'/app/admin/classes/TerminalDevicesController.php';
echo "📂 بررسی کنترلر:\n";
if (file_exists($controllerPath)) {
    echo "✅ فایل کنترلر موجود است: $controllerPath\n";
    $content = file_get_contents($controllerPath);
    echo "📝 100 خط اول کنترلر:\n";
    $lines = explode("\n", $content);
    for ($i=0; $i<min(100,count($lines)); $i++) echo $lines[$i]."\n";
    if (strpos($content, 'function index') !== false) {
        echo "✅ متد index() موجود است.\n";
    } else {
        echo "⚠️ متد index() موجود نیست.\n";
    }
} else {
    echo "❌ فایل کنترلر پیدا نشد!\n";
}

// 2️⃣ بررسی ویو
$viewDir = __DIR__.'/app/admin/views/terminal_devices';
$viewPath = $viewDir.'/index.blade.php';
echo "\n🖼 بررسی ویو:\n";
if (file_exists($viewPath)) {
    echo "✅ ویو موجود است: $viewPath\n";
    echo "📝 50 خط اول ویو:\n";
    $lines = explode("\n", file_get_contents($viewPath));
    for ($i=0; $i<min(50,count($lines)); $i++) echo $lines[$i]."\n";
} else {
    echo "❌ ویو پیدا نشد!\n";
}

// 3️⃣ بررسی روت
$routesFile = __DIR__.'/app/admin/routes.php';
echo "\n🛣 بررسی روت‌ها:\n";
if (file_exists($routesFile)) {
    echo "✅ routes.php موجود است.\n";
    $routes = file_get_contents($routesFile);
    echo "📝 تمام خطوط routes.php:\n";
    $lines = explode("\n", $routes);
    foreach ($lines as $line) echo $line."\n";
    if (preg_match("/Route::resource\('terminal_devices',\s*'([^\']+)'\)/", $routes, $m)) {
        echo "✅ مسیر terminal_devices ثبت شده به کنترلر: ".$m[1]."\n";
    } else {
        echo "❌ مسیر terminal_devices ثبت نشده است.\n";
    }
} else {
    echo "❌ routes.php وجود ندارد.\n";
}

// 4️⃣ بررسی فایل‌های JS/CSS
$assetDir = __DIR__.'/app/admin/assets/vendor/pmd-mediafix';
$assets = ['daterangepicker.js','daterangepicker.css','force-blue-buttons.js','jquery-sortable.js','moment.min.js'];
echo "\n🗂 بررسی فایل‌های JS/CSS:\n";
foreach ($assets as $f) {
    $status = file_exists($assetDir.'/'.$f) ? "✅ موجود" : "❌ گم شده";
    echo " - $f : $status\n";
}

// 5️⃣ بررسی جدول دیتابیس
echo "\n💾 بررسی دیتابیس:\n";
$tableName = 'ti_terminal_devices';
if (Schema::hasTable($tableName)) {
    echo "✅ جدول $tableName موجود است.\n";
    try {
        $count = DB::table($tableName)->count();
        echo "📝 تعداد رکوردها در جدول: $count\n";
        $sample = DB::table($tableName)->limit(10)->get();
        echo "📝 نمونه 10 رکورد اول:\n";
        print_r($sample->toArray());
    } catch (\Throwable $e) {
        echo "⚠️ خطا در خواندن داده‌ها: ".$e->getMessage()."\n";
    }
} else {
    echo "❌ جدول $tableName موجود نیست!\n";
}

// 6️⃣ بررسی دسترسی‌ها
echo "\n🔑 بررسی دسترسی فولدرها:\n";
$dirs = [
    'app/admin/classes',
    'app/admin/views',
    'app/admin/views/terminal_devices',
    'app/admin/assets/vendor/pmd-mediafix',
    'storage/framework/views'
];
foreach ($dirs as $d) {
    $perm = substr(sprintf('%o', fileperms(__DIR__.'/'.$d)), -4);
    echo " - $d : $perm\n";
}

// 7️⃣ پاکسازی کش لاراول
echo "\n🔁 پاکسازی کش لاراول...\n";
shell_exec('php artisan view:clear');
shell_exec('php artisan cache:clear');
shell_exec('php artisan config:clear');
shell_exec('rm -rf storage/framework/views/*');
echo "✅ کش‌ها پاک شد.\n";

echo "\n🎯 اسکریپت کامل پایان یافت. تمام مسیرها، فایل‌ها و دیتابیس بررسی شد.\n";
?>
