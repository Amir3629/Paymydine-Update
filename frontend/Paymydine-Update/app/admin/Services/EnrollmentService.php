<?php

namespace Admin\Services\BiometricDeviceService;

use Admin\Models\FingerDevices_model;
use Admin\Models\Staffs_model;
use Admin\Models\Staff_device_mappings_model;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

/**
 * Enrollment Service
 * Handles automatic enrollment of employees to biometric devices
 * Supports fingerprint, RFID, face recognition, and PIN enrollment
 */
class EnrollmentService
{
    protected $deviceFactory;

    public function __construct()
    {
        $this->deviceFactory = new DeviceFactory();
    }

    /**
     * Auto-enroll a staff member to all active devices
     * @param Staffs_model $staff
     * @param array $enrollmentData ['fingerprint_template' => '', 'rfid' => '', etc.]
     * @return array ['success' => bool, 'enrolled' => int, 'failed' => int, 'results' => array]
     */
    public function autoEnrollToAllDevices(Staffs_model $staff, array $enrollmentData = []): array
    {
        $devices = FingerDevices_model::where('status', 1)
            ->where('auto_enroll_enabled', true)
            ->get();

        if ($devices->isEmpty()) {
            return [
                'success' => false,
                'message' => 'No auto-enrollment enabled devices found',
                'enrolled' => 0,
                'failed' => 0,
                'results' => []
            ];
        }

        $enrolled = 0;
        $failed = 0;
        $results = [];

        foreach ($devices as $device) {
            $result = $this->enrollToDevice($staff, $device, $enrollmentData);
            
            if ($result['success']) {
                $enrolled++;
            } else {
                $failed++;
            }

            $results[] = [
                'device_id' => $device->device_id,
                'device_name' => $device->name,
                'success' => $result['success'],
                'message' => $result['message']
            ];
        }

        // Update staff enrollment status
        if ($enrolled > 0) {
            $staff->enrollment_status = 'enrolled';
            $staff->enrolled_at = now();
            $staff->enrolled_devices = $devices->pluck('device_id')->toArray();
            $staff->save();
        }

        return [
            'success' => $enrolled > 0,
            'message' => "Enrolled to {$enrolled} devices, {$failed} failed",
            'enrolled' => $enrolled,
            'failed' => $failed,
            'results' => $results
        ];
    }

    /**
     * Enroll a staff member to a specific device
     * @param Staffs_model $staff
     * @param FingerDevices_model $device
     * @param array $enrollmentData
     * @return array ['success' => bool, 'message' => string, 'mapping_id' => int|null]
     */
    public function enrollToDevice(Staffs_model $staff, FingerDevices_model $device, array $enrollmentData = []): array
    {
        DB::beginTransaction();

        try {
            // Get or create device driver
            $driver = DeviceFactory::createDriver($device);
            
            if (!$driver) {
                throw new \Exception('Could not create device driver');
            }

            if (!$driver->connect()) {
                throw new \Exception('Could not connect to device');
            }

            // Prepare enrollment data
            $data = $this->prepareEnrollmentData($staff, $enrollmentData);

            // Determine enrollment type based on device capabilities
            $capabilities = $driver->getCapabilities();
            $enrollmentType = $this->determineEnrollmentType($capabilities, $data);

            // Enroll user to device
            $result = $driver->enrollUser($staff->staff_id, $staff->staff_name, $data);

            if (!$result['success']) {
                throw new \Exception($result['message']);
            }

            // Create device mapping record
            $mapping = Staff_device_mappings_model::updateOrCreate(
                [
                    'staff_id' => $staff->staff_id,
                    'device_id' => $device->device_id,
                    'enrollment_type' => $enrollmentType
                ],
                [
                    'device_uid' => $result['device_uid'] ?? null,
                    'sync_status' => 'synced',
                    'enrollment_data' => $this->encryptEnrollmentData($data),
                    'enrolled_at' => now(),
                    'last_synced_at' => now()
                ]
            );

            // Update device last_sync_at
            $device->update(['last_sync_at' => now()]);

            $driver->disconnect();

            DB::commit();

            Log::info('Staff enrolled to device', [
                'staff_id' => $staff->staff_id,
                'device_id' => $device->device_id,
                'enrollment_type' => $enrollmentType
            ]);

            return [
                'success' => true,
                'message' => 'Staff enrolled successfully',
                'mapping_id' => $mapping->mapping_id,
                'device_uid' => $result['device_uid'] ?? null
            ];

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Failed to enroll staff to device', [
                'staff_id' => $staff->staff_id,
                'device_id' => $device->device_id,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => $e->getMessage(),
                'mapping_id' => null
            ];
        }
    }

    /**
     * Start fingerprint enrollment session
     * @param Staffs_model $staff
     * @param FingerDevices_model $device
     * @return array ['success' => bool, 'session_id' => string, 'message' => string]
     */
    public function startFingerprintEnrollment(Staffs_model $staff, FingerDevices_model $device): array
    {
        try {
            $sessionId = uniqid('fp_enroll_', true);

            // Store session in cache/session
            cache()->put("fingerprint_enrollment:{$sessionId}", [
                'staff_id' => $staff->staff_id,
                'device_id' => $device->device_id,
                'started_at' => now()->toDateTimeString(),
                'status' => 'waiting',
                'scans_completed' => 0,
                'scans_required' => 3 // Most devices require 3 scans
            ], now()->addMinutes(5));

            return [
                'success' => true,
                'session_id' => $sessionId,
                'message' => 'Enrollment session started. Please scan fingerprint 3 times.'
            ];

        } catch (\Exception $e) {
            return [
                'success' => false,
                'session_id' => null,
                'message' => 'Failed to start enrollment: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Enroll RFID card
     * @param Staffs_model $staff
     * @param FingerDevices_model $device
     * @param string $cardUid
     * @return array
     */
    public function enrollRFIDCard(Staffs_model $staff, FingerDevices_model $device, string $cardUid): array
    {
        try {
            // Check if card is already assigned
            $existing = Staffs_model::where('rfid_card_uid', $cardUid)
                ->where('staff_id', '!=', $staff->staff_id)
                ->first();

            if ($existing) {
                return [
                    'success' => false,
                    'message' => "Card already assigned to {$existing->staff_name}"
                ];
            }

            // Update staff record
            $staff->rfid_card_uid = $cardUid;
            $staff->card_id = $cardUid; // For backward compatibility
            $staff->save();

            // Enroll to device
            $result = $this->enrollToDevice($staff, $device, ['rfid' => $cardUid]);

            if ($result['success']) {
                return [
                    'success' => true,
                    'message' => 'RFID card enrolled successfully',
                    'card_uid' => $cardUid
                ];
            }

            return $result;

        } catch (\Exception $e) {
            Log::error('RFID enrollment failed', [
                'staff_id' => $staff->staff_id,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Failed to enroll RFID card: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Remove staff enrollment from device
     * @param Staffs_model $staff
     * @param FingerDevices_model $device
     * @return array
     */
    public function removeEnrollment(Staffs_model $staff, FingerDevices_model $device): array
    {
        try {
            // Get mapping
            $mapping = Staff_device_mappings_model::where('staff_id', $staff->staff_id)
                ->where('device_id', $device->device_id)
                ->first();

            if (!$mapping) {
                return [
                    'success' => false,
                    'message' => 'Staff not enrolled on this device'
                ];
            }

            // Connect to device and remove user
            $driver = DeviceFactory::createDriver($device);
            
            if ($driver && $driver->connect()) {
                if ($mapping->device_uid) {
                    $driver->removeUser($mapping->device_uid);
                }
                $driver->disconnect();
            }

            // Delete mapping
            $mapping->delete();

            // Update staff enrolled devices list
            $enrolledDevices = $staff->enrolled_devices ?? [];
            $enrolledDevices = array_diff($enrolledDevices, [$device->device_id]);
            $staff->enrolled_devices = $enrolledDevices;
            
            if (empty($enrolledDevices)) {
                $staff->enrollment_status = 'not_enrolled';
            }
            
            $staff->save();

            return [
                'success' => true,
                'message' => 'Enrollment removed successfully'
            ];

        } catch (\Exception $e) {
            Log::error('Failed to remove enrollment', [
                'staff_id' => $staff->staff_id,
                'device_id' => $device->device_id,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Failed to remove enrollment: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Sync all staff to a device
     * @param FingerDevices_model $device
     * @return array
     */
    public function syncAllStaffToDevice(FingerDevices_model $device): array
    {
        $staff = Staffs_model::where('staff_status', 1)
            ->where('biometric_enabled', true)
            ->get();

        $enrolled = 0;
        $failed = 0;
        $results = [];

        foreach ($staff as $staffMember) {
            $result = $this->enrollToDevice($staffMember, $device);
            
            if ($result['success']) {
                $enrolled++;
            } else {
                $failed++;
            }

            $results[] = [
                'staff_id' => $staffMember->staff_id,
                'staff_name' => $staffMember->staff_name,
                'success' => $result['success'],
                'message' => $result['message']
            ];
        }

        return [
            'success' => $enrolled > 0,
            'message' => "Synced {$enrolled} staff members, {$failed} failed",
            'enrolled' => $enrolled,
            'failed' => $failed,
            'results' => $results
        ];
    }

    /**
     * Prepare enrollment data from staff record and provided data
     * @param Staffs_model $staff
     * @param array $enrollmentData
     * @return array
     */
    protected function prepareEnrollmentData(Staffs_model $staff, array $enrollmentData): array
    {
        return [
            'fingerprint_template' => $enrollmentData['fingerprint_template'] ?? $staff->fingerprint_template ?? null,
            'rfid' => $enrollmentData['rfid'] ?? $staff->rfid_card_uid ?? $staff->card_id ?? null,
            'card_id' => $enrollmentData['card_id'] ?? $staff->card_id ?? null,
            'face_template' => $enrollmentData['face_template'] ?? $staff->face_template ?? null,
            'pin' => $enrollmentData['pin'] ?? null,
        ];
    }

    /**
     * Determine enrollment type based on capabilities and available data
     * @param array $capabilities
     * @param array $data
     * @return string
     */
    protected function determineEnrollmentType(array $capabilities, array $data): string
    {
        if ($capabilities['fingerprint'] && !empty($data['fingerprint_template'])) {
            return 'fingerprint';
        }

        if ($capabilities['rfid'] && !empty($data['rfid'])) {
            return 'rfid';
        }

        if ($capabilities['face'] && !empty($data['face_template'])) {
            return 'face';
        }

        if ($capabilities['pin'] && !empty($data['pin'])) {
            return 'pin';
        }

        // Default to fingerprint if device supports it
        if ($capabilities['fingerprint']) {
            return 'fingerprint';
        }

        // Default to RFID
        return 'rfid';
    }

    /**
     * Encrypt enrollment data for secure storage
     * @param array $data
     * @return string
     */
    protected function encryptEnrollmentData(array $data): string
    {
        // Remove sensitive data that shouldn't be stored
        $safeData = array_filter($data, function($key) {
            return in_array($key, ['card_id', 'rfid']);
        }, ARRAY_FILTER_USE_KEY);

        return encrypt(json_encode($safeData));
    }
}

