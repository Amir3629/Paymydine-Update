<?php
echo "🔧 Rebuild Clean Terminal Devices Page\n\n";

require __DIR__.'/vendor/autoload.php';
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// 1️⃣ بررسی جدول
$table="ti_terminal_devices";
echo "💾 Table $table: ".(Schema::hasTable($table)?"✅ Exists":"❌ Missing")."\n";
if(Schema::hasTable($table)){
    $count=DB::table($table)->count();
    echo "📝 Total records: $count\n";
    $sample=DB::table($table)->limit(5)->get();
    foreach($sample as $s){
        echo " - {$s->name} | IP: {$s->ip_address} | Status: {$s->status}\n";
    }
}

// 2️⃣ بررسی کنترلر
$ctrl=__DIR__.'/app/admin/classes/TerminalDevicesController.php';
echo "\n📂 Controller: ".(file_exists($ctrl)?"✅ Exists":"❌ Missing")."\n";
if(file_exists($ctrl)){
    $content=file_get_contents($ctrl);
    echo " - index() method: ".(strpos($content,"function index")!==false?"✅ Present":"⚠️ Missing")."\n";
}

// 3️⃣ ساخت view جدید clean بدون Super Admin
$viewDir=__DIR__.'/app/admin/views/terminal_devices';
if(!is_dir($viewDir)) mkdir($viewDir,0755,true);
$viewFile=$viewDir.'/index.blade.php';
$viewContent=<<<HTML
@extends('admin::layouts.clean') {{-- layout بدون Super Admin --}}

@section('main')
<h1>Terminal Devices</h1>
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
echo "\n🖼 Fresh clean view created at $viewFile\n";

// 4️⃣ بررسی و دانلود JS/CSS ها
$assetDir=__DIR__.'/app/admin/assets/vendor/pmd-mediafix';
if(!is_dir($assetDir)) mkdir($assetDir,0755,true);
$files=[
"daterangepicker.js"=>"https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.min.js",
"daterangepicker.css"=>"https://cdn.jsdelivr.net/npm/daterangepicker/daterangepicker.css",
"moment.min.js"=>"https://cdn.jsdelivr.net/npm/moment/min/moment.min.js",
"force-blue-buttons.js"=>null,
"jquery-sortable.js"=>null
];
echo "\n🗂 JS/CSS Assets:\n";
foreach($files as $f=>$url){
    $path=$assetDir.'/'.$f;
    if(file_exists($path)) echo " - $f ✅ Exists\n";
    else if($url){
        $c=@file_get_contents($url);
        if($c){file_put_contents($path,$c); echo " - $f ✅ Downloaded\n"; }
        else echo " - $f ❌ Failed to download\n";
    } else {
        file_put_contents($path,"// $f placeholder\n");
        echo " - $f ⚠️ Placeholder created\n";
    }
}

// 5️⃣ دسترسی‌ها
$dirs=[
__DIR__.'/storage/framework/views',
__DIR__.'/bootstrap/cache',
$assetDir,
__DIR__.'/app/admin/views/terminal_devices',
__DIR__.'/app/admin/classes'
];
foreach($dirs as $d) if(is_dir($d)) chmod($d,0755);

// 6️⃣ پاکسازی کش لاراول
echo "\n♻️ Clearing Laravel cache...\n";
shell_exec("php artisan view:clear 2>&1");
shell_exec("php artisan cache:clear 2>&1");
shell_exec("php artisan config:clear 2>&1");
shell_exec("rm -rf ".__DIR__."/storage/framework/views/* 2>&1");

echo "\n🎯 Terminal Devices page rebuilt CLEAN. Use @extends('admin::layouts.clean') for layout without Super Admin.\n";
