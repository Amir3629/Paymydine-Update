<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/** PMD_TABLE_DISPLAY_V1 */
final class PmdTableDisplayService
{
    private const AGGREGATE = 'table_display';
    private const PAYMENT_REQUEST = 'table_display.payment_requested';

    public function previewPayload(?int $selectedTableId = null): array
    {
        $tables = $this->tables();
        if (!$selectedTableId) $selectedTableId = (int)($tables[0]['id'] ?? 0);

        return [
            'tables' => $tables,
            'selected_table_id' => $selectedTableId,
            'selected' => $selectedTableId > 0 ? $this->state($selectedTableId) : null,
            'state_url' => admin_url('pmddevices/tabledisplaystate'),
            'restaurant' => $this->restaurantIdentity(),
        ];
    }

    public function tables(): array
    {
        if (!Schema::hasTable('tables')) return [];

        $query = DB::table('tables');
        if (Schema::hasColumn('tables', 'floor_name')) $query->orderBy('floor_name');
        if (Schema::hasColumn('tables', 'table_no')) $query->orderBy('table_no');
        $rows = $query->orderBy('table_id')->get();
        $locations = $this->locationMap(
            $rows->pluck('table_id')->map(fn ($id) => (int)$id)->filter()->all()
        );

        $out = [];
        foreach ($rows as $row) {
            $id = (int)($row->table_id ?? 0);
            if ($id < 1) continue;
            $name = trim((string)($row->table_name ?? ''));
            if (in_array(strtolower($name), ['cashier', 'delivery'], true)) continue;
            $number = trim((string)($row->table_no ?? '')) ?: (string)$id;
            $out[] = [
                'id' => $id,
                'number' => $number,
                'name' => $name ?: 'Table '.$number,
                'floor' => trim((string)($row->floor_name ?? '')),
                'section' => trim((string)($row->table_section ?? '')),
                'enabled' => !Schema::hasColumn('tables', 'table_status') || (bool)($row->table_status ?? true),
                'location_id' => (int)($locations[$id] ?? 1),
            ];
        }
        return $out;
    }

    public function state(int $tableId): array
    {
        $table = $this->tableRow($tableId);
        if (!$table) abort(404, 'Table not found.');

        $locationId = $this->locationId($tableId);
        $number = $this->tableNumber($table);
        $menuUrl = $this->menuUrl($table, $locationId, $number);
        $enabled = !Schema::hasColumn('tables', 'table_status') || (bool)($table->table_status ?? true);
        $order = $this->latestOrder($tableId);
        $waiterCall = $this->latestWaiterCall($tableId);
        $displayEvent = $this->latestPaymentRequest($locationId, $tableId);

        return [
            'ok' => true,
            'server_time' => now()->toIso8601String(),
            'table' => [
                'id' => $tableId,
                'number' => $number,
                'name' => trim((string)($table->table_name ?? '')) ?: 'Table '.$number,
                'floor' => trim((string)($table->floor_name ?? '')),
                'section' => trim((string)($table->table_section ?? '')),
                'enabled' => $enabled,
                'location_id' => $locationId,
                'menu_url' => $menuUrl,
                'qr_image_url' => $menuUrl === '' ? '' : 'https://api.qrserver.com/v1/create-qr-code/?size=420x420&margin=18&ecc=H&format=png&data='.urlencode($menuUrl),
            ],
            'restaurant' => $this->restaurantIdentity($locationId),
            'order' => $order,
            'waiter_call' => $waiterCall,
            'event' => $this->resolveEvent($enabled, $order, $waiterCall, $displayEvent),
        ];
    }

    /** Publish a waiter -> table-display card handoff. This does not settle money. */
    public function requestCardPayment(
        int $orderId,
        ?int $userId = null,
        ?int $staffId = null,
        ?int $expectedLocationId = null
    ): array {
        if (!Schema::hasTable('orders')) abort(503, 'Order storage is unavailable.');
        if (!Schema::hasTable('pmd_sync_events') || !Schema::hasTable('pmd_sync_aggregate_versions')) {
            abort(503, 'PayMyDine device sync storage is not ready.');
        }

        $order = DB::table('orders')->where('order_id', $orderId)->first();
        if (!$order) abort(404, 'Order not found.');

        $tableId = $this->orderTableId($order);
        $table = $this->tableRow($tableId);
        if ($tableId < 1 || !$table) abort(422, 'This order is not attached to a restaurant table.');
        if (Schema::hasColumn('tables', 'table_status') && !(bool)($table->table_status ?? false)) {
            abort(422, 'This table is currently unavailable.');
        }

        $total = max(0.0, (float)($order->order_total ?? 0));
        $settled = max(0.0, (float)($order->settled_amount ?? 0));
        $remaining = round(max(0.0, $total - $settled), 2);
        if ($remaining <= 0.0001) abort(422, 'This order is already fully paid.');

        $locationId = max(1, (int)($order->location_id ?? $this->locationId($tableId)));
        if ($expectedLocationId && $expectedLocationId !== $locationId) {
            abort(403, 'This order belongs to another restaurant location.');
        }

        $eventId = (string)Str::uuid();
        $expiresAt = now()->addMinutes(5);
        $currency = $this->currencyCode();

        DB::transaction(function () use ($locationId, $tableId, $orderId, $remaining, $currency, $eventId, $expiresAt, $userId, $staffId) {
            $aggregateId = (string)$tableId;
            DB::table('pmd_sync_aggregate_versions')->insertOrIgnore([
                'location_id' => $locationId,
                'aggregate' => self::AGGREGATE,
                'aggregate_id' => $aggregateId,
                'version' => 0,
                'updated_at' => now(),
            ]);

            $versionRow = DB::table('pmd_sync_aggregate_versions')
                ->where('location_id', $locationId)
                ->where('aggregate', self::AGGREGATE)
                ->where('aggregate_id', $aggregateId)
                ->lockForUpdate()->first();
            if (!$versionRow) throw new \RuntimeException('Table display event version could not be locked.');

            $version = (int)$versionRow->version + 1;
            DB::table('pmd_sync_aggregate_versions')->where('id', (int)$versionRow->id)->update([
                'version' => $version,
                'updated_at' => now(),
            ]);

            DB::table('pmd_sync_events')->insert([
                'event_id' => $eventId,
                'location_id' => $locationId,
                'device_id' => null,
                'user_id' => $userId ?: null,
                'staff_id' => $staffId ?: null,
                'aggregate' => self::AGGREGATE,
                'aggregate_id' => $aggregateId,
                'aggregate_version' => $version,
                'event_type' => self::PAYMENT_REQUEST,
                'payload' => json_encode([
                    'table_id' => $tableId,
                    'order_id' => $orderId,
                    'amount' => $remaining,
                    'currency' => $currency,
                    'headline' => 'Ready for card payment',
                    'message' => 'Tap or insert your card to complete payment.',
                    'expires_at' => $expiresAt->toIso8601String(),
                ], JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE),
                'occurred_at' => now(),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        });

        return [
            'ok' => true,
            'event_id' => $eventId,
            'table_id' => $tableId,
            'order_id' => $orderId,
            'amount' => $remaining,
            'currency' => $currency,
            'expires_at' => $expiresAt->toIso8601String(),
            'message' => 'Card payment requested on the table display.',
        ];
    }

    private function resolveEvent(bool $enabled, ?array $order, ?array $waiterCall, ?array $displayEvent): array
    {
        if (!$enabled) return $this->event('table_unavailable', 'Table unavailable', 'Please ask a team member for assistance.', now()->toIso8601String());

        $events = [];
        if ($displayEvent) $events[] = $displayEvent;
        if ($order && !empty($order['settled_at']) && $this->recent($order['settled_at'], 45)) {
            $events[] = $this->event('payment_success', 'Payment approved', 'Thank you for visiting us.', $order['settled_at'], [
                'order_id' => $order['id'], 'amount' => $order['settled_amount'], 'currency' => $this->currencyCode(),
            ]);
        }
        if ($order && !empty($order['created_at']) && $this->recent($order['created_at'], 35)) {
            $events[] = $this->event('order_received', 'Order received', 'Sent to the kitchen.', $order['created_at'], ['order_id' => $order['id']]);
        }
        if ($waiterCall && !empty($waiterCall['created_at']) && $this->recent($waiterCall['created_at'], 35)) {
            $events[] = $this->event('waiter_call', 'A team member is on the way', 'We have notified the restaurant team.', $waiterCall['created_at']);
        }
        if (!$events) return $this->event('idle', 'Scan to order', '', null);

        usort($events, fn ($a, $b) => strcmp((string)($b['occurred_at'] ?? ''), (string)($a['occurred_at'] ?? '')));
        return $events[0];
    }

    private function event(string $type, string $headline, string $message, ?string $occurredAt, array $extra = []): array
    {
        return array_merge([
            'type' => $type,
            'key' => $type.'-'.($occurredAt ?: 'idle'),
            'headline' => $headline,
            'message' => $message,
            'occurred_at' => $occurredAt,
        ], $extra);
    }

    private function latestOrder(int $tableId): ?array
    {
        if (!Schema::hasTable('orders')) return null;
        $q = DB::table('orders');
        if (Schema::hasColumn('orders', 'table_id')) $q->where('table_id', $tableId);
        else $q->where(fn ($x) => $x->where('order_type', (string)$tableId)->orWhere('order_type', 'Table '.$tableId));
        $row = $q->orderByDesc('order_id')->first();
        if (!$row) return null;

        $total = max(0.0, (float)($row->order_total ?? 0));
        $settled = max(0.0, (float)($row->settled_amount ?? 0));
        return [
            'id' => (int)($row->order_id ?? 0),
            'total' => round($total, 2),
            'settled_amount' => round($settled, 2),
            'remaining_amount' => round(max(0, $total - $settled), 2),
            'created_at' => $this->iso($row->created_at ?? null),
            'updated_at' => $this->iso($row->updated_at ?? null),
            'settled_at' => $this->iso($row->settled_at ?? null),
        ];
    }

    private function latestWaiterCall(int $tableId): ?array
    {
        /*
         * PMD_TABLE_DISPLAY_V1_1
         * Tenant notification schemas are not perfectly uniform: newer
         * restaurants use notification_id while some older tenant databases
         * still expose id (or only created_at). Never assume one primary-key
         * name just to paint a guest-facing reaction.
         */
        if (!Schema::hasTable('notifications')) return null;
        if (
            !Schema::hasColumn('notifications', 'table_id')
            || !Schema::hasColumn('notifications', 'type')
        ) {
            return null;
        }

        $query = DB::table('notifications')
            ->where('table_id', $tableId)
            ->where('type', 'waiter_call');

        $idColumn = null;
        foreach (['notification_id', 'id'] as $candidate) {
            if (Schema::hasColumn('notifications', $candidate)) {
                $idColumn = $candidate;
                break;
            }
        }

        if ($idColumn !== null) {
            $query->orderByDesc($idColumn);
        } elseif (Schema::hasColumn('notifications', 'created_at')) {
            $query->orderByDesc('created_at');
        }

        $row = $query->first();
        if (!$row) return null;

        return [
            'id' => $idColumn !== null ? (int)($row->{$idColumn} ?? 0) : 0,
            'created_at' => $this->iso($row->created_at ?? null),
        ];
    }

    private function latestPaymentRequest(int $locationId, int $tableId): ?array
    {
        if (!Schema::hasTable('pmd_sync_events')) return null;
        $row = DB::table('pmd_sync_events')->where('location_id', $locationId)
            ->where('aggregate', self::AGGREGATE)->where('aggregate_id', (string)$tableId)
            ->where('event_type', self::PAYMENT_REQUEST)->orderByDesc('sequence')->first();
        if (!$row) return null;

        $payload = json_decode((string)($row->payload ?? '{}'), true) ?: [];
        try {
            if (!empty($payload['expires_at']) && now()->greaterThanOrEqualTo(Carbon::parse($payload['expires_at']))) return null;
        } catch (\Throwable $ignored) { return null; }

        return $this->event('payment_requested', (string)($payload['headline'] ?? 'Ready for card payment'), (string)($payload['message'] ?? 'Tap or insert your card to complete payment.'), $this->iso($row->occurred_at ?? $row->created_at ?? null), [
            'order_id' => (int)($payload['order_id'] ?? 0),
            'amount' => round((float)($payload['amount'] ?? 0), 2),
            'currency' => (string)($payload['currency'] ?? $this->currencyCode()),
        ]);
    }

    private function tableRow(int $tableId)
    {
        return $tableId > 0 && Schema::hasTable('tables') ? DB::table('tables')->where('table_id', $tableId)->first() : null;
    }

    private function orderTableId($order): int
    {
        $id = (int)($order->table_id ?? 0);
        if ($id > 0) return $id;
        $raw = trim((string)($order->order_type ?? ''));
        if (ctype_digit($raw)) return (int)$raw;
        if (preg_match('/^table\s+(\d+)$/i', $raw, $m) && Schema::hasTable('tables')) {
            return (int)DB::table('tables')->where('table_no', (string)(int)$m[1])->value('table_id');
        }
        return 0;
    }

    private function locationMap(array $tableIds): array
    {
        if (!$tableIds || !Schema::hasTable('locationables')) return [];
        try {
            return DB::table('locationables')->whereIn('locationable_type', ['tables', 'Admin\\Models\\Tables_model'])
                ->whereIn('locationable_id', $tableIds)->pluck('location_id', 'locationable_id')
                ->mapWithKeys(fn ($location, $table) => [(int)$table => (int)$location])->all();
        } catch (\Throwable $ignored) { return []; }
    }

    private function locationId(int $tableId): int
    {
        $map = $this->locationMap([$tableId]);
        return max(1, (int)($map[$tableId] ?? 1));
    }

    private function tableNumber($table): string
    {
        return trim((string)($table->table_no ?? '')) ?: (string)(int)($table->table_id ?? 0);
    }

    private function menuUrl($table, int $locationId, string $number): string
    {
        $updated = now();
        try { if (!empty($table->updated_at)) $updated = Carbon::parse($table->updated_at); } catch (\Throwable $ignored) {}
        return rtrim(request()->getSchemeAndHttpHost(), '/').'/table/'.rawurlencode($number).'?'.http_build_query([
            'location' => $locationId,
            'guest' => max(1, (int)($table->max_capacity ?? 1)),
            'date' => $updated->format('Y-m-d'),
            'time' => $updated->format('H:i'),
            'qr' => trim((string)($table->qr_code ?? '')) ?: null,
            'table' => $number,
        ]);
    }

    private function restaurantIdentity(?int $locationId = null): array
    {
        $get = function (string $key) {
            try { return Schema::hasTable('settings') ? DB::table('settings')->where('item', $key)->value('value') : null; }
            catch (\Throwable $ignored) { return null; }
        };

        $name = trim((string)($get('pmd_restaurant_identity_name') ?: $get('site_name') ?: ''));
        if ($name === '' && $locationId && Schema::hasTable('locations')) {
            try { $name = trim((string)DB::table('locations')->where('location_id', $locationId)->value('location_name')); }
            catch (\Throwable $ignored) {}
        }

        /*
         * PMD_TABLE_DISPLAY_RESTAURANT_IDENTITY_V3
         * Use the restaurant's canonical uploaded identity logo. Tenant
         * settings may store either a full URL, /uploads/... or a bare media
         * filename, so normalize it exactly like the table QR studio does.
         */
        $logo = trim((string)($get('pmd_restaurant_identity_logo') ?: $get('site_logo') ?: ''));
        if ($logo === '') {
            $logo = '/brand/paymydine-logo.svg';
        } elseif (!preg_match('#^https?://#i', $logo)) {
            $logoPath = '/'.ltrim(
                str_replace('\\\\', '/', (string)(parse_url($logo, PHP_URL_PATH) ?: $logo)),
                '/'
            );

            if (
                str_starts_with($logoPath, '/api/media/')
                || str_starts_with($logoPath, '/assets/media/')
                || str_starts_with($logoPath, '/brand/')
            ) {
                $logo = $logoPath;
            } elseif (str_starts_with($logoPath, '/uploads/')) {
                $logo = '/assets/media'.$logoPath;
            } else {
                $logo = '/api/media/'.basename($logoPath);
            }
        }

        return [
            'name' => $name ?: 'PayMyDine',
            'logo' => $logo,
        ];
    }

    private function currencyCode(): string
    {
        try {
            $value = function_exists('currency') ? strtoupper(trim((string)currency()->getDefault()->currency_code)) : 'EUR';
            return preg_match('/^[A-Z]{3}$/', $value) ? $value : 'EUR';
        } catch (\Throwable $ignored) { return 'EUR'; }
    }

    private function iso($value): ?string
    {
        if (!$value) return null;
        try { return Carbon::parse($value)->toIso8601String(); } catch (\Throwable $ignored) { return null; }
    }

    private function recent($value, int $seconds): bool
    {
        try { return $value && Carbon::parse($value)->greaterThanOrEqualTo(now()->subSeconds($seconds)); }
        catch (\Throwable $ignored) { return false; }
    }
}
