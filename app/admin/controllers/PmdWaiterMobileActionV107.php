<?php

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class PmdWaiterMobileActionV107 extends AdminController
{
    private function json($data, $code = 200)
    {
        if (class_exists('Response')) return Response::json($data, $code);
        return response()->json($data, $code);
    }

    private function req($key, $default = null)
    {
        if (class_exists('Input')) return Input::get($key, $default);
        if (function_exists('request')) return request()->input($key, $default);
        return isset($_GET[$key]) ? $_GET[$key] : $default;
    }

    private function qt($name)
    {
        return '`'.str_replace('`', '``', $name).'`';
    }

    private function hasTable($table)
    {
        try { return Schema::hasTable($table); }
        catch (Exception $e) {
            try { return count(DB::select("SHOW TABLES LIKE ?", array($table))) > 0; }
            catch (Exception $e2) { return false; }
        }
    }

    private function firstTable($names)
    {
        foreach ($names as $name) {
            if ($this->hasTable($name)) return $name;
        }
        return null;
    }

    private function columns($table)
    {
        $out = array();
        if (!$table) return $out;
        try {
            foreach (DB::select("SHOW COLUMNS FROM ".$this->qt($table)) as $r) {
                $out[$r->Field] = $r;
            }
        } catch (Exception $e) {}
        return $out;
    }

    private function col($cols, $candidates)
    {
        foreach ($candidates as $c) if (isset($cols[$c])) return $c;
        $lower = array();
        foreach ($cols as $k => $v) $lower[strtolower($k)] = $k;
        foreach ($candidates as $c) {
            $lc = strtolower($c);
            if (isset($lower[$lc])) return $lower[$lc];
        }
        return null;
    }

    private function primaryKey($table, $fallbacks = array())
    {
        $cols = $this->columns($table);

        try {
            $keys = DB::select("SHOW KEYS FROM ".$this->qt($table)." WHERE Key_name = 'PRIMARY'");
            if (count($keys) && !empty($keys[0]->Column_name) && isset($cols[$keys[0]->Column_name])) return $keys[0]->Column_name;
        } catch (Exception $e) {}

        foreach ($cols as $name => $info) {
            $extra = strtolower(isset($info->Extra) ? $info->Extra : '');
            if (strpos($extra, 'auto_increment') !== false) return $name;
        }

        foreach ($fallbacks as $f) if (isset($cols[$f])) return $f;

        $guesses = array('id', 'ID', $table.'_id', rtrim($table, 's').'_id', 'order_id', 'orders_id', 'order_menu_id', 'order_menus_id', 'order_item_id', 'menu_id', 'table_id');
        foreach ($guesses as $f) if (isset($cols[$f])) return $f;

        return null;
    }

    private function isActiveValue($v)
    {
        if ($v === null) return true;
        if (is_numeric($v)) return (int)$v === 1;
        $s = strtolower(trim((string)$v));
        return in_array($s, array('1','active','enabled','enable','available','free','open','yes','true','published','visible'), true);
    }

    private function money($v)
    {
        if ($v === null || $v === '') return 0.0;
        if (is_numeric($v)) return (float)$v;
        return (float)preg_replace('/[^\d\.\-]/', '', (string)$v);
    }

    private function userId()
    {
        try {
            if (class_exists('Auth') && Auth::check()) {
                $u = Auth::user();
                foreach (array('id','user_id','staff_id','admin_id','employee_id') as $c) {
                    if (isset($u->$c)) return $u->$c;
                }
            }
        } catch (Exception $e) {}
        return null;
    }

    private function detect()
    {
        $tables = $this->firstTable(array('tables','restaurant_tables','dining_tables','table_management','floor_tables'));
        $menus  = $this->firstTable(array('menus','menu_items','restaurant_menus','items','products'));
        $orders = $this->firstTable(array('orders','restaurant_orders','customer_orders'));
        $items  = $this->firstTable(array('order_menus','order_menu','order_items','ordered_items','order_details'));
        $reservations = $this->firstTable(array('reservations','table_reservations','restaurant_reservations'));
        $assign = $this->firstTable(array('pmd_waiter_table_assignments','waiter_table_assignments','staff_table_assignments'));
        $merges = $this->firstTable(array('pmd_table_merges','table_merges','merged_tables'));

        return array(
            'tables'=>$tables, 'menus'=>$menus, 'orders'=>$orders, 'items'=>$items,
            'reservations'=>$reservations, 'assign'=>$assign, 'merges'=>$merges,
            'tables_cols'=>$this->columns($tables), 'menus_cols'=>$this->columns($menus),
            'orders_cols'=>$this->columns($orders), 'items_cols'=>$this->columns($items),
            'reservations_cols'=>$this->columns($reservations), 'assign_cols'=>$this->columns($assign),
            'merges_cols'=>$this->columns($merges)
        );
    }

    private function tableRows($d)
    {
        $t = $d['tables'];
        $cols = $d['tables_cols'];
        if (!$t) return array();

        $pk = $this->primaryKey($t, array('table_id','id','tables_id'));
        $no = $this->col($cols, array('table_no','table_number','number','no','name','table_name','title'));
        $name = $this->col($cols, array('table_name','name','title','label'));
        $active = $this->col($cols, array('table_status','status','is_active','active','enabled','is_enabled'));
        $capacity = $this->col($cols, array('capacity','seats','chair','chairs','person','persons'));

        $q = DB::table($t);
        if ($pk) $q->orderBy($pk, 'asc');
        $raw = $q->limit(200)->get();
        $out = array();

        foreach ($raw as $r) {
            if ($active && !$this->isActiveValue(isset($r->$active) ? $r->$active : null)) continue;

            $id = $pk && isset($r->$pk) ? $r->$pk : null;
            if ($id === null) continue;

            $num = $no && isset($r->$no) ? $r->$no : $id;
            $label = $name && isset($r->$name) && trim((string)$r->$name) !== '' ? (string)$r->$name : ('Table '.$num);

            $statusRaw = $active && isset($r->$active) ? strtolower((string)$r->$active) : '';
            $base = 'free';
            if (strpos($statusRaw, 'reserved') !== false) $base = 'reserved';
            elseif (strpos($statusRaw, 'merged') !== false) $base = 'merged';
            elseif (strpos($statusRaw, 'clean') !== false) $base = 'cleaning';
            elseif (strpos($statusRaw, 'service') !== false || strpos($statusRaw, 'disabled') !== false) $base = 'off';

            $out[] = array(
                'table_id'=>$id,
                'number'=>(string)$num,
                'label'=>$label,
                'capacity'=>$capacity && isset($r->$capacity) ? $r->$capacity : null,
                'base_status'=>$base,
                'floor_status'=>$base,
                'assigned'=>false,
                'open_order_count'=>0,
                'ready_count'=>0,
                'attention'=>array('count'=>0),
                'reservation'=>array('count'=>0,'next_time'=>null),
                'due'=>0,
                'due_label'=>'€0.00'
            );
        }

        return $out;
    }

    private function menuRows($d)
    {
        $t = $d['menus'];
        $cols = $d['menus_cols'];
        if (!$t) return array();

        $pk = $this->primaryKey($t, array('menu_id','id','item_id','product_id','menus_id'));
        $name = $this->col($cols, array('menu_name','name','title','item_name','product_name','food_name'));
        $price = $this->col($cols, array('menu_price','price','sale_price','selling_price','amount','rate','cost'));
        $active = $this->col($cols, array('menu_status','status','is_active','active','enabled','is_enabled','available'));
        $cat = $this->col($cols, array('category_id','menu_category_id','category','cat_id'));

        $q = DB::table($t);
        if ($active) {
            try {
                $q->where(function($x) use ($active) {
                    $x->where($active, 1)->orWhere($active, '1')->orWhere($active, 'active')->orWhere($active, 'enabled')->orWhere($active, 'available');
                });
            } catch (Exception $e) {}
        }
        if ($cat) {
            try { $q->orderBy($cat, 'asc'); } catch (Exception $e) {}
        }
        if ($pk) $q->orderBy($pk, 'asc');

        $rows = $q->limit(240)->get();
        $out = array();
        foreach ($rows as $r) {
            if ($active && !$this->isActiveValue(isset($r->$active) ? $r->$active : null)) continue;
            $id = $pk && isset($r->$pk) ? $r->$pk : null;
            if ($id === null) continue;
            $nm = $name && isset($r->$name) ? trim((string)$r->$name) : '';
            if ($nm === '') continue;
            $p = $price && isset($r->$price) ? $this->money($r->$price) : 0;
            $out[] = array('menu_id'=>$id, 'name'=>$nm, 'price'=>$p, 'price_label'=>'€'.number_format($p, 2));
        }
        return $out;
    }

    private function assignedMap($d)
    {
        $map = array();
        $uid = $this->userId();
        if (!$uid) return $map;
        $t = $d['assign'];
        $cols = $d['assign_cols'];
        if (!$t) return $map;

        $tableCol = $this->col($cols, array('table_id','restaurant_table_id','table_no','table_number'));
        $userCol = $this->col($cols, array('user_id','waiter_id','staff_id','employee_id','admin_id'));
        $active = $this->col($cols, array('active','status','is_active','enabled'));
        if (!$tableCol || !$userCol) return $map;

        try {
            $q = DB::table($t)->where($userCol, $uid);
            if ($active) $q->where(function($x) use ($active) {
                $x->where($active, 1)->orWhere($active, '1')->orWhere($active, 'active')->orWhere($active, 'enabled');
            });
            foreach ($q->limit(160)->get() as $r) $map[(string)$r->$tableCol] = true;
        } catch (Exception $e) {}
        return $map;
    }

    private function decorateTables($d, $tables)
    {
        $assigned = $this->assignedMap($d);
        $byId = array();
        foreach ($tables as $i => $t) {
            $byId[(string)$t['table_id']] = $i;
            if (isset($assigned[(string)$t['table_id']]) || isset($assigned[(string)$t['number']])) $tables[$i]['assigned'] = true;
        }

        $ordersT = $d['orders'];
        $ordersCols = $d['orders_cols'];
        if ($ordersT) {
            $ordersPk = $this->primaryKey($ordersT, array('order_id','orders_id','id'));
            $oTableId = $this->col($ordersCols, array('table_id','restaurant_table_id','dining_table_id'));
            $oTableNo = $this->col($ordersCols, array('table_no','table_number','table_name'));
            $oStatus = $this->col($ordersCols, array('status','order_status','order_state'));
            $payStatus = $this->col($ordersCols, array('payment_status','paid_status','is_paid','paid'));
            $totalCol = $this->col($ordersCols, array('total','total_amount','grand_total','order_total','amount','payable_amount','sub_total'));

            $q = DB::table($ordersT);
            if ($ordersPk) $q->orderBy($ordersPk, 'desc');
            try {
                $activeOrders = array();
                foreach ($q->limit(600)->get() as $o) {
                    $tid = null;
                    if ($oTableId && isset($o->$oTableId)) $tid = (string)$o->$oTableId;
                    elseif ($oTableNo && isset($o->$oTableNo)) {
                        foreach ($tables as $i => $t) {
                            if ((string)$t['number'] === (string)$o->$oTableNo || (string)$t['label'] === (string)$o->$oTableNo) { $tid = (string)$t['table_id']; break; }
                        }
                    }
                    if ($tid === null || !isset($byId[$tid])) continue;

                    $status = $oStatus && isset($o->$oStatus) ? strtolower((string)$o->$oStatus) : '';
                    $paid = $payStatus && isset($o->$payStatus) ? strtolower((string)$o->$payStatus) : '';
                    $closed = false;
                    foreach (array('complete','completed','served','closed','cancel','cancelled','canceled') as $word) {
                        if ($status !== '' && strpos($status, $word) !== false) $closed = true;
                    }
                    if ($paid === '1' || $paid === 'paid' || $paid === 'yes' || $paid === 'true') $closed = true;
                    if ($closed) continue;

                    $idx = $byId[$tid];
                    $tables[$idx]['open_order_count']++;
                    $tables[$idx]['due'] += $totalCol && isset($o->$totalCol) ? $this->money($o->$totalCol) : 0;
                    if ($ordersPk && isset($o->$ordersPk)) $activeOrders[(string)$o->$ordersPk] = $idx;
                }

                $itemT = $d['items'];
                $itemCols = $d['items_cols'];
                if ($itemT && count($activeOrders)) {
                    $itemOrder = $this->col($itemCols, array('order_id','orders_id','order_ref','orderID'));
                    $itemStatus = $this->col($itemCols, array('status','order_status','item_status','kitchen_status','food_status'));
                    if ($itemOrder) {
                        foreach (DB::table($itemT)->whereIn($itemOrder, array_keys($activeOrders))->limit(1200)->get() as $it) {
                            $idx = isset($activeOrders[(string)$it->$itemOrder]) ? $activeOrders[(string)$it->$itemOrder] : null;
                            if ($idx === null) continue;
                            $st = $itemStatus && isset($it->$itemStatus) ? strtolower((string)$it->$itemStatus) : '';
                            if (strpos($st, 'ready') !== false || strpos($st, 'complete') !== false || strpos($st, 'prepared') !== false || $st === '2') $tables[$idx]['ready_count']++;
                        }
                    }
                }
            } catch (Exception $e) {}
        }

        $resT = $d['reservations'];
        $resCols = $d['reservations_cols'];
        if ($resT) {
            $rTableId = $this->col($resCols, array('table_id','restaurant_table_id','dining_table_id'));
            $rTableNo = $this->col($resCols, array('table_no','table_number','table_name'));
            $rStatus = $this->col($resCols, array('status','reservation_status'));
            $rDate = $this->col($resCols, array('date','reservation_date','reserved_date','booking_date'));
            $rTime = $this->col($resCols, array('time','reservation_time','reserved_time','booking_time'));
            try {
                $q = DB::table($resT);
                if ($rDate) $q->where($rDate, '>=', date('Y-m-d'));
                foreach ($q->limit(400)->get() as $r) {
                    $st = $rStatus && isset($r->$rStatus) ? strtolower((string)$r->$rStatus) : '';
                    if (strpos($st, 'cancel') !== false || strpos($st, 'complete') !== false || strpos($st, 'closed') !== false) continue;
                    $tid = null;
                    if ($rTableId && isset($r->$rTableId)) $tid = (string)$r->$rTableId;
                    elseif ($rTableNo && isset($r->$rTableNo)) {
                        foreach ($tables as $i => $t) if ((string)$t['number'] === (string)$r->$rTableNo || (string)$t['label'] === (string)$r->$rTableNo) { $tid = (string)$t['table_id']; break; }
                    }
                    if ($tid !== null && isset($byId[$tid])) {
                        $i = $byId[$tid];
                        $tables[$i]['reservation']['count']++;
                        if ($rTime && isset($r->$rTime)) $tables[$i]['reservation']['next_time'] = $r->$rTime;
                    }
                }
            } catch (Exception $e) {}
        }

        $mergeT = $d['merges'];
        $mergeCols = $d['merges_cols'];
        if ($mergeT) {
            $pCol = $this->col($mergeCols, array('primary_table_id','main_table_id','table_id'));
            $sCol = $this->col($mergeCols, array('secondary_table_id','merged_table_id','table_id_2'));
            $active = $this->col($mergeCols, array('active','status','is_active'));
            try {
                $q = DB::table($mergeT);
                if ($active) $q->where(function($x) use ($active) { $x->where($active,1)->orWhere($active,'1')->orWhere($active,'active')->orWhere($active,'enabled'); });
                foreach ($q->limit(100)->get() as $m) {
                    foreach (array($pCol, $sCol) as $c) {
                        if ($c && isset($m->$c) && isset($byId[(string)$m->$c])) $tables[$byId[(string)$m->$c]]['floor_status'] = 'merged';
                    }
                }
            } catch (Exception $e) {}
        }

        foreach ($tables as $i => $t) {
            $status = $t['base_status'];
            if ($t['floor_status'] === 'merged') $status = 'merged';
            elseif ($t['ready_count'] > 0) $status = 'ready';
            elseif (!empty($t['attention']['count'])) $status = 'attention';
            elseif ($t['open_order_count'] > 0) $status = 'open';
            elseif ($t['reservation']['count'] > 0) $status = 'reserved';
            elseif ($t['assigned']) $status = 'assigned';
            $tables[$i]['floor_status'] = $status;
            $tables[$i]['due_label'] = '€'.number_format((float)$tables[$i]['due'], 2);
        }
        return $tables;
    }

    public function data()
    {
        try {
            $d = $this->detect();
            $tables = $this->decorateTables($d, $this->tableRows($d));
            $menus = $this->menuRows($d);
            return $this->json(array(
                'ok'=>true,
                'version'=>'v114-backend-on-v107-route',
                'mode'=>'REAL_TABLES_REAL_MENUS_ACTION_REPAIRED',
                'generated_at'=>date('c'),
                'user'=>array('id'=>$this->userId()),
                'detected'=>array(
                    'tables'=>$d['tables'], 'menus'=>$d['menus'], 'orders'=>$d['orders'], 'items'=>$d['items'],
                    'reservations'=>$d['reservations'], 'assign'=>$d['assign'], 'merges'=>$d['merges'],
                    'orders_pk'=>$d['orders'] ? $this->primaryKey($d['orders'], array('order_id','orders_id','id')) : null,
                    'items_pk'=>$d['items'] ? $this->primaryKey($d['items'], array('order_menu_id','order_menus_id','order_item_id','id')) : null
                ),
                'tables'=>$tables,
                'menu_items'=>$menus
            ));
        } catch (Exception $e) {
            return $this->json(array('ok'=>false,'version'=>'v114','error'=>$e->getMessage(),'file'=>basename($e->getFile()),'line'=>$e->getLine()), 500);
        }
    }

    public function audit()
    {
        $d = $this->detect();
        return $this->json(array(
            'ok'=>true,
            'version'=>'v114-backend-on-v107-route',
            'detected'=>array(
                'tables'=>$d['tables'], 'menus'=>$d['menus'], 'orders'=>$d['orders'], 'items'=>$d['items'],
                'reservations'=>$d['reservations'], 'assign'=>$d['assign'], 'merges'=>$d['merges'],
                'orders_pk'=>$d['orders'] ? $this->primaryKey($d['orders'], array('order_id','orders_id','id')) : null,
                'items_pk'=>$d['items'] ? $this->primaryKey($d['items'], array('order_menu_id','order_menus_id','order_item_id','id')) : null,
                'tables_columns'=>array_keys($d['tables_cols']),
                'menus_columns'=>array_keys($d['menus_cols']),
                'orders_columns'=>array_keys($d['orders_cols']),
                'items_columns'=>array_keys($d['items_cols'])
            )
        ));
    }

    public function getData() { return $this->data(); }
    public function floorData() { return $this->data(); }
    public function getAudit() { return $this->audit(); }
    public function floorAudit() { return $this->audit(); }

    private function defaultFor($meta)
    {
        $type = strtolower(isset($meta->Type) ? $meta->Type : '');
        if (strpos($type, 'enum(') === 0 && preg_match("/enum\\('([^']+)'/", $type, $m)) return $m[1];
        if (strpos($type, 'int') !== false || strpos($type, 'decimal') !== false || strpos($type, 'double') !== false || strpos($type, 'float') !== false) return 0;
        if (strpos($type, 'date') !== false && strpos($type, 'time') !== false) return date('Y-m-d H:i:s');
        if (strpos($type, 'date') !== false) return date('Y-m-d');
        if (strpos($type, 'time') !== false) return date('H:i:s');
        return '';
    }

    private function fillRequired($table, $row)
    {
        $cols = $this->columns($table);
        foreach ($cols as $name => $meta) {
            if (array_key_exists($name, $row)) continue;
            $extra = strtolower(isset($meta->Extra) ? $meta->Extra : '');
            if (strpos($extra, 'auto_increment') !== false) continue;
            $null = isset($meta->Null) ? strtoupper($meta->Null) : 'YES';
            $default = isset($meta->Default) ? $meta->Default : null;
            if ($null === 'NO' && $default === null) $row[$name] = $this->defaultFor($meta);
        }
        return $row;
    }

    public function addItem()
    {
        try {
            if ((string)$this->req('apply','0') !== '1') return $this->json(array('ok'=>false,'version'=>'v114','error'=>'Missing apply=1'), 400);

            $tableId = $this->req('table_id');
            $menuId = $this->req('menu_id');
            $qty = max(1, (int)$this->req('qty', 1));

            $d = $this->detect();
            $tablesT = $d['tables']; $menusT = $d['menus']; $ordersT = $d['orders']; $itemsT = $d['items'];
            if (!$tablesT || !$menusT || !$ordersT || !$itemsT) {
                return $this->json(array('ok'=>false,'version'=>'v114','error'=>'Missing real table/menu/orders/order_menus table','detected'=>array('tables'=>$tablesT,'menus'=>$menusT,'orders'=>$ordersT,'items'=>$itemsT)), 500);
            }

            $tCols = $d['tables_cols']; $mCols = $d['menus_cols']; $oCols = $d['orders_cols']; $iCols = $d['items_cols'];
            $tPk = $this->primaryKey($tablesT, array('table_id','tables_id','id'));
            $mPk = $this->primaryKey($menusT, array('menu_id','menus_id','id','item_id','product_id'));
            $oPk = $this->primaryKey($ordersT, array('order_id','orders_id','id'));
            $iPk = $this->primaryKey($itemsT, array('order_menu_id','order_menus_id','order_item_id','id'));

            if (!$tPk || !$mPk || !$oPk) {
                return $this->json(array(
                    'ok'=>false,'version'=>'v114',
                    'error'=>'Cannot detect required primary key safely',
                    'detected'=>array('table_pk'=>$tPk,'menu_pk'=>$mPk,'orders_pk'=>$oPk,'items_pk'=>$iPk,'orders_columns'=>array_keys($oCols),'items_columns'=>array_keys($iCols))
                ), 500);
            }

            $table = DB::table($tablesT)->where($tPk, $tableId)->first();
            $menu = DB::table($menusT)->where($mPk, $menuId)->first();
            if (!$table || !$menu) return $this->json(array('ok'=>false,'version'=>'v114','error'=>'Table or menu item not found'), 404);

            $mName = $this->col($mCols, array('menu_name','name','title','item_name','product_name','food_name'));
            $mPrice = $this->col($mCols, array('menu_price','price','sale_price','selling_price','amount','rate','cost'));
            $price = $mPrice && isset($menu->$mPrice) ? $this->money($menu->$mPrice) : 0;
            $name = $mName && isset($menu->$mName) ? (string)$menu->$mName : ('Item '.$menuId);

            $oTableId = $this->col($oCols, array('table_id','restaurant_table_id','dining_table_id'));
            $oTableNo = $this->col($oCols, array('table_no','table_number','table_name'));
            $oStatus = $this->col($oCols, array('status','order_status','order_state'));
            $oUser = $this->col($oCols, array('waiter_id','staff_id','employee_id','user_id','admin_id'));
            $oTotal = $this->col($oCols, array('total','total_amount','grand_total','order_total','amount','payable_amount','sub_total'));
            $oNumber = $this->col($oCols, array('order_number','order_no','invoice_no','reference','ref_no'));
            $created = $this->col($oCols, array('created_at','date_added','created_on'));
            $updated = $this->col($oCols, array('updated_at','modified_at','updated_on'));
            $dateCol = $this->col($oCols, array('date','order_date'));
            $timeCol = $this->col($oCols, array('time','order_time'));

            $tableNoCol = $this->col($tCols, array('table_no','table_number','number','no','name','table_name'));
            $tableNo = $tableNoCol && isset($table->$tableNoCol) ? $table->$tableNoCol : $tableId;

            $linkCol = $oTableId ? $oTableId : $oTableNo;
            $linkVal = $oTableId ? $tableId : $tableNo;
            if (!$linkCol) return $this->json(array('ok'=>false,'version'=>'v114','error'=>'Cannot detect orders table link column','order_columns'=>array_keys($oCols)), 500);

            $orderId = null;
            try {
                $q = DB::table($ordersT)->where($linkCol, $linkVal);
                if ($oStatus) {
                    $q->where(function($x) use ($oStatus) {
                        $x->where($oStatus, 'open')->orWhere($oStatus, 'pending')->orWhere($oStatus, 'new')->orWhere($oStatus, 'processing')->orWhere($oStatus, 0)->orWhere($oStatus, 1);
                    });
                }
                $order = $q->orderBy($oPk, 'desc')->first();
                if ($order && isset($order->$oPk)) $orderId = $order->$oPk;
            } catch (Exception $e) {}

            if (!$orderId) {
                $row = array();
                $row[$linkCol] = $linkVal;
                if ($oUser && $this->userId()) $row[$oUser] = $this->userId();
                if ($oStatus) $row[$oStatus] = 'open';
                if ($oTotal) $row[$oTotal] = 0;
                if ($oNumber) $row[$oNumber] = 'W'.date('ymdHis').mt_rand(100,999);
                if ($created) $row[$created] = date('Y-m-d H:i:s');
                if ($updated) $row[$updated] = date('Y-m-d H:i:s');
                if ($dateCol) $row[$dateCol] = date('Y-m-d');
                if ($timeCol) $row[$timeCol] = date('H:i:s');

                foreach (array('order_type','type','source') as $c) if (isset($oCols[$c]) && !isset($row[$c])) $row[$c] = 'dine_in';
                foreach (array('payment_status','paid_status','paid','is_paid') as $c) if (isset($oCols[$c]) && !isset($row[$c])) $row[$c] = 0;

                $row = $this->fillRequired($ordersT, $row);
                DB::table($ordersT)->insert($row);

                try {
                    $last = DB::getPdo()->lastInsertId();
                    if ($last) $orderId = $last;
                } catch (Exception $e) {}

                if (!$orderId) {
                    $fresh = DB::table($ordersT)->where($linkCol, $linkVal)->orderBy($oPk, 'desc')->first();
                    if ($fresh && isset($fresh->$oPk)) $orderId = $fresh->$oPk;
                }
            }

            if (!$orderId) return $this->json(array('ok'=>false,'version'=>'v114','error'=>'Order created/opened but id could not be read','orders_table'=>$ordersT,'orders_pk'=>$oPk), 500);

            $iOrder = $this->col($iCols, array('order_id','orders_id','order_ref','orderID'));
            $iMenu = $this->col($iCols, array('menu_id','menus_id','menu_item_id','item_id','product_id','food_id'));
            $iQty = $this->col($iCols, array('quantity','qty','item_qty','menu_quantity'));
            $iPrice = $this->col($iCols, array('price','menu_price','unit_price','rate','amount'));
            $iTotal = $this->col($iCols, array('total','total_price','sub_total','amount_total','line_total'));
            $iName = $this->col($iCols, array('name','menu_name','item_name','food_name'));
            $iStatus = $this->col($iCols, array('status','item_status','order_status','kitchen_status','food_status'));
            $iCreated = $this->col($iCols, array('created_at','date_added','created_on'));
            $iUpdated = $this->col($iCols, array('updated_at','modified_at','updated_on'));

            if (!$iOrder) return $this->json(array('ok'=>false,'version'=>'v114','error'=>'Cannot detect order item order-link column','items_table'=>$itemsT,'item_columns'=>array_keys($iCols)), 500);

            $item = array();
            $item[$iOrder] = $orderId;
            if ($iMenu) $item[$iMenu] = $menuId;
            if ($iQty) $item[$iQty] = $qty;
            if ($iPrice) $item[$iPrice] = $price;
            if ($iTotal) $item[$iTotal] = $price * $qty;
            if ($iName) $item[$iName] = $name;
            if ($iStatus) $item[$iStatus] = 'new';
            if ($iCreated) $item[$iCreated] = date('Y-m-d H:i:s');
            if ($iUpdated) $item[$iUpdated] = date('Y-m-d H:i:s');

            $item = $this->fillRequired($itemsT, $item);
            DB::table($itemsT)->insert($item);

            if ($oTotal) {
                try { DB::table($ordersT)->where($oPk, $orderId)->increment($oTotal, $price * $qty); } catch (Exception $e) {}
            }

            return $this->json(array(
                'ok'=>true,
                'version'=>'v114',
                'message'=>'Item added',
                'order_id'=>$orderId,
                'table_id'=>$tableId,
                'menu_id'=>$menuId,
                'item_name'=>$name
            ));
        } catch (Exception $e) {
            return $this->json(array('ok'=>false,'version'=>'v114','error'=>$e->getMessage(),'file'=>basename($e->getFile()),'line'=>$e->getLine()), 500);
        }
    }

    public function add() { return $this->addItem(); }
    public function add_item() { return $this->addItem(); }

    public function merge()
    {
        try {
            if ((string)$this->req('apply','0') !== '1') return $this->json(array('ok'=>false,'error'=>'Missing apply=1'), 400);
            $primary = $this->req('primary');
            $secondary = $this->req('secondary');
            if (!$primary || !$secondary || (string)$primary === (string)$secondary) return $this->json(array('ok'=>false,'error'=>'Choose two different tables'), 400);

            if (!$this->hasTable('pmd_table_merges')) {
                DB::statement("CREATE TABLE IF NOT EXISTS `pmd_table_merges` (
                  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT,
                  `primary_table_id` INT NULL,
                  `secondary_table_id` INT NULL,
                  `active` TINYINT(1) NOT NULL DEFAULT 1,
                  `created_at` DATETIME NULL,
                  `updated_at` DATETIME NULL,
                  PRIMARY KEY (`id`)
                ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4");
            }

            DB::table('pmd_table_merges')->insert(array(
                'primary_table_id'=>$primary,
                'secondary_table_id'=>$secondary,
                'active'=>1,
                'created_at'=>date('Y-m-d H:i:s'),
                'updated_at'=>date('Y-m-d H:i:s')
            ));
            return $this->json(array('ok'=>true,'version'=>'v114','message'=>'Tables merged'));
        } catch (Exception $e) {
            return $this->json(array('ok'=>false,'version'=>'v114','error'=>$e->getMessage()), 500);
        }
    }

    public function clearMerges()
    {
        try {
            if ((string)$this->req('apply','0') !== '1') return $this->json(array('ok'=>false,'error'=>'Missing apply=1'), 400);
            $n = 0;
            if ($this->hasTable('pmd_table_merges')) {
                $cols = $this->columns('pmd_table_merges');
                if (isset($cols['active'])) $n = DB::table('pmd_table_merges')->update(array('active'=>0));
                else $n = DB::table('pmd_table_merges')->delete();
            }
            return $this->json(array('ok'=>true,'version'=>'v114','disabled_merges'=>$n));
        } catch (Exception $e) { return $this->json(array('ok'=>false,'error'=>$e->getMessage()),500); }
    }

    public function assign()
    {
        return $this->json(array('ok'=>true,'version'=>'v114','message'=>'Assignment endpoint left safe/no-op in this rescue. Use existing admin assignment flow.'));
    }
}
