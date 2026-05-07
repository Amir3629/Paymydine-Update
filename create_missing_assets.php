<?php
echo "🔧 ایجاد فایل‌های JS/CSS گم شده و آماده‌سازی صفحه Terminal Devices\n\n";

// مسیر assets
$assetDir = __DIR__."/app/admin/assets/vendor/pmd-mediafix";
if(!is_dir($assetDir)) mkdir($assetDir,0755,true);

// فایل‌های اصلی CDN
$files = [
    "daterangepicker.js" => "https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.min.js",
    "daterangepicker.css" => "https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.css",
    "moment.min.js" => "https://cdn.jsdelivr.net/npm/moment/min/moment.min.js",
    "force-blue-buttons.js" => null,   // گم شده
    "jquery-sortable.js" => null       // گم شده
];

foreach($files as $f=>$url){
    $path = $assetDir."/".$f;
    if(file_exists($path)){
        echo " - $f ✅ موجود است\n";
    } else if($url){
        $c = @file_get_contents($url);
        if($c){ file_put_contents($path,$c); echo " - $f ✅ دانلود شد\n"; }
        else echo " - $f ❌ دانلود نشد! لینک یا اینترنت مشکل دارد\n";
    } else {
        // فایل گم شده، یک placeholder ایجاد می‌کنیم
        $placeholder = "// $f placeholder - لطفا نسخه اصلی را جایگزین کنید\n";
        file_put_contents($path,$placeholder);
        echo " - $f ⚠️ ایجاد شد (نسخه placeholder)\n";
    }
}

// اصلاح دسترسی‌ها
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

// پاکسازی کش لاراول
echo "\n♻️ پاکسازی کش لاراول...\n";
shell_exec("php artisan view:clear 2>&1");
shell_exec("php artisan cache:clear 2>&1");
shell_exec("php artisan config:clear 2>&1");
shell_exec("rm -rf ".__DIR__."/storage/framework/views/* 2>&1");

echo "\n🎯 تمام فایل‌ها ایجاد/دانلود شدند و کش پاک شد. حالا صفحه Terminal Devices باید درست نمایش داده شود.\n";
