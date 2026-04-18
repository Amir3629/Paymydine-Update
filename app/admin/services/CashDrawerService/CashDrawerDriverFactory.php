<?php

namespace Admin\Services\CashDrawerService;

use Admin\Models\Cash_drawers_model;
use Admin\Services\CashDrawerService\Drivers\RJ11PrinterDriver;
use Admin\Services\CashDrawerService\Drivers\USBCashDrawerDriver;
use Admin\Services\CashDrawerService\Drivers\SerialCashDrawerDriver;
use Admin\Services\CashDrawerService\Drivers\NetworkCashDrawerDriver;
use Illuminate\Support\Facades\Log;

/**
 * Cash Drawer Driver Factory
 * Creates appropriate driver instance based on drawer configuration
 */
class CashDrawerDriverFactory
{
    /**
     * Create driver for cash drawer
     * @param Cash_drawers_model $drawer
     * @return CashDrawerDriverInterface|null
     */
    public static function createDriver(Cash_drawers_model $drawer): ?CashDrawerDriverInterface
    {
        try {
            switch ($drawer->connection_type) {
                case 'rj11_printer':
                    return new RJ11PrinterDriver(
                        $drawer->device_path ?? '',
                        $drawer->esc_pos_command ?? '27,112,0,60,120'
                    );

                case 'usb':
                    return new USBCashDrawerDriver(
                        $drawer->device_path ?? '',
                        $drawer->usb_vendor_id,
                        $drawer->usb_product_id
                    );

                case 'serial':
                    return new SerialCashDrawerDriver(
                        $drawer->serial_port ?? $drawer->device_path ?? '',
                        $drawer->serial_baud_rate ?? 9600
                    );

                case 'network':
                    return new NetworkCashDrawerDriver(
                        $drawer->network_ip ?? '',
                        $drawer->network_port ?? 9100
                    );

                case 'integrated':
                    // Integrated drawers typically work like RJ11 or USB
                    // Try USB first, fallback to RJ11
                    if ($drawer->device_path && (strpos($drawer->device_path, '/dev/') === 0 || preg_match('/^COM\d+$/i', $drawer->device_path))) {
                        return new USBCashDrawerDriver($drawer->device_path);
                    }
                    return new RJ11PrinterDriver(
                        $drawer->device_path ?? '',
                        $drawer->esc_pos_command ?? '27,112,0,60,120'
                    );

                default:
                    Log::error('Cash Drawer: Unknown connection type', [
                        'drawer_id' => $drawer->drawer_id,
                        'connection_type' => $drawer->connection_type,
                    ]);
                    return null;
            }
        } catch (\Exception $e) {
            Log::error('Cash Drawer: Failed to create driver', [
                'drawer_id' => $drawer->drawer_id,
                'error' => $e->getMessage(),
            ]);
            return null;
        }
    }

    /**
     * Test if driver can be created and connected
     * @param Cash_drawers_model $drawer
     * @return array ['success' => bool, 'message' => string, 'driver' => CashDrawerDriverInterface|null]
     */
    public static function testDriver(Cash_drawers_model $drawer): array
    {
        $driver = static::createDriver($drawer);

        if (!$driver) {
            return [
                'success' => false,
                'message' => 'Failed to create driver for connection type: ' . $drawer->connection_type,
                'driver' => null,
            ];
        }

        if (!$driver->connect()) {
            return [
                'success' => false,
                'message' => 'Failed to connect: ' . ($driver->getLastError() ?? 'Unknown error'),
                'driver' => $driver,
            ];
        }

        // Test opening
        $testResult = $driver->test();
        $driver->disconnect();

        return [
            'success' => $testResult,
            'message' => $testResult 
                ? 'Connection successful and drawer opened' 
                : ('Failed to open drawer: ' . ($driver->getLastError() ?? 'Unknown error')),
            'driver' => $driver,
        ];
    }
}
