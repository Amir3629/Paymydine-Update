<?php

$opts = getopt('', ['minutes::', 'host::', 'limit::', 'file::']);
$minutes = max(1, (int)($opts['minutes'] ?? 15));
$host = strtolower(trim((string)($opts['host'] ?? 'tomo.paymydine.com')));
$limit = max(5, min(50, (int)($opts['limit'] ?? 20)));
$file = (string)($opts['file'] ?? dirname(__DIR__).'/storage/logs/pmd-performance.log');

if (!is_file($file) || !is_readable($file)) {
    fwrite(STDERR, "No performance log found: {$file}\n");
    exit(1);
}

$cutoff = time() - ($minutes * 60);
$rows = [];

$handle = fopen($file, 'rb');
if (!$handle) {
    fwrite(STDERR, "Cannot open performance log.\n");
    exit(1);
}

while (($line = fgets($handle)) !== false) {
    $row = json_decode(trim($line), true);
    if (!is_array($row)) continue;

    $ts = strtotime((string)($row['ts'] ?? ''));
    if ($ts === false || $ts < $cutoff) continue;

    if ($host !== '' && strtolower((string)($row['host'] ?? '')) !== $host) continue;

    $rows[] = $row;
}
fclose($handle);

if (!$rows) {
    echo "No profiler records found for {$host} in the last {$minutes} minutes.\n";
    exit(0);
}

$percentile = static function (array $values, float $p): float {
    if (!$values) return 0.0;
    sort($values, SORT_NUMERIC);
    $index = (int)ceil(($p / 100) * count($values)) - 1;
    $index = max(0, min(count($values) - 1, $index));
    return (float)$values[$index];
};

$avg = static fn(array $values): float => $values ? array_sum($values) / count($values) : 0.0;

$totals = array_map(static fn($r) => (float)($r['total_ms'] ?? 0), $rows);
$dbTotals = array_map(static fn($r) => (float)($r['db_ms'] ?? 0), $rows);
$queryCounts = array_map(static fn($r) => (int)($r['query_count'] ?? 0), $rows);

echo "==============================================================\n";
echo " PayMyDine PERFORMANCE REPORT\n";
echo "==============================================================\n";
echo "Host: {$host}\n";
echo "Window: last {$minutes} minute(s)\n";
echo "Requests: ".count($rows)."\n";
printf(
    "Latency: avg %.1fms | p95 %.1fms | max %.1fms\n",
    $avg($totals),
    $percentile($totals, 95),
    max($totals)
);
printf(
    "DB:      avg %.1fms | p95 %.1fms | avg queries %.1f\n",
    $avg($dbTotals),
    $percentile($dbTotals, 95),
    $avg($queryCounts)
);
echo "\n";

$routes = [];
foreach ($rows as $row) {
    $key = strtoupper((string)($row['method'] ?? '?')).' '.(string)($row['path'] ?? '/');
    if (!isset($routes[$key])) {
        $routes[$key] = ['total' => [], 'db' => [], 'queries' => [], 'status' => []];
    }
    $routes[$key]['total'][] = (float)($row['total_ms'] ?? 0);
    $routes[$key]['db'][] = (float)($row['db_ms'] ?? 0);
    $routes[$key]['queries'][] = (int)($row['query_count'] ?? 0);
    $routes[$key]['status'][] = (int)($row['status'] ?? 0);
}

$routeRows = [];
foreach ($routes as $key => $stats) {
    $routeRows[] = [
        'key' => $key,
        'count' => count($stats['total']),
        'avg' => $avg($stats['total']),
        'p95' => $percentile($stats['total'], 95),
        'max' => max($stats['total']),
        'db_avg' => $avg($stats['db']),
        'q_avg' => $avg($stats['queries']),
    ];
}
usort($routeRows, static fn($a, $b) => $b['p95'] <=> $a['p95']);

echo "TOP ROUTES BY P95\n";
echo str_repeat('-', 110)."\n";
printf("%-5s %-9s %-9s %-9s %-9s %-8s %s\n", "N", "AVG", "P95", "MAX", "DB AVG", "Q AVG", "ROUTE");
foreach (array_slice($routeRows, 0, $limit) as $r) {
    printf(
        "%-5d %-9.1f %-9.1f %-9.1f %-9.1f %-8.1f %s\n",
        $r['count'],
        $r['avg'],
        $r['p95'],
        $r['max'],
        $r['db_avg'],
        $r['q_avg'],
        $r['key']
    );
}

$slowRows = $rows;
usort($slowRows, static fn($a, $b) => ((float)($b['total_ms'] ?? 0)) <=> ((float)($a['total_ms'] ?? 0)));

echo "\nSLOWEST INDIVIDUAL REQUESTS\n";
echo str_repeat('-', 110)."\n";
foreach (array_slice($slowRows, 0, $limit) as $row) {
    printf(
        "%s %7.1fms | DB %7.1fms | nonDB %7.1fms | q=%-4d | %3d | %s %s\n",
        substr((string)($row['ts'] ?? ''), 11, 8),
        (float)($row['total_ms'] ?? 0),
        (float)($row['db_ms'] ?? 0),
        (float)($row['non_db_ms'] ?? 0),
        (int)($row['query_count'] ?? 0),
        (int)($row['status'] ?? 0),
        (string)($row['method'] ?? '?'),
        (string)($row['path'] ?? '/')
    );
}

$sqlStats = [];
foreach ($rows as $row) {
    foreach ((array)($row['slowest_queries'] ?? []) as $query) {
        if (!is_array($query)) continue;
        $sql = preg_replace('/\s+/', ' ', trim((string)($query['sql'] ?? '')));
        if ($sql === '') continue;
        $connection = (string)($query['connection'] ?? '?');
        $key = $connection.'|'.$sql;
        if (!isset($sqlStats[$key])) {
            $sqlStats[$key] = [
                'sql' => $sql,
                'connection' => $connection,
                'count' => 0,
                'sum' => 0.0,
                'max' => 0.0,
            ];
        }
        $ms = (float)($query['ms'] ?? 0);
        $sqlStats[$key]['count']++;
        $sqlStats[$key]['sum'] += $ms;
        $sqlStats[$key]['max'] = max($sqlStats[$key]['max'], $ms);
    }
}

$sqlRows = array_values($sqlStats);
usort($sqlRows, static fn($a, $b) => $b['sum'] <=> $a['sum']);

echo "\nTOP SLOW SQL SEEN IN REQUESTS\n";
echo str_repeat('-', 110)."\n";
foreach (array_slice($sqlRows, 0, $limit) as $sql) {
    printf(
        "%7.1fms total | max %7.1fms | n=%-4d | [%s] %s\n",
        $sql['sum'],
        $sql['max'],
        $sql['count'],
        $sql['connection'],
        mb_substr($sql['sql'], 0, 220)
    );
}

$repeatStats = [];
foreach ($rows as $row) {
    foreach ((array)($row['repeated_queries'] ?? []) as $query) {
        if (!is_array($query)) continue;
        $sql = preg_replace('/\s+/', ' ', trim((string)($query['sql'] ?? '')));
        if ($sql === '') continue;
        $connection = (string)($query['connection'] ?? '?');
        $key = $connection.'|'.$sql;
        if (!isset($repeatStats[$key])) {
            $repeatStats[$key] = [
                'sql' => $sql,
                'connection' => $connection,
                'count' => 0,
                'sum' => 0.0,
                'max_per_request' => 0,
                'max_ms' => 0.0,
            ];
        }
        $count = (int)($query['count'] ?? 0);
        $sum = (float)($query['total_ms'] ?? 0);
        $repeatStats[$key]['count'] += $count;
        $repeatStats[$key]['sum'] += $sum;
        $repeatStats[$key]['max_per_request'] = max($repeatStats[$key]['max_per_request'], $count);
        $repeatStats[$key]['max_ms'] = max($repeatStats[$key]['max_ms'], (float)($query['max_ms'] ?? 0));
    }
}

$repeatRows = array_values($repeatStats);
usort($repeatRows, static function ($a, $b) {
    $countCompare = $b['count'] <=> $a['count'];
    return $countCompare !== 0 ? $countCompare : ($b['sum'] <=> $a['sum']);
});

if ($repeatRows) {
    echo "\nTOP REPEATED SQL FINGERPRINTS\n";
    echo str_repeat('-', 110)."\n";
    foreach (array_slice($repeatRows, 0, $limit) as $sql) {
        printf(
            "n=%-5d max/request=%-4d %8.1fms total | max %7.1fms | [%s] %s\n",
            $sql['count'],
            $sql['max_per_request'],
            $sql['sum'],
            $sql['max_ms'],
            $sql['connection'],
            mb_substr($sql['sql'], 0, 210)
        );
    }
}

$verySlow = count(array_filter($rows, static fn($r) => (float)($r['total_ms'] ?? 0) >= 2000));
$slow = count(array_filter($rows, static fn($r) => (float)($r['total_ms'] ?? 0) >= 800));
$dbHeavy = count(array_filter($rows, static function ($r) {
    $total = (float)($r['total_ms'] ?? 0);
    $db = (float)($r['db_ms'] ?? 0);
    return $total >= 800 && $db >= ($total * 0.5);
}));

echo "\nSUMMARY SIGNALS\n";
echo str_repeat('-', 110)."\n";
echo "Requests >= 800ms:  {$slow}\n";
echo "Requests >= 2000ms: {$verySlow}\n";
echo "Slow + DB-heavy:     {$dbHeavy}\n";
echo "Slow + mostly nonDB: ".max(0, $slow - $dbHeavy)."\n";
echo "\nIf slow requests are DB-heavy, inspect the SQL list/indexes. If nonDB dominates, investigate PHP rendering, external providers, filesystem/session locks, Next proxy/SSR, or frontend waits.\n";
