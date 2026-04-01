<?php

namespace Admin\Services\BiometricDeviceService\Drivers;

use Admin\Services\BiometricDeviceService\DeviceDriverInterface;
use Illuminate\Support\Facades\Log;

/**
 * Generic RFID Reader Driver
 * Implementation for generic USB/Serial RFID card readers
 * Supports standard RFID protocols (EM4100, Mifare, etc.)
 */
class RFIDDriver implements DeviceDriverInterface
{
    protected $port;
    protected $baudRate;
    protected $connected = false;
    protected $handle;
    protected $devicePath;

    public function __construct(string $devicePath, int $baudRate = 9600)
    {
        $this->devicePath = $devicePath;
        $this->baudRate = $baudRate;
    }

    public function connect(): bool
    {
        try {
            // For Linux/Mac: /dev/ttyUSB0, /dev/ttyACM0, etc.
            // For Windows: COM1, COM2, etc.
            if (!file_exists($this->devicePath) && !str_starts_with($this->devicePath, 'COM')) {
                Log::error('RFID device not found', ['path' => $this->devicePath]);
                return false;
            }

            // Open serial port connection
            if (strtoupper(substr(PHP_OS, 0, 3)) === 'WIN') {
                // Windows
                $this->handle = fopen($this->devicePath, 'r+b');
            } else {
                // Linux/Mac
                exec("stty -F {$this->devicePath} {$this->baudRate} cs8 -cstopb -parenb");
                $this->handle = fopen($this->devicePath, 'r+');
            }

            if (!$this->handle) {
                return false;
            }

            stream_set_blocking($this->handle, false);
            stream_set_timeout($this->handle, 1);

            $this->connected = true;
            return true;

        } catch (\Exception $e) {
            Log::error('RFID connection error', [
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
        return $this->connected;
    }

    public function getDeviceInfo(): array
    {
        return [
            'serial' => $this->getSerialNumber(),
            'firmware' => 'N/A',
            'model' => 'Generic RFID Reader',
            'manufacturer' => 'Generic',
            'device_path' => $this->devicePath,
            'baud_rate' => $this->baudRate,
        ];
    }

    public function getCapabilities(): array
    {
        return [
            'fingerprint' => false,
            'rfid' => true,
            'face' => false,
            'pin' => false,
        ];
    }

    public function enrollUser(int $userId, string $userName, array $enrollmentData): array
    {
        // RFID readers typically don't store user data
        // They just read card UIDs which are stored in the application database
        
        if (empty($enrollmentData['rfid'])) {
            return ['success' => false, 'message' => 'No RFID card UID provided'];
        }

        return [
            'success' => true,
            'message' => 'RFID card linked to user',
            'device_uid' => $userId, // Use staff_id as device_uid for RFID
            'rfid_uid' => $enrollmentData['rfid']
        ];
    }

    public function removeUser(int $deviceUid): bool
    {
        // RFID readers don't store users, so always return true
        return true;
    }

    public function getUsers(): array
    {
        // RFID readers don't store users
        return [];
    }

    public function getAttendance(?\DateTime $since = null): array
    {
        // RFID readers provide real-time scan data, not stored attendance
        // Attendance is recorded in the application when card is scanned
        return [];
    }

    public function clearAttendance(): bool
    {
        // RFID readers don't store attendance
        return true;
    }

    public function testConnection(): array
    {
        try {
            if (!$this->connect()) {
                return [
                    'success' => false,
                    'message' => 'Failed to connect to RFID reader',
                    'info' => []
                ];
            }

            // Try to read data to verify connection
            $testRead = $this->readCard(1);

            return [
                'success' => true,
                'message' => 'RFID reader connected successfully',
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
        // Most RFID readers don't support restart command
        $this->disconnect();
        usleep(500000); // Wait 0.5 seconds
        return $this->connect();
    }

    /**
     * Read RFID card data
     * @param int $timeout Timeout in seconds
     * @return array|null ['uid' => string, 'raw_data' => string]
     */
    public function readCard(int $timeout = 5): ?array
    {
        if (!$this->connected) {
            return null;
        }

        $startTime = time();
        $buffer = '';

        while (time() - $startTime < $timeout) {
            $data = fread($this->handle, 128);
            
            if ($data !== false && strlen($data) > 0) {
                $buffer .= $data;
                
                // Check if we have a complete card read
                // Different readers have different formats, this is a generic approach
                if (strlen($buffer) >= 10) {
                    $uid = $this->parseCardData($buffer);
                    if ($uid) {
                        return [
                            'uid' => $uid,
                            'raw_data' => $buffer,
                            'timestamp' => now()->toDateTimeString()
                        ];
                    }
                }
            }
            
            usleep(100000); // 0.1 second delay
        }

        return null;
    }

    /**
     * Parse raw card data to extract UID
     * @param string $rawData
     * @return string|null
     */
    protected function parseCardData(string $rawData): ?string
    {
        // Remove non-alphanumeric characters
        $cleaned = preg_replace('/[^A-Fa-f0-9]/', '', $rawData);
        
        // Most RFID cards have 8-20 hex characters
        if (strlen($cleaned) >= 8 && strlen($cleaned) <= 20) {
            return strtoupper($cleaned);
        }

        return null;
    }

    /**
     * Get device serial number
     * @return string
     */
    protected function getSerialNumber(): string
    {
        // Try to get serial from device path
        if (preg_match('/ttyUSB(\d+)|ttyACM(\d+)|COM(\d+)/', $this->devicePath, $matches)) {
            return 'RFID-' . ($matches[1] ?? $matches[2] ?? $matches[3] ?? 'UNKNOWN');
        }
        
        return 'RFID-' . md5($this->devicePath);
    }

    public function __destruct()
    {
        $this->disconnect();
    }
}

