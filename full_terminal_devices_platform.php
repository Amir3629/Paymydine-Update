<?php
echo "🚀 All-in-One Terminal Devices Platform Setup\n\n";

require __DIR__.'/vendor/autoload.php';
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

// Bootstrap Laravel
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// 1️⃣ جدول جدید
$table = 'terminal_devices_platform';
if(!Schema::hasTable($table)){
    Schema::create($table,function(Blueprint $t){
        $t->id();
        $t->string('name');
        $t->string('ip_address')->nullable();
        $t->enum('status',['active','inactive'])->default('inactive');
        $t->string('model')->nullable();
        $t->timestamp('last_active')->nullable();
        $t->timestamps();
    });
    echo "✅ جدول $table ایجاد شد\n";

    DB::table($table)->insert([
        ['name'=>'Terminal 1','ip_address'=>'192.168.1.10','status'=>'active','model'=>'SUMUP'],
        ['name'=>'Terminal 2','ip_address'=>'192.168.1.11','status'=>'inactive','model'=>'Worldline'],
        ['name'=>'Terminal 3','ip_address'=>'192.168.1.12','status'=>'inactive','model'=>'Other']
    ]);
    echo "📝 رکورد نمونه اضافه شد\n";
} else {
    echo "⚠️ جدول $table از قبل وجود دارد\n";
}

// 2️⃣ کنترلر
$ctrlDir = __DIR__.'/app/Admin/Classes';
if(!is_dir($ctrlDir)) mkdir($ctrlDir,0755,true);
$ctrlFile = $ctrlDir.'/TerminalDevicesPlatformController.php';
file_put_contents($ctrlFile, <<<PHP
<?php
namespace App\Admin\Classes;
use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TerminalDevicesPlatformController extends Controller {
    public function index() {
        \$devices = DB::table('terminal_devices_platform')->get();
        return view('admin::terminal_devices_platform.index', compact('devices'));
    }
}
PHP
);
echo "📂 Controller ایجاد شد: $ctrlFile\n";

// 3️⃣ Layout مستقل
$layoutDir = __DIR__.'/resources/views/layouts';
if(!is_dir($layoutDir)) mkdir($layoutDir,0755,true);
$layoutFile = $layoutDir.'/platform.blade.php';
file_put_contents($layoutFile, <<<HTML
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>@yield('title','Terminal Devices')</title>
<link rel="stylesheet" href="/app/admin/assets/vendor/pmd-mediafix/daterangepicker.css">
<link rel="stylesheet" href="/app/admin/assets/vendor/pmd-mediafix/jquery-clockpicker.min.css">
<style>
body{font-family:sans-serif;margin:20px;background:#f9f9f9;}
table{width:100%;border-collapse:collapse;}
table,th,td{border:1px solid #ccc;}
th,td{padding:8px;text-align:left;}
</style>
</head>
<body>
<h1>@yield('title','Terminal Devices')</h1>
@yield('main')
<script src="/app/admin/assets/vendor/pmd-mediafix/jquery.min.js"></script>
<script src="/app/admin/assets/vendor/pmd-mediafix/moment.min.js"></script>
<script src="/app/admin/assets/vendor/pmd-mediafix/daterangepicker.js"></script>
</body>
</html>
HTML
);
echo "🖼 Layout ایجاد شد: $layoutFile\n";

// 4️⃣ View index
$viewDir = __DIR__.'/resources/views/admin/terminal_devices_platform';
if(!is_dir($viewDir)) mkdir($viewDir,0755,true);
$viewFile = $viewDir.'/index.blade.php';
file_put_contents($viewFile, <<<HTML
@extends('layouts.platform')

@section('main')
<table class="table table-striped">
<thead>
<tr>
<th>Name</th>
<th>IP Address</th>
<th>Model</th>
<th>Status</th>
<th>Last Active</th>
</tr>
</thead>
<tbody>
@foreach (\$devices as \$device)
<tr>
<td>{{ \$device->name }}</td>
<td>{{ \$device->ip_address ?? 'N/A' }}</td>
<td>{{ \$device->model ?? 'N/A' }}</td>
<td>{{ \$device->status ?? 'inactive' }}</td>
<td>{{ \$device->last_active ?? 'N/A' }}</td>
</tr>
@endforeach
</tbody>
</table>
@endsection
HTML
);
echo "🖼 View ایجاد شد: $viewFile\n";

// 5️⃣ Route جدید
$routesFile = __DIR__.'/routes/web.php';
$routeLine = "Route::get('/admin/terminal_devices_platform', [\\App\\Admin\\Classes\\TerminalDevicesPlatformController::class,'index'])->name('terminal_devices_platform.index');\n";

if(file_exists($routesFile)){
    $routesContent = file_get_contents($routesFile);
    if(strpos($routesContent,$routeLine)===false){
        file_put_contents($routesFile, "\n".$routeLine , FILE_APPEND);
        echo "🔗 Route جدید اضافه شد به $routesFile\n";
    } else {
        echo "⚠️ Route از قبل وجود دارد\n";
    }
}

// 6️⃣ پاکسازی کش لاراول
echo "\n♻️ پاکسازی کش لاراول...\n";
shell_exec("php artisan view:clear 2>&1");
shell_exec("php artisan cache:clear 2>&1");
shell_exec("php artisan config:clear 2>&1");
shell_exec("rm -rf ".__DIR__."/storage/framework/views/* 2>&1");

echo "\n🎯 Terminal Devices Platform آماده است\n";
echo "🔗 URL پیشنهادی: /admin/terminal_devices_platform\n";
