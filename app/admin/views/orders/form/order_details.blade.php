<table class="order-details-table">
    <tbody>
        @if($formModel->payment_method)
            <tr>
                <td class="text-muted">@lang('admin::lang.orders.label_payment_method')</td>
                <td class="text-right">{{ $formModel->payment_method->name }}</td>
            </tr>
        @endif
        <tr>
            <td class="text-muted">@lang('admin::lang.orders.label_invoice')</td>
            <td class="text-right">
                @if ($formModel->hasInvoice())
                    <a
                        class="font-weight-bold"
                        href="{{ admin_url('orders/invoice/'.$formModel->order_id) }}"
                        target="_blank"
                    >{{ $formModel->invoice_number }}</a>
                @else
                    {{ $formModel->invoice_number }}
                @endif
            </td>
        </tr>
        <tr>
            <td class="text-muted">@lang('admin::lang.orders.label_date_added')</td>
            <td class="text-right">{{ $formModel->created_at->isoFormat(lang('system::lang.moment.date_time_format_short')) }}</td>
        </tr>
        <tr>
            <td class="text-muted">@lang('admin::lang.orders.label_date_modified')</td>
            <td class="text-right">{{ $formModel->updated_at->isoFormat(lang('system::lang.moment.date_time_format_short')) }}</td>
        </tr>
        @if($formModel->ip_address)
            <tr>
                <td class="text-muted">@lang('admin::lang.orders.label_ip_address')</td>
                <td class="text-right">{{ $formModel->ip_address }}</td>
            </tr>
        @endif
        @if($formModel->user_agent)
            <tr>
                <td class="text-muted">@lang('admin::lang.orders.label_user_agent')</td>
                <td class="text-right">{{ $formModel->user_agent }}</td>
            </tr>
        @endif
    </tbody>
</table>

<style>
/* Ensure style tag is not displayed as text */
@supports not (display: none) {
    /* Fallback for older browsers */
}

.order-details-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 14px;
    line-height: 1.5;
}

.order-details-table td {
    padding: 10px 6px;
    border-bottom: 1px solid #f5f6fa;
    color: #526484;
}

.order-details-table td.text-muted {
    color: #8094ae;
    font-size: 13px;
}

.order-details-table td.text-right {
    text-align: right;
    font-weight: 500;
    color: #526484 !important;
    font-size: 14px;
}

.order-details-table td.text-right a {
    color: #526484 !important;
}

.order-details-table td.text-right a:hover {
    color: #364a63 !important;
}

/* Remove all green colors from order details table */
.order-details-table td,
.order-details-table td.text-right,
.order-details-table td.text-right a,
.order-details-table td.text-muted {
    color: #526484 !important;
}

.order-details-table td.text-right a:hover {
    color: #364a63 !important;
}

/* Invoice number link stays GREEN - highest specificity */
.order-details-table td.text-right a[href*="/orders/invoice/"][target="_blank"],
.order-details-table td.text-right a.font-weight-bold[href*="/orders/invoice/"],
.order-details-table td.text-right a[href*="/orders/invoice/"] {
    color: #08815e !important;
}

.order-details-table td.text-right a[href*="/orders/invoice/"][target="_blank"]:hover,
.order-details-table td.text-right a.font-weight-bold[href*="/orders/invoice/"]:hover,
.order-details-table td.text-right a[href*="/orders/invoice/"]:hover {
    color: #06ab6e !important;
}

.order-details-table tr:last-child td {
    border-bottom: none;
}

.order-bill-card,
.order-details-card {
    margin-bottom: 12px !important;
}

.order-bill-card .card-body,
.order-details-card .card-body {
    padding: 12px !important;
}

/* Tighter spacing for all cards in order edit */
.order-bill-card,
.order-details-card,
.card.bg-light.shadow-sm {
    margin-bottom: 10px !important;
}

.card.bg-light.shadow-sm .card-body {
    padding: 12px !important;
}
</style>
<style>
/* Hide any style/script tags displayed as text on mobile */
@media (max-width: 768px) {
    style,
    script {
        display: none !important;
        visibility: hidden !important;
        height: 0 !important;
        width: 0 !important;
        overflow: hidden !important;
        position: absolute !important;
        left: -9999px !important;
        opacity: 0 !important;
    }
}
</style>

<script>
(function() {
    function forceSendInvoiceIconColor() {
        const btn = document.querySelector('a.btn-send-invoice[data-request="onSendInvoiceEmail"]');
        if (btn) {
            const icon = btn.querySelector('i.fa-envelope');
            if (icon) {
                icon.style.setProperty('color', '#364a63', 'important');
                icon.style.setProperty('margin-right', '8px', 'important');
            }
        }
    }
    
    // Run on load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', forceSendInvoiceIconColor);
    } else {
        forceSendInvoiceIconColor();
    }
    
    // Run after delays
    setTimeout(forceSendInvoiceIconColor, 100);
    setTimeout(forceSendInvoiceIconColor, 500);
    setTimeout(forceSendInvoiceIconColor, 1000);
    
    // Watch for changes
    const observer = new MutationObserver(forceSendInvoiceIconColor);
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Also on AJAX updates
    document.addEventListener('ajaxUpdate', function() {
        setTimeout(forceSendInvoiceIconColor, 100);
    });
})();
</script>

<script>
(function() {
    function forceSendInvoiceIconColor() {
        // Try multiple selectors
        const selectors = [
            'a.btn-send-invoice[data-request="onSendInvoiceEmail"]',
            'a[data-request="onSendInvoiceEmail"]',
            '.btn-send-invoice'
        ];
        
        let btn = null;
        for (let selector of selectors) {
            btn = document.querySelector(selector);
            if (btn) break;
        }
        
        if (btn) {
            const icon = btn.querySelector('i.fa-envelope') || btn.querySelector('i.fa') || btn.querySelector('i');
            if (icon) {
                // Use setProperty with !important
                icon.style.setProperty('color', '#364a63', 'important');
                icon.style.setProperty('margin-right', '8px', 'important');
                
                // Also set directly
                icon.style.color = '#364a63';
                icon.style.marginRight = '8px';
                
                // Force override any inherited color
                if (window.getComputedStyle(icon).color !== 'rgb(54, 74, 99)') {
                    icon.setAttribute('style', icon.getAttribute('style') + '; color: #364a63 !important; margin-right: 8px !important;');
                }
            }
        }
    }
    
    // Run immediately if DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            forceSendInvoiceIconColor();
            setTimeout(forceSendInvoiceIconColor, 100);
            setTimeout(forceSendInvoiceIconColor, 500);
            setTimeout(forceSendInvoiceIconColor, 1000);
        });
    } else {
        forceSendInvoiceIconColor();
        setTimeout(forceSendInvoiceIconColor, 100);
        setTimeout(forceSendInvoiceIconColor, 500);
        setTimeout(forceSendInvoiceIconColor, 1000);
    }
    
    // Watch for changes
    const observer = new MutationObserver(function() {
        forceSendInvoiceIconColor();
    });
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Also on AJAX updates
    document.addEventListener('ajaxUpdate', function() {
        setTimeout(forceSendInvoiceIconColor, 50);
        setTimeout(forceSendInvoiceIconColor, 200);
    });
    
    // Force on page transitions
    document.addEventListener('pageContentLoaded', function() {
        setTimeout(forceSendInvoiceIconColor, 100);
    });
})();
</script>
