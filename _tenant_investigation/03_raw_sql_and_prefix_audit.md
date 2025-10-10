# Raw SQL and Table Prefix Audit

This document audits all raw SQL usage and table prefixing strategies in both versions.

---

## Overview

Both versions use a **configured table prefix** (`ti_` by default) that should be automatically prepended to table names when using Eloquent or Query Builder. However, **raw SQL queries bypass this automatic prefixing** and must handle prefixes explicitly.

---

## Current Version Analysis

### Table Prefix Configuration

**File**: `config/database.php`

Both `mysql` and `tenant` connections:
```php
'prefix' => env('DB_PREFIX', 'ti_'),
```

**Default**: `ti_` prefix

### Raw SQL Categories

#### 1. **Hardcoded `ti_` Prefix in Raw SQL**

The vast majority of raw SQL queries have **hardcoded `ti_` prefix**. Examples from `_tenant_investigation/logs/raw_sql_current.txt`:

**Migration files** (acceptable - migrations run once):
```sql
FROM ti_tables
UPDATE ti_tables t JOIN d ON d.table_id = t.table_id
SHOW INDEX FROM ti_tables WHERE Key_name='idx_tables_table_no'
FROM ti_menus m
LEFT JOIN ti_menu_categories mc
LEFT JOIN ti_categories c
LEFT JOIN ti_media_attachments ma
```

**Route files** (`routes.php`, `app/admin/routes.php`, `app/main/routes.php`):
```sql
-- Line 403 (routes.php), 407 (app/admin/routes.php)
FROM ti_menus m
LEFT JOIN ti_menu_categories mc ON m.menu_id = mc.menu_id
LEFT JOIN ti_categories c ON mc.category_id = c.category_id
LEFT JOIN ti_media_attachments ma ON ma.attachment_type = 'menus'
```

**Controllers** (`app/admin/controllers/Api/RestaurantController.php`, `app/Http/Controllers/Api/MenuController.php`):
```sql
FROM ti_menus m
LEFT JOIN ti_menu_categories mc ON m.menu_id = mc.menu_id
LEFT JOIN ti_categories c ON mc.category_id = c.category_id
LEFT JOIN ti_media_attachments ma ON ma.attachment_type = 'menus'
```

**⚠️ Problem**: These hardcoded prefixes will **fail** if:
- Tenant database uses a different prefix
- Prefix is changed via environment variable
- Database is imported from another system with different prefix

#### 2. **Dynamic Prefix via `DB::getTablePrefix()`**

**Found in**: `app/admin/database/migrations/2022_06_30_010000_drop_foreign_key_constraints_on_all_tables.php:38`

```php
$table->dropIndexIfExists(sprintf('%s%s_%s_foreign', 
    DB::getTablePrefix(), 
    $tableName, 
    $foreignKey
));
```

**✅ Good practice**: Uses `DB::getTablePrefix()` to dynamically build index name.

#### 3. **No Prefix (Schema Queries)**

**Superadmin tenant creation** (`app/admin/controllers/SuperAdminController.php:124`):
```sql
SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?
```

**✅ Correct**: `INFORMATION_SCHEMA` is a MySQL meta-database and doesn't use table prefixes.

**Template database inspection** (`app/admin/controllers/SuperAdminController.php:148`):
```sql
SHOW TABLES FROM `$templateDb`
```

**✅ Correct**: `SHOW TABLES` is a DDL command, no prefix needed.

#### 4. **DB::table() Usage (Auto-Prefixed)**

Most code uses Query Builder, which **automatically prepends the prefix**:

```php
DB::table('menus')  // Becomes: SELECT * FROM ti_menus
DB::table('orders')  // Becomes: SELECT * FROM ti_orders
```

**From logs** (`_tenant_investigation/logs/current_db_calls.txt`):
```
DB::table('ti_tenants')  // ⚠️ DOUBLE PREFIX! Becomes ti_ti_tenants
DB::table('orders')      // ✅ Correct, becomes ti_orders
DB::table('menus')       // ✅ Correct, becomes ti_menus
DB::table('locations')   // ✅ Correct, becomes ti_locations
DB::table('settings')    // ✅ Correct, becomes ti_settings
```

**Critical bug found**: Some code uses `DB::table('ti_tenants')` instead of `DB::table('tenants')`, which would result in querying `ti_ti_tenants` table.

**Evidence**:
- `app/Http/Middleware/DetectTenant.php:30`: `DB::connection('mysql')->table('ti_tenants')`
- `app/Http/Middleware/TenantDatabaseMiddleware.php:19`: `DB::connection('mysql')->table('ti_tenants')`
- Multiple route files

**⚠️ Impact**: If this table is actually named `ti_tenants` (not `tenants`), then the **central DB does NOT use the prefix**, or the prefix is manually added to this specific table name.

### Table Prefix Patterns Found

#### Pattern A: Hardcoded `ti_` in Raw SQL
```sql
FROM ti_menus
JOIN ti_categories
```
**Usage**: 90%+ of raw SQL queries  
**Risk**: Breaks if prefix changes  
**Locations**: Routes, controllers, migrations

#### Pattern B: Using `DB::table()` with Prefix
```php
DB::table('ti_tenants')  // Assumes tenant table is ti_tenants, not tenants
```
**Risk**: Double-prefix if config prefix is ti_ and table is ti_tenants  
**Implication**: Central DB tenant table might not use prefix

#### Pattern C: Using `DB::table()` without Prefix
```php
DB::table('menus')
DB::table('orders')
```
**Usage**: Most Query Builder usage  
**Risk**: None (correct pattern)

#### Pattern D: Dynamic Prefix
```php
DB::getTablePrefix() . 'table_name'
```
**Usage**: Rare, only in one migration  
**Risk**: None (best practice for raw SQL)

---

## Old Version Analysis

### Table Prefix Configuration

**Identical to current version**: `ti_` prefix in `config/database.php`

### Raw SQL Patterns

From `_tenant_investigation/logs/raw_sql_old.txt` and `_tenant_investigation/logs/old_db_calls.txt`:

**Same patterns as current version**:
- Hardcoded `ti_` prefix in raw SQL
- `DB::table('ti_tenants')` in middleware
- `DB::table()` without prefix for most queries
- Rare use of `DB::getTablePrefix()`

**No significant difference in prefix handling between versions**.

---

## Detailed Raw SQL Locations

### Current Version - Raw SQL by Category

#### Menu Queries (Most Common)
**Locations**: `routes.php:403-413`, `app/admin/routes.php:407-417`, `app/main/routes.php:145-155`, `app/admin/controllers/Api/RestaurantController.php:62-70`, `app/Http/Controllers/Api/MenuController.php:26-34`

**Pattern**:
```sql
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
```

**Hardcoded tables**:
- `ti_menus`
- `ti_menu_categories`
- `ti_categories`
- `ti_media_attachments`

**Risk**: ⚠️ High - duplicated across multiple files, breaks if prefix changes

#### Category Queries
**Locations**: `routes.php:430-437`, `app/admin/routes.php:434-441`, `app/main/routes.php:175-182`, `app/Http/Controllers/Api/MenuController.php:56-62`

**Pattern**:
```sql
SELECT category_id as id, name, priority 
FROM ti_categories 
WHERE status = 1 
ORDER BY priority ASC, name ASC
```

**Hardcoded tables**: `ti_categories`

#### Menu Option Queries
**Locations**: `app/Http/Controllers/Api/MenuController.php:283-303`, `app/main/routes.php:14-32`

**Pattern**:
```sql
SELECT mo.*, mio.* 
FROM ti_menu_options mo
INNER JOIN ti_menu_item_options mio ON mo.option_id = mio.option_id
WHERE mio.menu_id = ?
```

**Hardcoded tables**:
- `ti_menu_options`
- `ti_menu_item_options`
- `ti_menu_option_values`
- `ti_menu_item_option_values`

#### Table Status Query (Admin Only)
**Location**: `routes.php:119-138`, `app/admin/routes.php:122-157`

```sql
SELECT
    tables.table_name,
    statuses.status_name,
    CASE 
        WHEN ti_statuses.status_name = "Preparation" THEN "preparing"
        ...
    END as status_class
FROM orders
JOIN statuses ON orders.status_id = statuses.status_id
JOIN tables ON orders.order_type = tables.table_id
```

**Mixed prefix usage**:
- Uses `tables` (unprefixed in Query Builder context)
- Uses `statuses` (unprefixed)
- References `ti_statuses` in CASE statement ⚠️ (hardcoded prefix in raw SQL within Query Builder)

**⚠️ Inconsistency**: Mixes Query Builder table names with hardcoded `ti_` prefix in raw SQL fragments.

#### Migration DDL Queries
**Locations**: Various migrations in `app/admin/database/migrations/`

Examples:
```sql
-- Line 24 (2025_09_26_000001)
FROM ti_tables

-- Line 27-28
UPDATE ti_tables t
JOIN d ON d.table_id = t.table_id

-- Line 33
SHOW INDEX FROM ti_tables WHERE Key_name='idx_tables_table_no'
```

**✅ Acceptable for migrations** (one-time run), but still risky if migrations need to run on systems with different prefixes.

#### SuperAdmin Tenant Management
**Location**: `app/admin/controllers/SuperAdminController.php`

**Template DB queries**:
```php
// Line 148
$tables = DB::connection('mysql')->select("SHOW TABLES FROM `$templateDb`");

// Line 171
$rowCount = DB::connection('mysql')->selectOne(
    "SELECT COUNT(*) AS count FROM `$templateDb`.`$tableName`"
)->count;

// Line 173
DB::connection('mysql')->statement(
    "INSERT INTO `$databaseName`.`$tableName` SELECT * FROM `$templateDb`.`$tableName`"
);
```

**Uses**: Fully qualified table names (`database`.`table`)  
**Prefix handling**: Assumes source and destination DBs have compatible table structures (including prefixes)

---

## Query Builder Auto-Prefix Evidence

From `_tenant_investigation/logs/current_db_calls.txt`, common Query Builder patterns:

```php
DB::table('orders')       // → ti_orders
DB::table('menus')        // → ti_menus  
DB::table('locations')    // → ti_locations
DB::table('settings')     // → ti_settings
DB::table('statuses')     // → ti_statuses
DB::table('waiter_calls') // → ti_waiter_calls
DB::table('notifications')// → ti_notifications
```

**Exception**:
```php
DB::connection('mysql')->table('ti_tenants')  // In middleware
DB::connection('mysql')->table('tenants')     // In route (line 253)
```

**Inconsistency**: Some code uses `'ti_tenants'`, some uses `'tenants'`. This suggests:
- Central DB tenant table is actually named `ti_tenants` (not `tenants`), OR
- There's a bug and one of these references is wrong

---

## Central DB Table Names

**Evidence from middleware**:
```php
// DetectTenant.php:30
DB::connection('mysql')->table('ti_tenants')

// TenantDatabaseMiddleware.php:19
DB::connection('mysql')->table('ti_tenants')
```

**Evidence from routes**:
```php
// routes.php:253
DB::connection('mysql')->table('tenants')
```

**⚠️ Inconsistency**: Different parts of the code use different table names for the tenant registry.

### Hypothesis 1: Central DB Uses No Prefix
- Central DB connection (`mysql`) has no prefix or empty prefix
- Tenant table is literally named `tenants`
- Middleware incorrectly uses `ti_tenants` (bug)

### Hypothesis 2: Central DB Uses `ti_` Prefix
- Central DB connection (`mysql`) has `ti_` prefix
- Tenant table is literally named `ti_tenants` (with prefix in actual table name)
- Code correctly references `ti_tenants` without relying on auto-prefix
- Route at line 253 is buggy (would query `ti_tenants` anyway due to auto-prefix)

### Hypothesis 3: Mixed Configuration
- Central DB has `ti_` prefix configured
- Some tables have prefix in their actual name (`ti_tenants`), some don't
- Code is inconsistent about whether to rely on auto-prefix or hardcode it

**To resolve**: Need to inspect actual central database schema or .env file.

---

## Tenant Isolation Risk Assessment

### Risk 1: Hardcoded Prefixes in Raw SQL

**Severity**: **Medium**

**Impact**:
- If tenant database uses different prefix, queries fail
- If prefix is changed via environment, requires code changes
- Makes multi-tenancy configuration inflexible

**Affected**:
- All menu/category/order raw SQL queries
- Menu option queries
- Table status queries

**Mitigation**:
- Refactor raw SQL to use Query Builder where possible
- Use `DB::getTablePrefix()` for unavoidable raw SQL
- Create helper functions to build prefixed table names

### Risk 2: Inconsistent `ti_tenants` vs `tenants`

**Severity**: **High**

**Impact**:
- May cause tenant lookup failures
- May double-prefix and query wrong table
- Unclear which is correct

**Affected**:
- Middleware (tenant detection)
- Superadmin routes (tenant management)

**Mitigation**:
- Determine actual table name in central DB
- Standardize all references
- Add database schema validation tests

### Risk 3: Mixed Prefix Usage in Query Builder

**Severity**: **Low-Medium**

**Impact**:
- Some table references may be wrong
- Potential for querying non-existent tables

**Example**:
```php
// If prefix is ti_ and table is actually ti_statuses:
DB::table('ti_statuses')  // Queries ti_ti_statuses (wrong)
DB::table('statuses')     // Queries ti_statuses (correct)
```

**Mitigation**:
- Audit all `DB::table()` calls for accidentally prefixed names
- Establish coding standard: never include prefix in `DB::table()` calls

### Risk 4: Table Status Query Inconsistency

**Severity**: **Low**

**Impact**:
- CASE statement in raw SQL references `ti_statuses` while using Query Builder
- Works if prefix is `ti_`, breaks otherwise

**Location**: `routes.php:125-137`, `app/admin/routes.php:128-137`

**Mitigation**:
- Rewrite to avoid raw SQL in CASE statement
- Use application-level mapping instead of database CASE

---

## Recommendations

### 1. Eliminate Hardcoded Prefixes in Raw SQL

**Before**:
```sql
FROM ti_menus m
LEFT JOIN ti_categories c
```

**After**:
```php
$prefix = DB::getTablePrefix();
$query = "
    FROM {$prefix}menus m
    LEFT JOIN {$prefix}categories c
";
```

Or better, rewrite as Query Builder:
```php
DB::table('menus as m')
    ->leftJoin('categories as c', ...)
```

### 2. Standardize Tenant Table Reference

**Determine actual table name**, then:

**If table is `tenants` (no prefix in name)**:
```php
DB::connection('mysql')->table('tenants')  // Everywhere
```

**If table is `ti_tenants` (prefix in name)**:
- **Option A**: Configure `mysql` connection with empty prefix, use `table('ti_tenants')`
- **Option B**: Configure `mysql` connection with `ti_` prefix, use `table('tenants')` (let auto-prefix work)

### 3. Add Schema Validation

**Create test or migration check**:
```php
// Verify tenant table exists with expected name
$expectedTable = DB::getTablePrefix() . 'tenants';
$exists = DB::connection('mysql')->select(
    "SHOW TABLES LIKE ?", 
    [$expectedTable]
);
if (empty($exists)) {
    throw new \Exception("Tenant registry table not found: $expectedTable");
}
```

### 4. Refactor Common Queries

**Extract menu query to a repository**:
```php
class MenuRepository {
    public function getMenuItems() {
        $prefix = DB::getTablePrefix();
        // OR use Query Builder exclusively
    }
}
```

---

## Evidence Logs

- Raw SQL (current): `_tenant_investigation/logs/raw_sql_current.txt` (500 lines)
- Raw SQL (old): `_tenant_investigation/logs/raw_sql_old.txt` (500 lines)
- DB calls (current): `_tenant_investigation/logs/current_db_calls.txt`
- DB calls (old): `_tenant_investigation/logs/old_db_calls.txt`

---

## Summary

### Current Version
- **90%+ of raw SQL has hardcoded `ti_` prefix** ⚠️
- **Inconsistent tenant table reference** (`ti_tenants` vs `tenants`) ⚠️
- **Mixed usage in Query Builder** (some include prefix, most don't)
- **Dynamic prefix usage is rare** (only one migration uses `DB::getTablePrefix()`)

### Old Version
- **Identical patterns to current version**
- **No improvements in prefix handling**

### Key Insight
The prefix-handling strategy is **inconsistent and brittle**. Works only because:
1. All tenant DBs likely use the same `ti_` prefix
2. Prefix is never changed from default
3. Central DB structure mirrors tenant DB structure

**This will break if**:
- Tenants are imported from systems with different prefixes
- Application needs to support multiple prefix conventions
- Development/test environments use different prefixes for isolation

