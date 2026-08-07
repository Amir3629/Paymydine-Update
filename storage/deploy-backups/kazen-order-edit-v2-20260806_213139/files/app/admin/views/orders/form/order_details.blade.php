{{-- PMD_ORDER_DETAILS_TRUE_PARTIAL_V1 --}}
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
    try {
    $pmdResolverValue = function_exists('pmdResolveSplitAllocationColumn')
        ? pmdResolveSplitAllocationColumn()
        : null;
    if (is_array($pmdResolverValue)) {
        $pmdResolverValue = reset($pmdResolverValue);
    }
    $pmdResolverValue = is_string($pmdResolverValue) ? trim($pmdResolverValue) : '';

    $pmdCandidateColumns = array_values(array_unique(array_filter([
        $pmdResolverValue,
        'order_menu_id',
        'order_item_id',
        'menu_id',
    ], static function ($column) {
        return is_string($column) && $column !== '';
    })));

    $pmdAllocationColumn = null;
    foreach ($pmdCandidateColumns as $pmdCandidateColumn) {
        if (in_array($pmdCandidateColumn, ['order_menu_id', 'order_item_id', 'menu_id'], true)
            && Schema::hasColumn('order_payment_transaction_items', $pmdCandidateColumn)
        ) {
            $pmdAllocationColumn = $pmdCandidateColumn;
            break;
        }
    }

    // PMD_ORDER_EDIT_PLAIN_QUERY_ALIASES_V2
    // Laravel prefixes the physical table name; raw alias references stay plain.
    $pmdTxItemAlias = 'pmd_tx_item';
    $pmdMenuAlias = 'pmd_order_menu';
    $pmdJoinLeftColumn = $pmdAllocationColumn === 'menu_id' ? 'menu_id' : 'order_menu_id';
    $pmdJoinRightColumn = $pmdAllocationColumn === 'menu_id' ? 'menu_id' : $pmdAllocationColumn;

    $pmdSplitTransactions = DB::table('order_payment_transactions')
        ->where('order_id', (int)$formModel->order_id)
        ->orderByDesc('id')
        ->get();

    $pmdTxIds = $pmdSplitTransactions->pluck('id')->all();

    if (!empty($pmdTxIds) && is_string($pmdAllocationColumn) && $pmdAllocationColumn !== '') {
        $pmdSelectColumns = [
            $pmdTxItemAlias.'.transaction_id',
            $pmdTxItemAlias.'.quantity_paid',
            $pmdTxItemAlias.'.unit_price',
            $pmdTxItemAlias.'.line_total',
            $pmdMenuAlias.'.name',
            $pmdMenuAlias.'.menu_id',
            $pmdMenuAlias.'.order_menu_id',
        ];

        if (Schema::hasColumn('order_menus', 'option_values')) {
            $pmdSelectColumns[] = $pmdMenuAlias.'.option_values as menu_options';
        } elseif (Schema::hasColumn('order_payment_transaction_items', 'menu_options')) {
            $pmdSelectColumns[] = $pmdTxItemAlias.'.menu_options';
        }

        $pmdItemRows = DB::table('order_payment_transaction_items as pmd_tx_item')
            ->leftJoin(
                'order_menus as pmd_order_menu',
                $pmdMenuAlias.'.'.$pmdJoinLeftColumn,
                '=',
                $pmdTxItemAlias.'.'.$pmdJoinRightColumn
            )
            ->whereIn($pmdTxItemAlias.'.transaction_id', $pmdTxIds)
            ->get($pmdSelectColumns);

        foreach ($pmdItemRows as $row) {
            $txId = (int)$row->transaction_id;
            $pmdSplitItemsByTx[$txId] = $pmdSplitItemsByTx[$txId] ?? [];

            foreach (['quantity_paid','unit_price','line_total'] as $c) {
                if (is_array($row->$c) || is_object($row->$c)) {
                    $row->$c = array_sum((array)$row->$c);
                }
            }

            $rawMenuOptions = property_exists($row, 'menu_options') ? $row->menu_options : null;
            $row->menu_options = is_string($rawMenuOptions)
                ? (json_decode($rawMenuOptions, true) ?: [])
                : (is_array($rawMenuOptions) ? $rawMenuOptions : []);

            $pmdSplitItemsByTx[$txId][] = $row;
        }
    }
    } catch (\Throwable $pmdOrderEditSplitError) {
        // Never make the whole Order Edit page fail because an optional split
        // payment detail query is unavailable or has a legacy schema.
        \Log::warning('PMD order edit split payment query skipped', [
            'order_id' => (int)($formModel->order_id ?? 0),
            'message' => $pmdOrderEditSplitError->getMessage(),
        ]);
        $pmdSplitTransactions = collect();
        $pmdSplitItemsByTx = [];
    }
}

// Canonical totals from persisted order_totals/order_total
$totals = collect($formModel->getOrderTotals() ?? []);
$subtotal = (float) optional($totals->firstWhere('code', 'subtotal'))->value;
$taxRow = $totals->firstWhere('code', 'tax');
$taxAmount = (float) optional($taxRow)->value;
$taxTitle = (string) (optional($taxRow)->title ?? 'VAT');
$tipAmount = (float) optional($totals->firstWhere('code', 'tip'))->value;
$discountRow = $totals->firstWhere('code', 'discount') ?: $totals->firstWhere('code', 'coupon');
$discountAmount = abs((float) optional($discountRow)->value);
$discountTitle = (string) (optional($discountRow)->title ?? 'Coupon');
$finalTotal = (float) optional($totals->firstWhere('code', 'total'))->value;
$pmdPaidTransactionTotal = round((float)$pmdSplitTransactions->sum('amount'), 2);
$pmdUnclassifiedPaymentAdjustment = 0.0;
if ($tipAmount <= 0 && $discountAmount <= 0 && $pmdPaidTransactionTotal > 0 && $subtotal > 0) {
    $pmdUnclassifiedPaymentAdjustment = round($pmdPaidTransactionTotal - $subtotal, 2);
}
if ($finalTotal <= 0) {
    $finalTotal = (float) ($formModel->order_total ?? ($subtotal + $taxAmount));
}
if ($pmdPaidTransactionTotal > 0 && strtolower((string)($formModel->settlement_status ?? '')) === 'paid') {
    $finalTotal = $pmdPaidTransactionTotal;
}
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

    @php
        $pmdTxItems = $pmdSplitItemsByTx[(int)$tx->id] ?? [];
        $pmdTxItemTotal = 0.0;
        foreach ($pmdTxItems as $pmdTxItem) {
            $pmdTxItemTotal += (float)($pmdTxItem->line_total ?? 0);
        }
        $pmdTxPaymentAdjustment = round((float)$tx->amount - $pmdTxItemTotal, 2);
    @endphp
    @if (!empty($pmdTxItems))
    <ul style="margin:6px 0 0 18px;padding:0;font-size:12px;">
        @foreach ($pmdTxItems as $itm)
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
    @if (abs($pmdTxPaymentAdjustment) >= 0.01)
        <div style="margin-top:6px;font-size:12px;color:#5f6368;">
            Payment adjustment (tip/coupon): {{ $pmdTxPaymentAdjustment >= 0 ? '+' : '-' }}{{ currency_format(abs($pmdTxPaymentAdjustment)) }}
        </div>
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
@if ($taxAmount > 0)
<tr>
<td>{{ $taxTitle }}</td>
<td>{{ currency_format($taxAmount) }}</td>
</tr>
@endif
@if ($tipAmount > 0)
<tr>
<td>Tip</td>
<td>{{ currency_format($tipAmount) }}</td>
</tr>
@endif
@if ($discountAmount > 0)
<tr>
<td>{{ $discountTitle }}</td>
<td>-{{ currency_format($discountAmount) }}</td>
</tr>
@endif
@if (abs($pmdUnclassifiedPaymentAdjustment) >= 0.01)
<tr>
<td>Payment adjustment</td>
<td>{{ $pmdUnclassifiedPaymentAdjustment > 0 ? '+' : '-' }}{{ currency_format(abs($pmdUnclassifiedPaymentAdjustment)) }}</td>
</tr>
@endif
<tr>
<td>Total</td>
<td>{{ currency_format($finalTotal) }}</td>
</tr>

</tbody>
</table>
