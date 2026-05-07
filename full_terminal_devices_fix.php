<?php
echo "🔧 بررسی و اصلاح کامل صفحه Terminal Devices\n\n";

require __DIR__."/vendor/autoload.php";
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$app = require_once __DIR__."/bootstrap/app.php";
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// 1️⃣ بررسی جدول دیتابیس
$table = "ti_terminal_devices";
echo "💾 جدول $table: ".(Schema::hasTable($table)?"✅ موجود است":"❌ وجود ندارد")."\n";
if(Schema::hasTable($table)){
    $count = DB::table($table)->count();
    echo "📝 تعداد رکوردها: $count\n";
    $sample = DB::table($table)->limit(5)->get();
    echo "📝 نمونه رکوردها:\n";
    foreach($sample as $s){
        echo " - {$s->name} | IP: {$s->ip_address} | Status: {$s->status}\n";
    }
}

// 2️⃣ بررسی کنترلر
$ctrl = __DIR__."/app/admin/classes/TerminalDevicesController.php";
echo "\n📂 کنترلر: ".(file_exists($ctrl)?"✅ موجود است":"❌ پیدا نشد")."\n";
if(file_exists($ctrl)){
    $content = file_get_contents($ctrl);
    echo " - متد index(): ".(strpos($content,"function index")!==false?"✅ موجود است":"⚠️ وجود ندارد")."\n";
    echo " - ریدایرکت به superadmin: ".(preg_match("/superadmin/i",$content)?"⚠️ احتمال ریدایرکت وجود دارد":"✅ ندارد")."\n";
}

// 3️⃣ بررسی ویو
$view = __DIR__."/app/admin/views/terminal_devices/index.blade.php";
echo "\n🖼 ویو: ".(file_exists($view)?"✅ موجود است":"❌ پیدا نشد")."\n";
if(file_exists($view)){
    $lines = file($view);
    $content = implode("",array_slice($lines,0,50));
    echo " - شامل superadmin: ".(preg_match("/superadmin/i",$content)?"⚠️ احتمالا اشتباه است":"✅ ندارد")."\n";
}

// 4️⃣ بررسی روت
$routesFile = __DIR__."/app/admin/routes.php";
echo "\n🛣 مسیر در routes.php: ".(file_exists($routesFile)?"✅ موجود":"❌ پیدا نشد")."\n";
if(file_exists($routesFile)){
    $r = file_get_contents($routesFile);
    echo " - terminal_devices route: ".(preg_match("/Route::resource\(\'terminal_devices\',\s*\'([^\']+)\'\)/",$r,$m)?"✅ ثبت شده به ".$m[1]:"❌ ثبت نشده")."\n";
}

// 5️⃣ دانلود و بررسی فایل‌های JS/CSS
$assetDir = __DIR__."/app/admin/assets/vendor/pmd-mediafix";
if(!is_dir($assetDir)) mkdir($assetDir,0755,true);

$files = [
    "daterangepicker.js" => "https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.min.js",
    "daterangepicker.css" => "https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.css",
    "force-blue-buttons.js" => "", // این فایل باید از local یا repo معتبر شما آپلود شود
    "jquery-sortable.js" => "",    // این فایل هم همینطور
    "moment.min.js" => "https://cdn.jsdelivr.net/npm/moment/min/moment.min.js"
];

echo "\n🗂 دانلود و بررسی JS/CSS:\n";
foreach($files as $f=>$url){
    $path = $assetDir."/".$f;
    if(file_exists($path)){
        echo " - $f ✅ موجود است\n";
    } else if(!empty($url)){
        $c = @file_get_contents($url);
        if($c){
            file_put_contents($path,$c);
            echo " - $f ✅ دانلود شد\n";
        } else {
            echo " - $f ❌ دانلود نشد! لینک یا اینترنت مشکل دارد\n";
        }
    } else {
        echo " - $f ❌ گم شده! باید دستی آپلود شود\n";
    }
}

// 6️⃣ اصلاح دسترسی فولدرها
$dirs = [
    __DIR__."/app/admin/classes",
    __DIR__."/app/admin/views",
    __DIR__."/app/admin/views/terminal_devices",
    $assetDir,
    __DIR__."/storage/framework/views",
    __DIR__."/bootstrap/cache"
];
echo "\n🔑 اصلاح دسترسی فولدرها:\n";
foreach($dirs as $d){
    if(is_dir($d)){
        chmod($d,0755);
        echo " - $d ✅ دسترسی اصلاح شد\n";
    } else {
        echo " - $d ❌ موجود نیست\n";
    }
}

// 7️⃣ پاکسازی کش لاراول
echo "\n♻️ پاکسازی کش لاراول...\n";
shell_exec("php artisan view:clear 2>&1");
shell_exec("php artisan cache:clear 2>&1");
shell_exec("php artisan config:clear 2>&1");
shell_exec("rm -rf ".__DIR__."/storage/framework/views/* 2>&1");
echo "✅ کش‌ها پاک شد\n";

echo "\n🎯 همه بررسی‌ها و اصلاحات انجام شد. صفحه Terminal Devices و Console مرورگر را بررسی کنید.\n";
