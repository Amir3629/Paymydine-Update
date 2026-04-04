<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}



// --- PMD PATH NORMALIZER (fix 404 routes when PATH_INFO missing / when /api/v1 prefix exists) ---
$__pmd_uri_path = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
$__pmd_pathinfo = $_SERVER['PATH_INFO'] ?? '';

// If PATH_INFO is empty, derive from REQUEST_URI by removing script name prefix
if (!$__pmd_pathinfo || $__pmd_pathinfo === '/') {
    $__pmd_pathinfo = preg_replace('#^/api-server-multi-tenant\.php#', '', $__pmd_uri_path);
}

// Normalize: remove leading /api/v1 if present
$__pmd_pathinfo = preg_replace('#^/api/v1#', '', $__pmd_pathinfo);

// Always start with /
if (!$__pmd_pathinfo) $__pmd_pathinfo = '/';
if ($__pmd_pathinfo[0] !== '/') $__pmd_pathinfo = '/' . $__pmd_pathinfo;

// Expose final normalized path to existing router code via a common variable name
$_SERVER['PMD_NORMALIZED_PATH'] = $__pmd_pathinfo;
// --- /PMD PATH NORMALIZER ---

// Prevent PHP notices/warnings from breaking JSON output in development
@ini_set('display_errors', '0');
@error_reporting(E_ALL & ~E_NOTICE & ~E_WARNING);

class MultiTenantApiServer {
    private $pdo;
    private $tenantInfo;
    private $mainDb;
    
    public function __construct() {
        // Connect to main database first
        $this->mainDb = new PDO('mysql:host=127.0.0.1;dbname=paymydine', 'paymydine', 'P@ssw0rd@123');
        $this->mainDb->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // Detect tenant and connect to tenant database
        $this->detectTenant();
    }
    
    // Check if a column exists on a table for compatibility across schemas
    private function hasColumn($table, $column) {
        try {
            $stmt = $this->pdo->prepare("SHOW COLUMNS FROM `$table` LIKE ?");
            $stmt->execute([$column]);
            return $stmt->fetch(PDO::FETCH_ASSOC) !== false;
        } catch (Exception $e) {
            return false;
        }
    }
    
    private function detectTenant() {
        // Get subdomain from various sources
        $subdomain = $this->extractSubdomain();
        
        if ($subdomain && $subdomain !== 'www') {
            // Find tenant in main database
            $stmt = $this->mainDb->prepare("
                SELECT * FROM ti_tenants 
                WHERE domain LIKE ? OR domain = ?
                AND status = 'active'
            ");
            $stmt->execute([$subdomain . '.%', $subdomain]);
            $this->tenantInfo = $stmt->fetch(PDO::FETCH_ASSOC);
            
            if ($this->tenantInfo) {
                // Connect to tenant database
                $this->pdo = new PDO(
                    'mysql:host=127.0.0.1;dbname=' . $this->tenantInfo['database'], 'paymydine', 'P@ssw0rd@123');
                $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            } else {
                // Tenant not found, use default database
                $this->pdo = $this->mainDb;
            }
        } else {
            // No subdomain, use default database
            $this->pdo = $this->mainDb;
        }
    }
    
    private function getBaseUrl() {
        // Prefer tenant domain if detected
        if (!empty($this->tenantInfo['domain'])) {
            $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
            return $scheme . '://' . $this->tenantInfo['domain'];
        }
        // Fallback to current host (includes port for 127.0.0.1)
        $scheme = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off') ? 'https' : 'http';
        $host = $_SERVER['HTTP_HOST'] ?? '127.0.0.1';
        return $scheme . '://' . $host;
    }
    
    private function extractSubdomain() {
        $host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
        $parts = explode('.', $host);
        
        // Extract subdomain (e.g., "rosana" from "rosana.paymydine.com")
        if (count($parts) >= 3) {
            return $parts[0];
        }
        
        // For development/testing
        if (count($parts) >= 2 && $parts[0] !== 'www') {
            return $parts[0];
        }
        
        return null;
    }
    
    public function handleRequest() {
        $path = $_SERVER['PMD_NORMALIZED_PATH'];
        $path = str_replace('/api-server-multi-tenant.php', '', $path);
        // Support query-based routing for dev servers: /api-server-multi-tenant.php?action=menu
        if (isset($_GET['action']) && $_GET['action']) {
            $candidate = '/' . ltrim($_GET['action'], '/');
            $path = $candidate ?: $path;
        }
        
        switch ($path) {
            case '/tenant-info':
                return $this->getTenantInfo();
                
            case '/menu':
                return $this->getMenu();
                
            case '/categories':
                return $this->getCategories();
                
            case '/orders':
                return $this->handleOrders();
                
            case '/waiter-call':
                return $this->handleWaiterCall();
                
            case '/table-info':
                return $this->getTableInfo();
                
            case '/table-menu':
                return $this->getTableMenu();
                
            case '/table-orders':
                return $this->getTableOrders();
                
            case '/order-status':
                if ($_SERVER['REQUEST_METHOD'] === 'GET') {
                    return $this->getOrderStatus();
                } elseif ($_SERVER['REQUEST_METHOD'] === 'POST') {
                    return $this->updateOrderStatus();
                }
                break;

            case '/theme-settings':
                return $this->getThemeSettings();
                

            case '/settings':
                return $this->getSettings();
            case '/images':
                return $this->serveImages();
                
            default:
                http_response_code(404);
                return ['error' => 'Endpoint not found'];
        }
    }
    
    private function getTenantInfo() {
        if (!$this->tenantInfo) {
            return ['error' => 'Tenant not found'];
        }
        
        return [
            'success' => true,
            'data' => [
                'tenant_id' => $this->tenantInfo['id'],
                'name' => $this->tenantInfo['name'],
                'domain' => $this->tenantInfo['domain'],
                'database' => $this->tenantInfo['database'],
                'frontend_url' => 'http://' . $this->tenantInfo['domain'],
                'table_url_pattern' => 'http://' . $this->tenantInfo['domain'] . '/menu/table-{table_id}'
            ]
        ];
    }
    
    private function getMenu() {
        $hasFrontendVisible = $this->hasColumn('ti_categories', 'frontend_visible');
        // Include all categories by default; only exclude those explicitly set to hidden (0)
        $visibilityWhere = $hasFrontendVisible ? 'AND (c.frontend_visible != 0 OR c.frontend_visible IS NULL)' : '';
        $selectDisk = $this->hasColumn('ti_media_attachments', 'disk_name') ? ', ma.disk_name as image_disk' : ', NULL as image_disk';
        $hasSortOrder = $this->hasColumn('ti_menu_categories', 'priority') || $this->hasColumn('ti_menus', 'sort_order');
        $orderMenus = $this->hasColumn('ti_menus', 'sort_order') ? 'm.sort_order ASC,' : '';
        $query = "
            SELECT 
                m.menu_id as id,
                m.menu_name as name,
                m.menu_description as description,
                CAST(m.menu_price AS DECIMAL(10,2)) as price,
                COALESCE(c.name, 'Main') as category_name,
                COALESCE(ma.name, '/images/pasta.png') as image
                $selectDisk
            FROM ti_menus m
            LEFT JOIN ti_menu_categories mc ON m.menu_id = mc.menu_id
            LEFT JOIN ti_categories c ON mc.category_id = c.category_id
            LEFT JOIN ti_media_attachments ma ON ma.attachment_type = 'menus' 
                AND ma.attachment_id = m.menu_id 
                AND (ma.tag = 'thumb' OR ma.tag IS NULL)
            WHERE m.menu_status = 1
            $visibilityWhere
            ORDER BY $orderMenus c.name, m.menu_name
        ";
        
        $stmt = $this->pdo->query($query);
        $items = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        // Convert prices to float and fix image URLs
        foreach ($items as &$item) {
            $item['price'] = (float)$item['price'];
            $base = $this->getBaseUrl();
            $resolved = '';
            // Prefer resolving by disk name when available (original file)
            if (!empty($item['image_disk']) && strlen($item['image_disk']) >= 9) {
                $disk = $item['image_disk'];
                $p1 = substr($disk, 0, 3);
                $p2 = substr($disk, 3, 3);
                $p3 = substr($disk, 6, 3);
                $dirPath = __DIR__ . "/assets/media/attachments/public/{$p1}/{$p2}/{$p3}/";
                $relBase = "{$p1}/{$p2}/{$p3}/"; // relative to attachments/public
                $extensions = ['webp','jpg','jpeg','png'];
                foreach ($extensions as $ext) {
                    $candidate = $dirPath . $disk . '.' . $ext;
                    if (file_exists($candidate)) {
                        $resolved = $relBase . $disk . '.' . $ext;
                        break;
                    }
                }
            }
            if ($resolved !== '') {
                // Point directly to /assets path; Next.js rewrites proxy to PHP static dir
                $item['image'] = "/assets/media/attachments/public/" . $resolved;
            } else {
                // If we already have an image path from DB that's not the default, pass it through the image server
                if (!empty($item['image']) && $item['image'] !== '/images/pasta.png') {
                    $basename = basename($item['image']);
                    // Try to locate by basename within hashed 3-level structure
                    $matches = glob(__DIR__ . '/assets/media/attachments/public/*/*/*/' . $basename);
                    if (!empty($matches)) {
                        $first = $matches[0];
                        $prefix = rtrim(__DIR__ . '/assets/media/attachments/public/', '/');
                        $relative = ltrim(str_replace($prefix, '', $first), '/');
                        $item['image'] = "/assets/media/attachments/public/" . $relative;
                    } else {
                        // Fallback to default
                        $item['image'] = '/images/pasta.png';
                    }
                } else {
                    // Ensure a consistent default image
                    $item['image'] = '/images/pasta.png';
                }
            }
            if (isset($item['image_disk'])) unset($item['image_disk']);
        }
        
        return [
            'success' => true,
            'data' => $items
        ];
    }
    
    private function getCategories() {
        $hasFrontendVisible = $this->hasColumn('ti_categories', 'frontend_visible');
        $hasPriority = $this->hasColumn('ti_categories', 'priority');
        $selectVisible = $hasFrontendVisible ? ', c.frontend_visible' : '';
        $selectPriority = $hasPriority ? ', c.priority' : ', NULL AS priority';
        // Include all categories by default; only exclude those explicitly set to hidden (0)
        $visibilityWhere = $hasFrontendVisible ? 'AND (c.frontend_visible != 0 OR c.frontend_visible IS NULL)' : '';
        $orderBy = $hasPriority ? 'ORDER BY c.priority ASC, c.name' : 'ORDER BY c.name';
        $query = "
            SELECT 
                c.category_id,
                TRIM(c.name) as category_name,
                c.description
                $selectVisible
                $selectPriority
            FROM ti_categories c
            WHERE c.status = 1 
            $visibilityWhere
            $orderBy
        ";
        
        $stmt = $this->pdo->query($query);
        $categories = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return [
            'success' => true,
            'data' => $categories
        ];
    }
    
    private function handleOrders() {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);
            
            // Add tenant context to order
            $input['tenant_id'] = $this->tenantInfo['id'] ?? null;
            $input['tenant_name'] = $this->tenantInfo['name'] ?? 'Default';
            
            // Insert order into tenant database
            $orderQuery = "
                INSERT INTO ti_orders (
                    first_name, order_total, payment, order_type, 
                    date_added, status_id, tenant_id, tenant_name
                ) VALUES (?, ?, ?, ?, NOW(), 1, ?, ?)
            ";
            
            $stmt = $this->pdo->prepare($orderQuery);
            $result = $stmt->execute([
                $input['first_name'],
                $input['order_total'],
                $input['payment'],
                $input['table_name'],
                $input['tenant_id'],
                $input['tenant_name']
            ]);
            
            if ($result) {
                $orderId = $this->pdo->lastInsertId();
                
                // Insert order items
                foreach ($input['items'] as $item) {
                    $itemQuery = "
                        INSERT INTO ti_order_menus (
                            order_id, menu_id, name, quantity, price
                        ) VALUES (?, ?, ?, ?, ?)
                    ";
                    
                    $itemStmt = $this->pdo->prepare($itemQuery);
                    $itemStmt->execute([
                        $orderId,
                        $item['id'],
                        $item['name'],
                        $item['quantity'],
                        $item['price']
                    ]);
                }
                
                return [
                    'success' => true,
                    'order_id' => $orderId,
                    'message' => 'Order placed successfully'
                ];
            }
        }
        
        return ['error' => 'Failed to place order'];
    }
    
    private function handleWaiterCall() {
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);
            
            $query = "
                INSERT INTO ti_waiter_calls (
                    table_id, table_name, message, status, 
                    tenant_id, tenant_name, created_at
                ) VALUES (?, ?, ?, 'pending', ?, ?, NOW())
            ";
            
            $stmt = $this->pdo->prepare($query);
            $result = $stmt->execute([
                $input['table_id'],
                $input['table_name'],
                $input['message'],
                $this->tenantInfo['id'] ?? null,
                $this->tenantInfo['name'] ?? 'Default'
            ]);
            
            if ($result) {
                return [
                    'success' => true,
                    'message' => 'Waiter called successfully'
                ];
            }
        }
        
        return ['error' => 'Failed to call waiter'];
    }
    
    private function getTableInfo() {
        $tableId = $_GET['table_id'] ?? null;
        $qrCode = $_GET['qr_code'] ?? null;
        
        if (!$tableId && !$qrCode) {
            return ['error' => 'table_id or qr_code is required'];
        }
        
        $whereClause = $tableId ? "table_id = ?" : "qr_code = ?";
        $param = $tableId ?: $qrCode;
        
        $query = "
            SELECT 
                table_id, table_name, qr_code, location_id,
                min_capacity, max_capacity, table_status
            FROM ti_tables 
            WHERE {$whereClause}
        ";
        
        $stmt = $this->pdo->prepare($query);
        $stmt->execute([$param]);
        $table = $stmt->fetch(PDO::FETCH_ASSOC);
        
        if ($table) {
            $table['frontend_url'] = 'http://' . $this->tenantInfo['domain'] . '/menu/table-' . $table['table_id'];
            return ['success' => true, 'data' => $table];
        }
        
        return ['error' => 'Table not found'];
    }
    
    private function getTableMenu() {
        $tableId = $_GET['table_id'] ?? null;
        
        if (!$tableId) {
            return ['error' => 'table_id is required'];
        }
        
        // Get table info
        $tableQuery = "SELECT * FROM ti_tables WHERE table_id = ?";
        $tableStmt = $this->pdo->prepare($tableQuery);
        $tableStmt->execute([$tableId]);
        $tableInfo = $tableStmt->fetch(PDO::FETCH_ASSOC);
        
        if (!$tableInfo) {
            return ['error' => 'Table not found'];
        }
        
        // Get menu items
        $menuItems = $this->getMenu()['data'];
        // Attach normalized category key for robust filtering on client
        foreach ($menuItems as &$mi) {
            $name = trim($mi['category_name'] ?? 'Main');
            $lower = strtolower($name);
            if (in_array($lower, ['starter','starters','appetizer','appetizers'])) $name = 'Appetizer';
            if (in_array($lower, ['mains','main','main course','main courses'])) $name = 'Main Course';
            if (in_array($lower, ['drink','drinks','beverage','beverages'])) $name = 'Drinks';
            if (in_array($lower, ['seafood','seafoods'])) $name = 'Seafoods';
            if (in_array($lower, ['salad','salads'])) $name = 'Salads';
            if (in_array($lower, ['special','specials'])) $name = 'Specials';
            $mi['category_name'] = $name;
        }
        
        // Get categories
        $categories = $this->getCategories()['data'];
        
        return [
            'success' => true,
            'data' => [
                'table' => $tableInfo,
                'menu_items' => $menuItems,
                'categories' => $categories
            ]
        ];
    }
    
    private function getTableOrders() {
        $tableId = $_GET['table_id'] ?? null;
        $tableName = $_GET['table_name'] ?? null;
        
        if (!$tableId && !$tableName) {
            return ['error' => 'table_id or table_name is required'];
        }
        
        $whereClause = $tableId ? "order_type = ?" : "order_type = ?";
        $param = $tableId ? "Table " . $tableId : $tableName;
        
        $query = "
            SELECT 
                order_id, first_name, order_total, payment, order_type,
                date_added, status_id,
                CASE 
                    WHEN status_id = 1 THEN 0
                    WHEN status_id = 3 THEN 1
                    WHEN status_id = 4 THEN 2
                    ELSE 0
                END as customer_status
            FROM ti_orders
            WHERE {$whereClause}
            ORDER BY date_added DESC
            LIMIT 10
        ";
        
        $stmt = $this->pdo->prepare($query);
        $stmt->execute([$param]);
        $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
        
        return ['success' => true, 'data' => $orders];
    }

    private function getOrderStatus() {
        $orderId = $_GET['order_id'] ?? null;
        if (!$orderId) {
            http_response_code(400);
            return ['success' => false, 'error' => 'order_id is required'];
        }
        $stmt = $this->pdo->prepare("SELECT o.status_id, s.status_name FROM ti_orders o LEFT JOIN ti_statuses s ON o.status_id = s.status_id WHERE o.order_id = ?");
        $stmt->execute([$orderId]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if (!$row) {
            return ['success' => false, 'error' => 'Order not found'];
        }
        $statusId = (int)($row['status_id'] ?? 1);
        // Map DB status to frontend customer_status (0=kitchen,1=preparing,2=on way)
        $customerStatus = 0;
        if ($statusId === 3) $customerStatus = 1;
        if ($statusId === 4) $customerStatus = 2;
        $statusMessage = $statusId === 1 ? 'Order Sent to Kitchen' : ($statusId === 3 ? 'Chef is Preparing Your Meal' : ($statusId === 4 ? 'On Its Way to Your Table!' : 'Order Received'));
        return [
            'success' => true,
            'data' => [
                'status_id' => $statusId,
                'status_name' => $row['status_name'] ?? '',
                'status_message' => $statusMessage,
                'customer_status' => $customerStatus,
            ]
        ];
    }

    private function updateOrderStatus() {
        $input = json_decode(file_get_contents('php://input'), true) ?: [];
        $orderId = $input['order_id'] ?? null;
        $statusId = $input['status_id'] ?? null;
        if (!$orderId || !$statusId) {
            http_response_code(400);
            return ['success' => false, 'error' => 'order_id and status_id are required'];
        }
        $stmt = $this->pdo->prepare("UPDATE ti_orders SET status_id = ? WHERE order_id = ?");
        $ok = $stmt->execute([$statusId, $orderId]);
        return ['success' => (bool)$ok];
    }
    
    
    
    private function getThemeSettings() {
        try {
            $query = "
                SELECT item, value
                FROM ti_settings
                WHERE item LIKE 'site_%'
                   OR item LIKE 'theme_%'
                   OR item LIKE '%theme%'
                   OR item LIKE '%color%'
                   OR item IN (
                        'restaurant_name',
                        'business_name',
                        'frontend_theme',
                        'admin_theme',
                        'dashboard_theme',
                        'dashboard_logo',
                        'dashboard_favicon'
                   )
            ";
            $stmt = $this->pdo->prepare($query);
            $stmt->execute();
            $settings = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $map = [];
            foreach ($settings as $setting) {
                $map[$setting['item']] = $setting['value'];
            }

            $frontendTheme =
                $map['theme_frontend_theme'] ??
                $map['frontend_theme'] ??
                $map['dashboard_theme'] ??
                $map['theme_name'] ??
                $map['theme_theme'] ??
                $map['site_theme'] ??
                $map['theme_slug'] ??
                'clean-light';

            $adminTheme =
                $map['theme_admin_theme'] ??
                $map['admin_theme'] ??
                'dark';

            $primary =
                $map['theme_primary_color'] ??
                $map['theme_primary'] ??
                $map['site_primary_color'] ??
                '#E7CBA9';

            $secondary =
                $map['theme_secondary_color'] ??
                $map['theme_secondary'] ??
                $map['site_secondary_color'] ??
                '#EFC7B1';

            $accent =
                $map['theme_accent_color'] ??
                $map['theme_accent'] ??
                '#3B3B3B';

            $background =
                $map['theme_background_color'] ??
                $map['theme_background'] ??
                '#FAFAFA';

            return [
                'success' => true,
                'admin_theme' => $adminTheme,
                'frontend_theme' => $frontendTheme,
                'data' => [
                    'restaurant_name' => $map['restaurant_name'] ?? $map['business_name'] ?? $map['site_name'] ?? ($this->tenantInfo['name'] ?? 'Restaurant'),
                    'table_number' => $map['site_table_number'] ?? '01',
                    'theme_colors' => [
                        'primary' => $primary,
                        'secondary' => $secondary,
                        'accent' => $accent,
                        'background' => $background,
                    ],
                ],
                'debug_theme_source' => [
                    'theme_frontend_theme' => $map['theme_frontend_theme'] ?? null,
                    'frontend_theme' => $map['frontend_theme'] ?? null,
                    'dashboard_theme' => $map['dashboard_theme'] ?? null,
                    'theme_name' => $map['theme_name'] ?? null,
                    'site_theme' => $map['site_theme'] ?? null,
                    'theme_slug' => $map['theme_slug'] ?? null,
                ]
            ];
        } catch (Exception $e) {
            return [
                'success' => false,
                'error' => 'Failed to load theme settings',
                'message' => $e->getMessage()
            ];
        }
    }



    // Get merchant/payment settings from tenant database
    
    
    private function getSettings() {
        try {
            $stmt = $this->pdo->prepare("
                SELECT item, value
                FROM ti_settings
                WHERE item LIKE 'paypal_%'
                   OR item LIKE 'stripe_%'
                   OR item LIKE 'payment_%'
                   OR item LIKE 'site_%'
                   OR item LIKE 'theme_%'
                   OR item LIKE '%logo%'
                   OR item LIKE '%favicon%'
                   OR item IN (
                        'restaurant_name',
                        'business_name',
                        'businessName',
                        'dashboard_logo',
                        'dashboard_favicon',
                        'default_currency'
                   )
            ");
            $stmt->execute();
            $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $map = [];
            foreach ($rows as $r) {
                $map[$r['item']] = $r['value'];
            }

            $siteLogo =
                $map['site_logo'] ??
                $map['dashboard_logo'] ??
                $map['site_image'] ??
                $map['site_header_logo'] ??
                $map['theme_logo'] ??
                null;

            $faviconLogo =
                $map['favicon_logo'] ??
                $map['dashboard_favicon'] ??
                $map['site_favicon'] ??
                $map['theme_favicon'] ??
                null;

            $out = [
                'businessName' => $map['business_name'] ?? $map['businessName'] ?? $map['restaurant_name'] ?? $map['site_name'] ?? ($this->tenantInfo['name'] ?? 'PayMyDine Restaurant'),
                'accountId' => '',
                'stripeSecretKey' => $map['stripe_secret_key'] ?? $map['stripe_secret'] ?? '',
                'stripePublishableKey' => $map['stripe_publishable_key'] ?? $map['stripe_publishable'] ?? '',
                'paypalClientId' => $map['paypal_client_id'] ?? $map['paypalClientId'] ?? '',
                'site_name' => $map['site_name'] ?? $map['restaurant_name'] ?? $map['business_name'] ?? ($this->tenantInfo['name'] ?? 'Restaurant'),
                'site_logo' => $siteLogo,
                'favicon_logo' => $faviconLogo,
                'default_currency' => $map['default_currency'] ?? '',
            ];

            return array_merge(['success' => true, 'data' => $out], $out);
        } catch (Exception $e) {
            return ['success' => false, 'error' => 'Failed to load settings', 'message' => $e->getMessage()];
        }
    }



    
    
    
    private function serveImages() {
        $filename = $_GET['file'] ?? '';
        if (empty($filename)) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Missing file parameter']);
            return;
        }

        $raw = trim($filename);
        $raw = strtok($raw, '?');

        // allow encoded values
        $rawDecoded = urldecode($raw);

        // normalize + protect
        $sanitized = ltrim($rawDecoded, '/');
        $sanitized = str_replace(["..\\", "../", ".."], '', $sanitized);

        $projectRoot = __DIR__ . '/';
        $attachmentsRoot = __DIR__ . '/assets/media/attachments/public/';
        $uploadsRoot = __DIR__ . '/assets/media/uploads/';

        $candidates = [];

        // 1) direct absolute-like project file (/images.png)
        $candidates[] = $projectRoot . $sanitized;

        // 2) storage/temp/public/... direct path under project
        $candidates[] = $projectRoot . $sanitized;

        // IMPORTANT: real media uploads folder
        $candidates[] = $uploadsRoot . $sanitized;
        $candidates[] = $uploadsRoot . basename($sanitized);

        // 3) direct attachments path
        $publicPrefix = 'assets/media/attachments/public/';
        $rel = $sanitized;
        if (strpos($rel, $publicPrefix) === 0) {
            $rel = substr($rel, strlen($publicPrefix));
        }
        $candidates[] = $attachmentsRoot . $rel;

        // 4) hashed attachment folders by basename
        if (basename($rel) === $rel) {
            $matches = glob($attachmentsRoot . '*/*/*/' . $rel);
            if (!empty($matches)) {
                foreach ($matches as $m) $candidates[] = $m;
            }
        }

        // 5) common public folders
        $candidates[] = $projectRoot . 'public/' . $sanitized;
        $candidates[] = $projectRoot . 'frontend/public/' . $sanitized;

        // 6) recursive search inside uploads root by basename
        if (is_dir($uploadsRoot)) {
            try {
                $it = new RecursiveIteratorIterator(
                    new RecursiveDirectoryIterator($uploadsRoot, RecursiveDirectoryIterator::SKIP_DOTS)
                );
                foreach ($it as $file) {
                    if ($file->isFile() && $file->getFilename() === basename($sanitized)) {
                        $candidates[] = $file->getPathname();
                    }
                }
            } catch (Throwable $e) {
                // ignore and continue
            }
        }

        foreach ($candidates as $imagePath) {
            if ($imagePath && is_file($imagePath)) {
                $mimeType = @mime_content_type($imagePath) ?: 'application/octet-stream';
                header('Content-Type: ' . $mimeType);
                header('Cache-Control: public, max-age=3600');
                header('Content-Length: ' . filesize($imagePath));
                readfile($imagePath);
                return;
            }
        }

        $fallbacks = [
            __DIR__ . '/images/pasta.png',
            __DIR__ . '/frontend/public/images/logo.png',
            __DIR__ . '/frontend/public/logo.png',
        ];

        foreach ($fallbacks as $fallbackPath) {
            if (is_file($fallbackPath)) {
                $mimeType = @mime_content_type($fallbackPath) ?: 'image/png';
                header('Content-Type: ' . $mimeType);
                header('Cache-Control: public, max-age=3600');
                header('Content-Length: ' . filesize($fallbackPath));
                readfile($fallbackPath);
                return;
            }
        }

        http_response_code(404);
        echo json_encode([
            'success' => false,
            'error' => 'Image not found',
            'requested' => $rawDecoded,
            'normalized' => $sanitized,
        ]);
    }


}

// Initialize and handle request
$api = new MultiTenantApiServer();
$response = $api->handleRequest();

if (is_array($response)) {
    echo json_encode($response);
}
?> 