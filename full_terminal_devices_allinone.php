<?php
echo "🔧 اسکریپت کامل بررسی و اصلاح Terminal Devices\n\n";

require __DIR__."/vendor/autoload.php";
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Boot Laravel
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
    foreach($sample as $s) echo " - {$s->name} | IP: {$s->ip_address} | Status: {$s->status}\n";
}

// 2️⃣ بررسی کنترلر
$ctrl = __DIR__."/app/admin/classes/TerminalDevicesController.php";
echo "\n📂 کنترلر: ".(file_exists($ctrl)?"✅ موجود است":"❌ پیدا نشد")."\n";
if(file_exists($ctrl)){
    $content = file_get_contents($ctrl);
    echo " - متد index(): ".(strpos($content,"function index")!==false?"✅ موجود است":"⚠️ وجود ندارد")."\n";
    echo " - ریدایرکت به superadmin: ".(preg_match("/superadmin/i",$content)?"⚠️ احتمالا وجود دارد":"✅ ندارد")."\n";
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

// 5️⃣ دانلود و ایجاد فایل‌های JS/CSS
$assetDir = __DIR__."/app/admin/assets/vendor/pmd-mediafix";
if(!is_dir($assetDir)) mkdir($assetDir,0755,true);

$files = [
    "daterangepicker.js" => "https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.min.js",
    "daterangepicker.css" => "https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.css",
    "moment.min.js" => "https://cdn.jsdelivr.net/npm/moment/min/moment.min.js",
    "force-blue-buttons.js" => null, // گم شده
    "jquery-sortable.js" => null      // گم شده
];

echo "\n🗂 دانلود و ایجاد فایل‌های JS/CSS:\n";
foreach($files as $f=>$url){
    $path = $assetDir."/".$f;
    if(file_exists($path)){
        echo " - $f ✅ موجود است\n";
    } else if($url){
        $c = @file_get_contents($url);
        if($c){ file_put_contents($path,$c); echo " - $f ✅ دانلود شد\n"; }
        else echo " - $f ❌ دانلود نشد! لینک یا اینترنت مشکل دارد\n";
    } else {
        $placeholder = "// $f placeholder - لطفا نسخه اصلی را جایگزین کنید\n";
        file_put_contents($path,$placeholder);
        echo " - $f ⚠️ ایجاد شد (placeholder)\n";
    }
}

// 6️⃣ اصلاح دسترسی فولدرها
$dirs = [
    __DIR__."/app/admin/assets/vendor/pmd-mediafix",
    __DIR__."/app/admin/classes",
    __DIR__."/app/admin/views",
    __DIR__."/app/admin/views/terminal_devices",
    __DIR__."/storage/framework/views",
    __DIR__."/bootstrap/cache"
];
foreach($dirs as $d){
    if(is_dir($d)) chmod($d,0755);
}

// 7️⃣ تغییر مالکیت storage و cache به www-data
system("sudo chown -R www-data:www-data storage bootstrap/cache app/admin/assets/vendor/pmd-mediafix");

// 8️⃣ پاکسازی کش لاراول
echo "\n♻️ پاکسازی کش لاراول...\n";
shell_exec("php artisan view:clear 2>&1");
shell_exec("php artisan cache:clear 2>&1");
shell_exec("php artisan config:clear 2>&1");
shell_exec("sudo rm -rf ".__DIR__."/storage/framework/views/* 2>&1");

echo "\n🎯 تمام مراحل انجام شد. اکنون صفحه Terminal Devices و Console مرورگر را بررسی کنید.\n";
