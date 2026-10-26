<?php
// R45 actual service behavior, independent of the live database.
// Run on the staged VPS copy: php scripts/test-pmd-floor-safety-r45.php ROOT
namespace Illuminate\Support\Facades {
    class Schema {
        public static $columns = [
            'tables' => ['table_id', 'operational_status', 'table_status', 'table_name'],
            'orders' => ['table_id', 'location_id', 'settlement_status',
                         'payment_status', 'order_total', 'settled_amount', 'status'],
        ];
        public static function hasTable($table) { return isset(self::$columns[$table]); }
        public static function hasColumn($table, $column) {
            return in_array($column, self::$columns[$table] ?? [], true);
        }
        public static function getColumnListing($table) { return self::$columns[$table] ?? []; }
    }
    class DB {
        public static $rows = ['tables' => [], 'orders' => []];
        public static function table($table) { return new FakeBuilder($table); }
    }
    class FakeBuilder {
        private $table;
        private $conditions = [];
        public function __construct($table) { $this->table = $table; }
        public function where($key, $operator, $value = null) {
            if ($value === null) { $value = $operator; $operator = '='; }
            $this->conditions[] = [$key, $operator, $value]; return $this;
        }
        public function whereNull($key) { $this->conditions[] = [$key, 'NULL', null]; return $this; }
        public function select($columns) { return $this; }
        public function cursor() { foreach ($this->selected() as $row) yield (object)$row; }
        public function first() {
            $rows = $this->selected(); return $rows ? (object)$rows[0] : null;
        }
        private function selected() {
            $rows = [];
            foreach (DB::$rows[$this->table] ?? [] as $row) {
                $passes = true;
                foreach ($this->conditions as [$key, $op, $expected]) {
                    $actual = $row[$key] ?? null;
                    if ($op === '=' && (string)$actual !== (string)$expected) $passes = false;
                    if ($op === '<>' && (string)$actual === (string)$expected) $passes = false;
                    if ($op === 'NULL' && $actual !== null) $passes = false;
                }
                if ($passes) $rows[] = $row;
            }
            return $rows;
        }
    }
}
namespace Admin\Services {
    class PmdSharedFloorRegistryV1 {
        public function snapshot($locationId) {
            return [
                'floors' => [
                    ['id' => 'main', 'name' => 'Main Floor', 'is_default' => true],
                    ['id' => 'upper', 'name' => 'Upper', 'is_default' => false],
                ],
                'table_assignments' => ['7' => 'upper'],
            ];
        }
        public function findById($floors, $id) {
            foreach ($floors as $floor) if ($floor['id'] === $id) return $floor;
            return null;
        }
        public function isDefaultFloorId($id) { return $id === 'main'; }
    }
}
namespace {
    use Admin\Services\PmdFloorOperationalSafetyR45;
    use Illuminate\Support\Facades\Schema;
    use Illuminate\Support\Facades\DB;

    function data_get($row, $key) {
        return is_array($row) ? ($row[$key] ?? null) : ($row->$key ?? null);
    }
    function setting($key) { return null; }
    function logger() { return new class { public function warning($message, $context = []) {} }; }
    function app($class) { return new $class; }
    $root = $argv[1] ?? dirname(__DIR__);
    require $root.'/app/admin/Services/PmdFloorOperationalSafetyR45.php';
    $safety = new PmdFloorOperationalSafetyR45;
    $passes = 0;
    function check($label, $condition) {
        global $passes;
        if (!$condition) throw new \RuntimeException('FAIL R45: '.$label);
        $passes++;
        echo 'PASS R45: '.$label.PHP_EOL;
    }
    $available = [
        'table_id' => 7, 'operational_status' => 'available',
        'table_status' => 1, 'table_name' => 'Table 7',
    ];
    DB::$rows['tables'] = [$available];
    DB::$rows['orders'] = [];
    check('Only available table with no bill is removable',
        $safety->inspectTable(7, 1)['allowed'] === true);

    foreach (['occupied', 'cleaning', 'reserved', 'busy', 'unknown'] as $status) {
        DB::$rows['tables'] = [array_merge($available, ['operational_status' => $status])];
        check($status.' physical state blocks disabling/removal',
            $safety->inspectTable(7, 1)['allowed'] === false);
    }

    DB::$rows['tables'] = [$available];
    DB::$rows['orders'] = [
        ['table_id' => 7, 'location_id' => 1, 'settlement_status' => 'unpaid',
         'payment_status' => null, 'order_total' => 55.0, 'settled_amount' => 0.0],
    ];
    check('Unpaid linked order blocks both actions',
        $safety->inspectTable(7, 1)['reason'] === 'open_bill');
    DB::$rows['orders'][0]['settlement_status'] = 'partial';
    DB::$rows['orders'][0]['settled_amount'] = 25.0;
    check('Partially paid linked order blocks both actions',
        $safety->inspectTable(7, 1)['reason'] === 'open_bill');

    DB::$rows['orders'][0]['settlement_status'] = 'paid';
    DB::$rows['orders'][0]['payment_status'] = 'paid';
    DB::$rows['orders'][0]['settled_amount'] = 55.0;
    check('Fully settled historic order does not permanently lock table',
        $safety->inspectTable(7, 1)['allowed'] === true);

    DB::$rows['orders'][0]['settlement_status'] = null;
    DB::$rows['orders'][0]['payment_status'] = null;
    DB::$rows['orders'][0]['settled_amount'] = 0.0;
    check('Unverified bill status fails closed',
        $safety->inspectTable(7, 1)['reason'] === 'open_bill');
    DB::$rows['orders'][0]['order_total'] = null;
    check('Unknown legacy bill fails closed',
        $safety->inspectTable(7, 1)['allowed'] === false);

    DB::$rows['orders'] = [];
    unset(Schema::$columns['orders']);
    check('Missing orders schema fails closed',
        $safety->inspectTable(7, 1)['reason'] === 'orders_unavailable');
    Schema::$columns['orders'] = [
        'table_id', 'location_id', 'settlement_status',
        'payment_status', 'order_total', 'settled_amount', 'status'
    ];

    DB::$rows['tables'] = [array_merge($available, ['operational_status' => 'cleaning'])];
    check('Floor with cleaning table cannot be removed',
        $safety->inspectFloor(1, 'upper')['allowed'] === false);
    DB::$rows['tables'] = [$available];
    check('Floor with available table and no bill may be removed',
        $safety->inspectFloor(1, 'upper')['allowed'] === true);
    check('Default Floor is never removable',
        $safety->inspectFloor(1, 'main')['allowed'] === false);
    echo 'R45 PHP SAFETY REGRESSIONS: '.$passes.' tests passed'.PHP_EOL;
}
