<?php
echo "🔧 Terminal Devices Full Diagnostic & Setup Script\n\n";

// 1️⃣ Check DB connection
require __DIR__.'/vendor/autoload.php';
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

try {
    $app = require_once __DIR__.'/bootstrap/app.php';
    $kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
    $kernel->bootstrap();
    echo "✅ DB connection successful.\n";
} catch (\Throwable $e) {
    echo "❌ DB connection failed: ".$e->getMessage()."\n";
    exit;
}

// 2️⃣ Check table
if (!Schema::hasTable('ti_terminal_devices')) {
    echo "📂 Table ti_terminal_devices not found, creating...\n";
    DB::statement("
        CREATE TABLE ti_terminal_devices (
            id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
            name VARCHAR(255),
            ip_address VARCHAR(50),
            status VARCHAR(50) DEFAULT 'inactive',
            last_active DATETIME DEFAULT NULL
        )
    ");
    echo "✅ Table created.\n";

    // Seed test data
    DB::table('ti_terminal_devices')->insert([
        ['name'=>'POS Terminal 1','ip_address'=>'192.168.1.10','status'=>'active','last_active'=>date('Y-m-d H:i:s')],
        ['name'=>'POS Terminal 2','ip_address'=>'192.168.1.11','status'=>'inactive','last_active'=>null],
    ]);
    echo "✅ Seeded test data.\n";
} else {
    echo "✅ Table ti_terminal_devices exists.\n";
}

// 3️⃣ Check controller
$controllerPath = __DIR__.'/app/admin/classes/TerminalDevicesController.php';
if (!file_exists($controllerPath)) {
    echo "📂 Creating TerminalDevicesController.php...\n";
    $controllerContent = <<<PHP
<?php
namespace Admin\Classes;

use Admin\Classes\AdminController;
use DB;

class TerminalDevicesController extends AdminController
{
    public \$implement = [];

    public function index()
    {
        \$this->pageTitle = 'Terminal Devices';
        \$this->vars['devices'] = DB::table('ti_terminal_devices')->get();
        return \$this->makeView('admin::terminal_devices.index');
    }
}
PHP;
    file_put_contents($controllerPath, $controllerContent);
    echo "✅ Controller created.\n";
} else {
    echo "✅ Controller exists.\n";
}

// 4️⃣ Check view
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
BLADE;
    file_put_contents($viewPath, $viewContent);
    echo "✅ View created.\n";
} else {
    echo "✅ View exists.\n";
}

// 5️⃣ Check route
$routesFile = __DIR__.'/app/admin/routes.php';
if (file_exists($routesFile)) {
    $routes = file_get_contents($routesFile);
    if (!preg_match("/Route::resource\('terminal_devices',\s*'([^\']+)'\)/", $routes)) {
        file_put_contents($routesFile, "\nRoute::resource('terminal_devices','TerminalDevices');\n", FILE_APPEND);
        echo "✅ Route added to routes.php.\n";
    } else {
        echo "✅ Route exists in routes.php.\n";
    }
} else {
    echo "❌ routes.php missing!\n";
}

// 6️⃣ Check JS/CSS
$assetDir = __DIR__.'/app/admin/assets/vendor/pmd-mediafix';
$assets = ['daterangepicker.js','daterangepicker.css','force-blue-buttons.js','jquery-sortable.js','moment.min.js'];
$missing = [];
foreach ($assets as $f) {
    if (!file_exists($assetDir.'/'.$f)) $missing[] = $f;
}
if ($missing) {
    echo "⚠️ Missing JS/CSS files: ".implode(', ',$missing)."\n";
} else {
    echo "✅ All JS/CSS files exist.\n";
}

// 7️⃣ Set permissions
$dirs = [$viewDir, __DIR__.'/app/admin/classes', $assetDir];
foreach ($dirs as $d) {
    if (is_dir($d)) chmod($d, 0755);
}
echo "✅ Permissions set for important directories.\n";

// 8️⃣ Clear caches
echo "🔁 Clearing Laravel caches...\n";
shell_exec('php artisan view:clear');
shell_exec('php artisan cache:clear');
shell_exec('php artisan config:clear');
shell_exec('rm -rf storage/framework/views/*');
echo "✅ Cache cleared.\n";

echo "\n🎯 Terminal Devices setup & diagnostic complete. Check browser console for JS errors and verify the page.\n";
?>
