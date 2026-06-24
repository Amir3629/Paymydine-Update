<?php

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

// PMD_ADMIN_QUICK_MODE_PREVIEW_20260616
if (file_exists(base_path('routes/admin-quick-mode.php'))) {
    require base_path('routes/admin-quick-mode.php');
}

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

