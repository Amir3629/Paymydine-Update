<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

try {
    $pdo = new PDO('mysql:host=127.0.0.1;dbname=taste', 'root', 'password');
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
} catch (PDOException $e) {
    http_response_code(500);
    echo json_encode(['error' => 'Database connection failed']);
    exit;
}

$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$path = str_replace('/api-server2.php', '', $path);

switch ($path) {
    // Get all tables with their QR codes and frontend URLs
    case '/tables':
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $query = "
                SELECT 
                    t.table_id,
                    t.table_name,
                    t.qr_code,
                    t.min_capacity,
                    t.max_capacity,
                    t.table_status,
                    CONCAT('http://localhost:3000/table/', t.table_id) as frontend_url,
                    CONCAT('http://localhost:3000/table/', t.table_id, '?qr=', t.qr_code) as qr_redirect_url
                FROM ti_tables t
                ORDER BY t.table_id
            ";
            
            $stmt = $pdo->query($query);
            $tables = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'data' => $tables
            ]);
        }
        break;

    // Get specific table information
    case '/table-info':
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $tableId = $_GET['table_id'] ?? null;
            $qrCode = $_GET['qr_code'] ?? null;
            
            if (!$tableId && !$qrCode) {
                http_response_code(400);
                echo json_encode(['error' => 'table_id or qr_code is required']);
                break;
            }
            
            $whereClause = $tableId ? "t.table_id = ?" : "t.qr_code = ?";
            $param = $tableId ?: $qrCode;
            
            $query = "
                SELECT 
                    t.table_id,
                    t.table_name,
                    t.qr_code,
                    t.min_capacity,
                    t.max_capacity,
                    t.table_status,
                    CONCAT('http://localhost:3000/table/', t.table_id) as frontend_url
                FROM ti_tables t
                WHERE {$whereClause}
            ";
            
            $stmt = $pdo->prepare($query);
            $stmt->execute([$param]);
            $table = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($table) {
                echo json_encode([
                    'success' => true,
                    'data' => $table
                ]);
            } else {
                http_response_code(404);
                echo json_encode(['error' => 'Table not found']);
            }
        }
        break;

    // Get table-specific menu
    case '/table-menu':
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $tableId = $_GET['table_id'] ?? null;
            
            if (!$tableId) {
                http_response_code(400);
                echo json_encode(['error' => 'table_id is required']);
                break;
            }
            
            // Get table info first
            $tableQuery = "
                SELECT table_id, table_name, qr_code
                FROM ti_tables 
                WHERE table_id = ?
            ";
            $tableStmt = $pdo->prepare($tableQuery);
            $tableStmt->execute([$tableId]);
            $tableInfo = $tableStmt->fetch(PDO::FETCH_ASSOC);
            
            if (!$tableInfo) {
                http_response_code(404);
                echo json_encode(['error' => 'Table not found']);
                break;
            }
            
            // Get menu items with frontend_visible categories only
            $menuQuery = "
                SELECT 
                    m.menu_id as id,
                    m.menu_name as name,
                    m.menu_description as description,
                    CAST(m.menu_price AS DECIMAL(10,2)) as price,
                    COALESCE(c.name, 'Main') as category_name,
                    COALESCE(ma.name, '/images/pasta.png') as image
                FROM ti_menus m
                LEFT JOIN ti_menu_categories mc ON m.menu_id = mc.menu_id
                LEFT JOIN ti_categories c ON mc.category_id = c.category_id
                LEFT JOIN ti_media_attachments ma ON ma.attachment_type = 'menus' 
                    AND ma.attachment_id = m.menu_id 
                    AND ma.tag = 'thumb'
                WHERE m.menu_status = 1
                AND (c.frontend_visible = 1 OR c.frontend_visible IS NULL)
                ORDER BY m.menu_name
            ";
            
            $menuStmt = $pdo->query($menuQuery);
            $menuItems = $menuStmt->fetchAll(PDO::FETCH_ASSOC);
            
            // Convert prices to float and fix image URLs
            foreach ($menuItems as &$item) {
                $item['price'] = (float)$item['price'];
                if ($item['image'] && $item['image'] !== '/images/pasta.png') {
                    $item['image'] = "http://localhost:8001/images?file=" . urlencode($item['image']);
                }
            }
            
            // Get categories for this table
            $categoryQuery = "
                SELECT DISTINCT 
                    c.category_id,
                    c.name as category_name,
                    c.description
                FROM ti_categories c
                INNER JOIN ti_menu_categories mc ON c.category_id = mc.category_id
                INNER JOIN ti_menus m ON mc.menu_id = m.menu_id
                WHERE c.status = 1 
                AND (c.frontend_visible = 1 OR c.frontend_visible IS NULL)
                AND m.menu_status = 1
                ORDER BY c.name
            ";
            
            $categoryStmt = $pdo->query($categoryQuery);
            $categories = $categoryStmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'data' => [
                    'table' => $tableInfo,
                    'menu_items' => $menuItems,
                    'categories' => $categories
                ]
            ]);
        }
        break;

    // Get orders for a specific table - FIXED: Use created_at instead of date_added
    case '/table-orders':
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $tableId = $_GET['table_id'] ?? null;
            $tableName = $_GET['table_name'] ?? null;
            
            if (!$tableId && !$tableName) {
                http_response_code(400);
                echo json_encode(['error' => 'table_id or table_name is required']);
                break;
            }
            
            $whereClause = $tableId ? "o.order_type = ?" : "o.order_type = ?";
            $param = $tableId ? "Table " . $tableId : $tableName;
            
            $query = "
                SELECT 
                    o.order_id,
                    o.first_name,
                    o.order_total,
                    o.payment,
                    o.order_type,
                    o.created_at,
                    o.status_id,
                    CASE 
                        WHEN o.status_id = 1 THEN 0  -- pending
                        WHEN o.status_id = 3 THEN 1  -- preparing
                        WHEN o.status_id = 4 THEN 2  -- ready
                        ELSE 0
                    END as customer_status
                FROM ti_orders o
                WHERE {$whereClause}
                ORDER BY o.created_at DESC
                LIMIT 10
            ";
            
            $stmt = $pdo->prepare($query);
            $stmt->execute([$param]);
            $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'data' => $orders
            ]);
        }
        break;

    // Create a new table
    case '/create-table':
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);
            
            $tableName = $input['table_name'] ?? null;
            $minCapacity = $input['min_capacity'] ?? 2;
            $maxCapacity = $input['max_capacity'] ?? 4;
            
            if (!$tableName) {
                http_response_code(400);
                echo json_encode(['error' => 'table_name is required']);
                break;
            }
            
            // Generate unique QR code
            $qrCode = 'ms' . time() . substr(md5($tableName), 0, 6);
            
            // Insert new table
            $insertQuery = "
                INSERT INTO ti_tables (table_name, qr_code, min_capacity, max_capacity, table_status, created_at, updated_at)
                VALUES (?, ?, ?, ?, 1, NOW(), NOW())
            ";
            
            $stmt = $pdo->prepare($insertQuery);
            $result = $stmt->execute([$tableName, $qrCode, $minCapacity, $maxCapacity]);
            
            if ($result) {
                $tableId = $pdo->lastInsertId();
                
                // Get the created table info
                $tableQuery = "
                    SELECT 
                        table_id,
                        table_name,
                        qr_code,
                        min_capacity,
                        max_capacity,
                        CONCAT('http://localhost:3000/table/', table_id) as frontend_url,
                        CONCAT('http://localhost:3000/table/', table_id, '?qr=', qr_code) as qr_redirect_url
                    FROM ti_tables 
                    WHERE table_id = ?
                ";
                
                $tableStmt = $pdo->prepare($tableQuery);
                $tableStmt->execute([$tableId]);
                $newTable = $tableStmt->fetch(PDO::FETCH_ASSOC);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'Table created successfully',
                    'data' => $newTable
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to create table']);
            }

        }
        break;

    // Generate QR code for existing table
    case '/generate-qr':
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);
            
            $tableId = $input['table_id'] ?? null;
            
            if (!$tableId) {
                http_response_code(400);
                echo json_encode(['error' => 'table_id is required']);
                break;
            }
            
            // Generate new QR code
            $qrCode = 'ms' . time() . substr(md5($tableId), 0, 6);
            
            // Update table with new QR code
            $updateQuery = "UPDATE ti_tables SET qr_code = ?, updated_at = NOW() WHERE table_id = ?";
            $stmt = $pdo->prepare($updateQuery);
            $result = $stmt->execute([$qrCode, $tableId]);
            
            if ($result) {
                // Get updated table info
                $tableQuery = "
                    SELECT 
                        table_id,
                        table_name,
                        qr_code,
                        CONCAT('http://localhost:3000/table/', table_id) as frontend_url,
                        CONCAT('http://localhost:3000/table/', table_id, '?qr=', qr_code) as qr_redirect_url
                    FROM ti_tables 
                    WHERE table_id = ?
                ";
                
                $tableStmt = $pdo->prepare($tableQuery);
                $tableStmt->execute([$tableId]);
                $table = $tableStmt->fetch(PDO::FETCH_ASSOC);
                
                echo json_encode([
                    'success' => true,
                    'message' => 'QR code generated successfully',
                    'data' => $table
                ]);
            } else {
                http_response_code(500);
                echo json_encode(['error' => 'Failed to generate QR code']);
            }

        }
        break;

    // Debug endpoint to show table mapping
    case '/debug-tables':
        if ($_SERVER['REQUEST_METHOD'] === 'GET') {
            $query = "
                SELECT 
                    table_id,
                    table_name,
                    qr_code,
                    CONCAT('http://localhost:3000/table/', table_id) as frontend_url,
                    CONCAT('Table ', table_id) as expected_order_tag
                FROM ti_tables 
                ORDER BY table_id
            ";
            
            $stmt = $pdo->query($query);
            $tables = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            echo json_encode([
                'success' => true,
                'message' => 'Table ID to Name Mapping',
                'data' => $tables
            ]);
        }
        break;

    default:
        http_response_code(404);
        echo json_encode(['error' => 'Endpoint not found']);
        break;
}
?> 
?> 