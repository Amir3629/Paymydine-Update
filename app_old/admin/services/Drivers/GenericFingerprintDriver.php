<?php

namespace Admin\Services\BiometricDeviceService\Drivers;

use Admin\Services\BiometricDeviceService\DeviceDriverInterface;
use Illuminate\Support\Facades\Log;

/**
 * Generic Fingerprint Driver
 * Implementation for generic USB fingerprint scanners
 * Works with most USB HID-compliant fingerprint devices
 */
class GenericFingerprintDriver implements DeviceDriverInterface
{
    protected $devicePath;
    protected $connected = false;
    protected $handle;

    public function __construct(string $devicePath)
    {
        $this->devicePath = $devicePath;
    }

    public function connect(): bool
    {
        try {
            // Generic fingerprint scanners are typically HID devices
            // On Linux, they appear as /dev/hidraw* or /dev/usb/hiddev*
            // On Windows, they use HID API
            
            if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                // Windows - use HID API or COM port
                $this->handle = @fopen($this->devicePath, 'r+b');
            } else {
                // Linux/Mac - try HID device
                if (file_exists($this->devicePath)) {
                    $this->handle = fopen($this->devicePath, 'r+b');
                } else {
                    // Try alternative paths
                    $alternatives = [
                        str_replace('ttyUSB', 'hidraw', $this->devicePath),
                        '/dev/hidraw0',
                        '/dev/hidraw1',
                    ];
                    
                    foreach ($alternatives as $alt) {
                        if (file_exists($alt)) {
                            $this->handle = fopen($alt, 'r+b');
                            $this->devicePath = $alt;
                            break;
                        }
                    }
                }
            }

            if ($this->handle) {
                stream_set_blocking($this->handle, false);
                $this->connected = true;
                return true;
            }

            return false;

        } catch (\Exception $e) {
            Log::error('Generic fingerprint connection error', [
                'device' => $this->devicePath,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    public function disconnect(): bool
    {
        if ($this->handle) {
            fclose($this->handle);
            $this->handle = null;
        }
        $this->connected = false;
        return true;
    }

    public function isConnected(): bool
    {
        return $this->connected && $this->handle;
    }

    public function getDeviceInfo(): array
    {
        return [
            'serial' => $this->getSerialNumber(),
            'firmware' => 'N/A',
            'model' => 'Generic Fingerprint Scanner',
            'manufacturer' => 'Generic',
            'device_path' => $this->devicePath,
        ];
    }

    public function getCapabilities(): array
    {
        return [
            'fingerprint' => true,
            'rfid' => false,
            'face' => false,
            'pin' => false,
        ];
    }

    public function enrollUser(int $userId, string $userName, array $enrollmentData): array
    {
        // Generic fingerprint scanners typically don't store users
        // They just capture templates which are stored in the application
        
        if (empty($enrollmentData['fingerprint_template'])) {
            return ['success' => false, 'message' => 'No fingerprint template provided'];
        }

        // Template is already captured, just return success
        return [
            'success' => true,
            'message' => 'Fingerprint template captured',
            'device_uid' => $userId
        ];
    }

    public function removeUser(int $deviceUid): bool
    {
        // Generic scanners don't store users
        return true;
    }

    public function getUsers(): array
    {
        // Generic scanners don't store users
        return [];
    }

    public function getAttendance(?\DateTime $since = null): array
    {
        // Generic scanners provide real-time scan data, not stored attendance
        return [];
    }

    public function clearAttendance(): bool
    {
        // Generic scanners don't store attendance
        return true;
    }

    public function testConnection(): array
    {
        try {
            if (!$this->connect()) {
                return [
                    'success' => false,
                    'message' => 'Failed to connect to fingerprint scanner',
                    'info' => []
                ];
            }

            return [
                'success' => true,
                'message' => 'Fingerprint scanner connected successfully',
                'info' => $this->getDeviceInfo()
            ];

        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => $e->getMessage(),
                'info' => []
            ];
        }
    }

    public function getHealthStatus(): array
    {
        return [
            'status' => $this->connected ? 'online' : 'offline',
            'users_count' => 0,
            'attendance_count' => 0,
            'memory_usage' => null,
            'disk_usage' => null,
        ];
    }

    public function restart(): bool
    {
        // Most generic scanners don't support restart
        $this->disconnect();
        usleep(500000); // Wait 0.5 seconds
        return $this->connect();
    }

    /**
     * Capture fingerprint template
     * @param int $timeout Timeout in seconds
     * @return array|null ['template' => string, 'quality' => int]
     */
    public function captureFingerprint(int $timeout = 10): ?array
    {
        if (!$this->connected) {
            return null;
        }

        // This is a simplified version
        // Real implementation would use device-specific protocol
        $startTime = time();
        $buffer = '';

        while (time() - $startTime < $timeout) {
            $data = fread($this->handle, 64);
            
            if ($data !== false && strlen($data) > 0) {
                $buffer .= $data;
                
                // Check if we have a complete fingerprint capture
                // This is device-specific and would need proper protocol implementation
                if (strlen($buffer) >= 512) {
                    return [
                        'template' => base64_encode($buffer),
                        'quality' => 80, // Would be calculated from device response
                        'timestamp' => now()->toDateTimeString()
                    ];
                }
            }
            
            usleep(100000); // 0.1 second delay
        }

        return null;
    }

    /**
     * Get device serial number
     * @return string
     */
    protected function getSerialNumber(): string
    {
        if (preg_match('/hidraw(\d+)|ttyUSB(\d+)|COM(\d+)/', $this->devicePath, $matches)) {
            return 'FINGERPRINT-' . ($matches[1] ?? $matches[2] ?? $matches[3] ?? 'UNKNOWN');
        }
        
        return 'FINGERPRINT-' . md5($this->devicePath);
    }

    public function __destruct()
    {
        $this->disconnect();
    }
}

