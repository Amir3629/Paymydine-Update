<?php
require __DIR__ . '/vendor/autoload.php';

$app = require_once __DIR__ . '/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

use Illuminate\Support\Facades\DB;

echo "شروع اصلاح متغیرها...\n";

if (isset($pmdAllocationColumn) && is_array($pmdAllocationColumn)) {
    $pmdAllocationColumn = implode(',', $pmdAllocationColumn);
    echo "✅ \$pmdAllocationColumn تبدیل شد به رشته: $pmdAllocationColumn\n";
}

if (isset($pmdJoinLeft) && is_array($pmdJoinLeft)) {
    $pmdJoinLeft = implode(',', $pmdJoinLeft);
    echo "✅ \$pmdJoinLeft تبدیل شد به رشته: $pmdJoinLeft\n";
}

if (isset($pmdSplitTransactions) && $pmdSplitTransactions) {
    $pmdTxIds = $pmdSplitTransactions->pluck('id')->all();
    $pmdSplitItemsByTx = [];

    if (!empty($pmdTxIds)) {
        $pmdItemRows = DB::table('order_payment_transaction_items as ti')
            ->leftJoin('order_menus as om', $pmdJoinLeft, '=', 'ti.' . $pmdAllocationColumn)
            ->whereIn('ti.transaction_id', $pmdTxIds)
            ->get([
                'ti.transaction_id',
                'ti.quantity_paid',
                'ti.unit_price',
                'ti.line_total',
                'om.name',
                'om.menu_id',
                'om.order_menu_id'
            ]);

        foreach ($pmdItemRows as $pmdItemRow) {
            $txId = (int)$pmdItemRow->transaction_id;
            $pmdSplitItemsByTx[$txId] = $pmdSplitItemsByTx[$txId] ?? [];
            $pmdSplitItemsByTx[$txId][] = $pmdItemRow;
        }

        echo "✅ Query موفق اجرا شد و داده‌ها آماده هستند.\n";
    } else {
        echo "ℹ️ هیچ تراکنشی برای پردازش وجود ندارد.\n";
    }
} else {
    echo "⚠️ \$pmdSplitTransactions تعریف نشده یا خالی است، نمی‌توان query اجرا کرد.\n";
}

echo "اسکریپت پایان یافت.\n";
