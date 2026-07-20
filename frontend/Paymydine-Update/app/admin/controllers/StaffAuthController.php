<?php

namespace Admin\Controllers;

use Admin\Models\Staffs_model;
use Admin\Models\Staff_attendance_model;
use Admin\Facades\AdminAuth;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

/**
 * Staff Authentication Controller
 * Handles card and fingerprint authentication for staff login and attendance
 */
class StaffAuthController extends \Admin\Classes\AdminController
{
    protected $requireAuthentication = false;

    /**
     * Authenticate staff via card ID (RFID/NFC)
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function authenticateByCard(Request $request)
    {
        $request->validate([
            'card_id' => 'required|string|max:255',
            'location_id' => 'nullable|integer',
        ]);

        try {
            // Find staff by card_id
            $staff = Staffs_model::where('card_id', $request->card_id)
                ->where('staff_status', 1)
                ->first();

            if (!$staff) {
                return response()->json([
                    'success' => false,
                    'message' => 'Card not recognized or staff inactive'
                ], 404);
            }

            // Check if already checked in today
            $todayAttendance = Staff_attendance_model::today()
                ->byStaff($staff->staff_id)
                ->active()
                ->first();

            if ($todayAttendance) {
                // Check out
                $todayAttendance->update([
                    'check_out_time' => now(),
                    'device_type' => 'card',
                    'updated_at' => now(),
                ]);

                // Check and record overtime
                $todayAttendance->checkAndRecordOvertime();

                // Logout from POS if logged in
                if (AdminAuth::isLogged() && AdminAuth::getStaffId() == $staff->staff_id) {
                    AdminAuth::logout();
                }

                return response()->json([
                    'success' => true,
                    'action' => 'checkout',
                    'staff' => [
                        'id' => $staff->staff_id,
                        'name' => $staff->staff_name,
                        'email' => $staff->staff_email,
                    ],
                    'check_out_time' => $todayAttendance->check_out_time->format('Y-m-d H:i:s'),
                    'hours_worked' => $todayAttendance->hours_worked,
                ]);
            } else {
                // Check in
                $attendance = Staff_attendance_model::create([
                    'staff_id' => $staff->staff_id,
                    'check_in_time' => now(),
                    'location_id' => $request->location_id ?? $staff->staff_location_id ?? 1,
                    'device_type' => 'card',
                ]);

                // Auto-login to POS if user exists
                if ($staff->user && $staff->user->is_activated) {
                    AdminAuth::login($staff->user, false);
                }

                return response()->json([
                    'success' => true,
                    'action' => 'checkin',
                    'staff' => [
                        'id' => $staff->staff_id,
                        'name' => $staff->staff_name,
                        'email' => $staff->staff_email,
                    ],
                    'check_in_time' => $attendance->check_in_time->format('Y-m-d H:i:s'),
                    'logged_in' => AdminAuth::isLogged(),
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Card authentication failed', [
                'error' => $e->getMessage(),
                'card_id' => $request->card_id,
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Authentication failed: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Authenticate staff via fingerprint
     * Note: This is a simplified version. Actual implementation depends on fingerprint SDK
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function authenticateByFingerprint(Request $request)
    {
        $request->validate([
            'fingerprint_data' => 'required|string',
            'location_id' => 'nullable|integer',
        ]);

        try {
            // Match fingerprint template
            // This is simplified - actual implementation requires fingerprint matching algorithm
            $staff = Staffs_model::where('biometric_enabled', 1)
                ->where('staff_status', 1)
                ->get()
                ->first(function ($staff) use ($request) {
                    // Compare fingerprint templates
                    // Actual implementation would use fingerprint SDK matching
                    if ($staff->fingerprint_template) {
                        // Simplified matching - replace with actual SDK matching
                        return hash_equals($staff->fingerprint_template, $request->fingerprint_data);
                    }
                    return false;
                });

            if (!$staff) {
                return response()->json([
                    'success' => false,
                    'message' => 'Fingerprint not recognized'
                ], 404);
            }

            // Similar check-in/check-out logic as card authentication
            $todayAttendance = Staff_attendance_model::today()
                ->byStaff($staff->staff_id)
                ->active()
                ->first();

            if ($todayAttendance) {
                $todayAttendance->update([
                    'check_out_time' => now(),
                    'device_type' => 'fingerprint',
                    'updated_at' => now(),
                ]);

                // Check and record overtime
                $todayAttendance->checkAndRecordOvertime();

                if (AdminAuth::isLogged() && AdminAuth::getStaffId() == $staff->staff_id) {
                    AdminAuth::logout();
                }

                return response()->json([
                    'success' => true,
                    'action' => 'checkout',
                    'staff' => [
                        'id' => $staff->staff_id,
                        'name' => $staff->staff_name,
                    ],
                    'check_out_time' => $todayAttendance->check_out_time->format('Y-m-d H:i:s'),
                ]);
            } else {
                $attendance = Staff_attendance_model::create([
                    'staff_id' => $staff->staff_id,
                    'check_in_time' => now(),
                    'location_id' => $request->location_id ?? $staff->staff_location_id ?? 1,
                    'device_type' => 'fingerprint',
                ]);

                // Check and record late time
                $attendance->checkAndRecordLateTime();

                if ($staff->user && $staff->user->is_activated) {
                    AdminAuth::login($staff->user, false);
                }

                return response()->json([
                    'success' => true,
                    'action' => 'checkin',
                    'staff' => [
                        'id' => $staff->staff_id,
                        'name' => $staff->staff_name,
                    ],
                    'check_in_time' => $attendance->check_in_time->format('Y-m-d H:i:s'),
                ]);
            }
        } catch (\Exception $e) {
            Log::error('Fingerprint authentication failed', [
                'error' => $e->getMessage(),
                'trace' => $e->getTraceAsString(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Authentication failed'
            ], 500);
        }
    }

    /**
     * Register fingerprint template for staff
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function registerFingerprint(Request $request)
    {
        $request->validate([
            'staff_id' => 'required|integer|exists:staffs,staff_id',
            'fingerprint_template' => 'required|string',
        ]);

        try {
            $staff = Staffs_model::findOrFail($request->staff_id);
            $staff->update([
                'fingerprint_template' => $request->fingerprint_template,
                'biometric_enabled' => 1,
            ]);

            return response()->json([
                'success' => true,
                'message' => 'Fingerprint registered successfully',
                'staff' => [
                    'id' => $staff->staff_id,
                    'name' => $staff->staff_name,
                ],
            ]);
        } catch (\Exception $e) {
            Log::error('Fingerprint registration failed', [
                'error' => $e->getMessage(),
                'staff_id' => $request->staff_id,
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to register fingerprint: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get current attendance status for staff
     * 
     * @param Request $request
     * @return \Illuminate\Http\JsonResponse
     */
    public function getAttendanceStatus(Request $request)
    {
        $request->validate([
            'staff_id' => 'required|integer|exists:staffs,staff_id',
        ]);

        try {
            $staff = Staffs_model::findOrFail($request->staff_id);
            $todayAttendance = Staff_attendance_model::today()
                ->byStaff($staff->staff_id)
                ->active()
                ->first();

            return response()->json([
                'success' => true,
                'checked_in' => $todayAttendance ? true : false,
                'check_in_time' => $todayAttendance ? $todayAttendance->check_in_time->format('Y-m-d H:i:s') : null,
                'staff' => [
                    'id' => $staff->staff_id,
                    'name' => $staff->staff_name,
                ],
            ]);
        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'message' => 'Failed to get attendance status'
            ], 500);
        }
    }
}

