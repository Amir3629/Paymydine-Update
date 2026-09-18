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

        if ($db <= max(50.0, $total * 0.25)) {
            echo "             hint: most time is outside SQL (PHP, external API, filesystem, lock, rendering, or upstream wait).\n";
        }
    }
}
