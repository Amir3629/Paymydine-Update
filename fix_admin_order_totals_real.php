<?php
$host = '127.0.0.1';
$db   = 'paymydine';
$user = 'paymydine';
$pass = 'P@ssw0rd@123';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    echo "🔧 اتصال به دیتابیس موفق بود.\n\n";
} catch (\PDOException $e) {
    exit("❌ اتصال به دیتابیس ناموفق: ".$e->getMessage()."\n");
}

// گرفتن همه سفارش‌ها
$orders = $pdo->query("SELECT order_id FROM ti_orders")->fetchAll();

foreach ($orders as $order) {
    $orderId = $order['order_id'];

    // جمع مبلغ آیتم‌ها
    $items = $pdo->prepare("SELECT quantity, price FROM ti_order_menus WHERE order_id=?");
    $items->execute([$orderId]);
    $subtotal = 0;
    while ($row = $items->fetch()) {
        $subtotal += $row['quantity'] * $row['price'];
    }

    // جمع مالیات
    $taxRow = $pdo->prepare("SELECT value FROM ti_order_totals WHERE order_id=? AND code='tax'");
    $taxRow->execute([$orderId]);
    $taxAmount = $taxRow->fetchColumn() ?? 0;

    // جمع کل = Subtotal + Tax
    $finalTotal = $subtotal + $taxAmount;

    // آپدیت Subtotal
    $updSub = $pdo->prepare("UPDATE ti_order_totals SET value=? WHERE order_id=? AND code='subtotal'");
    $updSub->execute([$subtotal, $orderId]);

    // آپدیت Total
    $updTotal = $pdo->prepare("UPDATE ti_order_totals SET value=? WHERE order_id=? AND code='total'");
    $updTotal->execute([$finalTotal, $orderId]);

    echo "✔ سفارش $orderId بروزرسانی شد: Subtotal = $subtotal, Tax = $taxAmount, Total = $finalTotal\n";
}

echo "\n✅ همه سفارش‌ها اصلاح شدند. Admin Edit Order حالا Subtotal، Tax و Total درست نمایش داده می‌شوند.\n";
