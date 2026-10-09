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
        $series = [];
        $payments = [];
        $guests = 0;
        $dineIn = 0;
        $takeaway = 0;

        foreach ($ids as $tenantId) {
            $label = $this->label($tenantId, $context);

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

                    $currency = (string)($extra['currency'] ?? 'EUR');
                    foreach ((array)($extra['sales_series'] ?? []) as $bucket => $amount) {
                        $series[$currency][$bucket] = round(
                            (float)($series[$currency][$bucket] ?? 0) + (float)$amount,
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
        arsort($payments);

        return $base + [
            'scope_label' => $scope === 'all'
                ? 'All restaurants'
                : $this->label((int)$ids[0], $context),
            'dashboard' => [
                'guests' => $guests,
                'channels' => ['dine_in' => $dineIn, 'takeaway' => $takeaway],
                'payment_methods' => $payments,
                'sales_series' => $series,
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
        foreach (array_filter([$amountColumn, $guestColumn, $paymentColumn, isset($columns['order_type']) ? 'order_type' : null]) as $column) {
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
                &$seriesMinor
            ) {
                foreach ($orders as $order) {
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
                            $bucket = $at->format('Y-m-d');
                            $seriesMinor[$bucket] = ReportMath::add(
                                $seriesMinor[$bucket] ?? 0,
                                ReportMath::minor((string)($order->{$amountColumn} ?? '0'), $profile['decimals'])
                            );
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
        arsort($payments);

        return [
            'available' => true,
            'currency' => (string)$profile['currency'],
            'timezone' => (string)$profile['timezone'],
            'guests' => $guests,
            'channels' => $channels,
            'payments' => $payments,
            'sales_series' => $series,
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
