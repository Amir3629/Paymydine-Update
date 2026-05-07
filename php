<?php
echo "🔧 شروع تنظیم کامل Terminal Devices\n\n";

// 1️⃣ اتصال به دیتابیس
require __DIR__.'/vendor/autoload.php';
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "💾 اتصال به دیتابیس موفق!\n\n";

// 2️⃣ بررسی و ایجاد جدول ti_terminal_devices
$tableName = 'ti_terminal_devices';
if (!Schema::hasTable($tableName)) {
    echo "⚠️ جدول $tableName موجود نیست. ایجاد می‌شود...\n";
    DB::statement("
        CREATE TABLE `$tableName` (
            `device_id` INT AUTO_INCREMENT PRIMARY KEY,
            `name` VARCHAR(255) NOT NULL,
            `ip_address` VARCHAR(50),
            `status` VARCHAR(50) DEFAULT 'inactive',
            `last_active` DATETIME DEFAULT NULL,
            `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            `updated_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8;
    ");
    echo "✅ جدول $tableName ایجاد شد.\n";
} else {
    echo "✅ جدول $tableName از قبل موجود است.\n";
}

// 3️⃣ ایجاد کنترلر TerminalDevicesController.php
$controllerPath = __DIR__.'/app/admin/classes/TerminalDevicesController.php';
if (!file_exists($controllerPath)) {
    echo "⚠️ کنترلر TerminalDevicesController.php وجود ندارد، ایجاد می‌شود...\n";
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
    echo "✅ کنترلر ایجاد شد: $controllerPath\n";
} else {
    echo "✅ کنترلر TerminalDevicesController.php قبلاً موجود است.\n";
}

// 4️⃣ ایجاد ویو اختصاصی index.blade.php
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
    echo "✅ ویو index.blade.php ایجاد شد: $viewPath\n";
} else {
    echo "✅ ویو index.blade.php قبلاً موجود است.\n";
}

// 5️⃣ بررسی فایل‌های JS/CSS
$assetDir = __DIR__.'/app/admin/assets/vendor/pmd-mediafix';
$assets = ['daterangepicker.js','daterangepicker.css','force-blue-buttons.js','jquery-sortable.js','moment.min.js'];
$missing = [];
foreach ($assets as $f) {
    if (!file_exists($assetDir.'/'.$f)) $missing[] = $f;
}
if ($missing) {
    echo "⚠️ فایل‌های JS/CSS گم شده: ".implode(', ',$missing)."\n";
    echo "  لطفاً از repository اصلی فایل‌ها را در مسیر app/admin/assets/vendor/pmd-mediafix قرار دهید.\n";
} else {
    echo "✅ تمام فایل‌های JS/CSS موجود هستند.\n";
}

// 6️⃣ پاکسازی کش لاراول
echo "\n🔁 پاکسازی کش لاراول...\n";
shell_exec('php artisan view:clear');
shell_exec('php artisan cache:clear');
shell_exec('php artisan config:clear');
shell_exec('rm -rf storage/framework/views/*');
echo "✅ کش‌ها پاک شدند.\n";

// 7️⃣ پایان
echo "\n🎯 تمام مراحل انجام شد. حالا صفحه Terminal Devices باید درست نمایش داده شود.\n";
?>
