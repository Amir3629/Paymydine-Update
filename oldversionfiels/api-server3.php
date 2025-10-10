<?php
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');
header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

class FrontendIntegrationApi {
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
            // No subdomain, use default connection
            $this->pdo = $this->mainDb;
        }
    }
    
    private function extractSubdomain() {
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
        $path = str_replace('/api-server3.php', '', $path);
        
        switch ($path) {
            case '/frontend/redirect':
                return $this->handleFrontendRedirect();
                
            case '/frontend/tenant-info':
                return $this->getTenantInfo();
                
            case '/frontend/config':
                return $this->getFrontendConfig();
                
            case '/frontend/check':
                return $this->checkFrontendStatus();
                
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
            'message' => 'Frontend Integration API',
            'endpoints' => [
                '/frontend/redirect',
                '/frontend/tenant-info', 
                '/frontend/config',
                '/frontend/check'
            ],
            'usage' => 'Add ?tenant=paris to URL for testing'
        ];
    }
    
    private function handleFrontendRedirect() {
        if (!$this->tenantInfo) {
            return [
                'error' => 'Tenant not found',
                'message' => 'No tenant detected from subdomain'
            ];
        }
        
        $tenant = $this->tenantInfo['name'];
        $domain = $this->tenantInfo['domain'];
        
        // Determine frontend URL based on environment
        $isLocalhost = strpos($domain, 'localhost') !== false;
        
        if ($isLocalhost) {
            $frontendUrl = "http://{$tenant}.localhost:3000/";
        } else {
            $frontendUrl = "https://{$domain}/";
        }
        
        return [
            'success' => true,
            'redirect' => true,
            'frontend_url' => $frontendUrl,
            'tenant' => $tenant,
            'domain' => $domain,
            'message' => "Redirecting to {$tenant} frontend"
        ];
    }
    
    private function getTenantInfo() {
        if (!$this->tenantInfo) {
            return [
                'error' => 'Tenant not found',
                'available_tenants' => $this->getAvailableTenants()
            ];
        }
        
        return [
            'success' => true,
            'data' => [
                'tenant_id' => $this->tenantInfo['id'],
                'name' => $this->tenantInfo['name'],
                'domain' => $this->tenantInfo['domain'],
                'database' => $this->tenantInfo['database'],
                'frontend_url' => $this->getFrontendUrl(),
                'admin_url' => $this->getAdminUrl()
            ]
        ];
    }
    
    private function getFrontendConfig() {
        if (!$this->tenantInfo) {
            return ['error' => 'Tenant not found'];
        }
        
        $tenant = $this->tenantInfo['name'];
        $domain = $this->tenantInfo['domain'];
        $isLocalhost = strpos($domain, 'localhost') !== false;
        
        return [
            'success' => true,
            'config' => [
                'tenant' => $tenant,
                'domain' => $domain,
                'api_url' => $isLocalhost ? 'http://localhost:8001' : "https://{$domain}/api",
                'frontend_url' => $this->getFrontendUrl(),
                'admin_url' => $this->getAdminUrl(),
                'environment' => $isLocalhost ? 'development' : 'production'
            ]
        ];
    }
    
    private function checkFrontendStatus() {
        if (!$this->tenantInfo) {
            return ['error' => 'Tenant not found'];
        }
        
        $frontendUrl = $this->getFrontendUrl();
        
        // Check if frontend is accessible
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $frontendUrl);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        curl_setopt($ch, CURLOPT_NOBODY, true);
        curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        return [
            'success' => true,
            'status' => [
                'frontend_url' => $frontendUrl,
                'accessible' => $httpCode === 200,
                'http_code' => $httpCode,
                'tenant' => $this->tenantInfo['name']
            ]
        ];
    }
    
    private function getFrontendUrl() {
        $tenant = $this->tenantInfo['name'];
        $domain = $this->tenantInfo['domain'];
        $isLocalhost = strpos($domain, 'localhost') !== false;
        
        if ($isLocalhost) {
            return "http://{$tenant}.localhost:3000/";
        } else {
            return "https://{$domain}/";
        }
    }
    
    private function getAdminUrl() {
        $tenant = $this->tenantInfo['name'];
        $domain = $this->tenantInfo['domain'];
        $isLocalhost = strpos($domain, 'localhost') !== false;
        
        if ($isLocalhost) {
            return "http://{$tenant}.localhost:8000/admin/";
        } else {
            return "https://{$domain}/admin/";
        }
    }
    
    private function getAvailableTenants() {
        try {
            // Check if ti_tenants table exists
            $stmt = $this->mainDb->query("SHOW TABLES LIKE 'ti_tenants'");
            if ($stmt->rowCount() == 0) {
                // Table doesn't exist, return default tenant
                return [
                    [
                        'name' => 'Default',
                        'domain' => 'localhost',
                        'database' => 'paymydine'
                    ]
                ];
            }
            
            $stmt = $this->mainDb->query("try { $stmt = $this->mainDb->query("SHOW TABLES LIKE 'ti_tenants'"); if ($stmt->rowCount() == 0) { return [["name" => "Default", "domain" => "localhost", "database" => "paymydine"]]; } $stmt = $this->mainDb->query("SELECT name, domain, database FROM ti_tenants WHERE status = 'active'"); return $stmt->fetchAll(PDO::FETCH_ASSOC); } catch (Exception $e) { return [["name" => "Default", "domain" => "localhost", "database" => "paymydine"]]; }");
            return $stmt->fetchAll(PDO::FETCH_ASSOC);
        } catch (Exception $e) {
            // Return default tenant if query fails
            return [
                [
                    'name' => 'Default',
                    'domain' => 'localhost',
                    'database' => 'paymydine'
                ]
            ];
        }
    }
}

// Initialize and handle request
$api = new FrontendIntegrationApi();
$response = $api->handleRequest();

if (is_array($response)) {
    echo json_encode($response);
}
?> 