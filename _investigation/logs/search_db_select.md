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
