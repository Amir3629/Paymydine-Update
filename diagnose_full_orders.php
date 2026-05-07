<?php
use Illuminate\Support\Facades\DB;

require __DIR__."/bootstrap/autoload.php";
$app = require_once __DIR__."/bootstrap/app.php";
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

function printOptionValues($optionValues) {
    if (!$optionValues) return;
    $optionValues = @unserialize($optionValues);
    if (!$optionValues) return;

    if (property_exists($optionValues, "*items")) {
        foreach ($optionValues->{"*items"} as $opt) {
            echo "      گزینه: {$opt->name}\n";
            if (property_exists($opt, "values") && property_exists($opt->values, "*items")) {
                foreach ($opt->values->{"*items"} as $val) {
                    echo "        مقدار: {$val->name}, تعداد: {$val->qty}, قیمت: {$val->price}\n";
                }
            }
        }
    } else {
        echo "      option_values: [فرمت ناشناخته]\n";
    }
}

try {
    echo "=== DETAILED ORDER & PAYMENT DIAGNOSTIC ===\n";

    $paymentsTable = "ti_payments";
    $orderMenusTable = "ti_order_menus";
    $orderMenuOptionsTable = "ti_order_menu_options";
    $fiskalyTable = "ti_fiskaly_transactions";
    $primaryKey = "payment_id";

    $lastPayments = DB::select("SELECT * FROM `$paymentsTable` ORDER BY `$primaryKey` DESC LIMIT 10");
    if (!$lastPayments) { echo "هیچ تراکنشی پیدا نشد.\n"; exit; }

    foreach ($lastPayments as $payment) {
        echo "\n--- Payment #{$payment->payment_id} ({$payment->name}) ---\n";

        // منوها
        $menus = DB::select("SELECT * FROM `$orderMenusTable` WHERE `order_id` = ?", [$payment->payment_id]);
        if ($menus) {
            echo "Menus:\n";
            foreach ($menus as $menu) {
                echo "  Menu: {$menu->name}, Qty: {$menu->quantity}, Price: {$menu->price}\n";
                printOptionValues($menu->option_values);
            }
        } else {
            echo "Menus: None\n";
        }

        // گزینه‌های منو
        $menuOptions = DB::select("SELECT * FROM `$orderMenuOptionsTable` WHERE `order_id` = ?", [$payment->payment_id]);
        if ($menuOptions) {
            echo "Menu Options:\n";
            foreach ($menuOptions as $opt) {
                echo "  Option: {$opt->order_option_name}, Price: {$opt->order_option_price}, Menu ID: {$opt->menu_id}\n";
            }
        } else {
            echo "Menu Options: None\n";
        }

        // بررسی QR Code Fiskaly
        $fiskaly = DB::select("SELECT * FROM `$fiskalyTable` WHERE `payment_id` = ?", [$payment->payment_id]);
        if ($fiskaly) {
            echo "Fiskaly QR: Present\n";
        } else {
            echo "Fiskaly QR: MISSING!\n";
        }
    }

    echo "\n=== END OF DIAGNOSTIC ===\n";

} catch (\Throwable $e) {
    echo "ERROR: ".$e->getMessage()."\n";
}
