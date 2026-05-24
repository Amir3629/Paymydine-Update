<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Invoice #{{ $model->order_id }}</title>
    @php
        $tpl = (string)(setting('invoice_customer_template') ?: 'classic');
        $footerText = trim((string)(setting('invoice_customer_footer_text') ?: ''));

        $resolveLogoPath = function ($val) {
            if (is_string($val)) return trim($val);
            if (is_array($val)) return trim((string)($val['path'] ?? $val['publicUrl'] ?? $val['url'] ?? ''));
            if (is_object($val)) return trim((string)($val->path ?? $val->publicUrl ?? $val->url ?? ''));
            return '';
        };

        $invoiceLogoPath = $resolveLogoPath(setting('invoice_logo'));
        $siteLogoPath = $resolveLogoPath(setting('site_logo'));
        $dashboardLogoPath = $resolveLogoPath(setting('dashboard_logo'));
        $logoPath = $invoiceLogoPath !== '' ? $invoiceLogoPath : ($siteLogoPath !== '' ? $siteLogoPath : $dashboardLogoPath);
        $logoUrl = '';
        if ($logoPath !== '') {
            $logoUrl = preg_match('#^https?://#i', $logoPath) ? $logoPath : uploads_url($logoPath);
        }
    @endphp
    <style>
        @page { size: 80mm auto; margin: 4mm; }
        body { margin:0; padding:8px; font-family: Arial, Helvetica, sans-serif; background:#f5f5f5; color:#111; }
        .receipt { width:72mm; max-width:72mm; margin:0 auto; background:#fff; padding:9px 7px; box-sizing:border-box; border:1px solid #ddd; }
        .center { text-align:center; }
        .small { font-size:11px; }
        .xs { font-size:10px; }
        .muted { color:#5d5d5d; }
        .sep { border-top:1px dashed #777; margin:7px 0; }
        .row { display:flex; justify-content:space-between; gap:6px; }
        .items td { font-size:11px; padding:2px 0; vertical-align:top; }
        .items td:first-child { width:76%; word-break:break-word; }
        .items td:last-child { width:24%; text-align:right; white-space:nowrap; }
        .badge { display:inline-block; border:1px solid #222; padding:2px 7px; font-size:10px; margin-top:5px; border-radius:10px; }
        .print-btn { margin:10px auto 0; display:block; border:1px solid #222; background:#fff; color:#111; padding:7px 11px; font-size:12px; border-radius:6px; cursor:pointer; }
        .totals .row { margin:2px 0; }
        .totals .total { font-weight:700; font-size:12px; }

        body.template-modern .receipt { border-color:#cfcfcf; box-shadow:0 1px 2px rgba(0,0,0,0.06); }
        body.template-modern .sep { border-top-style:solid; border-top-color:#d7d7d7; }
        body.template-modern .badge { border-color:#444; }

        body.template-minimal .receipt { border:0; }
        body.template-minimal .sep { border-top-color:#c9c9c9; }
        body.template-minimal .badge { border-radius:0; padding:1px 6px; }

        @media print {
            body { background:#fff; padding:0; }
            .receipt { width:100%; max-width:100%; margin:0; padding:0; border:0; box-shadow:none; }
            .print-btn { display:none; }
        }
    </style>
</head>
@php
    $orderTotal = (float)($model->order_total ?? 0);
    $statusName = strtolower((string)optional($model->status)->status_name);
    $isPaid = !empty($model->settled_at)
        || ($orderTotal > 0 && (float)($model->settled_amount ?? 0) >= $orderTotal)
        || ((bool)($model->processed ?? false) && in_array($statusName, ['paid', 'complete', 'completed'], true));
    $rows = $model->getOrderMenusWithOptions();

    $taxEnabled = (string)(setting('tax_mode', '0')) === '1';
    $taxPct = (float)(setting('tax_percentage', 0));
    $taxMenuPrice = (string)(setting('tax_menu_price', '1')); // 0 included, 1 add on checkout

    $subtotal = $orderTotal;
    $vatAmount = null;
    if ($taxEnabled && $taxPct > 0) {
        if ($taxMenuPrice === '0') {
            $vatAmount = $orderTotal * $taxPct / (100 + $taxPct);
            $subtotal = $orderTotal - $vatAmount;
        } else {
            $subtotal = $orderTotal / (1 + ($taxPct / 100));
            $vatAmount = $orderTotal - $subtotal;
        }
    }
@endphp
<body class="template-{{ $tpl === 'modern' ? 'modern' : ($tpl === 'minimal' ? 'minimal' : 'classic') }}">
<div class="receipt">
    <div class="center">
        @if($logoUrl !== '')
            <img src="{{ $logoUrl }}" alt="logo" style="max-height:42px; max-width:64mm; margin-bottom:5px; object-fit:contain;">
        @endif
        <div style="font-weight:700; font-size:14px;">{{ setting('site_name') }}</div>
        <div class="small" style="font-weight:700; margin-top:4px; letter-spacing:.2px;">Invoice</div>
        <div class="badge">{{ $isPaid ? 'Paid' : 'Payment pending' }}</div>
    </div>

    <div class="sep"></div>

    <div class="small" style="line-height:1.45;">
        <div class="row"><span>Invoice #</span><strong>{{ $model->order_id }}</strong></div>
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

    <div class="small totals" style="line-height:1.5;">
        @if($taxEnabled && $taxPct > 0 && $vatAmount !== null)
            <div class="row"><span>Subtotal</span><strong>{{ number_format($subtotal, 2) }}</strong></div>
            @if($taxMenuPrice === '0')
                <div class="row"><span>VAT included ({{ rtrim(rtrim(number_format($taxPct,2,'.',''),'0'),'.') }}%)</span><span>{{ number_format($vatAmount,2) }}</span></div>
            @else
                <div class="row"><span>VAT {{ rtrim(rtrim(number_format($taxPct,2,'.',''),'0'),'.') }}%</span><span>{{ number_format($vatAmount,2) }}</span></div>
            @endif
        @endif
        <div class="row total"><span>Total</span><strong>{{ number_format($orderTotal, 2) }}</strong></div>
    </div>

    @if($footerText !== '')
        <div class="sep"></div>
        <div class="xs muted center">{{ $footerText }}</div>
    @endif
</div>

<button class="print-btn" onclick="window.print()">Print receipt</button>
</body>
</html>
