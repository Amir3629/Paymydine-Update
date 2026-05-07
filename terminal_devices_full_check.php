<?php
echo "🔧 Terminal Devices Full Diagnostic & Fix\n\n";

require __DIR__."/vendor/autoload.php";
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Boot Laravel
$app = require_once __DIR__."/bootstrap/app.php";
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// 1️⃣ بررسی جدول دیتابیس
$tableName = "ti_terminal_devices";
echo "💾 بررسی جدول $tableName:\n";
if (Schema::hasTable($tableName)) {
    echo "✅ جدول موجود است.\n";
    $count = DB::table($tableName)->count();
    echo "📝 تعداد رکوردها: $count\n";
    $sample = DB::table($tableName)->limit(10)->get();
    echo "📝 نمونه 10 رکورد اول:\n";
    print_r($sample->toArray());
} else {
    echo "❌ جدول موجود نیست!\n";
}

// 2️⃣ بررسی کنترلر
$controllerPath = __DIR__."/app/admin/classes/TerminalDevicesController.php";
echo "\n📂 بررسی کنترلر:\n";
if(file_exists($controllerPath)){
    echo "✅ کنترلر موجود است: $controllerPath\n";
    $content=file_get_contents($controllerPath);
    if(strpos($content,"function index")!==false) echo "✅ متد index() موجود است.\n";
    else echo "⚠️ متد index() موجود نیست.\n";
}else{
    echo "❌ فایل کنترلر پیدا نشد!\n";
}

// 3️⃣ بررسی ویو
$viewPath = __DIR__."/app/admin/views/terminal_devices/index.blade.php";
echo "\n🖼 بررسی ویو:\n";
if(file_exists($viewPath)){
    echo "✅ ویو موجود است: $viewPath\n";
}else{
    echo "❌ ویو پیدا نشد!\n";
}

// 4️⃣ بررسی مسیر در routes.php
$routesFile = __DIR__."/app/admin/routes.php";
echo "\n🛣 بررسی روت‌ها:\n";
if(file_exists($routesFile)){
    $routes = file_get_contents($routesFile);
    if(preg_match("/Route::resource\(\'terminal_devices\',\s*\'([^\']+)\'\)/",$routes,$m)){
        echo "✅ مسیر terminal_devices به کنترلر ثبت شده است: ".$m[1]."\n";
    } else { echo "❌ مسیر terminal_devices ثبت نشده است.\n"; }
}else{ echo "❌ routes.php پیدا نشد!\n"; }

// 5️⃣ بررسی فایل‌های JS/CSS
$assetDir = __DIR__."/app/admin/assets/vendor/pmd-mediafix";
$assets = ["daterangepicker.js","daterangepicker.css","force-blue-buttons.js","jquery-sortable.js","moment.min.js"];
echo "\n🗂 بررسی فایل‌های JS/CSS:\n";
foreach($assets as $f){
    echo " - $f : ".(file_exists($assetDir."/".$f)?"✅ موجود":"❌ گم شده")."\n";
}

// 6️⃣ بررسی دسترسی فولدرها
$dirs = [
    __DIR__."/app/admin/classes",
    __DIR__."/app/admin/views",
    __DIR__."/app/admin/views/terminal_devices",
    $assetDir,
    __DIR__."/storage/framework/views"
];
echo "\n🔑 بررسی دسترسی فولدرها:\n";
foreach($dirs as $d){
    if(is_dir($d)){
        echo " - $d : ".substr(sprintf('%o', fileperms($d)), -4)."\n";
    } else { echo " - $d : ❌ وجود ندارد\n"; }
}

// 7️⃣ پاکسازی کش لاراول
echo "\n♻️ پاکسازی کش‌ها...\n";
shell_exec("php artisan view:clear");
shell_exec("php artisan cache:clear");
shell_exec("php artisan config:clear");
shell_exec("rm -rf ".__DIR__."/storage/framework/views/*");
echo "✅ کش‌ها پاک شد\n";

echo "\n🎯 اسکریپت کامل پایان یافت. حالا بررسی کنید صفحه Terminal Devices در مرورگر و Console JS.\n";
