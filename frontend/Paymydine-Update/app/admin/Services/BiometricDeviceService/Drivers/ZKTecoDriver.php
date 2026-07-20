<?php

namespace Admin\Services\BiometricDeviceService\Drivers;

use Admin\Services\BiometricDeviceService\DeviceDriverInterface;
use Rats\Zkteco\Lib\ZKTeco;
use Illuminate\Support\Facades\Log;

/**
 * ZKTeco Device Driver
 * Implementation for ZKTeco biometric devices (fingerprint, RFID, face)
 */
class ZKTecoDriver implements DeviceDriverInterface
{
    protected $device;
    protected $ip;
    protected $port;
    protected $connected = false;

    public function __construct(string $ip, int $port = 4370)
    {
        $this->ip = $ip;
        $this->port = $port;
        $this->device = new ZKTeco($ip, $port);
    }

    public function connect(): bool
    {
        try {
            $this->connected = $this->device->connect();
            if ($this->connected) {
                $this->device->disableDevice();
            }
            return $this->connected;
        } catch (\Exception $e) {
            Log::error('ZKTeco connection error', [
                'ip' => $this->ip,
                'port' => $this->port,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    public function disconnect(): bool
    {
        try {
            if ($this->connected) {
                $this->device->enableDevice();
                $this->device->disconnect();
                $this->connected = false;
            }
            return true;
        } catch (\Exception $e) {
            Log::error('ZKTeco disconnection error', ['error' => $e->getMessage()]);
            return false;
        }
    }

    public function isConnected(): bool
    {
        return $this->connected;
    }

    public function getDeviceInfo(): array
    {
        if (!$this->connected) {
            return [];
        }

        try {
            return [
                'serial' => $this->device->serialNumber(),
                'firmware' => $this->device->version(),
                'model' => $this->device->deviceName() ?? 'ZKTeco Device',
                'manufacturer' => 'ZKTeco',
                'platform' => $this->device->platform(),
                'os_version' => $this->device->osVersion(),
                'fingerprint_algorithm' => $this->device->getFPVersion(),
                'face_algorithm' => $this->device->getFaceFunOn(),
            ];
        } catch (\Exception $e) {
            Log::error('Failed to get device info', ['error' => $e->getMessage()]);
            return [];
        }
    }

    public function getCapabilities(): array
    {
        $capabilities = [
            'fingerprint' => true,
            'rfid' => false,
            'face' => false,
            'pin' => true,
        ];

        if (!$this->connected) {
            return $capabilities;
        }

        try {
            // Check if device supports face recognition
            $faceSupport = $this->device->getFaceFunOn();
            $capabilities['face'] = $faceSupport == 1;

            // ZKTeco devices typically support RFID cards
            $capabilities['rfid'] = true;

        } catch (\Exception $e) {
            Log::warning('Could not determine all device capabilities', ['error' => $e->getMessage()]);
        }

        return $capabilities;
    }

    public function enrollUser(int $userId, string $userName, array $enrollmentData): array
    {
        if (!$this->connected) {
            return ['success' => false, 'message' => 'Device not connected'];
        }

        try {
            // Get next available UID
            $users = $this->device->getUser();
            $uids = array_column($users, 'uid');
            $nextUid = empty($uids) ? 1 : max($uids) + 1;

            // Prepare user data
            $cardNo = $enrollmentData['rfid'] ?? $enrollmentData['card_id'] ?? '0';
            $password = $enrollmentData['pin'] ?? '';
            $role = 0; // 0 = User, 14 = Admin

            // Add user to device
            $result = $this->device->setUser(
                $nextUid,
                $userId,
                $userName,
                $password,
                $role,
                $cardNo
            );

            if (!$result) {
                return ['success' => false, 'message' => 'Failed to enroll user'];
            }

            // If fingerprint template provided, add it
            if (!empty($enrollmentData['fingerprint_template'])) {
                // Note: ZKTeco requires special template format
                // This is a simplified version - actual implementation needs proper template handling
                try {
                    $this->device->setUserTemplate($nextUid, $enrollmentData['fingerprint_template']);
                } catch (\Exception $e) {
                    Log::warning('Failed to add fingerprint template', ['error' => $e->getMessage()]);
                }
            }

            return [
                'success' => true,
                'message' => 'User enrolled successfully',
                'device_uid' => $nextUid
            ];

        } catch (\Exception $e) {
            Log::error('Failed to enroll user', [
                'user_id' => $userId,
                'error' => $e->getMessage()
            ]);
            return ['success' => false, 'message' => $e->getMessage()];
        }
    }

    public function removeUser(int $deviceUid): bool
    {
        if (!$this->connected) {
            return false;
        }

        try {
            return $this->device->deleteUser($deviceUid);
        } catch (\Exception $e) {
            Log::error('Failed to remove user', ['uid' => $deviceUid, 'error' => $e->getMessage()]);
            return false;
        }
    }

    public function getUsers(): array
    {
        if (!$this->connected) {
            return [];
        }

        try {
            return $this->device->getUser();
        } catch (\Exception $e) {
            Log::error('Failed to get users', ['error' => $e->getMessage()]);
            return [];
        }
    }

    public function getAttendance(?\DateTime $since = null): array
    {
        if (!$this->connected) {
            return [];
        }

        try {
            $attendanceData = $this->device->getAttendance();
            
            // Filter by date if provided
            if ($since && !empty($attendanceData)) {
                $attendanceData = array_filter($attendanceData, function($record) use ($since) {
                    $timestamp = $record['timestamp'] ?? null;
                    if (!$timestamp) return false;
                    
                    $recordTime = strtotime($timestamp);
                    return $recordTime >= $since->getTimestamp();
                });
            }

            return array_values($attendanceData);
        } catch (\Exception $e) {
            Log::error('Failed to get attendance', ['error' => $e->getMessage()]);
            return [];
        }
    }

    public function clearAttendance(): bool
    {
        if (!$this->connected) {
            return false;
        }

        try {
            return $this->device->clearAttendance();
        } catch (\Exception $e) {
            Log::error('Failed to clear attendance', ['error' => $e->getMessage()]);
            return false;
        }
    }

    public function testConnection(): array
    {
        try {
            if (!$this->connect()) {
                return [
                    'success' => false,
                    'message' => 'Failed to connect to device',
                    'info' => []
                ];
            }

            $info = $this->getDeviceInfo();
            $capabilities = $this->getCapabilities();

            $this->disconnect();

            return [
                'success' => true,
                'message' => 'Connection successful',
                'info' => array_merge($info, ['capabilities' => $capabilities])
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
        if (!$this->connected) {
            return ['status' => 'offline'];
        }

        try {
            $users = $this->device->getUser();
            $attendance = $this->device->getAttendance();

            return [
                'status' => 'online',
                'users_count' => count($users),
                'attendance_count' => count($attendance),
                'memory_usage' => null, // ZKTeco doesn't provide this via SDK
                'disk_usage' => null,
                'firmware_version' => $this->device->version(),
            ];
        } catch (\Exception $e) {
            Log::error('Failed to get health status', ['error' => $e->getMessage()]);
            return ['status' => 'error', 'error' => $e->getMessage()];
        }
    }

    public function restart(): bool
    {
        if (!$this->connected) {
            return false;
        }

        try {
            return $this->device->restart();
        } catch (\Exception $e) {
            Log::error('Failed to restart device', ['error' => $e->getMessage()]);
            return false;
        }
    }

    public function __destruct()
    {
        $this->disconnect();
    }
}

