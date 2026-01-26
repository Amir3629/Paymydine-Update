<?php

namespace Admin\Controllers;

use Admin\Models\FingerDevices_model;
use Admin\Models\Staffs_model;
use Admin\Models\Staff_attendance_model;
use Admin\Models\Staff_latetimes_model;
use Admin\Models\Staff_overtimes_model;
use App\Helpers\FingerHelper;
use Rats\Zkteco\Lib\ZKTeco;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\DB;

/**
 * Biometric Devices Controller
 * Manages ZKTeco biometric devices and attendance synchronization
 */
class Biometricdevices extends \Admin\Classes\AdminController
{
    public $implement = [
        'Admin\Actions\ListController',
        'Admin\Actions\FormController',
    ];

    public $listConfig = [
        'list' => [
            'model' => 'Admin\Models\FingerDevices_model',
            'title' => 'Biometric Devices',
            'emptyMessage' => 'No devices found',
            'defaultSort' => ['device_id', 'DESC'],
            'configFile' => 'finger_devices_model',
        ],
    ];

    public $formConfig = [
        'name' => 'Biometric Device',
        'model' => 'Admin\Models\FingerDevices_model',
        'create' => [
            'title' => 'Create Device',
            'redirect' => 'biometric_devices/edit/{device_id}',
            'redirectClose' => 'biometric_devices',
        ],
        'edit' => [
            'title' => 'Edit Device',
            'redirect' => 'biometric_devices/edit/{device_id}',
            'redirectClose' => 'biometric_devices',
        ],
        'configFile' => 'finger_devices_model',
    ];

    protected $requiredPermissions = 'Admin.BiometricDevices';

    public function __construct()
    {
        parent::__construct();
        \Admin\Facades\AdminMenu::setContext('biometric_devices', 'system');
    }

    /**
     * Override index to add tabs for management, devices, enroll, attendance, reports
     */
    public function index()
    {
        $activeTab = request('tab', 'attendance'); // Default to Staff Attendance tab
        
        // Always preserve the active tab in vars
        $this->vars['activeTab'] = $activeTab;
        
        // Set page title based on active tab
        switch ($activeTab) {
            case 'management':
                \Admin\Facades\Template::setTitle('Device Management');
                \Admin\Facades\Template::setHeading('Device Management');
                // Load devices and stats for management tab
                $devices = FingerDevices_model::with('location')
                    ->orderBy('created_at', 'desc')
                    ->get();
                
                $stats = [
                    'total' => $devices->count(),
                    'online' => 0,
                    'offline' => 0,
                    'pending' => 0,
                ];
                
                try {
                    $firstDevice = $devices->first();
                    if ($firstDevice && isset($firstDevice->connection_status)) {
                        $stats['online'] = $devices->where('connection_status', 'online')->count();
                        $stats['offline'] = $devices->where('connection_status', 'offline')->count();
                        $stats['pending'] = $devices->where('connection_status', 'checking')->count();
                    }
                } catch (\Exception $e) {
                    // Column doesn't exist yet
                }
                
                try {
                    $stats['enrolled'] = \Admin\Models\Staff_device_mappings_model::distinct('staff_id')->count('staff_id');
                } catch (\Exception $e) {
                    $stats['enrolled'] = 0;
                }
                
                $this->vars['devices'] = $devices;
                $this->vars['stats'] = $stats;
                break;
                
            case 'enroll':
                \Admin\Facades\Template::setTitle('Enroll Staff');
                \Admin\Facades\Template::setHeading('Enroll Staff to Devices');
                // Load staff and devices for enroll tab
                $staff = Staffs_model::where('staff_status', 1)
                    ->select('staff_id', 'staff_name', 'staff_email', 'staff_role_id', 'biometric_enabled')
                    ->get();
                
                try {
                    $devices = FingerDevices_model::where('status', 1);
                    $firstDevice = FingerDevices_model::first();
                    if ($firstDevice && isset($firstDevice->connection_status)) {
                        $devices = $devices->where('connection_status', 'online');
                    }
                    $devices = $devices->get();
                } catch (\Exception $e) {
                    $devices = FingerDevices_model::where('status', 1)->get();
                }
                
                $this->vars['staff'] = $staff;
                $this->vars['devices'] = $devices;
                break;
                
            case 'devices':
                \Admin\Facades\Template::setTitle('Biometric Devices');
                \Admin\Facades\Template::setHeading('Biometric Devices');
                $this->asExtension('ListController')->index();
                // Don't return - let the view render normally
                break;
                
            case 'attendance':
                \Admin\Facades\Template::setTitle('Staff Attendance');
                \Admin\Facades\Template::setHeading('Staff Attendance');
                break;
                
            case 'reports':
                \Admin\Facades\Template::setTitle('Attendance Reports');
                \Admin\Facades\Template::setHeading('Attendance Reports');
                break;
        }
        
        // For non-list tabs, let the framework handle the view automatically
    }


    /**
     * Attendance calendar view
     */
    public function attendanceCalendar()
    {
        $this->pageTitle = 'Attendance Calendar';
        
        $month = request('month', now()->month);
        $year = request('year', now()->year);
        
        $startDate = \Carbon\Carbon::create($year, $month, 1)->startOfMonth();
        $endDate = $startDate->copy()->endOfMonth();
        
        // Get all staff
        $staffs = Staffs_model::where('staff_status', 1)->get();
        
        // Get attendance for the month
        $attendances = Staff_attendance_model::with(['staff', 'location'])
            ->whereBetween('check_in_time', [$startDate, $endDate])
            ->get()
            ->groupBy(function($attendance) {
                return $attendance->check_in_time->format('Y-m-d');
            });
        
        $this->vars['staffs'] = $staffs;
        $this->vars['attendances'] = $attendances;
        $this->vars['startDate'] = $startDate;
        $this->vars['endDate'] = $endDate;
        $this->vars['currentMonth'] = $month;
        $this->vars['currentYear'] = $year;
    }

    /**
     * Export attendance report
     */
    public function reportExport(Request $request)
    {
        $dateFrom = $request->get('date_from', now()->startOfMonth()->format('Y-m-d'));
        $dateTo = $request->get('date_to', now()->endOfMonth()->format('Y-m-d'));
        $staffFilter = $request->get('staff_id');
        $locationFilter = $request->get('location_id');
        $deviceTypeFilter = $request->get('device_type');
        $statusFilter = $request->get('status');
        $exportFormat = $request->get('export_format', 'pdf');
        $reportTitle = $request->get('report_title', 'Attendance Report');
        $reportNotes = $request->get('report_notes', '');
        
        // Build query same as reports view
        $query = Staff_attendance_model::with(['staff', 'location', 'device'])
            ->whereBetween('check_in_time', [$dateFrom . ' 00:00:00', $dateTo . ' 23:59:59'])
            ->orderBy('check_in_time', 'desc');
        
        if ($staffFilter) {
            $query->where('staff_id', $staffFilter);
        }
        if ($locationFilter) {
            $query->where('location_id', $locationFilter);
        }
        if ($deviceTypeFilter) {
            $query->where('device_type', $deviceTypeFilter);
        }
        if ($statusFilter === 'checked_in') {
            $query->whereNull('check_out_time');
        } elseif ($statusFilter === 'checked_out') {
            $query->whereNotNull('check_out_time');
        }
        
        $reportData = $query->get();
        
        // Get statistics
        $totalStaff = Staffs_model::where('staff_status', 1)->count();
        $totalLate = Staff_latetimes_model::whereBetween('latetime_date', [$dateFrom, $dateTo])->count();
        $totalOvertime = Staff_overtimes_model::whereBetween('overtime_date', [$dateFrom, $dateTo])->count();
        $totalHoursWorked = $reportData->where('check_out_time', '!=', null)->sum(function($r) {
            return $r->hours_worked ?? 0;
        });
        
        if ($exportFormat === 'excel' || $exportFormat === 'csv') {
            $filename = 'attendance_report_' . $dateFrom . '_to_' . $dateTo . '.' . ($exportFormat === 'excel' ? 'xlsx' : 'csv');
            
            $headers = [
                'Content-Type' => $exportFormat === 'excel' ? 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' : 'text/csv',
                'Content-Disposition' => 'attachment; filename="' . $filename . '"',
            ];
            
            $data = [];
            $data[] = ['Date', 'Staff Name', 'Location', 'Check In', 'Check Out', 'Hours Worked', 'Late Time', 'Overtime', 'Device Type', 'Status'];
            
            foreach ($reportData as $record) {
                $lateTime = Staff_latetimes_model::where('attendance_id', $record->attendance_id)->first();
                $overtime = Staff_overtimes_model::where('attendance_id', $record->attendance_id)->first();
                
                $data[] = [
                    $record->check_in_time->format('Y-m-d'),
                    $record->staff->staff_name ?? 'N/A',
                    $record->location->location_name ?? 'N/A',
                    $record->check_in_time->format('H:i:s'),
                    $record->check_out_time ? $record->check_out_time->format('H:i:s') : '-',
                    $record->check_out_time ? number_format($record->hours_worked, 2) . 'h' : '-',
                    $lateTime ? $lateTime->duration : '-',
                    $overtime ? $overtime->duration : '-',
                    ucfirst($record->device_type),
                    $record->check_out_time ? 'Completed' : 'Active',
                ];
            }
            
            if ($exportFormat === 'csv') {
                $output = fopen('php://output', 'w');
                foreach ($data as $row) {
                    fputcsv($output, $row);
                }
                fclose($output);
                return response()->stream(function() use ($data) {
                    $output = fopen('php://output', 'w');
                    foreach ($data as $row) {
                        fputcsv($output, $row);
                    }
                    fclose($output);
                }, 200, $headers);
            } else {
                // For Excel, we'll use a simple HTML table approach
                // In production, you'd use PhpSpreadsheet library
                return response()->view('admin::biometricdevices.report_export', [
                    'reportData' => $reportData,
                    'reportTitle' => $reportTitle,
                    'reportNotes' => $reportNotes,
                    'dateFrom' => $dateFrom,
                    'dateTo' => $dateTo,
                    'totalStaff' => $totalStaff,
                    'totalLate' => $totalLate,
                    'totalOvertime' => $totalOvertime,
                    'totalHoursWorked' => $totalHoursWorked,
                ])->withHeaders($headers);
            }
        } else {
            // PDF export - return HTML view that can be printed as PDF
            return view('admin::biometricdevices.report_export', [
                'reportData' => $reportData,
                'reportTitle' => $reportTitle,
                'reportNotes' => $reportNotes,
                'dateFrom' => $dateFrom,
                'dateTo' => $dateTo,
                'totalStaff' => $totalStaff,
                'totalLate' => $totalLate,
                'totalOvertime' => $totalOvertime,
                'totalHoursWorked' => $totalHoursWorked,
            ]);
        }
    }

    /**
     * Store schedule
     */
    public function scheduleStore(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'time_in' => 'required',
            'time_out' => 'required',
        ]);

        try {
            $schedule = \Admin\Models\Staff_schedules_model::create([
                'name' => $request->name,
                'time_in' => $request->time_in,
                'time_out' => $request->time_out,
                'status' => $request->has('status') ? 1 : 0,
            ]);

            if ($request->ajax()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Schedule created successfully!',
                    'schedule' => $schedule
                ]);
            }

            flash()->success('Schedule created successfully!');
            return redirect()->to(admin_url('biometric_devices?tab=schedules'));
        } catch (\Exception $e) {
            if ($request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error: ' . $e->getMessage()
                ], 500);
            }
            flash()->error('Error creating schedule: ' . $e->getMessage());
            return redirect()->back();
        }
    }

    /**
     * Get schedule for editing
     */
    public function scheduleGet($id)
    {
        try {
            $schedule = \Admin\Models\Staff_schedules_model::findOrFail($id);
            return response()->json([
                'success' => true,
                'schedule' => $schedule
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Schedule not found'
            ], 404);
        }
    }

    /**
     * Update schedule
     */
    public function scheduleUpdate(Request $request)
    {
        $request->validate([
            'schedule_id' => 'required|exists:staff_schedules,schedule_id',
            'name' => 'required|string|max:255',
            'time_in' => 'required',
            'time_out' => 'required',
        ]);

        try {
            $schedule = \Admin\Models\Staff_schedules_model::findOrFail($request->schedule_id);
            $schedule->update([
                'name' => $request->name,
                'time_in' => $request->time_in,
                'time_out' => $request->time_out,
                'status' => $request->has('status') ? 1 : 0,
            ]);

            if ($request->ajax()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Schedule updated successfully!',
                    'schedule' => $schedule
                ]);
            }

            flash()->success('Schedule updated successfully!');
            return redirect()->to(admin_url('biometric_devices?tab=schedules'));
        } catch (\Exception $e) {
            if ($request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error: ' . $e->getMessage()
                ], 500);
            }
            flash()->error('Error updating schedule: ' . $e->getMessage());
            return redirect()->back();
        }
    }

    /**
     * Assign staff to schedule
     */
    public function scheduleAssignStaff(Request $request)
    {
        $request->validate([
            'schedule_id' => 'required|exists:staff_schedules,schedule_id',
            'staff_ids' => 'required|array',
            'staff_ids.*' => 'exists:staffs,staff_id',
        ]);

        try {
            $scheduleId = $request->schedule_id;
            $staffIds = $request->staff_ids;
            $effectiveFrom = $request->effective_from ?: null;
            $effectiveTo = $request->effective_to ?: null;

            foreach ($staffIds as $staffId) {
                \DB::table('staff_schedule_assignments')->updateOrInsert(
                    [
                        'staff_id' => $staffId,
                        'schedule_id' => $scheduleId,
                    ],
                    [
                        'effective_from' => $effectiveFrom,
                        'effective_to' => $effectiveTo,
                        'created_at' => now(),
                        'updated_at' => now(),
                    ]
                );
            }

            if ($request->ajax()) {
                return response()->json([
                    'success' => true,
                    'message' => 'Staff assigned successfully!'
                ]);
            }

            flash()->success('Staff assigned successfully!');
            return redirect()->to(admin_url('biometric_devices?tab=schedules'));
        } catch (\Exception $e) {
            if ($request->ajax()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Error: ' . $e->getMessage()
                ], 500);
            }
            flash()->error('Error assigning staff: ' . $e->getMessage());
            return redirect()->back();
        }
    }

    /**
     * Override form save to test device connection
     */
    public function formAfterSave($model)
    {
        // Test connection when creating new device
        if ($this->action == 'create') {
            try {
                $helper = new FingerHelper();
                $device = $helper->init($model->ip, $model->port ?? 4370);

                if ($device->connect()) {
                    $serial = $helper->getSerial($device);
                    if ($serial) {
                        $model->serial_number = $serial;
                        $model->save();
                    }
                    flash()->success('Device connected and serial number retrieved');
                } else {
                    flash()->warning('Device created but connection test failed. Please verify IP address.');
                }
            } catch (\Exception $e) {
                flash()->warning('Device created but could not retrieve serial number: ' . $e->getMessage());
            }
        }
    }

    /**
     * Test device connection handler
     */
    public function onTestConnection($context = null, $recordId = null)
    {
        $device = $this->formFindModelObject($recordId);
        if (!$device) {
            throw new \Exception('Device not found');
        }

        $result = $device->testConnection();

        if ($result['success']) {
            flash()->success('Connection successful! Serial: ' . ($result['serial'] ?? 'N/A'));
        } else {
            flash()->error('Connection failed: ' . $result['message']);
        }

        return $this->refresh();
    }

    /**
     * Sync staff to device handler
     */
    public function onSyncStaff($context = null, $recordId = null)
    {
        return $this->syncStaff($recordId);
    }

    /**
     * Sync attendance from device handler
     */
    public function onSyncAttendance($context = null, $recordId = null)
    {
        $result = $this->syncAttendance($recordId);
        
        if ($result->getStatusCode() == 200) {
            $data = json_decode($result->getContent(), true);
            flash()->success($data['message'] ?? 'Attendance synced successfully');
        } else {
            $data = json_decode($result->getContent(), true);
            flash()->error($data['message'] ?? 'Failed to sync attendance');
        }

        return $this->refresh();
    }

    /**
     * Sync staff to device
     */
    public function syncStaff($id)
    {
        try {
            $device = FingerDevices_model::findOrFail($id);
            $zk = new ZKTeco($device->ip, $device->port ?? 4370);

            if (!$zk->connect()) {
                flash()->error(lang('admin::lang.alert_error'), 'Failed to connect to device');
                return $this->redirect('biometric_devices');
            }

            // Get existing users on device
            $deviceUsers = collect($zk->getUser())->pluck('uid')->toArray();

            // Get staff not yet on device
            $staff = Staffs_model::isEnabled()
                ->whereNotIn('staff_id', $deviceUsers)
                ->get();

            $added = 0;
            $uid = max($deviceUsers) + 1;

            foreach ($staff as $staffMember) {
                try {
                    // Add user to device: setUser(uid, userid, name, password, role, cardno)
                    $zk->setUser(
                        $uid++,
                        $staffMember->staff_id,
                        $staffMember->staff_name,
                        '',
                        '0',
                        $staffMember->card_id ?? '0'
                    );
                    $added++;
                } catch (\Exception $e) {
                    Log::warning('Failed to add staff to device', [
                        'staff_id' => $staffMember->staff_id,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            flash()->success(lang('admin::lang.alert_success'), "Synced {$added} staff members to device");
        } catch (\Exception $e) {
            Log::error('Failed to sync staff to device', [
                'device_id' => $id,
                'error' => $e->getMessage(),
            ]);
            
            flash()->error(lang('admin::lang.alert_error'), 'Failed to sync staff: ' . $e->getMessage());
        }

        return $this->redirect('biometric_devices');
    }

    /**
     * Get attendance from device and sync to database
     */
    public function syncAttendance($id)
    {
        try {
            $device = FingerDevices_model::findOrFail($id);
            $zk = new ZKTeco($device->ip, $device->port ?? 4370);

            if (!$zk->connect()) {
                return response()->json([
                    'success' => false,
                    'message' => 'Failed to connect to device'
                ], 500);
            }

            // Get attendance data from device
            $attendanceData = $zk->getAttendance();
            
            if (empty($attendanceData)) {
                return response()->json([
                    'success' => true,
                    'message' => 'No new attendance records',
                    'synced' => 0,
                ]);
            }

            $synced = 0;
            $errors = 0;

            DB::beginTransaction();

            foreach ($attendanceData as $record) {
                try {
                    $staffId = $record['id'] ?? null;
                    $timestamp = $record['timestamp'] ?? null;
                    $type = $record['type'] ?? 0; // 0 = check-in, 1 = check-out

                    if (!$staffId || !$timestamp) {
                        continue;
                    }

                    // Check if staff exists
                    $staff = Staffs_model::find($staffId);
                    if (!$staff) {
                        continue;
                    }

                    $attendanceDate = date('Y-m-d', strtotime($timestamp));
                    $attendanceTime = date('H:i:s', strtotime($timestamp));

                    if ($type == 0) {
                        // Check-in
                        $existing = Staff_attendance_model::where('staff_id', $staffId)
                            ->whereDate('check_in_time', $attendanceDate)
                            ->whereNull('check_out_time')
                            ->first();

                        if (!$existing) {
                            Staff_attendance_model::create([
                                'staff_id' => $staffId,
                                'check_in_time' => $timestamp,
                                'location_id' => $device->location_id,
                                'device_id' => $device->device_id,
                                'device_type' => 'zkteco',
                            ]);
                            $synced++;
                        }
                    } else {
                        // Check-out
                        $attendance = Staff_attendance_model::where('staff_id', $staffId)
                            ->whereDate('check_in_time', $attendanceDate)
                            ->whereNull('check_out_time')
                            ->first();

                        if ($attendance) {
                            $attendance->update([
                                'check_out_time' => $timestamp,
                                'updated_at' => now(),
                            ]);
                            $synced++;
                        }
                    }
                } catch (\Exception $e) {
                    $errors++;
                    Log::warning('Failed to sync attendance record', [
                        'record' => $record,
                        'error' => $e->getMessage(),
                    ]);
                }
            }

            DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Synced {$synced} attendance records",
                'synced' => $synced,
                'errors' => $errors,
            ]);
        } catch (\Exception $e) {
            DB::rollBack();
            
            Log::error('Failed to sync attendance from device', [
                'device_id' => $id,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to sync attendance: ' . $e->getMessage()
            ], 500);
        }
    }
}

