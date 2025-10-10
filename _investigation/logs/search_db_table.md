`grep -r "DB::table" .`

<file_content>
_investigation/logs/search_tenant.md
112:572:- ⚠️ LOW - Route already uses tenant-scoped queries (`DB::table('tables')`)

CHANGELOG_LAST_30_DAYS.md
177:Added `createOrderNotification()` method that uses `DB::table('notifications')`.
319:- `createValetRequestNotification()` (line 137): Uses `DB::table()` without explicit connection
320:- `createOrderNotification()` (line 240): Uses `DB::table()` without explicit connection

app/admin/routes.php
27:                    $cashierTable = DB::table('tables')->where('table_name', 'Cashier')->first();
31:                        $locationLink = DB::table('locationables')
39:                            DB::table('locationables')->insert([
50:                        $cashierTableId = DB::table('tables')->insertGetId([
64:                        DB::table('locationables')->insert([
90:                    $cashierTable = DB::table('tables')->where('table_id', $cashierTableId)->first();
123:                $tableStatuses = DB::table('orders')
309:            $table = DB::table('tables')->where('table_id', $tableId)->first();
318:            $locationData = DB::table('locationables')
463:            $categories = DB::table('categories')
531:            $restaurant = DB::table('locations')->first();
560:            $settings = DB::table('settings')->get()->keyBy('item');
594:                $cashierTable = DB::table('tables')->where('table_name', 'Cashier')->first();
622:            $orderNumber = DB::table('orders')->max('order_id') + 1;
642:            $orderId = DB::table('orders')->insertGetId([
667:                $menuItem = DB::table('menus')
676:                DB::table('order_menus')->insert([
689:                DB::table('order_totals')->insert([
699:            DB::table('order_totals')->insert([
738:            $order = DB::table('orders')
813:            $updated = DB::table('orders')
852:            $table = DB::table('tables')
896:            $table = DB::table('tables')
952:                    $callId = DB::table('waiter_calls')->insertGetId([
965:                    DB::table('notifications')->insert([
1014:                    $noteId = DB::table('table_notes')->insertGetId([
1028:                    DB::table('notifications')->insert([

TENANT_HOST_LEAK_INVESTIGATION.md
35:$location_id = DB::table('locationables')
40:$slug = DB::table('locations')
215:│    │    DB::table('tables')->where('table_id', 49)->first()│
219:│    │    DB::table('locationables')                        │ │
226:│    │    DB::table('locations')                            │ │
322:    // ... queries DB::table('tables'), DB::table('locationables') ...
572:- ⚠️ LOW - Route already uses tenant-scoped queries (`DB::table('tables')`)
620:2. Blade view queries: DB::table('locations')->value('permalink_slug')

FINAL_DEPLOYMENT_REPORT.md
18:   - Fixed 7 `DB::table('ti_tables')` → `DB::table('tables')`
38:   - Fixed 5 instances: `DB::table('ti_tables')` → `DB::table('tables')`
108:DB::table('ti_tables')
112:DB::table('tables')  // Laravel adds ti_
182:$ grep -RIn "DB::table\(['\"]ti_" app/ routes*.php tests/ | wc -l
256:$table = DB::table('ti_tables')->where('table_id', $id)->first();
261:$table = DB::table('tables')->where('table_id', $id)->first();
395:$ grep -RIn "DB::table\(['\"]ti_" app/ routes*.php tests/ | wc -l

ALL_CHANGED_FILES_LIST.md
21:- ✅ Fixed 7 × `DB::table('ti_tables')` → `DB::table('tables')`
86:- ✅ Fixed 5 test cases: `DB::table('ti_tables')` → `DB::table('tables')`

storage/framework/views/ae1b42698d483a700f14533163023afa25100a1c.php
3:$imgSrcDashboard = DB::table('logos')->orderBy('id', 'desc')->value('dashboard_logo');

routes.php
25:                    $cashierTable = DB::table('tables')->where('table_name', 'Cashier')->first();
29:                    $locationLink = DB::table('locationables')
37:                        DB::table('locationables')->insert([
48:                        $cashierTableId = DB::table('tables')->insertGetId([
62:                    DB::table('locationables')->insert([
87:                    $cashierTable = DB::table('tables')->where('table_id', $cashierTableId)->first();
120:                $tableStatuses = DB::table('orders')
306:                $table = DB::table('tables')->where('table_id', $tableId)->first();
315:                $locationData = DB::table('locationables')
459:            $categories = DB::table('categories')
527:            $restaurant = DB::table('locations')->first();
556:            $settings = DB::table('settings')->get()->keyBy('item');
590:                    $cashierTable = DB::table('tables')->where('table_name', 'Cashier')->first();
618:            $orderNumber = DB::table('orders')->max('order_id') + 1;
638:            $orderId = DB::table('orders')->insertGetId([
663:                $menuItem = DB::table('menus')
672:                DB::table('order_menus')->insert([
685:                DB::table('order_totals')->insert([
695:            DB::table('order_totals')->insert([
734:            $order = DB::table('orders')
809:            $updated = DB::table('orders')
848:            $table = DB::table('tables')
892:            $table = DB::table('tables')
936:                $callId = DB::table('waiter_calls')->insertGetId([
949:                DB::table('notifications')->insert([
997:                $noteId = DB::table('table_notes')->insertGetId([
1011:                DB::table('notifications')->insert([

PREFIX_REFACTOR_FINAL_REPORT.md
14:   - Fixed 7 `DB::table('ti_tables')` → `DB::table('tables')`
32:   - Fixed 5 instances: `DB::table('ti_tables')` → `DB::table('tables')`
190:- Replaced 7 `DB::table('ti_*')` calls
214:DB::table('menus')->get();  // Laravel adds 'ti_' prefix automatically
262:- Replace DB::table('ti_*') with DB::table('*') in routes and controllers
272:- routes.php (main routes - 7 DB::table + 2 raw SQL fixes)

PREFIX_REFACTOR_COMPLETE.md
15:   - Fixed 7 `DB::table('ti_tables')` → `DB::table('tables')`
31:   - Fixed 5 instances of `DB::table('ti_tables')` → `DB::table('tables')`
52:$cashierTable = DB::table('ti_tables')->where('table_name', 'Cashier')->first();
57:$cashierTable = DB::table('tables')->where('table_name', 'Cashier')->first();
279:- Replace DB::table('ti_*') with DB::table('*') in all route files and controllers
305:| 1 | routes.php | Removed ti_ from 7 DB::table() calls, fixed menu query with {$p}, fixed statuses in DB::raw() |
309:| 5 | tests/Feature/NotificationTest.php | Fixed 5 test DB::table('ti_tables') calls |
328:DB::table('tables')        // → ti_tables
329:DB::table('menus')         // → ti_menus  
330:DB::table('notifications') // → ti_notifications

tests/Feature/NotificationTest.php
42:        $tableId = DB::table('tables')->insertGetId([
69:        $tableId = DB::table('tables')->insertGetId([
97:        $tableId = DB::table('tables')->insertGetId([
124:        $tableId = DB::table('tables')->insertGetId([
156:        $tableId = DB::table('tables')->insertGetId([
189:        DB::table('notifications')->insert([

app/Http/Controllers/Api/MenuController.php
86:            $query = DB::table('menus')
152:            $category = DB::table('categories')
164:            $items = DB::table('menus')
229:            $tableInfo = DB::table('tables')

app/admin/controllers/Api/RestaurantController.php
177:            $table = \DB::table('tables')
229:            $tableInfo = \DB::table('tables')

CHANGES_APPLIED_DIFF.md
92:                $callId = DB::table('waiter_calls')->insertGetId([
105:                DB::table('notifications')->insert([
162:                $noteId = DB::table('table_notes')->insertGetId([
176:                DB::table('notifications')->insert([

TENANT_BLEED_INVESTIGATION_REPORT.md
822:5. **All queries use default** → `DB::table('orders')` uses `mysql` → `paymydine`
832:$orderId = DB::table('orders')->insertGetId([...]);

artifacts/flow-traces.md
148:        $orderNumber = DB::table('orders')->max('order_id') + 1;
151:        $orderId = DB::table('orders')->insertGetId([
176:            $menuItem = DB::table('menus')
186:            DB::table('order_menus')->insert([
202:**All queries** (`DB::table('orders')`, `DB::table('menus')`, `DB::table('order_menus')`):
270:        $updated = DB::table('orders')          // Line 810
282:**Line 810: `DB::table('orders')->where(...)->update(...)`**
332:        $rows = \Illuminate\Support\Facades\DB::table('notifications')  // Line 29
349:**Line 29: `DB::table('notifications')`**
391:        \Illuminate\Support\Facades\DB::table('notifications')->where('id', $id)->update([  // Line 47
407:**Line 47: `DB::table('notifications')->where('id', $id)->update(...)`**
452:        $settings = DB::table('settings')->get()->keyBy('item');  // Line 557
479:**Line 557: `DB::table('settings')->get()`**

artifacts/cache-qr-notes.md
78:        $table = DB::table('tables')
174:$rows = DB::table('notifications')->get();  // No caching
190:$setting = DB::table('settings')->where('item', $key)->first();  // No caching
223:    return DB::table('menus')->get();
235:    return DB::table('menus')->get();
266:        $table = DB::table('tables')->where('table_id', $tableId)->first();
275:        $locationData = DB::table('locationables')
361:        $cashierTable = DB::table('tables')->where('table_id', $cashierTableId)->first();
564:    return DB::table('menus')->get();
572:    return DB::table('menus')->get();

artifacts/middleware-diff.md
186:- `DB::table('orders')` → uses `tenant` connection → tenant-specific database ✓
214:- `DB::table('orders')` → uses `mysql` connection → now points to tenant database

artifacts/executive-summary.md
143:$orderId = DB::table('orders')->insertGetId([

artifacts/routes-matrix.md
254:        Route::get('/menu', function () { /* queries DB::table('menus') */ });
255:        Route::post('/orders', function () { /* inserts into DB::table('orders') */ }); // ⚠️
256:        Route::get('/settings', function () { /* queries DB::table('settings') */ });

TENANCY_OVERVIEW.md
162:DB::table('orders')
170:DB::table('orders')
209:| `app/admin/routes.php` | `DB::table()` | default (should be `tenant`) |
210:| `routes.php` | `DB::table()` | default (should be `tenant`) |
223:| `app/admin/routes.php:642` | `DB::table('orders')` | default (should be `tenant`) |
227:| `app/admin/routes.php:813` | `DB::table('orders')` | default (should be `tenant`) |
231:| `app/admin/routes.php:965` | `DB::table('notifications')` | default (should be `tenant`) |
251:DB::table('menus')
260:DB::table('menus')
267:DB::table('menus')
288:| `routes.php:459` | `DB::table('categories')` | `default` |
291:| `routes.php:527` | `DB::table('locations')` | `default` |
294:| `routes.php:556` | `DB::table('settings')` | `default` |
297:| `routes.php:638` | `DB::table('orders')` | `default` |
300:| `routes.php:809` | `DB::table('orders')` | `default` |
303:| `routes.php:949` | `DB::table('notifications')` | `default` |
306:| `routes.php:1011`| `DB::table('notifications')` | `default` |
332:DB::table('tenants')
353:DB::table('menus')
363:DB::table('menus')
373:DB::table('menus')
383:DB::table('menus')
389:DB::table('menus')
395:DB::table('menus')
419:DB::table('menus')
426:DB::table('menus')
441:DB::table('menus')
452:DB::table('menus')
459:DB::table('menus')
465:DB::table('menus')
471:DB::table('menus')
491:DB::table('menus')
498:DB::table('menus')

OPEN_QUESTIONS.md
300:DB::table('notifications')->insert([...]);
352:DB::table('orders')->insert([...]);
355:DB::table('orders')->insert([...]);
358:DB::table('orders')->insert([...]);
439:DB::table('orders')
442:DB::table('orders')

CONN_TRACE_NOTES.md
235:DB::table('orders')
285:DB::table('notifications')
332:DB::table('notifications')
378:DB::table('settings')
512:DB::table('orders')
547:DB::table('notifications')
580:DB::table('notifications')
616:DB::table('settings')

ROUTES_MIDDLEWARE_COVERAGE.md
103:| `/api/v1/orders/{id}` (update) | PUT | Closure | `DB::table('orders')->update()` | ⚠️ HIGH - Updates default DB |
104:| `/api/v1/orders` (create) | POST | Closure | `DB::table('orders')->insert()` | ⚠️ HIGH - Inserts into default DB |
105:| `/api/v1/menu` | GET | Closure | `DB::table('menus')` | ⚠️ HIGH - Reads from default DB |
106:| `/api/v1/restaurant` | GET | Closure | `DB::table('locations')`, `DB::table('settings')` | ⚠️ HIGH - Reads from default DB |
108:| `/api/v1/waiter-call` | POST | Closure | `DB::table('waiter_calls')->insert()` | ⚠️ HIGH - Inserts into default DB |
109:| `/api/v1/table-notes` | POST | Closure | `DB::table('table_notes')->insert()` | ⚠️ HIGH - Inserts into default DB |
114:| `/admin/notifications` (all) | GET | Notifications Controller | `DB::table('notifications')` | ⚠️ HIGH - Reads from default DB |
115:| `/admin/notifications/mark_as_read` | POST | Notifications Controller | `DB::table('notifications')->update()` | ⚠️ HIGH - Updates default DB |
118:| `/admin/orders/get-cashier-url` | GET | Closure | `DB::table('tables')`, `DB::table('locationables')` | ✅ LOW - Reads from tenant DB |
121:| `/admin/storefront-url` | GET | Closure | `DB::table('locations')` | ✅ LOW - Reads from tenant DB |
122:| `/admin/get_table_statuses` | GET | Closure | `DB::table('orders')` | ⚠️ HIGH - Reads from default DB |
123:| `/api/v1/categories` (all) | GET | Closure | `DB::table('categories')` | ⚠️ HIGH - Reads from default DB |
140:DB::table('orders')->insert(...)
145:DB::table('orders')->insert(...)
150:DB::table('orders')->update(...)

docs/FINDINGS_Admin_Logout_Issue.md
64:| `/admin/get_table_statuses` | `DB::table('orders')` | GET | `default` | ⚠️ High |
65:| `/admin/storefront-url` | `DB::table('locations')` | GET | `tenant` | ✅ Low |
66:| `/admin/orders/get-cashier-url` | `DB::table('tables')` | GET | `tenant` | ✅ Low |
69:DB::table('orders')
73:DB::table('locations')
77:DB::table('tables')

docs/ARCHITECTURE.md
343:4. **Database Interaction**: Uses `DB::table('orders')` (no explicit connection).
362:   - **Code:** `DB::table('orders')->where('order_id', $orderId)->update(...)`
372:   - **Code:** `DB::table('notifications')->insert(...)`
382:   - **Code:** `DB::table('settings')->get()`
392:   - **Code:** `DB::table('menus')` and `DB::table('categories')`
424:DB::table('orders')->insert(...)
434:DB::table('orders')->update(...)
444:DB::table('notifications')->insert(...)
453:DB::table('waiter_calls')->insert(...)
463:DB::table('table_notes')->insert(...)
473:DB::table('tables')->where(...)
482:DB::table('menus')->get()

... [508 lines truncated]






`grep -r "DB::select" .`

<file_content>
app/admin/routes.php
420:            $items = DB::select($query);
441:            $categories = DB::select($categoriesQuery);

routes.php
416:            $items = DB::select($query);
437:            $categories = DB::select($categoriesQuery);

PREFIX_REFACTOR_FINAL_REPORT.md
204:DB::select($query);

app/admin/database/migrations/2025_09_26_000001_add_columns_for_ti_tables_and_categories.php
34:            $exists = DB::select("SHOW INDEX FROM {$p}tables WHERE Key_name='idx_tables_table_no'");

database/migrations/2025_09_26_000001_add_columns_for_ti_tables_and_categories.php
34:            $exists = DB::select("SHOW INDEX FROM {$p}tables WHERE Key_name='idx_tables_table_no'");

app/Http/Controllers/Api/MenuController.php
37:            $items = DB::select($query);
61:            $categories = DB::select($categoriesQuery);
291:            $options = DB::select($optionsQuery, [$menuId]);
308:                $values = DB::select($valuesQuery, [$menuId, $option->id]);

app/admin/controllers/Api/RestaurantController.php
74:            $items = \DB::select($query);
103:            $categories = \DB::select($categoriesQuery);
143:            $categories = \DB::select($categoriesQuery);

artifacts/flow-traces.md
59:        $items = DB::select($query);  // Line 417
66:**Line 417: `DB::select($query)`**
69:1. `DB::select()` uses default facade

artifacts/cache-qr-notes.md
147:    $items = DB::select($query);  // No caching

TENANCY_OVERVIEW.md
211:| `app/Http/Controllers/Api/MenuController.php:36` | `DB::select($query)` | default (should be `tenant`) |

CONN_TRACE_NOTES.md
50:$items = DB::select($query);  // Line 36
54:- Method: `DB::select()` - uses default connection
67:$categories = DB::select($categoriesQuery);
114:$items = DB::select($query);  // Line 417
118:- Method: `DB::select()` - uses default connection
650:| `DB::select($rawSQL)` | Uses default connection |

ROUTES_MIDDLEWARE_COVERAGE.md
125:| `/api/v1/menu` | GET | Closure | `DB::select()` from ti_menus | ⚠️ HIGH - Reads from default DB |

docs/ARCHITECTURE.md
387:    - **Code:** Raw SQL queries without prepared statements (actually uses `DB::select($query)` which is safe)

full_differences.patch
105:-            $items = DB::select($query);
129:-            $categories = DB::select($categoriesQuery);
358:-            $options = DB::select($optionsQuery, [$menuId]);
375:-                $values = DB::select($valuesQuery, [$menuId, $option->id]);
428:+            $items = DB::select($query);
449:+            $categories = DB::select($categoriesQuery);
6445:-        $options = DB::select($optionsQuery, [$menuId]);
6462:-            $values = DB::select($valuesQuery, [$menuId, $option->id]);
6485:                         $items = DB::select($query);
6688:                         $items = DB::select($query);
12331:-        $options = DB::select($optionsQuery, [$menuId]);
12348:-            $values = DB::select($valuesQuery, [$menuId, $option->id]);
12378:             $items = DB::select($query);

app/main/routes.php
20:        $options = DB::select($optionsQuery, [$menuId]);
37:            $values = DB::select($valuesQuery, [$menuId, $option->id]);
155:                        $items = DB::select($query);
179:                        $categories = DB::select($categoriesQuery);
479:                        $items = DB::select($query);
503:                        $categories = DB::select($categoriesQuery);

app.main.routes.php  
101:                        $items = DB::select($query);
122:                        $categories = DB::select($categoriesQuery);
324:                        $items = DB::select($query);
345:                        $categories = DB::select($categoriesQuery);

app/admin/controllers/SuperAdminController.php
124:        $databaseExists = DB::select("SELECT SCHEMA_NAME FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME = ?", [$databaseName]);

root path route.php
128:            $items = DB::select($query);
149:            $categories = DB::select($categoriesQuery);
</file_content>



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
</file_content>



`grep -r "getTablePrefix" .`

<file_content>
app/admin/routes.php
401:            $p = DB::connection()->getTablePrefix();

FINAL_DEPLOYMENT_REPORT.md
113:$p = DB::connection()->getTablePrefix();
243:$p = DB::connection()->getTablePrefix();

routes.php
397:            $p = DB::connection()->getTablePrefix();

PREFIX_REFACTOR_FINAL_REPORT.md
77:$p = DB::connection()->getTablePrefix();  // ✅ Get prefix dynamically (= 'ti_')
202:$p = DB::connection()->getTablePrefix();  // Returns 'ti_'
263:- Use dynamic prefix ($p = DB::connection()->getTablePrefix()) for raw SQL

app/admin/database/migrations/2025_09_26_000001_add_columns_for_ti_tables_and_categories.php
9:        $p = DB::connection()->getTablePrefix();

PREFIX_REFACTOR_COMPLETE.md
89:$p = DB::connection()->getTablePrefix();
280:- Use dynamic prefix ($p = DB::connection()->getTablePrefix()) for raw SQL queries
336:$p = DB::connection()->getTablePrefix();

database/migrations/2025_09_26_000001_add_columns_for_ti_tables_and_categories.php
9:        $p = DB::connection()->getTablePrefix();

app/Http/Controllers/Api/MenuController.php
18:            $p = DB::connection()->getTablePrefix();
277:            $p = DB::connection()->getTablePrefix();

app/admin/controllers/Api/RestaurantController.php
54:            $p = \DB::connection()->getTablePrefix();
128:            $p = \DB::connection()->getTablePrefix();

full_differences.patch
3337:-            $prefix = DB::getTablePrefix();
3898:+            $prefix = DB::getTablePrefix();

app/system/database/migrations/2022_06_30_010000_drop_foreign_key_constraints_on_all_tables.php
38:                $table->dropIndexIfExists(sprintf('%s%s_%s_foreign', DB::getTablePrefix(), $tableName, $foreignKey));

app/admin/widgets/Lists.php
256:        return str_replace('@', DB::getTablePrefix().$table.'.', $sql);
281:                    $table = DB::getTablePrefix().$this->model->makeRelation($column->relation)->getTable();
291:                        : DB::getTablePrefix().$primaryTable.'.'.$column->columnName;

vendor/laravel/framework/src/Illuminate/Database/Console/DumpCommand.php
69:                ->withMigrationTable($connection->getTablePrefix().Config::get('database.migrations', 'migrations'))

app/admin/models/Categories_model.php
121:            $prefix = DB::getTablePrefix();

app/admin/models/Allergens_model.php
64:            $prefix = DB::getTablePrefix();

vendor/laravel/framework/src/Illuminate/Database/Schema/MySqlBuilder.php
41:        $table = $this->connection->getTablePrefix().$table;
56:        $table = $this->connection->getTablePrefix().$table;

vendor/laravel/framework/src/Illuminate/Database/Schema/Grammars/ChangeColumn.php
61:        $current = $schema->listTableDetails($grammar->getTablePrefix().$blueprint->getTable());

vendor/laravel/framework/src/Illuminate/Database/Schema/Grammars/RenameColumn.php
30:            $grammar->getTablePrefix().$blueprint->getTable(), $command->from

vendor/laravel/framework/src/Illuminate/Database/Schema/Grammars/SqlServerGrammar.php
196:            "'".str_replace("'", "''", $this->getTablePrefix().$blueprint->getTable())."'",
238:        $tableName = $this->getTablePrefix().$blueprint->getTable();

vendor/laravel/framework/src/Illuminate/Database/Schema/Grammars/Grammar.php
314:        $table = $this->getTablePrefix().$blueprint->getTable();

vendor/laravel/framework/src/Illuminate/Database/Schema/Grammars/SQLiteGrammar.php
275:                $this->getTablePrefix().$blueprint->getTable(), $name
352:        $indexes = $schemaManager->listTableIndexes($this->getTablePrefix().$blueprint->getTable());
368:            $platform->getDropIndexSQL($command->from, $this->getTablePrefix().$blueprint->getTable()),
369:            $platform->getCreateIndexSQL($newIndex, $this->getTablePrefix().$blueprint->getTable()),

vendor/laravel/framework/src/Illuminate/Database/Schema/PostgresBuilder.php
43:        $table = $this->connection->getTablePrefix().$table;
174:        $table = $this->connection->getTablePrefix().$table;

vendor/laravel/framework/src/Illuminate/Database/Schema/Builder.php
132:        $table = $this->connection->getTablePrefix().$table;
182:        $table = $this->connection->getTablePrefix().$table;
196:            $this->connection->getTablePrefix().$table

app/admin/database/migrations/2022_06_30_010000_drop_foreign_key_constraints_on_all_tables.php
38:                $table->dropIndexIfExists(sprintf('%s%s_%s_foreign', DB::getTablePrefix(), $tableName, $foreignKey));

vendor/laravel/framework/src/Illuminate/Database/Grammar.php
204:    public function getTablePrefix()

vendor/laravel/framework/src/Illuminate/Database/Connection.php
1421:    public function getTablePrefix()

vendor/tastyigniter/flame/src/Database/Relations/DeferOneOrMany.php
42:                            ->where($this->getOtherKey(), $this->parent->getConnection()->raw($this->parent->getConnection()->getTablePrefix().$this->related->getQualifiedKeyName()))
55:                            ->where($this->getOtherKey(), $this->parent->getConnection()->raw($this->parent->getConnection()->getTablePrefix().$this->related->getQualifiedKeyName()))
95:                ->whereRaw(DB::parse('id > ifnull((select max(id) from '.$this->parent->getConnection()->getTablePrefix().'deferred_bindings where
128:            $this->parent->getConnection()->getTablePrefix().$this->related->getQualifiedKeyName(),
</file_content>





`grep -r "middleware" .`

<file_content>
_investigation/logs/search_from_ti.md
54:artifacts/middleware-diff.md

_investigation/logs/search_db_table.md
172:artifacts/middleware-diff.md

_investigation/logs/search_tenant.md
8:27:| `f4d2551` | Recent | **Complete tenant isolation: remove all Builder ti_* hardcodes, enforce detect.tenant, fix middleware to switch default connection** |
9:28:| `8f5a6fd` | Recent | **Fix tenant bleed & ti_ti_ 500 errors: unified middleware, removed double-prefix, hardened config** |
10:32:| `ed36851` | Recent | **fix(tenancy): remove dual middleware, apply tenant mw to admin+api, fix domain match, add debug** |
16:69:**Assessment**: Major attempt to fix tenant isolation in middleware and database config.
23:112:Route::prefix('v1')->middleware(['detect.tenant'])->group(function () {
24:115:**Assessment**: Fixed double-prefix error and enforced tenant middleware on API routes.
25:119:### 2.4 Commit ed36851: "fix(tenancy): remove dual middleware, apply tenant mw to admin+api"
26:131:**Problem**: This commit **introduced the second tenant middleware**, creating the dual middleware issue documented in TENANCY_OVERVIEW.md.
41:288:- Line 122: `Route::prefix('v1')->middleware(['detect.tenant'])->group(function () {`
42:289:- 23 routes protected with `detect.tenant` middleware
43:300:- Lines 362-375: API routes with NO tenant middleware
44:301:- Lines 378-921: Frontend API routes with NO tenant middleware
58:434:**Expected**: Commits adding `detect.tenant` middleware to unprotected routes in `routes.php`
62:484:**Action**: Apply `detect.tenant` middleware to all unprotected tenant-facing routes
66:518:- Route protection (all tenant routes have middleware)
89:14:**Critical Finding**: The API endpoint `/admin/orders/get-table-qr-url` that should return tenant-specific URLs **explicitly bypasses tenant middleware**, compounding the issue for programmatic access.
90:17:- ✅ API endpoints (2/3 correctly use request host, but bypass tenant middleware)
91:53:**Tenant Context**: ✅ Has tenant middleware (via TastyIgniter admin framework)
95:204:│    Context: Has tenant middleware ✓                         │
101:312:| API `/orders/get-cashier-url` | ✅ Yes | tenant DB | Has middleware |
102:313:| Route `/admin/storefront-url` | ✅ Yes | tenant DB | Has middleware |
103:317:**Both route files explicitly bypass tenant middleware**:
110:549:- ⚠️ LOW - Blade view executes in tenant context (has middleware)
116:16:   - Added `detect.tenant` middleware to 3 route groups (lines 364, 378, 1064)
118:91:**Problem**: 0% of routes had tenant middleware  
122:164:fix(tenant-isolation): add detect.tenant middleware + remove hardcoded ti_ prefixes
124:220:routes.php:364:    'middleware' => ['api', 'detect.tenant']
125:221:routes.php:378:    'middleware' => ['web', 'detect.tenant']
126:222:routes.php:1064:Route::middleware(['web', 'admin', 'detect.tenant'])
129:366:0786f15   fix(tenant-isolation): add detect.tenant middleware + remove hardcoded ti_ prefixes
130:368:c0f37ae   Fix: Complete tenant isolation - Add detect.tenant middleware to all API routes
131:378:**Message**: fix(tenant-isolation): add detect.tenant middleware + remove hardcoded ti_ prefixes  
132:438:**Note**: Shows only middleware group name (TastyIgniter limitation), but detect.tenant IS in the code.
157:23:        Log::channel('tenant_detection')->info('DetectTenant middleware running for host: ' . $host);

CHANGELOG_LAST_30_DAYS.md
17:| `fd707fa` | Most recent | Fix: Enable CSRF middleware to prevent admin auto-logout |
27:| `f4d2551` | Recent | **Complete tenant isolation: remove all Builder ti_* hardcodes, enforce detect.tenant, fix middleware to switch default connection** |
28:| `8f5a6fd` | Recent | **Fix tenant bleed & ti_ti_ 500 errors: unified middleware, removed double-prefix, hardened config** |
32:| `ed36851` | Recent | **fix(tenancy): remove dual middleware, apply tenant mw to admin+api, fix domain match, add debug** |
43:- Multiple commits touch middleware, database config, and routing
69:**Assessment**: Major attempt to fix tenant isolation in middleware and database config.
106:Added or modified route middleware assignments. Possibly:
112:Route::prefix('v1')->middleware(['detect.tenant'])->group(function () {
115:**Assessment**: Fixed double-prefix error and enforced tenant middleware on API routes.
119:### 2.4 Commit ed36851: "fix(tenancy): remove dual middleware, apply tenant mw to admin+api"
131:**Problem**: This commit **introduced the second tenant middleware**, creating the dual middleware issue documented in TENANCY_OVERVIEW.md.
133:**Assessment**: **INTRODUCED PROBLEM** - added competing middleware implementation.
213:| `ed36851` | Added TenantDatabaseMiddleware | Created dual middleware conflict |
223:| `8f5a6fd` | Fixed ti_ti_ double prefix | Config and route middleware | ✓ Likely effective |
283:| `8f5a6fd` | +18, -3 | Added middleware to route groups |
288:- Line 122: `Route::prefix('v1')->middleware(['detect.tenant'])->group(function () {`
289:- 23 routes protected with `detect.tenant` middleware
300:- Lines 362-375: API routes with NO tenant middleware
301:- Lines 378-921: Frontend API routes with NO tenant middleware
357:1. Original system likely had single middleware approach
358:2. Commit `ed36851`: Added `TenantDatabaseMiddleware` (second middleware)
359:3. Commit message says "remove dual middleware" but actually introduced it
360:4. Current state: Two middleware coexist with different strategies
434:**Expected**: Commits adding `detect.tenant` middleware to unprotected routes in `routes.php`
471:**Action**: Choose one middleware strategy and remove the other:
484:**Action**: Apply `detect.tenant` middleware to all unprotected tenant-facing routes
518:- Route protection (all tenant routes have middleware)
531:ed36851: Added second middleware (introduced conflict) ⚠️
533:8f5a6fd: Fixed double-prefix and added route middleware
545:fd707fa: Fixed CSRF middleware (unrelated)

app/admin/routes.php
18:        'middleware' => ['web'],
210:    ->middleware([\Igniter\Flame\Foundation\Http\Middleware\TenantDatabaseMiddleware::class]);
215:        ->middleware('superadmin.auth') // Protect this route
220:    ->middleware('superadmin.auth') // Protect this route
225:    ->middleware('superadmin.auth') // Protect this route
367:    'middleware' => ['api']
382:    'middleware' => ['web']
930:        'middleware' => ['web', 'AdminAuthenticate'], // reuse existing admin auth alias
937:    Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
1078:Route::middleware(['web'])->prefix('admin/notifications-api')->group(function () {
1086:Route::middleware(['web', 'admin'])->group(function () {

TENANT_HOST_LEAK_INVESTIGATION.md
14:**Critical Finding**: The API endpoint `/admin/orders/get-table-qr-url` that should return tenant-specific URLs **explicitly bypasses tenant middleware**, compounding the issue for programmatic access.
17:- ✅ API endpoints (2/3 correctly use request host, but bypass tenant middleware)
53:**Tenant Context**: ✅ Has tenant middleware (via TastyIgniter admin framework)
112:**Status**: ✅ Host derivation correct, ❌ BUT middleware bypass causes DB query issues
204:│    Context: Has tenant middleware ✓                         │
303:   - Applied to: Admin routes (via TastyIgniter framework global middleware)
312:| API `/orders/get-cashier-url` | ✅ Yes | tenant DB | Has middleware |
313:| Route `/admin/storefront-url` | ✅ Yes | tenant DB | Has middleware |
317:**Both route files explicitly bypass tenant middleware**:
404:- Laravel handles proxy trust automatically via `TrustProxies` middleware
549:- ⚠️ LOW - Blade view executes in tenant context (has middleware)
601:- [x] **Tenant context status** documented (middleware active/bypassed)
645:2. `routes.php` (remove middleware bypass)
646:3. `app/admin/routes.php` (remove middleware bypass)
662:2. 🟡 **HIGH**: Remove middleware bypass (data consistency)

FINAL_DEPLOYMENT_REPORT.md
16:   - Added `detect.tenant` middleware to 3 route groups (lines 364, 378, 1064)
74:**All middleware** (5 files):
91:**Problem**: 0% of routes had tenant middleware  
164:fix(tenant-isolation): add detect.tenant middleware + remove hardcoded ti_ prefixes
212:$ php artisan route:list --columns=uri,middleware | grep "api/v1"
215:Shows only `web` or `api` middleware in output (TastyIgniter's `App::before()` limitation).
217:**BUT** the middleware IS in the code (verified):
220:routes.php:364:    'middleware' => ['api', 'detect.tenant']
221:routes.php:378:    'middleware' => ['web', 'detect.tenant']
222:routes.php:1064:Route::middleware(['web', 'admin', 'detect.tenant'])
366:0786f15   fix(tenant-isolation): add detect.tenant middleware + remove hardcoded ti_ prefixes
368:c0f37ae   Fix: Complete tenant isolation - Add detect.tenant middleware to all API routes
370:fd707fa   Fix: Enable CSRF middleware to prevent admin auto-logout
378:**Message**: fix(tenant-isolation): add detect.tenant middleware + remove hardcoded ti_ prefixes  
431:$ php artisan route:list --columns=uri,middleware | grep "api/v1" | head -5
438:**Note**: Shows only middleware group name (TastyIgniter limitation), but detect.tenant IS in the code.
446:- (app/admin/routes.php uses framework default middleware)
461:- All controllers, helpers, middleware
470:❌ 0% tenant middleware coverage  
477:✅ 100% tenant middleware coverage  
533:| **Tenant middleware added** | 3 route groups |

ALL_CHANGED_FILES_LIST.md
17:- ✅ Added `detect.tenant` middleware to 3 route groups (lines 364, 378, 1064)
251:  (104 files - tenant middleware + prefix refactor)
269:✅ **100%** tenant middleware coverage on API routes  

GITHUB_DEPLOYMENT_SUCCESS.md
5:**Commit**: `0786f15` - fix(tenant-isolation): add detect.tenant middleware + remove hardcoded ti_ prefixes  
27:**Message**: fix(tenant-isolation): add detect.tenant middleware + remove hardcoded ti_ prefixes
34:- ✅ Added `detect.tenant` middleware to all API routes

... and more
</file_content>




`grep -r "Route::group" .`

<file_content>
app/admin/routes.php
17:    Route::group([
364:Route::group([
380:Route::group([
928:    Route::group([
937:    Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
1067:    // Place AFTER the closing brace of the large Route::group([...]) in this file.
1068:    Route::group(['prefix' => 'admin/notifications-api'], function () {

routes.php
16:    Route::group([
361:Route::group([
376:Route::group([

CHANGES_APPLIED_DIFF.md
13:Route::group([
22:Route::group([
37:Route::group([
45:Route::group([
76:// Inside Route::group(['prefix' => 'api/v1', 'middleware' => ['web', 'detect.tenant']], function () {
247:Route::group(['middleware' => ['web']], function () {
273:Route::group([
290:Route::group(['prefix' => 'admin/notifications-api'], function () {

FINAL_TENANT_FIX_VERIFICATION.md
16:**New Location**: Inside `Route::group(['prefix' => 'api/v1', 'middleware' => ['web', 'detect.tenant']])` group (lines 376-1043)
24:**Removed**: `Route::group(['middleware' => ['web']])` wrapper that contained duplicate waiter-call and table-notes routes
124:Route::group([

CHANGES_SUMMARY.md
29:- Route::group(['prefix' => 'admin/notifications-api'], function () {
44:- Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
45:+ Route::group(['middleware' => ['web']], function () {

TENANT_FIX_APPLIED.md
51:Route::group(['middleware' => ['web']], function () {  // WAS: ['prefix' => 'api/v1', 'middleware' => ['web']]

TENANT_BLEED_INVESTIGATION_REPORT.md
269:Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
273:    Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
722:Route::group([
729:    Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
741:Route::group(['prefix' => 'admin/notifications-api'], function () {
853:Route::group([
862:Route::group([
878:Route::group([
886:Route::group([
926:Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
931:Route::group(['middleware' => ['web']], function () {  // REMOVE duplicate prefix

artifacts/flow-traces.md
635:Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
638:Route::group(['prefix' => 'api/v1', 'middleware' => ['web', 'detect.tenant']], function () {

artifacts/executive-summary.md
207:Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
210:Route::group(['prefix' => 'api/v1', 'middleware' => ['web', 'detect.tenant']], function () {
286:Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
289:Route::group(['middleware' => ['web']], function () {  // Remove duplicate prefix

artifacts/routes-matrix.md
151:**Cause**: Nested `Route::group(['prefix' => 'api/v1'])` in `routes.php:934` inside another group that already has `prefix => 'api/v1'` (line 378).
156:Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
160:    Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
230:    Route::group([
240:    Route::group([
250:    Route::group([
261:    Route::group([
269:    Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
275:    Route::group(['prefix' => 'admin/notifications-api'], function () {
293:    Route::group([
314:Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
317:Route::group(['prefix' => 'api/v1', 'middleware' => ['web', 'detect.tenant']], function () {
326:Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
330:Route::group(['middleware' => ['web']], function () {

CONN_TRACE_NOTES.md
82:Route::group([
210:Route::group([

ROUTES_MIDDLEWARE_COVERAGE.md
89:Route::group([
116:Route::group([
150:Route::group([
222:Route::group(['prefix' => 'admin/notifications-api'], function () {

ADMIN_LOGOUT_FIX_COMPLETE.md
184:Route::group([

docs/FINDINGS_Admin_Logout_Issue.md
240:Route::group([

docs/API_INVENTORY.md
1041:Route::group([

full_differences.patch
4495: Route::group([
4622:-Route::group([
4631:-Route::group(['prefix' => 'api/v1', 'middleware' => ['web']], function () {
4767:-// Place AFTER the closing brace of the large Route::group([...]) in this file.
4768:-Route::group(['prefix' => 'admin/notifications-api'], function () {

root path route.php
14:    Route::group([
87:Route::group([
102:Route::group([

app/main/routes.php
64:    Route::group([
71:        Route::group(['prefix' => 'api'], function () {

vendor/facade/ignition/src/IgnitionServiceProvider.php
183:        Route::group([

app/admin/old_routes.php
14:    Route::group([
87:Route::group([

app.main.routes.php  
10:    Route::group([
17:        Route::group(['prefix' => 'api'], function () {
</file_content>





`grep -r "\bcache\b" .`

<file_content>
_investigation/logs/search_db_select.md
37:artifacts/cache-qr-notes.md

_investigation/logs/search_db_table.md
160:artifacts/cache-qr-notes.md

_investigation/logs/search_tenant.md
11:39:| `35beb01` | Recent | **Fix tenant bleed: SSR tenant detection and cache isolation** |
27:137:### 2.5 Commit 35beb01: "Fix tenant bleed: SSR tenant detection and cache isolation"
45:329:**Created in commit**: `35beb01` (Fix tenant bleed: SSR tenant detection and cache isolation)
46:331:**Purpose**: Provide scoped cache keys to prevent cache collisions between tenants.
48:346:**Issue**: Global cache prefix not tenant-scoped.
50:395:35beb01: "Fix tenant bleed: SSR tenant detection and cache isolation"
65:517:- Cache entries (no cross-tenant cache hits)

CHANGELOG_LAST_30_DAYS.md
39:| `35beb01` | Recent | **Fix tenant bleed: SSR tenant detection and cache isolation** |
137:### 2.5 Commit 35beb01: "Fix tenant bleed: SSR tenant detection and cache isolation"
147:- **Created** `TableHelper.php` using scoped cache keys
149:**Assessment**: Added cache isolation helpers, but **only adopted in TableHelper**, not system-wide.
224:| `35beb01` | Added cache scoping helpers | Prevent cache bleed | ⚠️ Partially - not widely adopted |
329:**Created in commit**: `35beb01` (Fix tenant bleed: SSR tenant detection and cache isolation)
331:**Purpose**: Provide scoped cache keys to prevent cache collisions between tenants.
335:**Assessment**: **Good pattern, underutilized** - should be adopted everywhere cache is used.
339:### 4.7 config/cache.php
346:**Issue**: Global cache prefix not tenant-scoped.
348:**Assessment**: **NOT fixed** - cache isolation incomplete.
395:35beb01: "Fix tenant bleed: SSR tenant detection and cache isolation"
423:- Global cache keys
453:- No refactor of existing cache usage
507:**Action**: Refactor all `Cache::` and `cache()` calls to use `TenantHelper::scopedCacheKey()`
517:- Cache entries (no cross-tenant cache hits)
529:35beb01: Added cache scoping helpers (partial fix)

TENANT_HOST_LEAK_INVESTIGATION.md
369:**From `config/cache.php`**:
372:- Path: `storage/framework/cache/data`
375:- Routes cache: DISABLED (`enableRoutesCache => false`)
376:- Template cache: 10 minutes TTL
380:- Route cache disabled

ALL_CHANGED_FILES_LIST.md
186:- app/Helpers/TenantHelper.php (cache scoping utility)

GITHUB_DEPLOYMENT_SUCCESS.md
164:  - cache-qr-notes.md

PREFIX_REFACTOR_FINAL_REPORT.md
141:Configuration cache cleared!

PREFIX_REFACTOR_COMPLETE.md
196:Application cache cleared!
197:Route cache cleared!
198:Configuration cache cleared!

TENANT_FIX_COMPLETE_SUMMARY.md
57:Application cache cleared!
58:Route cache cleared!
59:Configuration cache cleared!

DEPLOYMENT_READY.md
46:Application cache cleared!
47:Route cache cleared!
48:Configuration cache cleared!

storage/logs/system.log
7201:[2025-09-25 21:29:36] production.ERROR: InvalidArgumentException: Please provide a valid cache path. in /var/www/paymydine/vendor/laravel/framework/src/Illuminate/View/Compilers/Compiler.php:36
7825:[2025-09-25 21:29:40] production.ERROR: InvalidArgumentException: Please provide a valid cache path. in /var/www/paymydine/vendor/laravel/framework/src/Illuminate/View/Compilers/Compiler.php:36
8150:[2025-09-25 21:30:14] production.ERROR: InvalidArgumentException: Please provide a valid cache path. in /var/www/paymydine/vendor/laravel/framework/src/Illuminate/View/Compilers/Compiler.php:36
8378:[2025-09-25 21:32:02] production.ERROR: InvalidArgumentException: Please provide a valid cache path. in /var/www/paymydine/vendor/laravel/framework/src/Illuminate/View/Compilers/Compiler.php:36
8466:[2025-09-25 21:32:17] production.ERROR: InvalidArgumentException: Please provide a valid cache path. in /var/www/paymydine/vendor/laravel/framework/src/Illuminate/View/Compilers/Compiler.php:36

FINAL_TENANT_FIX_VERIFICATION.md
49:Application cache cleared!
50:Route cache cleared!
51:Configuration cache cleared!

CHANGES_SUMMARY.md
88:php artisan cache:clear
254:- [x] Local cache cleared

README_TENANT_FIX.md
242:   - cache-qr-notes.md

TENANT_BLEED_INVESTIGATION_REPORT.md
631:**File**: `config/cache.php:18`
652:// Use tenant-scoped cache key to avoid cross-tenant cache collisions
1002:    'cache.headers' => \Illuminate\Http\Middleware\SetCacheHeaders::class,

artifacts/cache-qr-notes.md
5:**Cache**: Global prefix used, but caching is minimal in codebase (only TableHelper uses cache).
15:**File**: `config/cache.php`
33:    'path' => storage_path('framework/cache/data'),
37:**Cache files stored at**: `storage/framework/cache/data/`
43:**File**: `config/cache.php:98`
55:**⚠️ ISSUE**: Prefix is **global**, not tenant-scoped. All tenants share same cache prefix.
59:- Full cache key: `tenant_default_cache:menu_list`
61:- Cross-tenant cache poisoning ⚠️
67:**Search Results**: `Cache::remember|cache()`
75:    // Use tenant-scoped cache key to avoid cross-tenant cache collisions
130:- Different cache entries ✓
132:**✓ CORRECT**: TableHelper properly scopes cache keys.
212:- Global cache prefix is still wrong, but has minimal impact currently
221:// BAD - Global cache key
230:**GOOD - Scoped cache key**:
240:// Separate cache entries ✓
548:// config/cache.php:98
643:- ⚠️ Global cache prefix is wrong but has minimal impact currently
655:3. **LOW**: Update global cache prefix name (cosmetic)
682:# Check cache directory
683:ls -la storage/framework/cache/data/

artifacts/README.md
86:### 6. [cache-qr-notes.md](cache-qr-notes.md)
225:- cache-qr-notes.md (cache & QR analysis)

artifacts/executive-summary.md
485:6. **cache-qr-notes.md** - Cache prefix analysis and QR URL scoping issues

TENANCY_OVERVIEW.md
268:**Location**: `config/cache.php:98`
274:**⚠️ ISSUE**: Global prefix `tenant_default_cache` is NOT tenant-scoped. All tenants share the same cache prefix.
313:**⚠️ ADOPTION**: Only `TableHelper` uses scoped cache keys. Other parts of the codebase may not scope cache keys properly.
407:**Global cache prefix**: `tenant_default_cache` for all tenants
427:| `35beb01` | Recent | "Fix tenant bleed: SSR tenant detection and cache isolation" - Added TenantHelper and TableHelper |

INVESTIGATION_SUMMARY.md
25:- Global cache prefix (Section 7.1)
95:35beb01: Added cache scoping helpers (partial)
198:**Evidence**: `config/cache.php:98`
204:- All tenants share same cache prefix
206:- Only `TableHelper` uses scoped cache keys
267:3. Clear all caches: `php artisan cache:clear && php artisan route:clear`
356:- ✓ `app/Helpers/TenantHelper.php` - Provides scoped cache keys (good pattern)
357:- ✓ `app/Helpers/TableHelper.php` - Uses scoped cache keys (good implementation)
361:- ⚠️ `config/cache.php` - Global cache prefix (not tenant-scoped)
382:   - Check actual cache driver in use
388:   - Test cache isolation (if caching is used)
408:4. **MEDIUM: Adopt cache scoping system-wide**
410:   - OR change cache driver to redis with tenant-specific prefixes

OPEN_QUESTIONS.md
142:- Is route cache enabled (`php artisan route:cache`)?
146:- **Cache files**: `bootstrap/cache/routes-v7.php` or similar (if exists)
147:- **Clear cache**: Run `php artisan route:clear` and test
148:- **Config**: `config/cache.php` (line 18: `'default' => env('CACHE_DRIVER', 'file')`)
151:- Clear all caches: `php artisan cache:clear && php artisan route:clear && php artisan config:clear`
159:### Q7: What cache driver is actually in use?
162:- Is it file cache (default)?
169:- **Config**: `config/cache.php:18` (default is `file`)
174:  Route::get('/debug/cache', fn() => response()->json([
175:      'driver' => config('cache.default'),
176:      'prefix' => config('cache.prefix'),
181:- File cache: Each tenant needs file path scoping
183:- Database: Needs tenant_id in cache table
186:**Current config**: `config/cache.php:98` shows `'prefix' => env('CACHE_PREFIX', 'tenant_default_cache')`
192:### Q8: Is cache being used at all in affected flows?
199:- **Menu caching**: Search for `Cache::remember` or `cache()->remember` in:
209:**Assessment**: Cache bleed may not be the primary issue since most queries don't cache.
437:4. Cache in tenant A, verify tenant B gets different cache
523:| Q7 | Active cache driver | Check `.env` and `config/cache.php` | Inform cache isolation approach |
588:// Set cache in tenant A
589:cache()->put('test_key', 'from_amir', 60);
591:// Check cache in tenant B (same key)
592:$value = cache()->get('test_key');
593:// If $value === 'from_amir', cache is NOT isolated
597:cache()->put(TenantHelper::scopedCacheKey('test_key'), 'from_amir', 60);

ROUTES_MIDDLEWARE_COVERAGE.md
20:    'cache.headers' => \Illuminate\Http\Middleware\SetCacheHeaders::class,

app/Http/Kernel.php
46:        'cache.headers' => \Illuminate\Http\Middleware\SetCacheHeaders::class,

ADMIN_LOGOUT_FIX_COMPLETE.md
516:# Clear cache
518:php artisan cache:clear

README_INVESTIGATION.md
249:2. ⏳ **Clear cache** - `php artisan config:clear`

INVESTIGATION_INDEX.md
250:# 1. Clear cache (CSRF middleware was just enabled)
252:php artisan cache:clear
510:2. **Not persistent:** Lost on deployments, cache clears

docs/ADMIN_LOGOUT_SUMMARY.md
54:- Lost on deployments, cache clears, or container restarts

docs/FINDINGS_Admin_Logout_Issue.md
115:- If storage is cleared (cache clear, deployments), all sessions are invalidated
136:- ✅ Logout happens **after deployment or cache clear**
316:# 2. Network tab → Preserve log → Check "Disable cache"

patches/HOWTO.md
74:# 1. Clear compiled views and cache
76:php artisan cache:clear
251:# Clear cache
279:# Clear cache
307:# Clear cache
368:3. Clear cache: `php artisan config:clear`

patches/README.md
20:# Clear cache
22:php artisan cache:clear
309:# Clear cache

frontend/package-lock.json
4491:        "file-entry-cache": "^8.0.0",
5032:    "node_modules/file-entry-cache": {
5034:      "resolved": "https://registry.npmjs.org/file-entry-cache/-/file-entry-cache-8.0.0.tgz",
5039:        "flat-cache": "^4.0.0"
5074:    "node_modules/flat-cache": {

... and more
</file_content>



`grep -r "Cache::" .`

<file_content>
CHANGELOG_LAST_30_DAYS.md
507:**Action**: Refactor all `Cache::` and `cache()` calls to use `TenantHelper::scopedCacheKey()`

TENANT_BLEED_INVESTIGATION_REPORT.md
654:return Cache::remember($cacheKey, 300, function() use ($tableId) {

artifacts/cache-qr-notes.md
67:**Search Results**: `Cache::remember|cache()`
77:    return Cache::remember($cacheKey, 300, function() use ($tableId) {
222:Cache::remember('menu_list', 3600, function() {
234:Cache::remember($key, 3600, function() {
563:Cache::remember($key, 3600, function() {
571:Cache::remember('menu_list', 3600, function() {

TENANCY_OVERVIEW.md
308:return Cache::remember($cacheKey, 300, function() use ($tableId) {

OPEN_QUESTIONS.md
199:- **Menu caching**: Search for `Cache::remember` or `cache()->remember` in:
530:| Q8 | Cache usage extent | Search for `Cache::` calls | May not be primary issue |

app/Helpers/TableHelper.php
21:        return Cache::remember($cacheKey, 300, function() use ($tableId) {
78:        Cache::forget($cacheKey);

vendor/laravel/framework/src/Illuminate/Console/Scheduling/Schedule.php
199:        if (! Container::getInstance()->bound(Cache::class)) {
203:        if (! (new UniqueLock(Container::getInstance()->make(Cache::class)))->acquire($job)) {

app/main/classes/ChainFileSource.php
64:                Cache::forget($cacheKey);
67:            $pathCache[] = Cache::rememberForever($cacheKey, function () use ($source) {

app/main/classes/Router.php
116:                        Cache::put(
208:        $cached = $cacheable ? Cache::get($this->getUrlMapCacheKey(), false) : false;
223:                Cache::put(
243:        Cache::forget($this->getUrlMapCacheKey());
244:        Cache::forget($this->getUrlListCacheKey());
335:        $urlList = Cache::get($key, false);

app/main/classes/MediaLibrary.php
57:        $cached = Cache::get(self::$cacheKey, false);
73:            Cache::put(
342:        Cache::forget(self::$cacheKey);

app/system/helpers/CacheHelper.php
18:        Cache::flush();

app/system/aliases.php
10:    'Cache' => Illuminate\Support\Facades\Cache::class,

app/system/models/Mail_themes_model.php
72:        Cache::forget($cacheKey);
81:        if (Cache::has($cacheKey)) {
82:            return Cache::get($cacheKey);
87:            Cache::forever($cacheKey, $customCss);

app/system/classes/HubManager.php
59:        if ($force || !$response = Cache::get($cacheKey)) {
67:                Cache::put($cacheKey, $response, $this->cacheTtl);

vendor/laravel/framework/src/Illuminate/Queue/CallQueuedHandler.php
209:                    : $this->container->make(Cache::class);

app/system/traits/CombinesAssets.php
402:        if (!Cache::has($this->cacheKeyPrefix.$cacheKey)) {
406:        return @unserialize(@base64_decode(Cache::get($this->cacheKeyPrefix.$cacheKey)));
411:        if (Cache::has($this->cacheKeyPrefix.$cacheKey))
414:        Cache::forever($this->cacheKeyPrefix.$cacheKey, base64_encode(serialize($cacheData)));

vendor/laravel/framework/src/Illuminate/Queue/Middleware/WithoutOverlapping.php
65:        $lock = Container::getInstance()->make(Cache::class)->lock(

vendor/laravel/framework/src/Illuminate/Support/Facades/Event.php
43:        Cache::refreshEventDispatcher();
80:            Cache::refreshEventDispatcher();
101:            Cache::refreshEventDispatcher();
</file_content>





`grep -r "\bsession\b" .`

<file_content>
app/admin/routes.php
280:            // Save layout to database or session

storage/framework/views/3a20c69778831b0850a9a8d73cca7f2c04cd2b14.php
20:<?php if($messages = session('admin_errors', collect())->all()): ?>
32:        session()->forget('admin_errors')

routes.php
277:            // Save layout to database or session

storage/logs/system.log
41:[2025-09-25 21:13:56] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
86:[2025-09-25 21:13:56] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
129:[2025-09-25 21:13:56] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
170:[2025-09-25 21:13:56] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
204:[2025-09-25 21:13:56] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
236:[2025-09-25 21:13:56] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
265:[2025-09-25 21:13:56] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
292:[2025-09-25 21:13:56] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
317:[2025-09-25 21:13:56] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
340:[2025-09-25 21:13:56] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
361:[2025-09-25 21:13:56] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
379:[2025-09-25 21:13:56] production.ERROR: Symfony\Component\ErrorHandler\Error\FatalError: Uncaught Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
470:[2025-09-25 21:14:20] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
504:[2025-09-25 21:14:20] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
536:[2025-09-25 21:14:20] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
565:[2025-09-25 21:14:20] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
592:[2025-09-25 21:14:20] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
617:[2025-09-25 21:14:20] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
640:[2025-09-25 21:14:20] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
661:[2025-09-25 21:14:20] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
679:[2025-09-25 21:14:20] production.ERROR: Symfony\Component\ErrorHandler\Error\FatalError: Uncaught Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
770:[2025-09-25 21:15:20] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
804:[2025-09-25 21:15:20] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
836:[2025-09-25 21:15:20] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
865:[2025-09-25 21:15:20] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
892:[2025-09-25 21:15:20] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
917:[2025-09-25 21:15:20] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
940:[2025-09-25 21:15:20] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
961:[2025-09-25 21:15:20] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
979:[2025-09-25 21:15:20] production.ERROR: Symfony\Component\ErrorHandler\Error\FatalError: Uncaught Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
1070:[2025-09-25 21:16:20] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
1104:[2025-09-25 21:16:20] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
1136:[2025-09-25 21:16:20] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
1165:[2025-09-25 21:16:20] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
1192:[2025-09-25 21:16:20] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
1217:[2025-09-25 21:16:20] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
1240:[2025-09-25 21:16:20] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
1261:[2025-09-25 21:16:20] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
1279:[2025-09-25 21:16:20] production.ERROR: Symfony\Component\ErrorHandler\Error\FatalError: Uncaught Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
1370:[2025-09-25 21:17:20] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
1404:[2025-09-25 21:17:20] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
1436:[2025-09-25 21:17:20] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
1465:[2025-09-25 21:17:20] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
1492:[2025-09-25 21:17:20] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
1517:[2025-09-25 21:17:20] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
1540:[2025-09-25 21:17:20] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
1561:[2025-09-25 21:17:20] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
1579:[2025-09-25 21:17:20] production.ERROR: Symfony\Component\ErrorHandler\Error\FatalError: Uncaught Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236
1640:[2025-09-25 21:17:46] production.ERROR: Igniter\Flame\Exception\SystemException: Component "session" is not registered. in /var/www/paymydine/app/system/classes/ComponentManager.php:236

... and more
</file_content>






`grep -r "Storage::" .`

<file_content>
composer.lock
1922:                "psr/http-message": "Required to allow Storage::put to accept a StreamInterface (^1.0).",
</file_content>







`grep -r "media" .`

<file_content>
app/admin/routes.php
413:                LEFT JOIN {$p}media_attachments ma ON ma.attachment_type = 'menus' 
427:                    $item->image = "/api/media/" . $item->image;
502:            $imagePath = storage_path("app/public/assets/media/attachments/public/{$hash1}/{$hash2}/{$hash3}/{$filename}");
505:            $imagePath = storage_path('app/public/assets/media/attachments/public/' . $filename);

FINAL_DEPLOYMENT_REPORT.md
29:   - Fixed menu index query: `ti_menus`, `ti_categories`, `ti_media_attachments` → `{$p}menus`, etc.
33:   - Fixed getMenu(): `ti_menus`, `ti_categories`, `ti_media_attachments` → `{$p}menus`, etc.

ALL_CHANGED_FILES_LIST.md
22:- ✅ Fixed menu query: `ti_menus, ti_categories, ti_media_attachments` → `{$p}menus, {$p}categories, {$p}media_attachments`
34:- ✅ Fixed menu query: `ti_menu_categories, ti_media_attachments` → `{$p}menu_categories, {$p}media_attachments`
53:  - `LEFT JOIN ti_media_attachments` → `LEFT JOIN {$p}media_attachments`
71:  - `LEFT JOIN ti_media_attachments` → `LEFT JOIN {$p}media_attachments`

storage/framework/cache/data/9f/ac/9fac9087be966af1983f070f81a84632aa6177c5
2:";s:12:"published_at";s:27:"2025-03-04T22:15:51.000000Z";}i:2;a:3:{s:3:"tag";s:6:"v1.4.7";s:11:"description";s:40:"Fix issue with update button not working";s:12:"published_at";s:27:"2024-06-14T17:28:42.000000Z";}i:3;a:3:{s:3:"tag";s:6:"v1.4.7";s:11:"description";s:40:"Fix issue with update button not working";s:12:"published_at";s:27:"2024-06-14T17:28:42.000000Z";}}}}i:2;a:11:{s:4:"code";s:17:"igniter.socialite";s:4:"name";s:9:"Socialite";s:6:"author";s:10:"Sam Poyigi";s:11:"description";s:69:"Allows visitors to register/sign in with their social media accounts.";s:4:"type";s:9:"extension";s:4:"hash";s:40:"aa980c6d5a06a9da671e2a88859dc6b06d7e4775";s:7:"version";s:6:"v1.5.4";s:7:"package";s:29:"tastyigniter/ti-ext-socialite";s:4:"icon";a:6:{s:5:"class";s:11:"fa fa-users";s:5:"color";s:7:"#FFFFFF";s:5:"image";s:0:"";s:15:"backgroundColor";s:7:"#FF4900";s:15:"backgroundImage";N;s:6:"styles";s:40:"color:#FFFFFF; background-color:#FF4900;";}s:12:"published_at";s:27:"2022-11-01T15:44:38.000 [... omitted end of long line]

storage/framework/views/0db2dd7d263535b1a2e1fcc350f2fe23e9349642.php
20:        let imgElement = document.querySelector("#mediafinder-formdashboardlogo-dashboard-logo img");
28:                    let imgElementDash = document.querySelector("#mediafinder-formloaderlogo-loader-logo img");

routes.php
409:                LEFT JOIN {$p}media_attachments ma ON ma.attachment_type = 'menus' 
423:                    $item->image = "/api/media/" . $item->image;
498:            $imagePath = storage_path("app/public/assets/media/attachments/public/{$hash1}/{$hash2}/{$hash3}/{$filename}");
501:            $imagePath = storage_path('app/public/assets/media/attachments/public/' . $filename);

PREFIX_REFACTOR_FINAL_REPORT.md
15:   - Fixed menu query: `ti_menus`, `ti_categories`, `ti_media_attachments` → `{$p}menus`, `{$p}categories`, `{$p}media_attachments`
67:    LEFT JOIN ti_media_attachments ma ON ma.attachment_type = 'menus' ❌
89:    LEFT JOIN {$p}media_attachments ma ON ma.attachment_type = 'menus' ✅

PREFIX_REFACTOR_COMPLETE.md
20:   - Fixed menu index query: `ti_menus`, `ti_categories`, `ti_media_attachments` → `{$p}menus`, `{$p}categories`, etc.
24:   - Fixed getMenu(): `ti_menus`, `ti_categories`, `ti_media_attachments` → `{$p}menus`, etc.
28:   - Fixed menu query: `ti_menus`, `ti_categories`, `ti_media_attachments` → `{$p}menus`, etc.
79:    LEFT JOIN ti_media_attachments ma ON ma.attachment_type = 'menus' 
101:    LEFT JOIN {$p}media_attachments ma ON ma.attachment_type = 'menus' 

app/Http/Controllers/Api/MenuController.php
30:                LEFT JOIN {$p}media_attachments ma ON ma.attachment_type = 'menus' 
44:                    $item->image = "/api/media/" . $item->image;

app/admin/controllers/Api/RestaurantController.php
66:                LEFT JOIN {$p}media_attachments ma ON ma.attachment_type = 'menus' 

storage/logs/system.log
13596:[2025-09-25 22:37:52] production.ERROR: Exception: The provided path (/var/www/paymydine/storage/temp/public/ca8/144/82b/thumb_ca814482b53efeb5b07750691ccbb96b__122x122_contain.png) must be a relative path to the file, from the source root (/var/www/paymydine/assets/media/) in /var/www/paymydine/vendor/tastyigniter/flame/src/Database/Attach/Manipulator.php:215
40926:[2025-09-28 17:45:59] production.ERROR: Exception: The provided path (/var/www/paymydine/storage/temp/public/baa/68d/c10/thumb_baa68dc10ca887ba3b376a6f6c38e6cc__122x122_contain.png) must be a relative path to the file, from the source root (/var/www/paymydine/assets/media/) in /var/www/paymydine/vendor/tastyigniter/flame/src/Database/Attach/Manipulator.php:215
52360:[2025-09-28 18:20:01] production.ERROR: Exception: The provided path (/var/www/paymydine/storage/temp/public/69d/769/ee1/thumb_69d769ee125851ac1f7fe555fd857654__122x122_contain.jpg) must be a relative path to the file, from the source root (/var/www/paymydine/assets/media/) in /var/www/paymydine/vendor/tastyigniter/flame/src/Database/Attach/Manipulator.php:215

CHANGES_SUMMARY.md
98:# Check logs immediately

TENANT_BLEED_INVESTIGATION_REPORT.md
1024:**Next Step**: Remediation (awaiting approval to implement changes from Section F.5)

artifacts/flow-traces.md
52:            LEFT JOIN ti_media_attachments ma ON ma.attachment_type = 'menus' 
80:   - `ti_media_attachments` → `ti_ti_media_attachments` ⚠️
88:LEFT JOIN ti_ti_media_attachments ma ...  -- ⚠️ Double prefix
673:**Urgency**: CRITICAL - Fix immediately to prevent data privacy violations.

artifacts/README.md
6:**Status**: ✅ Investigation Complete | ⏸️ Remediation Pending
213:## Remediation Status
229:⏸️ **AWAITING APPROVAL** to implement remediation
231:**Recommended**: Implement Phase 1 fixes immediately (< 20 minutes) to stop active data bleed.
275:**Status**: Ready for remediation

artifacts/executive-summary.md
5:**Status**: Root cause identified, remediation plan provided  
198:### Phase 1: CRITICAL (Implement Immediately) 🔴
384:**Recommendation**: Implement Phase 1 immediately (< 20 minutes), test, then proceed with Phases 2-4.
498:**Recommended Action**: Implement Phase 1 fixes immediately (< 20 minutes) to stop active data bleed.
506:**Status**: Ready for remediation

TENANCY_OVERVIEW.md
240:| `app/Http/Controllers/Api/MenuController.php:29` | `LEFT JOIN ti_media_attachments` |
245:| `app/admin/controllers/Api/RestaurantController.php:65` | `LEFT JOIN ti_media_attachments` |

INVESTIGATION_SUMMARY.md
5:**Status**: Evidence collected, root causes identified, remediation not yet implemented
465:**Next action required**: Verify findings with reproduction tests, then proceed with remediation as separate task.
468:**Remediation Status**: ⏸️ PENDING (Awaiting approval to implement fixes)

OPEN_QUESTIONS.md
500:## 7. Priority Questions for Immediate Investigation

CONN_TRACE_NOTES.md
43:    LEFT JOIN ti_media_attachments ma ON ma.attachment_type = 'menus' 
107:    LEFT JOIN ti_media_attachments ma ON ma.attachment_type = 'menus' 

ADMIN_LOGOUT_FIX_COMPLETE.md
235:### Immediate (Already Done)

README_INVESTIGATION.md
247:### Immediate (Today)

INVESTIGATION_INDEX.md
173:### Immediate (Today/Tomorrow)

docs/ADMIN_LOGOUT_SUMMARY.md
147:### Immediate (Today)

docs/FINDINGS_Admin_Logout_Issue.md
442:## Immediate Actions Required

docs/README.md
67:  - 🔴 10 CRITICAL threats (fix immediately)
93:### Top 5 Security Risks (Fix Immediately)

docs/SECURITY_THREAT_MODEL.md
20:**Immediate Actions Required:**
1294:**Immediate Action Items (Next 7 Days):**

docs/DATA_MODEL.md
276:| `ti_media_attachments` | Uploaded images | 50-5K | ⚠️ |
309:| `ti_menus` | `ti_media_attachments` | `attachment_id` | ❌ No FK | Orphaned images |

docs/API_INVENTORY.md
74:| **DB Access** | `ti_menus`, `ti_categories`, `ti_menu_categories`, `ti_media_attachments` |
950:### 🔴 CRITICAL (Fix Immediately)

docs/ARCHITECTURE.md
562:   - Images served via PHP (`/api/media/{path}`)
676:3. **Read:** SECURITY_THREAT_MODEL.md for STRIDE analysis and remediations

About copy
440:alert: Immediate attention required, often for critical security issues.

full_differences.patch
98:-                LEFT JOIN ti_media_attachments ma ON ma.attachment_type = 'menus' 
112:-                    $item->image = "/api/media/" . $item->image;
421:+                LEFT JOIN ti_media_attachments ma ON ma.attachment_type = 'menus' 
435:+                    $item->image = "/api/media/" . $item->image;
2015:-                // Get media/images if available
2016:-                $media = DB::table('ti_media_attachments')
2021:-                $item->image = $media ? $media->path : null;
2064:-            // Get media/images
2065:-            $media = DB::table('ti_media_attachments')
2070:-            $item->image = $media ? $media->path : null;
2385:+                // Get media/images if available
2386:+                $media = DB::table('ti_media_attachments')
2391:+                $item->image = $media ? $media->path : null;
2434:+            // Get media/images
2435:+            $media = DB::table('ti_media_attachments')
2440:+            $item->image = $media ? $media->path : null;

... and more
</file_content>


`grep -r "url" .`

<file_content>
<active_editor_results>
Found 4 matching lines
/Users/amir/Downloads/paymydine-main-22/_investigation/logs/search_db_table.md (unsaved)
246:118:| `/admin/orders/get-cashier-url` | GET | Closure | `DB::table('tables')`, `DB::table('locationables')` | ✅ LOW - Reads from tenant DB |
247:121:| `/admin/storefront-url` | GET | Closure | `DB::table('locations')` | ✅ LOW - Reads from tenant DB |
256:65:| `/admin/storefront-url` | `DB::table('locations')` | GET | `tenant` | ✅ Low |
257:66:| `/admin/orders/get-cashier-url` | `DB::table('tables')` | GET | `tenant` | ✅ Low |
</active_editor_results>

<workspace_result workspace_path="/Users/amir/Downloads/paymydine-main-22">
Found at least 1166 matching lines
_investigation/logs/search_cache_facade.md
43:335:        $urlList = Cache::get($key, false);

_investigation/logs/search_db_table.md
246:118:| `/admin/orders/get-cashier-url` | GET | Closure | `DB::table('tables')`, `DB::table('locationables')` | ✅ LOW - Reads from tenant DB |
247:121:| `/admin/storefront-url` | GET | Closure | `DB::table('locations')` | ✅ LOW - Reads from tenant DB |
256:65:| `/admin/storefront-url` | `DB::table('locations')` | GET | `tenant` | ✅ Low |
257:66:| `/admin/orders/get-cashier-url` | `DB::table('tables')` | GET | `tenant` | ✅ Low |

_investigation/logs/search_middleware.md
26:89:14:**Critical Finding**: The API endpoint `/admin/orders/get-table-qr-url` that should return tenant-specific URLs **explicitly bypasses tenant middleware**, compounding the issue for programmatic access.
30:101:312:| API `/orders/get-cashier-url` | ✅ Yes | tenant DB | Has middleware |
31:102:313:| Route `/admin/storefront-url` | ✅ Yes | tenant DB | Has middleware |
92:14:**Critical Finding**: The API endpoint `/admin/orders/get-table-qr-url` that should return tenant-specific URLs **explicitly bypasses tenant middleware**, compounding the issue for programmatic access.
98:312:| API `/orders/get-cashier-url` | ✅ Yes | tenant DB | Has middleware |
99:313:| Route `/admin/storefront-url` | ✅ Yes | tenant DB | Has middleware |

_investigation/logs/search_tenant.md
89:14:**Critical Finding**: The API endpoint `/admin/orders/get-table-qr-url` that should return tenant-specific URLs **explicitly bypasses tenant middleware**, compounding the issue for programmatic access.
101:312:| API `/orders/get-cashier-url` | ✅ Yes | tenant DB | Has middleware |
102:313:| Route `/admin/storefront-url` | ✅ Yes | tenant DB | Has middleware |

storage/framework/sessions/r3ATOnouZ9y4aEBOBJqX10iliR417FchcnIFeu8U
1:a:6:{s:6:"_token";s:40:"o7whmrWtBAHChva4lgX5BcdaFmV4UTN6XRsKPWXM";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:68:"http://127.0.0.1:8001/admin/notifications-api/count?_t=1760042138836";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}s:3:"url";a:0:{}s:10:"admin_auth";a:2:{i:0;i:1;i:1;s:42:"lZ9vcUeWFOYSJHtAl2qIrVqHdMwvfvmDYYM6p0qsjD";}}

app/admin/routes.php
162:        Route::get('/orders/get-cashier-url', function (Request $request) {
167:                $url = rtrim($frontendUrl, '/').'/cashier?'.http_build_query([
174:                    'url'     => $url,
185:        Route::get('/storefront-url', function (Request $request) {
188:                $url = buildCashierTableUrl($locationId);
190:                if ($url) {
191:                    return redirect($url);
194:                    return redirect(root_url());
198:                return redirect(root_url());
298:    Route::get('/orders/get-table-qr-url', function (Request $request) {
345:                'qr_url' => $qrUrl,

TENANT_HOST_LEAK_INVESTIGATION.md
14:**Critical Finding**: The API endpoint `/admin/orders/get-table-qr-url` that should return tenant-specific URLs **explicitly bypasses tenant middleware**, compounding the issue for programmatic access.
49:$frontend_url = "{$scheme}://{$slug}.{$base}";
83:**Route**: `GET /admin/orders/get-table-qr-url?table_id={id}`  
104:curl "http://127.0.0.1:8001/admin/orders/get-table-qr-url?table_id=12"
105:# Returns: {"success":true,"qr_url":"http://127.0.0.1:8001/table/12?..."}
108:curl "http://amir.paymydine.com/admin/orders/get-table-qr-url?table_id=55"
109:# Returns: {"success":true,"qr_url":"http://amir.paymydine.com/table/55?..."}
147:**Route**: `GET /admin/orders/get-cashier-url?location_id={id}`  
156:{"success":true,"cashier_url":"https://amir.paymydine.com/table/1?location=1&guest=1&qr=cashier&..."}
167:**Route**: `GET /admin/storefront-url?location_id={id}`  
234:│    │    $url = "http://default.paymydine.com/table/12..."│ │
310:| API `/orders/get-table-qr-url` | ❌ **EXPLICITLY BYPASSED** | ⚠️ main DB | `->withoutMiddleware()` |
312:| API `/orders/get-cashier-url` | ✅ Yes | tenant DB | Has middleware |
313:| Route `/admin/storefront-url` | ✅ Yes | tenant DB | Has middleware |
321:Route::get('/orders/get-table-qr-url', function (Request $request) {
468:    'final_url' => $frontend_url,
477:    "final_url": "http://default.paymydine.com"
486:# Test get-table-qr-url endpoint
487:curl -v "http://127.0.0.1:8001/admin/orders/get-table-qr-url?table_id=12"
492:  "qr_url": "http://127.0.0.1:8001/table/12?location=1&guest=3&date=2025-10-09&time=20:05&qr=ms288NyK7y&table=12",
533:$frontend_url = $request->getScheme() . '://' . $request->getHost();
538:    $frontend_url .= ':' . $port;
636:| API get-table-qr-url | ✅ | ❌ | ❌ | ⚠️ Partial |
638:| API get-cashier-url | ✅ | ❌ | ✅ | ✅ Correct |
639:| Route storefront-url | ✅ | ❌ | ✅ | ✅ Correct |

storage/framework/sessions/8YSJRgiW1NxHNk3RMYiHKDTU2w02TGD5metwhbRc
1:a:4:{s:6:"_token";s:40:"Eiwp7beTO0mXpsjCgxF5JBHxfl9Ivlg1wD9QwBsK";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:37:"http://localhost:8000/api/v1/settings";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/PNYxmOsHpn8OFmvufoTqdMJhy9KsbuEe7v4j84em
1:a:4:{s:6:"_token";s:40:"THYuE1X5WTxxTNXMy0wEKwxTG4iYVc17GKqk4f8l";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:37:"http://localhost:8000/api/v1/settings";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/iSjzOl2aRzoZwcWyuRpV4IpIqMsY1IxjsWRxEZuV
1:a:4:{s:6:"_token";s:40:"haPomJ3rP10BkQH5VONJn0mkf06N6X9QXMcFuiSI";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:37:"http://localhost:8000/api/v1/settings";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

FINAL_DEPLOYMENT_REPORT.md
128:$frontendUrl = env('FRONTEND_URL', config('app.url'));
171:fix(qr-urls): apply request host fix to app/admin/routes.php QR generators
269:$frontendUrl = env('FRONTEND_URL', config('app.url'));
364:Latest →  fix(qr-urls): apply request host fix to app/admin/routes.php QR generators
383:**Message**: fix(qr-urls): apply request host fix to app/admin/routes.php QR generators  
502:curl https://rosana.paymydine.com/api/v1/menu
511:curl https://rosana.paymydine.com/api/v1/menu | jq '.data.items[].name'
512:curl https://amir.paymydine.com/api/v1/menu | jq '.data.items[].name'
516:curl "https://rosana.paymydine.com/admin/orders/get-table-qr-url?table_id=5"
517:# Should return: "qr_url": "https://rosana.paymydine.com/table/5..." ✅

ALL_CHANGED_FILES_LIST.md
37:  - /orders/get-cashier-url endpoint (line 166)
38:  - /orders/get-table-qr-url endpoint (lines 329-330)

GITHUB_DEPLOYMENT_SUCCESS.md
110:curl https://rosana.paymydine.com/api/v1/menu
121:curl https://rosana.paymydine.com/api/v1/menu | jq '.data.items[].name'
124:curl https://amir.paymydine.com/api/v1/menu | jq '.data.items[].name'

storage/framework/views/6aa366cebda034f7d7eaacb2d3aa24f76817c540.php
13:                <?php $__currentLoopData = $element; $__env->addLoop($__currentLoopData); foreach($__currentLoopData as $page => $url): $__env->incrementLoopIndices(); $loop = $__env->getLastLoop(); ?>
18:                            <a class="page-link" href="<?php echo e($url); ?>"><?php echo e($page); ?></a>

storage/framework/views/7cab09bd9f6e01bafadecf07d67ca9a963a1d624.php
13:        action="<?php echo e(current_url()); ?>"

storage/framework/views/de63ab983dfb49e6c77d9e6931c818ee420e2b3c.php
29:                href="<?php echo e(admin_url('updates')); ?>"
35:                href="<?php echo e(admin_url('settings')); ?>"

storage/framework/views/cf3d018001e064a9fc6fb578938aa2faa64b6875.php
26:                  <a id="notif-history-link" class="btn btn-light btn-sm" href="<?php echo e(url('/admin/history')); ?>">

storage/framework/views/ae1b42698d483a700f14533163023afa25100a1c.php
9:                <a class="logo" href="<?php echo e(admin_url('dashboard')); ?>">

routes.php
159:        Route::get('/orders/get-cashier-url', function (Request $request) {
164:                $url = rtrim($frontendUrl, '/').'/cashier?'.http_build_query([
171:                    'url'     => $url,
182:        Route::get('/storefront-url', function (Request $request) {
185:                $url = buildCashierTableUrl($locationId);
187:                if ($url) {
188:                    return redirect($url);
191:                    return redirect(root_url());
195:                return redirect(root_url());
295:        Route::get('/orders/get-table-qr-url', function (Request $request) {
342:                    'qr_url' => $qrUrl,

PREFIX_REFACTOR_FINAL_REPORT.md
319:curl https://rosana.paymydine.com/api/v1/menu | jq '.success'
323:curl https://rosana.paymydine.com/api/v1/categories | jq '.success'

PREFIX_REFACTOR_COMPLETE.md
256:curl -s https://rosana.paymydine.com/api/v1/menu | jq '.success'
262:curl -s https://rosana.paymydine.com/api/v1/categories | jq '.success'

app/admin/controllers/Api/RestaurantController.php
81:                    $item->image = url("/api/v1/images?file=" . urlencode($item->image));
202:                    'frontend_url' => "http://{$domain}/menu/table-{$table->table_id}"

storage/framework/sessions/tQjx8jtsnA2z4JWuswFz92KRi5WMfUdXzsn8vPya
1:a:4:{s:6:"_token";s:40:"4gY9jcyErI5271euGJn0MIqntg7gfrWbQtkuEl4S";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:37:"http://localhost:8000/api/v1/settings";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/HixJ5EDvOtYsmiCaAb5yCmYDesDakvTELqbRXirk
1:a:4:{s:6:"_token";s:40:"ddAfN6NZbrZzinIG2oXDkLEfJx3tnYMttzMkd4rW";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:37:"http://localhost:8000/api/v1/settings";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/LdIC7ks05qJ9O2hThfaCbjRnfu4EA1598jsyEB6Z
... and more
</file_content>


`grep -r "host" .`

<file_content>
_investigation/logs/search_middleware.md
27:90:17:- ✅ API endpoints (2/3 correctly use request host, but bypass tenant middleware)
44:157:23:        Log::channel('tenant_detection')->info('DetectTenant middleware running for host: ' . $host);
93:17:- ✅ API endpoints (2/3 correctly use request host, but bypass tenant middleware)

_investigation/logs/search_from_ti.md
62:18:ERROR 1064 (42000) at line 1: You have an error in your SQL syntax; check the manual that corresponds to your MySQL server version for the right syntax to use near ', status, db_host, db_user FROM ti_tenants LIMIT 20' at line 1
76:547:SELECT id, domain, database, subdomain, status, db_host FROM ti_tenants LIMIT 10;

_investigation/logs/search_tenant.md
88:12:**Root Cause**: The admin table edit blade view (`app/admin/views/tables/edit.blade.php`) constructs QR URLs using **database-stored `permalink_slug`** (value: `'default'`) instead of the **current HTTP request host**. This causes all QR codes to point to `http://default.paymydine.com` regardless of which tenant subdomain the admin is accessing.
90:17:- ✅ API endpoints (2/3 correctly use request host, but bypass tenant middleware)
156:22:        $host = $request->getHost();
157:23:        Log::channel('tenant_detection')->info('DetectTenant middleware running for host: ' . $host);
164:30:            $parts = explode('.', $host);
207:73:            'host' => $tenant->db_host ?? env('DB_HOST', '127.0.0.1'),

TENANT_HOST_LEAK_INVESTIGATION.md
12:**Root Cause**: The admin table edit blade view (`app/admin/views/tables/edit.blade.php`) constructs QR URLs using **database-stored `permalink_slug`** (value: `'default'`) instead of the **current HTTP request host**. This causes all QR codes to point to `http://default.paymydine.com` regardless of which tenant subdomain the admin is accessing.
17:- ✅ API endpoints (2/3 correctly use request host, but bypass tenant middleware)
19:- ✅ Helper functions (correctly use request host)
66:- No relationship to current HTTP request host (`127.0.0.1:8001` or `amir.paymydine.com`)
103:# From localhost
135:// From localhost: "http://127.0.0.1:8001/table/1?location=1&guest=1&qr=cashier&..."
236:│    │           WRONG! Should be current request host     │ │
359:- **Current problem**: Blade view uses this instead of request host
383:### 4.4 Localhost vs Production Behavior
385:**Localhost (`http://127.0.0.1:8001`):**
387:Request host: 127.0.0.1:8001
395:Request host: amir.paymydine.com
410:### 5.1 Scenario A: Localhost Development
464:    'request_host' => request()->getHost(),
473:    "request_host": "127.0.0.1:8001",
481:**Key Observation**: `request_host` is correct, but **ignored** in favor of `db_slug`.
497:**Finding**: API endpoint returns CORRECT URL (uses request host), but blade view shows WRONG URL (uses database slug).
503:### ✅ Hypothesis 1: Database slug instead of request host
574:- ✅ NO BREAKING CHANGE - Endpoint already returns correct host
584:- Not for URL building (use request host instead)
650:**Testing Required**: 2 scenarios (localhost + subdomain)

storage/framework/sessions/8YSJRgiW1NxHNk3RMYiHKDTU2w02TGD5metwhbRc
1:a:4:{s:6:"_token";s:40:"Eiwp7beTO0mXpsjCgxF5JBHxfl9Ivlg1wD9QwBsK";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:37:"http://localhost:8000/api/v1/settings";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/PNYxmOsHpn8OFmvufoTqdMJhy9KsbuEe7v4j84em
1:a:4:{s:6:"_token";s:40:"THYuE1X5WTxxTNXMy0wEKwxTG4iYVc17GKqk4f8l";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:37:"http://localhost:8000/api/v1/settings";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/iSjzOl2aRzoZwcWyuRpV4IpIqMsY1IxjsWRxEZuV
1:a:4:{s:6:"_token";s:40:"haPomJ3rP10BkQH5VONJn0mkf06N6X9QXMcFuiSI";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:37:"http://localhost:8000/api/v1/settings";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

FINAL_DEPLOYMENT_REPORT.md
122:**Problem**: QR codes used localhost URLs  
171:fix(qr-urls): apply request host fix to app/admin/routes.php QR generators
353:✅ **QR/cashier URLs use request host** (6 locations fixed: 3 in routes.php + 3 in app/admin/routes.php)  
364:Latest →  fix(qr-urls): apply request host fix to app/admin/routes.php QR generators
383:**Message**: fix(qr-urls): apply request host fix to app/admin/routes.php QR generators  
473:❌ QR codes broken (localhost URLs)  

GITHUB_DEPLOYMENT_SUCCESS.md
40:- ✅ Use tenant-specific subdomains (not localhost)
179:❌ QR codes pointed to localhost (broken)  

storage/framework/sessions/tQjx8jtsnA2z4JWuswFz92KRi5WMfUdXzsn8vPya
1:a:4:{s:6:"_token";s:40:"4gY9jcyErI5271euGJn0MIqntg7gfrWbQtkuEl4S";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:37:"http://localhost:8000/api/v1/settings";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/HixJ5EDvOtYsmiCaAb5yCmYDesDakvTELqbRXirk
1:a:4:{s:6:"_token";s:40:"ddAfN6NZbrZzinIG2oXDkLEfJx3tnYMttzMkd4rW";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:37:"http://localhost:8000/api/v1/settings";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/LdIC7ks05qJ9O2hThfaCbjRnfu4EA1598jsyEB6Z
1:a:4:{s:6:"_token";s:40:"aj3lxipQuGhB2EVlVahnmU09fg2IIrz7T6nnayrV";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:37:"http://localhost:8000/api/v1/settings";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/YoD1tJ2Y0dg7ccftx1jGS21Sza6tSb7LbAsoJLmR
1:a:4:{s:6:"_token";s:40:"1b3T8VxAQ5O4VQ5YZGYbKnhbt6RtCPaNSh5JdotL";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:65:"http://localhost:8000/api/v1/table-info?qr=ms288NyK7y&table_no=12";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/CVXsR0HAnaVLLAXa0N69eCVU717MVMifmb8e3oaX
1:a:4:{s:6:"_token";s:40:"m0S1m0mnzhqLUPr4hrw1U69K8yaMYsfM0MmoYezQ";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:50:"http://localhost:8000/api/v1/menu?_t=1760036479571";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/HSaPfmui0y9UasFKFC3imTVn4VwJU8fQW9S7h5WY
1:a:4:{s:6:"_token";s:40:"9H3jrQTAgUiDyV7D2My5xdy5Zd8RWfbUKbyqvVQN";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:37:"http://localhost:8000/api/v1/payments";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/LMGxind8chhpABSjbe6tAgrlnGQtEcEiofXVZniA
1:a:4:{s:6:"_token";s:40:"q1ukF6QwzgGHdSmwZq4miqrMK2L81RVkldYm1TEt";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:37:"http://localhost:8000/api/v1/settings";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/OlVakq00vNsHcfs51KQptqADo3z8uL7jvu2Bk6B3
1:a:4:{s:6:"_token";s:40:"AT9S1IrnjKdZRjyxKhodLRnpDfl6Q8OvR9qgaU0G";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:37:"http://localhost:8000/api/v1/payments";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/UZbykEVMzJu426ler1p68r9fbhwz7tZkHZln6GVV
1:a:4:{s:6:"_token";s:40:"TFqTEuGbfyYtOSA2wDP0AKQxEIGGv7fawQqAfWui";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:37:"http://localhost:8000/api/v1/settings";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/79K2eqJ3xX65EfcMnptAq5ByL6jz0y9zEfL3BRhA
1:a:4:{s:6:"_token";s:40:"spZAjOOoQ9THyaNr3V2IBbxvWtD78vhT1PEA0IIX";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:70:"http://localhost:8000/api/v1/table-info?qr_code=ms288NyK7y&table_no=12";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/GH42zNH1VVCQQifQZEMRf0CtJ5upWjQknZlTZ8rS
1:a:4:{s:6:"_token";s:40:"o0kBQP2Stf3j5sMZFGSQI4kC9oGwPPsYHJt3C8rc";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:37:"http://localhost:8000/api/v1/settings";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/yW6c4BDtWzkR8gn6gGbO7hokCcBBxcdFhpHtU1Tb
1:a:4:{s:6:"_token";s:40:"sE2fa2is84kZ8BWZtJDTK6oaeg3n5NlF8vUsCbi1";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:37:"http://localhost:8000/api/v1/settings";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/JCYp79fZq53zi3hvZ2cN83BczD7eYMkV77rcltkN
1:a:4:{s:6:"_token";s:40:"atyM7xH35gEMvnGuBzmLNewy1CEQ5F9mtiO3gL1A";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:37:"http://localhost:8000/api/v1/settings";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/kOUWPMk6byqWQFDOfJhtOqo9kJpL85HCb61iWg0H
1:a:4:{s:6:"_token";s:40:"YpprqGzxmuAtEpQyUCrjYVJMuYpF7KZK317kqqCv";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:65:"http://localhost:8000/api/v1/table-info?qr=ms288NyK7y&table_no=12";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/YtInIbVGqYj9ZeR7JgC5YdPwebnLG7qRUHt7T9RE
1:a:4:{s:6:"_token";s:40:"n32VTD5BmEobV0OSvrY78i5Wx6tjrvn9seBcA5df";s:7:"igniter";a:1:{s:11:"translation";a:1:{s:6:"locale";s:2:"en";}}s:9:"_previous";a:1:{s:3:"url";s:37:"http://localhost:8000/api/v1/settings";}s:6:"_flash";a:2:{s:3:"old";a:0:{}s:3:"new";a:0:{}}}

storage/framework/sessions/PY1hUX88ejc6LBPjO8XSv1wpyW5Fa8Whmqk944W3
... and more



`grep -r "subdomain" .`

<file_content>
_investigation/logs/search_from_ti.md
71:50:- **Live database**: `SELECT id, domain, database, subdomain FROM ti_tenants LIMIT 10;`
76:547:SELECT id, domain, database, subdomain, status, db_host FROM ti_tenants LIMIT 10;

_investigation/logs/search_tenant.md
88:12:**Root Cause**: The admin table edit blade view (`app/admin/views/tables/edit.blade.php`) constructs QR URLs using **database-stored `permalink_slug`** (value: `'default'`) instead of the **current HTTP request host**. This causes all QR codes to point to `http://default.paymydine.com` regardless of which tenant subdomain the admin is accessing.
121:123:**Solution**: Use tenant-specific subdomain
161:27:            $subdomain = $request->header('X-Tenant-Override');
162:28:            Log::channel('tenant_detection')->info('Using X-Tenant-Override header: ' . $subdomain);
165:31:            $subdomain = $parts[0];
166:32:            Log::channel('tenant_detection')->info('Extracted subdomain: ' . $subdomain);
169:35:        if ($subdomain === 'www' || $subdomain === env('APP_DOMAIN', 'paymydine.com')) {
174:40:        $tenant = $this->resolveTenant($subdomain);
177:43:            Log::channel('tenant_detection')->error('Tenant not found for subdomain: ' . $subdomain);
188:54:    protected function resolveTenant($subdomain)
192:58:            return DB::connection('mysql')->table('tenants')->where('subdomain', $subdomain)->first();
227:93:        Log::channel('tenant_detection')->info('Successfully configured and set default connection to tenant: ' . $tenant->subdomain . ' (DB: ' . $tenant->db_name . ')');

TENANT_HOST_LEAK_INVESTIGATION.md
12:**Root Cause**: The admin table edit blade view (`app/admin/views/tables/edit.blade.php`) constructs QR URLs using **database-stored `permalink_slug`** (value: `'default'`) instead of the **current HTTP request host**. This causes all QR codes to point to `http://default.paymydine.com` regardless of which tenant subdomain the admin is accessing.
107:# From subdomain  
136:// From subdomain: "https://amir.paymydine.com/table/1?location=1&guest=1&qr=cashier&..."
358:- Purpose: Originally intended for location-specific subdomains
650:**Testing Required**: 2 scenarios (localhost + subdomain)

FINAL_DEPLOYMENT_REPORT.md
123:**Solution**: Use tenant-specific subdomain
505:# [2024-10-09 XX:XX:XX] local.INFO: Switched to tenant database: rosana for subdomain: rosana
515:# Test 2: QR URLs use tenant subdomain

GITHUB_DEPLOYMENT_SUCCESS.md
40:- ✅ Use tenant-specific subdomains (not localhost)
115:[2024-10-09 XX:XX:XX] local.INFO: Switched to tenant database: rosana for subdomain: rosana
187:✅ QR codes use tenant subdomains  
198:- [ ] Different menus per subdomain

CHANGES_APPLIED_DIFF.md
354:1. Logs show: `"Switched to tenant database: rosana for subdomain: rosana"`
355:2. Different menus per subdomain
357:4. QR URLs contain tenant subdomain (not localhost)

TENANT_FIX_COMPLETE_SUMMARY.md
139:[2024-10-09 XX:XX:XX] local.INFO: Switched to tenant database: rosana for subdomain: rosana

DEPLOYMENT_READY.md
153:[2024-10-09 XX:XX:XX] local.INFO: Switched to tenant database: rosana for subdomain: rosana

FINAL_TENANT_FIX_VERIFICATION.md
207:[2024-10-09 XX:XX:XX] local.INFO: Switched to tenant database: rosana for subdomain: rosana
251:- [ ] Menus/notes observed from two subdomains are isolated (requires server deploy + testing)
278:3. **Test HTTP requests** from both subdomains

CHANGES_SUMMARY.md
104:[2024-10-09 19:30:00] local.INFO: Switched to tenant database: rosana for subdomain: rosana
205:- Confirming different data per subdomain

TENANT_FIX_APPLIED.md
91:**Result**: QR now uses tenant subdomain (e.g., `https://rosana.paymydine.com`)
106:**Result**: Cashier URL uses tenant subdomain
122:**Result**: Table QR URLs use tenant subdomain
165:# Log::info("Switched to tenant database: {$tenant->database} for subdomain: {$subdomain}");
172:# Expected: "Switched to tenant database: rosana for subdomain: rosana"
186:    'subdomain' => $subdomain,
290:- [ ] Test menu API: Different data per subdomain?
292:- [ ] Test QR codes: Use tenant subdomain URLs?
304:[2024-10-09 19:30:00] local.INFO: Switched to tenant database: rosana for subdomain: rosana
309:[2024-10-09 19:31:00] local.INFO: Switched to tenant database: amir for subdomain: amir
342:// Line 27, right after subdomain resolution
344:    'subdomain' => $subdomain,
405:6. **Test QR codes work with tenant subdomains**

README_TENANT_FIX.md
27:- Fixed QR URLs to use tenant subdomain (not localhost)
78:[2024-10-09 XX:XX:XX] local.INFO: Switched to tenant database: rosana for subdomain: rosana
185:**Check 2**: Does subdomain match?
201:    'subdomain' => $subdomain,
290:**Expected Log**: "Switched to tenant database: rosana for subdomain: rosana"  

TENANT_BLEED_INVESTIGATION_REPORT.md
300:$subdomain = $request->header('X-Tenant-Subdomain') 
319:    // If we have at least 3 parts (subdomain.domain.tld), return the first part
339:    ->where('domain', 'like', $subdomain . '.%')
340:    ->orWhere('domain', $subdomain)
399:    // Extract subdomain (e.g., "rosana" from "rosana.paymydine.com")
523:- Domain format: `{subdomain}.paymydine.com`
524:- Database naming: Simple subdomain (`rosana`, not `rosana_db` or `tenant_rosana`)
595:**Result**: QR URLs point to localhost, not tenant subdomain.

artifacts/cache-qr-notes.md
7:**QR URLs**: Use global `FRONTEND_URL` instead of tenant-specific subdomains, potentially directing customers to wrong tenant's menu.
443:3. Browser opens Rosana's subdomain
471:- No subdomain differentiation
476:**Still wrong** - needs tenant-specific subdomain.
504:- Each tenant's QR points to their own subdomain ✓
603:**Impact**: QR codes will use tenant-specific subdomain.
694:4. Verify URL opens correct tenant subdomain

artifacts/README.md
91:- QR URLs: Use localhost, not tenant subdomains

artifacts/middleware-diff.md
21:| **Tenant Lookup** | LIKE pattern: `'domain', 'like', $subdomain . '%'` | Exact match: `'domain', $tenant . '.paymydine.com'` |
38:$subdomain = $request->header('X-Tenant-Subdomain') 
53:    // If we have at least 3 parts (subdomain.domain.tld), return the first part
72:- Standard subdomain parsing
88:    // Extract subdomain (e.g., "rosana" from "rosana.paymydine.com")
120:    ->where('domain', 'like', $subdomain . '.%')
121:    ->orWhere('domain', $subdomain)
265:    Log::warning("No tenant found for subdomain: {$subdomain}");
356:2. Domain format: `{subdomain}.paymydine.com` (full domain with suffix)
357:3. Database name: Simple subdomain without prefix/suffix (`rosana` not `rosana_db`)

artifacts/executive-summary.md
344:# Expected: "Switched to tenant database: rosana for subdomain: rosana"
471:4. **QR codes are broken** - Point to localhost, not tenant subdomains

TENANCY_OVERVIEW.md
17:$subdomain = $request->header('X-Tenant-Subdomain') 
23:- Splits host by `.` and checks for minimum 3 parts (subdomain.domain.tld)
30:    ->where('domain', 'like', $subdomain . '.%')
31:    ->orWhere('domain', $subdomain)
35:- Matches subdomain against `domain` column with flexible pattern
60:- `DetectTenant`: Uses flexible LIKE pattern (`'domain', 'like', $subdomain . '.%'`)

INVESTIGATION_SUMMARY.md
220:- QR codes use global URL instead of tenant-specific subdomain
405:   - Use current request subdomain instead of global FRONTEND_URL

OPEN_QUESTIONS.md
37:### Q2: How does ti_tenants.domain map to subdomains?
41:- Or as `amir` (subdomain only)?
50:- **Live database**: `SELECT id, domain, database, subdomain FROM ti_tenants LIMIT 10;`
53:- `DetectTenant.php:31`: Uses `->where('domain', 'like', $subdomain . '.%')`
276:  - Only current subdomain's tenant?
342:3. Customer scans QR, goes to amir's subdomain
360:- Does frontend make API calls to tenant-specific subdomain?
377:- Verify API calls go to `amir.paymydine.com/api/v1/menu` (not different subdomain)
379:**⚠️ Risk**: If frontend calls wrong subdomain, it will get wrong tenant's data even if backend is fixed.
387:- Could it be stripping or modifying subdomain headers?
392:  $subdomain = $request->header('X-Tenant-Subdomain') 
400:  - If frontend is on Vercel, how does it handle subdomains?
409:      'resolved' => $subdomain,
413:- Check logs to see which header/method provided subdomain
469:- Line 55 of `DetectTenant.php`: "Switched to tenant database: {database} for subdomain: {subdomain}"
547:SELECT id, domain, database, subdomain, status, db_host FROM ti_tenants LIMIT 10;

CONN_TRACE_NOTES.md
23:   - Resolves tenant from subdomain
689:Log::info("Switched to tenant database: {$tenant->database} for subdomain: {$subdomain}");
692:Expected in logs: `Switched to tenant database: amir_db for subdomain: amir`

ROUTES_MIDDLEWARE_COVERAGE.md
363:- Main domain routes (non-subdomain)

INVESTIGATION_INDEX.md
133:1. **Multi-tenancy via subdomain + DB switching** (DetectTenant middleware)
152:- [x] Probed tenancy system (subdomain detection, DB switching)

docs/FINDINGS_Admin_Logout_Issue.md
5:**Environment:** HTTP (no TLS), multi-tenant via subdomain, Laravel + TastyIgniter  
167:- If `SESSION_DOMAIN=.paymydine.com` is set, cookie applies to all subdomains
176:# Bad: .paymydine.com (wildcard) or tenant1.paymydine.com (wrong subdomain)
180:- ✅ Logout happens **only on specific subdomains**

docs/README.md
22:  - Multi-tenant architecture with subdomain-based tenant detection

docs/DEPLOYMENT.md
493:# Tenant subdomains (wildcard)

docs/SECURITY_THREAT_MODEL.md
683:+        // Add tenant subdomains dynamically

docs/ARCHITECTURE.md
81:2. DetectTenant middleware extracts subdomain "rosana"
128:    // If we have at least 3 parts (subdomain.domain.tld), return the first part
361:   - **Code:** `$subdomain = $request->header('X-Tenant-Subdomain') ?? ...`
474:    ↓ Extract subdomain → Query ti_tenants → Switch DB

tenant-icons-map.csv
... and more




## Multi-Tenancy Isolation Investigation: Executive Summary

This document summarizes the findings of a codebase-wide investigation into the multi-tenant isolation mechanisms of the PayMyDine application. The focus was on database access, file storage, and request scoping.

### 1. High-Level Overview of Tenant Context

The application establishes tenant context using a subdomain-driven approach. The core of this mechanism is the `App\Http\Middleware\DetectTenant` middleware.

**Request Flow:**
1.  An incoming request hits the server (e.g., `https://amir.paymydine.com`).
2.  The `DetectTenant` middleware intercepts the request.
3.  It extracts the subdomain (`amir`) from the request's host.
4.  It queries a central `mysql` database, specifically the `ti_tenants` table, to find a tenant record matching the subdomain.
5.  Upon finding a tenant, it dynamically configures a new database connection named `tenant` using the credentials stored in the tenant's record.
6.  Crucially, it **sets the default database connection to `tenant`** for the remainder of the request lifecycle.
7.  The request then proceeds to the appropriate controller and executes business logic, with all subsequent database queries automatically targeting the tenant's dedicated database.

This approach is generally robust and a standard practice for multi-tenant Laravel applications.

### 2. Key Findings & Attention Points

While the core tenancy model is sound, the investigation revealed several inconsistencies and areas that require attention. These are prioritized by risk level.

#### 🔴 CRITICAL RISK
*   **Unprotected Admin API Route**: A backward-compatibility route for admin notifications (`/admin/notifications-api`, defined in `app/admin/routes.php` lines 1078-1083) **lacks any tenant middleware**. This is a critical security gap. Any database queries performed by this endpoint will execute on the default `mysql` connection, which could be the main database or, even worse, the database of the previously authenticated tenant, leading to a high risk of data leakage.

#### 🟡 MEDIUM RISK
*   **Dual Middleware Implementations**: The codebase contains two distinct tenant middleware: `DetectTenant` and `TenantDatabaseMiddleware`. `DetectTenant` is the modern, correct implementation. `TenantDatabaseMiddleware` is an older, riskier version that modifies the shared `mysql` connection configuration directly. While `DetectTenant` is used for most API routes, the older middleware is still referenced in `app/admin/routes.php`, and a number of superadmin routes are configured to bypass it. This creates confusion and increases the risk of misconfiguration. The application should be standardized to use only the `DetectTenant` middleware.
*   **Global Cache Prefix**: The cache is configured with a global prefix (`tenant_default_cache` in `config/cache.php`). While a `TenantHelper::scopedCacheKey()` method exists to create tenant-specific cache keys, its adoption is not enforced globally. Only `TableHelper` uses it. Any other part of the application using Laravel's cache without this helper risks cross-tenant cache poisoning.

#### 🔵 LOW RISK
*   **Shared File Storage**: Media and file uploads are stored in a common directory structure under `storage/app/public`. Files are distinguished by a path derived from a hash of the filename. While this prevents direct path traversal, it means all tenants' files are stored together. There is no tenant identifier in the storage path. This is a common pattern but carries a low risk of data exposure if filename hash collisions were to occur or if file access permissions are not handled carefully.
*   **Hardcoded Table Prefixes**: The investigation found lingering instances of hardcoded `ti_` table prefixes in raw SQL queries, particularly in older documentation and migration files. While most active application code has been refactored to use dynamic prefixes (`$p = DB::connection()->getTablePrefix();`), any remaining hardcoded prefixes could bypass the tenant database connection if they exist in overlooked code paths.

### 3. Areas Where Tenant Boundaries Are Guaranteed

*   **Frontend API Routes**: The main `api/v1` route groups defined in `routes.php` are consistently protected by the `detect.tenant` middleware. This provides strong assurance that all standard frontend operations (fetching menus, placing orders, etc.) are correctly scoped to the tenant's database.
*   **URL & QR Code Generation**: Following recent fixes, the generation of QR codes and other frontend-facing URLs correctly uses the request's host (`$request->getHost()`), ensuring that links are always generated for the correct tenant subdomain.

### 4. Summary

The application has a solid foundation for multi-tenancy. The `DetectTenant` middleware correctly isolates database connections on a per-request basis. However, critical gaps exist, most notably the unprotected admin notifications API. The presence of a legacy tenant middleware and a global cache prefix also introduce unnecessary risk.

**Immediate Recommendations:**
1.  **Secure the Admin Notifications API**: Apply the `detect.tenant` middleware to the unprotected route group in `app/admin/routes.php`.
2.  **Consolidate Middleware**: Refactor the codebase to remove `TenantDatabaseMiddleware` and use `DetectTenant` exclusively.
3.  **Enforce Scoped Caching**: Mandate the use of `TenantHelper::scopedCacheKey()` for all cache operations or implement a tenant-aware cache driver.



## Multi-Tenancy Isolation Investigation: Architecture Map

This document outlines the end-to-end request flow for a typical tenant API call, detailing the classes, functions, and state transitions involved in maintaining tenant isolation.

### 1. End-to-End Request Flow: Tenant API Call

This flow traces a request to a tenant-scoped endpoint, such as `https://amir.paymydine.com/api/v1/menu`.

1.  **Request Initiation**: A client sends an HTTP GET request.
    *   `GET /api/v1/menu`
    *   `Host: amir.paymydine.com`

2.  **Routing**: Laravel's routing mechanism matches the request to a route definition.
    *   **File**: `routes.php`
    *   **Code**: The request matches the `api/v1` route group, which is protected by the `detect.tenant` middleware.
        ```php
        // routes.php:376
        Route::group([
            'prefix' => 'api/v1',
            'middleware' => ['web', 'detect.tenant']
        ], function () {
            // routes.php:394
            Route::get('/menu', function () { ... });
        });
        ```

3.  **Middleware Execution: Tenant Resolution**: The `detect.tenant` middleware runs.
    *   **File**: `app/Http/Middleware/DetectTenant.php`
    *   **Class**: `App\Http\Middleware\DetectTenant`
    *   **Function**: `handle(Request $request, Closure $next)`
    *   **State Passing**:
        *   The middleware calls `$request->getHost()` which returns `amir.paymydine.com`.
        *   The `extractSubdomainFromHost()` method parses this string and returns the subdomain `amir`.
        *   A database query is executed against the **main `mysql` connection** to find the tenant:
            ```sql
            SELECT * FROM `ti_tenants` WHERE `domain` LIKE 'amir.%' OR `domain` = 'amir' LIMIT 1;
            ```
        *   The tenant record is found, containing the tenant's database name (e.g., `amir_db`) and credentials.

4.  **Middleware Execution: DB Connection Switching**:
    *   **File**: `app/Http/Middleware/DetectTenant.php`
    *   **State Passing**:
        *   `Config::set('database.connections.tenant.database', 'amir_db')` dynamically updates the in-memory configuration for the `tenant` database connection.
        *   `DB::purge('tenant')` and `DB::reconnect('tenant')` drop the old connection and establish a new one to the `amir_db` database.
        *   `DB::setDefaultConnection('tenant')` sets the default connection for the entire application for the scope of this request. **This is the most critical step for ensuring isolation.**
        *   `app()->instance('tenant', $tenant)` stores the tenant model instance in the service container for optional use in other parts of the application.

5.  **Controller/Closure Execution**: The request is passed to the route's closure.
    *   **File**: `routes.php`
    *   **Code**: The closure for the `/menu` route is executed.

6.  **Database Queries**:
    *   **File**: `routes.php`
    *   **Function**: Route closure for `/menu`
    *   **Code**:
        ```php
        // routes.php:397
        $p = DB::connection()->getTablePrefix();
        // ...
        $items = DB::select($query);
        ```
    *   **Isolation Mechanism**:
        *   `DB::connection()` now returns the `tenant` connection, because it was set as the default. `getTablePrefix()` returns the prefix for the tenant database (e.g., `ti_`).
        *   The `DB::select()` call is executed on the `tenant` connection, querying the `amir_db` database, not the main `paymydine` database.

7.  **Response**: The controller returns a JSON response with the tenant's menu data.

### 2. Call Graphs for Specific Operations

#### Reading Menu/Categories

*   `GET /api/v1/menu`
    *   `routes.php` -> `Route::get('/menu', ...)`
        *   `App\Http\Middleware\DetectTenant::handle()`
            *   `DB::connection('mysql')->table('ti_tenants')->...` (Resolves tenant)
            *   `Config::set(...)` (Sets tenant DB config)
            *   `DB::setDefaultConnection('tenant')` (Switches connection)
        *   Route Closure execution:
            *   `DB::connection()->getTablePrefix()` (Gets prefix from `tenant` connection)
            *   `DB::select(...)` (Queries the `menus`, `categories`, and `media_attachments` tables on the tenant's database)
    *   Returns JSON response.

#### Writing an Order

*   `POST /api/v1/orders`
    *   `routes.php` -> `Route::post('/orders', ...)`
        *   `App\Http\Middleware\DetectTenant::handle()` -> (Switches to tenant DB)
        *   Route Closure execution:
            *   `DB::beginTransaction()` (Starts transaction on `tenant` connection)
            *   `DB::table('orders')->max('order_id')`
            *   `DB::table('orders')->insertGetId(...)`
            *   `DB::table('order_menus')->insert(...)`
            *   `DB::table('order_totals')->insert(...)`
            *   `DB::commit()` (Commits transaction to tenant's DB)
    *   Returns JSON response with order ID.

#### Writing a Waiter/Table Note

*   `POST /api/v1/waiter-call` or `POST /api/v1/table-notes`
    *   `routes.php` -> `Route::post('/waiter-call', ...)`
        *   `App\Http\Middleware\DetectTenant::handle()` -> (Switches to tenant DB)
        *   Route Closure execution:
            *   `DB::transaction(...)`
                *   `DB::table('waiter_calls')->insertGetId(...)`
                *   `App\Helpers\TableHelper::getTableInfo(...)`
                    *   `TenantHelper::scopedCacheKey(...)` (Creates tenant-scoped cache key)
                    *   `Cache::remember(..., function() { ... })`
                        *   `DB::table('tables')->where(...)`
                *   `DB::table('notifications')->insert(...)`
    *   Returns JSON response.

#### Serving Media/Images

*   `GET /api/v1/images?file={filename}`
    *   `routes.php` -> `Route::get('/images', ...)`
        *   `App\Http\Middleware\DetectTenant::handle()` -> (Switches to tenant DB, although not strictly needed for this operation as it doesn't query the DB)
        *   Route Closure execution:
            *   `request()->get('file')`
            *   `storage_path("app/public/assets/media/attachments/public/...")` (Constructs path on the **server's global filesystem**)
            *   `file_exists(...)`
            *   `response()->file(...)` (Streams the file from the filesystem)
    *   Returns file response.
    *   **Isolation Note**: Isolation is based on the obscurity of the hashed filename. The storage path itself is not tenant-specific.



## Multi-Tenancy Isolation Investigation: Inventories & Checks

This document provides a detailed inventory of the application's components and patterns related to multi-tenancy.

### 1. Tenant Context: Setters and Readers

The tenant context is primarily managed within the `DetectTenant` middleware.

*   **Primary Context Setter**:
    *   `app/Http/Middleware/DetectTenant.php`: The `handle` method resolves the tenant from the subdomain and sets the tenant context for the request.
*   **Key Actions**:
    *   Reads subdomain from `request()->getHost()`.
    *   Reads tenant record from the main database: `DB::connection('mysql')->table('ti_tenants')->...`
    *   Sets the tenant-specific database configuration: `Config::set('database.connections.tenant.database', ...)`
    *   Switches the default connection: `DB::setDefaultConnection('tenant')`
    *   Stores the tenant object in the application container: `app()->instance('tenant', $tenant)`
*   **Primary Context Readers**:
    *   **Implicitly**: Every `DB::` call that does not specify a connection implicitly reads the context by using the `tenant` default connection set by the middleware.
    *   `app/Helpers/TenantHelper.php`: The `tenantCachePrefix` method reads the tenant object from the request attributes (`$request->attributes->get('tenant')`) to generate a tenant-specific cache prefix.

### 2. Routing: Tenant-Scoped Routes

The following route groups are intended to be tenant-scoped and are protected by the `detect.tenant` middleware.

*   **`routes.php`**:
    *   **Group**: `api/v1` (for TastyIgniter framework API)
        *   **Middleware**: `['api', 'detect.tenant']`
        *   **Lines**: 361-373
    *   **Group**: `api/v1` (for custom frontend API)
        *   **Middleware**: `['web', 'detect.tenant']`
        *   **Lines**: 376-1044
*   **`app/admin/routes.php`**:
    *   **Group**: `admin/notifications-api`
        *   **Middleware**: `['web', 'admin', 'detect.tenant']`
        *   **Lines**: 1047-1052 (in `routes.php` as per recent refactoring)

#### Routes Missing Tenant Middleware (Identified Gaps)

*   **`app/admin/routes.php`**:
    *   **Group**: `admin/notifications-api` (Backward-compatibility)
        *   **Middleware**: `['web']`
        *   **Lines**: 1078-1083
        *   **Risk**: **CRITICAL**. This group lacks tenant middleware. Any database operation within these routes will not be scoped to a tenant, leading to data leakage.

### 3. DB Access Patterns

*   **Default Connection Reliance**: The vast majority of database queries in the application (e.g., in route closures in `routes.php`, `app/admin/routes.php`, and helpers like `TableHelper.php`) use the default `DB::table()` or `DB::select()` methods. This is the correct pattern, as it relies on the `DetectTenant` middleware to switch the connection.

*   **Raw SQL & Dynamic Prefixes**: Raw SQL queries are common, especially for complex menu lookups. The correct pattern of dynamically getting the table prefix is used in most places.
    *   **Pattern**: `$p = DB::connection()->getTablePrefix(); $query = "SELECT * FROM {$p}menus ...";`
    *   **Locations**: `routes.php` (menu endpoint), `app/Http/Controllers/Api/MenuController.php`.

*   **Hardcoded Prefixes / Table Names**:
    *   The `search_from_ti.md` log revealed many instances of `FROM ti_...`. Analysis of the code (e.g., `app/Http/Controllers/Api/MenuController.php` in `reader_data_access.md`) confirms that the active API controller code **has been refactored** to use the dynamic `$p` prefix. The remaining instances are largely in documentation, logs, and old/inactive route files (`app.main.routes.php`).
    *   The query to the central `ti_tenants` table is an intentional, correctly implemented case of using a hardcoded table name on a specific connection: `DB::connection('mysql')->table('ti_tenants')`.

*   **Direct Connection Selection**:
    *   `DB::connection('mysql')`: Used correctly in `DetectTenant.php` to query the main `ti_tenants` table.
    *   `DB::connection('mysql')`: Also used in `app/admin/routes.php` for super admin functions (e.g., updating tenant status), which is also correct as these operations must happen on the central database.

### 4. Caching & Sessions

*   **Caching**:
    *   **Key Patterns**: Both the `Cache::` facade and `cache()` helper are used.
    *   **Tenant Scoping**: A `TenantHelper::scopedCacheKey()` method exists to create tenant-specific cache keys (e.g., `tenant:amir_db:table_info_123`).
    *   **Gap**: The application's default cache prefix in `config/cache.php` is **global** (`'prefix' => 'tenant_default_cache'`). While `TableHelper.php` correctly uses the scoped key helper, there is no guarantee that other parts of the application do. This creates a risk of cross-tenant cache poisoning for any cache calls that do not use the helper.

*   **Sessions**:
    *   **Driver**: The default session driver is `file`.
    *   **Path**: Session files are stored in `storage/framework/sessions`. This is a global, shared directory.
    *   **Scoping**: Standard Laravel file-based sessions are isolated by a unique session ID stored in a cookie. The `session()` helper interacts with the data for the current session ID. Direct cross-tenant session data leakage is unlikely unless the session ID is compromised. The `session()` helper itself is tenant-aware in the sense that it operates on the current request's session, not a global state.
    *   **Log Errors**: Logs show a repeated error: `Component "session" is not registered.` This indicates a potential framework-level configuration issue with TastyIgniter that could affect session stability.

### 5. File/Media Storage

*   **Disk Configuration**: `config/filesystems.php` defines a `public` disk pointing to `storage/path/app/public`.
*   **Path Structure**: The media serving endpoint in `routes.php` constructs image paths using a hash-based directory structure: `storage_path("app/public/assets/media/attachments/public/{$hash1}/{$hash2}/{$hash3}/{$filename}")`.
*   **Isolation**: There is **no tenant-specific identifier** in the file storage path. All tenant media files are stored in the same directory tree. Isolation relies on the uniqueness of the generated filenames (which appear to be hashes). This is a form of "security through obscurity" for file paths and carries a low risk of collision or unauthorized access if an attacker could guess file hashes.

### 6. URL/Host Derivation

*   **Host Reading**: `request()->getHost()` is used to get the current host.
*   **Subdomain Parsing**: The `extractSubdomainFromHost()` method in `DetectTenant.php` is responsible for parsing the subdomain from the host string.
*   **URL Building**: For tenant-facing URLs like QR codes, the application now correctly uses `$request->getScheme() . '://' . $request->getHost()` to construct the base URL. This ensures links are always scoped to the tenant who initiated the request. This fixes a major previous bug where URLs pointed to `localhost` or a default domain.
    *   **Locations**: `app/admin/routes.php` (e.g., `/orders/get-table-qr-url`), `routes.php`.




