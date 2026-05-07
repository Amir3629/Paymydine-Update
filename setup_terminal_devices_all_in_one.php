<?php
echo "🔧 شروع راه‌اندازی Terminal Devices Controller و ویو اختصاصی\n";

// 1. ساخت کنترلر
$controllerPath = __DIR__.'/app/admin/classes/TerminalDevicesController.php';
if (!file_exists($controllerPath)) {
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
    echo "✅ کنترلر TerminalDevicesController ایجاد شد.\n";
} else {
    echo "⚠️ کنترلر TerminalDevicesController قبلاً وجود دارد.\n";
}

// 2. ساخت ویو اختصاصی
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
    echo "✅ ویو Terminal Devices ساخته شد: $viewPath\n";
} else {
    echo "⚠️ ویو Terminal Devices قبلاً وجود دارد.\n";
}

// 3. بررسی فایل‌های asset و مسیرها
$assetFiles = [
    'daterangepicker.js',
    'daterangepicker.css',
    'force-blue-buttons.js',
    'jquery-sortable.js',
    'moment.min.js'
];
$missingAssets = [];
foreach ($assetFiles as $file) {
    $path = __DIR__."/app/admin/assets/vendor/pmd-mediafix/$file";
    if (!file_exists($path)) $missingAssets[] = $file;
}
if ($missingAssets) {
    echo "⚠️ فایل‌های JS/CSS گم شده: ".implode(', ', $missingAssets)."\n";
    echo "  ✅ لطفاً از repository نسخه اصلی فایل‌ها را در مسیر app/admin/assets/vendor/pmd-mediafix قرار دهید.\n";
} else {
    echo "✅ تمام فایل‌های JS/CSS موجود هستند.\n";
}

// 4. پاکسازی کش لاراول
echo "🔁 پاکسازی کش لاراول...\n";
shell_exec('php artisan view:clear');
shell_exec('php artisan cache:clear');
shell_exec('php artisan config:clear');
shell_exec('rm -rf storage/framework/views/*');
echo "✅ کش‌ها پاک شدند.\n";

echo "\n🎯 تمام مراحل انجام شد. حالا صفحه Terminal Devices باید درست نمایش داده شود.\n";
?>
