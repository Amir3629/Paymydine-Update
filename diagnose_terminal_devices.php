<?php
echo "🔍 تشخیص مشکل Terminal Devices Page\n\n";

// مسیر کنترلر
$controllerPath = __DIR__.'/app/admin/classes/TerminalDevicesController.php';
if (file_exists($controllerPath)) {
    echo "✅ کنترلر TerminalDevicesController.php موجود است.\n";
} else {
    echo "❌ کنترلر TerminalDevicesController.php یافت نشد!\n";
}

// بررسی متد index در کنترلر
if (file_exists($controllerPath)) {
    $content = file_get_contents($controllerPath);
    if (strpos($content, 'function index') !== false) {
        echo "✅ متد index() در کنترلر موجود است.\n";
    } else {
        echo "⚠️ متد index() در کنترلر یافت نشد!\n";
    }
}

// بررسی ویو
$viewDir = __DIR__.'/app/admin/views/terminal_devices';
$viewPath = $viewDir.'/index.blade.php';
if (file_exists($viewPath)) {
    echo "✅ ویو index.blade.php برای Terminal Devices موجود است.\n";
} else {
    echo "❌ ویو index.blade.php یافت نشد!\n";
}

// بررسی مسیر در routes.php
$routesFile = __DIR__.'/app/admin/routes.php';
if (file_exists($routesFile)) {
    $routes = file_get_contents($routesFile);
    if (preg_match("/Route::resource\('terminal_devices',\s*'([^\']+)'\)/", $routes, $m)) {
        echo "✅ مسیر terminal_devices در routes.php به کنترلر ثبت شده است: ".$m[1]."\n";
    } else {
        echo "❌ مسیر terminal_devices در routes.php ثبت نشده است.\n";
    }
} else {
    echo "❌ فایل routes.php وجود ندارد.\n";
}

// بررسی فایل‌های JS/CSS مورد نیاز
$assetDir = __DIR__.'/app/admin/assets/vendor/pmd-mediafix';
$assets = ['daterangepicker.js','daterangepicker.css','force-blue-buttons.js','jquery-sortable.js','moment.min.js'];
$missing = [];
foreach ($assets as $f) {
    if (!file_exists($assetDir.'/'.$f)) $missing[] = $f;
}
if ($missing) {
    echo "⚠️ فایل‌های JS/CSS گم شده: ".implode(', ',$missing)."\n";
} else {
    echo "✅ تمام فایل‌های JS/CSS موجود هستند.\n";
}

// بررسی جدول دیتابیس
require __DIR__.'/vendor/autoload.php';
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Console\Kernel')->bootstrap();

if (Schema::hasTable('ti_terminal_devices')) {
    echo "✅ جدول ti_terminal_devices در دیتابیس موجود است. تعداد رکوردها: ".DB::table('ti_terminal_devices')->count()."\n";
} else {
    echo "❌ جدول ti_terminal_devices در دیتابیس یافت نشد!\n";
}

echo "\n🔧 تشخیص کامل شد. حالا می‌توانید مشکل اصلی را پیدا کنید.\n";
?>
