<?php

namespace Admin\Services\BiometricDeviceService\Drivers;

use Admin\Services\BiometricDeviceService\DeviceDriverInterface;
use Illuminate\Support\Facades\Log;

/**
 * Hikvision Device Driver
 * Implementation for Hikvision biometric devices (DS-K1T671, DS-K5604, etc.)
 * Supports fingerprint, face recognition, and RFID
 */
class HikvisionDriver implements DeviceDriverInterface
{
    protected $ip;
    protected $port;
    protected $username;
    protected $password;
    protected $connected = false;
    protected $sessionId;

    public function __construct(string $ip, int $port = 80, string $username = 'admin', string $password = 'admin123')
    {
        $this->ip = $ip;
        $this->port = $port;
        $this->username = $username;
        $this->password = $password;
    }

    public function connect(): bool
    {
        try {
            // Hikvision devices use HTTP/HTTPS API
            $url = "http://{$this->ip}:{$this->port}/ISAPI/Security/sessionLogin";
            
            $auth = base64_encode($this->username . ':' . $this->password);
            
            $ch = curl_init();
            curl_setopt($ch, CURLOPT_URL, $url);
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Basic ' . $auth,
                'Content-Type: application/xml'
            ]);
            curl_setopt($ch, CURLOPT_POSTFIELDS, '<SessionLogin><userName>' . $this->username . '</userName><password>' . $this->password . '</password></SessionLogin>');
            curl_setopt($ch, CURLOPT_TIMEOUT, 5);

            $response = curl_exec($ch);
            $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
            curl_close($ch);

            if ($httpCode === 200 && $response) {
                // Parse session ID from XML response
                $xml = simplexml_load_string($response);
                if ($xml && isset($xml->sessionId)) {
                    $this->sessionId = (string)$xml->sessionId;
                    $this->connected = true;
                    return true;
                }
            }

            Log::error('Hikvision connection failed', [
                'ip' => $this->ip,
                'port' => $this->port,
                'http_code' => $httpCode
            ]);

            return false;

        } catch (\Exception $e) {
            Log::error('Hikvision connection exception', [
                'ip' => $this->ip,
                'port' => $this->port,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    public function disconnect(): bool
    {
        if ($this->connected && $this->sessionId) {
            try {
                $url = "http://{$this->ip}:{$this->port}/ISAPI/Security/sessionLogout";
                $ch = curl_init();
                curl_setopt($ch, CURLOPT_URL, $url);
                curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
                curl_setopt($ch, CURLOPT_CUSTOMREQUEST, 'PUT');
                curl_setopt($ch, CURLOPT_HTTPHEADER, [
                    'Cookie: WebSession=' . $this->sessionId
                ]);
                curl_setopt($ch, CURLOPT_TIMEOUT, 3);
                curl_exec($ch);
                curl_close($ch);
            } catch (\Exception $e) {
                // Ignore logout errors
            }
        }

        $this->connected = false;
        $this->sessionId = null;
        return true;
    }

    public function isConnected(): bool
    {
        return $this->connected && !empty($this->sessionId);
    }

    public function getDeviceInfo(): array
    {
        if (!$this->connected) {
            return [];
        }

        try {
            $url = "http://{$this->ip}:{$this->port}/ISAPI/System/deviceInfo";
            $response = $this->makeRequest($url, 'GET');

            if ($response) {
                $xml = simplexml_load_string($response);
                if ($xml) {
                    return [
                        'serial' => (string)($xml->serialNumber ?? 'N/A'),
                        'firmware' => (string)($xml->firmwareVersion ?? 'N/A'),
                        'model' => (string)($xml->deviceName ?? 'Hikvision Device'),
                        'manufacturer' => 'Hikvision',
                        'platform' => (string)($xml->deviceType ?? 'N/A'),
                    ];
                }
            }

        } catch (\Exception $e) {
            Log::error('Failed to get Hikvision device info', ['error' => $e->getMessage()]);
        }

        return [];
    }

    public function getCapabilities(): array
    {
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
            // Hikvision enrollment via ISAPI
            $url = "http://{$this->ip}:{$this->port}/ISAPI/AccessControl/UserInfo/Record";
            
            $xml = new \SimpleXMLElement('<UserInfo></UserInfo>');
            $xml->employeeNo = $userId;
            $xml->name = $userName;
            
            if (!empty($enrollmentData['fingerprint_template'])) {
                $xml->fingerPrintList->fingerPrint->fingerPrintID = 1;
                $xml->fingerPrintList->fingerPrint->fingerPrintData = $enrollmentData['fingerprint_template'];
            }
            
            if (!empty($enrollmentData['rfid'])) {
                $xml->cardNo = $enrollmentData['rfid'];
            }

            $response = $this->makeRequest($url, 'POST', $xml->asXML());

            if ($response) {
                $result = simplexml_load_string($response);
                if ($result && isset($result->statusCode) && $result->statusCode == 1) {
                    return [
                        'success' => true,
                        'message' => 'User enrolled successfully',
                        'device_uid' => $userId
                    ];
                }
            }

            return ['success' => false, 'message' => 'Enrollment failed'];

        } catch (\Exception $e) {
            Log::error('Failed to enroll user on Hikvision device', [
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
            $url = "http://{$this->ip}:{$this->port}/ISAPI/AccessControl/UserInfo/Delete?format=json&employeeNo={$deviceUid}";
            $response = $this->makeRequest($url, 'PUT');
            
            if ($response) {
                $result = json_decode($response, true);
                return isset($result['statusCode']) && $result['statusCode'] == 1;
            }

            return false;
        } catch (\Exception $e) {
            Log::error('Failed to remove user from Hikvision device', [
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
            $url = "http://{$this->ip}:{$this->port}/ISAPI/AccessControl/UserInfo/Search";
            $response = $this->makeRequest($url, 'POST', '<CMSearchDescription><searchID>1</searchID><searchResultPosition>0</searchResultPosition><maxResults>1000</maxResults></CMSearchDescription>');

            if ($response) {
                $xml = simplexml_load_string($response);
                $users = [];
                if ($xml && isset($xml->UserInfo)) {
                    foreach ($xml->UserInfo as $user) {
                        $users[] = [
                            'uid' => (int)$user->employeeNo,
                            'userid' => (int)$user->employeeNo,
                            'name' => (string)$user->name,
                        ];
                    }
                }
                return $users;
            }

        } catch (\Exception $e) {
            Log::error('Failed to get users from Hikvision device', ['error' => $e->getMessage()]);
        }

        return [];
    }

    public function getAttendance(?\DateTime $since = null): array
    {
        if (!$this->connected) {
            return [];
        }

        try {
            $url = "http://{$this->ip}:{$this->port}/ISAPI/AccessControl/AcsEvent";
            
            $searchXml = '<CMSearchDescription><searchID>1</searchID><searchResultPosition>0</searchResultPosition><maxResults>1000</maxResults>';
            if ($since) {
                $searchXml .= '<timeSpanList><timeSpan><startTime>' . $since->format('Y-m-d\TH:i:s') . '</startTime><endTime>' . date('Y-m-d\TH:i:s') . '</endTime></timeSpan></timeSpanList>';
            }
            $searchXml .= '</CMSearchDescription>';

            $response = $this->makeRequest($url, 'POST', $searchXml);

            if ($response) {
                $xml = simplexml_load_string($response);
                $attendance = [];
                if ($xml && isset($xml->AcsEvent)) {
                    foreach ($xml->AcsEvent as $event) {
                        $attendance[] = [
                            'id' => (int)$event->employeeNo,
                            'timestamp' => (string)$event->time,
                            'type' => (string)$event->eventType == 'normal' ? 0 : 1,
                        ];
                    }
                }
                return $attendance;
            }

        } catch (\Exception $e) {
            Log::error('Failed to get attendance from Hikvision device', ['error' => $e->getMessage()]);
        }

        return [];
    }

    public function clearAttendance(): bool
    {
        // Hikvision devices don't typically support clearing attendance via API
        // Attendance is usually stored in database and cleared manually
        return true;
    }

    public function testConnection(): array
    {
        try {
            if (!$this->connect()) {
                return [
                    'success' => false,
                    'message' => 'Failed to connect to Hikvision device',
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
            $users = $this->getUsers();
            
            return [
                'status' => 'online',
                'users_count' => count($users),
                'attendance_count' => null, // Hikvision doesn't provide this easily
                'memory_usage' => null,
                'disk_usage' => null,
            ];
        } catch (\Exception $e) {
            Log::error('Failed to get Hikvision health status', ['error' => $e->getMessage()]);
            return ['status' => 'error', 'error' => $e->getMessage()];
        }
    }

    public function restart(): bool
    {
        if (!$this->connected) {
            return false;
        }

        try {
            $url = "http://{$this->ip}:{$this->port}/ISAPI/System/reboot";
            $response = $this->makeRequest($url, 'PUT');
            return $response !== false;
        } catch (\Exception $e) {
            Log::error('Failed to restart Hikvision device', ['error' => $e->getMessage()]);
            return false;
        }
    }

    /**
     * Make HTTP request to Hikvision device
     * @param string $url
     * @param string $method
     * @param string|null $data
     * @return string|false
     */
    protected function makeRequest(string $url, string $method = 'GET', ?string $data = null)
    {
        if (!$this->connected) {
            return false;
        }

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_CUSTOMREQUEST, $method);
        curl_setopt($ch, CURLOPT_TIMEOUT, 5);
        
        $headers = [];
        if ($this->sessionId) {
            $headers[] = 'Cookie: WebSession=' . $this->sessionId;
        }
        
        if ($data) {
            curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
            $headers[] = 'Content-Type: application/xml';
        }
        
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        
        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200) {
            return $response;
        }

        return false;
    }

    public function __destruct()
    {
        $this->disconnect();
    }
}

