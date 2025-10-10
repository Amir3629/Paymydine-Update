<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class CategoryController extends Controller
{
    /**
     * Get all categories (matching old API structure)
     */
    public function index(Request $request)
    {
        try {
            $categories = DB::table('ti_categories')
                ->where('status', 1)
                ->orderBy('priority')
                ->get();

            return response()->json([
                'success' => true,
                'data' => $categories->map(function ($category) {
                    return [
                        'id' => $category->category_id,
                        'name' => $category->name,
                        'description' => $category->description,
                        'image' => $category->image ? asset('uploads/' . $category->image) : null,
                        'priority' => $category->priority,
                        'status' => $category->status,
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
     * Get category by ID
     */
    public function show($categoryId)
    {
        try {
            $category = DB::table('ti_categories')
                ->where('category_id', $categoryId)
                ->where('status', 1)
                ->first();

            if (!$category) {
                return response()->json([
                    'success' => false,
                    'error' => 'Category not found'
                ], 404);
            }

            return response()->json([
                'success' => true,
                'data' => [
                    'id' => $category->category_id,
                    'name' => $category->name,
                    'description' => $category->description,
                    'image' => $category->image ? asset('uploads/' . $category->image) : null,
                    'priority' => $category->priority,
                    'status' => $category->status,
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