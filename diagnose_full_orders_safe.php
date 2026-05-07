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
            echo "    گزینه: {$opt->name}\n";
            if (property_exists($opt, "values") && property_exists($opt->values, "*items")) {
                foreach ($opt->values->{"*items"} as $val) {
                    echo "      مقدار: {$val->name}, تعداد: {$val->qty}, قیمت: {$val->price}\n";
                }
            }
        }
    } else {
        echo "    option_values: [فرمت ناشناخته]\n";
    }
}

try {
    echo "=== FULL DATABASE ORDER & PAYMENT DIAGNOSTIC ===\n\n";

    $paymentsTable = "ti_payments";
    $orderMenusTable = "ti_order_menus";
    $orderMenuOptionsTable = "ti_order_menu_options";
    $fiskalyTable = "ti_fiskaly_transactions";
    $statusTable = "ti_status_history";

    $primaryKey = "payment_id";

    $lastPayments = DB::select("SELECT * FROM `$paymentsTable` ORDER BY `$primaryKey` DESC LIMIT 10");
    if (!$lastPayments) {
        echo "هیچ تراکنشی پیدا نشد.\n";
        exit;
    }

    foreach ($lastPayments as $payment) {
        echo "\n--- تراکنش #{$payment->payment_id} - {$payment->name} ---\n";

        $menus = DB::select("SELECT * FROM `$orderMenusTable` WHERE `order_id` = ?", [$payment->payment_id]);
        if ($menus) {
            foreach ($menus as $menu) {
                echo "منو: {$menu->name}, تعداد: {$menu->quantity}, قیمت: {$menu->price}\n";
                printOptionValues($menu->option_values);
            }
        } else {
            echo "هیچ منویی برای این تراکنش ثبت نشده.\n";
        }

        $menuOptions = DB::select("SELECT * FROM `$orderMenuOptionsTable` WHERE `order_id` = ?", [$payment->payment_id]);
        if ($menuOptions) {
            foreach ($menuOptions as $opt) {
                echo "گزینه: {$opt->order_option_name}, قیمت: {$opt->order_option_price}, منو: {$opt->menu_id}\n";
            }
        } else {
            echo "هیچ گزینه‌ای برای این تراکنش ثبت نشده.\n";
        }

        // فیسکالی
        $fiskalyQR = DB::select("SELECT qr_code_data FROM `$fiskalyTable` WHERE `order_id` = ?", [$payment->payment_id]);
        if ($fiskalyQR && !empty($fiskalyQR[0]->qr_code_data)) {
            echo "Fiskaly QR: موجود\n";
        } else {
            echo "Fiskaly QR: MISSING!\n";
        }

        // Status History
        try {
            $statusHistory = DB::select("SELECT * FROM `$statusTable` WHERE `object_id` = ?", [$payment->payment_id]);
            if ($statusHistory) {
                echo "Status History: ".count($statusHistory)." رکورد\n";
            } else {
                echo "Status History: هیچ رکوردی\n";
            }
        } catch (\Throwable $e) {
            echo "Status History: جدول موجود نیست.\n";
        }
    }

    echo "\n=== END OF DIAGNOSTIC ===\n";

} catch (\Throwable $e) {
    echo "خطا: ".$e->getMessage()."\n";
}
