<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CategoryController extends Controller
{
    /**
     * Get all categories (matching old API structure).
     *
     * PMD_MENU_SMART_CATEGORY_API_V2
     * DetectTenant owns tenant resolution for these routes. Use the tenant
     * connection explicitly so category kind/name/order always come from the
     * same restaurant database as /api/v1/menu.
     */
    public function index(Request $request)
    {
        try {
            $conn = DB::connection('tenant');
            $schema = $conn->getSchemaBuilder();
            $hasSmartKind = $schema->hasColumn('categories', 'pmd_kind');

            $categories = $conn->table('categories')
                ->where('status', 1)
                ->orderBy('priority')
                ->orderBy('name')
                ->get();

            $response = response()->json([
                'success' => true,
                'data' => $categories->map(function ($category) use ($hasSmartKind) {
                    $kind = $hasSmartKind
                        ? strtolower(trim((string)($category->pmd_kind ?? 'regular')))
                        : 'regular';

                    if (!in_array($kind, ['regular', 'chef', 'bestseller', 'combos'], true)) {
                        $kind = 'regular';
                    }

                    return [
                        'id' => $category->category_id,
                        'name' => $category->name,
                        'category_name' => $category->name,
                        'description' => $category->description,
                        'image' => $category->image ? asset('uploads/'.$category->image) : null,
                        'priority' => $category->priority,
                        'status' => $category->status,
                        'pmd_kind' => $kind,
                        'kind' => $kind,
                        'created_at' => $category->created_at,
                        'updated_at' => $category->updated_at,
                    ];
                })->values(),
                'pmd_category_api_version' => 'smart-categories-v2',
            ]);

            return $this->noStore($response);
        } catch (\Exception $e) {
            return $this->noStore(response()->json([
                'success' => false,
                'error' => 'Failed to fetch categories',
                'message' => $e->getMessage(),
            ], 500));
        }
    }

    /**
     * Get category by ID.
     */
    public function show($categoryId)
    {
        try {
            $conn = DB::connection('tenant');
            $schema = $conn->getSchemaBuilder();
            $hasSmartKind = $schema->hasColumn('categories', 'pmd_kind');

            $category = $conn->table('categories')
                ->where('category_id', $categoryId)
                ->where('status', 1)
                ->first();

            if (!$category) {
                return $this->noStore(response()->json([
                    'success' => false,
                    'error' => 'Category not found',
                ], 404));
            }

            $kind = $hasSmartKind
                ? strtolower(trim((string)($category->pmd_kind ?? 'regular')))
                : 'regular';

            if (!in_array($kind, ['regular', 'chef', 'bestseller', 'combos'], true)) {
                $kind = 'regular';
            }

            return $this->noStore(response()->json([
                'success' => true,
                'data' => [
                    'id' => $category->category_id,
                    'name' => $category->name,
                    'category_name' => $category->name,
                    'description' => $category->description,
                    'image' => $category->image ? asset('uploads/'.$category->image) : null,
                    'priority' => $category->priority,
                    'status' => $category->status,
                    'pmd_kind' => $kind,
                    'kind' => $kind,
                    'created_at' => $category->created_at,
                    'updated_at' => $category->updated_at,
                ],
                'pmd_category_api_version' => 'smart-categories-v2',
            ]));
        } catch (\Exception $e) {
            return $this->noStore(response()->json([
                'success' => false,
                'error' => 'Failed to fetch category',
                'message' => $e->getMessage(),
            ], 500));
        }
    }

    private function noStore($response)
    {
        return $response
            ->header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0')
            ->header('Pragma', 'no-cache')
            ->header('Expires', '0')
            ->header('X-PMD-Category-API-Version', 'smart-categories-v2');
    }
}
