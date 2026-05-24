<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Customer Invoice #{{ $model->order_id }}</title>
    <style>
        @page { size: 80mm auto; margin: 4mm; }
        body { margin:0; padding:8px; font-family: Arial, Helvetica, sans-serif; background:#f6f6f6; color:#111; }
        .receipt { width:72mm; max-width:72mm; margin:0 auto; background:#fff; padding:8px 6px; box-sizing:border-box; }
        .center { text-align:center; }
        .small { font-size:11px; }
        .xs { font-size:10px; }
        .muted { color:#555; }
        .sep { border-top:1px dashed #000; margin:6px 0; }
        .row { display:flex; justify-content:space-between; gap:8px; }
        .items td { font-size:11px; padding:2px 0; vertical-align:top; }
        .items td:last-child { text-align:right; white-space:nowrap; }
        .badge { display:inline-block; border:1px solid #111; padding:2px 6px; font-size:10px; margin-top:4px; }
        .print-btn { margin:10px auto 0; display:block; border:1px solid #222; background:#fff; color:#111; padding:6px 10px; font-size:12px; cursor:pointer; }
        @media print {
            body { background:#fff; padding:0; }
            .receipt { width:100%; max-width:100%; margin:0; padding:0; }
            .print-btn { display:none; }
        }
    </style>
</head>
<body>
@php
    $orderTotal = (float)($model->order_total ?? 0);
    $settledAmount = (float)($model->settled_amount ?? 0);
    $statusName = strtolower((string)optional($model->status)->status_name);
    $isPaid = !empty($model->settled_at)
        || ($orderTotal > 0 && $settledAmount >= $orderTotal)
        || ((bool)($model->processed ?? false) && in_array($statusName, ['paid', 'complete', 'completed'], true));
    $rows = $model->getOrderMenusWithOptions();
@endphp

<div class="receipt">
    <div class="center">
        @if(setting('invoice_logo') || setting('site_logo'))
            <img src="{{ uploads_url(setting('invoice_logo') ?: setting('site_logo')) }}" alt="logo" style="max-height:38px; max-width:64mm; margin-bottom:4px;">
        @endif
        <div style="font-weight:700; font-size:14px;">{{ setting('site_name') }}</div>
        <div class="small" style="font-weight:700; margin-top:4px;">Customer Invoice / Order Summary</div>
        <div class="xs muted">Not a fiscal invoice</div>
        <div class="badge">Payment {{ $isPaid ? 'Paid' : 'Pending' }}</div>
    </div>

    <div class="sep"></div>

    <div class="small">
        <div class="row"><span>Order #</span><strong>{{ $model->order_id }}</strong></div>
        <div class="row"><span>Date</span><span>{{ optional($model->created_at)->format('Y-m-d H:i') }}</span></div>
        <div class="row"><span>Context</span><span>{{ $model->order_type_name ?? $model->order_type }}</span></div>
        <div class="row"><span>Customer</span><span>{{ $model->customer_name ?: 'Guest' }}</span></div>
    </div>

    <div class="sep"></div>

    <table class="items" width="100%" cellspacing="0" cellpadding="0">
        @foreach($rows as $row)
            @php
                $qty = (float)($row->quantity ?? 0);
                $unit = (float)($row->price ?? 0);
                $line = $qty * $unit;
            @endphp
            <tr>
                <td>{{ rtrim(rtrim(number_format($qty,2,'.',''),'0'),'.') }} x {{ $row->name }}</td>
                <td>{{ number_format($line, 2) }}</td>
            </tr>
        @endforeach
    </table>

    <div class="sep"></div>

    <div class="small">
        <div class="row"><span>Subtotal</span><strong>{{ number_format($orderTotal, 2) }}</strong></div>
        <div class="row"><span>VAT</span><span>Included as configured</span></div>
        <div class="row"><span>Total</span><strong>{{ number_format($orderTotal, 2) }}</strong></div>
    </div>

    <div class="sep"></div>
    <div class="xs muted center">This is an order summary / proforma customer invoice and not a fiscal invoice.</div>
</div>

<button class="print-btn" onclick="window.print()">Print receipt</button>
</body>
</html>
