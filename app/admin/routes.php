
<?php














// PMD_ADMIN_UI_KIT_PRIORITY_ROUTE_V2_START
// Must stay near the TOP of app/admin/routes.php, before admin catch-all routes.
$__pmdUiKitHandler = function () {
    $path = base_path('app/admin/views/pmd-ui-kit.blade.php');

    if (!file_exists($path)) {
        return response('PMD UI Kit view not found: '.$path, 404)
            ->header('Content-Type', 'text/plain; charset=UTF-8');
    }

    return response(file_get_contents($path), 200)
        ->header('Content-Type', 'text/html; charset=UTF-8')
        ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
};

// Register both forms because this project mixes admin-prefixed and non-prefixed routes.
\Illuminate\Support\Facades\Route::get('/admin/pmd-ui-kit', $__pmdUiKitHandler);
\Illuminate\Support\Facades\Route::get('pmd-ui-kit', $__pmdUiKitHandler);
// PMD_ADMIN_UI_KIT_PRIORITY_ROUTE_V2_END





// PMD_CODEX_FLOOR_ENDPOINT_V28_START
if (!defined('PMD_CODEX_FLOOR_ENDPOINT_V28')) {
    define('PMD_CODEX_FLOOR_ENDPOINT_V28', true);

    $__pmdCodexOwnerFloorV28 = function () {
        try {
            $schema = \Illuminate\Support\Facades\Schema::getFacadeRoot();
            $db = \Illuminate\Support\Facades\DB::getFacadeRoot();

            if (!$schema->hasTable('tables')) {
                return response()->json(['ok' => false, 'message' => 'tables table not found'], 500);
            }

            $colsList = $schema->getColumnListing('tables');
            $cols = array_flip($colsList);

            $pk = isset($cols['table_id']) ? 'table_id' : (isset($cols['id']) ? 'id' : null);
            if (!$pk) {
                return response()->json(['ok' => false, 'message' => 'table primary key not found', 'columns' => $colsList], 422);
            }

            $noCol = isset($cols['table_no']) ? 'table_no' : (isset($cols['table_number']) ? 'table_number' : (isset($cols['number']) ? 'number' : null));

            $isSave = request()->isMethod('post') || request()->has('tables') || request()->has('tables_b64');

            if ($isSave) {
                $payload = request()->all();
                $raw = request()->getContent();

                if ($raw) {
                    $json = json_decode($raw, true);
                    if (is_array($json)) $payload = array_merge($payload, $json);
                }

                if (isset($payload['tables_b64'])) {
                    $decoded = json_decode(base64_decode($payload['tables_b64']), true);
                    if (is_array($decoded)) $payload['tables'] = $decoded;
                }

                $items = isset($payload['tables']) ? $payload['tables'] : [];
                if (is_string($items)) {
                    $decoded = json_decode($items, true);
                    $items = is_array($decoded) ? $decoded : [];
                }

                if (!is_array($items)) $items = [];

                $updated = 0;

                foreach ($items as $r) {
                    if (!is_array($r)) continue;

                    $id = isset($r['id']) ? (int)$r['id'] : (isset($r['table_id']) ? (int)$r['table_id'] : 0);
                    if ($id <= 0) continue;

                    $update = [];

                    if (isset($cols['floor_x'])) {
                        $x = isset($r['floor_x']) ? (float)$r['floor_x'] : 0;
                        $update['floor_x'] = max(0, min(1000, $x));
                    }

                    if (isset($cols['floor_y'])) {
                        $y = isset($r['floor_y']) ? (float)$r['floor_y'] : 0;
                        $update['floor_y'] = max(0, min(560, $y));
                    }

                    if (isset($cols['floor_width'])) {
                        $w = isset($r['floor_width']) ? (float)$r['floor_width'] : (isset($r['width']) ? (float)$r['width'] : 150);
                        $update['floor_width'] = max(60, min(260, $w));
                    } elseif (isset($cols['width'])) {
                        $w = isset($r['floor_width']) ? (float)$r['floor_width'] : (isset($r['width']) ? (float)$r['width'] : 150);
                        $update['width'] = max(60, min(260, $w));
                    }

                    if (isset($cols['floor_height'])) {
                        $h = isset($r['floor_height']) ? (float)$r['floor_height'] : (isset($r['height']) ? (float)$r['height'] : 78);
                        $update['floor_height'] = max(50, min(180, $h));
                    } elseif (isset($cols['height'])) {
                        $h = isset($r['floor_height']) ? (float)$r['floor_height'] : (isset($r['height']) ? (float)$r['height'] : 78);
                        $update['height'] = max(50, min(180, $h));
                    }

                    if (isset($cols['visible_on_floor_plan'])) {
                        $update['visible_on_floor_plan'] = 1;
                    }

                    if (!$update) continue;

                    $ok = $db->table('tables')->where($pk, $id)->update($update);
                    if ($ok !== false) $updated++;
                }

                return response()->json([
                    'ok' => true,
                    'version' => 'pmd-codex-floor-endpoint-v28',
                    'updated' => $updated,
                ]);
            }

            $select = [$pk . ' as id'];

            if ($noCol) $select[] = $noCol . ' as table_no';
            if (isset($cols['floor_x'])) $select[] = 'floor_x';
            if (isset($cols['floor_y'])) $select[] = 'floor_y';
            if (isset($cols['floor_width'])) $select[] = 'floor_width';
            if (isset($cols['floor_height'])) $select[] = 'floor_height';
            if (isset($cols['width'])) $select[] = 'width';
            if (isset($cols['height'])) $select[] = 'height';
            if (isset($cols['visible_on_floor_plan'])) $select[] = 'visible_on_floor_plan';

            $q = $db->table('tables')->selectRaw(implode(',', $select));

            if (isset($cols['visible_on_floor_plan'])) {
                $q->where(function ($qq) {
                    $qq->where('visible_on_floor_plan', 1)->orWhereNull('visible_on_floor_plan');
                });
            }

            if ($noCol) {
                $q->orderByRaw("CAST(".$noCol." AS UNSIGNED) ASC");
            } else {
                $q->orderBy($pk);
            }

            $rows = $q->get()->map(function ($r, $i) {
                $fw = isset($r->floor_width) ? $r->floor_width : (isset($r->width) ? $r->width : 150);
                $fh = isset($r->floor_height) ? $r->floor_height : (isset($r->height) ? $r->height : 78);

                return [
                    'id' => isset($r->id) ? (int)$r->id : null,
                    'table_no' => isset($r->table_no) && $r->table_no !== null ? (string)$r->table_no : (string)(isset($r->id) ? $r->id : ($i + 1)),
                    'floor_x' => isset($r->floor_x) && is_numeric($r->floor_x) ? (float)$r->floor_x : (32 + (($i % 4) * 180)),
                    'floor_y' => isset($r->floor_y) && is_numeric($r->floor_y) ? (float)$r->floor_y : (34 + (floor($i / 4) * 130)),
                    'floor_width' => is_numeric($fw) ? (float)$fw : 150,
                    'floor_height' => is_numeric($fh) ? (float)$fh : 78,
                    'visible_on_floor_plan' => isset($r->visible_on_floor_plan) ? (int)$r->visible_on_floor_plan : 1,
                    'status' => 'free',
                    'open_orders' => 0,
                    'open_check_value' => 0,
                    'due_label' => '',
                ];
            })->filter(function ($r) {
                return !empty($r['id']);
            })->values();

            return response()->json([
                'ok' => true,
                'version' => 'pmd-codex-floor-endpoint-v28',
                'tables' => $rows,
                'count' => $rows->count(),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'version' => 'pmd-codex-floor-endpoint-v28',
                'message' => $e->getMessage(),
                'type' => get_class($e),
            ], 500);
        }
    };

    \Illuminate\Support\Facades\Route::match(['GET','POST'], 'pmd-owner-dashboard-floor-layout', $__pmdCodexOwnerFloorV28);
    \Illuminate\Support\Facades\Route::match(['GET','POST'], '/pmd-owner-dashboard-floor-layout', $__pmdCodexOwnerFloorV28);
    \Illuminate\Support\Facades\Route::match(['GET','POST'], '/admin/pmd-owner-dashboard-floor-layout', $__pmdCodexOwnerFloorV28);
}
// PMD_CODEX_FLOOR_ENDPOINT_V28_END

/* PMD_OWNER_DASHBOARD_CLEAN_V1_ROUTES_START */
\Illuminate\Support\Facades\Route::get('pmd-owner-dashboard-clean-v1-data', [\Admin\Controllers\PmdOwnerDashboardCleanV1::class, 'index']);



\Illuminate\Support\Facades\Route::get('pmd-owner-dashboard-clean-v1-audit', [\Admin\Controllers\PmdOwnerDashboardCleanV1::class, 'audit']);
\Illuminate\Support\Facades\Route::get('pmd-owner-dashboard-floor-layout', [\Admin\Controllers\PmdOwnerDashboardCleanV1::class, 'floorLayout']);
\Illuminate\Support\Facades\Route::post('pmd-owner-dashboard-floor-layout', [\Admin\Controllers\PmdOwnerDashboardCleanV1::class, 'saveFloorLayout']);
/* PMD_OWNER_DASHBOARD_CLEAN_V1_ROUTES_END */


// PMD_WAITER_DASHBOARD_REBUILD_20260624
\Illuminate\Support\Facades\Route::get('pmd-waiter-dashboard-data', [\Admin\Controllers\PmdWaiterDashboardV149::class, 'data']);
\Illuminate\Support\Facades\Route::get('pmd-waiter-dashboard-audit', [\Admin\Controllers\PmdWaiterDashboardV149::class, 'audit']);
// PMD_WAITER_DASHBOARD_REBUILD_20260624_END

/*
 * Admin route orchestrator. Helper functions and route definitions live in focused modules under routes/.
 */
require_once base_path('app/system/helpers/r2o_outbound_dryrun_helper.php');
require_once base_path('routes/helpers.php');
require_once base_path('routes/admin-app-before.php');
require_once base_path('routes/admin-app-notifications.php');
require_once base_path('routes/fiskaly.php');
require_once base_path('routes/debug.php');
require_once base_path('routes/pos-receipts.php');
require_once base_path('routes/worldline-probe.php');
require_once base_path('routes/qr-pay.php');
require_once base_path('routes/review-social.php');
require_once base_path('routes/terminal-payments.php');


// PMD_WAITER_POS_V221_DIRECT_ROUTE_LOADER_START
// Directly loaded from app/admin/routes.php because this is the route file the
// tenant actually boots. The isolated file can be removed safely on rollback.
if (file_exists(base_path('routes/pmd-waiter-pos-v22.php'))) {
    require_once base_path('routes/pmd-waiter-pos-v22.php');
}
// PMD_WAITER_POS_V221_DIRECT_ROUTE_LOADER_END

// PMD_WAITER_FINAL_V1_ROUTE_LOADER_START
if (file_exists(base_path('routes/pmd-waiter-final-v1.php'))) {
    require base_path('routes/pmd-waiter-final-v1.php');
}
// PMD_WAITER_FINAL_V1_ROUTE_LOADER_END

// PMD_ADMIN_QUICK_MODE_PREVIEW_20260616
if (file_exists(base_path('routes/admin-quick-mode.php'))) {
    require base_path('routes/admin-quick-mode.php');
}

// PMD_WAITER_DASHBOARD_V3_REAL_LIVE_DATA_START
if (!defined('PMD_WAITER_DASHBOARD_V3_REAL_LIVE_DATA')) {
    define('PMD_WAITER_DASHBOARD_V3_REAL_LIVE_DATA', true);

    $__pmdWaiterDashboardV3RealLiveData = function () {
        try {
            $schema = \Illuminate\Support\Facades\Schema::getFacadeRoot();
            $db = \Illuminate\Support\Facades\DB::getFacadeRoot();

            $hasTable = function ($t) use ($schema) {
                try { return $schema->hasTable($t); } catch (\Throwable $e) { return false; }
            };

            $cols = function ($t) use ($schema) {
                try { return $schema->getColumnListing($t); } catch (\Throwable $e) { return []; }
            };

            $pick = function ($cols, $candidates) {
                foreach ($candidates as $c) {
                    if (in_array($c, $cols, true)) return $c;
                }
                return null;
            };

            $firstTable = function ($candidates) use ($hasTable) {
                foreach ($candidates as $t) {
                    if ($hasTable($t)) return $t;
                }
                return null;
            };

            $money = function ($n) {
                $n = is_numeric($n) ? (float)$n : 0.0;
                return '€'.number_format($n, 2, '.', '');
            };

            $tablesTable = $firstTable(['tables']);
            $ordersTable = $firstTable(['orders']);
            $itemsTable  = $firstTable(['order_menus', 'order_menu_items', 'order_items', 'order_menu', 'ordered_items', 'order_details']);
            $menusTable  = $firstTable(['menus', 'menu_items', 'menuitems', 'items', 'products', 'dishes', 'foods']);

            $tables = [];
            $tableLookup = [];

            if ($tablesTable) {
                $tc = $cols($tablesTable);
                $tid = $pick($tc, ['table_id', 'id']);
                $tnum = $pick($tc, ['table_no', 'table_number', 'number', 'no']);
                $tname = $pick($tc, ['table_name', 'pos_table_label', 'name', 'label']);
                $visible = $pick($tc, ['visible_on_floor_plan']);
                $status = $pick($tc, ['table_status', 'status', 'enabled', 'is_enabled']);
                $priority = $pick($tc, ['priority', 'floor_sort', 'sort_order']);
                $fx = $pick($tc, ['floor_x', 'x']);
                $fy = $pick($tc, ['floor_y', 'y']);
                $fw = $pick($tc, ['floor_width', 'w']);
                $fh = $pick($tc, ['floor_height', 'h']);
                $shape = $pick($tc, ['floor_shape', 'shape']);

                $q = $db->table($tablesTable);

                if ($visible) {
                    $q->where(function ($qq) use ($visible) {
                        $qq->whereNull($visible)->orWhere($visible, '<>', 0);
                    });
                }

                if ($status) {
                    $q->where(function ($qq) use ($status) {
                        $qq->whereNull($status)->orWhere($status, '<>', 0);
                    });
                }

                if ($priority) $q->orderBy($priority);
                elseif ($tnum) $q->orderBy($tnum);
                elseif ($tid) $q->orderBy($tid);

                $rawTables = $q->limit(80)->get();

                $i = 0;
                foreach ($rawTables as $row) {
                    $a = (array)$row;
                    $i++;

                    $id = $tid ? ($a[$tid] ?? $i) : $i;
                    $num = $tnum ? trim((string)($a[$tnum] ?? $id)) : (string)$id;
                    $label = $tname ? trim((string)($a[$tname] ?? '')) : '';
                    if ($label === '') $label = 'Table '.$num;

                    if (preg_match('/cashier|delivery|takeaway|pickup|counter/i', strtolower($label))) {
                        continue;
                    }

                    $t = [
                        'id' => $id,
                        'table_id' => $id,
                        'number' => $num,
                        'table_number' => $num,
                        'label' => $label,
                        'name' => $label,
                        'status' => 'free',
                        'open_orders' => 0,
                        'due_count' => 0,
                        'visible_on_floor_plan' => 1,
                        'floor' => [
                            'x' => $fx ? (float)($a[$fx] ?? (80 + (($i - 1) % 6) * 120)) : (80 + (($i - 1) % 6) * 120),
                            'y' => $fy ? (float)($a[$fy] ?? (40 + floor(($i - 1) / 6) * 90)) : (40 + floor(($i - 1) / 6) * 90),
                            'w' => $fw ? (float)($a[$fw] ?? 84) : 84,
                            'h' => $fh ? (float)($a[$fh] ?? 46) : 46,
                            'shape' => $shape ? ($a[$shape] ?? 'pill') : 'pill',
                        ],
                    ];

                    $tables[] = $t;

                    foreach ([$id, $num, $label] as $key) {
                        $key = strtolower(trim((string)$key));
                        if ($key !== '') $tableLookup[$key] = $label;
                    }
                }
            }

            $activeOrders = [];
            $orderIds = [];
            $pendingTotal = 0.0;

            if ($ordersTable) {
                $oc = $cols($ordersTable);
                $oid = $pick($oc, ['order_id', 'id']);
                $otable = $pick($oc, ['table_id', 'table_no', 'table_number', 'table_name', 'order_type']);
                $ototal = $pick($oc, ['order_total', 'total', 'total_amount', 'grand_total', 'subtotal', 'amount']);
                $ostatus = $pick($oc, ['status_id', 'order_status_id', 'status', 'order_status', 'status_name']);
                $ocreated = $pick($oc, ['created_at', 'date_added', 'order_date', 'created_date', 'updated_at']);

                $q = $db->table($ordersTable);

                if ($ostatus) {
                    $q->where(function ($qq) use ($ostatus) {
                        $qq->whereNull($ostatus)
                           ->orWhereNotIn($ostatus, [0, '0', 'paid', 'closed', 'cancelled', 'canceled', 'completed', 'void']);
                    });
                }

                if ($ocreated) $q->orderByDesc($ocreated);
                elseif ($oid) $q->orderByDesc($oid);

                $rows = $q->limit(24)->get();

                foreach ($rows as $row) {
                    $a = (array)$row;

                    $id = $oid ? ($a[$oid] ?? null) : null;
                    if ($id !== null) $orderIds[] = $id;

                    $rawTable = $otable ? trim((string)($a[$otable] ?? '')) : '';
                    $lookupKey = strtolower($rawTable);
                    $tableLabel = $rawTable !== '' && isset($tableLookup[$lookupKey])
                        ? $tableLookup[$lookupKey]
                        : ($rawTable !== '' ? (preg_match('/^\d+$/', $rawTable) ? 'Table '.$rawTable : $rawTable) : 'No table');

                    $totalRaw = $ototal ? ($a[$ototal] ?? 0) : 0;
                    $totalNum = is_numeric($totalRaw) ? (float)$totalRaw : 0.0;
                    $pendingTotal += $totalNum;

                    $statusRaw = $ostatus ? (string)($a[$ostatus] ?? 'Received') : 'Received';
                    $statusLabel = preg_match('/^\d+$/', $statusRaw) ? 'Received' : ucfirst($statusRaw ?: 'Received');

                    $activeOrders[] = [
                        'id' => $id,
                        'order_id' => $id,
                        'table_ref' => $rawTable,
                        'table_label' => $tableLabel,
                        'table_number' => $rawTable,
                        'status' => $statusLabel,
                        'status_label' => $statusLabel,
                        'total' => $totalNum,
                        'total_label' => $money($totalNum),
                        'created_at' => $ocreated ? ($a[$ocreated] ?? null) : null,
                        'items' => [],
                        'edit_url' => $id ? '/admin/orders/edit/'.$id : '/admin/orders',
                    ];
                }
            }

            $itemsByOrder = [];

            if ($itemsTable && count($orderIds)) {
                $ic = $cols($itemsTable);
                $iOrder = $pick($ic, ['order_id', 'orderId', 'orderID']);
                $iMenu = $pick($ic, ['menu_id', 'menu_item_id', 'item_id', 'food_id', 'product_id']);
                $iName = $pick($ic, ['name', 'menu_name', 'item_name', 'order_menu_name', 'menu_item_name', 'title']);
                $iQty = $pick($ic, ['quantity', 'qty', 'order_quantity', 'count']);
                $iNote = $pick($ic, ['comment', 'note', 'notes', 'instructions']);

                $menuNames = [];
                if ($menusTable && $iMenu) {
                    $mc = $cols($menusTable);
                    $mId = $pick($mc, ['menu_id', 'id', 'item_id', 'product_id']);
                    $mName = $pick($mc, ['menu_name', 'name', 'item_name', 'title']);
                    if ($mId && $mName) {
                        try {
                            $db->table($menusTable)->limit(1000)->get([$mId, $mName])->each(function ($r) use (&$menuNames, $mId, $mName) {
                                $a = (array)$r;
                                $menuNames[(string)($a[$mId] ?? '')] = (string)($a[$mName] ?? '');
                            });
                        } catch (\Throwable $e) {}
                    }
                }

                if ($iOrder) {
                    try {
                        $itemRows = $db->table($itemsTable)->whereIn($iOrder, $orderIds)->limit(250)->get();
                        foreach ($itemRows as $row) {
                            $a = (array)$row;
                            $orderKey = (string)($a[$iOrder] ?? '');
                            if ($orderKey === '') continue;

                            $menuKey = $iMenu ? (string)($a[$iMenu] ?? '') : '';
                            $name = $iName ? trim((string)($a[$iName] ?? '')) : '';
                            if ($name === '' && $menuKey !== '' && isset($menuNames[$menuKey])) $name = $menuNames[$menuKey];
                            if ($name === '') $name = 'Item';

                            $itemsByOrder[$orderKey][] = [
                                'name' => $name,
                                'qty' => $iQty ? ($a[$iQty] ?? '') : '',
                                'note' => $iNote ? ($a[$iNote] ?? '') : '',
                            ];
                        }
                    } catch (\Throwable $e) {}
                }
            }

            foreach ($activeOrders as &$o) {
                $key = (string)($o['id'] ?? '');
                if ($key !== '' && isset($itemsByOrder[$key])) {
                    $o['items'] = array_slice($itemsByOrder[$key], 0, 8);
                }
            }
            unset($o);

            $openByTable = [];
            foreach ($activeOrders as $o) {
                $ref = strtolower(trim((string)($o['table_ref'] ?? '')));
                if ($ref === '') continue;
                if (!isset($openByTable[$ref])) $openByTable[$ref] = 0;
                $openByTable[$ref]++;
            }

            foreach ($tables as &$t) {
                $keys = [
                    strtolower(trim((string)($t['id'] ?? ''))),
                    strtolower(trim((string)($t['number'] ?? ''))),
                    strtolower(trim((string)($t['label'] ?? ''))),
                ];

                $count = 0;
                foreach ($keys as $key) {
                    if ($key !== '' && isset($openByTable[$key])) $count += $openByTable[$key];
                }

                $t['open_orders'] = $count;
                $t['due_count'] = $count;
                $t['status'] = $count > 0 ? 'busy' : 'free';
            }
            unset($t);

            $busy = count(array_filter($tables, fn($t) => (int)($t['open_orders'] ?? 0) > 0));
            $totalTables = count($tables);
            $free = max(0, $totalTables - $busy);

            return response()->json([
                'ok' => true,
                'version' => 'waiter-dashboard-v3-real-live-data',
                'generated_at' => date('c'),
                'sources' => [
                    'tables' => $tablesTable,
                    'orders' => $ordersTable,
                    'order_items' => $itemsTable,
                    'menus' => $menusTable,
                ],
                'metrics' => [
                    'active_tables' => ['label' => 'Active Tables', 'value' => (string)$busy, 'raw' => $busy],
                    'open_orders' => ['label' => 'Active Orders', 'value' => (string)count($activeOrders), 'raw' => count($activeOrders)],
                    'pending_value' => ['label' => 'Payment Waiting', 'value' => $money($pendingTotal), 'raw' => $pendingTotal],
                    'kitchen_queue' => ['label' => 'Kitchen Attention', 'value' => (string)count($activeOrders), 'raw' => count($activeOrders)],
                ],
                'sections' => [
                    'active_orders' => $activeOrders,
                    'open_orders' => $activeOrders,
                    'recent_orders' => $activeOrders,
                    'floor_plan' => [
                        'tables' => $tables,
                        'summary' => [
                            'total' => $totalTables,
                            'busy' => $busy,
                            'free' => $free,
                            'active' => $busy,
                        ],
                    ],
                    'kitchen' => [
                        'delayed' => count($activeOrders),
                        'queue' => count($activeOrders),
                    ],
                ],
                'debug' => [
                    'order_ids' => array_slice($orderIds, 0, 20),
                    'orders_with_items' => count(array_filter($activeOrders, fn($o) => count($o['items'] ?? []) > 0)),
                    'tables_returned' => count($tables),
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'version' => 'waiter-dashboard-v3-real-live-data',
                'error' => $e->getMessage(),
                'file' => basename($e->getFile()),
                'line' => $e->getLine(),
            ], 500);
        }
    };

    \Illuminate\Support\Facades\Route::get('pmd-waiter-dashboard-v3-live-data', $__pmdWaiterDashboardV3RealLiveData);
    \Illuminate\Support\Facades\Route::get('/pmd-waiter-dashboard-v3-live-data', $__pmdWaiterDashboardV3RealLiveData);
    \Illuminate\Support\Facades\Route::get('/admin/pmd-waiter-dashboard-v3-live-data', $__pmdWaiterDashboardV3RealLiveData);

}
// PMD_WAITER_DASHBOARD_V3_REAL_LIVE_DATA_END


// PMD_WAITER_DASHBOARD_V4_WORKFLOW_DATA_START
if (!defined('PMD_WAITER_DASHBOARD_V4_WORKFLOW_DATA')) {
    define('PMD_WAITER_DASHBOARD_V4_WORKFLOW_DATA', true);

    $__pmdWaiterDashboardV4WorkflowData = function () {
        try {
            $schema = \Illuminate\Support\Facades\Schema::getFacadeRoot();
            $db = \Illuminate\Support\Facades\DB::getFacadeRoot();

            $hasTable = function ($t) use ($schema) {
                try { return $schema->hasTable($t); } catch (\Throwable $e) { return false; }
            };

            $cols = function ($t) use ($schema) {
                try { return $schema->getColumnListing($t); } catch (\Throwable $e) { return []; }
            };

            $pick = function ($cols, $candidates) {
                foreach ($candidates as $c) {
                    if (in_array($c, $cols, true)) return $c;
                }
                return null;
            };

            $firstTable = function ($candidates) use ($hasTable) {
                foreach ($candidates as $t) {
                    if ($hasTable($t)) return $t;
                }
                return null;
            };

            $money = function ($n) {
                $n = is_numeric($n) ? (float)$n : 0.0;
                return '€'.number_format($n, 2, '.', '');
            };

            $clean = function ($v) {
                $v = trim((string)($v ?? ''));
                return $v === '' ? null : $v;
            };

            $tablesTable = $firstTable(['tables']);
            $ordersTable = $firstTable(['orders']);
            $itemsTable  = $firstTable(['order_menus', 'order_menu_items', 'order_items', 'order_menu', 'ordered_items', 'order_details']);
            $menusTable  = $firstTable(['menus', 'menu_items', 'menuitems', 'items', 'products', 'dishes', 'foods']);
            $statusTable = $firstTable(['statuses', 'order_statuses', 'status']);
            $optionsTable = $firstTable(['order_menu_options', 'order_options', 'order_item_options', 'order_menu_option_values']);

            $statusMap = [];
            if ($statusTable) {
                try {
                    $sc = $cols($statusTable);
                    $sid = $pick($sc, ['status_id', 'id']);
                    $sname = $pick($sc, ['status_name', 'name', 'label', 'title']);
                    if ($sid && $sname) {
                        foreach ($db->table($statusTable)->limit(500)->get([$sid, $sname]) as $r) {
                            $a = (array)$r;
                            $statusMap[(string)($a[$sid] ?? '')] = (string)($a[$sname] ?? '');
                        }
                    }
                } catch (\Throwable $e) {}
            }

            $tables = [];
            $tableLookup = [];

            if ($tablesTable) {
                $tc = $cols($tablesTable);
                $tid = $pick($tc, ['table_id', 'id']);
                $tnum = $pick($tc, ['table_no', 'table_number', 'number', 'no']);
                $tname = $pick($tc, ['table_name', 'pos_table_label', 'name', 'label']);
                $visible = $pick($tc, ['visible_on_floor_plan']);
                $status = $pick($tc, ['table_status', 'status', 'enabled', 'is_enabled']);
                $priority = $pick($tc, ['priority', 'floor_sort', 'sort_order']);
                $fx = $pick($tc, ['floor_x', 'x']);
                $fy = $pick($tc, ['floor_y', 'y']);
                $fw = $pick($tc, ['floor_width', 'w']);
                $fh = $pick($tc, ['floor_height', 'h']);
                $shape = $pick($tc, ['floor_shape', 'shape']);

                $q = $db->table($tablesTable);

                if ($visible) {
                    $q->where(function ($qq) use ($visible) {
                        $qq->whereNull($visible)->orWhere($visible, '<>', 0);
                    });
                }

                if ($status) {
                    $q->where(function ($qq) use ($status) {
                        $qq->whereNull($status)->orWhere($status, '<>', 0);
                    });
                }

                if ($priority) $q->orderBy($priority);
                elseif ($tnum) $q->orderBy($tnum);
                elseif ($tid) $q->orderBy($tid);

                $rawTables = $q->limit(100)->get();

                $i = 0;
                foreach ($rawTables as $row) {
                    $a = (array)$row;
                    $i++;

                    $id = $tid ? ($a[$tid] ?? $i) : $i;
                    $num = $tnum ? trim((string)($a[$tnum] ?? $id)) : (string)$id;
                    $label = $tname ? trim((string)($a[$tname] ?? '')) : '';
                    if ($label === '') $label = 'Table '.$num;

                    if (preg_match('/cashier|delivery|takeaway|pickup|counter/i', strtolower($label))) {
                        continue;
                    }

                    $t = [
                        'id' => $id,
                        'table_id' => $id,
                        'number' => $num,
                        'table_number' => $num,
                        'label' => $label,
                        'name' => $label,
                        'status' => 'free',
                        'open_orders' => 0,
                        'due_count' => 0,
                        'floor' => [
                            'x' => $fx ? (float)($a[$fx] ?? (80 + (($i - 1) % 6) * 120)) : (80 + (($i - 1) % 6) * 120),
                            'y' => $fy ? (float)($a[$fy] ?? (40 + floor(($i - 1) / 6) * 90)) : (40 + floor(($i - 1) / 6) * 90),
                            'w' => $fw ? (float)($a[$fw] ?? 84) : 84,
                            'h' => $fh ? (float)($a[$fh] ?? 46) : 46,
                            'shape' => $shape ? ($a[$shape] ?? 'pill') : 'pill',
                        ],
                    ];

                    $tables[] = $t;

                    foreach ([$id, $num, $label, 'Table '.$num] as $key) {
                        $key = strtolower(trim((string)$key));
                        if ($key !== '') $tableLookup[$key] = $label;
                    }
                }
            }

            $activeOrders = [];
            $orderIds = [];
            $orderRawRows = [];
            $pendingTotal = 0.0;

            if ($ordersTable) {
                $oc = $cols($ordersTable);
                $oid = $pick($oc, ['order_id', 'id']);
                $otable = $pick($oc, ['table_id', 'table_no', 'table_number', 'table_name', 'order_type']);
                $ototal = $pick($oc, ['order_total', 'total', 'total_amount', 'grand_total', 'subtotal', 'amount']);
                $ostatus = $pick($oc, ['status_id', 'order_status_id', 'status', 'order_status', 'status_name']);
                $ocreated = $pick($oc, ['created_at', 'date_added', 'order_date', 'created_date', 'updated_at']);
                $oupdated = $pick($oc, ['updated_at', 'date_modified', 'modified_at']);
                $onote = $pick($oc, [
                    'customer_note', 'order_note', 'kitchen_note', 'staff_note',
                    'comment', 'comments', 'note', 'notes', 'special_instructions',
                    'instructions', 'delivery_comment', 'customer_comment'
                ]);

                $q = $db->table($ordersTable);

                if ($ocreated) $q->orderByDesc($ocreated);
                elseif ($oid) $q->orderByDesc($oid);

                $rows = $q->limit(80)->get();

                foreach ($rows as $row) {
                    $a = (array)$row;

                    $id = $oid ? ($a[$oid] ?? null) : null;
                    if ($id !== null) $orderIds[] = $id;
                    $orderRawRows[(string)$id] = $a;

                    $statusRaw = $ostatus ? (string)($a[$ostatus] ?? 'Received') : 'Received';
                    $statusLabel = $statusRaw;
                    if (isset($statusMap[$statusRaw]) && trim($statusMap[$statusRaw]) !== '') {
                        $statusLabel = $statusMap[$statusRaw];
                    } elseif (preg_match('/^\d+$/', $statusRaw)) {
                        $statusLabel = 'Received';
                    } else {
                        $statusLabel = ucfirst($statusRaw ?: 'Received');
                    }

                    $statusLower = strtolower($statusLabel.' '.$statusRaw);
                    if (preg_match('/cancel|void|closed|complete|completed|paid/i', $statusLower)) {
                        continue;
                    }

                    $rawTable = $otable ? trim((string)($a[$otable] ?? '')) : '';
                    $lookupKey = strtolower($rawTable);
                    $tableLabel = $rawTable !== '' && isset($tableLookup[$lookupKey])
                        ? $tableLookup[$lookupKey]
                        : ($rawTable !== '' ? (preg_match('/^\d+$/', $rawTable) ? 'Table '.$rawTable : $rawTable) : 'No table');

                    $totalRaw = $ototal ? ($a[$ototal] ?? 0) : 0;
                    $totalNum = is_numeric($totalRaw) ? (float)$totalRaw : 0.0;
                    $pendingTotal += $totalNum;

                    $noteText = $onote ? $clean($a[$onote] ?? null) : null;

                    $activeOrders[] = [
                        'id' => $id,
                        'order_id' => $id,
                        'table_ref' => $rawTable,
                        'table_label' => $tableLabel,
                        'table_number' => $rawTable,
                        'status' => $statusLabel,
                        'status_label' => $statusLabel,
                        'status_raw' => $statusRaw,
                        'total' => $totalNum,
                        'total_label' => $money($totalNum),
                        'created_at' => $ocreated ? ($a[$ocreated] ?? null) : null,
                        'updated_at' => $oupdated ? ($a[$oupdated] ?? null) : null,
                        'note' => $noteText,
                        'has_note' => $noteText ? true : false,
                        'items' => [],
                        'edit_url' => $id ? '/admin/orders/edit/'.$id : '/admin/orders',
                        'payment_url' => $id ? '/admin/orders/edit/'.$id.'#payment' : '/admin/orders',
                    ];
                }
            }

            $itemsByOrder = [];
            $itemIdsByOrder = [];
            $itemRowToOrder = [];

            if ($itemsTable && count($orderIds)) {
                $ic = $cols($itemsTable);
                $iId = $pick($ic, ['order_menu_id', 'id', 'order_item_id']);
                $iOrder = $pick($ic, ['order_id', 'orderId', 'orderID']);
                $iMenu = $pick($ic, ['menu_id', 'menu_item_id', 'item_id', 'food_id', 'product_id']);
                $iName = $pick($ic, ['name', 'menu_name', 'item_name', 'order_menu_name', 'menu_item_name', 'title']);
                $iQty = $pick($ic, ['quantity', 'qty', 'order_quantity', 'count']);
                $iNote = $pick($ic, ['comment', 'note', 'notes', 'instructions', 'special_instructions']);
                $iOptionsInline = $pick($ic, ['options', 'modifiers', 'menu_options', 'option_values']);

                $menuNames = [];
                if ($menusTable && $iMenu) {
                    $mc = $cols($menusTable);
                    $mId = $pick($mc, ['menu_id', 'id', 'item_id', 'product_id']);
                    $mName = $pick($mc, ['menu_name', 'name', 'item_name', 'title']);
                    if ($mId && $mName) {
                        try {
                            $db->table($menusTable)->limit(1500)->get([$mId, $mName])->each(function ($r) use (&$menuNames, $mId, $mName) {
                                $a = (array)$r;
                                $menuNames[(string)($a[$mId] ?? '')] = (string)($a[$mName] ?? '');
                            });
                        } catch (\Throwable $e) {}
                    }
                }

                if ($iOrder) {
                    try {
                        $itemRows = $db->table($itemsTable)->whereIn($iOrder, $orderIds)->limit(500)->get();
                        foreach ($itemRows as $row) {
                            $a = (array)$row;
                            $orderKey = (string)($a[$iOrder] ?? '');
                            if ($orderKey === '') continue;

                            $itemKey = $iId ? (string)($a[$iId] ?? '') : '';
                            if ($itemKey !== '') {
                                $itemIdsByOrder[$orderKey][] = $itemKey;
                                $itemRowToOrder[$itemKey] = $orderKey;
                            }

                            $menuKey = $iMenu ? (string)($a[$iMenu] ?? '') : '';
                            $name = $iName ? trim((string)($a[$iName] ?? '')) : '';
                            if ($name === '' && $menuKey !== '' && isset($menuNames[$menuKey])) $name = $menuNames[$menuKey];
                            if ($name === '') $name = 'Item';

                            $inlineOptions = [];
                            if ($iOptionsInline && !empty($a[$iOptionsInline])) {
                                $rawOpt = $a[$iOptionsInline];
                                if (is_string($rawOpt)) {
                                    $decoded = json_decode($rawOpt, true);
                                    if (is_array($decoded)) {
                                        foreach ($decoded as $op) {
                                            if (is_array($op)) $inlineOptions[] = trim(($op['name'] ?? $op['label'] ?? 'Option').' '.($op['value'] ?? $op['option_value'] ?? ''));
                                            else $inlineOptions[] = (string)$op;
                                        }
                                    } else {
                                        $inlineOptions[] = $rawOpt;
                                    }
                                }
                            }

                            $itemsByOrder[$orderKey][] = [
                                'item_row_id' => $itemKey,
                                'name' => $name,
                                'qty' => $iQty ? ($a[$iQty] ?? '') : '',
                                'note' => $iNote ? ($a[$iNote] ?? '') : '',
                                'modifiers' => array_values(array_filter($inlineOptions)),
                            ];
                        }
                    } catch (\Throwable $e) {}
                }
            }

            if ($optionsTable && count($itemRowToOrder)) {
                try {
                    $opc = $cols($optionsTable);
                    $opItem = $pick($opc, ['order_menu_id', 'order_item_id', 'item_id', 'order_menu_option_id']);
                    $opOrder = $pick($opc, ['order_id']);
                    $opName = $pick($opc, ['option_name', 'name', 'menu_option_name', 'label', 'title']);
                    $opValue = $pick($opc, ['option_value', 'value', 'menu_option_value', 'option']);
                    $opQty = $pick($opc, ['quantity', 'qty']);

                    if ($opItem) {
                        $optionRows = $db->table($optionsTable)->whereIn($opItem, array_keys($itemRowToOrder))->limit(500)->get();
                        foreach ($optionRows as $r) {
                            $a = (array)$r;
                            $itemKey = (string)($a[$opItem] ?? '');
                            $orderKey = $itemRowToOrder[$itemKey] ?? null;
                            if (!$orderKey || empty($itemsByOrder[$orderKey])) continue;

                            $txt = trim((string)($opName ? ($a[$opName] ?? '') : ''));
                            $val = trim((string)($opValue ? ($a[$opValue] ?? '') : ''));
                            if ($val !== '' && $val !== $txt) $txt .= ($txt ? ': ' : '').$val;
                            if ($opQty && !empty($a[$opQty])) $txt .= ' ×'.$a[$opQty];
                            if ($txt === '') continue;

                            foreach ($itemsByOrder[$orderKey] as &$it) {
                                if ((string)($it['item_row_id'] ?? '') === $itemKey) {
                                    $it['modifiers'][] = $txt;
                                    break;
                                }
                            }
                            unset($it);
                        }
                    }
                } catch (\Throwable $e) {}
            }

            foreach ($activeOrders as &$o) {
                $key = (string)($o['id'] ?? '');
                if ($key !== '' && isset($itemsByOrder[$key])) {
                    $o['items'] = array_slice($itemsByOrder[$key], 0, 10);
                }

                $hasItemNote = false;
                $hasModifiers = false;
                foreach (($o['items'] ?? []) as $it) {
                    if (!empty($it['note'])) $hasItemNote = true;
                    if (!empty($it['modifiers'])) $hasModifiers = true;
                }

                $o['has_item_note'] = $hasItemNote;
                $o['has_modifiers'] = $hasModifiers;
                $o['priority'] = 0;

                $sl = strtolower((string)($o['status_label'] ?? ''));
                if ($o['has_note'] || $hasItemNote || $hasModifiers) $o['priority'] += 60;
                if (preg_match('/ready|delay|late|waiting|received|pending/i', $sl)) $o['priority'] += 30;

                $created = !empty($o['created_at']) ? strtotime((string)$o['created_at']) : false;
                if ($created) {
                    $ageMin = max(0, floor((time() - $created) / 60));
                    $o['age_minutes'] = $ageMin;
                    if ($ageMin > 120) {
                        $o['old_open'] = true;
                        $o['priority'] += 15;
                    } else {
                        $o['old_open'] = false;
                    }
                } else {
                    $o['age_minutes'] = null;
                    $o['old_open'] = false;
                }
            }
            unset($o);

            usort($activeOrders, function ($a, $b) {
                $pa = (int)($a['priority'] ?? 0);
                $pb = (int)($b['priority'] ?? 0);
                if ($pa !== $pb) return $pb <=> $pa;

                $ta = !empty($a['created_at']) ? strtotime((string)$a['created_at']) : 0;
                $tb = !empty($b['created_at']) ? strtotime((string)$b['created_at']) : 0;
                return $ta <=> $tb;
            });

            $openByTable = [];
            foreach ($activeOrders as $o) {
                $ref = strtolower(trim((string)($o['table_ref'] ?? '')));
                if ($ref === '') continue;
                if (!isset($openByTable[$ref])) $openByTable[$ref] = 0;
                $openByTable[$ref]++;
            }

            foreach ($tables as &$t) {
                $keys = [
                    strtolower(trim((string)($t['id'] ?? ''))),
                    strtolower(trim((string)($t['number'] ?? ''))),
                    strtolower(trim((string)($t['label'] ?? ''))),
                ];

                $count = 0;
                foreach ($keys as $key) {
                    if ($key !== '' && isset($openByTable[$key])) $count += $openByTable[$key];
                }

                $t['open_orders'] = $count;
                $t['due_count'] = $count;
                $t['status'] = $count > 0 ? 'busy' : 'free';
            }
            unset($t);

            $busy = count(array_filter($tables, fn($t) => (int)($t['open_orders'] ?? 0) > 0));
            $totalTables = count($tables);
            $free = max(0, $totalTables - $busy);

            return response()->json([
                'ok' => true,
                'version' => 'waiter-dashboard-v4-workflow-data',
                'generated_at' => date('c'),
                'sources' => [
                    'tables' => $tablesTable,
                    'orders' => $ordersTable,
                    'order_items' => $itemsTable,
                    'menus' => $menusTable,
                    'statuses' => $statusTable,
                    'options' => $optionsTable,
                ],
                'metrics' => [
                    'active_tables' => ['label' => 'Active Tables', 'value' => (string)$busy, 'raw' => $busy],
                    'open_orders' => ['label' => 'Active Orders', 'value' => (string)count($activeOrders), 'raw' => count($activeOrders)],
                    'pending_value' => ['label' => 'Payment Waiting', 'value' => $money($pendingTotal), 'raw' => $pendingTotal],
                    'kitchen_queue' => ['label' => 'Kitchen Attention', 'value' => (string)count($activeOrders), 'raw' => count($activeOrders)],
                    'notes_count' => ['label' => 'Notes', 'value' => (string)count(array_filter($activeOrders, fn($o) => !empty($o['has_note']) || !empty($o['has_item_note']))), 'raw' => count(array_filter($activeOrders, fn($o) => !empty($o['has_note']) || !empty($o['has_item_note'])))],
                ],
                'sections' => [
                    'active_orders' => $activeOrders,
                    'open_orders' => $activeOrders,
                    'recent_orders' => $activeOrders,
                    'floor_plan' => [
                        'tables' => $tables,
                        'summary' => [
                            'total' => $totalTables,
                            'busy' => $busy,
                            'free' => $free,
                            'active' => $busy,
                        ],
                    ],
                    'kitchen' => [
                        'delayed' => count($activeOrders),
                        'queue' => count($activeOrders),
                    ],
                ],
                'debug' => [
                    'order_ids' => array_slice(array_map(fn($o) => $o['id'] ?? null, $activeOrders), 0, 20),
                    'orders_with_items' => count(array_filter($activeOrders, fn($o) => count($o['items'] ?? []) > 0)),
                    'orders_with_notes' => count(array_filter($activeOrders, fn($o) => !empty($o['has_note']) || !empty($o['has_item_note']))),
                    'orders_with_modifiers' => count(array_filter($activeOrders, fn($o) => !empty($o['has_modifiers']))),
                    'tables_returned' => count($tables),
                ],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'version' => 'waiter-dashboard-v4-workflow-data',
                'error' => $e->getMessage(),
                'file' => basename($e->getFile()),
                'line' => $e->getLine(),
            ], 500);
        }
    };

    \Illuminate\Support\Facades\Route::get('pmd-waiter-dashboard-v4-workflow-data', $__pmdWaiterDashboardV4WorkflowData);
    \Illuminate\Support\Facades\Route::get('/pmd-waiter-dashboard-v4-workflow-data', $__pmdWaiterDashboardV4WorkflowData);
    \Illuminate\Support\Facades\Route::get('/admin/pmd-waiter-dashboard-v4-workflow-data', $__pmdWaiterDashboardV4WorkflowData);
}
// PMD_WAITER_DASHBOARD_V4_WORKFLOW_DATA_END


// PMD_WAITER_DASHBOARD_V5_STATUS_UPDATE_START
if (!defined('PMD_WAITER_DASHBOARD_V5_STATUS_UPDATE')) {
    define('PMD_WAITER_DASHBOARD_V5_STATUS_UPDATE', true);

    $__pmdWaiterDashboardV5StatusUpdate = function (\Illuminate\Http\Request $request) {
        try {
            $schema = \Illuminate\Support\Facades\Schema::getFacadeRoot();
            $db = \Illuminate\Support\Facades\DB::getFacadeRoot();

            $orderId = (int) $request->input('order_id');
            $statusLabel = trim((string) $request->input('status_label', ''));

            if ($orderId <= 0 || $statusLabel === '') {
                return response()->json([
                    'ok' => false,
                    'error' => 'Missing order_id or status_label',
                ], 422);
            }

            $hasTable = function ($t) use ($schema) {
                try { return $schema->hasTable($t); } catch (\Throwable $e) { return false; }
            };

            $cols = function ($t) use ($schema) {
                try { return $schema->getColumnListing($t); } catch (\Throwable $e) { return []; }
            };

            $pick = function ($cols, $candidates) {
                foreach ($candidates as $c) {
                    if (in_array($c, $cols, true)) return $c;
                }
                return null;
            };

            $normalize = function ($v) {
                $v = strtolower(trim((string) $v));
                $v = preg_replace('/[^a-z0-9]+/', ' ', $v);
                return trim($v);
            };

            $ordersTable = null;
            foreach (['orders', 'order_orders', 'restaurant_orders'] as $t) {
                if ($hasTable($t)) {
                    $ordersTable = $t;
                    break;
                }
            }

            if (!$ordersTable) {
                return response()->json([
                    'ok' => false,
                    'error' => 'Orders table not found',
                ], 500);
            }

            $orderCols = $cols($ordersTable);
            $pk = $pick($orderCols, ['order_id', 'id']);
            $statusCol = $pick($orderCols, ['status_id', 'order_status_id', 'status', 'order_status', 'status_code']);

            if (!$pk || !$statusCol) {
                return response()->json([
                    'ok' => false,
                    'error' => 'Order primary key or status column not found',
                    'orders_table' => $ordersTable,
                    'columns' => $orderCols,
                ], 500);
            }

            $order = $db->table($ordersTable)->where($pk, $orderId)->first();

            if (!$order) {
                return response()->json([
                    'ok' => false,
                    'error' => 'Order not found',
                    'order_id' => $orderId,
                ], 404);
            }

            $statusValue = null;
            $wanted = $normalize($statusLabel);

            if (is_numeric($statusLabel)) {
                $statusValue = (int) $statusLabel;
            }

            $looksNumericStatus = str_ends_with($statusCol, '_id') || is_numeric((string) ($order->{$statusCol} ?? ''));

            if ($statusValue === null && $looksNumericStatus) {
                foreach (['statuses', 'order_statuses', 'order_status'] as $st) {
                    if (!$hasTable($st)) continue;

                    $sc = $cols($st);
                    $sid = $pick($sc, ['status_id', 'id']);
                    $sname = $pick($sc, ['status_name', 'name', 'label', 'title']);
                    $sfor = $pick($sc, ['status_for', 'type', 'context']);

                    if (!$sid || !$sname) continue;

                    $q = $db->table($st);

                    if ($sfor) {
                        try {
                            $q->where(function ($qq) use ($sfor) {
                                $qq->where($sfor, 'order')
                                   ->orWhere($sfor, 'orders')
                                   ->orWhereNull($sfor);
                            });
                        } catch (\Throwable $e) {}
                    }

                    $rows = $q->limit(80)->get();

                    foreach ($rows as $r) {
                        $name = $normalize($r->{$sname} ?? '');
                        if ($name === $wanted || str_contains($name, $wanted) || str_contains($wanted, $name)) {
                            $statusValue = $r->{$sid};
                            break 2;
                        }
                    }
                }
            }

            if ($statusValue === null && !$looksNumericStatus) {
                $statusValue = $statusLabel;
            }

            if ($statusValue === null) {
                return response()->json([
                    'ok' => false,
                    'error' => 'Could not map status label to a real status value',
                    'status_label' => $statusLabel,
                    'status_column' => $statusCol,
                ], 422);
            }

            $db->table($ordersTable)->where($pk, $orderId)->update([
                $statusCol => $statusValue,
                'updated_at' => date('Y-m-d H:i:s'),
            ]);

            return response()->json([
                'ok' => true,
                'order_id' => $orderId,
                'status_label' => $statusLabel,
                'status_column' => $statusCol,
                'status_value' => $statusValue,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'error' => $e->getMessage(),
                'file' => basename($e->getFile()),
                'line' => $e->getLine(),
            ], 500);
        }
    };

    \Illuminate\Support\Facades\Route::post('pmd-waiter-dashboard-v5-status-update', $__pmdWaiterDashboardV5StatusUpdate);
    \Illuminate\Support\Facades\Route::post('/pmd-waiter-dashboard-v5-status-update', $__pmdWaiterDashboardV5StatusUpdate);
    \Illuminate\Support\Facades\Route::post('/admin/pmd-waiter-dashboard-v5-status-update', $__pmdWaiterDashboardV5StatusUpdate);
}
// PMD_WAITER_DASHBOARD_V5_STATUS_UPDATE_END


// PMD_WAITER_DASHBOARD_V6_STATUS_OPTIONS_START
if (!defined('PMD_WAITER_DASHBOARD_V6_STATUS_OPTIONS')) {
    define('PMD_WAITER_DASHBOARD_V6_STATUS_OPTIONS', true);

    $__pmdWaiterDashboardV6StatusOptions = function () {
        try {
            $schema = \Illuminate\Support\Facades\Schema::getFacadeRoot();
            $db = \Illuminate\Support\Facades\DB::getFacadeRoot();

            $hasTable = function ($t) use ($schema) {
                try { return $schema->hasTable($t); } catch (\Throwable $e) { return false; }
            };

            $cols = function ($t) use ($schema) {
                try { return $schema->getColumnListing($t); } catch (\Throwable $e) { return []; }
            };

            $pick = function ($cols, $candidates) {
                foreach ($candidates as $c) {
                    if (in_array($c, $cols, true)) return $c;
                }
                return null;
            };

            $tables = ['statuses', 'order_statuses', 'order_status', 'orderstatus', 'status'];
            $options = [];
            $sources = [];

            foreach ($tables as $t) {
                if (!$hasTable($t)) continue;

                $c = $cols($t);
                $idCol = $pick($c, ['status_id', 'id']);
                $nameCol = $pick($c, ['status_name', 'name', 'label', 'title', 'status']);
                $forCol = $pick($c, ['status_for', 'type', 'context', 'scope']);

                if (!$idCol && !$nameCol) continue;

                $q = $db->table($t);

                try {
                    if ($idCol) $q->orderBy($idCol, 'asc');
                } catch (\Throwable $e) {}

                $rows = $q->limit(120)->get();
                $sources[] = [
                    'table' => $t,
                    'id_col' => $idCol,
                    'name_col' => $nameCol,
                    'for_col' => $forCol,
                    'count' => count($rows),
                ];

                foreach ($rows as $r) {
                    $value = $idCol ? ($r->{$idCol} ?? null) : null;
                    $label = $nameCol ? trim((string) ($r->{$nameCol} ?? '')) : '';

                    if ($label === '' && $value !== null) $label = 'Status '.$value;
                    if ($value === null && $label !== '') $value = $label;
                    if ($label === '' || $value === null) continue;

                    $context = $forCol ? (string) ($r->{$forCol} ?? '') : '';

                    $key = strtolower($t.'|'.$value.'|'.$label);
                    $options[$key] = [
                        'value' => $value,
                        'label' => $label,
                        'source' => $t,
                        'context' => $context,
                    ];
                }
            }

            return response()->json([
                'ok' => true,
                'version' => 'waiter-dashboard-v6-status-options',
                'options' => array_values($options),
                'sources' => $sources,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'error' => $e->getMessage(),
                'file' => basename($e->getFile()),
                'line' => $e->getLine(),
            ], 500);
        }
    };

    \Illuminate\Support\Facades\Route::get('pmd-waiter-dashboard-v6-status-options', $__pmdWaiterDashboardV6StatusOptions);
    \Illuminate\Support\Facades\Route::get('/pmd-waiter-dashboard-v6-status-options', $__pmdWaiterDashboardV6StatusOptions);
    \Illuminate\Support\Facades\Route::get('/admin/pmd-waiter-dashboard-v6-status-options', $__pmdWaiterDashboardV6StatusOptions);
}
// PMD_WAITER_DASHBOARD_V6_STATUS_OPTIONS_END


// PMD_WAITER_DASHBOARD_V8_REAL_FLOOR_TABLES_START
if (!defined('PMD_WAITER_DASHBOARD_V8_REAL_FLOOR_TABLES')) {
    define('PMD_WAITER_DASHBOARD_V8_REAL_FLOOR_TABLES', true);

    $__pmdWaiterDashboardV8RealFloorTables = function () {
        try {
            $db = \Illuminate\Support\Facades\DB::getFacadeRoot();

            $qi = function ($name) {
                return '`' . str_replace('`', '``', $name) . '`';
            };

            $host = request()->getHost();
            $sub = explode('.', $host)[0] ?? '';
            $current = null;

            try {
                $row = $db->selectOne('select database() as db');
                $current = $row->db ?? null;
            } catch (\Throwable $e) {}

            $candidates = array_values(array_unique(array_filter([
                $current,
                $sub,
                $sub === 'mimoza' ? 'mimoza' : null,
                getenv('PMD_TENANT_DB') ?: null,
            ])));

            $tenantDb = null;

            foreach ($candidates as $cand) {
                $exists = $db->selectOne("
                    SELECT COUNT(*) AS c
                    FROM information_schema.TABLES
                    WHERE TABLE_SCHEMA = ?
                      AND TABLE_NAME = 'ti_tables'
                ", [$cand]);

                if ($exists && (int)$exists->c > 0) {
                    $tenantDb = $cand;
                    break;
                }
            }

            if (!$tenantDb) {
                return response()->json([
                    'ok' => false,
                    'error' => 'ti_tables not found for current tenant host',
                    'host' => $host,
                    'candidates' => $candidates,
                ], 404);
            }

            $colRows = $db->select("
                SELECT COLUMN_NAME
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = ?
                  AND TABLE_NAME = 'ti_tables'
            ", [$tenantDb]);

            $cols = [];
            foreach ($colRows as $r) {
                $cols[$r->COLUMN_NAME] = true;
            }

            $has = function ($c) use ($cols) {
                return isset($cols[$c]);
            };

            $pick = function ($candidates) use ($cols) {
                foreach ($candidates as $c) {
                    if (isset($cols[$c])) return $c;
                }
                return null;
            };

            $numCol = $pick(['table_no', 'table_number', 'number', 'id', 'table_id']);
            $idCol = $pick(['table_id', 'id']);
            $nameCol = $pick(['table_name', 'name', 'title']);

            if (!$numCol) {
                return response()->json([
                    'ok' => false,
                    'error' => 'No table number column found',
                    'tenant_db' => $tenantDb,
                    'columns' => array_keys($cols),
                ], 500);
            }

            $select = [];
            $select[] = $idCol ? $qi($idCol) . " AS id" : "NULL AS id";
            $select[] = $qi($numCol) . " AS table_no";
            $select[] = $nameCol ? $qi($nameCol) . " AS table_name" : "CONCAT('Table ', ".$qi($numCol).") AS table_name";
            $select[] = $has('min_capacity') ? "`min_capacity` AS min_capacity" : "NULL AS min_capacity";
            $select[] = $has('max_capacity') ? "`max_capacity` AS max_capacity" : "NULL AS max_capacity";
            $select[] = $has('table_status') ? "`table_status` AS table_status" : "1 AS table_status";
            $select[] = $has('floor_name') ? "`floor_name` AS floor_name" : "'Main' AS floor_name";
            $select[] = $has('table_section') ? "`table_section` AS table_section" : "NULL AS table_section";
            $select[] = $has('floor_x') ? "`floor_x` AS floor_x" : "NULL AS floor_x";
            $select[] = $has('floor_y') ? "`floor_y` AS floor_y" : "NULL AS floor_y";
            $select[] = $has('floor_width') ? "`floor_width` AS floor_width" : "74 AS floor_width";
            $select[] = $has('floor_height') ? "`floor_height` AS floor_height" : "54 AS floor_height";
            $select[] = $has('floor_shape') ? "`floor_shape` AS floor_shape" : "'rectangle' AS floor_shape";
            $select[] = $has('table_features') ? "`table_features` AS table_features" : "NULL AS table_features";
            $select[] = $has('visible_on_floor_plan') ? "`visible_on_floor_plan` AS visible_on_floor_plan" : "1 AS visible_on_floor_plan";
            $select[] = $has('reservable') ? "`reservable` AS reservable" : "1 AS reservable";

            $where = [];

            if ($has('visible_on_floor_plan')) {
                $where[] = "(`visible_on_floor_plan` = 1 OR `visible_on_floor_plan` IS NULL)";
            }

            if ($has('table_status')) {
                $where[] = "(`table_status` = 1 OR `table_status` IS NULL)";
            }

            $sql = "SELECT " . implode(", ", $select) . " FROM " . $qi($tenantDb) . ".`ti_tables`";

            if ($where) {
                $sql .= " WHERE " . implode(" AND ", $where);
            }

            $sql .= " ORDER BY CAST(" . $qi($numCol) . " AS UNSIGNED), " . $qi($numCol);

            $rows = $db->select($sql);

            $tables = [];
            foreach ($rows as $r) {
                $tables[] = [
                    'id' => $r->id,
                    'table_no' => (string) $r->table_no,
                    'table_number' => (string) $r->table_no,
                    'table_label' => $r->table_name ?: ('Table ' . $r->table_no),
                    'table_name' => $r->table_name ?: ('Table ' . $r->table_no),
                    'min_capacity' => $r->min_capacity,
                    'max_capacity' => $r->max_capacity,
                    'capacity_label' => ($r->min_capacity && $r->max_capacity)
                        ? ((string)$r->min_capacity . '-' . (string)$r->max_capacity)
                        : '',
                    'table_status' => $r->table_status,
                    'floor_name' => $r->floor_name ?: 'Main',
                    'table_section' => $r->table_section ?: '',
                    'floor_x' => $r->floor_x,
                    'floor_y' => $r->floor_y,
                    'floor_width' => $r->floor_width ?: 74,
                    'floor_height' => $r->floor_height ?: 54,
                    'floor_shape' => $r->floor_shape ?: 'rectangle',
                    'table_features' => $r->table_features,
                    'visible_on_floor_plan' => $r->visible_on_floor_plan,
                    'reservable' => $r->reservable,
                ];
            }

            return response()->json([
                'ok' => true,
                'version' => 'waiter-dashboard-v8-real-floor-tables',
                'tenant_db' => $tenantDb,
                'count' => count($tables),
                'tables' => $tables,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'error' => $e->getMessage(),
                'file' => basename($e->getFile()),
                'line' => $e->getLine(),
            ], 500);
        }
    };

    \Illuminate\Support\Facades\Route::get('pmd-waiter-dashboard-v8-floor-tables', $__pmdWaiterDashboardV8RealFloorTables);
    \Illuminate\Support\Facades\Route::get('/pmd-waiter-dashboard-v8-floor-tables', $__pmdWaiterDashboardV8RealFloorTables);
    \Illuminate\Support\Facades\Route::get('/admin/pmd-waiter-dashboard-v8-floor-tables', $__pmdWaiterDashboardV8RealFloorTables);
}
// PMD_WAITER_DASHBOARD_V8_REAL_FLOOR_TABLES_END


// PMD_WAITER_DASHBOARD_V9_TENANT_DATA_START
if (!defined('PMD_WAITER_DASHBOARD_V9_TENANT_DATA')) {
    define('PMD_WAITER_DASHBOARD_V9_TENANT_DATA', true);

    $__pmdWaiterV9BuildTenantPayload = function () {
        $db = \Illuminate\Support\Facades\DB::getFacadeRoot();

        $qi = function ($name) {
            return '`' . str_replace('`', '``', (string)$name) . '`';
        };

        $full = function ($tenantDb, $tableName) use ($qi) {
            return $qi($tenantDb) . '.' . $qi($tableName);
        };

        $tableExists = function ($tenantDb, $tableName) use ($db) {
            try {
                $row = $db->selectOne("
                    SELECT COUNT(*) AS c
                    FROM information_schema.TABLES
                    WHERE TABLE_SCHEMA = ?
                      AND TABLE_NAME = ?
                ", [$tenantDb, $tableName]);

                return $row && (int)($row->c ?? 0) > 0;
            } catch (\Throwable $e) {
                return false;
            }
        };

        $columns = function ($tenantDb, $tableName) use ($db) {
            try {
                $rows = $db->select("
                    SELECT COLUMN_NAME
                    FROM information_schema.COLUMNS
                    WHERE TABLE_SCHEMA = ?
                      AND TABLE_NAME = ?
                ", [$tenantDb, $tableName]);

                $out = [];
                foreach ($rows as $r) {
                    $out[] = $r->COLUMN_NAME;
                }
                return $out;
            } catch (\Throwable $e) {
                return [];
            }
        };

        $pick = function ($cols, $candidates) {
            foreach ($candidates as $c) {
                if (in_array($c, $cols, true)) return $c;
            }
            return null;
        };

        $firstTable = function ($tenantDb, $candidates) use ($tableExists) {
            foreach ($candidates as $t) {
                if ($tableExists($tenantDb, $t)) return $t;
            }
            return null;
        };

        $money = function ($n) {
            $n = is_numeric($n) ? (float)$n : 0.0;
            return '€' . number_format($n, 2, '.', '');
        };

        $host = request()->getHost();
        $sub = strtolower(trim(explode('.', $host)[0] ?? ''));
        $envTenant = getenv('PMD_TENANT_DB') ?: null;

        $currentDb = null;
        try {
            $row = $db->selectOne('select database() as db');
            $currentDb = $row->db ?? null;
        } catch (\Throwable $e) {}

        /*
          Important:
          The previous endpoint chose current Laravel DB first, which was paymydine.
          For admin URL mimoza.paymydine.com, tenant must be mimoza first.
        */
        $candidates = [];

        if ($envTenant) $candidates[] = $envTenant;
        if ($sub && !in_array($sub, ['www', 'admin', 'app', 'paymydine'], true)) $candidates[] = $sub;
        if (strpos($host, 'mimoza') !== false) $candidates[] = 'mimoza';
        if ($currentDb) $candidates[] = $currentDb;

        $candidates = array_values(array_unique(array_filter($candidates)));

        $tenantDb = null;

        foreach ($candidates as $cand) {
            if ($tableExists($cand, 'ti_tables') || $tableExists($cand, 'tables')) {
                $tenantDb = $cand;
                break;
            }
        }

        if (!$tenantDb) {
            throw new \RuntimeException('Could not resolve tenant DB for host '.$host.' candidates='.json_encode($candidates));
        }

        $tablesTable = $firstTable($tenantDb, ['ti_tables', 'tables']);
        $ordersTable = $firstTable($tenantDb, ['ti_orders', 'orders']);
        $itemsTable = $firstTable($tenantDb, ['ti_order_menus', 'order_menus', 'ti_order_items', 'order_items']);
        $menusTable = $firstTable($tenantDb, ['ti_menus', 'menus', 'ti_menu_items', 'menu_items']);
        $statusTable = $firstTable($tenantDb, ['ti_statuses', 'statuses', 'ti_order_statuses', 'order_statuses']);
        $optionsTable = $firstTable($tenantDb, ['ti_order_menu_options', 'order_menu_options', 'ti_order_options', 'order_options']);

        $statusMap = [];

        if ($statusTable) {
            $sc = $columns($tenantDb, $statusTable);
            $sid = $pick($sc, ['status_id', 'id']);
            $sname = $pick($sc, ['status_name', 'name', 'label', 'title']);

            if ($sid && $sname) {
                try {
                    $rows = $db->select("SELECT * FROM " . $full($tenantDb, $statusTable) . " LIMIT 200");
                    foreach ($rows as $r) {
                        $a = (array)$r;
                        $statusMap[(string)($a[$sid] ?? '')] = (string)($a[$sname] ?? '');
                    }
                } catch (\Throwable $e) {}
            }
        }

        $tables = [];
        $tableLookup = [];

        if ($tablesTable) {
            $tc = $columns($tenantDb, $tablesTable);

            $tid = $pick($tc, ['table_id', 'id']);
            $tnum = $pick($tc, ['table_no', 'table_number', 'number', 'no']);
            $tname = $pick($tc, ['table_name', 'pos_table_label', 'name', 'label']);
            $minCap = $pick($tc, ['min_capacity']);
            $maxCap = $pick($tc, ['max_capacity']);
            $status = $pick($tc, ['table_status', 'status', 'enabled', 'is_enabled']);
            $visible = $pick($tc, ['visible_on_floor_plan']);
            $floorName = $pick($tc, ['floor_name']);
            $section = $pick($tc, ['table_section', 'section']);
            $fx = $pick($tc, ['floor_x', 'x']);
            $fy = $pick($tc, ['floor_y', 'y']);
            $fw = $pick($tc, ['floor_width', 'w']);
            $fh = $pick($tc, ['floor_height', 'h']);
            $shape = $pick($tc, ['floor_shape', 'shape']);
            $features = $pick($tc, ['table_features', 'features']);
            $reservable = $pick($tc, ['reservable']);

            $where = [];

            if ($visible) {
                $where[] = "(`{$visible}` = 1 OR `{$visible}` IS NULL)";
            }

            if ($status) {
                $where[] = "(`{$status}` = 1 OR `{$status}` IS NULL)";
            }

            $sql = "SELECT * FROM " . $full($tenantDb, $tablesTable);

            if ($where) {
                $sql .= " WHERE " . implode(" AND ", $where);
            }

            if ($tnum) {
                $sql .= " ORDER BY CAST(`{$tnum}` AS UNSIGNED), `{$tnum}`";
            }

            $rows = $db->select($sql);

            $i = 0;

            foreach ($rows as $row) {
                $a = (array)$row;
                $i++;

                $id = $tid ? ($a[$tid] ?? $i) : $i;
                $num = $tnum ? trim((string)($a[$tnum] ?? $id)) : (string)$id;
                $label = $tname ? trim((string)($a[$tname] ?? '')) : '';
                if ($label === '') $label = 'Table ' . $num;

                $min = $minCap ? ($a[$minCap] ?? null) : null;
                $max = $maxCap ? ($a[$maxCap] ?? null) : null;

                $table = [
                    'id' => $id,
                    'table_id' => $id,
                    'table_no' => $num,
                    'table_number' => $num,
                    'number' => $num,
                    'table_label' => $label,
                    'table_name' => $label,
                    'label' => $label,
                    'name' => $label,
                    'min_capacity' => $min,
                    'max_capacity' => $max,
                    'capacity_label' => ($min !== null && $max !== null) ? ((string)$min . '-' . (string)$max) : '',
                    'table_status' => $status ? ($a[$status] ?? 1) : 1,
                    'status' => 'free',
                    'open_orders' => 0,
                    'due_count' => 0,
                    'floor_name' => $floorName ? ($a[$floorName] ?? 'Main') : 'Main',
                    'table_section' => $section ? ($a[$section] ?? '') : '',
                    'floor_x' => $fx ? ($a[$fx] ?? (8 + (($i - 1) % 5) * 14)) : (8 + (($i - 1) % 5) * 14),
                    'floor_y' => $fy ? ($a[$fy] ?? (10 + floor(($i - 1) / 5) * 20)) : (10 + floor(($i - 1) / 5) * 20),
                    'floor_width' => $fw ? ($a[$fw] ?? 78) : 78,
                    'floor_height' => $fh ? ($a[$fh] ?? 54) : 54,
                    'floor_shape' => $shape ? ($a[$shape] ?? 'rectangle') : 'rectangle',
                    'table_features' => $features ? ($a[$features] ?? null) : null,
                    'reservable' => $reservable ? ($a[$reservable] ?? 1) : 1,
                ];

                $tables[] = $table;

                $keys = [
                    $id,
                    $num,
                    $label,
                    'Table ' . $num,
                ];

                foreach ($keys as $key) {
                    $k = strtolower(trim((string)$key));
                    if ($k !== '') {
                        $tableLookup[$k] = [
                            'id' => $id,
                            'number' => $num,
                            'label' => $label,
                        ];
                    }
                }
            }
        }

        $activeOrders = [];
        $orderIds = [];
        $pendingTotal = 0.0;

        if ($ordersTable) {
            $oc = $columns($tenantDb, $ordersTable);

            $oid = $pick($oc, ['order_id', 'id']);
            $otable = $pick($oc, ['table_id', 'table_no', 'table_number', 'table_name', 'table_ref']);
            $otype = $pick($oc, ['order_type', 'type', 'service_type', 'dining_type']);
            $ototal = $pick($oc, ['order_total', 'total', 'total_amount', 'grand_total', 'subtotal', 'amount']);
            $ostatus = $pick($oc, ['status_id', 'order_status_id', 'status', 'order_status', 'status_name']);
            $ocreated = $pick($oc, ['created_at', 'date_added', 'order_date', 'created_date']);
            $oupdated = $pick($oc, ['updated_at', 'date_modified', 'modified_at']);
            $onote = $pick($oc, ['customer_note', 'order_note', 'kitchen_note', 'staff_note', 'comment', 'comments', 'note', 'notes', 'special_instructions', 'instructions']);

            $sql = "SELECT * FROM " . $full($tenantDb, $ordersTable);

            if ($ocreated) {
                $sql .= " ORDER BY `{$ocreated}` DESC";
            } elseif ($oid) {
                $sql .= " ORDER BY `{$oid}` DESC";
            }

            $sql .= " LIMIT 200";

            $rows = $db->select($sql);

            foreach ($rows as $row) {
                $a = (array)$row;
                $id = $oid ? ($a[$oid] ?? null) : null;

                if (!$id) continue;

                $statusRaw = $ostatus ? (string)($a[$ostatus] ?? '') : '';
                $statusLabel = $statusRaw;

                if ($statusRaw !== '' && isset($statusMap[$statusRaw]) && trim($statusMap[$statusRaw]) !== '') {
                    $statusLabel = $statusMap[$statusRaw];
                }

                if ($statusLabel === '') $statusLabel = 'Received';

                $statusLower = strtolower($statusLabel . ' ' . $statusRaw);

                if (preg_match('/cancel|void|closed|complete|completed|paid/i', $statusLower)) {
                    continue;
                }

                $rawTable = $otable ? trim((string)($a[$otable] ?? '')) : '';
                $mappingSource = $rawTable !== '' ? $otable : '';

                $orderTypeRaw = $otype ? trim((string)($a[$otype] ?? '')) : '';
                $commentRaw = $onote ? trim((string)($a[$onote] ?? '')) : '';

                $extractTableToken = function ($txt) {
                    $txt = trim((string)$txt);
                    if ($txt === '') return '';

                    // Examples:
                    // Table 20
                    // Table: 20
                    // Table ID: 345
                    // table_id=345
                    if (preg_match('/\\btable\\s*#?\\s*([0-9]+)\\b/i', $txt, $m)) return $m[1];
                    if (preg_match('/\\btable\\s*[:=]\\s*([0-9]+)\\b/i', $txt, $m)) return $m[1];
                    if (preg_match('/\\btable[_\\s-]*id\\s*[:=]\\s*([0-9]+)\\b/i', $txt, $m)) return $m[1];

                    return '';
                };

                if ($rawTable === '' || in_array(strtolower($rawTable), ['0', 'table', 'table --', 'table —', 'no table'], true)) {
                    $fromType = $extractTableToken($orderTypeRaw);
                    if ($fromType !== '') {
                        $rawTable = $fromType;
                        $mappingSource = 'order_type';
                    }
                }

                if ($rawTable === '') {
                    $fromComment = $extractTableToken($commentRaw);
                    if ($fromComment !== '') {
                        $rawTable = $fromComment;
                        $mappingSource = 'comment';
                    }
                }

                if (preg_match('/^table\\s*#?\\s*([0-9]+)$/i', $rawTable, $m)) {
                    $rawTable = $m[1];
                }

                $lookup = $rawTable !== '' ? ($tableLookup[strtolower($rawTable)] ?? null) : null;

                if (!$lookup && $rawTable !== '' && preg_match('/^[0-9]+$/', $rawTable)) {
                    $lookup = $tableLookup[strtolower('Table '.$rawTable)] ?? null;
                }

                $tableNumber = $lookup ? $lookup['number'] : $rawTable;
                $tableLabel = $lookup ? $lookup['label'] : ($rawTable !== '' ? (preg_match('/^\d+$/', $rawTable) ? 'Table '.$rawTable : $rawTable) : 'No table');

                $totalRaw = $ototal ? ($a[$ototal] ?? 0) : 0;
                $totalNum = is_numeric($totalRaw) ? (float)$totalRaw : 0.0;
                $pendingTotal += $totalNum;

                $noteText = $onote ? trim((string)($a[$onote] ?? '')) : '';

                $activeOrders[] = [
                    'id' => $id,
                    'order_id' => $id,
                    'table' => $tableNumber !== '' ? $tableNumber : '',
                    'table_no' => $tableNumber !== '' ? $tableNumber : '',
                    'table_name' => $tableLabel,
                    'table_display' => $tableLabel,
                    'table_ref' => $tableNumber,
                    'table_label' => $tableLabel,
                    'table_number' => $tableNumber,
                    'table_mapping_source' => $mappingSource ?: null,
                    'order_type_raw' => $orderTypeRaw,
                    'status' => $statusLabel,
                    'status_label' => $statusLabel,
                    'status_raw' => $statusRaw,
                    'total' => $totalNum,
                    'total_label' => $money($totalNum),
                    'created_at' => $ocreated ? ($a[$ocreated] ?? null) : null,
                    'updated_at' => $oupdated ? ($a[$oupdated] ?? null) : null,
                    'note' => $noteText !== '' ? $noteText : null,
                    'has_note' => $noteText !== '',
                    'items' => [],
                    'edit_url' => '/admin/orders/edit/' . $id,
                    'payment_url' => '/admin/orders/edit/' . $id . '#payment',
                ];

                $orderIds[] = $id;
            }
        }

        $itemsByOrder = [];

        if ($itemsTable && count($orderIds)) {
            $ic = $columns($tenantDb, $itemsTable);
            $iOrder = $pick($ic, ['order_id']);
            $iMenu = $pick($ic, ['menu_id', 'menu_item_id', 'item_id']);
            $iName = $pick($ic, ['name', 'menu_name', 'item_name', 'order_menu_name', 'menu_item_name']);
            $iQty = $pick($ic, ['quantity', 'qty', 'order_quantity']);
            $iNote = $pick($ic, ['comment', 'note', 'notes', 'instructions', 'special_instructions']);

            $menuNames = [];

            if ($menusTable && $iMenu) {
                $mc = $columns($tenantDb, $menusTable);
                $mId = $pick($mc, ['menu_id', 'id', 'item_id']);
                $mName = $pick($mc, ['menu_name', 'name', 'item_name', 'title']);

                if ($mId && $mName) {
                    try {
                        $rows = $db->select("SELECT * FROM " . $full($tenantDb, $menusTable) . " LIMIT 2000");
                        foreach ($rows as $r) {
                            $a = (array)$r;
                            $menuNames[(string)($a[$mId] ?? '')] = (string)($a[$mName] ?? '');
                        }
                    } catch (\Throwable $e) {}
                }
            }

            if ($iOrder) {
                $placeholders = implode(',', array_fill(0, count($orderIds), '?'));
                $sql = "SELECT * FROM " . $full($tenantDb, $itemsTable) . " WHERE `{$iOrder}` IN ({$placeholders}) LIMIT 800";

                try {
                    $rows = $db->select($sql, $orderIds);

                    foreach ($rows as $row) {
                        $a = (array)$row;
                        $orderKey = (string)($a[$iOrder] ?? '');
                        if ($orderKey === '') continue;

                        $menuKey = $iMenu ? (string)($a[$iMenu] ?? '') : '';
                        $name = $iName ? trim((string)($a[$iName] ?? '')) : '';

                        if ($name === '' && $menuKey !== '' && isset($menuNames[$menuKey])) {
                            $name = $menuNames[$menuKey];
                        }

                        if ($name === '') $name = 'Item';

                        $itemsByOrder[$orderKey][] = [
                            'name' => $name,
                            'qty' => $iQty ? ($a[$iQty] ?? 1) : 1,
                            'note' => $iNote ? ($a[$iNote] ?? '') : '',
                            'modifiers' => [],
                        ];
                    }
                } catch (\Throwable $e) {}
            }
        }


        // PMD V15: fallback mapping for old table draft orders
        $__pmdV15ResolveDraftTable = function ($draftId) use ($db, $tenantDb, $firstTable, $columns, $pick, $full, $tableLookup, $tablesTable) {
            $draftId = trim((string)$draftId);
            if ($draftId === '') return null;

            $draftTable = $firstTable($tenantDb, [
                'ti_pmd_table_order_drafts',
                'pmd_table_order_drafts',
                'ti_table_order_drafts',
                'table_order_drafts'
            ]);

            if (!$draftTable) return null;

            $dc = $columns($tenantDb, $draftTable);
            $draftIdCol = $pick($dc, ['id', 'draft_id', 'table_draft_id', 'order_draft_id']);

            if (!$draftIdCol) return null;

            try {
                $draft = $db->selectOne(
                    "SELECT * FROM " . $full($tenantDb, $draftTable) . " WHERE `{$draftIdCol}` = ? LIMIT 1",
                    [$draftId]
                );
            } catch (\Throwable $e) {
                return null;
            }

            if (!$draft) return null;

            $a = (array)$draft;

            $safe = function ($v) {
                $v = trim((string)$v);
                if ($v === '') return '';
                if (preg_match('/sleep|waitfor|select|union|--|\\/\\*|\\*\\/|pg_sleep|benchmark|information_schema/i', $v)) return '';
                return $v;
            };

            $candidateCols = [
                'table_no',
                'table_number',
                'table_id',
                'local_table_id',
                'table_name',
                'qr',
                'qr_code'
            ];

            $candidates = [];

            foreach ($candidateCols as $c) {
                if (in_array($c, $dc, true)) {
                    $v = $safe($a[$c] ?? '');
                    if ($v !== '') $candidates[] = [$c, $v];
                }
            }

            foreach ($candidates as $pair) {
                [$col, $value] = $pair;
                $k = strtolower(trim((string)$value));

                if ($k !== '' && isset($tableLookup[$k])) {
                    return [
                        'number' => $tableLookup[$k]['number'],
                        'label' => $tableLookup[$k]['label'],
                        'source' => 'table_draft_id:' . $draftId . ':' . $col,
                    ];
                }

                if (preg_match('/^table\\s+(.+)$/i', $value, $m)) {
                    $k2 = strtolower(trim($m[1]));
                    if ($k2 !== '' && isset($tableLookup[$k2])) {
                        return [
                            'number' => $tableLookup[$k2]['number'],
                            'label' => $tableLookup[$k2]['label'],
                            'source' => 'table_draft_id:' . $draftId . ':' . $col,
                        ];
                    }
                }
            }

            if ($tablesTable) {
                try {
                    $tc = $columns($tenantDb, $tablesTable);

                    $tableIdCol = $pick($tc, ['table_id', 'id']);
                    $tableNoCol = $pick($tc, ['table_no', 'table_number', 'number']);
                    $tableNameCol = $pick($tc, ['table_name', 'name', 'label']);
                    $qrCol = $pick($tc, ['qr_code', 'qr']);

                    $tryCols = [];

                    foreach ($candidates as $pair) {
                        [$col, $value] = $pair;

                        if (in_array($col, ['table_id', 'local_table_id'], true)) {
                            foreach (array_filter([$tableIdCol, $tableNoCol]) as $tcx) {
                                $tryCols[] = [$tcx, $value];
                            }
                        } elseif (in_array($col, ['table_no', 'table_number'], true)) {
                            foreach (array_filter([$tableNoCol, $tableIdCol]) as $tcx) {
                                $tryCols[] = [$tcx, $value];
                            }
                        } elseif ($col === 'table_name') {
                            foreach (array_filter([$tableNameCol]) as $tcx) {
                                $tryCols[] = [$tcx, $value];
                            }
                        } elseif (in_array($col, ['qr', 'qr_code'], true)) {
                            foreach (array_filter([$qrCol]) as $tcx) {
                                $tryCols[] = [$tcx, $value];
                            }
                        }
                    }

                    foreach ($tryCols as $try) {
                        [$col, $value] = $try;
                        if (!$col || $value === '') continue;

                        $row = $db->selectOne(
                            "SELECT * FROM " . $full($tenantDb, $tablesTable) . " WHERE `{$col}` = ? LIMIT 1",
                            [$value]
                        );

                        if ($row) {
                            $ta = (array)$row;

                            $num = $tableNoCol ? trim((string)($ta[$tableNoCol] ?? '')) : '';
                            if ($num === '' && $tableIdCol) $num = trim((string)($ta[$tableIdCol] ?? ''));

                            $label = $tableNameCol ? trim((string)($ta[$tableNameCol] ?? '')) : '';
                            if ($label === '') $label = 'Table ' . $num;

                            if ($num !== '') {
                                return [
                                    'number' => $num,
                                    'label' => $label,
                                    'source' => 'table_draft_id:' . $draftId . ':' . $col,
                                ];
                            }
                        }
                    }
                } catch (\Throwable $e) {}
            }

            return null;
        };


        foreach ($activeOrders as &$o) {
            if (trim((string)($o['table_ref'] ?? '')) === '') {
                $draftText = (string)($o['note'] ?? '');

                if (preg_match('/table_draft_id\s*:\s*([0-9]+)/i', $draftText, $mm)) {
                    $resolvedDraftTable = $__pmdV15ResolveDraftTable($mm[1] ?? '');

                    if ($resolvedDraftTable && !empty($resolvedDraftTable['number'])) {
                        $o['table'] = $resolvedDraftTable['number'];
                        $o['table_no'] = $resolvedDraftTable['number'];
                        $o['table_ref'] = $resolvedDraftTable['number'];
                        $o['table_number'] = $resolvedDraftTable['number'];
                        $o['table_label'] = $resolvedDraftTable['label'];
                        $o['table_name'] = $resolvedDraftTable['label'];
                        $o['table_display'] = $resolvedDraftTable['label'];
                        $o['table_mapping_source'] = $resolvedDraftTable['source'];
                        $o['table_draft_id'] = $mm[1] ?? null;
                    } else {
                        $o['table_draft_id'] = $mm[1] ?? null;
                        $o['table_mapping_source'] = $o['table_mapping_source'] ?? 'unresolved_table_draft';
                    }
                }
            }

            $key = (string)$o['id'];
            if (isset($itemsByOrder[$key])) {
                $o['items'] = $itemsByOrder[$key];
            }

            $ref = strtolower(trim((string)($o['table_ref'] ?? '')));
            if ($ref !== '') {
                foreach ($tables as &$t) {
                    $keys = [
                        strtolower((string)($t['id'] ?? '')),
                        strtolower((string)($t['table_no'] ?? '')),
                        strtolower((string)($t['table_label'] ?? '')),
                    ];

                    if (in_array($ref, $keys, true)) {
                        $t['open_orders'] = (int)($t['open_orders'] ?? 0) + 1;
                        $t['due_count'] = (int)($t['due_count'] ?? 0) + 1;
                        $t['status'] = 'busy';
                    }
                }
                unset($t);
            }
        }
        unset($o);

        $busy = 0;
        foreach ($tables as $t) {
            if ((int)($t['open_orders'] ?? 0) > 0) $busy++;
        }

        $totalTables = count($tables);
        $free = max(0, $totalTables - $busy);

        return [
            'ok' => true,
            'version' => 'waiter-dashboard-v9-tenant-data',
            'host' => $host,
            'tenant_db' => $tenantDb,
            'generated_at' => date('c'),
            'sources' => [
                'tables' => $tablesTable,
                'orders' => $ordersTable,
                'order_items' => $itemsTable,
                'menus' => $menusTable,
                'statuses' => $statusTable,
                'options' => $optionsTable,
            ],
            'metrics' => [
                'active_tables' => ['label' => 'Active Tables', 'value' => (string)$busy, 'raw' => $busy],
                'open_orders' => ['label' => 'Active Orders', 'value' => (string)count($activeOrders), 'raw' => count($activeOrders)],
                'pending_value' => ['label' => 'Payment Waiting', 'value' => $money($pendingTotal), 'raw' => $pendingTotal],
                'kitchen_queue' => ['label' => 'Kitchen Attention', 'value' => (string)count($activeOrders), 'raw' => count($activeOrders)],
                'notes_count' => ['label' => 'Notes', 'value' => '0', 'raw' => 0],
            ],
            'sections' => [
                'active_orders' => $activeOrders,
                'open_orders' => $activeOrders,
                'recent_orders' => $activeOrders,
                'tables' => $tables,
                'floor_plan' => [
                    'tables' => $tables,
                    'summary' => [
                        'total' => $totalTables,
                        'busy' => $busy,
                        'free' => $free,
                        'active' => $busy,
                    ],
                ],
            ],
            'debug' => [
                'tenant_candidates' => $candidates,
                'tables_count' => count($tables),
                'orders_count' => count($activeOrders),
            ],
        ];
    };

    $__pmdWaiterDashboardV9TenantData = function () use ($__pmdWaiterV9BuildTenantPayload) {
        try {
            return response()->json($__pmdWaiterV9BuildTenantPayload());
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'version' => 'waiter-dashboard-v9-tenant-data',
                'error' => $e->getMessage(),
                'file' => basename($e->getFile()),
                'line' => $e->getLine(),
            ], 500);
        }
    };

    $__pmdWaiterDashboardV9FloorTables = function () use ($__pmdWaiterV9BuildTenantPayload) {
        try {
            $payload = $__pmdWaiterV9BuildTenantPayload();
            $tables = $payload['sections']['floor_plan']['tables'] ?? [];

            return response()->json([
                'ok' => true,
                'version' => 'waiter-dashboard-v9-floor-tables',
                'host' => $payload['host'] ?? null,
                'tenant_db' => $payload['tenant_db'] ?? null,
                'count' => count($tables),
                'tables' => $tables,
                'debug' => $payload['debug'] ?? [],
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'version' => 'waiter-dashboard-v9-floor-tables',
                'error' => $e->getMessage(),
                'file' => basename($e->getFile()),
                'line' => $e->getLine(),
            ], 500);
        }
    };

    \Illuminate\Support\Facades\Route::get('pmd-waiter-dashboard-v9-tenant-data', $__pmdWaiterDashboardV9TenantData);
    \Illuminate\Support\Facades\Route::get('/pmd-waiter-dashboard-v9-tenant-data', $__pmdWaiterDashboardV9TenantData);
    \Illuminate\Support\Facades\Route::get('/admin/pmd-waiter-dashboard-v9-tenant-data', $__pmdWaiterDashboardV9TenantData);

    \Illuminate\Support\Facades\Route::get('pmd-waiter-dashboard-v9-floor-tables', $__pmdWaiterDashboardV9FloorTables);

\Illuminate\Support\Facades\Route::get('/pmd-waiter-dashboard-v9-floor-tables', $__pmdWaiterDashboardV9FloorTables);
    \Illuminate\Support\Facades\Route::get('/admin/pmd-waiter-dashboard-v9-floor-tables', $__pmdWaiterDashboardV9FloorTables);


// PMD_DASHBOARD_RESERVATION_V6_RAW_RESERVATION_TABLES_START
/*
|--------------------------------------------------------------------------
| PMD Reservation Dashboard V6 Raw Reservation Tables
|--------------------------------------------------------------------------
| Uses raw SHOW TABLES / SHOW COLUMNS / SELECT so Laravel table prefixes do not
| accidentally turn ti_reservations into ti_ti_reservations.
*/
try {
    $__pmdDashboardReservationV6Data = function () {
        try {
            $db = \Illuminate\Support\Facades\DB::connection();

            $quote = function ($name) {
                return '`' . str_replace('`', '``', $name) . '`';
            };

            $tableRows = $db->select('SHOW TABLES');
            $tables = [];

            foreach ($tableRows as $row) {
                $arr = (array)$row;
                $name = array_values($arr)[0] ?? null;
                if ($name) $tables[] = $name;
            }

            $columnsFor = function ($table) use ($db, $quote) {
                try {
                    $rows = $db->select('SHOW COLUMNS FROM ' . $quote($table));
                    $cols = [];
                    foreach ($rows as $r) {
                        $a = (array)$r;
                        $cols[] = $a['Field'] ?? array_values($a)[0] ?? null;
                    }
                    return array_values(array_filter($cols));
                } catch (\Throwable $e) {
                    return [];
                }
            };

            $pick = function (array $cols, array $names) {
                $lowerMap = [];
                foreach ($cols as $c) {
                    $lowerMap[strtolower($c)] = $c;
                }

                foreach ($names as $name) {
                    $key = strtolower($name);
                    if (isset($lowerMap[$key])) return $lowerMap[$key];
                }

                foreach ($names as $name) {
                    foreach ($cols as $col) {
                        if (stripos($col, $name) !== false) return $col;
                    }
                }

                return null;
            };

            $bestTable = null;
            $bestCols = [];
            $bestScore = -999;
            $scores = [];

            foreach ($tables as $table) {
                $lowerTable = strtolower($table);
                $cols = $columnsFor($table);
                $joined = ' ' . strtolower($table . ' ' . implode(' ', $cols)) . ' ';

                // Hard exclude the floor/table master list. This was the wrong detected source.
                if ($lowerTable === 'tables' || $lowerTable === 'ti_tables') {
                    $scores[] = ['table' => $table, 'score' => -999, 'columns' => $cols, 'reason' => 'floor table excluded'];
                    continue;
                }

                // Pivot table is useful later, but it is not the main reservation table.
                if (preg_match('/reservation.*table|reserve.*table/i', $lowerTable)) {
                    $scores[] = ['table' => $table, 'score' => 10, 'columns' => $cols, 'reason' => 'pivot table'];
                    continue;
                }

                $score = 0;

                if (preg_match('/(^|_)reservations$/i', $lowerTable)) $score += 200;
                if (strpos($lowerTable, 'reservation') !== false) $score += 120;
                if (strpos($lowerTable, 'reserve') !== false) $score += 80;
                if (strpos($lowerTable, 'booking') !== false) $score += 60;

                if (preg_match('/reservation|reserve|booking/', $joined)) $score += 60;
                if (preg_match('/reserve_date|reservation_date|booking_date|date/', $joined)) $score += 40;
                if (preg_match('/reserve_time|reservation_time|booking_time|time/', $joined)) $score += 35;
                if (preg_match('/guest_num|guest|people|person|party|cover|pax|covers/', $joined)) $score += 35;
                if (preg_match('/customer|first_name|last_name|email|phone|telephone|mobile/', $joined)) $score += 30;

                $scores[] = [
                    'table' => $table,
                    'score' => $score,
                    'columns' => $cols,
                ];

                if ($score > $bestScore) {
                    $bestScore = $score;
                    $bestTable = $table;
                    $bestCols = $cols;
                }
            }

            usort($scores, function ($a, $b) {
                return ($b['score'] ?? 0) <=> ($a['score'] ?? 0);
            });

            if (!$bestTable || $bestScore < 35) {
                return response()->json([
                    'ok' => false,
                    'message' => 'No real reservation table detected',
                    'table' => $bestTable,
                    'score' => $bestScore,
                    'top_candidates' => array_slice($scores, 0, 12),
                    'reservations' => [],
                    'kpis' => [
                        'reserved_tables' => 0,
                        'today_reservations' => 0,
                        'notes_changes' => 0,
                        'arriving_soon' => 0,
                    ],
                ]);
            }

            $idCol = $pick($bestCols, ['reservation_id', 'booking_id', 'reserve_id', 'id']);
            $dateCol = $pick($bestCols, ['reserve_date', 'reservation_date', 'booking_date', 'date', 'start_date', 'created_at']);
            $timeCol = $pick($bestCols, ['reserve_time', 'reservation_time', 'booking_time', 'time', 'slot_time', 'start_time', 'created_at']);
            $guestCol = $pick($bestCols, ['guest_num', 'guest_count', 'guests', 'party_size', 'people', 'persons', 'covers', 'pax']);
            $tableCol = $pick($bestCols, ['table_number', 'table_no', 'table_name', 'table_id', 'restaurant_table_id', 'table']);
            $statusCol = $pick($bestCols, ['status_name', 'reservation_status', 'booking_status', 'status', 'state', 'status_id']);
            $noteCol = $pick($bestCols, ['notes', 'note', 'comments', 'comment', 'special_request', 'special_requests', 'description']);
            $firstCol = $pick($bestCols, ['first_name', 'firstname', 'customer_first_name']);
            $lastCol = $pick($bestCols, ['last_name', 'lastname', 'customer_last_name']);
            $nameCol = $pick($bestCols, ['customer_name', 'full_name', 'name']);
            $phoneCol = $pick($bestCols, ['telephone', 'phone', 'mobile', 'customer_phone', 'customer_telephone']);
            $emailCol = $pick($bestCols, ['email', 'customer_email']);

            $orderCol = $dateCol ?: $idCol;
            $sql = 'SELECT * FROM ' . $quote($bestTable);
            if ($orderCol) {
                $sql .= ' ORDER BY ' . $quote($orderCol) . ' DESC';
            }
            $sql .= ' LIMIT 100';

            $rows = $db->select($sql);

            $get = function ($row, $col) {
                if (!$col) return null;
                return isset($row->{$col}) ? $row->{$col} : null;
            };

            // Optional pivot: ti_reservation_tables maps reservation_id -> table_id.
            $pivotTable = null;
            $pivotCols = [];

            foreach ($tables as $t) {
                if (preg_match('/reservation.*table|reserve.*table/i', $t)) {
                    $pivotTable = $t;
                    $pivotCols = $columnsFor($t);
                    break;
                }
            }

            $tableMaster = null;
            $tableMasterCols = [];

            foreach ($tables as $t) {
                if (strtolower($t) === 'tables' || strtolower($t) === 'ti_tables') {
                    $tableMaster = $t;
                    $tableMasterCols = $columnsFor($t);
                    break;
                }
            }

            $tableIdToNo = [];

            if ($tableMaster) {
                $tmIdCol = $pick($tableMasterCols, ['table_id', 'id']);
                $tmNoCol = $pick($tableMasterCols, ['table_no', 'table_number', 'table_name', 'pos_table_label', 'name']);

                try {
                    $tmRows = $db->select('SELECT * FROM ' . $quote($tableMaster) . ' LIMIT 300');
                    foreach ($tmRows as $tr) {
                        $tid = $get($tr, $tmIdCol);
                        $tno = $get($tr, $tmNoCol);
                        if ($tid !== null && $tno !== null) {
                            $tableIdToNo[(string)$tid] = (string)$tno;
                        }
                    }
                } catch (\Throwable $e) {}
            }

            $reservationIdToTables = [];

            if ($pivotTable) {
                $pResCol = $pick($pivotCols, ['reservation_id', 'reserve_id', 'booking_id']);
                $pTableCol = $pick($pivotCols, ['table_id', 'restaurant_table_id']);

                if ($pResCol && $pTableCol) {
                    try {
                        $pRows = $db->select('SELECT * FROM ' . $quote($pivotTable) . ' LIMIT 500');
                        foreach ($pRows as $pr) {
                            $rid = $get($pr, $pResCol);
                            $tid = $get($pr, $pTableCol);
                            if ($rid === null || $tid === null) continue;

                            $tableLabel = $tableIdToNo[(string)$tid] ?? (string)$tid;
                            if (!isset($reservationIdToTables[(string)$rid])) {
                                $reservationIdToTables[(string)$rid] = [];
                            }
                            $reservationIdToTables[(string)$rid][] = $tableLabel;
                        }
                    } catch (\Throwable $e) {}
                }
            }

            $items = [];

            foreach ($rows as $row) {
                $id = $get($row, $idCol);

                $first = trim((string)$get($row, $firstCol));
                $last = trim((string)$get($row, $lastCol));
                $name = trim($first . ' ' . $last);

                if (!$name) $name = trim((string)$get($row, $nameCol));
                if (!$name) $name = 'Guest';

                $dateRaw = $get($row, $dateCol);
                $timeRaw = $get($row, $timeCol);

                $date = '';
                $time = '';

                try {
                    if ($dateRaw) $date = \Carbon\Carbon::parse($dateRaw)->toDateString();
                } catch (\Throwable $e) {
                    $date = (string)$dateRaw;
                }

                try {
                    if ($timeRaw) $time = \Carbon\Carbon::parse($timeRaw)->format('H:i');
                } catch (\Throwable $e) {
                    $time = (string)$timeRaw;
                }

                $tableValue = (string)($get($row, $tableCol) ?? '');

                if (!$tableValue && $id !== null && isset($reservationIdToTables[(string)$id])) {
                    $tableValue = implode(', ', array_unique($reservationIdToTables[(string)$id]));
                }

                if ($tableCol && stripos($tableCol, 'table_id') !== false && isset($tableIdToNo[$tableValue])) {
                    $tableValue = $tableIdToNo[$tableValue];
                }

                $items[] = [
                    'id' => $id,
                    'name' => $name,
                    'phone' => (string)($get($row, $phoneCol) ?? ''),
                    'email' => (string)($get($row, $emailCol) ?? ''),
                    'guests' => (int)($get($row, $guestCol) ?: 0),
                    'table' => $tableValue,
                    'date' => $date,
                    'time' => $time,
                    'status' => (string)($get($row, $statusCol) ?? 'Reserved'),
                    'notes' => (string)($get($row, $noteCol) ?? ''),
                ];
            }

            $today = \Carbon\Carbon::now()->toDateString();

            $todayItems = array_values(array_filter($items, function ($x) use ($today) {
                return ($x['date'] ?? '') === $today;
            }));

            $reservedTables = [];

            foreach ($items as $x) {
                $raw = trim((string)($x['table'] ?? ''));
                if ($raw === '') continue;

                foreach (preg_split('/\s*,\s*/', $raw) as $t) {
                    if ($t !== '') $reservedTables[$t] = true;
                }
            }

            $notesCount = count(array_filter($items, function ($x) {
                return trim((string)($x['notes'] ?? '')) !== '';
            }));

            $soon = 0;

            foreach ($todayItems as $x) {
                try {
                    if (!$x['time']) continue;
                    $dt = \Carbon\Carbon::parse(($x['date'] ?: now()->toDateString()) . ' ' . $x['time']);

                    if ($dt->greaterThanOrEqualTo(now()) && $dt->lessThanOrEqualTo(now()->addHours(2))) {
                        $soon++;
                    }
                } catch (\Throwable $e) {}
            }

            return response()->json([
                'ok' => true,
                'version' => 'reservation-v6-raw-tables',
                'table' => $bestTable,
                'score' => $bestScore,
                'pivot_table' => $pivotTable,
                'table_master' => $tableMaster,
                'columns' => [
                    'id' => $idCol,
                    'date' => $dateCol,
                    'time' => $timeCol,
                    'guests' => $guestCol,
                    'table' => $tableCol,
                    'status' => $statusCol,
                    'notes' => $noteCol,
                    'name' => $nameCol,
                    'first' => $firstCol,
                    'last' => $lastCol,
                    'phone' => $phoneCol,
                    'email' => $emailCol,
                ],
                'reservations' => $items,
                'kpis' => [
                    'reserved_tables' => count($reservedTables),
                    'today_reservations' => count($todayItems),
                    'notes_changes' => $notesCount,
                    'arriving_soon' => $soon,
                ],
                'top_candidates' => array_slice($scores, 0, 8),
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'version' => 'reservation-v6-raw-tables',
                'message' => $e->getMessage(),
                'reservations' => [],
                'kpis' => [
                    'reserved_tables' => 0,
                    'today_reservations' => 0,
                    'notes_changes' => 0,
                    'arriving_soon' => 0,
                ],
            ]);
        }
    };

    \Illuminate\Support\Facades\Route::get('pmd-dashboardreservation-v4-data', $__pmdDashboardReservationV6Data);
    \Illuminate\Support\Facades\Route::get('/pmd-dashboardreservation-v4-data', $__pmdDashboardReservationV6Data);
    \Illuminate\Support\Facades\Route::get('/admin/pmd-dashboardreservation-v4-data', $__pmdDashboardReservationV6Data);
} catch (\Throwable $e) {
    // keep admin routes safe
}
// PMD_DASHBOARD_RESERVATION_V6_RAW_RESERVATION_TABLES_END




}
// PMD_WAITER_DASHBOARD_V9_TENANT_DATA_END


// PMD_WAITER_DASHBOARD_V10_FLOOR_EDIT_MERGE_START
if (!defined('PMD_WAITER_DASHBOARD_V10_FLOOR_EDIT_MERGE')) {
    define('PMD_WAITER_DASHBOARD_V10_FLOOR_EDIT_MERGE', true);

    $__pmdWaiterV10TenantDb = function () {
        $db = \Illuminate\Support\Facades\DB::getFacadeRoot();
        $host = request()->getHost();
        $sub = strtolower(trim(explode('.', $host)[0] ?? ''));

        $exists = function ($tenantDb, $tableName) use ($db) {
            try {
                $row = $db->selectOne("
                    SELECT COUNT(*) AS c
                    FROM information_schema.TABLES
                    WHERE TABLE_SCHEMA = ?
                      AND TABLE_NAME = ?
                ", [$tenantDb, $tableName]);

                return $row && (int)($row->c ?? 0) > 0;
            } catch (\Throwable $e) {
                return false;
            }
        };

        $current = null;
        try {
            $row = $db->selectOne('select database() as db');
            $current = $row->db ?? null;
        } catch (\Throwable $e) {}

        $candidates = [];
        if (getenv('PMD_TENANT_DB')) $candidates[] = getenv('PMD_TENANT_DB');
        if ($sub && !in_array($sub, ['www', 'admin', 'app', 'paymydine'], true)) $candidates[] = $sub;
        if (strpos($host, 'mimoza') !== false) $candidates[] = 'mimoza';
        if ($current) $candidates[] = $current;

        $candidates = array_values(array_unique(array_filter($candidates)));

        foreach ($candidates as $cand) {
            if ($exists($cand, 'ti_tables')) return $cand;
        }

        throw new \RuntimeException('Could not resolve tenant DB for floor tools. Host='.$host);
    };

    $__pmdWaiterV10Qi = function ($name) {
        return '`' . str_replace('`', '``', (string)$name) . '`';
    };

    $__pmdWaiterV10EnsureMergeTable = function ($tenantDb) use ($__pmdWaiterV10Qi) {
        $db = \Illuminate\Support\Facades\DB::getFacadeRoot();

        $full = $__pmdWaiterV10Qi($tenantDb) . '.`ti_pmd_table_merges`';

        $db->statement("
            CREATE TABLE IF NOT EXISTS {$full} (
                id INT UNSIGNED NOT NULL AUTO_INCREMENT,
                merge_key VARCHAR(80) NOT NULL,
                table_numbers TEXT NOT NULL,
                status VARCHAR(30) NOT NULL DEFAULT 'active',
                notes TEXT NULL,
                created_at DATETIME NULL,
                updated_at DATETIME NULL,
                PRIMARY KEY (id),
                KEY idx_status (status)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");
    };

    $__pmdWaiterV10SaveLayout = function (\Illuminate\Http\Request $request) use ($__pmdWaiterV10TenantDb, $__pmdWaiterV10Qi) {
        try {
            $db = \Illuminate\Support\Facades\DB::getFacadeRoot();
            $tenantDb = $__pmdWaiterV10TenantDb();
            $tables = $request->input('tables', []);

            if (!is_array($tables)) {
                return response()->json(['ok' => false, 'error' => 'tables must be an array'], 422);
            }

            $full = $__pmdWaiterV10Qi($tenantDb) . '.`ti_tables`';

            $updated = 0;

            foreach ($tables as $t) {
                $no = trim((string)($t['table_no'] ?? $t['table_number'] ?? $t['number'] ?? ''));
                if ($no === '') continue;

                $x = max(2, min(98, (float)($t['floor_x'] ?? 10)));
                $y = max(2, min(98, (float)($t['floor_y'] ?? 10)));
                $w = max(54, min(180, (float)($t['floor_width'] ?? 96)));
                $h = max(44, min(150, (float)($t['floor_height'] ?? 68)));

                $db->update("
                    UPDATE {$full}
                    SET floor_x = ?,
                        floor_y = ?,
                        floor_width = ?,
                        floor_height = ?,
                        updated_at = ?
                    WHERE table_no = ?
                    LIMIT 1
                ", [$x, $y, $w, $h, date('Y-m-d H:i:s'), $no]);

                $updated++;
            }

            return response()->json([
                'ok' => true,
                'version' => 'waiter-dashboard-v10-save-layout',
                'tenant_db' => $tenantDb,
                'updated' => $updated,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'version' => 'waiter-dashboard-v10-save-layout',
                'error' => $e->getMessage(),
                'file' => basename($e->getFile()),
                'line' => $e->getLine(),
            ], 500);
        }
    };

    $__pmdWaiterV10MergeTables = function (\Illuminate\Http\Request $request) use ($__pmdWaiterV10TenantDb, $__pmdWaiterV10Qi, $__pmdWaiterV10EnsureMergeTable) {
        try {
            $db = \Illuminate\Support\Facades\DB::getFacadeRoot();
            $tenantDb = $__pmdWaiterV10TenantDb();
            $__pmdWaiterV10EnsureMergeTable($tenantDb);

            $numbers = $request->input('table_numbers', []);

            if (!is_array($numbers)) $numbers = [];

            $numbers = array_values(array_unique(array_filter(array_map(function ($x) {
                return trim((string)$x);
            }, $numbers))));

            sort($numbers, SORT_NATURAL);

            if (count($numbers) < 2) {
                return response()->json([
                    'ok' => false,
                    'error' => 'Select at least 2 tables to merge',
                ], 422);
            }

            $full = $__pmdWaiterV10Qi($tenantDb) . '.`ti_pmd_table_merges`';
            $mergeKey = 'merge-' . implode('-', $numbers) . '-' . substr(md5(implode('|', $numbers) . microtime(true)), 0, 8);

            $db->insert("
                INSERT INTO {$full}
                (merge_key, table_numbers, status, notes, created_at, updated_at)
                VALUES (?, ?, 'active', ?, ?, ?)
            ", [
                $mergeKey,
                json_encode($numbers, JSON_UNESCAPED_UNICODE),
                'Created from waiter floor map',
                date('Y-m-d H:i:s'),
                date('Y-m-d H:i:s'),
            ]);

            return response()->json([
                'ok' => true,
                'version' => 'waiter-dashboard-v10-merge-tables',
                'tenant_db' => $tenantDb,
                'merge_key' => $mergeKey,
                'table_numbers' => $numbers,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'version' => 'waiter-dashboard-v10-merge-tables',
                'error' => $e->getMessage(),
                'file' => basename($e->getFile()),
                'line' => $e->getLine(),
            ], 500);
        }
    };

    $__pmdWaiterV10ListMerges = function () use ($__pmdWaiterV10TenantDb, $__pmdWaiterV10Qi, $__pmdWaiterV10EnsureMergeTable) {
        try {
            $db = \Illuminate\Support\Facades\DB::getFacadeRoot();
            $tenantDb = $__pmdWaiterV10TenantDb();
            $__pmdWaiterV10EnsureMergeTable($tenantDb);

            $full = $__pmdWaiterV10Qi($tenantDb) . '.`ti_pmd_table_merges`';

            $rows = $db->select("
                SELECT *
                FROM {$full}
                WHERE status = 'active'
                ORDER BY id DESC
                LIMIT 50
            ");

            $merges = [];

            foreach ($rows as $r) {
                $nums = json_decode($r->table_numbers ?? '[]', true);
                if (!is_array($nums)) $nums = [];

                $merges[] = [
                    'id' => $r->id,
                    'merge_key' => $r->merge_key,
                    'table_numbers' => $nums,
                    'status' => $r->status,
                    'notes' => $r->notes,
                    'created_at' => $r->created_at,
                ];
            }

            return response()->json([
                'ok' => true,
                'version' => 'waiter-dashboard-v10-table-merges',
                'tenant_db' => $tenantDb,
                'merges' => $merges,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'version' => 'waiter-dashboard-v10-table-merges',
                'error' => $e->getMessage(),
                'file' => basename($e->getFile()),
                'line' => $e->getLine(),
            ], 500);
        }
    };

    \Illuminate\Support\Facades\Route::post('pmd-waiter-dashboard-v10-save-layout', $__pmdWaiterV10SaveLayout);
    \Illuminate\Support\Facades\Route::post('/pmd-waiter-dashboard-v10-save-layout', $__pmdWaiterV10SaveLayout);
    \Illuminate\Support\Facades\Route::post('/admin/pmd-waiter-dashboard-v10-save-layout', $__pmdWaiterV10SaveLayout);

    \Illuminate\Support\Facades\Route::post('pmd-waiter-dashboard-v10-merge-tables', $__pmdWaiterV10MergeTables);
    \Illuminate\Support\Facades\Route::post('/pmd-waiter-dashboard-v10-merge-tables', $__pmdWaiterV10MergeTables);
    \Illuminate\Support\Facades\Route::post('/admin/pmd-waiter-dashboard-v10-merge-tables', $__pmdWaiterV10MergeTables);

    \Illuminate\Support\Facades\Route::get('pmd-waiter-dashboard-v10-table-merges', $__pmdWaiterV10ListMerges);
    \Illuminate\Support\Facades\Route::get('/pmd-waiter-dashboard-v10-table-merges', $__pmdWaiterV10ListMerges);
    \Illuminate\Support\Facades\Route::get('/admin/pmd-waiter-dashboard-v10-table-merges', $__pmdWaiterV10ListMerges);
}
// PMD_WAITER_DASHBOARD_V10_FLOOR_EDIT_MERGE_END


// PMD_WAITER_DASHBOARD_V18_UNMERGE_TABLES_START
if (!defined('PMD_WAITER_DASHBOARD_V18_UNMERGE_TABLES')) {
    define('PMD_WAITER_DASHBOARD_V18_UNMERGE_TABLES', true);

    $__pmdWaiterV18TenantDb = function () {
        $db = \Illuminate\Support\Facades\DB::getFacadeRoot();
        $host = request()->getHost();
        $sub = strtolower(trim(explode('.', $host)[0] ?? ''));

        $exists = function ($tenantDb, $tableName) use ($db) {
            try {
                $row = $db->selectOne("
                    SELECT COUNT(*) AS c
                    FROM information_schema.TABLES
                    WHERE TABLE_SCHEMA = ?
                      AND TABLE_NAME = ?
                ", [$tenantDb, $tableName]);

                return $row && (int)($row->c ?? 0) > 0;
            } catch (\Throwable $e) {
                return false;
            }
        };

        $current = null;
        try {
            $row = $db->selectOne('select database() as db');
            $current = $row->db ?? null;
        } catch (\Throwable $e) {}

        $candidates = [];
        if (getenv('PMD_TENANT_DB')) $candidates[] = getenv('PMD_TENANT_DB');
        if ($sub && !in_array($sub, ['www', 'admin', 'app', 'paymydine'], true)) $candidates[] = $sub;
        if (strpos($host, 'mimoza') !== false) $candidates[] = 'mimoza';
        if ($current) $candidates[] = $current;

        $candidates = array_values(array_unique(array_filter($candidates)));

        foreach ($candidates as $cand) {
            if ($exists($cand, 'ti_tables')) return $cand;
        }

        throw new \RuntimeException('Could not resolve tenant DB for unmerge.');
    };

    $__pmdWaiterV18Qi = function ($name) {
        return '`' . str_replace('`', '``', (string)$name) . '`';
    };

    $__pmdWaiterV18Unmerge = function (\Illuminate\Http\Request $request) use ($__pmdWaiterV18TenantDb, $__pmdWaiterV18Qi) {
        try {
            $db = \Illuminate\Support\Facades\DB::getFacadeRoot();
            $tenantDb = $__pmdWaiterV18TenantDb();

            $mergeKey = trim((string)$request->input('merge_key', ''));
            $id = (int)$request->input('id', 0);

            if ($mergeKey === '' && $id <= 0) {
                return response()->json([
                    'ok' => false,
                    'error' => 'Missing merge_key or id',
                ], 422);
            }

            $full = $__pmdWaiterV18Qi($tenantDb) . '.`ti_pmd_table_merges`';

            if ($mergeKey !== '') {
                $affected = $db->update("
                    UPDATE {$full}
                    SET status = 'inactive',
                        updated_at = ?
                    WHERE merge_key = ?
                    LIMIT 1
                ", [date('Y-m-d H:i:s'), $mergeKey]);
            } else {
                $affected = $db->update("
                    UPDATE {$full}
                    SET status = 'inactive',
                        updated_at = ?
                    WHERE id = ?
                    LIMIT 1
                ", [date('Y-m-d H:i:s'), $id]);
            }

            return response()->json([
                'ok' => true,
                'version' => 'waiter-dashboard-v18-unmerge',
                'tenant_db' => $tenantDb,
                'affected' => $affected,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'version' => 'waiter-dashboard-v18-unmerge',
                'error' => $e->getMessage(),
                'file' => basename($e->getFile()),
                'line' => $e->getLine(),
            ], 500);
        }
    };

    \Illuminate\Support\Facades\Route::post('pmd-waiter-dashboard-v18-unmerge-tables', $__pmdWaiterV18Unmerge);
    \Illuminate\Support\Facades\Route::post('/pmd-waiter-dashboard-v18-unmerge-tables', $__pmdWaiterV18Unmerge);
    \Illuminate\Support\Facades\Route::post('/admin/pmd-waiter-dashboard-v18-unmerge-tables', $__pmdWaiterV18Unmerge);
}
// PMD_WAITER_DASHBOARD_V18_UNMERGE_TABLES_END


// PMD_WAITER_DASHBOARD_V19_ROBUST_UNMERGE_START
if (!defined('PMD_WAITER_DASHBOARD_V19_ROBUST_UNMERGE')) {
    define('PMD_WAITER_DASHBOARD_V19_ROBUST_UNMERGE', true);

    $__pmdWaiterV19Qi = function ($name) {
        return '`' . str_replace('`', '``', (string)$name) . '`';
    };

    $__pmdWaiterV19TableExists = function ($tenantDb, $tableName) {
        try {
            $db = \Illuminate\Support\Facades\DB::getFacadeRoot();
            $row = $db->selectOne("
                SELECT COUNT(*) AS c
                FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = ?
                  AND TABLE_NAME = ?
            ", [$tenantDb, $tableName]);

            return $row && (int)($row->c ?? 0) > 0;
        } catch (\Throwable $e) {
            return false;
        }
    };

    $__pmdWaiterV19Columns = function ($tenantDb, $tableName) {
        try {
            $db = \Illuminate\Support\Facades\DB::getFacadeRoot();
            $rows = $db->select("
                SELECT COLUMN_NAME
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = ?
                  AND TABLE_NAME = ?
            ", [$tenantDb, $tableName]);

            return array_map(function ($r) {
                return $r->COLUMN_NAME;
            }, $rows);
        } catch (\Throwable $e) {
            return [];
        }
    };

    $__pmdWaiterV19TenantDb = function () use ($__pmdWaiterV19TableExists) {
        $db = \Illuminate\Support\Facades\DB::getFacadeRoot();
        $host = request()->getHost();
        $sub = strtolower(trim(explode('.', $host)[0] ?? ''));

        $current = null;
        try {
            $row = $db->selectOne('select database() as db');
            $current = $row->db ?? null;
        } catch (\Throwable $e) {}

        $candidates = [];
        if (getenv('PMD_TENANT_DB')) $candidates[] = getenv('PMD_TENANT_DB');
        if ($sub && !in_array($sub, ['www', 'admin', 'app', 'paymydine'], true)) $candidates[] = $sub;
        if (strpos($host, 'mimoza') !== false) $candidates[] = 'mimoza';
        if ($current) $candidates[] = $current;

        $candidates = array_values(array_unique(array_filter($candidates)));

        foreach ($candidates as $cand) {
            if ($__pmdWaiterV19TableExists($cand, 'ti_pmd_table_merges')) return $cand;
        }

        foreach ($candidates as $cand) {
            if ($__pmdWaiterV19TableExists($cand, 'ti_tables')) return $cand;
        }

        throw new \RuntimeException('Could not resolve tenant DB.');
    };

    $__pmdWaiterV19CanonicalTables = function ($value) {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (is_array($decoded)) $value = $decoded;
            else $value = preg_split('/\s*,\s*/', $value);
        }

        if (!is_array($value)) $value = [];

        $out = [];
        foreach ($value as $v) {
            $v = trim((string)$v);
            if ($v !== '') $out[] = $v;
        }

        $out = array_values(array_unique($out));

        usort($out, function ($a, $b) {
            $na = is_numeric($a);
            $nb = is_numeric($b);

            if ($na && $nb) return ((int)$a) <=> ((int)$b);
            return strcmp($a, $b);
        });

        return json_encode($out);
    };

    $__pmdWaiterV19Unmerge = function (\Illuminate\Http\Request $request) use (
        $__pmdWaiterV19Qi,
        $__pmdWaiterV19TableExists,
        $__pmdWaiterV19Columns,
        $__pmdWaiterV19TenantDb,
        $__pmdWaiterV19CanonicalTables
    ) {
        try {
            $db = \Illuminate\Support\Facades\DB::getFacadeRoot();
            $tenantDb = $__pmdWaiterV19TenantDb();

            if (!$__pmdWaiterV19TableExists($tenantDb, 'ti_pmd_table_merges')) {
                return response()->json([
                    'ok' => false,
                    'error' => 'ti_pmd_table_merges not found',
                    'tenant_db' => $tenantDb,
                ], 404);
            }

            $full = $__pmdWaiterV19Qi($tenantDb) . '.`ti_pmd_table_merges`';
            $cols = $__pmdWaiterV19Columns($tenantDb, 'ti_pmd_table_merges');

            $id = (int)$request->input('id', 0);
            $mergeKey = trim((string)$request->input('merge_key', ''));
            $tableNumbers = $request->input('table_numbers', []);

            if (is_string($tableNumbers)) {
                $decoded = json_decode($tableNumbers, true);
                $tableNumbers = is_array($decoded) ? $decoded : preg_split('/\s*,\s*/', $tableNumbers);
            }

            $wantedCanon = $__pmdWaiterV19CanonicalTables($tableNumbers);
            $affected = 0;

            $deleteBy = function ($where, $params) use ($db, $full, &$affected) {
                $affected += (int)$db->delete("DELETE FROM {$full} WHERE {$where}", $params);
            };

            if ($id > 0 && in_array('id', $cols, true)) {
                $deleteBy('`id` = ?', [$id]);
            }

            if ($affected < 1 && $mergeKey !== '' && in_array('merge_key', $cols, true)) {
                $deleteBy('`merge_key` = ?', [$mergeKey]);
            }

            if ($affected < 1 && $wantedCanon !== '[]' && in_array('table_numbers', $cols, true)) {
                $rows = $db->select("SELECT * FROM {$full}");

                foreach ($rows as $row) {
                    $a = (array)$row;
                    $raw = $a['table_numbers'] ?? '';
                    $rowCanon = $__pmdWaiterV19CanonicalTables($raw);

                    if ($rowCanon === $wantedCanon) {
                        if (in_array('id', $cols, true) && isset($a['id'])) {
                            $deleteBy('`id` = ?', [$a['id']]);
                        } elseif (in_array('merge_key', $cols, true) && isset($a['merge_key'])) {
                            $deleteBy('`merge_key` = ?', [$a['merge_key']]);
                        } else {
                            $deleteBy('`table_numbers` = ?', [$raw]);
                        }
                    }
                }
            }

            return response()->json([
                'ok' => true,
                'version' => 'waiter-dashboard-v19-robust-unmerge',
                'tenant_db' => $tenantDb,
                'affected' => $affected,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'version' => 'waiter-dashboard-v19-robust-unmerge',
                'error' => $e->getMessage(),
                'file' => basename($e->getFile()),
                'line' => $e->getLine(),
            ], 500);
        }
    };

    \Illuminate\Support\Facades\Route::post('pmd-waiter-dashboard-v19-unmerge-tables', $__pmdWaiterV19Unmerge);
    \Illuminate\Support\Facades\Route::post('/pmd-waiter-dashboard-v19-unmerge-tables', $__pmdWaiterV19Unmerge);
    \Illuminate\Support\Facades\Route::post('/admin/pmd-waiter-dashboard-v19-unmerge-tables', $__pmdWaiterV19Unmerge);
}
// PMD_WAITER_DASHBOARD_V19_ROBUST_UNMERGE_END


















// PMD waiter v98 all-tables data endpoint
if (class_exists('Route')) {
    Route::get('/admin/pmd-waiter-v98-data', function () {
        $db = app('db');
        $schema = $db->getSchemaBuilder();
        $now = date('c');
        $userId = 0;
        try {
            if (class_exists('AdminAuth') && AdminAuth::getUser()) $userId = (int)AdminAuth::getUser()->getKey();
            elseif (function_exists('admin_auth') && admin_auth()->user()) $userId = (int)admin_auth()->user()->getKey();
            elseif (function_exists('auth') && auth()->user()) $userId = (int)auth()->user()->getKey();
        } catch (Exception $e) { $userId = 0; }

        $has = function($table, $col) use ($schema) { try { return $schema->hasTable($table) && $schema->hasColumn($table, $col); } catch (Exception $e) { return false; } };
        $firstTable = function($names) use ($schema) { foreach ($names as $n) { try { if ($schema->hasTable($n)) return $n; } catch (Exception $e) {} } return null; };
        $firstCol = function($table, $cols) use ($has) { foreach ($cols as $c) { if ($has($table, $c)) return $c; } return null; };

        $tablesTable = $firstTable(array('tables','restaurant_tables','location_tables','dining_tables','floor_tables'));
        $ordersTable = $firstTable(array('orders','restaurant_orders'));
        $menuTable = $firstTable(array('menus','menu_items','mealtimes_menus','restaurant_menus'));
        $assignTable = 'pmd_waiter_table_assignments';
        $assignedIds = array();
        if ($schema->hasTable($assignTable)) {
            try {
                $q = $db->table($assignTable)->where('active', 1);
                if ($userId && $has($assignTable, 'staff_id')) $q->where('staff_id', $userId);
                elseif ($userId && $has($assignTable, 'user_id')) $q->where('user_id', $userId);
                $assignedIds = array_map('intval', $q->pluck('table_id')->toArray());
            } catch (Exception $e) { $assignedIds = array(); }
        }

        $tables = array();
        if ($tablesTable) {
            try {
                $idCol = $firstCol($tablesTable, array('table_id','id')) ?: 'id';
                $nameCol = $firstCol($tablesTable, array('table_name','name','label','title'));
                $numCol = $firstCol($tablesTable, array('table_number','table_no','number','sort_order','id')) ?: $idCol;
                $rows = $db->table($tablesTable)->limit(120)->get();
                foreach ($rows as $r) {
                    $arr = (array)$r;
                    $id = isset($arr[$idCol]) ? (int)$arr[$idCol] : 0;
                    $numRaw = isset($arr[$numCol]) ? $arr[$numCol] : $id;
                    preg_match('/\d+/', (string)$numRaw, $mm);
                    $num = isset($mm[0]) ? (int)$mm[0] : $id;
                    $name = $nameCol && isset($arr[$nameCol]) && $arr[$nameCol] !== '' ? (string)$arr[$nameCol] : ('Table '.$num);
                    $assigned = in_array($id, $assignedIds) || in_array($num, $assignedIds);
                    $tables[$id ?: $num] = array('id'=>$id ?: $num, 'number'=>$num ?: count($tables)+1, 'name'=>$name, 'assigned'=>$assigned, 'status'=>$assigned ? 'free' : 'not_assigned', 'orders'=>0, 'ready'=>0, 'due'=>0);
                }
            } catch (Exception $e) {}
        }
        if (!$tables) {
            for ($i=1; $i<=8; $i++) $tables[$i] = array('id'=>$i,'number'=>$i,'name'=>'Table '.$i,'assigned'=>in_array($i,$assignedIds),'status'=>in_array($i,$assignedIds)?'free':'not_assigned','orders'=>0,'ready'=>0,'due'=>0);
        }

        if ($ordersTable) {
            try {
                $tableCol = $firstCol($ordersTable, array('table_id','table','table_number','table_no'));
                $statusCol = $firstCol($ordersTable, array('status_id','status','order_status','order_status_id'));
                $totalCol = $firstCol($ordersTable, array('order_total','total','total_amount','order_value'));
                if ($tableCol) {
                    $orders = $db->table($ordersTable)->limit(250)->get();
                    foreach ($orders as $o) {
                        $a = (array)$o;
                        $tableVal = isset($a[$tableCol]) ? $a[$tableCol] : null;
                        preg_match('/\d+/', (string)$tableVal, $mm);
                        $tid = isset($mm[0]) ? (int)$mm[0] : (int)$tableVal;
                        $key = isset($tables[$tid]) ? $tid : null;
                        if ($key === null) {
                            foreach ($tables as $k=>$t) { if ((int)$t['number'] === $tid) { $key=$k; break; } }
                        }
                        if ($key !== null) {
                            $tables[$key]['orders']++;
                            $tables[$key]['status'] = 'busy';
                            if ($totalCol && isset($a[$totalCol])) $tables[$key]['due'] += (float)$a[$totalCol];
                        }
                    }
                }
            } catch (Exception $e) {}
        }

        $menu = array();
        if ($menuTable) {
            try {
                $idCol = $firstCol($menuTable, array('menu_id','id')) ?: 'id';
                $nameCol = $firstCol($menuTable, array('menu_name','name','item_name','title'));
                $priceCol = $firstCol($menuTable, array('menu_price','price','amount','cost'));
                $q = $db->table($menuTable)->limit(80);
                foreach ($q->get() as $m) {
                    $a = (array)$m;
                    $name = $nameCol && isset($a[$nameCol]) ? (string)$a[$nameCol] : 'Menu item';
                    if (trim($name) === '') continue;
                    $menu[] = array('id'=>isset($a[$idCol]) ? $a[$idCol] : count($menu)+1, 'name'=>$name, 'price'=>$priceCol && isset($a[$priceCol]) ? (float)$a[$priceCol] : 0);
                }
            } catch (Exception $e) {}
        }

        usort($tables, function($a,$b){ return (int)$a['number'] <=> (int)$b['number']; });
        $metrics = array('total_tables'=>count($tables), 'assigned_count'=>0, 'ready'=>0, 'active_orders'=>0, 'needs_attention'=>0, 'due'=>0);
        foreach ($tables as $t) {
            if (!empty($t['assigned'])) $metrics['assigned_count']++;
            $metrics['ready'] += (int)$t['ready'];
            $metrics['active_orders'] += (int)$t['orders'];
            $metrics['due'] += (float)$t['due'];
        }
        return response()->json(array('ok'=>true, 'version'=>'v98-single-source', 'generated_at'=>$now, 'user_id'=>$userId, 'metrics'=>$metrics, 'tables'=>array_values($tables), 'menu_items'=>$menu, 'detected'=>array('tables'=>$tablesTable,'orders'=>$ordersTable,'menu'=>$menuTable)));
    });
    Route::get('pmd-waiter-v98-data', function () {
        return redirect('/admin/pmd-waiter-v98-data');
    });
}


// PMD_STABLE_FLOOR_PLAN_ROUTES_START


Route::get('pmd-floor-plan-data', 'PmdFloorPlanStable@data');
Route::get('pmd-floor-plan-audit', 'PmdFloorPlanStable@audit');
Route::match(['GET','POST'], 'pmd-floor-plan-add-item', 'PmdFloorPlanStable@addItem');
Route::match(['GET','POST'], 'pmd-floor-plan-merge', 'PmdFloorPlanStable@merge');


// compatibility aliases for current waiter checks
Route::get('pmd-waiter-floor-v134-data', 'PmdFloorPlanStable@data');
Route::get('pmd-waiter-floor-v134-audit', 'PmdFloorPlanStable@audit');
// PMD_STABLE_FLOOR_PLAN_ROUTES_END


// PMD_WAITER_PORTAL_V113_ROUTES_START
Route::get('pmd-waiter-portal-v113-data', 'PmdWaiterPortalV113@data');
Route::get('pmd-waiter-portal-v113-audit', 'PmdWaiterPortalV113@audit');
Route::get('pmd-waiter-portal-v113-add-item', 'PmdWaiterPortalV113@addItem');
Route::post('pmd-waiter-portal-v113-add-item', 'PmdWaiterPortalV113@addItem');
Route::get('pmd-waiter-portal-v113-merge', 'PmdWaiterPortalV113@merge');
Route::post('pmd-waiter-portal-v113-merge', 'PmdWaiterPortalV113@merge');
Route::get('pmd-waiter-portal-v113-clear-merges', 'PmdWaiterPortalV113@clearMerges');
// compatibility aliases used by older frontend checks
Route::get('pmd-waiter-floor-v113-data', 'PmdWaiterPortalV113@data');
Route::get('pmd-waiter-floor-v113-add-item', 'PmdWaiterPortalV113@addItem');
// PMD_WAITER_PORTAL_V113_ROUTES_END





// PMD_WAITER_DASHBOARD_V20_REAL_MERGE_API_START
if (!defined('PMD_WAITER_DASHBOARD_V20_REAL_MERGE_API')) {
    define('PMD_WAITER_DASHBOARD_V20_REAL_MERGE_API', true);

    $__pmdW20Qi = function ($name) {
        return '`' . str_replace('`', '``', (string)$name) . '`';
    };

    $__pmdW20TableExists = function ($tenantDb, $tableName) {
        try {
            $db = \Illuminate\Support\Facades\DB::getFacadeRoot();
            $row = $db->selectOne("
                SELECT COUNT(*) AS c
                FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = ?
                  AND TABLE_NAME = ?
            ", [$tenantDb, $tableName]);

            return $row && (int)($row->c ?? 0) > 0;
        } catch (\Throwable $e) {
            return false;
        }
    };

    $__pmdW20Columns = function ($tenantDb, $tableName) {
        try {
            $db = \Illuminate\Support\Facades\DB::getFacadeRoot();
            $rows = $db->select("
                SELECT COLUMN_NAME
                FROM information_schema.COLUMNS
                WHERE TABLE_SCHEMA = ?
                  AND TABLE_NAME = ?
            ", [$tenantDb, $tableName]);

            return array_map(function ($r) {
                return $r->COLUMN_NAME;
            }, $rows);
        } catch (\Throwable $e) {
            return [];
        }
    };

    $__pmdW20TenantDb = function () use ($__pmdW20TableExists) {
        $db = \Illuminate\Support\Facades\DB::getFacadeRoot();
        $host = request()->getHost();
        $sub = strtolower(trim(explode('.', $host)[0] ?? ''));

        $current = null;
        try {
            $row = $db->selectOne('select database() as db');
            $current = $row->db ?? null;
        } catch (\Throwable $e) {}

        $candidates = [];
        if (getenv('PMD_TENANT_DB')) $candidates[] = getenv('PMD_TENANT_DB');
        if ($sub && !in_array($sub, ['www', 'admin', 'app', 'paymydine'], true)) $candidates[] = $sub;
        if (strpos($host, 'mimoza') !== false) $candidates[] = 'mimoza';
        if ($current) $candidates[] = $current;

        $candidates = array_values(array_unique(array_filter($candidates)));

        foreach ($candidates as $cand) {
            if ($__pmdW20TableExists($cand, 'ti_pmd_table_merges')) return $cand;
        }

        foreach ($candidates as $cand) {
            if ($__pmdW20TableExists($cand, 'ti_tables')) return $cand;
        }

        throw new \RuntimeException('Could not resolve tenant DB.');
    };

    $__pmdW20EnsureTable = function ($tenantDb) use ($__pmdW20Qi, $__pmdW20TableExists) {
        if ($__pmdW20TableExists($tenantDb, 'ti_pmd_table_merges')) return;

        $db = \Illuminate\Support\Facades\DB::getFacadeRoot();
        $full = $__pmdW20Qi($tenantDb) . '.`ti_pmd_table_merges`';

        $db->statement("
            CREATE TABLE {$full} (
                `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
                `merge_key` VARCHAR(191) NULL,
                `table_numbers` TEXT NULL,
                `status` VARCHAR(32) NULL DEFAULT 'active',
                `notes` TEXT NULL,
                `created_at` DATETIME NULL,
                `updated_at` DATETIME NULL,
                PRIMARY KEY (`id`),
                INDEX `idx_merge_key` (`merge_key`),
                INDEX `idx_status` (`status`)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
        ");
    };

    $__pmdW20Canonical = function ($value) {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                $value = $decoded;
            } else {
                $value = preg_split('/\s*,\s*/', $value);
            }
        }

        if (!is_array($value)) $value = [];

        $out = [];
        foreach ($value as $v) {
            $v = trim((string)$v);
            if ($v !== '') $out[] = $v;
        }

        $out = array_values(array_unique($out));

        usort($out, function ($a, $b) {
            $na = is_numeric($a);
            $nb = is_numeric($b);

            if ($na && $nb) return ((int)$a) <=> ((int)$b);
            return strcmp($a, $b);
        });

        return $out;
    };

    $__pmdW20ParseRowTables = function ($row) use ($__pmdW20Canonical) {
        $a = (array)$row;

        $raw = $a['table_numbers'] ?? null;
        $nums = $__pmdW20Canonical($raw);

        if (!$nums && !empty($a['merge_key'])) {
            $key = (string)$a['merge_key'];

            if (preg_match('/^merge-(.+)-[a-z0-9]{6,}$/i', $key, $m)) {
                $middle = $m[1] ?? '';
                $nums = $__pmdW20Canonical(str_replace('-', ',', $middle));
            }
        }

        return $nums;
    };

    $__pmdW20Rows = function ($tenantDb) use ($__pmdW20Qi, $__pmdW20EnsureTable, $__pmdW20Columns) {
        $__pmdW20EnsureTable($tenantDb);

        $db = \Illuminate\Support\Facades\DB::getFacadeRoot();
        $full = $__pmdW20Qi($tenantDb) . '.`ti_pmd_table_merges`';
        $cols = $__pmdW20Columns($tenantDb, 'ti_pmd_table_merges');

        $where = in_array('status', $cols, true) ? "WHERE (`status` IS NULL OR `status` = '' OR `status` = 'active')" : "";

        return $db->select("SELECT * FROM {$full} {$where} ORDER BY id DESC");
    };

    $__pmdW20List = function () use ($__pmdW20TenantDb, $__pmdW20Rows, $__pmdW20ParseRowTables) {
        try {
            $tenantDb = $__pmdW20TenantDb();

            $merges = [];
            foreach ($__pmdW20Rows($tenantDb) as $row) {
                $a = (array)$row;
                $nums = $__pmdW20ParseRowTables($row);

                if (count($nums) < 2) continue;

                $merges[] = [
                    'id' => $a['id'] ?? null,
                    'merge_id' => $a['id'] ?? null,
                    'merge_key' => $a['merge_key'] ?? null,
                    'table_numbers' => $nums,
                    'status' => $a['status'] ?? 'active',
                    'notes' => $a['notes'] ?? null,
                    'created_at' => $a['created_at'] ?? null,
                ];
            }

            return response()->json([
                'ok' => true,
                'version' => 'waiter-dashboard-v20-table-merges',
                'tenant_db' => $tenantDb,
                'count' => count($merges),
                'merges' => $merges,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'version' => 'waiter-dashboard-v20-table-merges',
                'error' => $e->getMessage(),
                'file' => basename($e->getFile()),
                'line' => $e->getLine(),
            ], 500);
        }
    };

    $__pmdW20Unmerge = function (\Illuminate\Http\Request $request) use (
        $__pmdW20TenantDb,
        $__pmdW20Qi,
        $__pmdW20Rows,
        $__pmdW20ParseRowTables,
        $__pmdW20Canonical
    ) {
        try {
            $db = \Illuminate\Support\Facades\DB::getFacadeRoot();
            $tenantDb = $__pmdW20TenantDb();
            $full = $__pmdW20Qi($tenantDb) . '.`ti_pmd_table_merges`';

            $id = (int)$request->input('id', 0);
            $mergeKey = trim((string)$request->input('merge_key', ''));
            $wanted = $__pmdW20Canonical($request->input('table_numbers', []));

            $affected = 0;

            if ($id > 0) {
                $affected += (int)$db->delete("DELETE FROM {$full} WHERE `id` = ?", [$id]);
            }

            if ($affected < 1 && $mergeKey !== '') {
                $affected += (int)$db->delete("DELETE FROM {$full} WHERE `merge_key` = ?", [$mergeKey]);
            }

            if ($affected < 1 && count($wanted) >= 2) {
                $wantedKey = implode(',', $wanted);

                foreach ($__pmdW20Rows($tenantDb) as $row) {
                    $a = (array)$row;
                    $rowNums = $__pmdW20ParseRowTables($row);
                    $rowKey = implode(',', $rowNums);

                    if ($rowKey === $wantedKey) {
                        if (!empty($a['id'])) {
                            $affected += (int)$db->delete("DELETE FROM {$full} WHERE `id` = ?", [$a['id']]);
                        } elseif (!empty($a['merge_key'])) {
                            $affected += (int)$db->delete("DELETE FROM {$full} WHERE `merge_key` = ?", [$a['merge_key']]);
                        }
                    }
                }
            }

            return response()->json([
                'ok' => true,
                'version' => 'waiter-dashboard-v20-unmerge',
                'tenant_db' => $tenantDb,
                'affected' => $affected,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'version' => 'waiter-dashboard-v20-unmerge',
                'error' => $e->getMessage(),
                'file' => basename($e->getFile()),
                'line' => $e->getLine(),
            ], 500);
        }
    };

    $__pmdW20Merge = function (\Illuminate\Http\Request $request) use (
        $__pmdW20TenantDb,
        $__pmdW20Qi,
        $__pmdW20EnsureTable,
        $__pmdW20Rows,
        $__pmdW20ParseRowTables,
        $__pmdW20Canonical
    ) {
        try {
            $db = \Illuminate\Support\Facades\DB::getFacadeRoot();
            $tenantDb = $__pmdW20TenantDb();
            $__pmdW20EnsureTable($tenantDb);

            $full = $__pmdW20Qi($tenantDb) . '.`ti_pmd_table_merges`';
            $nums = $__pmdW20Canonical($request->input('table_numbers', []));

            if (count($nums) < 2) {
                return response()->json([
                    'ok' => false,
                    'error' => 'Select at least 2 tables.',
                ], 422);
            }

            // Remove any old overlapping merge first.
            foreach ($__pmdW20Rows($tenantDb) as $row) {
                $a = (array)$row;
                $rowNums = $__pmdW20ParseRowTables($row);
                $overlap = array_intersect($nums, $rowNums);

                if ($overlap && !empty($a['id'])) {
                    $db->delete("DELETE FROM {$full} WHERE `id` = ?", [$a['id']]);
                }
            }

            $mergeKey = 'merge-' . implode('-', $nums) . '-' . substr(md5(implode('|', $nums) . microtime(true)), 0, 8);

            $db->insert("
                INSERT INTO {$full}
                    (`merge_key`, `table_numbers`, `status`, `notes`, `created_at`, `updated_at`)
                VALUES
                    (?, ?, 'active', 'Created from waiter floor map V20', ?, ?)
            ", [
                $mergeKey,
                json_encode($nums),
                date('Y-m-d H:i:s'),
                date('Y-m-d H:i:s')
            ]);

            return response()->json([
                'ok' => true,
                'version' => 'waiter-dashboard-v20-merge',
                'tenant_db' => $tenantDb,
                'merge_key' => $mergeKey,
                'table_numbers' => $nums,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'version' => 'waiter-dashboard-v20-merge',
                'error' => $e->getMessage(),
                'file' => basename($e->getFile()),
                'line' => $e->getLine(),
            ], 500);
        }
    };

    \Illuminate\Support\Facades\Route::get('pmd-waiter-dashboard-v20-table-merges', $__pmdW20List);
    \Illuminate\Support\Facades\Route::get('/pmd-waiter-dashboard-v20-table-merges', $__pmdW20List);
    \Illuminate\Support\Facades\Route::get('/admin/pmd-waiter-dashboard-v20-table-merges', $__pmdW20List);

    \Illuminate\Support\Facades\Route::post('pmd-waiter-dashboard-v20-merge-tables', $__pmdW20Merge);
    \Illuminate\Support\Facades\Route::post('/pmd-waiter-dashboard-v20-merge-tables', $__pmdW20Merge);
    \Illuminate\Support\Facades\Route::post('/admin/pmd-waiter-dashboard-v20-merge-tables', $__pmdW20Merge);

    \Illuminate\Support\Facades\Route::post('pmd-waiter-dashboard-v20-unmerge-tables', $__pmdW20Unmerge);
    \Illuminate\Support\Facades\Route::post('/pmd-waiter-dashboard-v20-unmerge-tables', $__pmdW20Unmerge);
    \Illuminate\Support\Facades\Route::post('/admin/pmd-waiter-dashboard-v20-unmerge-tables', $__pmdW20Unmerge);
}
// PMD_WAITER_DASHBOARD_V20_REAL_MERGE_API_END




// PMD_WAITER_DASHBOARD_V21_MERGE_CLEANUP_START
if (!defined('PMD_WAITER_DASHBOARD_V21_MERGE_CLEANUP')) {
    define('PMD_WAITER_DASHBOARD_V21_MERGE_CLEANUP', true);

    $__pmdW21Qi = function ($name) {
        return '`' . str_replace('`', '``', (string)$name) . '`';
    };

    $__pmdW21TableExists = function ($tenantDb, $tableName) {
        try {
            $db = \Illuminate\Support\Facades\DB::getFacadeRoot();
            $row = $db->selectOne("
                SELECT COUNT(*) AS c
                FROM information_schema.TABLES
                WHERE TABLE_SCHEMA = ?
                  AND TABLE_NAME = ?
            ", [$tenantDb, $tableName]);

            return $row && (int)($row->c ?? 0) > 0;
        } catch (\Throwable $e) {
            return false;
        }
    };

    $__pmdW21TenantDb = function () use ($__pmdW21TableExists) {
        $db = \Illuminate\Support\Facades\DB::getFacadeRoot();
        $host = request()->getHost();
        $sub = strtolower(trim(explode('.', $host)[0] ?? ''));

        $current = null;
        try {
            $row = $db->selectOne('select database() as db');
            $current = $row->db ?? null;
        } catch (\Throwable $e) {}

        $candidates = [];
        if (getenv('PMD_TENANT_DB')) $candidates[] = getenv('PMD_TENANT_DB');
        if ($sub && !in_array($sub, ['www', 'admin', 'app', 'paymydine'], true)) $candidates[] = $sub;
        if (strpos($host, 'mimoza') !== false) $candidates[] = 'mimoza';
        if ($current) $candidates[] = $current;

        $candidates = array_values(array_unique(array_filter($candidates)));

        foreach ($candidates as $cand) {
            if ($__pmdW21TableExists($cand, 'ti_pmd_table_merges')) return $cand;
        }

        throw new \RuntimeException('Could not resolve tenant merge table.');
    };

    $__pmdW21Canonical = function ($value) {
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (is_array($decoded)) {
                $value = $decoded;
            } else {
                $value = preg_split('/\s*,\s*/', $value);
            }
        }

        if (!is_array($value)) $value = [];

        $out = [];
        foreach ($value as $v) {
            $v = trim((string)$v);
            if ($v !== '') $out[] = $v;
        }

        $out = array_values(array_unique($out));

        usort($out, function ($a, $b) {
            $na = is_numeric($a);
            $nb = is_numeric($b);

            if ($na && $nb) return ((int)$a) <=> ((int)$b);
            return strcmp($a, $b);
        });

        return $out;
    };

    $__pmdW21ParseTables = function ($row) use ($__pmdW21Canonical) {
        $a = (array)$row;
        $nums = $__pmdW21Canonical($a['table_numbers'] ?? '');

        if (!$nums && !empty($a['merge_key'])) {
            $key = (string)$a['merge_key'];

            if (preg_match('/^merge-(.+)-[a-z0-9]{6,}$/i', $key, $m)) {
                $nums = $__pmdW21Canonical(str_replace('-', ',', $m[1] ?? ''));
            }
        }

        return $nums;
    };

    $__pmdW21Cleanup = function () use ($__pmdW21TenantDb, $__pmdW21Qi, $__pmdW21ParseTables) {
        try {
            $db = \Illuminate\Support\Facades\DB::getFacadeRoot();
            $tenantDb = $__pmdW21TenantDb();
            $full = $__pmdW21Qi($tenantDb) . '.`ti_pmd_table_merges`';

            $rows = $db->select("
                SELECT *
                FROM {$full}
                WHERE (`status` IS NULL OR `status` = '' OR `status` = 'active')
                ORDER BY id DESC
            ");

            $usedTables = [];
            $kept = [];
            $deleted = [];

            foreach ($rows as $row) {
                $a = (array)$row;
                $id = (int)($a['id'] ?? 0);
                $nums = $__pmdW21ParseTables($row);

                if (count($nums) < 2) {
                    if ($id > 0) {
                        $db->delete("DELETE FROM {$full} WHERE `id` = ?", [$id]);
                        $deleted[] = [
                            'id' => $id,
                            'reason' => 'invalid_less_than_two_tables',
                            'tables' => $nums,
                        ];
                    }
                    continue;
                }

                $overlap = [];
                foreach ($nums as $n) {
                    if (isset($usedTables[$n])) $overlap[] = $n;
                }

                if ($overlap) {
                    if ($id > 0) {
                        $db->delete("DELETE FROM {$full} WHERE `id` = ?", [$id]);
                        $deleted[] = [
                            'id' => $id,
                            'reason' => 'overlap',
                            'overlap' => $overlap,
                            'tables' => $nums,
                        ];
                    }
                    continue;
                }

                foreach ($nums as $n) {
                    $usedTables[$n] = true;
                }

                $kept[] = [
                    'id' => $id,
                    'merge_key' => $a['merge_key'] ?? null,
                    'table_numbers' => $nums,
                ];
            }

            return response()->json([
                'ok' => true,
                'version' => 'waiter-dashboard-v21-merge-cleanup',
                'tenant_db' => $tenantDb,
                'kept_count' => count($kept),
                'deleted_count' => count($deleted),
                'kept' => $kept,
                'deleted' => $deleted,
            ]);
        } catch (\Throwable $e) {
            return response()->json([
                'ok' => false,
                'version' => 'waiter-dashboard-v21-merge-cleanup',
                'error' => $e->getMessage(),
                'file' => basename($e->getFile()),
                'line' => $e->getLine(),
            ], 500);
        }
    };

    \Illuminate\Support\Facades\Route::post('pmd-waiter-dashboard-v21-clean-merge-overlaps', $__pmdW21Cleanup);
    \Illuminate\Support\Facades\Route::post('/pmd-waiter-dashboard-v21-clean-merge-overlaps', $__pmdW21Cleanup);
    \Illuminate\Support\Facades\Route::post('/admin/pmd-waiter-dashboard-v21-clean-merge-overlaps', $__pmdW21Cleanup);
}
// PMD_WAITER_DASHBOARD_V21_MERGE_CLEANUP_END









// PMD_WAITER_FINAL_V2_ROUTE_LOADER
require_once base_path('routes/pmd-waiter-final-v2.php');
