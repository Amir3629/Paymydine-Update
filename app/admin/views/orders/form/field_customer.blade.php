<div class="customer-card-content" data-order-id="{{ $formModel->order_id }}" data-edit-url="{{ admin_url('orders/edit/') }}" style="width: 100%;">
    <h6 class="customer-card-title" style="font-size: 14px; font-weight: 700; margin-bottom: 8px;">@lang($field->label)</h6>
    <div class="customer-info" style="font-size: 13px; padding-bottom: 6px;">
        @if ($formModel->customer)
            <a href="{{ admin_url('customers/preview/'.$formModel->customer_id) }}" style="font-weight: normal; color: #364a63;">{{ $formModel->customer_name }}</a>
        @else
            <span style="font-weight: normal; color: #364a63;">{{ $formModel->customer_name }}</span>
        @endif
    </div>
    
    <div class="customer-info editable-field" style="font-size: 13px; padding-bottom: 6px; color: #526484; position: relative;">
        <div class="editable-display">
            <i class="fa fa-envelope fa-fw text-muted" style="font-size: 12px;"></i>&nbsp;
            <span class="editable-value" data-field="email">{{ $formModel->email }}</span>
            <button type="button" class="btn-edit-inline" data-field-type="email" onclick="return handleEditField(this);" style="display: inline-block; margin-left: 6px; background: none; border: none; color: #8094ae; font-size: 11px; cursor: pointer; padding: 0 2px; z-index: 10; pointer-events: auto; vertical-align: middle;" title="Edit email">
                <i class="fa fa-pencil"></i>
            </button>
        </div>
        <div class="editable-edit" style="display: none;">
            <input type="email" class="form-control form-control-sm editable-input" value="{{ $formModel->email }}" data-field="email" data-order-id="{{ $formModel->order_id }}" style="font-size: 12px; padding: 2px 5px; height: 24px;">
            <button type="button" class="btn-save-inline" onclick="return handleSaveField(this);" style="background: #08815e; color: white; border: none; padding: 1px 4px; font-size: 9px; cursor: pointer; margin-left: 4px; border-radius: 3px; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; vertical-align: middle;" title="Save">
                <i class="fa fa-check" style="font-size: 8px;"></i>
            </button>
            <button type="button" class="btn-cancel-inline" onclick="return handleCancelEdit(this);" style="background: #dc3545; color: white; border: none; padding: 1px 4px; font-size: 9px; cursor: pointer; margin-left: 2px; border-radius: 3px; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; vertical-align: middle;" title="Cancel">
                <i class="fa fa-times" style="font-size: 8px;"></i>
            </button>
        </div>
    </div>
    
    @if ($formModel->telephone || true)
        <div class="customer-info editable-field" style="font-size: 13px; padding-bottom: 6px; color: #526484; position: relative;">
            <div class="editable-display">
                <i class="fa fa-phone fa-fw text-muted" style="font-size: 12px;"></i>&nbsp;
                <span class="editable-value" data-field="telephone">{{ $formModel->telephone ?: 'N/A' }}</span>
                <button type="button" class="btn-edit-inline" data-field-type="telephone" onclick="return handleEditField(this);" style="display: inline-block; margin-left: 6px; background: none; border: none; color: #8094ae; font-size: 11px; cursor: pointer; padding: 0 2px; z-index: 10; pointer-events: auto; vertical-align: middle;" title="Edit phone">
                    <i class="fa fa-pencil"></i>
                </button>
            </div>
            <div class="editable-edit" style="display: none;">
                <input type="text" class="form-control form-control-sm editable-input" value="{{ $formModel->telephone }}" data-field="telephone" data-order-id="{{ $formModel->order_id }}" style="font-size: 12px; padding: 2px 5px; height: 24px;">
                <button type="button" class="btn-save-inline" onclick="return handleSaveField(this);" style="background: #08815e; color: white; border: none; padding: 1px 4px; font-size: 9px; cursor: pointer; margin-left: 4px; border-radius: 3px; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; vertical-align: middle;" title="Save">
                    <i class="fa fa-check" style="font-size: 8px;"></i>
                </button>
                <button type="button" class="btn-cancel-inline" onclick="return handleCancelEdit(this);" style="background: #dc3545; color: white; border: none; padding: 1px 4px; font-size: 9px; cursor: pointer; margin-left: 2px; border-radius: 3px; width: 20px; height: 20px; display: inline-flex; align-items: center; justify-content: center; vertical-align: middle;" title="Cancel">
                    <i class="fa fa-times" style="font-size: 8px;"></i>
                </button>
            </div>
        </div>
    @endif
    
    @if ($formModel->isDeliveryType() && $formModel->address)
        <div class="customer-info" style="font-size: 13px; padding-top: 8px; border-top: 1px solid #f5f6fa; margin-top: 8px;">
            <h6 style="font-size: 13px; font-weight: 600; margin-bottom: 4px; color: #526484;">@lang('admin::lang.orders.label_delivery_address')</h6>
            <div style="font-size: 12px; color: #8094ae; line-height: 1.4;">
                {{ format_address($formModel->address->toArray()) }}
            </div>
        </div>
    @endif
</div>

<style>
/* Customer card - smooth and extended */
.customer-card-content {
    width: 100%;
    max-width: 100%;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    padding: 0;
    margin: 0;
    display: block;
}

.customer-card-title {
    transition: color 0.2s ease;
    margin-bottom: 10px !important;
}

.customer-info {
    transition: all 0.2s ease;
    padding: 6px 0 !important;
    line-height: 1.5;
}

.customer-info:hover {
    background-color: rgba(241, 244, 251, 0.5);
    border-radius: 4px;
    padding-left: 4px !important;
    padding-right: 4px !important;
}

.editable-field {
    min-height: 20px;
    transition: all 0.2s ease;
    border-radius: 4px;
}

.editable-display {
    position: relative;
    transition: opacity 0.2s ease;
}

.editable-edit {
    animation: slideIn 0.2s ease-out;
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateY(-5px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.btn-edit-inline {
    transition: all 0.2s ease;
    opacity: 0.6;
}

.btn-edit-inline:hover {
    color: #364a63 !important;
    opacity: 1;
    transform: scale(1.1);
}

.editable-input {
    display: inline-block;
    width: calc(100% - 50px);
    transition: all 0.2s ease;
    border-radius: 4px;
}

.editable-input:focus {
    border-color: #08815e !important;
    box-shadow: 0 0 0 2px rgba(8, 129, 94, 0.1) !important;
}

/* Inline edit buttons - compact and elegant */
.btn-save-inline,
.btn-cancel-inline {
    transition: all 0.2s ease;
    box-shadow: 0 1px 3px rgba(0,0,0,0.12);
}

.btn-save-inline:hover {
    background: #0bb87a !important;
    box-shadow: 0 2px 4px rgba(8, 129, 94, 0.25);
    transform: translateY(-1px) scale(1.05);
}

.btn-cancel-inline:hover {
    background: #c82333 !important;
    box-shadow: 0 2px 4px rgba(220, 53, 69, 0.25);
    transform: translateY(-1px) scale(1.05);
}

.btn-save-inline:active,
.btn-cancel-inline:active {
    transform: translateY(0) scale(1);
    box-shadow: 0 1px 2px rgba(0,0,0,0.15);
}
</style>

<script>
(function() {
    'use strict';
    
    // Function to handle edit button click
    window.handleEditField = function(button) {
        var $ = window.jQuery || window.$;
        if (!$) {
            console.error('jQuery not loaded');
            return false;
        }
        
        var $btn = $(button);
        var $field = $btn.closest('.editable-field');
        if (!$field.length) return false;
        
        $field.find('.editable-display').hide();
        $field.find('.editable-edit').show();
        
        setTimeout(function() {
            $field.find('.editable-input').focus().select();
        }, 50);
        
        return false;
    };
    
    // Function to handle cancel button click
    window.handleCancelEdit = function(button) {
        var $ = window.jQuery || window.$;
        if (!$) return false;
        
        var $btn = $(button);
        var $field = $btn.closest('.editable-field');
        if (!$field.length) return false;
        
        var $displayValue = $field.find('.editable-value');
        var originalValue = $displayValue.text().trim();
        $field.find('.editable-input').val(originalValue === 'N/A' ? '' : originalValue);
        $field.find('.editable-edit').hide();
        $field.find('.editable-display').show();
        
        return false;
    };
    
    // Function to handle save button click
    window.handleSaveField = function(button) {
        var $ = window.jQuery || window.$;
        if (!$) {
            alert('jQuery not loaded');
            return false;
        }
        
        var $saveBtn = $(button);
        var $field = $saveBtn.closest('.editable-field');
        if (!$field.length) return false;
        
        var $input = $field.find('.editable-input');
        var fieldName = $input.data('field');
        var orderId = $input.data('order-id');
        var newValue = $input.val().trim();
        var $displayValue = $field.find('.editable-value');
        
        // Validate email format
        if (fieldName === 'email' && newValue && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newValue)) {
            alert('Please enter a valid email address');
            return false;
        }
        
        if (!orderId) {
            alert('Order ID not found');
            return false;
        }
        
        // Show loading
        $saveBtn.html('<i class="fa fa-spinner fa-spin"></i>').prop('disabled', true);
        
        // Use current page URL since we're already on the edit page
        var editUrl = window.location.pathname;
        
        $.ajax({
            url: editUrl,
            method: 'POST',
            data: {
                field: fieldName,
                value: newValue,
                recordId: orderId
            },
            headers: {
                'X-Requested-With': 'XMLHttpRequest',
                'X-IGNITER-REQUEST-HANDLER': 'onUpdateField'
            },
            success: function(response) {
                // Update flash message if provided
                if (response && response['#notification']) {
                    $('#notification').html(response['#notification']);
                }
                
                // Update the display value
                var displayValue = newValue || (fieldName === 'telephone' ? 'N/A' : '');
                $displayValue.text(displayValue);
                $field.find('.editable-edit').hide();
                $field.find('.editable-display').show();
                $saveBtn.html('<i class="fa fa-check"></i>').prop('disabled', false);
            },
            error: function(xhr, status, error) {
                var errorMsg = 'Failed to update. Please try again.';
                
                // Try to get error from response
                if (xhr.responseJSON) {
                    if (xhr.responseJSON.error) {
                        errorMsg = xhr.responseJSON.error;
                    } else if (xhr.responseJSON.message) {
                        errorMsg = xhr.responseJSON.message;
                    }
                } else if (xhr.responseText) {
                    try {
                        var errorResponse = JSON.parse(xhr.responseText);
                        if (errorResponse.error) {
                            errorMsg = errorResponse.error;
                        } else if (errorResponse.message) {
                            errorMsg = errorResponse.message;
                        }
                    } catch(e) {
                        // If not JSON, might be HTML error page
                        if (xhr.status === 500) {
                            errorMsg = 'Server error occurred. Please check the server logs.';
                        }
                    }
                }
                
                console.error('AJAX Error:', {
                    status: xhr.status,
                    statusText: xhr.statusText,
                    error: error,
                    response: xhr.responseText
                });
                
                alert(errorMsg + '\n\nStatus: ' + xhr.status + ' ' + xhr.statusText);
                $saveBtn.html('<i class="fa fa-check"></i>').prop('disabled', false);
            }
        });
        
        return false;
    };
    
    // Initialize with jQuery event handlers (backup method)
    function initEditableFields() {
        var $ = window.jQuery || window.$;
        if (!$) {
            setTimeout(initEditableFields, 100);
            return;
        }
        
        // Use event delegation with higher priority
        $(document).off('click', '.btn-edit-inline').on('click', '.btn-edit-inline', function(e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return window.handleEditField(this);
        });
        
        $(document).off('click', '.btn-cancel-inline').on('click', '.btn-cancel-inline', function(e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return window.handleCancelEdit(this);
        });
        
        $(document).off('click', '.btn-save-inline').on('click', '.btn-save-inline', function(e) {
            e.preventDefault();
            e.stopPropagation();
            e.stopImmediatePropagation();
            return window.handleSaveField(this);
        });
        
        // Keyboard shortcuts
        $(document).off('keydown', '.editable-input').on('keydown', '.editable-input', function(e) {
            if (e.which === 13) { // Enter
                e.preventDefault();
                e.stopPropagation();
                $(this).closest('.editable-edit').find('.btn-save-inline').click();
                return false;
            } else if (e.which === 27) { // Escape
                e.preventDefault();
                e.stopPropagation();
                $(this).closest('.editable-edit').find('.btn-cancel-inline').click();
                return false;
            }
        });
    }
    
    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initEditableFields);
    } else {
        setTimeout(initEditableFields, 100);
    }
    
    // Also try after a delay to ensure jQuery is loaded
    setTimeout(initEditableFields, 500);
})();
</script>
