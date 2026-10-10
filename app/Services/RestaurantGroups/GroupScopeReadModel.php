<?php

namespace App\Services\RestaurantGroups;

use Carbon\Carbon;

final class GroupScopeReadModel
{
    public function __construct(
        private Store $store,
        private Auth $auth,
        private Snapshot $snapshot
    ) {}

    public function dashboard(string $scope, string $period): array
    {
        $context = $this->snapshot->context();
        $ids = $this->scopeIds($scope, $context);
        $base = $this->snapshot->snapshot($scope, $period);
        $details = [];
        $floorSites = [];
        $series = [];
        $payments = [];
        $hourly = [];
        $categories = [];
        $guests = 0;
        $dineIn = 0;
        $takeaway = 0;
        $turnoverSeconds = 0;
        $turnoverSamples = 0;

        foreach ($ids as $tenantId) {
            $label = $this->label($tenantId, $context);

            // R22: Floor discovery is intentionally independent of settlement
            // reporting. A missing historical clock must not leave the signed-in
            // restaurant's operational cards under a different site label.
            try {
                $floorSites[] = $this->readOnlyFloorSite($tenantId, $label, $context);
            } catch (\Throwable $floorError) {
                $floorSites[] = [
                    'tenant_id' => $tenantId,
                    'label' => $label,
                    'available' => false,
                    'message' => $floorError instanceof \DomainException
                        ? $floorError->getMessage()
                        : 'Restaurant floor data is unavailable.',
                    'tables' => [],
                ];
            }

            try {
                $extra = $this->dashboardSite($tenantId, $period);
                $extra['tenant_id'] = $tenantId;
                $extra['label'] = $label;
                $details[] = $extra;

                if (!empty($extra['available'])) {
                    $guests += (int)($extra['guests'] ?? 0);
                    $dineIn += (int)($extra['channels']['dine_in'] ?? 0);
                    $takeaway += (int)($extra['channels']['takeaway'] ?? 0);

                    foreach ((array)($extra['payments'] ?? []) as $method => $count) {
                        $payments[$method] = ($payments[$method] ?? 0) + (int)$count;
                    }

                    $turnoverSeconds += (int)($extra['turnover_seconds_total'] ?? 0);
                    $turnoverSamples += (int)($extra['turnover_samples'] ?? 0);

                    $currency = (string)($extra['currency'] ?? 'EUR');
                    foreach ((array)($extra['sales_series'] ?? []) as $bucket => $amount) {
                        $series[$currency][$bucket] = round(
                            (float)($series[$currency][$bucket] ?? 0) + (float)$amount,
                            2
                        );
                    }
                    foreach ((array)($extra['sales_by_hour'] ?? []) as $bucket => $amount) {
                        $hourly[$currency][$bucket] = round(
                            (float)($hourly[$currency][$bucket] ?? 0) + (float)$amount,
                            2
                        );
                    }
                    foreach ((array)($extra['category_sales'] ?? []) as $category => $amount) {
                        $categories[$currency][$category] = round(
                            (float)($categories[$currency][$category] ?? 0) + (float)$amount,
                            2
                        );
                    }
                }
            } catch (\Throwable $error) {
                $details[] = [
                    'tenant_id' => $tenantId,
                    'label' => $label,
                    'available' => false,
                    'message' => $error instanceof \DomainException
                        ? $error->getMessage()
                        : 'Dashboard data is unavailable for this restaurant.',
                ];
            }
        }

        foreach ($series as &$currencySeries) {
            ksort($currencySeries);
        }
        unset($currencySeries);
        foreach ($hourly as &$currencyHourly) {
            ksort($currencyHourly);
        }
        unset($currencyHourly);
        foreach ($categories as &$currencyCategories) {
            arsort($currencyCategories);
        }
        unset($currencyCategories);
        arsort($payments);

        return $base + [
            'scope_label' => $scope === 'all'
                ? 'All restaurants'
                : $this->label((int)$ids[0], $context),
            // R22: read-only native Floor projection, not an operational
            // cross-tenant login or an editable dashboard replacement.
            'floor' => ['read_only' => true, 'restaurants' => $floorSites],
            'dashboard' => [
                'guests' => $guests,
                'turnover_minutes' => $turnoverSamples > 0
                    ? round(($turnoverSeconds / $turnoverSamples) / 60, 1)
                    : null,
                'turnover_samples' => $turnoverSamples,
                'channels' => ['dine_in' => $dineIn, 'takeaway' => $takeaway],
                'payment_methods' => $payments,
                'sales_series' => $series,
                'sales_by_hour' => $hourly,
                'category_sales' => $categories,
                'restaurants' => $details,
            ],
        ];
    }

    public function menu(string $scope): array
    {
        $context = $this->snapshot->context();
        $ids = $this->scopeIds($scope, $context);
        $locations = [];

        foreach ($ids as $tenantId) {
            $this->store->access((int)$context['owner']['id'], $tenantId);
            $site = $this->store->site($tenantId);
            PublicationRules::member($site, (int)$context['group']['id']);

            $db = $this->store->connection($tenantId);
            $schema = $db->getSchemaBuilder();

            if (!$schema->hasTable('menus')) {
                $locations[] = [
                    'tenant_id' => $tenantId,
                    'label' => $this->label($tenantId, $context),
                    'available' => false,
                    'message' => 'Menu storage is unavailable.',
                    'items' => [],
                ];
                continue;
            }

            $columns = array_flip($schema->getColumnListing('menus'));
            foreach (['menu_id', 'menu_name'] as $required) {
                if (!isset($columns[$required])) {
                    throw new \DomainException('Menu schema is incomplete.');
                }
            }

            $select = ['menu_id', 'menu_name'];
            foreach (['menu_price', 'menu_status', 'is_stock_out'] as $optional) {
                if (isset($columns[$optional])) $select[] = $optional;
            }

            $rows = $db->table('menus')
                ->orderBy('menu_name')
                ->limit(500)
                ->get($select);

            $categories = [];
            if (
                $rows->isNotEmpty()
                && $schema->hasTable('menu_categories')
                && $schema->hasTable('categories')
            ) {
                $menuIds = $rows->pluck('menu_id')->map(static fn ($id) => (int)$id)->all();
                $categoryColumns = array_flip($schema->getColumnListing('categories'));
                $pivotColumns = array_flip($schema->getColumnListing('menu_categories'));

                if (
                    isset($categoryColumns['category_id'], $categoryColumns['name'])
                    && isset($pivotColumns['menu_id'], $pivotColumns['category_id'])
                ) {
                    foreach (
                        $db->table('menu_categories as mc')
                            ->join('categories as c', 'c.category_id', '=', 'mc.category_id')
                            ->whereIn('mc.menu_id', $menuIds)
                            ->get(['mc.menu_id', 'c.name'])
                        as $row
                    ) {
                        $categories[(int)$row->menu_id][] = (string)$row->name;
                    }
                }
            }

            $items = [];
            foreach ($rows as $row) {
                $items[] = [
                    'id' => (int)$row->menu_id,
                    'name' => (string)$row->menu_name,
                    'price' => isset($row->menu_price) ? (string)$row->menu_price : null,
                    'published' => !isset($row->menu_status) || (bool)$row->menu_status,
                    'stock_out' => isset($row->is_stock_out) && (bool)$row->is_stock_out,
                    'categories' => $categories[(int)$row->menu_id] ?? [],
                ];
            }

            $locations[] = [
                'tenant_id' => $tenantId,
                'label' => $this->label($tenantId, $context),
                'available' => true,
                'items' => $items,
            ];
        }

        return [
            'ok' => true,
            'scope' => $scope,
            'scope_label' => $scope === 'all'
                ? 'All restaurants'
                : $this->label((int)$ids[0], $context),
            'current_tenant_id' => (int)$context['current_tenant_id'],
            'read_only' => $scope === 'all'
                || (int)$ids[0] !== (int)$context['current_tenant_id'],
            'locations' => $locations,
        ];
    }

    private function dashboardSite(int $tenantId, string $period): array
    {
        $owner = $this->auth->owner(true);
        $this->store->access((int)$owner->id, $tenantId);
        $site = $this->store->site($tenantId);
        $db = $this->store->connection($tenantId);
        $schema = $db->getSchemaBuilder();

        if (!$schema->hasTable('orders')) {
            return ['available' => false, 'message' => 'Order storage is unavailable.'];
        }

        $columns = array_flip($schema->getColumnListing('orders'));
        foreach (['order_id', 'location_id', 'processed'] as $required) {
            if (!isset($columns[$required])) {
                return ['available' => false, 'message' => 'Dashboard order schema is incomplete.'];
            }
        }

        $profile = app(ReportingProfile::class)->resolve(
            $db,
            $this->store->tenant($tenantId),
            (int)$site->location_id
        );
        $range = ReportingProfile::range(
            $period,
            $profile['timezone'],
            $profile['storage_timezone'],
            time()
        );

        $dateColumn = isset($columns['settled_at'])
            ? 'settled_at'
            : (isset($columns['processed_at']) ? 'processed_at' : (isset($columns['updated_at']) ? 'updated_at' : 'created_at'));
        if (!isset($columns[$dateColumn])) {
            return ['available' => false, 'message' => 'Dashboard date source is unavailable.'];
        }

        $amountColumn = isset($columns['settled_amount'])
            ? 'settled_amount'
            : (isset($columns['order_total']) ? 'order_total' : (isset($columns['total']) ? 'total' : null));
        $guestColumn = null;
        foreach (['guest_num', 'guest_count', 'covers', 'party_size'] as $candidate) {
            if (isset($columns[$candidate])) { $guestColumn = $candidate; break; }
        }
        $paymentColumn = null;
        foreach (['settlement_method', 'payment', 'payment_code'] as $candidate) {
            if (isset($columns[$candidate])) { $paymentColumn = $candidate; break; }
        }

        $select = ['order_id', $dateColumn];
        foreach (array_filter([
            $amountColumn,
            $guestColumn,
            $paymentColumn,
            isset($columns['order_type']) ? 'order_type' : null,
            isset($columns['created_at']) ? 'created_at' : null,
            isset($columns['settled_at']) ? 'settled_at' : null,
        ]) as $column) {
            if (!in_array($column, $select, true)) $select[] = $column;
        }

        $query = $db->table('orders')
            ->where('location_id', (int)$site->location_id)
            ->where('processed', 1)
            ->where($dateColumn, '>=', $range['from'])
            ->where($dateColumn, '<', $range['until']);

        if (isset($columns['settlement_status'])) {
            $query->whereIn('settlement_status', ['paid', 'settled']);
        }

        $guests = 0;
        $channels = ['dine_in' => 0, 'takeaway' => 0];
        $payments = [];
        $seriesMinor = [];
        $hourlyMinor = [];
        $turnoverSecondsTotal = 0;
        $turnoverSamples = 0;
        $orderIds = [];

        $query->select($select)->orderBy('order_id')->chunkById(
            500,
            function ($orders) use (
                $profile,
                $dateColumn,
                $amountColumn,
                $guestColumn,
                $paymentColumn,
                &$guests,
                &$channels,
                &$payments,
                &$seriesMinor,
                &$hourlyMinor,
                &$turnoverSecondsTotal,
                &$turnoverSamples,
                &$orderIds
            ) {
                foreach ($orders as $order) {
                    if (count($orderIds) < 5000) $orderIds[] = (int)$order->order_id;
                    if ($guestColumn) $guests += max(0, (int)($order->{$guestColumn} ?? 0));

                    $type = strtolower(trim((string)($order->order_type ?? '')));
                    if (in_array($type, ['collection', 'takeaway', 'take-away', 'pickup'], true)) {
                        $channels['takeaway']++;
                    } elseif (!in_array($type, ['delivery', 'cashier'], true)) {
                        $channels['dine_in']++;
                    }

                    if ($paymentColumn) {
                        $payment = trim((string)($order->{$paymentColumn} ?? ''));
                        if ($payment !== '') $payments[$payment] = ($payments[$payment] ?? 0) + 1;
                    }

                    if ($amountColumn) {
                        try {
                            $at = Carbon::parse((string)$order->{$dateColumn}, $profile['storage_timezone'])
                                ->setTimezone($profile['timezone']);
                            $minor = ReportMath::minor((string)($order->{$amountColumn} ?? '0'), $profile['decimals']);
                            $bucket = $at->format('Y-m-d');
                            $seriesMinor[$bucket] = ReportMath::add($seriesMinor[$bucket] ?? 0, $minor);
                            $hour = $at->format('H:00');
                            $hourlyMinor[$hour] = ReportMath::add($hourlyMinor[$hour] ?? 0, $minor);
                        } catch (\Throwable $ignored) {
                        }
                    }

                    if (
                        isset($order->created_at, $order->settled_at)
                        && !in_array($type, ['delivery', 'collection', 'takeaway', 'take-away', 'pickup', 'cashier'], true)
                    ) {
                        try {
                            $opened = Carbon::parse((string)$order->created_at, $profile['storage_timezone']);
                            $closed = Carbon::parse((string)$order->settled_at, $profile['storage_timezone']);
                            $seconds = $closed->timestamp - $opened->timestamp;
                            if ($seconds >= 60 && $seconds <= 43200) {
                                $turnoverSecondsTotal += $seconds;
                                $turnoverSamples++;
                            }
                        } catch (\Throwable $ignored) {
                        }
                    }
                }
            },
            'order_id'
        );

        $series = [];
        foreach ($seriesMinor as $bucket => $minor) {
            $series[$bucket] = (float)ReportMath::decimal($minor, $profile['decimals']);
        }
        ksort($series);

        $hourly = [];
        foreach ($hourlyMinor as $bucket => $minor) {
            $hourly[$bucket] = (float)ReportMath::decimal($minor, $profile['decimals']);
        }
        ksort($hourly);
        arsort($payments);

        $categorySales = [];
        if (
            $orderIds
            && $schema->hasTable('order_menus')
            && $schema->hasTable('menu_categories')
            && $schema->hasTable('categories')
        ) {
            $itemColumns = array_flip($schema->getColumnListing('order_menus'));
            $pivotColumns = array_flip($schema->getColumnListing('menu_categories'));
            $categoryColumns = array_flip($schema->getColumnListing('categories'));

            if (
                isset($itemColumns['order_id'], $itemColumns['menu_id'])
                && isset($pivotColumns['menu_id'], $pivotColumns['category_id'])
                && isset($categoryColumns['category_id'], $categoryColumns['name'])
            ) {
                $menuCategory = [];
                foreach (
                    $db->table('menu_categories as mc')
                        ->join('categories as c', 'c.category_id', '=', 'mc.category_id')
                        ->orderBy('c.name')
                        ->get(['mc.menu_id', 'c.name'])
                    as $relation
                ) {
                    $menuId = (int)$relation->menu_id;
                    if (!isset($menuCategory[$menuId])) $menuCategory[$menuId] = (string)$relation->name;
                }

                $itemSelect = ['order_id', 'menu_id'];
                foreach (['subtotal', 'price', 'quantity'] as $column) {
                    if (isset($itemColumns[$column])) $itemSelect[] = $column;
                }

                foreach (
                    $db->table('order_menus')
                        ->whereIn('order_id', array_values(array_unique($orderIds)))
                        ->get($itemSelect)
                    as $item
                ) {
                    $category = $menuCategory[(int)$item->menu_id] ?? 'Uncategorised';
                    $amount = isset($item->subtotal)
                        ? (string)$item->subtotal
                        : (string)((float)($item->price ?? 0) * (float)($item->quantity ?? 1));
                    try {
                        $minor = ReportMath::minor($amount, $profile['decimals']);
                        $categorySales[$category] = ReportMath::add($categorySales[$category] ?? 0, $minor);
                    } catch (\Throwable $ignored) {
                    }
                }
            }
        }

        foreach ($categorySales as $category => $minor) {
            $categorySales[$category] = (float)ReportMath::decimal($minor, $profile['decimals']);
        }
        arsort($categorySales);

        return [
            'available' => true,
            'currency' => (string)$profile['currency'],
            'timezone' => (string)$profile['timezone'],
            'guests' => $guests,
            'turnover_seconds_total' => $turnoverSecondsTotal,
            'turnover_samples' => $turnoverSamples,
            'channels' => $channels,
            'payments' => $payments,
            'sales_series' => $series,
            'sales_by_hour' => $hourly,
            'category_sales' => $categorySales,
        ];
    }

    /**
     * R22: bounded, tenant-isolated Floor projection for an authorized Group
     * Owner. Never include guest/order/customer data, remote action URLs or
     * table IDs usable for writes. Occupancy is not claimed without an
     * explicit operational status; native reservations may further constrain
     * availability and are deliberately not inferred here.
     */
    private function readOnlyFloorSite(int $tenantId, string $label, array $context): array
    {
        $this->store->access((int)$context['owner']['id'], $tenantId);
        $site = $this->store->site($tenantId);
        PublicationRules::member($site, (int)$context['group']['id']);
        $db = $this->store->connection($tenantId);
        $schema = $db->getSchemaBuilder();
        if (!$schema->hasTable('tables')) {
            return ['tenant_id'=>$tenantId, 'label'=>$label, 'available'=>false,
                'message'=>'Restaurant table storage is unavailable.', 'tables'=>[]];
        }

        $columns = array_flip($schema->getColumnListing('tables'));
        if (!isset($columns['table_id'])) {
            return ['tenant_id'=>$tenantId, 'label'=>$label, 'available'=>false,
                'message'=>'Restaurant table schema is incomplete.', 'tables'=>[]];
        }

        $query = $db->table('tables');
        if (isset($columns['location_id'])) {
            $query->where('location_id', (int)$site->location_id);
        } else {
            // TastyIgniter normally attaches tables through polymorphic
            // locationables, not a location_id column on "tables".
            // Only use all tables when this tenant has ONE location; never
            // accidentally expose another location within the same DB.
            $mapped = false;
            if ($schema->hasTable('locationables')) {
                $rel = array_flip($schema->getColumnListing('locationables'));
                if (isset($rel['location_id'], $rel['locationable_type'], $rel['locationable_id'])) {
                    $ids = $db->table('locationables')
                        ->where('location_id', (int)$site->location_id)
                        ->whereIn('locationable_type', ['tables', 'Admin\\Models\\Tables_model'])
                        ->pluck('locationable_id')->map(static fn ($value) => (int)$value)
                        ->filter()->unique()->values()->all();
                    if ($ids) {
                        $query->whereIn('table_id', $ids);
                        $mapped = true;
                    } elseif ($db->table('locationables')
                        ->whereIn('locationable_type', ['tables', 'Admin\\Models\\Tables_model'])
                        ->exists()) {
                        $query->whereRaw('1 = 0');
                        $mapped = true;
                    }
                }
            }
            if (!$mapped && $schema->hasTable('location_tables')) {
                $rel = array_flip($schema->getColumnListing('location_tables'));
                if (isset($rel['location_id'], $rel['table_id'])) {
                    $ids = $db->table('location_tables')
                        ->where('location_id', (int)$site->location_id)
                        ->pluck('table_id')->map(static fn ($value) => (int)$value)
                        ->filter()->unique()->values()->all();
                    if ($ids) {
                        $query->whereIn('table_id', $ids);
                        $mapped = true;
                    }
                }
            }
            if (!$mapped) {
                if (!$schema->hasTable('locations')
                    || (int)$db->table('locations')->count() !== 1) {
                    return ['tenant_id'=>$tenantId, 'label'=>$label, 'available'=>false,
                        'message'=>'Table location mapping cannot be verified.', 'tables'=>[]];
                }
            }
        }

        $nameColumn = isset($columns['table_name']) ? 'table_name'
            : (isset($columns['table_no']) ? 'table_no' : 'table_id');
        $fields = ['table_id', $nameColumn];
        if (isset($columns['table_no']) && !in_array('table_no', $fields, true)) $fields[] = 'table_no';
        if (isset($columns['operational_status'])) $fields[] = 'operational_status';
        if (isset($columns['table_status'])) $fields[] = 'table_status';
        $records = $query->orderBy('table_id')->limit(251)->get($fields);
        $statusAllowed = ['occupied', 'reserved', 'cleaning', 'attention', 'disabled'];
        $tables = [];
        foreach ($records->take(250) as $row) {
            $status = strtolower(trim((string)($row->operational_status ?? '')));
            if (isset($columns['table_status']) && !(bool)($row->table_status ?? true)) {
                $status = 'disabled';
            }
            // "available" does not prove absence of a simultaneous booking.
            // Show it neutrally until a reservation-aware remote state exists.
            if (!in_array($status, $statusAllowed, true)) $status = 'unknown';
            $number = trim((string)($row->table_no ?? ''));
            $name = trim((string)($row->{$nameColumn} ?? ''));
            if (in_array(strtolower($name), ['cashier','delivery'], true)) continue;
            $tables[] = [
                'number' => mb_substr($number !== '' ? $number : $name, 0, 50),
                'name' => mb_substr($name !== '' ? $name : $number, 0, 100),
                'status' => $status,
            ];
        }
        return [
            'tenant_id' => $tenantId,
            'label' => $label,
            'available' => true,
            'read_only' => true,
            'tables' => $tables,
            'truncated' => $records->count() > 250,
        ];
    }

    private function scopeIds(string $scope, array $context): array
    {
        $allowed = array_map('intval', array_column($context['sites'], 'tenant_id'));

        if ($scope === 'all') return $allowed;

        $tenantId = PublicationRules::numericId($scope);
        if (!in_array($tenantId, $allowed, true)) {
            throw new \DomainException('Restaurant access denied.');
        }

        return [$tenantId];
    }

    private function label(int $tenantId, array $context): string
    {
        foreach ($context['sites'] as $site) {
            if ((int)$site['tenant_id'] === $tenantId) return (string)$site['label'];
        }

        return 'Restaurant '.$tenantId;
    }
}
