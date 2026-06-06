<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Split Payment Receipt #{{ (int)$transaction->id }}</title>
    <style>
        body { font-family: Arial, sans-serif; color: #222; margin: 24px; }
        .header { margin-bottom: 16px; }
        .muted { color: #666; font-size: 12px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border-bottom: 1px solid #eee; text-align: left; padding: 8px 4px; font-size: 13px; }
        th { font-size: 12px; color: #555; text-transform: uppercase; letter-spacing: 0.04em; }
        .text-right { text-align: right; }
        .summary { margin-top: 16px; width: 320px; margin-left: auto; }
        .summary-row { display: flex; justify-content: space-between; padding: 4px 0; }
    </style>
</head>
<body>
    <div class="header">
        <h2 style="margin:0;">Split Payment Receipt</h2>
        <div class="muted">Transaction #{{ (int)$transaction->id }}</div>
        <div class="muted">Order #{{ (int)($order->order_id ?? 0) }} | Table: {{ $tableName ?: 'N/A' }}</div>
        <div class="muted">Paid at: {{ $transaction->paid_at ?: $transaction->created_at }}</div>
        <div class="muted">Payment: {{ strtoupper((string)$transaction->payment_method) }} @if(!empty($transaction->payment_reference)) (Ref: {{ $transaction->payment_reference }}) @endif</div>
    </div>

    <table>
        <thead>
        <tr>
            <th>Item</th>
            <th class="text-right">Qty Paid</th>
            <th class="text-right">Unit Price</th>
            <th class="text-right">Line Total</th>
        </tr>
        </thead>
        <tbody>
        @foreach($items as $item)
            <tr>
                <td>{{ $item->name ?: ('Menu #'.$item->menu_id) }}</td>
                <td class="text-right">{{ rtrim(rtrim(number_format((float)$item->quantity_paid, 3, '.', ''), '0'), '.') }}</td>
                <td class="text-right">{{ currency_format((float)$item->unit_price) }}</td>
                <td class="text-right">{{ currency_format((float)$item->line_total) }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>

    <div class="summary">
        <div class="summary-row">
            <span>Amount paid</span>
            <strong>{{ currency_format((float)$transaction->amount) }}</strong>
        </div>
        <div class="summary-row">
            <span>Transaction status</span>
            <strong>{{ ucfirst((string)($transaction->settlement_status ?? 'partial')) }}</strong>
        </div>
    </div>
</body>
</html>
