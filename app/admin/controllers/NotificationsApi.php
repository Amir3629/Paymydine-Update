<?php

namespace Admin\Controllers;

use Illuminate\Routing\Controller;
use Admin\Models\Notifications_model;
use Illuminate\Http\Request;

class NotificationsApi extends Controller
{
    public function count()
    {
        try {
            // Use the correct table name - notifications (Laravel will add ti_ prefix)
            $new = \Illuminate\Support\Facades\DB::table('notifications')->where('status', 'new')->count();
            return response()->json(['ok' => true, 'new' => $new]);
        } catch (\Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    public function index(Request $request)
    {
        try {
            $status = $request->query('status', 'new');
            $limit  = min((int)$request->query('limit', 20), 50);

            // Use the correct table name - notifications (Laravel will add ti_ prefix) and match JavaScript expected format
            $rows = \Illuminate\Support\Facades\DB::table('notifications')
                ->when($status, fn($q) => $q->where('status', $status))
                ->orderByDesc('created_at')
                ->limit($limit)
                ->get();

            return response()->json(['ok' => true, 'items' => $rows]);
        } catch (\Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    public function update(Request $request, $id)
    {
        try {
            $status = $request->input('status', 'seen');
            
            // Use the correct table name - notifications (Laravel will add ti_ prefix)
            \Illuminate\Support\Facades\DB::table('notifications')->where('id', $id)->update([
                'status'     => $status,
                'updated_at' => now(),
            ]);
            
            return response()->json(['ok' => true, 'id' => (int)$id, 'status' => $status]);
        } catch (\Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }

    public function markAllSeen()
    {
        try {
            // Use the correct table name - notifications (Laravel will add ti_ prefix)
            \Illuminate\Support\Facades\DB::table('notifications')->where('status', 'new')->update([
                'status' => 'seen', 
                'seen_at' => now(),
                'updated_at' => now()
            ]);
            return response()->json(['ok' => true]);
        } catch (\Throwable $e) {
            return response()->json(['ok' => false, 'error' => $e->getMessage()], 500);
        }
    }
}
