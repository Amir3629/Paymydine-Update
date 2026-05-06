<?php
if (isset($pmdAllocationColumn) && is_array($pmdAllocationColumn)) {
    $pmdAllocationColumn = implode(',', $pmdAllocationColumn);
}

if (isset($pmdJoinLeft) && is_array($pmdJoinLeft)) {
    $pmdJoinLeft = implode(',', $pmdJoinLeft);
}

$pmdTxIds = $pmdSplitTransactions->pluck('id')->all();
$pmdSplitItemsByTx = [];

if (!empty($pmdTxIds)) {
    $pmdItemRows = \Illuminate\Support\Facades\DB::table('order_payment_transaction_items as ti')
        ->leftJoin('order_menus as om', $pmdJoinLeft, '=', 'ti.' . $pmdAllocationColumn)
        ->whereIn('ti.transaction_id', $pmdTxIds)
        ->get(['ti.transaction_id', 'ti.quantity_paid', 'ti.unit_price', 'ti.line_total', 'om.name', 'om.menu_id', 'om.order_menu_id']);

    foreach ($pmdItemRows as $pmdItemRow) {
        $txId = (int)$pmdItemRow->transaction_id;
        $pmdSplitItemsByTx[$txId] = $pmdSplitItemsByTx[$txId] ?? [];
        $pmdSplitItemsByTx[$txId][] = $pmdItemRow;
    }
}
