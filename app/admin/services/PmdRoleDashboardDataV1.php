<?php

namespace Admin\Services;

use Admin\Controllers\Dashboard2;
use Admin\Facades\AdminAuth;
use Admin\Facades\AdminLocation;
use Admin\Models\Locations_model;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * PMD_ROLE_DASHBOARD_DATA_V3_4
 *
 * Role dashboards consume the same Dashboard2 analytics authority as the
 * proven Owner Dashboard Lab. No Pmdreports controller lifecycle and no
 * second SQL authority are introduced here.
 */
final class PmdRoleDashboardDataV1
{
    private string $locale = 'en';

    public function bundle(array $specs, ?int $expectedLocationId = null, string $locale = 'en'): array
    {
        $this->locale = strtolower(trim($locale)) === 'de' ? 'de' : 'en';

        /*
         * PMD_ROLE_DASHBOARD_LOCATION_RESOLUTION_V3_3_5
         *
         * Role test accounts can legitimately have access to more than one
         * location while the clean workspace has no AdminLocation session yet.
         * Resolve a location without guessing: explicit/current/session/default
         * first, then a single accessible location, then a single accessible
         * location with current-month order activity. If still ambiguous, fail
         * closed instead of aggregating multiple restaurants.
         */
        $effectiveLocationId = $this->resolveRoleLocationId($expectedLocationId);
        $this->primeLocation($effectiveLocationId);

        try {
            /*
             * PMD_ROLE_DASHBOARD_EXPLICIT_LOCATION_V3_3_4
             *
             * Clean Workspace has already resolved the authenticated location.
             * Do not ask a freshly-created Dashboard2 controller to infer the
             * location again from a role session that may be unset/ambiguous.
             * Every Dashboard2 query for this bundle is pinned to the exact
             * Clean Workspace location and therefore cannot drift or broaden.
             */
            $source = new class($effectiveLocationId) extends Dashboard2 {
                private ?int $pmdExplicitLocationId = null;

                public function __construct(?int $locationId)
                {
                    $this->pmdExplicitLocationId = ($locationId && $locationId > 0)
                        ? (int)$locationId
                        : null;
                    parent::__construct();
                }

                protected function locationId(): ?int
                {
                    return $this->pmdExplicitLocationId ?: parent::locationId();
                }

                public function pmdRoleAnalytics(string $period): array
                {
                    return $this->analyticsPayload($period);
                }

                public function pmdRoleLocationId(): ?int
                {
                    return $this->locationId();
                }

                public function pmdRoleCurrency(): array
                {
                    return $this->currency();
                }

                public function pmdRoleTimezone(): string
                {
                    return $this->restaurantTimezone();
                }
            };

            $resolvedLocationId = $source->pmdRoleLocationId();

            if (!$effectiveLocationId || (int)$effectiveLocationId < 1) {
                throw new \RuntimeException(
                    'Role dashboard location unavailable after safe resolution'
                );
            }

            if ((int)$resolvedLocationId !== (int)$effectiveLocationId) {
                throw new \RuntimeException(
                    'Role dashboard location mismatch: expected '.
                    (int)$effectiveLocationId.' resolved '.(int)$resolvedLocationId
                );
            }

            $currency = $source->pmdRoleCurrency();
            $timezone = $source->pmdRoleTimezone();
            $periodPayloads = [];
            $periods = [];

            foreach ($specs as $spec) {
                $period = is_array($spec)
                    ? (string)($spec['period'] ?? 'today')
                    : (string)$spec;
                $periods[$period] = true;
            }

            foreach (array_keys($periods) as $period) {
                $safePeriod = in_array($period, ['today', 'week', 'month', 'last30'], true)
                    ? $period
                    : 'today';
                $payload = $source->pmdRoleAnalytics($safePeriod);

                if (!is_array($payload) || ($payload['success'] ?? false) !== true) {
                    throw new \RuntimeException(
                        'Dashboard2 analytics payload unavailable for '.$safePeriod
                    );
                }

                $periodPayloads[$period] = $payload;
            }

            $reports = [];
            foreach ($specs as $key => $spec) {
                $type = is_array($spec)
                    ? (string)($spec['type'] ?? $key)
                    : (string)$key;
                $period = is_array($spec)
                    ? (string)($spec['period'] ?? 'today')
                    : (string)$spec;
                $payload = is_array($periodPayloads[$period] ?? null)
                    ? $periodPayloads[$period]
                    : [];

                $reports[(string)$key] = $this->report(
                    $type,
                    $period,
                    $payload,
                    $currency,
                    $timezone
                );
            }

            return [
                'reports' => $reports,
                'location_id' => $resolvedLocationId,
                'requested_location_id' => $expectedLocationId,
                'expected_location_id' => $effectiveLocationId,
                'location_match' => (int)$effectiveLocationId > 0
                    && (int)$effectiveLocationId === (int)$resolvedLocationId,
                'generated_at' => Carbon::now($timezone)->toIso8601String(),
                'authority' => 'Dashboard2 analyticsPayload - safe resolved role location',
            ];
        } catch (\Throwable $error) {
            logger()->warning('PMD role dashboard Dashboard2 adapter failed', [
                'type' => get_class($error),
                'message' => $error->getMessage(),
                'requested_location_id' => $expectedLocationId,
                'expected_location_id' => $effectiveLocationId,
            ]);

            $reports = [];
            foreach ($specs as $key => $spec) {
                $type = is_array($spec)
                    ? (string)($spec['type'] ?? $key)
                    : (string)$key;
                $period = is_array($spec)
                    ? (string)($spec['period'] ?? 'today')
                    : (string)$spec;
                $reports[(string)$key] = $this->emptyReport($type, $period);
            }

            return [
                'reports' => $reports,
                'location_id' => null,
                'requested_location_id' => $expectedLocationId,
                'expected_location_id' => $effectiveLocationId,
                'location_match' => false,
                'generated_at' => Carbon::now('Europe/Berlin')->toIso8601String(),
                'authority' => 'Dashboard2 analyticsPayload - failed safely',
                'error' => 'Dashboard data unavailable',
            ];
        }
    }

    /**
     * PMD_ROLE_EXACT_OWNER_ANALYTICS_V3_4
     *
     * Return the same raw Dashboard2 analytics payload consumed by the exact
     * Dashboard Lab partial/runtime, but pin it to the same safely resolved role
     * location used by bundle(). This lets Manager/Accountant reuse the Owner
     * component itself instead of maintaining a second renderer.
     */
    public function ownerAnalyticsPayload(
        string $requestedPeriod,
        ?int $expectedLocationId = null
    ): array {
        $period = in_array(
            $requestedPeriod,
            ['today', 'week', 'month', 'last30'],
            true
        ) ? $requestedPeriod : 'month';

        $effectiveLocationId = $this->resolveRoleLocationId($expectedLocationId);
        $this->primeLocation($effectiveLocationId);

        if (!$effectiveLocationId || $effectiveLocationId < 1) {
            return [
                'success' => false,
                'version' => 'role-owner-v3.4',
                'period' => $period,
                'timezone' => 'Europe/Berlin',
                'reason' => 'Role dashboard location unavailable after safe resolution',
            ];
        }

        try {
            $source = new class($effectiveLocationId) extends Dashboard2 {
                private ?int $pmdExplicitLocationId = null;

                public function __construct(?int $locationId)
                {
                    $this->pmdExplicitLocationId = ($locationId && $locationId > 0)
                        ? (int)$locationId
                        : null;
                    parent::__construct();
                }

                protected function locationId(): ?int
                {
                    return $this->pmdExplicitLocationId ?: parent::locationId();
                }

                public function pmdRoleOwnerAnalytics(string $period): array
                {
                    return $this->analyticsPayload($period);
                }
            };

            $payload = $source->pmdRoleOwnerAnalytics($period);
            if (!is_array($payload) || ($payload['success'] ?? false) !== true) {
                throw new \RuntimeException(
                    'Dashboard2 exact Owner analytics payload unavailable for '.$period
                );
            }

            $payload['pmd_role_location_id'] = (int)$effectiveLocationId;
            $payload['pmd_role_authority'] = 'Dashboard2 analyticsPayload pinned to role location';
            return $payload;
        } catch (\Throwable $error) {
            logger()->warning('PMD role exact Owner analytics failed', [
                'type' => get_class($error),
                'message' => $error->getMessage(),
                'period' => $period,
                'location_id' => $effectiveLocationId,
            ]);

            return [
                'success' => false,
                'version' => 'role-owner-v3.4',
                'period' => $period,
                'timezone' => 'Europe/Berlin',
                'reason' => 'Dashboard analytics unavailable',
                'pmd_role_location_id' => (int)$effectiveLocationId,
            ];
        }
    }

    public function ownerAnalyticsBootstrap(?int $expectedLocationId = null): array
    {
        $bootstrap = [
            'server_first_paint' => false,
            'periods' => [],
        ];

        foreach (['last30', 'month'] as $period) {
            $payload = $this->ownerAnalyticsPayload($period, $expectedLocationId);
            if (($payload['success'] ?? false) !== true) {
                return $bootstrap;
            }
            $bootstrap['periods'][$period] = $payload;
        }

        $bootstrap['server_first_paint'] = true;
        return $bootstrap;
    }

    /**
     * PMD_DASHBOARD_LAB_SHARED_LOCATION_AUTHORITY_V3_4_3
     *
     * Expose the already-proven safe role location resolver so Dashboard Lab
     * can pin Dashboard2 to the same restaurant when AdminLocation has no
     * current/session value and the user can access multiple locations.
     */
    public function resolveWorkspaceLocation(?int $requestedLocationId = null): ?int
    {
        $locationId = $this->resolveRoleLocationId($requestedLocationId);
        $this->primeLocation($locationId);

        return ($locationId && $locationId > 0) ? (int)$locationId : null;
    }

    private function resolveRoleLocationId(?int $requestedLocationId): ?int
    {
        $candidates = [];

        if ($requestedLocationId && $requestedLocationId > 0) {
            $candidates[] = (int)$requestedLocationId;
        }

        try {
            $current = AdminLocation::current();
            if ($current && (int)$current->location_id > 0) {
                $candidates[] = (int)$current->location_id;
            }
        } catch (\Throwable $error) {
        }

        try {
            $sessionId = (int)AdminLocation::getSession('id');
            if ($sessionId > 0) {
                $candidates[] = $sessionId;
            }
        } catch (\Throwable $error) {
        }

        try {
            $defaultId = (int)params('default_location_id');
            if ($defaultId > 0) {
                $candidates[] = $defaultId;
            }
        } catch (\Throwable $error) {
        }

        foreach (array_values(array_unique($candidates)) as $candidate) {
            if ($this->userCanUseLocation((int)$candidate)) {
                return (int)$candidate;
            }
        }

        $accessibleIds = $this->accessibleLocationIds();
        if (count($accessibleIds) === 1) {
            return (int)$accessibleIds[0];
        }

        if (
            count($accessibleIds) > 1
            && Schema::hasTable('orders')
            && Schema::hasColumn('orders', 'location_id')
        ) {
            $dateColumn = Schema::hasColumn('orders', 'order_date')
                ? 'order_date'
                : (Schema::hasColumn('orders', 'created_at') ? 'created_at' : null);

            if ($dateColumn) {
                $now = Carbon::now('Europe/Berlin');
                $start = $now->copy()->startOfMonth();
                $query = DB::table('orders')
                    ->whereIn('location_id', $accessibleIds);

                if ($dateColumn === 'order_date') {
                    $query->whereBetween(
                        'order_date',
                        [$start->toDateString(), $now->toDateString()]
                    );
                } else {
                    $query->whereBetween(
                        'created_at',
                        [$start->format('Y-m-d H:i:s'), $now->format('Y-m-d H:i:s')]
                    );
                }

                $activeIds = $query
                    ->select('location_id')
                    ->groupBy('location_id')
                    ->pluck('location_id')
                    ->map(fn ($id) => (int)$id)
                    ->filter(fn ($id) => $id > 0)
                    ->unique()
                    ->values()
                    ->all();

                if (count($activeIds) === 1 && $this->userCanUseLocation((int)$activeIds[0])) {
                    return (int)$activeIds[0];
                }
            }
        }

        return null;
    }

    private function accessibleLocationIds(): array
    {
        try {
            $user = AdminAuth::getUser();
            if (!$user || !$user->staff) {
                return [];
            }

            return $user->staff->locations
                ->where('location_status', true)
                ->pluck('location_id')
                ->map(fn ($id) => (int)$id)
                ->filter(fn ($id) => $id > 0)
                ->unique()
                ->values()
                ->all();
        } catch (\Throwable $error) {
            return [];
        }
    }

    private function userCanUseLocation(int $locationId): bool
    {
        if ($locationId < 1) {
            return false;
        }

        try {
            $location = Locations_model::isEnabled()->find($locationId);
            if (!$location) {
                return false;
            }

            $user = AdminAuth::getUser();
            if (!$user) {
                return false;
            }

            return $user->isSuperUser() || $user->hasLocationAccess($location);
        } catch (\Throwable $error) {
            return false;
        }
    }

    private function primeLocation(?int $locationId): void
    {
        if (!$locationId || $locationId < 1) return;

        try {
            $current = AdminLocation::current();
            if ($current && (int)$current->location_id === (int)$locationId) {
                return;
            }
        } catch (\Throwable $error) {
        }

        try {
            $location = Locations_model::isEnabled()->find((int)$locationId);
            if ($location) {
                AdminLocation::setCurrent($location);
            }
        } catch (\Throwable $error) {
        }
    }

    private function report(
        string $type,
        string $period,
        array $payload,
        array $currency,
        string $timezone
    ): array {
        return match ($type) {
            'liveorders' => $this->liveReport($period, $payload, $currency, $timezone),
            'alerts' => $this->alertsReport($period, $payload, $currency, $timezone),
            'hourly' => $this->hourlyReport($period, $payload, $currency, $timezone),
            'topitems' => $this->topItemsReport($period, $payload, $currency, $timezone),
            'reservations' => $this->reservationsReport($period, $payload, $currency, $timezone),
            'reviews' => $this->reviewsReport($period, $payload, $currency, $timezone),
            'sales' => $this->salesReport($period, $payload, $currency, $timezone),
            'payments' => $this->paymentsReport($period, $payload, $currency, $timezone),
            'transactions' => $this->transactionsReport($period, $payload, $currency, $timezone),
            'tips' => $this->tipsReport($period, $payload, $currency, $timezone),
            'channels' => $this->channelsReport($period, $payload, $currency, $timezone),
            default => $this->emptyReport($type, $period),
        };
    }

    private function liveReport(string $period, array $payload, array $currency, string $timezone): array
    {
        $source = is_array($payload['live_operations'] ?? null)
            ? $payload['live_operations']
            : [];
        $rows = [];
        $now = Carbon::now($timezone);

        foreach ((array)($source['orders'] ?? []) as $row) {
            if (!is_array($row)) continue;
            $opened = (string)($row['opened_at'] ?? '');
            $minutes = null;
            if ($opened !== '') {
                try {
                    $minutes = Carbon::parse($opened, $timezone)->diffInMinutes($now);
                } catch (\Throwable $error) {
                }
            }
            $rows[] = [
                'order' => '#'.(int)($row['order_id'] ?? 0),
                'channel' => (string)($row['channel'] ?? ''),
                'status' => (string)($row['status'] ?? 'Open'),
                'opened' => $opened,
                'age_minutes' => $minutes,
            ];
        }

        $tables = is_array($source['tables'] ?? null) ? $source['tables'] : [];
        $count = (int)($source['live_order_count'] ?? count($rows));

        return $this->baseReport('liveorders', $period, $currency, $timezone) + [
            'stats' => [
                $this->stat('Live orders', (string)$count),
                $this->stat('Occupied tables', (string)(int)($tables['occupied'] ?? 0)),
                $this->stat('Enabled tables', (string)(int)($tables['total'] ?? 0)),
            ],
            'chart' => null,
            'rows' => $rows,
            'empty' => $count === 0,
            'source' => (string)($source['source'] ?? 'Dashboard2 live operations'),
            'error' => ($source['available'] ?? true) === false ? 'Source unavailable' : null,
        ];
    }

    private function alertsReport(string $period, array $payload, array $currency, string $timezone): array
    {
        $source = is_array($payload['alerts'] ?? null) ? $payload['alerts'] : [];
        $types = is_array($source['types'] ?? null) ? $source['types'] : [];
        $labels = [
            'failed_payments' => 'Failed payments',
            'refunds' => 'Refunds',
            'long_open_tables' => 'Long-open tables',
            'out_of_stock' => 'Out of stock',
            'negative_reviews' => 'Low reviews',
        ];
        $rows = [];
        $total = 0;

        foreach ($labels as $key => $label) {
            $value = $types[$key] ?? null;
            if (is_numeric($value)) {
                $total += (int)$value;
            }
            if ($value === null || (int)$value <= 0) {
                continue;
            }
            $rows[] = [
                'label' => $label,
                'count' => (int)$value,
            ];
        }

        return $this->baseReport('alerts', $period, $currency, $timezone) + [
            'stats' => [
                $this->stat('Open alerts', (string)$total),
                $this->stat(
                    'Longest open table',
                    isset($source['longest_open_minutes']) && $source['longest_open_minutes'] !== null
                        ? $this->minutes((int)$source['longest_open_minutes'])
                        : '—'
                ),
                $this->stat('Unavailable checks', (string)count((array)($source['unavailable'] ?? []))),
            ],
            'chart' => null,
            'rows' => $rows,
            'empty' => $total === 0,
            'source' => (string)($source['source'] ?? 'Dashboard2 alerts'),
            'error' => ($source['available'] ?? true) === false ? 'Source unavailable' : null,
        ];
    }

    private function hourlyReport(string $period, array $payload, array $currency, string $timezone): array
    {
        $source = is_array($payload['sales_by_hour'] ?? null)
            ? $payload['sales_by_hour']
            : [];
        $rows = [];
        $sales = 0.0;
        $orders = 0;
        $peak = null;

        foreach ((array)($source['hours'] ?? []) as $row) {
            if (!is_array($row)) continue;
            $hour = (int)($row['hour'] ?? 0);
            $rowSales = (float)($row['sales'] ?? 0);
            $rowOrders = (int)($row['orders'] ?? 0);
            $sales += $rowSales;
            $orders += $rowOrders;
            if ($peak === null || $rowOrders > $peak['orders']) {
                $peak = ['hour' => $hour, 'orders' => $rowOrders];
            }
            $rows[] = [
                'hour' => sprintf('%02d:00', $hour),
                'sales_raw' => $rowSales,
                'orders_raw' => $rowOrders,
                'sales' => $this->money($rowSales, $currency),
                'orders' => (string)$rowOrders,
            ];
        }

        return $this->baseReport('hourly', $period, $currency, $timezone) + [
            'stats' => [
                $this->stat('Net sales', $this->money($sales, $currency)),
                $this->stat('Orders', (string)$orders),
                $this->stat(
                    'Peak hour',
                    $peak && $peak['orders'] > 0
                        ? sprintf('%02d:00', $peak['hour'])
                        : '—'
                ),
            ],
            'chart' => [
                'type' => 'bar',
                'labels' => array_column($rows, 'hour'),
                'values' => array_column($rows, 'sales_raw'),
                'manager_values' => array_column($rows, 'orders_raw'),
                'money' => true,
                'currency_symbol' => (string)($currency['symbol'] ?? '€'),
            ],
            'rows' => $rows,
            'empty' => $orders === 0,
            'source' => (string)($source['source'] ?? 'Dashboard2 hourly sales'),
            'error' => ($source['available'] ?? true) === false ? 'Source unavailable' : null,
        ];
    }

    private function topItemsReport(string $period, array $payload, array $currency, string $timezone): array
    {
        $source = is_array($payload['top_items'] ?? null) ? $payload['top_items'] : [];
        $rows = [];
        foreach ((array)($source['items'] ?? []) as $row) {
            if (!is_array($row)) continue;
            $rows[] = [
                'item' => (string)($row['name'] ?? ''),
                'quantity' => (int)($row['quantity'] ?? 0),
                'revenue_raw' => (float)($row['revenue'] ?? 0),
                'revenue' => $this->money((float)($row['revenue'] ?? 0), $currency),
            ];
        }

        return $this->baseReport('topitems', $period, $currency, $timezone) + [
            'stats' => [
                $this->stat('Items sold', (string)array_sum(array_column($rows, 'quantity'))),
                $this->stat('Item revenue', $this->money(array_sum(array_column($rows, 'revenue_raw')), $currency)),
                $this->stat('Top item', (string)($rows[0]['item'] ?? '—')),
            ],
            'chart' => [
                'type' => 'bar',
                'labels' => array_column($rows, 'item'),
                'values' => array_column($rows, 'quantity'),
                'money' => false,
            ],
            'rows' => $rows,
            'empty' => !$rows,
            'source' => (string)($source['source'] ?? 'Dashboard2 top items'),
            'error' => ($source['available'] ?? true) === false ? 'Source unavailable' : null,
        ];
    }

    private function reservationsReport(string $period, array $payload, array $currency, string $timezone): array
    {
        $source = is_array($payload['calendar_events'] ?? null)
            ? $payload['calendar_events']
            : [];
        $rows = [];
        $now = Carbon::now($timezone);

        foreach ((array)($source['events'] ?? []) as $row) {
            if (!is_array($row)) continue;
            $date = (string)($row['date'] ?? $now->toDateString());
            $time = (string)($row['time'] ?? '');
            try {
                $eventAt = Carbon::createFromFormat('Y-m-d H:i', $date.' '.$time, $timezone);
                if ($eventAt->lt($now)) {
                    continue;
                }
            } catch (\Throwable $error) {
            }
            $rows[] = [
                'reservation' => '#'.(int)($row['reservation_id'] ?? 0),
                'date' => $date,
                'time' => $time,
                'guests' => (int)($row['guests'] ?? 0),
                'tables' => (string)($row['table_label'] ?? ''),
                'status' => (string)($row['status'] ?? 'Upcoming'),
            ];
        }

        $guests = array_sum(array_column($rows, 'guests'));

        return $this->baseReport('reservations', $period, $currency, $timezone) + [
            'stats' => [
                $this->stat('Upcoming', (string)count($rows)),
                $this->stat('Guests', (string)$guests),
                $this->stat(
                    'Next reservation',
                    isset($rows[0]) ? $rows[0]['time'] : '—',
                    isset($rows[0]) ? $rows[0]['date'] : ''
                ),
            ],
            'chart' => null,
            'rows' => $rows,
            'empty' => !$rows,
            'source' => (string)($source['source'] ?? 'Dashboard2 calendar events'),
            'error' => ($source['available'] ?? true) === false ? 'Source unavailable' : null,
        ];
    }

    private function reviewsReport(string $period, array $payload, array $currency, string $timezone): array
    {
        $source = is_array($payload['reviews'] ?? null) ? $payload['reviews'] : [];
        $rows = [];
        foreach ((array)($source['latest'] ?? []) as $row) {
            if (!is_array($row)) continue;
            $rows[] = [
                'rating' => isset($row['rating']) && $row['rating'] !== null
                    ? number_format((float)$row['rating'], 1).' / 5'
                    : '—',
                'stars' => (string)($row['stars'] ?? ''),
                'comment' => (string)($row['comment'] ?? ''),
                'date' => (string)($row['date'] ?? ''),
                'time' => (string)($row['time'] ?? ''),
                'status' => (string)($row['status'] ?? ''),
            ];
        }

        return $this->baseReport('reviews', $period, $currency, $timezone) + [
            'stats' => [
                $this->stat('Reviews shown', (string)(int)($source['count'] ?? count($rows))),
                $this->stat(
                    'Average rating',
                    isset($source['average']) && $source['average'] !== null
                        ? number_format((float)$source['average'], 1).' / 5'
                        : '—'
                ),
                $this->stat('Rated reviews', (string)(int)($source['rated_count'] ?? count($rows))),
            ],
            'chart' => null,
            'rows' => $rows,
            'empty' => !$rows,
            'source' => (string)($source['source'] ?? 'Dashboard2 reviews'),
            'error' => ($source['available'] ?? true) === false ? 'Source unavailable' : null,
        ];
    }

    private function salesReport(string $period, array $payload, array $currency, string $timezone): array
    {
        $source = is_array($payload['sales_over_time'] ?? null)
            ? $payload['sales_over_time']
            : [];
        $rows = [];
        $sales = 0.0;
        $orders = 0;

        foreach ((array)($source['buckets'] ?? []) as $row) {
            if (!is_array($row)) continue;
            $rowSales = (float)($row['sales'] ?? 0);
            $rowOrders = (int)($row['orders'] ?? 0);
            $sales += $rowSales;
            $orders += $rowOrders;
            $rows[] = [
                'period' => (string)($row['bucket'] ?? ''),
                'sales_raw' => $rowSales,
                'sales' => $this->money($rowSales, $currency),
                'orders' => $rowOrders,
                'average' => $this->money($rowOrders > 0 ? $rowSales / $rowOrders : 0, $currency),
            ];
        }

        return $this->baseReport('sales', $period, $currency, $timezone) + [
            'stats' => [
                $this->stat('Net sales', $this->money($sales, $currency)),
                $this->stat('Settled orders', (string)$orders),
                $this->stat('Average order', $this->money($orders > 0 ? $sales / $orders : 0, $currency)),
            ],
            'chart' => [
                'type' => 'line',
                'labels' => array_column($rows, 'period'),
                'values' => array_column($rows, 'sales_raw'),
                'money' => true,
                'currency_symbol' => (string)($currency['symbol'] ?? '€'),
            ],
            'rows' => $rows,
            'empty' => $orders === 0,
            'source' => (string)($source['source'] ?? 'Dashboard2 sales over time'),
            'error' => ($source['available'] ?? true) === false ? 'Source unavailable' : null,
        ];
    }

    private function paymentsReport(string $period, array $payload, array $currency, string $timezone): array
    {
        $source = is_array($payload['payment_methods'] ?? null)
            ? $payload['payment_methods']
            : [];
        $rows = [];
        $total = 0.0;
        $transactions = 0;

        foreach ((array)($source['methods'] ?? []) as $row) {
            if (!is_array($row)) continue;
            $value = (float)($row['total'] ?? 0);
            $count = (int)($row['transactions'] ?? 0);
            $total += $value;
            $transactions += $count;
            $rows[] = [
                'method' => (string)($row['method'] ?? ''),
                'total_raw' => $value,
                'total' => $this->money($value, $currency),
                'transactions' => $count,
            ];
        }

        return $this->baseReport('payments', $period, $currency, $timezone) + [
            'stats' => [
                $this->stat('Settled revenue', $this->money($total, $currency)),
                $this->stat('Transactions', (string)$transactions),
                $this->stat('Enabled methods', (string)count($rows)),
            ],
            'chart' => [
                'type' => 'donut',
                'labels' => array_column($rows, 'method'),
                'values' => array_column($rows, 'total_raw'),
                'money' => true,
                'currency_symbol' => (string)($currency['symbol'] ?? '€'),
            ],
            'rows' => $rows,
            'empty' => !$rows,
            'source' => (string)($source['source'] ?? 'Dashboard2 payment methods'),
            'error' => ($source['available'] ?? true) === false ? 'Source unavailable' : null,
        ];
    }

    private function transactionsReport(string $period, array $payload, array $currency, string $timezone): array
    {
        $source = is_array($payload['recent_transactions'] ?? null)
            ? $payload['recent_transactions']
            : [];
        $rows = [];
        $gross = 0.0;
        foreach ((array)($source['transactions'] ?? []) as $row) {
            if (!is_array($row)) continue;
            $amount = (float)($row['amount'] ?? 0);
            $gross += $amount;
            $rows[] = [
                'order' => '#'.(int)($row['order_id'] ?? 0),
                'method' => (string)($row['method'] ?? ''),
                'amount_raw' => $amount,
                'amount' => $this->money($amount, $currency),
                'status' => (string)($row['status'] ?? 'paid'),
                'timestamp' => (string)($row['timestamp'] ?? ''),
            ];
        }

        return $this->baseReport('transactions', $period, $currency, $timezone) + [
            'stats' => [
                $this->stat('Rows shown', (string)count($rows)),
                $this->stat('Gross settled', $this->money($gross, $currency)),
                $this->stat('Net sales', $this->money($gross, $currency)),
            ],
            'chart' => null,
            'rows' => $rows,
            'empty' => !$rows,
            'source' => (string)($source['source'] ?? 'Dashboard2 recent transactions'),
            'error' => ($source['available'] ?? true) === false ? 'Source unavailable' : null,
        ];
    }

    private function tipsReport(string $period, array $payload, array $currency, string $timezone): array
    {
        $source = is_array($payload['tips'] ?? null) ? $payload['tips'] : [];
        $month = (float)($source['month'] ?? 0);
        $today = (float)($source['today'] ?? 0);
        $average = (float)($source['average_tip'] ?? 0);
        $count = (int)($source['tipped_orders'] ?? 0);

        return $this->baseReport('tips', $period, $currency, $timezone) + [
            'stats' => [
                $this->stat('Tips', $this->money($month, $currency)),
                $this->stat('Tipped orders', (string)$count),
                $this->stat('Average tip', $this->money($average, $currency)),
                $this->stat('Tips today', $this->money($today, $currency)),
            ],
            'chart' => null,
            'rows' => [],
            'empty' => $count === 0,
            'source' => (string)($source['source'] ?? 'Dashboard2 tips'),
            'error' => ($source['available'] ?? true) === false ? 'Source unavailable' : null,
        ];
    }

    private function channelsReport(string $period, array $payload, array $currency, string $timezone): array
    {
        $source = is_array($payload['channels'] ?? null) ? $payload['channels'] : [];
        $rows = [];
        $totalRevenue = 0.0;
        $totalOrders = 0;
        foreach ((array)($source['channels'] ?? []) as $row) {
            if (!is_array($row)) continue;
            $revenue = (float)($row['revenue'] ?? 0);
            $orders = (int)($row['orders'] ?? 0);
            $totalRevenue += $revenue;
            $totalOrders += $orders;
            $rows[] = [
                'channel' => (string)($row['channel'] ?? $row['name'] ?? ''),
                'revenue_raw' => $revenue,
                'revenue' => $this->money($revenue, $currency),
                'orders' => $orders,
            ];
        }

        return $this->baseReport('channels', $period, $currency, $timezone) + [
            'stats' => [
                $this->stat('Net sales', $this->money($totalRevenue, $currency)),
                $this->stat('Orders', (string)$totalOrders),
                $this->stat('Channels', (string)count($rows)),
            ],
            'chart' => [
                'type' => 'donut',
                'labels' => array_column($rows, 'channel'),
                'values' => array_column($rows, 'revenue_raw'),
                'money' => true,
                'currency_symbol' => (string)($currency['symbol'] ?? '€'),
            ],
            'rows' => $rows,
            'empty' => !$rows,
            'source' => (string)($source['source'] ?? 'Dashboard2 order channels'),
            'error' => ($source['available'] ?? true) === false ? 'Source unavailable' : null,
        ];
    }

    private function baseReport(string $type, string $period, array $currency, string $timezone): array
    {
        return [
            'type' => $type,
            'period' => $period,
            'period_label' => $period,
            'url' => $this->reportUrl($type),
            'currency' => $currency,
            'timezone' => $timezone,
        ];
    }

    private function emptyReport(string $type, string $period): array
    {
        return $this->baseReport(
            $type,
            $period,
            ['code' => 'EUR', 'symbol' => '€'],
            'Europe/Berlin'
        ) + [
            'stats' => [],
            'chart' => null,
            'rows' => [],
            'empty' => true,
            'source' => 'Dashboard2 source unavailable',
            'error' => 'Source unavailable',
        ];
    }

    private function reportUrl(string $type): string
    {
        return match ($type) {
            'channels' => admin_url('pmdreportchannels'),
            'tips' => admin_url('pmdreporttips'),
            default => admin_url('pmdreports/'.$type),
        };
    }

    private function stat(string $label, string $value, string $meta = ''): array
    {
        return compact('label', 'value', 'meta');
    }

    private function money(float $value, array $currency): string
    {
        $symbol = trim((string)($currency['symbol'] ?? '€')) ?: '€';
        if ($this->locale === 'de') {
            return number_format($value, 2, ',', '.').' '.$symbol;
        }
        return $symbol.number_format($value, 2, '.', ',');
    }

    private function minutes(int $minutes): string
    {
        $minutes = max(0, $minutes);
        if ($minutes < 60) return $minutes.' min';
        $hours = intdiv($minutes, 60);
        $rest = $minutes % 60;
        return $rest ? $hours.'h '.$rest.'m' : $hours.'h';
    }
}
