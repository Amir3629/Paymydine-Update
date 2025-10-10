<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class TableController extends Controller
{
    /**
     * Get all tables
     */
    public function index(Request $request)
    {
        try {
            $tables = DB::table('ti_tables')
                ->where('table_status', 1)
                ->orderBy('table_name')
                ->get();

            return response()->json($tables->map(function ($table) {
                return [
                    'id' => $table->table_id,
                    'name' => $table->table_name,
                    'capacity' => $table->min_capacity,
                    'status' => $table->table_status,
                    'qr_code' => $table->qr_code ?? null,
                    'created_at' => $table->created_at,
                    'updated_at' => $table->updated_at,
                ];
            }));

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch tables',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get table by QR code
     */
    public function getByQrCode($qrCode)
    {
        try {
            // First try to find by QR code directly
            $table = DB::table('ti_tables')
                ->where('qr_code', $qrCode)
                ->where('table_status', 1)
                ->first();

            // If not found, try to find by table name/number
            if (!$table) {
                $table = DB::table('ti_tables')
                    ->where('table_name', $qrCode)
                    ->where('table_status', 1)
                    ->first();
            }

            // If still not found, try to parse as table ID
            if (!$table && is_numeric($qrCode)) {
                $table = DB::table('ti_tables')
                    ->where('table_id', $qrCode)
                    ->where('table_status', 1)
                    ->first();
            }

            if (!$table) {
                return response()->json([
                    'error' => 'Table not found',
                    'message' => 'No table found with the provided QR code or identifier.'
                ], 404);
            }

            // Get restaurant/location information
            $location = DB::table('ti_locations')->first();

            return response()->json([
                'table' => [
                    'id' => $table->table_id,
                    'name' => $table->table_name,
                    'capacity' => $table->min_capacity,
                    'status' => $table->table_status,
                    'qr_code' => $table->qr_code ?? $qrCode,
                ],
                'restaurant' => [
                    'name' => $location->location_name ?? 'Restaurant',
                    'address' => $location->location_address_1 ?? '',
                    'phone' => $location->location_telephone ?? '',
                    'email' => $location->location_email ?? '',
                ],
                'menu_available' => true,
                'ordering_enabled' => true,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch table information',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get table by ID
     */
    public function show($tableId)
    {
        try {
            $table = DB::table('ti_tables')
                ->where('table_id', $tableId)
                ->where('table_status', 1)
                ->first();

            if (!$table) {
                return response()->json([
                    'error' => 'Table not found'
                ], 404);
            }

            return response()->json([
                'id' => $table->table_id,
                'name' => $table->table_name,
                'capacity' => $table->min_capacity,
                'status' => $table->table_status,
                'qr_code' => $table->qr_code,
                'created_at' => $table->created_at,
                'updated_at' => $table->updated_at,
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch table',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get table info (matching old API structure)
     */
    public function getTableInfo(Request $request)
    {
        $tableId = $request->get('table_id');
        $qrCode = $request->get('qr_code');
        
        if (!$tableId && !$qrCode) {
            return response()->json([
                'error' => 'table_id or qr_code is required'
            ], 400);
        }

        try {
            $whereClause = $tableId ? "table_id = ?" : "qr_code = ?";
            $param = $tableId ?: $qrCode;
            
            $table = DB::table('ti_tables')
                ->whereRaw($whereClause, [$param])
                ->where('table_status', 1)
                ->first();

            if (!$table) {
                return response()->json([
                    'error' => 'Table not found'
                ], 404);
            }

            // Get location info for frontend URL construction
            $location = DB::table('ti_locations')->first();
            $domain = request()->getHost();
            
            return response()->json([
                'success' => true,
                'data' => [
                    'table_id' => $table->table_id,
                    'table_name' => $table->table_name,
                    'qr_code' => $table->qr_code,
                    'location_id' => $table->location_id,
                    'min_capacity' => $table->min_capacity,
                    'max_capacity' => $table->max_capacity,
                    'table_status' => $table->table_status,
                    'frontend_url' => "http://{$domain}/menu/table-{$table->table_id}"
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'error' => 'Failed to fetch table info',
                'message' => $e->getMessage()
            ], 500);
        }
    }
} 
