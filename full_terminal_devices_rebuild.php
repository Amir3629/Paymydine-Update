<?php
echo "🔧 Full All-in-One Terminal Devices Rebuild Script\n\n";

require __DIR__."/vendor/autoload.php";
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

$app = require_once __DIR__."/bootstrap/app.php";
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// ------------------------
// 1️⃣ Check DB table
// ------------------------
$table = "ti_terminal_devices";
echo "💾 Table $table: " . (Schema::hasTable($table) ? "✅ Exists" : "❌ Missing") . "\n";

if (Schema::hasTable($table)) {
    $count = DB::table($table)->count();
    echo "📝 Total records: $count\n";
    $sample = DB::table($table)->limit(5)->get();
    echo "📝 Sample records:\n";
    foreach ($sample as $s) {
        echo " - {$s->name} | IP: {$s->ip_address} | Status: {$s->status}\n";
    }
}

// ------------------------
// 2️⃣ Check Controller
// ------------------------
$ctrl = __DIR__."/app/admin/classes/TerminalDevicesController.php";
echo "\n📂 Controller: " . (file_exists($ctrl) ? "✅ Exists" : "❌ Missing") . "\n";

if(file_exists($ctrl)){
    $content = file_get_contents($ctrl);
    echo " - index() method: ".(strpos($content,"function index")!==false?"✅ Present":"⚠️ Missing")."\n";
}

// ------------------------
// 3️⃣ Check or create fresh view
// ------------------------
$viewDir = __DIR__."/app/admin/views/terminal_devices";
if(!is_dir($viewDir)) mkdir($viewDir,0755,true);
$viewFile = $viewDir."/index.blade.php";

// Create a fresh blade view
$viewContent = <<<EOV
@extends('admin::layouts.default')

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
EOV;

file_put_contents($viewFile,$viewContent);
echo "\n🖼 Fresh view created at $viewFile\n";

// ------------------------
// 4️⃣ Ensure JS/CSS assets exist
// ------------------------
$assetDir = __DIR__."/app/admin/assets/vendor/pmd-mediafix";
$files = [
    "daterangepicker.js",
    "daterangepicker.css",
    "moment.min.js",
    "force-blue-buttons.js",
    "jquery-sortable.js"
];

echo "\n🗂 JS/CSS Assets:\n";
foreach($files as $f){
    $path = $assetDir."/".$f;
    if(file_exists($path)) echo " - $f ✅ Exists\n";
    else {
        file_put_contents($path, "// $f placeholder, please upload real file\n");
        echo " - $f ⚠️ Created placeholder, upload real file!\n";
    }
}

// ------------------------
// 5️⃣ Fix permissions
// ------------------------
$dirs = [__DIR__."/storage", __DIR__."/bootstrap/cache", $assetDir];
foreach($dirs as $d){
    if(is_dir($d)){
        shell_exec("sudo chown -R www-data:www-data $d");
        shell_exec("sudo chmod -R 775 $d");
    }
}

// ------------------------
// 6️⃣ Clear Laravel caches
// ------------------------
echo "\n♻️ Clearing Laravel cache...\n";
shell_exec("php artisan view:clear 2>&1");
shell_exec("php artisan cache:clear 2>&1");
shell_exec("php artisan config:clear 2>&1");
shell_exec("rm -rf ".__DIR__."/storage/framework/views/* 2>&1");

// ------------------------
// ✅ Finish
// ------------------------
echo "\n🎯 All done. Terminal Devices page rebuilt. Check page in browser.\n";
