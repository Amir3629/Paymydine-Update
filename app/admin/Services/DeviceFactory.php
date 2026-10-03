<?php

namespace Admin\Services\BiometricDeviceService;

use Admin\Models\FingerDevices_model;
use Admin\Services\BiometricDeviceService\Drivers\ZKTecoDriver;
use Admin\Services\BiometricDeviceService\Drivers\RFIDDriver;
use Admin\Services\BiometricDeviceService\Drivers\SupremaDriver;
use Admin\Services\BiometricDeviceService\Drivers\HikvisionDriver;
use Admin\Services\BiometricDeviceService\Drivers\GenericFingerprintDriver;
use Illuminate\Support\Facades\Log;

/**
 * Device Factory
 * Creates appropriate driver instances based on device type
 * Uses DeviceRegistry for automatic device type detection
 */
class DeviceFactory
{
    /**
     * Create a driver instance for a device
     * @param FingerDevices_model $device
     * @return DeviceDriverInterface|null
     */
    public static function createDriver(FingerDevices_model $device): ?DeviceDriverInterface
    {
        try {
            // If device type is not set or is 'auto', try to auto-detect
            if (empty($device->device_type) || $device->device_type === 'auto') {
                $deviceType = static::autoDetectDeviceType($device);
                if ($deviceType) {
                    $device->device_type = $deviceType;
                }
            }

            // Get driver class from registry
            $driverClass = DeviceRegistry::getDriverClass($device->device_type);
            
            if ($driverClass) {
                $fullDriverClass = "Admin\\Services\\BiometricDeviceService\\Drivers\\{$driverClass}";
                
                if (class_exists($fullDriverClass)) {
                    return static::instantiateDriver($fullDriverClass, $device);
                }
            }

            // Fallback to legacy type-based detection
            return static::createDriverLegacy($device);

        } catch (\Exception $e) {
            Log::error('Failed to create device driver', [
                'device_id' => $device->device_id,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Auto-detect device type based on identifiers
     * @param FingerDevices_model $device
     * @return string|null
     */
    protected static function autoDetectDeviceType(FingerDevices_model $device): ?string
    {
        $identifiers = [
            'usb_vendor_id' => $device->usb_vendor_id,
            'usb_product_id' => $device->usb_product_id,
            'ip' => $device->ip,
            'port' => $device->port,
            'model' => $device->model,
            'manufacturer' => $device->manufacturer,
            'connection_type' => $device->connection_type,
            'device_path' => static::getUSBDevicePath($device),
        ];

        $identified = DeviceRegistry::identifyDevice($identifiers);
        
        return $identified['type'] ?? null;
    }

    /**
     * Instantiate driver based on class name
     * @param string $driverClass
     * @param FingerDevices_model $device
     * @return DeviceDriverInterface|null
     */
    protected static function instantiateDriver(string $driverClass, FingerDevices_model $device): ?DeviceDriverInterface
    {
        try {
            switch ($driverClass) {
                case 'Admin\\Services\\BiometricDeviceService\\Drivers\\ZKTecoDriver':
                    return new ZKTecoDriver($device->ip, $device->port ?? 4370);

                case 'Admin\\Services\\BiometricDeviceService\\Drivers\\SupremaDriver':
                    return new SupremaDriver($device->ip, $device->port ?? 51211);

                case 'Admin\\Services\\BiometricDeviceService\\Drivers\\HikvisionDriver':
                    return new HikvisionDriver($device->ip, $device->port ?? 80);

                case 'Admin\\Services\\BiometricDeviceService\\Drivers\\RFIDDriver':
                    $devicePath = static::getUSBDevicePath($device);
                    return new RFIDDriver($devicePath);

                case 'Admin\\Services\\BiometricDeviceService\\Drivers\\GenericFingerprintDriver':
                    $devicePath = static::getUSBDevicePath($device);
                    return new GenericFingerprintDriver($devicePath);

                default:
                    // Try to instantiate using reflection
                    if (class_exists($driverClass)) {
                        $reflection = new \ReflectionClass($driverClass);
                        
                        // Determine constructor parameters based on connection type
                        if ($device->connection_type === 'usb') {
                            $devicePath = static::getUSBDevicePath($device);
                            return $reflection->newInstance($devicePath);
                        } else {
                            return $reflection->newInstance($device->ip, $device->port ?? 4370);
                        }
                    }
                    
                    return null;
            }
        } catch (\Exception $e) {
            Log::error('Failed to instantiate driver', [
                'driver_class' => $driverClass,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Legacy driver creation (fallback)
     * @param FingerDevices_model $device
     * @return DeviceDriverInterface|null
     */
    protected static function createDriverLegacy(FingerDevices_model $device): ?DeviceDriverInterface
    {
        switch ($device->device_type) {
            case 'zkteco':
            case 'fingerprint':
            case 'hybrid':
                return new ZKTecoDriver($device->ip, $device->port ?? 4370);

            case 'rfid':
                if ($device->connection_type === 'usb') {
                    $devicePath = static::getUSBDevicePath($device);
                    return new RFIDDriver($devicePath);
                }
                return new ZKTecoDriver($device->ip, $device->port ?? 4370);

            case 'face':
                return new ZKTecoDriver($device->ip, $device->port ?? 4370);

            case 'suprema':
                return new SupremaDriver($device->ip, $device->port ?? 51211);

            case 'hikvision':
                return new HikvisionDriver($device->ip, $device->port ?? 80);

            default:
                Log::error('Unsupported device type', ['device_type' => $device->device_type]);
                return null;
        }
    }

    /**
     * Get USB device path
     * @param FingerDevices_model $device
     * @return string
     */
    protected static function getUSBDevicePath(FingerDevices_model $device): string
    {
        if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
            // Windows COM port
            return $device->serial_number ?? 'COM1';
        } else {
            // Linux/Mac device path
            return '/dev/' . ($device->serial_number ?? 'ttyUSB0');
        }
    }

    /**
     * Test if a driver can be created and connected
     * @param FingerDevices_model $device
     * @return array ['success' => bool, 'message' => string, 'driver' => DeviceDriverInterface|null]
     */
    public static function testDriver(FingerDevices_model $device): array
    {
        $driver = static::createDriver($device);

        if (!$driver) {
            return [
                'success' => false,
                'message' => 'Could not create driver for device type: ' . $device->device_type,
                'driver' => null
            ];
        }

        $result = $driver->testConnection();

        return [
            'success' => $result['success'],
            'message' => $result['message'],
            'driver' => $result['success'] ? $driver : null,
            'info' => $result['info'] ?? []
        ];
    }
}

