<?php

use Illuminate\Contracts\Console\Kernel;
use Illuminate\Support\Facades\DB;

require __DIR__.'/vendor/autoload.php';

$app = require __DIR__.'/bootstrap/app.php';
$app->make(Kernel::class)->bootstrap();

$code = 'paypalexpress';
$table = 'payments';              // logical table name for Query Builder
$physicalTable = DB::getTablePrefix().$table;

$update = [
    'name' => 'PayPal Express',
    'description' => 'Allows your customers to make payment using PayPal',
    'priority' => 2,
    'status' => 1,         // enabled
    'is_default' => 0,
    'updated_at' => date('Y-m-d H:i:s'),
];

// 1) پیدا کردن رکورد
$row = DB::table($table)->where('code', $code)->first();

if (!$row) {
    echo "ERROR: row not found for code={$code}\n";
    exit(1);
}

// 2) بکاپ گرفتن
$backupFile = __DIR__.'/paypalexpress_backup_'.date('Ymd_His').'.json';
file_put_contents($backupFile, json_encode((array)$row, JSON_PRETTY_PRINT|JSON_UNESCAPED_UNICODE));

echo "=== BACKUP FILE ===\n";
echo $backupFile."\n\n";

echo "=== BEFORE ===\n";
print_r((array)$row);
echo "\n";

// 3) آپدیت
DB::table($table)->where('code', $code)->update($update);

// 4) خواندن مجدد
$after = DB::table($table)->where('code', $code)->first();

echo "=== AFTER ===\n";
print_r((array)$after);
echo "\n";

echo "=== DONE ===\n";
echo "Updated {$physicalTable} where code={$code}\n";
