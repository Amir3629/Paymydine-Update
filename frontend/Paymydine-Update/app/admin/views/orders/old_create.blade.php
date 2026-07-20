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
            ->get();
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
        <h5>Select a Table</h5>
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
        
        <div class="col-md-12 mt-4" style="text-align: right;margin-bottom: 2rem;">
            <input type="submit" value="Save" class="btn btn-primary">
            <button type="button" class="add-more btn btn-dark" id="add-more">Add more</button>
        </div>
        
        <div class="wrapper w-100">
            <div class="row w-100">
            <div class="col">
    <label for="menu-select" class="form-label">Select Menu</label>
    <div class="menu-selection-container">
        @foreach($menuData as $menuRow)
        <?php $menuImage = $menuRow->media->isNotEmpty() ? $menuRow->media->first()->getPath() : ''; ?>
     <div class="menu-item" data-id="{{ $menuRow->menu_id }}" data-price="{{ $menuRow->menu_price }}" data-name="{{ $menuRow->menu_name }}">
                <img src="{{ $menuImage }}" alt="{{ $menuRow->menu_name }}" class="menu-image">
                <span class="menu-name">{{ $menuRow->menu_name }}</span>
                <span class="menu-price">{{ $menuRow->menu_price }}</span>

            </div>
        @endforeach
    </div>
    <input type="hidden" name="menu_id[]" id="menu-select" required>
</div>
                <div class="col">
                    <label class="form-label">Menu Price</label>
                    <input type="text" name="menu_price[]" id="menu-price" value="" readonly class="form-control">
                    <input type="hidden" name="menu_name[]" id="menu-name" value="">
                </div>
                <div class="col">
                    <label class="form-label">Add QTY</label>
                    <input min="1" type="number" name="qty[]" placeholder="Quantity" class="form-control" required>
                </div>
                <div class="col-md-12 mt-4" id="menu-options-container" style="display: none;">
                    <label class="form-label" style="font-size: 18px;font-weight: bold;margin-bottom:15px;color:#2170c0;">Select Options</label>
                    <div class="options-wrapper"></div>
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

.form-label {
    font-size: 16px !important;
    font-weight: bold !important;
    color: #333 !important;
    margin-bottom: 5px !important;
    display: block !important;
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
    grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); /* Adjusted from 120px to 100px */
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



        <style>
    .table-selection {
        text-align: center;
        margin-bottom: 20px;
    }

    .table-icons {
        display: flex;
        justify-content: center;
        gap: 10px;
        flex-wrap: wrap;
    }

    .table-icon {
        padding: 15px 25px;
        background: #f8f9fa;
        border: 2px solid #ddd;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        text-align: center;
        font-weight: bold;
        box-shadow: 2px 2px 5px rgba(0, 0, 0, 0.1);
    }

    .table-icon:hover, .table-icon.selected {
        background: #007bff;
        color: white;
        border-color: #0056b3;
    }

    .table-icon.disabled {
        background: #f0f0f0;
        color: #aaa;
        border-color: #ccc;
        cursor: not-allowed;
        position: relative;
    }

    .table-icon.disabled::after {
        content: "\26D4"; /* Unicode for forbidden symbol */
        font-size: 20px;
        color: red;
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
    }

    .order-form {
        display: none;
        animation: fadeIn 0.5s ease-in-out;
    }

    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(-10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    /* Buttons Section */
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

/* Labels */
.form-label {
    font-size: 18px !important;
    font-weight: bold !important;
    color: #212529 !important;
    margin-bottom: 8px !important;
    display: block !important;
}

    </style>

<script>

document.addEventListener("DOMContentLoaded", function () {
    const menuItems = document.querySelectorAll(".menu-item");
    const menuSelectInput = document.getElementById("menu-select");
    const menuPriceInput = document.getElementById("menu-price");
    const menuNameInput = document.getElementById("menu-name");
    const menuOptionsContainer = document.getElementById("menu-options-container");
    const optionsWrapper = document.querySelector(".options-wrapper");

    // Retrieve menu options from backend (Laravel Blade syntax)
    var menuOptions = @json($menuOptions);

    menuItems.forEach(item => {
        item.addEventListener("click", function () {
            // Remove selection from previous menu items
            menuItems.forEach(i => i.classList.remove("selected"));
            this.classList.add("selected");

            // Get menu details
            const menuId = this.dataset.id;
            const menuPrice = this.dataset.price;
            const menuName = this.dataset.name;

            // Set input values
            menuSelectInput.value = menuId;
            menuPriceInput.value = menuPrice;
            menuNameInput.value = menuName;

            // Filter options for the selected menu
            var filteredOptions = menuOptions.filter(option => option.menu_id == menuId);

            if (filteredOptions.length > 0) {
                menuOptionsContainer.style.display = "block";
                optionsWrapper.innerHTML = ""; // Clear previous options

                var groupedOptions = {};

                // Group options by menu_option_id
                filteredOptions.forEach(option => {
                    if (!groupedOptions[option.menu_option_id]) {
                        groupedOptions[option.menu_option_id] = {
                            display_type: option.display_type,
                            option_name: option.option_name,
                            options: []
                        };
                    }
// Prevent duplicate options
if (!groupedOptions[option.menu_option_id].options.some(o => o.option_value_id === option.option_value_id)) {
    groupedOptions[option.menu_option_id].options.push(option);
}
                });

                // Generate option inputs dynamically
                for (let menuOptionId in groupedOptions) {
                    let data = groupedOptions[menuOptionId];
                    let displayType = data.display_type;
                    let inputType = displayType === "radio" ? "radio" : "checkbox";

                    let optionGroup = `<div  class="option-group ${inputType === 'radio' ? 'radio-group' : ''}">
                        <h5>${data.option_name}</h5>`;

                    data.options.forEach(option => {
                        optionGroup += 
                              '<div class="form-check" >' +
                            `<input class="form-check-input" type="${inputType}" name="menu_options[${menuOptionIddd}][]" value="${option.option_value_id}" id="option_${option.option_value_id}">` +
                            `<label class="form-check-label" style="font-weight: 600;" for="option_${option.option_value_id}">${option.value} - $${option.price}</label>` +
                            '</div>';
                    });

                    optionGroup += `</div>`;
                    optionsWrapper.innerHTML += optionGroup;
                }
            } else {
                menuOptionsContainer.style.display = "none";
            }
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
    <script>

$(document).ready(function () {
    var menuOptions = @json($menuOptions);

    $('#add-more').click(function () {
        var newWrapper = $(`
            <div class="wrapper w-100 position-relative my-4">
                <div class="row w-100">
                    <div class="col">
                        <label class="form-label">Select Menu</label>
                        <div class="menu-selection-container">
                            @foreach($menuData as $menuRow)
                            <?php $menuImage = $menuRow->media->isNotEmpty() ? $menuRow->media->first()->getPath() : ''; ?>
                            <div class="menu-item" data-id="{{ $menuRow->menu_id }}" data-price="{{ $menuRow->menu_price }}" data-name="{{ $menuRow->menu_name }}">
                                <img src="{{ $menuImage }}" alt="{{ $menuRow->menu_name }}" class="menu-image">
                                <span class="menu-name">{{ $menuRow->menu_name }}</span>
                            </div>
                            @endforeach
                        </div>
                        <input type="hidden" name="menu_id[]" class="menu-select" required>
                    </div>
                    <div class="col">
                        <label class="form-label">Menu Price</label>
                        <input type="text" name="menu_price[]" value="" readonly class="form-control menu-price">
                        <input type="hidden" name="menu_name[]" class="menu-name" value="">
                    </div>
                    <div class="col">
                        <label class="form-label">Add QTY</label>
                        <input min="1" type="number" name="qty[]" placeholder="Quantity" class="form-control" required>
                    </div>
                    <div class="col-md-2" style="margin: 30px 0;">
                        <button type="button" class="btn btn-danger remove-wrapper">Remove</button>
                    </div>
                    <div class="col-md-12 mt-4 menu-options-container"  id="menu-options-container" style="display: none;">
                        <label class="form-label" style="font-size: 18px;font-weight: bold;margin-bottom:15px;color:#2170c0;">Select Options</label>
                        <div class="options-wrapper"></div>
                    </div>
                </div>
            </div>
        `);

        $('.w-100.ms-row.card-body').append(newWrapper);
    });

    $(document).on('click', '.remove-wrapper', function () {
        $(this).closest('.wrapper').remove();
    });

    $(document).on('click', '.menu-item', function () {
        var menuId = $(this).data('id');
        var price = $(this).data('price');
        var name = $(this).data('name');
        var parentWrapper = $(this).closest('.wrapper');

        parentWrapper.find('.menu-price').val(price);
        parentWrapper.find('.menu-name').val(name);
        parentWrapper.find('.menu-select').val(menuId);

        // Handle options dynamically
        var filteredOptions = menuOptions.filter(option => option.menu_id == menuId);
        var optionsWrapper = parentWrapper.find('.options-wrapper');
        var menuOptionsContainer = parentWrapper.find('.menu-options-container');

        optionsWrapper.empty();
        if (filteredOptions.length > 0) {
            menuOptionsContainer.show();
            let groupedOptions = {};

            filteredOptions.forEach(option => {
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

            for (let menuOptionId in groupedOptions) {
                let data = groupedOptions[menuOptionId];
                let inputType = data.display_type === "radio" ? "radio" : "checkbox";
                let optionGroup = `<div class="option-group ${inputType === 'radio' ? 'radio-group' : ''}">
                    <h5>${data.option_name}</h5>`;

                data.options.forEach(option => {
                    optionGroup += `
                        <div class="form-check">
                            <input class="form-check-input" type="${inputType}" name="menu_options[${menuId}][]" value="${option.option_value_id}" id="option_${option.option_value_id}">
                            <label class="form-check-label" style="font-weight: 600;" for="option_${option.option_value_id}">
                                ${option.value} - $${option.price}
                            </label>
                        </div>`;
                });

                optionGroup += `</div>`;
                optionsWrapper.append(optionGroup);
            }
        } else {
            menuOptionsContainer.hide();
        }
    });
});

</script>



