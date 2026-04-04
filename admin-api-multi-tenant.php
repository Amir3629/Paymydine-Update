<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

class MultiTenantAdminApi {
    private $pdo;
    private $tenantInfo;
    private $mainDb;
    
    public function __construct() {
        // Connect to main database first
        $this->mainDb = new PDO('mysql:host=127.0.0.1;dbname=taste', 'root', 'password');
        $this->mainDb->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        
        // Detect tenant and connect to tenant database
        $this->detectTenant();
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
                    'mysql:host=127.0.0.1;dbname=' . $this->tenantInfo['database'], 
                    'root', 
                    ''
                );
                $this->pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            } else {
                // Tenant not found, use default connection
                $this->pdo = $this->mainDb;
            }
        } else {
            // No subdomain, use default database
            $this->pdo = $this->mainDb;
        }
    }
    
    private function extractSubdomain() {
        // Try multiple ways to get the host
        $host = $_SERVER['HTTP_HOST'] ?? $_SERVER['SERVER_NAME'] ?? '';
        
        // For testing, allow manual tenant specification
        if (isset($_GET['tenant'])) {
            return $_GET['tenant'];
        }
        
        $parts = explode('.', $host);
        
        // Extract subdomain (e.g., "paris" from "paris.localhost")
        if (count($parts) >= 2) {
            return $parts[0];
        }
        
        return null;
    }
    
    public function handleRequest() {
        $path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
        $path = str_replace('/admin-api-multi-tenant.php', '', $path);
        
        switch ($path) {
            case '/admin/orders':
                return $this->getOrders();
                
            case '/admin/orders/stats':
                return $this->getOrderStats();
                
            case '/admin/tables':
                return $this->getTables();
                
            case '/admin/menu':
                return $this->getMenu();
                
            case '/admin/waiter-calls':
                return $this->getWaiterCalls();
                
            case '/admin/tenant-info':
                return $this->getTenantInfo();
                
            case '/':
                return $this->getApiInfo();
                
            default:
                http_response_code(404);
                return ['error' => 'Endpoint not found', 'path' => $path];
        }
    }
    
    private function getApiInfo() {
        return [
            'success' => true,
            'message' => 'Multi-Tenant Admin API',
            'endpoints' => [
                '/admin/tenant-info',
                '/admin/orders',
                '/admin/tables',
                '/admin/menu',
                '/admin/waiter-calls'
            ],
            'usage' => 'Add ?tenant=paris to URL for testing'
        ];
    }
    
    private function getTenantInfo() {
        if (!$this->tenantInfo) {
            return ['error' => 'Tenant not found', 'available_tenants' => $this->getAvailableTenants()];
        }
        
        return [
            'success' => true,
            'data' => [
                'tenant_id' => $this->tenantInfo['id'],
                'name' => $this->tenantInfo['name'],
                'domain' => $this->tenantInfo['domain'],
                'database' => $this->tenantInfo['database'],
                'admin_url' => 'http://' . $this->tenantInfo['domain'] . ':8000/admin/'
            ]
        ];
    }
    
    private function getAvailableTenants() {
        $stmt = $this->mainDb->query("SELECT name, domain, database FROM ti_tenants WHERE status = 'active'");
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }
    
    private function getOrders() {
        // Check if the table exists and get correct column names
        try {
            $columns = $this->pdo->query("DESCRIBE ti_orders")->fetchAll(PDO::FETCH_COLUMN);
            
            // Use correct column names based on what exists
            $dateColumn = in_array('date_added', $columns) ? 'date_added' : 'created_at';
            $statusColumn = in_array('status_id', $columns) ? 'status_id' : 'status';
            
            $query = "
                SELECT 
                    o.order_id,
                    o.first_name,
                    o.order_total,
                    o.payment,
                    o.order_type,
                    o.{$dateColumn},
                    o.{$statusColumn},
                    COUNT(om.order_id) as item_count
                FROM ti_orders o
                LEFT JOIN ti_order_menus om ON o.order_id = om.order_id
                GROUP BY o.order_id
                ORDER BY o.{$dateColumn} DESC
                LIMIT 50
            ";
            
            $stmt = $this->pdo->query($query);
            $orders = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'data' => $orders,
                'tenant' => $this->tenantInfo['name'] ?? 'Default',
                'total_orders' => count($orders)
            ];
            
        } catch (Exception $e) {
            return [
                'error' => 'Database error: ' . $e->getMessage(),
                'tenant' => $this->tenantInfo['name'] ?? 'Default'
            ];
        }
    }
    
    private function getOrderStats() {
        try {
            $columns = $this->pdo->query("DESCRIBE ti_orders")->fetchAll(PDO::FETCH_COLUMN);
            $statusColumn = in_array('status_id', $columns) ? 'status_id' : 'status';
            
            $query = "
                SELECT 
                    COUNT(*) as total_orders,
                    SUM(order_total) as total_revenue,
                    COUNT(CASE WHEN {$statusColumn} = 1 THEN 1 END) as pending_orders,
                    COUNT(CASE WHEN {$statusColumn} = 3 THEN 1 END) as preparing_orders,
                    COUNT(CASE WHEN {$statusColumn} = 4 THEN 1 END) as completed_orders
                FROM ti_orders
            ";
            
            $stmt = $this->pdo->query($query);
            $stats = $stmt->fetch(PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'data' => $stats,
                'tenant' => $this->tenantInfo['name'] ?? 'Default'
            ];
            
        } catch (Exception $e) {
            return [
                'error' => 'Database error: ' . $e->getMessage(),
                'tenant' => $this->tenantInfo['name'] ?? 'Default'
            ];
        }
    }
    
    private function getTables() {
        try {
            $columns = $this->pdo->query("DESCRIBE ti_tables")->fetchAll(PDO::FETCH_COLUMN);
            
            // Build query based on available columns
            $selectFields = ['table_id', 'table_name'];
            if (in_array('qr_code', $columns)) $selectFields[] = 'qr_code';
            if (in_array('min_capacity', $columns)) $selectFields[] = 'min_capacity';
            if (in_array('max_capacity', $columns)) $selectFields[] = 'max_capacity';
            if (in_array('table_status', $columns)) $selectFields[] = 'table_status';
            
            $fields = implode(', ', $selectFields);
            
            $query = "SELECT {$fields} FROM ti_tables ORDER BY table_id";
            
            $stmt = $this->pdo->query($query);
            $tables = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'data' => $tables,
                'tenant' => $this->tenantInfo['name'] ?? 'Default',
                'total_tables' => count($tables)
            ];
            
        } catch (Exception $e) {
            return [
                'error' => 'Database error: ' . $e->getMessage(),
                'tenant' => $this->tenantInfo['name'] ?? 'Default'
            ];
        }
    }
    
    private function getMenu() {
        try {
            $query = "
                SELECT 
                    m.menu_id,
                    m.menu_name,
                    m.menu_description,
                    m.menu_price,
                    m.menu_status
                FROM ti_menus m
                ORDER BY m.menu_name
            ";
            
            $stmt = $this->pdo->query($query);
            $menu = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'data' => $menu,
                'tenant' => $this->tenantInfo['name'] ?? 'Default',
                'total_items' => count($menu)
            ];
            
        } catch (Exception $e) {
            return [
                'error' => 'Database error: ' . $e->getMessage(),
                'tenant' => $this->tenantInfo['name'] ?? 'Default'
            ];
        }
    }
    
    private function getWaiterCalls() {
        try {
            // Check if waiter_calls table exists
            $tables = $this->pdo->query("SHOW TABLES LIKE 'ti_waiter_calls'")->fetchAll();
            
            if (empty($tables)) {
                return [
                    'success' => true,
                    'data' => [],
                    'message' => 'No waiter calls table found',
                    'tenant' => $this->tenantInfo['name'] ?? 'Default'
                ];
            }
            
            $query = "
                SELECT 
                    id,
                    table_id,
                    table_name,
                    message,
                    status,
                    created_at
                FROM ti_waiter_calls
                ORDER BY created_at DESC
                LIMIT 20
            ";
            
            $stmt = $this->pdo->query($query);
            $calls = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            return [
                'success' => true,
                'data' => $calls,
                'tenant' => $this->tenantInfo['name'] ?? 'Default'
            ];
            
        } catch (Exception $e) {
            return [
                'error' => 'Database error: ' . $e->getMessage(),
                'tenant' => $this->tenantInfo['name'] ?? 'Default'
            ];
        }
    }
}

// Initialize and handle request
$api = new MultiTenantAdminApi();
$response = $api->handleRequest();

if (is_array($response)) {
    echo json_encode($response);
}
?> 