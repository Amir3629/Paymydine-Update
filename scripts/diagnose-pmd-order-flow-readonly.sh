#!/usr/bin/env bash
set -Eeuo pipefail

ROOT="${PMD_ROOT:-/var/www/paymydine}"
TABLE_NO="${1:-12}"
ORDER_ID="${2:-1882}"
STAMP="$(date +%Y%m%d_%H%M%S)"
REPORT="/tmp/pmd-order-flow-table-${TABLE_NO}-order-${ORDER_ID}-${STAMP}.log"
PHP_PROBE="/tmp/pmd-order-flow-probe-${STAMP}.php"

cd "$ROOT"

cat > "$PHP_PROBE" <<'PHP'
<?php

declare(strict_types=1);

$root = getenv('PMD_ROOT') ?: getcwd();
$tableNo = (string)($argv[1] ?? '12');
$orderId = (int)($argv[2] ?? 0);

require $root.'/bootstrap/autoload.php';
$app = require $root.'/bootstrap/app.php';
$kernel = $app->make(Illuminate\Contracts\Console\Kernel::class);
$kernel->bootstrap();

$pdo = Illuminate\Support\Facades\DB::connection()->getPdo();
$pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
$pdo->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);

function section(string $title): void
{
    echo "\n\n================ {$title} ================\n";
}

function qi(string $name): string
{
    return '`'.str_replace('`', '``', $name).'`';
}

function queryAll(PDO $pdo, string $sql, array $params = []): array
{
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

function queryOne(PDO $pdo, string $sql, array $params = []): ?array
{
    $rows = queryAll($pdo, $sql, $params);
    return $rows[0] ?? null;
}

function columns(PDO $pdo, string $db, string $table): array
{
    return array_map(
        static fn(array $r): string => (string)$r['COLUMN_NAME'],
        queryAll(
            $pdo,
            'SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? ORDER BY ORDINAL_POSITION',
            [$db, $table]
        )
    );
}

function tableExists(PDO $pdo, string $db, string $table): bool
{
    return (bool)queryOne(
        $pdo,
        'SELECT 1 AS ok FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ? LIMIT 1',
        [$db, $table]
    );
}

function firstColumn(array $columns, array $candidates): ?string
{
    foreach ($candidates as $candidate) {
        if (in_array($candidate, $columns, true)) {
            return $candidate;
        }
    }
    return null;
}

function printRows(array $rows, int $limit = 50): void
{
    if (!$rows) {
        echo "(no rows)\n";
        return;
    }
    foreach (array_slice($rows, 0, $limit) as $index => $row) {
        foreach ($row as $key => $value) {
            if (is_string($value) && strlen($value) > 1200) {
                $row[$key] = substr($value, 0, 1200).'…';
            }
        }
        echo sprintf("[%d] %s\n", $index + 1, json_encode($row, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE));
    }
}

function selectedColumns(array $columns, array $preferred): array
{
    return array_values(array_filter($preferred, static fn(string $col): bool => in_array($col, $columns, true)));
}

section('BOOTSTRAPPED CONNECTION');
$currentDb = (string)$pdo->query('SELECT DATABASE()')->fetchColumn();
echo 'driver='.Illuminate\Support\Facades\DB::connection()->getDriverName()."\n";
echo 'bootstrap_database='.$currentDb."\n";
echo 'target_table_no='.$tableNo."\n";
echo 'target_order_id='.$orderId."\n";
echo "Credentials are intentionally not printed.\n";

$databases = array_map(
    static fn(array $r): string => (string)$r['SCHEMA_NAME'],
    queryAll(
        $pdo,
        "SELECT SCHEMA_NAME FROM information_schema.SCHEMATA WHERE SCHEMA_NAME NOT IN ('information_schema','mysql','performance_schema','sys') ORDER BY SCHEMA_NAME"
    )
);

$tenantDbs = [];
foreach ($databases as $db) {
    if (tableExists($pdo, $db, 'orders')) {
        $tenantDbs[] = $db;
    }
}

section('DATABASES CONTAINING orders');
foreach ($tenantDbs as $db) {
    echo $db.($db === $currentDb ? '  <== bootstrapped connection' : '')."\n";
}
if (!$tenantDbs) {
    echo "No accessible database contains an orders table.\n";
    exit(2);
}

$globalMatches = [];

foreach ($tenantDbs as $db) {
    section('DATABASE '.$db);

    $orderCols = columns($pdo, $db, 'orders');
    $orderPk = firstColumn($orderCols, ['order_id', 'id']);
    $orderTableCol = firstColumn($orderCols, ['table_id', 'dining_table_id', 'location_table_id', 'table_no', 'table_name']);
    $orderTypeCol = firstColumn($orderCols, ['order_type', 'type']);
    $statusCol = firstColumn($orderCols, ['status_id', 'status', 'order_status', 'status_name']);
    $createdCol = firstColumn($orderCols, ['created_at', 'order_date', 'updated_at']);

    echo 'orders_pk='.($orderPk ?: '(missing)')."\n";
    echo 'orders_table_column='.($orderTableCol ?: '(missing)')."\n";
    echo 'orders_type_column='.($orderTypeCol ?: '(missing)')."\n";
    echo 'orders_status_column='.($statusCol ?: '(missing)')."\n";
    echo 'orders_sort_column='.($createdCol ?: $orderPk ?: '(missing)')."\n";

    $tableRows = [];
    $tableIds = [];
    $tableNames = [];
    if (tableExists($pdo, $db, 'tables')) {
        $tableCols = columns($pdo, $db, 'tables');
        $tablePk = firstColumn($tableCols, ['table_id', 'id']);
        $tableNoCol = firstColumn($tableCols, ['table_no', 'table_number', 'number']);
        $tableNameCol = firstColumn($tableCols, ['table_name', 'name', 'label', 'pos_table_label']);
        $conditions = [];
        $params = [];
        if ($tableNoCol) {
            $conditions[] = qi($tableNoCol).' = ?';
            $params[] = $tableNo;
        }
        if ($tablePk && ctype_digit($tableNo)) {
            $conditions[] = qi($tablePk).' = ?';
            $params[] = (int)$tableNo;
        }
        if ($conditions) {
            $tableRows = queryAll(
                $pdo,
                'SELECT * FROM '.qi($db).'.'.qi('tables').' WHERE '.implode(' OR ', $conditions).' LIMIT 20',
                $params
            );
        }
        section($db.' :: TABLE '.$tableNo.' ROW');
        printRows($tableRows);
        foreach ($tableRows as $row) {
            if ($tablePk && isset($row[$tablePk])) {
                $tableIds[] = (string)$row[$tablePk];
            }
            if ($tableNoCol && isset($row[$tableNoCol])) {
                $tableNames[] = (string)$row[$tableNoCol];
            }
            if ($tableNameCol && isset($row[$tableNameCol])) {
                $tableNames[] = (string)$row[$tableNameCol];
            }
        }
    } else {
        section($db.' :: TABLE '.$tableNo.' ROW');
        echo "tables table missing\n";
    }

    if (!$orderPk) {
        echo "Cannot inspect orders: no order_id/id column.\n";
        continue;
    }

    $preferred = [
        'order_id','id','location_id','table_id','dining_table_id','location_table_id','table_no','table_name',
        'order_type','type','status_id','status','order_status','status_name','processed',
        'payment','payment_status','pay_status','settlement_status','settled_amount',
        'order_total','total','total_amount','grand_total','total_items','guest_count',
        'first_name','last_name','email','telephone','comment','order_date','order_time',
        'created_at','updated_at','deleted_at'
    ];
    $selectCols = selectedColumns($orderCols, $preferred);
    if (!$selectCols) {
        $selectCols = [$orderPk];
    }
    $selectSql = implode(', ', array_map('qi', $selectCols));

    $exact = [];
    if ($orderId > 0) {
        $exact = queryAll(
            $pdo,
            'SELECT '.$selectSql.' FROM '.qi($db).'.'.qi('orders').' WHERE '.qi($orderPk).' = ? LIMIT 5',
            [$orderId]
        );
    }
    section($db.' :: EXACT ORDER #'.$orderId);
    printRows($exact);
    foreach ($exact as $row) {
        $globalMatches[] = ['database' => $db, 'kind' => 'exact', 'row' => $row];
    }

    $matchConditions = [];
    $matchParams = [];
    if ($orderTableCol) {
        $values = array_values(array_unique(array_merge($tableIds, [$tableNo])));
        if ($values) {
            $matchConditions[] = qi($orderTableCol).' IN ('.implode(',', array_fill(0, count($values), '?')).')';
            $matchParams = array_merge($matchParams, $values);
        }
    }
    if ($orderTypeCol) {
        $typeValues = array_values(array_unique(array_filter(array_merge(
            $tableIds,
            $tableNames,
            [$tableNo, 'Table '.$tableNo]
        ))));
        if ($typeValues) {
            $matchConditions[] = qi($orderTypeCol).' IN ('.implode(',', array_fill(0, count($typeValues), '?')).')';
            $matchParams = array_merge($matchParams, $typeValues);
        }
    }
    if ($orderId > 0) {
        $matchConditions[] = qi($orderPk).' = ?';
        $matchParams[] = $orderId;
    }

    $sortCol = $orderPk;
    $matching = [];
    if ($matchConditions) {
        $matching = queryAll(
            $pdo,
            'SELECT '.$selectSql.' FROM '.qi($db).'.'.qi('orders').' WHERE ('.implode(' OR ', $matchConditions).') ORDER BY '.qi($sortCol).' DESC LIMIT 40',
            $matchParams
        );
    }
    section($db.' :: ORDERS MATCHING TABLE '.$tableNo);
    printRows($matching, 40);
    foreach ($matching as $row) {
        $globalMatches[] = ['database' => $db, 'kind' => 'table-match', 'row' => $row];
    }

    section($db.' :: LATEST 30 ORDERS BY PRIMARY KEY');
    $latest = queryAll(
        $pdo,
        'SELECT '.$selectSql.' FROM '.qi($db).'.'.qi('orders').' ORDER BY '.qi($orderPk).' DESC LIMIT 30'
    );
    printRows($latest, 30);

    if ($orderTypeCol) {
        section($db.' :: LAST 100 order_type DISTRIBUTION');
        $distribution = queryAll(
            $pdo,
            'SELECT t.'.qi($orderTypeCol).' AS order_type, COUNT(*) AS count_rows FROM (SELECT '.qi($orderTypeCol).', '.qi($orderPk).' FROM '.qi($db).'.'.qi('orders').' ORDER BY '.qi($orderPk).' DESC LIMIT 100) t GROUP BY t.'.qi($orderTypeCol).' ORDER BY count_rows DESC'
        );
        printRows($distribution);
    }

    if ($statusCol) {
        section($db.' :: LAST 100 STATUS DISTRIBUTION');
        $distribution = queryAll(
            $pdo,
            'SELECT t.'.qi($statusCol).' AS raw_status, COUNT(*) AS count_rows FROM (SELECT '.qi($statusCol).', '.qi($orderPk).' FROM '.qi($db).'.'.qi('orders').' ORDER BY '.qi($orderPk).' DESC LIMIT 100) t GROUP BY t.'.qi($statusCol).' ORDER BY count_rows DESC'
        );
        printRows($distribution);
    }

    $ids = [];
    foreach (array_merge($exact, $matching) as $row) {
        if (isset($row[$orderPk])) {
            $ids[] = (int)$row[$orderPk];
        }
    }
    $ids = array_values(array_unique(array_filter($ids)));
    if ($orderId > 0 && !in_array($orderId, $ids, true)) {
        $ids[] = $orderId;
    }
    $ids = array_slice($ids, 0, 12);

    foreach ($ids as $id) {
        section($db.' :: ORDER #'.$id.' RELATED ROWS');

        if (tableExists($pdo, $db, 'order_menus')) {
            $menuCols = columns($pdo, $db, 'order_menus');
            if (in_array('order_id', $menuCols, true)) {
                $menuSelect = selectedColumns($menuCols, [
                    'order_menu_id','id','order_id','menu_id','name','quantity','price','subtotal','comment','option_values','created_at','updated_at'
                ]);
                echo "-- order_menus --\n";
                printRows(queryAll(
                    $pdo,
                    'SELECT '.implode(', ', array_map('qi', $menuSelect)).' FROM '.qi($db).'.'.qi('order_menus').' WHERE '.qi('order_id').' = ? ORDER BY '.qi(firstColumn($menuCols, ['order_menu_id','id']) ?: 'order_id'),
                    [$id]
                ));
            }
        }

        if (tableExists($pdo, $db, 'order_totals')) {
            $totalCols = columns($pdo, $db, 'order_totals');
            if (in_array('order_id', $totalCols, true)) {
                echo "-- order_totals --\n";
                printRows(queryAll(
                    $pdo,
                    'SELECT * FROM '.qi($db).'.'.qi('order_totals').' WHERE '.qi('order_id').' = ? ORDER BY '.qi(firstColumn($totalCols, ['priority','order_total_id','id']) ?: 'order_id'),
                    [$id]
                ));
            }
        }

        if (tableExists($pdo, $db, 'order_notes')) {
            $noteCols = columns($pdo, $db, 'order_notes');
            if (in_array('order_id', $noteCols, true)) {
                echo "-- order_notes --\n";
                printRows(queryAll(
                    $pdo,
                    'SELECT * FROM '.qi($db).'.'.qi('order_notes').' WHERE '.qi('order_id').' = ? ORDER BY '.qi(firstColumn($noteCols, ['created_at','order_note_id','id']) ?: 'order_id').' DESC LIMIT 50',
                    [$id]
                ));
            }
        }

        $historyTables = array_map(
            static fn(array $r): string => (string)$r['TABLE_NAME'],
            queryAll(
                $pdo,
                "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND (TABLE_NAME LIKE '%order%status%' OR TABLE_NAME LIKE '%status%history%') ORDER BY TABLE_NAME",
                [$db]
            )
        );
        foreach ($historyTables as $historyTable) {
            $historyCols = columns($pdo, $db, $historyTable);
            if (!in_array('order_id', $historyCols, true)) {
                continue;
            }
            echo '-- '.$historyTable." --\n";
            $sort = firstColumn($historyCols, ['created_at','updated_at','order_status_id','status_history_id','id','order_id']) ?: 'order_id';
            printRows(queryAll(
                $pdo,
                'SELECT * FROM '.qi($db).'.'.qi($historyTable).' WHERE '.qi('order_id').' = ? ORDER BY '.qi($sort).' DESC LIMIT 50',
                [$id]
            ));
        }

        if (tableExists($pdo, $db, 'statuses')) {
            $statusCols = columns($pdo, $db, 'statuses');
            $statusPk = firstColumn($statusCols, ['status_id','id']);
            $orderRow = queryOne(
                $pdo,
                'SELECT * FROM '.qi($db).'.'.qi('orders').' WHERE '.qi($orderPk).' = ? LIMIT 1',
                [$id]
            );
            if ($statusPk && $orderRow && isset($orderRow['status_id'])) {
                echo "-- resolved status row --\n";
                printRows(queryAll(
                    $pdo,
                    'SELECT * FROM '.qi($db).'.'.qi('statuses').' WHERE '.qi($statusPk).' = ? LIMIT 5',
                    [$orderRow['status_id']]
                ));
            }
        }
    }

    section($db.' :: NOTIFICATION TABLE CANDIDATES');
    $notificationTables = queryAll(
        $pdo,
        "SELECT TABLE_NAME FROM information_schema.TABLES WHERE TABLE_SCHEMA = ? AND TABLE_NAME LIKE '%notification%' ORDER BY TABLE_NAME",
        [$db]
    );
    printRows($notificationTables);
}

section('GLOBAL FINDING SUMMARY');
if (!$globalMatches) {
    echo "No exact or Table {$tableNo} order match was found in any accessible database.\n";
} else {
    $seen = [];
    foreach ($globalMatches as $match) {
        $row = $match['row'];
        $id = $row['order_id'] ?? $row['id'] ?? '?';
        $key = $match['database'].'#'.$id;
        if (isset($seen[$key])) {
            continue;
        }
        $seen[$key] = true;
        echo json_encode([
            'database' => $match['database'],
            'order_id' => $id,
            'table_id' => $row['table_id'] ?? $row['dining_table_id'] ?? $row['location_table_id'] ?? null,
            'order_type' => $row['order_type'] ?? $row['type'] ?? null,
            'status_id' => $row['status_id'] ?? null,
            'raw_status' => $row['status'] ?? $row['order_status'] ?? $row['status_name'] ?? null,
            'processed' => $row['processed'] ?? null,
            'payment' => $row['payment'] ?? null,
            'settlement_status' => $row['settlement_status'] ?? null,
            'total' => $row['order_total'] ?? $row['total'] ?? null,
            'created_at' => $row['created_at'] ?? null,
            'updated_at' => $row['updated_at'] ?? null,
        ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE)."\n";
    }
}

echo "\nREAD-ONLY PROBE COMPLETE. No INSERT, UPDATE, DELETE, migration or cache operation was executed.\n";
PHP

cleanup() {
  rm -f "$PHP_PROBE"
}
trap cleanup EXIT

{
  echo "================================================"
  echo " PMD READ-ONLY ORDER FLOW INVESTIGATION"
  echo "================================================"
  echo "Started:       $(date -Is)"
  echo "Host:          $(hostname)"
  echo "Repository:    $ROOT"
  echo "Target table:  $TABLE_NO"
  echo "Target order:  $ORDER_ID"
  echo "Report:        $REPORT"
  echo

  echo "================ RUNTIME ================"
  php -v | head -n 2
  echo "git_head=$(git rev-parse HEAD 2>/dev/null || true)"
  echo "git_branch=$(git branch --show-current 2>/dev/null || true)"
  echo "origin_v27=$(git rev-parse origin/agent/waiter-pos-ordering-v1 2>/dev/null || true)"
  echo
  echo "-- git status (read-only) --"
  git status --short || true

  echo
  echo "================ DEPLOYED WAITER POS MARKERS ================"
  grep -RInE "pmd-waiter-pos-simple-v2\.7|pmd-waiter-pos-v2\.6|Sent from PayMyDine Waiter POS|order_type.*table\['name'\]" \
    app/admin/controllers app/admin/assets/js app/admin/views routes 2>/dev/null | head -n 160 || true

  echo
  echo "================ ROUTES ================"
  php artisan route:list 2>&1 | grep -Ei "waiter-pos|waiter-dashboard|admin/orders|notifications" | head -n 240 || true

  echo
  echo "================ SOURCE CLUES ================"
  echo "-- New order mapping --"
  grep -nE "table_id|order_type|status_id|processed|payment|settlement_status" \
    app/admin/controllers/concerns/PmdWaiterPosOrderPersistenceConcern.php | head -n 120 || true
  echo "-- Save endpoint mapping --"
  grep -nE "resolveStatusId|processed|addStatusHistory|recalculateOrder|recordWaiterPosNoteHistory" \
    app/admin/controllers/concerns/PmdWaiterPosSaveEndpoint.php | head -n 120 || true
  echo "-- Waiter dashboard card mapping --"
  grep -nE "loadOrderCards|tableCol|statusCol|limit\(80\)|count\(\$rows\).*24|statusRaw" \
    app/admin/controllers/PmdWaiterDashboardV149.php | head -n 160 || true

  echo
  echo "================ APPLICATION LOG MATCHES ================"
  if [ -d storage/logs ]; then
    find storage/logs -maxdepth 2 -type f -print0 2>/dev/null \
      | xargs -0 grep -nEi "Order #?${ORDER_ID}\b|order.?id.?${ORDER_ID}\b|Table ${TABLE_NO}\b|table.?${TABLE_NO}\b|Waiter POS" 2>/dev/null \
      | tail -n 300 || true
  else
    echo "storage/logs directory missing"
  fi

  echo
  echo "================ DATABASE TRACE ================"
  PMD_ROOT="$ROOT" php "$PHP_PROBE" "$TABLE_NO" "$ORDER_ID"

  echo
  echo "================================================"
  echo " INVESTIGATION FINISHED"
  echo "================================================"
  echo "Finished: $(date -Is)"
  echo "Report:   $REPORT"
  echo "No data was changed."
} 2>&1 | tee "$REPORT"

echo
echo "Copy the complete report with:"
echo "cat '$REPORT'"
