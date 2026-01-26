<?php

namespace Admin\Services\BiometricDeviceService\Drivers;

use Admin\Services\BiometricDeviceService\DeviceDriverInterface;
use Illuminate\Support\Facades\Log;

/**
 * Suprema Device Driver
 * Implementation for Suprema biometric devices (BioStation, BioLite, RealPass, RealScan)
 * Supports fingerprint, RFID, and face recognition
 */
class SupremaDriver implements DeviceDriverInterface
{
    protected $ip;
    protected $port;
    protected $connected = false;
    protected $socket;

    public function __construct(string $ip, int $port = 51211)
    {
        $this->ip = $ip;
        $this->port = $port;
    }

    public function connect(): bool
    {
        try {
            // Suprema devices use TCP socket connection
            $this->socket = @fsockopen($this->ip, $this->port, $errno, $errstr, 5);
            
            if (!$this->socket) {
                Log::error('Suprema connection error', [
                    'ip' => $this->ip,
                    'port' => $this->port,
                    'error' => $errstr
                ]);
                return false;
            }

            stream_set_timeout($this->socket, 5);
            $this->connected = true;

            // Send handshake/initialization command
            $this->sendCommand('INIT');

            return true;

        } catch (\Exception $e) {
            Log::error('Suprema connection exception', [
                'ip' => $this->ip,
                'port' => $this->port,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    public function disconnect(): bool
    {
        if ($this->socket) {
            fclose($this->socket);
            $this->socket = null;
        }
        $this->connected = false;
        return true;
    }

    public function isConnected(): bool
    {
        return $this->connected && $this->socket && !feof($this->socket);
    }

    public function getDeviceInfo(): array
    {
        if (!$this->connected) {
            return [];
        }

        try {
            // Suprema devices use specific commands to get device info
            $response = $this->sendCommand('GET_DEVICE_INFO');
            
            return [
                'serial' => $response['serial'] ?? 'N/A',
                'firmware' => $response['firmware'] ?? 'N/A',
                'model' => $response['model'] ?? 'Suprema Device',
                'manufacturer' => 'Suprema',
                'platform' => $response['platform'] ?? 'N/A',
            ];

        } catch (\Exception $e) {
            Log::error('Failed to get Suprema device info', ['error' => $e->getMessage()]);
            return [];
        }
    }

    public function getCapabilities(): array
    {
        // Suprema devices typically support multiple methods
        return [
            'fingerprint' => true,
            'rfid' => true,
            'face' => true,
            'pin' => false,
        ];
    }

    public function enrollUser(int $userId, string $userName, array $enrollmentData): array
    {
        if (!$this->connected) {
            return ['success' => false, 'message' => 'Device not connected'];
        }

        try {
            // Suprema enrollment process
            $command = [
                'action' => 'ENROLL',
                'user_id' => $userId,
                'user_name' => $userName,
                'fingerprint_template' => $enrollmentData['fingerprint_template'] ?? null,
                'rfid' => $enrollmentData['rfid'] ?? null,
                'face_template' => $enrollmentData['face_template'] ?? null,
            ];

            $response = $this->sendCommand('ENROLL_USER', $command);

            if ($response['success'] ?? false) {
                return [
                    'success' => true,
                    'message' => 'User enrolled successfully',
                    'device_uid' => $response['device_uid'] ?? $userId
                ];
            }

            return ['success' => false, 'message' => $response['message'] ?? 'Enrollment failed'];

        } catch (\Exception $e) {
            Log::error('Failed to enroll user on Suprema device', [
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
            $response = $this->sendCommand('DELETE_USER', ['uid' => $deviceUid]);
            return $response['success'] ?? false;
        } catch (\Exception $e) {
            Log::error('Failed to remove user from Suprema device', [
                'uid' => $deviceUid,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    public function getUsers(): array
    {
        if (!$this->connected) {
            return [];
        }

        try {
            $response = $this->sendCommand('GET_USERS');
            return $response['users'] ?? [];
        } catch (\Exception $e) {
            Log::error('Failed to get users from Suprema device', ['error' => $e->getMessage()]);
            return [];
        }
    }

    public function getAttendance(?\DateTime $since = null): array
    {
        if (!$this->connected) {
            return [];
        }

        try {
            $params = [];
            if ($since) {
                $params['since'] = $since->format('Y-m-d H:i:s');
            }

            $response = $this->sendCommand('GET_ATTENDANCE', $params);
            return $response['attendance'] ?? [];
        } catch (\Exception $e) {
            Log::error('Failed to get attendance from Suprema device', ['error' => $e->getMessage()]);
            return [];
        }
    }

    public function clearAttendance(): bool
    {
        if (!$this->connected) {
            return false;
        }

        try {
            $response = $this->sendCommand('CLEAR_ATTENDANCE');
            return $response['success'] ?? false;
        } catch (\Exception $e) {
            Log::error('Failed to clear attendance on Suprema device', ['error' => $e->getMessage()]);
            return false;
        }
    }

    public function testConnection(): array
    {
        try {
            if (!$this->connect()) {
                return [
                    'success' => false,
                    'message' => 'Failed to connect to Suprema device',
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
            $response = $this->sendCommand('GET_STATUS');
            
            return [
                'status' => 'online',
                'users_count' => $response['users_count'] ?? 0,
                'attendance_count' => $response['attendance_count'] ?? 0,
                'memory_usage' => $response['memory_usage'] ?? null,
                'disk_usage' => $response['disk_usage'] ?? null,
                'firmware_version' => $response['firmware'] ?? null,
            ];
        } catch (\Exception $e) {
            Log::error('Failed to get Suprema health status', ['error' => $e->getMessage()]);
            return ['status' => 'error', 'error' => $e->getMessage()];
        }
    }

    public function restart(): bool
    {
        if (!$this->connected) {
            return false;
        }

        try {
            $response = $this->sendCommand('RESTART');
            return $response['success'] ?? false;
        } catch (\Exception $e) {
            Log::error('Failed to restart Suprema device', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Send command to Suprema device
     * @param string $command
     * @param array $params
     * @return array
     */
    protected function sendCommand(string $command, array $params = []): array
    {
        if (!$this->connected || !$this->socket) {
            throw new \Exception('Device not connected');
        }

        // Build command packet (Suprema protocol)
        $packet = [
            'command' => $command,
            'params' => $params,
            'timestamp' => time(),
        ];

        $data = json_encode($packet) . "\n";
        fwrite($this->socket, $data);

        // Read response
        $response = '';
        $timeout = time() + 5;
        
        while (time() < $timeout) {
            $line = fgets($this->socket);
            if ($line === false) {
                break;
            }
            $response .= $line;
            if (strpos($response, "\n") !== false) {
                break;
            }
        }

        return json_decode($response, true) ?? ['success' => false, 'message' => 'Invalid response'];
    }

    public function __destruct()
    {
        $this->disconnect();
    }
}

