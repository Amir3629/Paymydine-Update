<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * Server-side Kitchen ETA lifecycle authority.
 *
 * Browser/KDS clients only display this state. KDS status history remains the
 * workflow authority; this service records timing/ETA facts around it.
 */
class PmdKitchenEtaLifecycleService
{
    private const EXTEND_CHECK_MINUTES = 5;
    private const DEFAULT_EXTENSION_MINUTES = 10;
    private const DEFAULT_EXTENSION_CAP = 2;

    public function ready(): bool
    {
        return Schema::hasTable('orders')
            && Schema::hasColumn('orders', 'kitchen_released_at')
            && Schema::hasColumn('orders', 'kitchen_preparing_at')
            && Schema::hasColumn('orders', 'kitchen_ready_at')
            && Schema::hasColumn('orders', 'eta_initial_minutes')
            && Schema::hasColumn('orders', 'eta_due_at')
            && Schema::hasColumn('orders', 'eta_extension_count');
    }

    public function releaseOrder(int $orderId, ?array $items = null, ?int $locationId = null, string $reason = 'kitchen_release'): array
    {
        if ($orderId < 1 || !$this->ready()) return $this->emptyState();

        return DB::transaction(function () use ($orderId, $items, $locationId, $reason) {
            $order = DB::table('orders')->where('order_id', $orderId)->lockForUpdate()->first();
            if (!$order) return $this->emptyState();

            $locationId = max(1, (int)($locationId ?: ($order->location_id ?? 1)));
            $releasedAt = !empty($order->kitchen_released_at)
                ? Carbon::parse($order->kitchen_released_at)
                : now();

            $updates = [];
            $firstRelease = empty($order->kitchen_released_at);
            if ($firstRelease) $updates['kitchen_released_at'] = $releasedAt;

            $initial = max(0, (int)($order->eta_initial_minutes ?? 0));
            $dueAt = !empty($order->eta_due_at) ? Carbon::parse($order->eta_due_at) : null;
            $calculation = null;

            if ($initial < 1 || !$dueAt) {
                $items = $items ?: $this->loadOrderItems($orderId);
                $calculation = OrderEtaService::calculate($items, $locationId, [
                    'exclude_order_id' => $orderId,
                ]);
                $initial = max(1, (int)($calculation['eta_minutes'] ?? 15));
                $dueAt = $releasedAt->copy()->addMinutes($initial);
                $updates['eta_initial_minutes'] = $initial;
                $updates['estimated_prep_minutes'] = $initial;
                $updates['eta_due_at'] = $dueAt;
                $updates['eta_extension_count'] = max(0, (int)($order->eta_extension_count ?? 0));
            } elseif ((int)($order->estimated_prep_minutes ?? 0) < 1) {
                $updates['estimated_prep_minutes'] = $initial;
            }

            if ($updates) {
                $updates['updated_at'] = now();
                DB::table('orders')->where('order_id', $orderId)->update($updates);
            }

            if ($firstRelease || $calculation !== null) {
                $this->recordEvent($orderId, $locationId, 'initial', $reason, null, $initial, 0, [
                    'calculation' => $calculation,
                    'workforce' => app(PmdKitchenWorkforceService::class)->snapshot($locationId),
                ]);
            }

            $fresh = DB::table('orders')
                ->leftJoin('statuses', 'orders.status_id', '=', 'statuses.status_id')
                ->where('orders.order_id', $orderId)
                ->first(['orders.*', 'statuses.status_name']);

            return $this->formatState($fresh);
        });
    }

    /**
     * Reconcile an order when staff append/send additional food after the
     * original kitchen release. The original ETA remains immutable for
     * analytics; the current due time may only move later when the new food
     * needs more time than remains on the existing promise.
     */
    public function onItemsSent(int $orderId, array $items, ?int $locationId = null, string $reason = 'items_added'): array
    {
        if ($orderId < 1 || !$this->ready()) return $this->emptyState();

        $current = DB::table('orders')
            ->leftJoin('statuses', 'orders.status_id', '=', 'statuses.status_id')
            ->where('orders.order_id', $orderId)
            ->first(['orders.*', 'statuses.status_name']);
        if (!$current) return $this->emptyState();

        if (empty($current->kitchen_released_at)) {
            return $this->releaseOrder($orderId, $items, $locationId, $reason);
        }
        if (!empty($current->kitchen_ready_at) || $this->isTerminalKitchenStatus($this->statusName($current))) {
            return $this->formatState($current);
        }

        return DB::transaction(function () use ($orderId, $items, $locationId, $reason) {
            $order = DB::table('orders')
                ->leftJoin('statuses', 'orders.status_id', '=', 'statuses.status_id')
                ->where('orders.order_id', $orderId)
                ->lockForUpdate()
                ->first(['orders.*', 'statuses.status_name']);
            if (!$order) return $this->emptyState();
            if (!empty($order->kitchen_ready_at) || $this->isTerminalKitchenStatus($this->statusName($order))) {
                return $this->formatState($order);
            }

            $locationId = max(1, (int)($locationId ?: ($order->location_id ?? 1)));
            $calculation = OrderEtaService::calculate($items ?: $this->loadOrderItems($orderId), $locationId, [
                'exclude_order_id' => $orderId,
            ]);
            $fromNow = max(1, (int)($calculation['eta_minutes'] ?? 15));
            $candidateDue = now()->addMinutes($fromNow);
            $currentDue = !empty($order->eta_due_at) ? Carbon::parse($order->eta_due_at) : null;

            if (!$currentDue || $candidateDue->greaterThan($currentDue)) {
                $released = Carbon::parse($order->kitchen_released_at);
                $previous = max(1, (int)($order->estimated_prep_minutes ?? $order->eta_initial_minutes ?? 1));
                $newTotal = max(1, (int)ceil($released->diffInSeconds($candidateDue) / 60));
                $delta = $currentDue
                    ? max(0, (int)ceil($currentDue->diffInSeconds($candidateDue, false) / 60))
                    : max(0, $newTotal - $previous);

                DB::table('orders')->where('order_id', $orderId)->update([
                    'estimated_prep_minutes' => $newTotal,
                    'eta_due_at' => $candidateDue,
                    'updated_at' => now(),
                ]);

                $this->recordEvent($orderId, $locationId, 'adjust', $reason, $previous, $newTotal, $delta, [
                    'calculation' => $calculation,
                    'added_items' => array_values($items),
                ]);
            }

            $fresh = DB::table('orders')
                ->leftJoin('statuses', 'orders.status_id', '=', 'statuses.status_id')
                ->where('orders.order_id', $orderId)
                ->first(['orders.*', 'statuses.status_name']);
            return $this->formatState($fresh);
        });
    }

    public function onKitchenStatus(int $orderId, string $statusName): array
    {
        $normalized = strtolower(trim($statusName));
        if ($orderId < 1 || !$this->ready()) return $this->emptyState();

        if (str_contains($normalized, 'received')) {
            return $this->releaseOrder($orderId, null, null, 'kds_received');
        }

        if (str_contains($normalized, 'prepar')) {
            $this->releaseOrder($orderId, null, null, 'kds_preparing_recovery');
            return DB::transaction(function () use ($orderId) {
                $order = DB::table('orders')->where('order_id', $orderId)->lockForUpdate()->first();
                if (!$order) return $this->emptyState();
                if (empty($order->kitchen_preparing_at)) {
                    DB::table('orders')->where('order_id', $orderId)->update([
                        'kitchen_preparing_at' => now(),
                        'updated_at' => now(),
                    ]);
                    $this->recordEvent(
                        $orderId,
                        max(1, (int)($order->location_id ?? 1)),
                        'preparing',
                        'kds_card_tap',
                        (int)($order->estimated_prep_minutes ?? 0) ?: null,
                        (int)($order->estimated_prep_minutes ?? 0) ?: null,
                        0,
                        []
                    );
                }
                return $this->stateForOrder($orderId, false);
            });
        }

        if (str_contains($normalized, 'delivery') || str_contains($normalized, 'ready')) {
            return DB::transaction(function () use ($orderId) {
                $order = DB::table('orders')->where('order_id', $orderId)->lockForUpdate()->first();
                if (!$order) return $this->emptyState();

                if (empty($order->kitchen_released_at)) {
                    // Recovery only: lifecycle must never have Ready without release.
                    DB::table('orders')->where('order_id', $orderId)->update([
                        'kitchen_released_at' => $order->created_at ?: now(),
                        'updated_at' => now(),
                    ]);
                    $order->kitchen_released_at = $order->created_at ?: now();
                }

                if (empty($order->kitchen_ready_at)) {
                    $readyAt = now();
                    DB::table('orders')->where('order_id', $orderId)->update([
                        'kitchen_ready_at' => $readyAt,
                        'updated_at' => now(),
                    ]);
                    $this->recordEvent(
                        $orderId,
                        max(1, (int)($order->location_id ?? 1)),
                        'ready',
                        'kds_ready',
                        (int)($order->estimated_prep_minutes ?? 0) ?: null,
                        (int)($order->estimated_prep_minutes ?? 0) ?: null,
                        0,
                        [
                            'queue_delay_minutes' => $this->minutesBetween($order->kitchen_released_at, $order->kitchen_preparing_at),
                            'active_prep_minutes' => $this->minutesBetween($order->kitchen_preparing_at, $readyAt),
                            'total_kitchen_minutes' => $this->minutesBetween($order->kitchen_released_at, $readyAt),
                        ]
                    );
                }
                return $this->stateForOrder($orderId, false);
            });
        }

        if (str_contains($normalized, 'cancel') || str_contains($normalized, 'void')) {
            try {
                $order = DB::table('orders')->where('order_id', $orderId)->first();
                if ($order && Schema::hasTable('pmd_order_eta_events')) {
                    $exists = DB::table('pmd_order_eta_events')
                        ->where('order_id', $orderId)
                        ->where('event_type', 'cancelled')
                        ->exists();
                    if (!$exists) {
                        $this->recordEvent(
                            $orderId,
                            max(1, (int)($order->location_id ?? 1)),
                            'cancelled',
                            'kds_cancelled',
                            (int)($order->estimated_prep_minutes ?? 0) ?: null,
                            null,
                            0,
                            []
                        );
                    }
                }
            } catch (\Throwable $error) {
                \Log::warning('PMD_ETA_CANCEL_EVENT_FAILED', ['order_id' => $orderId, 'message' => $error->getMessage()]);
            }
        }

        return $this->stateForOrder($orderId, false);
    }

    public function stateForOrder($orderOrId, bool $reconcile = true): array
    {
        if (!$this->ready()) return $this->emptyState();

        $order = is_object($orderOrId) ? $orderOrId : null;
        $orderId = $order ? (int)($order->order_id ?? 0) : (int)$orderOrId;
        if ($orderId < 1) return $this->emptyState();

        // Reconciliation must use fresh database state. Callers often hold an
        // order object captured before payment release or a KDS status change.
        if (!$order || $reconcile || !isset($order->status_name)) {
            $order = DB::table('orders')
                ->leftJoin('statuses', 'orders.status_id', '=', 'statuses.status_id')
                ->where('orders.order_id', $orderId)
                ->first(['orders.*', 'statuses.status_name']);
        }
        if (!$order) return $this->emptyState();

        if ($reconcile && $this->shouldReconcile($order)) {
            return $this->reconcile($orderId);
        }

        return $this->formatState($order);
    }

    public function reconcile(int $orderId): array
    {
        if ($orderId < 1 || !$this->ready()) return $this->emptyState();

        return DB::transaction(function () use ($orderId) {
            $order = DB::table('orders')
                ->leftJoin('statuses', 'orders.status_id', '=', 'statuses.status_id')
                ->where('orders.order_id', $orderId)
                ->lockForUpdate()
                ->first(['orders.*', 'statuses.status_name']);
            if (!$order) return $this->emptyState();

            if ($this->isTerminalKitchenStatus($this->statusName($order)) || !empty($order->kitchen_ready_at)) {
                return $this->formatState($order);
            }
            if (empty($order->kitchen_released_at) || empty($order->eta_due_at)) {
                return $this->formatState($order);
            }

            $due = Carbon::parse($order->eta_due_at);
            $remainingSeconds = now()->diffInSeconds($due, false);
            if ($remainingSeconds > self::EXTEND_CHECK_MINUTES * 60) {
                return $this->formatState($order);
            }

            $cap = $this->extensionCap();
            $count = max(0, (int)($order->eta_extension_count ?? 0));
            if ($count >= $cap) {
                return $this->formatState($order, true);
            }

            $extension = $this->extensionMinutes();
            $anchor = $due->greaterThan(now()) ? $due : now();
            $newDue = $anchor->copy()->addMinutes($extension);
            $released = Carbon::parse($order->kitchen_released_at);
            $newTotal = max(1, (int)ceil($released->diffInSeconds($newDue) / 60));
            $previous = max(1, (int)($order->estimated_prep_minutes ?? $order->eta_initial_minutes ?? $newTotal));

            DB::table('orders')->where('order_id', $orderId)->update([
                'estimated_prep_minutes' => $newTotal,
                'eta_due_at' => $newDue,
                'eta_extension_count' => $count + 1,
                'eta_last_extended_at' => now(),
                'updated_at' => now(),
            ]);

            $locationId = max(1, (int)($order->location_id ?? 1));
            $this->recordEvent($orderId, $locationId, 'extend', $this->phase($order), $previous, $newTotal, $extension, [
                'remaining_seconds_before_extension' => $remainingSeconds,
                'status_name' => $this->statusName($order),
                'workforce' => app(PmdKitchenWorkforceService::class)->snapshot($locationId),
            ]);

            $fresh = DB::table('orders')
                ->leftJoin('statuses', 'orders.status_id', '=', 'statuses.status_id')
                ->where('orders.order_id', $orderId)
                ->first(['orders.*', 'statuses.status_name']);

            return $this->formatState($fresh);
        });
    }

    public function extensionMinutes(): int
    {
        return $this->intSetting('pmd_eta_late_extension_minutes', self::DEFAULT_EXTENSION_MINUTES, 1, 120);
    }

    public function extensionCap(): int
    {
        return $this->intSetting('pmd_eta_auto_extension_cap', self::DEFAULT_EXTENSION_CAP, 1, 5);
    }

    protected function shouldReconcile($order): bool
    {
        if (!$order || empty($order->kitchen_released_at) || empty($order->eta_due_at)) return false;
        if (!empty($order->kitchen_ready_at) || $this->isTerminalKitchenStatus((string)($order->status_name ?? ''))) return false;
        try {
            return now()->diffInSeconds(Carbon::parse($order->eta_due_at), false) <= self::EXTEND_CHECK_MINUTES * 60;
        } catch (\Throwable $error) {
            return false;
        }
    }

    protected function formatState($order, bool $forceTakingLonger = false): array
    {
        if (!$order) return $this->emptyState();

        $released = !empty($order->kitchen_released_at) ? Carbon::parse($order->kitchen_released_at) : null;
        $preparing = !empty($order->kitchen_preparing_at) ? Carbon::parse($order->kitchen_preparing_at) : null;
        $ready = !empty($order->kitchen_ready_at) ? Carbon::parse($order->kitchen_ready_at) : null;
        $due = !empty($order->eta_due_at) ? Carbon::parse($order->eta_due_at) : null;
        $remaining = null;
        if ($due && !$ready) $remaining = max(0, (int)ceil(now()->diffInSeconds($due, false) / 60));
        if ($ready) $remaining = 0;

        $count = max(0, (int)($order->eta_extension_count ?? 0));
        $phase = $this->phase($order);
        $cancelled = $phase === 'cancelled';
        if ($cancelled) {
            $remaining = null;
            $due = null;
        }
        $takingLonger = !$cancelled && ($forceTakingLonger || (!$ready && $due && now()->greaterThanOrEqualTo($due) && $count >= $this->extensionCap()));

        return [
            'available' => true,
            'show_customer_eta' => $this->boolSetting('enable_customer_eta', true),
            'order_id' => (int)($order->order_id ?? 0),
            'phase' => $phase,
            'status_name' => $this->statusName($order),
            'kitchen_released' => (bool)$released,
            'kitchen_released_at' => $released ? $released->toIso8601String() : null,
            'preparing_at' => $preparing ? $preparing->toIso8601String() : null,
            'ready_at' => $ready ? $ready->toIso8601String() : null,
            'eta_initial_minutes' => (int)($order->eta_initial_minutes ?? 0) ?: null,
            'eta_minutes' => (int)($order->estimated_prep_minutes ?? 0) ?: null,
            'remaining_minutes' => $remaining,
            'estimated_ready_at' => $due ? $due->toIso8601String() : null,
            'eta_extension_count' => $count,
            'taking_longer' => $takingLonger,
            'queue_delay_minutes' => $this->minutesBetween($released, $preparing),
            'active_prep_minutes' => $this->minutesBetween($preparing, $ready ?: ($preparing ? now() : null)),
            'total_kitchen_minutes' => $this->minutesBetween($released, $ready ?: ($released ? now() : null)),
        ];
    }

    protected function phase($order): string
    {
        $status = strtolower(trim($this->statusName($order)));
        if (!empty($order->kitchen_ready_at) || str_contains($status, 'ready') || str_contains($status, 'delivery')) return 'ready';
        if (str_contains($status, 'cancel') || str_contains($status, 'void')) return 'cancelled';
        if (!empty($order->kitchen_preparing_at) || str_contains($status, 'prepar')) return 'preparing';
        if (!empty($order->kitchen_released_at)) return 'received';
        return 'not_released';
    }


    protected function statusName($order): string
    {
        if (!$order) return '';
        if (isset($order->status_name)) return (string)$order->status_name;
        try {
            if (isset($order->status) && is_object($order->status)) {
                return (string)($order->status->status_name ?? '');
            }
        } catch (\Throwable $ignored) {}
        return '';
    }

    protected function isTerminalKitchenStatus(string $status): bool
    {
        $status = strtolower(trim($status));
        return str_contains($status, 'ready')
            || str_contains($status, 'delivery')
            || str_contains($status, 'cancel')
            || str_contains($status, 'void');
    }

    protected function loadOrderItems(int $orderId): array
    {
        if (!Schema::hasTable('order_menus')) return [];
        return DB::table('order_menus')
            ->where('order_id', $orderId)
            ->get(['menu_id', 'quantity'])
            ->map(function ($row) {
                return [
                    'menu_id' => (int)($row->menu_id ?? 0),
                    'quantity' => max(1, (int)($row->quantity ?? 1)),
                ];
            })->all();
    }

    protected function recordEvent(int $orderId, int $locationId, string $type, ?string $reason, ?int $previous, ?int $next, int $extension, array $snapshot): void
    {
        if (!Schema::hasTable('pmd_order_eta_events')) return;
        try {
            DB::table('pmd_order_eta_events')->insert([
                'order_id' => $orderId,
                'location_id' => $locationId,
                'event_type' => $type,
                'reason' => $reason,
                'previous_eta_minutes' => $previous,
                'new_eta_minutes' => $next,
                'extension_minutes' => max(0, $extension),
                'snapshot_json' => $snapshot ? json_encode($snapshot, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES) : null,
                'created_at' => now(),
                'updated_at' => now(),
            ]);
        } catch (\Throwable $error) {
            \Log::warning('PMD_ETA_EVENT_WRITE_FAILED', [
                'order_id' => $orderId,
                'type' => $type,
                'message' => $error->getMessage(),
            ]);
        }
    }

    protected function minutesBetween($start, $end): ?int
    {
        if (!$start || !$end) return null;
        try {
            $a = $start instanceof Carbon ? $start : Carbon::parse($start);
            $b = $end instanceof Carbon ? $end : Carbon::parse($end);
            return max(0, (int)round($a->diffInSeconds($b) / 60));
        } catch (\Throwable $error) {
            return null;
        }
    }

    protected function intSetting(string $key, int $default, int $min, int $max): int
    {
        try {
            if (!Schema::hasTable('settings')) return $default;
            $q = DB::table('settings')->where('item', $key);
            if (Schema::hasColumn('settings', 'setting_id')) $q->orderByDesc('setting_id');
            $value = $q->value('value');
            if ($value === null || $value === '') return $default;
            return max($min, min($max, (int)$value));
        } catch (\Throwable $error) {
            return $default;
        }
    }

    protected function boolSetting(string $key, bool $default): bool
    {
        try {
            if (!Schema::hasTable('settings')) return $default;
            $q = DB::table('settings')->where('item', $key);
            if (Schema::hasColumn('settings', 'setting_id')) $q->orderByDesc('setting_id');
            $value = $q->value('value');
            if ($value === null || $value === '') return $default;
            return in_array(strtolower((string)$value), ['1', 'true', 'yes', 'on'], true);
        } catch (\Throwable $error) {
            return $default;
        }
    }

    protected function emptyState(): array
    {
        return [
            'available' => false,
            'show_customer_eta' => true,
            'order_id' => null,
            'phase' => 'unknown',
            'status_name' => '',
            'kitchen_released' => false,
            'kitchen_released_at' => null,
            'preparing_at' => null,
            'ready_at' => null,
            'eta_initial_minutes' => null,
            'eta_minutes' => null,
            'remaining_minutes' => null,
            'estimated_ready_at' => null,
            'eta_extension_count' => 0,
            'taking_longer' => false,
            'queue_delay_minutes' => null,
            'active_prep_minutes' => null,
            'total_kitchen_minutes' => null,
        ];
    }
}
