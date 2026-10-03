<?php

namespace App\Services\RestaurantGroups;

final class FoodCourtQueue
{
    public function __construct(private Store $store)
    {
    }

    public function feed(object $display): array
    {
        $group = $this->store->group((int)$display->group_id);
        if ($group->type !== 'food_court' || $group->status !== 'active') {
            throw new \DomainException('This pickup display is not active.');
        }

        $tenantIds = json_decode((string)$display->tenant_ids, true);
        if (!is_array($tenantIds)) $tenantIds = [];

        $items = [];

        foreach (array_map('intval', $tenantIds) as $tenantId) {
            try {
                $site = $this->store->site($tenantId);
                if ((int)$site->group_id !== (int)$group->id || $site->state !== 'ready') continue;

                $db = $this->store->connection($tenantId, true);
                if (!$db->getSchemaBuilder()->hasTable('orders')) continue;

                $columns = $db->getSchemaBuilder()->getColumnListing('orders');
                $query = $db->table('orders')
                    ->where('location_id', (int)$site->location_id);

                // Pickup is an operational view. Limit it to recent orders so
                // completed historical tickets cannot reappear on a venue display.
                if (in_array('created_at', $columns, true)) {
                    $query->where(
                        'orders.created_at',
                        '>=',
                        now()->subHours(18)->format('Y-m-d H:i:s')
                    );
                }

                if (in_array('status_id', $columns, true) && $db->getSchemaBuilder()->hasTable('statuses')) {
                    $query->leftJoin('statuses as pmd_queue_status', 'pmd_queue_status.status_id', '=', 'orders.status_id')
                        ->whereRaw("LOWER(COALESCE(pmd_queue_status.status_name,'')) NOT REGEXP 'cancel|refund|failed|void'");
                }

                $select = ['orders.order_id'];
                foreach (['order_id', 'order_time', 'created_at', 'order_type', 'order_status'] as $column) {
                    if ($column !== 'order_id' && in_array($column, $columns, true)) $select[] = 'orders.'.$column;
                }
                if (in_array('status_id', $columns, true) && $db->getSchemaBuilder()->hasTable('statuses')) {
                    $select[] = 'pmd_queue_status.status_name';
                }

                foreach ($query->orderByDesc('orders.order_id')->limit(100)->get($select) as $order) {
                    $status = strtolower(trim((string)($order->status_name ?? $order->order_status ?? 'preparing')));
                    $displayStatus = str_contains($status, 'ready')
                        || str_contains($status, 'complete')
                        ? 'ready'
                        : 'preparing';

                    $items[] = [
                        'tenant_id' => $tenantId,
                        'restaurant' => (string)$site->label,
                        'order' => (string)$order->order_id,
                        'status' => $displayStatus,
                        'created_at' => (string)($order->created_at ?? $order->order_time ?? ''),
                    ];
                }
            } catch (\Throwable $error) {
                logger()->warning('PMD food court queue location unavailable', [
                    'tenant_id' => $tenantId,
                    'error' => $error->getMessage(),
                ]);
            }
        }

        usort($items, static function ($left, $right) {
            return strcmp((string)$left['created_at'], (string)$right['created_at']);
        });

        return [
            'ok' => true,
            'group' => [
                'name' => (string)$group->name,
                'type' => (string)$group->type,
            ],
            'orders' => array_slice($items, 0, 150),
            'generated_at' => now()->toIso8601String(),
        ];
    }
}
