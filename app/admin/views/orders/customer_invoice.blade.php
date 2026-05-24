<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Customer Invoice - Order #{{ $model->order_id }}</title>
    <style>
        body { font-family: Arial, sans-serif; color:#111; margin:20px; }
        .wrap { max-width:800px; margin:0 auto; }
        .muted { color:#555; font-size:12px; }
        table { width:100%; border-collapse:collapse; margin-top:12px; }
        th,td { border-bottom:1px solid #ddd; padding:6px; font-size:13px; text-align:left; }
        .right { text-align:right; }
        .badge { display:inline-block; padding:4px 8px; border:1px solid #222; font-size:11px; }
        @media print { .no-print { display:none; } }
    </style>
</head>
<body>
<div class="wrap">
    <h2>Customer Invoice / Order Summary</h2>
    <p class="muted">Not a fiscal invoice. Fiscal invoice is available only after payment confirmation.</p>

    <div>
        <strong>{{ setting('site_name') }}</strong><br>
        <span class="muted">Order #{{ $model->order_id }}</span><br>
        <span class="muted">Date: {{ optional($model->created_at)->format('Y-m-d H:i') }}</span><br>
        <span class="muted">Context: {{ $model->order_type_name ?? $model->order_type }}</span><br>
        <span class="muted">Customer: {{ $model->customer_name ?: 'Guest' }}</span><br>
        @php
            $isPaid = !empty($model->settled_at) || ((float)($model->settled_amount ?? 0) >= (float)($model->order_total ?? 0) && (float)($model->order_total ?? 0) > 0);
        @endphp
        <span class="badge">Payment {{ $isPaid ? 'Paid' : 'Pending' }}</span>
    </div>

    <table>
        <thead>
            <tr><th>Item</th><th class="right">Qty</th><th class="right">Unit</th><th class="right">Total</th></tr>
        </thead>
        <tbody>
        @php $rows = $model->getOrderMenusWithOptions(); @endphp
        @foreach($rows as $row)
            @php
                $qty = (float)($row->quantity ?? 0);
                $unit = (float)($row->price ?? 0);
                $line = $qty * $unit;
            @endphp
            <tr>
                <td>{{ $row->name }}</td>
                <td class="right">{{ rtrim(rtrim(number_format($qty,2,'.',''),'0'),'.') }}</td>
                <td class="right">{{ number_format($unit,2) }}</td>
                <td class="right">{{ number_format($line,2) }}</td>
            </tr>
        @endforeach
        </tbody>
        <tfoot>
            <tr><td colspan="3" class="right"><strong>Subtotal</strong></td><td class="right">{{ number_format((float)($model->order_total ?? 0),2) }}</td></tr>
            <tr><td colspan="3" class="right"><strong>VAT</strong></td><td class="right">Included as configured</td></tr>
            <tr><td colspan="3" class="right"><strong>Total</strong></td><td class="right"><strong>{{ number_format((float)($model->order_total ?? 0),2) }}</strong></td></tr>
        </tfoot>
    </table>

    <p class="muted" style="margin-top:16px;">This document is a customer order summary / proforma invoice and not a fiscal invoice.</p>
    <button class="no-print" onclick="window.print()">Print</button>
</div>
</body>
</html>
