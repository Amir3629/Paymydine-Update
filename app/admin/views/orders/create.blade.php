@php
  // Derive current admin locationId (pick what your page already has; default to 1)
  $locationId = $locationId ?? 1;
  
  // Use the utility function to build the cashier URL
  $cashierUrl = buildCashierTableUrl($locationId);
  if (!$cashierUrl) {
    $cashierUrl = '#';
  }
@endphp

<style>
/* Cashier square override */
#cashierButton .table-square {
    border-radius: 18px !important;
    border: 2px solid #36a269;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 15px;
    width: 150px !important;
    height: 150px !important;
    min-width: 150px !important;
    min-height: 150px !important;
    max-width: 150px !important;
    max-height: 150px !important;
    background: #fff;
    flex-direction: column;
}
#cashierButton .table-square i {
    font-size: 32px !important;
    margin-bottom: 8px;
}
#cashierButton .table-label {
    display: inline-block;
    font-weight: 700;
    font-size: 16px !important;
    line-height: 1.2;
    margin-left: 0;
    margin-top: 4px;
}

/* Standard Admin Page Header Styling */
.page-header {
    background: transparent;
    border: none;
    padding: 1rem 1.5rem;
    margin-bottom: 0.5rem;
}

/* Center title in the top navbar header on this page */
.navbar-top .container-fluid { position: relative !important; }
.navbar-top .page-title {
    position: absolute !important;
    left: 50% !important;
    transform: translateX(-50%) !important;
    text-align: center !important;
    margin: 0 !important;
}

.page-header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
}

.page-title h4 {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 600;
    color: #495057;
}

.page-title {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    margin-left: -0.25rem !important;
    padding-left: 0 !important;
}

.page-header-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
}

.selected-table-info {
    display: flex;
    align-items: center;
    gap: 0.5rem;
}

.badge.badge-primary {
    background: rgb(241, 244, 251) !important;
    color: rgb(32, 41, 56) !important;
    font-weight: 600;
    font-size: 14px !important;
    padding: 0.55rem 1.75rem;
    border-radius: 12px;
    border: 1px solid rgb(201, 210, 227) !important;
    box-shadow: none !important;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-height: 40px;
    height: 40px;
    line-height: 1.4;
    white-space: normal;
}

.badge.badge-primary span {
    color: rgb(32, 41, 56) !important;
    font-size: 14px !important;
    white-space: normal;
}

.table-status-badge {
    font-size: 0.75rem;
    padding: 0.25rem 0.75rem;
    border-radius: 1rem;
    font-weight: 600;
}

/* Back to Tables Button - Override for Standard Size with nice rounded corners */
#back-to-tables.btn-primary {
    padding: 0.55rem 1.75rem !important;
    font-size: 14px !important;
    min-height: 40px !important;
    height: 40px !important;
    border-radius: 12px !important;
    background: linear-gradient(135deg, #364a63 0%, #364a63 100%) !important;
    border: 1px solid #364a63 !important;
    color: #ffffff !important;
    font-weight: 600 !important;
    text-decoration: none !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    text-align: center !important;
    vertical-align: middle !important;
    cursor: pointer !important;
    user-select: none !important;
    white-space: nowrap !important;
    line-height: 1.3 !important;
    transition: all 0.3s ease !important;
    box-shadow: 0 2px 4px rgba(8, 129, 94, 0.2) !important;
    margin-left: 0 !important;
    margin-right: 0 !important;
}

#back-to-tables.btn-primary:hover {
    background: linear-gradient(135deg, #364a63 0%, #526484 100%) !important;
    transform: translateY(-2px) !important;
    box-shadow: 0 4px 12px rgba(8, 129, 94, 0.3) !important;
    border-color: #364a63 !important;
    color: #ffffff !important;
}

#back-to-tables.btn-primary i {
    margin-right: 8px !important;
}

/* Make the Edit Layout button larger like other prominent buttons */
#edit-layout-btn {
    padding: 0.55rem 1.75rem !important;
    font-size: 14px !important;
    min-height: 40px !important;
    height: 40px !important;
    border-radius: 12px !important;
    font-weight: 600 !important;
    background: rgb(241, 244, 251) !important;
    border: 1px solid rgb(201, 210, 227) !important;
    color: rgb(32, 41, 56) !important;
    box-shadow: none !important;
    line-height: 1.3 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
}
#edit-layout-btn .fa { margin-right: 6px; }

/* Override any Bootstrap or other CSS that might affect these buttons */
#edit-layout-btn.btn-outline-secondary,
#edit-layout-btn.btn-outline-secondary:hover,
#edit-layout-btn.btn-outline-secondary:focus,
#edit-layout-btn.btn-outline-secondary:active,
#edit-layout-btn.btn-outline-secondary.active {
    background: rgb(241, 244, 251) !important;
    border-color: rgb(201, 210, 227) !important;
    color: rgb(32, 41, 56) !important;
    box-shadow: none !important;
}

/* Category Buttons - Match Allergens button style with oval/elliptical shape */
.category-btn {
    background: rgb(241, 244, 251) !important;
    border: 1px solid rgb(201, 210, 227) !important;
    color: rgb(32, 41, 56) !important;
    padding: 0.55rem 1.75rem !important;
    border-radius: 50px !important; /* Oval/elliptical shape - almost circular */
    font-weight: 600 !important;
    font-size: 14px !important;
    transition: all 0.3s ease !important;
    box-shadow: none !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 8px !important;
    line-height: 1.3 !important;
    min-height: 40px !important;
    height: 40px !important;
    white-space: nowrap !important;
}

.category-btn:hover {
    background: rgb(241, 244, 251) !important;
    border-color: rgb(201, 210, 227) !important;
    color: rgb(32, 41, 56) !important;
    box-shadow: 0 2px 8px rgba(44, 62, 80, 0.15) !important;
    transform: scale(1.05) !important;
}

.category-btn.active {
    background: rgb(241, 244, 251) !important;
    border-color: rgb(201, 210, 227) !important;
    color: rgb(32, 41, 56) !important;
    box-shadow: 0 2px 8px rgba(44, 62, 80, 0.15) !important;
    transform: scale(1.05) !important;
}

.category-btn::before {
    display: none !important;
}

.category-btn:hover::before {
    display: none !important;
}

/* Remove frame/container background from category filter container */
.category-filter-container {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
    margin-bottom: 20px !important;
    border-radius: 0 !important;
}

.category-filter-container::before {
    display: none !important;
}

.category-filter-container > * {
    position: static !important;
    z-index: auto !important;
}

.zoom-btn {
    width: 36px !important;
    height: 36px !important;
    padding: 0 !important;
    font-size: 14px !important;
    line-height: 1.3 !important;
    border-radius: 12px !important;
    border: 1px solid rgb(201, 210, 227) !important;
    background: rgb(241, 244, 251) !important;
    color: rgb(32, 41, 56) !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    cursor: pointer !important;
    transition: all 0.3s ease !important;
    box-shadow: none !important;
    font-weight: 600 !important;
}

.zoom-btn:hover {
    background: rgb(241, 244, 251) !important;
    border-color: rgb(201, 210, 227) !important;
    color: rgb(32, 41, 56) !important;
    box-shadow: none !important;
    transform: none !important;
}

.zoom-level-indicator {
    font-size: 12px !important;
    font-weight: 600 !important;
    color: #495057 !important;
    padding: 4px 8px !important;
    background: #f8f9fa !important;
    border-radius: 4px !important;
    border: 1px solid #dee2e6 !important;
}

.zoom-controls {
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
}

/* Responsive adjustments */
@media (max-width: 768px) {
    .page-header-content {
        flex-direction: column;
        align-items: flex-start;
    }
    
    .page-header-actions {
        width: 100%;
        justify-content: flex-start;
    }
    
    .zoom-btn {
        width: 32px !important;
        height: 32px !important;
        padding: 0 !important;
        font-size: 12px !important;
        line-height: 32px !important;
    }
}
</style>

<meta name="csrf-token" content="{{ csrf_token() }}">

<!-- Standard Admin Page Header -->
<div class="page-header">
    <div class="page-header-content">
        <div class="page-title">
            <button type="button" id="back-to-tables" class="btn btn-primary" style="display: none;">
                <i class="fa fa-arrow-left"></i> Back to Orders
            </button>
        </div>
        <div class="page-header-actions">
            <div class="header-controls" style="display: none;" id="header-controls">
                <div class="zoom-controls">
                    <div class="zoom-level-indicator" id="zoom-level">100%</div>
                    <button type="button" class="zoom-btn" id="zoom-in" style="opacity: 1 !important; cursor: pointer; pointer-events: auto !important; display: inline-block !important; visibility: visible !important; position: relative !important; z-index: 99999 !important;" aria-label="Zoom In (Ctrl + Scroll Up)" data-bs-original-title="Zoom In (Ctrl + Scroll Up)">
                        <i class="fa fa-plus"></i>
                    </button>
                    <button type="button" class="zoom-btn" id="zoom-out" style="opacity: 1 !important; cursor: pointer; pointer-events: auto !important; display: inline-block !important; visibility: visible !important; position: relative !important; z-index: 99999 !important;" aria-label="Zoom Out (Ctrl + Scroll Down)" data-bs-original-title="Zoom Out (Ctrl + Scroll Down)">
                        <i class="fa fa-minus"></i>
                    </button>
                    <button type="button" class="zoom-btn" id="reset-zoom" style="pointer-events: auto !important; display: inline-block !important; visibility: visible !important; opacity: 1 !important; position: relative !important; z-index: 99999 !important;" aria-label="Reset View" data-bs-original-title="Reset View">
                        <i class="fa fa-home"></i>
                    </button>
                </div>
                <button type="button" id="edit-layout-btn" class="btn btn-outline-secondary btn-sm" style="pointer-events: auto !important; display: inline-block !important; visibility: visible !important; opacity: 1 !important; position: relative !important; z-index: 99999 !important;">
                    <i class="fa fa-edit"></i> Edit Layout
                </button>
                <button type="button" id="move-table-btn" class="btn btn-outline-primary btn-sm" style="pointer-events: auto !important; display: inline-block !important; visibility: visible !important; opacity: 1 !important; position: relative !important; z-index: 99999 !important;">
                    <i class="fa fa-exchange-alt"></i> Move Table
                </button>
            </div>
            <div id="selected-table-info" class="selected-table-info" style="display: none;">
                <span class="badge badge-primary"><span>Table&nbsp;</span><span id="current-table-name"></span><span>&nbsp;-&nbsp;</span><span id="table-status-badge-text">Available</span></span>
                <!-- Hidden elements for JavaScript to access -->
                <span id="current-table-id" style="display: none;"></span>
                <span id="current-table-no" style="display: none;"></span>
                <div class="table-status-badge" id="table-status-badge" style="display: none;"></div>
            </div>
        </div>
    </div>
</div>
<div class="row-fluid">
    {!! form_open([
    'id' => 'edit-form',
    'role' => 'form',
    'method' => 'POST',
]) !!}
    
    <!-- Hidden fields for order processing -->
    <input type="hidden" name="order_id" id="existing-order-id" value="{{ $existingOrder->order_id ?? '' }}">
    <input type="hidden" name="table_id" id="selected-table" value="{{ $existingOrder->table_id ?? '' }}">
    <input type="hidden" name="menu_id[]" id="menu-ids" value="">
    <input type="hidden" name="menu_price[]" id="menu-prices" value="">
    <input type="hidden" name="qty[]" id="menu-quantities" value="">
    <input type="hidden" name="menu_name[]" id="menu-names" value="">
    <input type="hidden" name="payment_method" id="payment-method-input" value="{{ $existingOrder->payment ?? 'cod' }}">
    <input type="hidden" name="tax_amount" id="tax-amount-input" value="0">
    <input type="hidden" name="tip_amount" id="tip-amount-input" value="0">
    <input type="hidden" name="coupon_code" id="coupon-code-input" value="">
    <input type="hidden" name="coupon_discount" id="coupon-discount-input" value="0">
    <?php

use Admin\Models\Orders_model;
use Admin\Models\Menus_model;
use Illuminate\Support\Facades\DB;
use Igniter\Flame\Cart\CartItem;
use Igniter\Flame\Cart\CartContent;
use Admin\Models\Menus_model as mn;

if ($_SERVER["REQUEST_METHOD"] == "POST") {
    $menu_option_totals = [];
    if (isset($_POST['menu_options']) && is_array($_POST['menu_options'])) {
        foreach ($_POST['menu_options'] as $menu_key => $option_values) {
            $total_price = DB::table('menu_option_values')
                ->whereIn('option_value_id', $option_values)
                ->sum('price');
            $menu_option_totals[$menu_key] = $total_price;
        }
    }
    $table_id = $_POST['table_id'];
    $menu_ids = $_POST['menu_id'] ?? [];
    $menu_prices = $_POST['menu_price'] ?? [];
    $quantities = $_POST['qty'] ?? [];
    $menu_names = $_POST['menu_name'] ?? [];
    
    // Handle combos - save them as special entries
    // IMPORTANT: Aggregate combos by ID to prevent duplicates
    $combo_entries = [];
    $combo_aggregated = []; // Temporary aggregation to combine duplicates
    
    if (isset($_POST['combo_id']) && is_array($_POST['combo_id'])) {
        $combo_ids = $_POST['combo_id'];
        $combo_qtys = $_POST['combo_qty'] ?? [];
        
        // First pass: aggregate combos by ID to prevent duplicates
        foreach ($combo_ids as $key => $combo_id) {
            if (empty($combo_id) || !is_numeric($combo_id)) {
                continue; // Skip invalid combo IDs
            }
            
            $combo_id = intval($combo_id);
            $combo_qty = isset($combo_qtys[$key]) ? intval($combo_qtys[$key]) : 1;
            
            if (!isset($combo_aggregated[$combo_id])) {
            $combo = \Admin\Models\Menu_combos_model::with('combo_items.menu')->find($combo_id);
            if ($combo) {
                    $combo_aggregated[$combo_id] = [
                    'combo_id' => $combo_id,
                    'combo_name' => $combo->combo_name,
                    'combo_price' => $combo->combo_price,
                        'quantity' => 0,
                    'items' => $combo->combo_items->map(function($item) {
                        return $item->menu ? $item->menu->menu_name . ($item->quantity > 1 ? ' (x' . $item->quantity . ')' : '') : '';
                    })->filter()->implode(', ')
                ];
            }
        }
            
            // Aggregate quantity
            if (isset($combo_aggregated[$combo_id])) {
                $combo_aggregated[$combo_id]['quantity'] += $combo_qty;
            }
        }
        
        // Second pass: convert aggregated data to entries array (one entry per unique combo)
        $combo_entries = array_values($combo_aggregated);
    }
    
    $total_price = 0;
    $total_qty = 0;
    $first_name = 'Chief';
    $last_name = 'Admin';
    $email = 'chiefadmin@example.com';
    $telephone = '1234567890';
    $location_id = 1;
    $address_id = 1;
    $payment = $_POST['payment_method'] ?? 'cod';
    
    // Get tax, tip, and coupon from POST
    $tax_amount = floatval($_POST['tax_amount'] ?? 0);
    $tip_amount = floatval($_POST['tip_amount'] ?? 0);
    $coupon_code = $_POST['coupon_code'] ?? null;
    $coupon_discount = floatval($_POST['coupon_discount'] ?? 0);
    $order_time = now();
    $order_date = now()->toDateString();
    $status_id = 1;
    $ip_address = $_SERVER['REMOTE_ADDR'];
    $user_agent = $_SERVER['HTTP_USER_AGENT'];
    $invoice_prefix = 'INV-2025-00';
    $order_time_is_asap = 1;
    $processed = 1;
    $status_updated_at = date('Y-m-d H:i:s');
    $assignee_updated_at = date('Y-m-d H:i:s');
    $invoice_date = date('Y-m-d H:i:s');
    
    // Check if updating existing order
    $existing_order_id = isset($_POST['order_id']) ? (int)$_POST['order_id'] : null;
    $is_updating = $existing_order_id && $existing_order_id > 0;
    
    if ($is_updating) {
        // Update existing order
        $order = Orders_model::find($existing_order_id);
        if (!$order) {
            echo '<div id="notification"><div class="alert alert-danger flash-message animated fadeInDown alert-dismissible show" data-allow-dismiss="true" role="alert">Order not found.<button type="button" class="btn-close" data-bs-dismiss="alert" aria-hidden="true"></button></div></div>';
            exit;
        }
        
        // Update order basic info
        $order->payment = $payment;
        $order->order_type = $table_id;
        $order->updated_at = now();
    } else {
        // Create new order
        $order = new Orders_model();
        $order->first_name = $first_name;
        $order->last_name = $last_name;
        $order->email = $email;
        $order->telephone = $telephone;
        $order->location_id = $location_id;
        $order->address_id = $address_id;
        $order->payment = $payment;
        $order->ms_order_type = 0;
        $order->order_time = $order_time;
        $order->order_date = $order_date;
        $order->status_id = $status_id;
        $order->ip_address = $ip_address;
        $order->user_agent = $user_agent;
        $order->invoice_prefix = $invoice_prefix;
        $order->order_time_is_asap = $order_time_is_asap;
        $order->processed = $processed;
        $order->order_type = $table_id;
        $order->created_at = now();
        $order->updated_at = now();
    }
    $order->first_name = $first_name;
    $order->last_name = $last_name;
    $order->email = $email;
    $order->telephone = $telephone;
    $order->location_id = $location_id;
    $order->address_id = $address_id;
    $order->payment = $payment;
    // $order->total_items = $_POST['qty'];
    $order->ms_order_type = 0;
    $order->order_time = $order_time;
    $order->order_date = $order_date;
    $order->status_id = $status_id;
    $order->ip_address = $ip_address;
    $order->user_agent = $user_agent;
    $order->invoice_prefix = $invoice_prefix;
    $order->order_time_is_asap = $order_time_is_asap;
    $order->processed = $processed;
    //var_dump($table_id);
    //die;
    $order->order_type = $table_id;
    // $order->order_total = $menu_price * $qty;
    $cart = new CartContent();

foreach ($menu_ids as $key => $menu_id) {
    // Retrieve the actual menu item from the database
    $menuItem = mn::find($menu_id);
    if (!$menuItem) {
        continue; // Skip if the menu item doesn't exist
    }

    // Pass the correct dynamic values
    $cartItem = new CartItem($menu_id, $menuItem->menu_name, $menuItem->menu_price);
    $cartItem->rowId = uniqid();
    $cartItem->qty = $quantities[$key] ?? 1; // Default to 1 if quantity is missing

    // Add to cart
    $cart->add($cartItem);
}

// Note: We're not using the cart object for the order, just for reference

  //  $order->cart = 'O:30:"Igniter\Flame\Cart\CartContent":2:{s:8:"';
    foreach ($menu_ids as $key => $menu_id) {
        $price = floatval($menu_prices[$key]);
        $qty = intval($quantities[$key]);
        $total_price += ($price * $qty);
        $total_qty += $qty;
    }
    
    
    // Add all menu options prices to the order total
    $total_options_price = 0;
    foreach ($menu_option_totals as $menu_id => $option_total) {
        $total_options_price += floatval($option_total);
    }
    
    // Add combo prices to totals before saving order
    foreach ($combo_entries as $combo_entry) {
        $total_price += ($combo_entry['combo_price'] * $combo_entry['quantity']);
        $total_qty += $combo_entry['quantity'];
    }
    
    $order->created_at = now();
    $order->updated_at = now();
    $order->total_items = $total_qty;
    // Order total will be calculated after we get tax, tip, and discount
    // For now, set to subtotal (will be updated later)
    // Order total will be calculated after we get tax, tip, and discount
    // For now, set to subtotal (will be updated later)
    $order->order_total = $total_price + $total_options_price;
    $order->save();
    $last_order_id = $order->order_id;
    
    // If updating, delete existing order items first
    if ($is_updating) {
        // Delete existing order menu options
        DB::table('order_menu_options')
            ->where('order_id', $last_order_id)
            ->delete();
        
        // Delete existing order menus
        DB::table('order_menus')
            ->where('order_id', $last_order_id)
            ->delete();
        
        // Delete existing order totals (except we'll recreate them)
        DB::table('order_totals')
            ->where('order_id', $last_order_id)
            ->delete();
    }

    $order_menu = new \Admin\Models\Menus_model();

    foreach ($menu_ids as $key => $menu_id) {
        $price = floatval($menu_prices[$key]);
        $qty = intval($quantities[$key]);
    $subtotal = $price * $qty;
    $option_total = $menu_option_totals[$menu_id] ?? 0.0000;
    $final_subtotal = $subtotal + $option_total;
        DB::table('order_menus')->insert([
            'order_id' => $last_order_id,
            'menu_id' => $menu_id,
            'name' => $menu_names[$key],
            'quantity' => $qty,
            'price' => $price,
            'subtotal' => $final_subtotal,
            'option_values' => json_encode([]), // Empty options for now
        ]);
    }
    
    // Save combo items to order_menus - save as single combo entry (not expanded)
    // IMPORTANT: Combos are already aggregated above, so each combo_id appears only once
    foreach ($combo_entries as $combo_entry) {
        // Only save if quantity > 0
        if ($combo_entry['quantity'] <= 0) {
            continue;
        }
        
        $combo_subtotal = $combo_entry['combo_price'] * $combo_entry['quantity'];
        DB::table('order_menus')->insert([
            'order_id' => $last_order_id,
            'menu_id' => 0, // Use 0 for combos since they don't have a single menu_id
            'name' => $combo_entry['combo_name'],
            'quantity' => $combo_entry['quantity'],
            'price' => $combo_entry['combo_price'],
            'subtotal' => $combo_subtotal,
            'option_values' => json_encode(['combo_id' => $combo_entry['combo_id'], 'items' => $combo_entry['items']]),
        ]);
    }


    if (isset($_POST['menu_options']) && is_array($_POST['menu_options'])) {

    foreach ($_POST['menu_options'] as $menu_key => $option_values) {
        $menu_id = in_array($menu_key, $menu_ids) ? $menu_key : null;

        if ($menu_id === null) {
            continue; // Skip if menu_id is not found
        }

        $order_menu_id = DB::table('order_menus')
            ->where('order_id', $last_order_id)
            ->where('menu_id', $menu_id)
            ->value('order_menu_id');

        // Remove duplicates from option values array
        $option_values = array_unique($option_values);
        
        foreach ($option_values as $value_id) {
            $option = DB::table('menu_option_values')
                ->where('option_value_id', $value_id)
                ->first();

            if ($option) {
                // Get the menu_option_id from menu_item_options table
                $menuItemOption = DB::table('menu_item_options')
                    ->where('menu_id', $menu_id)
                    ->where('option_id', $option->option_id)
                    ->first();
                
                // Check if this exact option already exists for this order menu to prevent duplicates
                $existingOption = DB::table('order_menu_options')
                    ->where('order_id', $last_order_id)
                    ->where('order_menu_id', $order_menu_id)
                    ->where('menu_option_value_id', $option->option_value_id)
                    ->exists();
                
                if (!$existingOption) {
                    DB::table('order_menu_options')->insert([
                        'order_id' => $last_order_id,
                        'menu_id' => $menu_id,
                        'quantity' => $quantities[$menu_id] ?? 1,
                        'order_menu_id' => $order_menu_id,
                        'order_option_name' => $option->value,
                        'order_option_price' => $option->price,
                        'menu_option_value_id' => $option->option_value_id,
                        'order_menu_option_id' => $menuItemOption ? $menuItemOption->menu_option_id : $option->option_id
                    ]);
                }
            }
        }
    }
    }





    // if (!empty($_POST['menu_options'])) {
    //     $menuIndex = 0;
    //     foreach ($_POST['menu_options'] as $menu_key => $option_values) {
    //         if (!isset($menu_ids[$menuIndex])) {
    //             break;
    //         }
    //         $current_menu_id = $menu_ids[$menuIndex];
    //         $order_menu_id = DB::table('order_menus')
    //             ->where('order_id', $last_order_id)
    //             ->where('menu_id', $current_menu_id)
    //             ->value('order_menu_id');
    //         foreach ($option_values as $value_id) {
    //             $option = DB::table('menu_option_values')
    //                 ->where('option_value_id', $value_id)
    //                 ->first();
    //             if ($option) {
    //                 DB::table('order_menu_options')->insert([
    //                     'order_id' => $last_order_id,
    //                     'menu_id' => $current_menu_id, // Use current indexed menu_id
    //                     'quantity' => $quantities[$current_menu_id] ?? 1,
    //                     'order_menu_id' => $order_menu_id,
    //                     'order_option_name' => $option->value,
    //                     'order_option_price' => $option->price,
    //                     'menu_option_value_id' => $option->option_value_id,
    //                     'order_menu_option_id' => $option->option_id
    //                 ]);
    //             }
    //         }

    //         $menuIndex++;
    //     }
    // }
    // Calculate subtotal from order_menus table (already includes option prices in subtotal column)
    $subtotal = DB::table('order_menus')
        ->where('order_id', $last_order_id)
        ->sum('subtotal');
    
    // Calculate final total with tax, tip, and discount
    $final_total = $subtotal + $tax_amount + $tip_amount - $coupon_discount;
    
    // Update order total
    $order->order_total = $final_total;
    $order->save();
    
    // Create proper order_totals structure
    if ($last_order_id) {
        $orderTotals = [
            [
                'order_id' => $last_order_id,
                'code' => 'subtotal',
                'title' => 'Subtotal',
                'priority' => 1,
                'value' => $subtotal,
                'is_summable' => 1,
            ]
        ];
        
        // Add tax if applicable
        if ($tax_amount > 0) {
            $orderTotals[] = [
                'order_id' => $last_order_id,
                'code' => 'tax',
                'title' => 'Tax',
                'priority' => 2,
                'value' => $tax_amount,
                'is_summable' => 1,
            ];
        }
        
        // Add tip if applicable
        if ($tip_amount > 0) {
            $orderTotals[] = [
                'order_id' => $last_order_id,
                'code' => 'tip',
                'title' => 'Tip',
                'priority' => 3,
                'value' => $tip_amount,
                'is_summable' => 1,
            ];
        }
        
        // Add coupon discount if applicable
        if ($coupon_discount > 0) {
            $orderTotals[] = [
                'order_id' => $last_order_id,
                'code' => 'coupon',
                'title' => 'Discount' . ($coupon_code ? ' (' . $coupon_code . ')' : ''),
                'priority' => 4,
                'value' => -$coupon_discount, // Negative value for discount
                'is_summable' => 1,
            ];
        }
        
        // Add total
        $orderTotals[] = [
            'order_id' => $last_order_id,
            'code' => 'total',
            'title' => 'Total',
            'priority' => 5,
            'value' => $final_total,
            'is_summable' => 0,
        ];
        
        DB::table('order_totals')->insert($orderTotals);
    }
    // Redirect based on whether updating or creating
    if ($is_updating) {
        // Redirect to edit page for updated order
        header('Location: /admin/orders/edit/' . $last_order_id);
        exit;
    } else {
        // Show success message for new order
        echo '<div id="notification"><div class="alert alert-success flash-message animated fadeInDown alert-dismissible show" data-allow-dismiss="true" role="alert">Order generated successfully.<button type="button" class="btn-close" data-bs-dismiss="alert" aria-hidden="true"></button></div>
</div>';
    }
}
?>
    @php
        $tableData = \Admin\Models\Tables_model::orderBy('table_no', 'asc')
            ->get(['table_id','table_no','table_name','min_capacity','max_capacity','table_status','qr_code']);
        //$menuData = DB::table('menus')->get();
        // Load all menus including stock-out items (they will be shown but disabled)
        $menuData = \Admin\Models\Menus_model::with(['media', 'categories'])->get();
        
        // Load combos
        $comboData = \Admin\Models\Menu_combos_model::with(['media', 'combo_items.menu', 'locations'])
            ->where('combo_status', 1)
            ->get();
        
        // Debug: Check if categories are loaded
        if ($menuData->isNotEmpty()) {
            $firstItem = $menuData->first();
            \Log::info('First menu item categories:', $firstItem->categories->toArray());
        }
        $menuOptions = DB::table('menu_item_options')
            ->join('menu_options', 'menu_item_options.option_id', '=', 'menu_options.option_id')
            ->join('menu_option_values', 'menu_option_values.option_id', '=', 'menu_options.option_id')
            ->join('menu_item_option_values', 'menu_item_option_values.option_value_id', '=', 'menu_option_values.option_value_id')
            ->select(
                'menu_item_options.menu_id',
                'menu_item_options.menu_option_id',
                'menu_option_values.option_value_id',
                'menu_option_values.value',
                'menu_option_values.price',
                'menu_options.display_type',
                'menu_options.option_name',
            )
            ->get()
            ->groupBy('menu_id');  

    @endphp
    <?php
$statuses = DB::table('statuses')->where('status_name', 'Paid')->first();
$status_id = $statuses ? $statuses->status_id : 10; // Default to 10 if no 'Paid' status found
$unavailableTables = DB::table('orders')
    ->where('status_id', '!=', $status_id)
    ->pluck('order_type')
    ->toArray();
?>

    <div class="form-fields">
    
    <!-- Table Selection -->
    <div class="table-selection">

        <div class="table-grid-container" id="table-grid">
            <!-- Working Area Indicator -->
            <div class="working-area-indicator">
                <strong>Working Area:</strong><br>
                2000x2000px - Move tables freely!
            </div>
            
            <!-- Grid Overlay for Alignment -->
            <div class="grid-overlay" id="grid-overlay"></div>
            
            <div class="table-grid">
                <!-- Cashier -->
                <div class="table-item cashier-option" data-value="Cashier" id="cashierButton" data-url="{{ $cashierUrl }}">
                    <div class="table-square cashier">
                        <i class="fa fa-cash-register"></i>
                        <span class="table-label">Cashier</span>
                </div>
            </div>
                
                <!-- Tables -->
            @foreach($tableData as $row)
@php $name = strtolower(is_array($row ?? null) ? ($row["table_name"] ?? "") : ($row->table_name ?? "")); @endphp
@php
  $isCashier = ($row->table_no === 0) || (strtolower($row->table_name) === 'cashier');
@endphp
@continue($isCashier)
                <?php 
                    $isUnavailable = in_array($row->table_name, $unavailableTables);
                        
                        // Get actual order status for this table from the admin orders panel
                        $tableOrder = DB::table('orders')
                            ->where('order_type', $row->table_name)
                            ->where('status_id', '!=', 10) // Exclude paid orders (status 10)
                            ->orderBy('created_at', 'desc')
                            ->first();
                        
                        $tableStatus = '';
                        $statusClass = '';
                        
                        if ($tableOrder) {
                            // Get the status name from the statuses table
                            $statusInfo = DB::table('statuses')
                                ->where('status_id', $tableOrder->status_id)
                                ->first();
                            
                            if ($statusInfo) {
                                $tableStatus = $statusInfo->status_name;
                                $statusClass = strtolower(str_replace(' ', '-', $statusInfo->status_name));
                            } else {
                                $tableStatus = 'Unknown';
                                $statusClass = 'unknown';
                            }
                        } else {
                            $tableStatus = 'Available';
                            $statusClass = 'available';
                        }
                    ?>
                    <div class="table-item <?php echo $isUnavailable ? 'unavailable' : 'available'; ?>" 
                         data-value="{{ $row->table_name }}_{{ $row->table_id }}"
                     data-table-id="{{ $row->table_id }}"
                     data-table-no="{{ $row->table_no }}"
                         data-capacity="{{ $row->min_capacity }}-{{ $row->max_capacity }}"
                         data-status="{{ $statusClass }}"
                         title="Click to open frontend menu for {{ $row->table_name }}"
                         style="position: absolute; left: {{ rand(50, 800) }}px; top: {{ rand(100, 600) }}px;">
                        <div class="table-circle <?php echo $statusClass; ?>">
                            <span class="table-number">{{ $row->table_name }}</span>
                            <span class="table-capacity">{{ $row->min_capacity }}-{{ $row->max_capacity }}</span>
                            <?php if ($isUnavailable): ?>
                                <i class="fa fa-ban unavailable-icon"></i>
                            <?php else: ?>
                                <i class="fa fa-external-link-alt menu-link-icon" title="Opens frontend menu"></i>
                            <?php endif; ?>
                    </div>
                        <div class="table-status">{{ $tableStatus }}</div>
                </div>
            @endforeach
            </div>
        </div>
    </div>
    
    <div class="w-100 ms-row order-form" style="padding: 1rem 2rem; display: none;">

<div class="wrapper w-100">
    <div class="row w-100">
        <div class="col">
            <!-- Category Filter Buttons -->
            <div class="category-filter-container" style="margin-bottom: 20px;">
                <div class="category-buttons">
                    <button type="button" class="category-btn active" data-category="all">
                        <i class="fa fa-th-large"></i> All Items
                    </button>
                    @php
                        $categories = $menuData->pluck('categories')->flatten()->unique('category_id');
                        // Debug: Log categories
                        \Log::info('Categories found:', $categories->toArray());
                    @endphp
                    @if($categories->isNotEmpty())
                        @foreach($categories as $category)
                            <button type="button" class="category-btn" data-category="{{ $category->category_id }}">
                                <i class="fa fa-utensils"></i> {{ $category->name }}
                            </button>
                        @endforeach
                    @endif
                    @if($comboData->isNotEmpty())
                        <button type="button" class="category-btn" data-category="combo">
                            <i class="fa fa-layer-group"></i> Combo
                        </button>
                    @endif
                </div>
            </div>
            
            <div class="menu-selection-container">
                <div class="menu-items-grid">
                @foreach($menuData as $menuRow)
                <?php 
                    $menuImage = $menuRow->media->isNotEmpty() ? $menuRow->media->first()->getPath() : ''; 
                    $optionsForDish = $menuOptions->get($menuRow->menu_id) ?? collect(); 
                    $menuOptionsJson = json_encode($optionsForDish);
                    $menuCategories = $menuRow->categories->pluck('category_id')->toArray();
                    $menuCategoriesJson = json_encode($menuCategories);
                    $isStockOut = $menuRow->is_stock_out ?? false;
                ?>
                    <div class="interactive-card {{ $isStockOut ? 'stock-out disabled' : '' }}" 
                     data-id="{{ $menuRow->menu_id }}" 
                     data-price="{{ $menuRow->menu_price }}" 
                    data-image="{{ $menuImage }}"
                     data-name="{{ $menuRow->menu_name }}" 
                     data-options='{{ $menuOptionsJson }}'
                     data-categories='{{ $menuCategoriesJson }}'
                     data-category-names='{{ json_encode($menuRow->categories->pluck('name')->toArray()) }}'
                     data-quantity="0"
                     data-stock-out="{{ $isStockOut ? '1' : '0' }}"
                    >
                    <!-- Quantity Badge - Outside card structure -->
                    <div class="quantity-badge" style="display: none;">
                        <span class="quantity-number">0</span>
                    </div>
                    
                    <!-- Front of card -->
                    <div class="card-front">
                        <div class="menu-image-container">
                            <img src="{{ $menuImage }}" alt="{{ $menuRow->menu_name }}" class="menu-image">
                            @if($isStockOut)
                            <div class="stock-out-overlay">
                                <span class="stock-out-badge">OUT OF STOCK</span>
                            </div>
                            @endif
                        </div>
                        <div class="menu-info">
                            <span class="menu-name">{{ $menuRow->menu_name }}</span>
                            <span class="menu-price">{{ $menuRow->menu_price }}{{ app('currency')->getDefault()->currency_symbol }}</span>
                        </div>
                    </div>
                    
                    <!-- Back of card (for sides/options) -->
                    <div class="card-back force-white-background">
                        <div class="back-header">
                            <h4>{{ $menuRow->menu_name }} Options</h4>
                        </div>
                        <div class="options-content">
                            <div class="options-list">
                                <!-- Options will be populated by JavaScript -->
                            </div>
                        </div>
                        <div class="back-actions">
                            <button type="button" class="flip-back-btn" title="Back to Menu">
                                <i class="fa fa-arrow-left"></i>
                            </button>
                            <button type="button" class="add-item-btn" title="Add to Cart">
                                <i class="fa fa-plus"></i>
                            </button>
                        </div>
                    </div>
                </div>
                @endforeach
                
                <!-- Combo Meals -->
                @foreach($comboData as $comboRow)
                <?php 
                    $comboImage = $comboRow->media->isNotEmpty() ? $comboRow->media->first()->getPath() : ''; 
                    $comboItems = $comboRow->combo_items->map(function($item) {
                        return $item->menu ? $item->menu->menu_name : '';
                    })->filter()->implode(', ');
                ?>
                    <div class="interactive-card combo-item" 
                     data-id="combo_{{ $comboRow->combo_id }}" 
                     data-price="{{ $comboRow->combo_price }}" 
                    data-image="{{ $comboImage }}"
                     data-name="{{ $comboRow->combo_name }}" 
                     data-combo-id="{{ $comboRow->combo_id }}"
                     data-is-combo="true"
                     data-quantity="0"
                    >
                    <!-- Quantity Badge - Outside card structure -->
                    <div class="quantity-badge" style="display: none;">
                        <span class="quantity-number">0</span>
                    </div>
                    
                    <!-- Front of card -->
                    <div class="card-front">
                        <div class="menu-image-container">
                            <img src="{{ $comboImage }}" alt="{{ $comboRow->combo_name }}" class="menu-image">
                            <div class="combo-badge">COMBO</div>
                        </div>
                        <div class="menu-info">
                            <span class="menu-name">{{ $comboRow->combo_name }}</span>
                            <span class="menu-price">{{ $comboRow->combo_price }}{{ app('currency')->getDefault()->currency_symbol }}</span>
                            @if($comboItems)
                            <span class="combo-items-text" style="font-size: 11px; color: #666; margin-top: 4px; display: block;">
                                {{ $comboItems }}
                            </span>
                            @endif
                </div>
            </div>

                    <!-- Back of card (for combo details) -->
                    <div class="card-back force-white-background">
                        <div class="back-header">
                            <h4>{{ $comboRow->combo_name }}</h4>
                        </div>
                        <div class="options-content">
                            <div class="combo-details">
                                <p><strong>Includes:</strong></p>
                                <ul style="list-style: none; padding: 0; margin: 10px 0;">
                                    @foreach($comboRow->combo_items as $item)
                                        <li style="padding: 5px 0;">
                                            {{ $item->menu ? $item->menu->menu_name : 'Unknown' }}
                                            @if($item->quantity > 1)
                                                <span style="color: #666;">(x{{ $item->quantity }})</span>
                                            @endif
                                        </li>
                                    @endforeach
                                </ul>
                                @if($comboRow->combo_description)
                                <p style="margin-top: 10px; font-size: 12px; color: #666;">
                                    {{ $comboRow->combo_description }}
                                </p>
                                @endif
                            </div>
                        </div>
                        <div class="back-actions">
                            <button type="button" class="flip-back-btn" title="Back to Menu">
                                <i class="fa fa-arrow-left"></i>
                            </button>
                            <button type="button" class="add-item-btn" title="Add to Cart">
                                <i class="fa fa-plus"></i>
                            </button>
                        </div>
                    </div>
                </div>
                @endforeach
                </div>
            </div>

        </div>
    </div>
</div>

<!-- Floating Bottom Toolbar - Moved outside form container -->
<div id="floating-toolbar" class="floating-toolbar collapsed">
    <div class="toolbar-glass">
                    <!-- Toolbar Header -->
                    <div class="toolbar-header">
                        <button class="toolbar-btn" id="clear-cart-btn" title="Clear All">
                            <i class="fas fa-trash"></i>
                        </button>
                        <button class="toolbar-btn" id="toggle-toolbar-btn" title="Toggle View">
                            <i class="fas fa-chevron-up"></i>
                        </button>
                        <h3 class="toolbar-title">
                            <i class="fas fa-shopping-cart"></i>
                            Selected Items
                            <span class="toolbar-count" id="total-items-count">0</span>
                        </h3>
                    </div>

        <!-- Selected Items Container -->
        <div class="selected-items-container" id="selected-items-container">
            <div class="empty-cart">
                <div class="empty-cart-icon">
                    <i class="fas fa-shopping-cart"></i>
                </div>
                <p class="empty-cart-text">No items selected yet</p>
            </div>
        </div>

                    <!-- Order Summary Section -->
                    <div class="order-summary-section" id="order-summary-section" style="display: none;">
                        <div class="summary-row">
                            <span>Subtotal:</span>
                            <span id="summary-subtotal">$0.00</span>
                        </div>
                        <div class="summary-row" id="tax-row" style="display: none;">
                            <span>Tax:</span>
                            <span id="summary-tax">$0.00</span>
                        </div>
                        <div class="summary-row" id="tip-row" style="display: none;">
                            <span>Tip:</span>
                            <span id="summary-tip">$0.00</span>
                        </div>
                        <div class="summary-row" id="discount-row" style="display: none;">
                            <span>Discount:</span>
                            <span id="summary-discount" style="color: #2c3e50;">-$0.00</span>
                        </div>
                        <div class="summary-row summary-total">
                            <span><strong>Total:</strong></span>
                            <span id="summary-total"><strong>$0.00</strong></span>
                        </div>
                    </div>

                    <!-- Payment Method Selection -->
                    <div class="payment-method-section" id="payment-method-section" style="display: none;">
                        <h5 style="margin-bottom: 10px; font-weight: 600;">Payment Method</h5>
                        <div class="payment-methods-grid" id="payment-methods-grid">
                            @if(isset($paymentMethods) && $paymentMethods->count() > 0)
                                @foreach($paymentMethods as $method)
                                    <label class="payment-method-option">
                                        <input type="radio" name="payment_method_radio" value="{{ $method->code }}" 
                                               {{ $method->code === 'cod' ? 'checked' : '' }}>
                                        <span class="payment-method-label">{{ $method->name }}</span>
                                    </label>
                                @endforeach
                            @else
                                <label class="payment-method-option">
                                    <input type="radio" name="payment_method_radio" value="cod" checked>
                                    <span class="payment-method-label">Cash on Delivery</span>
                                </label>
                            @endif
                        </div>
                    </div>

                    <!-- Coupon Section -->
                    <div class="coupon-section" id="coupon-section" style="display: none;">
                        <h5 style="margin-bottom: 10px; font-weight: 600;">Coupon Code</h5>
                        <div class="coupon-input-group">
                            <input type="text" id="coupon-code-field" class="form-control" 
                                   placeholder="Enter coupon code" style="text-transform: uppercase;">
                            <button type="button" class="btn btn-sm btn-outline-primary" id="apply-coupon-btn">Apply</button>
                            <button type="button" class="btn btn-sm btn-outline-danger" id="remove-coupon-btn" style="display: none;">Remove</button>
                        </div>
                        <div id="coupon-message" class="coupon-message" style="display: none;"></div>
                    </div>

                    <!-- Tip Section -->
                    <div class="tip-section" id="tip-section" style="display: none;">
                        <h5 style="margin-bottom: 10px; font-weight: 600;">Tip</h5>
                        <div class="tip-buttons">
                            <button type="button" class="tip-btn" data-tip="0">0%</button>
                            <button type="button" class="tip-btn" data-tip="5">5%</button>
                            <button type="button" class="tip-btn" data-tip="10">10%</button>
                            <button type="button" class="tip-btn" data-tip="15">15%</button>
                            <button type="button" class="tip-btn" data-tip="20">20%</button>
                        </div>
                        <div class="custom-tip-input" style="margin-top: 10px;">
                            <label>Custom Amount: $</label>
                            <input type="number" id="custom-tip-input" class="form-control" 
                                   placeholder="0.00" step="0.01" min="0" style="display: inline-block; width: 120px;">
                        </div>
                    </div>

                    <!-- Toolbar Footer -->
                    <div class="toolbar-footer">
                        <div class="total-price" id="total-price">$0.00</div>
                        <button type="button" class="btn btn-primary" id="place-order-btn">
                            Place Order
                        </button>
                    </div>
    </div>
</div>

    </div>
</div>


    <style>
        .menu-price,
        .interactive-card .menu-price,
        .menu-info .menu-price {
    font-size: 1.2rem !important; 
    font-weight: 700 !important; 
    color: #2c3e50 !important;
    background: none !important;
    padding: 0 !important; 
    border-radius: 0 !important;
    display: inline-block !important; 
    box-shadow: none !important;
    transition: none !important;
    border: none !important;
}

.menu-price:hover {
    color: #2c3e50 !important; 
    background: none !important;
    transform: none !important; 
    box-shadow: none !important;
}

   .col {
    margin-bottom: 15px !important;
    padding: 10px !important;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
} 


.form-control {
    width: 100% !important;
    padding: 12px !important;
    font-size: 14px !important;
    border: 2px solid #ccc !important;
    border-radius: 8px !important;
    transition: all 0.3s ease-in-out !important;
}

.form-control:focus {
    border-color: #2c3e50 !important;
    box-shadow: 0 0 5px rgba(44, 62, 80, 0.5) !important;
}

#menu-options-container {
    background: linear-gradient(135deg, #ffffff, #ffffff) !important;
    padding: 15px !important;
    border-radius: 10px !important;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1) !important;
}

.options-wrapper {
    display: flex !important;
    flex-wrap: wrap !important;
    gap: 10px !important;
}

    
    
    
    
    .menu-selection-container {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); 
    gap: 15px;
    justify-content: center;
    padding: 10px;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
}

.menu-items-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 20px;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
    padding: 0 !important;
}

.menu-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    cursor: pointer;
    border: 2px solid #ddd;
    padding: 10px;
    border-radius: 8px;
    transition: 0.3s;
    background: white;
    text-align: center;
}

.menu-item:hover, .menu-item.selected {
    border-color: #2c3e50;
    background: #ffffff;
}

.menu-image {
    width: 90px;  
    height: 90px;
    object-fit: cover;
    border-radius: 8px;
}

/* Combo Badge Styles */
.combo-badge {
    position: absolute;
    top: 5px;
    right: 5px;
    background: linear-gradient(135deg, #364a63 0%, #526484 100%);
    color: white;
    padding: 4px 8px;
    border-radius: 6px;
    font-size: 10px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    box-shadow: 0 2px 4px rgba(0,0,0,0.2);
    z-index: 10;
}

.combo-item .menu-image-container {
    position: relative;
}

.combo-items-text {
    font-size: 11px;
    color: #666;
    margin-top: 4px;
    display: block;
    line-height: 1.3;
}

.menu-name,
.interactive-card .menu-name,
.menu-info .menu-name {
    margin-top: 8px !important;
    font-weight: 700 !important;
    font-size: 1.2rem !important;
    text-align: center !important;
    line-height: 1.4 !important;
    color: #000000 !important;
}



        /* Enhanced Card Flipping Styles */
        .interactive-card {
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
            transform-style: preserve-3d;
            position: relative;
            background: transparent !important; /* No background on container */
        }

        .interactive-card.flipped {
            transform: scale(1.1);
            z-index: 100;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
        }

        .card-front, .card-back {
            transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1) !important;
            backface-visibility: hidden !important;
            -webkit-backface-visibility: hidden !important;
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            width: 100% !important;
            height: 100% !important;
            border-radius: 12px !important;
            display: flex !important;
            flex-direction: column !important;
        }
        
        .card-front {
            transform: rotateY(0deg) !important;
            z-index: 2 !important;
            background: #fcfcfc !important;
            justify-content: space-between !important;
            padding: 15px !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05) !important;
        }
        
        /* Hover effect only when card is NOT flipped */
        .interactive-card:not(.flipped):hover .card-front {
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.12), 0 2px 6px rgba(0, 0, 0, 0.08) !important;
        }
        
        /* Light lift effect on the card container when not flipped */
        .interactive-card:not(.flipped):hover {
            transform: translateY(-2px);
        }

        .card-back {
            background: #fcfcfc !important;
            padding: 15px !important;
            transform: rotateY(180deg) !important;
            overflow-y: auto !important;
            z-index: 1 !important;
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08), 0 1px 3px rgba(0, 0, 0, 0.05) !important;
        }
        
        /* Force override any external CSS - ULTRA SPECIFIC */
        .interactive-card .card-back {
            background: linear-gradient(135deg, #fcfcfc, #ffffff) !important;
        }
        
        .flipped .card-back {
            background: linear-gradient(135deg, #fcfcfc, #ffffff) !important;
        }
        
        /* Nuclear option - force white background */
        .force-white-background {
            background: linear-gradient(135deg, #fcfcfc, #ffffff) !important;
            background-color: #fcfcfc !important;
            background-image: linear-gradient(135deg, #fcfcfc, #ffffff) !important;
        }
        
        .card-back.force-white-background {
            background: linear-gradient(135deg, #fcfcfc, #ffffff) !important;
            background-color: #fcfcfc !important;
            background-image: linear-gradient(135deg, #fcfcfc, #ffffff) !important;
        }
        
        /* NUCLEAR OPTION - Override everything */
        div.card-back {
            background: linear-gradient(135deg, #fcfcfc, #ffffff) !important;
        }
        
        .menu-items-grid .interactive-card .card-back {
            background: linear-gradient(135deg, #fcfcfc, #ffffff) !important;
        }
        
        /* Force with attribute selector */
        [class*="card-back"] {
            background: linear-gradient(135deg, #fcfcfc, #ffffff) !important;
        }

        .interactive-card.flipped .card-front {
            transform: rotateY(180deg);
        }

        .interactive-card.flipped .card-back {
            transform: rotateY(0deg);
        }

        /* Stock Out Styles - Grayed out and disabled */
        .interactive-card.stock-out,
        .interactive-card.disabled {
            opacity: 0.5;
            cursor: not-allowed !important;
            pointer-events: none;
            filter: grayscale(100%);
        }

        .interactive-card.stock-out .card-front,
        .interactive-card.disabled .card-front {
            background: #f5f5f5 !important;
            border: 2px dashed #ccc !important;
        }

        .interactive-card.stock-out .menu-image,
        .interactive-card.disabled .menu-image {
            opacity: 0.4;
            filter: grayscale(100%);
        }

        .interactive-card.stock-out .menu-name,
        .interactive-card.disabled .menu-name,
        .interactive-card.stock-out .menu-price,
        .interactive-card.disabled .menu-price {
            color: #999 !important;
        }

        .stock-out-overlay {
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: rgba(0, 0, 0, 0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 8px;
            z-index: 5;
        }

        .stock-out-badge {
            background: #dc3545;
            color: white;
            padding: 6px 12px;
            border-radius: 6px;
            font-size: 11px;
            font-weight: 700;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
        }

        .menu-image-container {
            position: relative;
        }

        .back-header {
            display: flex;
            align-items: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 2px solid #2c3e50;
        }

        .flip-back-btn {
            background: #2c3e50;
            color: white;
            border: none;
            border-radius: 50%;
            width: 28px;
            height: 28px;
            display: flex;
            align-items: center;
            justify-content: center;
            margin-right: 8px;
            cursor: pointer;
            transition: all 0.3s ease;
            font-size: 12px;
        }

        .flip-back-btn:hover {
            background: #2c3e50;
            transform: scale(1.1);
        }

        .back-header h4 {
            margin: 0;
            color: #2c3e50 !important;
            font-size: 1.1rem;
            font-weight: 600;
        }
        
        .card-back .back-header h4 {
            color: #2c3e50 !important;
        }
        
        .interactive-card .card-back .back-header h4 {
            color: #2c3e50 !important;
        }

        .options-content {
            max-height: 200px;
            overflow-y: auto;
            margin-bottom: 15px;
            scrollbar-width: thin !important;
            scrollbar-color: #2c3e50 #f7fafc !important;
        }
        
        .card-back .options-content {
            scrollbar-width: thin !important;
            scrollbar-color: #2c3e50 #f7fafc !important;
        }
        
        .interactive-card .card-back .options-content {
            scrollbar-width: thin !important;
            scrollbar-color: #2c3e50 #f7fafc !important;
        }
        
        .options-content::-webkit-scrollbar {
            width: 6px !important;
            background: transparent !important;
        }
        
        .card-back .options-content::-webkit-scrollbar {
            width: 6px !important;
            background: transparent !important;
        }
        
        .interactive-card .card-back .options-content::-webkit-scrollbar {
            width: 6px !important;
            background: transparent !important;
        }
        
        .options-content::-webkit-scrollbar-track {
            background: #f7fafc !important;
            border-radius: 3px !important;
        }
        
        .card-back .options-content::-webkit-scrollbar-track {
            background: #f7fafc !important;
            border-radius: 3px !important;
        }
        
        .interactive-card .card-back .options-content::-webkit-scrollbar-track {
            background: #f7fafc !important;
            border-radius: 3px !important;
        }
        
        .options-content::-webkit-scrollbar-thumb {
            background: #2c3e50 !important;
            border-radius: 3px !important;
        }
        
        .card-back .options-content::-webkit-scrollbar-thumb {
            background: #2c3e50 !important;
            border-radius: 3px !important;
        }
        
        .interactive-card .card-back .options-content::-webkit-scrollbar-thumb {
            background: #2c3e50 !important;
            border-radius: 3px !important;
        }
        
        .options-content::-webkit-scrollbar-thumb:hover {
            background: #34495e !important;
        }
        
        .card-back .options-content::-webkit-scrollbar-thumb:hover {
            background: #34495e !important;
        }
        
        .interactive-card .card-back .options-content::-webkit-scrollbar-thumb:hover {
            background: #34495e !important;
        }
        
        /* Force scrollbar color class for dynamically created elements */
        .force-dark-scrollbar {
            scrollbar-width: thin !important;
            scrollbar-color: #2c3e50 #f7fafc !important;
        }
        
        .force-dark-scrollbar::-webkit-scrollbar {
            width: 6px !important;
            background: transparent !important;
        }
        
        .force-dark-scrollbar::-webkit-scrollbar-track {
            background: #f7fafc !important;
            border-radius: 3px !important;
        }
        
        .force-dark-scrollbar::-webkit-scrollbar-thumb {
            background: #2c3e50 !important;
            border-radius: 3px !important;
        }
        
        .force-dark-scrollbar::-webkit-scrollbar-thumb:hover {
            background: #34495e !important;
        }

        .back-actions {
            display: flex;
            gap: 10px;
            justify-content: center;
            padding-top: 10px;
            border-top: 2px solid #2c3e50;
        }

        .flip-back-btn, .add-item-btn {
            background: linear-gradient(135deg, #2c3e50, #2c3e50) !important;
            color: white !important;
            border: none !important;
            border-radius: 50% !important;
            width: 50px !important;
            height: 50px !important;
            padding: 0 !important;
            cursor: pointer !important;
            transition: all 0.3s ease !important;
            font-weight: 600 !important;
            font-size: 20px !important;
            box-shadow: 0 2px 6px rgba(44, 62, 80, 0.3) !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
        }

        .flip-back-btn:hover, .add-item-btn:hover {
            background: linear-gradient(135deg, #2c3e50, #2c3e50) !important;
            transform: translateY(-2px) !important;
            box-shadow: 0 4px 12px rgba(193, 154, 90, 0.4) !important;
        }

        /* Success animation for added items */
        .interactive-card.added-to-cart {
            animation: addedToCart 1s ease-in-out;
        }

        @keyframes addedToCart {
            0% { transform: scale(1); }
            50% { transform: scale(1.05); background: linear-gradient(135deg, #fcfcfc, #ffffff); }
            100% { transform: scale(1); }
        }

        .option-group {
            margin-bottom: 15px;
        }

        .option-group h5 {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 8px;
            color: #2c3e50 !important;
        }
        
        .card-back .option-group h5 {
            color: #2c3e50 !important;
        }
        
        .interactive-card .card-back .option-group h5 {
            color: #2c3e50 !important;
        }

        .form-check {
            margin: 5px 0;
        }

        .form-check-input:checked {
            background-color: #2c3e50;
            border-color: #2c3e50;
        }

        .form-check-label {
            color: #2c3e50 !important;
            font-weight: 500;
            cursor: pointer;
        }
        
        .card-back .form-check-label {
            color: #2c3e50 !important;
        }
        
        .interactive-card .card-back .form-check-label {
            color: #2c3e50 !important;
        }
        
        .card-back label {
            color: #2c3e50 !important;
        }
        
        .card-back .form-check label {
            color: #2c3e50 !important;
        }

        .option-group.radio-group {
            border-top: 2px solid #ccc;
            padding-top: 10px;
        }

        .option-group .form-check {
            display: inline-block;
            margin-right: 15px;
        }



       
 
/* Full page width styles */
body, html {
    width: 100%;
    max-width: none;
    overflow-x: hidden;
}

.form-fields {
    width: 100%;
    max-width: none;
    padding: 0;
    margin: 0;
}

/* Remove any page margins */
.row-fluid {
    margin: 0;
    padding: 0;
    width: 100%;
}

/* Modern Table Selection Styles - FULL PAGE WIDTH */
.table-selection {
    margin: 0;
    background: #ffffff;
    border-radius: 0;
    padding: 0;
    box-shadow: none;
    border: none;
    width: 100vw;
    height: calc(100vh - 100px);
    position: relative;
    overflow: hidden;
}

.table-selection-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin: 0;
    padding: 20px 30px;
    border-bottom: 2px solid #2c3e50;
    background: #ffffff;
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    z-index: 100;
    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.header-controls {
    display: flex;
    align-items: center;
    gap: 20px;
}

.table-selection-header .form-label {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: #2c3e50;
    text-transform: uppercase;
    letter-spacing: 1px;
}

#edit-layout-btn {
    background: rgb(241, 244, 251) !important;
    border: 1px solid rgb(201, 210, 227) !important;
    color: rgb(32, 41, 56) !important;
    padding: 0.55rem 1.75rem !important;
    font-size: 14px;
    min-height: 40px !important;
    height: 40px !important;
    border-radius: 12px !important;
    font-weight: 600 !important;
    transition: all 0.3s ease;
    box-shadow: none !important;
    line-height: 1.3 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
}

#edit-layout-btn:hover {
    background: rgb(241, 244, 251) !important;
    border-color: rgb(201, 210, 227) !important;
    color: rgb(32, 41, 56) !important;
    box-shadow: none !important;
    transform: none !important;
}

#edit-layout-btn.active {
    background: rgb(241, 244, 251) !important;
    border-color: rgb(201, 210, 227) !important;
    color: rgb(32, 41, 56) !important;
    box-shadow: none !important;
}

/* Move Table Button Styles - Match Edit Layout Button */
#move-table-btn {
    padding: 0.55rem 1.75rem !important;
    font-size: 14px !important;
    min-height: 40px !important;
    height: 40px !important;
    border-radius: 12px !important;
    font-weight: 600 !important;
    background: rgb(241, 244, 251) !important;
    border: 1px solid rgb(201, 210, 227) !important;
    color: rgb(32, 41, 56) !important;
    box-shadow: none !important;
    line-height: 1.3 !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
}

#move-table-btn:hover {
    background: rgb(241, 244, 251) !important;
    border-color: rgb(201, 210, 227) !important;
    color: rgb(32, 41, 56) !important;
    box-shadow: 0 2px 8px rgba(44, 62, 80, 0.15) !important;
    transform: scale(1.05) !important;
}

#move-table-btn.active {
    background: rgb(241, 244, 251) !important;
    border-color: rgb(201, 210, 227) !important;
    color: rgb(32, 41, 56) !important;
    box-shadow: 0 2px 8px rgba(44, 62, 80, 0.15) !important;
    transform: scale(1.05) !important;
}

#move-table-btn.active:hover {
    background: rgb(241, 244, 251) !important;
    border-color: rgb(201, 210, 227) !important;
    color: rgb(32, 41, 56) !important;
    box-shadow: 0 2px 8px rgba(44, 62, 80, 0.15) !important;
    transform: scale(1.05) !important;
}

#move-table-btn .fa {
    margin-right: 6px;
}

/* Move Mode Styles - Preserve Icons, Add Shadow Effects */
.table-grid.move-mode {
    cursor: crosshair;
}

.table-item.move-source {
    /* Keep all existing styles, just add shadow effect */
}

.table-item.move-source .table-circle {
    /* Add blue shadow effect while preserving icon */
    box-shadow: 0 0 20px rgba(0, 123, 255, 0.6), 0 0 40px rgba(0, 123, 255, 0.4) !important;
    border: 3px solid rgba(0, 123, 255, 0.8) !important;
    animation: pulse-shadow-blue 1.5s ease-in-out infinite;
}

.table-item.move-source .table-circle .table-number,
.table-item.move-source .table-circle .table-capacity,
.table-item.move-source .table-circle i,
.table-item.move-source .table-circle .menu-link-icon,
.table-item.move-source .table-circle .unavailable-icon {
    /* Ensure icons remain visible */
    opacity: 1 !important;
    visibility: visible !important;
    display: block !important;
}

.table-item.move-target {
    /* Keep all existing styles, just add shadow effect */
}

.table-item.move-target .table-circle {
    /* Add green shadow effect while preserving icon */
    box-shadow: 0 0 20px rgba(40, 167, 69, 0.6), 0 0 40px rgba(40, 167, 69, 0.4) !important;
    border: 3px solid rgba(40, 167, 69, 0.8) !important;
    animation: pulse-shadow-green 1.5s ease-in-out infinite;
}

.table-item.move-target .table-circle .table-number,
.table-item.move-target .table-circle .table-capacity,
.table-item.move-target .table-circle i,
.table-item.move-target .table-circle .menu-link-icon,
.table-item.move-target .table-circle .unavailable-icon {
    /* Ensure icons remain visible */
    opacity: 1 !important;
    visibility: visible !important;
    display: block !important;
}

@keyframes pulse-shadow-blue {
    0%, 100% {
        box-shadow: 0 0 20px rgba(0, 123, 255, 0.6), 0 0 40px rgba(0, 123, 255, 0.4);
    }
    50% {
        box-shadow: 0 0 30px rgba(0, 123, 255, 0.8), 0 0 50px rgba(0, 123, 255, 0.6);
    }
}

@keyframes pulse-shadow-green {
    0%, 100% {
        box-shadow: 0 0 20px rgba(40, 167, 69, 0.6), 0 0 40px rgba(40, 167, 69, 0.4);
    }
    50% {
        box-shadow: 0 0 30px rgba(40, 167, 69, 0.8), 0 0 50px rgba(40, 167, 69, 0.6);
    }
}

/* Move instruction - removed custom styles, using flash message style instead */

.table-grid-container {
    position: relative;
    overflow: auto;
    border-radius: 0;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    background-image: 
        radial-gradient(circle at 25% 25%, rgba(102, 126, 234, 0.05) 0%, transparent 50%),
        radial-gradient(circle at 75% 75%, rgba(240, 147, 251, 0.05) 0%, transparent 50%);
    padding: 0;
    width: 100%;
    height: 100%;
    margin-top: 10px;
    scrollbar-width: thin;
    scrollbar-color: #cbd5e0 #f7fafc;
}

.table-grid-container::-webkit-scrollbar {
    width: 8px;
    height: 8px;
}

.table-grid-container::-webkit-scrollbar-track {
    background: #f7fafc;
    border-radius: 4px;
}

.table-grid-container::-webkit-scrollbar-thumb {
    background: #cbd5e0;
    border-radius: 4px;
}

.table-grid-container::-webkit-scrollbar-thumb:hover {
    background: #a0aec0;
}

.table-grid {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 2000px;
    min-width: 2000px;
    padding: 100px;
}

.table-grid.edit-mode {
    cursor: grab;
}

.table-grid.edit-mode:active {
    cursor: grabbing;
}

.table-item {
    display: flex;
        flex-direction: column;
    align-items: center;
    transition: all 0.3s ease;
    cursor: pointer;
    position: absolute;
    animation: fadeInUp 0.6s ease forwards;
    opacity: 0;
    transform: translateY(20px);
    z-index: 10;
}

.table-item.edit-mode {
    cursor: grab;
    z-index: 100;
}

.table-item.edit-mode:active {
    cursor: grabbing;
    z-index: 1000;
}

.table-item:nth-child(1) { animation-delay: 0.1s; }
.table-item:nth-child(2) { animation-delay: 0.2s; }
.table-item:nth-child(3) { animation-delay: 0.3s; }
.table-item:nth-child(4) { animation-delay: 0.4s; }
.table-item:nth-child(5) { animation-delay: 0.5s; }
.table-item:nth-child(6) { animation-delay: 0.6s; }
.table-item:nth-child(7) { animation-delay: 0.7s; }
.table-item:nth-child(8) { animation-delay: 0.8s; }
.table-item:nth-child(9) { animation-delay: 0.9s; }
.table-item:nth-child(10) { animation-delay: 1.0s; }

@keyframes fadeInUp {
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.table-item:hover {
    transform: translateY(-8px) scale(1.05);
    z-index: 10;
}

.table-item.selected .table-circle {
    transform: scale(1.1);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.2);
}

.table-circle {
    width: 140px;
    height: 140px;
    border-radius: 50%;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    position: relative;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.1);
    border: 3px solid transparent;
    overflow: hidden;
}

.table-circle::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s ease;
}

.table-item:hover .table-circle::before {
    left: 100%;
}

.table-circle.cashier {
    background: linear-gradient(135deg, #2c3e50 0%, #2c3e50 100%);
    color: white;
}

.table-circle.available {
    background: #ffffff;
    color: #2c3e50;
    border: 4px solid #2c3e50;
    box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
}

.table-circle.received {
    background: #ffffff;
    color: #6c757d;
    border: 4px solid #6c757d;
    box-shadow: 0 4px 15px rgba(108, 117, 125, 0.3);
}

.table-circle.pending {
    background: #ffffff;
    color: #f0ad4e;
    border: 4px solid #f0ad4e;
    box-shadow: 0 4px 15px rgba(240, 173, 78, 0.3);
}

.table-circle.preparing {
    background: #ffffff;
    color: #17a2b8;
    border: 4px solid #17a2b8;
    box-shadow: 0 4px 15px rgba(23, 162, 184, 0.3);
}

.table-circle.cashier {
    background: #ffffff;
    color: #2c3e50;
    border: 4px solid #2c3e50;
    box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
}

.table-circle.completed {
    background: #ffffff;
    color: #2c3e50;
    border: 4px solid #2c3e50;
    box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
}

.table-circle.canceled {
    background: #ffffff;
    color: #dc3545;
    border: 4px solid #dc3545;
    box-shadow: 0 4px 15px rgba(220, 53, 69, 0.3);
}

.table-circle.paid {
    background: #ffffff;
    color: #2c3e50;
    border: 4px solid #2c3e50;
    box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
}

.table-circle.unknown {
    background: #ffffff;
    color: #6c757d;
    border: 4px solid #6c757d;
    box-shadow: 0 4px 15px rgba(108, 117, 125, 0.3);
}

.table-circle.unavailable {
    background: #ffffff;
    color: #6c757d;
    border: 4px solid #6c757d;
    box-shadow: 0 4px 15px rgba(108, 117, 125, 0.3);
}

.table-number {
    font-size: 1.1rem;
    font-weight: 700;
    margin-bottom: 2px;
}

.table-capacity {
    font-size: 0.8rem;
    opacity: 0.9;
    font-weight: 500;
}

.table-label {
    font-size: 0.9rem;
    font-weight: 600;
    margin-top: 5px;
}

.unavailable-icon {
    position: absolute;
    top: -5px;
    right: -5px;
    background: #dc3545;
    color: white;
    border-radius: 50%;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 12px;
    box-shadow: 0 2px 8px rgba(220, 53, 69, 0.3);
}

.menu-link-icon {
    position: absolute;
    top: -5px;
    right: -5px;
    background: #2c3e50;
    color: white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    box-shadow: 0 2px 8px rgba(44, 62, 80, 0.3);
    opacity: 0.8;
    transition: all 0.3s ease;
}

.table-item:hover .menu-link-icon {
    opacity: 1;
    background: #2c3e50;
    transform: scale(1.1);
}

.table-item.cashier-option .table-circle {
    width: 160px;
    height: 160px;
}

.table-item.cashier-option .table-circle i {
    font-size: 1.5rem;
    margin-bottom: 5px;
}

.table-status {
    margin-top: 8px;
    font-size: 0.8rem;
    font-weight: 600;
    color: #6c757d;
    text-align: center;
    padding: 4px 8px;
    background: rgba(108, 117, 125, 0.1);
    border-radius: 12px;
    white-space: nowrap;
}

/* Edit mode styles */
.table-item.edit-mode {
    cursor: grab;
    transition: none; /* Disable transitions during edit mode for smooth dragging */
}

.table-item.edit-mode:active {
    cursor: grabbing;
}

.table-item.edit-mode .table-circle {
    border: 2px dashed #2c3e50;
}

/* Ensure tables can be positioned freely */
.table-item {
    user-select: none;
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
}

/* Snapping visual feedback */
.table-item.snapping {
    transition: all 0.1s ease;
}

.table-item.snapping .table-circle {
    box-shadow: 0 0 20px rgba(214, 182, 134, 0.6);
}

/* Grid overlay for alignment */
.grid-overlay {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    pointer-events: none;
    z-index: 1;
    opacity: 0;
    transition: opacity 0.3s ease;
}

/* Working area indicator */
.working-area-indicator {
    position: absolute;
    top: 20px;
    left: 20px;
    background: rgba(214, 182, 134, 0.1);
    border: 2px dashed rgba(214, 182, 134, 0.3);
    border-radius: 8px;
    padding: 10px;
    font-size: 12px;
    color: #2c3e50;
    z-index: 1000;
    pointer-events: none;
}

.grid-overlay.active {
    opacity: 0.1;
}

.grid-overlay::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background-image: 
        linear-gradient(rgba(214, 182, 134, 0.2) 1px, transparent 1px),
        linear-gradient(90deg, rgba(214, 182, 134, 0.2) 1px, transparent 1px);
    background-size: 50px 50px;
}

/* Drag and Drop Styles */
.sortable-ghost {
    opacity: 0.5;
    transform: scale(0.95);
}

.sortable-chosen {
    transform: scale(1.05);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.3);
}

.sortable-drag {
    opacity: 0.8;
    transform: rotate(5deg);
}

/* Panning cursor styles */
.table-grid-container {
    cursor: grab;
}

.table-grid-container:active {
    cursor: grabbing;
}

/* Enhanced table grid for better panning */
.table-grid {
    min-width: max-content;
    min-height: max-content;
    padding: 40px;
    transition: transform 0.1s ease;
}

/* Zoom controls for better navigation */
.zoom-controls {
    display: flex;
    flex-direction: row;
    gap: 8px;
    align-items: center;
}

.zoom-btn {
    width: 36px;
    height: 36px;
    border-radius: 6px;
    background: linear-gradient(135deg, #2c3e50 0%, #2c3e50 100%);
    border: 1px solid #2c3e50;
    color: white;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(214, 182, 134, 0.3);
    font-size: 14px;
    font-weight: bold;
    padding: 0;
    line-height: 36px;
}

.zoom-btn:hover {
    background: linear-gradient(135deg, #2c3e50 0%, #2c3e50 100%);
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(214, 182, 134, 0.4);
}

.zoom-btn:disabled {
    background: #ccc;
    cursor: not-allowed;
    transform: none;
    box-shadow: none;
}

.zoom-level-indicator {
    text-align: center;
    font-size: 12px;
    font-weight: 600;
    color: rgb(32, 41, 56);
    padding: 8px;
    background: rgb(241, 244, 251);
    border-radius: 12px;
    margin-right: 10px;
    border: 1px solid rgb(201, 210, 227);
    box-shadow: none;
}

/* Save message notifications */
.save-message {
    position: fixed;
    top: 100px;
    right: 30px;
    padding: 15px 25px;
    border-radius: 8px;
    color: white;
    font-weight: 600;
    z-index: 10000;
    animation: slideInRight 0.3s ease;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.save-message.success {
    background: linear-gradient(135deg, #48bb78 0%, #38a169 100%);
}

.save-message.error {
    background: linear-gradient(135deg, #f56565 0%, #e53e3e 100%);
}

@keyframes slideInRight {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

/* Responsive design */
@media (max-width: 768px) {
    .table-grid {
        grid-template-columns: repeat(auto-fit, minmax(100px, 1fr));
        gap: 15px;
        padding: 15px;
    }
    
    .table-circle {
        width: 80px;
        height: 80px;
    }
    
    .table-item.cashier-option .table-circle {
        width: 90px;
        height: 90px;
    }
    
    .table-number {
        font-size: 1rem;
    }
    
    .table-capacity {
        font-size: 0.7rem;
    }
    
    .table-selection-header {
        flex-direction: column;
        gap: 15px;
        align-items: flex-start;
    }
    
    .zoom-controls {
        top: 10px;
        right: 10px;
    }
    
    .zoom-btn {
        width: 32px;
        height: 32px;
        padding: 0;
        font-size: 12px;
        line-height: 32px;
    }
}


@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.order-form {
    display: none;
    animation: fadeIn 0.5s ease-in-out;
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
}

.order-form .wrapper {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
}

.order-form .row {
    background: transparent !important;
    border: none !important;
    box-shadow: none !important;
}

/* NEW: Smooth transition styles */
.table-selection {
    transition: opacity 0.5s ease, transform 0.5s ease;
}

.back-to-tables-container {
    display: flex;
    align-items: center;
    gap: 20px;
    margin-bottom: 2rem;
    padding: 15px;
    background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
    border-radius: 10px;
    border-left: 4px solid #2c3e50;
}

.selected-table-info h3 {
    margin: 0;
    color: #2c3e50;
    font-weight: 600;
}

.selected-table-info p {
    margin: 5px 0 0 0;
    color: #6c757d;
    font-size: 14px;
}

#back-to-tables {
    background: linear-gradient(135deg, #364a63 0%, #364a63 100%) !important;
    border: 1px solid #364a63 !important;
    color: white !important;
    padding: 0.55rem 1.75rem !important;
    border-radius: 12px !important;
    font-weight: 600 !important;
    font-size: 14px !important;
    min-height: 40px !important;
    height: 40px !important;
    transition: all 0.3s ease !important;
    box-shadow: 0 2px 4px rgba(8, 129, 94, 0.2) !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    line-height: 1.3 !important;
}

#back-to-tables:hover {
    background: linear-gradient(135deg, #364a63 0%, #526484 100%) !important;
    transform: translateY(-2px) !important;
    box-shadow: 0 4px 12px rgba(8, 129, 94, 0.3) !important;
    border-color: #364a63 !important;
}

#back-to-tables i {
    margin-right: 8px !important;
}

/* Enhanced menu transition */
.menu-selection-container {
    transition: all 0.3s ease;
}

.menu-item {
    transition: all 0.3s ease;
}

.menu-item:hover {
    transform: translateY(-3px) scale(1.02);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

/* Table status badge styles */
.table-status-badge {
    transition: all 0.3s ease;
}

.table-status-badge.status-available {
    background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
    color: white;
}

.table-status-badge.status-occupied {
    background: linear-gradient(135deg, #dc3545 0%, #34495e 100%);
    color: white;
}

.table-status-badge.status-pending {
    background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
    color: white;
}

.table-status-badge.status-preparing {
    background: linear-gradient(135deg, #17a2b8 0%, #6f42c1 100%);
    color: white;
}

.table-status-badge.status-completed {
    background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
    color: white;
}

.table-status-badge.status-paid {
    background: linear-gradient(135deg, #2c3e50 0%, #34495e 100%);
    color: white;
}

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
  
.col-md-12.mt-4 {
    text-align: right !important;
    margin-bottom: 2rem !important;
}

.btn-primary {
    background-color: #2c3e50 !important;
    border: none !important;
    padding: 12px 20px !important;
    font-size: 16px !important;
    font-weight: bold !important;
    border-radius: 8px !important;
    transition: all 0.3s ease-in-out !important;
}

.btn-primary:hover {
    background-color: #2c3e50 !important;
    box-shadow: 0 3px 10px rgba(214, 182, 134, 0.3) !important;
}

.btn-dark {
    background-color: #333 !important;
    border: none !important;
    padding: 12px 20px !important;
    font-size: 16px !important;
    font-weight: bold !important;
    border-radius: 8px !important;
    transition: all 0.3s ease-in-out !important;
}

.btn-dark:hover {
    background-color: #000 !important;
    box-shadow: 0 3px 10px rgba(0, 0, 0, 0.3) !important;
}
.col-md-2 {
    margin: 30px 0 !important;
    text-align: center !important;
}

.btn-danger {
    background-color: #dc3545 !important;
    border: none !important;
    padding: 12px 20px !important;
    font-size: 16px !important;
    font-weight: bold !important;
    border-radius: 8px !important;
    transition: all 0.3s ease-in-out !important;
}

.btn-danger:hover {
    background-color: #a71d2a !important;
    box-shadow: 0 3px 10px rgba(220, 53, 69, 0.3) !important;
}


.menu-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between; 
    background: linear-gradient(135deg, #fcfcfc, #ffffff);
    border-radius: 12px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    padding: 15px;
    width: 180px; 
    height: 220px; 
    text-align: center;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    position: relative;
    overflow: hidden;
    margin-bottom: 50px !important;
}

.menu-container {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    justify-content: center;
}
.menu-item:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.menu-img {
    width: 100px;
    height: 100px;
    object-fit: cover;
    border-radius: 10px;
    transition: transform 0.3s ease;
}

.menu-item:hover .menu-img {
    transform: scale(1.05);
}

.form-label {
    font-size: 16px;
    font-weight: bold;
    color: #333; 
    text-transform: uppercase;
    letter-spacing: 0.5px;
    margin-bottom: 8px;
    display: inline-block;
    background: linear-gradient(90deg,rgb(5, 0, 0), #ff5700);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    transition: all 0.3s ease-in-out;
}

.form-label:hover {
    opacity: 0.8;
    transform: scale(1.05);
}


.menu-item:hover .form-label {
    color: #ff7b00;
}


@keyframes glow {
    0% { box-shadow: 0 0 5px rgba(255, 165, 0, 0.4); }
    50% { box-shadow: 0 0 15px rgba(255, 165, 0, 0.6); }
    100% { box-shadow: 0 0 5px rgba(255, 165, 0, 0.4); }
}

.menu-item:active {
    animation: glow 0.8s ease-in-out;
}
.menu-card {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: #ffffff;
    border-radius: 12px;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.1);
    padding: 15px;
    width: 200px; 
    text-align: center;
    transition: transform 0.3s ease, box-shadow 0.3s ease;
    margin: 10px auto;
}

.menu-card:hover {
    transform: translateY(-5px);
    box-shadow: 0 8px 20px rgba(0, 0, 0, 0.15);
}

.menu-card-img {
    width: 120px; 
    height: 120px;
    object-fit: cover;
    border-radius: 10px;
    transition: transform 0.3s ease;
    margin-bottom: 10px;
}

.menu-card:hover .menu-card-img {
    transform: scale(1.05);
}

.menu-card-label {
    font-weight: 600;
    color: #333;
    font-size: 14px;
    margin-top: 5px;
    transition: color 0.3s ease;
}

.menu-card:hover .menu-card-label {
    color: #ff7b00;
}

@media (max-width: 768px) {
    .menu-card {
        width: 180px;
    }
    .menu-card-img {
        width: 100px;
        height: 100px;
    }
}
.no-options-container {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    padding: 12px;
}

.no-options-card {
    display: flex;
    align-items: center;
    background: #ffffff;
    border-radius: 12px;
    padding: 12px 16px;
    box-shadow: 0px 4px 10px rgba(0, 0, 0, 0.08);
    transition: all 0.3s ease-in-out;
    border-left: 5px solid #ff8c00;
}

.no-options-card:hover {
    transform: scale(1.02);
    box-shadow: 0px 6px 12px rgba(0, 0, 0, 0.12);
}

.no-options-img {
    width: 40px;
    height: 40px;
    margin-right: 12px;
    opacity: 0.8;
    transition: opacity 0.3s;
}

.no-options-card:hover .no-options-img {
    opacity: 1;
}

.no-options-text {
    font-size: 14px;
    color: #555;
    font-weight: 500;
    line-height: 1.5;
}

.menu-entry {
    position: relative; 
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    padding: 15px;
    border-radius: 10px;
    background: #fff;
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.1);
    transition: all 0.3s ease-in-out;
}

.menu-entry:not(:last-child) {
    margin-bottom: 25px;
}

.menu-entry:hover {
    transform: scale(1.02);
    box-shadow: 0 6px 12px rgba(0, 0, 0, 0.15);
}

.remove-btn-container {
    position: absolute;
    top: 10px;
    right: 10px;
}

.remove-item {
    background-color: #ff4d4d;
    color: white;
    border: none;
    width: 35px;
    height: 35px;
    border-radius: 50%;
    font-size: 18px;
    font-weight: bold;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: background 0.3s ease-in-out;
}

.remove-item:hover {
    background-color: #cc0000;
    transform: scale(1.1);
}

/* Selected item sides styling */
.selected-item-sides {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-top: 4px;
}

.side-tag {
    background: linear-gradient(135deg, #2c3e50, #2c3e50);
    color: white;
    padding: 2px 6px;
    border-radius: 10px;
    font-size: 10px;
    font-weight: 500;
    display: inline-block;
    box-shadow: 0 1px 3px rgba(193, 154, 90, 0.3);
}

/* Toggle Toolbar Button - Smaller and Dark Blue */
#toggle-toolbar-btn.toolbar-btn {
    width: 32px !important;
    height: 32px !important;
    min-width: 32px !important;
    min-height: 32px !important;
    padding: 0 !important;
    background: #2c3e50 !important;
    border: 1px solid #2c3e50 !important;
    color: #ffffff !important;
    border-radius: 6px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    font-size: 12px !important;
    transition: all 0.3s ease !important;
    box-shadow: 0 2px 4px rgba(44, 62, 80, 0.2) !important;
}

#toggle-toolbar-btn.toolbar-btn:hover {
    background: #34495e !important;
    border-color: #34495e !important;
    transform: translateY(-1px) !important;
    box-shadow: 0 3px 6px rgba(44, 62, 80, 0.3) !important;
}

#toggle-toolbar-btn.toolbar-btn i {
    font-size: 12px !important;
    color: #ffffff !important;
}

/* Fix Floating Toolbar Overflow Issue */
.floating-toolbar.expanded {
    max-height: 80vh !important;
    overflow-y: auto !important;
    overflow-x: hidden !important;
}

.floating-toolbar.expanded .toolbar-glass {
    max-height: 100% !important;
    overflow-y: auto !important;
}

/* Order Summary Section Styles */
.order-summary-section {
    padding: 15px;
    background: #f8f9fa;
    border-radius: 8px;
    margin: 15px 0;
    border: 1px solid #dee2e6;
}

.summary-row {
    display: flex;
    justify-content: space-between;
    padding: 8px 0;
    border-bottom: 1px solid #e9ecef;
    font-size: 14px;
}

.summary-row:last-child {
    border-bottom: none;
}

.summary-total {
    margin-top: 10px;
    padding-top: 10px;
        border-top: 2px solid #2c3e50;
    font-size: 16px;
}

.summary-total span {
    color: #2c3e50;
}

/* Payment Method Section Styles */
.payment-method-section {
    padding: 15px;
    background: #ffffff;
    border-radius: 8px;
    margin: 15px 0;
    border: 1px solid #dee2e6;
}

.payment-method-section h5 {
    color: #2c3e50;
    margin-bottom: 15px;
}

.payment-methods-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
    gap: 10px;
}

.payment-method-option {
    display: flex;
    align-items: center;
    padding: 10px;
    border: 2px solid #dee2e6;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.3s ease;
    background: #ffffff;
}

.payment-method-option:hover {
    border-color: #2c3e50;
    background: #f0f9f5;
}

.payment-method-option input[type="radio"] {
    margin-right: 8px;
    cursor: pointer;
}

.payment-method-option input[type="radio"]:checked + .payment-method-label {
    color: #2c3e50;
    font-weight: 600;
}

.payment-method-option:has(input[type="radio"]:checked) {
    border-color: #2c3e50;
    background: #f0f4f8;
}

.payment-method-label {
    cursor: pointer;
    font-size: 14px;
    color: #495057;
}

/* Coupon Section Styles */
.coupon-section {
    padding: 15px;
    background: #ffffff;
    border-radius: 8px;
    margin: 15px 0;
    border: 1px solid #dee2e6;
}

.coupon-section h5 {
    color: #2c3e50;
    margin-bottom: 15px;
}

.coupon-input-group {
    display: flex;
    gap: 10px;
    align-items: center;
}

.coupon-input-group .form-control {
    flex: 1;
    padding: 10px;
    border: 2px solid #dee2e6;
    border-radius: 6px;
    font-size: 14px;
}

.coupon-input-group .form-control:focus {
    border-color: #2c3e50;
    outline: none;
    box-shadow: 0 0 0 3px rgba(44, 62, 80, 0.1);
}

.coupon-message {
    margin-top: 10px;
    padding: 8px 12px;
    border-radius: 6px;
    font-size: 13px;
}

.coupon-message.success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
}

.coupon-message.error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
}

/* Tip Section Styles */
.tip-section {
    padding: 15px;
    background: #ffffff;
    border-radius: 8px;
    margin: 15px 0;
    border: 1px solid #dee2e6;
}

.tip-section h5 {
    color: #2c3e50;
    margin-bottom: 15px;
}

.tip-buttons {
    display: flex;
    gap: 10px;
    flex-wrap: wrap;
}

.tip-btn {
    flex: 1;
    min-width: 60px;
    padding: 10px 15px;
    border: 2px solid #dee2e6;
    border-radius: 6px;
    background: #ffffff;
    color: #495057;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.3s ease;
}

.tip-btn:hover {
    border-color: #2c3e50;
    background: #f0f4f8;
    color: #2c3e50;
}

.tip-btn.active {
    border-color: #2c3e50;
    background: #2c3e50;
    color: #ffffff;
}

.custom-tip-input {
    display: flex;
    align-items: center;
    gap: 10px;
}

.custom-tip-input label {
    font-size: 14px;
    color: #495057;
    font-weight: 500;
}

.custom-tip-input .form-control {
    padding: 8px 12px;
    border: 2px solid #dee2e6;
    border-radius: 6px;
    font-size: 14px;
}

.custom-tip-input .form-control:focus {
    border-color: #2c3e50;
    outline: none;
    box-shadow: 0 0 0 3px rgba(44, 62, 80, 0.1);
}

    </style>


<script>


// Global variables for table selection
let selectedTableInput;

document.addEventListener("DOMContentLoaded", function () {
            // Show header controls on page load
            document.getElementById('header-controls').style.display = 'flex';
            
            // FORCE toolbar positioning - override everything
            const floatingToolbar = document.getElementById("floating-toolbar");
            if (floatingToolbar) {
                // Move to body level
                document.body.appendChild(floatingToolbar);
                
                // FORCE positioning with inline styles (highest priority)
                floatingToolbar.style.position = 'fixed';
                floatingToolbar.style.bottom = '1.5rem';
                floatingToolbar.style.left = '50%';
                floatingToolbar.style.transform = 'translateX(-50%)';
                floatingToolbar.style.zIndex = '99999';
                floatingToolbar.style.width = '100%';
                floatingToolbar.style.maxWidth = '600px';
                floatingToolbar.style.maxHeight = '80vh'; // Allow scrolling if content is tall
                floatingToolbar.style.overflowY = 'auto'; // Enable scrolling
                floatingToolbar.style.padding = '0 1rem';
                floatingToolbar.style.margin = '0';
                floatingToolbar.style.opacity = '1'; // Make visible
                floatingToolbar.style.visibility = 'visible'; // Make visible
                floatingToolbar.style.pointerEvents = 'auto';
                floatingToolbar.style.display = 'block';
                
                console.log("✅ Toolbar FORCED to viewport bottom with inline styles");
            }
            
            const menuItems = document.querySelectorAll(".interactive-card");
            const selectedItemsContainer = document.getElementById("selected-items-container");
            const totalItemsCount = document.getElementById("total-items-count");
            const totalPrice = document.getElementById("total-price");
        const clearCartBtn = document.getElementById("clear-cart-btn");
        const toggleToolbarBtn = document.getElementById("toggle-toolbar-btn");
        const placeOrderBtn = document.getElementById("place-order-btn");
            let selectedItems = new Map(); // Track selected items
            let toolbarState = "collapsed"; // collapsed, preview, expanded

            // ========== PRE-POPULATE EXISTING ORDER ITEMS ==========
            @if(isset($existingOrder) && $existingOrder && isset($existingOrderItems) && count($existingOrderItems) > 0)
            // Pre-populate cart with existing order items
            const existingOrderItems = @json($existingOrderItems);
            const existingOrderId = {{ $existingOrder->order_id }};
            const existingTableId = {{ $existingOrder->table_id ?? 'null' }};
            const existingTableName = '{{ $existingOrder->order_type ?? "" }}';
            
            console.log('Pre-populating cart with existing order items:', existingOrderItems);
            
            // Auto-select table and show menu
            if (existingTableName) {
                // Set table input
                document.getElementById('selected-table').value = existingTableName;
                
                // Find and select the table in the grid
                const tableElement = document.querySelector(`[data-value^="${existingTableName}_"]`);
                if (tableElement) {
                    tableElement.classList.add('selected');
                    const tableId = tableElement.dataset.tableId;
                    const tableNo = tableElement.dataset.tableNo;
                    
                    // Show menu for this table (use window function if available)
                    setTimeout(() => {
                        if (typeof showMenuForTable === 'function') {
                            showMenuForTable(existingTableName, tableId, tableNo);
                        } else {
                            // Fallback: manually show menu
                            const orderForm = document.querySelector('.order-form');
                            const tableSelection = document.querySelector('.table-selection');
                            if (orderForm && tableSelection) {
                                tableSelection.style.display = 'none';
                                orderForm.style.display = 'block';
                                document.getElementById('back-to-tables').style.display = 'inline-block';
                                document.getElementById('header-controls').style.display = 'none';
                                document.getElementById('selected-table-info').style.display = 'block';
                            }
                        }
                    }, 100);
                } else {
                    // Table not found, but still show menu
                    setTimeout(() => {
                        const orderForm = document.querySelector('.order-form');
                        const tableSelection = document.querySelector('.table-selection');
                        if (orderForm && tableSelection) {
                            tableSelection.style.display = 'none';
                            orderForm.style.display = 'block';
                            document.getElementById('back-to-tables').style.display = 'inline-block';
                            document.getElementById('header-controls').style.display = 'none';
                            document.getElementById('selected-table-info').style.display = 'block';
                        }
                    }, 100);
                }
            }
            
            // Pre-populate cart with existing items
            setTimeout(() => {
                existingOrderItems.forEach((orderItem) => {
                    const menuId = orderItem.menu_id;
                    const quantity = orderItem.quantity;
                    const price = parseFloat(orderItem.price);
                    const name = orderItem.name;
                    
                    // Find the menu card
                    const menuCard = document.querySelector(`.interactive-card[data-id="${menuId}"]`);
                    if (!menuCard) {
                        console.warn('Menu card not found for menu_id:', menuId);
                        return;
                    }
                    
                    // Get menu data
                    const menuImage = menuCard.dataset.image || '';
                    const menuPrice = parseFloat(menuCard.dataset.price) || price;
                    
                    // Get options from order item
                    let selectedOptions = [];
                    let totalOptionsPrice = 0;
                    
                    if (orderItem.menu_options && orderItem.menu_options.length > 0) {
                        orderItem.menu_options.forEach(option => {
                            const optionPrice = parseFloat(option.order_option_price || 0);
                            totalOptionsPrice += optionPrice;
                            selectedOptions.push({
                                value: option.menu_option_value_id || '',
                                text: option.order_option_name || '',
                                price: optionPrice
                            });
                        });
                    }
                    
                    // Create unique key
                    const optionsKey = selectedOptions.map(opt => opt.value).sort().join(',');
                    const uniqueKey = optionsKey ? `${menuId}_${optionsKey}` : `${menuId}_no_sides`;
                    
                    // Add to cart
                    if (!selectedItems.has(uniqueKey)) {
                        selectedItems.set(uniqueKey, {
                            id: menuId,
                            uniqueKey: uniqueKey,
                            name: name,
                            price: menuPrice + totalOptionsPrice,
                            basePrice: menuPrice,
                            optionsPrice: totalOptionsPrice,
                            image: menuImage,
                            quantity: 0,
                            options: selectedOptions
                        });
                    }
                    
                    const itemData = selectedItems.get(uniqueKey);
                    itemData.quantity = quantity;
                    
                    // Update UI
                    menuCard.dataset.quantity = quantity;
                    const quantityBadge = menuCard.querySelector('.quantity-badge');
                    const quantityNumber = menuCard.querySelector('.quantity-number');
                    if (quantityBadge && quantityNumber) {
                        quantityBadge.classList.add('show');
                        quantityNumber.textContent = quantity;
                    }
                });
                
                // Update toolbar
                updateFloatingToolbar();
                
                // Show order sections
                showOrderSections();
                
                console.log('Cart pre-populated with', existingOrderItems.length, 'items');
            }, 1000); // Wait for menu to load
            @endif
            // ========== END PRE-POPULATE EXISTING ORDER ITEMS ==========

            // Category Filtering Functionality - Initialize after DOM is ready
            function initializeCategoryFiltering() {
                const categoryButtons = document.querySelectorAll('.category-btn');
                const menuItemsGrid = document.querySelector('.menu-items-grid');
                
                console.log('Initializing category filtering...');
                console.log('Found category buttons:', categoryButtons.length);
                console.log('Found menu items:', menuItems.length);
                
                // Debug: Check first few menu items for category data
                menuItems.forEach((item, index) => {
                    if (index < 3) { // Only check first 3 items
                        console.log(`Menu item ${index}:`, {
                            id: item.dataset.id,
                            name: item.dataset.name,
                            categories: item.dataset.categories,
                            categoryNames: item.dataset.categoryNames
                        });
                    }
                });
                
                // Category filter function
                function filterByCategory(categoryId) {
                    console.log('Filtering by category:', categoryId);
                    let visibleCount = 0;
                    let visibleItems = [];

    menuItems.forEach(item => {
                        try {
                            // Check if this is a combo item
                            const isCombo = item.dataset.isCombo === 'true' || item.classList.contains('combo-item');
                            
                            // Handle "combo" category filter
                            if (categoryId === 'combo') {
                                const shouldShow = isCombo;
                                if (shouldShow) {
                                    item.style.display = 'block';
                                    item.style.visibility = 'visible';
                                    item.style.opacity = '1';
                                    item.style.animation = 'fadeInUp 0.5s ease forwards';
                                    item.classList.remove('category-hidden');
                                    item.classList.add('category-visible');
                                    visibleCount++;
                                    visibleItems.push(item);
                                } else {
                                    item.style.display = 'none';
                                    item.style.visibility = 'hidden';
                                    item.style.opacity = '0';
                                    item.classList.add('category-hidden');
                                    item.classList.remove('category-visible');
                                }
                                return; // Skip the rest for combo filter
                            }
                            
                            // For non-combo filters, hide combo items
                            if (isCombo && categoryId !== 'all') {
                                item.style.display = 'none';
                                item.style.visibility = 'hidden';
                                item.style.opacity = '0';
                                item.classList.add('category-hidden');
                                item.classList.remove('category-visible');
                                return;
                            }
                            
                            // Handle regular menu items with categories
                            let itemCategories = [];
                            const categoriesData = item.dataset.categories;
                            
                            if (categoriesData) {
                                if (typeof categoriesData === 'string') {
                                    itemCategories = JSON.parse(categoriesData);
                                } else if (Array.isArray(categoriesData)) {
                                    itemCategories = categoriesData;
                                }
                            }
                            
                            const shouldShow = categoryId === 'all' || itemCategories.includes(parseInt(categoryId));
                            
                            if (shouldShow) {
                                item.style.display = 'block';
                                item.style.visibility = 'visible';
                                item.style.opacity = '1';
                                item.style.animation = 'fadeInUp 0.5s ease forwards';
                                item.classList.remove('category-hidden');
                                item.classList.add('category-visible');
                                visibleCount++;
                                
                                // Add to visible items array for sorting
                                visibleItems.push(item);
                            } else {
                                item.style.display = 'none';
                                item.style.visibility = 'hidden';
                                item.style.opacity = '0';
                                item.classList.add('category-hidden');
                                item.classList.remove('category-visible');
                            }
                        } catch (error) {
                            console.warn('Error parsing categories for item:', item.dataset.id, error);
                            // Show item if there's an error parsing categories
                            item.style.display = 'block';
                            item.style.visibility = 'visible';
                            item.style.opacity = '1';
                            visibleCount++;
                        }
                    });
                    
                    // Sort visible items alphabetically by name
                    if (visibleItems.length > 0) {
                        visibleItems.sort((a, b) => {
                            const nameA = a.dataset.name ? a.dataset.name.toLowerCase() : '';
                            const nameB = b.dataset.name ? b.dataset.name.toLowerCase() : '';
                            return nameA.localeCompare(nameB);
                        });
                        
                        // Reorder the DOM elements
                        const menuItemsGrid = document.querySelector('.menu-items-grid');
                        if (menuItemsGrid) {
                            visibleItems.forEach(item => {
                                menuItemsGrid.appendChild(item);
                            });
                        }
                        
                        console.log('Items sorted alphabetically:', visibleItems.map(item => item.dataset.name));
                    }
                    
                    console.log('Visible items after filtering:', visibleCount);
                }
                
                // Category button event listeners
                categoryButtons.forEach(button => {
                    button.addEventListener('click', function(e) {
                        e.preventDefault();
                        e.stopPropagation();
                        
                        console.log('Category button clicked:', this.textContent.trim());
                        
                        // Remove active class from all buttons
                        categoryButtons.forEach(btn => btn.classList.remove('active'));
                        
                        // Add active class to clicked button
                        this.classList.add('active');
                        
                        // Filter menu items
                        const categoryId = this.dataset.category;
                        filterByCategory(categoryId);
                    });
                });
                
                // If no category buttons found, show all items by default
                if (categoryButtons.length === 0) {
                    console.log('No category buttons found, showing all items');
                    menuItems.forEach(item => {
                        item.style.display = 'block';
                    });
                }
            }
            
            // Initialize category filtering after a short delay to ensure DOM is ready
            setTimeout(initializeCategoryFiltering, 100);
            
            // Also initialize when the menu is shown (for the new table-to-menu flow)
            window.initializeCategoryFiltering = initializeCategoryFiltering;

            // ========== PAYMENT, TAX, COUPON, TIP FUNCTIONALITY ==========
            
            // Tax settings from backend
            const taxSettings = {
                enabled: {{ isset($taxSettings['enabled']) && $taxSettings['enabled'] ? 'true' : 'false' }},
                percentage: {{ $taxSettings['percentage'] ?? 0 }},
                menuPrice: {{ $taxSettings['menuPrice'] ?? 1 }}
            };

            // State variables
            let selectedPaymentMethod = 'cod';
            let tipPercentage = 0;
            let customTipAmount = 0;
            let appliedCoupon = null;
            let couponDiscount = 0;

            // Helper function to adjust price if tax is included in menu prices
            function adjustPriceForTax(price) {
                if (taxSettings.enabled && taxSettings.percentage > 0 && taxSettings.menuPrice === 0) {
                    return price * (1 + taxSettings.percentage / 100);
                }
                return price;
            }

            // Calculate all totals
            function calculateTotals() {
                // Calculate subtotal
                let subtotal = 0;
                selectedItems.forEach((itemData) => {
                    const basePrice = parseFloat(itemData.basePrice || itemData.price || 0);
                    const optionsPrice = parseFloat(itemData.optionsPrice || 0);
                    const itemTotalPrice = basePrice + optionsPrice;
                    const adjustedPrice = adjustPriceForTax(itemTotalPrice);
                    subtotal += adjustedPrice * itemData.quantity;
                });

                // Calculate tax (if tax should be applied on checkout)
                let taxAmount = 0;
                if (taxSettings.enabled && taxSettings.percentage > 0 && taxSettings.menuPrice === 1) {
                    taxAmount = subtotal * (taxSettings.percentage / 100);
                }

                // Calculate tip
                let tipAmount = 0;
                if (customTipAmount > 0) {
                    tipAmount = customTipAmount;
                } else if (tipPercentage > 0) {
                    tipAmount = subtotal * (tipPercentage / 100);
                }

                // Calculate final total
                const finalTotal = Math.max(0, subtotal + taxAmount + tipAmount - couponDiscount);

                // Update UI
                updateOrderSummary(subtotal, taxAmount, tipAmount, couponDiscount, finalTotal);
                
                // Update hidden inputs
                document.getElementById('tax-amount-input').value = taxAmount.toFixed(2);
                document.getElementById('tip-amount-input').value = tipAmount.toFixed(2);
                document.getElementById('coupon-discount-input').value = couponDiscount.toFixed(2);
                
                return { subtotal, taxAmount, tipAmount, couponDiscount, finalTotal };
            }

            // Update order summary display
            function updateOrderSummary(subtotal, taxAmount, tipAmount, discount, total) {
                document.getElementById('summary-subtotal').textContent = '$' + subtotal.toFixed(2);
                document.getElementById('summary-total').innerHTML = '<strong>$' + total.toFixed(2) + '</strong>';
                
                // Show/hide tax row
                const taxRow = document.getElementById('tax-row');
                if (taxAmount > 0) {
                    taxRow.style.display = 'flex';
                    document.getElementById('summary-tax').textContent = '$' + taxAmount.toFixed(2);
                } else {
                    taxRow.style.display = 'none';
                }

                // Show/hide tip row
                const tipRow = document.getElementById('tip-row');
                if (tipAmount > 0) {
                    tipRow.style.display = 'flex';
                    document.getElementById('summary-tip').textContent = '$' + tipAmount.toFixed(2);
                } else {
                    tipRow.style.display = 'none';
                }

                // Show/hide discount row
                const discountRow = document.getElementById('discount-row');
                if (discount > 0) {
                    discountRow.style.display = 'flex';
                    document.getElementById('summary-discount').textContent = '-$' + discount.toFixed(2);
                } else {
                    discountRow.style.display = 'none';
                }

                // Update total price in footer
                document.getElementById('total-price').textContent = '$' + total.toFixed(2);
            }

            // Payment method selection
            const paymentMethodRadios = document.querySelectorAll('input[name="payment_method_radio"]');
            paymentMethodRadios.forEach(radio => {
                radio.addEventListener('change', function() {
                    selectedPaymentMethod = this.value;
                    document.getElementById('payment-method-input').value = selectedPaymentMethod;
                    calculateTotals();
                });
            });

            // Tip percentage buttons
            const tipButtons = document.querySelectorAll('.tip-btn');
            tipButtons.forEach(btn => {
                btn.addEventListener('click', function() {
                    // Remove active class from all buttons
                    tipButtons.forEach(b => b.classList.remove('active'));
                    // Add active class to clicked button
                    this.classList.add('active');
                    tipPercentage = parseFloat(this.dataset.tip) || 0;
                    customTipAmount = 0; // Reset custom tip when percentage is selected
                    document.getElementById('custom-tip-input').value = '';
                    calculateTotals();
                });
            });

            // Custom tip input
            const customTipInput = document.getElementById('custom-tip-input');
            customTipInput.addEventListener('input', function() {
                const value = parseFloat(this.value) || 0;
                if (value > 0) {
                    customTipAmount = value;
                    tipPercentage = 0; // Reset percentage when custom tip is entered
                    tipButtons.forEach(b => b.classList.remove('active'));
                    calculateTotals();
                } else {
                    customTipAmount = 0;
                    calculateTotals();
                }
            });

            // Coupon validation
            const applyCouponBtn = document.getElementById('apply-coupon-btn');
            const removeCouponBtn = document.getElementById('remove-coupon-btn');
            const couponCodeField = document.getElementById('coupon-code-field');
            const couponMessage = document.getElementById('coupon-message');

            applyCouponBtn.addEventListener('click', async function() {
                const code = couponCodeField.value.trim().toUpperCase();
                if (!code) {
                    couponMessage.textContent = 'Please enter a coupon code';
                    couponMessage.className = 'coupon-message error';
                    couponMessage.style.display = 'block';
                    return;
                }

                // Calculate current subtotal for validation
                const { subtotal } = calculateTotals();

                try {
                    const response = await fetch('/validate-coupon', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').content
                        },
                        body: JSON.stringify({
                            code: code,
                            subtotal: subtotal
                        })
                    });

                    const data = await response.json();

                    if (data.success && data.data) {
                        appliedCoupon = data.data;
                        couponDiscount = parseFloat(data.data.discount) || 0;
                        
                        document.getElementById('coupon-code-input').value = code;
                        document.getElementById('coupon-discount-input').value = couponDiscount.toFixed(2);
                        
                        couponMessage.textContent = `Coupon "${code}" applied! Discount: $${couponDiscount.toFixed(2)}`;
                        couponMessage.className = 'coupon-message success';
                        couponMessage.style.display = 'block';
                        
                        applyCouponBtn.style.display = 'none';
                        removeCouponBtn.style.display = 'inline-block';
                        couponCodeField.disabled = true;
                        
                        calculateTotals();
                    } else {
                        couponMessage.textContent = data.message || 'Invalid coupon code';
                        couponMessage.className = 'coupon-message error';
                        couponMessage.style.display = 'block';
                    }
                } catch (error) {
                    console.error('Coupon validation error:', error);
                    couponMessage.textContent = 'Failed to validate coupon. Please try again.';
                    couponMessage.className = 'coupon-message error';
                    couponMessage.style.display = 'block';
                }
            });

            removeCouponBtn.addEventListener('click', function() {
                appliedCoupon = null;
                couponDiscount = 0;
                document.getElementById('coupon-code-input').value = '';
                document.getElementById('coupon-discount-input').value = '0';
                couponCodeField.value = '';
                couponCodeField.disabled = false;
                couponMessage.style.display = 'none';
                applyCouponBtn.style.display = 'inline-block';
                removeCouponBtn.style.display = 'none';
                calculateTotals();
            });

            // Show sections when items are selected
            function showOrderSections() {
                document.getElementById('order-summary-section').style.display = 'block';
                document.getElementById('payment-method-section').style.display = 'block';
                document.getElementById('coupon-section').style.display = 'block';
                document.getElementById('tip-section').style.display = 'block';
            }

            function hideOrderSections() {
                document.getElementById('order-summary-section').style.display = 'none';
                document.getElementById('payment-method-section').style.display = 'none';
                document.getElementById('coupon-section').style.display = 'none';
                document.getElementById('tip-section').style.display = 'none';
            }

            // ========== END PAYMENT, TAX, COUPON, TIP FUNCTIONALITY ==========

            // Define updateFloatingToolbar in the correct scope (outside forEach)
            function updateFloatingToolbar() {
                const totalItems = Array.from(selectedItems.values()).reduce((sum, item) => sum + item.quantity, 0);
                
                // Update counts
                totalItemsCount.textContent = totalItems;
                
                // Calculate and update totals (includes tax, tip, discount)
                const totals = calculateTotals();
                
                // Show/hide toolbar based on items
                if (totalItems === 0) {
                    // Hide toolbar smoothly
                    floatingToolbar.className = "floating-toolbar collapsed";
                    hideOrderSections();
                    console.log("🔽 Toolbar hidden - no items selected");
                } else {
                    // Show toolbar smoothly
                    floatingToolbar.classList.add('show');
                    showOrderSections();
                    
                    // Update toolbar state
                    if (toolbarState === "collapsed" && totalItems > 0) {
                        toolbarState = "preview";
                        floatingToolbar.className = "floating-toolbar preview show";
                    }
                    
                    // Ensure toolbar is visible and scrollable
                    floatingToolbar.style.opacity = '1';
                    floatingToolbar.style.visibility = 'visible';
                    floatingToolbar.style.maxHeight = '80vh';
                    floatingToolbar.style.overflowY = 'auto';
                    
                    console.log("🔼 Toolbar shown - items selected:", totalItems);
                }
                
                // Update selected items display
                if (totalItems > 0) {
                    selectedItemsContainer.innerHTML = '';
                    
                    selectedItems.forEach((itemData, menuId) => {
                        const itemCard = document.createElement("div");
                        itemCard.classList.add("selected-item-card");
                         // Generate sides display
                         let sidesDisplay = '';
                         if (itemData.options && itemData.options.length > 0) {
                             console.log('Item has options, creating sides display');
                             sidesDisplay = '<div class="selected-item-sides">';
                             itemData.options.forEach(option => {
                                 console.log('Adding side tag:', option.text);
                                 sidesDisplay += `<span class="side-tag">${option.text}</span>`;
                             });
                             sidesDisplay += '</div>';
                         }
                         
                         itemCard.innerHTML = `
                             <img src="${itemData.image}" alt="${itemData.name}" class="selected-item-image">
                             <div class="selected-item-info">
                                 <h4 class="selected-item-name">${itemData.name}</h4>
                                 <p class="selected-item-price">$${itemData.price}</p>
                                 ${sidesDisplay}
    </div>
                             <div class="selected-item-actions">
                                 <div class="quantity-control">
                                     <button class="qty-btn danger" onclick="decreaseQuantity('${itemData.uniqueKey}')">-</button>
                                     <span class="qty-display">${itemData.quantity}</span>
                                     <button class="qty-btn" onclick="increaseQuantity('${itemData.uniqueKey}')">+</button>
</div>
                             </div>
                         `;
                        selectedItemsContainer.appendChild(itemCard);
                    });
                }
            }

    menuItems.forEach(item => {
        const backButton = item.querySelector('.flip-back-btn');
        const addItemButton = item.querySelector('.add-item-btn');
        
        console.log('Button elements found:', {
            backButton: !!backButton,
            addItemButton: !!addItemButton
        });
        const cardFront = item.querySelector('.card-front');
        const cardBack = item.querySelector('.card-back');
        const quantityBadge = item.querySelector('.quantity-badge');
        const quantityNumber = item.querySelector('.quantity-number');

        // Add item to cart with sides (for back add button)
        function addToCartWithSides() {
            // Check if item is stock-out
            const isStockOut = item.dataset.stockOut === '1' || item.classList.contains('stock-out') || item.classList.contains('disabled');
            if (isStockOut) {
                alert('This item is currently out of stock and cannot be added to the order.');
                return;
            }
            
            console.log('addToCartWithSides function called!');
            const menuId = item.dataset.id;
            const menuPrice = item.dataset.price;
            const menuName = item.dataset.name;
            const menuImage = item.dataset.image;
            console.log('Menu data:', { menuId, menuPrice, menuName, menuImage });
            
            // Collect selected options from the card back
            const selectedOptions = [];
            let totalOptionsPrice = 0;
            const optionInputs = cardBack.querySelectorAll('input[type="checkbox"]:checked, input[type="radio"]:checked');
            optionInputs.forEach(input => {
                const label = input.nextElementSibling;
                const optionText = label ? label.textContent.trim() : input.value;
                // Extract price from option text (format: "Option Name - 5.00€")
                const priceMatch = optionText.match(/- ([\d.]+)€/);
                const optionPrice = priceMatch ? parseFloat(priceMatch[1]) : 0;
                totalOptionsPrice += optionPrice;
                
                selectedOptions.push({
                    value: input.value,
                    text: optionText,
                    price: optionPrice
                });
            });
            console.log('Selected options:', selectedOptions);
            console.log('Total options price:', totalOptionsPrice);
            
            // Calculate total price including options
            const basePrice = parseFloat(menuPrice);
            const totalPrice = basePrice + totalOptionsPrice;
            
            // Create unique key that includes sides to allow multiple entries of same food with different sides
            const optionsKey = selectedOptions.map(opt => opt.value).sort().join(',');
            const uniqueKey = `${menuId}_${optionsKey}`;
            console.log('Unique key for cart with sides:', uniqueKey);
            
            if (!selectedItems.has(uniqueKey)) {
                selectedItems.set(uniqueKey, {
                    id: menuId,
                    uniqueKey: uniqueKey, // Store the unique key
                    name: menuName,
                    price: totalPrice, // Use total price including options
                    basePrice: basePrice, // Keep original price
                    optionsPrice: totalOptionsPrice, // Price of selected options
                    image: menuImage,
                    quantity: 0,
                    options: selectedOptions
                });
            }
            
            const itemData = selectedItems.get(uniqueKey);
            itemData.quantity++;
            item.dataset.quantity = itemData.quantity;
            
            // Update UI
            quantityNumber.textContent = itemData.quantity;
            quantityBadge.classList.add('show');
            
            // Show success message
            console.log('Item added to cart with sides:', itemData);
            
            // Flip back to front immediately (like back button)
            flipToFront.call(item);
            
            // Add success animation AFTER flip completes (flip takes 400ms)
            setTimeout(() => {
                item.classList.add('added-to-cart');
                setTimeout(() => {
                    item.classList.remove('added-to-cart');
                }, 1000);
            }, 450); // Wait for flip to complete
            
            // Update floating toolbar
            updateFloatingToolbar();
        }

        // Add item to cart (for front plus button - no sides)
        function addToCart() {
            // Check if item is stock-out
            const isStockOut = item.dataset.stockOut === '1' || item.classList.contains('stock-out') || item.classList.contains('disabled');
            if (isStockOut) {
                alert('This item is currently out of stock and cannot be added to the order.');
                return;
            }
            
            console.log('addToCart function called (front plus button)!');
            const menuId = item.dataset.id;
            const menuPrice = item.dataset.price;
            const menuName = item.dataset.name;
            const menuImage = item.dataset.image;
            const isCombo = item.dataset.isCombo === 'true';
            const comboId = item.dataset.comboId;
            console.log('Menu data:', { menuId, menuPrice, menuName, menuImage, isCombo, comboId });
            
            // Create unique key for items without sides (empty options)
            const uniqueKey = `${menuId}_no_sides`;
            console.log('Unique key for cart (no sides):', uniqueKey);
            
            if (!selectedItems.has(uniqueKey)) {
                const basePrice = parseFloat(menuPrice);
                selectedItems.set(uniqueKey, {
                    id: menuId,
                    uniqueKey: uniqueKey, // Store the unique key
                    name: menuName,
                    price: basePrice,
                    basePrice: basePrice, // Keep original price for tax calculations
                    image: menuImage,
                    quantity: 0,
                    options: [],
                    isCombo: isCombo,
                    comboId: comboId || null
                });
            }
            
            const itemData = selectedItems.get(uniqueKey);
            itemData.quantity++;
            item.dataset.quantity = itemData.quantity;
            
            // Update UI
            quantityNumber.textContent = itemData.quantity;
            quantityBadge.classList.add('show');
            
            // Show success message
            console.log('Item added to cart (no sides):', itemData);
            
            // Add success animation to the card
            item.classList.add('added-to-cart');
            setTimeout(() => {
                item.classList.remove('added-to-cart');
            }, 1000);
            
            // Update floating toolbar
            updateFloatingToolbar();
        }

        // Remove item from cart
        function removeFromCart() {
            console.log('removeFromCart function called!');
            const menuId = item.dataset.id;
            console.log('Removing menuId:', menuId);
            
            // Find the item in cart by menuId (since we don't know the exact unique key)
            let foundKey = null;
            for (let [key, itemData] of selectedItems.entries()) {
                if (itemData.id === menuId) {
                    foundKey = key;
                    break;
                }
            }
            
            if (foundKey && selectedItems.has(foundKey)) {
                const itemData = selectedItems.get(foundKey);
                itemData.quantity--;
                console.log('Reduced quantity to:', itemData.quantity);
                
                if (itemData.quantity <= 0) {
                    selectedItems.delete(foundKey);
                    quantityBadge.classList.remove('show');
                    item.dataset.quantity = '0';
                    console.log('Item completely removed from cart');
                } else {
                    item.dataset.quantity = itemData.quantity;
                    quantityNumber.textContent = itemData.quantity;
                    console.log('Item quantity reduced to:', itemData.quantity);
                }
                
                updateFloatingToolbar();
            } else {
                console.log('Item not found in cart - nothing to remove');
                alert('No item in cart to remove!');
            }
        }

        // Flip card to show options
        function flipToOptions() {
            const menuId = this.dataset.id;
            let menuOptions = [];
            
            // Force background color change
            setTimeout(() => {
                const cardBack = this.querySelector('.card-back');
                if (cardBack) {
                    cardBack.style.background = 'linear-gradient(135deg, #fcfcfc, #ffffff) !important';
                    cardBack.style.setProperty('background', 'linear-gradient(135deg, #fcfcfc, #ffffff)', 'important');
                }
            }, 100);
            try {
                menuOptions = JSON.parse(this.dataset.options || "[]"); 
            } catch (error) {
                console.error("Error parsing menu options:", error);
            }

            let filteredValues = menuOptions.filter(option => option.menu_id == menuId);

            // Populate options
            const optionsList = this.querySelector('.options-list');
            if (filteredValues.length > 0) {
                let groupedOptions = {};
                filteredValues.forEach(option => {
                    if (!groupedOptions[option.menu_option_id]) {
                        groupedOptions[option.menu_option_id] = {
                            display_type: option.display_type,
                            option_name: option.option_name,
                            options: []
                        };
                    }
                    if (!groupedOptions[option.menu_option_id].options.some(o => o.option_value_id === option.option_value_id)) {
                    groupedOptions[option.menu_option_id].options.push(option);
                    }
                });

                let optionsHTML = "";
                Object.keys(groupedOptions).forEach(menuOptionId => {
    let group = groupedOptions[menuOptionId];
    let inputType = group.display_type === "radio" ? "radio" : "checkbox"; 

    optionsHTML += `<div class="option-group ${inputType === 'radio' ? 'radio-group' : ''}">
        <h5>${group.option_name}</h5>`;

    group.options.forEach(option => {
        optionsHTML += `
            <div class="form-check">
                <input class="form-check-input" type="${inputType}" 
                       name="menu_options[${menuId}][]" 
                       value="${option.option_value_id}" 
                       id="option_${menuId}_${option.option_value_id}">
                <label class="form-check-label" for="option_${menuId}_${option.option_value_id}">
                    ${option.value} - ${parseFloat(option.price).toFixed(2)}€
                </label>
            </div>`;
    });
    optionsHTML += `</div>`; 
});
                optionsList.innerHTML = optionsHTML;
                
                // Force colors on dynamically created elements
                setTimeout(() => {
                    const cardBack = this.querySelector('.card-back');
                    if (cardBack) {
                        // Force header h4 color
                        const headerH4 = cardBack.querySelector('.back-header h4');
                        if (headerH4) {
                            headerH4.style.color = '#2c3e50';
                            headerH4.style.setProperty('color', '#2c3e50', 'important');
                        }
                        
                        // Force option group h5 colors
                        const optionH5s = cardBack.querySelectorAll('.option-group h5');
                        optionH5s.forEach(h5 => {
                            h5.style.color = '#2c3e50';
                            h5.style.setProperty('color', '#2c3e50', 'important');
                        });
                        
                        // Force form check label colors
                        const labels = cardBack.querySelectorAll('.form-check-label, label');
                        labels.forEach(label => {
                            label.style.color = '#2c3e50';
                            label.style.setProperty('color', '#2c3e50', 'important');
                        });
                        
                        // Force scrollbar colors - add class to ensure CSS applies
                        const optionsContent = cardBack.querySelector('.options-content');
                        if (optionsContent) {
                            optionsContent.classList.add('force-dark-scrollbar');
                            optionsContent.style.setProperty('scrollbar-width', 'thin', 'important');
                            optionsContent.style.setProperty('scrollbar-color', '#2c3e50 #f7fafc', 'important');
                        }
                    }
                }, 50);
                
                // Add event listeners to make options clickable
                setTimeout(() => {
                    const optionInputs = optionsList.querySelectorAll('input[type="checkbox"], input[type="radio"]');
                    console.log('Found option inputs:', optionInputs.length);
                    
                    optionInputs.forEach((input, index) => {
                        console.log(`Setting up input ${index}:`, input);
                        
                        // Make input clickable
                        input.addEventListener('click', function(e) {
                            e.stopPropagation();
                            console.log('Input clicked:', this.value, this.checked);
                        });
                        
                        input.addEventListener('change', function(e) {
                            e.stopPropagation();
                            console.log('Option changed:', this.value, this.checked);
                        });
                        
                        // Make label clickable
                        const label = input.nextElementSibling;
                        if (label) {
                            label.addEventListener('click', function(e) {
                                e.preventDefault();
                                e.stopPropagation();
                                console.log('Label clicked for input:', input.value);
                                input.checked = !input.checked;
                                input.dispatchEvent(new Event('change'));
                            });
                        }
                    });
                }, 200);
            } else {
                optionsList.innerHTML = `
       <div class="no-options-container">
            <div class="no-options-card">
                <img src="//cdn-icons-png.flaticon.com/512/190/190406.png" class="no-options-img" alt="No customizations">
                            <p class="no-options-text">No customizations available for this dish.</p>
            </div>
        </div>
                `;
            }
            
            // Show back of card with smooth flip animation
            this.classList.add('flipped');
        }

        // Flip back to front
        function flipToFront() {
            this.classList.remove('flipped');
        }

                // updateFloatingToolbar is now defined outside forEach in the correct scope
                
                // Global functions for quantity control
                window.increaseQuantity = function(uniqueKey) {
                    if (selectedItems.has(uniqueKey)) {
                        const itemData = selectedItems.get(uniqueKey);
                        itemData.quantity++;
                        
                        // Update card
                        const card = document.querySelector(`[data-id="${itemData.id}"]`);
                        if (card) {
                            card.dataset.quantity = itemData.quantity;
                            card.querySelector('.quantity-number').textContent = itemData.quantity;
                        }
                        
                        updateFloatingToolbar();
                    }
                };
                
                window.decreaseQuantity = function(uniqueKey) {
                    if (selectedItems.has(uniqueKey)) {
                        const itemData = selectedItems.get(uniqueKey);
                        itemData.quantity--;
                        
                        if (itemData.quantity <= 0) {
                            selectedItems.delete(uniqueKey);
                            
                            // Update card
                            const card = document.querySelector(`[data-id="${itemData.id}"]`);
                            if (card) {
                                card.dataset.quantity = '0';
                                card.querySelector('.quantity-badge').style.display = 'none';
                            }
                        } else {
                            // Update card
                            const card = document.querySelector(`[data-id="${itemData.id}"]`);
                            if (card) {
                                card.dataset.quantity = itemData.quantity;
                                card.querySelector('.quantity-number').textContent = itemData.quantity;
                            }
                        }
                        
                        updateFloatingToolbar();
                    }
                };

        // Event listeners
        addItemButton.addEventListener('click', function(e) {
            e.stopPropagation();
            console.log('Add button clicked!');
            addToCartWithSides();
        });

        backButton.addEventListener('click', function(e) {
            e.stopPropagation();
            console.log('Back button clicked!');
            flipToFront.call(this.closest('.interactive-card'));
        });


        // Click on card to flip to options (if has options)
        item.addEventListener('click', function(e) {
            // Prevent interaction with stock-out items
            const isStockOut = this.dataset.stockOut === '1' || this.classList.contains('stock-out') || this.classList.contains('disabled');
            if (isStockOut) {
                e.preventDefault();
                e.stopPropagation();
                alert('This item is currently out of stock and cannot be added to the order.');
                return;
            }
            
            if (e.target.closest('.add-item-btn') || e.target.closest('.flip-back-btn')) {
                return;
            }
            
            const menuId = this.dataset.id;
            let menuOptions = [];
            try {
                menuOptions = JSON.parse(this.dataset.options || "[]"); 
            } catch (error) {
                console.error("Error parsing menu options:", error);
            }

            let filteredValues = menuOptions.filter(option => option.menu_id == menuId);
            
            if (filteredValues.length > 0) {
                flipToOptions.call(this);
            } else {
                addToCart();
            }
        });

        // Toolbar event listeners - Guard against duplicate listeners
        if (!toggleToolbarBtn.dataset.hasClickListener) {
            toggleToolbarBtn.dataset.hasClickListener = 'true';
            
            toggleToolbarBtn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                console.log('Toggle button clicked, current state:', toolbarState);
                if (toolbarState === "collapsed") {
                    // If collapsed, go to preview (shouldn't happen normally)
                    toolbarState = "preview";
                    floatingToolbar.className = "floating-toolbar preview show";
                    // Remove inline transform to let CSS handle it
                    floatingToolbar.style.transform = '';
                    toggleToolbarBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
                } else if (toolbarState === "preview") {
                    toolbarState = "expanded";
                    floatingToolbar.className = "floating-toolbar expanded show";
                    // Remove inline transform to let CSS handle it
                    floatingToolbar.style.transform = '';
                    toggleToolbarBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
                } else if (toolbarState === "expanded") {
                    toolbarState = "preview";
                    floatingToolbar.className = "floating-toolbar preview show";
                    // Remove inline transform to let CSS handle it
                    floatingToolbar.style.transform = '';
                    toggleToolbarBtn.innerHTML = '<i class="fas fa-chevron-up"></i>';
                }
                console.log('New toolbar state:', toolbarState);
            });
        }


        placeOrderBtn.addEventListener('click', function(e) {
            e.preventDefault();
            
            if (selectedItems.size === 0) {
                alert('Please select at least one item');
                return;
            }
            
            // Check if table is selected
            const selectedTable = document.getElementById('selected-table');
            if (!selectedTable || !selectedTable.value) {
                alert('Please select a table first');
                return;
            }
            
            // Find the form and submit it
            const form = document.querySelector('form');
            if (form) {
                // FIRST: Remove ALL existing menu-related hidden inputs to prevent duplicates
                // Also remove combo inputs to prevent duplicates
                form.querySelectorAll('input[name="menu_id[]"], input[name="menu_name[]"], input[name="menu_price[]"], input[name="qty[]"], input[name="combo_id[]"], input[name="combo_qty[]"], input[name^="menu_options"]').forEach(input => input.remove());
                
                console.log('🛒 Cart contents before submission:', selectedItems);
                
                // Add selected items to form as hidden inputs
                selectedItems.forEach((itemData, uniqueKey) => {
                    // Check if this is a combo
                    if (itemData.isCombo && itemData.comboId) {
                        // For combos, we'll expand them into their component items
                        // Add a marker to indicate this is a combo
                        const comboMarkerInput = document.createElement('input');
                        comboMarkerInput.type = 'hidden';
                        comboMarkerInput.name = 'combo_id[]';
                        comboMarkerInput.value = itemData.comboId;
                        form.appendChild(comboMarkerInput);
                        
                        const comboQtyInput = document.createElement('input');
                        comboQtyInput.type = 'hidden';
                        comboQtyInput.name = 'combo_qty[]';
                        comboQtyInput.value = itemData.quantity;
                        form.appendChild(comboQtyInput);
                        
                        console.log(`📦 Processing combo: ${itemData.name} (Combo ID: ${itemData.comboId}, Qty: ${itemData.quantity})`);
                    } else {
                        // Regular menu item
                    const menuId = itemData.id;
                    
                    console.log(`📦 Processing cart item: ${itemData.name} (ID: ${menuId}, Qty: ${itemData.quantity})`);
                    
                    // Add new inputs
                    const menuIdInput = document.createElement('input');
                    menuIdInput.type = 'hidden';
                    menuIdInput.name = 'menu_id[]';
                    menuIdInput.value = menuId;
                    form.appendChild(menuIdInput);
                    
                    const menuNameInput = document.createElement('input');
                    menuNameInput.type = 'hidden';
                    menuNameInput.name = 'menu_name[]';
                    menuNameInput.value = itemData.name;
                    form.appendChild(menuNameInput);
                    
                    const menuPriceInput = document.createElement('input');
                    menuPriceInput.type = 'hidden';
                    menuPriceInput.name = 'menu_price[]';
                    menuPriceInput.value = itemData.basePrice || itemData.price;
                    form.appendChild(menuPriceInput);
                    
                    const qtyInput = document.createElement('input');
                    qtyInput.type = 'hidden';
                    qtyInput.name = 'qty[]';
                    qtyInput.value = itemData.quantity;
                    form.appendChild(qtyInput);
                    
                    // Add menu options/sides if they exist
                    if (itemData.options && itemData.options.length > 0) {
                        console.log(`✅ Adding ${itemData.options.length} unique options for menu ID ${menuId}:`, itemData.options);
                        itemData.options.forEach(option => {
                            const optionInput = document.createElement('input');
                            optionInput.type = 'hidden';
                            optionInput.name = `menu_options[${menuId}][]`;
                            optionInput.value = option.value; // This is the option_value_id
                            form.appendChild(optionInput);
                            console.log(`   ➕ Option: ${option.text} (value_id: ${option.value})`);
                        });
                    } else {
                        console.log(`ℹ️  No options for menu ID ${menuId}`);
                        }
                    }
                });
                
                // Ensure table_id is set
                const tableIdInput = form.querySelector('input[name="table_id"]');
                if (tableIdInput) {
                    tableIdInput.value = selectedTableInput.value;
                    console.log('Table ID being set to:', selectedTableInput.value);
                }
                
                // Ensure payment method is set
                const paymentMethodInput = form.querySelector('input[name="payment_method"]');
                if (paymentMethodInput) {
                    paymentMethodInput.value = selectedPaymentMethod;
                    console.log('Payment method:', selectedPaymentMethod);
                }
                
                // Calculate final totals before submission
                const totals = calculateTotals();
                console.log('Final totals:', totals);
                
                // Debug: Log form data before submission
                console.log('Form data being submitted:');
                const formData = new FormData(form);
                for (let [key, value] of formData.entries()) {
                    console.log(key, value);
                }
                
                // Submit the form
                form.submit();
            }
        });
    });
});

// Debug function - run this in console to test positioning
window.debugToolbar = function() {
    const toolbar = document.getElementById('floating-toolbar');
    if (toolbar) {
        console.log("🔧 FORCING TOOLBAR POSITIONING...");
        
        // Move to body
        document.body.appendChild(toolbar);
        
        // Force positioning
        toolbar.style.position = 'fixed';
        toolbar.style.bottom = '1.5rem';
        toolbar.style.left = '50%';
        toolbar.style.transform = 'translateX(-50%)';
        toolbar.style.zIndex = '99999';
        toolbar.style.opacity = '1';
        toolbar.style.visibility = 'visible';
        toolbar.style.display = 'block';
        
        console.log("✅ Toolbar should now be at viewport bottom!");
        console.log("Position:", toolbar.style.position);
        console.log("Bottom:", toolbar.style.bottom);
        console.log("Transform:", toolbar.style.transform);
    }
};

// Make toolbar visible immediately
window.showToolbar = function() {
    const toolbar = document.getElementById('floating-toolbar');
    if (toolbar) {
        toolbar.style.opacity = '1';
        toolbar.style.visibility = 'visible';
        toolbar.style.display = 'block';
        toolbar.classList.add('show');
        console.log("✅ Toolbar made visible!");
    }
};

// Auto-fix on page load
setTimeout(() => {
    const toolbar = document.getElementById('floating-toolbar');
    if (toolbar) {
        document.body.appendChild(toolbar);
        toolbar.style.position = 'fixed';
        toolbar.style.bottom = '1.5rem';
        toolbar.style.left = '50%';
        toolbar.style.transform = 'translateX(-50%) translateY(100px)';
        toolbar.style.zIndex = '99999';
        toolbar.style.opacity = '0';
        toolbar.style.visibility = 'hidden';
        toolbar.style.display = 'block';
        console.log("🚀 Auto-fixed toolbar positioning - hidden by default");
    }
}, 1000);


</script>

<script>
document.addEventListener("DOMContentLoaded", function () {
    const tableItems = document.querySelectorAll(".table-item");
    const orderForm = document.querySelector(".order-form");
    selectedTableInput = document.getElementById("selected-table");
    const editLayoutBtn = document.getElementById("edit-layout-btn");
    const tableGrid = document.querySelector(".table-grid");
    const tableGridContainer = document.getElementById("table-grid");
    const gridOverlay = document.getElementById("grid-overlay");
    const zoomInBtn = document.getElementById("zoom-in");
    const zoomOutBtn = document.getElementById("zoom-out");
    const resetZoomBtn = document.getElementById("reset-zoom");
    const zoomLevelIndicator = document.getElementById("zoom-level");
    
    let isEditMode = false;
    let isDragging = false;
    let startX, startY, scrollLeft, scrollTop;
    let currentZoom = 1;
    const minZoom = 0.5;
    const maxZoom = 2;

    // Initialize SortableJS for drag and drop
    let sortable = null;
    let isDraggingTable = false;
    let draggedElement = null;
    let initialX, initialY;

    // Cashier click handler with edit mode and drag detection
    (function () {
        const btn = document.getElementById('cashierButton');
        if (!btn) return;
        console.log('cashier table ID = {{ $cashierTableId ?? "not found" }}');
        console.log('cashier URL = {{ $cashierUrl }}');
        
        var url = btn.getAttribute('data-url');
        var down = {x:0,y:0}, moved=false, thresh=6;
        
        btn.addEventListener('pointerdown', function(e){ 
            down.x=e.clientX; 
            down.y=e.clientY; 
            moved=false; 
        }, {passive:true});
        
        btn.addEventListener('pointermove', function(e){ 
            if(Math.hypot(e.clientX-down.x, e.clientY-down.y) > thresh) moved = true; 
        }, {passive:true});
        
        btn.addEventListener('click', function(e){
            if (typeof isEditMode !== 'undefined' && isEditMode) { 
                e.preventDefault(); 
                e.stopPropagation(); 
                return false; 
            }
            if (moved) { 
                e.preventDefault(); 
                e.stopPropagation(); 
                return false; 
            }
            
            // NEW: Show menu for Cashier table instead of opening frontend
            console.log('Cashier table selected');
            const tableName = 'Cashier';
            const tableId = btn.dataset.tableId || 'cashier';
            const tableNo = '0'; // Cashier is typically table 0
            
            // Set the selected table for order processing
            selectedTableInput.value = tableName;
            console.log('Table selected (Cashier):', tableName);
            
            // Show smooth transition to menu
            showMenuForTable(tableName, tableId, tableNo);
        }, true);
    })();

    // Table selection functionality - NEW: Show menu directly in admin panel
    console.log('Setting up table click handlers for', tableItems.length, 'tables');
    tableItems.forEach(item => {
        item.addEventListener("click", function (event) {
            console.log('Table item clicked:', this);
            console.log('Table element:', this);
            console.log('Table classes:', this.className);
            console.log('Table dataset:', this.dataset);
            event.preventDefault(); // Prevent any default behavior
            event.stopPropagation(); // Stop event bubbling
            
            // Check if move mode is active - handled by move mode handler
            if (isMoveMode) {
                return; // Move mode handler will process this
            }
            
            if (isEditMode) {
                console.log('Edit mode active, ignoring table click');
                return; // Don't select tables in edit mode
            }
            
            const value = this.dataset.value;
            const tableId = this.dataset.tableId;
            const tableNo = this.dataset.tableNo;
            
            if (value === "Cashier") {
                // Cashier is handled by dedicated click handler - do nothing here
                return;
            } else {
                // Handle table selection - Show menu directly in admin panel
                // ALLOW ALL TABLES regardless of status (received, complete, cancelled, etc.)
                
                tableItems.forEach(i => i.classList.remove("selected"));
                this.classList.add("selected");
                
                // Set the selected table for order processing
                const tableName = value.split('_')[0];
                selectedTableInput.value = tableName;
                console.log('Table selected (Regular):', tableName);
                
                // Show smooth transition to menu
                console.log('Calling showMenuForTable with:', tableName, tableId, tableNo);
                showMenuForTable(tableName, tableId, tableNo);
            }
        });
    });

    // Edit layout toggle
    editLayoutBtn.addEventListener("click", function () {
        isEditMode = !isEditMode;
        
        if (isEditMode) {
            // Enter edit mode
            this.classList.add("active");
            this.innerHTML = '<i class="fa fa-save"></i> Save Layout';
            tableGrid.classList.add("edit-mode");
            tableItems.forEach(item => item.classList.add("edit-mode"));
            
            // Show grid overlay for alignment
            gridOverlay.classList.add("active");
            
            // Enable free positioning drag and drop
            enableTableDragging();
            
            // Enable panning
            enablePanning();
        } else {
            // Exit edit mode
            this.classList.remove("active");
            this.innerHTML = '<i class="fa fa-edit"></i> Edit Layout';
            tableGrid.classList.remove("edit-mode");
            tableItems.forEach(item => item.classList.remove("edit-mode"));
            
            // Hide grid overlay
            gridOverlay.classList.remove("active");
            
            // Disable table dragging
            disableTableDragging();
            
            // Disable panning
            disablePanning();
            
            // Save layout to localStorage and database
            saveLayout();
        }
    });

    // Move Table Mode
    let isMoveMode = false;
    let moveSourceTable = null;
    const moveTableBtn = document.getElementById('move-table-btn');
    let moveInstructionElement = null;

    // Function to show move instruction as flash message
    function showMoveInstruction(message) {
        // Remove existing move instruction if any
        if (moveInstructionElement) {
            moveInstructionElement.remove();
        }
        
        // Get notification container
        const notificationContainer = document.getElementById('notification');
        if (!notificationContainer) {
            console.error('Notification container not found');
            return;
        }
        
        // Create flash message element (exactly like other flash messages)
        moveInstructionElement = document.createElement('div');
        moveInstructionElement.className = 'alert alert-success flash-message animated fadeInDown alert-dismissible show';
        moveInstructionElement.setAttribute('data-allow-dismiss', 'true');
        moveInstructionElement.setAttribute('role', 'alert');
        moveInstructionElement.setAttribute('id', 'move-instruction');
        moveInstructionElement.innerHTML = message + '<button type="button" class="btn-close" data-bs-dismiss="alert" aria-hidden="true"></button>';
        
        // Prepend to notification container (so it appears at top)
        notificationContainer.insertBefore(moveInstructionElement, notificationContainer.firstChild);
    }

    // Function to hide move instruction
    function hideMoveInstruction() {
        if (moveInstructionElement) {
            moveInstructionElement.classList.add('fadeOutUp');
            moveInstructionElement.addEventListener('animationend', function() {
                if (moveInstructionElement && moveInstructionElement.parentNode) {
                    moveInstructionElement.remove();
                }
                moveInstructionElement = null;
            });
        }
    }

    moveTableBtn.addEventListener("click", function () {
        isMoveMode = !isMoveMode;
        
        if (isMoveMode) {
            // Enter move mode
            this.classList.add("active");
            this.innerHTML = '<i class="fa fa-times"></i> Cancel Move';
            tableGrid.classList.add("move-mode");
            moveSourceTable = null;
            
            // Show instruction as flash message
            showMoveInstruction('Click on source table');
            
            // Disable edit mode if active
            if (isEditMode) {
                editLayoutBtn.click();
            }
        } else {
            // Exit move mode
            this.classList.remove("active");
            this.innerHTML = '<i class="fa fa-exchange-alt"></i> Move Table';
            tableGrid.classList.remove("move-mode");
            
            // Clear selections
            tableItems.forEach(item => {
                item.classList.remove("move-source", "move-target");
            });
            
            moveSourceTable = null;
            hideMoveInstruction();
        }
    });

    // Handle table clicks in move mode (use capture phase to run before normal handlers)
    tableItems.forEach(item => {
        item.addEventListener("click", function (event) {
            if (!isMoveMode) {
                return; // Let normal click handler work
            }
            
            // Stop event from reaching normal handler
            event.preventDefault();
            event.stopPropagation();
            event.stopImmediatePropagation();
            
            // Skip cashier
            if (this.classList.contains('cashier-option')) {
                return;
            }
            
            const tableName = this.dataset.value.split('_')[0];
            const tableId = this.dataset.tableId;
            
            if (!moveSourceTable) {
                // First click: Select source table
                moveSourceTable = {
                    element: this,
                    tableName: tableName,
                    tableId: tableId
                };
                
                // Visual feedback
                tableItems.forEach(i => i.classList.remove("move-source", "move-target"));
                this.classList.add("move-source");
                
                // Update instruction
                showMoveInstruction(`${tableName} selected. Click on destination table.`);
            } else {
                // Second click: Select destination table
                if (this === moveSourceTable.element) {
                    // Clicked same table, cancel selection
                    this.classList.remove("move-source");
                    moveSourceTable = null;
                    showMoveInstruction('Click on source table');
                    return;
                }
                
                const destTableName = tableName;
                const destTableId = tableId;
                
                // Visual feedback
                this.classList.add("move-target");
                
                // Confirm and execute move
                const confirmMessage = `Move order from ${moveSourceTable.tableName} to ${destTableName}?`;
                if (confirm(confirmMessage)) {
                    moveOrderBetweenTables(
                        moveSourceTable.tableName,
                        moveSourceTable.tableId,
                        destTableName,
                        destTableId
                    );
                } else {
                    // User cancelled, reset visual feedback
                    this.classList.remove("move-target");
                }
            }
        }, true); // Use capture phase to run before normal handlers
    });

    // Function to move order between tables
    function moveOrderBetweenTables(sourceTableName, sourceTableId, destTableName, destTableId) {
        // Use TastyIgniter's AJAX handler system
        const formData = new FormData();
        formData.append('_handler', 'create_onMoveTable');
        formData.append('source_table_name', sourceTableName);
        formData.append('source_table_id', sourceTableId);
        formData.append('dest_table_name', destTableName);
        formData.append('dest_table_id', destTableId);
        
        // Use TastyIgniter's request system if available, otherwise fallback to fetch
        if (typeof $.request !== 'undefined') {
            $.request('onMoveTable', {
                data: {
                    source_table_name: sourceTableName,
                    source_table_id: sourceTableId,
                    dest_table_name: destTableName,
                    dest_table_id: destTableId
                },
                success: function(data) {
                    // TastyIgniter returns data in response object
                    const result = data.success !== undefined ? data : (data.result || data);
                    if (result && result.success) {
                        // Hide move instruction
                        hideMoveInstruction();
                        // Exit move mode
                        moveTableBtn.click();
                        // Reload page to show updated table states
                        window.location.reload();
                    } else {
                        alert(result && result.message ? result.message : 'Failed to move order. Please try again.');
                    }
                },
                error: function(jqXHR, textStatus, errorThrown) {
                    console.error('Move order error:', textStatus, errorThrown, jqXHR);
                    let errorMsg = 'An error occurred while moving the order. Please try again.';
                    if (jqXHR.responseJSON && jqXHR.responseJSON.message) {
                        errorMsg = jqXHR.responseJSON.message;
                    }
                    alert(errorMsg);
                }
            });
        } else {
            // Fallback to fetch if TastyIgniter request system not available
            fetch('/admin/orders/create', {
                method: 'POST',
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'X-IGNITER-REQUEST-HANDLER': 'onMoveTable'
                },
                body: formData
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`Server error: ${response.status} ${response.statusText}`);
                }
                return response.json();
            })
            .then(data => {
                if (data.success) {
                    alert(data.message || `Order successfully moved from ${sourceTableName} to ${destTableName}!`);
                    window.location.reload();
                } else {
                    alert(`Error: ${data.message || 'Failed to move order'}`);
                }
            })
            .catch(error => {
                console.error('Move order error:', error);
                alert('An error occurred while moving the order: ' + error.message + '. Please try again.');
            });
        }
    }

    // Enable free positioning drag and drop for tables
    function enableTableDragging() {
        tableItems.forEach(item => {
            item.addEventListener('mousedown', startTableDrag);
            item.addEventListener('touchstart', startTableDrag);
        });
        
        document.addEventListener('mousemove', onTableDrag);
        document.addEventListener('touchmove', onTableDrag);
        document.addEventListener('mouseup', stopTableDrag);
        document.addEventListener('touchend', stopTableDrag);
    }

    // Disable table dragging
    function disableTableDragging() {
        tableItems.forEach(item => {
            item.removeEventListener('mousedown', startTableDrag);
            item.removeEventListener('touchstart', startTableDrag);
        });
        
        document.removeEventListener('mousemove', onTableDrag);
        document.removeEventListener('touchmove', onTableDrag);
        document.removeEventListener('mouseup', stopTableDrag);
        document.removeEventListener('touchend', stopTableDrag);
    }

    // Start dragging a table - SIMPLE AND RELIABLE
    function startTableDrag(e) {
        if (!isEditMode) return;
        
        e.preventDefault();
        isDraggingTable = true;
        draggedElement = e.currentTarget;
        
        // Get the current position from the style
        const currentLeft = parseInt(draggedElement.style.left) || 0;
        const currentTop = parseInt(draggedElement.style.top) || 0;
        
        // SIMPLE: Just calculate the difference between mouse and current position
        initialX = e.clientX - currentLeft;
        initialY = e.clientY - currentTop;
        
        draggedElement.style.zIndex = '1000';
        draggedElement.style.cursor = 'grabbing';
    }

    // Handle table dragging - SIMPLE AND RELIABLE
    function onTableDrag(e) {
        if (!isDraggingTable || !draggedElement) return;
        
        e.preventDefault();
        
        const clientX = e.clientX || (e.touches && e.touches[0].clientX);
        const clientY = e.clientY || (e.touches && e.touches[0].clientY);
        
        if (clientX && clientY) {
            // SIMPLE: Just subtract the initial offset
            const newX = clientX - initialX;
            const newY = clientY - initialY;
            
            // Allow tables to move in a much larger area
            const containerRect = tableGridContainer.getBoundingClientRect();
            const gridRect = tableGrid.getBoundingClientRect();
            
            // Use the grid dimensions for bounds, not the container
            const maxX = Math.max(2000, gridRect.width) - draggedElement.offsetWidth;
            const maxY = Math.max(2000, gridRect.height) - draggedElement.offsetHeight;
            
            // Allow negative positions for more freedom
            const finalX = Math.max(-100, Math.min(newX, maxX));
            const finalY = Math.max(-100, Math.min(newY, maxY));
            
            // Apply snapping to align with other tables
            const snappedX = snapToGrid(finalX, 'x');
            const snappedY = snapToGrid(finalY, 'y');
            
            draggedElement.style.left = snappedX + 'px';
            draggedElement.style.top = snappedY + 'px';
        }
    }

    // Snap tables to grid for alignment
    function snapToGrid(value, axis) {
        const snapDistance = 20; // Distance for snapping
        const otherTables = Array.from(tableItems).filter(item => item !== draggedElement);
        
        let snappedValue = value;
        let isSnapping = false;
        
        otherTables.forEach(table => {
            const tableRect = table.getBoundingClientRect();
            const containerRect = tableGridContainer.getBoundingClientRect();
            
            if (axis === 'x') {
                const tableX = parseInt(table.style.left) || 0;
                if (Math.abs(value - tableX) < snapDistance) {
                    snappedValue = tableX;
                    isSnapping = true;
                    // Add visual feedback to the table being snapped to
                    table.classList.add('snapping');
                    setTimeout(() => table.classList.remove('snapping'), 200);
                }
            } else if (axis === 'y') {
                const tableY = parseInt(table.style.top) || 0;
                if (Math.abs(value - tableY) < snapDistance) {
                    snappedValue = tableY;
                    isSnapping = true;
                    // Add visual feedback to the table being snapped to
                    table.classList.add('snapping');
                    setTimeout(() => table.classList.remove('snapping'), 200);
                }
            }
        });
        
        return snappedValue;
    }



    // Stop dragging a table
    function stopTableDrag() {
        if (draggedElement) {
            draggedElement.style.zIndex = '10';
            draggedElement.style.cursor = 'grab';
        draggedElement = null;
        }
        isDraggingTable = false;
    }

    // Enable panning functionality (Google Maps-like)
    function enablePanning() {
        tableGridContainer.addEventListener('mousedown', startPanning);
        tableGridContainer.addEventListener('mousemove', panning);
        tableGridContainer.addEventListener('mouseup', stopPanning);
        tableGridContainer.addEventListener('mouseleave', stopPanning);
        
        // Touch events for mobile
        tableGridContainer.addEventListener('touchstart', startPanningTouch);
        tableGridContainer.addEventListener('touchmove', panningTouch);
        tableGridContainer.addEventListener('touchend', stopPanning);
    }

    // Disable panning functionality
    function disablePanning() {
        tableGridContainer.removeEventListener('mousedown', startPanning);
        tableGridContainer.removeEventListener('mousemove', panning);
        tableGridContainer.removeEventListener('mouseup', stopPanning);
        tableGridContainer.removeEventListener('mouseleave', stopPanning);
        
        tableGridContainer.removeEventListener('touchstart', startPanningTouch);
        tableGridContainer.removeEventListener('touchmove', panningTouch);
        tableGridContainer.removeEventListener('touchend', stopPanning);
    }

    // Mouse panning
    function startPanning(e) {
        if (e.target.closest('.table-item')) return; // Don't pan if clicking on table items
        
        isDragging = true;
        startX = e.pageX - tableGridContainer.offsetLeft;
        startY = e.pageY - tableGridContainer.offsetTop;
        scrollLeft = tableGrid.scrollLeft;
        scrollTop = tableGrid.scrollTop;
        
        tableGridContainer.style.cursor = 'grabbing';
        e.preventDefault();
    }

    function panning(e) {
        if (!isDragging) return;
        
        e.preventDefault();
        const x = e.pageX - tableGridContainer.offsetLeft;
        const y = e.pageY - tableGridContainer.offsetTop;
        const walkX = (x - startX) * 3; // Increased panning speed
        const walkY = (y - startY) * 3;
        
        tableGrid.scrollLeft = scrollLeft - walkX;
        tableGrid.scrollTop = scrollTop - walkY;
    }

    function stopPanning() {
        isDragging = false;
        tableGridContainer.style.cursor = 'grab';
    }

    // Touch panning
    function startPanningTouch(e) {
        if (e.target.closest('.table-item')) return;
        
        isDragging = true;
        const touch = e.touches[0];
        startX = touch.pageX - tableGridContainer.offsetLeft;
        startY = touch.pageY - tableGridContainer.offsetTop;
        scrollLeft = tableGrid.scrollLeft;
        scrollTop = tableGrid.scrollTop;
    }

    function panningTouch(e) {
        if (!isDragging) return;
        
        e.preventDefault();
        const touch = e.touches[0];
        const x = touch.pageX - tableGridContainer.offsetLeft;
        const y = touch.pageY - tableGridContainer.offsetTop;
        const walkX = (x - startX) * 3; // Increased panning speed
        const walkY = (y - startY) * 3;
        
        tableGrid.scrollLeft = scrollLeft - walkX;
        tableGrid.scrollTop = scrollTop - walkY;
    }

    // Save layout to localStorage and database - FIXED FOR DUPLICATE TABLES
    function saveLayout() {
        const tableOrder = Array.from(tableGrid.children).map((item, index) => {
            // Create unique identifier for duplicate tables
            const baseValue = item.dataset.value;
            const currentX = parseInt(item.style.left) || 0;
            const currentY = parseInt(item.style.top) || 0;
            
            // For duplicate tables, create a unique key based on position
            let uniqueValue = baseValue;
            // The baseValue is already unique now (table_name_table_id)
            uniqueValue = baseValue;
            
            return {
                value: baseValue,
                uniqueValue: uniqueValue,
                tableId: item.dataset.tableId || null,
                position: index,
                x: currentX,
                y: currentY,
                originalX: item.offsetLeft,
                originalY: item.offsetTop
            };
        });
        
        // Save to localStorage
        localStorage.setItem('tableLayout', JSON.stringify(tableOrder));
        
        // Save to database via AJAX
        saveLayoutToDatabase(tableOrder);
        
        console.log('Table layout saved:', tableOrder);
        
        // Don't show success message here - let saveLayoutToDatabase handle it
    }

    // Save layout to database
    function saveLayoutToDatabase(layout) {
        fetch('/admin/orders/save-table-layout', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRF-TOKEN': document.querySelector('meta[name="csrf-token"]').getAttribute('content')
            },
            body: JSON.stringify({ layout: layout })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }
            return response.json();
        })
        .then(data => {
            if (data.success) {
                console.log('Layout saved to database');
                // Only show success message if database save was successful
                showSaveMessage('Layout saved successfully!', 'success');
            } else {
                console.error('Failed to save layout to database');
                showSaveMessage('Failed to save to database', 'error');
            }
        })
        .catch(error => {
            console.error('Error saving layout:', error);
            // Don't show error message here since we already saved to localStorage
            // The error is just for database saving
        });
    }

    // Show save message
    function showSaveMessage(message, type) {
        const messageDiv = document.createElement('div');
        messageDiv.className = `save-message ${type}`;
        messageDiv.textContent = message;
        
        document.body.appendChild(messageDiv);
        
        setTimeout(() => {
            messageDiv.remove();
        }, 3000);
    }

    // Load layout from localStorage - FIXED FOR DUPLICATE TABLES
    function loadLayout() {
        const savedLayout = localStorage.getItem('tableLayout');
        if (savedLayout) {
            try {
                const layout = JSON.parse(savedLayout);
                
                // Restore table positions - now each table has a unique value
                layout.forEach(item => {
                    // Find the specific table element by its unique value
                    const tableElement = document.querySelector(`[data-value="${item.value}"]`);
                    
                    if (tableElement && item.x !== undefined && item.y !== undefined) {
                        tableElement.style.left = item.x + 'px';
                        tableElement.style.top = item.y + 'px';
                    }
                });
                
                console.log('Table layout loaded and restored:', layout);
            } catch (e) {
                console.error('Error loading table layout:', e);
            }
        }
    }

    // Load layout on page load
    loadLayout();
    
    // Load initial table statuses
    refreshTableStatuses();

    // Refresh table statuses every 30 seconds
    setInterval(refreshTableStatuses, 30000);

    // Zoom functionality
    zoomInBtn.addEventListener("click", zoomIn);
    zoomOutBtn.addEventListener("click", zoomOut);
    resetZoomBtn.addEventListener("click", resetZoom);

    // Mouse wheel zoom
    tableGridContainer.addEventListener("wheel", handleWheelZoom);

    // Refresh table statuses function
    function refreshTableStatuses() {
        fetch('/admin/orders/get-table-statuses')
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    updateTableStatuses(data.statuses);
                } else {
                    console.error('API returned error:', data.error);
                }
            })
            .catch(error => console.error('Error refreshing statuses:', error));
    }

    // Update table statuses in the UI
    function updateTableStatuses(statuses) {
        statuses.forEach(status => {
            // Find tables by matching the base table name (before the underscore)
            const tableElements = document.querySelectorAll('[data-value^="' + status.table_name + '_"]');
            
            tableElements.forEach(tableElement => {
                const tableCircle = tableElement.querySelector('.table-circle');
                const tableStatus = tableElement.querySelector('.table-status');
                
                // Remove old status classes
                tableCircle.className = 'table-circle ' + status.status_class;
                tableStatus.textContent = status.status_name;
                
                // Update data attributes
                tableElement.dataset.status = status.status_class;
            });
        });
    }

    function zoomIn() {
        if (currentZoom < maxZoom) {
            currentZoom += 0.1;
            applyZoom();
            saveZoomLevel(); // Save zoom level
        }
    }

    function zoomOut() {
        if (currentZoom > minZoom) {
            currentZoom -= 0.1;
            applyZoom();
            saveZoomLevel(); // Save zoom level
        }
    }

    function resetZoom() {
        currentZoom = 1;
        applyZoom();
        // Reset scroll position
        tableGrid.scrollLeft = 0;
        tableGrid.scrollTop = 0;
        saveZoomLevel(); // Save reset zoom level
        
        // Show a brief message that zoom has been reset
        showSaveMessage('Zoom reset to 100%', 'success');
    }

    function applyZoom() {
        tableGrid.style.transform = `scale(${currentZoom})`;
        tableGrid.style.transformOrigin = "center center";
        
        // Update zoom level indicator
        zoomLevelIndicator.textContent = Math.round(currentZoom * 100) + '%';
        
        // Update zoom button states
        zoomInBtn.disabled = currentZoom >= maxZoom;
        zoomOutBtn.disabled = currentZoom <= minZoom;
        
        // Visual feedback for disabled state
        if (currentZoom >= maxZoom) {
            zoomInBtn.style.opacity = "0.5";
            zoomInBtn.style.cursor = "not-allowed";
        } else {
            zoomInBtn.style.opacity = "1";
            zoomInBtn.style.cursor = "pointer";
        }
        
        if (currentZoom <= minZoom) {
            zoomOutBtn.style.opacity = "0.5";
            zoomOutBtn.style.cursor = "not-allowed";
        } else {
            zoomOutBtn.style.opacity = "1";
            zoomOutBtn.style.cursor = "pointer";
        }
        
        // Save zoom level whenever it changes
        saveZoomLevel();
    }

    function handleWheelZoom(e) {
        if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            if (e.deltaY < 0) {
                zoomIn();
            } else {
                zoomOut();
            }
            // Note: zoomIn() and zoomOut() already call saveZoomLevel()
        }
    }

    // Save zoom level to localStorage
    function saveZoomLevel() {
        localStorage.setItem('tableZoomLevel', currentZoom.toString());
    }

    // Load zoom level from localStorage
    function loadZoomLevel() {
        const savedZoom = localStorage.getItem('tableZoomLevel');
        if (savedZoom) {
            const zoomValue = parseFloat(savedZoom);
            if (zoomValue >= minZoom && zoomValue <= maxZoom) {
                currentZoom = zoomValue;
                applyZoom();
            }
        }
    }

    // NEW: Show menu for selected table with smooth transition
    function showMenuForTable(tableName, tableId, tableNo) {
        console.log('=== showMenuForTable called ===');
        console.log('Parameters:', { tableName, tableId, tableNo });
        console.log('Showing menu for table:', tableName, tableId, tableNo);
        
        // Update table info display
        // Remove "Table" prefix from tableName if it exists (since we already have "Table" in the HTML)
        // Also extract just the number if it's "Table X" format
        let displayTableName = tableName.replace(/^Table\s+/i, '');
        // If it's just a number, use it as is; if it's "Cashier" or other text, use it as is
        document.getElementById('current-table-name').textContent = displayTableName;
        document.getElementById('current-table-id').textContent = tableId;
        document.getElementById('current-table-no').textContent = tableNo;
        
        // Update table status badge text in combined badge
        const statusBadgeText = document.getElementById('table-status-badge-text');
        const selectedTable = document.querySelector('.table-item.selected');
        if (selectedTable && statusBadgeText) {
            const statusText = selectedTable.querySelector('.table-status')?.textContent || 'Available';
            statusBadgeText.textContent = statusText;
        }
        
        // Hide table grid with smooth animation
        const tableGridContainer = document.getElementById('table-grid');
        const tableSelection = document.querySelector('.table-selection');
        
        // Add smooth fade out animation
        tableSelection.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
        tableSelection.style.opacity = '0';
        tableSelection.style.transform = 'translateY(-20px)';
        
        setTimeout(() => {
            // Hide table selection completely
            tableSelection.style.display = 'none';
            
            // Show order form with smooth animation
            const orderForm = document.querySelector('.order-form');
            console.log('Order form found:', orderForm);
            if (!orderForm) {
                console.error('Order form not found!');
                return;
            }
            orderForm.style.display = 'block';
            orderForm.style.opacity = '0';
            orderForm.style.transform = 'translateY(20px)';
            orderForm.style.transition = 'opacity 0.5s ease-in, transform 0.5s ease-in';
            
            // Show back button and table info
            document.getElementById('back-to-tables').style.display = 'inline-block';
            document.getElementById('header-controls').style.display = 'none';
            document.getElementById('selected-table-info').style.display = 'block';
            
            // Change button text to "Back to Tables" when table is selected
            const backButton = document.getElementById('back-to-tables');
            backButton.innerHTML = '<i class="fa fa-arrow-left"></i> Back to Tables';
            
            // Animate in the order form
            setTimeout(() => {
                orderForm.style.opacity = '1';
                orderForm.style.transform = 'translateY(0)';
                
                // Reinitialize category filtering when menu is shown
                if (window.initializeCategoryFiltering) {
                    window.initializeCategoryFiltering();
                }
            }, 50);
            
        }, 500);
    }
    
    // NEW: Back to tables functionality
    function backToTables() {
        const tableSelection = document.querySelector('.table-selection');
        const orderForm = document.querySelector('.order-form');
        
        // Hide floating toolbar and clear selected items
        const floatingToolbar = document.getElementById('floating-toolbar');
        if (floatingToolbar) {
            floatingToolbar.className = "floating-toolbar collapsed";
            console.log("🔽 Toolbar hidden - back to tables clicked");
        }
        
        // Clear selected items from the interactive cards
        const menuItems = document.querySelectorAll(".interactive-card");
        menuItems.forEach(card => {
            card.dataset.quantity = '0';
            const quantityBadge = card.querySelector('.quantity-badge');
            if (quantityBadge) {
                quantityBadge.style.display = 'none';
            }
        });
        
        // Clear the selectedItems Map if it exists
        if (typeof selectedItems !== 'undefined') {
            selectedItems.clear();
            console.log("🧹 Selected items cleared");
        }
        
        // Hide order form with animation
        orderForm.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
        orderForm.style.opacity = '0';
        orderForm.style.transform = 'translateY(20px)';
        
        setTimeout(() => {
            // Hide order form
            orderForm.style.display = 'none';
            
            // Show table selection with animation
            tableSelection.style.display = 'block';
            tableSelection.style.opacity = '0';
            tableSelection.style.transform = 'translateY(-20px)';
            tableSelection.style.transition = 'opacity 0.5s ease-in, transform 0.5s ease-in';
            
            // Hide back button and table info
            document.getElementById('back-to-tables').style.display = 'none';
            document.getElementById('selected-table-info').style.display = 'none';
            
            // Show header controls (zoom buttons and Edit Layout button)
            document.getElementById('header-controls').style.display = 'flex';
            
            // Change button text to "Back to Orders" for next time
            const backButton = document.getElementById('back-to-tables');
            backButton.innerHTML = '<i class="fa fa-arrow-left"></i> Back to Orders';
            
            // Clear selected table
            tableItems.forEach(item => item.classList.remove('selected'));
            document.getElementById('selected-table').value = '';
            
            // Animate in the table selection
            setTimeout(() => {
                tableSelection.style.opacity = '1';
                tableSelection.style.transform = 'translateY(0)';
            }, 50);
            
        }, 500);
    }
    
    // Back to tables button event listener
    document.getElementById('back-to-tables').addEventListener('click', function() {
        const backButton = document.getElementById('back-to-tables');
        const buttonText = backButton.innerText || backButton.textContent;
        
        // If button says "Back to Orders" or "Back to Order", navigate to orders page
        if (buttonText.includes('Back to Order')) {
            window.location.href = '{{ admin_url('orders') }}';
        } else {
            // Otherwise (when it says "Back to Tables"), just toggle to table selection view
            backToTables();
        }
    });

    // Initialize zoom button states and load saved zoom
    loadZoomLevel();
    
     // FORCE CARD BACK COLORS - Nuclear option
     function forceCardBackColors() {
         const cardBacks = document.querySelectorAll('.card-back');
         cardBacks.forEach(card => {
             // Try multiple approaches - CORRECT COLORS
             card.style.setProperty('background', 'linear-gradient(135deg, #fcfcfc, #ffffff)', 'important');
             card.style.background = 'linear-gradient(135deg, #fcfcfc, #ffffff) !important';
             card.style.backgroundColor = '#fcfcfc !important';
             
             // Force remove any gray colors
             card.style.setProperty('background-color', '#fcfcfc', 'important');
             card.style.setProperty('background-image', 'linear-gradient(135deg, #fcfcfc, #ffffff)', 'important');
             
             // Add a class to force the style
             card.classList.add('force-white-background');
         });
     }
    
    // Run immediately and on intervals
    forceCardBackColors();
    setInterval(forceCardBackColors, 1000);
    
    // Also run when cards are created
    const observer = new MutationObserver(function(mutations) {
        mutations.forEach(function(mutation) {
            if (mutation.type === 'childList') {
                forceCardBackColors();
            }
        });
    });
    
    observer.observe(document.body, {
        childList: true,
        subtree: true
    });
    applyZoom();
});
</script>


    <script src="//code.jquery.com/jquery-3.6.0.min.js"></script>
