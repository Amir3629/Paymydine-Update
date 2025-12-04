@php
    $orderTotals = $model->getOrderTotals();
    // Service fees are intentionally excluded from the bill display
    $taxTotal = $orderTotals->firstWhere('code', 'tax');
    $tipTotal = $orderTotals->firstWhere('code', 'tip');
    $couponTotal = $orderTotals->firstWhere('code', 'coupon');
    $subtotalTotal = $orderTotals->firstWhere('code', 'subtotal');
    $finalTotal = $orderTotals->firstWhere('code', 'total') ?? $orderTotals->firstWhere('code', 'order_total');
    
    // Calculate subtotal and item count from actual menu items (more reliable)
    $calculatedSubtotal = 0;
    $calculatedTotalItems = 0;
    foreach($model->getOrderMenusWithOptions() as $menuItem) {
        $calculatedSubtotal += $menuItem->subtotal;
        $calculatedTotalItems += $menuItem->quantity;
    }
    
    // Always use calculated subtotal from displayed items for accuracy
    // This ensures the subtotal matches what's actually shown in the bill
    $displaySubtotal = $calculatedSubtotal;
    
    // Use calculated item count (always more reliable than database value)
    $displayTotalItems = $calculatedTotalItems;
    
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
                    <td class="order-bill-quantity text-center">
                        <div class="quantity-controls" data-order-menu-id="{{ $menuItem->order_menu_id }}" data-menu-id="{{ $menuItem->menu_id }}" data-price="{{ $menuItem->price }}">
                            <button type="button" class="qty-btn qty-minus" onclick="event.preventDefault(); event.stopPropagation(); updateOrderItemQuantity({{ $menuItem->order_menu_id }}, -1);" title="Decrease quantity">
                                <i class="fa fa-minus"></i>
                            </button>
                            <span class="qty-display" id="qty-{{ $menuItem->order_menu_id }}">{{ $menuItem->quantity }}</span>
                            <button type="button" class="qty-btn qty-plus" onclick="event.preventDefault(); event.stopPropagation(); updateOrderItemQuantity({{ $menuItem->order_menu_id }}, 1);" title="Increase quantity">
                                <i class="fa fa-plus"></i>
                            </button>
                        </div>
                    </td>
                    <!-- Remove the PRICE column entirely -->
                    <td class="order-bill-total text-right">
                        <span class="item-subtotal" id="subtotal-{{ $menuItem->order_menu_id }}">{{ currency_format($menuItem->subtotal) }}</span>
                    </td>
                </tr>
            @endforeach
        </tbody>
        <tfoot class="order-bill-totals">
            <tr>
                <td class="total-label">
                    Subtotal
                    @if($displayTotalItems > 0)
                        <span class="order-bill-subtotal-note">({{ $displayTotalItems }} item{{ $displayTotalItems > 1 ? 's' : '' }})</span>
                    @endif
                </td>
                <td></td>  <!-- Changed from colspan="2" to just empty td for QTY column -->
                <td class="total-value text-right">{{ currency_format($displaySubtotal) }}</td>
            </tr>
            
            @if($taxTotal && $taxTotal->value > 0)
                <tr>
                    <td class="total-label order-bill-tax">Tax</td>
                    <td></td>
                    <td class="total-value order-bill-tax text-right">{{ currency_format($taxTotal->value) }}</td>
                </tr>
            @endif
            
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
                    <td class="total-value text-right" id="order-final-total">{{ currency_format($finalTotal->value) }}</td>
                </tr>
            @endif
        </tfoot>
    </table>
    
    <!-- Add Item Button -->
    <div class="order-bill-actions" style="margin-top: 20px; padding-top: 15px;">
        <button type="button" class="btn btn-primary btn-add-item" id="btn-add-item" onclick="event.preventDefault(); event.stopPropagation(); addItemToOrder({{ $model->order_id }});">
            <i class="fa fa-plus"></i> Add Item
        </button>
    </div>
</div>

<style>
.order-bill-container {
    width: 100%;
    font-size: 15px;
    line-height: 1.4;
    max-width: 100%;
}

.order-bill-table {
    width: 100%;
    border-collapse: collapse;
    border-spacing: 0;
    margin: 0;
    table-layout: auto;
}

.order-bill-table thead th {
    font-weight: 600;
    text-transform: uppercase;
    font-size: 13px;
    color: #526484;
    padding: 10px 6px;
    border-bottom: 2px solid #e5e9f2;
    border-left: none;
    border-right: none;
    text-align: left;
}

.order-bill-table thead th.text-center {
    text-align: center;
}

.order-bill-table tbody td {
    padding: 10px 6px;
    border-bottom: 1px solid #f5f6fa;
    border-left: none;
    border-right: none;
    vertical-align: top;
}

.order-bill-item-name {
    font-weight: 600;
    color: #364a63;
    margin-bottom: 4px;
    font-size: 15px;
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
    padding: 8px 6px;
    border-bottom: none;
    border-left: none;
    border-right: none;
}

/* Ensure separator line spans full width without gaps */
.order-bill-totals tr:first-child td {
    border-top: 2px solid #e5e9f2 !important;
    border-left: 0 !important;
    border-right: 0 !important;
}

/* Ensure separator line before totals is continuous across all columns */
.order-bill-totals tr:first-child td:first-child,
.order-bill-totals tr:first-child td:nth-child(2),
.order-bill-totals tr:first-child td:last-child {
    border-top: 2px solid #e5e9f2 !important;
    border-left: 0 !important;
    border-right: 0 !important;
}

/* Ensure separator line before final total is continuous */
.final-total td:first-child,
.final-total td:nth-child(2),
.final-total td:last-child {
    border-top: 2px solid #e5e9f2 !important;
}

/* Ensure Add Item button separator is continuous */
.order-bill-actions {
    position: relative;
    overflow: hidden;
}

.order-bill-actions::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: #e5e9f2;
    width: 100%;
    display: block;
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
    font-size: 16px;
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
    font-size: 20px;
    color: #364a63;
    padding-top: 10px;
}

/* Ensure final total separator line spans full width */
.final-total td {
    border-top: 2px solid #e5e9f2 !important;
    border-left: none !important;
    border-right: none !important;
}

.order-bill-table tbody tr:last-child td {
    border-bottom: none;
}

/* Ensure continuous borders - remove side borders that could cause gaps */
.order-bill-table tr {
    border-left: 0 !important;
    border-right: 0 !important;
}

/* Ensure continuous border lines - no gaps */
.order-bill-table {
    border-collapse: collapse !important;
    border-spacing: 0 !important;
    border: none !important;
}

/* Remove any cell spacing that could cause gaps */
.order-bill-table * {
    box-sizing: border-box;
}

/* Ensure all table cells have no side borders to prevent gaps */
.order-bill-table td,
.order-bill-table th {
    border-left: 0 !important;
    border-right: 0 !important;
}

/* Header separator line */
.order-bill-table thead th {
    border-bottom: 2px solid #e5e9f2 !important;
    border-top: 0 !important;
}

/* Item separator lines */
.order-bill-table tbody td {
    border-bottom: 1px solid #f5f6fa !important;
    border-top: 0 !important;
}

.order-bill-table tbody tr:last-child td {
    border-bottom: 0 !important;
}

/* Quantity Controls */
.quantity-controls {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    pointer-events: auto !important;
    z-index: 10;
    position: relative;
}

.qty-btn {
    width: 36px;
    height: 36px;
    border: 1px solid #e5e9f2;
    background: #f8f9fa !important;
    border-radius: 6px;
    cursor: pointer !important;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: all 0.2s ease;
    font-size: 14px;
    color: #526484;
    padding: 0;
    pointer-events: auto !important;
    user-select: none;
    position: relative;
    z-index: 11;
    -webkit-tap-highlight-color: transparent;
}

.qty-btn:hover {
    background: #ffffff !important;
    border-color: #d0d7de;
    color: #364a63;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.qty-btn:active {
    transform: scale(0.95);
    background: #f0f0f0 !important;
}

.qty-btn:focus {
    outline: none;
    box-shadow: 0 0 0 2px rgba(0, 0, 0, 0.1);
}

.qty-btn:not(:disabled) {
    cursor: pointer !important;
    pointer-events: auto !important;
}

.qty-display {
    min-width: 40px;
    text-align: center;
    font-weight: 600;
    color: #364a63 !important;
    font-size: 16px;
    user-select: none;
}

.qty-minus {
    color: #526484 !important;
    background: #f8f9fa !important;
}

.qty-minus:hover {
    background: #ffffff !important;
    border-color: #d0d7de;
    color: #364a63 !important;
}

.qty-plus {
    color: #526484 !important;
    background: #f8f9fa !important;
}

.qty-plus:hover {
    background: #ffffff !important;
    border-color: #d0d7de;
    color: #364a63 !important;
}

/* Add Item Button */
.order-bill-actions {
    text-align: center;
}

.btn-add-item {
    padding: 14px 32px;
    font-size: 16px;
    font-weight: 600;
    border-radius: 8px;
    background: #08815e !important;
    border: none;
    color: #fff !important;
    transition: all 0.2s ease;
    cursor: pointer !important;
    pointer-events: auto !important;
    position: relative;
    z-index: 10;
    min-height: 48px;
    width: 100%;
}

.btn-add-item:hover {
    background: #066d4f !important;
    transform: translateY(-1px);
    box-shadow: 0 4px 8px rgba(8, 129, 94, 0.3);
    color: #fff !important;
}

.btn-add-item:active {
    transform: translateY(0);
    background: #055a42 !important;
}

.btn-add-item:focus {
    outline: none;
    box-shadow: 0 0 0 3px rgba(8, 129, 94, 0.3);
}

.btn-add-item i {
    margin-right: 6px;
}

/* Loading state */
.quantity-controls.loading .qty-btn {
    opacity: 0.5;
    cursor: wait;
    pointer-events: none;
}

/* Ensure buttons are always clickable */
.quantity-controls * {
    pointer-events: auto !important;
}

.quantity-controls .qty-btn {
    position: relative;
    z-index: 11;
}

/* Prevent any parent from blocking clicks */
.order-bill-table tbody tr {
    pointer-events: auto;
}

.order-bill-table tbody tr td {
    pointer-events: auto;
}

.order-bill-quantity {
    pointer-events: auto !important;
}

.item-subtotal {
    font-weight: 600;
    color: #364a63;
}
</style>

<script>
// Store order ID for use in functions
const CURRENT_ORDER_ID = {{ $model->order_id }};

/**
 * Update order item quantity
 */
function updateOrderItemQuantity(orderMenuId, change) {
    console.log('updateOrderItemQuantity called', orderMenuId, change);
    
    const controls = document.querySelector(`.quantity-controls[data-order-menu-id="${orderMenuId}"]`);
    if (!controls) {
        console.error('Controls not found for order_menu_id:', orderMenuId);
        return;
    }
    
    const qtyDisplay = document.getElementById(`qty-${orderMenuId}`);
    const subtotalDisplay = document.getElementById(`subtotal-${orderMenuId}`);
    
    if (!qtyDisplay || !subtotalDisplay) {
        console.error('Display elements not found');
        return;
    }
    
    const currentQty = parseInt(qtyDisplay.textContent) || 0;
    const newQty = currentQty + change;
    const price = parseFloat(controls.getAttribute('data-price')) || 0;
    
    // Prevent negative quantities
    if (newQty < 0) {
        return;
    }
    
    // If quantity becomes 0, remove the item immediately without confirmation
    if (newQty === 0) {
        removeOrderItem(orderMenuId);
        return;
    }
    
    // Disable controls during update
    controls.classList.add('loading');
    
    // Make AJAX request to update quantity using Laravel AJAX handler
    $.request('onUpdateItemQuantity', {
        data: {
            order_menu_id: orderMenuId,
            quantity: newQty
        },
        success: function(data) {
            console.log('Update quantity AJAX success response:', data);
            // Laravel AJAX handler wraps response in 'result' property
            const response = data.result || data;
            console.log('Parsed update response:', response);
            
            if (response && response.success) {
                // Update display
                qtyDisplay.textContent = newQty;
                const newSubtotal = (price * newQty).toFixed(2);
                subtotalDisplay.textContent = formatCurrency(newSubtotal);
                
                // Update totals
                if (response.totals) {
                    updateOrderTotals(response.totals);
                }
                
                // No success notification - updates happen silently
            } else {
                showNotification(response?.error || 'Failed to update quantity', 'error');
                // Revert display
                qtyDisplay.textContent = currentQty;
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.error('Error:', errorThrown);
            showNotification('Error updating quantity', 'error');
            // Revert display
            qtyDisplay.textContent = currentQty;
        },
        complete: function() {
            controls.classList.remove('loading');
        }
    });
    
    // Old fetch code (keeping as fallback)
    /*
    fetch(`/admin/orders/edit/${CURRENT_ORDER_ID}/update-item-quantity`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
        },
        body: JSON.stringify({
            order_menu_id: orderMenuId,
            quantity: newQty
        })
    })
    */
}

/**
 * Remove order item
 */
function removeOrderItem(orderMenuId) {
    console.log('removeOrderItem called', orderMenuId);
    const controls = document.querySelector(`.quantity-controls[data-order-menu-id="${orderMenuId}"]`);
    if (!controls) {
        console.error('Controls not found for order_menu_id:', orderMenuId);
        return;
    }
    const row = controls.closest('tr');
    
    // Disable controls
    row.style.opacity = '0.5';
    row.style.pointerEvents = 'none';
    
    // Use Laravel AJAX handler
    $.request('onRemoveItem', {
        data: {
            order_menu_id: orderMenuId
        },
        success: function(data) {
            console.log('Remove item AJAX success response:', data);
            // Laravel AJAX handler wraps response in 'result' property
            const response = data.result || data;
            console.log('Parsed remove response:', response);
            
            if (response && response.success) {
                // Remove row with animation
                row.style.transition = 'opacity 0.3s ease';
                row.style.opacity = '0';
                setTimeout(() => {
                    row.remove();
                    // Update totals
                    if (response.totals) {
                        updateOrderTotals(response.totals);
                        // Reload page if no items left
                        if (response.totals.total_items === 0) {
                            location.reload();
                        }
                    }
                }, 300);
                
                // No success notification - updates happen silently
            } else {
                showNotification(response?.error || 'Failed to remove item', 'error');
                row.style.opacity = '1';
                row.style.pointerEvents = 'auto';
            }
        },
        error: function(jqXHR, textStatus, errorThrown) {
            console.error('Error:', errorThrown);
            showNotification('Error removing item', 'error');
            row.style.opacity = '1';
            row.style.pointerEvents = 'auto';
        }
    });
}

/**
 * Update order totals display
 */
function updateOrderTotals(totals) {
    // Update subtotal
    const subtotalEl = document.querySelector('.order-bill-totals tr:first-child .total-value');
    if (subtotalEl && totals.subtotal !== undefined) {
        subtotalEl.textContent = formatCurrency(totals.subtotal);
    }
    
    // Update tax if it exists
    const taxRow = document.querySelector('.order-bill-tax');
    if (taxRow && totals.tax !== undefined) {
        const taxValueEl = taxRow.closest('tr')?.querySelector('.total-value');
        if (taxValueEl) {
            taxValueEl.textContent = formatCurrency(totals.tax);
        }
    }
    
    // Update tip if it exists
    const tipRow = document.querySelector('.order-bill-tip');
    if (tipRow && totals.tip !== undefined) {
        const tipValueEl = tipRow.closest('tr')?.querySelector('.total-value');
        if (tipValueEl) {
            tipValueEl.textContent = formatCurrency(totals.tip);
        }
    }
    
    // Update coupon if it exists
    const couponRow = document.querySelector('.order-bill-discount');
    if (couponRow && totals.coupon !== undefined) {
        const couponValueEl = couponRow.closest('tr')?.querySelector('.total-value');
        if (couponValueEl) {
            const couponValue = totals.coupon;
            couponValueEl.textContent = (couponValue < 0 ? '--' : '') + formatCurrency(Math.abs(couponValue));
        }
    }
    
    // Update item count
    const itemCountEl = document.querySelector('.order-bill-subtotal-note');
    if (itemCountEl && totals.total_items !== undefined) {
        const itemText = totals.total_items === 1 ? 'item' : 'items';
        itemCountEl.textContent = `(${totals.total_items} ${itemText})`;
    }
    
    // Update final total
    const totalEl = document.getElementById('order-final-total');
    if (totalEl && totals.total !== undefined) {
        totalEl.textContent = formatCurrency(totals.total);
    }
}

/**
 * Add item to order - navigate to create page with order context
 */
function addItemToOrder(orderId) {
    console.log('addItemToOrder called', orderId);
    // Get table info from order
    const tableId = '{{ $model->table_id ?? "" }}';
    const locationId = '{{ $model->location_id ?? 1 }}';
    
    // Navigate to create page with order_id parameter
    const url = `/admin/orders/create?order_id=${orderId}&table_id=${tableId}&location_id=${locationId}`;
    window.location.href = url;
}

// Ensure functions are in global scope (after they're defined)
window.updateOrderItemQuantity = updateOrderItemQuantity;
window.removeOrderItem = removeOrderItem;
window.addItemToOrder = addItemToOrder;

/**
 * Format currency (matches PHP currency_format helper)
 */
function formatCurrency(amount) {
    const numAmount = parseFloat(amount);
    if (isNaN(numAmount)) return '$0.00';
    return '$' + numAmount.toFixed(2);
}

/**
 * Show notification
 */
function showNotification(message, type) {
    // Use existing flash notification system if available
    if (typeof flash !== 'undefined') {
        flash()[type](message).now();
    } else {
        // Fallback to alert
        alert(message);
    }
}
</script>
