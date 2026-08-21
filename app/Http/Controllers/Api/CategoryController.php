<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

class CategoryController extends Controller
{
    /**
     * Get all categories (matching old API structure).
     * PMD smart category kind is exposed when the tenant schema supports it.
     */
    public function index(Request $request)
    {
        try {
            $hasSmartKind = Schema::hasColumn('categories', 'pmd_kind');

            $categories = DB::table('categories')
                ->where('status', 1)
                ->orderBy('priority')
                ->get();

            return response()->json([
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
                        'created_at' => $category->created_at,
                        'updated_at' => $category->updated_at,
                    ];
                })
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to fetch categories',
                'message' => $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get category by ID.
     */
    public function show($categoryId)
    {
        try {
            $hasSmartKind = Schema::hasColumn('categories', 'pmd_kind');

            $category = DB::table('categories')
                ->where('category_id', $categoryId)
                ->where('status', 1)
                ->first();

            if (!$category) {
                return response()->json([
                    'success' => false,
                    'error' => 'Category not found'
                ], 404);
            }

            $kind = $hasSmartKind
                ? strtolower(trim((string)($category->pmd_kind ?? 'regular')))
                : 'regular';

            if (!in_array($kind, ['regular', 'chef', 'bestseller', 'combos'], true)) {
                $kind = 'regular';
            }

            return response()->json([
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
                    'created_at' => $category->created_at,
                    'updated_at' => $category->updated_at,
                ]
            ]);

        } catch (\Exception $e) {
            return response()->json([
                'success' => false,
                'error' => 'Failed to fetch category',
                'message' => $e->getMessage()
            ], 500);
        }
    }
}
