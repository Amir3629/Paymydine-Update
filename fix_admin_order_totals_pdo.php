<?php
// fix_admin_order_totals_pdo.php
$host = '127.0.0.1';
$db   = 'paymydine';
$user = 'paymydine';
$pass = 'P@ssw0rd@123';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_OBJ,
    PDO::ATTR_EMULATE_PREPARES   => false,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    echo "🔧 اتصال به دیتابیس موفق بود.\n\n";
} catch (\PDOException $e) {
    exit("❌ اتصال به دیتابیس ناموفق: ".$e->getMessage()."\n");
}

// نام جدول واقعی
$transactionsTable = 'order_payment_transactions';
$itemsTable        = 'order_payment_transaction_items';

// اصلاح تراکنش‌ها
$transactions = $pdo->query("SELECT * FROM $transactionsTable")->fetchAll();
foreach ($transactions as $tx) {
    $upd = [];
    foreach (['amount','tax_amount','tip_amount','order_total'] as $f) {
        if (is_string($tx->$f) && ($json = json_decode($tx->$f, true)) !== null) {
            $upd[$f] = array_sum($json);
        }
    }
    if ($upd) {
        $set = [];
        foreach ($upd as $k=>$v) $set[] = "$k=".floatval($v);
        $pdo->exec("UPDATE $transactionsTable SET ".implode(',',$set)." WHERE id={$tx->id}");
        echo "✔ تراکنش ID {$tx->id} اصلاح شد\n";
    }
}

// اصلاح آیتم‌ها
$items = $pdo->query("SELECT * FROM $itemsTable")->fetchAll();
foreach ($items as $item) {
    $upd = [];
    foreach (['quantity_paid','unit_price','line_total'] as $f) {
        if (is_string($item->$f) && ($json = json_decode($item->$f, true)) !== null) {
            $upd[$f] = array_sum($json);
        }
    }
    if ($upd) {
        $set = [];
        foreach ($upd as $k=>$v) $set[] = "$k=".floatval($v);
        $pdo->exec("UPDATE $itemsTable SET ".implode(',',$set)." WHERE id={$item->id}");
        echo "✔ آیتم ID {$item->id} اصلاح شد\n";
    }
}

echo "\n✅ همه تراکنش‌ها و آیتم‌ها اصلاح شدند. حالا VAT و Total در Admin Edit درست نمایش داده می‌شود.\n";
?>
