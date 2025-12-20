<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Models\Orders_model;
use Admin\Models\Statuses_model;
use Admin\Models\Reservations_model;
use Admin\Models\Kds_stations_model;
use Admin\Models\Categories_model;
use System\Models\Settings_model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Facades\Response;

/**
 * Kitchen Display Controller
 * Displays active orders for kitchen staff in a simplified, full-screen layout
 * Supports multiple KDS stations with category filtering
 */
class KitchenDisplay extends AdminController
{
    protected $requiredPermissions = ['Admin.KitchenDisplay'];
    
    /**
     * Current KDS station (if any)
     */
    protected $station = null;

    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Kitchen Display main view
     * Renders standalone view without admin layout (full-screen KDS)
     * 
     * @param string|null $stationSlug - Optional station slug for filtered view
     */
    public function index($stationSlug = null)
    {
        // Ensure KDS stations table exists
        $this->ensureKdsStationsTableExists();
        
        // Load station if slug provided
        if ($stationSlug) {
            $this->station = Kds_stations_model::where('slug', $stationSlug)
                ->where('is_active', true)
                ->first();
            
            if (!$this->station) {
                // Station not found, redirect to main KDS or show error
                return redirect()->to(admin_url('kitchendisplay'))
                    ->with('error', 'KDS Station not found');
            }
        }
        
        $this->vars['title'] = $this->station 
            ? $this->station->name . ' - Kitchen Display' 
            : 'Kitchen Display';
        $this->vars['station'] = $this->station;
        $this->vars['orders'] = $this->getActiveOrders();
        $this->vars['statuses'] = $this->getKitchenStatuses();
        $this->vars['reservationsCount'] = $this->getReservationsCount();
        
        // Get notification sound setting
        $soundSetting = $this->station 
            ? $this->station->notification_sound 
            : $this->getDefaultNotificationSound();
        $this->vars['kdsNotificationSound'] = $soundSetting;
        
        // Get theme color
        $themeColor = $this->station 
            ? $this->station->theme_color 
            : '#4CAF50';
        $this->vars['themeColor'] = $themeColor;
        
        // Get refresh interval
        $refreshInterval = $this->station 
            ? $this->station->refresh_interval 
            : 5;
        $this->vars['refreshInterval'] = $refreshInterval;
        
        // Can this station change status?
        $canChangeStatus = $this->station 
            ? $this->station->can_change_status 
            : true;
        $this->vars['canChangeStatus'] = $canChangeStatus;
        
        // Get all active stations for the station selector
        $this->vars['allStations'] = Kds_stations_model::isActive()->ordered()->get();
        
        // Render standalone view directly using Laravel's view helper
        return response()->make(
            View::make('admin::kitchendisplay.index', $this->vars)->render()
        );
    }

    /**
     * Get default notification sound from settings
     */
    protected function getDefaultNotificationSound()
    {
        $soundSetting = 'doorbell';
        
        try {
            $settingRecord = DB::table('settings')
                ->where('item', 'panel.kds_notification_sound')
                ->first();
            
            if ($settingRecord && isset($settingRecord->value) && !empty($settingRecord->value)) {
                $soundSetting = trim($settingRecord->value);
            } else {
                $settingRecord = DB::table('settings')
                    ->where('item', 'kds_notification_sound')
                    ->first();
                
                if ($settingRecord && isset($settingRecord->value) && !empty($settingRecord->value)) {
                    $soundSetting = trim($settingRecord->value);
                }
            }
        } catch (\Exception $e) {
            \Log::error('KDS Sound Error: ' . $e->getMessage());
        }
        
        return $soundSetting;
    }

    /**
     * AJAX endpoint to get fresh order data for auto-refresh
     */
    public function index_onRefresh()
    {
        // Get station from POST data
        $stationSlug = post('station_slug');
        if ($stationSlug) {
            $this->station = Kds_stations_model::where('slug', $stationSlug)
                ->where('is_active', true)
                ->first();
        }
        
        // Get fresh orders from database (raw models, not formatted yet)
        $kitchenStatusNames = ['Received', 'Pending', 'Preparation', 'Delivery'];
        
        $kitchenStatusIds = Statuses_model::whereIn('status_name', $kitchenStatusNames)
            ->where('status_for', 'order')
            ->pluck('status_id')
            ->toArray();

        $ordersQuery = Orders_model::with(['status', 'location', 'order_notes'])
            ->whereIn('status_id', $kitchenStatusIds)
            ->orderBy('created_at', 'asc');
        
        $orders = $ordersQuery->get();
        
        // Format orders and filter by station categories
        $formattedOrders = $orders->map(function($order) {
            return $this->formatOrderForDisplay($order);
        })->filter(function($order) {
            // Filter out orders with no items (happens when all items are filtered out by station)
            return count($order['items']) > 0;
        })->values()->toArray();
        
        // Convert dates to ISO strings for JavaScript
        foreach ($formattedOrders as &$orderData) {
            if (isset($orderData['created_at'])) {
                if (is_object($orderData['created_at']) && method_exists($orderData['created_at'], 'toIso8601String')) {
                    $orderData['created_at'] = $orderData['created_at']->toIso8601String();
                }
            }
        }
        
        return Response::json([
            'orders' => array_values($formattedOrders)
        ]);
    }

    /**
     * AJAX endpoint to update order status from KDS
     */
    public function index_onUpdateStatus()
    {
        $orderId = post('order_id');
        $statusId = post('status_id');
        $stationSlug = post('station_slug');
        $stationName = post('station_name', 'Kitchen');

        if (!$orderId || !$statusId) {
            return Response::json([
                'success' => false,
                'error' => 'Order ID and Status ID are required'
            ], 400);
        }

        try {
            $order = Orders_model::find($orderId);
            if (!$order) {
                return Response::json([
                    'success' => false,
                    'error' => 'Order not found'
                ], 404);
            }

            // Check if station can change status
            if ($stationSlug) {
                $station = Kds_stations_model::where('slug', $stationSlug)->first();
                if ($station && !$station->can_change_status) {
                    return Response::json([
                        'success' => false,
                        'error' => 'This station cannot change order status'
                    ], 403);
                }
                
                // Check if station can use this status
                if ($station && !empty($station->status_ids) && !in_array($statusId, $station->status_ids)) {
                    return Response::json([
                        'success' => false,
                        'error' => 'This station cannot set this status'
                    ], 403);
                }
            }

            // Update order status
            $oldStatusId = $order->status_id;
            $order->status_id = $statusId;
            $order->save();
            
            // Get status names for notification
            $newStatus = Statuses_model::find($statusId);
            $statusName = $newStatus ? $newStatus->status_name : 'Updated';
            
            // Create notification with station name
            try {
                $this->createStationNotification($order, $stationName, $statusName);
            } catch (\Exception $e) {
                \Log::warning('Failed to create KDS notification: ' . $e->getMessage());
            }

            return Response::json([
                'success' => true,
                'message' => 'Status updated successfully',
                'station' => $stationName
            ]);
        } catch (\Exception $e) {
            return Response::json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Create notification for station status update
     */
    protected function createStationNotification($order, $stationName, $statusName)
    {
        // Build notification message
        $tableName = $order->order_type_name ?? $order->order_type ?? '';
        $title = "{$stationName}: Order #{$order->order_id} - {$statusName}";
        $message = "Order #{$order->order_id}";
        if ($tableName) {
            $message .= " ({$tableName})";
        }
        $message .= " marked as {$statusName} by {$stationName}";
        
        // Insert notification
        DB::table('notifications')->insert([
            'type' => 'kds_status_update',
            'title' => $title,
            'message' => $message,
            'table_id' => $order->order_type ?? '',
            'table_name' => $tableName,
            'payload' => json_encode([
                'order_id' => $order->order_id,
                'station_name' => $stationName,
                'status_name' => $statusName,
                'timestamp' => now()->toISOString()
            ], JSON_UNESCAPED_UNICODE),
            'status' => 'new',
            'priority' => 'medium',
            'created_at' => now(),
            'updated_at' => now(),
        ]);
    }

    /**
     * Get all active orders for kitchen display
     * Filters by station categories if station is set
     */
    protected function getActiveOrders()
    {
        // Kitchen-relevant statuses
        $kitchenStatusNames = ['Received', 'Pending', 'Preparation', 'Delivery'];
        
        $kitchenStatusIds = Statuses_model::whereIn('status_name', $kitchenStatusNames)
            ->where('status_for', 'order')
            ->pluck('status_id')
            ->toArray();

        $orders = Orders_model::with(['status', 'location', 'order_notes'])
            ->whereIn('status_id', $kitchenStatusIds)
            ->orderBy('created_at', 'asc')
            ->get();
        
        // Format and filter orders
        return $orders->map(function($order) {
                return $this->formatOrderForDisplay($order);
        })->filter(function($order) {
            // Filter out orders with no items for this station
            return count($order['items']) > 0;
        })->values();
    }

    /**
     * Format order data for kitchen display
     * Filters items by station categories if station is set
     */
    protected function formatOrderForDisplay($order)
    {
        $orderData = [
            'order_id' => $order->order_id,
            'order_type_name' => $order->order_type_name,
            'created_at' => $order->created_at,
            'elapsed_time' => $this->getElapsedTime($order->created_at),
            'status_id' => $order->status_id,
            'status_name' => $order->status ? $order->status->status_name : 'Unknown',
            'status_color' => $order->status ? $order->status->status_color : '#686663',
            'items' => [],
            'notes' => []
        ];

        // Get order items with modifiers
        $items = $order->getOrderMenusWithOptions();
        
        // Get station category IDs for filtering
        $stationCategoryIds = [];
        if ($this->station && !empty($this->station->category_ids)) {
            $stationCategoryIds = $this->station->category_ids;
        }
        
        foreach ($items as $item) {
            // Filter by station categories if station is set
            if (!empty($stationCategoryIds)) {
                // Get categories for this menu item
                $menuCategories = $this->getMenuCategories($item->menu_id);
                
                // Check if any of the menu's categories match the station's categories
                $hasMatchingCategory = false;
                foreach ($menuCategories as $categoryId) {
                    if (in_array($categoryId, $stationCategoryIds)) {
                        $hasMatchingCategory = true;
                        break;
                    }
                }
                
                // Skip this item if it doesn't belong to this station
                if (!$hasMatchingCategory) {
                    continue;
                }
            }
            
            $itemData = [
                'name' => $item->name,
                'quantity' => $item->quantity,
                'comment' => $item->comment ?? '',
                'modifiers' => []
            ];

            // Group modifiers by category
            $modifierGroups = $item->menu_options->groupBy('order_option_category');
            foreach ($modifierGroups as $categoryName => $modifiers) {
                foreach ($modifiers as $modifier) {
                    $itemData['modifiers'][] = [
                        'category' => $categoryName,
                        'name' => $modifier->order_option_name,
                        'quantity' => $modifier->quantity
                    ];
                }
            }

            $orderData['items'][] = $itemData;
        }

        // Get order notes (if any)
        if ($order->order_notes && $order->order_notes->count() > 0) {
            foreach ($order->order_notes as $note) {
                $orderData['notes'][] = [
                    'note' => $note->note,
                    'created_at' => $note->created_at
                ];
            }
        }

        return $orderData;
    }

    /**
     * Get category IDs for a menu item
     */
    protected function getMenuCategories($menuId)
    {
        return DB::table('menu_categories')
            ->where('menu_id', $menuId)
            ->pluck('category_id')
            ->toArray();
    }

    /**
     * Get elapsed time since order was created
     */
    protected function getElapsedTime($createdAt)
    {
        $now = now();
        $diff = $createdAt->diff($now);
        
        if ($diff->h > 0) {
            return $diff->h . 'h ' . $diff->i . 'm';
        } elseif ($diff->i > 0) {
            return $diff->i . 'm';
        } else {
            return $diff->s . 's';
        }
    }

    /**
     * Get kitchen-relevant statuses for status change buttons
     * Filters by station allowed statuses if station is set
     */
    protected function getKitchenStatuses()
    {
        // Default kitchen statuses
        $kitchenStatusNames = ['Canceled', 'Preparation', 'Completed'];
        
        $query = Statuses_model::where('status_for', 'order');
        
        // If station has specific statuses configured, use those
        if ($this->station && !empty($this->station->status_ids)) {
            $query->whereIn('status_id', $this->station->status_ids);
        } else {
            $query->whereIn('status_name', $kitchenStatusNames);
        }
        
        return $query->orderByRaw("FIELD(status_name, 'Preparation', 'Completed', 'Canceled')")
            ->get()
            ->map(function($status) {
                // Display "Cancel" instead of "Canceled" and "Preparing" instead of "Preparation"
                $displayName = $status->status_name;
                if ($status->status_name === 'Canceled') {
                    $displayName = 'Cancel';
                } elseif ($status->status_name === 'Preparation') {
                    $displayName = 'Preparing';
                }
                
                return [
                    'status_id' => $status->status_id,
                    'status_name' => $displayName,
                    'status_color' => $status->status_color
                ];
            });
    }

    /**
     * Get reservations count
     */
    protected function getReservationsCount()
    {
        return Reservations_model::count();
    }

    /**
     * Ensure the KDS stations table exists
     */
    protected function ensureKdsStationsTableExists()
    {
        try {
            $prefix = DB::connection()->getTablePrefix();
            $tableName = $prefix . 'kds_stations';
            
            if (!DB::getSchemaBuilder()->hasTable('kds_stations')) {
                DB::statement("
                    CREATE TABLE IF NOT EXISTS `{$tableName}` (
                        `station_id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT,
                        `name` varchar(128) NOT NULL,
                        `slug` varchar(128) NOT NULL,
                        `description` text DEFAULT NULL,
                        `category_ids` JSON DEFAULT NULL,
                        `status_ids` JSON DEFAULT NULL,
                        `can_change_status` tinyint(1) NOT NULL DEFAULT 1,
                        `is_active` tinyint(1) NOT NULL DEFAULT 1,
                        `notification_sound` varchar(50) NOT NULL DEFAULT 'doorbell',
                        `refresh_interval` int(11) NOT NULL DEFAULT 5,
                        `theme_color` varchar(20) NOT NULL DEFAULT '#4CAF50',
                        `location_id` int(10) UNSIGNED DEFAULT NULL,
                        `priority` int(11) NOT NULL DEFAULT 0,
                        `created_at` timestamp NULL DEFAULT NULL,
                        `updated_at` timestamp NULL DEFAULT NULL,
                        PRIMARY KEY (`station_id`),
                        UNIQUE KEY `slug_unique` (`slug`),
                        KEY `is_active_index` (`is_active`),
                        KEY `location_id_index` (`location_id`)
                    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
                ");
                
                \Log::info('KDS Stations table created from KitchenDisplay controller');
            }
        } catch (\Exception $e) {
            \Log::error('Failed to ensure KDS stations table: ' . $e->getMessage());
        }
    }
}
