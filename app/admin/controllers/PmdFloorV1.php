<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Illuminate\Support\Facades\Cache;

class PmdFloorV1 extends AdminController
{
    protected $requiredPermissions = 'Admin.Orders';

    public function index()
    {
        return view()->file(base_path('app/admin/views/floor/index.blade.php'), [
            'dataUrl' => admin_url('pmd-waiter-dashboard-v9-tenant-data'),
            'layoutUrl' => admin_url('pmd-owner-dashboard-floor-layout'),
            'stateUrl' => admin_url('pmd-floor-v1/state'),
            'orderUrl' => admin_url('waiter-pos/{table}'),
        ]);
    }

    public function state()
    {
        return response()->json([
            'ok' => true,
            'version' => 'pmd-floor-v1',
            'state' => Cache::get($this->cacheKey(), [
                'tables' => [],
                'merges' => [],
            ]),
        ]);
    }

    public function saveState()
    {
        $payload = request()->json()->all() ?: request()->all();
        $state = Cache::get($this->cacheKey(), ['tables' => [], 'merges' => []]);
        $action = (string)($payload['action'] ?? '');

        if ($action === 'table-state') {
            $id = trim((string)($payload['table_id'] ?? ''));
            if ($id === '') return response()->json(['ok' => false, 'message' => 'Missing table_id'], 422);

            $allowed = ['available', 'occupied', 'reserved', 'cleaning', 'waiter-call'];
            $status = (string)($payload['status'] ?? 'available');
            if (!in_array($status, $allowed, true)) {
                return response()->json(['ok' => false, 'message' => 'Invalid status'], 422);
            }

            $state['tables'][$id] = array_merge($state['tables'][$id] ?? [], [
                'status' => $status,
                'note' => mb_substr(trim((string)($payload['note'] ?? ($state['tables'][$id]['note'] ?? ''))), 0, 500),
                'updated_at' => now()->toIso8601String(),
            ]);
        } elseif ($action === 'note') {
            $id = trim((string)($payload['table_id'] ?? ''));
            if ($id === '') return response()->json(['ok' => false, 'message' => 'Missing table_id'], 422);
            $state['tables'][$id] = array_merge($state['tables'][$id] ?? [], [
                'note' => mb_substr(trim((string)($payload['note'] ?? '')), 0, 500),
                'updated_at' => now()->toIso8601String(),
            ]);
        } elseif ($action === 'merge') {
            $ids = array_values(array_unique(array_filter(array_map('strval', (array)($payload['table_ids'] ?? [])))));
            if (count($ids) < 2) return response()->json(['ok' => false, 'message' => 'Select at least two tables'], 422);
            $group = 'merge-'.substr(sha1(implode('|', $ids).microtime(true)), 0, 10);
            $state['merges'][$group] = ['table_ids' => $ids, 'updated_at' => now()->toIso8601String()];
        } elseif ($action === 'unmerge') {
            unset($state['merges'][(string)($payload['merge_id'] ?? '')]);
        } else {
            return response()->json(['ok' => false, 'message' => 'Unknown action'], 422);
        }

        Cache::forever($this->cacheKey(), $state);

        return response()->json(['ok' => true, 'version' => 'pmd-floor-v1', 'state' => $state]);
    }

    protected function cacheKey(): string
    {
        return 'pmd-floor-v1:'.sha1((string)config('app.url'));
    }
}
