<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Models\Orders_model;
use Admin\Models\Statuses_model;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\View;
use Illuminate\Support\Facades\Response;

/**
 * Kitchen Display Controller
 * Displays active orders for kitchen staff in a simplified, full-screen layout
 */
class KitchenDisplay extends AdminController
{
    protected $requiredPermissions = ['Admin.KitchenDisplay'];

    public function __construct()
    {
        parent::__construct();
    }

    /**
     * Kitchen Display main view
     * Renders standalone view without admin layout (full-screen KDS)
     */
    public function index()
    {
        $this->vars['title'] = 'Kitchen Display';
        $this->vars['orders'] = $this->getActiveOrders();
        $this->vars['statuses'] = $this->getKitchenStatuses();
        
        // Render standalone view directly using Laravel's view helper
        // This bypasses TastyIgniter's makeView() which wraps views in admin layout
        // The admin layout requires widgets (mainmenu) which we don't need for KDS
        // View path: app/admin/views/kitchendisplay/index.blade.php
        return response()->make(
            View::make('admin::kitchendisplay.index', $this->vars)->render()
        );
    }

    /**
     * AJAX endpoint to get fresh order data for auto-refresh
     */
    public function index_onRefresh()
    {
        $orders = $this->getActiveOrders();
        
        return Response::json([
            'orders' => $orders->map(function($order) {
                return $this->formatOrderForDisplay($order);
            })->toArray()
        ]);
    }

    /**
     * AJAX endpoint to update order status from KDS
     */
    public function index_onUpdateStatus()
    {
        $orderId = post('order_id');
        $statusId = post('status_id');

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

            // Update order status
            $order->status_id = $statusId;
            $order->save();

            return Response::json([
                'success' => true,
                'message' => 'Status updated successfully'
            ]);
        } catch (\Exception $e) {
            return Response::json([
                'success' => false,
                'error' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get all active orders for kitchen display
     * Only shows orders in kitchen-relevant statuses
     */
    protected function getActiveOrders()
    {
        // Kitchen-relevant statuses: Received, Pending, Preparation
        // Optionally include Delivery if kitchen needs to see "ready" orders
        $kitchenStatusNames = ['Received', 'Pending', 'Preparation', 'Delivery'];
        
        $kitchenStatusIds = Statuses_model::whereIn('status_name', $kitchenStatusNames)
            ->where('status_for', 'order')
            ->pluck('status_id')
            ->toArray();

        return Orders_model::with(['status', 'location', 'order_notes'])
            ->whereIn('status_id', $kitchenStatusIds)
            ->orderBy('created_at', 'asc')
            ->get()
            ->map(function($order) {
                return $this->formatOrderForDisplay($order);
            });
    }

    /**
     * Format order data for kitchen display (simplified, kitchen-focused)
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
        foreach ($items as $item) {
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
     */
    protected function getKitchenStatuses()
    {
        $kitchenStatusNames = ['Received', 'Pending', 'Preparation', 'Delivery', 'Completed'];
        
        return Statuses_model::whereIn('status_name', $kitchenStatusNames)
            ->where('status_for', 'order')
            ->orderByRaw("FIELD(status_name, 'Received', 'Pending', 'Preparation', 'Delivery', 'Completed')")
            ->get()
            ->map(function($status) {
                return [
                    'status_id' => $status->status_id,
                    'status_name' => $status->status_name,
                    'status_color' => $status->status_color
                ];
            });
    }
}

