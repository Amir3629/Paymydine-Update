<?php

namespace App\Helpers;

use Rats\Zkteco\Lib\ZKTeco;

/**
 * FingerHelper - Helper class for ZKTeco biometric device communication
 */
class FingerHelper
{
    /**
     * Initialize ZKTeco device connection
     *
     * @param string $ip Device IP address
     * @param int $port Device port (default 4370)
     * @return ZKTeco
     */
    public function init($ip, $port = 4370): ZKTeco
    {
        return new ZKTeco($ip, $port);
    }

    /**
     * Get device connection status
     *
     * @param ZKTeco $zk ZKTeco device instance
     * @return bool
     */
    public function getStatus(ZKTeco $zk): bool
    {
        return $zk->connect();
    }

    /**
     * Get device connection status as formatted string
     *
     * @param ZKTeco $zk ZKTeco device instance
     * @return string
     */
    public function getStatusFormatted(ZKTeco $zk): string
    {
        return $zk->connect() ? "Active" : "Inactive";
    }

    /**
     * Get device serial number
     *
     * @param ZKTeco $zk ZKTeco device instance
     * @return string|false
     */
    public function getSerial(ZKTeco $zk)
    {
        if ($zk->connect()) {
            $serial = $zk->serialNumber();
            // Serial Number Sample: CDQ9192960002\x00
            return substr(strstr($serial, '='), 1);
        }

        return false;
    }

    /**
     * Get device version information
     *
     * @param ZKTeco $zk ZKTeco device instance
     * @return string|false
     */
    public function getVersion(ZKTeco $zk)
    {
        if ($zk->connect()) {
            return $zk->version();
        }

        return false;
    }

    /**
     * Test device connectivity
     *
     * @param string $ip Device IP address
     * @param int $port Device port
     * @return array
     */
    public function testConnection($ip, $port = 4370): array
    {
        try {
            $device = $this->init($ip, $port);
            $connected = $this->getStatus($device);
            
            if ($connected) {
                $serial = $this->getSerial($device);
                $version = $this->getVersion($device);
                
                return [
                    'success' => true,
                    'message' => 'Device connected successfully',
                    'serial' => $serial,
                    'version' => $version,
                ];
            } else {
                return [
                    'success' => false,
                    'message' => 'Failed to connect to device. Check IP address and network connection.',
                ];
            }
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'Error: ' . $e->getMessage(),
            ];
        }
    }
}

