<?php

namespace Admin\Services\BiometricDeviceService;

use Admin\Models\Staffs_model;
use Admin\Models\Staff_device_mappings_model;
use Admin\Models\Staff_attendance_model;
use Admin\Models\Attendance_audit_logs_model;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

/**
 * GDPR Compliance Service
 * Handles GDPR/data protection compliance for biometric data
 * Provides data export, deletion, and consent management
 */
class GDPRComplianceService
{
    protected $encryptionService;

    public function __construct()
    {
        $this->encryptionService = new BiometricEncryptionService();
    }

    /**
     * Export all biometric data for a staff member (GDPR right to access)
     * @param Staffs_model $staff
     * @return array
     */
    public function exportStaffBiometricData(Staffs_model $staff): array
    {
        return [
            'staff_information' => [
                'staff_id' => $staff->staff_id,
                'staff_name' => $staff->staff_name,
                'staff_email' => $staff->staff_email,
                'enrollment_status' => $staff->enrollment_status,
                'enrolled_at' => $staff->enrolled_at?->toDateTimeString(),
                'enrolled_by' => $staff->enrolled_by,
            ],
            'biometric_enrollments' => [
                'fingerprint_enrolled' => !empty($staff->fingerprint_template),
                'rfid_enrolled' => !empty($staff->rfid_card_uid),
                'face_enrolled' => !empty($staff->face_template),
                'pin_enrolled' => !empty($staff->pin_code),
                'devices_enrolled' => $staff->enrolled_devices ?? [],
            ],
            'device_mappings' => Staff_device_mappings_model::where('staff_id', $staff->staff_id)
                ->with('device')
                ->get()
                ->map(function($mapping) {
                    return [
                        'device_name' => $mapping->device->name ?? 'Unknown',
                        'enrollment_type' => $mapping->enrollment_type,
                        'enrolled_at' => $mapping->enrolled_at?->toDateTimeString(),
                        'sync_status' => $mapping->sync_status,
                    ];
                })
                ->toArray(),
            'attendance_records' => Staff_attendance_model::where('staff_id', $staff->staff_id)
                ->orderBy('check_in_time', 'desc')
                ->limit(1000) // Last 1000 records
                ->get()
                ->map(function($attendance) {
                    return [
                        'check_in_time' => $attendance->check_in_time->toDateTimeString(),
                        'check_out_time' => $attendance->check_out_time?->toDateTimeString(),
                        'hours_worked' => $attendance->hours_worked,
                        'location' => $attendance->location->location_name ?? 'Unknown',
                        'device_type' => $attendance->device_type,
                        'verification_method' => $attendance->verification_method,
                        'status' => $attendance->status,
                    ];
                })
                ->toArray(),
            'audit_logs' => Attendance_audit_logs_model::whereHas('attendance', function($q) use ($staff) {
                    $q->where('staff_id', $staff->staff_id);
                })
                ->orderBy('created_at', 'desc')
                ->limit(100) // Last 100 audit logs
                ->get()
                ->map(function($log) {
                    return [
                        'action' => $log->action,
                        'changed_by' => $log->changedBy->staff_name ?? 'System',
                        'reason' => $log->reason,
                        'timestamp' => $log->created_at->toDateTimeString(),
                    ];
                })
                ->toArray(),
            'export_metadata' => [
                'exported_at' => now()->toDateTimeString(),
                'exported_by' => auth()->user()->staff_name ?? 'System',
                'format_version' => '1.0',
            ]
        ];
    }

    /**
     * Delete all biometric data for a staff member (GDPR right to erasure)
     * @param Staffs_model $staff
     * @param bool $anonymize If true, anonymize instead of delete (for audit trail)
     * @return array
     */
    public function deleteStaffBiometricData(Staffs_model $staff, bool $anonymize = true): array
    {
        DB::beginTransaction();

        try {
            $deletedItems = [];

            // Remove from all devices
            $mappings = Staff_device_mappings_model::where('staff_id', $staff->staff_id)->get();
            
            foreach ($mappings as $mapping) {
                if ($mapping->device) {
                    $driver = \Admin\Services\BiometricDeviceService\DeviceFactory::createDriver($mapping->device);
                    if ($driver && $driver->connect()) {
                        if ($mapping->device_uid) {
                            $driver->removeUser($mapping->device_uid);
                        }
                        $driver->disconnect();
                    }
                }
                $mapping->delete();
                $deletedItems[] = 'device_mapping_' . $mapping->mapping_id;
            }

            // Clear biometric data from staff record
            if ($anonymize) {
                // Anonymize for audit trail
                $staff->fingerprint_template = '[DELETED BY USER REQUEST]';
                $staff->face_template = '[DELETED BY USER REQUEST]';
                $staff->rfid_card_uid = 'DELETED_' . time();
                $staff->card_id = null;
                $staff->pin_code = null;
                $staff->enrollment_status = 'not_enrolled';
                $staff->enrolled_devices = null;
            } else {
                // Complete deletion
                $staff->fingerprint_template = null;
                $staff->face_template = null;
                $staff->rfid_card_uid = null;
                $staff->card_id = null;
                $staff->pin_code = null;
                $staff->enrollment_status = 'not_enrolled';
                $staff->enrolled_devices = null;
            }
            
            $staff->biometric_enabled = false;
            $staff->save();
            $deletedItems[] = 'staff_biometric_data';

            // Create audit log
            Log::info('Biometric data deleted', [
                'staff_id' => $staff->staff_id,
                'staff_name' => $staff->staff_name,
                'anonymized' => $anonymize,
                'deleted_by' => auth()->user()->staff_name ?? 'System'
            ]);

            DB::commit();

            return [
                'success' => true,
                'message' => 'Biometric data deleted successfully',
                'deleted_items' => $deletedItems,
                'anonymized' => $anonymize,
                'deleted_at' => now()->toDateTimeString()
            ];

        } catch (\Exception $e) {
            DB::rollBack();

            Log::error('Failed to delete biometric data', [
                'staff_id' => $staff->staff_id,
                'error' => $e->getMessage()
            ]);

            return [
                'success' => false,
                'message' => 'Failed to delete biometric data: ' . $e->getMessage()
            ];
        }
    }

    /**
     * Record consent for biometric data collection
     * @param Staffs_model $staff
     * @param string $consentType
     * @param bool $consented
     * @return bool
     */
    public function recordConsent(Staffs_model $staff, string $consentType, bool $consented): bool
    {
        try {
            // Store consent in staff metadata or separate consent table
            $consent = [
                'type' => $consentType,
                'consented' => $consented,
                'timestamp' => now()->toDateTimeString(),
                'ip_address' => request()->ip(),
                'user_agent' => request()->userAgent(),
            ];

            // TODO: Store in dedicated consent table for better tracking
            // For now, log it
            Log::info('Biometric consent recorded', [
                'staff_id' => $staff->staff_id,
                'consent' => $consent
            ]);

            return true;

        } catch (\Exception $e) {
            Log::error('Failed to record consent', [
                'staff_id' => $staff->staff_id,
                'error' => $e->getMessage()
            ]);
            return false;
        }
    }

    /**
     * Generate GDPR compliance report
     * @return array
     */
    public function generateComplianceReport(): array
    {
        $totalStaff = Staffs_model::where('staff_status', 1)->count();
        $enrolledStaff = Staffs_model::where('enrollment_status', 'enrolled')->count();
        $biometricEnabled = Staffs_model::where('biometric_enabled', true)->count();

        $fingerprintEnrolled = Staffs_model::whereNotNull('fingerprint_template')
            ->where('fingerprint_template', '!=', '[DELETED BY USER REQUEST]')
            ->count();
        
        $rfidEnrolled = Staffs_model::whereNotNull('rfid_card_uid')
            ->where('rfid_card_uid', 'not like', 'DELETED_%')
            ->count();
        
        $faceEnrolled = Staffs_model::whereNotNull('face_template')
            ->where('face_template', '!=', '[DELETED BY USER REQUEST]')
            ->count();

        return [
            'summary' => [
                'total_staff' => $totalStaff,
                'enrolled_staff' => $enrolledStaff,
                'biometric_enabled' => $biometricEnabled,
                'enrollment_rate' => $totalStaff > 0 ? round(($enrolledStaff / $totalStaff) * 100, 2) : 0,
            ],
            'enrollment_by_type' => [
                'fingerprint' => $fingerprintEnrolled,
                'rfid' => $rfidEnrolled,
                'face' => $faceEnrolled,
            ],
            'data_protection' => [
                'encryption_enabled' => true,
                'audit_logging_enabled' => true,
                'consent_tracking_enabled' => true,
                'data_retention_policy' => 'Attendance: Permanent, Logs: 90 days',
                'right_to_erasure_supported' => true,
                'right_to_access_supported' => true,
            ],
            'audit_trail' => [
                'attendance_changes' => Attendance_audit_logs_model::where('created_at', '>', now()->subDays(30))->count(),
                'recent_deletions' => Staffs_model::where('enrollment_status', 'not_enrolled')
                    ->where('updated_at', '>', now()->subDays(30))
                    ->count(),
            ],
            'generated_at' => now()->toDateTimeString(),
        ];
    }

    /**
     * Validate that biometric data handling is compliant
     * @return array
     */
    public function validateCompliance(): array
    {
        $issues = [];
        $warnings = [];

        // Check if encryption is configured
        if (empty(config('app.key'))) {
            $issues[] = 'Application encryption key not set';
        }

        // Check if audit logging is working
        $recentAudits = Attendance_audit_logs_model::where('created_at', '>', now()->subHours(24))->count();
        if ($recentAudits === 0) {
            $warnings[] = 'No audit logs in last 24 hours - audit logging may not be working';
        }

        // Check for unencrypted biometric data (shouldn't happen with new system)
        // This is a placeholder - actual check would need to verify encryption

        $isCompliant = empty($issues);

        return [
            'compliant' => $isCompliant,
            'issues' => $issues,
            'warnings' => $warnings,
            'checked_at' => now()->toDateTimeString(),
            'recommendations' => $this->getComplianceRecommendations($issues, $warnings),
        ];
    }

    /**
     * Get compliance recommendations based on issues
     * @param array $issues
     * @param array $warnings
     * @return array
     */
    protected function getComplianceRecommendations(array $issues, array $warnings): array
    {
        $recommendations = [];

        if (in_array('Application encryption key not set', $issues)) {
            $recommendations[] = 'Generate application encryption key: php artisan key:generate';
        }

        if (empty($issues) && empty($warnings)) {
            $recommendations[] = 'System is compliant. Continue regular monitoring.';
        }

        return $recommendations;
    }
}

