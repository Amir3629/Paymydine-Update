<?php

namespace Admin\Controllers;

use Admin\Models\FingerDevices_model;
use Admin\Models\Staffs_model;
use Admin\Models\Device_notifications_model;
use Admin\Services\BiometricDeviceService\DeviceDetectionService;
use Admin\Services\BiometricDeviceService\EnrollmentService;
use Admin\Services\BiometricDeviceService\AttendanceTrackingService;
use Admin\Services\BiometricDeviceService\DeviceMonitoringService;
use Admin\Services\BiometricDeviceService\NotificationService;
use Admin\Services\BiometricDeviceService\DeviceFactory;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

/**
 * Biometric Devices API Controller
 * RESTful API endpoints for biometric device management
 */
class BiometricDevicesAPI extends \Admin\Classes\AdminController
{
    protected $requiredPermissions = 'Admin.BiometricDevices';

    protected $detectionService;
    protected $enrollmentService;
    protected $attendanceService;
    protected $monitoringService;
    protected $notificationService;

    public function __construct()
    {
        parent::__construct();
        
        $this->detectionService = new DeviceDetectionService();
        $this->enrollmentService = new EnrollmentService();
        $this->attendanceService = new AttendanceTrackingService();
        $this->monitoringService = new DeviceMonitoringService();
        $this->notificationService = new NotificationService();
    }

    /**
     * Auto-detect devices
     * POST /admin/api/biometric/devices/detect
     */
    public function detect(Request $request)
    {
        try {
            $result = $this->detectionService->autoDetectAndRegister();

            return response()->json([
                'success' => true,
                'data' => $result,
                'message' => "Found {$result['found']} devices, registered {$result['registered']}"
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Device detection failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Test device connection
     * POST /admin/api/biometric/devices/{id}/test
     */
    public function testConnection($id)
    {
        try {
            $device = FingerDevices_model::findOrFail($id);
            $result = DeviceFactory::testDriver($device);

            return response()->json([
                'success' => $result['success'],
                'message' => $result['message'],
                'data' => $result['info'] ?? []
            ], $result['success'] ? 200 : 500);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Connection test failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Check device health
     * GET /admin/api/biometric/devices/{id}/health
     */
    public function checkHealth($id)
    {
        try {
            $device = FingerDevices_model::findOrFail($id);
            $health = $this->monitoringService->checkDeviceHealth($device);

            return response()->json([
                'success' => true,
                'data' => $health
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Health check failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get device statistics
     * GET /admin/api/biometric/devices/{id}/stats
     */
    public function getStats($id, Request $request)
    {
        try {
            $device = FingerDevices_model::findOrFail($id);
            $days = $request->get('days', 30);

            $uptime = $this->monitoringService->getDeviceUptime($device, $days);
            $performance = $this->monitoringService->getDevicePerformanceMetrics($device, min($days, 7));

            return response()->json([
                'success' => true,
                'data' => [
                    'uptime' => $uptime,
                    'performance' => $performance
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get stats: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Sync attendance from device
     * POST /admin/api/biometric/devices/{id}/sync/attendance
     */
    public function syncAttendance($id)
    {
        try {
            $device = FingerDevices_model::findOrFail($id);
            $result = $this->attendanceService->syncAttendanceFromDevice($device);

            return response()->json([
                'success' => $result['success'],
                'message' => $result['message'],
                'data' => [
                    'synced' => $result['synced'],
                    'failed' => $result['failed']
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Attendance sync failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Enroll staff to device
     * POST /admin/api/biometric/devices/{id}/enroll/{staff_id}
     */
    public function enrollStaff($id, $staffId, Request $request)
    {
        try {
            $device = FingerDevices_model::findOrFail($id);
            $staff = Staffs_model::findOrFail($staffId);

            $enrollmentData = $request->only(['fingerprint_template', 'rfid', 'face_template', 'pin']);

            $result = $this->enrollmentService->enrollToDevice($staff, $device, $enrollmentData);

            return response()->json([
                'success' => $result['success'],
                'message' => $result['message'],
                'data' => [
                    'mapping_id' => $result['mapping_id'],
                    'device_uid' => $result['device_uid'] ?? null
                ]
            ], $result['success'] ? 200 : 500);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Enrollment failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Auto-enroll staff to all devices
     * POST /admin/api/biometric/staff/{staff_id}/auto-enroll
     */
    public function autoEnrollStaff($staffId, Request $request)
    {
        try {
            $staff = Staffs_model::findOrFail($staffId);
            $enrollmentData = $request->only(['fingerprint_template', 'rfid', 'face_template', 'pin']);

            $result = $this->enrollmentService->autoEnrollToAllDevices($staff, $enrollmentData);

            return response()->json([
                'success' => $result['success'],
                'message' => $result['message'],
                'data' => [
                    'enrolled' => $result['enrolled'],
                    'failed' => $result['failed'],
                    'results' => $result['results']
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Auto-enrollment failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Remove staff enrollment from device
     * DELETE /admin/api/biometric/devices/{id}/enroll/{staff_id}
     */
    public function removeEnrollment($id, $staffId)
    {
        try {
            $device = FingerDevices_model::findOrFail($id);
            $staff = Staffs_model::findOrFail($staffId);

            $result = $this->enrollmentService->removeEnrollment($staff, $device);

            return response()->json([
                'success' => $result['success'],
                'message' => $result['message']
            ], $result['success'] ? 200 : 500);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Removal failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get unread notifications
     * GET /admin/api/biometric/notifications
     */
    public function getNotifications(Request $request)
    {
        try {
            $limit = $request->get('limit', 50);
            $notifications = $this->notificationService->getUnreadNotifications($limit);

            return response()->json([
                'success' => true,
                'data' => $notifications,
                'count' => $notifications->count()
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch notifications: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mark notification as read
     * PUT /admin/api/biometric/notifications/{id}/read
     */
    public function markNotificationRead($id)
    {
        try {
            $success = $this->notificationService->markAsRead($id);

            return response()->json([
                'success' => $success,
                'message' => $success ? 'Notification marked as read' : 'Notification not found'
            ], $success ? 200 : 404);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to mark notification: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Mark all notifications as read
     * PUT /admin/api/biometric/notifications/read-all
     */
    public function markAllNotificationsRead()
    {
        try {
            $count = $this->notificationService->markAllAsRead();

            return response()->json([
                'success' => true,
                'message' => "Marked {$count} notifications as read",
                'count' => $count
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to mark notifications: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Process real-time check-in/check-out (webhook endpoint for devices)
     * POST /admin/api/biometric/attendance/process
     */
    public function processAttendance(Request $request)
    {
        try {
            $deviceId = $request->input('device_id');
            $userId = $request->input('user_id');
            $timestamp = $request->input('timestamp', now()->toDateTimeString());
            $verificationType = $request->input('verification_type', 'fingerprint');

            $device = FingerDevices_model::findOrFail($deviceId);

            $result = $this->attendanceService->processAttendance(
                $device,
                $userId,
                $timestamp,
                $verificationType
            );

            return response()->json($result, $result['success'] ? 200 : 500);

        } catch (\Exception $e) {
            Log::error('Real-time attendance processing failed', [
                'request' => $request->all(),
                'error' => $e->getMessage()
            ]);

            return response()->json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Manual check-in/out (for when staff forgets card)
     * POST /admin/api/biometric/attendance/manual
     */
    public function manualAttendance(Request $request)
    {
        try {
            $staffId = $request->input('staff_id');
            $action = $request->input('action'); // 'check-in' or 'check-out'
            $dateTime = $request->input('date_time');
            $note = $request->input('note');

            // Validate inputs
            if (!$staffId || !$action || !$dateTime || !$note) {
                return response()->json([
                    'success' => false,
                    'message' => 'Missing required fields'
                ], 400);
            }

            // Verify staff exists
            $staff = Staffs_model::find($staffId);
            if (!$staff) {
                return response()->json([
                    'success' => false,
                    'message' => 'Staff not found'
                ], 404);
            }

            // Get current admin user
            $adminUser = \Admin\Facades\AdminAuth::getUser();
            $adminName = $adminUser ? $adminUser->staff->staff_name : 'System';

            if ($action === 'check-in') {
                // Create new check-in record
                $attendance = new \Admin\Models\Staff_attendance_model();
                $attendance->staff_id = $staffId;
                $attendance->check_in_time = date('Y-m-d H:i:s', strtotime($dateTime));
                $attendance->location_id = $staff->staff_location_id ?? 1;
                $attendance->device_type = 'manual';
                $attendance->device_id = null;
                $attendance->notes = "Manual check-in by {$adminName}. Reason: {$note}";
                $attendance->save();

                // Log audit trail
                try {
                    if (class_exists('\Admin\Models\Attendance_audit_logs_model') && 
                        Schema::hasTable('ti_attendance_audit_logs')) {
                        \Admin\Models\Attendance_audit_logs_model::create([
                            'attendance_id' => $attendance->attendance_id,
                            'staff_id' => $staffId,
                            'changed_by' => $adminUser ? $adminUser->staff_id : null,
                            'action' => 'manual_check_in',
                            'old_value' => null,
                            'new_value' => json_encode(['check_in_time' => $attendance->check_in_time]),
                            'reason' => $note,
                            'ip_address' => $request->ip(),
                            'created_at' => now()
                        ]);
                    }
                } catch (\Exception $e) {
                    // Log error but don't fail the request
                    Log::warning('Failed to create audit log: ' . $e->getMessage());
                }

                return response()->json([
                    'success' => true,
                    'message' => 'Manual check-in recorded successfully',
                    'data' => $attendance
                ]);

            } elseif ($action === 'check-out') {
                // Find today's open check-in
                $attendance = \Admin\Models\Staff_attendance_model::where('staff_id', $staffId)
                    ->whereDate('check_in_time', date('Y-m-d', strtotime($dateTime)))
                    ->whereNull('check_out_time')
                    ->orderBy('check_in_time', 'desc')
                    ->first();

                if (!$attendance) {
                    return response()->json([
                        'success' => false,
                        'message' => 'No open check-in found for this staff member today'
                    ], 404);
                }

                // Update with check-out time
                $attendance->check_out_time = date('Y-m-d H:i:s', strtotime($dateTime));
                $attendance->notes = ($attendance->notes ? $attendance->notes . "\n" : '') . 
                                    "Manual check-out by {$adminName}. Reason: {$note}";
                $attendance->save();

                // Log audit trail
                try {
                    if (class_exists('\Admin\Models\Attendance_audit_logs_model') && 
                        Schema::hasTable('ti_attendance_audit_logs')) {
                        \Admin\Models\Attendance_audit_logs_model::create([
                            'attendance_id' => $attendance->attendance_id,
                            'staff_id' => $staffId,
                            'changed_by' => $adminUser ? $adminUser->staff_id : null,
                            'action' => 'manual_check_out',
                            'old_value' => null,
                            'new_value' => json_encode(['check_out_time' => $attendance->check_out_time]),
                            'reason' => $note,
                            'ip_address' => $request->ip(),
                            'created_at' => now()
                        ]);
                    }
                } catch (\Exception $e) {
                    // Log error but don't fail the request
                    Log::warning('Failed to create audit log: ' . $e->getMessage());
                }

                return response()->json([
                    'success' => true,
                    'message' => 'Manual check-out recorded successfully',
                    'data' => $attendance
                ]);

            } else {
                return response()->json([
                    'success' => false,
                    'message' => 'Invalid action. Must be "check-in" or "check-out"'
                ], 400);
            }

        } catch (\Exception $e) {
            Log::error('BiometricDevicesAPI::manualAttendance error: ' . $e->getMessage(), [
                'staff_id' => $request->input('staff_id'),
                'action' => $request->input('action'),
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to record manual attendance: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Dashboard statistics
     * GET /admin/api/biometric/dashboard
     */
    public function getDashboard()
    {
        try {
            // Device statistics
            $totalDevices = FingerDevices_model::count();
            $onlineDevices = FingerDevices_model::where('connection_status', 'online')->count();
            $offlineDevices = FingerDevices_model::where('connection_status', 'offline')->count();

            // Staff statistics
            $enrolledStaff = Staffs_model::where('enrollment_status', 'enrolled')->count();
            $totalStaff = Staffs_model::where('staff_status', 1)->count();

            // Notifications
            $unreadNotifications = Device_notifications_model::unread()->count();
            $criticalNotifications = Device_notifications_model::critical()
                ->where('created_at', '>', now()->subHours(24))
                ->count();

            // Today's attendance
            $todayCheckins = \Admin\Models\Staff_attendance_model::whereDate('check_in_time', today())->count();
            $currentlyCheckedIn = \Admin\Models\Staff_attendance_model::whereDate('check_in_time', today())
                ->whereNull('check_out_time')
                ->count();

            return response()->json([
                'success' => true,
                'data' => [
                    'devices' => [
                        'total' => $totalDevices,
                        'online' => $onlineDevices,
                        'offline' => $offlineDevices,
                    ],
                    'staff' => [
                        'total' => $totalStaff,
                        'enrolled' => $enrolledStaff,
                    ],
                    'notifications' => [
                        'unread' => $unreadNotifications,
                        'critical' => $criticalNotifications,
                    ],
                    'attendance' => [
                        'today_checkins' => $todayCheckins,
                        'currently_checked_in' => $currentlyCheckedIn,
                    ]
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch dashboard data: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get staff list for enrollment
     * GET /admin/api/biometric/staff
     */
    public function getStaff()
    {
        try {
            $staff = Staffs_model::select([
                'staff_id',
                'staff_name',
                'staff_email',
                'staff_role_id',
                'biometric_enabled'
            ])
            ->where('staff_status', 1)
            ->get();

            // Add enrolled device count (defensive check)
            foreach ($staff as $member) {
                try {
                    if (class_exists('\Admin\Models\Staff_device_mappings_model') && 
                        \Illuminate\Support\Facades\Schema::hasTable('ti_staff_device_mappings')) {
                        $member->enrolled_devices = \Admin\Models\Staff_device_mappings_model::where('staff_id', $member->staff_id)
                            ->count();
                    } else {
                        $member->enrolled_devices = 0;
                    }
                } catch (\Exception $e) {
                    $member->enrolled_devices = 0;
                }
            }

            return response()->json([
                'success' => true,
                'data' => $staff
            ]);

        } catch (\Exception $e) {
            Log::error('BiometricDevicesAPI::getStaff error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch staff: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get staff details with enrollments
     * GET /admin/api/biometric/staff/{id}
     */
    public function getStaffDetails($staffId)
    {
        try {
            $staff = Staffs_model::find($staffId);
            
            if (!$staff) {
                return response()->json([
                    'success' => false,
                    'message' => 'Staff not found'
                ], 404);
            }

            $enrollments = [];
            try {
                if (class_exists('\Admin\Models\Staff_device_mappings_model') && 
                    \Illuminate\Support\Facades\Schema::hasTable('ti_staff_device_mappings')) {
                    $enrollments = \Admin\Models\Staff_device_mappings_model::with('device')
                        ->where('staff_id', $staffId)
                        ->get();
                }
            } catch (\Exception $e) {
                // Table doesn't exist yet, return empty array
                $enrollments = [];
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'staff' => $staff,
                    'enrollments' => $enrollments
                ]
            ]);

        } catch (\Exception $e) {
            Log::error('BiometricDevicesAPI::getStaffDetails error: ' . $e->getMessage(), [
                'staff_id' => $staffId,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch staff details: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get staff enrollments
     * GET /admin/api/biometric/staff/{id}/enrollments
     */
    public function getStaffEnrollments($staffId)
    {
        try {
            $enrollments = [];
            if (class_exists('\Admin\Models\Staff_device_mappings_model') && 
                Schema::hasTable('ti_staff_device_mappings')) {
                $enrollments = \Admin\Models\Staff_device_mappings_model::with('device')
                    ->where('staff_id', $staffId)
                    ->get()
                    ->map(function($mapping) {
                        return [
                            'device_id' => $mapping->device_id,
                            'device_name' => $mapping->device ? $mapping->device->name : 'N/A',
                            'device_type' => $mapping->device ? $mapping->device->device_type : 'N/A',
                            'enrolled_at' => $mapping->created_at,
                            'device_uid' => $mapping->device_user_id
                        ];
                    })
                    ->toArray();
            }

            return response()->json([
                'success' => true,
                'data' => $enrollments
            ]);

        } catch (\Exception $e) {
            Log::error('BiometricDevicesAPI::getStaffEnrollments error: ' . $e->getMessage(), [
                'staff_id' => $staffId,
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch enrollments: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Force reconnect device
     * POST /admin/api/biometric/devices/{id}/reconnect
     */
    public function forceReconnect($deviceId)
    {
        try {
            $monitor = new \Admin\Services\BiometricDeviceService\RealTimeConnectionMonitor();
            $result = $monitor->forceReconnect($deviceId);

            return response()->json([
                'success' => $result['success'],
                'message' => $result['message'],
                'data' => $result['device'] ?? null
            ], $result['success'] ? 200 : 500);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Reconnection failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get device uptime statistics
     * GET /admin/api/biometric/devices/{id}/uptime
     */
    public function getDeviceUptime($deviceId)
    {
        try {
            $hours = request('hours', 24);
            
            $monitor = new \Admin\Services\BiometricDeviceService\RealTimeConnectionMonitor();
            $uptime = $monitor->getDeviceUptime($deviceId, $hours);

            return response()->json([
                'success' => true,
                'data' => $uptime
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch uptime: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get real-time status of all devices
     * GET /admin/api/biometric/status/realtime
     */
    public function getRealTimeStatus()
    {
        try {
            $monitor = new \Admin\Services\BiometricDeviceService\RealTimeConnectionMonitor();
            $status = $monitor->getRealTimeStatus();

            return response()->json([
                'success' => true,
                'data' => $status
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch status: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Ping device
     * POST /admin/api/biometric/devices/{id}/ping
     */
    public function pingDevice($deviceId)
    {
        try {
            $device = FingerDevices_model::find($deviceId);
            
            if (!$device) {
                return response()->json([
                    'success' => false,
                    'message' => 'Device not found'
                ], 404);
            }

            $monitor = new \Admin\Services\BiometricDeviceService\RealTimeConnectionMonitor();
            $result = $monitor->pingDevice($device);

            return response()->json([
                'success' => $result['is_online'],
                'data' => $result
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Ping failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all devices
     * GET /admin/api/biometric/devices
     */
    public function index()
    {
        try {
            $devices = FingerDevices_model::with('location')
                ->orderBy('created_at', 'desc')
                ->get();

            return response()->json([
                'success' => true,
                'devices' => $devices
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch devices: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get device by ID
     * GET /admin/api/biometric/devices/{id}
     */
    public function show($deviceId)
    {
        try {
            $device = FingerDevices_model::with('location')->find($deviceId);
            
            if (!$device) {
                return response()->json([
                    'success' => false,
                    'message' => 'Device not found'
                ], 404);
            }
            
            return response()->json([
                'success' => true,
                'data' => $device
            ]);
            
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to fetch device: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create new staff member with card assignment
     * POST /admin/api/biometric/staff/create-with-card
     */
    public function createStaffWithCard(Request $request)
    {
        try {
            $name = $request->input('name');
            $email = $request->input('email');
            $roleId = $request->input('role_id');
            $cardUid = $request->input('card_uid');
            $cardLabel = $request->input('card_label');

            if (!$name || !$cardUid) {
                return response()->json([
                    'success' => false,
                    'message' => 'Name and card UID are required'
                ], 400);
            }

            DB::beginTransaction();

            // Create staff member
            $staff = new Staffs_model();
            $staff->staff_name = $name;
            $staff->staff_email = $email;
            $staff->staff_role_id = $roleId ?: 1; // Default role
            $staff->staff_status = 1;
            $staff->biometric_enabled = true;
            $staff->save();

            // Assign card to all RFID devices
            $rfidDevices = FingerDevices_model::where('status', 1)
                ->where(function($query) {
                    $query->where('device_type', 'like', '%rfid%')
                          ->orWhere('device_type', 'like', '%card%');
                })
                ->get();

            foreach ($rfidDevices as $device) {
                // Create mapping
                if (class_exists('\Admin\Models\Staff_device_mappings_model') && 
                    Schema::hasTable('ti_staff_device_mappings')) {
                    \Admin\Models\Staff_device_mappings_model::create([
                        'staff_id' => $staff->staff_id,
                        'device_id' => $device->device_id,
                        'device_user_id' => $cardUid, // Use card UID as device user ID
                        'card_uid' => $cardUid,
                        'card_label' => $cardLabel,
                        'enrollment_type' => 'rfid',
                        'enrolled_at' => now(),
                        'created_at' => now(),
                        'updated_at' => now()
                    ]);
                }
            }

            // Remove from unassigned cards if exists
            if (Schema::hasTable('ti_unassigned_cards')) {
                DB::table('ti_unassigned_cards')
                    ->where('card_uid', $cardUid)
                    ->delete();
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Staff created and card assigned successfully',
                'data' => [
                    'staff_id' => $staff->staff_id,
                    'staff_name' => $staff->staff_name,
                    'card_uid' => $cardUid
                ]
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('BiometricDevicesAPI::createStaffWithCard error: ' . $e->getMessage(), [
                'trace' => $e->getTraceAsString()
            ]);
            return response()->json([
                'success' => false,
                'message' => 'Failed to create staff: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all card assignments
     * GET /admin/api/biometric/cards/assignments
     */
    public function getCardAssignments()
    {
        try {
            $assignments = [];
            
            if (class_exists('\Admin\Models\Staff_device_mappings_model') && 
                Schema::hasTable('ti_staff_device_mappings')) {
                $mappings = \Admin\Models\Staff_device_mappings_model::with(['staff', 'device'])
                    ->whereNotNull('card_uid')
                    ->get();

                foreach ($mappings as $mapping) {
                    $assignments[] = [
                        'mapping_id' => $mapping->mapping_id,
                        'card_uid' => $mapping->card_uid,
                        'staff_id' => $mapping->staff_id,
                        'staff_name' => $mapping->staff ? $mapping->staff->staff_name : 'Unknown',
                        'card_label' => $mapping->card_label ?? null,
                        'device_id' => $mapping->device_id,
                        'device_name' => $mapping->device ? $mapping->device->name : 'All Devices',
                        'enrolled_at' => $mapping->enrolled_at ? $mapping->enrolled_at->format('Y-m-d H:i:s') : null
                    ];
                }
            }

            return response()->json([
                'success' => true,
                'data' => $assignments
            ]);

        } catch (\Exception $e) {
            Log::error('BiometricDevicesAPI::getCardAssignments error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load card assignments: ' . $e->getMessage(),
                'data' => []
            ], 500);
        }
    }

    /**
     * Get unassigned cards
     * GET /admin/api/biometric/cards/unassigned
     */
    public function getUnassignedCards()
    {
        try {
            $cards = [];
            
            if (Schema::hasTable('ti_unassigned_cards')) {
                $unassigned = DB::table('ti_unassigned_cards')
                    ->orderBy('last_seen_at', 'desc')
                    ->get();

                foreach ($unassigned as $card) {
                    $cards[] = [
                        'id' => $card->id,
                        'card_uid' => $card->card_uid,
                        'device_id' => $card->device_id,
                        'first_seen_at' => $card->first_seen_at,
                        'last_seen_at' => $card->last_seen_at,
                        'times_scanned' => $card->times_scanned ?? 1,
                        'location_id' => $card->location_id,
                        'notes' => $card->notes
                    ];
                }
            }

            return response()->json([
                'success' => true,
                'data' => $cards
            ]);

        } catch (\Exception $e) {
            Log::error('BiometricDevicesAPI::getUnassignedCards error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to load unassigned cards: ' . $e->getMessage(),
                'data' => []
            ], 500);
        }
    }

    /**
     * Assign card to staff
     * POST /admin/api/biometric/cards/assign
     */
    public function assignCard(Request $request)
    {
        try {
            $cardUid = $request->input('card_uid');
            $staffId = $request->input('staff_id');

            if (!$cardUid || !$staffId) {
                return response()->json([
                    'success' => false,
                    'message' => 'Card UID and Staff ID are required'
                ], 400);
            }

            $staff = Staffs_model::find($staffId);
            if (!$staff) {
                return response()->json([
                    'success' => false,
                    'message' => 'Staff not found'
                ], 404);
            }

            DB::beginTransaction();

            // Assign to all RFID devices
            $rfidDevices = FingerDevices_model::where('status', 1)
                ->where(function($query) {
                    $query->where('device_type', 'like', '%rfid%')
                          ->orWhere('device_type', 'like', '%card%');
                })
                ->get();

            foreach ($rfidDevices as $device) {
                if (class_exists('\Admin\Models\Staff_device_mappings_model') && 
                    Schema::hasTable('ti_staff_device_mappings')) {
                    // Check if already exists
                    $existing = \Admin\Models\Staff_device_mappings_model::where('staff_id', $staffId)
                        ->where('device_id', $device->device_id)
                        ->where('card_uid', $cardUid)
                        ->first();

                    if (!$existing) {
                        \Admin\Models\Staff_device_mappings_model::create([
                            'staff_id' => $staffId,
                            'device_id' => $device->device_id,
                            'device_user_id' => $cardUid,
                            'card_uid' => $cardUid,
                            'enrollment_type' => 'rfid',
                            'enrolled_at' => now(),
                            'created_at' => now(),
                            'updated_at' => now()
                        ]);
                    }
                }
            }

            // Remove from unassigned cards
            if (Schema::hasTable('ti_unassigned_cards')) {
                DB::table('ti_unassigned_cards')
                    ->where('card_uid', $cardUid)
                    ->delete();
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => 'Card assigned successfully'
            ]);

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('BiometricDevicesAPI::assignCard error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to assign card: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Unassign card
     * DELETE /admin/api/biometric/cards/unassign/{mappingId}
     */
    public function unassignCard($mappingId)
    {
        try {
            if (class_exists('\Admin\Models\Staff_device_mappings_model') && 
                Schema::hasTable('ti_staff_device_mappings')) {
                $mapping = \Admin\Models\Staff_device_mappings_model::find($mappingId);
                
                if ($mapping) {
                    $cardUid = $mapping->card_uid;
                    $mapping->delete();

                    return response()->json([
                        'success' => true,
                        'message' => 'Card assignment removed'
                    ]);
                }
            }

            return response()->json([
                'success' => false,
                'message' => 'Mapping not found'
            ], 404);

        } catch (\Exception $e) {
            Log::error('BiometricDevicesAPI::unassignCard error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to remove assignment: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Read card from RFID device
     * POST /admin/api/biometric/devices/{id}/read-card
     */
    public function readCard($deviceId)
    {
        try {
            $device = FingerDevices_model::find($deviceId);
            
            if (!$device) {
                return response()->json([
                    'success' => false,
                    'message' => 'Device not found'
                ], 404);
            }

            // Try to get latest card scan from device
            $driver = DeviceFactory::createDriver($device);
            
            if (!$driver || !$driver->isConnected()) {
                $driver->connect();
            }

            // For RFID devices, try to read latest card
            // This depends on device capability
            // Most RFID readers send card UID when card is scanned
            
            // For now, return a placeholder
            // In production, this would read from device buffer
            return response()->json([
                'success' => false,
                'message' => 'Card reading not yet implemented for this device type',
                'card_uid' => null
            ]);

        } catch (\Exception $e) {
            Log::error('BiometricDevicesAPI::readCard error: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to read card: ' . $e->getMessage(),
                'card_uid' => null
            ], 500);
        }
    }
}

