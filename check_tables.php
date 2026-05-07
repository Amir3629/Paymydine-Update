<?php
require __DIR__.'/vendor/autoload.php';
use Illuminate\Support\Facades\Schema;
$app = require_once __DIR__.'/bootstrap/app.php';
$app->make('Illuminate\Contracts\Http\Kernel')->bootstrap();

echo "order_payment_transactions exists? ".(Schema::hasTable('order_payment_transactions') ? "YES" : "NO")."\n";
echo "order_payment_transaction_items exists? ".(Schema::hasTable('order_payment_transaction_items') ? "YES" : "NO")."\n";
?>
