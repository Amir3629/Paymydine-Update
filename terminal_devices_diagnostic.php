<?php
echo "🔧 Terminal Devices Full Diagnostic\n\n";

require __DIR__."/vendor/autoload.php";
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$app = require_once __DIR__."/bootstrap/app.php";
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Database check
$table="ti_terminal_devices";
echo "💾 جدول $table: ".(Schema::hasTable($table)?"✅ موجود":"❌ موجود نیست")."\n";
if(Schema::hasTable($table)){
    $count=DB::table($table)->count();
    echo "📝 رکوردها: $count\n";
    $sample=DB::table($table)->limit(10)->get();
    echo "📝 نمونه 10 رکورد اول:\n";
    print_r($sample->toArray());
}

// Controller check
$ctrl=__DIR__."/app/admin/classes/TerminalDevicesController.php";
echo "\n📂 کنترلر: ".(file_exists($ctrl)?"✅ موجود":"❌ پیدا نشد")."\n";
if(file_exists($ctrl)){
    $c=file_get_contents($ctrl);
    echo " - index(): ".(strpos($c,"function index")!==false?"✅ موجود":"⚠️ ندارد")."\n";
    echo " - redirect to superadmin: ".(preg_match("/superadmin/i",$c)?"⚠️ احتمالا دارد":"✅ ندارد")."\n";
}

// View check
$view=__DIR__."/app/admin/views/terminal_devices/index.blade.php";
echo "\n🖼 ویو: ".(file_exists($view)?"✅ موجود":"❌ پیدا نشد")."\n";
if(file_exists($view)){
    $lines=file($view);
    $content=implode("",array_slice($lines,0,50));
    echo substr($content,0,500)."\n";
    echo " - includes superadmin: ".(preg_match("/superadmin/i",$content)?"⚠️ احتمالا دارد":"✅ ندارد")."\n";
}

// Routes check
$routesFile=__DIR__."/app/admin/routes.php";
echo "\n🛣 روت: ".(file_exists($routesFile)?"✅ موجود":"❌ پیدا نشد")."\n";
if(file_exists($routesFile)){
    $r=file_get_contents($routesFile);
    echo " - terminal_devices route: ".(preg_match("/Route::resource\(\'terminal_devices\',\s*\'([^\']+)\'\)/",$r,$m)?"✅ ثبت شده به ".$m[1]:"❌ ثبت نشده")."\n";
}

// Assets check
$assets=__DIR__."/app/admin/assets/vendor/pmd-mediafix";
$files=["daterangepicker.js","daterangepicker.css","force-blue-buttons.js","jquery-sortable.js","moment.min.js"];
echo "\n🗂 فایل‌های JS/CSS:\n";
foreach($files as $f){
    echo " - $f: ".(file_exists($assets."/".$f)?"✅ موجود":"❌ گم شده")."\n";
}

// Folder permissions
$dirs=[__DIR__."/app/admin/classes",__DIR__."/app/admin/views",__DIR__."/app/admin/views/terminal_devices",$assets,__DIR__."/storage/framework/views"];
echo "\n🔑 دسترسی فولدرها:\n";
foreach($dirs as $d){
    echo " - $d: ".(is_dir($d)?substr(sprintf("%o",fileperms($d)),-3):"❌ موجود نیست")."\n";
}

echo "\n🎯 تشخیص کامل شد.\n";
?>
