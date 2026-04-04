<?php
/**
 * Refresh Themes Script
 * This script will refresh the theme cache and ensure proper detection
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
    
    // 1. Check current themes
    echo "\n🔍 Current themes in database:\n";
    
    $stmt = $pdo->query("SELECT theme_id, name, code, status, is_default FROM ti_themes ORDER BY theme_id");
    $themes = $stmt->fetchAll(PDO::FETCH_ASSOC);
    
    foreach ($themes as $theme) {
        $status = $theme['status'] ? '✅ Active' : '❌ Inactive';
        $default = $theme['is_default'] ? ' (Default)' : '';
        echo "   {$theme['theme_id']}. {$theme['name']} ({$theme['code']}) - {$status}{$default}\n";
    }
    
    // 2. Ensure frontend-theme is properly configured
    echo "\n🔧 Configuring frontend-theme...\n";
    
    // Update the frontend theme with proper data
    $stmt = $pdo->prepare("
        UPDATE ti_themes 
        SET 
            name = 'Frontend Theme',
            description = 'Next.js powered front-end theme for PayMyDine with modern design and multi-tenant support.',
            version = '1.0.0',
            data = '{\"theme_configuration\": \"light\", \"primary_color\": \"#E7CBA9\", \"secondary_color\": \"#EFC7B1\", \"accent_color\": \"#3B3B3B\", \"background_color\": \"#FAFAFA\"}',
            status = 1,
            updated_at = NOW()
        WHERE code = 'frontend-theme'
    ");
    
    $stmt->execute();
    echo "   Frontend theme updated successfully\n";
    
    // 3. Check if theme files are accessible
    echo "\n📁 Checking theme files...\n";
    
    $themePath = __DIR__ . '/themes/frontend-theme';
    if (is_dir($themePath)) {
        echo "   ✅ frontend-theme folder exists\n";
        
        $requiredFiles = ['theme.json', 'theme.php'];
        foreach ($requiredFiles as $file) {
            if (file_exists($themePath . '/' . $file)) {
                echo "   ✅ {$file} exists\n";
                
                // Check file permissions
                $perms = fileperms($themePath . '/' . $file);
                $perms = substr(sprintf('%o', $perms), -4);
                echo "      Permissions: {$perms}\n";
            } else {
                echo "   ❌ {$file} missing\n";
            }
        }
        
        // Check folder permissions
        $perms = fileperms($themePath);
        $perms = substr(sprintf('%o', $perms), -4);
        echo "   Folder permissions: {$perms}\n";
        
    } else {
        echo "   ❌ frontend-theme folder missing\n";
    }
    
    // 4. Verify theme in database after update
    echo "\n🔍 Frontend theme in database after update:\n";
    
    $stmt = $pdo->prepare("SELECT * FROM ti_themes WHERE code = 'frontend-theme'");
    $stmt->execute();
    $theme = $stmt->fetch(PDO::FETCH_ASSOC);
    
    if ($theme) {
        echo "   ✅ Theme found:\n";
        echo "      ID: {$theme['theme_id']}\n";
        echo "      Name: {$theme['name']}\n";
        echo "      Code: {$theme['code']}\n";
        echo "      Status: {$theme['status']}\n";
        echo "      Version: {$theme['version']}\n";
    } else {
        echo "   ❌ Theme not found in database\n";
    }
    
    echo "\n🎉 Theme refresh completed!\n";
    echo "   Now:\n";
    echo "   1. Clear your browser cache\n";
    echo "   2. Refresh the admin panel\n";
    echo "   3. Go to Design > Themes\n";
    echo "   4. The 'Frontend Theme' should now appear without errors\n";
    
    // 5. Optional: Set as default theme
    echo "\n💡 To set this as the default theme, run:\n";
    echo "   UPDATE ti_themes SET is_default = 0;\n";
    echo "   UPDATE ti_themes SET is_default = 1 WHERE code = 'frontend-theme';\n";
    
} catch (PDOException $e) {
    echo "❌ Database error: " . $e->getMessage() . "\n";
} catch (Exception $e) {
    echo "❌ Error: " . $e->getMessage() . "\n";
}
?> 