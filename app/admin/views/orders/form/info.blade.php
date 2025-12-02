<style>
/* Override parent container constraints - make it full width */
.form-group.span-left.partial-field,
.form-group[data-field-name="_info"],
.form-group.span-left[data-field-name="_info"],
#{{ $field->getId('group') ?? 'order-info-container' }},
.form-group.span-left {
    width: 100% !important;
    max-width: 100% !important;
    flex: 0 0 100% !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    padding-left: 0 !important;
    padding-right: 0 !important;
}

/* Ensure form-fields container doesn't constrain */
.form-fields,
.form-fields > div,
[class*="form-field"],
[class*="field-"] {
    overflow: visible !important;
    max-width: 100% !important;
}

/* Make the header break out of any column constraints */
.order-info-header {
    display: flex !important;
    align-items: center;
    gap: 32px;
    padding: 24px 32px;
    background: linear-gradient(135deg, #f8f9fa 0%, #ffffff 100%);
    border-radius: 14px;
    border: 2px solid #e5e9f2;
    box-shadow: 0 2px 8px rgba(0,0,0,0.05);
    margin-bottom: 24px;
    margin-left: 0 !important;
    margin-right: 0 !important;
    flex-wrap: nowrap !important;
    width: 100% !important;
    max-width: 100% !important;
    min-width: 100% !important;
    box-sizing: border-box;
    min-height: 80px;
    overflow: visible !important;
    position: relative;
    clear: both;
}

/* Ensure all items fit within the frame */
.order-info-item {
    display: flex;
    flex-direction: column;
    align-items: stretch;
    justify-content: flex-start;
    gap: 6px;
    min-width: 0;
    flex-shrink: 0;
    flex-grow: 0;
    text-align: center;
}

/* Ensure all labels align on the same baseline */
.order-info-item > .order-info-label {
    flex: 0 0 auto;
    height: 14px;
    min-height: 14px;
    max-height: 14px;
    line-height: 14px;
    margin-bottom: 6px;
    align-self: center;
}

.order-info-item.table-number {
    min-width: 110px;
}

.order-info-item.order-id {
    min-width: 100px;
}

.order-info-item.date-time {
    min-width: 200px;
}

.order-info-item.status {
    min-width: 150px;
}

.order-info-item.assignee {
    min-width: 130px;
    flex-grow: 1;
    flex-shrink: 1;
}

.order-info-item.send-invoice {
    min-width: 120px;
    flex-shrink: 0;
    align-items: stretch;
    gap: 6px;
}

.order-info-item.send-invoice .send-invoice-icon-btn {
    margin-top: 8px !important;
    transform: translateY(0) !important;
    position: relative !important;
    top: 4px !important;
}

/* Send Invoice Icon Button - Perfect Square */
.order-info-header .send-invoice-icon-btn,
.order-info-item.send-invoice .send-invoice-icon-btn,
a.send-invoice-icon-btn {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    width: 40px !important;
    height: 40px !important;
    min-width: 40px !important;
    min-height: 40px !important;
    max-width: 40px !important;
    max-height: 40px !important;
    aspect-ratio: 1 / 1 !important;
    box-sizing: border-box !important;
    background: #f1f4fb !important;
    background-color: #f1f4fb !important;
    border: 1px solid #c9d2e3 !important;
    border-radius: 10px !important;
    color: #364a63 !important;
    cursor: pointer !important;
    transition: all 0.2s ease !important;
    text-decoration: none !important;
    padding: 0 !important;
    margin: 8px auto 0 auto !important;
    transform: translateY(0) !important;
    flex-shrink: 0 !important;
}

.order-info-header .send-invoice-icon-btn:hover,
.order-info-header .send-invoice-icon-btn:focus,
.order-info-item.send-invoice .send-invoice-icon-btn:hover,
.order-info-item.send-invoice .send-invoice-icon-btn:focus {
    background: #e5ebf7 !important;
    background-color: #e5ebf7 !important;
    border-color: #b8c6dd !important;
    transform: translateY(-1px) translateY(0) !important;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1) !important;
    top: 4px !important;
}

/* Icon - Move down a bit inside the button frame */
.order-info-header .send-invoice-icon-btn i,
.order-info-header .send-invoice-icon-btn i.fa,
.order-info-header .send-invoice-icon-btn i.fa-envelope,
.order-info-item.send-invoice .send-invoice-icon-btn i,
.order-info-item.send-invoice .send-invoice-icon-btn i.fa,
.order-info-item.send-invoice .send-invoice-icon-btn i.fa-envelope,
a.send-invoice-icon-btn i,
a.send-invoice-icon-btn i.fa,
a.send-invoice-icon-btn i.fa-envelope,
a[class*="send-invoice-icon-btn"] i,
a[class*="send-invoice-icon-btn"] i.fa,
.send-invoice-icon-btn i,
.send-invoice-icon-btn i.fa {
    font-size: 18px !important;
    color: #364a63 !important;
    margin: 0 !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
    margin-top: 5px !important;
    margin-bottom: 0 !important;
    padding: 0 !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    line-height: 1 !important;
    position: relative !important;
    top: 4px !important;
}

/* Override inline styles - Maximum specificity */
a.send-invoice-icon-btn i[style*="margin"],
a.send-invoice-icon-btn i[style*="margin-right"],
.send-invoice-icon-btn i[style*="margin"],
.send-invoice-icon-btn i[style*="margin-right"] {
    margin-right: 0 !important;
    margin-left: 0 !important;
    margin-top: 5px !important;
    margin-bottom: 0 !important;
    margin: 0 !important;
    position: relative !important;
    top: 4px !important;
}

.order-info-header .send-invoice-icon-btn:hover i,
.order-info-header .send-invoice-icon-btn:focus i,
.order-info-item.send-invoice .send-invoice-icon-btn:hover i,
.order-info-item.send-invoice .send-invoice-icon-btn:focus i {
    color: #364a63 !important;
}

.order-info-label {
    font-size: 12px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    color: #8094ae;
    margin: 0;
    margin-bottom: 6px;
    padding: 0;
    line-height: 1.2;
    height: 14px;
    min-height: 14px;
    max-height: 14px;
    text-align: center;
    width: 100%;
    display: block;
    vertical-align: baseline;
    box-sizing: border-box;
}

.order-info-value {
    font-size: 17px;
    font-weight: 700;
    color: #364a63;
    margin: 0;
    line-height: 1.3;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    text-align: center;
    width: 100%;
}

.order-info-value.order-id-value {
    color: #08815e;
    font-size: 20px;
}

.order-info-value.status-value {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 6px 14px;
    background: #f0f9f7;
    border-radius: 6px;
    border: 1px solid #d1f2e8;
    color: #08815e;
    font-size: 15px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    border-bottom: 2px dashed transparent;
    margin: 0 auto;
}

.order-info-value.status-value:hover {
    background: #e0f5ef;
    border-color: #08815e;
    transform: translateY(-1px);
    box-shadow: 0 2px 4px rgba(8, 129, 94, 0.2);
}

.order-info-value.assignee-value {
    color: #526484;
    font-style: italic;
    cursor: pointer;
    transition: all 0.2s ease;
    border-bottom: 2px dashed transparent;
    padding: 6px 0;
    font-size: 16px;
    text-align: center;
    margin: 0 auto;
}

.order-info-value.assignee-value:hover {
    color: #364a63;
    border-bottom-color: #526484;
    transform: translateY(-1px);
}

.order-info-separator {
    width: 1px;
    height: 50px;
    background: #e5e9f2;
    flex-shrink: 0;
    margin: 0 4px;
}

/* Hide duplicate statuseditor info section display, but keep the container for functionality */
.control-statuseditor .d-flex {
    display: none !important;
}

/* Hide Send Invoice button from toolbar ONLY - be very specific */
.toolbar .btn-send-invoice,
.toolbar a.btn-send-invoice,
.toolbar-action .btn-send-invoice,
.toolbar-action a.btn-send-invoice,
.toolbar .toolbar-action .btn-send-invoice,
.toolbar .toolbar-action a.btn-send-invoice,
body .toolbar .btn-send-invoice,
body .toolbar a.btn-send-invoice,
body .toolbar-action .btn-send-invoice,
body .toolbar-action a.btn-send-invoice,
div.toolbar .btn-send-invoice,
div.toolbar a.btn-send-invoice,
div.toolbar-action .btn-send-invoice,
div.toolbar-action a.btn-send-invoice {
    display: none !important;
    visibility: hidden !important;
    opacity: 0 !important;
    height: 0 !important;
    width: 0 !important;
    padding: 0 !important;
    margin: 0 !important;
    overflow: hidden !important;
    position: absolute !important;
    left: -9999px !important;
}


@media (max-width: 1400px) {
    .order-info-header {
        gap: 24px;
        padding: 20px 28px;
    }
    
    .order-info-item {
        min-width: auto;
    }
    
    .order-info-value {
        font-size: 15px;
    }
}

@media (max-width: 1200px) {
    .order-info-header {
        flex-wrap: wrap;
        gap: 16px;
        padding: 18px 24px;
    }
    
    .order-info-item {
        flex: 0 0 calc(50% - 12px);
    }
}
</style>

<div class="order-info-header">
    <!-- Table Number -->
    <div class="order-info-item table-number">
        <label class="order-info-label">Table</label>
        <div class="order-info-value">{{ $formModel->order_type_name ?: 'N/A' }}</div>
    </div>
    
    <div class="order-info-separator"></div>
    
    <!-- Order ID -->
    <div class="order-info-item order-id">
        <label class="order-info-label">Order ID</label>
        <div class="order-info-value order-id-value">#{{ $formModel->order_id }}</div>
    </div>
    
    <div class="order-info-separator"></div>
    
    <!-- Date/Time -->
    <div class="order-info-item date-time">
        <label class="order-info-label">Date & Time</label>
        <div class="order-info-value">
            {{ $formModel->order_date_time->isoFormat(lang('system::lang.moment.date_time_format_short')) }}
            @if ($formModel->order_time_is_asap)
                <span style="font-size: 12px; color: #08815e; font-weight: 600;">(ASAP)</span>
            @endif
        </div>
    </div>
    
    <div class="order-info-separator"></div>
    
    <!-- Status - Clickable -->
    <div class="order-info-item status">
        <label class="order-info-label">Status</label>
        <a
            class="order-info-value status-value header-status-clickable"
            role="button"
            data-editor-control="load-status"
            style="text-decoration: none; display: inline-flex; align-items: center; gap: 6px; padding: 4px 12px; background: #f0f9f7; border-radius: 6px; border: 1px solid #d1f2e8; color: #08815e; font-size: 14px; font-weight: 600; cursor: pointer; transition: all 0.2s ease;{{ $formModel->status ? ' border-bottom: 2px dashed;' : '' }}{{ $formModel->status && $formModel->status->status_color ? ' color: '.$formModel->status->status_color.';' : '' }}"
        >
            @if($formModel->status)
                <i class="fa fa-circle" style="font-size: 8px;"></i>
                {{ $formModel->status->status_name }}
            @else
                <span style="color: #8094ae;">--</span>
            @endif
        </a>
    </div>
    
    <div class="order-info-separator"></div>
    
    <!-- Assignee - Clickable -->
    <div class="order-info-item assignee">
        <label class="order-info-label">Assignee</label>
        <a
            class="order-info-value assignee-value header-assignee-clickable"
            role="button"
            data-editor-control="load-assignee"
            style="text-decoration: none; color: #526484; font-style: italic; cursor: pointer; transition: all 0.2s ease; border-bottom: 2px dashed transparent; padding: 4px 0; display: block;"
        >
            @if($formModel->assignee)
                {{ $formModel->assignee->staff_name }}
            @else
                <span style="color: #8094ae;">--</span>
            @endif
        </a>
    </div>
    
    <div class="order-info-separator"></div>
    
    <!-- Send Invoice - Label with clickable icon button -->
    @if($formModel->hasInvoice())
        <div class="order-info-item send-invoice">
            <label class="order-info-label">Send Invoice</label>
            <a
                class="send-invoice-icon-btn"
                role="button"
                data-request="onSendInvoiceEmail"
                data-request-confirm="Send invoice to customer email?"
                data-progress-indicator="Sending invoice..."
                title="Send Invoice via Email"
            >
                <i class="fa fa-envelope"></i>
            </a>
        </div>
    @endif
</div>

<script>
// Wire up click handlers for Status and Assignee in the header
(function() {
    function initHeaderClickHandlers() {
        var $ = window.jQuery || window.$;
        if (!$) {
            setTimeout(initHeaderClickHandlers, 100);
            return;
        }
        
        // Find the statuseditor widget
        var $statusEditor = $('[data-control="status-editor"]');
        if (!$statusEditor.length) {
            setTimeout(initHeaderClickHandlers, 200);
            return;
        }
        
        // Get the statuseditor instance
        var statusEditorInstance = $statusEditor.data('ti.statusEditor');
        if (!statusEditorInstance) {
            setTimeout(initHeaderClickHandlers, 200);
            return;
        }
        
        // Handle Status click
        $('.header-status-clickable').off('click.header-status').on('click.header-status', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Create a fake event object that mimics what statuseditor expects
            var fakeEvent = {
                currentTarget: this,
                preventDefault: function() {},
                stopPropagation: function() {}
            };
            
            // Trigger the statuseditor's onControlClick method
            statusEditorInstance.onControlClick(fakeEvent);
        });
        
        // Handle Assignee click
        $('.header-assignee-clickable').off('click.header-assignee').on('click.header-assignee', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Create a fake event object that mimics what statuseditor expects
            var fakeEvent = {
                currentTarget: this,
                preventDefault: function() {},
                stopPropagation: function() {}
            };
            
            // Trigger the statuseditor's onControlClick method
            statusEditorInstance.onControlClick(fakeEvent);
        });
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initHeaderClickHandlers);
    } else {
        initHeaderClickHandlers();
    }
    
    // Also try after delays to ensure statuseditor is initialized
    setTimeout(initHeaderClickHandlers, 500);
    setTimeout(initHeaderClickHandlers, 1000);
    
    // Re-initialize after AJAX updates
    $(document).on('ajaxUpdateComplete', function() {
        setTimeout(initHeaderClickHandlers, 200);
    });
    
    // Fix Send Invoice icon centering - Remove inline styles that interfere
    function fixSendInvoiceIconCentering() {
        var $ = window.jQuery || window.$;
        if (!$) {
            setTimeout(fixSendInvoiceIconCentering, 100);
            return;
        }
        
        $('.send-invoice-icon-btn i').each(function() {
            var $icon = $(this);
            var currentStyle = $icon.attr('style') || '';
            
            // Remove margin-related styles from inline style attribute
            currentStyle = currentStyle.replace(/margin[^;]*;?/gi, '');
            currentStyle = currentStyle.replace(/margin-right[^;]*;?/gi, '');
            currentStyle = currentStyle.replace(/margin-left[^;]*;?/gi, '');
            currentStyle = currentStyle.replace(/margin-top[^;]*;?/gi, '');
            currentStyle = currentStyle.replace(/margin-bottom[^;]*;?/gi, '');
            
            // Clean up any double semicolons
            currentStyle = currentStyle.replace(/;;+/g, ';').replace(/^;|;$/g, '');
            
            // Update or remove style attribute
            if (currentStyle.trim()) {
                $icon.attr('style', currentStyle);
            } else {
                $icon.removeAttr('style');
            }
            
            // Force our CSS values - Move icon down inside button
            $icon.css({
                'margin': '0',
                'margin-left': '0',
                'margin-right': '0',
                'margin-top': '5px',
                'margin-bottom': '0',
                'position': 'relative',
                'top': '4px'
            });
        });
        
        // Ensure button is centered and perfect square
        $('.send-invoice-icon-btn').css({
            'display': 'inline-flex',
            'align-items': 'center',
            'justify-content': 'center',
            'width': '40px',
            'height': '40px',
            'min-width': '40px',
            'min-height': '40px',
            'max-width': '40px',
            'max-height': '40px',
            'aspect-ratio': '1 / 1',
            'box-sizing': 'border-box',
            'margin': '8px auto 0 auto',
            'margin-top': '8px',
            'transform': 'translateY(0)',
            'padding': '0'
        });
    }
    
    // Run on page load
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', fixSendInvoiceIconCentering);
    } else {
        fixSendInvoiceIconCentering();
    }
    
    // Also run after delays to catch dynamically added elements
    setTimeout(fixSendInvoiceIconCentering, 300);
    setTimeout(fixSendInvoiceIconCentering, 800);
    
    // Re-run after AJAX updates
    $(document).on('ajaxUpdateComplete', function() {
        setTimeout(fixSendInvoiceIconCentering, 200);
    });
})();
</script>