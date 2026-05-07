<?php
use Illuminate\Support\Facades\DB;

require __DIR__."/bootstrap/autoload.php";
$app = require_once __DIR__."/bootstrap/app.php";
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

// Helper to print option_values safely
function printOptionValues($optionValues) {
    if (!$optionValues) return;
    $optionValues = @unserialize($optionValues);
    if (!$optionValues) return;

    if (property_exists($optionValues, "*items")) {
        foreach ($optionValues->{"*items"} as $opt) {
            echo "      Option Name: {$opt->name}\n";
            if (property_exists($opt, "values") && property_exists($opt->values, "*items")) {
                foreach ($opt->values->{"*items"} as $val) {
                    echo "        Value: {$val->name}, Qty: {$val->qty}, Price: {$val->price}\n";
                }
            }
        }
    } else {
        echo "      option_values: [unknown format]\n";
    }
}

try {
    echo "=== DETAILED ORDER & PAYMENT DIAGNOSTIC ===\n\n";

    // Tables
    $paymentsTable = "ti_payments";
    $orderMenusTable = "ti_order_menus";
    $orderMenuOptionsTable = "ti_order_menu_options";
    $fiskalyTable = "ti_fiskaly_transactions";

    // Related history tables
    $historyTables = [
        'status_history' => 'Status History',
        'payment_attempts' => 'Payment Attempts',
        'note_history' => 'Note History',
    ];

    $primaryKey = "payment_id";

    // 1️⃣ Recent payments
    $payments = DB::select("SELECT * FROM `$paymentsTable` ORDER BY `$primaryKey` DESC LIMIT 10");
    if (!$payments) {
        echo "No payments found!\n";
        exit;
    }

    foreach ($payments as $payment) {
        echo "\n--- Payment #{$payment->$primaryKey} ({$payment->name}) ---\n";

        // 2️⃣ Order menus
        $menus = DB::select("SELECT * FROM `$orderMenusTable` WHERE `order_id` = ?", [$payment->$primaryKey]);
        if ($menus) {
            echo "Menus:\n";
            foreach ($menus as $menu) {
                echo "  Menu: {$menu->name}, Qty: {$menu->quantity}, Price: {$menu->price}\n";
                printOptionValues($menu->option_values);
            }
        } else {
            echo "No menus for this payment.\n";
        }

        // 3️⃣ Order menu options
        $menuOptions = DB::select("SELECT * FROM `$orderMenuOptionsTable` WHERE `order_id` = ?", [$payment->$primaryKey]);
        if ($menuOptions) {
            echo "Menu Options:\n";
            foreach ($menuOptions as $opt) {
                echo "  Option: {$opt->order_option_name}, Price: {$opt->order_option_price}, Menu ID: {$opt->menu_id}\n";
            }
        } else {
            echo "No menu options for this payment.\n";
        }

        // 4️⃣ Fiskaly transactions
        $fiskaly = DB::select("SELECT * FROM `$fiskalyTable` WHERE `payment_id` = ?", [$payment->$primaryKey]);
        if ($fiskaly) {
            echo "Fiskaly Transactions:\n";
            foreach ($fiskaly as $f) {
                echo "  TX ID: {$f->transaction_id}, Status: {$f->status}, QR Code: ".(!empty($f->qr_code) ? 'Present' : 'Missing')."\n";
            }
        } else {
            echo "No Fiskaly transactions found for this payment.\n";
        }

        // 5️⃣ History tables check
        foreach ($historyTables as $table => $desc) {
            $history = DB::select("SELECT * FROM `$table` WHERE `order_id` = ?", [$payment->$primaryKey]);
            if ($history) {
                echo "$desc:\n";
                foreach ($history as $h) {
                    echo "  Record ID: {$h->id}, Data: ".json_encode($h)."\n";
                }
            } else {
                echo "$desc: Empty!\n";
            }
        }
    }

    echo "\n=== END OF DIAGNOSTIC ===\n";

} catch (\Throwable $e) {
    echo "ERROR: ".$e->getMessage()."\n";
}
