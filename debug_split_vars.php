<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Container\Container;

Container::getInstance()->make('Illuminate\Contracts\Http\Kernel')
    ->bootstrap();

$orderId = 1160; // تغییر بده به ID موردنظر

echo "🔎 Debug Split Payments for Order: $orderId\n\n";

$hasTable = Schema::hasTable('order_payment_transactions') 
         && Schema::hasTable('order_payment_transaction_items');

echo "Has split tables: ".($hasTable ? "YES\n":"NO\n");

$txs = DB::table('order_payment_transactions')
    ->where('order_id',$orderId)
    ->orderByDesc('id')->get();

foreach ($txs as $tx) {
    echo "Transaction #{$tx->id}\n";
    foreach (['amount','payment_method'] as $field) {
        $val = $tx->$field;
        echo " - $field is ".(is_array($val) ? "ARRAY" : (is_object($val) ? "OBJECT" : gettype($val)))."\n";
        if(is_array($val)||is_object($val)) var_dump($val);
    }
    echo "\n";
}

$ids = $txs->pluck('id')->all();
if(!empty($ids)){
    $items = DB::table('order_payment_transaction_items as ti')
        ->leftJoin('order_menus as om','om.menu_id','=','ti.order_menu_id')
        ->whereIn('ti.transaction_id',$ids)
        ->get();
    foreach ($items as $item) {
        echo "Item tx {$item->transaction_id}, name {$item->name}\n";
        foreach (['quantity_paid','unit_price','line_total'] as $f) {
            $v = $item->$f;
            echo " - $f is ".(is_array($v) ? "ARRAY" : (is_object($v) ? "OBJECT" : gettype($v)))."\n";
            if(is_array($v)||is_object($v)) var_dump($v);
        }
        echo "\n";
    }
}
echo "Done.\n";
?>
