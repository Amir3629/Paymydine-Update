<?php
echo "🚀 All-in-One New Terminal Devices Platform Setup\n\n";

require __DIR__.'/vendor/autoload.php';
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;

$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// 1️⃣ دیتابیس جدید و جدول
$table = 'terminal_devices_platform';
echo "💾 ایجاد جدول $table (در صورت عدم وجود)...\n";

if(!Schema::hasTable($table)){
    Schema::create($table,function(Blueprint $table){
        $table->id();
        $table->string('name');
        $table->string('ip_address')->nullable();
        $table->enum('status',['active','inactive'])->default('inactive');
        $table->string('model')->nullable();
        $table->timestamp('last_active')->nullable();
        $table->timestamps();
    });
    echo "✅ جدول ایجاد شد\n";
    DB::table($table)->insert([
        ['name'=>'Terminal 1','ip_address'=>'192.168.1.10','status'=>'active','model'=>'POS123'],
        ['name'=>'Terminal 2','ip_address'=>'192.168.1.11','status'=>'inactive','model'=>'POS123']
    ]);
    echo "📝 رکورد نمونه اضافه شد\n";
} else {
    echo "⚠️ جدول از قبل وجود دارد\n";
}

// 2️⃣ ساخت Controller جدید
$ctrlDir = __DIR__.'/app/admin/classes';
if(!is_dir($ctrlDir)) mkdir($ctrlDir,0755,true);
$ctrlFile = $ctrlDir.'/TerminalDevicesPlatformController.php';
$ctrlContent = <<<PHP
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
PHP;
file_put_contents($ctrlFile,$ctrlContent);
echo "📂 Controller ایجاد شد: $ctrlFile\n";

// 3️⃣ Layout مستقل
$layoutDir = __DIR__.'/resources/views/layouts';
if(!is_dir($layoutDir)) mkdir($layoutDir,0755,true);
$layoutFile = $layoutDir.'/platform.blade.php';
$layoutContent = <<<HTML
<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<title>@yield('title','Terminal Devices Platform')</title>
<link rel="stylesheet" href="/app/admin/assets/vendor/pmd-mediafix/daterangepicker.css">
<style>
body{font-family:sans-serif; margin:20px; background:#f9f9f9;}
table{width:100%; border-collapse: collapse;}
table, th, td{border:1px solid #ccc;}
th, td{padding:8px; text-align:left;}
</style>
</head>
<body>
<h1>@yield('title','Terminal Devices Platform')</h1>
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
echo "🖼 Layout مستقل ایجاد شد: $layoutFile\n";

// 4️⃣ View جدید
$viewDir = __DIR__.'/app/admin/views/terminal_devices_platform';
if(!is_dir($viewDir)) mkdir($viewDir,0755,true);
$viewFile = $viewDir.'/index.blade.php';
$viewContent = <<<HTML
@extends('layouts.platform')

@section('main')
<table class="table table-striped">
<thead>
<tr><th>Name</th><th>IP Address</th><th>Status</th><th>Model</th><th>Last Active</th></tr>
</thead>
<tbody>
@foreach (\$devices as \$device)
<tr>
<td>{{ \$device->name }}</td>
<td>{{ \$device->ip_address ?? 'N/A' }}</td>
<td>{{ \$device->status ?? 'inactive' }}</td>
<td>{{ \$device->model ?? 'N/A' }}</td>
<td>{{ \$device->last_active ?? 'N/A' }}</td>
</tr>
@endforeach
</tbody>
</table>
@endsection
HTML;
file_put_contents($viewFile,$viewContent);
echo "🖼 View ایجاد شد: $viewFile\n";

// 5️⃣ پاکسازی کش
echo "\n♻️ پاکسازی کش لاراول...\n";
shell_exec("php artisan view:clear 2>&1");
shell_exec("php artisan cache:clear 2>&1");
shell_exec("php artisan config:clear 2>&1");
shell_exec("rm -rf ".__DIR__."/storage/framework/views/* 2>&1");

echo "\n🎯 صفحه Terminal Devices Platform کاملاً آماده است.\n";
echo "🔗 URL جدید: /admin/terminal_devices_platform\n";
