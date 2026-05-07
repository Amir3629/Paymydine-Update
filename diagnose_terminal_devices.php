<?php
echo "🔧 تشخیص کامل صفحه Terminal Devices\n\n";

require __DIR__."/vendor/autoload.php";
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$app = require_once __DIR__."/bootstrap/app.php";
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$table="ti_terminal_devices";
echo "💾 جدول $table: ".(Schema::hasTable($table)?"✅ موجود است":"❌ وجود ندارد")."\n";
if(Schema::hasTable($table)){
    $count=DB::table($table)->count();
    echo "📝 تعداد رکوردها: $count\n";
    $sample=DB::table($table)->limit(5)->get();
    echo "📝 نمونه رکوردها:\n";
    foreach($sample as $s) echo " - {$s->name} | IP: {$s->ip_address} | Status: {$s->status}\n";
}

$ctrl=__DIR__."/app/admin/classes/TerminalDevicesController.php";
echo "\n📂 کنترلر: ".(file_exists($ctrl)?"✅ موجود است":"❌ پیدا نشد")."\n";
if(file_exists($ctrl)){
    $content=file_get_contents($ctrl);
    echo " - متد index(): ".(strpos($content,"function index")!==false?"✅ موجود است":"⚠️ وجود ندارد")."\n";
    echo " - ریدایرکت به superadmin: ".(preg_match("/superadmin/i",$content)?"⚠️ احتمالا وجود دارد":"✅ ندارد")."\n";
}

$view=__DIR__."/app/admin/views/terminal_devices/index.blade.php";
echo "\n🖼 ویو: ".(file_exists($view)?"✅ موجود است":"❌ پیدا نشد")."\n";
if(file_exists($view)){
    $lines=file($view);
    $content=implode("",array_slice($lines,0,50));
    echo " - شامل superadmin: ".(preg_match("/superadmin/i",$content)?"⚠️ احتمالا اشتباه است":"✅ ندارد")."\n";
}

$routesFile=__DIR__."/app/admin/routes.php";
echo "\n🛣 مسیر در routes.php: ".(file_exists($routesFile)?"✅ موجود":"❌ پیدا نشد")."\n";
if(file_exists($routesFile)){
    $r=file_get_contents($routesFile);
    echo " - terminal_devices route: ".(preg_match("/Route::resource\(\'terminal_devices\',\s*\'([^\']+)\'\)/",$r,$m)?"✅ ثبت شده به ".$m[1]:"❌ ثبت نشده")."\n";
}

$assetDir=__DIR__."/app/admin/assets/vendor/pmd-mediafix";
$files=["daterangepicker.js","daterangepicker.css","force-blue-buttons.js","jquery-sortable.js","moment.min.js"];
echo "\n🗂 فایل‌های JS/CSS:\n";
foreach($files as $f) echo " - $f: ".(file_exists($assetDir."/".$f)?"✅ موجود است":"❌ گم شده")."\n";

$dirs=[__DIR__."/app/admin/classes",__DIR__."/app/admin/views",__DIR__."/app/admin/views/terminal_devices",$assetDir,__DIR__."/storage/framework/views"];
echo "\n🔑 دسترسی فولدرها:\n";
foreach($dirs as $d){
    if(is_dir($d)) echo " - $d: ".substr(sprintf("%o",fileperms($d)),-3)."\n";
    else echo " - $d: ❌ موجود نیست\n";
}

echo "\n♻️ پاکسازی کش لاراول...\n";
shell_exec("php artisan view:clear 2>&1");
shell_exec("php artisan cache:clear 2>&1");
shell_exec("php artisan config:clear 2>&1");
shell_exec("rm -rf ".__DIR__."/storage/framework/views/* 2>&1");
echo "✅ کش‌ها پاک شد\n";

echo "\n🎯 تشخیص کامل انجام شد. حالا صفحه Terminal Devices و console مرورگر را بررسی کنید.\n";
?>
