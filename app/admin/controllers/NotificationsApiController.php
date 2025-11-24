<?php

namespace App\Admin\Controllers;

use Admin\Facades\AdminAuth;
use App\Helpers\SettingsHelper;
use Illuminate\Routing\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class NotificationsApiController extends Controller
{
    public function count()
    {
        $user = AdminAuth::getUser();
        
        // If user has notifications disabled, return 0
        if ($user && !SettingsHelper::areOrderNotificationsEnabledForUser($user)) {
            return response()->json(['ok' => true, 'new' => 0]);
        }
        
        $new = DB::table('notifications')->where('status', 'new')->count();
        return response()->json(['ok' => true, 'new' => $new]);
    }

    public function index(Request $request)
    {
        $user = AdminAuth::getUser();
        
        // If user has notifications disabled, return empty array
        if ($user && !SettingsHelper::areOrderNotificationsEnabledForUser($user)) {
            return response()->json(['ok' => true, 'items' => []]);
        }
        
        $status = $request->query('status', 'new');
        $limit  = min((int)$request->query('limit', 20), 50);

        $rows = DB::table('notifications')
            ->when($status, fn($q) => $q->where('status', $status))
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();

        return response()->json(['ok' => true, 'items' => $rows]);
    }

    public function update($id, Request $request)
    {
        $status = $request->input('status', 'seen');
        DB::table('notifications')->where('id', $id)->update([
            'status'     => $status,
            'updated_at' => now(),
        ]);
        return response()->json(['ok' => true, 'id' => (int)$id, 'status' => $status]);
    }

    public function markAllSeen()
    {
        DB::table('notifications')->where('status', 'new')->update([
            'status'     => 'seen',
            'updated_at' => now(),
        ]);
        return response()->json(['ok' => true]);
    }
}