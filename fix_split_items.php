<?php
require __DIR__.'/vendor/autoload.php';
$app = require_once __DIR__.'/bootstrap/app.php';
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Container\Container;

Container::getInstance()->make('Illuminate\Contracts\Http\Kernel')
    ->bootstrap();

echo "🔧 Fixing Split Items...\n";

$hasTx = Schema::hasTable('order_payment_transactions');
$hasItems = Schema::hasTable('order_payment_transaction_items');

if (!$hasTx || !$hasItems) {
    echo "Tables not found, abort.\n";
    exit;
}

$transactions = DB::table('order_payment_transactions')->get();
foreach ($transactions as $tx) {
    $update = [];
    foreach (['payment_method','amount'] as $field) {
        if (is_array($tx->$field) || is_object($tx->$field)) {
            $json = json_encode($tx->$field);
            $update[$field] = $json;
        }
    }
    if (!empty($update)) {
        DB::table('order_payment_transactions')
            ->where('id',$tx->id)
            ->update($update);
        echo "Updated tx #{$tx->id}\n";
    }
}

$items = DB::table('order_payment_transaction_items')->get();
foreach ($items as $item) {
    $update = [];
    foreach (['quantity_paid','unit_price','line_total'] as $field) {
        if (is_array($item->$field) || is_object($item->$field)) {
            $update[$field] = json_encode($item->$field);
        }
    }
    if (!empty($update)) {
        DB::table('order_payment_transaction_items')
            ->where('id',$item->id)
            ->update($update);
        echo "Updated item #{$item->id}\n";
    }
}

echo "Done fixing items.\n";
?>
