<?php

namespace App\Http\Controllers\RestaurantGroups;

use Admin\Classes\AdminController as BaseAdminController;
use Admin\Facades\AdminAuth;
use App\Services\RestaurantGroups\Auth;
use App\Services\RestaurantGroups\FoodCourtQueue;
use App\Services\RestaurantGroups\GroupScopeReadModel;
use App\Services\RestaurantGroups\Policy;
use App\Services\RestaurantGroups\Publisher;
use App\Services\RestaurantGroups\Snapshot;
use App\Services\RestaurantGroups\Store;
use Illuminate\Http\Request;

final class AdminController extends BaseAdminController
{
    protected $requiredPermissions = 'Admin.Dashboard';

    public function context(Store $store, Snapshot $snapshot)
    {
        $user = AdminAuth::getUser();

        if (!$user || !$store->managedLocalUser((int)$user->getKey())) {
            return response()->json([
                'ok' => true,
                'enabled' => false,
            ]);
        }

        try {
            return response()->json(['ok' => true] + $snapshot->context(false));
        } catch (\Throwable $error) {
            return response()->json([
                'ok' => false,
                'enabled' => true,
                'message' => $error->getMessage(),
            ], 403);
        }
    }

    public function snapshot(Request $request, Snapshot $snapshot)
    {
        try {
            return response()->json(
                $snapshot->snapshot(
                    (string)$request->query('scope', 'all'),
                    (string)$request->query('period', 'today')
                )
            );
        } catch (\Throwable $error) {
            return response()->json([
                'ok' => false,
                'message' => $error->getMessage(),
            ], 403);
        }
    }

    public function dashboardScope(Request $request, GroupScopeReadModel $readModel)
    {
        try {
            return response()->json(
                $readModel->dashboard(
                    (string)$request->query('scope', 'all'),
                    (string)$request->query('period', 'today')
                )
            );
        } catch (\Throwable $error) {
            return response()->json([
                'ok' => false,
                'message' => $error->getMessage(),
            ], 403);
        }
    }

    public function menuScope(Request $request, GroupScopeReadModel $readModel)
    {
        try {
            return response()->json(
                $readModel->menu((string)$request->query('scope', 'all'))
            );
        } catch (\Throwable $error) {
            return response()->json([
                'ok' => false,
                'message' => $error->getMessage(),
            ], 403);
        }
    }

    public function catalog(Request $request, Publisher $publisher)
    {
        try {
            return response()->json([
                'ok' => true,
                'items' => $publisher->catalog((string)$request->query('type')),
            ]);
        } catch (\Throwable $error) {
            return response()->json([
                'ok' => false,
                'message' => $error->getMessage(),
            ], 422);
        }
    }

    public function preview(Request $request, Publisher $publisher)
    {
        $data = $request->validate([
            'type' => 'required|string|in:menu,coupon,setting',
            'entity_id' => 'required|string|max:191',
            'targets' => 'required|array|min:1|max:20',
            'targets.*' => 'integer|min:1',
        ]);

        try {
            return response()->json(
                $publisher->preview(
                    (string)$data['type'],
                    (string)$data['entity_id'],
                    (array)$data['targets']
                )
            );
        } catch (\Throwable $error) {
            return response()->json([
                'ok' => false,
                'message' => $error->getMessage(),
            ], 422);
        }
    }

    public function apply(Request $request, Publisher $publisher)
    {
        $data = $request->validate([
            'operation' => 'required|string|uuid',
            'overwrite' => 'nullable|boolean',
        ]);

        try {
            return response()->json(
                $publisher->apply(
                    (string)$data['operation'],
                    (bool)($data['overwrite'] ?? false)
                )
            );
        } catch (\Throwable $error) {
            return response()->json([
                'ok' => false,
                'message' => $error->getMessage(),
            ], 422);
        }
    }

    public function changePassword(Request $request, Auth $auth)
    {
        $data = $request->validate([
            'current_password' => 'required|string|max:128',
            'new_password' => 'required|string|min:14|max:128|confirmed',
        ]);

        try {
            $auth->changePassword(
                (string)$data['current_password'],
                (string)$data['new_password']
            );

            return response()->json([
                'ok' => true,
                'signed_out' => true,
                'message' => 'Password changed. Sign in again with the new password.',
            ]);
        } catch (\Throwable $error) {
            return response()->json([
                'ok' => false,
                'message' => $error->getMessage(),
            ], 422);
        }
    }

    public function createDisplay(
        Request $request,
        Auth $auth,
        Store $store
    ) {
        $owner = $auth->owner(true);
        $currentSite = $store->site($store->currentTenantId());
        $group = $store->group((int)$currentSite->group_id);

        if ($group->type !== 'food_court') {
            return response()->json([
                'ok' => false,
                'message' => 'Pickup displays are available for Food Court business accounts.',
            ], 422);
        }

        $data = $request->validate([
            'targets' => 'required|array|min:1|max:20',
            'targets.*' => 'integer|min:1',
        ]);

        $allowed = array_map(
            'intval',
            array_column(
                array_values(array_filter(
                    $store->sitesForOwner((int)$owner->id),
                    static fn ($site) => (int)$site['group_id'] === (int)$group->id
                )),
                'tenant_id'
            )
        );

        try {
            $targets = Policy::targets((array)$data['targets'], $allowed);
        } catch (\Throwable $error) {
            return response()->json([
                'ok' => false,
                'message' => $error->getMessage(),
            ], 422);
        }

        $token = bin2hex(random_bytes(32));

        $store->central()->table('pmd_group_displays')->insert([
            'group_id' => (int)$group->id,
            'owner_id' => (int)$owner->id,
            'token_hash' => hash('sha256', $token),
            'tenant_ids' => Policy::canonical($targets),
            'expires_at' => now()->addDays(90),
            'created_at' => now(),
            'updated_at' => now(),
        ]);

        $store->audit(
            'owner',
            (int)$owner->id,
            'food_court_display_created',
            (int)$group->id,
            ['targets' => $targets]
        );

        return response()->json([
            'ok' => true,
            'url' => 'https://paymydine.com/pmd-foodcourt/'.$token,
            'expires_at' => now()->addDays(90)->toIso8601String(),
        ]);
    }

    public function operations(Auth $auth, Store $store)
    {
        $owner = $auth->owner(true);

        $rows = $store->central()->table('pmd_group_operations as o')
            ->where('o.owner_id', (int)$owner->id)
            ->orderByDesc('o.id')
            ->limit(30)
            ->get([
                'o.uuid',
                'o.entity_type',
                'o.entity_key',
                'o.state',
                'o.created_at',
                'o.updated_at',
            ]);

        return response()->json([
            'ok' => true,
            'operations' => $rows,
        ]);
    }
}
