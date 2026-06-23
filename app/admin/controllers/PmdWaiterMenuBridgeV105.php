<?php

namespace Admin\Controllers;

use Admin\Facades\AdminAuth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;
use Illuminate\Support\Facades\Schema;

class PmdWaiterMenuBridgeV105 extends \Admin\Classes\AdminController
{
    protected $requiredPermissions = 'Admin.Dashboard';
    protected $tablesCache = null;
    protected $colsCache = [];
    protected $metaCache = [];

    public function dashboardData()
    {
        try {
            $this->cleanFakeTableQuietly();
            $this->ensureAssignmentsTable();

            $user = $this->currentUser();
            $tables = $this->allTables($user);
            $assigned = array_values(array_filter($tables, function ($t) { return !empty($t['assigned']); }));

            $ready = 0; $open = 0; $due = 0.0;
            foreach ($assigned as $t) {
                $ready += (int)($t['ready_count'] ?? 0);
                $open += (int)($t['open_order_count'] ?? 0);
                $due += (float)($t['due_amount'] ?? 0);
            }

            return Response::json([
                'ok' => true,
                'version' => 'v105',
                'mode' => 'REAL_BACKEND_MENU_BRIDGE',
                'generated_at' => date('c'),
                'user' => $user,
                'detected' => $this->detected(),
                'detected_tables' => $this->detected(),
                'tables' => $tables,
                'assigned_tables' => $assigned,
                'assigned_table_ids' => array_values(array_map(function ($t) { return (int)$t['table_id']; }, $assigned)),
                'metrics' => [
                    'my_tables' => [
                        'label' => 'MY TABLES',
                        'value' => $this->compactTables($assigned),
                        'sub' => count($assigned).' assigned',
                        'count' => count($assigned),
                        'total' => count($tables),
                        'tables' => $assigned,
                    ],
                    'ready_to_serve' => [
                        'label' => 'READY TO SERVE',
                        'value' => (string)$ready,
                        'sub' => 'items from kitchen',
                        'count' => $ready,
                        'total' => $ready,
                    ],
                    'active_orders' => [
                        'label' => 'ACTIVE ORDERS',
                        'value' => (string)$open,
                        'sub' => 'my open orders',
                        'count' => $open,
                        'total' => $open,
                    ],
                    'needs_attention' => [
                        'label' => 'NEEDS ATTENTION',
                        'value' => (string)$this->attentionCount(),
                        'sub' => 'calls / notes / allergies',
                        'count' => $this->attentionCount(),
                        'total' => $this->attentionCount(),
                    ],
                    'checks_to_close' => [
                        'label' => 'CHECKS TO CLOSE',
                        'value' => $this->money($due),
                        'sub' => $this->pendingPaymentsCount($assigned).' payments pending',
                        'count' => $this->pendingPaymentsCount($assigned),
                        'total' => $due,
                    ],
                ],
            ]);
        } catch (\Throwable $e) {
            return $this->jsonError($e);
        }
    }

    public function workspaceData()
    {
        try {
            $this->cleanFakeTableQuietly();
            $this->ensureAssignmentsTable();

            $user = $this->currentUser();
            $tables = $this->allTables($user);
            $menu = $this->realMenuItems();

            return Response::json([
                'ok' => true,
                'version' => 'v105',
                'mode' => 'REAL_BACKEND_MENU_BRIDGE',
                'generated_at' => date('c'),
                'user' => $user,
                'detected' => $this->detected(),
                'detected_tables' => $this->detected(),
                'tables' => $tables,
                'menu_items' => $menu,
                'assigned_table_ids' => array_values(array_map(function ($t) { return (int)$t['table_id']; }, array_filter($tables, function ($t) { return !empty($t['assigned']); }))),
                'counts' => [
                    'tables' => count($tables),
                    'assigned_tables' => count(array_filter($tables, function ($t) { return !empty($t['assigned']); })),
                    'menu_items' => count($menu),
                ],
                'real_menu_source' => $this->bestMenuSource(),
                'no_fake_content' => true,
            ]);
        } catch (\Throwable $e) {
            return $this->jsonError($e);
        }
    }

    public function audit()
    {
        try {
            $this->cleanFakeTableQuietly();
            $this->ensureAssignmentsTable();

            $user = $this->currentUser();
            $menu = $this->realMenuItems();
            $candidates = $this->menuCandidates();

            return Response::json([
                'ok' => true,
                'version' => 'v105',
                'mode' => 'REAL_BACKEND_MENU_BRIDGE',
                'user' => $user,
                'detected' => $this->detected(),
                'tables_count' => count($this->restaurantTables()),
                'assigned_table_ids' => $this->assignedTableIds($user),
                'real_menu_items_count' => count($menu),
                'menu_preview' => array_slice($menu, 0, 20),
                'best_menu_source' => $this->bestMenuSource(),
                'saved_menu_source' => $this->savedMenuSource(),
                'menu_candidates' => array_slice($candidates, 0, 25),
                'all_database_tables_count' => count($this->tablesList()),
                'important' => 'No PMD fake fallback is used. If real_menu_items_count is 0, use menu_candidates or set a source override.',
                'override_example' => '/admin/pmd-waiter-menu-v105-source?apply=1&table=menus&id=menu_id&name=menu_name&price=menu_price',
            ]);
        } catch (\Throwable $e) {
            return $this->jsonError($e);
        }
    }

    public function source()
    {
        try {
            $apply = request()->get('apply') == '1' || request()->get('apply') === 'true';
            $table = trim((string)request()->get('table'));
            $id = trim((string)request()->get('id'));
            $name = trim((string)request()->get('name'));
            $price = trim((string)request()->get('price'));
            $category = trim((string)request()->get('category'));

            if (!$table || !$id || !$name) {
                return Response::json([
                    'ok' => false,
                    'version' => 'v105',
                    'error' => 'Missing table/id/name. price is optional.',
                    'example' => '/admin/pmd-waiter-menu-v105-source?apply=1&table=menus&id=menu_id&name=menu_name&price=menu_price',
                    'candidates' => array_slice($this->menuCandidates(), 0, 20),
                ], 422);
            }

            if (!in_array($table, $this->tablesList(), true)) {
                return Response::json(['ok' => false, 'version' => 'v105', 'error' => 'Table not found: '.$table], 422);
            }

            $cols = $this->cols($table);
            foreach ([$id, $name] as $col) {
                if (!in_array($col, $cols, true)) {
                    return Response::json(['ok' => false, 'version' => 'v105', 'error' => 'Column not found: '.$table.'.'.$col, 'columns' => $cols], 422);
                }
            }
            if ($price && !in_array($price, $cols, true)) {
                return Response::json(['ok' => false, 'version' => 'v105', 'error' => 'Price column not found: '.$table.'.'.$price, 'columns' => $cols], 422);
            }

            $source = ['table' => $table, 'id' => $id, 'name' => $name, 'price' => $price ?: null, 'category' => $category ?: null];

            if ($apply) {
                $this->ensureSourceTable();
                DB::table('pmd_waiter_real_menu_source')->truncate();
                DB::table('pmd_waiter_real_menu_source')->insert([
                    'source_table' => $source['table'],
                    'id_column' => $source['id'],
                    'name_column' => $source['name'],
                    'price_column' => $source['price'],
                    'category_column' => $source['category'],
                    'notes' => 'Saved by PMD waiter menu bridge v105',
                    'created_at' => date('Y-m-d H:i:s'),
                    'updated_at' => date('Y-m-d H:i:s'),
                ]);
            }

            return Response::json([
                'ok' => true,
                'version' => 'v105',
                'mode' => $apply ? 'APPLIED' : 'DRY_RUN',
                'source' => $source,
                'menu_preview' => array_slice($this->realMenuItems($source), 0, 20),
            ]);
        } catch (\Throwable $e) {
            return $this->jsonError($e);
        }
    }

    public function assign()
    {
        try {
            $this->ensureAssignmentsTable();
            $apply = request()->get('apply') == '1' || request()->get('apply') === 'true';
            $limit = max(1, min(50, (int)request()->get('tables', 4)));
            $user = $this->currentUser();
            $tables = array_slice($this->restaurantTables(), 0, $limit);
            $assigned = [];

            if ($apply) {
                foreach ($tables as $table) {
                    $this->assignTable((int)$user['staff_id'], $table, $user);
                    $assigned[] = $table;
                }
            }

            return Response::json([
                'ok' => true,
                'version' => 'v105',
                'mode' => $apply ? 'APPLIED' : 'DRY_RUN',
                'user' => $user,
                'selected_tables' => $tables,
                'assigned_tables' => $assigned,
            ]);
        } catch (\Throwable $e) {
            return $this->jsonError($e);
        }
    }

    public function cleanFake()
    {
        try {
            $apply = request()->get('apply') == '1' || request()->get('apply') === 'true';

            if (!$apply) {
                return Response::json([
                    'ok' => true,
                    'version' => 'v105',
                    'mode' => 'DRY_RUN',
                    'fake_table_exists' => Schema::hasTable('pmd_waiter_test_menu_items'),
                    'message' => 'Use apply=1 to drop fake PMD fallback menu table.',
                ]);
            }

            $dropped = [];
            if (Schema::hasTable('pmd_waiter_test_menu_items')) {
                Schema::drop('pmd_waiter_test_menu_items');
                $dropped[] = 'pmd_waiter_test_menu_items';
            }

            return Response::json([
                'ok' => true,
                'version' => 'v105',
                'mode' => 'APPLIED',
                'dropped' => $dropped,
                'message' => 'Fake fallback menu is gone. v105 only returns real DB menu candidates.',
            ]);
        } catch (\Throwable $e) {
            return $this->jsonError($e);
        }
    }

    protected function allTables($user)
    {
        $assignedIds = $this->assignedTableIds($user);
        $raw = $this->restaurantTables();
        $out = [];

        foreach ($raw as $t) {
            $id = (int)$t['table_id'];
            $open = $this->openOrderCount($id);
            $ready = $this->readyCount($id);
            $due = $this->dueAmount($id);
            $assigned = in_array($id, $assignedIds, true);

            $status = 'free';
            if ($ready > 0) $status = 'ready';
            else if ($open > 0 || $due > 0) $status = 'active';
            else if ($assigned) $status = 'assigned';

            $out[] = [
                'table_id' => $id,
                'id' => $id,
                'label' => $t['label'],
                'number' => $t['number'],
                'location_id' => $t['location_id'] ?? null,
                'assigned' => $assigned,
                'open_order_count' => $open,
                'ready_count' => $ready,
                'due_amount' => $due,
                'due_label' => $this->money($due),
                'floor_status' => $status,
                'clickable' => true,
            ];
        }

        return $out;
    }

    protected function realMenuItems($source = null)
    {
        $source = $source ?: $this->bestMenuSource();
        if (!$source || empty($source['table']) || empty($source['id']) || empty($source['name'])) return [];

        $table = $source['table'];
        $idCol = $source['id'];
        $nameCol = $source['name'];
        $priceCol = !empty($source['price']) ? $source['price'] : null;
        $categoryCol = !empty($source['category']) ? $source['category'] : null;

        try { $rows = DB::table($table)->limit(500)->get(); }
        catch (\Throwable $e) { return []; }

        $items = [];
        foreach ($rows as $row) {
            $r = (array)$row;

            $id = $this->fieldNumber($r, $idCol);
            $name = $this->fieldString($r, $nameCol);
            $price = $priceCol ? $this->fieldDecimal($r, $priceCol) : 0.0;
            $category = $categoryCol ? $this->fieldString($r, $categoryCol) : '';

            if (!$id || $name === '') continue;
            if (preg_match('/PMD\s+(Ready|Test)|fake|sample/i', $name)) continue;
            if (strlen($name) < 2 || preg_match('/^\d+$/', $name)) continue;

            $statusText = strtolower($this->firstString($r, ['menu_status','status','is_enabled','is_active','active','available','is_available','enabled']));
            if (preg_match('/disabled|inactive|hidden|deleted|draft|unavailable|archived/i', $statusText)) continue;

            $items[] = [
                'id' => (int)$id,
                'menu_id' => (int)$id,
                'name' => $name,
                'price' => $price,
                'price_label' => $this->money($price),
                'category' => $category,
                'source' => $table,
                'source_id_column' => $idCol,
                'source_name_column' => $nameCol,
                'source_price_column' => $priceCol,
            ];
        }

        usort($items, function ($a, $b) { return strcasecmp($a['name'], $b['name']); });
        return $items;
    }

    protected function bestMenuSource()
    {
        $saved = $this->savedMenuSource();
        if ($saved) return $saved;

        $candidates = $this->menuCandidates();
        return count($candidates) ? [
            'table' => $candidates[0]['table'],
            'id' => $candidates[0]['id'],
            'name' => $candidates[0]['name'],
            'price' => $candidates[0]['price'],
            'category' => $candidates[0]['category'],
            'score' => $candidates[0]['score'],
        ] : null;
    }

    protected function savedMenuSource()
    {
        try {
            if (!Schema::hasTable('pmd_waiter_real_menu_source')) return null;
            $row = DB::table('pmd_waiter_real_menu_source')->orderBy('id', 'desc')->first();
            if (!$row) return null;
            $r = (array)$row;
            return [
                'table' => $r['source_table'],
                'id' => $r['id_column'],
                'name' => $r['name_column'],
                'price' => $r['price_column'] ?: null,
                'category' => $r['category_column'] ?: null,
                'saved' => true,
            ];
        } catch (\Throwable $e) {
            return null;
        }
    }

    protected function menuCandidates()
    {
        $out = [];

        foreach ($this->tablesList() as $table) {
            if ($this->isBadMenuTable($table)) continue;

            $cols = $this->cols($table);
            if (!count($cols)) continue;

            $idCols = $this->matchingCols($cols, '/^(id|menu_id|item_id|food_id|dish_id|product_id|meal_id|record_id)$/i');
            $nameCols = $this->matchingCols($cols, '/(^name$|menu_name|item_name|food_name|dish_name|product_name|meal_name|title|label|description|display_name)/i');
            $priceCols = $this->matchingCols($cols, '/(price|amount|cost|rate|value|sell|sale)/i');
            $catCols = $this->matchingCols($cols, '/(category|cat_name|section|group)/i');

            if (!count($idCols) || !count($nameCols)) continue;

            $best = null;
            foreach ($idCols as $idCol) {
                foreach ($nameCols as $nameCol) {
                    $prices = count($priceCols) ? $priceCols : [null];
                    foreach ($prices as $priceCol) {
                        $categoryCol = count($catCols) ? $catCols[0] : null;
                        $candidate = $this->scoreMenuCandidate($table, $idCol, $nameCol, $priceCol, $categoryCol);
                        if (!$best || $candidate['score'] > $best['score']) $best = $candidate;
                    }
                }
            }

            if ($best && $best['valid_rows'] > 0) $out[] = $best;
        }

        usort($out, function ($a, $b) { return $b['score'] <=> $a['score']; });
        return $out;
    }

    protected function scoreMenuCandidate($table, $idCol, $nameCol, $priceCol, $categoryCol)
    {
        $score = 0; $valid = 0; $priced = 0; $sample = [];
        try { $rows = DB::table($table)->limit(80)->get(); }
        catch (\Throwable $e) { $rows = []; }

        foreach ($rows as $row) {
            $r = (array)$row;
            $id = $this->fieldNumber($r, $idCol);
            $name = $this->fieldString($r, $nameCol);
            $price = $priceCol ? $this->fieldDecimal($r, $priceCol) : 0.0;

            if (!$id || $name === '') continue;
            if (preg_match('/PMD\s+(Ready|Test)|fake|sample/i', $name)) continue;
            if (strlen($name) < 2 || preg_match('/^\d+$/', $name)) continue;

            $valid++;
            if ($priceCol && $price > 0) $priced++;
            if (count($sample) < 5) $sample[] = ['id' => $id, 'name' => $name, 'price' => $price];
        }

        $score += $valid * 10;
        $score += $priced * 35;
        if (preg_match('/(^|_)menus?($|_)/i', $table)) $score += 180;
        if (preg_match('/menu/i', $table)) $score += 120;
        if (preg_match('/food|dish|meal|product|item/i', $table)) $score += 50;
        if ($priceCol) $score += 50;
        if (preg_match('/^(menu_name|item_name|food_name|dish_name|product_name|meal_name|name|title)$/i', $nameCol)) $score += 25;
        if (preg_match('/^(menu_price|price|item_price|sell_price|sale_price|amount)$/i', (string)$priceCol)) $score += 25;

        return [
            'table' => $table,
            'id' => $idCol,
            'name' => $nameCol,
            'price' => $priceCol,
            'category' => $categoryCol,
            'score' => $score,
            'valid_rows' => $valid,
            'priced_rows' => $priced,
            'sample' => $sample,
        ];
    }

    protected function isBadMenuTable($table)
    {
        if (preg_match('/^pmd_waiter_test_menu_items$/i', $table)) return true;
        if (preg_match('/migration|cache|session|password|permission|role|user|staff|customer|notification|activity|log|mail|media|image|file|setting|country|currency|language|status|assignment|seed/i', $table)) return true;
        if (preg_match('/order|invoice|payment|transaction|reservation|booking|address|table|kds|kitchen|review|coupon|discount|tax/i', $table)) return true;
        return false;
    }

    protected function restaurantTables()
    {
        $table = $this->findRestaurantTablesTable();
        if (!$table) return [];

        try { $rows = DB::table($table)->limit(200)->get(); }
        catch (\Throwable $e) { return []; }

        $out = [];
        foreach ($rows as $row) {
            $r = (array)$row;
            $id = $this->firstNumber($r, ['table_id','location_table_id','id','table_no','table_number','number']);
            if (!$id) continue;

            $label = $this->firstString($r, ['table_name','name','label','pos_table_label','title','table_no','table_number','number']);
            if ($label === '') $label = 'Table '.$id;
            if (preg_match('/^\d+$/', $label)) $label = 'Table '.$label;
            if (preg_match('/cashier|delivery|takeaway|pickup|counter|bar/i', strtolower($label))) continue;

            $out[(int)$id] = [
                'table_id' => (int)$id,
                'label' => $label,
                'number' => $this->numberFromLabel($label, (int)$id),
                'location_id' => $this->firstNumber($r, ['location_id']) ?: null,
            ];
        }

        ksort($out);
        return array_values($out);
    }

    protected function openOrderCount($tableId)
    {
        try {
            $orders = $this->findTable(['orders']);
            if (!$orders) return 0;
            $cols = $this->cols($orders);
            $tableCol = $this->pick($cols, ['table_id','location_table_id','table_no','table_number']);
            if (!$tableCol) return 0;
            return (int)DB::table($orders)->where($tableCol, $tableId)->count();
        } catch (\Throwable $e) { return 0; }
    }

    protected function readyCount($tableId)
    {
        try {
            $orders = $this->findTable(['orders']);
            $menus = $this->findTable(['order_menus']);
            if (!$orders || !$menus) return 0;

            $oc = $this->cols($orders);
            $mc = $this->cols($menus);
            $tableCol = $this->pick($oc, ['table_id','location_table_id','table_no','table_number']);
            $orderIdO = $this->pick($oc, ['order_id','id']);
            $orderIdM = $this->pick($mc, ['order_id']);
            if (!$tableCol || !$orderIdO || !$orderIdM) return 0;

            $readyCol = $this->pick($mc, ['kds_status','item_status','status','status_name','order_menu_status','cooking_status']);
            $readyBool = $this->pick($mc, ['is_ready','ready','completed','is_completed']);

            $q = DB::table($menus.' as m')->join($orders.' as o', 'o.'.$orderIdO, '=', 'm.'.$orderIdM)->where('o.'.$tableCol, $tableId);
            if ($readyCol) {
                $q->where(function ($qq) use ($readyCol) {
                    $qq->where('m.'.$readyCol, 'like', '%ready%')
                       ->orWhere('m.'.$readyCol, 'like', '%complete%')
                       ->orWhere('m.'.$readyCol, 'like', '%done%')
                       ->orWhere('m.'.$readyCol, 'like', '%serve%');
                });
            } elseif ($readyBool) {
                $q->where('m.'.$readyBool, 1);
            } else {
                return 0;
            }
            return (int)$q->count();
        } catch (\Throwable $e) { return 0; }
    }

    protected function dueAmount($tableId)
    {
        try {
            $orders = $this->findTable(['orders']);
            if (!$orders) return 0.0;
            $cols = $this->cols($orders);
            $tableCol = $this->pick($cols, ['table_id','location_table_id','table_no','table_number']);
            $total = $this->pick($cols, ['order_total','total','total_amount','grand_total']);
            if (!$tableCol || !$total) return 0.0;
            return (float)DB::table($orders)->where($tableCol, $tableId)->sum($total);
        } catch (\Throwable $e) { return 0.0; }
    }

    protected function attentionCount()
    {
        return 0;
    }

    protected function ensureAssignmentsTable()
    {
        if (!Schema::hasTable('pmd_waiter_table_assignments')) {
            Schema::create('pmd_waiter_table_assignments', function ($table) {
                $table->increments('id');
                $table->integer('staff_id')->unsigned()->index();
                $table->integer('table_id')->unsigned()->index();
                $table->integer('location_id')->unsigned()->nullable()->index();
                $table->string('section_name')->nullable();
                $table->boolean('is_active')->default(1)->index();
                $table->integer('assigned_by')->unsigned()->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }
    }

    protected function ensureSourceTable()
    {
        if (!Schema::hasTable('pmd_waiter_real_menu_source')) {
            Schema::create('pmd_waiter_real_menu_source', function ($table) {
                $table->increments('id');
                $table->string('source_table');
                $table->string('id_column');
                $table->string('name_column');
                $table->string('price_column')->nullable();
                $table->string('category_column')->nullable();
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }
    }

    protected function cleanFakeTableQuietly()
    {
        try {
            if (Schema::hasTable('pmd_waiter_test_menu_items')) {
                Schema::drop('pmd_waiter_test_menu_items');
            }
        } catch (\Throwable $e) {}
    }

    protected function assignTable($staffId, $table, $user)
    {
        if ($staffId <= 0) return;

        $exists = DB::table('pmd_waiter_table_assignments')
            ->where('staff_id', $staffId)
            ->where('table_id', (int)$table['table_id'])
            ->where('is_active', 1)
            ->exists();

        if ($exists) return;

        DB::table('pmd_waiter_table_assignments')->insert([
            'staff_id' => $staffId,
            'table_id' => (int)$table['table_id'],
            'location_id' => $table['location_id'] ?? null,
            'section_name' => 'Real section',
            'is_active' => 1,
            'assigned_by' => !empty($user['id']) ? (int)$user['id'] : null,
            'notes' => 'Assigned by PMD waiter menu bridge v105',
            'created_at' => date('Y-m-d H:i:s'),
            'updated_at' => date('Y-m-d H:i:s'),
        ]);
    }

    protected function currentUser()
    {
        $user = null;
        try { $user = AdminAuth::getUser(); } catch (\Throwable $e) {
            try { $user = AdminAuth::user(); } catch (\Throwable $e2) {}
        }

        $out = ['id'=>null,'user_id'=>null,'staff_id'=>null,'username'=>'','email'=>'','ids'=>[]];

        if ($user) {
            $arr = is_object($user) && method_exists($user, 'getAttributes') ? $user->getAttributes() : (array)$user;
            foreach (['id','user_id'] as $k) if (isset($arr[$k]) && is_numeric($arr[$k])) $out[$k] = (int)$arr[$k];
            foreach (['staff_id','staffId'] as $k) if (isset($arr[$k]) && is_numeric($arr[$k])) $out['staff_id'] = (int)$arr[$k];
            foreach (['username','name','login','staff_name'] as $k) if (!empty($arr[$k])) { $out['username'] = (string)$arr[$k]; break; }
            foreach (['email','staff_email'] as $k) if (!empty($arr[$k])) { $out['email'] = (string)$arr[$k]; break; }
        }

        if (!$out['staff_id']) $out['staff_id'] = $this->resolveStaffId($out);
        if (!$out['staff_id'] && !empty($out['id'])) $out['staff_id'] = (int)$out['id'];
        if (!$out['staff_id'] && !empty($out['user_id'])) $out['staff_id'] = (int)$out['user_id'];
        if (!$out['staff_id']) $out['staff_id'] = 1;

        foreach ([$out['staff_id'], $out['id'], $out['user_id']] as $id) {
            if ($id !== null && is_numeric($id) && !in_array((int)$id, $out['ids'], true)) $out['ids'][] = (int)$id;
        }

        return $out;
    }

    protected function resolveStaffId($out)
    {
        try {
            $staffs = $this->findTable(['staffs']);
            if (!$staffs) return null;
            $cols = $this->cols($staffs);
            $sid = $this->pick($cols, ['staff_id','id']);
            if (!$sid) return null;

            $name = $this->pick($cols, ['staff_name','name','username']);
            $email = $this->pick($cols, ['staff_email','email']);
            $q = DB::table($staffs);
            if ($email && !empty($out['email'])) $q->orWhere($email, $out['email']);
            if ($name && !empty($out['username'])) $q->orWhere($name, 'like', '%'.$out['username'].'%');
            if ($name) $q->orWhere($name, 'like', '%waiter%');
            if ($email) $q->orWhere($email, 'like', '%waiter%');
            $row = $q->first();
            if (!$row) return null;
            $arr = (array)$row;
            return isset($arr[$sid]) ? (int)$arr[$sid] : null;
        } catch (\Throwable $e) {
            return null;
        }
    }

    protected function assignedTableIds($user)
    {
        if (empty($user['staff_id']) || !Schema::hasTable('pmd_waiter_table_assignments')) return [];
        try {
            return array_values(array_unique(array_map('intval', DB::table('pmd_waiter_table_assignments')
                ->where('staff_id', (int)$user['staff_id'])
                ->where('is_active', 1)
                ->pluck('table_id')
                ->all())));
        } catch (\Throwable $e) {
            return [];
        }
    }

    protected function findRestaurantTablesTable()
    {
        foreach (['tables', 'location_tables', 'restaurant_tables', 'dining_tables'] as $candidate) {
            $t = $this->findTable([$candidate]);
            if ($t) return $t;
        }
        foreach ($this->tablesList() as $t) {
            if (preg_match('/table/i', $t) && !preg_match('/order|migr|session|permission|assign/i', $t)) return $t;
        }
        return null;
    }

    protected function findTable($candidates)
    {
        $all = $this->tablesList();
        foreach ($candidates as $candidate) if (in_array($candidate, $all, true)) return $candidate;
        foreach ($candidates as $candidate) {
            foreach ($all as $t) if (substr($t, -strlen($candidate)) === $candidate) return $t;
        }
        return null;
    }

    protected function tablesList()
    {
        if ($this->tablesCache !== null) return $this->tablesCache;
        $rows = DB::select('SHOW TABLES');
        $out = [];
        foreach ($rows as $r) {
            $a = array_values((array)$r);
            if (!empty($a[0])) $out[] = (string)$a[0];
        }
        $this->tablesCache = $out;
        return $out;
    }

    protected function cols($table)
    {
        if (!$table) return [];
        if (isset($this->colsCache[$table])) return $this->colsCache[$table];
        try {
            $rows = DB::select('DESCRIBE `'.str_replace('`','``',$table).'`');
            $cols = [];
            foreach ($rows as $r) {
                $a = (array)$r;
                if (!empty($a['Field'])) $cols[] = $a['Field'];
            }
            return $this->colsCache[$table] = $cols;
        } catch (\Throwable $e) {
            try { return $this->colsCache[$table] = Schema::getColumnListing($table); }
            catch (\Throwable $e2) { return $this->colsCache[$table] = []; }
        }
    }

    protected function detected()
    {
        return [
            'tables' => $this->findRestaurantTablesTable(),
            'orders' => $this->findTable(['orders']),
            'order_menus' => $this->findTable(['order_menus']),
            'real_menu_source' => $this->bestMenuSource(),
            'assignments' => Schema::hasTable('pmd_waiter_table_assignments') ? 'pmd_waiter_table_assignments' : null,
            'fake_menu_table_exists' => Schema::hasTable('pmd_waiter_test_menu_items'),
        ];
    }

    protected function matchingCols($cols, $regex)
    {
        $out = [];
        foreach ($cols as $c) if (preg_match($regex, $c)) $out[] = $c;
        return $out;
    }

    protected function fieldNumber($row, $key)
    {
        return ($key && array_key_exists($key, $row) && is_numeric($row[$key])) ? (int)$row[$key] : null;
    }

    protected function fieldString($row, $key)
    {
        return ($key && array_key_exists($key, $row)) ? trim((string)$row[$key]) : '';
    }

    protected function fieldDecimal($row, $key)
    {
        return ($key && array_key_exists($key, $row) && is_numeric($row[$key])) ? (float)$row[$key] : 0.0;
    }

    protected function firstNumber($row, $keys)
    {
        foreach ($keys as $k) {
            if (array_key_exists($k, $row) && $row[$k] !== null && $row[$k] !== '' && is_numeric($row[$k])) return (int)$row[$k];
        }
        return null;
    }

    protected function firstString($row, $keys)
    {
        foreach ($keys as $k) {
            if (array_key_exists($k, $row) && $row[$k] !== null && trim((string)$row[$k]) !== '') return trim((string)$row[$k]);
        }
        return '';
    }

    protected function pick($cols, $names)
    {
        foreach ($names as $n) if (in_array($n, $cols, true)) return $n;
        return null;
    }

    protected function pendingPaymentsCount($assigned)
    {
        $n = 0;
        foreach ($assigned as $t) if ((float)($t['due_amount'] ?? 0) > 0) $n++;
        return $n;
    }

    protected function compactTables($tables)
    {
        if (!count($tables)) return '—';
        $parts = [];
        foreach (array_slice($tables, 0, 3) as $t) $parts[] = 'T'.$this->numberFromLabel($t['label'] ?? '', $t['table_id'] ?? 0);
        return implode('/', $parts).(count($tables) > 3 ? '/…' : '');
    }

    protected function numberFromLabel($label, $fallback)
    {
        if (preg_match('/(\d+)/', (string)$label, $m)) return (string)$m[1];
        return (string)$fallback;
    }

    protected function money($v)
    {
        return '€'.number_format((float)$v, 2);
    }

    protected function jsonError($e)
    {
        return Response::json([
            'ok' => false,
            'version' => 'v105',
            'error' => $e->getMessage(),
            'file' => basename($e->getFile()),
            'line' => $e->getLine(),
            'detected' => $this->detected(),
            'menu_candidates' => array_slice($this->menuCandidates(), 0, 20),
        ], 500);
    }
}
