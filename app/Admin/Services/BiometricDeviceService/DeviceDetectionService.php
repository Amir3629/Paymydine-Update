<?php

namespace Admin\Services\BiometricDeviceService;

use Admin\Models\FingerDevices_model;
use Admin\Services\BiometricDeviceService\Drivers\ZKTecoDriver;
use Admin\Services\BiometricDeviceService\Drivers\SupremaDriver;
use Admin\Services\BiometricDeviceService\Drivers\HikvisionDriver;
use Admin\Services\BiometricDeviceService\Drivers\RFIDDriver;
use Admin\Services\BiometricDeviceService\Drivers\GenericFingerprintDriver;
use Illuminate\Support\Facades\Log;

/**
 * Device Detection Service
 * Automatically detects USB and network-connected biometric devices
 * Identifies device type (fingerprint, RFID, face recognition)
 */
class DeviceDetectionService
{
    /**
     * Scan for USB devices (RFID readers, fingerprint scanners)
     * @return array
     */
    public function scanUSBDevices(): array
    {
        $devices = [];

        if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
            // Windows - use WMI or list COM ports
            $devices = $this->scanWindowsUSB();
        } else {
            // Linux/Mac - scan /dev/ for tty devices
            $devices = $this->scanLinuxUSB();
        }

        return $devices;
    }

    /**
     * Scan for network devices (ZKTeco, Ethernet-based readers)
     * @param string $networkRange e.g., "192.168.1.0/24"
     * @return array
     */
    public function scanNetworkDevices(string $networkRange = '192.168.1.0/24'): array
    {
        $devices = [];
        $ips = $this->getIPsInRange($networkRange);

        // Common ZKTeco and biometric device ports
        $commonPorts = [4370, 80, 8080];

        foreach ($ips as $ip) {
            foreach ($commonPorts as $port) {
                if ($this->isPortOpen($ip, $port, 1)) {
                    $deviceInfo = $this->identifyNetworkDevice($ip, $port);
                    if ($deviceInfo) {
                        $devices[] = $deviceInfo;
                    }
                }
            }
        }

        return $devices;
    }

    /**
     * Auto-detect and register new devices
     * @return array ['found' => int, 'registered' => int, 'devices' => array]
     */
    public function autoDetectAndRegister(): array
    {
        $found = 0;
        $registered = 0;
        $devices = [];

        // Scan USB devices
        $usbDevices = $this->scanUSBDevices();
        $found += count($usbDevices);

        foreach ($usbDevices as $deviceInfo) {
            // Check if device already registered
            $exists = FingerDevices_model::where('serial_number', $deviceInfo['serial_number'])
                ->orWhere(function($q) use ($deviceInfo) {
                    if ($deviceInfo['connection_type'] === 'usb') {
                        $q->where('usb_vendor_id', $deviceInfo['usb_vendor_id'])
                          ->where('usb_product_id', $deviceInfo['usb_product_id']);
                    }
                })
                ->exists();

            if (!$exists) {
                $device = $this->registerDevice($deviceInfo);
                if ($device) {
                    $registered++;
                    $devices[] = $device;
                }
            }
        }

        // Scan network devices (current subnet only)
        $networkDevices = $this->scanNetworkDevices();
        $found += count($networkDevices);

        foreach ($networkDevices as $deviceInfo) {
            $exists = FingerDevices_model::where('ip', $deviceInfo['ip'])
                ->where('port', $deviceInfo['port'])
                ->exists();

            if (!$exists) {
                $device = $this->registerDevice($deviceInfo);
                if ($device) {
                    $registered++;
                    $devices[] = $device;
                }
            }
        }

        return [
            'found' => $found,
            'registered' => $registered,
            'devices' => $devices
        ];
    }

    /**
     * Register a detected device
     * @param array $deviceInfo
     * @return FingerDevices_model|null
     */
    protected function registerDevice(array $deviceInfo): ?FingerDevices_model
    {
        try {
            $device = FingerDevices_model::create([
                'name' => $deviceInfo['name'] ?? 'Auto-detected Device',
                'device_type' => $deviceInfo['device_type'] ?? 'zkteco',
                'connection_type' => $deviceInfo['connection_type'] ?? 'ethernet',
                'ip' => $deviceInfo['ip'] ?? '127.0.0.1',
                'port' => $deviceInfo['port'] ?? 4370,
                'serial_number' => $deviceInfo['serial_number'] ?? null,
                'usb_vendor_id' => $deviceInfo['usb_vendor_id'] ?? null,
                'usb_product_id' => $deviceInfo['usb_product_id'] ?? null,
                'firmware_version' => $deviceInfo['firmware_version'] ?? null,
                'model' => $deviceInfo['model'] ?? null,
                'manufacturer' => $deviceInfo['manufacturer'] ?? 'Unknown',
                'status' => 1,
                'connection_status' => 'online',
                'auto_sync_enabled' => true,
                'supports_fingerprint' => $deviceInfo['capabilities']['fingerprint'] ?? false,
                'supports_rfid' => $deviceInfo['capabilities']['rfid'] ?? false,
                'supports_face' => $deviceInfo['capabilities']['face'] ?? false,
                'supports_pin' => $deviceInfo['capabilities']['pin'] ?? false,
            ]);

            Log::info('Auto-registered biometric device', [
                'device_id' => $device->device_id,
                'name' => $device->name,
                'type' => $device->device_type
            ]);

            return $device;

        } catch (\Exception $e) {
            Log::error('Failed to register device', [
                'device_info' => $deviceInfo,
                'error' => $e->getMessage()
            ]);
            return null;
        }
    }

    /**
     * Scan Windows USB devices
     * @return array
     */
    protected function scanWindowsUSB(): array
    {
        $devices = [];

        // List COM ports
        for ($i = 1; $i <= 20; $i++) {
            $port = "COM{$i}";
            if ($this->testCOMPort($port)) {
                $devices[] = [
                    'name' => "USB RFID Reader on {$port}",
                    'device_type' => 'rfid',
                    'connection_type' => 'usb',
                    'ip' => '127.0.0.1',
                    'port' => 0,
                    'serial_number' => "USB-COM{$i}",
                    'manufacturer' => 'Generic',
                    'usb_vendor_id' => null,
                    'usb_product_id' => null,
                    'capabilities' => ['rfid' => true, 'fingerprint' => false, 'face' => false, 'pin' => false],
                ];
            }
        }

        return $devices;
    }

    /**
     * Scan Linux/Mac USB devices
     * @return array
     */
    protected function scanLinuxUSB(): array
    {
        $devices = [];

        // Scan /dev/ for USB devices
        $ttyDevices = glob('/dev/ttyUSB*');
        $acmDevices = glob('/dev/ttyACM*');
        $hidDevices = glob('/dev/hidraw*');
        $allDevices = array_merge($ttyDevices ?: [], $acmDevices ?: [], $hidDevices ?: []);

        foreach ($allDevices as $devicePath) {
            if ($this->testSerialPort($devicePath) || strpos($devicePath, 'hidraw') !== false) {
                $vendorId = $this->getUSBVendorId($devicePath);
                $productId = $this->getUSBProductId($devicePath);
                $macAddress = $this->getMACAddress($devicePath);

                // Use DeviceRegistry to identify device type
                $identifiers = [
                    'usb_vendor_id' => $vendorId,
                    'usb_product_id' => $productId,
                    'connection_type' => 'usb',
                    'device_path' => $devicePath,
                ];

                $identified = \Admin\Services\BiometricDeviceService\DeviceRegistry::identifyDevice($identifiers);

                if ($identified) {
                    $deviceInfo = [
                        'name' => $identified['manufacturer'] . " Device on " . basename($devicePath),
                        'device_type' => $identified['type'],
                        'connection_type' => 'usb',
                        'ip' => '127.0.0.1',
                        'port' => 0,
                        'serial_number' => basename($devicePath),
                        'manufacturer' => $identified['manufacturer'],
                        'usb_vendor_id' => $vendorId,
                        'usb_product_id' => $productId,
                        'mac_address' => $macAddress,
                        'capabilities' => $identified['capabilities'],
                    ];
                } else {
                    // Default to generic based on device path
                    $isFingerprint = strpos($devicePath, 'hidraw') !== false;
                    $deviceInfo = [
                        'name' => ($isFingerprint ? "USB Fingerprint Scanner" : "USB RFID Reader") . " on " . basename($devicePath),
                        'device_type' => $isFingerprint ? 'generic_fingerprint' : 'generic_rfid',
                        'connection_type' => 'usb',
                        'ip' => '127.0.0.1',
                        'port' => 0,
                        'serial_number' => basename($devicePath),
                        'manufacturer' => 'Generic',
                        'usb_vendor_id' => $vendorId,
                        'usb_product_id' => $productId,
                        'mac_address' => $macAddress,
                        'capabilities' => $isFingerprint ? ['fingerprint' => true] : ['rfid' => true],
                    ];
                }

                $devices[] = $deviceInfo;
            }
        }

        return $devices;
    }

    /**
     * Identify network device type
     * @param string $ip
     * @param int $port
     * @return array|null
     */
    protected function identifyNetworkDevice(string $ip, int $port): ?array
    {
        try {
            // Use DeviceRegistry to identify device
            $identifiers = [
                'ip' => $ip,
                'port' => $port,
            ];

            $identified = \Admin\Services\BiometricDeviceService\DeviceRegistry::identifyDevice($identifiers);

            if ($identified) {
                // Try to connect and get device info
                $driverClass = "Admin\\Services\\BiometricDeviceService\\Drivers\\{$identified['driver_class']}";
                
                if (class_exists($driverClass)) {
                    try {
                        $driver = new $driverClass($ip, $port);
                        if ($driver->connect()) {
                            $info = $driver->getDeviceInfo();
                            $capabilities = $driver->getCapabilities();
                            $driver->disconnect();

                            return [
                                'name' => $info['model'] ?? "{$identified['manufacturer']} Device at {$ip}",
                                'device_type' => $identified['type'],
                                'connection_type' => 'ethernet',
                                'ip' => $ip,
                                'port' => $port,
                                'serial_number' => $info['serial'] ?? null,
                                'firmware_version' => $info['firmware'] ?? null,
                                'model' => $info['model'] ?? null,
                                'manufacturer' => $identified['manufacturer'],
                                'capabilities' => $capabilities,
                            ];
                        }
                    } catch (\Exception $e) {
                        Log::debug('Failed to connect with identified driver', [
                            'driver' => $driverClass,
                            'error' => $e->getMessage()
                        ]);
                    }
                }
            }

            // Fallback: Try common protocols
            $drivers = [
                ['class' => ZKTecoDriver::class, 'port' => 4370],
                ['class' => SupremaDriver::class, 'port' => 51211],
                ['class' => HikvisionDriver::class, 'port' => 80],
            ];

            foreach ($drivers as $driverConfig) {
                if ($port == $driverConfig['port'] || $port == 80 || $port == 8080) {
                    try {
                        $driver = new $driverConfig['class']($ip, $port);
                        if ($driver->connect()) {
                            $info = $driver->getDeviceInfo();
                            $capabilities = $driver->getCapabilities();
                            $driver->disconnect();

                            $manufacturer = $info['manufacturer'] ?? 'Unknown';
                            $deviceType = strtolower(str_replace('Driver', '', class_basename($driverConfig['class'])));

                            return [
                                'name' => $info['model'] ?? "{$manufacturer} Device at {$ip}",
                                'device_type' => $deviceType,
                                'connection_type' => 'ethernet',
                                'ip' => $ip,
                                'port' => $port,
                                'serial_number' => $info['serial'] ?? null,
                                'firmware_version' => $info['firmware'] ?? null,
                                'model' => $info['model'] ?? null,
                                'manufacturer' => $manufacturer,
                                'capabilities' => $capabilities,
                            ];
                        }
                    } catch (\Exception $e) {
                        // Continue to next driver
                    }
                }
            }

        } catch (\Exception $e) {
            Log::debug('Failed to identify device', ['ip' => $ip, 'port' => $port, 'error' => $e->getMessage()]);
        }

        return null;
    }

    /**
     * Check if a network port is open
     * @param string $ip
     * @param int $port
     * @param int $timeout
     * @return bool
     */
    protected function isPortOpen(string $ip, int $port, int $timeout = 2): bool
    {
        $connection = @fsockopen($ip, $port, $errno, $errstr, $timeout);
        if ($connection) {
            fclose($connection);
            return true;
        }
        return false;
    }

    /**
     * Get all IPs in a CIDR range
     * @param string $cidr
     * @return array
     */
    protected function getIPsInRange(string $cidr): array
    {
        list($ip, $mask) = explode('/', $cidr);
        $ipLong = ip2long($ip);
        $maskLong = ~((1 << (32 - $mask)) - 1);
        $networkLong = $ipLong & $maskLong;
        $broadcastLong = $networkLong | ~$maskLong;

        $ips = [];
        // Limit to first 254 IPs to avoid timeouts
        $count = 0;
        for ($i = $networkLong + 1; $i < $broadcastLong && $count < 254; $i++, $count++) {
            $ips[] = long2ip($i);
        }

        return $ips;
    }

    /**
     * Test COM port availability
     * @param string $port
     * @return bool
     */
    protected function testCOMPort(string $port): bool
    {
        try {
            $handle = @fopen($port . ':', 'r+b');
            if ($handle) {
                fclose($handle);
                return true;
            }
        } catch (\Exception $e) {
            // Port not available
        }
        return false;
    }

    /**
     * Test serial port availability
     * @param string $devicePath
     * @return bool
     */
    protected function testSerialPort(string $devicePath): bool
    {
        return file_exists($devicePath) && is_readable($devicePath);
    }

    /**
     * Get USB vendor ID
     * @param string $devicePath
     * @return string|null
     */
    protected function getUSBVendorId(string $devicePath): ?string
    {
        // Try to read from sysfs
        $basename = basename($devicePath);
        $sysPath = "/sys/class/tty/{$basename}/device/../../idVendor";
        
        if (file_exists($sysPath)) {
            return trim(file_get_contents($sysPath));
        }

        return null;
    }

    /**
     * Get USB product ID
     * @param string $devicePath
     * @return string|null
     */
    protected function getUSBProductId(string $devicePath): ?string
    {
        $basename = basename($devicePath);
        
        // Try tty device path
        $sysPath = "/sys/class/tty/{$basename}/device/../../idProduct";
        if (file_exists($sysPath)) {
            return trim(file_get_contents($sysPath));
        }

        // Try hidraw device path
        $sysPath = "/sys/class/hidraw/{$basename}/device/idProduct";
        if (file_exists($sysPath)) {
            return trim(file_get_contents($sysPath));
        }

        // Try USB device path
        $sysPath = "/sys/bus/usb/devices/*/{$basename}/idProduct";
        $matches = glob($sysPath);
        if (!empty($matches)) {
            return trim(file_get_contents($matches[0]));
        }

        return null;
    }

    /**
     * Get MAC address for network devices
     * @param string $devicePath
     * @return string|null
     */
    protected function getMACAddress(string $devicePath): ?string
    {
        // For USB devices, try to get MAC from network interface if it's a network-enabled device
        $basename = basename($devicePath);
        
        // Try to find associated network interface
        $sysPath = "/sys/class/tty/{$basename}/device/../../net/*/address";
        $matches = glob($sysPath);
        
        if (!empty($matches)) {
            return trim(file_get_contents($matches[0]));
        }

        return null;
    }

    /**
     * Get device model from USB descriptors
     * @param string $devicePath
     * @return string|null
     */
    protected function getDeviceModel(string $devicePath): ?string
    {
        $basename = basename($devicePath);
        $sysPath = "/sys/class/tty/{$basename}/device/../../product";
        
        if (file_exists($sysPath)) {
            return trim(file_get_contents($sysPath));
        }

        return null;
    }
}

