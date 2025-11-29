@php
    $orderTotals = $model->getOrderTotals();
    // Service fees are intentionally excluded from the bill display
    $tipTotal = $orderTotals->firstWhere('code', 'tip');
    $couponTotal = $orderTotals->firstWhere('code', 'coupon');
    $subtotalTotal = $orderTotals->firstWhere('code', 'subtotal');
    $finalTotal = $orderTotals->firstWhere('code', 'total') ?? $orderTotals->firstWhere('code', 'order_total');
    
    // Calculate subtotal from actual menu items (more reliable)
    $calculatedSubtotal = 0;
    foreach($model->getOrderMenusWithOptions() as $menuItem) {
        $calculatedSubtotal += $menuItem->subtotal;
    }
    
    // Use calculated subtotal if database value is 0 or invalid
    $displaySubtotal = ($subtotalTotal && $subtotalTotal->value > 0) ? $subtotalTotal->value : $calculatedSubtotal;
    
    // Get coupon code from order_totals title if available
    $couponCode = null;
    if ($couponTotal) {
        $couponTitle = $couponTotal->title ?? '';
        // Try to extract coupon code from title (e.g., "Coupon (TEST20251126122405)" or "TEST20251126122405")
        if (preg_match('/\(([^)]+)\)/', $couponTitle, $matches)) {
            $couponCode = $matches[1];
        } elseif (preg_match('/^([A-Z0-9]+)$/', trim($couponTitle), $matches)) {
            $couponCode = $matches[1];
        }
    }
@endphp

<div class="order-bill-container">
    <table class="order-bill-table">
        <thead>
            <tr>
                <th width="60%">ITEM / OPTIONS</th>
                <th width="10%" class="text-center">QTY</th>
                <th width="30%" class="text-right">TOTAL</th>
            </tr>
        </thead>
        <tbody>
            @foreach($model->getOrderMenusWithOptions() as $menuItem)
                <tr>
                    <td>
                        <div class="order-bill-item-name">{{ $menuItem->name }}</div>
                        @php $menuItemOptionGroup = $menuItem->menu_options->groupBy('order_option_category') @endphp
                        @if($menuItemOptionGroup->isNotEmpty())
                            <div class="order-bill-item-options">
                                @foreach($menuItemOptionGroup as $menuItemOptionGroupName => $menuItemOptions)
                                    @foreach($menuItemOptions as $menuItemOption)
                                        <div class="order-bill-option">
                                            @if ($menuItemOption->quantity > 1)
                                                <span class="order-bill-option-qty">{{ $menuItemOption->quantity }}x</span>
                                            @endif
                                            <span class="order-bill-option-name">{{ $menuItemOption->order_option_name }}</span>
                                            @if($menuItemOption->order_option_price > 0)
                                                <span class="order-bill-option-price">+{{ currency_format($menuItemOption->quantity * $menuItemOption->order_option_price) }}</span>
                                            @endif
                                        </div>
                                    @endforeach
                                @endforeach
                            </div>
                        @endif
                        @if(!empty($menuItem->comment))
                            <div class="order-bill-item-comment">{{ $menuItem->comment }}</div>
                        @endif
                    </td>
                    <td class="order-bill-quantity text-center">{{ $menuItem->quantity }}</td>
                    <!-- Remove the PRICE column entirely -->
                    <td class="order-bill-total text-right">{{ currency_format($menuItem->subtotal) }}</td>
                </tr>
            @endforeach
        </tbody>
        <tfoot class="order-bill-totals">
            <tr>
                <td class="total-label">
                    Subtotal
                    @if($formModel->total_items)
                        <span class="order-bill-subtotal-note">({{ $formModel->total_items }} item{{ $formModel->total_items > 1 ? 's' : '' }})</span>
                    @endif
                </td>
                <td></td>  <!-- Changed from colspan="2" to just empty td for QTY column -->
                <td class="total-value text-right">{{ currency_format($displaySubtotal) }}</td>
            </tr>
            
            @if($tipTotal && $tipTotal->value > 0)
                <tr>
                    <td class="total-label order-bill-tip">Tip</td>
                    <td></td>
                    <td class="total-value order-bill-tip text-right">{{ currency_format($tipTotal->value) }}</td>
                </tr>
            @endif
            
            @if($couponTotal && $couponTotal->value != 0)
                <tr>
                    <td class="total-label order-bill-discount">
                        Coupon
                        @if($couponCode)
                            <span class="order-bill-coupon-code">({{ $couponCode }})</span>
                        @endif
                    </td>
                    <td></td>
                    <td class="total-value order-bill-discount text-right">
                        {{ $couponTotal->value < 0 ? '--' : '' }}{{ currency_format(abs($couponTotal->value)) }}
                    </td>
                </tr>
            @endif
            
            @if($finalTotal)
                <tr class="final-total">
                    <td class="total-label">Total</td>
                    <td></td>
                    <td class="total-value text-right">{{ currency_format($finalTotal->value) }}</td>
                </tr>
            @endif
        </tfoot>
    </table>
</div>

<style>
.order-bill-container {
    width: 100%;
    font-size: 13px;
    line-height: 1.3;
    max-width: 100%;
}

.order-bill-table {
    width: 100%;
    border-collapse: collapse;
    margin: 0;
}

.order-bill-table thead th {
    font-weight: 600;
    text-transform: uppercase;
    font-size: 11px;
    color: #526484;
    padding: 6px 4px;
    border-bottom: 1px solid #e5e9f2;
    text-align: left;
}

.order-bill-table thead th.text-center {
    text-align: center;
}

.order-bill-table tbody td {
    padding: 4px;
    border-bottom: 1px solid #f5f6fa;
    vertical-align: top;
}

.order-bill-item-name {
    font-weight: 600;
    color: #364a63;
    margin-bottom: 3px;
    font-size: 13px;
}

.order-bill-item-options {
    margin-top: 4px;
    padding-left: 0;
}

.order-bill-option {
    font-size: 12px;
    color: #8094ae;
    margin: 1px 0;
    line-height: 1.2;
}

.order-bill-option-qty {
    font-weight: 500;
    margin-right: 4px;
}

.order-bill-option-name {
    margin-right: 4px;
}

.order-bill-option-price {
    color: #526484;
    font-weight: 500;
}

.order-bill-item-comment {
    font-size: 13px;
    color: #526484;
    font-style: italic;
    margin-top: 4px;
    padding-left: 8px;
}

.order-bill-quantity,
.order-bill-price,
.order-bill-total {
    color: #364a63;
    font-weight: 500;
}

/* Make sure totals are right-aligned */
.order-bill-price,
.order-bill-total {
    text-align: right !important;
}

.order-bill-totals {
    border-top: 2px solid #e5e9f2;
    margin-top: 4px;
}

.order-bill-totals tr {
    border-bottom: none;
}

.order-bill-totals td {
    padding: 4px;
    border-bottom: none;
}

.total-label {
    font-weight: 500;
    color: #526484;
    text-align: left;
}

.total-value {
    font-weight: 600;
    color: #364a63;
    text-align: right;
}

.order-bill-subtotal-note {
    font-size: 13px;
    font-weight: 400;
    color: #8094ae;
    margin-left: 4px;
}

.order-bill-tip .total-label,
.order-bill-tip .total-value {
    color: #08815e;
}

.order-bill-discount .total-label,
.order-bill-discount .total-value {
    color: #e85347;
}

.order-bill-coupon-code {
    font-size: 12px;
    font-weight: 400;
    margin-left: 4px;
}

.final-total .total-label,
.final-total .total-value {
    font-weight: 700;
    font-size: 14px;
    color: #364a63;
    padding-top: 6px;
    border-top: 1px solid #e5e9f2;
}

.order-bill-table tbody tr:last-child td {
    border-bottom: none;
}
</style>
