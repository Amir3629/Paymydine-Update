<?php
echo "🔧 ساخت صفحه جدید Terminal Devices بدون Super Admin\n\n";

require __DIR__.'/vendor/autoload.php';
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// 1️⃣ بررسی جدول
$table="ti_terminal_devices";
echo "💾 جدول $table: ".(Schema::hasTable($table)?"✅ موجود است":"❌ وجود ندارد")."\n";
if(Schema::hasTable($table)){
    $count=DB::table($table)->count();
    echo "📝 تعداد رکوردها: $count\n";
    $sample=DB::table($table)->limit(5)->get();
    foreach($sample as $s){
        echo " - {$s->name} | IP: {$s->ip_address} | Status: {$s->status}\n";
    }
}

// 2️⃣ بررسی کنترلر
$ctrl=__DIR__.'/app/admin/classes/TerminalDevicesController.php';
echo "\n📂 کنترلر: ".(file_exists($ctrl)?"✅ موجود است":"❌ پیدا نشد")."\n";
if(file_exists($ctrl)){
    $content=file_get_contents($ctrl);
    echo " - متد index(): ".(strpos($content,"function index")!==false?"✅ موجود است":"⚠️ وجود ندارد")."\n";
}

// 3️⃣ ساخت layout ساده بدون Super Admin
$layoutDir=__DIR__.'/resources/views/layouts';
if(!is_dir($layoutDir)) mkdir($layoutDir,0755,true);
$layoutFile=$layoutDir.'/simple.blade.php';
$layoutContent=<<<HTML
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>@yield('title','Terminal Devices')</title>
<link rel="stylesheet" href="/app/admin/assets/vendor/pmd-mediafix/daterangepicker.css">
<link rel="stylesheet" href="/app/admin/assets/vendor/pmd-mediafix/jquery-clockpicker.min.css">
<style>
body{font-family:sans-serif; margin:20px; background:#f9f9f9;}
table{width:100%; border-collapse: collapse;}
table, th, td{border:1px solid #ccc;}
th, td{padding:8px; text-align:left;}
</style>
</head>
<body>
<h1>@yield('title','Terminal Devices')</h1>
@yield('main')
<script src="/app/admin/assets/vendor/pmd-mediafix/jquery.min.js"></script>
<script src="/app/admin/assets/vendor/pmd-mediafix/moment.min.js"></script>
<script src="/app/admin/assets/vendor/pmd-mediafix/daterangepicker.js"></script>
<script src="/app/admin/assets/vendor/pmd-mediafix/force-blue-buttons.js"></script>
<script src="/app/admin/assets/vendor/pmd-mediafix/jquery-sortable.js"></script>
</body>
</html>
HTML;

file_put_contents($layoutFile,$layoutContent);
echo "\n🖼 Layout ساده ایجاد شد: $layoutFile\n";

// 4️⃣ ساخت view جدید Terminal Devices
$viewDir=__DIR__.'/app/admin/views/terminal_devices';
if(!is_dir($viewDir)) mkdir($viewDir,0755,true);
$viewFile=$viewDir.'/index.blade.php';
$viewContent=<<<HTML
@extends('layouts.simple')

@section('title','Terminal Devices')

@section('main')
<table class="table table-striped">
<thead>
<tr>
<th>Name</th>
<th>IP Address</th>
<th>Status</th>
<th>Last Active</th>
</tr>
</thead>
<tbody>
@foreach (\$devices as \$device)
<tr>
<td>{{ \$device->name }}</td>
<td>{{ \$device->ip_address ?? 'N/A' }}</td>
<td>{{ \$device->status ?? 'inactive' }}</td>
<td>{{ \$device->last_active ?? 'N/A' }}</td>
</tr>
@endforeach
</tbody>
</table>
@endsection
HTML;

file_put_contents($viewFile,$viewContent);
echo "\n🖼 View Terminal Devices جدید ایجاد شد: $viewFile\n";

// 5️⃣ بررسی و ایجاد JS/CSS ضروری
$assetDir=__DIR__.'/app/admin/assets/vendor/pmd-mediafix';
if(!is_dir($assetDir)) mkdir($assetDir,0755,true);
$files=[
"daterangepicker.js"=>"https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.min.js",
"daterangepicker.css"=>"https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.css",
"moment.min.js"=>"https://cdn.jsdelivr.net/npm/moment/min/moment.min.js",
"force-blue-buttons.js"=>null,
"jquery-sortable.js"=>null
];
echo "\n🗂 بررسی JS/CSS:\n";
foreach($files as $f=>$url){
    $path=$assetDir.'/'.$f;
    if(file_exists($path)) echo " - $f ✅ موجود است\n";
    else if($url){
        $c=@file_get_contents($url);
        if($c){file_put_contents($path,$c); echo " - $f ✅ دانلود شد\n"; }
        else echo " - $f ❌ دانلود نشد\n";
    } else {
        file_put_contents($path,"// $f placeholder\n");
        echo " - $f ⚠️ Placeholder ایجاد شد\n";
    }
}

// 6️⃣ دسترسی‌ها و کش
$dirs=[
__DIR__.'/storage/framework/views',
__DIR__.'/bootstrap/cache',
$assetDir,
$viewDir,
__DIR__.'/app/admin/classes'
];
foreach($dirs as $d) if(is_dir($d)) chmod($d,0755);

echo "\n♻️ پاکسازی کش لاراول...\n";
shell_exec("php artisan view:clear 2>&1");
shell_exec("php artisan cache:clear 2>&1");
shell_exec("php artisan config:clear 2>&1");
shell_exec("rm -rf ".__DIR__."/storage/framework/views/* 2>&1");

echo "\n🎯 صفحه Terminal Devices جدید ایجاد شد. حالا مرورگر را رفرش کن و بدون Super Admin مشاهده کن.\n";
