<?php
echo "🔧 Terminal Devices Full Diagnostic Script\n\n";

require __DIR__.'/vendor/autoload.php';
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Boot Laravel
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// 1️⃣ کنترلر
$controllerPath = __DIR__.'/app/admin/classes/TerminalDevicesController.php';
echo "📂 بررسی کنترلر:\n";
if(file_exists($controllerPath)){
    echo "✅ کنترلر موجود است: $controllerPath\n";
    $content = file_get_contents($controllerPath);
    if(strpos($content,"function index")!==false){
        echo "✅ متد index() موجود است.\n";
    }else{
        echo "⚠️ متد index() موجود نیست.\n";
    }
}else{
    echo "❌ کنترلر پیدا نشد!\n";
}

// 2️⃣ ویو
$viewPath = __DIR__.'/app/admin/views/terminal_devices/index.blade.php';
echo "\n🖼 بررسی ویو:\n";
if(file_exists($viewPath)){
    echo "✅ ویو موجود است: $viewPath\n";
}else{
    echo "❌ ویو پیدا نشد!\n";
}

// 3️⃣ روت
$routesFile = __DIR__.'/app/admin/routes.php';
echo "\n🛣 بررسی مسیر terminal_devices:\n";
if(file_exists($routesFile)){
    $routes = file_get_contents($routesFile);
    if(preg_match("/Route::resource\('terminal_devices',\s*'([^\']+)'\)/",$routes,$m)){
        echo "✅ مسیر terminal_devices ثبت شده به کنترلر: ".$m[1]."\n";
    }else{
        echo "❌ مسیر terminal_devices ثبت نشده است.\n";
    }
}else{
    echo "❌ routes.php پیدا نشد.\n";
}

// 4️⃣ فایل‌های JS/CSS
$assetDir = __DIR__.'/app/admin/assets/vendor/pmd-mediafix';
$assets = ["daterangepicker.js","daterangepicker.css","force-blue-buttons.js","jquery-sortable.js","moment.min.js"];
echo "\n🗂 بررسی فایل‌های JS/CSS:\n";
foreach($assets as $f){
    echo " - $f : ".(file_exists($assetDir.'/'.$f)?"✅ موجود":"❌ گم شده")."\n";
}

// 5️⃣ دیتابیس
$tableName = 'ti_terminal_devices';
echo "\n💾 بررسی جدول دیتابیس $tableName:\n";
if(Schema::hasTable($tableName)){
    echo "✅ جدول موجود است.\n";
    try{
        $count = DB::table($tableName)->count();
        echo "📝 تعداد رکوردها: $count\n";
        $sample = DB::table($tableName)->limit(10)->get();
        echo "📝 10 رکورد اول:\n";
        print_r($sample->toArray());
    }catch(\Throwable $e){
        echo "⚠️ خطا در خواندن داده‌ها: ".$e->getMessage()."\n";
    }
}else{
    echo "❌ جدول موجود نیست!\n";
}

// 6️⃣ بررسی دسترسی فولدرها
$dirs = [
    "app/admin/classes",
    "app/admin/views",
    "app/admin/views/terminal_devices",
    "app/admin/assets/vendor/pmd-mediafix",
    "storage/framework/views"
];
echo "\n🔑 بررسی دسترسی فولدرها:\n";
foreach($dirs as $d){
    if(is_dir(__DIR__.'/'.$d)){
        $perm = substr(sprintf('%o', fileperms(__DIR__.'/'.$d)),-4);
        echo " - $d : $perm\n";
    }else{
        echo " - $d : ⚠️ موجود نیست\n";
    }
}

// 7️⃣ پاکسازی کش لاراول
echo "\n🔁 پاکسازی کش‌ها...\n";
shell_exec('php artisan view:clear');
shell_exec('php artisan cache:clear');
shell_exec('php artisan config:clear');
shell_exec('rm -rf storage/framework/views/*');
echo "✅ کش‌ها پاک شدند.\n";

echo "\n🎯 اسکریپت کامل پایان یافت.\n";
