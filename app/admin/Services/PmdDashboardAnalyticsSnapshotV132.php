<?php

namespace Admin\Services;

use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * PMD_DASHBOARD_ANALYTICS_SNAPSHOT_V132
 *
 * Small stale-while-revalidate snapshot store for the shared Owner analytics
 * component used by Owner, Manager and Accountant dashboards.
 *
 * It never computes analytics itself. Heavy aggregates remain behind the
 * existing pmd_analytics endpoints. This service only remembers successful
 * endpoint payloads so a later dashboard GET can render final analytics HTML
 * immediately without re-running those queries on the navigation critical path.
 */
final class PmdDashboardAnalyticsSnapshotV132
{
    private const VERSION = 'v132';
    private const TTL_MINUTES = 30;

    private const PERIODS = [
        'last30',
        'month',
    ];

    public function store(
        int $locationId,
        string $period,
        array $payload
    ): void {
        $period = strtolower(trim($period));

        if (
            $locationId < 1
            || !in_array($period, self::PERIODS, true)
            || ($payload['success'] ?? false) !== true
        ) {
            return;
        }

        try {
            Cache::put(
                $this->key($locationId, $period),
                [
                    'saved_at' => time(),
                    'location_id' => $locationId,
                    'period' => $period,
                    'payload' => $payload,
                ],
                now()->addMinutes(self::TTL_MINUTES)
            );
        } catch (\Throwable $error) {
            logger()->debug(
                'PMD V132 analytics snapshot write skipped',
                [
                    'location_id' => $locationId,
                    'period' => $period,
                    'type' => get_class($error),
                ]
            );
        }
    }

    public function bootstrap(int $locationId): array
    {
        if ($locationId < 1) {
            return $this->emptyBootstrap($locationId);
        }

        try {
            $periods = [];
            $savedAt = [];

            foreach (self::PERIODS as $period) {
                $entry = Cache::get(
                    $this->key($locationId, $period)
                );

                if (
                    !is_array($entry)
                    || (int)($entry['location_id'] ?? 0) !== $locationId
                    || (string)($entry['period'] ?? '') !== $period
                    || !is_array($entry['payload'] ?? null)
                    || (($entry['payload']['success'] ?? false) !== true)
                ) {
                    return $this->emptyBootstrap($locationId);
                }

                $periods[$period] = $entry['payload'];
                $savedAt[] = max(
                    0,
                    (int)($entry['saved_at'] ?? 0)
                );
            }

            return [
                'server_first_paint' => true,
                'snapshot_source' => 'pmd-v132-cache',
                'snapshot_saved_at' => $savedAt
                    ? min($savedAt)
                    : 0,
                'location_id' => $locationId,
                'periods' => $periods,
            ];
        } catch (\Throwable $error) {
            logger()->debug(
                'PMD V132 analytics snapshot read skipped',
                [
                    'location_id' => $locationId,
                    'type' => get_class($error),
                ]
            );

            return $this->emptyBootstrap($locationId);
        }
    }

    private function emptyBootstrap(int $locationId): array
    {
        return [
            'server_first_paint' => false,
            'snapshot_source' => 'cold',
            'location_id' => max(0, $locationId),
            'periods' => [],
        ];
    }

    private function key(
        int $locationId,
        string $period
    ): string {
        return implode(
            ':',
            [
                'pmd',
                'dashboard-analytics',
                self::VERSION,
                $this->tenantScope(),
                'location',
                (string)$locationId,
                $this->localeScope(),
                $period,
            ]
        );
    }

    private function tenantScope(): string
    {
        $database = '';

        try {
            $database = trim(
                (string)DB::connection()->getDatabaseName()
            );
        } catch (\Throwable $error) {
        }

        if ($database === '') {
            try {
                $database = trim(
                    (string)request()->getHost()
                );
            } catch (\Throwable $error) {
                $database = 'unknown';
            }
        }

        return substr(
            hash('sha256', $database),
            0,
            20
        );
    }

    private function localeScope(): string
    {
        $locale = strtolower(
            trim((string)app()->getLocale())
        );

        if ($locale === '') {
            $locale = 'en';
        }

        return preg_replace(
            '/[^a-z0-9_-]+/',
            '-',
            $locale
        ) ?: 'en';
    }
}
