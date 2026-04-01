<?php

use Illuminate\Support\Facades\DB;

$invoiceId = '655123040';
$invoiceNumber = 'RG2026/93';
$sourceKey = 'r2o-invoice|655123040';
$tableName = 'Außen 9';
$gross = 138.00;
$net = 115.97;
$vat = 22.03;

echo "== FIND CANDIDATE LOCAL ORDER ==" . PHP_EOL;

$candidates = DB::table('orders')
    ->where(function($q) use ($invoiceId, $invoiceNumber, $sourceKey, $tableName, $gross) {
        $q->where('comment', 'like', '%'.$invoiceId.'%')
          ->orWhere('comment', 'like', '%'.$invoiceNumber.'%')
          ->orWhere('comment', 'like', '%'.$sourceKey.'%')
          ->orWhere('external_order_number', $invoiceNumber)
          ->orWhere('source_key', $sourceKey)
          ->orWhere(function($qq) use ($tableName, $gross) {
              $qq->where('order_total', $gross)
                 ->where(function($qqq) use ($tableName) {
                     $qqq->where('first_name', 'like', '%'.$tableName.'%')
                         ->orWhere('last_name', 'like', '%'.$tableName.'%')
                         ->orWhere('order_type', 'like', '%'.$tableName.'%')
                         ->orWhere('comment', 'like', '%'.$tableName.'%');
                 });
          });
    })
    ->orderByDesc('order_id')
    ->limit(20)
    ->get();

foreach ($candidates as $r) {
    echo implode(" | ", [
        "order_id=".$r->order_id,
        "name=".trim(($r->first_name ?? '').' '.($r->last_name ?? '')),
        "type=".($r->order_type ?? 'NULL'),
        "total=".($r->order_total ?? 'NULL'),
        "created_at=".($r->created_at ?? 'NULL'),
        "comment=".substr((string)($r->comment ?? ''), 0, 260),
    ]) . PHP_EOL;
}

if ($candidates->isEmpty()) {
    echo "NO DIRECT CANDIDATE FOUND" . PHP_EOL;
    return;
}

# choose best candidate:
# 1) comment contains invoice/source key
# 2) exact total 138
# 3) latest row
$chosen = null;
foreach ($candidates as $r) {
    $c = (string)($r->comment ?? '');
    if (strpos($c, $invoiceId) !== false || strpos($c, $sourceKey) !== false || strpos($c, $invoiceNumber) !== false) {
        $chosen = $r;
        break;
    }
}
if (!$chosen) {
    foreach ($candidates as $r) {
        if ((float)$r->order_total === (float)$gross) {
            $chosen = $r;
            break;
        }
    }
}
if (!$chosen) $chosen = $candidates->first();

echo PHP_EOL;
echo "== CHOSEN ORDER ==" . PHP_EOL;
echo "order_id=".$chosen->order_id . PHP_EOL;

$oldComment = trim((string)($chosen->comment ?? ''));

$parts = [];
$parts[] = "Imported from ready2order invoice";
$parts[] = "invoice_id=".$invoiceId;
$parts[] = "invoice_number=".$invoiceNumber;
$parts[] = "table_name=".$tableName;
$parts[] = "source_key=".$sourceKey;
$parts[] = "gross=138.00";
$parts[] = "net=115.97";
$parts[] = "vat=22.03";
$parts[] = "item_total_1=13.50";
$parts[] = "item_total_2=124.50";
$parts[] = "vat_label=davon 19% USt.";

$append = implode(" | ", $parts);

$newComment = $oldComment;
if ($newComment !== '') $newComment .= " | ";
$newComment .= $append;

DB::table('orders')->where('order_id', $chosen->order_id)->update([
    'comment' => $newComment,
    'external_order_number' => $invoiceNumber,
    'source_key' => $sourceKey,
    'is_imported_ready2order' => 1,
]);

echo "[PATCHED ORDER] ".$chosen->order_id . PHP_EOL;

echo PHP_EOL;
echo "== PATCH ORDER_MENUS ==" . PHP_EOL;

$menus = DB::table('order_menus')->where('order_id', $chosen->order_id)->get();
foreach ($menus as $m) {
    echo "BEFORE | order_menu_id=".$m->order_menu_id." | name=".$m->name." | qty=".$m->quantity." | price=".$m->price." | subtotal=".$m->subtotal.PHP_EOL;
}

# exact item truth from POS
DB::table('order_menus')
    ->where('order_id', $chosen->order_id)
    ->where('name', 'Soda Zitrone')
    ->update([
        'quantity' => 9,
        'price' => 1.50,
        'subtotal' => 13.50,
    ]);

DB::table('order_menus')
    ->where('order_id', $chosen->order_id)
    ->where('name', 'Soda Zitrone (Test here)')
    ->update([
        'quantity' => 1,
        'price' => 124.50,
        'subtotal' => 124.50,
    ]);

$menus2 = DB::table('order_menus')->where('order_id', $chosen->order_id)->get();
foreach ($menus2 as $m) {
    echo "AFTER  | order_menu_id=".$m->order_menu_id." | name=".$m->name." | qty=".$m->quantity." | price=".$m->price." | subtotal=".$m->subtotal.PHP_EOL;
}

echo PHP_EOL;
echo "== FINAL VERIFY ==" . PHP_EOL;
$final = DB::table('orders')->where('order_id', $chosen->order_id)->first();
echo implode(" | ", [
    "order_id=".$final->order_id,
    "external_order_number=".($final->external_order_number ?? 'NULL'),
    "source_key=".($final->source_key ?? 'NULL'),
    "is_imported_ready2order=".($final->is_imported_ready2order ?? 'NULL'),
    "total=".($final->order_total ?? 'NULL'),
    "comment=".substr((string)($final->comment ?? ''), 0, 400),
]) . PHP_EOL;
