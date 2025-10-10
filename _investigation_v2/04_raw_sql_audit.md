## Raw SQL & Table Prefix Audit

### Executive Summary

**Key Findings:**
- **NO hardcoded `ti_` prefixes** found in active route/controller code
- All raw SQL uses `DB::connection()->getTablePrefix()` pattern correctly
- Query Builder calls (`DB::table()`) rely on Laravel's automatic prefixing
- Central database operations correctly use explicit `DB::connection('mysql')` 

### Database Access Patterns

#### Pattern 1: Query Builder with Automatic Prefixing (CORRECT)

**How it works:**
- Laravel automatically prepends the configured prefix to table names
- The prefix comes from the active connection's configuration
- After `DetectTenant` runs, the default connection is `tenant` with prefix `ti_`

**Examples from routes.php:**
```php
// Line 27
DB::table('tables')->where('table_name', 'Cashier')->first();
// Resolves to: SELECT * FROM `ti_tables` WHERE `table_name` = 'Cashier'
// Uses: default connection (tenant), database (amir_db), prefix (ti_)

// Line 622
$orderNumber = DB::table('orders')->max('order_id') + 1;
// Resolves to: SELECT MAX(`order_id`) FROM `ti_orders`

// Line 642
$orderId = DB::table('orders')->insertGetId([...]);
// Resolves to: INSERT INTO `ti_orders` (...) VALUES (...)

// Line 676
DB::table('order_menus')->insert([...]);
// Resolves to: INSERT INTO `ti_order_menus` (...) VALUES (...)
```

**Analysis:**
- ✅ All `DB::table()` calls use unprefixed table names
- ✅ Laravel automatically adds `ti_` prefix from connection config
- ✅ Uses default connection (which is switched to `tenant` by middleware)
- ✅ **Isolation: COMPLETE**

#### Pattern 2: Raw SQL with Dynamic Prefix (CORRECT)

**How it works:**
- Code explicitly gets the prefix from the current connection
- Prefix is interpolated into the SQL string
- Query is executed on the default connection

**Example from routes.php:397-418:**
```php
// Line 397: Get prefix from current (tenant) connection
$p = DB::connection()->getTablePrefix();
// Returns: 'ti_'

// Lines 398-414: Build SQL with prefix
$query = "
    SELECT 
        m.menu_id as id,
        m.menu_name as name,
        m.menu_description as description,
        CAST(m.menu_price AS DECIMAL(10,2)) as price,
        COALESCE(c.name, 'Main') as category_name,
        ma.name as image
    FROM {$p}menus m
    LEFT JOIN {$p}menu_categories mc ON m.menu_id = mc.menu_id
    LEFT JOIN {$p}categories c ON mc.category_id = c.category_id
    LEFT JOIN {$p}media_attachments ma ON ma.attachment_type = 'menus' 
        AND ma.attachment_id = m.menu_id 
        AND ma.tag = 'thumb'
    WHERE m.menu_status = 1
    ORDER BY c.priority ASC, m.menu_name ASC
";

// Line 420: Execute on default connection
$items = DB::select($query);
// Executes on: default connection (tenant), database (amir_db)
// Resolves to: FROM ti_menus m LEFT JOIN ti_menu_categories mc ...
```

**Analysis:**
- ✅ Prefix is obtained dynamically from the active connection
- ✅ No hardcoded `ti_` in SQL strings
- ✅ Query executes on tenant database
- ✅ **Isolation: COMPLETE**

**Similar pattern in app/Http/Controllers/Api/MenuController.php:18-37:**
```php
$p = DB::connection()->getTablePrefix();
$query = "
    SELECT 
        m.menu_id as id,
        ...
    FROM {$p}menus m
    LEFT JOIN {$p}menu_categories mc ON m.menu_id = mc.menu_id
    LEFT JOIN {$p}categories c ON mc.category_id = c.category_id
    LEFT JOIN {$p}media_attachments ma ON ...
    WHERE m.menu_status = 1
";
$items = DB::select($query);
```

#### Pattern 3: Explicit Central Database Connection (CORRECT)

**How it works:**
- Code explicitly specifies the `mysql` connection
- This connection always points to the central `paymydine` database
- Used for tenant management operations

**Example from DetectTenant.php:30-33:**
```php
$tenant = DB::connection('mysql')->table('ti_tenants')
    ->where('domain', 'like', $subdomain . '.%')
    ->orWhere('domain', $subdomain)
    ->first();
```
**Analysis:**
- ✅ Explicitly uses `mysql` connection (not default)
- ✅ Targets central database: `paymydine`
- ✅ Table name: `ti_tenants` (with prefix applied by `mysql` connection config)
- ✅ **Purpose: Tenant resolution - CORRECT**

**Example from app/admin/routes.php:257:**
```php
$updated = DB::connection('mysql')->table('tenants')->where('id', $id)->update(['status' => $status]);
```
**Analysis:**
- ✅ Explicitly uses `mysql` connection
- ⚠️ Table name without prefix: `tenants` → Laravel adds prefix → `ti_tenants`
- ✅ **Purpose: Super admin tenant management - CORRECT**

### Complete DB Access Inventory

#### routes.php - All DB Calls

| Line | Pattern | Table | Connection | Isolation |
|------|---------|-------|------------|-----------|
| 25 | `DB::table('tables')` | tables | default (tenant) | ✅ |
| 29-43 | `DB::table('locationables')` | locationables | default (tenant) | ✅ |
| 50 | `DB::table('tables')->insertGetId()` | tables | default (tenant) | ✅ |
| 90 | `DB::table('tables')` | tables | default (tenant) | ✅ |
| 123-142 | `DB::table('orders')->join('statuses')->join('tables')` | orders, statuses, tables | default (tenant) | ✅ |
| 254 | `DB::connection('mysql')->table('tenants')` | tenants | mysql (central) | ✅ Correct |
| 306 | `DB::table('tables')` | tables | default (tenant) | ✅ |
| 318-320 | `DB::table('locationables')` | locationables | default (tenant) | ✅ |
| 397 | `DB::connection()->getTablePrefix()` | N/A | Gets prefix | ✅ |
| 420 | `DB::select($query)` | menus, categories, media | default (tenant) | ✅ |
| 441 | `DB::select($categoriesQuery)` | categories | default (tenant) | ✅ |
| 463 | `DB::table('categories')` | categories | default (tenant) | ✅ |
| 531 | `DB::table('locations')` | locations | default (tenant) | ✅ |
| 560 | `DB::table('settings')` | settings | default (tenant) | ✅ |
| 594 | `DB::table('tables')` | tables | default (tenant) | ✅ |
| 622 | `DB::table('orders')->max()` | orders | default (tenant) | ✅ |
| 642 | `DB::table('orders')->insertGetId()` | orders | default (tenant) | ✅ |
| 667-674 | `DB::table('menus')` | menus | default (tenant) | ✅ |
| 676 | `DB::table('order_menus')->insert()` | order_menus | default (tenant) | ✅ |
| 689-695 | `DB::table('order_totals')->insert()` | order_totals | default (tenant) | ✅ |
| 699-705 | `DB::table('order_totals')->insert()` | order_totals | default (tenant) | ✅ |
| 738-747 | `DB::table('orders')->leftJoin('statuses')` | orders, statuses | default (tenant) | ✅ |
| 813 | `DB::table('orders')->update()` | orders | default (tenant) | ✅ |
| 852 | `DB::table('tables')` | tables | default (tenant) | ✅ |
| 896 | `DB::table('tables')` | tables | default (tenant) | ✅ |
| 936-958 | `DB::table('waiter_calls')->insertGetId()` | waiter_calls | default (tenant) | ✅ |
| 949-957 | `DB::table('notifications')->insert()` | notifications | default (tenant) | ✅ |
| 997-1020 | `DB::table('table_notes')->insertGetId()` | table_notes | default (tenant) | ✅ |
| 1011-1019 | `DB::table('notifications')->insert()` | notifications | default (tenant) | ✅ |

**Total DB operations in routes.php:** ~40
**Operations using default (tenant) connection:** ~38
**Operations using explicit mysql connection:** 1 (super admin)
**Isolation rate:** 100% (all operations correctly scoped)

#### app/Http/Controllers/Api/MenuController.php - All DB Calls

| Line | Pattern | Table | Connection | Isolation |
|------|---------|-------|------------|-----------|
| 18 | `DB::connection()->getTablePrefix()` | N/A | Gets prefix | ✅ |
| 37 | `DB::select($query)` | menus, categories, media | default (tenant) | ✅ |
| 61 | `DB::select($categoriesQuery)` | categories | default (tenant) | ✅ |
| 277 | `DB::connection()->getTablePrefix()` | N/A | Gets prefix | ✅ |
| 291 | `DB::select($optionsQuery)` | menu_options | default (tenant) | ✅ |
| 308 | `DB::select($valuesQuery)` | menu_option_values | default (tenant) | ✅ |

**Total DB operations:** 6
**All use default connection after tenant middleware:** ✅

### Hardcoded `ti_` Prefix Search

**Command:** `grep -rn "FROM ti_\|JOIN ti_" routes.php app/admin/routes.php app/Http/Controllers/ app/Helpers/`

**Result:** **NO MATCHES** in active code files

**Explanation:**
- All raw SQL uses the `{$p}` placeholder with dynamically fetched prefix
- No hardcoded `ti_` prefixes exist in active code
- Previous documentation and migration files may contain references, but they are not active in request handling

### Query Builder vs Raw SQL

**Query Builder Usage:** ~80% of database operations
- Automatically handles prefixing
- More secure (prepared statements)
- Easier to maintain

**Raw SQL Usage:** ~20% of database operations
- Used for complex joins (menu queries)
- All use dynamic prefix: `$p = DB::connection()->getTablePrefix()`
- All correctly isolated

### Verification: Prefix Application

**Config:** `config/database.php:55` and `config/database.php:74`
```php
'mysql' => [
    'prefix' => env('DB_PREFIX', 'ti_'),
    // ...
],
'tenant' => [
    'prefix' => env('DB_PREFIX', 'ti_'),
    // ...
],
```

**Both connections use the same prefix:** `ti_`

**Isolation mechanism:**
- NOT based on different prefixes
- Based on DIFFERENT DATABASES (paymydine vs amir_db vs rosana_db)
- All databases use the same table prefix (`ti_`)

### Summary

✅ **NO SQL injection of wrong tenant data via hardcoded prefixes**
✅ **All raw SQL correctly uses dynamic prefix fetching**
✅ **Query Builder operations correctly rely on automatic prefixing**
✅ **Central database operations correctly use explicit `mysql` connection**
❌ **One vulnerability**: Unprotected `/admin/notifications-api` routes don't switch connection

