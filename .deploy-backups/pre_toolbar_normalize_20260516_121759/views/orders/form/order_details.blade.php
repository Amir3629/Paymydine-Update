@extends('admin::layouts.default')

@section('main')
<table class="order-details-table">
<tbody>

@php
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

// بررسی جداول پرداخت تقسیم‌شده
$pmdHasSplitTables = Schema::hasTable('order_payment_transactions')
    && Schema::hasTable('order_payment_transaction_items');

$pmdSplitTransactions = collect();
$pmdSplitItemsByTx = [];

if ($pmdHasSplitTables) {
    $pmdAllocationColumn = function_exists('pmdResolveSplitAllocationColumn')
        ? pmdResolveSplitAllocationColumn()
        : (Schema::hasColumn('order_payment_transaction_items', 'order_item_id')
            ? 'order_item_id'
            : (Schema::hasColumn('order_payment_transaction_items', 'order_menu_id')
                ? 'order_menu_id' : 'menu_id'));

    $pmdJoinLeft = $pmdAllocationColumn === 'menu_id' ? 'om.menu_id' : 'om.order_menu_id';

    $pmdSplitTransactions = DB::table('order_payment_transactions')
        ->where('order_id', (int)$formModel->order_id)
        ->orderByDesc('id')
        ->get();

    $pmdTxIds = $pmdSplitTransactions->pluck('id')->all();

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
                'om.order_menu_id',
                'ti.menu_options'
            ]);

        foreach ($pmdItemRows as $row) {
            $txId = (int)$row->transaction_id;
            $pmdSplitItemsByTx[$txId] = $pmdSplitItemsByTx[$txId] ?? [];

            foreach (['quantity_paid','unit_price','line_total'] as $c) {
                if (is_array($row->$c) || is_object($row->$c)) {
                    $row->$c = array_sum((array)$row->$c);
                }
            }

            $row->menu_options = is_string($row->menu_options) ? json_decode($row->menu_options, true) : $row->menu_options;

            $pmdSplitItemsByTx[$txId][] = $row;
        }
    }
}

// گرفتن مالیات و جمع کل
$taxAmount = floatval($formModel->tax_amount ?? 0);
$subtotal = floatval($formModel->subtotal ?? 0);
$finalTotal = floatval($formModel->total ?? ($subtotal + $taxAmount));
@endphp

{{-- نمایش سفارشات تقسیم‌شده --}}
@if ($pmdHasSplitTables && $pmdSplitTransactions->count() > 0)
<tr>
<td class="text-muted align-top">Items</td>
<td class="text-right">
<div style="text-align:left;">
@foreach ($pmdSplitTransactions as $tx)
<div style="border:1px solid #eceef4;border-radius:10px;padding:8px 10px;margin-bottom:8px;">
    <div style="display:flex;justify-content:space-between;gap:10px;">
        <div>
            <strong>#{{ (int)$tx->id }}</strong>
            · {{ strtoupper((string)$tx->payment_method) }}
            · {{ currency_format((float)$tx->amount) }}
        </div>
        <a href="{{ url('admin/orders/split-receipt/' . (int)$tx->id) }}" target="_blank">Receipt</a>
    </div>

    @if (!empty($pmdSplitItemsByTx[(int)$tx->id]))
    <ul style="margin:6px 0 0 18px;padding:0;font-size:12px;">
        @foreach ($pmdSplitItemsByTx[(int)$tx->id] as $itm)
            <li>
                {{ $itm->name ?: 'Menu #'.$itm->menu_id }}
                × {{ rtrim(rtrim(number_format($itm->quantity_paid,3,'.',''),'0'),'.') }}
                = {{ currency_format($itm->line_total) }}
                @if(!empty($itm->menu_options))
                    <ul style="margin:0 0 0 12px;padding:0;font-size:11px;">
                        @foreach($itm->menu_options as $opt)
                            <li>{{ $opt['name'] ?? '' }} {{ isset($opt['price']) && $opt['price']>0 ? '(+€'.number_format($opt['price'],2).')' : '' }}</li>
                        @endforeach
                    </ul>
                @endif
            </li>
        @endforeach
    </ul>
    @endif
</div>
@endforeach
</div>
</td>
</tr>
@endif

<tr>
<td>Subtotal</td>
<td>{{ currency_format($subtotal) }}</td>
</tr>
<tr>
<td>VAT included</td>
<td>{{ currency_format($taxAmount) }}</td>
</tr>
<tr>
<td>Total</td>
<td>{{ currency_format($finalTotal) }}</td>
</tr>

</tbody>
</table>
@endsection
