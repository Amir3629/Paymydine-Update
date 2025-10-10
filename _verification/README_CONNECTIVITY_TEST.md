## Tenant Database Connectivity Testing Guide

### Prerequisites

#### 1. Add Host Entries

Add these to `/etc/hosts` (Mac/Linux) or `C:\Windows\System32\drivers\etc\hosts` (Windows):

```
127.0.0.1  amir.paymydine.com
127.0.0.1  rosana.paymydine.com
```

#### 2. Verify Tenants Exist in Database

Run the SQL query to check tenant configuration:

```bash
mysql -u paymydine -p paymydine < _verification/check_tenants.sql
```

**Expected Output:**
```
+----+----------------------+------------+---------------+--------------+--------+
| id | domain               | database   | db_host       | db_username  | status |
+----+----------------------+------------+---------------+--------------+--------+
|  1 | amir.paymydine.com   | amir_db    | 127.0.0.1     | paymydine    | active |
|  2 | rosana.paymydine.com | rosana_db  | 127.0.0.1     | paymydine    | active |
+----+----------------------+------------+---------------+--------------+--------+
```

**If tenants don't exist:** You'll need to create them in the `paymydine.ti_tenants` table first.

#### 3. Verify Tenant Databases Exist

```bash
# Check if tenant databases exist
mysql -u paymydine -p -e "SHOW DATABASES LIKE '%amir%'"
mysql -u paymydine -p -e "SHOW DATABASES LIKE '%rosana%'"

# Expected: amir_db, rosana_db (or similar)
```

---

### Testing Procedure

#### Test 1: Tenant A (Amir) - Menu Request

```bash
curl -H "Host: amir.paymydine.com" http://127.0.0.1:8000/api/v1/menu
```

**Expected Response:**
```json
{
  "success": true,
  "data": {
    "items": [ ... ],
    "categories": [ ... ]
  }
}
```

**Expected in Logs (storage/logs/laravel.log):**
```
[Tenant] Resolved tenant {"subdomain":"amir","domain":"amir.paymydine.com","database":"amir_db","db_host":"127.0.0.1","db_username":"paymydine"}
[Tenant] Connected OK {"database":"amir_db","pdo_connected":true}
Switched to tenant database: amir_db for subdomain: amir
```

#### Test 2: Tenant B (Rosana) - Menu Request

```bash
curl -H "Host: rosana.paymydine.com" http://127.0.0.1:8000/api/v1/menu
```

**Expected in Logs:**
```
[Tenant] Resolved tenant {"subdomain":"rosana","domain":"rosana.paymydine.com","database":"rosana_db","db_host":"127.0.0.1","db_username":"paymydine"}
[Tenant] Connected OK {"database":"rosana_db","pdo_connected":true}
Switched to tenant database: rosana_db for subdomain: rosana
```

#### Test 3: Verify Different Data

```bash
# Get menu counts
curl -s -H "Host: amir.paymydine.com" http://127.0.0.1:8000/api/v1/menu | jq '.data.items | length'
# Expected: Some number (e.g., 5)

curl -s -H "Host: rosana.paymydine.com" http://127.0.0.1:8000/api/v1/menu | jq '.data.items | length'
# Expected: Different number (e.g., 8)
```

**If both return the same count:** Tenant isolation may still be broken.

---

### Log Monitoring

Watch logs in real-time while testing:

```bash
# In one terminal
tail -f storage/logs/laravel.log

# In another terminal, run curl tests
```

**Look for:**
- ✅ `[Tenant] Resolved tenant` - Shows tenant was found
- ✅ `[Tenant] Connected OK` - Shows DB connection succeeded
- ✅ `Switched to tenant database` - Shows default connection switched
- ❌ `[Tenant] Connection FAIL` - Shows connection error (need to fix credentials)
- ❌ `No tenant found for subdomain` - Tenant record missing in ti_tenants

---

### Troubleshooting

#### Error: "Tenant not found"

**Response:**
```json
{
  "error": "Tenant not found",
  "message": "The requested restaurant domain was not found."
}
```

**Solution:**
1. Check tenant exists: Run `_verification/check_tenants.sql`
2. Verify domain format matches: Should be `amir.paymydine.com` or `amir`
3. Check subdomain extraction logic in DetectTenant.php

#### Error: "Unable to connect to tenant database"

**Response:**
```json
{
  "error": "Database Error",
  "message": "Unable to connect to tenant database.",
  "details": "SQLSTATE[HY000] [1045] Access denied..."
}
```

**Check Logs:**
```bash
tail -100 storage/logs/laravel.log | grep "\[Tenant\] Connection FAIL"
```

**Common Issues:**
1. Database doesn't exist: `CREATE DATABASE amir_db;`
2. Wrong credentials: Check ti_tenants.db_user and db_pass columns
3. Wrong host: Check ti_tenants.db_host column
4. Permissions: `GRANT ALL ON amir_db.* TO 'paymydine'@'localhost';`

---

### Success Criteria

After running both curl commands, verify:

✅ **Both requests return 200 OK** (not 404 or 500)  
✅ **Different data per subdomain** (item counts differ)  
✅ **Logs show "Connected OK"** for each tenant  
✅ **Logs show correct database name** per subdomain  
✅ **No "Connection FAIL" errors** in logs

---

### Database Connectivity Verification

```bash
# After successful API tests, verify orders/data goes to correct DB:

# Create test order in Tenant A
curl -X POST -H "Host: amir.paymydine.com" -H "Content-Type: application/json" \
  http://127.0.0.1:8000/api/v1/orders \
  -d '{"customer_name":"Connectivity Test","items":[{"menu_id":1,"name":"Test","quantity":1,"price":1}],"total_amount":1,"payment_method":"cash","table_id":"1","table_name":"Table 1"}'

# Check it's in amir_db
mysql -u paymydine -p -e "SELECT order_id, first_name FROM amir_db.ti_orders WHERE first_name='Connectivity Test'"
# Should show: the test order

# Check it's NOT in rosana_db
mysql -u paymydine -p -e "SELECT order_id, first_name FROM rosana_db.ti_orders WHERE first_name='Connectivity Test'"
# Should show: Empty set

# Check it's NOT in central DB
mysql -u paymydine -p -e "SELECT order_id, first_name FROM paymydine.ti_orders WHERE first_name='Connectivity Test'"
# Should show: Empty set
```

---

### Expected Tenant Connection Config

The middleware constructs this config array at runtime:

```php
$tenantConfig = [
    'driver' => 'mysql',
    'database' => 'amir_db',        // From ti_tenants.database
    'host' => '127.0.0.1',          // From ti_tenants.db_host or env
    'port' => '3306',               // From ti_tenants.db_port or env
    'username' => 'paymydine',      // From ti_tenants.db_user or env
    'password' => '***',            // From ti_tenants.db_pass or env (redacted)
    'charset' => 'utf8mb4',
    'collation' => 'utf8mb4_unicode_ci',
    'prefix' => 'ti_',
    'strict' => false,
];
```

**All values come from the tenant record in ti_tenants table, with env() fallbacks.**

---

### Next Steps After Verification

1. If tests pass: Remove diagnostic logging (or reduce to errors only)
2. If tests fail: Review logs, fix credentials/database setup
3. Deploy to staging with logging enabled
4. Test in staging with real subdomains
5. Deploy to production after staging verification

