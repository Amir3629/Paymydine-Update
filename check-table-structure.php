<?php
/**
 * Check Table Structure Script
 * This script will show us the actual structure of the ti_themes table
 */

// Database connection
$host = '127.0.0.1';
$dbname = 'paymydine';
$username = 'root';
$password = '';

try {
    $pdo = new PDO("mysql:host=$host;dbname=$dbname", $username, $password);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    echo "✅ Connected to database successfully\n";
    
    // Check table structure
    echo "\n🔍 ti_themes table structure:\n";
    
    $stmt = $pdo->query("DESCRIBE ti_themes");
    $columns = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($columns as $column) {
        echo "   {$column['Field']} - {$column['Type']} - {$column['Null']} - {$column['Key']} - {$column['Default']}\n";
    }
    
    // Check current data
    echo "\n📊 Current themes in database:\n";
    
    $stmt = $pdo->query("SELECT * FROM ti_themes LIMIT 3");
    $themes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    if (empty($themes)) {
        echo "   No themes found\n";
    } else {
        foreach ($themes as $theme) {
            echo "   Theme: " . json_encode($theme, JSON_PRETTY_PRINT) . "\n";
        }
    }
    
} catch (PDOException $e) {
    echo "❌ Database error: " . $e->getMessage() . "\n";
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?> 