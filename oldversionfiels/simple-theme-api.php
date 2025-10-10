<?php
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

try {
    $pdo = new PDO('mysql:host=localhost;dbname=paymydine', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
    
    // Get the theme data
    $stmt = $pdo->prepare("SELECT data FROM ti_themes WHERE code = 'paymydine-nextjs'");
    $stmt->execute();
    $result = $stmt->fetch();
    
    if ($result && $result['data']) {
        $data = json_decode($result['data'], true);
        $adminTheme = $data['theme_configuration'] ?? 'light';
        
        // Simple mapping
        $themeMap = [
            'light' => 'clean-light',
            'dark' => 'modern-dark',
            'gold' => 'gold-luxury',
            'colorful' => 'vibrant-colors',
            'minimal' => 'minimal'
        ];
        
        $frontendTheme = $themeMap[$adminTheme] ?? 'clean-light';
        
        echo json_encode([
            'success' => true,
            'admin_theme' => $adminTheme,
            'frontend_theme' => $frontendTheme,
            'data' => [
                'theme_id' => $frontendTheme,
                'primary_color' => $data['primary_color'] ?? '#E7CBA9',
                'secondary_color' => $data['secondary_color'] ?? '#EFC7B1',
                'accent_color' => $data['accent_color'] ?? '#3B3B3B',
                'background_color' => $data['background_color'] ?? '#FAFAFA'
            ]
        ]);
    } else {
        echo json_encode([
            'success' => true,
            'admin_theme' => 'NOT_FOUND',
            'frontend_theme' => 'clean-light',
            'data' => [
                'theme_id' => 'clean-light',
                'primary_color' => '#E7CBA9',
                'secondary_color' => '#EFC7B1',
                'accent_color' => '#3B3B3B',
                'background_color' => '#FAFAFA'
            ]
        ]);
    }
    
} catch (Exception $e) {
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?> 