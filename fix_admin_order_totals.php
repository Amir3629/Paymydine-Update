<?php
require __DIR__.'/vendor/autoload.php';

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Http\Request;

$app = require_once __DIR__.'/bootstrap/app.php';
$request = Request::capture();
$app->instance('request', $request);
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

echo "🔧 شروع اصلاح تراکنش‌ها و جمع کل در Admin Order Edit\n\n";

// بررسی وجود جداول پرداخت
if (!Schema::hasTable('order_payment_transactions') || !Schema::hasTable('order_payment_transaction_items')) {
    echo "❌ جداول پرداخت پیدا نشدند. بررسی کنید دیتابیس.\n";
    exit;
}

// اصلاح تراکنش‌ها
$transactions = DB::table('order_payment_transactions')->get();
foreach ($transactions as $tx) {
    $upd = [];
    foreach (['amount','tax_amount','tip_amount','order_total'] as $f) {
        if (is_array($tx->$f) || is_object($tx->$f)) {
            $upd[$f] = array_sum((array)$tx->$f);
        }
    }
    if (!empty($upd)) {
        DB::table('order_payment_transactions')->where('id',$tx->id)->update($upd);
        echo "✔ اصلاح تراکنش ID {$tx->id}\n";
    }
}

// اصلاح آیتم‌های تراکنش
$items = DB::table('order_payment_transaction_items')->get();
foreach ($items as $item) {
    $upd = [];
    foreach (['quantity_paid','unit_price','line_total'] as $f) {
        if (is_array($item->$f) || is_object($item->$f)) {
            $upd[$f] = array_sum((array)$item->$f);
        }
    }
    if (!empty($upd)) {
        DB::table('order_payment_transaction_items')->where('id',$item->id)->update($upd);
        echo "✔ اصلاح آیتم ID {$item->id}\n";
    }
}

// پاکسازی کش لاراول
echo "\n🔁 پاکسازی کش‌ها...\n";
shell_exec('php artisan view:clear');
shell_exec('php artisan cache:clear');
shell_exec('php artisan config:clear');
shell_exec('rm -rf storage/framework/views/*');

echo "\n✅ همه اصلاحات انجام شد. صفحه Edit Order حالا VAT و Total درست نمایش داده می‌شود.\n";
?>
