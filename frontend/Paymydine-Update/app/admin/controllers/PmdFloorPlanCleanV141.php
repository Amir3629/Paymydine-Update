<?php namespace Admin\Controllers;

use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class PmdFloorPlanCleanV141
{
    public function data()
    {
        return $this->json($this->payload(false));
    }

    public function audit()
    {
        return $this->json($this->payload(true));
    }

    public function update()
    {
        try {
            $tableId = (int)$this->input('table_id', 0);
            if (!$tableId || !Schema::hasTable('tables')) {
                return $this->json(['ok' => false, 'message' => 'Missing table_id']);
            }

            $cols = Schema::getColumnListing('tables');
            $has = function ($c) use ($cols) {
                return in_array($c, $cols, true);
            };

            $u = [];

            foreach (['floor_x', 'floor_y', 'floor_width', 'floor_height'] as $key) {
                if ($has($key) && $this->input($key, null) !== null) {
                    $u[$key] = max(0, min(2000, (float)$this->input($key)));
                }
            }

            foreach (['floor_name', 'floor_shape', 'table_section', 'table_zone'] as $key) {
                if ($has($key) && $this->input($key, null) !== null) {
                    $u[$key] = trim((string)$this->input($key));
                }
            }

            if ($has('table_features') && $this->input('table_features', null) !== null) {
                $u['table_features'] = trim((string)$this->input('table_features'));
            }

            if (!$u) {
                return $this->json(['ok' => false, 'message' => 'Nothing to update']);
            }

            if ($has('updated_at')) {
                $u['updated_at'] = date('Y-m-d H:i:s');
            }

            DB::table('tables')->where('table_id', $tableId)->update($u);

            return $this->json([
                'ok' => true,
                'version' => 'v141-real-icons-multifloor',
                'table_id' => $tableId,
                'updated' => $u,
            ]);
        } catch (\Throwable $e) {
            return $this->json([
                'ok' => false,
                'version' => 'v141-real-icons-multifloor',
                'message' => $e->getMessage(),
            ]);
        }
    }

    protected function payload($audit = false)
    {
        try {
            $tables = $this->tables();
            $menus = $this->menus();

            $floorMap = [];
            foreach ($tables as $t) {
                $floor = $t['floor_name'] ?: 'Main Floor';
                if (!isset($floorMap[$floor])) {
                    $floorMap[$floor] = [
                        'id' => $this->slug($floor),
                        'label' => $floor,
                        'sort' => (int)($t['floor_sort'] ?? 1),
                        'width' => 1000,
                        'height' => 520,
                        'tables' => 0,
                    ];
                }
                $floorMap[$floor]['tables']++;
            }

            $floors = array_values($floorMap);
            usort($floors, function ($a, $b) {
                return ($a['sort'] <=> $b['sort']) ?: strcmp($a['label'], $b['label']);
            });

            $kpis = [
                'tables' => count($tables),
                'ready' => array_sum(array_column($tables, 'ready')),
                'active_orders' => array_sum(array_column($tables, 'open_orders')),
                'attention' => array_sum(array_column($tables, 'attention')),
                'checks_due' => array_sum(array_column($tables, 'due')),
            ];

            return [
                'ok' => true,
                'version' => 'v141-real-icons-multifloor',
                'generated_at' => date('c'),
                'role' => $this->role(),
                'floors' => $floors,
                'tables' => $tables,
                'floor_tables' => $tables,
                'menu_items' => $menus,
                'menus' => $menus,
                'kpis' => $kpis,
                'source' => [
                    'tables' => 'tables',
                    'menus' => $this->menuSource(),
                    'layout' => 'tables.floor_* columns',
                    'features' => 'tables.table_features / table_section / table_zone',
                ],
                'audit' => $audit ? [
                    'schema' => [
                        'tables_columns' => Schema::hasTable('tables') ? Schema::getColumnListing('tables') : [],
                    ],
                    'counts' => [
                        'tables' => count($tables),
                        'menus' => count($menus),
                        'floors' => count($floors),
                    ],
                    'routes' => [
                        'data' => '/admin/pmd-floor-plan-data',
                        'audit' => '/admin/pmd-floor-plan-audit',
                        'update' => '/admin/pmd-floor-plan-update',
                    ],
                ] : null,
            ];
        } catch (\Throwable $e) {
            return [
                'ok' => false,
                'version' => 'v141-real-icons-multifloor',
                'message' => $e->getMessage(),
            ];
        }
    }

    protected function tables()
    {
        if (!Schema::hasTable('tables')) {
            return [];
        }

        $cols = Schema::getColumnListing('tables');
        $has = function ($c) use ($cols) {
            return in_array($c, $cols, true);
        };

        $query = DB::table('tables');

        if ($has('table_status')) {
            $query->where('table_status', 1);
        }

        if ($has('visible_on_floor_plan')) {
            $query->where(function ($q) {
                $q->whereNull('visible_on_floor_plan')->orWhere('visible_on_floor_plan', 1);
            });
        }

        $rows = $query->get()->toArray();

        $out = [];
        $i = 0;

        foreach ($rows as $row) {
            $a = (array)$row;

            $id = (int)($a['table_id'] ?? $a['id'] ?? 0);
            if (!$id) continue;

            $rawName = trim((string)($a['table_name'] ?? $a['pos_table_label'] ?? $a['name'] ?? ''));
            $qr = trim((string)($a['qr_code'] ?? ''));
            $systemName = strtolower($rawName ?: $qr);

            if (in_array($systemName, ['cashier', 'delivery'], true)) {
                continue;
            }

            $number = trim((string)($a['table_no'] ?? $a['number'] ?? $id));
            $label = $rawName ?: ('Table '.$number);

            if (preg_match('/^table\s+/i', $label) && $number) {
                $label = 'Table '.$number;
            }

            $floorName = trim((string)($a['floor_name'] ?? $a['table_floor'] ?? ''));
            if ($floorName === '') $floorName = 'Main Floor';

            $floorSort = (int)($a['floor_sort'] ?? 1);
            if ($floorSort <= 0) $floorSort = 1;

            $section = trim((string)($a['table_section'] ?? $a['section'] ?? 'main'));
            if ($section === '') $section = 'main';

            $zone = trim((string)($a['table_zone'] ?? ''));

            $capacity = (int)($a['capacity'] ?? $a['table_capacity'] ?? $a['max_capacity'] ?? 2);
            if ($capacity <= 0) $capacity = 2;

            $min = (int)($a['min_capacity'] ?? $capacity);
            $max = (int)($a['max_capacity'] ?? $capacity);
            $extra = (int)($a['extra_capacity'] ?? 0);

            if ($min <= 0) $min = $capacity;
            if ($max <= 0) $max = $capacity;

            $shape = strtolower(trim((string)($a['floor_shape'] ?? $a['table_shape'] ?? 'rectangle')));
            $allowed = ['rectangle', 'round', 'square', 'booth', 'bar', 'counter'];
            if (!in_array($shape, $allowed, true)) $shape = 'rectangle';

            $features = $this->features($a, $section, $zone);

            $w = (float)($a['floor_width'] ?? 150);
            $h = (float)($a['floor_height'] ?? 76);
            if ($w < 80) $w = 150;
            if ($h < 55) $h = 76;

            $x = (float)($a['floor_x'] ?? (60 + (($i % 4) * 220)));
            $y = (float)($a['floor_y'] ?? (60 + (floor($i / 4) * 135)));

            $x = max(10, min(950, $x));
            $y = max(10, min(470, $y));

            $out[] = [
                'id' => $id,
                'table_id' => $id,
                'number' => $number,
                'table_no' => $number,
                'name' => $label,
                'label' => $label,
                'status' => 'free',
                'status_label' => 'FREE',
                'floor_name' => $floorName,
                'floor_id' => $this->slug($floorName),
                'floor_sort' => $floorSort,
                'section' => $section,
                'zone' => $zone,
                'shape' => $shape,
                'features' => $features,
                'capacity' => $capacity,
                'min_capacity' => $min,
                'max_capacity' => $max,
                'extra_capacity' => $extra,
                'capacity_label' => $this->capacityLabel($min, $max, $extra),
                'x' => $x,
                'y' => $y,
                'width' => $w,
                'height' => $h,
                'orders' => 0,
                'open_orders' => 0,
                'ready' => 0,
                'attention' => 0,
                'due' => 0,
            ];

            $i++;
        }

        usort($out, function ($a, $b) {
            return ($a['floor_sort'] <=> $b['floor_sort'])
                ?: strcmp($a['floor_name'], $b['floor_name'])
                ?: ((int)$a['number'] <=> (int)$b['number']);
        });

        return $out;
    }

    protected function menus()
    {
        $table = $this->menuSource();
        if (!$table || !Schema::hasTable($table)) return [];

        $cols = Schema::getColumnListing($table);
        $has = function ($c) use ($cols) {
            return in_array($c, $cols, true);
        };

        $pk = $has('menu_id') ? 'menu_id' : ($has('id') ? 'id' : null);
        if (!$pk) return [];

        $rows = DB::table($table)->limit(80)->get()->toArray();

        $out = [];
        foreach ($rows as $row) {
            $a = (array)$row;
            $id = (int)($a[$pk] ?? 0);
            if (!$id) continue;

            $name = trim((string)($a['menu_name'] ?? $a['name'] ?? $a['title'] ?? 'Item '.$id));
            $price = (float)($a['menu_price'] ?? $a['price'] ?? $a['cost'] ?? 0);

            $out[] = [
                'id' => $id,
                'menu_id' => $id,
                'name' => $name,
                'menu_name' => $name,
                'title' => $name,
                'price' => $price,
            ];
        }

        return $out;
    }

    protected function menuSource()
    {
        foreach (['menus', 'menu_items', 'ti_menus', 'ti_menu_items'] as $t) {
            if (Schema::hasTable($t)) return $t;
        }
        return null;
    }

    protected function features($a, $section, $zone)
    {
        $features = [];

        $raw = trim((string)($a['table_features'] ?? ''));
        if ($raw !== '') {
            $json = json_decode($raw, true);
            if (is_array($json)) {
                foreach ($json as $k => $v) {
                    if (is_numeric($k) && $v) $features[] = strtolower(trim((string)$v));
                    elseif ($v) $features[] = strtolower(trim((string)$k));
                }
            } else {
                foreach (preg_split('/[,|;]/', $raw) as $part) {
                    $part = strtolower(trim($part));
                    if ($part !== '') $features[] = $part;
                }
            }
        }

        $hay = strtolower($section.' '.$zone.' '.($a['table_name'] ?? '').' '.($a['pos_table_label'] ?? ''));

        $map = [
            'window' => ['window', 'windows', 'پنجره'],
            'heater' => ['heater', 'heat', 'گرما', 'بخاری'],
            'quiet' => ['quiet', 'آرام'],
            'vip' => ['vip'],
            'outdoor' => ['outdoor', 'terrace', 'garden', 'بیرون', 'تراس'],
            'smoking' => ['smoking', 'smoke'],
            'accessible' => ['accessible', 'wheelchair'],
        ];

        foreach ($map as $tag => $words) {
            foreach ($words as $w) {
                if (strpos($hay, $w) !== false) {
                    $features[] = $tag;
                    break;
                }
            }
        }

        $features = array_values(array_unique(array_filter($features)));
        return $features;
    }

    protected function capacityLabel($min, $max, $extra)
    {
        $label = $min === $max ? 'cap '.$max : 'min '.$min.' / max '.$max;
        if ($extra > 0) $label .= ' +'.$extra;
        return $label;
    }

    protected function slug($v)
    {
        $v = strtolower(trim((string)$v));
        $v = preg_replace('/[^a-z0-9]+/', '-', $v);
        $v = trim($v, '-');
        return $v ?: 'main-floor';
    }

    protected function role()
    {
        try {
            if (class_exists('\\AdminAuth') && ($user = \AdminAuth::getUser())) {
                return $user->role->code ?? $user->role->name ?? 'admin';
            }
        } catch (\Throwable $e) {}
        return 'admin';
    }

    protected function input($key, $default = null)
    {
        if (function_exists('request')) {
            $v = request()->input($key, $default);
            return $v === null ? $default : $v;
        }
        return $_REQUEST[$key] ?? $default;
    }

    protected function json($payload)
    {
        if (function_exists('response')) {
            return response()->json($payload);
        }

        header('Content-Type: application/json');
        echo json_encode($payload);
        exit;
    }
}
