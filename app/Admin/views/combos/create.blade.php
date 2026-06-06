<div class="row-fluid">
    {!! form_open([
        'id'     => 'edit-form',
        'role'   => 'form',
        'method' => 'POST',
    ]) !!}

    {!! $this->renderForm() !!}
    
    <!-- Combo Items Selection -->
    <div class="form-group">
        <label>Select Menu Items for Combo</label>
        <div class="row">
            <div class="col-md-6">
                <div class="panel panel-default" style="max-height: 400px; overflow-y: auto;">
                    <div class="panel-heading">
                        <h4>Available Menu Items</h4>
                    </div>
                    <div class="panel-body">
                        @if(isset($menuItems) && $menuItems->count() > 0)
                            <table class="table table-hover">
                                <thead>
                                    <tr>
                                        <th width="30">Select</th>
                                        <th>Item Name</th>
                                        <th>Price</th>
                                        <th>Qty</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    @foreach($menuItems as $item)
                                        <tr>
                                            <td>
                                                <input type="checkbox" 
                                                       class="combo-item-checkbox"
                                                       data-menu-id="{{ $item->menu_id }}"
                                                       data-menu-name="{{ $item->menu_name }}"
                                                       data-menu-price="{{ $item->menu_price }}">
                                            </td>
                                            <td>{{ $item->menu_name }}</td>
                                            <td>${{ number_format($item->menu_price, 2) }}</td>
                                            <td>
                                                <input type="hidden" 
                                                       name="ComboItems[{{ $item->menu_id }}][menu_id]" 
                                                       value="{{ $item->menu_id }}"
                                                       class="combo-item-hidden"
                                                       data-menu-id="{{ $item->menu_id }}"
                                                       disabled>
                                                <input type="number" 
                                                       name="ComboItems[{{ $item->menu_id }}][quantity]" 
                                                       value="1" 
                                                       min="1" 
                                                       class="form-control combo-quantity" 
                                                       style="width: 70px; display: none;"
                                                       data-menu-id="{{ $item->menu_id }}"
                                                       disabled>
                                            </td>
                                        </tr>
                                    @endforeach
                                </tbody>
                            </table>
                        @else
                            <p>No menu items available</p>
                        @endif
                    </div>
                </div>
            </div>
            <div class="col-md-6">
                <div class="panel panel-default">
                    <div class="panel-heading">
                        <h4>Selected Items</h4>
                    </div>
                    <div class="panel-body" id="selected-items-list">
                        <p class="text-muted">No items selected</p>
                    </div>
                </div>
            </div>
        </div>
    </div>

    {!! form_close() !!}
</div>

<style>
    .combo-item-checkbox:checked + td + td + td .combo-quantity {
        display: inline-block !important;
    }
    .btn-combi-ice-white {
        background-color: #f0f8ff !important;
        border-color: #d0e8ff !important;
        color: #2c3e50 !important;
        border-radius: 12px !important;
    }
    .btn-combi-ice-white:hover {
        background-color: #e0f0ff !important;
        border-color: #b0d8ff !important;
        color: #1a252f !important;
    }
</style>

<script>
document.addEventListener('DOMContentLoaded', function() {
    const checkboxes = document.querySelectorAll('.combo-item-checkbox');
    const selectedList = document.getElementById('selected-items-list');
    
    checkboxes.forEach(function(checkbox) {
        checkbox.addEventListener('change', function() {
            const menuId = this.dataset.menuId;
            const quantityInput = document.querySelector('.combo-quantity[data-menu-id="' + menuId + '"]');
            const hiddenInput = document.querySelector('.combo-item-hidden[data-menu-id="' + menuId + '"]');
            
            if (this.checked) {
                quantityInput.style.display = 'inline-block';
                quantityInput.removeAttribute('disabled');
                if (hiddenInput) hiddenInput.removeAttribute('disabled');
            } else {
                quantityInput.style.display = 'none';
                quantityInput.setAttribute('disabled', 'disabled');
                if (hiddenInput) hiddenInput.setAttribute('disabled', 'disabled');
            }
            updateSelectedItems();
        });
    });
    
    function updateSelectedItems() {
        const selected = [];
        checkboxes.forEach(function(checkbox) {
            if (checkbox.checked) {
                const quantity = document.querySelector('.combo-quantity[data-menu-id="' + checkbox.dataset.menuId + '"]').value;
                selected.push({
                    name: checkbox.dataset.menuName,
                    quantity: quantity
                });
            }
        });
        
        if (selected.length > 0) {
            let html = '<ul class="list-group">';
            selected.forEach(function(item) {
                html += '<li class="list-group-item">' + item.name + ' (Qty: ' + item.quantity + ')</li>';
            });
            html += '</ul>';
            selectedList.innerHTML = html;
        } else {
            selectedList.innerHTML = '<p class="text-muted">No items selected</p>';
        }
    }
    
    // Update on quantity change
    document.querySelectorAll('.combo-quantity').forEach(function(input) {
        input.addEventListener('change', updateSelectedItems);
    });
});
</script>

