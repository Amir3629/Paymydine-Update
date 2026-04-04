<?php

namespace Admin\Controllers\Api;

use Admin\Classes\AdminController;
use Admin\Models\Cash_drawers_model;
use Admin\Services\CashDrawerService\CashDrawerService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

/**
 * Cash Drawer API Controller
 * RESTful API endpoints for cash drawer operations
 */
class CashDrawerController extends AdminController
{
    protected $requiredPermissions = ['Admin.CashDrawers'];

    /**
     * Open cash drawer
     * POST /admin/api/cash-drawers/{id}/open
     */
    public function open($drawerId, Request $request)
    {
        try {
            $drawer = Cash_drawers_model::find($drawerId);
            
            if (!$drawer) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cash drawer not found'
                ], 404);
            }

            $result = CashDrawerService::openDrawer($drawer, [
                'order_id' => $request->input('order_id'),
                'location_id' => $request->input('location_id'),
                'trigger_method' => $request->input('trigger_method', 'api'),
            ]);

            return response()->json($result);
        } catch (\Exception $e) {
            Log::error('Cash Drawer API: Failed to open drawer', [
                'drawer_id' => $drawerId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to open drawer: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Test drawer connection
     * POST /admin/api/cash-drawers/{id}/test
     */
    public function test($drawerId)
    {
        try {
            $drawer = Cash_drawers_model::find($drawerId);
            
            if (!$drawer) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cash drawer not found'
                ], 404);
            }

            $result = CashDrawerService::testDrawer($drawer);

            return response()->json($result);
        } catch (\Exception $e) {
            Log::error('Cash Drawer API: Failed to test drawer', [
                'drawer_id' => $drawerId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to test drawer: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get drawer status
     * GET /admin/api/cash-drawers/{id}/status
     */
    public function status($drawerId)
    {
        try {
            $drawer = Cash_drawers_model::find($drawerId);
            
            if (!$drawer) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cash drawer not found'
                ], 404);
            }

            $result = CashDrawerService::getDrawerStatus($drawer);

            return response()->json($result);
        } catch (\Exception $e) {
            Log::error('Cash Drawer API: Failed to get drawer status', [
                'drawer_id' => $drawerId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get drawer status: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Open drawer for location (uses default drawer)
     * POST /admin/api/cash-drawers/location/{locationId}/open
     */
    public function openForLocation($locationId, Request $request)
    {
        try {
            $result = CashDrawerService::openDrawerForLocation($locationId, [
                'order_id' => $request->input('order_id'),
                'trigger_method' => $request->input('trigger_method', 'cash_payment'),
            ]);

            return response()->json($result);
        } catch (\Exception $e) {
            Log::error('Cash Drawer API: Failed to open drawer for location', [
                'location_id' => $locationId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to open drawer: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get drawer logs
     * GET /admin/api/cash-drawers/{id}/logs
     */
    public function logs($drawerId, Request $request)
    {
        try {
            $drawer = Cash_drawers_model::find($drawerId);
            
            if (!$drawer) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cash drawer not found'
                ], 404);
            }

            $limit = $request->input('limit', 50);
            $logs = $drawer->logs()
                ->orderBy('created_at', 'desc')
                ->limit($limit)
                ->get();

            return response()->json([
                'success' => true,
                'logs' => $logs
            ]);
        } catch (\Exception $e) {
            Log::error('Cash Drawer API: Failed to get drawer logs', [
                'drawer_id' => $drawerId,
                'error' => $e->getMessage(),
            ]);

            return response()->json([
                'success' => false,
                'message' => 'Failed to get drawer logs: ' . $e->getMessage()
            ], 500);
        }
    }
}
