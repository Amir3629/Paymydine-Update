<?php

namespace Admin\Services\BiometricDeviceService;

use Admin\Models\FingerDevices_model;
use Admin\Models\Device_notifications_model;
use Admin\Models\Staffs_model;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

/**
 * Notification Service
 * Handles all notifications and alerts for device events
 * Supports in-app notifications, email, and SMS (extensible)
 */
class NotificationService
{
    /**
     * Create a notification
     * @param FingerDevices_model|null $device
     * @param string $type
     * @param array $data ['title', 'message', 'severity', 'metadata']
     * @return Device_notifications_model
     */
    public function createNotification(?FingerDevices_model $device, string $type, array $data): Device_notifications_model
    {
        $notification = Device_notifications_model::create([
            'device_id' => $device?->device_id,
            'type' => $type,
            'title' => $data['title'] ?? 'Device Notification',
            'message' => $data['message'] ?? '',
            'severity' => $data['severity'] ?? 'info',
            'metadata' => $data['metadata'] ?? null,
            'is_read' => false,
        ]);

        // Send email for critical notifications
        if ($notification->severity === 'critical') {
            $this->sendEmailNotification($notification);
        }

        return $notification;
    }

    /**
     * Device came online
     * @param FingerDevices_model $device
     */
    public function deviceOnline(FingerDevices_model $device): void
    {
        $this->createNotification($device, 'device_online', [
            'title' => 'Device Online',
            'message' => "Device {$device->name} is now online and operational",
            'severity' => 'info',
            'metadata' => [
                'device_id' => $device->device_id,
                'ip' => $device->ip,
                'timestamp' => now()->toDateTimeString(),
            ]
        ]);

        Log::info('Device came online', [
            'device_id' => $device->device_id,
            'device_name' => $device->name
        ]);
    }

    /**
     * Device went offline
     * @param FingerDevices_model $device
     */
    public function deviceOffline(FingerDevices_model $device): void
    {
        // Check if device has been offline for a while
        $previousCheck = Device_notifications_model::where('device_id', $device->device_id)
            ->where('type', 'device_offline')
            ->where('created_at', '>', now()->subHours(1))
            ->exists();

        if ($previousCheck) {
            return; // Don't spam notifications
        }

        $this->createNotification($device, 'device_offline', [
            'title' => 'Device Offline',
            'message' => "Device {$device->name} is offline and not responding",
            'severity' => 'warning',
            'metadata' => [
                'device_id' => $device->device_id,
                'ip' => $device->ip,
                'last_connected' => $device->last_connected_at?->toDateTimeString(),
                'failed_attempts' => $device->failed_connection_attempts,
            ]
        ]);

        Log::warning('Device went offline', [
            'device_id' => $device->device_id,
            'device_name' => $device->name
        ]);
    }

    /**
     * Device status changed
     * @param FingerDevices_model $device
     * @param string $oldStatus
     * @param string $newStatus
     */
    public function deviceStatusChanged(FingerDevices_model $device, string $oldStatus, string $newStatus): void
    {
        if ($oldStatus === $newStatus) {
            return;
        }

        if ($newStatus === 'online' && $oldStatus === 'offline') {
            $this->deviceOnline($device);
        } elseif ($newStatus === 'offline') {
            $this->deviceOffline($device);
        } elseif ($newStatus === 'error') {
            $this->createNotification($device, 'device_error', [
                'title' => 'Device Error',
                'message' => "Device {$device->name} encountered an error",
                'severity' => 'error',
                'metadata' => [
                    'device_id' => $device->device_id,
                    'old_status' => $oldStatus,
                    'new_status' => $newStatus,
                ]
            ]);
        }
    }

    /**
     * Enrollment success notification
     * @param Staffs_model $staff
     * @param FingerDevices_model $device
     * @param string $enrollmentType
     */
    public function enrollmentSuccess(Staffs_model $staff, FingerDevices_model $device, string $enrollmentType): void
    {
        $this->createNotification($device, 'enrollment_success', [
            'title' => 'Enrollment Successful',
            'message' => "{$staff->staff_name} successfully enrolled on {$device->name} using {$enrollmentType}",
            'severity' => 'info',
            'metadata' => [
                'staff_id' => $staff->staff_id,
                'staff_name' => $staff->staff_name,
                'device_id' => $device->device_id,
                'enrollment_type' => $enrollmentType,
            ]
        ]);
    }

    /**
     * Enrollment failed notification
     * @param Staffs_model $staff
     * @param FingerDevices_model $device
     * @param string $error
     */
    public function enrollmentFailed(Staffs_model $staff, FingerDevices_model $device, string $error): void
    {
        $this->createNotification($device, 'enrollment_failed', [
            'title' => 'Enrollment Failed',
            'message' => "Failed to enroll {$staff->staff_name} on {$device->name}: {$error}",
            'severity' => 'error',
            'metadata' => [
                'staff_id' => $staff->staff_id,
                'staff_name' => $staff->staff_name,
                'device_id' => $device->device_id,
                'error' => $error,
            ]
        ]);
    }

    /**
     * Sync failed notification
     * @param FingerDevices_model $device
     * @param string $syncType
     * @param string $error
     */
    public function syncFailed(FingerDevices_model $device, string $syncType, string $error): void
    {
        // Don't spam - check if similar notification sent recently
        $recentNotification = Device_notifications_model::where('device_id', $device->device_id)
            ->where('type', 'sync_failed')
            ->where('created_at', '>', now()->subMinutes(30))
            ->exists();

        if ($recentNotification) {
            return;
        }

        $this->createNotification($device, 'sync_failed', [
            'title' => 'Sync Failed',
            'message' => "Failed to sync {$syncType} from {$device->name}: {$error}",
            'severity' => 'error',
            'metadata' => [
                'device_id' => $device->device_id,
                'sync_type' => $syncType,
                'error' => $error,
            ]
        ]);
    }

    /**
     * Missing checkout alert
     * @param Staffs_model $staff
     * @param int $hours
     */
    public function missingCheckout(Staffs_model $staff, int $hours): void
    {
        $this->createNotification(null, 'missing_checkout', [
            'title' => 'Missing Checkout',
            'message' => "{$staff->staff_name} has been checked in for {$hours} hours without checking out",
            'severity' => 'warning',
            'metadata' => [
                'staff_id' => $staff->staff_id,
                'staff_name' => $staff->staff_name,
                'hours' => $hours,
            ]
        ]);
    }

    /**
     * Device maintenance reminder
     * @param FingerDevices_model $device
     * @param string $reason
     */
    public function maintenanceReminder(FingerDevices_model $device, string $reason): void
    {
        $this->createNotification($device, 'device_maintenance', [
            'title' => 'Maintenance Required',
            'message' => "Device {$device->name} requires maintenance: {$reason}",
            'severity' => 'warning',
            'metadata' => [
                'device_id' => $device->device_id,
                'reason' => $reason,
            ]
        ]);
    }

    /**
     * Get unread notifications
     * @param int $limit
     * @return \Illuminate\Support\Collection
     */
    public function getUnreadNotifications(int $limit = 50)
    {
        return Device_notifications_model::with('device')
            ->unread()
            ->orderBy('created_at', 'desc')
            ->limit($limit)
            ->get();
    }

    /**
     * Get critical notifications
     * @param int $hours
     * @return \Illuminate\Support\Collection
     */
    public function getCriticalNotifications(int $hours = 24)
    {
        return Device_notifications_model::with('device')
            ->critical()
            ->where('created_at', '>', now()->subHours($hours))
            ->orderBy('created_at', 'desc')
            ->get();
    }

    /**
     * Mark notification as read
     * @param int $notificationId
     * @return bool
     */
    public function markAsRead(int $notificationId): bool
    {
        $notification = Device_notifications_model::find($notificationId);
        
        if ($notification) {
            return $notification->markAsRead();
        }

        return false;
    }

    /**
     * Mark all notifications as read
     * @return int Number of notifications marked as read
     */
    public function markAllAsRead(): int
    {
        return Device_notifications_model::unread()
            ->update([
                'is_read' => true,
                'read_at' => now()
            ]);
    }

    /**
     * Send email notification (for critical alerts)
     * @param Device_notifications_model $notification
     */
    protected function sendEmailNotification(Device_notifications_model $notification): void
    {
        try {
            // Get admin emails (owners/managers)
            $adminEmails = $this->getAdminEmails();

            if (empty($adminEmails)) {
                return;
            }

            // TODO: Implement actual email sending
            // For now, just log
            Log::info('Would send email notification', [
                'notification_id' => $notification->notification_id,
                'title' => $notification->title,
                'recipients' => $adminEmails
            ]);

            /* Example implementation:
            Mail::to($adminEmails)->send(new DeviceAlertMail($notification));
            */

        } catch (\Exception $e) {
            Log::error('Failed to send email notification', [
                'notification_id' => $notification->notification_id,
                'error' => $e->getMessage()
            ]);
        }
    }

    /**
     * Get admin email addresses
     * @return array
     */
    protected function getAdminEmails(): array
    {
        try {
            // Get staff with owner/manager role
            $admins = Staffs_model::where('staff_status', 1)
                ->whereHas('groups', function($q) {
                    $q->whereIn('staff_group_name', ['Owner', 'Manager']);
                })
                ->pluck('staff_email')
                ->filter()
                ->unique()
                ->toArray();

            return $admins;

        } catch (\Exception $e) {
            Log::error('Failed to get admin emails', ['error' => $e->getMessage()]);
            return [];
        }
    }

    /**
     * Clean up old notifications
     * @param int $days
     * @return int Number of deleted notifications
     */
    public function cleanupOldNotifications(int $days = 90): int
    {
        $cutoff = now()->subDays($days);

        return Device_notifications_model::where('is_read', true)
            ->where('created_at', '<', $cutoff)
            ->delete();
    }
}

