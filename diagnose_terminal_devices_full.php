<?php
echo "🔍 اسکریپت کامل تشخیص Terminal Devices\n\n";

// 1️⃣ بررسی کنترلر
$controllerPath = __DIR__.'/app/admin/classes/TerminalDevicesController.php';
echo "📂 بررسی کنترلر:\n";
if (file_exists($controllerPath)) {
    echo "✅ فایل کنترلر موجود است: $controllerPath\n";
    $content = file_get_contents($controllerPath);
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
    echo "✅ ویو index.blade.php موجود است: $viewPath\n";
} else {
    echo "❌ ویو پیدا نشد!\n";
}

// 3️⃣ بررسی روت
$routesFile = __DIR__.'/app/admin/routes.php';
echo "\n🛣 بررسی مسیر در routes.php:\n";
if (file_exists($routesFile)) {
    $routes = file_get_contents($routesFile);
    if (preg_match("/Route::resource\('terminal_devices',\s*'([^\']+)'\)/", $routes, $m)) {
        echo "✅ مسیر terminal_devices به کنترلر ثبت شده است: ".$m[1]."\n";
    } else {
        echo "❌ مسیر terminal_devices ثبت نشده است.\n";
    }
} else {
    echo "❌ routes.php پیدا نشد!\n";
}

// 4️⃣ بررسی فایل‌های JS/CSS
$assetDir = __DIR__.'/app/admin/assets/vendor/pmd-mediafix';
$assets = ['daterangepicker.js','daterangepicker.css','force-blue-buttons.js','jquery-sortable.js','moment.min.js'];
$missing = [];
echo "\n🗂 بررسی فایل‌های JS/CSS:\n";
foreach ($assets as $f) {
    if (!file_exists($assetDir.'/'.$f)) $missing[] = $f;
}
if ($missing) {
    echo "⚠️ فایل‌های گم شده: ".implode(', ', $missing)."\n";
} else {
    echo "✅ تمام فایل‌ها موجود هستند.\n";
}

// 5️⃣ بررسی دیتابیس
echo "\n💾 بررسی دیتابیس:\n";
require __DIR__.'/vendor/autoload.php';
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

// بررسی وجود جدول
$tableName = 'ti_terminal_devices';
if (Schema::hasTable($tableName)) {
    $count = DB::table($tableName)->count();
    echo "✅ جدول $tableName موجود است. تعداد رکوردها: $count\n";

    // بررسی ستون‌ها
    $columns = Schema::getColumnListing($tableName);
    echo "📋 ستون‌های جدول: ".implode(', ', $columns)."\n";
} else {
    echo "❌ جدول $tableName موجود نیست!\n";
}

// 6️⃣ بررسی مجوز فایل‌ها
echo "\n🔑 بررسی مجوز دسترسی فایل‌ها و فولدرها:\n";
$dirs = ['app/admin/classes','app/admin/views','app/admin/assets/vendor/pmd-mediafix'];
foreach ($dirs as $d) {
    if (is_dir($d)) {
        $perms = substr(sprintf('%o', fileperms($d)), -4);
        echo "📂 فولدر $d دسترسی: $perms\n";
    } else {
        echo "❌ فولدر $d وجود ندارد!\n";
    }
}

echo "\n🔧 تشخیص کامل شد. بر اساس این گزارش می‌توانید مشکل را حل کنید.\n";
?>
