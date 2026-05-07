<?php
require __DIR__.'/vendor/autoload.php';
use Illuminate\Support\Facades\DB;
$app = require_once __DIR__.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// اضافه کردن داده تستی
DB::table('ti_terminal_devices')->insert([
    ['name'=>'POS Terminal 1','ip_address'=>'192.168.1.10','status'=>'active','last_active'=>now()],
    ['name'=>'POS Terminal 2','ip_address'=>'192.168.1.11','status'=>'inactive','last_active'=>null],
]);

echo "✅ داده تستی به جدول ti_terminal_devices اضافه شد.\n";
