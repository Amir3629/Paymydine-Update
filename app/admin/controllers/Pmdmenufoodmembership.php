<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminAuth;
use Admin\Models\Menus_model;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

/**
 * PMD_MENU_SCOPED_FOOD_REMOVE_V1
 *
 * Owns the destructive semantics of removing a FOOD card while the Menu page
 * is filtered to one real category:
 *
 * - one category only  -> delete the food completely (so it disappears from
 *   All Foods as well), using the canonical Menus_model delete lifecycle;
 * - multiple categories -> detach only the current category and keep the food
 *   in All Foods and every other category.
 *
 * Permanent deletion from the All Foods view stays owned by Menus::
 * onPmdMenuManagerDeleteV129().
 */
class Pmdmenufoodmembership extends AdminController
{
    protected $requiredPermissions = 'Admin.Menus';

    public function index(): JsonResponse
    {
        return response()->json([
            'ok' => true,
            'version' => 'scoped-food-remove-v1',
        ]);
    }

    public function onRemoveFromCategory(): JsonResponse
    {
        $user = AdminAuth::getUser();
        if (!$user || !$user->hasPermission('Admin.Menus')) {
            abort(403);
        }

        $validator = Validator::make(request()->all(), [
            'menu_id' => ['required', 'integer', 'min:1'],
            'category_id' => ['required', 'integer', 'min:1'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'ok' => false,
                'message' => $validator->errors()->first(),
            ], 422);
        }

        $clean = $validator->validated();
        $menuId = (int)$clean['menu_id'];
        $categoryId = (int)$clean['category_id'];

        $menu = Menus_model::query()
            ->with('categories')
            ->find($menuId);

        if (!$menu) {
            return response()->json([
                'ok' => false,
                'message' => 'Food not found.',
            ], 404);
        }

        $categoryIds = $menu->categories
            ->pluck('category_id')
            ->map(static fn($id) => (int)$id)
            ->filter(static fn($id) => $id > 0)
            ->unique()
            ->values()
            ->all();

        if (!in_array($categoryId, $categoryIds, true)) {
            return response()->json([
                'ok' => false,
                'message' => 'This food is not directly assigned to the selected category.',
                'menu_id' => $menuId,
                'category_id' => $categoryId,
                'category_ids' => $categoryIds,
            ], 409);
        }

        try {
            if (count($categoryIds) <= 1) {
                DB::transaction(function () use ($menu) {
                    // Canonical delete lifecycle: relations/images/children remain
                    // owned by Menus_model, exactly like the permanent All Foods
                    // delete path.
                    $menu->delete();
                });

                return response()->json([
                    'ok' => true,
                    'action' => 'deleted',
                    'menu_id' => $menuId,
                    'category_id' => $categoryId,
                    'remaining_category_ids' => [],
                    'message' => 'Food deleted because this was its only category.',
                ]);
            }

            $remaining = array_values(array_filter(
                $categoryIds,
                static fn($id) => (int)$id !== $categoryId
            ));

            DB::transaction(function () use ($menu, $remaining) {
                // addMenuCategories() is the existing canonical sync authority.
                $menu->addMenuCategories($remaining);
            });

            return response()->json([
                'ok' => true,
                'action' => 'detached',
                'menu_id' => $menuId,
                'category_id' => $categoryId,
                'remaining_category_ids' => $remaining,
                'message' => 'Food removed from this category and kept in its other categories.',
            ]);
        } catch (\Throwable $error) {
            report($error);

            return response()->json([
                'ok' => false,
                'message' => 'Food category membership could not be updated.',
            ], 500);
        }
    }
}
