<?php

namespace App\Services;

use Carbon\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

final class PmdDevicePlatformService
{
    public const VERSION = 'pmd-device-platform-v1';

    public const COMMANDS = [
        'WAKE',
        'SLEEP',
        'SET_BRIGHTNESS',
        'RELOAD_APP',
        'REBOOT',
        'IDENTIFY',
        'UPDATE_APP',
    ];

    public function ensureStorage(): void
    {
        if (
            Schema::hasTable('pmd_device_runtime')
            && Schema::hasTable('pmd_device_commands')
            && Schema::hasTable('pmd_device_policies')
        ) {
            $this->ensureRuntimeOverrideColumns();
            return;
        }

        $path = base_path(
            'app/system/database/migrations/2026_10_01_120000_create_pmd_device_platform_v1.php'
        );

        if (!is_file($path)) {
            throw new \RuntimeException('PayMyDine Device Platform storage is not installed.');
        }

        require_once $path;
        (new \System\Database\Migrations\CreatePmdDevicePlatformV1())->up();
        $this->ensureRuntimeOverrideColumns();
    }

    public function dashboard(int $locationId): array
    {
        $this->ensureStorage();

        $devices = $this->devices($locationId);
        $policy = $this->policy($locationId);
        $desired = $this->desiredState($locationId, $policy);

        $online = collect($devices)->where('online', true)->count();
        $sleeping = collect($devices)
            ->filter(static fn (array $row) =>
                in_array((string)($row['screen_state'] ?? ''), ['sleep', 'closed'], true)
            )
            ->count();

        return [
            'version' => self::VERSION,
            'devices' => $devices,
            'policy' => $policy,
            'desired' => $desired,
            'commands' => self::COMMANDS,
            'stats' => [
                'total' => count($devices),
                'online' => $online,
                'offline' => max(0, count($devices) - $online),
                'sleeping' => $sleeping,
            ],
        ];
    }

    public function devices(int $locationId): array
    {
        $this->ensureStorage();

        if (!Schema::hasTable('pmd_site_access_devices')) {
            return [];
        }

        $trusted = DB::table('pmd_site_access_devices')
            ->where('location_id', $locationId)
            ->whereNull('revoked_at')
            ->whereIn('device_kind', [
                'table_display',
                'staff_personal',
                'site_hub',
                'kds',
                'cashier',
                'customer_display',
                'kiosk',
            ])
            ->orderBy('device_kind')
            ->orderBy('device_name')
            ->get();

        if ($trusted->isEmpty()) {
            return [];
        }

        $runtime = DB::table('pmd_device_runtime')
            ->whereIn('device_id', $trusted->pluck('id')->map(static fn ($id) => (int)$id)->all())
            ->get()
            ->keyBy('device_id');

        return $trusted->map(function ($device) use ($runtime) {
            $platform = $this->decode((string)($device->platform_info ?? ''));
            $caps = $this->decodeList((string)($device->capabilities ?? ''));
            $live = $runtime->get((int)$device->id);
            $seen = $live->last_seen_at ?? $device->last_seen_at ?? null;
            $online = $seen
                ? Carbon::parse($seen)->gte(now()->subSeconds(90))
                : false;

            $kind = strtolower(trim((string)($device->device_kind ?? 'device')));
            $mode = strtolower(trim((string)($live->device_mode ?? $platform['device_mode'] ?? '')));
            if ($mode === '' && $kind === 'table_display') {
                $mode = 'table_display';
            }

            $assignment = null;
            if ($kind === 'table_display' && !empty($platform['table_id'])) {
                $assignment = 'Table '.(string)$platform['table_id'];
            } elseif ($mode === 'kds' && !empty($platform['station_name'])) {
                $assignment = (string)$platform['station_name'];
            }

            return [
                'id' => (int)$device->id,
                'name' => trim((string)($device->device_name ?? '')) ?: 'PayMyDine device',
                'kind' => $kind,
                'kind_label' => $this->kindLabel($kind, $mode),
                'mode' => $mode ?: $kind,
                'assignment' => $assignment,
                'online' => $online,
                'screen_state' => (string)($live->screen_state ?? 'unknown'),
                'brightness' => isset($live->brightness) ? (int)$live->brightness : null,
                'battery_level' => isset($live->battery_level) ? (int)$live->battery_level : null,
                'is_charging' => isset($live->is_charging) ? (bool)$live->is_charging : null,
                'network_type' => (string)($live->network_type ?? ''),
                'app_version' => (string)($live->app_version ?? $platform['app_version'] ?? ''),
                'os_version' => (string)($live->os_version ?? $platform['release'] ?? ''),
                'manufacturer' => (string)($live->manufacturer ?? $platform['manufacturer'] ?? ''),
                'model' => (string)($live->model ?? $platform['model'] ?? ''),
                'last_seen_at' => $seen ? Carbon::parse($seen)->toIso8601String() : null,
                'capabilities' => $caps,
                'managed' => $this->modeManagedBySchedule(
                    $kind,
                    $mode,
                    $this->policy((int)$device->location_id)
                ),
            ];
        })->values()->all();
    }

    public function heartbeat($device, array $input): array
    {
        $this->ensureStorage();

        $deviceId = (int)$device->id;
        $locationId = (int)$device->location_id;
        $kind = strtolower(trim((string)($device->device_kind ?? 'device')));
        $platform = $this->decode((string)($device->platform_info ?? ''));
        $mode = strtolower(trim((string)($input['device_mode'] ?? $platform['device_mode'] ?? '')));
        if ($mode === '' && $kind === 'table_display') {
            $mode = 'table_display';
        }

        $brightness = array_key_exists('brightness', $input)
            ? max(0, min(100, (int)$input['brightness']))
            : null;
        $battery = array_key_exists('battery_level', $input)
            ? max(0, min(100, (int)$input['battery_level']))
            : null;

        DB::table('pmd_device_runtime')->updateOrInsert(
            ['device_id' => $deviceId],
            [
                'location_id' => $locationId,
                'device_kind' => $kind,
                'device_mode' => $mode ?: null,
                'app_version' => $this->cut($input['app_version'] ?? null, 80),
                'os_version' => $this->cut($input['os_version'] ?? null, 80),
                'manufacturer' => $this->cut($input['manufacturer'] ?? null, 120),
                'model' => $this->cut($input['model'] ?? null, 160),
                'screen_state' => $this->screenState($input['screen_state'] ?? 'awake'),
                'brightness' => $brightness,
                'battery_level' => $battery,
                'is_charging' => array_key_exists('is_charging', $input)
                    ? (!empty($input['is_charging']) ? 1 : 0)
                    : null,
                'network_type' => $this->cut($input['network_type'] ?? null, 32),
                'ip_address' => $this->cut(request()->ip(), 45),
                'metadata' => json_encode(
                    (array)($input['metadata'] ?? []),
                    JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
                ),
                'last_boot_at' => !empty($input['booted_at'])
                    ? Carbon::parse((string)$input['booted_at'])
                    : DB::raw('COALESCE(last_boot_at, CURRENT_TIMESTAMP)'),
                'last_seen_at' => now(),
                'updated_at' => now(),
                'created_at' => now(),
            ]
        );

        DB::table('pmd_site_access_devices')
            ->where('id', $deviceId)
            ->update([
                'last_seen_at' => now(),
                'updated_at' => now(),
            ]);

        $policy = $this->policy($locationId);
        $desired = $this->desiredState($locationId, $policy, $kind, $mode);
        $desired = $this->applyRuntimeOverride($deviceId, $desired);

        return [
            'ok' => true,
            'version' => self::VERSION,
            'server_time' => now()->toIso8601String(),
            'device_id' => $deviceId,
            'location_id' => $locationId,
            'desired' => $desired,
            'commands' => $this->pendingCommands($deviceId),
            'poll_after_seconds' => 10,
        ];
    }

    public function acknowledge($device, string $commandId, string $status, array $result = []): array
    {
        $this->ensureStorage();

        $status = strtolower(trim($status));
        if (!in_array($status, ['acknowledged', 'completed', 'failed'], true)) {
            abort(422, 'Invalid device command status.');
        }

        $row = DB::table('pmd_device_commands')
            ->where('command_id', $commandId)
            ->where('device_id', (int)$device->id)
            ->first();

        if (!$row) {
            abort(404, 'Device command was not found.');
        }

        $updates = [
            'status' => $status,
            'result_payload' => json_encode(
                $result,
                JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
            ),
            'acknowledged_at' => now(),
            'updated_at' => now(),
        ];

        if (in_array($status, ['completed', 'failed'], true)) {
            $updates['completed_at'] = now();
        }

        DB::table('pmd_device_commands')
            ->where('id', (int)$row->id)
            ->update($updates);

        DB::table('pmd_device_runtime')
            ->where('device_id', (int)$device->id)
            ->update([
                'last_command_id' => $commandId,
                'updated_at' => now(),
            ]);

        return ['ok' => true, 'command_id' => $commandId, 'status' => $status];
    }

    public function issue(
        int $locationId,
        string $command,
        ?int $deviceId,
        ?string $targetKind,
        array $payload,
        ?int $staffId
    ): array {
        $this->ensureStorage();

        $command = strtoupper(trim($command));
        if (!in_array($command, self::COMMANDS, true)) {
            abort(422, 'Unsupported PayMyDine device command.');
        }

        $query = DB::table('pmd_site_access_devices')
            ->where('location_id', $locationId)
            ->whereNull('revoked_at')
            ->whereIn('device_kind', [
                'table_display',
                'staff_personal',
                'site_hub',
                'kds',
                'cashier',
                'customer_display',
                'kiosk',
            ]);

        if ($deviceId) {
            $query->where('id', $deviceId);
        }

        if ($targetKind) {
            $targetKind = strtolower(trim($targetKind));
            if ($targetKind === 'table_display') {
                $query->where('device_kind', 'table_display');
            } elseif ($targetKind === 'android_restaurant') {
                $query->where('device_kind', 'staff_personal');
            } else {
                $query->where('device_kind', $targetKind);
            }
        }

        $devices = $query->get();
        $ids = [];

        if ($deviceId && $devices->isNotEmpty()) {
            $overrideMinutes = max(
                1,
                min(480, (int)($payload['override_minutes'] ?? 120))
            );
            $runtimeUpdate = [
                'override_until' => now()->addMinutes($overrideMinutes),
                'updated_at' => now(),
            ];

            if ($command === 'WAKE') {
                $runtimeUpdate['override_screen_state'] = 'awake';
                $runtimeUpdate['override_brightness'] = (int)(
                    $payload['brightness']
                    ?? $this->policy($locationId)['open_brightness']
                    ?? 80
                );
            } elseif ($command === 'SLEEP') {
                $runtimeUpdate['override_screen_state'] = 'closed';
                $runtimeUpdate['override_brightness'] = (int)(
                    $payload['brightness']
                    ?? $this->policy($locationId)['closed_brightness']
                    ?? 1
                );
            } elseif ($command === 'SET_BRIGHTNESS') {
                $runtimeUpdate['override_brightness'] = max(
                    0,
                    min(100, (int)($payload['brightness'] ?? 80))
                );
            }

            if (
                array_key_exists('override_screen_state', $runtimeUpdate)
                || array_key_exists('override_brightness', $runtimeUpdate)
            ) {
                DB::table('pmd_device_runtime')
                    ->where('device_id', $deviceId)
                    ->update($runtimeUpdate);
            }
        }

        foreach ($devices as $device) {
            $commandId = (string)Str::uuid();
            DB::table('pmd_device_commands')->insert([
                'command_id' => $commandId,
                'location_id' => $locationId,
                'device_id' => (int)$device->id,
                'device_kind' => (string)$device->device_kind,
                'command' => $command,
                'payload' => json_encode(
                    $payload,
                    JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE
                ),
                'status' => 'pending',
                'requested_by_staff_id' => $staffId ?: null,
                'requested_at' => now(),
                'expires_at' => now()->addMinutes(10),
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            $ids[] = $commandId;
        }

        return [
            'ok' => true,
            'command' => $command,
            'count' => count($ids),
            'command_ids' => $ids,
        ];
    }

    public function savePolicy(int $locationId, array $input, ?int $staffId): array
    {
        $this->ensureStorage();

        $row = [
            'schedule_enabled' => !empty($input['schedule_enabled']) ? 1 : 0,
            'wake_before_minutes' => max(0, min(240, (int)($input['wake_before_minutes'] ?? 30))),
            'sleep_after_minutes' => max(0, min(240, (int)($input['sleep_after_minutes'] ?? 30))),
            'open_brightness' => max(10, min(100, (int)($input['open_brightness'] ?? 80))),
            'closed_brightness' => max(0, min(10, (int)($input['closed_brightness'] ?? 1))),
            'table_display_enabled' => !empty($input['table_display_enabled']) ? 1 : 0,
            'kds_enabled' => !empty($input['kds_enabled']) ? 1 : 0,
            'pos_enabled' => !empty($input['pos_enabled']) ? 1 : 0,
            'customer_display_enabled' => !empty($input['customer_display_enabled']) ? 1 : 0,
            'kiosk_enabled' => !empty($input['kiosk_enabled']) ? 1 : 0,
            'updated_by_staff_id' => $staffId ?: null,
            'updated_at' => now(),
        ];

        DB::table('pmd_device_policies')->updateOrInsert(
            ['location_id' => $locationId],
            $row + [
                'manual_mode' => 'auto',
                'manual_until' => null,
                'created_at' => now(),
            ]
        );

        return $this->policy($locationId);
    }

    public function setManualMode(int $locationId, string $mode, ?int $staffId): array
    {
        $this->ensureStorage();

        $mode = strtolower(trim($mode));
        if (!in_array($mode, ['auto', 'open', 'closed'], true)) {
            abort(422, 'Invalid restaurant device mode.');
        }

        $existing = $this->policy($locationId);

        if (Schema::hasTable('pmd_device_runtime')) {
            DB::table('pmd_device_runtime')
                ->where('location_id', $locationId)
                ->update([
                    'override_screen_state' => null,
                    'override_brightness' => null,
                    'override_until' => null,
                    'updated_at' => now(),
                ]);
        }

        DB::table('pmd_device_policies')->updateOrInsert(
            ['location_id' => $locationId],
            [
                'schedule_enabled' => !empty($existing['schedule_enabled']) ? 1 : 0,
                'manual_mode' => $mode,
                'manual_until' => $mode === 'auto' ? null : now()->addHours(18),
                'wake_before_minutes' => (int)$existing['wake_before_minutes'],
                'sleep_after_minutes' => (int)$existing['sleep_after_minutes'],
                'open_brightness' => (int)$existing['open_brightness'],
                'closed_brightness' => (int)$existing['closed_brightness'],
                'table_display_enabled' => !empty($existing['table_display_enabled']) ? 1 : 0,
                'kds_enabled' => !empty($existing['kds_enabled']) ? 1 : 0,
                'pos_enabled' => !empty($existing['pos_enabled']) ? 1 : 0,
                'customer_display_enabled' => !empty($existing['customer_display_enabled']) ? 1 : 0,
                'kiosk_enabled' => !empty($existing['kiosk_enabled']) ? 1 : 0,
                'updated_by_staff_id' => $staffId ?: null,
                'created_at' => now(),
                'updated_at' => now(),
            ]
        );

        return $this->policy($locationId);
    }

    public function policy(int $locationId): array
    {
        $this->ensureStorage();

        $row = DB::table('pmd_device_policies')
            ->where('location_id', $locationId)
            ->first();

        $defaults = [
            'location_id' => $locationId,
            'schedule_enabled' => true,
            'manual_mode' => 'auto',
            'manual_until' => null,
            'wake_before_minutes' => 30,
            'sleep_after_minutes' => 30,
            'open_brightness' => 80,
            'closed_brightness' => 1,
            'table_display_enabled' => true,
            'kds_enabled' => true,
            'pos_enabled' => false,
            'customer_display_enabled' => true,
            'kiosk_enabled' => true,
        ];

        if (!$row) {
            return $defaults;
        }

        $out = array_merge($defaults, (array)$row);
        foreach ([
            'schedule_enabled',
            'table_display_enabled',
            'kds_enabled',
            'pos_enabled',
            'customer_display_enabled',
            'kiosk_enabled',
        ] as $key) {
            $out[$key] = (bool)$out[$key];
        }

        if (!empty($out['manual_until'])) {
            $out['manual_until'] = Carbon::parse($out['manual_until'])->toIso8601String();
        }

        return $out;
    }

    public function desiredState(
        int $locationId,
        ?array $policy = null,
        string $kind = 'table_display',
        string $mode = ''
    ): array {
        $policy = $policy ?: $this->policy($locationId);
        $managed = $this->modeManagedBySchedule($kind, $mode, $policy);

        if (!$managed) {
            return [
                'screen_state' => 'awake',
                'brightness' => (int)$policy['open_brightness'],
                'reason' => 'device_mode_not_scheduled',
                'managed' => false,
                'kiosk' => true,
            ];
        }

        $manual = strtolower((string)($policy['manual_mode'] ?? 'auto'));
        $manualUntil = !empty($policy['manual_until'])
            ? Carbon::parse((string)$policy['manual_until'])
            : null;

        if ($manual !== 'auto' && (!$manualUntil || $manualUntil->isFuture())) {
            $awake = $manual === 'open';
            return [
                'screen_state' => $awake ? 'awake' : 'closed',
                'brightness' => $awake
                    ? (int)$policy['open_brightness']
                    : (int)$policy['closed_brightness'],
                'reason' => 'manual_'.$manual,
                'managed' => true,
                'kiosk' => true,
                'manual_until' => $manualUntil ? $manualUntil->toIso8601String() : null,
            ];
        }

        if (empty($policy['schedule_enabled'])) {
            return [
                'screen_state' => 'awake',
                'brightness' => (int)$policy['open_brightness'],
                'reason' => 'schedule_disabled',
                'managed' => true,
                'kiosk' => true,
            ];
        }

        $window = $this->openingWindow($locationId, $policy);
        $awake = (bool)$window['inside'];

        return [
            'screen_state' => $awake ? 'awake' : 'closed',
            'brightness' => $awake
                ? (int)$policy['open_brightness']
                : (int)$policy['closed_brightness'],
            'reason' => (string)$window['reason'],
            'managed' => true,
            'kiosk' => true,
            'window_start' => $window['start'],
            'window_end' => $window['end'],
            'timezone' => $window['timezone'],
        ];
    }

    public function openingWindow(int $locationId, array $policy): array
    {
        $timezone = $this->timezone($locationId);
        $now = Carbon::now($timezone);

        if (!Schema::hasTable('working_hours')) {
            return [
                'inside' => true,
                'reason' => 'opening_hours_unavailable',
                'start' => null,
                'end' => null,
                'timezone' => $timezone,
            ];
        }

        $rows = DB::table('working_hours')
            ->where('location_id', $locationId)
            ->where('type', 'opening')
            ->where('status', 1)
            ->get()
            ->keyBy(static fn ($row) => (int)$row->weekday);

        if ($rows->isEmpty()) {
            return [
                'inside' => true,
                'reason' => 'no_opening_hours_configured',
                'start' => null,
                'end' => null,
                'timezone' => $timezone,
            ];
        }

        $wakeBefore = (int)($policy['wake_before_minutes'] ?? 30);
        $sleepAfter = (int)($policy['sleep_after_minutes'] ?? 30);

        foreach ([$now->copy()->subDay(), $now->copy()] as $day) {
            $weekday = $day->dayOfWeekIso - 1;
            $row = $rows->get($weekday);
            if (!$row) {
                continue;
            }

            $open = substr((string)$row->opening_time, 0, 8) ?: '00:00:00';
            $close = substr((string)$row->closing_time, 0, 8) ?: '23:59:00';

            $start = Carbon::parse($day->toDateString().' '.$open, $timezone);
            $end = Carbon::parse($day->toDateString().' '.$close, $timezone);
            if ($end->lte($start)) {
                $end->addDay();
            }

            $managedStart = $start->copy()->subMinutes($wakeBefore);
            $managedEnd = $end->copy()->addMinutes($sleepAfter);

            if ($now->betweenIncluded($managedStart, $managedEnd)) {
                return [
                    'inside' => true,
                    'reason' => $now->lt($start)
                        ? 'opening_soon'
                        : ($now->gt($end) ? 'closing_grace' : 'restaurant_open'),
                    'start' => $managedStart->toIso8601String(),
                    'end' => $managedEnd->toIso8601String(),
                    'timezone' => $timezone,
                ];
            }
        }

        return [
            'inside' => false,
            'reason' => 'restaurant_closed',
            'start' => null,
            'end' => null,
            'timezone' => $timezone,
        ];
    }

    private function pendingCommands(int $deviceId): array
    {
        DB::table('pmd_device_commands')
            ->where('device_id', $deviceId)
            ->whereIn('status', ['pending', 'delivered'])
            ->whereNotNull('expires_at')
            ->where('expires_at', '<=', now())
            ->update([
                'status' => 'expired',
                'updated_at' => now(),
            ]);

        $rows = DB::table('pmd_device_commands')
            ->where('device_id', $deviceId)
            ->whereIn('status', ['pending', 'delivered'])
            ->where(function ($query) {
                $query->whereNull('expires_at')
                    ->orWhere('expires_at', '>', now());
            })
            ->orderBy('id')
            ->limit(20)
            ->get();

        $ids = $rows
            ->where('status', 'pending')
            ->pluck('id')
            ->map(static fn ($id) => (int)$id)
            ->all();

        if ($ids) {
            DB::table('pmd_device_commands')
                ->whereIn('id', $ids)
                ->update([
                    'status' => 'delivered',
                    'delivered_at' => now(),
                    'updated_at' => now(),
                ]);
        }

        return $rows->map(function ($row) {
            return [
                'command_id' => (string)$row->command_id,
                'command' => (string)$row->command,
                'payload' => $this->decode((string)($row->payload ?? '')),
                'requested_at' => $row->requested_at
                    ? Carbon::parse($row->requested_at)->toIso8601String()
                    : null,
                'expires_at' => $row->expires_at
                    ? Carbon::parse($row->expires_at)->toIso8601String()
                    : null,
            ];
        })->values()->all();
    }

    private function modeManagedBySchedule(string $kind, string $mode, array $policy): bool
    {
        $kind = strtolower(trim($kind));
        $mode = strtolower(trim($mode));

        if ($kind === 'table_display' || $mode === 'table_display') {
            return !empty($policy['table_display_enabled']);
        }
        if ($kind === 'kds' || $mode === 'kds') {
            return !empty($policy['kds_enabled']);
        }
        if ($kind === 'cashier' || $mode === 'pos' || $mode === 'cashier') {
            return !empty($policy['pos_enabled']);
        }
        if ($kind === 'customer_display' || $mode === 'customer_display') {
            return !empty($policy['customer_display_enabled']);
        }
        if ($kind === 'kiosk' || $mode === 'kiosk') {
            return !empty($policy['kiosk_enabled']);
        }

        return false;
    }

    private function timezone(int $locationId): string
    {
        try {
            $state = app(\App\Services\Platform\LocationPlatformContext::class)
                ->state($locationId);
            $zone = trim((string)($state['profile']['timezone'] ?? ''));
            if ($zone !== '') {
                return $zone;
            }
        } catch (\Throwable $ignored) {
        }

        return trim((string)setting('timezone', 'Europe/Berlin')) ?: 'Europe/Berlin';
    }

    private function applyRuntimeOverride(
        int $deviceId,
        array $desired
    ): array {
        if (!Schema::hasTable('pmd_device_runtime')) {
            return $desired;
        }

        $row = DB::table('pmd_device_runtime')
            ->where('device_id', $deviceId)
            ->first();

        if (!$row || empty($row->override_until)) {
            return $desired;
        }

        $until = Carbon::parse($row->override_until);
        if ($until->isPast()) {
            DB::table('pmd_device_runtime')
                ->where('device_id', $deviceId)
                ->update([
                    'override_screen_state' => null,
                    'override_brightness' => null,
                    'override_until' => null,
                    'updated_at' => now(),
                ]);
            return $desired;
        }

        if (!empty($row->override_screen_state)) {
            $desired['screen_state'] = $this->screenState(
                $row->override_screen_state
            );
        }
        if ($row->override_brightness !== null) {
            $desired['brightness'] = max(
                0,
                min(100, (int)$row->override_brightness)
            );
        }

        $desired['reason'] = 'device_manual_override';
        $desired['override_until'] = $until->toIso8601String();

        return $desired;
    }

    private function ensureRuntimeOverrideColumns(): void
    {
        if (!Schema::hasTable('pmd_device_runtime')) {
            return;
        }

        $missing = [];
        foreach ([
            'override_screen_state',
            'override_brightness',
            'override_until',
        ] as $column) {
            if (!Schema::hasColumn('pmd_device_runtime', $column)) {
                $missing[] = $column;
            }
        }

        if (!$missing) {
            return;
        }

        Schema::table('pmd_device_runtime', function ($table) use ($missing) {
            if (in_array('override_screen_state', $missing, true)) {
                $table->string('override_screen_state', 24)->nullable();
            }
            if (in_array('override_brightness', $missing, true)) {
                $table->unsignedTinyInteger('override_brightness')->nullable();
            }
            if (in_array('override_until', $missing, true)) {
                $table->timestamp('override_until')->nullable()->index();
            }
        });
    }

    private function screenState($value): string
    {
        $value = strtolower(trim((string)$value));
        return in_array($value, ['awake', 'closed', 'sleep', 'identify'], true)
            ? $value
            : 'awake';
    }

    private function kindLabel(string $kind, string $mode): string
    {
        if ($kind === 'table_display' || $mode === 'table_display') {
            return 'Table Companion';
        }
        if ($kind === 'site_hub') {
            return 'Restaurant Edge';
        }
        if ($mode === 'kds' || $kind === 'kds') {
            return 'Kitchen Display';
        }
        if ($mode === 'pos' || $mode === 'cashier' || $kind === 'cashier') {
            return 'Cashier POS';
        }
        if ($mode === 'customer_display' || $kind === 'customer_display') {
            return 'Customer Display';
        }
        if ($mode === 'kiosk' || $kind === 'kiosk') {
            return 'Self-Service Kiosk';
        }
        if ($kind === 'staff_personal') {
            return 'Android Restaurant App';
        }

        return ucwords(str_replace('_', ' ', $kind ?: 'device'));
    }

    private function decode(string $value): array
    {
        $json = json_decode($value, true);
        return is_array($json) ? $json : [];
    }

    private function decodeList(string $value): array
    {
        $json = json_decode($value, true);
        if (!is_array($json)) {
            return [];
        }
        return array_values(array_map('strval', $json));
    }

    private function cut($value, int $length): ?string
    {
        $value = trim((string)$value);
        return $value === '' ? null : mb_substr($value, 0, $length);
    }
}
