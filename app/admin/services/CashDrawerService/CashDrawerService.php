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
    /**
     * Open cash drawer
     * @param int|Cash_drawers_model $drawer Drawer ID or model instance
     * @param array $data Additional data (order_id, location_id, trigger_method)
     * @return array ['success' => bool, 'message' => string]
     */
    public static function openDrawer($drawer, array $data = []): array
    {
        try {
            // Get drawer model
            if (is_numeric($drawer)) {
                $drawer = Cash_drawers_model::find($drawer);
            }

            if (!$drawer || !$drawer instanceof Cash_drawers_model) {
                return [
                    'success' => false,
                    'message' => 'Cash drawer not found',
                ];
            }

            // Check if drawer is enabled
            if (!$drawer->status) {
                return [
                    'success' => false,
                    'message' => 'Cash drawer is disabled',
                ];
            }

            // Create driver
            $driver = CashDrawerDriverFactory::createDriver($drawer);

            if (!$driver) {
                $error = 'Failed to create driver for drawer: ' . $drawer->name;
                self::logEvent($drawer, 'error', array_merge($data, [
                    'error_message' => $error,
                ]));
                return [
                    'success' => false,
                    'message' => $error,
                ];
            }

            // Connect and open
            if (!$driver->connect()) {
                $error = 'Failed to connect: ' . ($driver->getLastError() ?? 'Unknown error');
                self::logEvent($drawer, 'error', array_merge($data, [
                    'error_message' => $error,
                ]));
                $driver->disconnect();
                return [
                    'success' => false,
                    'message' => $error,
                ];
            }

            // Open drawer
            $opened = $driver->open();
            $driver->disconnect();

            // Log event
            self::logEvent($drawer, $opened ? 'open' : 'error', array_merge($data, [
                'success' => $opened,
                'error_message' => $opened ? null : ($driver->getLastError() ?? 'Failed to open drawer'),
            ]));

            return [
                'success' => $opened,
                'message' => $opened 
                    ? 'Cash drawer opened successfully' 
                    : ('Failed to open drawer: ' . ($driver->getLastError() ?? 'Unknown error')),
            ];
        } catch (\Exception $e) {
            Log::error('Cash Drawer Service: Exception opening drawer', [
                'drawer' => is_object($drawer) ? $drawer->drawer_id : $drawer,
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return [
                'success' => false,
                'message' => 'Exception: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Open drawer for location (uses default drawer)
     * @param int $locationId
     * @param array $data Additional data
     * @return array
     */
    public static function openDrawerForLocation(int $locationId, array $data = []): array
    {
        $drawer = Cash_drawers_model::getDefaultDrawer($locationId);

        if (!$drawer) {
            return [
                'success' => false,
                'message' => 'No cash drawer configured for this location',
            ];
        }

        $data['location_id'] = $locationId;
        return self::openDrawer($drawer, $data);
    }

    /**
     * Test drawer connection
     * @param int|Cash_drawers_model $drawer
     * @return array
     */
    public static function testDrawer($drawer): array
    {
        try {
            if (is_numeric($drawer)) {
                $drawer = Cash_drawers_model::find($drawer);
            }

            if (!$drawer || !$drawer instanceof Cash_drawers_model) {
                return [
                    'success' => false,
                    'message' => 'Cash drawer not found',
                ];
            }

            $result = CashDrawerDriverFactory::testDriver($drawer);

            // Log test event
            self::logEvent($drawer, 'test', [
                'success' => $result['success'],
                'error_message' => $result['success'] ? null : $result['message'],
            ]);

            return $result;
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Exception: ' . $e->getMessage(),
            ];
        }
    }

    /**
     * Log drawer event
     * @param Cash_drawers_model $drawer
     * @param string $action
     * @param array $data
     * @return Cash_drawer_logs_model
     */
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

    /**
     * Get drawer status
     * @param int|Cash_drawers_model $drawer
     * @return array
     */
    public static function getDrawerStatus($drawer): array
    {
        try {
            if (is_numeric($drawer)) {
                $drawer = Cash_drawers_model::find($drawer);
            }

            if (!$drawer || !$drawer instanceof Cash_drawers_model) {
                return [
                    'success' => false,
                    'message' => 'Cash drawer not found',
                ];
            }

            $driver = CashDrawerDriverFactory::createDriver($drawer);
            if (!$driver) {
                return [
                    'success' => false,
                    'message' => 'Failed to create driver',
                ];
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
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Exception: ' . $e->getMessage(),
            ];
        }
    }
}
