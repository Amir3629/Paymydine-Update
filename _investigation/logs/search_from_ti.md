`grep -ri "from ti_" .`

<file_content>
CHANGELOG_LAST_30_DAYS.md
192:FROM ti_menus m
199:- `app/Http/Controllers/Api/MenuController.php:26` still has `FROM ti_menus`
200:- `app/admin/controllers/Api/RestaurantController.php:62` still has `FROM ti_menus`
378:- `MenuController.php:26`: `FROM ti_menus` (still hardcoded)

TENANT_HOST_LEAK_INVESTIGATION.md
43:    // Returns: 'default' (from ti_locations table)
363:SELECT location_id, location_name, permalink_slug FROM ti_locations;

FINAL_DEPLOYMENT_REPORT.md
109:FROM ti_menus
236:    FROM ti_menus m

ALL_CHANGED_FILES_LIST.md
50:  - `FROM ti_menus` → `FROM {$p}menus`
55:  - `FROM ti_menu_options` → `FROM {$p}menu_options`
57:  - `FROM ti_menu_option_values` → `FROM {$p}menu_option_values`
68:  - `FROM ti_menus` → `FROM {$p}menus`
73:  - `FROM ti_categories` → `FROM {$p}categories`
132:   - `FROM ti_tables` → `FROM {$p}tables`
133:   - `SHOW INDEX FROM ti_tables` → `SHOW INDEX FROM {$p}tables`

PREFIX_REFACTOR_FINAL_REPORT.md
64:    FROM ti_menus m                           ❌ Hardcoded prefix
97:**Result**: Query resolves to `FROM ti_menus`, `LEFT JOIN ti_menu_categories`, etc. at runtime, but is not hardcoded.
203:$query = "SELECT * FROM {$p}menus";       // Becomes "SELECT * FROM ti_menus"
209:SELECT * FROM ti_menus  -- Prefix applied dynamically
219:SELECT * FROM ti_menus  -- Laravel adds prefix from config

PREFIX_REFACTOR_COMPLETE.md
76:    FROM ti_menus m
340:// → SELECT * FROM ti_menus WHERE menu_status = 1

TENANT_FIX_APPLIED.md
337:  -e "SELECT domain, database FROM ti_tenants WHERE domain LIKE '%amir%' OR domain LIKE '%rosana%';"

README_TENANT_FIX.md
182:mysql -u paymydine -p'P@ssw0rd@123' paymydine -e "SELECT domain, database FROM ti_tenants;"

TENANT_BLEED_INVESTIGATION_REPORT.md
512:mysql -u paymydine -p'P@ssw0rd@123' paymydine -e "SELECT id, name, domain, \`database\`, status FROM ti_tenants LIMIT 50;"

artifacts/flow-traces.md
85:FROM ti_menus m
596:  -e "SELECT order_id, first_name, created_at FROM ti_orders ORDER BY order_id DESC LIMIT 10;"

artifacts/README.md
121:2. ✅ **Database Queries**: `DESCRIBE ti_tenants`, `SELECT * FROM ti_tenants`

artifacts/middleware-diff.md
346:From `mysql -e "SELECT id, name, domain, database, status FROM ti_tenants LIMIT 20;"`:

artifacts/executive-summary.md
403:  -e "SELECT id, name, domain, database FROM ti_tenants;"
407:  -e "SELECT order_id, first_name, created_at FROM ti_orders ORDER BY order_id DESC LIMIT 10;"

artifacts/db-tenants-sample.sql.txt
18:ERROR 1064 (42000) at line 1: You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near ', status, db_host, db_user FROM ti_tenants LIMIT 20' at line 1

TENANCY_OVERVIEW.md
237:| `app/Http/Controllers/Api/MenuController.php:26` | `FROM ti_menus m` |
241:| `app/Http/Controllers/Api/MenuController.php:55` | `FROM ti_categories` |
242:| `app/admin/controllers/Api/RestaurantController.php:62` | `FROM ti_menus m` |

OPEN_QUESTIONS.md
19:- **Database inspection**: `SELECT domain, database FROM ti_tenants;` (in main `paymydine` database)
50:- **Live database**: `SELECT id, domain, database, subdomain FROM ti_tenants LIMIT 10;`
458:   SELECT * FROM ti_menus WHERE menu_name = "Amir's Burger";
461:   SELECT * FROM ti_menus WHERE menu_name = "Amir's Burger";
464:   SELECT * FROM ti_menus WHERE menu_name = "Amir's Burger";
506:| Q1 | Tenant DB naming convention | `SELECT * FROM ti_tenants;` | Can't fix if don't know how DBs are named |
547:SELECT id, domain, database, subdomain, status, db_host FROM ti_tenants LIMIT 10;
553:SELECT COUNT(*) FROM ti_menus;  -- In main DB

CONN_TRACE_NOTES.md
40:    FROM ti_menus m
63:    FROM ti_categories 

ROUTES_MIDDLEWARE_COVERAGE.md
125:| `/api/v1/menu` | GET | Closure | `DB::select()` from ti_menus | ⚠️ HIGH - Reads from default DB |

docs/DEPLOYMENT.md
857:for db in $(docker compose exec -T mysql mysql -u root -p$MYSQL_ROOT_PASSWORD -e "SELECT database FROM ti_tenants" -N); do

docs/SECURITY_THREAT_MODEL.md
561:2. Queries SELECT * FROM ti_tenants

docs/DATA_MODEL.md
912:SELECT * FROM ti_orders WHERE status_id = 1 ORDER BY created_at DESC;
919:SELECT * FROM ti_orders WHERE status_id = 1 ORDER BY created_at DESC;
946:for db in $(mysql -u paymydine -p -e "SELECT database FROM ti_tenants" -N); do
971:FROM ti_order_menus om 
976:DELETE FROM ti_order_menus WHERE order_id NOT IN (SELECT order_id FROM ti_orders);
979:SELECT * FROM ti_orders WHERE status_id NOT IN (SELECT status_id FROM ti_statuses);
1019:SHOW INDEX FROM ti_orders;
1020:SHOW INDEX FROM ti_order_menus;

docs/ARCHITECTURE.md
83:   SELECT * FROM ti_tenants WHERE domain LIKE 'rosana.%' OR domain = 'rosana'

full_differences.patch
95:-                FROM ti_menus m
125:-                FROM ti_categories 
352:-                FROM ti_menu_options mo
368:-                    FROM ti_menu_option_values mov
418:+                FROM ti_menus m
445:+                FROM ti_categories 
6439:-            FROM ti_menu_options mo
6455:-                FROM ti_menu_option_values mov
12325:-            FROM ti_menu_options mo
12341:-                FROM ti_menu_option_values mov

root path route.php
118:                FROM ti_menus m
145:                FROM ti_categories 

app/main/routes.php
14:            FROM ti_menu_options mo
30:                FROM ti_menu_option_values mov
145:                            FROM ti_menus m
175:                            FROM ti_categories 
469:                            FROM ti_menus m
499:                            FROM ti_categories 

app.main.routes.php  
91:                            FROM ti_menus m
118:                            FROM ti_categories 
314:                            FROM ti_menus m
341:                            FROM ti_categories 

set-default-theme.sql
6:SELECT theme_id, name, code, status, is_default FROM ti_themes ORDER BY theme_id; 

check-table-structure.php
32:    $stmt = $pdo->query("SELECT * FROM ti_themes LIMIT 3");

app/admin/controllers/Notifications.php
287:            // Fallback: try to get from ti_tenants table

app/admin/database/migrations/2024_01_15_000005_seed_sample_notifications.php
115:            // Fallback: try to get from ti_tenants table

refresh-themes.php
22:    $stmt = $pdo->query("SELECT theme_id, name, code, status, is_default FROM ti_themes ORDER BY theme_id");
83:    $stmt = $pdo->prepare("SELECT * FROM ti_themes WHERE code = 'frontend-theme'");

fix-themes.php
22:    $stmt = $pdo->prepare("DELETE FROM ti_themes WHERE code IN ('oussama-theme', 'paymydine-nextjs')");
56:    $stmt = $pdo->query("SELECT id, name, code, is_active FROM ti_themes ORDER BY id");
