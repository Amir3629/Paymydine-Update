<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Throwable;

/**
 * PMD_LIVE_PERFORMANCE_PROFILER_R1
 *
 * Temporary production-safe performance profiler.
 *
 * Disabled unless storage/framework/pmd-performance-live.json exists and
 * matches the current host. While enabled it records one compact JSON line per
 * PHP request, including total request time, bootstrap time, DB query count,
 * aggregate DB time, slowest SQL statements (without bindings), memory and
 * route/action metadata.
 *
 * It never logs request bodies, cookies, authorization headers, card data,
 * Stripe secrets, SQL bindings or customer payloads.
 */
class PmdLivePerformanceProfiler
{
    private const CONFIG_FILE = 'framework/pmd-performance-live.json';
    private const LOG_FILE = 'logs/pmd-performance.log';
    private const MAX_SLOW_QUERIES = 12;
    private const SQL_LIMIT = 700;

    /*
     * PMD_PERF_R11_STAGE_TIMING
     * Request-local PHP-FPM process state. Disabled unless the live profiler
     * itself is active. Checkpoints never contain request payload/customer data.
     */
    private static bool $stageEnabled = false;
    private static float $stageLastAt = 0.0;
    private static int $stageQueryCount = 0;
    private static float $stageDbMs = 0.0;
    private static int $stageLastQueryCount = 0;
    private static float $stageLastDbMs = 0.0;
    private static array $stageTimings = [];

    public static function checkpoint(string $name): void
    {
        if (!self::$stageEnabled) {
            return;
        }

        $name = trim((string)preg_replace('/[^a-z0-9_\-]+/i', '_', $name));
        if ($name === '') {
            return;
        }

        $now = microtime(true);

        self::$stageTimings[] = [
            'name' => $name,
            'ms' => round(
                max(0.0, ($now - self::$stageLastAt) * 1000),
                2
            ),
            'query_count' => max(
                0,
                self::$stageQueryCount
                    - self::$stageLastQueryCount
            ),
            'db_ms' => round(
                max(
                    0.0,
                    self::$stageDbMs
                        - self::$stageLastDbMs
                ),
                2
            ),
        ];

        self::$stageLastAt = $now;
        self::$stageLastQueryCount =
            self::$stageQueryCount;
        self::$stageLastDbMs =
            self::$stageDbMs;
    }

    private static function beginStageCollection(float $startedAt): void
    {
        self::$stageEnabled = true;
        self::$stageLastAt = $startedAt;
        self::$stageQueryCount = 0;
        self::$stageDbMs = 0.0;
        self::$stageLastQueryCount = 0;
        self::$stageLastDbMs = 0.0;
        self::$stageTimings = [];
    }

    private static function endStageCollection(): void
    {
        self::$stageEnabled = false;
        self::$stageLastAt = 0.0;
        self::$stageQueryCount = 0;
        self::$stageDbMs = 0.0;
        self::$stageLastQueryCount = 0;
        self::$stageLastDbMs = 0.0;
        self::$stageTimings = [];
    }

    public function handle(Request $request, Closure $next)
    {
        $config = $this->activeConfig($request);

        if ($config === null) {
            return $next($request);
        }

        $requestStart = isset($_SERVER['REQUEST_TIME_FLOAT'])
            ? (float)$_SERVER['REQUEST_TIME_FLOAT']
            : microtime(true);
        $middlewareStart = microtime(true);
        $requestId = date('YmdHis').'-'.getmypid().'-'.substr(
            hash('sha256', uniqid('', true)),
            0,
            10
        );

        self::beginStageCollection(
            $middlewareStart
        );

        $queryCount = 0;
        $queryMs = 0.0;
        $slowQueries = [];
        $queryFingerprints = [];
        $connectionCounts = [];
        $connectionMs = [];

        DB::listen(function ($query) use (
            &$queryCount,
            &$queryMs,
            &$slowQueries,
            &$queryFingerprints,
            &$connectionCounts,
            &$connectionMs
        ) {
            $time = isset($query->time) ? (float)$query->time : 0.0;
            $connection = trim((string)($query->connectionName ?? 'default'));
            if ($connection === '') {
                $connection = 'default';
            }

            $queryCount++;
            $queryMs += $time;

            self::$stageQueryCount++;
            self::$stageDbMs += $time;
            $connectionCounts[$connection] = ($connectionCounts[$connection] ?? 0) + 1;
            $connectionMs[$connection] = ($connectionMs[$connection] ?? 0.0) + $time;

            $sql = preg_replace('/\s+/', ' ', trim((string)($query->sql ?? '')));
            $sql = mb_substr($sql, 0, self::SQL_LIMIT);

            $fingerprintKey = $connection.'|'.$sql;
            if (!isset($queryFingerprints[$fingerprintKey])) {
                $queryFingerprints[$fingerprintKey] = [
                    'connection' => $connection,
                    'sql' => $sql,
                    'count' => 0,
                    'total_ms' => 0.0,
                    'max_ms' => 0.0,
                ];
            }
            $queryFingerprints[$fingerprintKey]['count']++;
            $queryFingerprints[$fingerprintKey]['total_ms'] += $time;
            $queryFingerprints[$fingerprintKey]['max_ms'] = max(
                $queryFingerprints[$fingerprintKey]['max_ms'],
                $time
            );

            $slowQueries[] = [
                'ms' => round($time, 2),
                'connection' => $connection,
                'sql' => $sql,
            ];

            usort($slowQueries, static function (array $left, array $right): int {
                return ($right['ms'] <=> $left['ms']);
            });

            if (count($slowQueries) > self::MAX_SLOW_QUERIES) {
                array_pop($slowQueries);
            }
        });

        $response = null;
        $thrown = null;

        try {
            $response = $next($request);
            return $response;
        } catch (Throwable $error) {
            $thrown = $error;
            throw $error;
        } finally {
            self::checkpoint('response_tail');

            $finishedAt = microtime(true);
            $totalMs = max(0.0, ($finishedAt - $requestStart) * 1000);
            $bootstrapMs = max(0.0, ($middlewareStart - $requestStart) * 1000);
            $nonDbMs = max(0.0, $totalMs - $queryMs);
            $status = $response && method_exists($response, 'getStatusCode')
                ? (int)$response->getStatusCode()
                : (int)http_response_code();

            $route = $request->route();
            $routeName = null;
            $routeAction = null;

            if (is_object($route)) {
                try {
                    $routeName = $route->getName();
                } catch (Throwable $ignore) {
                }

                try {
                    $routeAction = $route->getActionName();
                } catch (Throwable $ignore) {
                }
            }

            foreach ($connectionMs as $name => $ms) {
                $connectionMs[$name] = round((float)$ms, 2);
            }

            $repeatedQueries = array_values($queryFingerprints);
            foreach ($repeatedQueries as &$fingerprint) {
                $fingerprint['total_ms'] = round((float)$fingerprint['total_ms'], 2);
                $fingerprint['max_ms'] = round((float)$fingerprint['max_ms'], 2);
            }
            unset($fingerprint);

            usort($repeatedQueries, static function (array $left, array $right): int {
                $countCompare = ((int)$right['count']) <=> ((int)$left['count']);
                return $countCompare !== 0
                    ? $countCompare
                    : ((float)$right['total_ms'] <=> (float)$left['total_ms']);
            });
            $repeatedQueries = array_slice($repeatedQueries, 0, 15);

            $record = [
                'ts' => date('c'),
                'id' => $requestId,
                'host' => strtolower((string)$request->getHost()),
                'method' => strtoupper((string)$request->getMethod()),
                'path' => '/'.ltrim((string)$request->path(), '/'),
                'status' => $status,
                'ajax' => $request->ajax(),
                'route' => $routeName,
                'action' => $routeAction,
                'total_ms' => round($totalMs, 2),
                'bootstrap_ms' => round($bootstrapMs, 2),
                'db_ms' => round($queryMs, 2),
                'non_db_ms' => round($nonDbMs, 2),
                'db_percent' => $totalMs > 0 ? round(($queryMs / $totalMs) * 100, 1) : 0.0,
                'query_count' => $queryCount,
                'connections' => [
                    'query_count' => $connectionCounts,
                    'query_ms' => $connectionMs,
                ],
                'slowest_queries' => $slowQueries,
                'repeated_queries' => $repeatedQueries,
                'memory_mb' => round(memory_get_usage(true) / 1048576, 2),
                'peak_memory_mb' => round(memory_get_peak_usage(true) / 1048576, 2),
                'response_bytes' => $this->responseBytes($response),
                'stages' => self::$stageTimings,
                'exception' => $thrown ? get_class($thrown) : null,
            ];

            $this->writeRecord($record);

            if ($response && isset($response->headers)) {
                try {
                    $timing = sprintf(
                        'pmd_total;dur=%.2f, pmd_bootstrap;dur=%.2f, pmd_db;dur=%.2f, pmd_non_db;dur=%.2f',
                        $totalMs,
                        $bootstrapMs,
                        $queryMs,
                        $nonDbMs
                    );
                    $response->headers->set('Server-Timing', $timing, false);
                    $response->headers->set('X-PMD-Perf-ID', $requestId);
                    $response->headers->set('X-PMD-Perf-Total-Ms', (string)round($totalMs, 2));
                    $response->headers->set('X-PMD-Perf-DB-Queries', (string)$queryCount);
                } catch (Throwable $ignore) {
                }
            }

            self::endStageCollection();
        }
    }

    private function activeConfig(Request $request): ?array
    {
        $path = storage_path(self::CONFIG_FILE);

        if (!is_file($path) || !is_readable($path)) {
            return null;
        }

        $raw = @file_get_contents($path);
        $config = is_string($raw) ? json_decode($raw, true) : null;

        if (!is_array($config) || empty($config['enabled'])) {
            return null;
        }

        $expiresAt = isset($config['expires_at']) ? strtotime((string)$config['expires_at']) : false;
        if ($expiresAt !== false && $expiresAt < time()) {
            return null;
        }

        $host = strtolower(trim((string)$request->getHost()));
        $allowedHosts = array_values(array_filter(array_map(
            static fn($value) => strtolower(trim((string)$value)),
            (array)($config['hosts'] ?? [])
        )));

        if ($allowedHosts && !in_array('*', $allowedHosts, true) && !in_array($host, $allowedHosts, true)) {
            return null;
        }

        return $config;
    }

    private function responseBytes($response): ?int
    {
        if (!$response || !isset($response->headers)) {
            return null;
        }

        try {
            $length = $response->headers->get('Content-Length');
            if ($length !== null && ctype_digit((string)$length)) {
                return (int)$length;
            }

            if (method_exists($response, 'getContent')) {
                $content = $response->getContent();
                return is_string($content) ? strlen($content) : null;
            }
        } catch (Throwable $ignore) {
        }

        return null;
    }

    private function writeRecord(array $record): void
    {
        @file_put_contents(
            storage_path(self::LOG_FILE),
            json_encode(
                $record,
                JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
            ).PHP_EOL,
            FILE_APPEND | LOCK_EX
        );
    }
}
