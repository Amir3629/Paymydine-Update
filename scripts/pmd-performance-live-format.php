<?php

$colors = function_exists('posix_isatty') && defined('STDOUT') && @posix_isatty(STDOUT);
$paint = static function (string $text, string $code) use ($colors): string {
    return $colors ? "\033[".$code."m".$text."\033[0m" : $text;
};

while (($line = fgets(STDIN)) !== false) {
    $row = json_decode(trim($line), true);
    if (!is_array($row)) continue;

    $total = (float)($row['total_ms'] ?? 0);
    $db = (float)($row['db_ms'] ?? 0);
    $nonDb = (float)($row['non_db_ms'] ?? 0);
    $queries = (int)($row['query_count'] ?? 0);
    $status = (int)($row['status'] ?? 0);
    $method = (string)($row['method'] ?? '?');
    $path = (string)($row['path'] ?? '/');
    $time = substr((string)($row['ts'] ?? ''), 11, 8);

    if ($total >= 2000) {
        $label = $paint('VERY-SLOW', '1;31');
    } elseif ($total >= 800) {
        $label = $paint('SLOW', '1;33');
    } elseif ($total >= 300) {
        $label = $paint('WATCH', '36');
    } else {
        $label = $paint('OK', '32');
    }

    printf(
        "%s %-9s %7.1fms | DB %7.1fms q=%-4d | nonDB %7.1fms | %3d | %-5s %s\n",
        $time,
        $label,
        $total,
        $db,
        $queries,
        $nonDb,
        $status,
        $method,
        $path
    );

    $stages = is_array($row['stages'] ?? null)
        ? array_values($row['stages'])
        : [];

    if (count($stages) > 1) {
        $parts = [];

        foreach ($stages as $stage) {
            if (!is_array($stage)) continue;

            $name = (string)($stage['name'] ?? '?');
            $ms = (float)($stage['ms'] ?? 0);
            $stageQueries = (int)($stage['query_count'] ?? 0);
            $stageDbMs = (float)($stage['db_ms'] ?? 0);

            $parts[] = sprintf(
                '%s=%.1fms/q%d/db%.1f',
                $name,
                $ms,
                $stageQueries,
                $stageDbMs
            );
        }

        if ($parts) {
            $chunks = array_chunk($parts, 4);

            foreach ($chunks as $index => $chunk) {
                printf(
                    "             %s%s\n",
                    $index === 0 ? 'stages: ' : '        ',
                    implode(' | ', $chunk)
                );
            }
        }
    }

    if ($total >= 800) {
        $slow = $row['slowest_queries'][0] ?? null;
        if (is_array($slow) && (float)($slow['ms'] ?? 0) > 0) {
            $sql = preg_replace('/\s+/', ' ', (string)($slow['sql'] ?? ''));
            printf(
                "             top SQL %7.1fms [%s] %s\n",
                (float)($slow['ms'] ?? 0),
                (string)($slow['connection'] ?? '?'),
                mb_substr($sql, 0, 180)
            );
        }

        $repeat = $row['repeated_queries'][0] ?? null;
        if (is_array($repeat) && (int)($repeat['count'] ?? 0) >= 5) {
            $repeatSql = preg_replace('/\s+/', ' ', (string)($repeat['sql'] ?? ''));
            printf(
                "             repeated x%-4d %7.1fms total [%s] %s\n",
                (int)($repeat['count'] ?? 0),
                (float)($repeat['total_ms'] ?? 0),
                (string)($repeat['connection'] ?? '?'),
                mb_substr($repeatSql, 0, 160)
            );
        }

        if ($db <= max(50.0, $total * 0.25)) {
            echo "             hint: most time is outside SQL (PHP, external API, filesystem, lock, rendering, or upstream wait).\n";
        }
    }
}
