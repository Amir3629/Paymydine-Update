<?php

namespace Admin\Services\CashDrawerService;

use Admin\Models\Cash_drawers_model;
use Admin\Models\Cash_drawer_logs_model;
use Admin\Services\CashDrawerService\CashDrawerDriverFactory;
use Illuminate\Support\Facades\Log;

/**
 * Cash Drawer Service
 * Manages cash drawer operations and logging
 */
class CashDrawerService
{
    protected static function shouldUseLocalAgent(Cash_drawers_model $drawer): bool
    {
        return !empty($drawer->local_pos_device_id) || !empty($drawer->pos_device_id);
    }

    /**
     * Open cash drawer.
     * A paired restaurant drawer is ALWAYS executed by the Local POS Agent.
     * The cloud VPS must never fall through to a USB/Windows/COM driver for
     * hardware that physically lives in the restaurant.
     */
    public static function openDrawer($drawer, array $data = []): array
    {
        try {
            if (is_numeric($drawer)) {
                $drawer = Cash_drawers_model::find($drawer);
            }

            if (!$drawer || !$drawer instanceof Cash_drawers_model) {
                return ['success' => false, 'message' => 'Cash drawer not found'];
            }

            if (!$drawer->status) {
                return ['success' => false, 'message' => 'Cash drawer is disabled'];
            }

            if (self::shouldUseLocalAgent($drawer)) {
                $queued = LocalPosHardwareCommandService::queueOpenDrawer($drawer, $data);
                self::logEvent($drawer, !empty($queued['success']) ? 'queued' : 'queue_error', array_merge($data, [
                    'success' => !empty($queued['success']),
                    'error_message' => !empty($queued['success']) ? null : ($queued['message'] ?? 'Unable to queue local drawer command'),
                    'response_data' => [
                        'queued' => $queued['queued'] ?? false,
                        'duplicate' => $queued['duplicate'] ?? false,
                        'command_id' => $queued['command_id'] ?? null,
                    ],
                ]));

                return $queued;
            }

            $driver = CashDrawerDriverFactory::createDriver($drawer);
            if (!$driver) {
                $error = 'Failed to create driver for drawer: '.$drawer->name;
                self::logEvent($drawer, 'error', array_merge($data, ['error_message' => $error]));
                return ['success' => false, 'message' => $error];
            }

            if (!$driver->connect()) {
                $error = 'Failed to connect: '.($driver->getLastError() ?? 'Unknown error');
                self::logEvent($drawer, 'error', array_merge($data, ['error_message' => $error]));
                $driver->disconnect();
                return ['success' => false, 'message' => $error];
            }

            $opened = $driver->open();
            $driver->disconnect();

            self::logEvent($drawer, $opened ? 'open' : 'error', array_merge($data, [
                'success' => $opened,
                'error_message' => $opened ? null : ($driver->getLastError() ?? 'Failed to open drawer'),
            ]));

            return [
                'success' => $opened,
                'message' => $opened
                    ? 'Cash drawer opened successfully'
                    : ('Failed to open drawer: '.($driver->getLastError() ?? 'Unknown error')),
            ];
        } catch (\Throwable $e) {
            Log::error('Cash Drawer Service: Exception opening drawer', [
                'drawer' => is_object($drawer) ? $drawer->drawer_id : $drawer,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return ['success' => false, 'message' => 'Exception: '.$e->getMessage()];
        }
    }

    public static function openDrawerForLocation(int $locationId, array $data = []): array
    {
        $drawer = Cash_drawers_model::getDefaultDrawer($locationId);
        if (!$drawer) {
            return ['success' => false, 'message' => 'No cash drawer configured for this location'];
        }

        $data['location_id'] = $locationId;
        return self::openDrawer($drawer, $data);
    }

    public static function testDrawer($drawer, array $data = []): array
    {
        try {
            if (is_numeric($drawer)) {
                $drawer = Cash_drawers_model::find($drawer);
            }

            if (!$drawer || !$drawer instanceof Cash_drawers_model) {
                return ['success' => false, 'message' => 'Cash drawer not found'];
            }

            if (self::shouldUseLocalAgent($drawer)) {
                $result = LocalPosHardwareCommandService::queueTestConnection($drawer, [
                    'trigger_method' => $data['trigger_method'] ?? 'test',
                    'printer_name' => $data['printer_name'] ?? null,
                ]);

                self::logEvent($drawer, 'queued_test', [
                    'success' => $result['success'],
                    'trigger_method' => 'test',
                    'response_data' => [
                        'queued' => $result['queued'] ?? false,
                        'command_id' => $result['command_id'] ?? null,
                    ],
                    'error_message' => $result['success'] ? null : ($result['message'] ?? null),
                ]);

                return $result;
            }

            $result = CashDrawerDriverFactory::testDriver($drawer);
            self::logEvent($drawer, 'test', [
                'success' => $result['success'],
                'error_message' => $result['success'] ? null : $result['message'],
            ]);
            return $result;
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => 'Exception: '.$e->getMessage()];
        }
    }

    protected static function logEvent(Cash_drawers_model $drawer, string $action, array $data = []): Cash_drawer_logs_model
    {
        return Cash_drawer_logs_model::logEvent($drawer->drawer_id, $action, [
            'order_id' => $data['order_id'] ?? null,
            'location_id' => $data['location_id'] ?? $drawer->location_id,
            'trigger_method' => $data['trigger_method'] ?? null,
            'success' => $data['success'] ?? true,
            'error_message' => $data['error_message'] ?? null,
            'response_data' => $data['response_data'] ?? null,
        ]);
    }

    public static function getDrawerStatus($drawer): array
    {
        try {
            if (is_numeric($drawer)) {
                $drawer = Cash_drawers_model::find($drawer);
            }

            if (!$drawer || !$drawer instanceof Cash_drawers_model) {
                return ['success' => false, 'message' => 'Cash drawer not found'];
            }

            if (self::shouldUseLocalAgent($drawer)) {
                $terminal = $drawer->localPosDevice ?: $drawer->posDevice;
                $lastCommand = \DB::table('pos_hardware_commands')
                    ->where('drawer_id', $drawer->drawer_id)
                    ->orderBy('id', 'desc')
                    ->first();

                $online = $terminal && method_exists($terminal, 'isOnline') ? $terminal->isOnline() : false;

                return [
                    'success' => true,
                    'mode' => 'local_agent',
                    'terminal_online' => (bool)$online,
                    'terminal_name' => $terminal->name ?? null,
                    'last_seen_at' => $terminal->last_seen_at ?? null,
                    'last_command_status' => $drawer->last_command_status ?? null,
                    'last_command_message' => $drawer->last_command_message ?? null,
                    'pending_command' => (bool)($lastCommand && in_array($lastCommand->status, ['pending', 'processing'], true)),
                    'pending_command_status' => $lastCommand->status ?? null,
                    'status' => $drawer->status ? 'enabled' : 'disabled',
                ];
            }

            $driver = CashDrawerDriverFactory::createDriver($drawer);
            if (!$driver) {
                return ['success' => false, 'message' => 'Failed to create driver'];
            }

            $connected = $driver->connect();
            $isOpen = $connected ? $driver->isOpen() : null;
            $driver->disconnect();

            return [
                'success' => true,
                'connected' => $connected,
                'is_open' => $isOpen,
                'status' => $drawer->status ? 'enabled' : 'disabled',
            ];
        } catch (\Throwable $e) {
            return ['success' => false, 'message' => 'Exception: '.$e->getMessage()];
        }
    }
}
