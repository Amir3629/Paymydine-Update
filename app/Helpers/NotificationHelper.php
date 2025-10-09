<?php

namespace App\Helpers;

use Admin\Models\Notifications_model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class NotificationHelper
{
    /**
     * Create a notification for an event
     *
     * @param array $data
     * @return Notifications_model|null
     */
    public static function createNotification($data)
    {
        try {
            // Ensure we're using tenant database
            self::ensureTenantDatabase();
            
            // Check for duplicate notifications within 60 seconds
            $duplicate = Notifications_model::where('tenant_id', $data['tenant_id'])
                ->where('type', $data['type'])
                ->where('table_id', $data['table_id'])
                ->where('created_at', '>=', now()->subMinutes(1))
                ->exists();

            if ($duplicate) {
                Log::info('Duplicate notification ignored', [
                    'tenant_id' => $data['tenant_id'],
                    'type' => $data['type'],
                    'table_id' => $data['table_id']
                ]);
                return null;
            }

            // Check rate limit (max 5 notifications per table per hour)
            $recentCount = Notifications_model::where('tenant_id', $data['tenant_id'])
                ->where('table_id', $data['table_id'])
                ->where('created_at', '>=', now()->subHour())
                ->count();

            if ($recentCount >= 5) {
                Log::warning('Rate limit exceeded for table notifications', [
                    'tenant_id' => $data['tenant_id'],
                    'table_id' => $data['table_id'],
                    'count' => $recentCount
                ]);
                return null;
            }

            // Create notification
            $notification = Notifications_model::createNotification($data);

            Log::info('Notification created', [
                'notification_id' => $notification->notification_id,
                'tenant_id' => $data['tenant_id'],
                'type' => $data['type'],
                'table_id' => $data['table_id']
            ]);

            return $notification;

        } catch (\Exception $e) {
            Log::error('Failed to create notification', [
                'error' => $e->getMessage(),
                'data' => $data,
                'trace' => $e->getTraceAsString()
            ]);
            return null;
        }
    }

    /**
     * Create waiter call notification
     *
     * @param array $data
     * @return Notifications_model|null
     */
    public static function createWaiterCallNotification($data)
    {
        $tableInfo = TableHelper::getTableInfo($data['table_id']);
        
        if (!$tableInfo) {
            Log::warning('Table not found for waiter call notification', [
                'table_id' => $data['table_id']
            ]);
            return null;
        }

        return self::createNotification([
            'tenant_id' => $data['tenant_id'],
            'type' => 'waiter_call',
            'title' => "Waiter Call - {$tableInfo['table_name']}",
            'message' => $data['message'],
            'table_id' => $data['table_id'],
            'table_name' => $tableInfo['table_name'],
            'payload' => [
                'customer_message' => $data['message'],
                'urgency' => 'medium'
            ],
            'status' => 'new',
            'priority' => 'medium'
        ]);
    }

    /**
     * Create valet request notification
     *
     * @param array $data
     * @return Notifications_model|null
     */
    public static function createValetRequestNotification(array $data)
    {
        $raw = $data['table_id'] ?? '';
        if (preg_match('/^\s*Table\s+(\d+)\s*$/i', $raw, $m)) {
            $idNum = $m[1];
        } elseif (preg_match('/^\d+$/', $raw)) {
            $idNum = $raw;
        } else {
            $idNum = (string)$raw; // fallback, still store
        }
        $tableId   = (string)$idNum;
        $tableName = 'Table '.$idNum;

        $payload = [
            'name'          => $data['name']          ?? null,
            'car_make'      => $data['car_make']      ?? null,
            'license_plate' => $data['license_plate'] ?? null,
            'request_id'    => $data['request_id']    ?? null,
            'estimated_duration' => '2 hours',
            'details'       => trim($tableName.' · '.($data['license_plate'] ?? '').' · '.($data['car_make'] ?? '')),
        ];

        return DB::table('notifications')->insertGetId([
            'type'       => 'valet_request',
            'title'      => 'Valet Request',
            'table_id'   => $tableId,
            'table_name' => $tableName,
            'payload'    => json_encode($payload, JSON_UNESCAPED_UNICODE),
            'status'     => 'new',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Create table note notification
     *
     * @param array $data
     * @return Notifications_model|null
     */
    public static function createTableNoteNotification($data)
    {
        $tableInfo = TableHelper::getTableInfo($data['table_id']);
        
        if (!$tableInfo) {
            Log::warning('Table not found for table note notification', [
                'table_id' => $data['table_id']
            ]);
            return null;
        }

        return self::createNotification([
            'tenant_id' => $data['tenant_id'],
            'type' => 'table_note',
            'title' => "Table Note - {$tableInfo['table_name']}",
            'message' => $data['note'],
            'table_id' => $data['table_id'],
            'table_name' => $tableInfo['table_name'],
            'payload' => [
                'note' => $data['note'],
                'timestamp' => $data['timestamp']
            ],
            'status' => 'new',
            'priority' => 'low'
        ]);
    }

    /**
     * Ensure we're using tenant database
     *
     * @return void
     */
    private static function ensureTenantDatabase()
    {
        $currentDb = DB::connection()->getDatabaseName();
        
        // Check if we're using a tenant database (not the main database)
        if (strpos($currentDb, 'tenant_') === false && $currentDb !== 'paymydine') {
            Log::warning('Notification created on non-tenant database', [
                'database' => $currentDb
            ]);
        }
    }

    /**
     * Create order notification
     *
     * @param array $data
     * @return int|null
     */
    public static function createOrderNotification($data)
    {
        // Check if order notifications are enabled
        if (!\App\Helpers\SettingsHelper::areOrderNotificationsEnabled()) {
            \Log::info('Order notifications disabled, skipping notification creation', [
                'order_id' => $data['order_id'] ?? 'unknown',
                'status' => $data['status'] ?? 'unknown'
            ]);
            return null;
        }
        
        try {
            // Create order notification directly in database (like valet_request)
            $tableId = $data['table_id'] ?? '';
            $tableName = $data['table_name'] ?? "Table {$tableId}";
            
            $payload = [
                'order_id' => $data['order_id'],
                'status' => $data['status'],
                'status_name' => $data['status_name'],
                'timestamp' => now()->toISOString()
            ];

            // Create more descriptive title based on status
            $statusMessages = [
                'received' => 'New Order Received',
                'preparation' => 'Order in Preparation', 
                'ready' => 'Order Ready',
                'delivered' => 'Order Delivered',
                'cancelled' => 'Order Cancelled'
            ];
            
            $statusMessage = $statusMessages[$data['status']] ?? 'Order Status Updated';
            $title = "{$statusMessage} - {$tableName}";

            $notificationId = DB::table('notifications')->insertGetId([
                'type' => 'order_status',
                'title' => $title,
                'table_id' => $tableId,
                'table_name' => $tableName,
                'payload' => json_encode($payload, JSON_UNESCAPED_UNICODE),
                'status' => 'new',
                'created_at' => now(),
                'updated_at' => now(),
            ]);
            
            Log::info('Order notification created', [
                'notification_id' => $notificationId,
                'order_id' => $data['order_id'],
                'table_id' => $tableId,
                'status' => $data['status']
            ]);

            return $notificationId;

        } catch (\Exception $e) {
            Log::error('Failed to create order notification', [
                'error' => $e->getMessage(),
                'data' => $data,
                'trace' => $e->getTraceAsString()
            ]);
            return null;
        }
    }

    /**
     * Get notification counts for tenant
     *
     * @param int $tenantId
     * @return array
     */
    public static function getNotificationCounts($tenantId)
    {
        try {
            self::ensureTenantDatabase();
            
            $counts = Notifications_model::getCountsByStatus($tenantId);
            
            return [
                'new' => $counts->new ?? 0,
                'seen' => $counts->seen ?? 0,
                'in_progress' => $counts->in_progress ?? 0,
                'resolved' => $counts->resolved ?? 0,
                'total' => $counts->total ?? 0
            ];
        } catch (\Exception $e) {
            Log::error('Failed to get notification counts', [
                'error' => $e->getMessage(),
                'tenant_id' => $tenantId
            ]);
            
            return [
                'new' => 0,
                'seen' => 0,
                'in_progress' => 0,
                'resolved' => 0,
                'total' => 0
            ];
        }
    }
}