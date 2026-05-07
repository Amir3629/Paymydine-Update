<?php
require __DIR__.'/vendor/autoload.php';
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// Boot the framework with a fake Request (fixes UrlGenerator error)
$app = require_once __DIR__.'/bootstrap/app.php';
$request = Request::capture();
$app->instance('request', $request);
$app->make('Illuminate\Contracts\Http\Kernel')->bootstrap();

echo "🔍 Starting ALL‑IN‑ONE PayMyDine FIX\n\n";

// 1) Check split tables exist
$tablesOk = Schema::hasTable('order_payment_transactions') && Schema::hasTable('order_payment_transaction_items');

echo "✔ Split tables exist: ".($tablesOk ? "YES" : "NO")."\n\n";

// 2) Fix transactions table (force fields to string)
if ($tablesOk) {
    $txs = DB::table('order_payment_transactions')->get();
    foreach ($txs as $tx) {
        $upd = [];
        foreach (['amount','payment_method'] as $f) {
            if (is_array($tx->$f) || is_object($tx->$f)) {
                $upd[$f] = json_encode($tx->$f);
            }
        }
        if ($upd) {
            DB::table('order_payment_transactions')->where('id',$tx->id)->update($upd);
            echo "✔ Fixed transaction ID {$tx->id}\n";
        }
    }

    // 3) Fix item details table
    $items = DB::table('order_payment_transaction_items')->get();
    foreach ($items as $item) {
        $upd = [];
        foreach (['quantity_paid','unit_price','line_total'] as $f) {
            if (is_array($item->$f) || is_object($item->$f)) {
                $upd[$f] = json_encode($item->$f);
            }
        }
        if ($upd) {
            DB::table('order_payment_transaction_items')->where('id',$item->id)->update($upd);
            echo "✔ Fixed item ID {$item->id}\n";
        }
    }
}

echo "\n🔁 Clearing Views & Cache...\n";
shell_exec('php artisan view:clear');
shell_exec('php artisan cache:clear');
shell_exec('php artisan config:clear');
shell_exec('rm -rf storage/framework/views/*');

echo "\n✅ ALL FIXES APPLIED! Try loading the edit page now.\n";
?>
