<?php

$opts = getopt('', ['minutes::', 'host::', 'paths::', 'limit::', 'file::']);

$minutes = max(1, (int)($opts['minutes'] ?? 15));
$host = strtolower(trim((string)($opts['host'] ?? 'tomo.paymydine.com')));
$limit = max(5, min(50, (int)($opts['limit'] ?? 20)));
$file = (string)($opts['file'] ?? dirname(__DIR__).'/storage/logs/pmd-performance.log');

$paths = array_values(array_filter(array_map(
    static fn($value) => '/'.ltrim(trim((string)$value), '/'),
    preg_split('/\s*,\s*/', (string)($opts['paths'] ?? '/admin/orders,/admin/cashierlab'))
)));

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

    $path = '/'.ltrim((string)($row['path'] ?? '/'), '/');
    if ($paths && !in_array($path, $paths, true)) continue;

    $rows[] = $row;
}
fclose($handle);

if (!$rows) {
    echo "No matching profiler records found.\n";
    echo "Host: {$host}\n";
    echo "Paths: ".implode(', ', $paths)."\n";
    echo "Window: {$minutes} minutes\n";
    exit(0);
}

$avg = static fn(array $values): float => $values ? array_sum($values) / count($values) : 0.0;
$percentile = static function (array $values, float $p): float {
    if (!$values) return 0.0;
    sort($values, SORT_NUMERIC);
    $index = (int)ceil(($p / 100) * count($values)) - 1;
    $index = max(0, min(count($values) - 1, $index));
    return (float)$values[$index];
};

echo "==============================================================\n";
echo " PayMyDine ROUTE PERFORMANCE REPORT R6\n";
echo "==============================================================\n";
echo "Host: {$host}\n";
echo "Window: last {$minutes} minute(s)\n";
echo "Paths: ".implode(', ', $paths)."\n";
echo "Requests: ".count($rows)."\n\n";

$byRoute = [];
foreach ($rows as $row) {
    $key = strtoupper((string)($row['method'] ?? '?')).' '.(string)($row['path'] ?? '/');
    $byRoute[$key][] = $row;
}

foreach ($byRoute as $route => $routeRows) {
    $totals = array_map(static fn($r) => (float)($r['total_ms'] ?? 0), $routeRows);
    $db = array_map(static fn($r) => (float)($r['db_ms'] ?? 0), $routeRows);
    $nonDb = array_map(static fn($r) => (float)($r['non_db_ms'] ?? 0), $routeRows);
    $queries = array_map(static fn($r) => (int)($r['query_count'] ?? 0), $routeRows);

    echo "ROUTE {$route}\n";
    echo str_repeat('-', 110)."\n";
    printf(
        "n=%d | total avg %.1fms p95 %.1fms max %.1fms | DB avg %.1fms | nonDB avg %.1fms | queries avg %.1f max %d\n",
        count($routeRows),
        $avg($totals),
        $percentile($totals, 95),
        max($totals),
        $avg($db),
        $avg($nonDb),
        $avg($queries),
        max($queries)
    );

    $fingerprints = [];
    foreach ($routeRows as $row) {
        foreach ((array)($row['repeated_queries'] ?? []) as $query) {
            if (!is_array($query)) continue;
            $sql = preg_replace('/\s+/', ' ', trim((string)($query['sql'] ?? '')));
            if ($sql === '') continue;
            $connection = (string)($query['connection'] ?? '?');
            $key = $connection.'|'.$sql;

            if (!isset($fingerprints[$key])) {
                $fingerprints[$key] = [
                    'connection' => $connection,
                    'sql' => $sql,
                    'requests' => 0,
                    'count' => 0,
                    'total_ms' => 0.0,
                    'max_per_request' => 0,
                    'max_ms' => 0.0,
                ];
            }

            $fingerprints[$key]['requests']++;
            $fingerprints[$key]['count'] += (int)($query['count'] ?? 0);
            $fingerprints[$key]['total_ms'] += (float)($query['total_ms'] ?? 0);
            $fingerprints[$key]['max_per_request'] = max(
                $fingerprints[$key]['max_per_request'],
                (int)($query['count'] ?? 0)
            );
            $fingerprints[$key]['max_ms'] = max(
                $fingerprints[$key]['max_ms'],
                (float)($query['max_ms'] ?? 0)
            );
        }
    }

    $fingerprints = array_values($fingerprints);
    usort($fingerprints, static function ($a, $b) {
        $count = $b['count'] <=> $a['count'];
        return $count !== 0 ? $count : ($b['total_ms'] <=> $a['total_ms']);
    });

    echo "\nTOP REPEATED SQL\n";
    foreach (array_slice($fingerprints, 0, $limit) as $item) {
        printf(
            "n=%-5d req=%-3d max/request=%-3d %8.1fms | max %6.1fms | [%s] %s\n",
            $item['count'],
            $item['requests'],
            $item['max_per_request'],
            $item['total_ms'],
            $item['max_ms'],
            $item['connection'],
            mb_substr($item['sql'], 0, 230)
        );
    }

    $slowSql = [];
    foreach ($routeRows as $row) {
        foreach ((array)($row['slowest_queries'] ?? []) as $query) {
            if (!is_array($query)) continue;
            $sql = preg_replace('/\s+/', ' ', trim((string)($query['sql'] ?? '')));
            if ($sql === '') continue;
            $connection = (string)($query['connection'] ?? '?');
            $key = $connection.'|'.$sql;
            if (!isset($slowSql[$key])) {
                $slowSql[$key] = [
                    'connection' => $connection,
                    'sql' => $sql,
                    'count' => 0,
                    'total_ms' => 0.0,
                    'max_ms' => 0.0,
                ];
            }
            $ms = (float)($query['ms'] ?? 0);
            $slowSql[$key]['count']++;
            $slowSql[$key]['total_ms'] += $ms;
            $slowSql[$key]['max_ms'] = max($slowSql[$key]['max_ms'], $ms);
        }
    }

    $slowSql = array_values($slowSql);
    usort($slowSql, static fn($a, $b) => $b['total_ms'] <=> $a['total_ms']);

    echo "\nTOP SLOW SQL\n";
    foreach (array_slice($slowSql, 0, min($limit, 12)) as $item) {
        printf(
            "n=%-4d %8.1fms total | max %6.1fms | [%s] %s\n",
            $item['count'],
            $item['total_ms'],
            $item['max_ms'],
            $item['connection'],
            mb_substr($item['sql'], 0, 230)
        );
    }

    usort($routeRows, static fn($a, $b) => ((float)($b['total_ms'] ?? 0)) <=> ((float)($a['total_ms'] ?? 0)));

    echo "\nSLOWEST REQUESTS\n";
    foreach (array_slice($routeRows, 0, min($limit, 12)) as $row) {
        printf(
            "%s %7.1fms | DB %7.1fms | nonDB %7.1fms | q=%-4d | status=%d | action=%s\n",
            substr((string)($row['ts'] ?? ''), 11, 8),
            (float)($row['total_ms'] ?? 0),
            (float)($row['db_ms'] ?? 0),
            (float)($row['non_db_ms'] ?? 0),
            (int)($row['query_count'] ?? 0),
            (int)($row['status'] ?? 0),
            (string)($row['action'] ?? '')
        );
    }

    echo "\n";
}
