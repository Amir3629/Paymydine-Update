<?php

namespace Admin\Services\BiometricDeviceService;

/**
 * Device Driver Interface
 * Abstract interface for all biometric device drivers
 * Allows seamless integration of different device brands and types
 */
interface DeviceDriverInterface
{
    /**
     * Connect to the device
     * @return bool
     */
    public function connect(): bool;

    /**
     * Disconnect from the device
     * @return bool
     */
    public function disconnect(): bool;

    /**
     * Check if device is connected
     * @return bool
     */
    public function isConnected(): bool;

    /**
     * Get device information
     * @return array ['serial', 'firmware', 'model', 'manufacturer', etc.]
     */
    public function getDeviceInfo(): array;

    /**
     * Get device capabilities
     * @return array ['fingerprint', 'rfid', 'face', 'pin']
     */
    public function getCapabilities(): array;

    /**
     * Enroll a user to the device
     * @param int $userId
     * @param string $userName
     * @param array $enrollmentData ['fingerprint' => '', 'rfid' => '', etc.]
     * @return array ['success' => true/false, 'message' => '', 'device_uid' => int]
     */
    public function enrollUser(int $userId, string $userName, array $enrollmentData): array;

    /**
     * Remove a user from the device
     * @param int $deviceUid
     * @return bool
     */
    public function removeUser(int $deviceUid): bool;

    /**
     * Get all users from device
     * @return array
     */
    public function getUsers(): array;

    /**
     * Get attendance records from device
     * @param \DateTime|null $since
     * @return array
     */
    public function getAttendance(?\DateTime $since = null): array;

    /**
     * Clear attendance records from device
     * @return bool
     */
    public function clearAttendance(): bool;

    /**
     * Test device connection and capabilities
     * @return array ['success' => true/false, 'message' => '', 'info' => []]
     */
    public function testConnection(): array;

    /**
     * Get device health status
     * @return array ['status' => 'online/offline/error', 'memory' => 0, 'disk' => 0, etc.]
     */
    public function getHealthStatus(): array;

    /**
     * Restart device
     * @return bool
     */
    public function restart(): bool;
}

