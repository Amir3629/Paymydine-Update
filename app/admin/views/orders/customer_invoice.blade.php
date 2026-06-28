@php
    /**
     * PMD tenant-safe settings reader.
     *
     * In this multi-tenant setup, setting('invoice_*') may read the base/default
     * settings context instead of the active tenant context. The customer invoice
     * page is already rendered under the tenant request/connection, so DB::table('settings')
     * is the reliable source here. Laravel automatically applies the ti_ prefix.
     */
    $pmdSetting = function ($key, $default = null) {
        static $pmdSettings = null;

        if ($pmdSettings === null) {
            $pmdSettings = [];

            try {
                $rows = \Illuminate\Support\Facades\DB::table('settings')
                    ->get(['item', 'value', 'serialized']);

                foreach ($rows as $row) {
                    $value = $row->value;

                    if ((int)($row->serialized ?? 0) === 1 && is_string($value)) {
                        $decoded = @unserialize($value);
                        if ($decoded !== false || $value === 'b:0;') {
                            $value = $decoded;
                        }
                    }

                    $pmdSettings[(string)$row->item] = $value;
                }
            } catch (\Throwable $e) {
                $pmdSettings = [];
            }
        }

        if (array_key_exists($key, $pmdSettings) && $pmdSettings[$key] !== null && $pmdSettings[$key] !== '') {
            return $pmdSettings[$key];
        }

        try {
            $fallback = setting($key, $default);
            return ($fallback !== null && $fallback !== '') ? $fallback : $default;
        } catch (\Throwable $e) {
            return $default;
        }
    };
@endphp

<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Invoice #{{ $model->order_id }}</title>
    @php
        $tpl = (string)($pmdSetting('invoice_customer_template') ?: 'classic');
        $footerText = trim((string)($pmdSetting('invoice_customer_footer_text') ?: ''));

        $resolveLogoPath = function ($val) {
            if (is_string($val)) return trim($val);
            if (is_array($val)) return trim((string)($val['path'] ?? $val['publicUrl'] ?? $val['url'] ?? ''));
            if (is_object($val)) return trim((string)($val->path ?? $val->publicUrl ?? $val->url ?? ''));
            return '';
        };

        $invoiceLogoPath = $resolveLogoPath($pmdSetting('invoice_logo'));
        $siteLogoPath = $resolveLogoPath($pmdSetting('site_logo'));
        $dashboardLogoPath = $resolveLogoPath($pmdSetting('dashboard_logo'));
        $logoPath = $invoiceLogoPath !== '' ? $invoiceLogoPath : ($siteLogoPath !== '' ? $siteLogoPath : $dashboardLogoPath);
        $logoUrl = '';
        if ($logoPath !== '') {
            $logoUrl = preg_match('#^https?://#i', $logoPath) ? $logoPath : uploads_url($logoPath);
        }
    @endphp
    <style>
        @page { size: var(--pmd-page-width,80mm) auto; margin: 4mm; }
        body { margin:0; padding:8px; font-family: Arial, Helvetica, sans-serif; background:#f5f5f5; color:#111; }
        .receipt { width:var(--pmd-receipt-width,72mm); max-width:var(--pmd-receipt-width,72mm); margin:0 auto; background:#fff; padding:9px 7px; box-sizing:border-box; border:1px solid #ddd; }
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
    $orderTotals = collect($model->getOrderTotals() ?? []);
    $orderTotal = (float)(optional($orderTotals->firstWhere('code', 'total'))->value ?? $model->order_total ?? 0);
    $statusName = strtolower((string)optional($model->status)->status_name);
    $isPaid = !empty($model->settled_at)
        || ($orderTotal > 0 && (float)($model->settled_amount ?? 0) >= $orderTotal)
        || ((bool)($model->processed ?? false) && in_array($statusName, ['paid', 'complete', 'completed'], true));
    $rows = $model->getOrderMenusWithOptions();

    $taxRow = $orderTotals->firstWhere('code', 'tax');
    $subtotal = (float)(optional($orderTotals->firstWhere('code', 'subtotal'))->value ?? 0);
    $vatAmount = (float)(optional($taxRow)->value ?? 0);
    $taxTitle = (string)(optional($taxRow)->title ?? 'VAT');
@endphp
@php
$receiptMode=(string)$pmdSetting('invoice_receipt_mode','1')==='1';
$paper=(string)$pmdSetting('invoice_paper_width','80mm');
$wMap=['58mm'=>'50mm','80mm'=>'72mm','112mm'=>'102mm','a4'=>'190mm'];
$rw=$wMap[$paper]??'72mm';
$compact=(string)$pmdSetting('invoice_compact_mode','1')==='1';
$font=(string)$pmdSetting('invoice_font_size_preset','normal');
$auto=(string)$pmdSetting('invoice_auto_print_dialog','0')==='1';
@endphp
<body style="--pmd-page-width:{{$paper}};--pmd-receipt-width:{{$rw}};" class="template-{{ $tpl === 'modern' ? 'modern' : ($tpl === 'minimal' ? 'minimal' : 'classic') }}">
<div class="receipt">
    <div class="center">
        @if(((string)$pmdSetting('invoice_show_logo','1')==='1') && $logoUrl !== '')
            <img src="{{ $logoUrl }}" alt="logo" style="max-height:42px; max-width:64mm; margin-bottom:5px; object-fit:contain;">
        @endif
        <div style="font-weight:700; font-size:14px;">{{ $pmdSetting('site_name') }}</div>
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
        @if($vatAmount > 0)
            <div class="row"><span>Subtotal</span><strong>{{ number_format($subtotal, 2) }}</strong></div>
            <div class="row"><span>{{ $taxTitle }}</span><span>{{ number_format($vatAmount,2) }}</span></div>
        @endif
        <div class="row total"><span>Total</span><strong>{{ number_format($orderTotal, 2) }}</strong></div>
    </div>

    @if($footerText !== '')
        <div class="sep"></div>
        <div class="xs muted center">{{ $footerText }}</div>
    @endif
</div>
<button class="print-btn" onclick="window.print()">Print receipt</button>
@if($auto)<script>window.addEventListener('load',function(){setTimeout(function(){window.print();},250);});</script>@endif
<script src="/app/admin/assets/js/pmd-waiter-v98-single-source.js?v=98"></script>







<!-- PMD_ADMIN_FINAL_SINGLE_LOGO_V20 -->
<link rel="stylesheet" href="/app/admin/assets/css/pmd-admin-final-single-logo-v20.css?v=20260625_154925">
<script defer src="/app/admin/assets/js/pmd-admin-final-single-logo-v20.js?v=20260625_154925"></script>
<!-- /PMD_ADMIN_FINAL_SINGLE_LOGO_V20 -->

</body>
</html>
