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
    border-radius: 10px !important;
    border: 2px solid #36a269;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 18px 20px;
    min-width: 180px;
    min-height: 130px;
    background: #fff;
}
#cashierButton .table-label {
    display: inline-block;
    font-weight: 700;
    font-size: 14.5px;
    line-height: 1.2;
    margin-left: 8px;
}
</style>

<meta name="csrf-token" content="{{ csrf_token() }}">
<div class="progress-indicator-container" style="padding: 18px 20px 0;">
    <a class="btn btn-primary" href="<?php echo site_url('/'); ?>/admin/orders/" tabindex="0"><i class="fa fa"></i>Back
        to Orders</a>
</div>
<div class="row-fluid">
    {!! form_open([
    'id' => 'edit-form',
    'role' => 'form',
    'method' => 'POST',
]) !!}
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
    $menu_ids = $_POST['menu_id'];
    $menu_prices = $_POST['menu_price'];
    $quantities = $_POST['qty'];
    $menu_names = $_POST['menu_name'];
    $total_price = 0;
    $total_qty = 0;
    $first_name = 'Chief';
    $last_name = 'Admin';
    $email = 'chiefadmin@example.com';
    $telephone = '1234567890';
    $location_id = 1;
    $address_id = 1;
    $payment = 'Cod';
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
    $order = new Orders_model();
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
        $price = $menu_prices[$key];
        $qty = $quantities[$key];
        $total_price += ($price * $qty);
        $total_qty += $qty;
    }
    $order->created_at = now();
    $order->updated_at = now();
    $order->total_items = $total_qty;
    $order->order_total = $total_price ;
    $order->save();
    $last_order_id = $order->order_id;

    $order_menu = new \Admin\Models\Menus_model();

    foreach ($menu_ids as $key => $menu_id) {
        $price = $menu_prices[$key];
    $qty = $quantities[$key];
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

        foreach ($option_values as $value_id) {
            $option = DB::table('menu_option_values')
                ->where('option_value_id', $value_id)
                ->first();

            if ($option) {
                DB::table('order_menu_options')->insert([
                    'order_id' => $last_order_id,
                    'menu_id' => $menu_id,
                    'quantity' => $quantities[$menu_id] ?? 1, // Ensure correct quantity
                    'order_menu_id' => $order_menu_id,
                    'order_option_name' => $option->value,
                    'order_option_price' => $option->price,
                    'menu_option_value_id' => $option->option_value_id,
                    'order_menu_option_id' => $option->option_id
                ]);
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
    $total_option_price = DB::table('order_menu_options')
    ->where('order_id', $last_order_id)
    ->sum('order_option_price');
$total_price = $total_option_price + $total_price;
    if ($last_order_id) {
        DB::table('order_totals')->insert([
            [
                'order_id' => $last_order_id,
                'code' => 'subtotal',
                'title' => $_POST['table_id'],
                'priority' => 0,
                'value' => 0.0000,
                'is_summable' => 0,
            ],
            [
                'order_id' => $last_order_id,
                'code' => $_POST['table_id'],
                'title' => 'Sub Total',
                'priority' => 0,
                'value' => $total_price,
                'is_summable' => 0,
            ],
            [
                'order_id' => $last_order_id,
                'code' => 'total',
                'title' => 'Order Total',
                'priority' => 0,
                'value' => $total_price,
                'is_summable' => 0,
            ]
        ]);
    }
    echo '<div id="notification"><div class="alert alert-success flash-message animated fadeInDown alert-dismissible show" data-allow-dismiss="true" role="alert">Order generated successfully.<button type="button" class="btn-close" data-bs-dismiss="alert" aria-hidden="true"></button></div>
</div>';
}
?>
    @php
        $tableData = \Admin\Models\Tables_model::where('table_status', 1)
            ->orderBy('table_no', 'asc')
            ->get(['table_id','table_no','table_name','min_capacity','max_capacity','table_status','qr_code']);
        //$menuData = DB::table('menus')->get();
        $menuData = \Admin\Models\Menus_model::with('media')->get();
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
        <div class="table-selection-header">
            <label class="form-label">SELECT A TABLE</label>
            <div class="header-controls">
                <div class="zoom-controls">
                    <div class="zoom-level-indicator" id="zoom-level">100%</div>
                    <button type="button" class="zoom-btn" id="zoom-in" title="Zoom In (Ctrl + Scroll Up)">
                        <i class="fa fa-plus"></i>
                </button>
                    <button type="button" class="zoom-btn" id="zoom-out" title="Zoom Out (Ctrl + Scroll Down)">
                        <i class="fa fa-minus"></i>
                    </button>
                    <button type="button" class="zoom-btn" id="reset-zoom" title="Reset View">
                        <i class="fa fa-home"></i>
                    </button>
                </div>
                <button type="button" id="edit-layout-btn" class="btn btn-outline-secondary btn-sm">
                    <i class="fa fa-edit"></i> Edit Layout
                </button>
            </div>
        </div>

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
    
    <div class="w-100 ms-row card-body mt-5 order-form" style="background: #fff;padding: 4rem 2rem; display: none;">
        <input type="hidden" name="table_id" id="selected-table" required>
        
        <input type="submit" value="Save" class="btn btn-primary">

<div class="wrapper w-100">
    <div class="row w-100">
        <div class="col">
            <label for="menu-select" class="form-label">Select Menu</label>
            <div class="menu-selection-container">
                @foreach($menuData as $menuRow)
                <?php 
                    $menuImage = $menuRow->media->isNotEmpty() ? $menuRow->media->first()->getPath() : ''; 
                    $optionsForDish = $menuOptions->get($menuRow->menu_id) ?? collect(); 
                    $menuOptionsJson = json_encode($optionsForDish);
                ?>
                <div class="menu-item" 
                     data-id="{{ $menuRow->menu_id }}" 
                     data-price="{{ $menuRow->menu_price }}" 
                    data-image="{{ $menuImage }}"
                     data-name="{{ $menuRow->menu_name }}" 
                     data-options='{{ $menuOptionsJson }}'
                    >
                            <img src="{{ $menuImage }}" alt="{{ $menuRow->menu_name }}" class="menu-image">
                            <span class="menu-name">{{ $menuRow->menu_name }}</span>
                            <span class="menu-price">{{ $menuRow->menu_price }}{{ app('currency')->getDefault()->currency_symbol }}</span>
                </div>
                @endforeach
            </div>

            <div id="selected-menus"></div>
        </div>
    </div>
</div>

    </div>
</div>


    <style>
        .menu-price {
    font-size: 1.2rem !important; 
    font-weight: bold !important; 
    color: #2170c0 !important; 
    background: linear-gradient(135deg, #f8f9fa, #e3eaf2) !important; 
    padding: 8px 15px !important; 
    border-radius: 8px !important;
    display: inline-block !important; 
    box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1) !important; 
    transition: all 0.3s ease-in-out !important;
}

.menu-price:hover {
    color: #fff !important; 
    background: #2170c0 !important; 
    transform: scale(1.05) !important; 
    box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15) !important;
}

   .col {
    margin-bottom: 15px !important;
    padding: 10px !important;
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
    border-color: #007bff !important;
    box-shadow: 0 0 5px rgba(0, 123, 255, 0.5) !important;
}

#menu-options-container {
    background: #f9f9f9 !important;
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
    border-color: #007bff;
    background: #f0f8ff;
}

.menu-image {
    width: 90px;  
    height: 90px;
    object-fit: cover;
    border-radius: 8px;
}

.menu-name {
    margin-top: 8px;
    font-weight: bold;
    font-size: 14px;
    text-align: center;
}



        .option-group {
            margin-bottom: 15px;
        }

        .option-group h5 {
            font-size: 16px;
            font-weight: bold;
            margin-bottom: 8px;
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
    border-bottom: 2px solid #f0f0f0;
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
    background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
    border: none;
    color: white;
    padding: 10px 20px;
    border-radius: 25px;
    font-weight: 600;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);
}

#edit-layout-btn:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0, 123, 255, 0.4);
}

#edit-layout-btn.active {
    background: linear-gradient(135deg, #0056b3 0%, #007bff 100%);
    box-shadow: 0 4px 15px rgba(0, 123, 255, 0.3);
}

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
    margin-top: 80px;
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
    background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
    color: white;
}

.table-circle.available {
    background: #ffffff;
    color: #28a745;
    border: 4px solid #28a745;
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
    color: #28a745;
    border: 4px solid #28a745;
    box-shadow: 0 4px 15px rgba(40, 167, 69, 0.3);
}

.table-circle.completed {
    background: #ffffff;
    color: #28a745;
    border: 4px solid #28a745;
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
    color: #28a745;
    border: 4px solid #28a745;
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
    background: #007bff;
    color: white;
    border-radius: 50%;
    width: 20px;
    height: 20px;
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 10px;
    box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
    opacity: 0.8;
    transition: all 0.3s ease;
}

.table-item:hover .menu-link-icon {
    opacity: 1;
    background: #0056b3;
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
    border: 2px dashed #007bff;
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
    box-shadow: 0 0 20px rgba(0, 123, 255, 0.6);
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
    background: rgba(0, 123, 255, 0.1);
    border: 2px dashed rgba(0, 123, 255, 0.3);
    border-radius: 8px;
    padding: 10px;
    font-size: 12px;
    color: #007bff;
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
        linear-gradient(rgba(0, 123, 255, 0.2) 1px, transparent 1px),
        linear-gradient(90deg, rgba(0, 123, 255, 0.2) 1px, transparent 1px);
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
    width: 35px;
    height: 35px;
    border-radius: 50%;
    background: linear-gradient(135deg, #007bff 0%, #0056b3 100%);
    border: none;
    color: white;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 2px 8px rgba(0, 123, 255, 0.3);
    font-size: 14px;
    font-weight: bold;
}

.zoom-btn:hover {
    background: linear-gradient(135deg, #0056b3 0%, #007bff 100%);
    transform: scale(1.1);
    box-shadow: 0 4px 12px rgba(0, 123, 255, 0.4);
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
    font-weight: bold;
    color: #007bff;
    padding: 8px;
    background: rgba(255, 255, 255, 0.8);
    border-radius: 15px;
    margin-right: 10px;
    border: 1px solid rgba(0, 123, 255, 0.2);
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
        width: 35px;
        height: 35px;
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
    background-color: #007bff !important;
    border: none !important;
    padding: 12px 20px !important;
    font-size: 16px !important;
    font-weight: bold !important;
    border-radius: 8px !important;
    transition: all 0.3s ease-in-out !important;
}

.btn-primary:hover {
    background-color: #0056b3 !important;
    box-shadow: 0 3px 10px rgba(0, 123, 255, 0.3) !important;
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
    background: linear-gradient(135deg, #f9f9f9, #ffffff);
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


    </style>


<script>


document.addEventListener("DOMContentLoaded", function () {
    const menuItems = document.querySelectorAll(".menu-item");
    const selectedMenusContainer = document.getElementById("selected-menus");

    menuItems.forEach(item => {
        item.addEventListener("click", function () {
            const menuId = this.dataset.id;
            const menuPrice = this.dataset.price;
            const menuName = this.dataset.name;
            const menuImage = this.dataset.image;
            let menuOptions = [];
            try {
                menuOptions = JSON.parse(this.dataset.options || "[]"); 
            } catch (error) {
                console.error("Error parsing menu options:", error);
            }

            let filteredValues = menuOptions.filter(option => option.menu_id == menuId);

            console.log("Selected Menu ID:", menuId);
            console.log("Filtered Values:", filteredValues);

            let optionsHTML = "";

            if (filteredValues.length > 0) {
                let groupedOptions = {};

                // Grouping options properly
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
                }                });

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
                    ${option.value} - $${option.price}
                </label>
            </div>`;
    });

    optionsHTML += `</div>`; 
});

            } else {
                optionsHTML = `
       <div class="no-options-container">
            <div class="no-options-card">
                <img src="//cdn-icons-png.flaticon.com/512/190/190406.png" class="no-options-img" alt="No customizations">
                <p class="no-options-text">
                   No customizations available for this dish.
                </p>
            </div>
        </div>
    `;            }

            const newRow = document.createElement("div");
            newRow.classList.add("row", "menu-selected-item", `menu-${menuId}-${Date.now()}`);
            newRow.innerHTML = `<div class="menu-entry">
    <div class="remove-btn-container">
        <button type="button" class="btn btn-danger remove-item"></button>
    </div>

    <div class="col-md-3 menu-card">
        <img src="${menuImage}" alt="${menuName}" class="menu-card-img">
        <label class="menu-card-label">Dish: ${menuName}</label>
        <input type="hidden" name="menu_id[]" value="${menuId}">
        <input type="hidden" name="menu_name[]" value="${menuName}">
    </div>

    <div class="col-md-2">
        <label class="form-label">Price</label>
        <input type="text" name="menu_price[]" value="${menuPrice}" readonly class="form-control">
    </div>

    <div class="col-md-2">
        <label class="form-label">Quantity</label>
        <input min="1" type="number" value="1" name="qty[]" placeholder="Quantity" class="form-control" required>
    </div>

    <div class="col-md-4 menu-options-container">
        <label class="form-label">Options</label>
        <div class="options-wrapper">${optionsHTML}</div>
    </div>
</div>

            `;

            selectedMenusContainer.appendChild(newRow);

            newRow.querySelector(".remove-item").addEventListener("click", function () {
                newRow.remove();
            });
        });
    });
});


</script>

<script>
document.addEventListener("DOMContentLoaded", function () {
    const tableItems = document.querySelectorAll(".table-item");
    const orderForm = document.querySelector(".order-form");
    const selectedTableInput = document.getElementById("selected-table");
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
            if (!url || url === '#') { 
                alert('Cashier URL not available'); 
                return; 
            }
            window.open(url, '_blank', 'noopener,noreferrer');
        }, true);
    })();

    // Table selection functionality
    tableItems.forEach(item => {
        item.addEventListener("click", function (event) {
            event.preventDefault(); // Prevent any default behavior
            event.stopPropagation(); // Stop event bubbling
            
            if (isEditMode) return; // Don't select tables in edit mode
            
            const value = this.dataset.value;
            const tableId = this.dataset.tableId;
            const tableNo = this.dataset.tableNo;
            
            if (value === "Cashier") {
                // Cashier is handled by dedicated click handler - do nothing here
                return;
            } else {
                // Handle table selection - Open frontend menu instead of order form
                if (this.classList.contains("unavailable")) return;
                
                tableItems.forEach(i => i.classList.remove("selected"));
                this.classList.add("selected");
                
                // Generate frontend menu URL using same structure as QR codes
                // Use config app URL for consistency
                const frontendUrl = '{{ config("app.url") }}';
                
                const currentDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
                const currentTime = new Date().toTimeString().split(' ')[0].substring(0, 5); // HH:MM
                
                // Build the frontend menu URL with table parameters (same as QR code structure)
                const menuUrl = `${frontendUrl}/table/${tableNo}?qr=admin&table=${tableNo}`;
                
                // Debug logging
                console.log('Frontend URL:', frontendUrl);
                console.log('Table ID:', tableId);
                console.log('Table No:', tableNo);
                console.log('Generated Menu URL:', menuUrl);
                
                // Open frontend menu in new tab - try multiple methods to avoid popup blocker
                try {
                    // Method 1: Try window.open with proper parameters
                    const newWindow = window.open(menuUrl, '_blank', 'noopener,noreferrer,width=1200,height=800');
                    
                    // Check if popup was blocked
                    setTimeout(() => {
                        if (!newWindow || newWindow.closed || typeof newWindow.closed == 'undefined') {
                            console.log('Popup blocked, trying alternative method...');
                            // Method 2: Create a temporary link and click it
                            const link = document.createElement('a');
                            link.href = menuUrl;
                            link.target = '_blank';
                            link.rel = 'noopener noreferrer';
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            console.log('Alternative method executed');
                        } else {
                            console.log('New tab opened successfully');
                        }
                    }, 100);
                    
                } catch (error) {
                    console.error('Error opening new tab:', error);
                    // Method 3: Fallback - redirect current window
                    console.log('Using fallback method - redirecting current window');
                    window.location.href = menuUrl;
                }
                
                // Still set the selected table for any admin functionality that might need it
                const tableName = value.split('_')[0];
                selectedTableInput.value = tableName;
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

    // Initialize zoom button states and load saved zoom
    loadZoomLevel();
    applyZoom();
});
</script>


    <script src="//code.jquery.com/jquery-3.6.0.min.js"></script>
