<?php
/**
 * Fix Themes Script
 * This script will fix the theme registration issues and ensure frontend-theme appears
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
    
    // 1. Remove old/broken theme records
    echo "\n🧹 Cleaning up old theme records...\n";
    
    $stmt = $pdo->prepare("DELETE FROM ti_themes WHERE code IN ('oussama-theme', 'paymydine-nextjs')");
    $stmt->execute();
    echo "   Removed old theme records\n";
    
    // 2. Add the frontend-theme
    echo "\n➕ Adding frontend-theme...\n";
    
    $stmt = $pdo->prepare("
        INSERT INTO ti_themes (
            name, code, description, version, data, is_active, is_custom, created_at
        ) VALUES (
            'Frontend Theme',
            'frontend-theme',
            'Next.js powered front-end theme for PayMyDine with modern design and multi-tenant support.',
            '1.0.0',
            '{\"theme_configuration\": \"light\", \"primary_color\": \"#E7CBA9\", \"secondary_color\": \"#EFC7B1\", \"accent_color\": \"#3B3B3B\", \"background_color\": \"#FAFAFA\"}',
            1,
            0,
            NOW()
        ) ON DUPLICATE KEY UPDATE
            name = VALUES(name),
            description = VALUES(description),
            version = VALUES(version),
            data = VALUES(data),
            is_active = VALUES(is_active),
            updated_at = NOW()
    ");
    
    $stmt->execute();
    echo "   Frontend theme added/updated successfully\n";
    
    // 3. Verify themes
    echo "\n🔍 Current themes in database:\n";
    
    $stmt = $pdo->query("SELECT id, name, code, is_active FROM ti_themes ORDER BY id");
    $themes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($themes as $theme) {
        $status = $theme['is_active'] ? '✅ Active' : '❌ Inactive';
        echo "   {$theme['id']}. {$theme['name']} ({$theme['code']}) - {$status}\n";
    }
    
    // 4. Check if frontend-theme folder exists
    echo "\n📁 Checking theme files...\n";
    
    $themePath = __DIR__ . '/themes/frontend-theme';
    if (is_dir($themePath)) {
        echo "   ✅ frontend-theme folder exists\n";
        
        $requiredFiles = ['theme.json', 'theme.php'];
        foreach ($requiredFiles as $file) {
            if (file_exists($themePath . '/' . $file)) {
                echo "   ✅ {$file} exists\n";
            } else {
                echo "   ❌ {$file} missing\n";
            }
        }
    } else {
        echo "   ❌ frontend-theme folder missing\n";
    }
    
    echo "\n🎉 Theme fix completed!\n";
    echo "   Now refresh your admin panel and check the Themes section.\n";
    echo "   The 'Frontend Theme' should now appear without errors.\n";
    
} catch (PDOException $e) {
    echo "❌ Database error: " . $e->getMessage() . "\n";
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?> 