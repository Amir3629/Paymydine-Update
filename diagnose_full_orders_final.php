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

$paymentsTable = "ti_payments";
$orderMenusTable = "ti_order_menus";
$orderMenuOptionsTable = "ti_order_menu_options";
$fiskalyTable = "ti_fiskaly_transactions";

$primaryKey = "payment_id";

$lastPayments = DB::select("SELECT * FROM `$paymentsTable` ORDER BY `$primaryKey` DESC LIMIT 10");

foreach ($lastPayments as $payment) {
    echo "\n--- تراکنش #{$payment->payment_id} - {$payment->name} ---\n";

    $menus = DB::select("SELECT * FROM `$orderMenusTable` WHERE `order_id` = ?", [$payment->payment_id]);
    if ($menus) {
        foreach ($menus as $menu) {
            echo "  منو: {$menu->name}, تعداد: {$menu->quantity}, قیمت: {$menu->price}\n";
            printOptionValues($menu->option_values);
        }
    } else {
        echo "  هیچ منویی ثبت نشده.\n";
    }

    $menuOptions = DB::select("SELECT * FROM `$orderMenuOptionsTable` WHERE `order_id` = ?", [$payment->payment_id]);
    if ($menuOptions) {
        foreach ($menuOptions as $opt) {
            echo "  گزینه: {$opt->order_option_name}, قیمت: {$opt->order_option_price}, منو: {$opt->menu_id}\n";
        }
    } else {
        echo "  هیچ گزینه‌ای ثبت نشده.\n";
    }

    $fiskaly = DB::select("SELECT * FROM `$fiskalyTable` WHERE `order_id` = ?", [$payment->payment_id]);
    if ($fiskaly) {
        foreach ($fiskaly as $f) {
            echo "  Fiskaly QR: موجود, وضعیت: {$f->status}, مبلغ: {$f->amount_total}\n";
        }
    } else {
        echo "  Fiskaly QR: MISSING!\n";
    }

    $statusHistory = DB::select("SELECT * FROM `ti_status_history` WHERE `order_id` = ?", [$payment->payment_id]);
    echo "  Status History: ".($statusHistory ? count($statusHistory)." رکورد" : "هیچ رکوردی")."\n";

    $paymentAttempts = DB::select("SELECT * FROM `ti_payment_attempts` WHERE `order_id` = ?", [$payment->payment_id]);
    echo "  Payment Attempts: ".($paymentAttempts ? count($paymentAttempts)." رکورد" : "هیچ رکوردی")."\n";

    $noteHistory = DB::select("SELECT * FROM `ti_note_history` WHERE `order_id` = ?", [$payment->payment_id]);
    echo "  Note History: ".($noteHistory ? count($noteHistory)." رکورد" : "هیچ رکوردی")."\n";
}

echo "\n=== پایان بررسی کامل ===\n";
