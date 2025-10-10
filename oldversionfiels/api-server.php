<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    $pdo = new PDO('mysql:host=localhost;dbname=paymydine', 'root', '');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = str_replace('/api-server.php', '', $path);

switch ($path) {
    // NEW: Image serving endpoint
    case '/images':
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            // Add CORS headers for images
            header('Access-Control-Allow-Origin: *');
            header('Access-Control-Allow-Methods: GET, OPTIONS');
            header('Access-Control-Allow-Headers: Content-Type');
            
            $filename = $_GET['file'] ?? '';
            if (empty($filename)) {
                http_response_code(404);
                exit;
            }
            
            // Extract hash directories from filename (e.g., 688a367fbc700218826107.jpg -> 688/a36/7fb)
            if (preg_match('/^(\w{3})(\w{3})(\w{3})/', $filename, $matches)) {
                $hash1 = $matches[1];
                $hash2 = $matches[2];
                $hash3 = $matches[3];
                $imagePath = __DIR__ . "/assets/media/attachments/public/{$hash1}/{$hash2}/{$hash3}/{$filename}";
            } else {
                // Fallback to direct path
                $imagePath = __DIR__ . '/assets/media/attachments/public/' . $filename;
            }
            
            if (file_exists($imagePath)) {
                $mimeType = mime_content_type($imagePath);
                header('Content-Type: ' . $mimeType);
                header('Content-Length: ' . filesize($imagePath));
                header('Cache-Control: public, max-age=31536000');
                readfile($imagePath);
            } else {
                // Log the attempted path for debugging
                error_log("Image not found: " . $imagePath);
                
                // Fallback to pasta.png
                $fallbackPath = __DIR__ . '/images/pasta.png';
                if (file_exists($fallbackPath)) {
                    header('Content-Type: image/png');
                    header('Content-Length: ' . filesize($fallbackPath));
                    readfile($fallbackPath);
                } else {
                    http_response_code(404);
                    echo json_encode(['error' => 'Image not found: ' . $imagePath]);
                }
            }
        }
        break;
        
    case '/menu':
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $query = "
                SELECT 
                    m.menu_id as id,
                    m.menu_name as name,
                    m.menu_description as description,
                    CAST(m.menu_price AS DECIMAL(10,2)) as price,
                    COALESCE(c.name, 'Main') as category_name,
                    ma.name as image
                FROM ti_menus m
                LEFT JOIN ti_menu_categories mc ON m.menu_id = mc.menu_id
                LEFT JOIN ti_categories c ON mc.category_id = c.category_id
                LEFT JOIN ti_media_attachments ma ON ma.attachment_type = 'menus' 
                    AND ma.attachment_id = m.menu_id 
                    AND ma.tag = 'thumb'
                WHERE m.menu_status = 1
                ORDER BY c.priority ASC, m.menu_name ASC
            ";
            
            $stmt = $pdo->query($query);
            $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Convert prices to float and fix image paths
            foreach ($items as &$item) {
                $item['price'] = (float)$item['price'];
                if ($item['image']) {
                    // If image exists, construct the full URL
                    $item['image'] = "http://localhost:8001/images?file=" . urlencode($item['image']);
                } else {
                    // Use default image if none exists
                    $item['image'] = '/images/pasta.png';
                }
            }
            
            // Get all enabled categories
            $categoriesQuery = "
                SELECT category_id as id, name, priority 
                FROM ti_categories 
                WHERE status = 1 
                ORDER BY priority ASC, name ASC
            ";
            $stmt = $pdo->query($categoriesQuery);
            $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'data' => [
                    'items' => $items,
                    'categories' => $categories
                ]
            ]);
        }
        break;
        
    case '/orders':
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);
            
            $pdo->beginTransaction();
            try {
                // Insert order
                $orderStmt = $pdo->prepare("
                    INSERT INTO ti_orders (first_name, last_name, email, telephone, location_id, cart, total_items, payment, order_total, order_date, order_time, order_type, status_id, ip_address, user_agent, created_at, updated_at, order_time_is_asap, ms_order_type) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, CURDATE(), CURTIME(), ?, ?, ?, ?, NOW(), NOW(), ?, ?)
                ");
                $table_id = $input['table_id'] ?? '7';
                $table_name = $input['table_name'] ?? "Table $table_id";
                $orderStmt->execute([
                    $input['customer_name'] ?? "$table_name Customer",
                    '', // FIXED: Changed from 'Customer' to empty string to prevent duplication
                    'customer@table.com',
                    '1234567890',
                    $input['location_id'] ?? 1,
                    json_encode($input['items']),
                    count($input['items']),
                    $input['payment_method'] ?? 'cash',
                    $input['total_amount'],
                    $table_name, // order_type stores table info
                    1,
                    '127.0.0.1',
                    'API Client',
                    0,
                    'collection'
                ]);
                
                $orderId = $pdo->lastInsertId();
                
                // Insert order items
                $itemStmt = $pdo->prepare("
                    INSERT INTO ti_order_menus (order_id, menu_id, name, quantity, price, subtotal) 
                    VALUES (?, ?, ?, ?, ?, ?)
                ");
                
                foreach ($input['items'] as $item) {
                    $price = (float)$item['price'];
                    $quantity = (int)$item['quantity'];
                    $subtotal = $quantity * $price;
                    $itemStmt->execute([
                        $orderId,
                        $item['menu_id'],
                        $item['name'],
                        $quantity,
                        $price,
                        $subtotal
                    ]);
                }
                
                $pdo->commit();
                echo json_encode(['success' => true, 'order_id' => $orderId]);
            } catch (Exception $e) {
                $pdo->rollback();
                echo json_encode(['success' => false, 'error' => $e->getMessage()]);
            }
        }
        break;
        
    case '/order-status':
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $orderId = $_GET['order_id'] ?? null;
            if ($orderId) {
                $stmt = $pdo->prepare("
                    SELECT o.status_id, s.status_name 
                    FROM ti_orders o 
                    LEFT JOIN ti_statuses s ON o.status_id = s.status_id 
                    WHERE o.order_id = ?
                ");
                $stmt->execute([$orderId]);
                $result = $stmt->fetch();
                
                if ($result) {
                    $statusMessage = match((int)$result['status_id']) {
                        1 => 'Order Sent to Kitchen',
                        3 => 'Chef is Preparing Your Meal',
                        4 => 'On Its Way to Your Table!',
                        default => 'Order Received'
                    };
                    
                    // Map database status_id to frontend customer_status (0, 1, 2)
                    $customerStatus = match((int)$result['status_id']) {
                        1 => 0, // Order Sent to Kitchen
                        3 => 1, // Chef is Preparing Your Meal  
                        4 => 2, // On Its Way to Your Table!
                        default => 0
                    };
                    
                    echo json_encode([
                        'success' => true,
                        'data' => [
                        'status_id' => $result['status_id'],
                        'status_name' => $result['status_name'],
                            'status_message' => $statusMessage,
                            'customer_status' => $customerStatus
                        ]
                    ]);
                } else {
                    echo json_encode(['success' => false, 'error' => 'Order not found']);
                }
            }
        } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);
            $stmt = $pdo->prepare("UPDATE ti_orders SET status_id = ? WHERE order_id = ?");
            $stmt->execute([$input['status_id'], $input['order_id']]);
            echo json_encode(['success' => true]);
        }
        break;
        
    case '/waiter-call':
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);
            
            try {
                $stmt = $pdo->prepare("
                    INSERT INTO ti_waiter_calls (table_id, message, status, created_at) 
                    VALUES (?, ?, 'pending', NOW())
                ");
                $table_id = $input['table_id'] ?? '7';
                $table_name = $input['table_name'] ?? "Table $table_id";
                $stmt->execute([
                    $table_name,
                    $input['message'] ?? 'Need assistance'
                ]);
                
                echo json_encode(['success' => true, 'message' => 'Waiter called successfully']);
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'error' => $e->getMessage()]);
            }
        }
        break;
        
    case '/restaurant':
        echo json_encode([
            'success' => true,
            'data' => [
                'name' => 'PayMyDine Restaurant',
                'description' => 'Delicious food with QR ordering',
                'phone' => '+1234567890',
                'address' => '123 Restaurant Street'
            ]
        ]);
        break;
        
    case '/theme-settings':
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            // Get theme settings from database or return default
            try {
                // Get the PayMyDine Next.js theme data
                $stmt = $pdo->prepare("
                    SELECT data, theme_configuration
                    FROM ti_themes 
                    WHERE code = 'paymydine-nextjs' 
                    AND status = 1
                    LIMIT 1
                ");
                $stmt->execute();
                $themeSettings = $stmt->fetch();
                
                error_log("Theme settings from database: " . json_encode($themeSettings));
                
                if ($themeSettings && $themeSettings['data']) {
                    // Parse the JSON data from the theme
                    $themeData = json_decode($themeSettings['data'], true);
                    $adminTheme = $themeData['theme_configuration'] ?? 'light';
                    
                    error_log("Admin theme from data: " . $adminTheme);
                    
                    // Map admin panel theme names to our theme IDs
                    $themeMapping = [
                        'light' => 'clean-light',
                        'dark' => 'modern-dark', 
                        'gold' => 'gold-luxury',
                        'colorful' => 'vibrant-colors',
                        'minimal' => 'minimal',
                        // Add full theme names from admin panel
                        'Clean Light Theme' => 'clean-light',
                        'Modern Dark Theme' => 'modern-dark',
                        'Gold Luxury Theme' => 'gold-luxury',
                        'Vibrant Colors Theme' => 'vibrant-colors',
                        'Minimal Theme' => 'minimal'
                    ];
                    
                    $mappedTheme = $themeMapping[$adminTheme] ?? 'clean-light';
                    error_log("Mapped theme: " . $mappedTheme);
                    
                    $response = [
                        'success' => true,
                        'data' => [
                            'theme_id' => $mappedTheme,
                            'primary_color' => $themeData['primary_color'] ?? '#E7CBA9',
                            'secondary_color' => $themeData['secondary_color'] ?? '#EFC7B1',
                            'accent_color' => $themeData['accent_color'] ?? '#3B3B3B',
                            'background_color' => $themeData['background_color'] ?? '#FAFAFA'
                        ]
                    ];
                    
                    error_log("API Response: " . json_encode($response));
                    echo json_encode($response);
                } else {
                    // Fallback to default theme
                    $response = [
                        'success' => true,
                        'data' => [
                            'theme_id' => 'clean-light',
                            'primary_color' => '#E7CBA9',
                            'secondary_color' => '#EFC7B1',
                            'accent_color' => '#3B3B3B',
                            'background_color' => '#FAFAFA'
                        ]
                    ];
                    
                    error_log("API Response (fallback): " . json_encode($response));
                    echo json_encode($response);
                }
            } catch (Exception $e) {
                error_log("Theme API Error: " . $e->getMessage());
                echo json_encode([
                    'success' => true,
                    'data' => [
                        'theme_id' => 'clean-light',
                        'primary_color' => '#E7CBA9',
                        'secondary_color' => '#EFC7B1',
                        'accent_color' => '#3B3B3B',
                        'background_color' => '#FAFAFA'
                    ]
                ]);
            }
        } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);
            
            try {
                // Map our theme IDs back to admin panel theme names
                $reverseMapping = [
                    'clean-light' => 'light',
                    'modern-dark' => 'dark',
                    'gold-luxury' => 'gold', 
                    'vibrant-colors' => 'colorful',
                    'minimal' => 'minimal'
                ];
                
                $adminTheme = $reverseMapping[$input['theme_id'] ?? 'clean-light'] ?? 'light';
                
                // Update theme settings in database
                $stmt = $pdo->prepare("
                    UPDATE ti_themes 
                    SET 
                        data = JSON_SET(data, '$.theme_configuration', ?),
                        data = JSON_SET(data, '$.primary_color', ?),
                        data = JSON_SET(data, '$.secondary_color', ?),
                        data = JSON_SET(data, '$.accent_color', ?),
                        data = JSON_SET(data, '$.background_color', ?),
                        updated_at = NOW()
                    WHERE code = 'paymydine-nextjs'
                ");
                
                $result = $stmt->execute([
                    $adminTheme,
                    $input['primary_color'] ?? '#E7CBA9',
                    $input['secondary_color'] ?? '#EFC7B1',
                    $input['accent_color'] ?? '#3B3B3B',
                    $input['background_color'] ?? '#FAFAFA'
                ]);
                
                if ($result) {
                    echo json_encode(['success' => true, 'message' => 'Theme settings updated successfully']);
                } else {
                    echo json_encode(['success' => false, 'message' => 'Failed to update theme settings']);
                }
            } catch (Exception $e) {
                echo json_encode(['success' => false, 'message' => 'Database error: ' . $e->getMessage()]);
            }
        }
        break;
        
    case '/table-info':
        $table_id = $_GET['table_id'] ?? null;
        $qr = $_GET['qr'] ?? null;
        
        if (!$table_id && !$qr) {
            echo json_encode(['success' => false, 'error' => 'Missing table_id or qr']);
            break;
        }
        
        try {
            if ($table_id) {
                $stmt = $pdo->prepare("
                    SELECT t.table_id, t.table_name, t.qr_code, l.location_id, t.min_capacity, t.max_capacity 
                    FROM ti_tables t 
                    LEFT JOIN ti_locationables l ON t.table_id = l.locationable_id AND l.locationable_type = 'tables'
                    WHERE t.table_id = ? 
                    LIMIT 1
                ");
                $stmt->execute([$table_id]);
            } else {
                $stmt = $pdo->prepare("
                    SELECT t.table_id, t.table_name, t.qr_code, l.location_id, t.min_capacity, t.max_capacity 
                    FROM ti_tables t 
                    LEFT JOIN ti_locationables l ON t.table_id = l.locationable_id AND l.locationable_type = 'tables'
                    WHERE t.qr_code = ? 
                    LIMIT 1
                ");
                $stmt->execute([$qr]);
            }
            
            $table = $stmt->fetch();
            
            if ($table) {
                echo json_encode([
                    'success' => true, 
                    'data' => [
                        'table_id' => $table['table_id'],
                        'table_name' => $table['table_name'],
                        'qr_code' => $table['qr_code'],
                        'location_id' => $table['location_id'] ?? 1,
                        'min_capacity' => $table['min_capacity'] ?? 1,
                        'max_capacity' => $table['max_capacity'] ?? 4
                    ]
                ]);
            } else {
                echo json_encode(['success' => false, 'error' => 'Table not found']);
            }
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
        }
        break;
        
    case '/table-menu':
        $table_id = $_GET['table_id'] ?? null;
        $location_id = $_GET['location_id'] ?? 1;
        
        if (!$table_id) {
            echo json_encode(['success' => false, 'error' => 'Missing table_id']);
            break;
        }
        
        try {
            $query = "
                SELECT 
                    m.menu_id as id,
                    m.menu_name as name,
                    m.menu_description as description,
                    CAST(m.menu_price AS DECIMAL(10,2)) as price,
                    COALESCE(c.name, 'Main') as category_name,
                    CASE 
                        WHEN c.name = 'Appetizer' THEN '/images/pilaf.png'
                        WHEN c.name IN ('Main Course', 'Traditional') THEN '/images/nasi-lemak.png'
                        WHEN c.name = 'Seafoods' THEN '/images/fish.png'
                        WHEN c.name = 'Salads' THEN '/images/chili.png'
                        ELSE '/images/pasta.png'
                    END as image
                FROM ti_menus m
                LEFT JOIN ti_menu_categories mc ON m.menu_id = mc.menu_id
                LEFT JOIN ti_categories c ON mc.category_id = c.category_id
                WHERE m.menu_status = 1
                ORDER BY m.menu_name
            ";
            
            $stmt = $pdo->query($query);
            $items = $stmt->fetchAll();
            
            // Convert prices to float
            foreach ($items as &$item) {
                $item['price'] = (float)$item['price'];
            }
            
            $categoriesQuery = "SELECT category_id as id, name FROM ti_categories WHERE status = 1";
            $stmt = $pdo->query($categoriesQuery);
            $categories = $stmt->fetchAll();
            
            echo json_encode([
                'success' => true,
                'data' => [
                    'items' => $items,
                    'categories' => $categories,
                    'table_id' => $table_id
                ]
            ]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
        }
        break;
        
    case '/table-orders':
        $table_id = $_GET['table_id'] ?? null;
        
        if (!$table_id) {
            echo json_encode(['success' => false, 'error' => 'Missing table_id']);
            break;
        }
        
        try {
            $stmt = $pdo->prepare("
                SELECT o.*, s.status_name 
                FROM ti_orders o 
                LEFT JOIN ti_statuses s ON o.status_id = s.status_id
                WHERE o.order_type LIKE ? 
                ORDER BY o.order_id DESC 
                LIMIT 20
            ");
            $stmt->execute(["%Table $table_id%"]);
            $orders = $stmt->fetchAll();
            
            echo json_encode(['success' => true, 'data' => $orders]);
        } catch (Exception $e) {
            echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
        }
        break;
        
    case '/categories':
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            // Get all categories with frontend visibility status
            $query = "
                SELECT 
                    category_id as id, 
                    name, 
                    description,
                    priority,
                    status,
                    frontend_visible,
                    created_at
                FROM ti_categories 
                ORDER BY priority ASC, name ASC
            ";
            
            $stmt = $pdo->query($query);
            $categories = $stmt->fetchAll();
            
            echo json_encode([
                'success' => true,
                'data' => $categories
            ]);
        } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
            // Update category frontend visibility
            $input = json_decode(file_get_contents('php://input'), true);
            
            $categoryId = $input['category_id'] ?? null;
            $frontendVisible = $input['frontend_visible'] ?? null;
            
            if ($categoryId && $frontendVisible !== null) {
                $stmt = $pdo->prepare("
                    UPDATE ti_categories 
                    SET frontend_visible = ?, updated_at = NOW() 
                    WHERE category_id = ?
                ");
                
                $result = $stmt->execute([$frontendVisible ? 1 : 0, $categoryId]);
                
                if ($result) {
                    echo json_encode(['success' => true, 'message' => 'Category updated successfully']);
                } else {
                    echo json_encode(['success' => false, 'error' => 'Failed to update category']);
                }
            } else {
                echo json_encode(['success' => false, 'error' => 'Missing required parameters']);
            }
        }
        break;
        
    case '/test-theme':
        echo json_encode([
            'success' => true,
            'message' => 'Theme API is working',
            'timestamp' => date('Y-m-d H:i:s'),
            'data' => [
                'theme_id' => 'vibrant-colors',
                'primary_color' => '#EF4444',
                'secondary_color' => '#10B981',
                'accent_color' => '#1F2937',
                'background_color' => '#FFFFFF'
            ]
        ]);
        break;
        
    case '/debug-theme':
        try {
            // Check ti_themes table
            $stmt = $pdo->prepare("SELECT * FROM ti_themes WHERE is_active = 1");
            $stmt->execute();
            $themes = $stmt->fetchAll();
            
            // Check ti_settings table
            $stmt2 = $pdo->prepare("SELECT * FROM ti_settings WHERE item LIKE '%theme%'");
            $stmt2->execute();
            $settings = $stmt2->fetchAll();
            
            echo json_encode([
                'success' => true,
                'ti_themes' => $themes,
                'ti_settings' => $settings
            ]);
        } catch (Exception $e) {
            echo json_encode([
                'success' => false,
                'error' => $e->getMessage()
            ]);
        }
        break;
        
    case '/simple-theme':
        include 'simple-theme-api.php';
        break;
        
    default:
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found']);
        break;
}
?> 