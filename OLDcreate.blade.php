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
use Igniter\Cart\Models\Menus_model as mn;

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
    $cartItem->name = $menuItem->menu_name;
    $cartItem->price = $menuItem->menu_price;
    $cartItem->options = new \Igniter\Flame\Cart\CartItemOptions();
    $cartItem->conditions = new \Igniter\Flame\Cart\CartItemConditions();
    $cartItem->associatedModel = get_class($menuItem);

    $cart->add($cartItem);
}

// Assign to order
$order->cart = $cart;

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

    $order_menu = new Menus_model();

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
            'option_values' => 'O:34:"Igniter\Flame\Cart\CartItemOptions":2:{s:8:"',
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
        $tableData = DB::table('tables')->get();
        //$menuData = DB::table('menus')->get();
        $menuData = Menus_model::with('media')->get();
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
$status_id = $statuses->status_id;
$unavailableTables = DB::table('orders')
    ->where('status_id', '!=', $status_id)
    ->pluck('order_type')
    ->toArray();
?>

    <div class="form-fields">
    
    <!-- Table Selection -->
    <div class="table-selection">
        <label class="form-label">Select a Table</label>

        <div class="table-icons">
            <div class="table-icon" data-value="Delivery">Delivery</div>
            <div class="table-icon" data-value="Pick-up">Pick-up</div>
            @foreach($tableData as $row)
                <?php $isUnavailable = in_array($row->table_name, $unavailableTables); ?>
                <div class="table-icon <?php echo $isUnavailable ? 'disabled' : ''; ?>" 
                     data-value="{{ $row->table_name }}" 
                     <?php echo $isUnavailable ? 'style="pointer-events: none; opacity: 0.5;"' : ''; ?>>
                    {{ $row->table_name }}
                </div>
            @endforeach
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



       
 
.table-selection {
    text-align: center;
    margin-bottom: 25px;
    font-size: 1.2rem;
    font-weight: bold;
    color: #333;
}


.table-icons {
    display: flex;
    justify-content: center;
    gap: 15px;
    flex-wrap: wrap;
    padding: 10px;
}


.table-icon {
    padding: 15px 30px;
    background: linear-gradient(135deg, #f8f9fa, #e9ecef);
    border: 2px solid #ddd;
    border-radius: 12px;
    cursor: pointer;
    transition: all 0.3s ease-in-out;
    text-align: center;
    font-weight: bold;
    font-size: 1rem;
    color: #333;
    box-shadow: 2px 4px 8px rgba(0, 0, 0, 0.15);
    position: relative;
    overflow: hidden;
}

.table-icon:hover,
.table-icon.selected {
    background: linear-gradient(135deg, #007bff, #0056b3);
    color: white;
    border-color: #004494;
    transform: scale(1.05);
    box-shadow: 3px 5px 12px rgba(0, 0, 0, 0.2);
}


.table-icon.disabled {
    background: rgba(240, 240, 240, 0.8);
    color: #aaa;
    border-color: #ccc;
    cursor: not-allowed;
    position: relative;
    box-shadow: none;
}


.table-icon.disabled::after {
    content: "\26D4"; 
    font-size: 24px;
    color: red !important; 
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    opacity: 1 !important; 
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
                <img src="https://cdn-icons-png.flaticon.com/512/190/190406.png" class="no-options-img" alt="No customizations">
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
    const tableIcons = document.querySelectorAll(".table-icon");
    const orderForm = document.querySelector(".order-form");
    const selectedTableInput = document.getElementById("selected-table");

    tableIcons.forEach(icon => {
        icon.addEventListener("mouseenter", function () {
            if (this.classList.contains("disabled")) {
                this.style.cursor = "not-allowed";
            }
        });

        icon.addEventListener("click", function () {
            if (this.classList.contains("disabled")) return;

            tableIcons.forEach(i => i.classList.remove("selected"));
            this.classList.add("selected");
            selectedTableInput.value = this.dataset.value;
            orderForm.style.display = "block";
        });
    });
});
</script>


    <script src="https://code.jquery.com/jquery-3.6.0.min.js"></script>
   