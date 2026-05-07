<?php
echo "🔧 Terminal Devices Safe Setup Script\n\n";

require __DIR__.'/vendor/autoload.php';
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Database\Schema\Blueprint;
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();
echo "✅ Laravel bootstrapped.\n";

// 1️⃣ Create table
if (!Schema::hasTable('ti_terminal_devices')) {
    Schema::create('ti_terminal_devices', function (Blueprint $table) {
        $table->id();
        $table->string('name');
        $table->string('ip_address')->nullable();
        $table->string('status')->default('inactive');
        $table->timestamp('last_active')->nullable();
        $table->timestamps();
    });
    echo "✅ Table ti_terminal_devices created.\n";
} else {
    echo "⚠️ Table ti_terminal_devices already exists.\n";
}

// 2️⃣ Seed sample data
$existing = DB::table('ti_terminal_devices')->count();
if ($existing == 0) {
    DB::table('ti_terminal_devices')->insert([
        ['name'=>'POS Terminal 1','ip_address'=>'192.168.1.10','status'=>'active','last_active'=>now()],
        ['name'=>'POS Terminal 2','ip_address'=>'192.168.1.11','status'=>'inactive','last_active'=>now()]
    ]);
    echo "✅ Sample devices seeded.\n";
} else {
    echo "⚠️ Table already has data.\n";
}

// 3️⃣ Create Controller
$controllerPath = __DIR__.'/app/admin/classes/TerminalDevicesController.php';
if (!file_exists($controllerPath)) {
    $controllerContent = <<<PHP
<?php
namespace Admin\Classes;
use Admin\Classes\AdminController;
use DB;
class TerminalDevicesController extends AdminController {
    public \$implement = [];
    public function index() {
        \$this->pageTitle = 'Terminal Devices';
        \$this->vars['devices'] = DB::table('ti_terminal_devices')->get();
        return \$this->makeView('admin::terminal_devices.index');
    }
}
PHP;
    file_put_contents($controllerPath, $controllerContent);
    echo "✅ TerminalDevicesController.php created.\n";
} else {
    echo "⚠️ Controller already exists.\n";
}

// 4️⃣ Create view
$viewDir = __DIR__.'/app/admin/views/terminal_devices';
$viewPath = $viewDir.'/index.blade.php';
if (!file_exists($viewPath)) {
    if (!is_dir($viewDir)) mkdir($viewDir, 0755, true);
    $viewContent = <<<BLADE
@extends('admin::layouts.default')
@section('main')
<h1>Terminal Devices</h1>
<table class="table table-striped">
<thead>
<tr><th>Name</th><th>IP Address</th><th>Status</th><th>Last Active</th></tr>
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
BLADE;
    file_put_contents($viewPath, $viewContent);
    echo "✅ index.blade.php created.\n";
} else {
    echo "⚠️ View already exists.\n";
}

// 5️⃣ Check for JS/CSS files
$assetDir = __DIR__.'/app/admin/assets/vendor/pmd-mediafix';
$assets = ['daterangepicker.js','daterangepicker.css','force-blue-buttons.js','jquery-sortable.js','moment.min.js'];
$missing = [];
foreach ($assets as $f) {
    if (!file_exists($assetDir.'/'.$f)) $missing[] = $f;
}
if ($missing) {
    echo "⚠️ Missing JS/CSS files: ".implode(', ', $missing)."\n";
} else {
    echo "✅ All JS/CSS files exist.\n";
}

// 6️⃣ Clear caches
echo "🔁 Clearing Laravel caches...\n";
shell_exec('php artisan view:clear');
shell_exec('php artisan cache:clear');
shell_exec('php artisan config:clear');
shell_exec('rm -rf storage/framework/views/*');
echo "✅ Caches cleared.\n";

echo "\n🎯 Terminal Devices setup complete. Open the page in your browser and check console for JS errors.\n";
?>
