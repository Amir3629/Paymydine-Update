<?php
$host = '127.0.0.1';
$db   = 'paymydine';
$user = 'paymydine';
$pass = 'P@ssw0rd@123';
$charset = 'utf8mb4';

$dsn = "mysql:host=$host;dbname=$db;charset=$charset";
$options = [
    PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
];

try {
    $pdo = new PDO($dsn, $user, $pass, $options);
    echo "🔧 اتصال به دیتابیس موفق بود.\n\n";
} catch (\PDOException $e) {
    exit("❌ اتصال به دیتابیس ناموفق: ".$e->getMessage()."\n");
}

echo "📋 لیست جدول‌های دیتابیس $db:\n";
$stmt = $pdo->query("SHOW TABLES");
$tables = $stmt->fetchAll(PDO::FETCH_COLUMN);
foreach ($tables as $t) {
    echo " - $t\n";
}
?>
