<?php namespace Admin\Controllers;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class PmdWaiterDashboardV149
{
    public function data()
    {
        return $this->json($this->payload(false));
    }

    public function audit()
    {
        return $this->json($this->payload(true));
    }

    public function updateLayout()
    {
        try {
            if (!Schema::hasTable('tables')) return $this->json(['ok' => false, 'message' => 'tables table missing'], 404);
            $cols = Schema::getColumnListing('tables');
            $pk = $this->firstCol($cols, ['table_id', 'id']);
            if (!$pk) return $this->json(['ok' => false, 'message' => 'table primary key not found'], 500);

            $id = (int)$this->input('table_id', 0);
            if (!$id) return $this->json(['ok' => false, 'message' => 'table_id missing'], 422);

            $allowed = ['floor_x','floor_y','floor_width','floor_height','floor_name','floor_sort','floor_shape','table_section','table_zone','visible_on_floor_plan'];
            $updates = [];
            foreach ($allowed as $col) {
                if (!in_array($col, $cols, true)) continue;
                $v = $this->input($col, null);
                if ($v === null || $v === '') continue;
                if (in_array($col, ['floor_x','floor_y','floor_width','floor_height'], true)) $v = (float)$v;
                if (in_array($col, ['floor_sort','visible_on_floor_plan'], true)) $v = (int)$v;
                $updates[$col] = $v;
            }
            if (in_array('updated_at', $cols, true)) $updates['updated_at'] = date('Y-m-d H:i:s');
            if (!$updates) return $this->json(['ok' => false, 'message' => 'no valid fields received'], 422);

            DB::table('tables')->where($pk, $id)->update($updates);
            return $this->json(['ok' => true, 'version' => 'v149', 'table_id' => $id, 'updates' => $updates]);
        } catch (\Throwable $e) {
            return $this->json(['ok' => false, 'version' => 'v149', 'message' => $e->getMessage()], 500);
        }
    }

    public function merge()
    {
        try {
            $primary = (int)$this->input('primary_table_id', 0);
            $secondary = (int)$this->input('secondary_table_id', 0);
            $apply = (string)$this->input('apply', '0') === '1';
            if (!$primary || !$secondary || $primary === $secondary) {
                return $this->json(['ok' => false, 'message' => 'choose two different tables'], 422);
            }
            $this->ensureMergeTable();
            if (!$apply) {
                return $this->json(['ok' => true, 'version' => 'v149', 'dry_run' => true, 'primary_table_id' => $primary, 'secondary_table_id' => $secondary]);
            }
            DB::table('pmd_table_merges')->insert([
                'primary_table_id' => $primary,
                'secondary_table_id' => $secondary,
                'status' => 'active',
                'staff_id' => (int)($this->userInfo()['staff_id'] ?? 0) ?: null,
                'notes' => 'Created from waiter dashboard v149',
                'created_at' => date('Y-m-d H:i:s'),
                'updated_at' => date('Y-m-d H:i:s'),
            ]);
            return $this->json(['ok' => true, 'version' => 'v149', 'message' => 'merge registered', 'primary_table_id' => $primary, 'secondary_table_id' => $secondary]);
        } catch (\Throwable $e) {
            return $this->json(['ok' => false, 'version' => 'v149', 'message' => $e->getMessage()], 500);
        }
    }

    public function addItem()
    {
        if (class_exists('Admin\\Controllers\\PmdWaiterMobileActionV107')) {
            $ctrl = new \Admin\Controllers\PmdWaiterMobileActionV107;
            if (method_exists($ctrl, 'addItem')) return $ctrl->addItem();
        }
        return $this->json(['ok' => false, 'version' => 'v149', 'message' => 'addItem backend bridge not available; use /admin/orders/create'], 501);
    }

    protected function payload($audit = false)
    {
        try {
            $user = $this->userInfo();
            $tables = $this->loadTables($user);
            $metrics = $this->loadTableMetrics($tables);
            $reservations = $this->loadReservations($tables);
            $menus = $this->loadMenus();
            $orders = $this->loadOrderCards($tables);

            $rows = [];
            foreach ($tables as $i => $t) {
                $id = (int)$t['id'];
                $m = $metrics[$id] ?? ['open_orders' => 0, 'ready' => 0, 'kitchen' => 0, 'due' => 0, 'paid_partial' => 0, 'latest_status' => ''];
                $r = $reservations[$id] ?? ['today' => 0, 'upcoming' => 0];
                $status = $this->statusFor($t, $m, $r, $user);
                $t['status'] = $status['key'];
                $t['status_label'] = $status['label'];
                $t['status_color'] = $status['color'];
                $t['open_orders'] = (int)$m['open_orders'];
                $t['ready'] = (int)$m['ready'];
                $t['kitchen'] = (int)$m['kitchen'];
                $t['due'] = (float)$m['due'];
                $t['due_label'] = $this->money((float)$m['due']);
                $t['paid_partial'] = (int)$m['paid_partial'];
                $t['latest_order_status'] = (string)$m['latest_status'];
                $t['reservations_today'] = (int)$r['today'];
                $t['reservations_upcoming'] = (int)$r['upcoming'];
                $t['edit_url'] = '/admin/tables/edit/'.$id;
                $t['order_url'] = '/admin/orders/create?table_id='.$id;
                $t['orders_url'] = '/admin/orders?table_id='.$id;
                $t['payment_url'] = '/admin/payments?table_id='.$id;
                $rows[] = $t;
            }

            $floorMap = [];
            foreach ($rows as $t) {
                $floorLabel = (string)($t['floor_name'] ?? 'Main Floor');
                if (!isset($floorMap[$floorLabel])) {
                    $floorMap[$floorLabel] = ['id' => $this->slug($floorLabel), 'label' => $floorLabel, 'tables' => 0, 'sort' => (int)($t['floor_sort'] ?? 0)];
                }
                $floorMap[$floorLabel]['tables']++;
            }
            $floors = array_values($floorMap);
            usort($floors, fn($a, $b) => ($a['sort'] <=> $b['sort']) ?: strcmp($a['label'], $b['label']));

            $mine = array_values(array_filter($rows, fn($t) => !empty($t['assigned'])));
            $base = $user['is_waiter'] ? $mine : $rows;
            if ($user['is_waiter'] && count($mine) === 0) $base = [];

            $kpis = [
                'my_tables' => count($mine),
                'floor_tables' => count($rows),
                'open_orders' => array_sum(array_map(fn($t) => (int)$t['open_orders'], $base ?: $rows)),
                'ready' => array_sum(array_map(fn($t) => (int)$t['ready'], $base ?: $rows)),
                'reservations' => array_sum(array_map(fn($t) => (int)$t['reservations_today'], $base ?: $rows)),
                'open_bills' => count(array_filter($base ?: $rows, fn($t) => (float)$t['due'] > 0)),
                'due' => array_sum(array_map(fn($t) => (float)$t['due'], $base ?: $rows)),
                'calls_notes' => 0,
            ];

            $payload = [
                'ok' => true,
                'version' => '20260624-waiter-dashboard-rebuild',
                'generated_at' => date('c'),
                'role' => $user['is_waiter'] ? 'waiter' : ($user['is_kds'] ? 'kds' : $user['role']),
                'user' => $user,
                'kpis' => $kpis,
                'tables' => $rows,
                'orders' => $orders,
                'floors' => $floors,
                'assignments' => ['source' => 'pmd_waiter_table_assignments when present; managers/admins see all tables'],
                'warnings' => [],
                'my_tables' => $mine,
                'menu_items' => $menus,
                'current_orders' => $orders,
                'status_legend' => [
                    ['key' => 'free', 'label' => 'Free', 'color' => '#27c774'],
                    ['key' => 'reserved', 'label' => 'Reserved', 'color' => '#8b5cf6'],
                    ['key' => 'active', 'label' => 'Active order', 'color' => '#2563eb'],
                    ['key' => 'kitchen', 'label' => 'Sent to kitchen', 'color' => '#f59e0b'],
                    ['key' => 'ready', 'label' => 'Ready', 'color' => '#7c3aed'],
                    ['key' => 'payment', 'label' => 'Payment due', 'color' => '#ef4444'],
                    ['key' => 'paid', 'label' => 'Paid / closing', 'color' => '#64748b'],
                    ['key' => 'unassigned', 'label' => 'Not my table', 'color' => '#cbd5e1'],
                ],
                'endpoints' => [
                    'data' => '/admin/pmd-waiter-dashboard-data',
                    'audit' => '/admin/pmd-waiter-dashboard-audit',
                    'layout' => '/admin/pmd-waiter-dashboard-v149-update-layout',
                    'merge' => '/admin/pmd-waiter-dashboard-v149-merge',
                    'add_item' => '/admin/pmd-waiter-dashboard-v149-add-item',
                ],
            ];

            if ($audit) {
                $payload['audit'] = [
                    'tables_schema' => Schema::hasTable('tables') ? Schema::getColumnListing('tables') : [],
                    'orders_schema' => Schema::hasTable('orders') ? Schema::getColumnListing('orders') : [],
                    'reservations_schema' => Schema::hasTable('reservations') ? Schema::getColumnListing('reservations') : [],
                    'assignment_table_exists' => Schema::hasTable('pmd_waiter_table_assignments'),
                    'merge_table_exists' => Schema::hasTable('pmd_table_merges'),
                    'returned_tables' => count($rows),
                    'returned_my_tables' => count($mine),
                    'returned_orders' => count($orders),
                    'returned_menu_items' => count($menus),
                ];
            }

            return $payload;
        } catch (\Throwable $e) {
            return ['ok' => false, 'version' => '20260624-waiter-dashboard-rebuild', 'message' => $e->getMessage(), 'trace' => substr($e->getTraceAsString(), 0, 1200)];
        }
    }

    protected function loadTables($user)
    {
        if (!Schema::hasTable('tables')) return [];
        $cols = Schema::getColumnListing('tables');
        $pk = $this->firstCol($cols, ['table_id', 'id']);
        if (!$pk) return [];

        $q = DB::table('tables');
        if (in_array('deleted_at', $cols, true)) $q->whereNull('deleted_at');
        if (in_array('table_status', $cols, true)) $q->where('table_status', 1);
        if (in_array('visible_on_floor_plan', $cols, true)) {
            $q->where(function($qq) { $qq->whereNull('visible_on_floor_plan')->orWhere('visible_on_floor_plan', '<>', 0); });
        }
        if (in_array('priority', $cols, true)) $q->orderBy('priority');
        if (in_array('table_no', $cols, true)) $q->orderBy('table_no');
        $raw = $q->get();

        $assignedIds = $this->assignedTableIds($user);
        $hasAssignments = count($assignedIds) > 0;
        $out = [];
        foreach ($raw as $i => $r) {
            $a = (array)$r;
            $name = trim((string)($a['table_name'] ?? $a['pos_table_label'] ?? $a['table_no'] ?? $a[$pk]));
            $sys = strtolower($name);
            $qr = strtolower(trim((string)($a['qr_code'] ?? '')));
            if (in_array($sys, ['cashier', 'delivery'], true) || in_array($qr, ['cashier', 'delivery'], true)) continue;

            $id = (int)$a[$pk];
            $number = trim((string)($a['table_no'] ?? $a['pos_table_label'] ?? $id));
            $label = $name !== '' ? $name : 'Table '.$number;
            if (ctype_digit($label)) $label = 'Table '.$label;

            $cap = (int)($a['capacity'] ?? $a['table_capacity'] ?? $a['preferred_capacity'] ?? $a['max_capacity'] ?? $a['min_capacity'] ?? 4);
            if ($cap <= 0) $cap = 4;
            $extra = (int)($a['extra_capacity'] ?? 0);
            $w = (float)($a['floor_width'] ?? 0);
            $h = (float)($a['floor_height'] ?? 0);
            if ($w <= 0) $w = $cap <= 2 ? 130 : ($cap <= 4 ? 170 : ($cap <= 6 ? 220 : 286));
            if ($h <= 0) $h = $cap <= 2 ? 82 : ($cap <= 4 ? 88 : 96);

            $pos = $this->autoPosition($i);
            $floor = $this->cleanName($a['floor_name'] ?? $a['floor'] ?? $a['table_section'] ?? 'Main') ?: 'Main';
            $assigned = !$user['is_waiter'] ? true : ($hasAssignments ? in_array($id, $assignedIds, true) : true);

            $features = $this->decodeFeatures($a['table_features'] ?? null);
            foreach (['near_window','near_heater','quiet_area','outdoor','vip','accessible'] as $flag) {
                if (array_key_exists($flag, $a) && !empty($a[$flag])) $features[] = $flag;
            }

            $out[] = [
                'id' => $id,
                'table_id' => $id,
                'number' => $number,
                'label' => $label,
                'name' => $label,
                'capacity' => $cap,
                'extra_capacity' => max(0, $extra),
                'capacity_label' => $cap.' seats',
                'floor' => $floor,
                'floor_name' => $floor,
                'floor_sort' => (int)($a['floor_sort'] ?? 0),
                'x' => (float)($a['floor_x'] ?? $pos['x']),
                'y' => (float)($a['floor_y'] ?? $pos['y']),
                'w' => $w,
                'h' => $h,
                'shape' => (string)($a['floor_shape'] ?? ($cap >= 6 ? 'rectangle' : 'roundrect')),
                'section' => $this->cleanName($a['table_section'] ?? $a['table_zone'] ?? 'main') ?: 'main',
                'zone' => $this->cleanName($a['table_zone'] ?? ''),
                'features' => array_values(array_unique(array_filter($features))),
                'notes' => (string)($a['floor_notes'] ?? ''),
                'reservable' => array_key_exists('reservable', $a) ? (bool)$a['reservable'] : true,
                'assigned' => $assigned,
                'assignment_source' => $hasAssignments ? 'pmd_waiter_table_assignments' : 'fallback_all_tables',
            ];
        }
        return array_values($out);
    }

    protected function loadMenus()
    {
        $table = Schema::hasTable('menus') ? 'menus' : (Schema::hasTable('menu_items') ? 'menu_items' : null);
        if (!$table) return [];
        $cols = Schema::getColumnListing($table);
        $pk = $this->firstCol($cols, ['menu_id', 'id']);
        $nameCol = $this->firstCol($cols, ['menu_name', 'name', 'title']);
        $priceCol = $this->firstCol($cols, ['menu_price', 'price', 'cost']);
        $q = DB::table($table);
        if (in_array('menu_status', $cols, true)) $q->where('menu_status', 1);
        if (in_array('status', $cols, true)) $q->where(function($qq){ $qq->where('status', 1)->orWhere('status', 'enabled')->orWhere('status', 'active'); });
        return $q->limit(250)->get()->map(function($r) use ($pk, $nameCol, $priceCol) {
            $a = (array)$r;
            return ['id' => (int)($a[$pk] ?? 0), 'menu_id' => (int)($a[$pk] ?? 0), 'name' => (string)($a[$nameCol] ?? 'Item'), 'price' => (float)($a[$priceCol] ?? 0)];
        })->values()->all();
    }

    protected function loadTableMetrics($tables)
    {
        $metrics = [];
        foreach ($tables as $t) $metrics[(int)$t['id']] = ['open_orders' => 0, 'ready' => 0, 'kitchen' => 0, 'due' => 0, 'paid_partial' => 0, 'latest_status' => ''];
        if (!Schema::hasTable('orders') || !$tables) return $metrics;

        $cols = Schema::getColumnListing('orders');
        $pk = $this->firstCol($cols, ['order_id', 'id']);
        $tableCol = $this->firstCol($cols, ['table_id', 'dining_table_id', 'location_table_id', 'table_no', 'table_name']);
        if (!$tableCol) return $metrics;
        $statusCol = $this->firstCol($cols, ['status', 'order_status', 'status_name', 'status_id']);
        $payCol = $this->firstCol($cols, ['payment_status', 'pay_status', 'is_paid']);
        $totalCol = $this->firstCol($cols, ['order_total', 'total', 'total_amount', 'grand_total']);
        $dateCol = $this->firstCol($cols, ['created_at', 'order_date', 'updated_at']);

        $idMap = [];
        foreach ($tables as $t) {
            $idMap[(string)$t['id']] = (int)$t['id'];
            $idMap[(string)$t['number']] = (int)$t['id'];
            $idMap[(string)$t['label']] = (int)$t['id'];
        }

        $q = DB::table('orders');
        if (in_array('deleted_at', $cols, true)) $q->whereNull('deleted_at');
        if ($dateCol) $q->orderBy($dateCol, 'desc');
        elseif ($pk) $q->orderBy($pk, 'desc');
        $orders = $q->limit(800)->get();

        foreach ($orders as $o) {
            $a = (array)$o;
            $rawTable = (string)($a[$tableCol] ?? '');
            $tid = $idMap[$rawTable] ?? null;
            if (!$tid) continue;
            $statusRaw = strtolower(trim((string)($statusCol ? ($a[$statusCol] ?? '') : '')));
            $payRaw = strtolower(trim((string)($payCol ? ($a[$payCol] ?? '') : '')));
            $total = (float)($totalCol ? ($a[$totalCol] ?? 0) : 0);
            $closed = preg_match('/cancel|void|complete|completed|closed|finished|erledigt/i', $statusRaw);
            $paid = preg_match('/paid|complete|completed/i', $payRaw) || in_array($payRaw, ['1', 'yes', 'true'], true) || preg_match('/paid/i', $statusRaw);
            if ($closed && $paid) continue;
            $metrics[$tid]['latest_status'] = $metrics[$tid]['latest_status'] ?: $statusRaw;
            if (!$closed) $metrics[$tid]['open_orders']++;
            if (preg_match('/ready|serve|served/i', $statusRaw)) $metrics[$tid]['ready']++;
            if (preg_match('/kitchen|prepar|sent|cooking/i', $statusRaw)) $metrics[$tid]['kitchen']++;
            if (!$paid && $total > 0) $metrics[$tid]['due'] += $total;
            if (preg_match('/partial/i', $payRaw.$statusRaw)) $metrics[$tid]['paid_partial']++;
        }
        return $metrics;
    }

    protected function loadReservations($tables)
    {
        $out = [];
        foreach ($tables as $t) $out[(int)$t['id']] = ['today' => 0, 'upcoming' => 0];
        if (!Schema::hasTable('reservations')) return $out;
        $cols = Schema::getColumnListing('reservations');
        $tableCol = $this->firstCol($cols, ['table_id', 'dining_table_id', 'location_table_id']);
        if (!$tableCol) return $out;
        $dateCol = $this->firstCol($cols, ['reserve_date', 'reservation_date', 'date', 'created_at']);
        $today = date('Y-m-d');
        $rows = DB::table('reservations')->limit(500)->get();
        foreach ($rows as $r) {
            $a = (array)$r;
            $tid = (int)($a[$tableCol] ?? 0);
            if (!$tid || !isset($out[$tid])) continue;
            $d = $dateCol ? substr((string)($a[$dateCol] ?? ''), 0, 10) : '';
            if ($d === $today) $out[$tid]['today']++;
            elseif ($d > $today) $out[$tid]['upcoming']++;
        }
        return $out;
    }

    protected function loadOrderCards($tables)
    {
        if (!Schema::hasTable('orders') || !$tables) return [];
        $cols = Schema::getColumnListing('orders');
        $pk = $this->firstCol($cols, ['order_id', 'id']);
        $tableCol = $this->firstCol($cols, ['table_id', 'dining_table_id', 'location_table_id', 'table_no', 'table_name']);
        if (!$pk || !$tableCol) return [];
        $statusCol = $this->firstCol($cols, ['status', 'order_status', 'status_name', 'status_id']);
        $totalCol = $this->firstCol($cols, ['order_total', 'total', 'total_amount', 'grand_total']);
        $dateCol = $this->firstCol($cols, ['created_at', 'order_date', 'updated_at']);
        $idMap = [];
        foreach ($tables as $t) { $idMap[(string)$t['id']] = $t; $idMap[(string)$t['number']] = $t; $idMap[(string)$t['label']] = $t; }
        $q = DB::table('orders');
        if (in_array('deleted_at', $cols, true)) $q->whereNull('deleted_at');
        if ($dateCol) $q->orderBy($dateCol, 'desc');
        else $q->orderBy($pk, 'desc');
        $rows = [];
        foreach ($q->limit(80)->get() as $o) {
            $a = (array)$o;
            $t = $idMap[(string)($a[$tableCol] ?? '')] ?? null;
            if (!$t) continue;
            $st = strtolower((string)($statusCol ? ($a[$statusCol] ?? '') : ''));
            if (preg_match('/cancel|void|complete|completed|closed|finished|erledigt/i', $st)) continue;
            $oid = (int)($a[$pk] ?? 0);
            $rows[] = [
                'id' => $oid,
                'order_id' => $oid,
                'table_id' => (int)$t['id'],
                'table_label' => $t['label'],
                'status' => $st ?: 'open',
                'total' => (float)($totalCol ? ($a[$totalCol] ?? 0) : 0),
                'total_label' => $this->money((float)($totalCol ? ($a[$totalCol] ?? 0) : 0)),
                'edit_url' => '/admin/orders/edit/'.$oid,
                'payment_url' => '/admin/payments?order_id='.$oid,
                'created_at' => (string)($dateCol ? ($a[$dateCol] ?? '') : ''),
            ];
            if (count($rows) >= 24) break;
        }
        return $rows;
    }

    protected function statusFor($t, $m, $r, $user)
    {
        if ($user['is_waiter'] && empty($t['assigned'])) return ['key' => 'unassigned', 'label' => 'Not my table', 'color' => '#cbd5e1'];
        if ((int)$m['ready'] > 0) return ['key' => 'ready', 'label' => 'Ready', 'color' => '#7c3aed'];
        if ((int)$m['kitchen'] > 0) return ['key' => 'kitchen', 'label' => 'Sent to kitchen', 'color' => '#f59e0b'];
        if ((int)$m['open_orders'] > 0) return ['key' => 'active', 'label' => ((float)$m['due'] > 0 ? 'Active order · payment due' : 'Active order'), 'color' => '#2563eb'];
        if ((float)$m['due'] > 0) return ['key' => 'payment', 'label' => 'Payment due', 'color' => '#2563eb'];
        if ((int)$r['today'] > 0) return ['key' => 'reserved', 'label' => 'Reserved', 'color' => '#8b5cf6'];
        return ['key' => 'free', 'label' => 'Free', 'color' => '#27c774'];
    }

    protected function assignedTableIds($user)
    {
        if (!Schema::hasTable('pmd_waiter_table_assignments')) return [];
        $staff = (int)($user['staff_id'] ?? 0);
        if (!$staff) return [];
        try {
            return array_values(array_unique(array_map('intval', DB::table('pmd_waiter_table_assignments')->where('staff_id', $staff)->where(function($q){ $q->where('is_active', 1)->orWhereNull('is_active'); })->pluck('table_id')->all())));
        } catch (\Throwable $e) { return []; }
    }

    protected function ensureMergeTable()
    {
        if (Schema::hasTable('pmd_table_merges')) return;
        Schema::create('pmd_table_merges', function($t) {
            $t->increments('id');
            $t->integer('primary_table_id')->index();
            $t->integer('secondary_table_id')->index();
            $t->string('status')->default('active')->index();
            $t->integer('staff_id')->nullable()->index();
            $t->text('notes')->nullable();
            $t->timestamps();
        });
    }

    protected function userInfo()
    {
        $user = null;
        try { if (class_exists('AdminAuth')) $user = \AdminAuth::getUser(); } catch (\Throwable $e) {}
        try { if (!$user && function_exists('auth')) $user = auth()->user(); } catch (\Throwable $e) {}
        $id = $user->staff_id ?? $user->id ?? null;
        $role = '';
        foreach (['role','staff_role','group'] as $rel) {
            try {
                if ($user && isset($user->$rel)) {
                    $r = $user->$rel;
                    $role = $r->code ?? $r->name ?? $r->staff_role_name ?? $role;
                }
            } catch (\Throwable $e) {}
        }
        $name = (string)($user->name ?? $user->staff_name ?? $user->first_name ?? $user->username ?? '');
        $email = (string)($user->email ?? '');
        $slug = strtolower(trim($role.' '.$name.' '.$email.' '.($user->username ?? '')));
        return [
            'id' => $user->id ?? null,
            'staff_id' => $id,
            'name' => $name,
            'email' => $email,
            'role' => trim($role) ?: 'unknown',
            'role_slug' => $slug,
            'is_waiter' => (bool)preg_match('/waiter|server|service/', $slug),
            'is_kds' => (bool)preg_match('/kds|kitchen/', $slug),
        ];
    }

    protected function autoPosition($i)
    {
        return ['x' => 48 + (($i % 4) * 230), 'y' => 54 + (intdiv($i, 4) * 170)];
    }

    protected function decodeFeatures($v)
    {
        if (is_array($v)) return $v;
        if (!$v) return [];
        $s = trim((string)$v);
        $j = json_decode($s, true);
        if (is_array($j)) return $j;
        return array_map('trim', preg_split('/[,|]/', $s));
    }

    protected function slug($v)
    {
        $s = strtolower(preg_replace('/[^a-z0-9]+/i', '-', (string)$v));
        return trim($s, '-') ?: 'main-floor';
    }

    protected function cleanName($v)
    {
        if (is_array($v)) return trim((string)($v['name'] ?? $v['label'] ?? reset($v) ?? ''));
        if (is_object($v)) return trim((string)($v->name ?? $v->label ?? ''));
        $s = trim((string)$v);
        if ($s === '' || $s === '[object Object]') return '';
        return $s;
    }

    protected function firstCol($cols, $names)
    {
        foreach ($names as $n) if (in_array($n, $cols, true)) return $n;
        return null;
    }

    protected function input($key, $default = null)
    {
        try { if (function_exists('request')) return request()->input($key, $default); } catch (\Throwable $e) {}
        return $_POST[$key] ?? $_GET[$key] ?? $default;
    }

    protected function money($v)
    {
        return '€'.number_format((float)$v, 2);
    }

    protected function json($payload, $status = 200)
    {
        if (function_exists('response')) return response()->json($payload, $status);
        http_response_code($status); header('Content-Type: application/json'); echo json_encode($payload); exit;
    }
}
