@php
    $__orderId = (int)($model->order_id ?? 0);
    $__orderCommentRaw = (string) ($model->comment ?? '');
    $__settingFlag = static function (string $key, bool $default = false): bool {
        $value = setting($key, null);
        if ($value === null || $value === '') {
            return $default;
        }

        if (is_bool($value)) {
            return $value;
        }

        return in_array((string)$value, ['1', 'true', 'yes', 'on'], true);
    };

    $__receiptMode = $__settingFlag('invoice_receipt_mode', true);
    $__paperWidth = (string) setting('invoice_paper_width', '80mm');
    $__paperWidth = in_array($__paperWidth, ['80mm', 'a4'], true) ? $__paperWidth : '80mm';
    if (!$__receiptMode) {
        $__paperWidth = 'a4';
    }
    $__showLogo = $__settingFlag('invoice_show_logo', true);
    $__showQr = $__settingFlag('invoice_show_qr', true);
    $__showFiskalyDetails = $__settingFlag('invoice_show_fiskaly', true);
    $__compactMode = $__receiptMode && $__settingFlag('invoice_compact_mode', true);
    $__autoPrintDialog = $__settingFlag('invoice_auto_print_dialog', false);
    $__fontPreset = (string) setting('invoice_font_size_preset', 'normal');
    $__fontPreset = in_array($__fontPreset, ['small', 'normal'], true) ? $__fontPreset : 'normal';

    $__isPosImport = stripos($__orderCommentRaw, 'ready2order') !== false
        || stripos($__orderCommentRaw, 'r2o-invoice') !== false
        || stripos($__orderCommentRaw, 'Imported from ready2order') !== false;

    $__posMeta = ['gross' => null, 'vat' => null];
    if ($__isPosImport && $__orderCommentRaw !== '') {
        foreach (array_keys($__posMeta) as $__key) {
            if (preg_match('/'. $__key .'=([^|]+)/u', $__orderCommentRaw, $__m)) {
                $__posMeta[$__key] = trim($__m[1]);
            }
        }
    }

    $__readTaxSetting = static function ($key, $default = null) {
        try {
            $value = setting($key, null);
            if ($value !== null && $value !== '') {
                return $value;
            }
        } catch (\Throwable $e) {
        }

        try {
            $row = \Illuminate\Support\Facades\DB::table('settings')->where('item', $key)->first();
            if ($row && $row->value !== null && $row->value !== '') {
                return $row->value;
            }
        } catch (\Throwable $e) {
        }

        return $default;
    };

    $__orderTotals = collect($model->getOrderTotals() ?? []);
    $__menus = collect($model->getOrderMenusWithOptions() ?? []);

    $__taxTotal = $__orderTotals->firstWhere('code', 'tax');
    $__tipTotal = $__orderTotals->firstWhere('code', 'tip');
    $__discountTotal = $__orderTotals->firstWhere('code', 'discount');
    $__couponTotal = $__discountTotal;
    $__finalTotal = $__orderTotals->firstWhere('code', 'total');

    $__taxMode = (string) config('billing.tax_mode', env('PMD_TAX_MODE', 'included'));
    if (!in_array($__taxMode, ['included', 'add_at_end'], true)) {
        $__taxMode = ((string) $__readTaxSetting('tax_menu_price', '1') === '1') ? 'included' : 'add_at_end';
    }
    $__taxIncluded = $__taxMode === 'included';

    $__taxPercent = (float) $__readTaxSetting('tax_percentage', 0);
    if ($__taxIncluded && $__taxPercent <= 0) {
        $__taxPercent = 50.0;
    }

    $__toGross = static function (float $amount) use ($__taxIncluded, $__taxPercent): float {
        if (!$__taxIncluded || $__taxPercent <= 0) {
            return round($amount, 2);
        }

        return round($amount * (1 + ($__taxPercent / 100)), 2);
    };

    $__displayItems = 0;
    $__displaySubtotal = 0.0;

    foreach ($__menus as $__menuItem) {
        $__qty = max(1, (int)($__menuItem->quantity ?? 1));
        $__displayItems += $__qty;

        $__lineNet = round((float)($__menuItem->subtotal ?? 0), 2);
        $__lineGross = $__toGross($__lineNet);

        $__menuItem->__pmd_display_subtotal = $__lineGross;
        $__menuItem->__pmd_display_price = round($__qty > 0 ? ($__lineGross / $__qty) : $__lineGross, 2);

        $__displaySubtotal += $__lineGross;
    }

    $__displaySubtotal = round($__displaySubtotal, 2);

    $__posGross = $__posMeta['gross'] !== null ? (float)$__posMeta['gross'] : null;
    $__posVat = $__posMeta['vat'] !== null ? (float)$__posMeta['vat'] : null;
    if ($__isPosImport && $__posGross !== null) {
        $__displaySubtotal = round($__posGross, 2);
    }

    $__displayTip = round((float)($__tipTotal->value ?? 0), 2);
    $__displayDiscount = round((float)($__couponTotal->value ?? 0), 2);
    $__displayTotal = round($__displaySubtotal + $__displayTip + $__displayDiscount, 2);

    $__displayTax = $__taxIncluded
        ? round($__displaySubtotal - ($__displaySubtotal / (1 + (max($__taxPercent, 0.0001) / 100))), 2)
        : round((float)($__taxTotal->value ?? 0), 2);

    if ($__isPosImport && $__posVat !== null) {
        $__displayTax = round($__posVat, 2);
    }

    $__couponCode = null;
    if ($__couponTotal && preg_match('/\(([^)]+)\)/', (string)($__couponTotal->title ?? ''), $__couponCodeMatch)) {
        $__couponCode = $__couponCodeMatch[1];
    }

    $__decode = static function ($value) {
        if ($value === null || $value === '') return null;
        if (is_array($value)) return $value;
        if (is_object($value)) return json_decode(json_encode($value), true);
        if (!is_string($value)) return null;

        $decoded = json_decode($value, true);
        return json_last_error() === JSON_ERROR_NONE ? $decoded : null;
    };

    $__pick = static function (array $sources, array $paths) {
        foreach ($sources as $src) {
            if (!is_array($src)) continue;
            foreach ($paths as $path) {
                $val = data_get($src, $path);
                if ($val !== null && $val !== '') return $val;
            }
        }
        return null;
    };

    $__orderRow = null;
    $__txRow = null;
    try {
        $__conn = method_exists($model, 'getConnectionName') ? ($model->getConnectionName() ?: config('database.default')) : config('database.default');
        if ($__orderId > 0) {
            $__orderRow = \Illuminate\Support\Facades\DB::connection($__conn)
                ->table('orders')
                ->where('order_id', $__orderId)
                ->first();

            $__txRow = \Illuminate\Support\Facades\DB::connection($__conn)
                ->table('fiskaly_transactions')
                ->where('order_id', $__orderId)
                ->orderByDesc('fiskaly_transaction_id')
                ->first();
        }
    } catch (\Throwable $e) {
        $__orderRow = null;
        $__txRow = null;
    }

    $__resp = $__decode($__txRow->response_payload ?? null);
    $__meta = $__decode($__txRow->meta ?? null);
    $__req = $__decode($__txRow->request_payload ?? null);
    $__sources = [$__resp, $__meta, $__req];

    $__fStatus = $__orderRow->fiskaly_status ?? ($model->fiskaly_status ?? ($__txRow->status ?? null));
    $__fQr = $__orderRow->fiskaly_qr_code_data
        ?? ($model->fiskaly_qr_code_data ?? ($__txRow->qr_code_data ?? $__pick($__sources, [
            'qr_code_data',
            'responses.update.qr_code_data',
            'responses.finish.qr_code_data',
            'responses.start.qr_code_data',
        ])));
    $__fTxRef = $__orderRow->fiskaly_transaction_id_ref
        ?? ($model->fiskaly_transaction_id_ref ?? ($__txRow->tx_id ?? $__pick($__sources, ['_id', 'responses.update._id', 'responses.finish._id', 'responses.start._id'])));
    $__fTxNo = $__orderRow->fiskaly_tx_number
        ?? ($model->fiskaly_tx_number ?? ($__txRow->tx_number ?? $__pick($__sources, [
            'number',
            'responses.update.number',
            'responses.finish.number',
            'responses.start.number',
        ])));
    $__fCounter = $__orderRow->fiskaly_signature_counter
        ?? ($model->fiskaly_signature_counter ?? ($__txRow->signature_counter ?? $__pick($__sources, [
            'signature.counter',
            'responses.update.signature.counter',
            'responses.finish.signature.counter',
            'responses.start.signature.counter',
        ])));
    $__fSerial = $__orderRow->fiskaly_serial_number
        ?? ($model->fiskaly_serial_number ?? ($__txRow->serial_number ?? $__pick($__sources, [
            'tss_serial_number',
            'serial_number',
            'responses.update.tss_serial_number',
            'responses.finish.tss_serial_number',
            'responses.start.tss_serial_number',
        ])));
    $__fTssId = $__txRow->tss_id ?? $__pick($__sources, ['tss_id', 'responses.update.tss_id', 'responses.finish.tss_id', 'responses.start.tss_id']);
    $__fClientId = $__txRow->client_id ?? $__pick($__sources, ['client_id', 'responses.update.client_id', 'responses.finish.client_id', 'responses.start.client_id']);

    $__showFiskaly = $__showFiskalyDetails
        && (!empty($__fQr) || !empty($__fTxRef) || !empty($__fTxNo) || !empty($__fCounter) || !empty($__fSerial) || !empty($__fTssId) || !empty($__fClientId));
    $__qrSrc = !empty($__fQr)
        ? ('https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=' . rawurlencode((string)$__fQr))
        : null;
    $__printPaper = $__paperWidth === 'a4' ? '210mm' : '80mm';
    $__contentWidth = $__paperWidth === 'a4' ? '186mm' : '76mm';
    $__baseFontPx = $__fontPreset === 'small' ? '10px' : '11px';
    $__compactFactor = $__compactMode ? '1' : '1.35';
@endphp

<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>{!! $model->invoice_number.' - '.lang('admin::lang.orders.text_invoice').' - '.setting('site_name') !!}</title>
    <style>
        :root {
            --receipt-width: 76mm;
            --text: #000;
            --muted: #444;
            --line: #111;
        }

        * { box-sizing: border-box; }

        html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            background: #fff;
            color: var(--text);
            font-family: "Segoe UI", Arial, Helvetica, sans-serif;
            font-size: {{ $__baseFontPx }};
            line-height: calc(1.3 * {{ $__compactFactor }});
            -webkit-print-color-adjust: exact;
            print-color-adjust: exact;
        }

        .receipt {
            width: {{ $__contentWidth }};
            max-width: {{ $__contentWidth }};
            margin: 0 auto;
            padding: {{ $__compactMode ? '2mm' : '4mm' }};
            border: 0;
            background: #fff;
        }

        .center { text-align: center; }
        .right { text-align: right; }
        .muted { color: var(--muted); }
        .rule { border-top: 1px solid var(--line); margin: 5px 0; }

        .title { font-size: 14px; font-weight: 700; margin: 0; }
        .subtitle { margin: 2px 0 0; font-size: 10px; }

        .logo {
            display: block;
            margin: 0 auto 4px;
            max-width: 40mm;
            max-height: 16mm;
            width: auto;
            height: auto;
            object-fit: contain;
        }

        .meta-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 2px 8px;
        }

        .meta-block { min-width: 0; }
        .meta-label { font-weight: 600; font-size: 10px; }
        .meta-value { word-break: break-word; overflow-wrap: anywhere; }

        table.items {
            width: 100%;
            border-collapse: collapse;
            table-layout: fixed;
        }

        table.items th, table.items td {
            padding: {{ $__compactMode ? '2px 1px' : '4px 2px' }};
            vertical-align: top;
            border-bottom: 1px dotted #bbb;
            word-break: break-word;
            overflow-wrap: anywhere;
            color: #000;
        }

        table.items th {
            font-size: 10px;
            font-weight: 700;
            border-bottom: 1px solid var(--line);
        }

        .col-qty { width: 10%; text-align: center; }
        .col-name { width: 50%; }
        .col-price, .col-total { width: 20%; text-align: right; }

        .item-name { font-weight: 600; }
        .item-options, .item-comment { font-size: 10px; margin-top: 2px; }

        .totals { margin-top: 4px; }
        .total-row {
            display: flex;
            justify-content: space-between;
            gap: 8px;
            padding: 1px 0;
            word-break: break-word;
            overflow-wrap: anywhere;
        }

        .grand-total { font-size: 12px; font-weight: 700; border-top: 1px solid var(--line); padding-top: 3px; margin-top: 2px; }

        .fiskaly {
            margin-top: 6px;
            border-top: 1px dashed #777;
            padding-top: 5px;
        }

        .fiskaly-title { font-weight: 700; margin: 0 0 3px; }
        .fiskaly-intro { font-size: 10px; margin: 0 0 4px; color: var(--muted); }

        .qr-wrap {
            text-align: center;
            margin-bottom: 4px;
        }

        .qr-img {
            width: 26mm;
            height: 26mm;
            border: 1px solid #aaa;
            padding: 1mm;
            background: #fff;
            display: inline-block;
        }

        .fiskaly-row { margin: 0 0 2px; font-size: 10px; }
        .fiskaly-label { font-weight: 600; }
        .fiskaly-value {
            word-break: break-word;
            overflow-wrap: anywhere;
        }

        .thanks {
            margin-top: 8px;
            text-align: center;
            font-size: 11px;
        }

        @page {
            size: {{ $__printPaper }} auto;
            margin: {{ $__paperWidth === 'a4' ? '8mm' : '2mm' }};
        }

        @media print {
            html, body {
                width: {{ $__printPaper }} !important;
                background: #fff !important;
                color: #000 !important;
            }
            .receipt {
                width: {{ $__contentWidth }} !important;
                max-width: {{ $__contentWidth }} !important;
                margin: 0 !important;
                padding: 0 !important;
            }
            img {
                page-break-inside: avoid;
                break-inside: avoid;
            }
            .fiskaly, .totals, table.items, .meta-grid, .rule {
                page-break-inside: avoid;
                break-inside: avoid;
            }
        }
    </style>
</head>
<body>
<div class="receipt">
    <header class="center">
        <h1 class="title">@lang('admin::lang.orders.text_invoice')</h1>
        <p class="subtitle">@lang('admin::lang.orders.label_order_id') #{{ $model->order_id }}</p>
    </header>

    <div class="rule"></div>

    <section class="center">
        @if($__showLogo && (setting('invoice_logo') || setting('site_logo')))
            <img
                class="logo"
                src="{{ uploads_url(setting('invoice_logo') ?: setting('site_logo')) }}"
                alt="{{ setting('site_name') }} logo"
            >
        @endif

        <p style="margin:0 0 2px;"><strong>{{ $model->location->location_name }}</strong></p>
        <p class="muted" style="margin:0; font-size:10px;">
            {{ format_address($model->location->getAddress(), true) }}
            @if($model->location->location_telephone)
                <br><strong>Tel:</strong> {{ $model->location->location_telephone }}
            @endif
            @if($model->location->location_email)
                <br><strong>Email:</strong> {{ $model->location->location_email }}
            @endif
        </p>
    </section>

    <div class="rule"></div>

    <section class="meta-grid">
        <div class="meta-block">
            <div class="meta-label">@lang('admin::lang.orders.text_invoice_no')</div>
            <div class="meta-value">{{ $model->invoice_number }}</div>
        </div>
        <div class="meta-block">
            <div class="meta-label">@lang('admin::lang.orders.text_payment')</div>
            <div class="meta-value">{{ $model->payment_method ? $model->payment_method->name : '' }}</div>
        </div>

        <div class="meta-block">
            <div class="meta-label">@lang('admin::lang.orders.text_invoice_date')</div>
            <div class="meta-value">
                @if($model->invoice_date)
                    {{ $model->invoice_date->format(lang('system::lang.php.date_format')) }}
                @elseif($model->order_date)
                    {{ $model->order_date->format(lang('system::lang.php.date_format')) }}
                @endif
            </div>
        </div>
        <div class="meta-block">
            <div class="meta-label">@lang('admin::lang.orders.text_order_date')</div>
            <div class="meta-value">{{ $model->order_date->setTimeFromTimeString($model->order_time)->format(lang('system::lang.php.date_time_format')) }}</div>
        </div>
    </section>

    <div class="rule"></div>

    <table class="items" aria-label="Invoice items">
        <thead>
        <tr>
            <th class="col-qty">#</th>
            <th class="col-name">Item</th>
            <th class="col-price">Price</th>
            <th class="col-total">Total</th>
        </tr>
        </thead>
        <tbody>
        @foreach($__menus as $menuItem)
            @php
                $__qty = (int)($menuItem->quantity ?? 0);
                $__menuItemOptionGroup = collect($menuItem->menu_options ?? [])->groupBy('order_option_category');
            @endphp
            <tr>
                <td class="col-qty">{{ $__qty }}x</td>
                <td class="col-name">
                    <div class="item-name">{{ $menuItem->name }}</div>

                    @if($__menuItemOptionGroup->isNotEmpty())
                        <div class="item-options muted">
                            @foreach($__menuItemOptionGroup as $__groupName => $__groupItems)
                                @if(!empty($__groupName))
                                    <div><strong>{{ $__groupName }}:</strong></div>
                                @endif

                                @foreach($__groupItems as $__opt)
                                    @php
                                        $__optQty = (float)($__opt->quantity ?? 1);
                                        $__optPrice = $__toGross((float)($__opt->order_option_price ?? 0));
                                        $__optTotal = $__optQty * $__optPrice;
                                    @endphp
                                    <div>
                                        - {{ $__opt->order_option_name }}
                                        @if($__optPrice > 0)
                                            ({{ currency_format($__optTotal) }})
                                        @endif
                                    </div>
                                @endforeach
                            @endforeach
                        </div>
                    @endif

                    @if(!empty($menuItem->comment))
                        <div class="item-comment"><strong>{{ $menuItem->comment }}</strong></div>
                    @endif
                </td>
                <td class="col-price">{{ currency_format((float)($menuItem->__pmd_display_price ?? 0)) }}</td>
                <td class="col-total">{{ currency_format((float)($menuItem->__pmd_display_subtotal ?? 0)) }}</td>
            </tr>
        @endforeach
        </tbody>
    </table>

    <section class="totals">
        @if($__displaySubtotal > 0)
            <div class="total-row">
                <span>{{ $model->order_type_name }} @if($__displayItems > 0)({{ $__displayItems }} item{{ $__displayItems > 1 ? 's' : '' }})@endif</span>
                <span>{{ currency_format($__displaySubtotal) }}</span>
            </div>
        @endif

        @if($__taxIncluded)
            <div class="total-row muted">
                <span>VAT included</span>
                <span>({{ rtrim(rtrim(number_format($__taxPercent, 2, '.', ''), '0'), '.') }}%)</span>
            </div>
        @elseif($__displayTax > 0)
            <div class="total-row">
                <span>{{ $__taxTotal->title ?? 'VAT' }}</span>
                <span>{{ currency_format($__displayTax) }}</span>
            </div>
        @endif

        @if($__displayTip > 0)
            <div class="total-row">
                <span>{{ $__tipTotal->title ?? 'Tip' }}</span>
                <span>{{ currency_format($__displayTip) }}</span>
            </div>
        @endif

        @if($__couponTotal && (float)$__couponTotal->value != 0)
            <div class="total-row">
                <span>
                    {{ $__couponTotal->title ?: 'Coupon' }}
                    @if($__couponCode)
                        ({{ $__couponCode }})
                    @endif
                </span>
                <span>{{ (float)$__couponTotal->value < 0 ? '-' : '' }}{{ currency_format(abs((float)$__couponTotal->value)) }}</span>
            </div>
        @endif

        <div class="total-row grand-total">
            <span>{{ $__finalTotal->title ?? 'Total' }}</span>
            <span>{{ currency_format($__displayTotal) }}</span>
        </div>
    </section>

    @if($__showFiskaly)
        <section class="fiskaly">
            <p class="fiskaly-title">TSE / Fiskaly Signaturdaten</p>
            <p class="fiskaly-intro">TSE/Fiskaly data loaded directly from order/transaction data.</p>

            @if($__showQr && !empty($__qrSrc))
                <div class="qr-wrap">
                    <img class="qr-img" src="{{ $__qrSrc }}" alt="Fiskaly QR code">
                </div>
            @endif

            @foreach([
                'Fiskaly Status' => $__fStatus,
                'Transaction Ref' => $__fTxRef,
                'TSE Transaction No.' => $__fTxNo,
                'Signature Counter' => $__fCounter,
                'Serial Number' => $__fSerial,
                'TSS ID' => $__fTssId,
                'Client ID' => $__fClientId,
                'QR Payload' => $__fQr,
            ] as $__label => $__value)
                @if(!empty($__value))
                    <div class="fiskaly-row">
                        <span class="fiskaly-label">{{ $__label }}:</span>
                        <span class="fiskaly-value">{{ $__value }}</span>
                    </div>
                @endif
            @endforeach
        </section>
    @endif

    <p class="thanks">Thank you for your Visit</p>
</div>
@if($__autoPrintDialog)
    <script>
        window.addEventListener('load', function () {
            window.setTimeout(function () {
                window.print();
            }, 250);
        });
    </script>
@endif
</body>
</html>
