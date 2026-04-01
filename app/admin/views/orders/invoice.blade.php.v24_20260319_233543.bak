<!DOCTYPE HTML>
<html>
<head>
    <meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
    <title>{!! $model->invoice_number.' - '.lang('admin::lang.orders.text_invoice').' - '.setting('site_name') !!}</title>
    {!! get_style_tags() !!}
    <style>
        /* Bill/Receipt size - narrow format like thermal receipt */
        body {
            background-color: #FFF;
            color: #000;
            margin: 0;
            padding: 0;
            font-size: 11px;
        }
        
        @media print {
            @page {
                size: 80mm auto; /* Receipt width - 80mm is standard receipt width */
                margin: 5mm;
            }
        }
        
        .container-fluid {
            max-width: 80mm; /* Receipt width - narrow like a real bill */
            width: 80mm;
            margin: 0 auto;
            padding: 8px 10px !important;
            font-size: 11px;
        }
        
        .invoice-title {
            text-align: center;
        }
        
        .invoice-title h2 {
            font-size: 16px;
            margin: 0;
            margin-bottom: 3px;
        }
        
        .invoice-title h3 {
            font-size: 12px;
            margin: 0;
        }
        
        table {
            font-size: 10px;
            width: 100%;
        }
        
        .table th,
        .table td {
            padding: 3px 2px !important;
            font-size: 9px;
        }
        
        .table th {
            font-size: 8px;
            font-weight: 600;
        }
        
        address, p {
            font-size: 10px;
            line-height: 1.3;
            margin-bottom: 5px;
        }
        
        img.img-responsive {
            max-height: 60px !important;
        }
        
        hr {
            margin: 6px 0;
            border-top: 1px solid #000;
        }
        
        .row {
            margin: 0;
        }
        
        .col-6, .col-3, .col {
            padding-left: 5px;
            padding-right: 5px;
        }
        
        /* Remove all table borders, keep only horizontal lines */
        .invoice-table {
            border: none !important;
        }
        
        .invoice-table th,
        .invoice-table td {
            border: none !important;
            border-left: none !important;
            border-right: none !important;
            border-top: none !important;
            border-bottom: none !important;
        }
        
        /* Horizontal line under header */
        .invoice-table thead tr {
            border-bottom: 1px solid #000 !important;
        }
        
        .invoice-table thead th {
            border-bottom: 1px solid #000 !important;
            padding-bottom: 4px;
            border-top: none !important;
            border-left: none !important;
            border-right: none !important;
        }
        
        /* Horizontal line between body rows */
        .invoice-table tbody tr {
            border-bottom: 1px solid #ccc !important;
        }
        
        .invoice-table tbody tr:last-child {
            border-bottom: 1px solid #000 !important;
        }
        
        .invoice-table tbody td {
            border-left: none !important;
            border-right: none !important;
            border-top: none !important;
        }
        
        /* Horizontal line above footer totals */
        .invoice-table tfoot tr:first-child {
            border-top: 1px solid #000 !important;
        }
        
        .invoice-table tfoot td {
            border: none !important;
            border-left: none !important;
            border-right: none !important;
        }
        
        .invoice-table .thick-line {
            border-top: 1px solid #000 !important;
            border-bottom: none !important;
        }
        
        .invoice-table .no-line {
            border-top: none !important;
            border-bottom: none !important;
        }
    </style>
</head>
<body>
<div class="container-fluid">
    <div class="row">
        <div class="col">
            <div class="invoice-title">
                <h2>@lang('admin::lang.orders.text_invoice')</h2>
                <h3>@lang('admin::lang.orders.label_order_id')&nbsp;#{{$model->order_id}}</h3>
            </div>
        </div>
    </div>

    <div class="row">
        <div class="col py-3">
            <hr>
        </div>
    </div>

    <div class="row">
        <div class="col-12 text-center" style="margin-bottom: 8px;">
            @if(setting('invoice_logo') || setting('site_logo'))
                <img class="img-responsive" src="{{ uploads_url(setting('invoice_logo') ?: setting('site_logo')) }}" alt="" style="max-height:50px; margin-bottom: 5px;" />
                <br>
            @endif
            <p style="margin-bottom: 4px;">
                <span style="font-size: 13px; font-weight: 600;">{{ $model->location->location_name }}</span>
            </p>
            <address style="margin: 0; font-style: normal; line-height: 1.4; font-size: 9px;">
                {{ format_address($model->location->getAddress(), true) }}
                @if($model->location->location_telephone)
                    <br><strong>Tel:</strong> {{ $model->location->location_telephone }}
                @endif
                @if($model->location->location_email)
                    <br><strong>Email:</strong> {{ $model->location->location_email }}
                @endif
            </address>
        </div>
    </div>

    <div class="row">
        <div class="col">
            <hr>
        </div>
    </div>

    <div class="row">
        <div class="col-6">
            <p style="margin-bottom: 4px; font-size: 9px;">
                <strong>@lang('admin::lang.orders.text_invoice_no')</strong><br>
                {{ $model->invoice_number }}
                @if($model->hash && $model->order_type == 'POS')
                    <br><small style="font-size: 8px;">POS Bill: {{ $model->hash }}</small>
                @endif
            </p>
            <p style="margin-bottom: 4px; font-size: 9px;">
                <strong>@lang('admin::lang.orders.text_invoice_date')</strong><br>
                @if($model->invoice_date)
                    {{ $model->invoice_date->format(lang('system::lang.php.date_format')) }}
                @elseif($model->order_date)
                    {{ $model->order_date->format(lang('system::lang.php.date_format')) }}
                @endif
            </p>
        </div>
        <div class="col-6">
            <p style="margin-bottom: 4px; font-size: 9px;">
                <strong>@lang('admin::lang.orders.text_payment')</strong><br>
                {{ $model->payment_method ? $model->payment_method->name : '' }}
            </p>
            <p style="margin-bottom: 4px; font-size: 9px;">
                <strong>@lang('admin::lang.orders.text_order_date')</strong><br>
                {{ $model->order_date->setTimeFromTimeString($model->order_time)->format(lang('system::lang.php.date_time_format')) }}
            </p>
        </div>
    </div>

    <div class="row">
        <div class="col">
            <hr style="margin: 8px 0;">
        </div>
    </div>

    <div class="row">
        <div class="col">
            <div class="table-responsive">
                <table class="table invoice-table">
                    <thead>
                    <tr>
                        <th class="text-center" width="8%" style="padding-right: 5px;"></th>
                        <th class="text-left" width="50%" style="padding-left: 8px; padding-right: 8px;"><b>NAME/OPTIONS</b></th>
                        <th class="text-right" width="21%" style="padding-left: 8px; padding-right: 8px;"><b>PRICE</b></th>
                        <th class="text-right" width="21%" style="padding-left: 8px;"><b>TOTAL</b></th>
                    </tr>
                    </thead>
                    <tbody>
                    @foreach($model->getOrderMenusWithOptions() as $menuItem)
                        <tr>
                            <td class="text-center">{{ $menuItem->quantity }}x</td>
                            <td class="text-left"><b>{{ $menuItem->name }}</b><br />
                                @php $menuItemOptionGroup = $menuItem->menu_options->groupBy('order_option_category') @endphp
                                @if($menuItemOptionGroup->isNotEmpty())
                                    @foreach($menuItemOptionGroup as $menuItemOptionGroupName => $menuItemOptions)
                                        <div style="font-size: 8px; margin-top: 2px;">
                                            <strong>{{ $menuItemOptionGroupName }}:</strong><br>
                                            @foreach($menuItemOptions as $menuItemOption)
                                                &nbsp;&nbsp;{{ $menuItemOption->order_option_name }}
                                                @if ($menuItemOption->order_option_price > 0)
                                                    &nbsp;({{ currency_format($menuItemOption->quantity * $menuItemOption->order_option_price) }})
                                                @endif
                                                <br>
                                            @endforeach
                                        </div>
                                    @endforeach
                                @endif
                                @if(!empty($menuItem->comment))
                                    <div>
                                        <small><b>{{ $menuItem->comment }}</b></small>
                                    </div>
                                @endif
                            </td>
                            <td class="text-right">{{ currency_format($menuItem->price) }}</td>
                            <td class="text-right">{{ currency_format($menuItem->subtotal) }}</td>
                        </tr>
                    @endforeach
                    </tbody>
                    <tfoot>
                    @php
                        $orderTotals = $model->getOrderTotals();
                        $tipTotal = $orderTotals->firstWhere('code', 'tip');
                        $couponTotal = $orderTotals->firstWhere('code', 'coupon');
                        $taxTotal = $orderTotals->firstWhere('code', 'tax');
                        $subtotalTotal = $orderTotals->firstWhere('code', 'subtotal');
                        $finalTotal = $orderTotals->firstWhere('code', 'total') ?? $orderTotals->firstWhere('code', 'order_total');
                        
                        // Calculate subtotal from actual menu items (more reliable)
                        $calculatedSubtotal = 0;
                        foreach($model->getOrderMenusWithOptions() as $menuItem) {
                            $calculatedSubtotal += $menuItem->subtotal;
                        }
                        
                        // Use calculated subtotal if database value is 0 or invalid
                        $displaySubtotal = ($subtotalTotal && $subtotalTotal->value > 0) ? $subtotalTotal->value : $calculatedSubtotal;
                        
                        // Get coupon code from title if available
                        $couponCode = null;
                        if ($couponTotal) {
                            $couponTitle = $couponTotal->title ?? '';
                            if (preg_match('/\(([^)]+)\)/', $couponTitle, $matches)) {
                                $couponCode = $matches[1];
                            }
                        }
                    @endphp
                    
                    @if($displaySubtotal > 0)
                        <tr>
                            <td class="thick-line"></td>
                            <td class="thick-line text-left">
                                {{ $model->order_type_name }}
                                @if($model->total_items)
                                    ({{ $model->total_items }} item{{ $model->total_items > 1 ? 's' : '' }})
                                @endif
                            </td>
                            <td class="thick-line"></td>
                            <td class="thick-line text-right">{{ currency_format($displaySubtotal) }}</td>
                        </tr>
                    @endif
                    
                    @if($tipTotal && $tipTotal->value > 0)
                        <tr>
                            <td class="no-line"></td>
                            <td class="no-line text-left">{{ $tipTotal->title }}</td>
                            <td class="no-line"></td>
                            <td class="no-line text-right">{{ currency_format($tipTotal->value) }}</td>
                        </tr>
                    @endif
                    
                    @if($taxTotal && $taxTotal->value > 0)
                        <tr>
                            <td class="no-line"></td>
                            <td class="no-line text-left">{{ $taxTotal->title }}</td>
                            <td class="no-line"></td>
                            <td class="no-line text-right">{{ currency_format($taxTotal->value) }}</td>
                        </tr>
                    @endif
                    
                    @if($couponTotal && $couponTotal->value != 0)
                        <tr>
                            <td class="no-line"></td>
                            <td class="no-line text-left">
                                {{ $couponTotal->title }}
                                @if($couponCode)
                                    ({{ $couponCode }})
                                @endif
                            </td>
                            <td class="no-line"></td>
                            <td class="no-line text-right">
                                {{ $couponTotal->value < 0 ? '-' : '' }}{{ currency_format(abs($couponTotal->value)) }}
                            </td>
                        </tr>
                    @endif
                    
                    @if($finalTotal)
                        <tr>
                            <td class="thick-line"></td>
                            <td class="thick-line text-left"><strong>{{ $finalTotal->title }}</strong></td>
                            <td class="thick-line"></td>
                            <td class="thick-line text-right"><strong>{{ currency_format($finalTotal->value) }}</strong></td>
                        </tr>
                    @endif
                    </tfoot>
                </table>
            </div>
        </div>
    </div>

    <div class="row">
        <div class="col">
            <p class="text-center">Thank you for your Visit</p>
        </div>
    </div>
</div>
</body>
</html>
