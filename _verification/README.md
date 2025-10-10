## Manual Tenant Isolation Testing Guide

### Setup

Add these entries to `/etc/hosts` (or `C:\Windows\System32\drivers\etc\hosts` on Windows):

```
127.0.0.1  amir.paymydine.com
127.0.0.1  rosana.paymydine.com
```

### Test 1: Menu Isolation

Test that each tenant sees ONLY their own menu:

```bash
# Tenant A (Amir)
curl -H "Host: amir.paymydine.com" http://127.0.0.1:8000/api/v1/menu | jq '.data.items | length'

# Tenant B (Rosana)
curl -H "Host: rosana.paymydine.com" http://127.0.0.1:8000/api/v1/menu | jq '.data.items | length'

# Expected: Different numbers (each tenant has different menus)
# Before fix: Both would return same number (same data) ❌
# After fix: Different numbers (isolated data) ✅
```

### Test 2: Menu Content Isolation

```bash
# Check first menu item name from each tenant
curl -s -H "Host: amir.paymydine.com" http://127.0.0.1:8000/api/v1/menu | jq '.data.items[0].name'

curl -s -H "Host: rosana.paymydine.com" http://127.0.0.1:8000/api/v1/menu | jq '.data.items[0].name'

# Expected: Different items
# Example: "Amir's Burger" vs "Rosana's Pasta"
```

### Test 3: Order Creation Isolation

```bash
# Create order in Tenant A
curl -X POST \
  -H "Host: amir.paymydine.com" \
  -H "Content-Type: application/json" \
  http://127.0.0.1:8000/api/v1/orders \
  -d '{
    "customer_name": "Test Customer A",
    "items": [{"menu_id": 1, "name": "Test Item", "quantity": 1, "price": 10.00}],
    "total_amount": 10.00,
    "payment_method": "cash",
    "table_id": "1",
    "table_name": "Table 1"
  }' | jq

# Expected: {"success": true, "order_id": NNN}
```

Then verify in database:

```bash
# Check order is in amir_db ONLY
mysql -u paymydine -p -e "SELECT order_id, first_name FROM amir_db.ti_orders ORDER BY order_id DESC LIMIT 1"
# Should show: Test Customer A

# Check it's NOT in rosana_db
mysql -u paymydine -p -e "SELECT order_id, first_name FROM rosana_db.ti_orders WHERE first_name='Test Customer A'"
# Should return: Empty set

# Check it's NOT in central DB
mysql -u paymydine -p -e "SELECT order_id, first_name FROM paymydine.ti_orders WHERE first_name='Test Customer A'"
# Should return: Empty set
```

### Test 4: Waiter Call Isolation

```bash
# Call waiter in Tenant A
curl -X POST \
  -H "Host: amir.paymydine.com" \
  -H "Content-Type: application/json" \
  http://127.0.0.1:8000/api/v1/waiter-call \
  -d '{
    "table_id": "5",
    "message": "Need water please"
  }' | jq

# Check Tenant A's notification count
curl -s -H "Host: amir.paymydine.com" http://127.0.0.1:8000/admin/notifications-api/count | jq

# Check Tenant B's notification count
curl -s -H "Host: rosana.paymydine.com" http://127.0.0.1:8000/admin/notifications-api/count | jq

# Expected:
# - Tenant A count increases
# - Tenant B count stays same (no cross-tenant leak)
```

### Test 5: Table Info Isolation

```bash
# Get table info from Tenant A
curl -s -H "Host: amir.paymydine.com" "http://127.0.0.1:8000/api/v1/table-info?table_id=1" | jq

# Get table info from Tenant B  
curl -s -H "Host: rosana.paymydine.com" "http://127.0.0.1:8000/api/v1/table-info?table_id=1" | jq

# Expected: Different table data (or 404 if table doesn't exist in that tenant)
```

### Test 6: Settings Isolation

```bash
# Tenant A settings
curl -s -H "Host: amir.paymydine.com" http://127.0.0.1:8000/api/v1/settings | jq '.site_name'

# Tenant B settings  
curl -s -H "Host: rosana.paymydine.com" http://127.0.0.1:8000/api/v1/settings | jq '.site_name'

# Expected: Different site names
```

### Test 7: Admin Panel Table Statuses

```bash
# Tenant A table statuses
curl -s -H "Host: amir.paymydine.com" http://127.0.0.1:8000/admin/orders/get-table-statuses | jq '.statuses | length'

# Tenant B table statuses
curl -s -H "Host: rosana.paymydine.com" http://127.0.0.1:8000/admin/orders/get-table-statuses | jq '.statuses | length'

# Expected: Different counts (each tenant has different active orders)
```

### Test 8: Categories Isolation

```bash
# Tenant A categories
curl -s -H "Host: amir.paymydine.com" http://127.0.0.1:8000/api/v1/categories | jq '.data | length'

# Tenant B categories
curl -s -H "Host: rosana.paymydine.com" http://127.0.0.1:8000/api/v1/categories | jq '.data | length'

# Expected: Different category counts
```

---

## Success Criteria

After running these tests, you should observe:

✅ **Each tenant gets different data** (no more identical responses)  
✅ **Orders save to correct tenant database** (check with mysql queries)  
✅ **Notifications are isolated** (count differs per tenant)  
✅ **No 500 errors** (all routes work correctly)  
✅ **Admin panel shows correct data** (table statuses match tenant)

---

## Database Verification

### Check Order Distribution

```sql
-- Count orders in each database
SELECT 'amir_db' as db, COUNT(*) as order_count FROM amir_db.ti_orders;
SELECT 'rosana_db' as db, COUNT(*) as order_count FROM rosana_db.ti_orders;
SELECT 'central' as db, COUNT(*) as order_count FROM paymydine.ti_orders;

-- Check for recent orders in central DB (should be empty/old)
SELECT order_id, first_name, created_at 
FROM paymydine.ti_orders 
ORDER BY created_at DESC LIMIT 5;

-- Check for recent orders in tenant DBs (should have new orders)
SELECT order_id, first_name, created_at 
FROM amir_db.ti_orders 
ORDER BY created_at DESC LIMIT 5;
```

### Check Notification Distribution

```sql
-- Count notifications in each database
SELECT 'amir_db' as db, COUNT(*) as notif_count FROM amir_db.ti_notifications WHERE status='new';
SELECT 'rosana_db' as db, COUNT(*) as notif_count FROM rosana_db.ti_notifications WHERE status='new';
```

---

## Troubleshooting

### If curl returns "Tenant not found"

Check that the subdomain exists in the central database:

```sql
SELECT id, name, domain, database FROM paymydine.ti_tenants WHERE domain LIKE 'amir%' OR domain LIKE 'rosana%';
```

### If both tenants return identical data

1. Check route list: `php artisan route:list | grep "api/v1/menu"`
2. Should show ONLY routes from routes.php (not duplicates)
3. If duplicates still exist, re-run deletion steps

### If 500 errors occur

1. Check logs: `tail -100 storage/logs/laravel.log`
2. Common issues:
   - Middleware not found (check Kernel.php has DetectTenant registered)
   - Database connection failed (check .env has correct credentials)

---

## Before vs After

### Before Fix
```bash
curl -H "Host: amir.paymydine.com" http://127.0.0.1:8000/api/v1/menu
# Returns: Data from paymydine (central) or wrong tenant

curl -H "Host: rosana.paymydine.com" http://127.0.0.1:8000/api/v1/menu
# Returns: SAME data as above (cross-tenant leak) ❌
```

### After Fix
```bash
curl -H "Host: amir.paymydine.com" http://127.0.0.1:8000/api/v1/menu
# Returns: Amir's menu from amir_db

curl -H "Host: rosana.paymydine.com" http://127.0.0.1:8000/api/v1/menu
# Returns: Rosana's menu from rosana_db (DIFFERENT) ✅
```

---

## Production Testing

For production environments, replace `127.0.0.1:8000` with your actual domain:

```bash
curl -H "Host: amir.paymydine.com" https://paymydine.com/api/v1/menu | jq
curl -H "Host: rosana.paymydine.com" https://paymydine.com/api/v1/menu | jq
```

Or use the actual subdomains directly:

```bash
curl https://amir.paymydine.com/api/v1/menu | jq '.data.items | length'
curl https://rosana.paymydine.com/api/v1/menu | jq '.data.items | length'
```

---

## Need Help?

If tests fail or show unexpected behavior:

1. Review `_investigation_final/01_summary.md` for expected behavior
2. Check `_route_list_snapshot.txt` for registered routes
3. Check Laravel logs: `storage/logs/laravel.log`
4. Verify middleware in `app/Http/Kernel.php` line 53: `'detect.tenant' => \App\Http\Middleware\DetectTenant::class`

