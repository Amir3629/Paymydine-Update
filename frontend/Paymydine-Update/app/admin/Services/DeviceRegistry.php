<?php

namespace Admin\Services\BiometricDeviceService;

/**
 * Device Registry
 * Maintains a database of known device types, their identifiers, and capabilities
 * Allows automatic device type detection based on USB Vendor/Product IDs, MAC addresses, etc.
 */
class DeviceRegistry
{
    /**
     * Known device manufacturers and their identifiers
     * @return array
     */
    public static function getKnownDevices(): array
    {
        return [
            // ZKTeco Devices
            'zkteco' => [
                'manufacturer' => 'ZKTeco',
                'usb_vendor_ids' => ['0x0BDA', '0x1D6B'], // Common USB vendor IDs
                'network_ports' => [4370, 80, 8080],
                'protocol' => 'zkteco',
                'driver_class' => 'ZKTecoDriver',
                'capabilities' => ['fingerprint', 'rfid', 'face', 'pin'],
                'models' => ['F18', 'F19', 'K40', 'K60', 'K50', 'K30', 'K20', 'K10'],
            ],

            // Suprema Devices
            'suprema' => [
                'manufacturer' => 'Suprema',
                'usb_vendor_ids' => ['0x0C45', '0x1A86'],
                'network_ports' => [51211, 80, 8080],
                'protocol' => 'suprema',
                'driver_class' => 'SupremaDriver',
                'capabilities' => ['fingerprint', 'rfid', 'face'],
                'models' => ['BioStation', 'BioLite', 'RealPass', 'RealScan'],
            ],

            // Hikvision Devices
            'hikvision' => [
                'manufacturer' => 'Hikvision',
                'usb_vendor_ids' => ['0x0BDA'],
                'network_ports' => [80, 8000, 554],
                'protocol' => 'hikvision',
                'driver_class' => 'HikvisionDriver',
                'capabilities' => ['fingerprint', 'face', 'rfid'],
                'models' => ['DS-K1T671', 'DS-K1T671M', 'DS-K5604'],
            ],

            // Generic RFID Readers
            'generic_rfid' => [
                'manufacturer' => 'Generic',
                'usb_vendor_ids' => [], // Too many to list
                'network_ports' => [],
                'protocol' => 'generic_rfid',
                'driver_class' => 'RFIDDriver',
                'capabilities' => ['rfid'],
                'models' => ['USB RFID Reader', 'Serial RFID Reader'],
            ],

            // Generic Fingerprint Scanners
            'generic_fingerprint' => [
                'manufacturer' => 'Generic',
                'usb_vendor_ids' => [],
                'network_ports' => [],
                'protocol' => 'generic_fingerprint',
                'driver_class' => 'GenericFingerprintDriver',
                'capabilities' => ['fingerprint'],
                'models' => ['USB Fingerprint Scanner'],
            ],
        ];
    }

    /**
     * Identify device type based on identifiers
     * @param array $identifiers ['usb_vendor_id', 'usb_product_id', 'mac_address', 'ip', 'port', 'model']
     * @return array|null ['type' => string, 'manufacturer' => string, 'driver_class' => string, 'capabilities' => array]
     */
    public static function identifyDevice(array $identifiers): ?array
    {
        $knownDevices = self::getKnownDevices();

        // Try to match by USB Vendor/Product ID
        if (!empty($identifiers['usb_vendor_id'])) {
            foreach ($knownDevices as $type => $config) {
                if (!empty($config['usb_vendor_ids'])) {
                    $vendorId = strtoupper($identifiers['usb_vendor_id']);
                    foreach ($config['usb_vendor_ids'] as $knownVendorId) {
                        if (strtoupper($knownVendorId) === $vendorId || 
                            strtoupper('0x' . $vendorId) === strtoupper($knownVendorId)) {
                            return [
                                'type' => $type,
                                'manufacturer' => $config['manufacturer'],
                                'driver_class' => $config['driver_class'],
                                'capabilities' => $config['capabilities'],
                                'protocol' => $config['protocol'],
                            ];
                        }
                    }
                }
            }
        }

        // Try to match by network port and protocol
        if (!empty($identifiers['port']) && !empty($identifiers['ip'])) {
            foreach ($knownDevices as $type => $config) {
                if (!empty($config['network_ports']) && in_array($identifiers['port'], $config['network_ports'])) {
                    // Try to connect and verify
                    $driverClass = "Admin\\Services\\BiometricDeviceService\\Drivers\\{$config['driver_class']}";
                    if (class_exists($driverClass)) {
                        try {
                            $driver = new $driverClass($identifiers['ip'], $identifiers['port']);
                            if ($driver->connect()) {
                                $driver->disconnect();
                                return [
                                    'type' => $type,
                                    'manufacturer' => $config['manufacturer'],
                                    'driver_class' => $config['driver_class'],
                                    'capabilities' => $config['capabilities'],
                                    'protocol' => $config['protocol'],
                                ];
                            }
                        } catch (\Exception $e) {
                            // Continue to next device type
                        }
                    }
                }
            }
        }

        // Try to match by model name
        if (!empty($identifiers['model'])) {
            foreach ($knownDevices as $type => $config) {
                if (!empty($config['models'])) {
                    foreach ($config['models'] as $knownModel) {
                        if (stripos($identifiers['model'], $knownModel) !== false) {
                            return [
                                'type' => $type,
                                'manufacturer' => $config['manufacturer'],
                                'driver_class' => $config['driver_class'],
                                'capabilities' => $config['capabilities'],
                                'protocol' => $config['protocol'],
                            ];
                        }
                    }
                }
            }
        }

        // Default to generic based on connection type
        if (!empty($identifiers['connection_type'])) {
            if ($identifiers['connection_type'] === 'usb') {
                // Try to determine if it's RFID or fingerprint based on device path
                if (isset($identifiers['device_path'])) {
                    // Most USB fingerprint scanners appear as HID devices
                    // Most USB RFID readers appear as serial devices
                    if (strpos($identifiers['device_path'], 'tty') !== false || 
                        strpos($identifiers['device_path'], 'COM') !== false) {
                        return [
                            'type' => 'generic_rfid',
                            'manufacturer' => 'Generic',
                            'driver_class' => 'RFIDDriver',
                            'capabilities' => ['rfid'],
                            'protocol' => 'generic_rfid',
                        ];
                    }
                }
            }
        }

        return null;
    }

    /**
     * Get device driver class name
     * @param string $deviceType
     * @return string|null
     */
    public static function getDriverClass(string $deviceType): ?string
    {
        $knownDevices = self::getKnownDevices();
        
        if (isset($knownDevices[$deviceType])) {
            return $knownDevices[$deviceType]['driver_class'];
        }

        return null;
    }

    /**
     * Get device capabilities
     * @param string $deviceType
     * @return array
     */
    public static function getCapabilities(string $deviceType): array
    {
        $knownDevices = self::getKnownDevices();
        
        if (isset($knownDevices[$deviceType])) {
            return $knownDevices[$deviceType]['capabilities'];
        }

        return [];
    }

    /**
     * Register a new device type
     * @param string $type
     * @param array $config
     * @return bool
     */
    public static function registerDeviceType(string $type, array $config): bool
    {
        // This would typically store in database or config file
        // For now, we'll just log it
        \Illuminate\Support\Facades\Log::info('New device type registered', [
            'type' => $type,
            'config' => $config
        ]);

        return true;
    }
}

