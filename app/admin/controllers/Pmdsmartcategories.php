<?php

namespace Admin\Controllers;

use Admin\Classes\AdminController;
use Admin\Facades\AdminAuth;
use Admin\Models\Categories_model;
use Admin\Models\Menu_combos_model;
use Admin\Models\Menus_model;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\Validator;

/**
 * PMD Menu Smart Categories V1.
 *
 * Dedicated write/read authority for special menu categories.
 *
 * regular     -> ordinary category record
 * chef        -> category backed by menus.is_chef_recommended
 * bestseller  -> category backed by manual bestseller overrides
 * combos      -> category backed by menu_combos
 *
 * Category ordering and naming continue to use the existing categories table,
 * so the normal Menu Manager category drag authority remains unchanged.
 */
class Pmdsmartcategories extends AdminController
{
    protected $requiredPermissions = 'Admin.Categories';

    private const KINDS = ['regular', 'chef', 'bestseller', 'combos'];

    public function index(): JsonResponse
    {
        return $this->onBootstrap();
    }

    public function onBootstrap(): JsonResponse
    {
        $this->assertCategoryPermission();

        if (!Schema::hasTable('categories') || !Schema::hasColumn('categories', 'pmd_kind')) {
            return response()->json([
                'ok' => false,
                'migration_required' => true,
                'message' => 'Smart category migration has not been applied yet.',
            ], 409);
        }

        $categories = DB::table('categories')
            ->where('status', 1)
            ->orderByRaw('COALESCE(priority, 999999) ASC')
            ->orderBy('name')
            ->get(['category_id', 'name', 'priority', 'pmd_kind'])
            ->map(static function ($category) {
                $kind = strtolower(trim((string)($category->pmd_kind ?? 'regular')));
                if (!in_array($kind, self::KINDS, true)) {
                    $kind = 'regular';
                }

                return [
                    'id' => (int)$category->category_id,
                    'name' => (string)$category->name,
                    'priority' => (int)($category->priority ?? 999999),
                    'kind' => $kind,
                ];
            })
            ->values();

        $chefIds = [];
        $bestsellerIds = [];

        if (Schema::hasTable('menus')) {
            if (Schema::hasColumn('menus', 'is_chef_recommended')) {
                $chefIds = Menus_model::query()
                    ->where('menu_status', 1)
                    ->where('is_chef_recommended', 1)
                    ->pluck('menu_id')
                    ->map(static fn($id) => (int)$id)
                    ->values()
                    ->all();
            }

            if (
                Schema::hasColumn('menus', 'is_manual_bestseller')
                && Schema::hasColumn('menus', 'bestseller_override_mode')
            ) {
                $bestsellerIds = Menus_model::query()
                    ->where('menu_status', 1)
                    ->where(function ($query) {
                        $query
                            ->where('is_manual_bestseller', 1)
                            ->orWhere('bestseller_override_mode', 'force_on');
                    })
                    ->pluck('menu_id')
                    ->map(static fn($id) => (int)$id)
                    ->values()
                    ->all();
            }
        }

        $combos = [];
        if (Schema::hasTable('menu_combos')) {
            $combos = Menu_combos_model::query()
                ->orderByRaw('COALESCE(combo_priority, 999999) ASC')
                ->orderBy('combo_name')
                ->get(['combo_id', 'combo_name', 'combo_status'])
                ->map(static fn($combo) => [
                    'id' => (int)$combo->combo_id,
                    'name' => (string)$combo->combo_name,
                    'published' => (bool)$combo->combo_status,
                ])
                ->values()
                ->all();
        }

        return response()->json([
            'ok' => true,
            'categories' => $categories,
            'selections' => [
                'chef' => $chefIds,
                'bestseller' => $bestsellerIds,
            ],
            'combos' => $combos,
            'can_manage_combos' => $this->canManageCombos(),
        ]);
    }

    public function onSave(): JsonResponse
    {
        $this->assertCategoryPermission();

        if (!Schema::hasTable('categories') || !Schema::hasColumn('categories', 'pmd_kind')) {
            return response()->json([
                'ok' => false,
                'message' => 'Smart category migration has not been applied yet.',
            ], 409);
        }

        $validator = Validator::make(request()->all(), [
            'category_id' => ['nullable', 'integer', 'min:1'],
            'name' => ['required', 'string', 'min:2', 'max:128'],
            'kind' => ['required', 'in:regular,chef,bestseller,combos'],
            'menu_ids' => ['nullable', 'array'],
            'menu_ids.*' => ['integer', 'min:1', 'distinct'],
        ]);

        if ($validator->fails()) {
            return response()->json([
                'ok' => false,
                'message' => $validator->errors()->first(),
                'errors' => $validator->errors()->toArray(),
            ], 422);
        }

        $clean = $validator->validated();
        $categoryId = !empty($clean['category_id']) ? (int)$clean['category_id'] : null;
        $kind = strtolower((string)$clean['kind']);
        $name = trim((string)$clean['name']);
        $menuIds = array_values(array_unique(array_map('intval', (array)($clean['menu_ids'] ?? []))));

        if ($kind === 'combos' && !$this->canManageCombos()) {
            abort(403);
        }

        $sameName = Categories_model::query()
            ->where('name', $name)
            ->when($categoryId, static fn($query) => $query->where('category_id', '!=', $categoryId))
            ->exists();

        if ($sameName) {
            return response()->json([
                'ok' => false,
                'message' => 'A category with this name already exists.',
            ], 422);
        }

        if (in_array($kind, ['chef', 'bestseller'], true)) {
            $validMenuIds = Menus_model::query()
                ->where('menu_status', 1)
                ->whereIn('menu_id', $menuIds)
                ->pluck('menu_id')
                ->map(static fn($id) => (int)$id)
                ->all();

            sort($validMenuIds);
            $expected = $menuIds;
            sort($expected);

            if ($validMenuIds !== $expected) {
                return response()->json([
                    'ok' => false,
                    'message' => 'One or more selected foods are missing or disabled.',
                ], 422);
            }
        }

        $duplicateKind = DB::table('categories')
            ->where('pmd_kind', $kind)
            ->when($categoryId, static fn($query) => $query->where('category_id', '!=', $categoryId))
            ->when($kind === 'regular', static fn($query) => $query->whereRaw('1 = 0'))
            ->exists();

        if ($duplicateKind) {
            return response()->json([
                'ok' => false,
                'message' => 'This special category already exists. Edit the existing category instead.',
            ], 422);
        }

        try {
            $savedId = DB::transaction(function () use ($categoryId, $kind, $name, $menuIds) {
                $category = $categoryId
                    ? Categories_model::query()->find($categoryId)
                    : new Categories_model;

                if ($categoryId && !$category) {
                    throw new \RuntimeException('Category not found.');
                }

                if ($category && $category->exists) {
                    $currentKind = strtolower(trim((string)(
                        DB::table('categories')
                            ->where('category_id', (int)$category->category_id)
                            ->value('pmd_kind')
                        ?? 'regular'
                    )));

                    if ($currentKind === '') {
                        $currentKind = 'regular';
                    }

                    if ($currentKind !== $kind) {
                        throw new \DomainException('Category type cannot be changed after creation.');
                    }
                }

                $category->name = $name;
                $category->status = 1;

                if (!$category->exists) {
                    $category->priority = ((int)Categories_model::query()->max('priority')) + 1;
                    if (Schema::hasColumn('categories', 'frontend_visible')) {
                        $category->frontend_visible = 1;
                    }
                }

                $category->save();

                DB::table('categories')
                    ->where('category_id', (int)$category->category_id)
                    ->update(['pmd_kind' => $kind]);

                if ($kind === 'chef') {
                    $this->syncChefSelection($menuIds);
                } elseif ($kind === 'bestseller') {
                    $this->syncBestsellerSelection($menuIds);
                }

                return (int)$category->category_id;
            });
        } catch (\DomainException $error) {
            return response()->json([
                'ok' => false,
                'message' => $error->getMessage(),
            ], 422);
        } catch (\RuntimeException $error) {
            return response()->json([
                'ok' => false,
                'message' => $error->getMessage(),
            ], 404);
        } catch (\Throwable $error) {
            return response()->json([
                'ok' => false,
                'message' => 'Category could not be saved.',
            ], 500);
        }

        return response()->json([
            'ok' => true,
            'category_id' => $savedId,
            'kind' => $kind,
            'message' => $categoryId ? 'Category updated.' : 'Category created.',
        ]);
    }

    public function onDelete(): JsonResponse
    {
        $this->assertCategoryPermission();
        $this->assertDestructiveCategoryPermission();

        $categoryId = (int)request()->input('category_id', 0);
        if ($categoryId < 1) {
            return response()->json(['ok' => false, 'message' => 'Invalid category.'], 422);
        }

        $row = DB::table('categories')
            ->where('category_id', $categoryId)
            ->first(['category_id', 'name', 'pmd_kind']);

        if (!$row) {
            return response()->json(['ok' => false, 'message' => 'Category not found.'], 404);
        }

        $kind = strtolower(trim((string)($row->pmd_kind ?? 'regular')));
        if (!in_array($kind, ['chef', 'bestseller', 'combos'], true)) {
            return response()->json([
                'ok' => false,
                'message' => 'Regular categories continue to use the existing Menu Manager delete action.',
            ], 422);
        }

        try {
            DB::transaction(function () use ($categoryId, $kind) {
                if ($kind === 'chef') {
                    $this->syncChefSelection([]);
                } elseif ($kind === 'bestseller') {
                    $this->syncBestsellerSelection([]);
                }

                Categories_model::query()
                    ->where('category_id', $categoryId)
                    ->delete();
            });
        } catch (\Throwable $error) {
            return response()->json([
                'ok' => false,
                'message' => 'Special category could not be deleted.',
            ], 500);
        }

        return response()->json([
            'ok' => true,
            'category_id' => $categoryId,
            'kind' => $kind,
            'message' => 'Category deleted.',
        ]);
    }

    private function syncChefSelection(array $menuIds): void
    {
        if (!Schema::hasColumn('menus', 'is_chef_recommended')) {
            throw new \DomainException('Chef recommendation fields are not available on this tenant yet.');
        }

        Menus_model::query()->update(['is_chef_recommended' => 0]);

        if ($menuIds) {
            Menus_model::query()
                ->whereIn('menu_id', $menuIds)
                ->update(['is_chef_recommended' => 1]);
        }
    }

    private function syncBestsellerSelection(array $menuIds): void
    {
        if (
            !Schema::hasColumn('menus', 'is_manual_bestseller')
            || !Schema::hasColumn('menus', 'bestseller_override_mode')
        ) {
            throw new \DomainException('Bestseller fields are not available on this tenant yet.');
        }

        Menus_model::query()
            ->where(function ($query) {
                $query
                    ->where('is_manual_bestseller', 1)
                    ->orWhere('bestseller_override_mode', 'force_on');
            })
            ->update([
                'is_manual_bestseller' => 0,
                'bestseller_override_mode' => 'auto',
            ]);

        if ($menuIds) {
            Menus_model::query()
                ->whereIn('menu_id', $menuIds)
                ->update([
                    'is_manual_bestseller' => 1,
                    'bestseller_override_mode' => 'force_on',
                ]);
        }
    }

    private function canManageCombos(): bool
    {
        $user = AdminAuth::getUser();

        return (bool)(
            $user
            && $user->hasPermission('Admin.Combos')
            && Schema::hasTable('menu_combos')
            && Schema::hasTable('menu_combo_items')
        );
    }

    private function assertCategoryPermission(): void
    {
        $user = AdminAuth::getUser();
        if (!$user || !$user->hasPermission('Admin.Categories')) {
            abort(403);
        }
    }

    private function assertDestructiveCategoryPermission(): void
    {
        $user = AdminAuth::getUser();

        if (!$user || !$user->hasPermission('Admin.Menus') || !$user->hasPermission('Admin.Categories')) {
            abort(403);
        }

        if (!empty($user->is_super_user)) {
            return;
        }

        $role = '';

        if (!empty($user->staff_id)) {
            try {
                $row = DB::table('staffs as s')
                    ->leftJoin('staff_roles as r', 'r.staff_role_id', '=', 's.staff_role_id')
                    ->where('s.staff_id', (int)$user->staff_id)
                    ->select('r.code as role_code', 'r.name as role_name')
                    ->first();

                $code = strtolower(trim((string)($row->role_code ?? '')));
                $name = strtolower(trim((string)($row->role_name ?? '')));

                if ($code === 'owner' || $name === 'owner') {
                    $role = 'owner';
                } elseif ($code === 'manager' || $name === 'manager') {
                    $role = 'manager';
                }
            } catch (\Throwable $error) {
                $role = '';
            }
        }

        if (!in_array($role, ['owner', 'manager'], true)) {
            abort(403);
        }
    }
}
