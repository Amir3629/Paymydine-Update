<?php

namespace App\Services\RestaurantGroups;

use Carbon\Carbon;

final class Snapshot
{
    public function __construct(
        private Store $store,
        private Auth $auth
    ) {
    }

    public function context(): array
    {
        $owner = $this->auth->owner(true);
        $currentTenantId = $this->store->currentTenantId();
        $currentSite = $this->store->site($currentTenantId);
        $group = $this->store->group((int)$currentSite->group_id);

        $sites = array_values(array_filter(
            $this->store->sitesForOwner((int)$owner->id),
            static fn ($site) => (int)$site['group_id'] === (int)$group->id
        ));

        return [
            'enabled' => true,
            'owner' => [
                'id' => (int)$owner->id,
                'name' => (string)$owner->name,
                'username' => (string)$owner->username,
            ],
            'group' => [
                'id' => (int)$group->id,
                'uuid' => (string)$group->uuid,
                'name' => (string)$group->name,
                'type' => (string)$group->type,
            ],
            'current_tenant_id' => $currentTenantId,
            'sites' => $sites,
            'capabilities' => [
                'aggregate_dashboard' => count($sites) > 1,
                'publish' => count(array_filter($sites, static fn ($site) => !empty($site['can_publish']))) > 1,
                'food_court_queue' => $group->type === 'food_court',
            ],
        ];
    }

    public function snapshot(string $scope = 'all', string $period = 'today'): array
    {
        $context = $this->context();
        $allowed = array_column($context['sites'], 'tenant_id');

        if ($scope !== 'all') {
            if (!ctype_digit((string)$scope) || !in_array((int)$scope, array_map('intval', $allowed), true)) {
                throw new \DomainException('Location access denied.');
            }
            $allowed = [(int)$scope];
        }

        $rows = [];
        foreach ($allowed as $tenantId) {
            $this->store->access((int)$context['owner']['id'], (int)$tenantId);
            $rows[] = $this->siteSnapshot((int)$tenantId, $period);
        }

        $currencies = [];
        foreach ($rows as $row) {
            if (!empty($row['currency'])) $currencies[$row['currency']] = true;
        }

        $totals = [];
        foreach ($rows as $row) {
            $currency = (string)$row['currency'];
            if (!isset($totals[$currency])) {
                $totals[$currency] = [
                    'currency' => $currency,
                    'revenue' => 0.0,
                    'tips' => 0.0,
                    'orders' => 0,
                    'guests' => 0,
                    'dine_in' => 0,
                    'takeaway' => 0,
                    'delivery' => 0,
                    'locations' => 0,
                ];
            }

            foreach (['revenue', 'tips'] as $metric) {
                $totals[$currency][$metric] += (float)($row[$metric] ?? 0);
            }

            foreach (['orders', 'guests', 'dine_in', 'takeaway', 'delivery'] as $metric) {
                $totals[$currency][$metric] += (int)($row[$metric] ?? 0);
            }

            $totals[$currency]['locations']++;
        }

        foreach ($totals as &$total) {
            $total['average_order'] = $total['orders'] > 0
                ? round($total['revenue'] / $total['orders'], 2)
                : null;
        }
        unset($total);

        $weightedTurnoverMinutes = 0.0;
        $weightedTurnoverCount = 0;
        foreach ($rows as $row) {
            if ($row['turnover_minutes'] !== null && $row['turnover_samples'] > 0) {
                $weightedTurnoverMinutes += $row['turnover_minutes'] * $row['turnover_samples'];
                $weightedTurnoverCount += $row['turnover_samples'];
            }
        }

        return [
            'ok' => true,
            'scope' => $scope,
            'period' => $period,
            'mixed_currency' => count($currencies) > 1,
            'totals' => array_values($totals),
            'turnover_minutes' => $weightedTurnoverCount > 0
                ? round($weightedTurnoverMinutes / $weightedTurnoverCount, 1)
                : null,
            'locations' => $rows,
            'generated_at' => now()->toIso8601String(),
        ];
    }

    private function siteSnapshot(int $tenantId, string $period): array
    {
        $site = $this->store->site($tenantId);
        $db = $this->store->connection($tenantId, true);
        $schema = $db->getSchemaBuilder();

        $location = $db->table('locations')
            ->where('location_id', (int)$site->location_id)
            ->first();

        $timezone = $this->validTimezone(
            (string)($location->location_timezone ?? $location->timezone ?? '')
        ) ?: 'UTC';

        $currency = strtoupper(trim((string)($location->location_currency ?? '')));
        if ($currency === '' && $schema->hasTable('settings')) {
            $raw = $db->table('settings')
                ->whereIn('item', ['default_currency_code', 'currency_code'])
                ->orderByRaw("FIELD(item, 'default_currency_code', 'currency_code')")
                ->value('value');
            $currency = strtoupper(trim($this->settingString($raw)));
        }
        if ($currency === '') $currency = 'EUR';

        [$start, $end] = $this->period($period, $timezone);

        $result = [
            'tenant_id' => $tenantId,
            'location_id' => (int)$site->location_id,
            'label' => (string)$site->label,
            'domain' => (string)$this->store->tenant($tenantId)->domain,
            'timezone' => $timezone,
            'currency' => $currency,
            'revenue' => 0.0,
            'tips' => 0.0,
            'orders' => 0,
            'guests' => 0,
            'dine_in' => 0,
            'takeaway' => 0,
            'delivery' => 0,
            'turnover_minutes' => null,
            'turnover_samples' => 0,
            'occupancy_percent' => null,
            'menu_available' => null,
            'menu_total' => null,
        ];

        if (!$schema->hasTable('orders')) return $result;

        $columns = $schema->getColumnListing('orders');
        if (!in_array('location_id', $columns, true)) return $result;

        $dateColumn = in_array('settled_at', $columns, true)
            ? 'settled_at'
            : (in_array('updated_at', $columns, true) ? 'updated_at' : null);

        if (!$dateColumn) return $result;

        $orders = $db->table('orders')
            ->where('location_id', (int)$site->location_id)
            ->whereBetween($dateColumn, [
                $start->format('Y-m-d H:i:s'),
                $end->format('Y-m-d H:i:s'),
            ]);

        if (in_array('processed', $columns, true)) $orders->where('processed', 1);
        if (in_array('settlement_status', $columns, true)) {
            $orders->whereIn(
                $db->raw('LOWER(settlement_status)'),
                ['paid', 'settled']
            );
        }

        $rows = $orders->get();
        $result['orders'] = $rows->count();

        $guestColumn = null;
        foreach (['guest_num', 'guest_count', 'covers', 'party_size'] as $candidate) {
            if (in_array($candidate, $columns, true)) {
                $guestColumn = $candidate;
                break;
            }
        }

        foreach ($rows as $order) {
            if (in_array('settled_amount', $columns, true)) {
                $result['revenue'] += max(0, (float)$order->settled_amount);
            }

            if ($guestColumn) {
                $result['guests'] += max(0, (int)$order->{$guestColumn});
            }

            $orderType = strtolower(trim((string)($order->order_type ?? '')));
            if (str_contains($orderType, 'deliver')) {
                $result['delivery']++;
            } elseif (
                str_contains($orderType, 'collect')
                || str_contains($orderType, 'take')
                || str_contains($orderType, 'pickup')
            ) {
                $result['takeaway']++;
            } else {
                $result['dine_in']++;
            }
        }

        if (
            $schema->hasTable('order_totals')
            && in_array('order_id', $columns, true)
            && $schema->hasColumn('order_totals', 'order_id')
            && $schema->hasColumn('order_totals', 'code')
            && $schema->hasColumn('order_totals', 'value')
        ) {
            $ids = $rows->pluck('order_id')->filter()->all();
            if ($ids) {
                $result['tips'] = (float)$db->table('order_totals')
                    ->whereIn('order_id', $ids)
                    ->whereRaw('LOWER(code) = ?', ['tip'])
                    ->sum('value');
            }
        }

        if (
            in_array('created_at', $columns, true)
            && in_array('settled_at', $columns, true)
        ) {
            $minutes = [];
            foreach ($rows as $order) {
                if (empty($order->created_at) || empty($order->settled_at)) continue;
                try {
                    $created = Carbon::parse($order->created_at, $timezone);
                    $settled = Carbon::parse($order->settled_at, $timezone);
                    $diff = $created->diffInSeconds($settled, false) / 60;
                    if ($diff >= 0 && $diff <= 1440) $minutes[] = $diff;
                } catch (\Throwable $ignored) {
                }
            }
            if ($minutes) {
                $result['turnover_samples'] = count($minutes);
                $result['turnover_minutes'] = round(array_sum($minutes) / count($minutes), 1);
            }
        }

        if ($schema->hasTable('tables')) {
            $tableIds = $db->table('locationables')
                ->where('location_id', (int)$site->location_id)
                ->whereIn('locationable_type', ['tables', 'Admin\\Models\\Tables_model'])
                ->pluck('locationable_id');

            $tableColumns = $schema->getColumnListing('tables');
            if ($tableIds->isNotEmpty()) {
                $tableQuery = $db->table('tables')->whereIn('table_id', $tableIds);
                if (in_array('table_status', $tableColumns, true)) $tableQuery->where('table_status', 1);
                $tables = $tableQuery->get();
                $total = $tables->count();

                if ($total > 0) {
                    $occupied = $tables->filter(function ($table) {
                        $status = strtolower(trim((string)(
                            $table->operational_status
                            ?? $table->status
                            ?? ''
                        )));
                        return in_array($status, ['occupied', 'reserved', 'cleaning'], true);
                    })->count();

                    $result['occupancy_percent'] = round(($occupied / $total) * 100, 1);
                }
            }
        }

        if ($schema->hasTable('menus')) {
            $menuQuery = $db->table('menus');
            if ($schema->hasColumn('menus', 'menu_status')) $menuQuery->where('menu_status', 1);
            $result['menu_total'] = $menuQuery->count();

            $available = clone $menuQuery;
            if ($schema->hasColumn('menus', 'is_stock_out')) $available->where('is_stock_out', 0);
            $result['menu_available'] = $available->count();
        }

        $result['revenue'] = round($result['revenue'], 2);
        $result['tips'] = round($result['tips'], 2);

        return $result;
    }

    private function period(string $period, string $timezone): array
    {
        $now = Carbon::now($timezone);

        return match ($period) {
            'week' => [$now->copy()->startOfWeek(), $now->copy()],
            'month' => [$now->copy()->startOfMonth(), $now->copy()],
            'last30' => [$now->copy()->subDays(29)->startOfDay(), $now->copy()],
            default => [$now->copy()->startOfDay(), $now->copy()],
        };
    }

    private function validTimezone(string $value): ?string
    {
        if ($value === '') return null;
        try {
            new \DateTimeZone($value);
            return $value;
        } catch (\Throwable $error) {
            return null;
        }
    }

    private function settingString($value): string
    {
        if (!is_string($value)) return '';

        $decoded = @unserialize($value);
        if (is_string($decoded)) return $decoded;

        $json = json_decode($value, true);
        if (is_string($json)) return $json;

        return trim($value, "\"'");
    }
}
