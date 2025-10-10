<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Response;

class TenantApiController extends Controller
{
    public function __construct()
    {
        $this->middleware('tenant.database');
    }

    /**
     * Get restaurant information for current tenant
     */
    public function getRestaurantInfo(Request $request)
    {
        try {
            $tenant = $request->attributes->get('tenant');
            
            if (!$tenant) {
                return Response::json(['error' => 'Tenant not found'], 404);
            }

            // Get restaurant settings from TastyIgniter
            $settings = DB::table('ti_settings')
                ->whereIn('item', ['site_name', 'site_logo', 'site_description', 'default_currency_code'])
                ->pluck('value', 'item');

            // Get location information
            $location = DB::table('ti_locations')
                ->where('location_status', 1)
                ->first();

            return Response::json([
                'name' => $settings['site_name'] ?? $tenant->name,
                'description' => $settings['site_description'] ?? $tenant->description,
                'logo' => $settings['site_logo'] ?? null,
                'currency' => $settings['default_currency_code'] ?? 'USD',
                'location' => $location ? [
                    'address' => $location->location_address_1,
                    'city' => $location->location_city,
                    'telephone' => $location->location_telephone,
                    'email' => $location->location_email,
                ] : null,
                'domain' => $tenant->domain,
            ]);
        } catch (\Exception $e) {
            return Response::json(['error' => 'Failed to fetch restaurant info'], 500);
        }
    }

    /**
     * Get menu categories
     */
    public function getMenuCategories(Request $request)
    {
        try {
            $categories = DB::table('ti_categories')
                ->where('status', 1)
                ->orderBy('priority', 'asc')
                ->select('category_id as id', 'name', 'description', 'permalink_slug as slug')
                ->get();

            return Response::json($categories);
        } catch (\Exception $e) {
            return Response::json(['error' => 'Failed to fetch categories'], 500);
        }
    }

    /**
     * Get menu items, optionally filtered by category
     */
    public function getMenuItems(Request $request)
    {
        try {
            $categoryId = $request->query('category');
            
            $query = DB::table('ti_menus')
                ->where('menu_status', 1)
                ->select(
                    'menu_id as id',
                    'menu_name as name',
                    'menu_description as description',
                    'menu_price as price',
                    'minimum_qty'
                )
                ->orderBy('menu_priority', 'asc');

            if ($categoryId) {
                $query->join('ti_menu_categories', 'ti_menus.menu_id', '=', 'ti_menu_categories.menu_id')
                    ->where('ti_menu_categories.category_id', $categoryId);
            }

            $menuItems = $query->get();

            // Get categories for each menu item
            foreach ($menuItems as $item) {
                $categories = DB::table('ti_menu_categories')
                    ->join('ti_categories', 'ti_menu_categories.category_id', '=', 'ti_categories.category_id')
                    ->where('ti_menu_categories.menu_id', $item->id)
                    ->where('ti_categories.status', 1)
                    ->select('ti_categories.category_id as id', 'ti_categories.name')
                    ->get();
                
                $item->categories = $categories;
                $item->category_id = $categories->first()->id ?? null;
                
                // Get media/images if available
                $media = DB::table('ti_media_attachments')
                    ->where('attachment_type', 'Admin\Models\Menus_model')
                    ->where('attachment_id', $item->id)
                    ->first();
                
                $item->image = $media ? $media->path : null;
                $item->price = (float) $item->price;
            }

            return Response::json($menuItems);
        } catch (\Exception $e) {
            return Response::json(['error' => 'Failed to fetch menu items'], 500);
        }
    }

    /**
     * Get specific menu item
     */
    public function getMenuItem(Request $request, $itemId)
    {
        try {
            $item = DB::table('ti_menus')
                ->where('menu_id', $itemId)
                ->where('menu_status', 1)
                ->select(
                    'menu_id as id',
                    'menu_name as name',
                    'menu_description as description',
                    'menu_price as price',
                    'minimum_qty'
                )
                ->first();

            if (!$item) {
                return Response::json(['error' => 'Menu item not found'], 404);
            }

            // Get categories
            $categories = DB::table('ti_menu_categories')
                ->join('ti_categories', 'ti_menu_categories.category_id', '=', 'ti_categories.category_id')
                ->where('ti_menu_categories.menu_id', $item->id)
                ->where('ti_categories.status', 1)
                ->select('ti_categories.category_id as id', 'ti_categories.name')
                ->get();
            
            $item->categories = $categories;
            $item->category_id = $categories->first()->id ?? null;

            // Get media/images
            $media = DB::table('ti_media_attachments')
                ->where('attachment_type', 'Admin\Models\Menus_model')
                ->where('attachment_id', $item->id)
                ->first();
            
            $item->image = $media ? $media->path : null;
            $item->price = (float) $item->price;

            // Get menu options if available
            $options = DB::table('ti_menu_item_options')
                ->join('ti_menu_options', 'ti_menu_item_options.option_id', '=', 'ti_menu_options.option_id')
                ->where('ti_menu_item_options.menu_id', $item->id)
                ->select(
                    'ti_menu_options.option_id as id',
                    'ti_menu_options.option_name as name',
                    'ti_menu_options.display_type',
                    'ti_menu_item_options.required'
                )
                ->get();

            foreach ($options as $option) {
                $values = DB::table('ti_menu_option_values')
                    ->where('option_id', $option->id)
                    ->select('option_value_id as id', 'value', 'price')
                    ->get();
                
                $option->values = $values;
            }

            $item->options = $options;

            return Response::json($item);
        } catch (\Exception $e) {
            return Response::json(['error' => 'Failed to fetch menu item'], 500);
        }
    }

    /**
     * Submit order
     */
    public function submitOrder(Request $request)
    {
        try {
            $validated = $request->validate([
                'items' => 'required|array|min:1',
                'items.*.id' => 'required|integer|exists:ti_menus,menu_id',
                'items.*.quantity' => 'required|integer|min:1',
                'customer_name' => 'required|string|max:255',
                'customer_email' => 'string|email|max:255',
                'customer_phone' => 'string|max:20',
                'order_type' => 'required|in:delivery,pickup',
                'special_instructions' => 'string|max:1000',
            ]);

            DB::beginTransaction();

            // Calculate total
            $total = 0;
            $orderItems = [];
            
            foreach ($validated['items'] as $item) {
                $menuItem = DB::table('ti_menus')
                    ->where('menu_id', $item['id'])
                    ->where('menu_status', 1)
                    ->first();
                
                if (!$menuItem) {
                    throw new \Exception("Menu item {$item['id']} not found");
                }
                
                $itemTotal = $menuItem->menu_price * $item['quantity'];
                $total += $itemTotal;
                
                $orderItems[] = [
                    'menu_id' => $item['id'],
                    'name' => $menuItem->menu_name,
                    'quantity' => $item['quantity'],
                    'price' => $menuItem->menu_price,
                    'subtotal' => $itemTotal,
                ];
            }

            // Create order
            $orderId = DB::table('ti_orders')->insertGetId([
                'customer_name' => $validated['customer_name'],
                'email' => $validated['customer_email'] ?? null,
                'telephone' => $validated['customer_phone'] ?? null,
                'order_type' => $validated['order_type'],
                'order_total' => $total,
                'order_status' => 1, // Pending
                'comment' => $validated['special_instructions'] ?? null,
                'date_added' => now(),
                'date_modified' => now(),
            ]);

            // Add order items
            foreach ($orderItems as $item) {
                DB::table('ti_order_menus')->insert([
                    'order_id' => $orderId,
                    'menu_id' => $item['menu_id'],
                    'name' => $item['name'],
                    'quantity' => $item['quantity'],
                    'price' => $item['price'],
                    'subtotal' => $item['subtotal'],
                ]);
            }

            // Add order total record
            DB::table('ti_order_totals')->insert([
                'order_id' => $orderId,
                'code' => 'subtotal',
                'title' => 'Subtotal',
                'value' => $total,
                'priority' => 1,
            ]);

            DB::table('ti_order_totals')->insert([
                'order_id' => $orderId,
                'code' => 'total',
                'title' => 'Total',
                'value' => $total,
                'priority' => 999,
            ]);

            DB::commit();

            return Response::json([
                'order_id' => $orderId,
                'total' => $total,
                'status' => 'pending',
                'message' => 'Order submitted successfully',
            ], 201);

        } catch (\Exception $e) {
            DB::rollBack();
            return Response::json(['error' => 'Failed to submit order: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Get order status
     */
    public function getOrderStatus(Request $request, $orderId)
    {
        try {
            $order = DB::table('ti_orders')
                ->join('ti_statuses', 'ti_orders.order_status', '=', 'ti_statuses.status_id')
                ->where('ti_orders.order_id', $orderId)
                ->select(
                    'ti_orders.order_id as id',
                    'ti_orders.customer_name',
                    'ti_orders.order_total as total',
                    'ti_orders.order_type',
                    'ti_orders.comment',
                    'ti_orders.date_added as created_at',
                    'ti_statuses.status_name as status'
                )
                ->first();

            if (!$order) {
                return Response::json(['error' => 'Order not found'], 404);
            }

            // Get order items
            $items = DB::table('ti_order_menus')
                ->where('order_id', $orderId)
                ->select('name', 'quantity', 'price', 'subtotal')
                ->get();

            $order->items = $items;
            $order->total = (float) $order->total;

            return Response::json($order);
        } catch (\Exception $e) {
            return Response::json(['error' => 'Failed to fetch order'], 500);
        }
    }

    /**
     * Get user orders (placeholder - would need customer authentication)
     */
    public function getUserOrders(Request $request)
    {
        try {
            // This would typically require customer authentication
            // For now, return recent orders
            $orders = DB::table('ti_orders')
                ->join('ti_statuses', 'ti_orders.order_status', '=', 'ti_statuses.status_id')
                ->orderBy('ti_orders.date_added', 'desc')
                ->limit(10)
                ->select(
                    'ti_orders.order_id as id',
                    'ti_orders.customer_name',
                    'ti_orders.order_total as total',
                    'ti_orders.order_type',
                    'ti_orders.date_added as created_at',
                    'ti_statuses.status_name as status'
                )
                ->get();

            foreach ($orders as $order) {
                $order->total = (float) $order->total;
            }

            return Response::json(['orders' => $orders]);
        } catch (\Exception $e) {
            return Response::json(['error' => 'Failed to fetch orders'], 500);
        }
    }
} 